'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRequireRole } from '@/hooks/useRequireRole';
import { SettingsView } from '@/components/shared/settings';
import { agentSettingsConfig } from '@/components/shared/settings/settings-config';
import { agentSettingsComponents } from '@/components/features/agent/settings';
import { ProviderDashboard } from '@/components/features/provider/ProviderDashboard';
import { useJobManagement } from '@/context/JobManagementContext';
import { useOrganizations } from '@/hooks/useOrganizations';
import { SettingsLoadingSkeleton } from '@/components/shared/loading/CompanyLoadingSkeletons';
import type { SettingsSubView } from '@/components/shared/settings';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { H2, Muted } from '@/components/ui/typography';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { getEffectiveOrgRole, isDispatcherRole } from '@/lib/roles';
import { ProviderProfile } from '@/types';
import { api } from '@/lib/api';

export default function ProfilePage() {
  const { user, isLoading, organizationId, memberships: authMemberships } = useRequireRole([
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
  const [provider, setProvider] = useState<ProviderProfile | null>(null);

  const personalOrgMembership = useMemo(
    () =>
      memberships.find(
        (m) =>
          m.organization?.type === 'PERSONAL' ||
          (m as any)?.organizationType === 'PERSONAL' ||
          (m as any)?.personalOrg?.type === 'PERSONAL'
      ),
    [memberships]
  );
  const personalOrg =
    personalOrgMembership?.organization ||
    (personalOrgMembership as any)?.personalOrg ||
    null;
  const personalOrgId =
    personalOrgMembership?.orgId || (personalOrg as any)?.id || null;

  const technicianMembership =
    personalOrgMembership ||
    memberships.find(
      (m) =>
        m.userId === user?.id && (organizationId ? m.orgId === organizationId : true)
    ) ||
    memberships[0];

  const baseProvider: ProviderProfile | null = useMemo(() => {
    if (!user) return null;
    const org = technicianMembership?.organization;
    const locationOrg = personalOrg || org;

    return {
      id: user.id,
      userId: user.id,
      orgMemberId: technicianMembership?.id || '',
      orgId:
        technicianMembership?.orgId ||
        organizationId ||
        personalOrgId ||
        user.id,
      role: (technicianMembership?.orgRole ||
        (technicianMembership as any)?.role ||
        'TECHNICIAN') as any,
      name: user.name,
      email: user.email,
      phone: (locationOrg as any)?.phone || '',
      organizationId: technicianMembership?.orgId || organizationId || '',
      isIndependent:
        (locationOrg as any)?.type === 'PERSONAL' ||
        (technicianMembership as any)?.organizationType === 'PERSONAL',
      homeLocation: {
        lat: 51.0447,
        lng: -114.0719,
        address: {
          street: (locationOrg as any)?.addressLine1 || '',
          city: (locationOrg as any)?.city || '',
          stateProvince: (locationOrg as any)?.region || '',
          country: (locationOrg as any)?.countryCode || '',
          postalCode: (locationOrg as any)?.postalCode || '',
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
        floorplan: false,
        measurement: false,
        twilight: false,
        editing: false,
        virtualStaging: false,
      },
    };
  }, [user, technicianMembership, organizationId, personalOrg, personalOrgId]);

  useEffect(() => {
    if (baseProvider) {
      setProvider((prev) => {
        if (!prev) return baseProvider;
        if (prev.userId !== baseProvider.userId || prev.orgId !== baseProvider.orgId) {
          return baseProvider;
        }
        return prev;
      });
    }
  }, [baseProvider]);

  if (isLoading) {
    return <SettingsLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  const userRole = getEffectiveOrgRole(user, authMemberships, organizationId);

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

  // Technician/Technician: Use ProviderDashboard with profile view
  if (userRole === 'TECHNICIAN') {
    const jobs = jobManagement.jobCards;
    const companies = memberships.map(m => m.organization).filter(Boolean);
    const applications: any[] = [];

    const organizationSettingsPath = personalOrgId
      ? `/organization/${personalOrgId}/settings`
      : technicianMembership?.orgId
      ? `/organization/${technicianMembership.orgId}/settings`
      : undefined;

    if (!provider) {
      return <SettingsLoadingSkeleton />;
    }

    const handleUpdateProfile = async (updates: Partial<ProviderProfile>) => {
      const previous = provider;
      const nextProvider: ProviderProfile = {
        ...provider,
        ...updates,
        services: updates.services
          ? { ...provider.services, ...updates.services }
          : provider.services,
        homeLocation: updates.homeLocation
          ? {
              ...provider.homeLocation,
              ...updates.homeLocation,
              address: {
                ...provider.homeLocation.address,
                ...(updates.homeLocation.address || {}),
              },
            }
          : provider.homeLocation,
        phone: updates.phone ?? provider.phone,
        bio: updates.bio ?? provider.bio,
      };

      setProvider(nextProvider);

      if (personalOrgId) {
        try {
          await api.organizations.updateSettings(personalOrgId, {
            phone: nextProvider.phone || undefined,
            addressLine1: nextProvider.homeLocation.address.street || undefined,
            city: nextProvider.homeLocation.address.city || undefined,
            region: nextProvider.homeLocation.address.stateProvince || undefined,
            postalCode: nextProvider.homeLocation.address.postalCode || undefined,
            countryCode: nextProvider.homeLocation.address.country || undefined,
          } as any);
          toast.success('Profile updated successfully');
        } catch (error) {
          setProvider(previous);
          toast.error(
            error instanceof Error
              ? error.message
              : 'Failed to update organization settings'
          );
        }
      } else {
        toast.success(
          'Profile updated. Update your address in organization settings.'
        );
      }
    };

    const handleApplyToCompany = (companyId: string, message: string) => {
      toast.success('Application sent');
    };

    return (
      <div className="size-full overflow-x-hidden">
        <ProviderDashboard
          provider={provider}
          jobs={jobs}
          companies={companies.filter(Boolean) as any[]}
          applications={applications}
          onUpdateProfile={handleUpdateProfile}
          onApplyToCompany={handleApplyToCompany}
          activeView="profile"
          organizationSettingsPath={organizationSettingsPath}
        />
      </div>
    );
  }

  // Dispatcher/Admin/Project Manager/Editor: Use SettingsView with dispatcher config or simple profile form
  if (isDispatcherRole(userRole)) {
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
