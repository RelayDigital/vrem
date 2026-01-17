'use client';

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { MapContext } from '../../context/map-context';

// Set access token
if (typeof window !== 'undefined') {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (token) {
    mapboxgl.accessToken = token;
  }
}

type MapProviderProps = {
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  children?: React.ReactNode;
};

export default function MapProvider({
  mapContainerRef,
  initialViewState = {
    longitude: -114.0719, // Calgary default
    latitude: 51.0447,
    zoom: 10,
  },
  children,
}: MapProviderProps) {
  const map = useRef<mapboxgl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || map.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error('NEXT_PUBLIC_MAPBOX_TOKEN is not set');
      return;
    }

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [initialViewState.longitude, initialViewState.latitude],
      zoom: initialViewState.zoom,
      attributionControl: false,
    });

    map.current.on('load', () => {
      setLoaded(true);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [initialViewState, mapContainerRef]);

  return (
    <MapContext.Provider value={{ map: map.current }}>
      {children}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-[1000]">
          <div className="text-lg font-medium">Loading map...</div>
        </div>
      )}
    </MapContext.Provider>
  );
}

