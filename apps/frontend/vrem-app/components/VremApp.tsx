'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Toaster } from './ui/sonner';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { H1, H2 } from './ui/typography';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from './ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { LandingPage } from './features/landing';
import { AgentBookingFlow, AgentJobsView } from './features/agent';
import { DispatcherDashboard } from './features/dispatcher';
import { DispatcherSidebar } from './features/dispatcher/DispatcherSidebar';
import { PhotographerDashboard } from './features/photographer';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from './ui/sidebar';
import { JobRequestForm } from './shared/jobs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  organizations as initialOrganizations,
  currentUser as initialUser,
  photographers as initialPhotographers,
  jobRequests as initialJobRequests,
  auditLog as initialAuditLog,
  metrics,
  preferredVendors as initialPreferredVendors,
  companyApplications as initialApplications,
} from '../lib/mock-data';
import {
  JobRequest,
  AuditLogEntry,
  User,
  Photographer,
  Organization,
  PreferredVendor,
  CompanyApplication,
} from '../types';
import { toast } from 'sonner';
import { LogIn, User as UserIcon, Settings, LogOut, Briefcase, User as UserIcon2, Building2, LayoutDashboard, Users, FileText, Plus, Moon, Sun, Monitor, MapPin, Camera } from 'lucide-react';
import { ContextSwitcher, type ContextOption } from './shared/ContextSwitcher';

export default function VremApp() {
  const { theme, setTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(73); // Default fallback
  const [currentUser, setCurrentUser] = useState<User>(initialUser);
  const [jobs, setJobs] = useState<JobRequest[]>(initialJobRequests);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(initialAuditLog);
  const [photographers, setPhotographers] = useState<Photographer[]>(initialPhotographers);
  const [organizations, setOrganizations] = useState<Organization[]>(initialOrganizations);
  const [preferredVendors, setPreferredVendors] = useState<PreferredVendor[]>(
    initialPreferredVendors
  );
  const [applications, setApplications] = useState<CompanyApplication[]>(
    initialApplications
  );
  const [agentView, setAgentView] = useState<'booking' | 'jobs'>('jobs');
  const [photographerView, setPhotographerView] = useState<'jobs' | 'profile' | 'companies'>('jobs');
  const [dispatcherView, setDispatcherView] = useState<'dashboard' | 'jobs' | 'team' | 'audit' | 'map'>('dashboard');
  const [showNewJobForm, setShowNewJobForm] = useState(false);

  const handleJobCreate = (jobData: Partial<JobRequest>) => {
    const mockLocation = jobData.location || {
      lat: 34.05 + Math.random() * 0.15,
      lng: -118.35 + Math.random() * 0.3,
    };

    const newJob: JobRequest = {
      id: `job-${Date.now().toString().slice(-3)}`,
      organizationId: jobData.organizationId || currentUser.organizationId,
      clientName: jobData.clientName!,
      propertyAddress: jobData.propertyAddress!,
      location: mockLocation,
      scheduledDate: jobData.scheduledDate!,
      scheduledTime: jobData.scheduledTime!,
      mediaType: jobData.mediaType!,
      priority: jobData.priority!,
      status: 'pending',
      estimatedDuration: jobData.estimatedDuration!,
      requirements: jobData.requirements || '',
      createdBy: currentUser.id,
      createdAt: new Date(),
      propertyImage:
        jobData.propertyImage || 'https://images.unsplash.com/photo-1706808849780-7a04fbac83ef?w=800',
    };

    setJobs([newJob, ...jobs]);

    const auditEntry: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      timestamp: new Date(),
      userId: currentUser.id,
      userName: currentUser.name,
      organizationId: currentUser.organizationId,
      action: 'job.created',
      resourceType: 'job',
      resourceId: newJob.id,
      details: {
        clientName: newJob.clientName,
        propertyAddress: newJob.propertyAddress,
        priority: newJob.priority,
        mediaTypes: newJob.mediaType,
      },
    };

    setAuditLog([auditEntry, ...auditLog]);
    toast.success('Job request created successfully');
  };

  const handleJobAssign = (jobId: string, photographerId: string, score: number) => {
    setJobs(
      jobs.map((job) =>
        job.id === jobId
          ? {
              ...job,
              status: 'assigned' as const,
              assignedPhotographerId: photographerId,
              assignedAt: new Date(),
            }
          : job
      )
    );

    const photographer = photographers.find((p) => p.id === photographerId);
    const job = jobs.find((j) => j.id === jobId);

    const auditEntry: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      timestamp: new Date(),
      userId: currentUser.id,
      userName: currentUser.name,
      organizationId: currentUser.organizationId,
      action: 'job.assigned',
      resourceType: 'job',
      resourceId: jobId,
      details: {
        photographerId,
        photographerName: photographer?.name,
        rankingScore: score,
        propertyAddress: job?.propertyAddress,
      },
    };

    setAuditLog([auditEntry, ...auditLog]);
    toast.success('Photographer assigned successfully');
  };

  const handleUpdatePhotographerProfile = (updates: Partial<Photographer>) => {
    setPhotographers(
      photographers.map((p) =>
        p.id === currentUser.id ? { ...p, ...updates } : p
      )
    );
    toast.success('Profile updated successfully');
  };

  const handleApplyToCompany = (companyId: string, message: string) => {
    const company = organizations.find((o) => o.id === companyId);
    const photographer = photographers.find((p) => p.id === currentUser.id);

    if (!company || !photographer) return;

    const newApplication: CompanyApplication = {
      id: `app-${Date.now()}`,
      photographerId: photographer.id,
      photographerName: photographer.name,
      companyId: company.id,
      companyName: company.name,
      status: 'pending',
      message,
      appliedAt: new Date(),
    };

    setApplications([...applications, newApplication]);
    toast.success(`Application sent to ${company.name}`);
  };

  // Available roles for context switching
  const availableRoles: ContextOption[] = [
    {
      value: 'agent',
      label: 'Agent',
      description: 'Real estate agent view',
      icon: Briefcase,
    },
    {
      value: 'dispatcher',
      label: 'Dispatcher',
      description: 'Media company dispatcher view',
      icon: LayoutDashboard,
    },
    {
      value: 'photographer',
      label: 'Photographer',
      description: 'Photographer view',
      icon: Camera,
    },
  ];

  // Mock users for role switching (keeping for backward compatibility, but we'll use same user)
  const mockUsers: User[] = [
    {
      id: 'user-agent',
      name: 'Emily Rodriguez',
      email: 'emily@luxuryrealty.com',
      role: 'agent',
      organizationId: 'org-client-001',
      organizationType: 'agent',
    },
    {
      id: 'user-dispatcher',
      name: 'Sarah Chen',
      email: 'sarah@vxmedia.com',
      role: 'dispatcher',
      organizationId: 'org-vx-001',
      organizationType: 'media_company',
    },
    {
      id: 'photo-001',
      name: 'Marcus Rodriguez',
      email: 'marcus@vxmedia.com',
      role: 'photographer',
      organizationId: 'org-vx-001',
      organizationType: 'media_company',
    },
  ];

  const handleRoleSwitch = (role: string) => {
    // Keep the same user but switch their role
    // If switching to photographer, find a matching photographer by email or use first photographer
    let updatedUser: User = {
      ...currentUser,
      role: role as 'agent' | 'dispatcher' | 'photographer',
    };

    if (role === 'photographer') {
      // Find photographer by email or use the first one
      const matchingPhotographer = photographers.find(
        (p) => p.email === currentUser.email
      ) || photographers[0];
      
      if (matchingPhotographer) {
        updatedUser = {
          ...updatedUser,
          id: matchingPhotographer.id,
          organizationId: matchingPhotographer.organizationId,
        };
      }
    } else if (role === 'dispatcher') {
      // Reset to original user ID for dispatcher
      updatedUser = {
        ...updatedUser,
        id: initialUser.id,
        organizationId: initialUser.organizationId,
      };
    } else if (role === 'agent') {
      // Use agent organization
      const agentOrg = organizations.find((o) => o.type === 'real_estate_team');
      if (agentOrg) {
        updatedUser = {
          ...updatedUser,
          organizationId: agentOrg.id,
          organizationType: 'agent',
        };
      }
    }

    setCurrentUser(updatedUser);
    toast.success(`Switched to ${role} view`);
  };

  const handleLogin = () => {
    // Simulate login - use the same user with dispatcher role as default
    setIsAuthenticated(true);
    setCurrentUser(initialUser);
    toast.success('Logged in successfully');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    toast.success('Logged out successfully');
  };

  const handleGetStarted = () => {
    handleLogin();
  };

  const currentPhotographer = photographers.find((p) => p.id === currentUser.id);

  // Measure header height for sidebar positioning
  useEffect(() => {
    if (isAuthenticated && currentUser.role === 'dispatcher') {
      const measureHeader = () => {
        const header = document.querySelector('header');
        if (header) {
          setHeaderHeight(header.offsetHeight);
        }
      };

      // Measure on mount
      measureHeader();

      // Measure on resize
      window.addEventListener('resize', measureHeader);
      
      // Also use ResizeObserver for more accurate measurements
      const header = document.querySelector('header');
      let resizeObserver: ResizeObserver | null = null;
      
      if (header) {
        resizeObserver = new ResizeObserver(() => {
          measureHeader();
        });
        resizeObserver.observe(header);
      }

      return () => {
        window.removeEventListener('resize', measureHeader);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
      };
    }
  }, [isAuthenticated, currentUser.role]);

  const renderHeader = () => (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-xl shadow-sm w-full">
      <div className="w-full max-w-full px-6 py-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <H2 className="p-0 border-0">
                  VX Media
                </H2>
            {isAuthenticated && currentUser.role === 'dispatcher' && (
              <SidebarTrigger />
                )}
            </div>

            <div className="flex items-center gap-4">
            {/* Auth Section */}
            {isAuthenticated && (
              <>
              {/* Agent View Switcher */}
                {currentUser.role === 'agent' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant={agentView === 'jobs' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setAgentView('jobs')}
                  >
                    My Jobs
                  </Button>
                  <Button
                    variant={agentView === 'booking' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setAgentView('booking')}
                  >
                    New Booking
                  </Button>
                </div>
              )}

              {/* Photographer View Switcher */}
                {currentUser.role === 'photographer' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant={photographerView === 'jobs' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setPhotographerView('jobs')}
                  >
                    <Briefcase className="h-4 w-4 mr-2" />
                    My Jobs
                  </Button>
                  <Button
                    variant={photographerView === 'profile' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setPhotographerView('profile')}
                  >
                    <UserIcon2 className="h-4 w-4 mr-2" />
                    Profile & Services
                  </Button>
                  <Button
                    variant={photographerView === 'companies' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setPhotographerView('companies')}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Companies
                  </Button>
                </div>
              )}

                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-3 h-auto p-0">
                      <Avatar className="h-9 w-9 border-2 border-border shadow-sm">
                        <AvatarImage
                          src={
                            currentPhotographer?.avatar ||
                            'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200'
                          }
                        />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {currentUser.name
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
                        <div className="text-sm">{currentUser.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {currentUser.role}
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <UserIcon className="h-4 w-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Theme</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
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
                    <DropdownMenuLabel>Switch View</DropdownMenuLabel>
                    <div className="px-2 py-1.5">
                      <ContextSwitcher
                        options={availableRoles}
                        currentValue={currentUser.role}
                        onValueChange={handleRoleSwitch}
                        className="w-full"
                      />
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}

            {!isAuthenticated && (
                <Button
                  onClick={handleLogin}
                  variant="default"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Log In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>
  );

  return (
    <div className="min-h-screen bg-background">
      {isAuthenticated && currentUser.role === 'dispatcher' ? (
        <SidebarProvider>
          <div className="fixed top-0 left-0 right-0 z-50">
            {renderHeader()}
          </div>
          <DispatcherSidebar
            currentView={dispatcherView}
            onViewChange={setDispatcherView}
            onNewJobClick={() => setShowNewJobForm(true)}
          />
            <SidebarInset className="min-w-0" style={{ paddingTop: `${headerHeight}px` }}>
            <div className="flex-1 overflow-x-hidden min-w-0">
              <DispatcherDashboard
                jobs={jobs}
                photographers={photographers}
                auditLog={auditLog}
                metrics={metrics}
                onJobCreate={handleJobCreate}
                onJobAssign={handleJobAssign}
                activeView={dispatcherView}
                onNavigateToJobsView={() => setDispatcherView('jobs')}
                onNewJobClick={() => setShowNewJobForm(true)}
              />
            </div>
            {/* New Job Form Dialog */}
            <Dialog open={showNewJobForm} onOpenChange={setShowNewJobForm}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Job Request</DialogTitle>
                </DialogHeader>
                <JobRequestForm
                  onSubmit={(job) => {
                    handleJobCreate(job);
                    setShowNewJobForm(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          </SidebarInset>
        </SidebarProvider>
      ) : (
        <>
          {renderHeader()}
      {!isAuthenticated ? (
        <LandingPage
          photographers={photographers}
          companies={organizations}
          preferredVendors={preferredVendors.map((v) => v.vendorId)}
          onJobCreate={handleJobCreate}
          onGetStarted={handleGetStarted}
          isAuthenticated={isAuthenticated}
          onLoginRequired={handleLogin}
        />
      ) : currentUser.role === 'agent' ? (
        agentView === 'jobs' ? (
          <AgentJobsView
            jobs={jobs}
            photographers={photographers}
            organizationId={currentUser.organizationId}
            onNewJobClick={() => setAgentView('booking')}
          />
        ) : (
          <AgentBookingFlow
            photographers={photographers}
            companies={organizations}
            preferredVendors={preferredVendors.map((v) => v.vendorId)}
            onJobCreate={(job) => {
              handleJobCreate(job);
              setAgentView('jobs');
            }}
            isAuthenticated={isAuthenticated}
            onLoginRequired={handleLogin}
          />
        )
      ) : currentUser.role === 'photographer' && currentPhotographer ? (
        <PhotographerDashboard
          photographer={currentPhotographer}
          jobs={jobs}
          companies={organizations}
          applications={applications}
          onUpdateProfile={handleUpdatePhotographerProfile}
          onApplyToCompany={handleApplyToCompany}
          activeView={photographerView}
        />
          ) : null}
        </>
      )}

      <Toaster />
    </div>
  );
}

