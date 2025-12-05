import { Technician } from "../../../types";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { TeamTable } from "../../shared/tables";
import { Users, Star, TrendingUp } from "lucide-react";
import { StatsCard } from "../../shared/dashboard";
import { H2 } from "@/components/ui/typography";

interface ProviderManagementProps {
  technicians: Technician[];
  onRemove?: (technician: Technician) => void;
  onRoleChange?: (technician: Technician, role: Technician['role']) => void;
  updatingRoleId?: string | null;
  currentUserId?: string;
  currentUserMemberId?: string | null;
  currentUserRole?: Technician['role'];
}

export function ProviderManagement({
  technicians,
  onRemove,
  onRoleChange,
  updatingRoleId,
  currentUserId,
  currentUserMemberId,
  currentUserRole,
}: ProviderManagementProps) {
  const activeTechnicians = technicians.filter(
    (p) => p.status === "active" && p.role === "TECHNICIAN"
  );

  const statsRoles = new Set<Technician["role"]>([
    "TECHNICIAN",
    "PROJECT_MANAGER",
    "EDITOR",
  ]);
  const statsPool = technicians.filter((t) => statsRoles.has(t.role as any));

  const avgRating =
    statsPool.length > 0
      ? statsPool.reduce((sum, p) => sum + p.rating.overall, 0) /
        statsPool.length
      : 0;

  const avgOnTimeRate =
    statsPool.length > 0
      ? statsPool.reduce((sum, p) => sum + p.reliability.onTimeRate, 0) /
        statsPool.length
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
          <TeamTable
            technicians={technicians}
            onRemove={onRemove}
            onRoleChange={onRoleChange}
            updatingRoleId={updatingRoleId}
            currentUserId={currentUserId}
            currentUserMemberId={currentUserMemberId}
            currentUserRole={currentUserRole}
          />
        </div>
      </div>
    </div>
  );
}
