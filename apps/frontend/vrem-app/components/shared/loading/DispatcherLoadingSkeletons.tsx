'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function DashboardLoadingSkeleton() {
  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        {/* Metrics */}
        <div className="@container w-full mt-md">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 border rounded-md">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div className="@container w-full">
          <div className="mb-md flex items-baseline justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-28" />
          </div>
          <div className="border rounded-md overflow-hidden p-4">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="@container w-full">
          <div className="mb-md flex items-baseline justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-28" />
          </div>
          <div className="border rounded-md overflow-hidden">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>

        {/* Active Jobs */}
        <div className="@container w-full mb-md">
          <div className="mb-md flex items-baseline justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border rounded-md p-4 space-y-3">
                <Skeleton className="h-32 w-full rounded" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>
    </main>
  );
}

export function JobsLoadingSkeleton() {
  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        <div className="@container w-full mt-md mb-md">
          <Skeleton className="h-10 w-32 mb-6" />
          
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-48" />
          </div>

          {/* Search and Filters */}
          <div className="flex gap-3 mb-6">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Job Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border rounded-md p-4 space-y-3">
                <Skeleton className="h-32 w-full rounded" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </div>
      </article>
    </main>
  );
}

export function MapLoadingSkeleton() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <div className="absolute inset-0">
        <Skeleton className="h-full w-full" />
      </div>
      {/* Sidebar skeleton */}
      <div className="absolute right-0 top-0 bottom-0 w-80 border-l bg-background p-4">
        <Skeleton className="h-8 w-32 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border rounded-md p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export function CalendarLoadingSkeleton() {
  return (
    <div className="flex flex-col size-full">
      {/* Header Toolbar */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-8" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-7 gap-2 h-full">
          {/* Time slots column */}
          <div className="space-y-2">
            {Array.from({ length: 24 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
          {/* Day columns */}
          {Array.from({ length: 6 }).map((_, day) => (
            <div key={day} className="space-y-2">
              {Array.from({ length: 24 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TeamLoadingSkeleton() {
  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        <div className="@container w-full mt-md mb-md">
          <Skeleton className="h-10 w-32 mb-6" />
          
          {/* Search and Filters */}
          <div className="flex gap-3 mb-6">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Technician Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border rounded-md p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>
    </main>
  );
}

export function AuditLoadingSkeleton() {
  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        <div className="@container w-full mt-md mb-md">
          <Skeleton className="h-10 w-32 mb-6" />
          
          {/* Filters */}
          <div className="flex gap-3 mb-6">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Audit Log Table */}
          <div className="border rounded-md overflow-hidden">
            <div className="divide-y">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="p-4 grid grid-cols-5 gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}

export function SettingsLoadingSkeleton() {
  return (
    <div className="flex size-full">
      {/* Settings Sidebar */}
      <div className="w-64 border-r p-4 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>

      {/* Settings Content */}
      <div className="flex-1 p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  );
}

