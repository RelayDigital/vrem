'use client';

import { useState } from 'react';
import { useRequireRole } from '@/hooks/useRequireRole';
import { SettingsView } from '@/components/shared/settings';
import { agentSettingsConfig } from '@/components/shared/settings/settings-config';
import { agentSettingsComponents } from '@/components/features/agent/settings';
import { PhotographerDashboard } from '@/components/features/photographer/PhotographerDashboard';
import { useJobManagement } from '@/context/JobManagementContext';
import { useOrganizations } from '@/hooks/useOrganizations';
import { SettingsLoadingSkeleton } from '@/components/shared/loading/DispatcherLoadingSkeletons';
import type { SettingsSubView } from '@/components/shared/settings';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { H2, Muted } from '@/components/ui/typography';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, isLoading } = useRequireRole([
    'dispatcher',
    'AGENT',
    'TECHNICIAN',
    'EDITOR',
    'ADMIN',
    'PROJECT_MANAGER',
  ]);
  const jobManagement = useJobManagement();
  const { memberships } = useOrganizations();
  const [settingsSubView, setSettingsSubView] = useState<SettingsSubView>(null);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState('');

  if (isLoading) {
    return <SettingsLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  const userRole = user.role;

  // Agent: Use SettingsView with agent config
  if (userRole === 'AGENT') {
    return (
      <div className="size-full overflow-x-hidden">
        <SettingsView
          subView={settingsSubView}
          onNavigate={(subView) => setSettingsSubView(subView)}
          config={agentSettingsConfig}
          accountType="agent"
          componentRegistry={agentSettingsComponents}
        />
      </div>
    );
  }

  // Technician/Photographer: Use PhotographerDashboard with profile view
  if (['TECHNICIAN'].includes(userRole)) {
    const jobs = jobManagement.jobCards;
    const companies = memberships.map(m => m.organization).filter(Boolean);
    const applications: any[] = [];

    // Create a minimal photographer object from user data
    const photographer = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: '',
      organizationId: user.organizationId,
      isIndependent: true,
      homeLocation: {
        lat: 51.0447,
        lng: -114.0719,
        address: {
          city: 'Calgary',
          stateProvince: 'AB',
          country: 'Canada',
        },
      },
      availability: [],
      reliability: {
        totalJobs: 0,
        noShows: 0,
        lateDeliveries: 0,
        onTimeRate: 1.0,
        averageDeliveryTime: 24,
      },
      skills: {
        residential: 0,
        commercial: 0,
        aerial: 0,
        twilight: 0,
        video: 0,
      },
      rating: {
        overall: 0,
        count: 0,
        recent: [],
      },
      preferredClients: [],
      status: 'active' as const,
      createdAt: new Date(),
      services: {
        photography: true,
        video: false,
        aerial: false,
        twilight: false,
        editing: false,
        virtualStaging: false,
      },
    };

    const handleUpdateProfile = (updates: any) => {
      toast.success('Profile updated successfully');
    };

    const handleApplyToCompany = (companyId: string, message: string) => {
      toast.success('Application sent');
    };

    return (
      <div className="size-full overflow-x-hidden">
        <PhotographerDashboard
          photographer={photographer}
          jobs={jobs}
          companies={companies.filter(Boolean) as any[]}
          applications={applications}
          onUpdateProfile={handleUpdateProfile}
          onApplyToCompany={handleApplyToCompany}
          activeView="profile"
        />
      </div>
    );
  }

  // Dispatcher/Admin/Project Manager/Editor: Use SettingsView with dispatcher config or simple profile form
  if (['dispatcher', 'ADMIN', 'PROJECT_MANAGER', 'EDITOR'].includes(userRole)) {
    // For now, show a simple profile form
    // In the future, this could use SettingsView with dispatcher config
    const handleSave = () => {
      // TODO: Implement save logic with API
      toast.success('Profile updated successfully');
    };

    return (
      <section id="profile" className="mb-md border-b pb-md">
        {/* Heading */}
        <div className="mb-md flex items-baseline justify-between">
          <H2 className="text-lg border-0">Profile</H2>
          <Muted>Manage your personal information and profile details.</Muted>
        </div>
        
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      value={user.email}
                      disabled
                      className="bg-muted"
                    />
                    <Muted className="text-xs">Email cannot be changed</Muted>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div className="pt-2">
                    <Button onClick={handleSave}>Save Changes</Button>
                  </div>
                </CardContent>
              </Card>
      </section>
    );
  }

  // Fallback: Simple profile form
  const handleSave = () => {
    toast.success('Profile updated successfully');
  };

  return (
    <section id="profile" className="mb-md border-b pb-md">
      {/* Heading */}
      <div className="mb-md flex items-baseline justify-between">
        <H2 className="text-lg border-0">Profile</H2>
        <Muted>Manage your personal information and profile details.</Muted>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              value={user.email}
              disabled
              className="bg-muted"
            />
            <Muted className="text-xs">Email cannot be changed</Muted>
          </div>

          <div className="pt-2">
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

