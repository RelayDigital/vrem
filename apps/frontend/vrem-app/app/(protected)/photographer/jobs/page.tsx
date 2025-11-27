'use client';

import { PhotographerDashboard } from '@/components/features/photographer/PhotographerDashboard';
import { useRequireRole } from '@/hooks/useRequireRole';
import { jobRequests, photographers, organizations, companyApplications } from '@/lib/mock-data';
import { useState } from 'react';
import { Photographer } from '@/types';
import { toast } from 'sonner';

export default function PhotographerJobsPage() {
  const { user, isLoading } = useRequireRole(['TECHNICIAN', 'photographer', 'ADMIN', 'PROJECT_MANAGER']);
  const [jobs] = useState(jobRequests);
  const [photographersList] = useState(photographers);
  const [companies] = useState(organizations);
  const [applications, setApplications] = useState(companyApplications);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  // Find the photographer matching the current user
  const currentPhotographer = photographersList.find((p) => p.id === user.id);

  if (!currentPhotographer) {
    return <div className="flex items-center justify-center h-screen">Photographer profile not found</div>;
  }

  const handleUpdateProfile = (updates: Partial<Photographer>) => {
    toast.success('Profile updated successfully');
  };

  const handleApplyToCompany = (companyId: string, message: string) => {
    const company = companies.find((o) => o.id === companyId);
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
        companies={companies}
        applications={applications}
        onUpdateProfile={handleUpdateProfile}
        onApplyToCompany={handleApplyToCompany}
        activeView="jobs"
      />
    </div>
  );
}

