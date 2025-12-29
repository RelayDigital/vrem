'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
  useRef,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { api } from '@/lib/api';
import {
  TourTrack,
  TourStatusResponse,
  TourTrackProgressInfo,
  User,
} from '@/types';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth-context';

// Tour step configuration interface
export interface TourStepConfig {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  route?: string; // Navigate to this route before showing step
  /** Account types that should see this step */
  allowedAccountTypes?: Array<'AGENT' | 'PROVIDER' | 'COMPANY'>;
  /** If true, open the demo project task view after this step */
  openDemoProject?: boolean;
  /** If true, user must click/interact with the element - Next button will be disabled */
  requiresInteraction?: boolean;
  /** Custom action button text (e.g., "Click to continue") */
  actionText?: string;
}

// Track metadata for display
export const TRACK_METADATA: Record<TourTrack, {
  title: string;
  description: string;
  icon: string;
  route: string; // Initial route to navigate to
}> = {
  DASHBOARD_OVERVIEW: {
    title: 'Dashboard Overview',
    description: 'Learn how to navigate your dashboard and understand key metrics',
    icon: '📊',
    route: '/dashboard',
  },
  JOB_MANAGEMENT: {
    title: 'Job Management',
    description: 'Master viewing and tracking jobs',
    icon: '📋',
    route: '/jobs/all-jobs',
  },
  MESSAGING_CHAT: {
    title: 'Messaging & Chat',
    description: 'Communicate with your team and customers',
    icon: '💬',
    route: '/jobs/all-jobs', // Navigate to jobs, then open demo project chat
  },
  SETTINGS_INTEGRATIONS: {
    title: 'Settings & Integrations',
    description: 'Configure your account and connect external services',
    icon: '⚙️',
    route: '/settings/account',
  },
};

interface TourContextType {
  // Status
  status: TourStatusResponse | null;
  isLoading: boolean;
  error: string | null;

  // Active tour state
  activeTour: TourTrack | null;
  activeStepIndex: number;
  isTourActive: boolean;

  // Guide visibility - true when setup guide widget should be shown
  shouldShowGuide: boolean;

  // Tour step context for filtering steps based on org
  tourStepContext: TourStepContext;

  // Track progress helpers
  getTrackProgress: (track: TourTrack) => TourTrackProgressInfo | null;
  getOverallProgress: () => { completed: number; total: number; percentage: number };

  // Tour controls
  startTour: (track: TourTrack) => void;
  startTourFromStep: (track: TourTrack, stepIndex: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipStep: () => void;
  exitTour: () => void;

  // Status updates
  completeTrack: (track: TourTrack) => Promise<void>;
  dismissGuide: () => Promise<void>;
  resetProgress: () => Promise<void>;
  refetchStatus: () => Promise<void>;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

// Context for determining which tour steps to show
export interface TourStepContext {
  accountType?: User['accountType'];
  orgType?: 'PERSONAL' | 'TEAM' | 'COMPANY';
  orgRole?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
}

// Get role-specific tour steps - exported for use in SetupGuideWidget
// In PERSONAL orgs, COMPANY-specific steps are never shown (everyone sees PROVIDER guide)
// In COMPANY orgs, COMPANY-specific steps only shown for OWNER/ADMIN roles
export function getTourSteps(track: TourTrack, context?: TourStepContext): TourStepConfig[] {
  const allSteps = DEFAULT_TOUR_STEPS[track];

  if (!context?.accountType) return allSteps;

  const { accountType, orgType, orgRole } = context;

  // In PERSONAL orgs, COMPANY and PROVIDER users should see the PROVIDER guide
  // This ensures everyone gets the same experience in their personal workspace
  const effectiveAccountType = orgType === 'PERSONAL' && accountType === 'COMPANY'
    ? 'PROVIDER'
    : accountType;

  // Filter steps based on account type and org context
  return allSteps.filter(step => {
    if (!step.allowedAccountTypes) return true;

    // Check if this step is for COMPANY accounts only
    const isCompanyOnlyStep = step.allowedAccountTypes.length === 1 && step.allowedAccountTypes[0] === 'COMPANY';

    if (isCompanyOnlyStep) {
      // In PERSONAL orgs, never show COMPANY-specific steps
      if (orgType === 'PERSONAL') {
        return false;
      }

      // In COMPANY orgs, only show if user has elevated role
      if (orgType === 'COMPANY') {
        const hasElevatedRole = orgRole === 'OWNER' || orgRole === 'ADMIN';
        return hasElevatedRole;
      }

      // Default: don't show COMPANY-only steps
      return false;
    }

    // For non-COMPANY-only steps, check if effective account type is allowed
    return step.allowedAccountTypes.includes(effectiveAccountType as 'AGENT' | 'PROVIDER' | 'COMPANY');
  });
}

// Default tour step configurations
const DEFAULT_TOUR_STEPS: Record<TourTrack, TourStepConfig[]> = {
  DASHBOARD_OVERVIEW: [
    // AGENT-specific steps
    {
      id: 'agent-welcome',
      targetSelector: '[data-tour="setup-guide"], [data-tour="agent-dashboard"]',
      title: 'Welcome to Your Dashboard!',
      description: 'This is your central hub for ordering and tracking real estate media. Let\'s take a quick tour.',
      placement: 'bottom',
      allowedAccountTypes: ['AGENT'],
    },
    {
      id: 'agent-create-order',
      targetSelector: '[data-tour="jobs-create-button"]',
      title: 'Create New Orders',
      description: 'Click here to order photography, videography, or other media services for your listings.',
      placement: 'bottom',
      allowedAccountTypes: ['AGENT'],
    },
    {
      id: 'agent-stats',
      targetSelector: '[data-tour="agent-stats"]',
      title: 'Order Status',
      description: 'Track the status of all your orders at a glance - pending, in progress, and completed.',
      placement: 'bottom',
      allowedAccountTypes: ['AGENT'],
    },
    {
      id: 'agent-jobs-tabs',
      targetSelector: '[data-tour="jobs-tabs"]',
      title: 'Filter Your Orders',
      description: 'Use these tabs to filter orders by status. Quickly find pending, assigned, in-progress, or completed jobs.',
      placement: 'bottom',
      allowedAccountTypes: ['AGENT'],
    },
    {
      id: 'agent-jobs-list',
      targetSelector: '[data-tour="agent-jobs-list"]',
      title: 'Your Orders',
      description: 'View all your media orders here. Click any order to see details, track progress, or communicate with your provider.',
      placement: 'top',
      allowedAccountTypes: ['AGENT'],
    },
    // PROVIDER-specific steps
    {
      id: 'dashboard-welcome',
      targetSelector: '[data-tour="setup-guide"], [data-tour="dashboard-metrics"]',
      title: 'Welcome to Your Dashboard!',
      description: 'This is your central hub for managing all your real estate media projects. Let\'s take a quick tour.',
      placement: 'bottom',
      allowedAccountTypes: ['PROVIDER'],
    },
    {
      id: 'dashboard-metrics',
      targetSelector: '[data-tour="dashboard-metrics"]',
      title: 'Key Metrics',
      description: 'Track your performance with real-time statistics including active jobs, completed projects, and ratings.',
      placement: 'bottom',
      allowedAccountTypes: ['PROVIDER'],
    },
    {
      id: 'dashboard-calendar',
      targetSelector: '[data-tour="dashboard-calendar"]',
      title: 'Your Schedule',
      description: 'View your upcoming jobs on the calendar. Click any event to see job details.',
      placement: 'top',
      allowedAccountTypes: ['PROVIDER'],
    },
    {
      id: 'dashboard-map',
      targetSelector: '[data-tour="dashboard-map"]',
      title: 'Live Job Map',
      description: 'See all your scheduled jobs on an interactive map. Click pins to view job details and get directions.',
      placement: 'top',
      allowedAccountTypes: ['PROVIDER'],
    },
    {
      id: 'dashboard-jobs',
      targetSelector: '[data-tour="dashboard-jobs"]',
      title: 'Active Jobs',
      description: 'Quick access to your current projects. Click any job to view details or update status.',
      placement: 'top',
      allowedAccountTypes: ['PROVIDER'],
    },
  ],
  JOB_MANAGEMENT: [
    // AGENT-specific steps (on dashboard)
    {
      id: 'agent-jobs-intro',
      targetSelector: '[data-tour="agent-jobs-list"]',
      title: 'Your Orders',
      description: 'Here you can see all your media orders. We\'ve created a demo order to show you around.',
      placement: 'top',
      allowedAccountTypes: ['AGENT'],
    },
    {
      id: 'agent-jobs-open-demo',
      targetSelector: '[data-tour="agent-jobs-list"]',
      title: 'View Order Details',
      description: 'Click on the demo order to see its full details, track progress, and communicate with your provider.',
      placement: 'top',
      allowedAccountTypes: ['AGENT'],
      openDemoProject: true,
      requiresInteraction: true,
      actionText: 'Click the demo order card to continue',
    },
    {
      id: 'agent-job-details',
      targetSelector: '[data-tour="job-task-view"]',
      title: 'Order Details',
      description: 'This panel shows all information about your order including status, scheduled time, and property details.',
      placement: 'left',
      allowedAccountTypes: ['AGENT'],
    },
    {
      id: 'agent-job-status',
      targetSelector: '[data-tour="job-status-section"]',
      title: 'Track Order Status',
      description: 'Watch your order progress through each stage: Booked → Shooting → Editing → Delivered.',
      placement: 'left',
      allowedAccountTypes: ['AGENT'],
    },
    {
      id: 'agent-job-chat',
      targetSelector: '[data-tour="messaging-section"], [data-tour="messaging-compose"]',
      title: 'Message Your Provider',
      description: 'Use the chat to communicate directly with your media provider about this order.',
      placement: 'top',
      allowedAccountTypes: ['AGENT'],
    },
    // PROVIDER-specific steps
    {
      id: 'jobs-overview',
      targetSelector: '[data-tour="jobs-header"], [data-tour="jobs-view"]',
      title: 'Job Management',
      description: 'This is where you view and manage all your photography and videography jobs.',
      placement: 'bottom',
      allowedAccountTypes: ['PROVIDER'],
    },
    {
      id: 'jobs-filters',
      targetSelector: '[data-tour="jobs-filters"]',
      title: 'Search & Filter',
      description: 'Search for jobs by address or client name, filter by status or priority, and sort by date or client.',
      placement: 'bottom',
      allowedAccountTypes: ['PROVIDER'],
    },
    {
      id: 'jobs-list',
      targetSelector: '[data-tour="jobs-list"]',
      title: 'Job Cards',
      description: 'Each card shows key job info including address, status, and scheduled time. Click any job to see full details.',
      placement: 'top',
      allowedAccountTypes: ['PROVIDER'],
    },
    {
      id: 'jobs-status-provider',
      targetSelector: '[data-tour="jobs-list"]',
      title: 'Update Job Status',
      description: 'As you complete work, update the job status to keep everyone informed. Jobs progress from Assigned → In Progress → Editing → Delivered.',
      placement: 'top',
      allowedAccountTypes: ['PROVIDER'],
    },
    {
      id: 'jobs-assign',
      targetSelector: '[data-tour="jobs-list"]',
      title: 'Assign Team Members',
      description: 'Assign photographers, videographers, and editors to jobs. They\'ll receive automatic notifications.',
      placement: 'top',
      allowedAccountTypes: ['COMPANY'],
    },
  ],
  MESSAGING_CHAT: [
    {
      id: 'messaging-intro',
      targetSelector: '[data-tour="jobs-list"]',
      title: 'Job Messaging',
      description: 'Every job has built-in messaging. Click on the demo job to see the chat feature.',
      placement: 'top',
      allowedAccountTypes: ['PROVIDER'],
      openDemoProject: true,
      requiresInteraction: true,
      actionText: 'Click the demo job card to continue',
    },
    {
      id: 'messaging-task-view',
      targetSelector: '[data-tour="job-task-view"]',
      title: 'Job Details & Chat',
      description: 'This is the job detail view where you can see all job information and communicate via chat.',
      placement: 'left',
      allowedAccountTypes: ['PROVIDER'],
    },
    {
      id: 'messaging-channels',
      targetSelector: '[data-tour="messaging-tabs"]',
      title: 'Message Channels',
      description: 'Each job has two channels: Team Chat (internal discussions) and Customer Chat (client-facing messages).',
      placement: 'bottom',
      allowedAccountTypes: ['COMPANY'],
    },
    {
      id: 'messaging-customer-chat',
      targetSelector: '[data-tour="messaging-section"], [data-tour="messaging-compose"]',
      title: 'Customer Chat',
      description: 'Use the chat to communicate with your customers about this job. All messages are saved for your reference.',
      placement: 'top',
      allowedAccountTypes: ['PROVIDER'],
    },
    {
      id: 'messaging-compose',
      targetSelector: '[data-tour="messaging-compose"]',
      title: 'Send Messages',
      description: 'Type your message and press Enter to send. You can also attach files and images.',
      placement: 'top',
      allowedAccountTypes: ['PROVIDER'],
    },
  ],
  SETTINGS_INTEGRATIONS: [
    {
      id: 'settings-welcome',
      targetSelector: '[data-tour="settings-header"]',
      title: 'Settings & Preferences',
      description: 'Configure your account, connect calendars, and manage your preferences here.',
      placement: 'bottom',
      route: '/settings/account',
    },
    {
      id: 'settings-navigation',
      targetSelector: '[data-tour="settings-nav"]',
      title: 'Settings Navigation',
      description: 'Use the sidebar to navigate between different settings sections: Personal, Organization, Security, and more.',
      placement: 'right',
    },
    {
      id: 'settings-account',
      targetSelector: '[data-tour="settings-content"]',
      title: 'Account Settings',
      description: 'Update your name, email, and profile information. Changes are saved automatically.',
      placement: 'left',
    },
    {
      id: 'settings-tour-restart',
      targetSelector: '[data-tour="settings-tour-section"]',
      title: 'Restart the Tour Anytime',
      description: 'You can always come back here to restart the setup guide and revisit any of the tutorials whenever you need a refresher.',
      placement: 'top',
    },
    {
      id: 'settings-calendar',
      targetSelector: '[data-tour="settings-calendar-link"]',
      title: 'Calendar Integration',
      description: 'Connect your Google or Outlook calendar to automatically sync your job schedule.',
      placement: 'right',
      route: '/settings/calendar',
      allowedAccountTypes: ['PROVIDER'], // Agents don't need calendar sync
    },
    {
      id: 'settings-notifications',
      targetSelector: '[data-tour="settings-notifications-link"]',
      title: 'Notification Preferences',
      description: 'Control how and when you receive notifications about jobs, messages, and updates.',
      placement: 'right',
    },
    {
      id: 'settings-org',
      targetSelector: '[data-tour="settings-org-section"]',
      title: 'Organization Settings',
      description: 'Manage your company profile, team members, and billing information.',
      placement: 'right',
      allowedAccountTypes: ['COMPANY'],
    },
  ],
};

export function TourProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, activeOrganizationId, memberships } = useAuth();

  // Derive tour step context from current auth state
  const tourStepContext: TourStepContext = useMemo(() => {
    if (!user || !activeOrganizationId || !memberships) {
      return { accountType: user?.accountType };
    }

    const activeMembership = memberships.find(m => m.orgId === activeOrganizationId);
    if (!activeMembership) {
      return { accountType: user.accountType };
    }

    const orgType = (activeMembership.organization?.type || 'PERSONAL') as 'PERSONAL' | 'TEAM' | 'COMPANY';
    const orgRole = (activeMembership.orgRole || activeMembership.role || 'MEMBER') as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

    return {
      accountType: user.accountType,
      orgType,
      orgRole,
    };
  }, [user, activeOrganizationId, memberships]);

  const [status, setStatus] = useState<TourStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTour, setActiveTour] = useState<TourTrack | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isTourActive, setIsTourActive] = useState(false);

  // Pending tour to start after navigation
  const pendingTourRef = useRef<TourTrack | null>(null);
  const pendingStepRef = useRef<number>(0);

  // Track if we have created a demo project for this tour
  const hasDemoProjectRef = useRef<boolean>(false);
  // Store the demo project ID for opening task view
  const demoProjectIdRef = useRef<string | null>(null);

  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  // Track if we're waiting for user interaction (e.g., clicking demo project)
  const waitingForInteractionRef = useRef<boolean>(false);
  const currentTrackRef = useRef<TourTrack | null>(null);

  // Tracks that require a demo project
  const DEMO_PROJECT_TRACKS: TourTrack[] = ['JOB_MANAGEMENT', 'MESSAGING_CHAT'];

  // Helper to open demo project task view
  const openDemoProjectTaskView = useCallback(() => {
    if (demoProjectIdRef.current) {
      window.dispatchEvent(new CustomEvent('openJobTaskView', {
        detail: { id: demoProjectIdRef.current }
      }));
    }
  }, []);

  // Fetch initial status
  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.tours.getStatus();
      setStatus(data);
    } catch (err: any) {
      console.error('Failed to fetch tour status:', err);
      setError(err.message || 'Failed to load tour status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Cleanup on unmount - ensure demo project is removed if component unmounts
  useEffect(() => {
    return () => {
      if (hasDemoProjectRef.current) {
        // Fire and forget cleanup on unmount
        api.tours.deleteDemoProject().catch(console.error);
      }
    };
  }, []);

  // Get track progress
  const getTrackProgress = useCallback((track: TourTrack): TourTrackProgressInfo | null => {
    return status?.trackProgress?.[track] ?? null;
  }, [status]);

  // All tour tracks
  const TOUR_TRACKS: TourTrack[] = [
    'DASHBOARD_OVERVIEW',
    'JOB_MANAGEMENT',
    'MESSAGING_CHAT',
    'SETTINGS_INTEGRATIONS',
  ];

  // Get overall progress - calculate based on filtered steps for current context
  const getOverallProgress = useCallback(() => {
    // Calculate totals based on visible steps for current context
    const visibleTracksProgress = TOUR_TRACKS.reduce(
      (acc, track) => {
        const steps = getTourSteps(track, tourStepContext);
        if (steps.length === 0) return acc; // Skip tracks with no steps for this context
        const trackProgress = status?.trackProgress?.[track];
        return {
          completed: acc.completed + (trackProgress?.completed ?? 0),
          total: acc.total + steps.length,
        };
      },
      { completed: 0, total: 0 }
    );

    return {
      ...visibleTracksProgress,
      percentage: visibleTracksProgress.total > 0
        ? Math.round((visibleTracksProgress.completed / visibleTracksProgress.total) * 100)
        : 0,
    };
  }, [status, tourStepContext]);

  // Convert our step config to driver.js steps
  const convertToDriverSteps = useCallback((steps: TourStepConfig[]): DriveStep[] => {
    return steps.map((step) => {
      const requiresClick = step.requiresInteraction || step.openDemoProject;

      // Build description with interaction hint if needed
      let description = step.description;
      if (requiresClick) {
        const actionText = step.actionText || 'Click the highlighted element to continue';
        description = `${step.description}\n\n👆 **${actionText}**`;
      }

      return {
        element: step.targetSelector,
        popover: {
          title: step.title,
          description,
          side: step.placement || 'bottom',
          align: 'center' as const,
          // Hide Next button when interaction is required
          showButtons: requiresClick ? ['previous', 'close'] : ['next', 'previous', 'close'],
          // Custom class for interaction steps
          popoverClass: requiresClick ? 'vrem-tour-popover vrem-tour-requires-interaction' : 'vrem-tour-popover',
        },
      };
    });
  }, []);

  // Trigger job refresh via custom event (job-context listens for this)
  const triggerJobRefresh = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tourDemoProjectChanged'));
    }
  }, []);

  // Cleanup demo project
  const cleanupDemoProject = useCallback(async () => {
    if (hasDemoProjectRef.current) {
      try {
        await api.tours.deleteDemoProject();
        hasDemoProjectRef.current = false;
        demoProjectIdRef.current = null;
        triggerJobRefresh();
      } catch (err) {
        console.error('Failed to delete demo project:', err);
      }
    }
  }, [triggerJobRefresh]);

  // Actually start the tour (after navigation if needed)
  const executeTour = useCallback((track: TourTrack, startFromStep: number = 0) => {
    const steps = getTourSteps(track, tourStepContext);
    if (!steps || steps.length === 0) {
      toast.error('Tour steps not configured');
      return;
    }

    const validStartIndex = Math.min(Math.max(0, startFromStep), steps.length - 1);

    setActiveTour(track);
    setActiveStepIndex(validStartIndex);
    setIsTourActive(true);
    currentTrackRef.current = track;

    // Small delay to ensure DOM is ready after navigation
    setTimeout(() => {
      // Create driver instance
      const driverInstance = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        overlayColor: 'rgba(0, 0, 0, 0.75)',
        stagePadding: 10,
        popoverClass: 'vrem-tour-popover',
        steps: convertToDriverSteps(steps),
        onDestroyStarted: () => {
          // Tour is being closed - cleanup demo project if needed
          cleanupDemoProject();
          currentTrackRef.current = null;
          waitingForInteractionRef.current = false;
          setIsTourActive(false);
          setActiveTour(null);
          setActiveStepIndex(0);
        },
        onHighlightStarted: (_element, _step, options) => {
          // Track step progress
          const stepConfig = steps[options.state.activeIndex || 0];
          if (stepConfig) {
            api.tours.updateProgress({
              tourTrack: track,
              stepId: stepConfig.id,
              completed: false,
            }).catch(console.error);

            // Set waiting flag if this step requires interaction
            if (stepConfig.requiresInteraction || stepConfig.openDemoProject) {
              waitingForInteractionRef.current = true;
            } else {
              waitingForInteractionRef.current = false;
            }
          }
        },
        onNextClick: (_element, _step, options) => {
          const currentIndex = options.state.activeIndex || 0;
          const stepConfig = steps[currentIndex];
          const nextStep = steps[currentIndex + 1];
          const isLastStep = currentIndex === steps.length - 1;

          // Mark current step as completed
          if (stepConfig) {
            api.tours.updateProgress({
              tourTrack: track,
              stepId: stepConfig.id,
              completed: true,
            }).catch(console.error);
          }

          // If this is the last step, complete the tour and exit
          if (isLastStep) {
            // Complete the track
            api.tours.completeTrack(track).catch(console.error);
            // Cleanup demo project
            cleanupDemoProject();
            // Destroy the tour
            driverInstance.destroy();
            // Reset state
            setIsTourActive(false);
            setActiveTour(null);
            setActiveStepIndex(0);
            // Refresh status to update the setup guide widget
            fetchStatus();
            toast.success(`${TRACK_METADATA[track].title} completed!`);
            return;
          }

          // Check if current step should open the demo project task view
          if (stepConfig?.openDemoProject && demoProjectIdRef.current) {
            // Open the demo project task view, then continue tour
            openDemoProjectTaskView();
            // Wait for task view to open and animate in, then continue
            const waitForElement = () => {
              const element = document.querySelector('[data-tour="job-task-view"]');
              if (element) {
                setActiveStepIndex(currentIndex + 1);
                driverInstance.moveNext();
              } else {
                // Keep checking until element appears (max 3 seconds)
                setTimeout(waitForElement, 100);
              }
            };
            // Start checking after initial delay for animation
            setTimeout(waitForElement, 300);
            return;
          }

          // Check if next step needs navigation
          if (nextStep?.route && pathname !== nextStep.route) {
            // Destroy current tour, navigate, then continue
            driverInstance.destroy();
            setActiveStepIndex(currentIndex + 1);

            // Navigate and restart tour from next step
            router.push(nextStep.route);

            // Restart tour after navigation
            setTimeout(() => {
              const remainingSteps = steps.slice(currentIndex + 1);
              if (remainingSteps.length > 0) {
                const newDriver = driver({
                  showProgress: true,
                  animate: true,
                  allowClose: true,
                  overlayColor: 'rgba(0, 0, 0, 0.75)',
                  stagePadding: 10,
                  popoverClass: 'vrem-tour-popover',
                  steps: convertToDriverSteps(remainingSteps),
                  onDestroyStarted: () => {
                    // Tour is being closed - cleanup demo project if needed
                    cleanupDemoProject();
                    currentTrackRef.current = null;
                    waitingForInteractionRef.current = false;
                    setIsTourActive(false);
                    setActiveTour(null);
                    setActiveStepIndex(0);
                  },
                  onNextClick: (_el, _s, opts) => {
                    const idx = opts.state.activeIndex || 0;
                    const isLast = idx === remainingSteps.length - 1;

                    // Mark step as completed
                    const stepCfg = remainingSteps[idx];
                    if (stepCfg) {
                      api.tours.updateProgress({
                        tourTrack: track,
                        stepId: stepCfg.id,
                        completed: true,
                      }).catch(console.error);
                    }

                    if (isLast) {
                      // Complete the track
                      api.tours.completeTrack(track).catch(console.error);
                      cleanupDemoProject();
                      newDriver.destroy();
                      setIsTourActive(false);
                      setActiveTour(null);
                      setActiveStepIndex(0);
                      fetchStatus();
                      toast.success(`${TRACK_METADATA[track].title} completed!`);
                      return;
                    }

                    newDriver.moveNext();
                  },
                });
                driverRef.current = newDriver;
                newDriver.drive();
              }
            }, 500);
            return;
          }

          setActiveStepIndex(currentIndex + 1);
          driverInstance.moveNext();
        },
        onPrevClick: (_element, _step, options) => {
          const currentIndex = options.state.activeIndex || 0;
          setActiveStepIndex(Math.max(0, currentIndex - 1));
          driverInstance.movePrevious();
        },
        onCloseClick: () => {
          driverInstance.destroy();
        },
      });

      driverRef.current = driverInstance;
      driverInstance.drive(validStartIndex);
    }, 300);
  }, [convertToDriverSteps, pathname, router, user?.accountType, cleanupDemoProject, fetchStatus, openDemoProjectTaskView]);

  // Start a tour track (with navigation if needed)
  const startTour = useCallback(async (track: TourTrack, startFromStep: number = 0) => {
    const trackMeta = TRACK_METADATA[track];
    let targetRoute = trackMeta.route;

    // AGENT accounts view jobs on dashboard, not /jobs/all-jobs
    const isAgent = user?.accountType?.toUpperCase() === 'AGENT';
    if (isAgent && (track === 'JOB_MANAGEMENT' || track === 'MESSAGING_CHAT')) {
      targetRoute = '/dashboard';
    }

    // Create demo project for tracks that need it
    if (DEMO_PROJECT_TRACKS.includes(track)) {
      // Verify organization ID is set (use auth context's activeOrganizationId)
      const orgId = activeOrganizationId;

      if (!orgId) {
        toast.error('No organization selected. Please select an organization first.');
        // Still continue with the tour, just skip demo project
      } else {
        try {
          // Ensure localStorage is synced with auth context's organization ID
          // The API reads from localStorage, so we need to make sure it's set
          api.organizations.setActiveOrganization(orgId);

          const demoProject = await api.tours.createDemoProject();
          hasDemoProjectRef.current = true;
          demoProjectIdRef.current = demoProject.id; // Store the ID for later use
          triggerJobRefresh();
          // Give time for job context to refresh
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err: any) {
          console.error('Failed to create demo project:', err);
          toast.error(`Failed to create demo project: ${err?.message || 'Unknown error'}`);
        }
      }
    }

    // If we're not on the right page, navigate first
    if (pathname !== targetRoute) {
      pendingTourRef.current = track;
      pendingStepRef.current = startFromStep;
      router.push(targetRoute);
    } else {
      // Already on the right page, start immediately
      executeTour(track, startFromStep);
    }
  }, [pathname, router, executeTour, triggerJobRefresh, activeOrganizationId, user?.accountType]);

  // Start a tour from a specific step
  const startTourFromStep = useCallback((track: TourTrack, stepIndex: number) => {
    startTour(track, stepIndex);
  }, [startTour]);

  // Handle navigation completion - start pending tour
  useEffect(() => {
    if (pendingTourRef.current) {
      const track = pendingTourRef.current;
      const stepIndex = pendingStepRef.current;
      const targetRoute = TRACK_METADATA[track].route;

      if (pathname === targetRoute) {
        pendingTourRef.current = null;
        pendingStepRef.current = 0;
        // Delay to ensure page is fully rendered
        setTimeout(() => {
          executeTour(track, stepIndex);
        }, 500);
      }
    }
  }, [pathname, executeTour]);

  // Listen for job task view opening - advance tour when user clicks demo project
  useEffect(() => {
    const handleTaskViewOpened = (event: CustomEvent) => {
      // Only advance if we're waiting for interaction and tour is active
      if (waitingForInteractionRef.current && driverRef.current && currentTrackRef.current) {
        const projectId = event.detail?.id;

        // Check if this is the demo project being opened
        if (projectId === demoProjectIdRef.current || demoProjectIdRef.current) {
          // Wait for the task view element to appear in DOM
          const waitForTaskView = () => {
            const taskViewElement = document.querySelector('[data-tour="job-task-view"]');
            if (taskViewElement) {
              waitingForInteractionRef.current = false;

              // Mark current step as completed
              const track = currentTrackRef.current!;
              const steps = getTourSteps(track, tourStepContext);
              const currentIndex = driverRef.current?.getState()?.activeIndex || 0;
              const stepConfig = steps[currentIndex];

              if (stepConfig) {
                api.tours.updateProgress({
                  tourTrack: track,
                  stepId: stepConfig.id,
                  completed: true,
                }).catch(console.error);
              }

              // Move to next step
              setActiveStepIndex(currentIndex + 1);
              driverRef.current?.moveNext();
            } else {
              // Keep checking until element appears (max 3 seconds)
              setTimeout(waitForTaskView, 100);
            }
          };

          // Start checking after initial delay for animation
          setTimeout(waitForTaskView, 300);
        }
      }
    };

    window.addEventListener('jobTaskViewOpened', handleTaskViewOpened as EventListener);

    return () => {
      window.removeEventListener('jobTaskViewOpened', handleTaskViewOpened as EventListener);
    };
  }, [user?.accountType]);

  // Tour controls
  const nextStep = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.moveNext();
    }
  }, []);

  const prevStep = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.movePrevious();
    }
  }, []);

  const skipStep = useCallback(() => {
    if (driverRef.current && activeTour) {
      const steps = getTourSteps(activeTour, tourStepContext);
      const stepConfig = steps[activeStepIndex];

      // Mark as skipped
      if (stepConfig) {
        api.tours.updateProgress({
          tourTrack: activeTour,
          stepId: stepConfig.id,
          skipped: true,
        }).catch(console.error);
      }

      driverRef.current.moveNext();
    }
  }, [activeTour, activeStepIndex, user?.accountType]);

  const exitTour = useCallback(async () => {
    if (driverRef.current) {
      driverRef.current.destroy();
    }
    pendingTourRef.current = null;
    pendingStepRef.current = 0;
    currentTrackRef.current = null;
    waitingForInteractionRef.current = false;
    await cleanupDemoProject();
    setIsTourActive(false);
    setActiveTour(null);
    setActiveStepIndex(0);
  }, [cleanupDemoProject]);

  // Complete a track
  const completeTrack = useCallback(async (track: TourTrack) => {
    try {
      await api.tours.completeTrack(track);
      await fetchStatus();
      toast.success(`${TRACK_METADATA[track].title} completed!`);
    } catch (err: any) {
      console.error('Failed to complete track:', err);
      toast.error('Failed to mark track as complete');
    }
  }, [fetchStatus]);

  // Dismiss the guide
  const dismissGuide = useCallback(async () => {
    try {
      // First cleanup any active tour and demo project
      if (driverRef.current) {
        driverRef.current.destroy();
      }
      await cleanupDemoProject();
      setIsTourActive(false);
      setActiveTour(null);
      setActiveStepIndex(0);
      currentTrackRef.current = null;
      waitingForInteractionRef.current = false;

      await api.tours.dismissGuide();
      await fetchStatus();
    } catch (err: any) {
      console.error('Failed to dismiss guide:', err);
      toast.error('Failed to dismiss guide');
    }
  }, [fetchStatus, cleanupDemoProject]);

  // Reset progress
  const resetProgress = useCallback(async () => {
    try {
      // First cleanup any active tour
      if (driverRef.current) {
        driverRef.current.destroy();
      }
      setIsTourActive(false);
      setActiveTour(null);
      setActiveStepIndex(0);
      currentTrackRef.current = null;
      waitingForInteractionRef.current = false;
      // Clear refs (backend also deletes demo project)
      hasDemoProjectRef.current = false;
      demoProjectIdRef.current = null;

      await api.tours.resetProgress();
      await fetchStatus();
      toast.success('Tour progress has been reset');
    } catch (err: any) {
      console.error('Failed to reset progress:', err);
      toast.error('Failed to reset progress');
    }
  }, [fetchStatus]);

  // Compute whether guide should be visible
  // Show when: not loading, no error, not dismissed, not completed
  const shouldShowGuide = !isLoading && !error && !status?.dismissedGuide && !status?.hasCompletedSetup;

  return (
    <TourContext.Provider
      value={{
        status,
        isLoading,
        error,
        activeTour,
        activeStepIndex,
        isTourActive,
        shouldShowGuide,
        tourStepContext,
        getTrackProgress,
        getOverallProgress,
        startTour,
        startTourFromStep,
        nextStep,
        prevStep,
        skipStep,
        exitTour,
        completeTrack,
        dismissGuide,
        resetProgress,
        refetchStatus: fetchStatus,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
