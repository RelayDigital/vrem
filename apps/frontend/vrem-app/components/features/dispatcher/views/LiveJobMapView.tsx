'use client';

import { useEffect } from 'react';
import { JobRequest, Photographer } from '../../../../types';
import { MapWithSidebar } from '../../../shared/dashboard/MapWithSidebar';
import { useSidebar } from '../../../ui/sidebar';
import { useIsMobile } from '../../../ui/use-mobile';

interface LiveJobMapViewProps {
  jobs: JobRequest[];
  photographers: Photographer[];
  selectedJob: JobRequest | null;
  onSelectJob: (job: JobRequest) => void;
  onNavigateToJobInProjectManagement?: (job: JobRequest) => void;
  onJobAssign?: (jobId: string, photographerId: string, score: number) => void;
}

export function LiveJobMapView({
  jobs,
  photographers,
  selectedJob,
  onSelectJob,
  onNavigateToJobInProjectManagement,
  onJobAssign,
}: LiveJobMapViewProps) {
  const isMobile = useIsMobile();

  // Get sidebar state to adjust left offset
  let sidebarState: string | undefined;
  let sidebarOpen: boolean | undefined;
  try {
    const sidebar = useSidebar();
    sidebarState = sidebar.state;
    sidebarOpen = sidebar.open;
  } catch {
    // Not within SidebarProvider, use defaults
    sidebarState = 'expanded';
    sidebarOpen = true;
  }

  // Calculate left offset based on sidebar state
  // When collapsed to icon: 3rem (48px), when expanded: 16rem (256px)
  // On mobile, no offset (sidebar doesn't affect layout)
  const leftOffset = isMobile ? '0' : (sidebarState === 'collapsed' ? '3rem' : '16rem');

  useEffect(() => {
    // Prevent body scrolling when map view is active
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      // Restore scrolling when component unmounts
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  // Trigger map resize when sidebar state changes
  useEffect(() => {
    // Small delay to ensure DOM has updated after sidebar transition
    const timeoutId = setTimeout(() => {
      // Trigger resize on all Mapbox maps
      window.dispatchEvent(new Event('resize'));
    }, 250); // Match sidebar transition duration (200ms) + buffer

    return () => clearTimeout(timeoutId);
  }, [sidebarState]);

  return (
    <main
      className="fixed overflow-hidden transition-[left] duration-200 ease-linear"
      style={{
        top: 'var(--header-h)',
        left: leftOffset,
        right: 0,
        bottom: 0,
        height: 'calc(100vh - var(--header-h))'
      }}
    >
      <MapWithSidebar
        jobs={jobs}
        photographers={photographers}
        selectedJob={selectedJob}
        onSelectJob={onSelectJob}
        onNavigateToJobInProjectManagement={onNavigateToJobInProjectManagement}
        onJobAssign={onJobAssign}
        className="size-full"
        fullScreen={true}
      />
    </main>
  );
}

