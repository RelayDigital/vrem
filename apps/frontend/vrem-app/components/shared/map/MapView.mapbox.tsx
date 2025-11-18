'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { JobRequest, Photographer } from '../../../types';
import { AlertCircle, User, Building2 } from 'lucide-react';
import { Small, Muted } from '../../ui/typography';
import { Spinner } from '../../ui/spinner';
import { getLocationDisplay } from '../../../lib/utils';
import { useSidebar } from '../../ui/sidebar';

interface MapViewProps {
  jobs: JobRequest[];
  photographers: Photographer[];
  selectedJob?: JobRequest | null;
  selectedPhotographer?: Photographer | null;
  disablePopovers?: boolean;
}

export function MapView({ jobs, photographers, selectedJob, selectedPhotographer, disablePopovers = false }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupsRef = useRef<mapboxgl.Popup[]>([]);
  const polylineRef = useRef<mapboxgl.Marker | null>(null);
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentlyOpenPopupRef = useRef<mapboxgl.Popup | null>(null);
  
  // Get sidebar state to trigger map resize when sidebar toggles
  let sidebarState: string | undefined;
  try {
    const sidebar = useSidebar();
    sidebarState = sidebar.state;
  } catch {
    // Not within SidebarProvider, ignore
  }

  // Hide Mapbox watermark
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .mapboxgl-ctrl-logo {
        display: none !important;
      }
      .mapboxgl-ctrl-attrib {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setError('Mapbox token not configured');
      console.warn('Please add NEXT_PUBLIC_MAPBOX_TOKEN to your .env.local file');
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      attributionControl: false,
    });

    map.on('load', () => {
      setIsLoaded(true);
      setError(null);
      // Resize map after initial load to ensure it fills container
      setTimeout(() => {
        map.resize();
      }, 100);
    });

    map.on('error', (e) => {
      console.error('Mapbox error:', e);
      setError('Failed to load map');
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Resize map when sidebar state changes or container dimensions change
  useEffect(() => {
    if (!mapRef.current || !isLoaded || !mapContainerRef.current) return;

    const resizeMap = () => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    };

    // Resize on sidebar state change (with delay for transition)
    const timeoutId = setTimeout(() => {
      resizeMap();
    }, 250); // Match sidebar transition duration (200ms) + buffer

    // Also use ResizeObserver to catch any dimension changes
    const resizeObserver = new ResizeObserver(() => {
      resizeMap();
    });
    resizeObserver.observe(mapContainerRef.current);

    // Also listen to window resize
    window.addEventListener('resize', resizeMap);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', resizeMap);
    };
  }, [sidebarState, isLoaded]);

  // Helper function to create icon element from Lucide icon
  const createIconElement = (iconComponent: typeof Building2 | typeof User, color: string, size: number = 32): HTMLElement => {
    const el = document.createElement('div');
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.borderRadius = '50%';
    el.style.backgroundColor = color;
    el.style.border = '2.5px solid white';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    el.style.cursor = 'pointer';

    // Create SVG for the icon
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', `${size * 0.5}`);
    svg.setAttribute('height', `${size * 0.5}`);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'white');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    if (iconComponent === Building2) {
      const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path1.setAttribute('d', 'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z');
      path1.setAttribute('fill', 'white');
      path1.setAttribute('fill-opacity', '0.9');
      svg.appendChild(path1);
      const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path2.setAttribute('d', 'M6 12h12');
      svg.appendChild(path2);
      const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path3.setAttribute('d', 'M6 20h12');
      svg.appendChild(path3);
      const path4 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path4.setAttribute('d', 'M10 6h4');
      svg.appendChild(path4);
      const path5 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path5.setAttribute('d', 'M10 8h4');
      svg.appendChild(path5);
      const path6 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path6.setAttribute('d', 'M10 16h4');
      svg.appendChild(path6);
    } else if (iconComponent === User) {
      const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path1.setAttribute('d', 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2');
      svg.appendChild(path1);
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '12');
      circle.setAttribute('cy', '7');
      circle.setAttribute('r', '4');
      svg.appendChild(circle);
    }

    el.appendChild(svg);
    return el;
  };

  // Create markers and popups
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;

    const map = mapRef.current;

    // Clear existing markers and popups
    markersRef.current.forEach((marker) => marker.remove());
    popupsRef.current.forEach((popup) => popup.remove());
    markersRef.current = [];
    popupsRef.current = [];

    const bounds = new mapboxgl.LngLatBounds();
    const pendingJobs = jobs.filter((j) => j.status === 'pending');
    const assignedJobs = jobs.filter((j) => j.status === 'assigned' || j.status === 'in_progress');
    const otherJobs = jobs.filter((j) => !['pending', 'assigned', 'in_progress'].includes(j.status));

    // Helper to create popup content
    const createJobPopupContent = (job: JobRequest, statusLabel: string, statusBg: string, statusColor: string) => {
      const priorityColors: Record<string, string> = {
        urgent: '#ef4444',
        rush: '#f59e0b',
        standard: '#6b7280',
      };

      // Only show images for delivered jobs (when photographer has completed the job)
      const hasImage = !!(job.propertyImage && job.propertyImage.trim() !== '' && job.status === 'delivered');

      return `
        <div style="padding: 0; min-width: 240px; max-width: 280px; border-radius: 8px; overflow: hidden;">
          ${hasImage ? `
            <img src="${job.propertyImage}" alt="${job.propertyAddress}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px 8px 0 0; display: block;" />
          ` : ''}
          <div style="padding: 10px; ${!hasImage ? 'border-radius: 8px;' : ''}">
            <div style="font-size: 14px; font-weight: 600; color: #1f2937; margin-bottom: 8px; line-height: 1.3;">
              ${job.propertyAddress}
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px;">
              <span style="padding: 3px 8px; background: ${statusBg}; color: ${statusColor}; border-radius: 4px; font-size: 10px; font-weight: 500;">
                ${statusLabel}
              </span>
              <span style="padding: 3px 8px; background: ${priorityColors[job.priority] === '#ef4444' ? '#fee2e2' : priorityColors[job.priority] === '#f59e0b' ? '#fef3c7' : '#f3f4f6'}; color: ${priorityColors[job.priority]}; border-radius: 4px; font-size: 10px; font-weight: 500; text-transform: capitalize;">
                ${job.priority}
              </span>
            </div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">
              <strong>Client:</strong> ${job.clientName}
            </div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 10px;">
              <strong>Schedule:</strong> ${job.scheduledDate} at ${job.scheduledTime}
            </div>
            <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 6px;">
              ${job.mediaType.map((type) => `
                <span style="padding: 3px 8px; background: #f3f4f6; border-radius: 4px; font-size: 10px; color: #374151; text-transform: capitalize;">
                  ${type}
                </span>
              `).join('')}
            </div>
            ${job.estimatedDuration ? `
              <div style="font-size: 11px; color: #6b7280; margin-top: 6px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
                Duration: ${job.estimatedDuration} minutes
              </div>
            ` : ''}
          </div>
        </div>
      `;
    };

    // Pending jobs (red)
    pendingJobs.forEach((job) => {
      const lngLat = [job.location.lng, job.location.lat] as [number, number];
      bounds.extend(lngLat);

      const el = createIconElement(Building2, '#ef4444', 32);
      if (selectedJob?.id === job.id) {
        el.style.animation = 'bounce 0.6s ease-in-out';
        setTimeout(() => {
          el.style.animation = '';
        }, 2000);
      }

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(lngLat)
        .addTo(map);

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false, closeOnClick: true })
        .setHTML(createJobPopupContent(job, 'Pending', '#fee2e2', '#991b1b'))
        .setMaxWidth('280px');

      if (!disablePopovers) {
      marker.setPopup(popup);
      }

      if (!disablePopovers) {
      marker.getElement().addEventListener('click', () => {
          // Toggle popup: if it's already open, close it; otherwise open it
          if (currentlyOpenPopupRef.current === popup) {
            popup.remove();
            currentlyOpenPopupRef.current = null;
          } else {
        if (currentlyOpenPopupRef.current) {
          currentlyOpenPopupRef.current.remove();
        }
        popup.addTo(map);
        currentlyOpenPopupRef.current = popup;
          }
      });
      }

      markersRef.current.push(marker);
      popupsRef.current.push(popup);
    });

    // Assigned/In Progress jobs (blue)
    assignedJobs.forEach((job) => {
      const lngLat = [job.location.lng, job.location.lat] as [number, number];
      bounds.extend(lngLat);

      const el = createIconElement(Building2, '#3b82f6', 32);
      if (selectedJob?.id === job.id) {
        el.style.animation = 'bounce 0.6s ease-in-out';
        setTimeout(() => {
          el.style.animation = '';
        }, 2000);
      }

      const assignedPhotographer = photographers.find((p) => p.id === job.assignedPhotographerId);
      const statusLabel = job.status === 'in_progress' ? 'In Progress' : 'Assigned';

      const popupContent = createJobPopupContent(job, statusLabel, '#dbeafe', '#1e40af');
      const popupContentWithPhotographer = assignedPhotographer
        ? popupContent.replace(
            '<div style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">',
            `<div style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">
              <strong>Photographer:</strong> ${assignedPhotographer.name}
            </div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">`
          )
        : popupContent;

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(lngLat)
        .addTo(map);

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false, closeOnClick: true })
        .setHTML(popupContentWithPhotographer)
        .setMaxWidth('280px');

      if (!disablePopovers) {
      marker.setPopup(popup);
      }

      if (!disablePopovers) {
      marker.getElement().addEventListener('click', () => {
          // Toggle popup: if it's already open, close it; otherwise open it
          if (currentlyOpenPopupRef.current === popup) {
            popup.remove();
            currentlyOpenPopupRef.current = null;
          } else {
        if (currentlyOpenPopupRef.current) {
          currentlyOpenPopupRef.current.remove();
        }
        popup.addTo(map);
        currentlyOpenPopupRef.current = popup;
          }
      });
      }

      markersRef.current.push(marker);
      popupsRef.current.push(popup);
    });

    // Other jobs (gray)
    otherJobs.forEach((job) => {
      const lngLat = [job.location.lng, job.location.lat] as [number, number];
      bounds.extend(lngLat);

      const el = createIconElement(Building2, '#9ca3af', 32);

      const statusColors: Record<string, { bg: string; color: string }> = {
        delivered: { bg: '#d1fae5', color: '#065f46' },
        cancelled: { bg: '#fee2e2', color: '#991b1b' },
        editing: { bg: '#fef3c7', color: '#92400e' },
      };

      const statusConfig = statusColors[job.status] || { bg: '#f3f4f6', color: '#374151' };

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(lngLat)
        .addTo(map);

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false, closeOnClick: true })
        .setHTML(createJobPopupContent(job, job.status, statusConfig.bg, statusConfig.color))
        .setMaxWidth('280px');

      if (!disablePopovers) {
      marker.setPopup(popup);
      }

      if (!disablePopovers) {
      marker.getElement().addEventListener('click', () => {
          // Toggle popup: if it's already open, close it; otherwise open it
          if (currentlyOpenPopupRef.current === popup) {
            popup.remove();
            currentlyOpenPopupRef.current = null;
          } else {
        if (currentlyOpenPopupRef.current) {
          currentlyOpenPopupRef.current.remove();
        }
        popup.addTo(map);
        currentlyOpenPopupRef.current = popup;
          }
      });
      }

      markersRef.current.push(marker);
      popupsRef.current.push(popup);
    });

    // Create markers for photographers
    photographers.forEach((photographer) => {
      const lngLat = [photographer.homeLocation.lng, photographer.homeLocation.lat] as [number, number];
      bounds.extend(lngLat);

      const today = new Date().toISOString().split('T')[0];
      const isAvailable =
        photographer.availability.find((a) => a.date === today)?.available || false;

      const el = createIconElement(User, isAvailable ? '#22c55e' : '#9ca3af', 32);

      const popupContent = `
        <div style="padding: 0; min-width: 240px; max-width: 280px;">
          <div style="padding: 10px;">
            <div style="font-size: 14px; font-weight: 600; color: #1f2937; margin-bottom: 8px; line-height: 1.3;">
              ${photographer.name}
            </div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
              ${photographer.avatar ? `
                <img src="${photographer.avatar}" alt="${photographer.name}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid ${isAvailable ? '#22c55e' : '#9ca3af'};" />
              ` : `
                <div style="width: 48px; height: 48px; border-radius: 50%; background: ${isAvailable ? '#d1fae5' : '#f3f4f6'}; display: flex; align-items: center; justify-content: center; border: 2px solid ${isAvailable ? '#22c55e' : '#9ca3af'}; color: ${isAvailable ? '#065f46' : '#6b7280'}; font-weight: 600; font-size: 18px;">
                  ${photographer.name.split(' ').map(n => n[0]).join('')}
                </div>
              `}
              <div style="flex: 1;">
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                  <span style="padding: 3px 8px; background: ${isAvailable ? '#d1fae5' : '#f3f4f6'}; color: ${isAvailable ? '#065f46' : '#6b7280'}; border-radius: 4px; font-size: 10px; font-weight: 500;">
                    ${isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                  ${photographer.rating.overall ? `
                    <span style="padding: 3px 8px; background: #fef3c7; color: #92400e; border-radius: 4px; font-size: 10px; font-weight: 500;">
                      ⭐ ${photographer.rating.overall}
                    </span>
                  ` : ''}
                </div>
              </div>
            </div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">
              <strong>Location:</strong> ${getLocationDisplay(photographer.homeLocation.address, true)}
            </div>
            ${photographer.companyName ? `
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">
                <strong>Company:</strong> ${photographer.companyName}
              </div>
            ` : photographer.isIndependent ? `
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">
                <strong>Status:</strong> Independent
              </div>
            ` : ''}
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
              <div style="text-align: center;">
                <div style="font-size: 16px; font-weight: 600; color: #1f2937;">${photographer.reliability.totalJobs}</div>
                <div style="font-size: 10px; color: #6b7280;">Jobs</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 16px; font-weight: 600; color: #1f2937;">${(photographer.reliability.onTimeRate * 100).toFixed(0)}%</div>
                <div style="font-size: 10px; color: #6b7280;">On-Time</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 16px; font-weight: 600; color: #1f2937;">${photographer.rating.overall}</div>
                <div style="font-size: 10px; color: #6b7280;">Rating</div>
              </div>
            </div>
            ${photographer.bio ? `
              <div style="font-size: 11px; color: #6b7280; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb; line-height: 1.4;">
                ${photographer.bio}
              </div>
            ` : ''}
          </div>
        </div>
      `;

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(lngLat)
        .addTo(map);

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false, closeOnClick: true })
        .setHTML(popupContent)
        .setMaxWidth('280px');

      if (!disablePopovers) {
      marker.setPopup(popup);
      }

      if (!disablePopovers) {
      marker.getElement().addEventListener('click', () => {
          // Toggle popup: if it's already open, close it; otherwise open it
          if (currentlyOpenPopupRef.current === popup) {
            popup.remove();
            currentlyOpenPopupRef.current = null;
          } else {
        if (currentlyOpenPopupRef.current) {
          currentlyOpenPopupRef.current.remove();
        }
        popup.addTo(map);
        currentlyOpenPopupRef.current = popup;
          }
      });
      }

      markersRef.current.push(marker);
      popupsRef.current.push(popup);
    });

    // Fit bounds to show all markers
    if (markersRef.current.length > 0) {
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      if (ne.lat !== sw.lat || ne.lng !== sw.lng) {
        map.fitBounds(bounds, { padding: { top: 50, right: 50, bottom: 50, left: 50 } });
      } else {
        const firstMarker = markersRef.current[0];
        const lngLat = firstMarker.getLngLat();
        map.setCenter(lngLat);
        map.setZoom(15);
      }
    }
  }, [mapRef.current, isLoaded, jobs, photographers, selectedJob]);

  // Draw polyline from selected photographer to job location
  useEffect(() => {
    if (!mapRef.current || !isLoaded || !selectedPhotographer || !selectedJob) {
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
      return;
    }

    const map = mapRef.current;
    const photographerLngLat: [number, number] = [
      selectedPhotographer.homeLocation.lng,
      selectedPhotographer.homeLocation.lat,
    ];
    const jobLngLat: [number, number] = [selectedJob.location.lng, selectedJob.location.lat];

    // Use Mapbox Directions API
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${photographerLngLat[0]},${photographerLngLat[1]};${jobLngLat[0]},${jobLngLat[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`;

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        if (data.code === 'Ok' && data.routes && data.routes[0]) {
          const route = data.routes[0].geometry;

          // Remove existing route layer and source if they exist
          if (map.getLayer('route')) {
            map.removeLayer('route');
          }
          if (map.getSource('route')) {
            map.removeSource('route');
          }

          // Add route source
          map.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: route,
            },
          });

          // Add route layer
          map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#3b82f6',
              'line-width': 5,
              'line-opacity': 0.8,
            },
          });

          // Fit bounds to route
          const bounds = new mapboxgl.LngLatBounds();
          const coordinates = route.coordinates as [number, number][];
          coordinates.forEach((coord) => {
            bounds.extend(coord);
          });
          map.fitBounds(bounds, { padding: { top: 50, right: 50, bottom: 50, left: 50 } });
        } else {
          console.error('Directions request failed:', data);
        }
      })
      .catch((err) => {
        console.error('Error fetching directions:', err);
      });

    return () => {
      if (map.getLayer('route')) {
        map.removeLayer('route');
      }
      if (map.getSource('route')) {
        map.removeSource('route');
      }
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
    };
  }, [mapRef.current, isLoaded, selectedPhotographer?.id, selectedJob?.id]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/50 rounded-lg">
        <div className="text-center p-6">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <Muted>{error}</Muted>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/50 rounded-lg">
        <div className="text-center p-6">
          <Spinner className="h-8 w-8 mx-auto mb-2 text-primary" />
          <Muted>Loading map...</Muted>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border z-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white" />
            <Small className="text-muted-foreground">Pending Jobs ({jobs.filter((j) => j.status === 'pending').length})</Small>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
            <Small className="text-muted-foreground">Assigned/In Progress</Small>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
            <Small className="text-muted-foreground">Available Photographers</Small>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400 border-2 border-white" />
            <Small className="text-muted-foreground">Unavailable</Small>
          </div>
        </div>
      </div>
    </div>
  );
}

