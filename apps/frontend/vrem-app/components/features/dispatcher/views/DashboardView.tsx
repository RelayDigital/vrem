'use client';

import { useState } from 'react';
import { JobRequest, Photographer, Metrics } from '../../../../types';
import { MetricsDashboard } from '../../../shared/metrics';
import { JobListSection, JobCard } from '../../../shared/jobs';
import { MapWithSidebar } from '../../../shared/dashboard/MapWithSidebar';
import { Button } from '../../../ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardAction } from '../../../ui/card';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DashboardViewProps {
  jobs: JobRequest[];
  photographers: Photographer[];
  metrics: Metrics;
  selectedJob: JobRequest | null;
  onViewRankings: (job: JobRequest) => void;
  onSelectJob: (job: JobRequest) => void;
  onNavigateToJobsView?: () => void;
  onNavigateToJobInProjectManagement?: (job: JobRequest) => void;
  onJobAssign?: (jobId: string, photographerId: string, score: number) => void;
}

export function DashboardView({
  jobs,
  photographers,
  metrics,
  selectedJob,
  onViewRankings,
  onSelectJob,
  onNavigateToJobsView,
  onNavigateToJobInProjectManagement,
  onJobAssign,
}: DashboardViewProps) {
  const assignedJobs = jobs.filter((j) => j.status === 'assigned');
  const [activeJobsScrollLeft, setActiveJobsScrollLeft] = useState<(() => void) | null>(null);
  const [activeJobsScrollRight, setActiveJobsScrollRight] = useState<(() => void) | null>(null);

  return (
    <main className="w-full px-6 py-6 space-y-6 overflow-x-hidden">
      <MetricsDashboard metrics={metrics} />

      {/* Merged Map and Pending Assignments */}
      <MapWithSidebar
        jobs={jobs}
        photographers={photographers}
        selectedJob={selectedJob}
        onSelectJob={onSelectJob}
        onNavigateToJobInProjectManagement={onNavigateToJobInProjectManagement}
        onJobAssign={onJobAssign}
      />

      {assignedJobs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Active Jobs</CardTitle>
              {activeJobsScrollLeft && activeJobsScrollRight && (
                <CardAction>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={activeJobsScrollLeft}
                      className="h-8 w-8"
                      aria-label="Scroll left"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={activeJobsScrollRight}
                      className="h-8 w-8"
                      aria-label="Scroll right"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardAction>
              )}
            </CardHeader>
            <CardContent className="p-4 pb-4!">
              <JobListSection
                title="Active Jobs"
                items={assignedJobs}
                itemCount={10}
                searchPlaceholder="Search active jobs..."
                searchFields={(job) => `${job.propertyAddress} ${job.clientName}`}
                filterOptions={[
                  { label: 'Assigned', value: 'assigned' },
                  { label: 'In Progress', value: 'in_progress' },
                ]}
                onFilterChange={(value) => assignedJobs.filter((j) => value === 'all' || j.status === value)}
                renderItem={(job) => {
                  const photographer = photographers.find(
                    (p) => p.id === job.assignedPhotographerId
                  );
                  return (
                    <JobCard
                      key={job.id}
                      job={job}
                      photographer={photographer}
                      onViewInProjectManagement={
                        onNavigateToJobInProjectManagement
                          ? () => onNavigateToJobInProjectManagement(job)
                          : undefined
                      }
                    />
                  );
                }}
                emptyMessage="No active jobs"
                horizontalLayout={true}
                onNavigateToFullView={onNavigateToJobsView}
                useGridLayout={true}
                onScrollControlsReady={(scrollLeft, scrollRight) => {
                  setActiveJobsScrollLeft(() => scrollLeft);
                  setActiveJobsScrollRight(() => scrollRight);
                }}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}
    </main>
  );
}

