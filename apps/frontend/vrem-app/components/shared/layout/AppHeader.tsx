'use client';

import { useTheme } from 'next-themes';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { H2 } from '@/components/ui/typography';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/components/ui/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import {
  User as UserIcon,
  Settings,
  LogOut,
  Plus,
  Moon,
  Sun,
  Monitor,
  Briefcase,
  Building2,
} from 'lucide-react';
import { JobRequest, User } from '@/types';
import {
  currentUser as mockUser,
  jobRequests as initialJobRequests,
  photographers as initialPhotographers,
} from '@/lib/mock-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { JobRequestForm } from '@/components/shared/jobs';
import { useJobCreation } from '@/context/JobCreationContext';
import { useAuth } from '@/context/auth-context';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChatMessage } from '@/types/chat';

interface AppHeaderProps {
  user?: User;
  showNewJobButton?: boolean;
  onNewJobClick?: () => void;
}

export function AppHeader({ user = mockUser, showNewJobButton = false, onNewJobClick }: AppHeaderProps) {
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const jobCreation = useJobCreation();
  const isMobile = useIsMobile();
  const [jobs, setJobs] = useState(initialJobRequests);
  const [photographers] = useState(initialPhotographers);
  const [selectedJob, setSelectedJob] = useState<JobRequest | null>(null);
  const [showRankings, setShowRankings] = useState(false);
  const [showTaskView, setShowTaskView] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showNewJobForm, setShowNewJobForm] = useState(false);
  const [newJobInitialValues, setNewJobInitialValues] = useState<{
    scheduledDate?: string;
    scheduledTime?: string;
    estimatedDuration?: number;
  }>();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  // Determine agent view based on pathname
  const isAgentJobsView = pathname === '/agent' || pathname === '/agent/jobs';
  const isAgentBookingView = pathname === '/agent/booking';

  // Determine photographer view based on pathname
  const isPhotographerJobsView = pathname === '/photographer' || pathname === '/photographer/jobs';
  const isPhotographerProfileView = pathname === '/photographer/profile';
  const isPhotographerCompaniesView = pathname === '/photographer/companies';

    // Sync context dialog state with local dialog state
    useEffect(() => {
      if (jobCreation.isOpen && !showNewJobForm) {
        setNewJobInitialValues(jobCreation.initialValues);
        setShowNewJobForm(true);
      }
    }, [jobCreation.isOpen, jobCreation.initialValues, showNewJobForm]);
  
    const handleJobCreate = (job: Partial<JobRequest>) => {
      // In a real app, this would call an API
      const newJob: JobRequest = {
        id: `job-${Date.now()}`,
        orderNumber: (jobs.length + 1).toString().padStart(4, '0'),
        organizationId: user?.organizationId || 'org-vx-001',
        clientName: job.clientName!,
        propertyAddress: job.propertyAddress!,
        location: job.location || { lat: 51.0447, lng: -114.0719 },
        scheduledDate: job.scheduledDate!,
        scheduledTime: job.scheduledTime!,
        mediaType: job.mediaType!,
        priority: job.priority || 'standard',
        status: 'pending',
        estimatedDuration: job.estimatedDuration || 120,
        requirements: job.requirements || '',
        createdBy: user?.id || 'user-001',
        createdAt: new Date(),
        propertyImage: job.propertyImage || 'https://images.unsplash.com/photo-1706808849780-7a04fbac83ef?w=800',
      };
      setJobs([newJob, ...jobs]);
      toast.success('Job created successfully');
      setShowNewJobForm(false);
      setNewJobInitialValues(undefined);
      jobCreation.closeJobCreationDialog();
    };

  const handleNewJobClick = () => {
    if (onNewJobClick) {
      onNewJobClick();
    } else if (jobCreation) {
      jobCreation.openJobCreationDialog();
    }
  };

  const handleSettingsClick = () => {
    if (user.role === 'ADMIN' as any || user.role === 'PROJECT_MANAGER' as any || user.role === 'EDITOR' as any) {
      router.push('/dispatcher/settings');
    } else if (user.role === 'AGENT' as any) {
      router.push('/agent/settings');
    } else if (user.role === 'PHOTOGRAPHER' as any || user.role === 'TECHNICIAN' as any) {
      router.push('/photographer/settings');
    } else {
      router.push('/settings');
    }
  };

  const handleLogout = () => {
    // Clear any additional localStorage items
    localStorage.removeItem('accountType');
    // Use the auth context logout function which handles token removal and navigation
    logout();
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-xl shadow-sm w-full px-4 h-header-h">
        <div className="w-full max-w-full py-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <H2 className="p-0 border-0">VX Media</H2>
              {!isMobile && (user.role === 'ADMIN' || user.role === 'PROJECT_MANAGER' || user.role === 'EDITOR') && <SidebarTrigger />}
            </div>

            <div className="flex items-center gap-4">
              {/* Agent View Switcher */}
              {user.role === 'AGENT' as any && (
                <div className="flex items-center gap-2">
                  <Button
                    variant={isAgentJobsView ? "default" : "muted"}
                    size="sm"
                    onClick={() => router.push('/agent/jobs')}
                  >
                    My Jobs
                  </Button>
                  <Button
                    variant={isAgentBookingView ? "default" : "muted"}
                    size="sm"
                    onClick={() => router.push('/agent/booking')}
                  >
                    New Booking
                  </Button>
                </div>
              )}

              {/* Photographer View Switcher */}
              {(user.role === 'PHOTOGRAPHER' as any || user.role === 'TECHNICIAN' as any) && (
                <div className="flex items-center gap-2">
                  <Button
                    variant={isPhotographerJobsView ? "default" : "muted"}
                    size="sm"
                    onClick={() => router.push('/photographer/jobs')}
                  >
                    <Briefcase className="h-4 w-4 mr-2" />
                    My Jobs
                  </Button>
                  <Button
                    variant={isPhotographerProfileView ? "default" : "muted"}
                    size="sm"
                    onClick={() => router.push('/photographer/profile')}
                  >
                    <UserIcon className="h-4 w-4 mr-2" />
                    Profile & Services
                  </Button>
                  <Button
                    variant={isPhotographerCompaniesView ? "default" : "muted"}
                    size="sm"
                    onClick={() => router.push('/photographer/companies')}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Companies
                  </Button>
                </div>
              )}

              {/* New Job Button for Dispatcher */}
              {showNewJobButton && user.role === 'ADMIN' as any || user.role === 'PROJECT_MANAGER' as any || user.role === 'EDITOR' as any && (
                <Button
                  onClick={handleNewJobClick}
                  size="sm"
                  className="gap-2"
                  variant="muted"
                >
                  <Plus className="h-4 w-4" />
                  New Job
                </Button>
              )}

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-3 h-auto p-0"
                  >
                    <Avatar className="h-9 w-9 border-2 border-border shadow-sm">
                      <AvatarImage
                        src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200"
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {user.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div>
                      <div className="text-sm">{user.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {user.role}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <UserIcon className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSettingsClick}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Theme</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={theme}
                    onValueChange={setTheme}
                  >
                    <DropdownMenuRadioItem value="light">
                      <Sun className="h-4 w-4 mr-2" />
                      Light
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">
                      <Moon className="h-4 w-4 mr-2" />
                      Dark
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system">
                      <Monitor className="h-4 w-4 mr-2" />
                      System
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* New Job Form Dialog - Only show if not using context */}
      {!jobCreation && (
        <Dialog open={false} onOpenChange={() => {}}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Job</DialogTitle>
            </DialogHeader>
            <JobRequestForm
              initialValues={newJobInitialValues}
              onSubmit={handleJobCreate}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

