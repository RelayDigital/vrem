import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Metrics } from "../../../types";
import {
  TrendingUp,
  Users,
  Camera,
  Clock,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import { Progress } from "../../ui/progress";

interface MetricsDashboardProps {
  metrics: Metrics;
}

export function MetricsDashboard({ metrics }: MetricsDashboardProps) {
  const utilizationPercent = Math.round(
    metrics.photographers.utilization * 100
  );
  const onTimePercent = Math.round(metrics.performance.onTimeRate * 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card variant="muted">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">Total Jobs (Week)</CardTitle>
          <Camera className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl">{metrics.jobs.total}</div>
          <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
            <span>Pending: {metrics.jobs.pending}</span>
            <span>Assigned: {metrics.jobs.assigned}</span>
            <span>Done: {metrics.jobs.completed}</span>
          </div>
        </CardContent>
      </Card>

      <Card variant="muted">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">Photographer Utilization</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl">{utilizationPercent}%</div>
          <Progress value={utilizationPercent} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {metrics.photographers.available}/{metrics.photographers.active}{" "}
            available
          </p>
        </CardContent>
      </Card>

      <Card variant="muted">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">Avg Delivery Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl">
            {metrics.performance.averageDeliveryTime}h
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Assignment: {metrics.performance.averageAssignmentTime}m
          </p>
        </CardContent>
      </Card>

      <Card variant="muted">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">Revenue (Week)</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl">
            ${(metrics.revenue.total / 1000).toFixed(1)}k
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            ${metrics.revenue.perJob}/job avg
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2" variant="muted">
        <CardHeader>
          <CardTitle className="text-sm">On-Time Delivery Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-3xl">{onTimePercent}%</div>
              <Progress value={onTimePercent} className="mt-2" />
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {Math.round(
              metrics.jobs.completed * metrics.performance.onTimeRate
            )}{" "}
            of {metrics.jobs.completed} jobs delivered on time
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2" variant="muted">
        <CardHeader>
          <CardTitle className="text-sm">Client Satisfaction</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-3xl">
                {metrics.performance.clientSatisfaction}/5.0
              </div>
              <Progress
                value={(metrics.performance.clientSatisfaction / 5) * 100}
                className="mt-2"
              />
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Based on {metrics.jobs.completed} completed jobs
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
