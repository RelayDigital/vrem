'use client';

import { StatsCard } from '../../../shared/dashboard';
import { Clock, Briefcase, CheckCircle2 } from 'lucide-react';

interface JobsStatsBarProps {
  pendingCount: number;
  assignedCount: number;
  inProgressCount: number;
  completedCount: number;
}

export function JobsStatsBar({
  pendingCount,
  assignedCount,
  inProgressCount,
  completedCount,
}: JobsStatsBarProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatsCard
        icon={Clock}
        value={pendingCount}
        label="Pending Assignment"
        iconBgColor="bg-orange-100"
        iconColor="text-orange-600"
      />
      <StatsCard
        icon={Briefcase}
        value={assignedCount}
        label="Assigned"
        iconBgColor="bg-accent"
        iconColor="text-primary"
      />
      <StatsCard
        icon={Briefcase}
        value={inProgressCount}
        label="In Progress"
        iconBgColor="bg-accent"
        iconColor="text-primary"
      />
      <StatsCard
        icon={CheckCircle2}
        value={completedCount}
        label="Completed"
        iconBgColor="bg-emerald-100"
        iconColor="text-emerald-600"
      />
    </div>
  );
}

