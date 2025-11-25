'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Photographer } from '../../../types';

// Generate additional fake photographers for availability display
function generateFakePhotographers(baseLocation: { lat: number; lng: number }): Photographer[] {
  const fakeNames = [
    'Alex Chen', 'Jordan Smith', 'Taylor Williams', 'Morgan Brown', 'Casey Davis',
    'Riley Johnson', 'Quinn Miller', 'Sage Wilson', 'River Anderson', 'Phoenix Martinez',
    'Blake Thompson', 'Cameron Garcia', 'Dakota Lee', 'Emery White', 'Finley Harris',
    'Harper Clark', 'Indigo Lewis', 'Jasper Walker', 'Kai Hall', 'Lane Young',
    'Noah King', 'Ocean Wright', 'Parker Lopez', 'Quinn Hill', 'Reese Green',
    'Rowan Adams', 'Skylar Nelson', 'Tatum Baker', 'Vale Campbell', 'Wren Mitchell'
  ];

  const companies = ['VX Media', 'Luxe Shots Pro', 'Elite Photography', 'Prime Media', 'Independent'];
  
  return fakeNames.map((name, index) => {
    // Generate random offset from base location (within ~20km radius)
    const angle = (index * 137.5) % 360; // Golden angle for even distribution
    const distance = 0.05 + (index % 5) * 0.02; // Varying distances
    const latOffset = distance * Math.cos((angle * Math.PI) / 180);
    const lngOffset = distance * Math.sin((angle * Math.PI) / 180);
    
    const companyIndex = index % companies.length;
    const isIndependent = companies[companyIndex] === 'Independent';
    
    return {
      id: `fake-photo-${index}`,
      name,
      email: `${name.toLowerCase().replace(' ', '.')}@${isIndependent ? 'independent.com' : 'photography.com'}`,
      phone: `+1 (555) ${String(100 + index).padStart(3, '0')}-${String(1000 + index).slice(-4)}`,
      organizationId: isIndependent ? `fake-org-${index}` : 'org-vx-001',
      isIndependent,
      companyId: isIndependent ? undefined : 'org-vx-001',
      companyName: isIndependent ? undefined : companies[companyIndex],
      homeLocation: {
        lat: baseLocation.lat + latOffset,
        lng: baseLocation.lng + lngOffset,
        address: {
          street: `${100 + index * 10} Main Street`,
          city: 'Calgary',
          stateProvince: 'AB',
          country: 'Canada',
          postalCode: 'T2P 0A1',
        },
      },
      availability: [
        { date: '2025-11-12', available: Math.random() > 0.3 },
        { date: '2025-11-13', available: Math.random() > 0.3 },
        { date: '2025-11-14', available: Math.random() > 0.3 },
        { date: '2025-11-15', available: Math.random() > 0.3 },
      ],
      reliability: {
        totalJobs: 50 + Math.floor(Math.random() * 200),
        noShows: Math.floor(Math.random() * 5),
        lateDeliveries: Math.floor(Math.random() * 10),
        onTimeRate: 0.85 + Math.random() * 0.15,
        averageDeliveryTime: 15 + Math.floor(Math.random() * 10),
      },
      skills: {
        residential: 3 + Math.floor(Math.random() * 3),
        commercial: 3 + Math.floor(Math.random() * 3),
        aerial: Math.random() > 0.5 ? 3 + Math.floor(Math.random() * 3) : 0,
        twilight: Math.random() > 0.5 ? 3 + Math.floor(Math.random() * 3) : 0,
        video: Math.random() > 0.5 ? 3 + Math.floor(Math.random() * 3) : 0,
      },
      rating: {
        overall: 4.0 + Math.random() * 1.0,
        count: 20 + Math.floor(Math.random() * 200),
        recent: Array.from({ length: 10 }, () => 3 + Math.floor(Math.random() * 3)),
      },
      preferredClients: [],
      status: 'active' as const,
      createdAt: new Date('2024-01-01'),
      avatar: `https://images.unsplash.com/photo-${1500000000000 + index}?w=400`,
      bio: 'Professional photographer specializing in real estate media.',
      services: {
        photography: true,
        video: Math.random() > 0.5,
        aerial: Math.random() > 0.5,
        twilight: Math.random() > 0.5,
        editing: true,
        virtualStaging: Math.random() > 0.7,
      },
      portfolio: [],
      certifications: [],
    };
  });
}

export function LoginMapView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Default to Calgary if location not available
  const defaultLocation = { lat: 51.0447, lng: -114.0719 }; // Calgary

  // Get user's location or use default
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // If geolocation fails, use default
          setUserLocation(defaultLocation);
        }
      );
    } else {
      setUserLocation(defaultLocation);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !userLocation) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error('NEXT_PUBLIC_MAPBOX_TOKEN is not set');
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [userLocation.lng, userLocation.lat],
      zoom: 11,
      attributionControl: false,
    });

    map.on('load', () => {
      setIsLoaded(true);
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [userLocation]);

  // Add photographer markers
  useEffect(() => {
    if (!mapRef.current || !isLoaded || !userLocation) return;

    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Only show fake photographers distributed around user's location
    // This simulates the final version where only photographers near the user are shown (for confidentiality)
    const allPhotographers = generateFakePhotographers(userLocation);

    // Add markers for each photographer
    allPhotographers.forEach((photographer) => {
      if (!photographer.homeLocation) return;

      const { lat, lng } = photographer.homeLocation;

      // Create marker element - non-interactive
      const el = document.createElement('div');
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#3b82f6';
      el.style.border = '3px solid white';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      el.style.pointerEvents = 'none'; // Make non-interactive

      // Create camera icon SVG
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '20');
      svg.setAttribute('height', '20');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'white');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');

      // Camera icon path
      const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path1.setAttribute('d', 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z');
      svg.appendChild(path1);
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '12');
      circle.setAttribute('cy', '13');
      circle.setAttribute('r', '3');
      svg.appendChild(circle);

      el.appendChild(svg);

      // Create marker without popup - non-interactive
      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Fit map to show all photographers
    if (allPhotographers.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      allPhotographers.forEach((photographer) => {
        if (photographer.homeLocation) {
          bounds.extend([photographer.homeLocation.lng, photographer.homeLocation.lat]);
        }
      });
      // Also include user location
      bounds.extend([userLocation.lng, userLocation.lat]);
      
      map.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 13,
      });
    }
  }, [isLoaded, userLocation]);

  // Update map style based on theme
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;

    const map = mapRef.current;
    const isDark = document.documentElement.classList.contains('dark');

    const targetStyle = isDark
      ? 'mapbox://styles/mapbox/dark-v11'
      : 'mapbox://styles/mapbox/streets-v12';

    map.setStyle(targetStyle);
  }, [isLoaded]);

  return (
    <div ref={mapContainerRef} className="absolute inset-0 h-full w-full">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80 z-10">
          <div className="text-muted-foreground">Loading map...</div>
        </div>
      )}
    </div>
  );
}

