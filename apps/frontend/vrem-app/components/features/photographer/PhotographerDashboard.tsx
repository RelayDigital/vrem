'use client';

import { JobRequest, Photographer, Organization, CompanyApplication } from '../../../types';
import { JobsView, ProfileView, CompaniesView } from './views';

interface PhotographerDashboardProps {
  photographer: Photographer;
  jobs: JobRequest[];
  companies: Organization[];
  applications: CompanyApplication[];
  onUpdateProfile: (updates: Partial<Photographer>) => void;
  onApplyToCompany: (companyId: string, message: string) => void;
  activeView?: 'jobs' | 'profile' | 'companies';
}

export function PhotographerDashboard({
  photographer,
  jobs,
  companies,
  applications,
  onUpdateProfile,
  onApplyToCompany,
  activeView = 'jobs',
}: PhotographerDashboardProps) {

  const myJobs = jobs.filter((j) => j.assignedPhotographerId === photographer.id);
  const upcomingJobs = myJobs.filter((j) => j.status === 'assigned');

  return (
    <div className="min-h-screen bg-background">
      {/* Views */}
      {activeView === 'jobs' && (
        <JobsView
          upcomingJobs={upcomingJobs}
          totalJobs={photographer.reliability.totalJobs}
          rating={photographer.rating.overall}
          onTimeRate={(photographer.reliability.onTimeRate * 100)}
        />
      )}

      {activeView === 'profile' && (
        <ProfileView
          photographer={photographer}
          onUpdateProfile={onUpdateProfile}
        />
      )}

      {activeView === 'companies' && (
        <CompaniesView
          photographer={photographer}
          companies={companies}
          applications={applications}
          onApplyToCompany={onApplyToCompany}
        />
      )}
    </div>
  );
}
