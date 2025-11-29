'use client';

import { PhotographerDashboard } from '@/components/features/photographer/PhotographerDashboard';
import { useRequireRole } from '@/hooks/useRequireRole';
import { useJobManagement } from '@/context/JobManagementContext';
import { useOrganizations } from '@/hooks/useOrganizations';
// TODO: replace with real photographer list from backend once users/technicians endpoint is implemented
import { photographers } from '@/lib/mock-data';
import { useState } from 'react';
import { Organization, Photographer } from '@/types';
import { toast } from 'sonner';

export default function PhotographerCompaniesPage() {
  const { user, isLoading } = useRequireRole(['TECHNICIAN', 'photographer', 'ADMIN', 'PROJECT_MANAGER']);
  const jobManagement = useJobManagement();
  const { memberships } = useOrganizations();
  // TODO: replace with real photographer list from backend once users/technicians endpoint is implemented
  const [photographersList] = useState(photographers);
  // TODO: replace with real company applications from backend once applications endpoint is implemented
  const [applications, setApplications] = useState<any[]>([]);
  
  // Get jobs from JobManagementContext
  const jobs = jobManagement.jobCards;
  // Get organizations from useOrganizations hook
  const companies = memberships.map(m => m.organization).filter(Boolean);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  // Find the photographer matching the current user
  // Try matching by ID first, then by email as fallback
  let currentPhotographer = photographersList.find((p) => p.id === user.id) ||
    photographersList.find((p) => p.email === user.email);

  // If no photographer found, create a minimal profile from user data
  if (!currentPhotographer) {
    currentPhotographer = {
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
  }

  const handleUpdateProfile = (updates: Partial<Photographer>) => {
    toast.success('Profile updated successfully');
  };

  const handleApplyToCompany = (companyId: string, message: string) => {
    const company = companies.find((o) => o?.id === companyId);
    if (company) {
      const newApplication = {
        id: `app-${Date.now()}`,
        photographerId: currentPhotographer.id,
        photographerName: currentPhotographer.name,
        technicianId: currentPhotographer.id,
        technicianName: currentPhotographer.name,
        companyId: company.id,
        companyName: company.name,
        status: 'pending' as const,
        message,
        appliedAt: new Date(),
      };
      setApplications([...applications, newApplication]);
      toast.success(`Application sent to ${company.name}`);
    }
  };

  return (
    <div className="w-full overflow-x-hidden h-full">
      <PhotographerDashboard
        photographer={currentPhotographer}
        jobs={jobs}
        companies={companies.filter(Boolean) as Organization[]}
        applications={applications}
        onUpdateProfile={handleUpdateProfile}
        onApplyToCompany={handleApplyToCompany}
        activeView="companies"
      />
    </div>
  );
}

