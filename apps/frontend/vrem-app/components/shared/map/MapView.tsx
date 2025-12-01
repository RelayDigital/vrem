'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { JobRequest, Technician } from '../../../types';
import { AlertCircle, User, Home } from 'lucide-react';
import { Small, Muted } from '../../ui/typography';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '../../ui/spinner';
import { getLocationDisplay } from '../../../lib/utils';
import { useSidebar } from '../../ui/sidebar';
import { useTheme } from 'next-themes';

interface MapViewProps {
  jobs: JobRequest[];
  technicians?: Technician[];
  selectedJob?: JobRequest | null;
  selectedTechnician?: Technician | null; // Deprecated: use selectedTechnician
  disablePopovers?: boolean;
}

export function MapView({ jobs, technicians, selectedJob, selectedTechnician, disablePopovers = false }: MapViewProps) {
  const effectiveTechnicians = technicians || [];
  const effectiveSelectedTechnician = selectedTechnician || null;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupsRef = useRef<mapboxgl.Popup[]>([]);
  const technicianPopupsRef = useRef<Map<string, mapboxgl.Popup>>(new Map());
  const jobMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const jobPopupsRef = useRef<Map<string, mapboxgl.Popup>>(new Map());
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentlyOpenPopupRef = useRef<mapboxgl.Popup | null>(null);
  const { resolvedTheme } = useTheme();

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
      
      /* Override Mapbox popup styles for theme support */
      .mapboxgl-popup-content {
        background-color: var(--popover) !important;
        color: var(--popover-foreground) !important;
        border: 1px solid var(--border);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
        padding: 0 !important; /* Remove default padding to let our content control it */
        max-width: none !important; /* Allow our custom width */
      }
      
      .mapboxgl-popup {
        max-width: none !important; /* Allow wider popups */
      }
      
      .mapboxgl-popup-tip {
        border-top-color: var(--border) !important;
        border-bottom-color: var(--border) !important;
      }
      
      /* Adjust tip color based on position (Mapbox adds classes like mapboxgl-popup-anchor-bottom) */
      .mapboxgl-popup-anchor-bottom .mapboxgl-popup-tip {
        border-top-color: var(--popover) !important;
      }
      .mapboxgl-popup-anchor-top .mapboxgl-popup-tip {
        border-bottom-color: var(--popover) !important;
      }
      .mapboxgl-popup-anchor-left .mapboxgl-popup-tip {
        border-right-color: var(--popover) !important;
      }
      .mapboxgl-popup-anchor-right .mapboxgl-popup-tip {
        border-left-color: var(--popover) !important;
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

    const container = mapContainerRef.current;

    // Wait for container to have dimensions before initializing
    let retryCount = 0;
    const maxRetries = 50; // ~5 seconds max wait time

    const checkDimensions = () => {
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        retryCount++;
        if (retryCount >= maxRetries) {
          console.error('Map container never got dimensions, initializing anyway');
          // Initialize anyway - Mapbox might handle it
        } else {
          // Container not ready yet, retry
          requestAnimationFrame(checkDimensions);
          return;
        }
      }

      // Container has dimensions (or we've given up waiting), initialize map
      mapboxgl.accessToken = token;

      try {
        const map = new mapboxgl.Map({
          container: container,
          style: 'mapbox://styles/mapbox/streets-v12',
          attributionControl: false,
        });

        map.on('load', () => {
          console.log('Mapbox map loaded successfully');
          setIsLoaded(true);
          setError(null);
          // Resize map after initial load to ensure it fills container
          setTimeout(() => {
            if (mapRef.current && mapRef.current === map) {
              try {
                map.resize();
              } catch (err) {
                console.warn('Error resizing map:', err);
              }
            }
          }, 100);
        });

        map.on('error', (e: any) => {
          console.error('Mapbox error:', e);
          const errorMessage = e.error?.message || e.message || 'Unknown error';
          setError(`Failed to load map: ${errorMessage}`);
          setIsLoaded(false);
        });

        // Also listen for style load as a fallback (in case 'load' event doesn't fire)
        map.on('style.load', () => {
          console.log('Mapbox style loaded');
          setIsLoaded((prev) => {
            if (!prev) {
              return true;
            }
            return prev;
          });
          setError(null);
          // Resize map after style loads to ensure it fills container
          setTimeout(() => {
            if (mapRef.current && mapRef.current === map) {
              try {
                map.resize();
              } catch (err) {
                console.warn('Error resizing map:', err);
              }
            }
          }, 100);
        });

        mapRef.current = map;
      } catch (err: any) {
        console.error('Error creating Mapbox map:', err);
        setError(`Failed to initialize map: ${err.message || 'Unknown error'}`);
      }
    };

    // Start checking dimensions
    checkDimensions();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map style when theme changes
  useEffect(() => {
    if (!mapRef.current) return;

    const targetStyle = resolvedTheme === 'dark'
      ? 'mapbox://styles/mapbox/dark-v11'
      : 'mapbox://styles/mapbox/streets-v12';

    // Set isLoaded to false to prevent other effects from trying to add layers to a loading style
    // The 'style.load' event listener will set it back to true when the new style is ready
    setIsLoaded(false);

    try {
      mapRef.current.setStyle(targetStyle);
    } catch (err) {
      console.error('Error setting map style:', err);
      // If error, ensure we set isLoaded back to true so app doesn't hang
      setIsLoaded(true);
    }
  }, [resolvedTheme]);

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

  // Helper to get CSS variable value
  const getCSSVar = (varName: string): string => {
    if (typeof window === 'undefined') return '';
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  };

  // Helper to get status color
  const getStatusColor = (status: string): string => {
    // Convert underscore to hyphen for CSS variable names
    const statusVarName = status.replace('_', '-');
    const statusMap: Record<string, string> = {
      pending: getCSSVar('--status-pending') || '#ef4444',
      assigned: getCSSVar('--status-assigned') || '#3b82f6',
      'in-progress': getCSSVar('--status-in-progress') || '#3b82f6',
      'in_progress': getCSSVar('--status-in-progress') || '#3b82f6',
      editing: getCSSVar('--status-editing') || '#f59e0b',
      delivered: getCSSVar('--status-delivered') || '#22c55e',
      cancelled: getCSSVar('--status-cancelled') || '#9ca3af',
    };
    return statusMap[status] || getCSSVar(`--status-${statusVarName}`) || getCSSVar('--status-cancelled') || '#9ca3af';
  };

  // Helper to get priority color
  const getPriorityColor = (priority: string): string => {
    const priorityMap: Record<string, string> = {
      urgent: getCSSVar('--priority-urgent') || '#ef4444',
      rush: getCSSVar('--priority-rush') || '#f59e0b',
      standard: getCSSVar('--priority-standard') || '#6b7280',
    };
    return priorityMap[priority] || getCSSVar('--priority-standard') || '#6b7280';
  };

  // Helper to get text color (foreground)
  const getTextColor = (): string => {
    return getCSSVar('--foreground') || '#1f2937';
  };

  // Helper to get muted text color
  const getMutedTextColor = (): string => {
    return getCSSVar('--muted-foreground') || '#6b7280';
  };

  // Helper to get background color
  const getBackgroundColor = (): string => {
    return getCSSVar('--background') || '#ffffff';
  };

  // Helper to get muted background color
  const getMutedBackgroundColor = (): string => {
    return getCSSVar('--muted') || '#f3f4f6';
  };

  // Helper to convert CSS color (OKLCH, hex, etc.) to hex for Mapbox compatibility
  const colorToHex = (color: string): string => {
    if (!color) return '#000000';
    // If already hex, return as is
    if (color.startsWith('#')) {
      return color.length === 7 ? color : '#000000';
    }
    // Use browser to convert any CSS color to RGB, then to hex
    if (typeof window !== 'undefined') {
      const tempEl = document.createElement('div');
      tempEl.style.color = color;
      tempEl.style.position = 'absolute';
      tempEl.style.visibility = 'hidden';
      tempEl.style.opacity = '0';
      document.body.appendChild(tempEl);
      const computedColor = getComputedStyle(tempEl).color;
      document.body.removeChild(tempEl);

      // Parse rgb(r, g, b) or rgba(r, g, b, a) to hex
      const rgbMatch = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
        const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
        const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
      }
    }
    // Fallback
    return '#000000';
  };

  // Helper to add opacity to a color (works with OKLCH and other formats)
  const addOpacity = (color: string, opacity: number): string => {
    if (!color) return '';
    // If it's already OKLCH, add opacity
    if (color.startsWith('oklch(')) {
      // Remove closing paren and add opacity
      return color.replace(/\)$/, ` / ${opacity})`);
    }
    // For hex colors, convert to rgba
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    // Fallback: try to use color-mix
    return `color-mix(in srgb, ${color} ${opacity * 100}%, transparent)`;
  };

  // Helper function to create icon element from Lucide icon
  const createIconElement = (iconComponent: typeof Home | typeof User, color: string, size: number = 32): HTMLElement => {
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

    if (iconComponent === Home) {
      // Simple house icon - roof and base
      const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path1.setAttribute('d', 'm3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z');
      path1.setAttribute('fill', 'white');
      path1.setAttribute('fill-opacity', '0.9');
      svg.appendChild(path1);
      const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path2.setAttribute('d', 'M9 22V12h6v10');
      svg.appendChild(path2);
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
    technicianPopupsRef.current.clear();
    jobMarkersRef.current.clear();
    jobPopupsRef.current.clear();

    const bounds = new mapboxgl.LngLatBounds();
    const pendingJobs = jobs.filter((j) => j.status === 'pending');
    const assignedJobs = jobs.filter((j) => j.status === 'assigned' || j.status === 'in_progress');
    const otherJobs = jobs.filter((j) => !['pending', 'assigned', 'in_progress'].includes(j.status));

    // Helper to create popup content
    const createJobPopupContent = (job: JobRequest, statusLabel: string, statusBg: string, statusColor: string) => {
      const priorityColor = getPriorityColor(job.priority);
      const priorityColorValue = getCSSVar(`--priority-${job.priority}`);
      const priorityBgMap: Record<string, string> = {
        urgent: priorityColorValue ? addOpacity(priorityColorValue, 0.2) : '#fee2e2',
        rush: priorityColorValue ? addOpacity(priorityColorValue, 0.2) : '#fef3c7',
        standard: getMutedBackgroundColor(),
      };
      const priorityBg = priorityBgMap[job.priority] || getMutedBackgroundColor();

      // Only show images for delivered jobs (when technician has completed the job)
      const hasImage = !!(job.propertyImage && job.propertyImage.trim() !== '' && job.status === 'delivered');

      return `
        <div style="display: flex; align-items: stretch; min-width: 280px; max-width: 340px; border-radius: 8px; overflow: hidden;">
          ${hasImage ? `
            <div style="width: 80px; min-width: 80px; background-image: url('${job.propertyImage}'); background-size: cover; background-position: center;"></div>
          ` : ''}
          <div style="padding: 10px; flex: 1; display: flex; flex-direction: column; justify-content: center;">
            <div style="font-size: 13px; font-weight: 600; color: ${getTextColor()}; margin-bottom: 5px; line-height: 1.2;">
              ${job.propertyAddress}
            </div>
            <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 6px;">
              <span style="padding: 1px 5px; background: ${statusBg}; color: ${statusColor}; border-radius: 3px; font-size: 9px; font-weight: 500;">
                ${statusLabel}
              </span>
              <span style="padding: 1px 5px; background: ${priorityBg}; color: ${priorityColor}; border-radius: 3px; font-size: 9px; font-weight: 500; text-transform: capitalize;">
                ${job.priority}
              </span>
            </div>
            <div style="font-size: 10px; color: ${getMutedTextColor()}; margin-bottom: 3px;">
              <span style="font-weight: 500;">Client:</span> ${job.clientName}
            </div>
            <div style="font-size: 10px; color: ${getMutedTextColor()}; margin-bottom: 6px;">
              <span style="font-weight: 500;">Schedule:</span> ${job.scheduledDate} • ${job.scheduledTime}
            </div>
            <div style="display: flex; gap: 3px; flex-wrap: wrap;">
              ${job.mediaType.slice(0, 3).map((type) => `
                <span style="padding: 1px 5px; background: ${getMutedBackgroundColor()}; border-radius: 3px; font-size: 9px; color: ${getTextColor()}; text-transform: capitalize;">
                  ${type}
                </span>
              `).join('')}
              ${job.mediaType.length > 3 ? `
                <span style="padding: 1px 5px; background: ${getMutedBackgroundColor()}; border-radius: 3px; font-size: 9px; color: ${getTextColor()};">
                  +${job.mediaType.length - 3}
                </span>
              ` : ''}
            </div>
            ${job.estimatedDuration ? `
              <div style="font-size: 9px; color: ${getMutedTextColor()}; margin-top: 5px; padding-top: 5px; border-top: 1px solid ${getCSSVar('--border') || '#e5e7eb'};">
                Duration: ${job.estimatedDuration} min
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

      const pendingColor = getStatusColor('pending');
      const pendingColorValue = getCSSVar('--status-pending');
      const pendingBg = pendingColorValue ? addOpacity(pendingColorValue, 0.2) : '#fee2e2';
      const pendingText = getCSSVar('--status-pending-foreground') || getTextColor();
      const el = createIconElement(Home, pendingColor, 32);
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
        .setLngLat(lngLat)
        .setHTML(createJobPopupContent(job, 'Pending', pendingBg, pendingText))
        .setMaxWidth('280px');

      if (!disablePopovers) {
        marker.getElement().addEventListener('click', (e) => {
          e.stopPropagation();
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
      jobMarkersRef.current.set(job.id, marker);
      jobPopupsRef.current.set(job.id, popup);
    });

    // Assigned/In Progress jobs (blue)
    assignedJobs.forEach((job) => {
      const lngLat = [job.location.lng, job.location.lat] as [number, number];
      bounds.extend(lngLat);

      const assignedColor = getStatusColor(job.status === 'assigned' ? 'assigned' : 'in_progress');
      const el = createIconElement(Home, assignedColor, 32);
      if (selectedJob?.id === job.id) {
        el.style.animation = 'bounce 0.6s ease-in-out';
        setTimeout(() => {
          el.style.animation = '';
        }, 2000);
      }

      const assignedId = job.assignedTechnicianId || job.assignedTechnicianId;
      const assignedTechnician = assignedId ? effectiveTechnicians.find((p) => p.id === assignedId) : undefined;
      const statusLabel = job.status === 'in_progress' ? 'In Progress' : 'Assigned';

      const statusKey = job.status === 'assigned' ? 'assigned' : 'in-progress';
      const assignedColorValue = getCSSVar(`--status-${statusKey}`);
      const assignedBg = assignedColorValue ? addOpacity(assignedColorValue, 0.2) : '#dbeafe';
      // Use the status color itself for text (not foreground) to ensure good contrast on light background
      const assignedText = assignedColor || getTextColor();
      const popupContent = createJobPopupContent(job, statusLabel, assignedBg, assignedText);
      const popupContentWithTechnician = assignedTechnician
        ? popupContent.replace(
          `<div style="font-size: 13px; color: ${getMutedTextColor()}; margin-bottom: 8px;">`,
          `<div style="font-size: 13px; color: ${getMutedTextColor()}; margin-bottom: 8px;">
              <strong>Technician:</strong> ${assignedTechnician.name}
            </div>
            <div style="font-size: 13px; color: ${getMutedTextColor()}; margin-bottom: 8px;">`
        )
        : popupContent;

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(lngLat)
        .addTo(map);

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false, closeOnClick: true })
        .setLngLat(lngLat)
        .setHTML(popupContentWithTechnician)
        .setMaxWidth('280px');

      if (!disablePopovers) {
        marker.getElement().addEventListener('click', (e) => {
          e.stopPropagation();
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
      jobMarkersRef.current.set(job.id, marker);
      jobPopupsRef.current.set(job.id, popup);
    });

    // Other jobs (gray)
    otherJobs.forEach((job) => {
      const lngLat = [job.location.lng, job.location.lat] as [number, number];
      bounds.extend(lngLat);

      const otherColor = getStatusColor(job.status);
      const el = createIconElement(Home, otherColor, 32);

      const getStatusConfig = (status: string) => {
        const statusColor = getStatusColor(status);
        const statusVarName = status.replace('_', '-'); // Convert in_progress to in-progress
        const statusColorValue = getCSSVar(`--status-${statusVarName}`);
        const statusBg = statusColorValue ? addOpacity(statusColorValue, 0.2) : getMutedBackgroundColor();
        const statusText = getCSSVar(`--status-${statusVarName}-foreground`) || getTextColor();
        return { bg: statusBg, color: statusText };
      };

      const statusConfig = getStatusConfig(job.status) || { bg: getMutedBackgroundColor(), color: getTextColor() };

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(lngLat)
        .addTo(map);

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false, closeOnClick: true })
        .setLngLat(lngLat)
        .setHTML(createJobPopupContent(job, job.status, statusConfig.bg, statusConfig.color))
        .setMaxWidth('280px');

      if (!disablePopovers) {
        marker.getElement().addEventListener('click', (e) => {
          e.stopPropagation();
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
      jobMarkersRef.current.set(job.id, marker);
      jobPopupsRef.current.set(job.id, popup);
    });

    // Create markers for technicians
    effectiveTechnicians.forEach((technician) => {
      const lngLat = [technician.homeLocation.lng, technician.homeLocation.lat] as [number, number];
      bounds.extend(lngLat);

      const today = new Date().toISOString().split('T')[0];
      const isAvailable =
        technician.availability.find((a) => a.date === today)?.available || false;

      // Use neutral color for technician markers
      const technicianColor = getCSSVar('--muted-foreground') || '#6b7280';
      const el = createIconElement(User, technicianColor, 32);

      // Keep availableColor for popup styling (availability badges, etc.)
      const availableColor = isAvailable ? getStatusColor('delivered') : getStatusColor('cancelled');

      const deliveredColor = getStatusColor('delivered');
      const deliveredColorValue = getCSSVar('--status-delivered');
      const deliveredBg = deliveredColorValue ? addOpacity(deliveredColorValue, 0.2) : '#d1fae5';
      // Use the status color itself for text (not foreground) to ensure good contrast on light background
      const deliveredText = deliveredColor || getTextColor();
      const cancelledColor = getStatusColor('cancelled');
      const cancelledColorValue = getCSSVar('--status-cancelled');
      const cancelledBg = cancelledColorValue ? addOpacity(cancelledColorValue, 0.2) : getMutedBackgroundColor();
      // Use the status color itself for text (not foreground) to ensure good contrast on light background
      const cancelledText = cancelledColor || getMutedTextColor();
      const rushColorValue = getCSSVar('--priority-rush');
      const rushBg = rushColorValue ? addOpacity(rushColorValue, 0.2) : '#fef3c7';
      const rushText = rushColorValue || '#92400e';

      const popupContent = `
          <div style="display: flex; align-items: stretch; min-width: 280px; max-width: 340px; border-radius: 8px; overflow: hidden;">
            <div style="width: 64px; min-width: 64px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 12px; background: ${getMutedBackgroundColor()};">
              ${technician.avatar ? `
                <img src="${technician.avatar}" alt="${technician.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid ${availableColor};" />
              ` : `
                <div style="width: 40px; height: 40px; border-radius: 50%; background: ${isAvailable ? deliveredBg : cancelledBg}; display: flex; align-items: center; justify-content: center; border: 2px solid ${availableColor}; color: ${isAvailable ? deliveredText : cancelledText}; font-weight: 600; font-size: 16px;">
                  ${technician.name.split(' ').map(n => n[0]).join('')}
                </div>
              `}
              <div style="margin-top: 6px; display: flex; flex-direction: column; align-items: center; gap: 3px;">
                <span style="padding: 1px 5px; background: ${isAvailable ? deliveredBg : cancelledBg}; color: ${isAvailable ? deliveredText : cancelledText}; border-radius: 3px; font-size: 8px; font-weight: 500;">
                  ${isAvailable ? 'Available' : 'Unavailable'}
                </span>
                ${technician.rating.overall ? `
                  <span style="padding: 1px 5px; background: ${rushBg}; color: ${rushText}; border-radius: 3px; font-size: 8px; font-weight: 500;">
                    ⭐ ${technician.rating.overall}
                  </span>
                ` : ''}
              </div>
            </div>
            
            <div style="padding: 10px; flex: 1; display: flex; flex-direction: column; justify-content: center;">
              <div style="font-size: 13px; font-weight: 600; color: ${getTextColor()}; margin-bottom: 3px; line-height: 1.2;">
                ${technician.name}
              </div>
              
              <div style="font-size: 10px; color: ${getMutedTextColor()}; margin-bottom: 3px;">
                <span style="font-weight: 500;">Location:</span> ${getLocationDisplay(technician.homeLocation.address, true)}
              </div>
              
              ${technician.companyName ? `
                <div style="font-size: 10px; color: ${getMutedTextColor()}; margin-bottom: 3px;">
                  <span style="font-weight: 500;">Company:</span> ${technician.companyName}
                </div>
              ` : technician.isIndependent ? `
                <div style="font-size: 10px; color: ${getMutedTextColor()}; margin-bottom: 3px;">
                  <span style="font-weight: 500;">Status:</span> Independent
                </div>
              ` : ''}
              
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; margin-top: 6px; padding-top: 6px; border-top: 1px solid ${getCSSVar('--border') || '#e5e7eb'};">
                <div style="text-align: center;">
                  <div style="font-size: 12px; font-weight: 600; color: ${getTextColor()};">${technician.reliability.totalJobs}</div>
                  <div style="font-size: 8px; color: ${getMutedTextColor()};">Jobs</div>
                </div>
                <div style="text-align: center;">
                  <div style="font-size: 12px; font-weight: 600; color: ${getTextColor()};">${(technician.reliability.onTimeRate * 100).toFixed(0)}%</div>
                  <div style="font-size: 8px; color: ${getMutedTextColor()};">On-Time</div>
                </div>
                <div style="text-align: center;">
                  <div style="font-size: 12px; font-weight: 600; color: ${getTextColor()};">${technician.rating.overall}</div>
                  <div style="font-size: 8px; color: ${getMutedTextColor()};">Rating</div>
                </div>
              </div>
              
              ${technician.bio ? `
                <div style="font-size: 9px; color: ${getMutedTextColor()}; margin-top: 6px; padding-top: 6px; border-top: 1px solid ${getCSSVar('--border') || '#e5e7eb'}; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                  ${technician.bio}
                </div>
              ` : ''}
            </div>
          </div>
        `;

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(lngLat)
        .addTo(map);

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: true
      })
        .setLngLat(lngLat)
        .setHTML(popupContent)
        .setMaxWidth('280px');

      if (!disablePopovers) {
        marker.getElement().addEventListener('click', (e) => {
          e.stopPropagation();
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
      technicianPopupsRef.current.set(technician.id, popup);
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
  }, [mapRef.current, isLoaded, jobs, technicians, selectedJob]);

  // Handle job selection: highlight marker and open popup
  useEffect(() => {
    if (!mapRef.current || !isLoaded) {
      return;
    }

    const map = mapRef.current;

    if (!selectedJob) {
      // Close any open popup if no job is selected
      if (currentlyOpenPopupRef.current) {
        currentlyOpenPopupRef.current.remove();
        currentlyOpenPopupRef.current = null;
      }

      // Reset map view to show all markers
      if (markersRef.current.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        markersRef.current.forEach((marker) => {
          const lngLat = marker.getLngLat();
          bounds.extend([lngLat.lng, lngLat.lat]);
        });

        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        if (ne.lat !== sw.lat || ne.lng !== sw.lng) {
          map.fitBounds(bounds, { padding: { top: 50, right: 50, bottom: 50, left: 50 } });
        }
      }
      return;
    }

    const marker = jobMarkersRef.current.get(selectedJob.id);
    const popup = jobPopupsRef.current.get(selectedJob.id);

    if (marker && popup) {
      // Highlight the marker with animation
      const markerElement = marker.getElement();
      markerElement.style.animation = 'bounce 0.6s ease-in-out';
      setTimeout(() => {
        markerElement.style.animation = '';
      }, 2000);

      // Close any currently open popup
      if (currentlyOpenPopupRef.current && currentlyOpenPopupRef.current !== popup) {
        currentlyOpenPopupRef.current.remove();
      }

      // Get the location for centering the map
      const lngLat: [number, number] = [selectedJob.location.lng, selectedJob.location.lat];

      // Open the popup for the selected job (only if popovers are enabled)
      if (!disablePopovers) {
        popup.setLngLat(lngLat);
        popup.addTo(map);
        currentlyOpenPopupRef.current = popup;
      }

      // Center map on the selected job
      map.flyTo({
        center: lngLat,
        zoom: 15,
        duration: 1000,
      });
    }
  }, [mapRef.current, isLoaded, selectedJob?.id]);

  // Draw polyline from selected technician to job location
  useEffect(() => {
    if (!mapRef.current || !isLoaded || !effectiveSelectedTechnician || !selectedJob) {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
      // Remove route layer and source if they exist
      // Remove route layer and source if they exist
      if (mapRef.current) {
        const map = mapRef.current;
        try {
          if (map.getLayer('route-flow')) {
            map.removeLayer('route-flow');
          }
          if (map.getLayer('route')) {
            map.removeLayer('route');
          }
          if (map.getSource('route')) {
            map.removeSource('route');
          }
        } catch (err) {
          console.warn('Error cleaning up route:', err);
        }
      }
      return;
    }

    const map = mapRef.current;
    const technicianLngLat: [number, number] = [
      effectiveSelectedTechnician.homeLocation.lng,
      effectiveSelectedTechnician.homeLocation.lat,
    ];
    const jobLngLat: [number, number] = [selectedJob.location.lng, selectedJob.location.lat];

    // Use Mapbox Directions API
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${technicianLngLat[0]},${technicianLngLat[1]};${jobLngLat[0]},${jobLngLat[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`;

    let isCancelled = false;

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        // Check if component is still mounted and map exists
        if (isCancelled || !mapRef.current) return;

        const currentMap = mapRef.current;
        if (data.code === 'Ok' && data.routes && data.routes[0]) {
          const route = data.routes[0].geometry;

          // Remove existing route layer and source if they exist
          try {
            if (currentMap.getLayer('route-flow')) {
              currentMap.removeLayer('route-flow');
            }
            if (currentMap.getLayer('route')) {
              currentMap.removeLayer('route');
            }
            if (currentMap.getSource('route')) {
              currentMap.removeSource('route');
            }
          } catch (err) {
            console.warn('Error removing existing route:', err);
          }

          // Add route source
          try {
            currentMap.addSource('route', {
              type: 'geojson',
              lineMetrics: true, // Enable line metrics for gradient
              data: {
                type: 'Feature',
                properties: {},
                geometry: route,
              },
            });

            // Add route layer
            currentMap.addLayer({
              id: 'route',
              type: 'line',
              source: 'route',
              layout: {
                'line-join': 'round',
                'line-cap': 'round',
              },
              paint: {
                'line-color': '#3b82f6', // Blue color for travel path
                'line-width': 5,
                'line-opacity': 0.8,
              },
            });

            // Add route flow layer (animated gradient)
            currentMap.addLayer({
              id: 'route-flow',
              type: 'line',
              source: 'route',
              layout: {
                'line-join': 'round',
                'line-cap': 'round',
              },
              paint: {
                'line-width': 5,
                'line-opacity': 1,
                // Initial gradient (will be updated by animation)
                'line-gradient': [
                  'interpolate',
                  ['linear'],
                  ['line-progress'],
                  0, 'rgba(59, 130, 246, 0)',
                  1, 'rgba(59, 130, 246, 0)'
                ]
              },
            });

            // Animation loop for sweeping gradient
            const startTime = Date.now();
            const duration = 3000; // 3 seconds per full cycle (including delay)

            const animateGradient = () => {
              const elapsed = Date.now() - startTime;
              const rawProgress = (elapsed % duration) / duration;

              // Map progress to a wider range to allow entering and exiting smoothly
              // Range: -0.5 to 1.5
              const progress = (rawProgress * 2) - 0.5;

              // Comet configuration
              const tailLength = 0.4;
              const headLength = 0.1;

              const peak = progress;
              const tail = peak - tailLength;
              const head = peak + headLength;

              // Helper to calculate opacity at any given position (0 to 1) based on comet position
              const getOpacity = (pos: number) => {
                // If outside the comet, opacity is 0
                if (pos < tail || pos > head) return 0;

                // If in the tail section (tail to peak)
                if (pos < peak) {
                  return (pos - tail) / tailLength;
                }

                // If in the head section (peak to head)
                return 1 - (pos - peak) / headLength;
              };

              // We need strictly increasing stops between 0 and 1
              // We ALWAYS include 0 and 1 with their calculated opacity to ensure smooth entry/exit
              const stops: [number, string][] = [];

              // Stop at 0
              stops.push([0, `rgba(255, 255, 255, ${getOpacity(0)})`]);

              // Intermediate stops (tail, peak, head) - ONLY if they are strictly inside (0, 1)
              if (tail > 0.001 && tail < 0.999) {
                stops.push([tail, 'rgba(255, 255, 255, 0)']);
              }

              if (peak > 0.001 && peak < 0.999) {
                stops.push([peak, 'rgba(255, 255, 255, 1)']);
              }

              if (head > 0.001 && head < 0.999) {
                stops.push([head, 'rgba(255, 255, 255, 0)']);
              }

              // Stop at 1
              stops.push([1, `rgba(255, 255, 255, ${getOpacity(1)})`]);

              // Filter and sort to ensure validity
              const uniqueStops = new Map<number, string>();
              stops.forEach(([pos, color]) => {
                // Round to 3 decimals to avoid tiny floating point issues
                const p = Math.round(pos * 1000) / 1000;
                uniqueStops.set(p, color);
              });

              const sortedStops = Array.from(uniqueStops.entries())
                .sort((a, b) => a[0] - b[0]);

              // Construct the expression
              const gradientExpression: any[] = ['interpolate', ['linear'], ['line-progress']];
              sortedStops.forEach(([pos, color]) => {
                gradientExpression.push(pos);
                gradientExpression.push(color);
              });

              if (currentMap.getLayer('route-flow')) {
                currentMap.setPaintProperty('route-flow', 'line-gradient', gradientExpression as any);
              }

              animationFrameRef.current = requestAnimationFrame(animateGradient);
            };

            animateGradient();
            const bounds = new mapboxgl.LngLatBounds();
            const coordinates = route.coordinates as [number, number][];
            coordinates.forEach((coord) => {
              bounds.extend(coord);
            });
            currentMap.fitBounds(bounds, { padding: { top: 50, right: 50, bottom: 50, left: 50 } });
          } catch (err) {
            console.warn('Error adding route to map:', err);
          }
        } else {
          console.error('Directions request failed:', data);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('Error fetching directions:', err);
        }
      });

    return () => {
      isCancelled = true;

      // Clean up route layer and source if map still exists
      if (mapRef.current) {
        try {
          const currentMap = mapRef.current;
          if (currentMap.getLayer('route-flow')) {
            currentMap.removeLayer('route-flow');
          }
          if (currentMap.getLayer('route')) {
            currentMap.removeLayer('route');
          }
          if (currentMap.getSource('route')) {
            currentMap.removeSource('route');
          }
        } catch (err) {
          // Map might be in the process of being removed, ignore errors
          console.warn('Error cleaning up route:', err);
        }
      }

      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [mapRef.current, isLoaded, effectiveSelectedTechnician?.id, selectedJob?.id, effectiveTechnicians]);

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

  return (
    <div className="relative size-full md:min-h-[400px]">
      {/* Map container - always rendered so map can initialize */}
      <div ref={mapContainerRef} className="size-full min-h-[400px]" />

      {/* Loading overlay - shown when map is not loaded */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg z-10">
          <div className="text-center p-6">
            <Spinner className="h-8 w-8 mx-auto mb-2 text-primary" />
            <Muted>Loading map...</Muted>
          </div>
        </div>
      )}

      {/* Legend */}
      {false && <Card className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border z-10 md:opacity-100 opacity-25 hover:opacity-100 transition-opacity duration-300">
        <CardContent className="space-y-2 p-0!">
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
            <Small className="text-muted-foreground">Available Technicians</Small>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400 border-2 border-white" />
            <Small className="text-muted-foreground">Unavailable</Small>
          </div>
        </CardContent>
      </Card>}
    </div>
  );
}
