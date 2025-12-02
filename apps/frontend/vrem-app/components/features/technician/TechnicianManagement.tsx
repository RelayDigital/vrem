import { Technician } from "../../../types";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { TechnicianTable } from "../../shared/tables";
import { Users, Star, TrendingUp } from "lucide-react";
import { StatsCard } from "../../shared/dashboard";
import { H2 } from "@/components/ui/typography";

interface TechnicianManagementProps {
  technicians: Technician[];
  onRemove?: (technician: Technician) => void;
}

export function TechnicianManagement({
  technicians,
  onRemove,
}: TechnicianManagementProps) {
  const activeTechnicians = technicians.filter(
    (p) => p.status === "active"
  );
  const avgRating =
    technicians.length > 0
      ? technicians.reduce((sum, p) => sum + p.rating.overall, 0) /
        technicians.length
      : 0;
  const avgOnTimeRate =
    technicians.length > 0
      ? technicians.reduce((sum, p) => sum + p.reliability.onTimeRate, 0) /
        technicians.length
      : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Stats */}
      <StatsCard
        icon={Users}
        value={activeTechnicians.length}
        label="Active Technicians"
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
      <div className="@container md:col-span-3 mt-md">
        {/* <div className="mb-md flex items-baseline justify-between">
          <H2 className="text-lg border-0">Team Members</H2>
        </div> */}
        <div className="">
          <TechnicianTable technicians={technicians} onRemove={onRemove} />
        </div>
      </div>
    </div>
  );
}
