import { Photographer } from "../../../types";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { PhotographerTable } from "../../shared/tables";
import { Users, Star, TrendingUp } from "lucide-react";
import { StatsCard } from "../../shared/dashboard";

interface PhotographerManagementProps {
  photographers: Photographer[];
}

export function PhotographerManagement({
  photographers,
}: PhotographerManagementProps) {
  const activePhotographers = photographers.filter(
    (p) => p.status === "active"
  );
  const avgRating =
    photographers.reduce((sum, p) => sum + p.rating.overall, 0) /
    photographers.length;
  const avgOnTimeRate =
    photographers.reduce((sum, p) => sum + p.reliability.onTimeRate, 0) /
    photographers.length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Stats */}
      <StatsCard
        icon={Users}
        value={activePhotographers.length}
        label="Active Photographers"
        iconBgColor="bg-accent"
        iconColor="text-primary"
      />
      <StatsCard
        icon={Star}
        value={avgRating.toFixed(1)}
        label="Average Rating"
        iconBgColor="bg-yellow-100"
        iconColor="text-yellow-600"
      />
      <StatsCard
        icon={TrendingUp}
        value={(avgOnTimeRate * 100).toFixed(0)}
        label="Avg On-Time Rate"
        valueSuffix="%"
        iconBgColor="bg-emerald-100"
        iconColor="text-emerald-600"
      />

      {/* Table */}
      <Card className="col-span-3">
        <CardHeader className="pb-6 gap-0">
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotographerTable photographers={photographers} />
        </CardContent>
      </Card>
    </div>
  );
}
