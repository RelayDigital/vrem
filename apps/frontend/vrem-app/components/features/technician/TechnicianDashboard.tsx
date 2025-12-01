'use client';

import { JobRequest, Technician, Organization, CompanyApplication } from '../../../types';
import { JobsView, ProfileView, CompaniesView } from './views';

interface TechnicianDashboardProps {
  technician: Technician;
  jobs: JobRequest[];
  companies: Organization[];
  applications: CompanyApplication[];
  onUpdateProfile: (updates: Partial<Technician>) => void;
  onApplyToCompany: (companyId: string, message: string) => void;
  activeView?: 'jobs' | 'profile' | 'companies';
}

export function TechnicianDashboard({
  technician,
  jobs,
  companies,
  applications,
  onUpdateProfile,
  onApplyToCompany,
  activeView = 'jobs',
}: TechnicianDashboardProps) {

  const myJobs = jobs.filter((j) => j.assignedTechnicianId === technician.id);
  const upcomingJobs = myJobs.filter((j) => j.status === 'assigned');

  return (
    <div className="size-full overflow-x-hidden">
      {/* Views */}
      {activeView === 'jobs' && (
        <JobsView
          upcomingJobs={upcomingJobs}
          totalJobs={technician.reliability.totalJobs}
          rating={technician.rating.overall}
          onTimeRate={(technician.reliability.onTimeRate * 100)}
        />
      )}

      {activeView === 'profile' && (
        <ProfileView
          technician={technician}
          onUpdateProfile={onUpdateProfile}
        />
      )}

      {activeView === 'companies' && (
        <CompaniesView
          technician={technician}
          companies={companies}
          applications={applications}
          onApplyToCompany={onApplyToCompany}
        />
      )}
    </div>
  );
}
