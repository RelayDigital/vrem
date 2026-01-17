"use client";

import {
  JobRequest,
  Organization,
  CompanyApplication,
  ProviderProfile,
} from "../../../types";
import { JobsView, ProfileView, CompaniesView } from "./views";

interface ProviderDashboardProps {
  provider: ProviderProfile;
  jobs: JobRequest[];
  companies: Organization[];
  applications: CompanyApplication[];
  onUpdateProfile: (updates: Partial<ProviderProfile>) => void;
  onApplyToCompany: (companyId: string, message: string) => void;
  activeView?: "jobs" | "profile" | "companies";
  organizationSettingsPath?: string;
}

export function ProviderDashboard({
  provider,
  jobs,
  companies,
  applications,
  onUpdateProfile,
  onApplyToCompany,
  activeView = "jobs",
  organizationSettingsPath,
}: ProviderDashboardProps) {
  const myJobs = jobs.filter((j) => j.assignedTechnicianId === provider.userId);
  const upcomingJobs = myJobs.filter((j) => j.status === "assigned");

  return (
    <div className="size-full overflow-x-hidden">
      {/* Views */}
      {activeView === "jobs" && (
        <JobsView
          upcomingJobs={upcomingJobs}
          totalJobs={provider.reliability.totalJobs}
          rating={provider.rating.overall}
          onTimeRate={provider.reliability.onTimeRate * 100}
        />
      )}

      {activeView === "profile" && (
        <ProfileView
          provider={provider}
          onUpdateProfile={onUpdateProfile}
          organizationSettingsPath={organizationSettingsPath}
        />
      )}

      {activeView === "companies" && (
        <CompaniesView
          provider={provider}
          companies={companies}
          applications={applications}
          onApplyToCompany={onApplyToCompany}
        />
      )}
    </div>
  );
}
