'use client';

import { Card } from '../../../ui/card';
import { JobRequest } from '../../../../types';
import { StatsGrid } from '../../../shared/dashboard';
import { JobListSection } from '../../../shared/jobs';
import { JobDetailCard } from '../../../common';
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Star,
  TrendingUp,
} from 'lucide-react';

interface JobsViewProps {
  upcomingJobs: JobRequest[];
  totalJobs: number;
  rating: number;
  onTimeRate: number;
}

export function JobsView({ upcomingJobs, totalJobs, rating, onTimeRate }: JobsViewProps) {

  return (
    <main className="container mx-auto p-6 h-full space-y-6">
      {/* Stats */}
      <StatsGrid
        stats={[
          {
            icon: Briefcase,
            value: upcomingJobs.length,
            label: 'Upcoming Jobs',
            iconBgColor: 'bg-accent',
            iconColor: 'text-primary',
          },
          {
            icon: CheckCircle2,
            value: totalJobs,
            label: 'Total Completed',
            iconBgColor: 'bg-emerald-100',
            iconColor: 'text-emerald-600',
          },
          {
            icon: Star,
            value: rating.toFixed(1),
            label: 'Rating',
            iconBgColor: 'bg-yellow-100',
            iconColor: 'text-yellow-600',
          },
          {
            icon: TrendingUp,
            value: onTimeRate,
            label: 'On-Time Rate',
            valueSuffix: '%',
            iconBgColor: 'bg-accent',
            iconColor: 'text-primary',
          },
        ]}
      />

      {/* Upcoming Jobs */}
      <Card className="p-6">
        <h2 className="text-xl mb-4">Upcoming Shoots</h2>
        <JobListSection
          title="All Upcoming Shoots"
          items={upcomingJobs}
          itemCount={5}
          searchPlaceholder="Search by address, client, Order #..."
          searchFields={(job) => `${job.propertyAddress} ${job.clientName} ${job.scheduledDate} ${job.orderNumber}`}
          filterOptions={[
            { label: 'Urgent', value: 'urgent' },
            { label: 'Rush', value: 'rush' },
            { label: 'Standard', value: 'standard' },
          ]}
          onFilterChange={(value) => upcomingJobs.filter((j) => value === 'all' || j.priority === value)}
          renderItem={(job) => <JobDetailCard key={job.id} job={job} />}
          emptyMessage="No upcoming shoots"
          emptyIcon={Calendar}
          emptyTitle="No upcoming shoots"
          emptyDescription="New jobs will appear here"
        />
      </Card>
    </main>
  );
}
