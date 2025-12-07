"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { JobRequest, Technician, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { H1, P, Muted } from "@/components/ui/typography";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus,
  Camera,
  Clock,
  CheckCircle2,
  CalendarDays,
  MapPin,
  ArrowRight,
  Briefcase,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentDashboardProps {
  user: User;
  jobs: JobRequest[];
  technicians: Technician[];
  onCreateOrder: () => void;
}

export function AgentDashboard({
  user,
  jobs,
  technicians,
  onCreateOrder,
}: AgentDashboardProps) {
  const router = useRouter();

  // Filter jobs to only show agent's own orders (where they are the project manager/creator)
  const myOrders = useMemo(() => {
    return jobs.filter(
      (job) =>
        job.projectManagerId === user.id ||
        job.createdBy === user.id ||
        // Also include jobs where customer is linked to this user
        job.customerId === user.id
    );
  }, [jobs, user.id]);

  // Stats
  const stats = useMemo(() => {
    const pending = myOrders.filter(
      (j) => j.status === "pending" || j.status === "assigned"
    );
    const inProgress = myOrders.filter(
      (j) => j.status === "in_progress" || j.status === "editing"
    );
    const completed = myOrders.filter((j) => j.status === "delivered");

    return {
      total: myOrders.length,
      pending: pending.length,
      inProgress: inProgress.length,
      completed: completed.length,
    };
  }, [myOrders]);

  // Upcoming orders (next 7 days)
  const upcomingOrders = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return myOrders
      .filter((job) => {
        const jobDate = new Date(job.scheduledDate);
        return jobDate >= now && jobDate <= weekFromNow;
      })
      .sort(
        (a, b) =>
          new Date(a.scheduledDate).getTime() -
          new Date(b.scheduledDate).getTime()
      )
      .slice(0, 5);
  }, [myOrders]);

  // Recent completed
  const recentCompleted = useMemo(() => {
    return myOrders
      .filter((j) => j.status === "delivered")
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 3);
  }, [myOrders]);

  const handleJobClick = (job: JobRequest) => {
    router.push(`/jobs/${job.id}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            Pending
          </Badge>
        );
      case "assigned":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Assigned
          </Badge>
        );
      case "in_progress":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            Shooting
          </Badge>
        );
      case "editing":
        return (
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
            Editing
          </Badge>
        );
      case "delivered":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Delivered
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <H1 className="text-3xl font-bold">Welcome back, {user.name?.split(" ")[0]}</H1>
          <Muted className="mt-1">Manage your photo shoot orders</Muted>
        </div>
        <Button size="lg" onClick={onCreateOrder} className="gap-2">
          <Plus className="h-5 w-5" />
          Create Order
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <Muted className="text-sm">Total Orders</Muted>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.pending}</div>
                <Muted className="text-sm">Pending</Muted>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Camera className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.inProgress}</div>
                <Muted className="text-sm">In Progress</Muted>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.completed}</div>
                <Muted className="text-sm">Completed</Muted>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Upcoming Shoots
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/jobs")}
              className="gap-1"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingOrders.length > 0 ? (
              <div className="space-y-3">
                {upcomingOrders.map((job) => {
                  const tech = technicians.find(
                    (t) => t.id === job.assignedTechnicianId
                  );
                  return (
                    <button
                      key={job.id}
                      onClick={() => handleJobClick(job)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex-shrink-0 w-14 h-14 bg-primary/10 rounded-xl flex flex-col items-center justify-center">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(job.scheduledDate), "MMM")}
                        </span>
                        <span className="text-lg font-bold text-primary">
                          {format(new Date(job.scheduledDate), "d")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate">
                            {job.propertyAddress}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{job.scheduledTime}</span>
                          {tech && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Avatar className="h-4 w-4">
                                  <AvatarImage src={tech.avatar} />
                                  <AvatarFallback className="text-[10px]">
                                    {tech.name?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                {tech.name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(job.status)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <P className="text-muted-foreground mb-4">
                  No upcoming shoots scheduled
                </P>
                <Button onClick={onCreateOrder} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Order
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions & Recent */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={onCreateOrder}
              >
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
                Create New Order
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => router.push("/orders")}
              >
                <div className="p-2 bg-muted rounded-lg">
                  <Briefcase className="h-4 w-4" />
                </div>
                View All Orders
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => router.push("/calendar")}
              >
                <div className="p-2 bg-muted rounded-lg">
                  <CalendarDays className="h-4 w-4" />
                </div>
                View Calendar
              </Button>
            </CardContent>
          </Card>

          {/* Recent Completed */}
          {recentCompleted.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Recently Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentCompleted.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => handleJobClick(job)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-sm">
                          {job.propertyAddress}
                        </div>
                        <Muted className="text-xs">
                          {format(new Date(job.scheduledDate), "MMM d, yyyy")}
                        </Muted>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

