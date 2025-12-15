'use client';

import { JobRequest, Technician } from '../../../types';
import { ProviderCard } from '../../features/provider';
import { rankTechnicians } from '../../../lib/ranking';
import { ScrollArea } from '../../ui/scroll-area';

interface TechnicianRankingsViewProps {
  job: JobRequest;
  technicians: Technician[];
  onAssign: (technicianId: string, score: number) => void;
  preferredVendors?: string[];
  allowOverride?: boolean; // Allow admins to assign unavailable technicians
}

export function TechnicianRankingsView({
  job,
  technicians,
  onAssign,
  preferredVendors = [],
  allowOverride = false,
}: TechnicianRankingsViewProps) {
  const rankings = rankTechnicians(technicians, job, preferredVendors);

  return (
    <ScrollArea className="max-h-[calc(90vh-120px)]">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1 items-stretch">
        {rankings.map((ranking, index) => (
          (() => {
            const technician =
              (ranking as any).provider || (ranking as any).technician;
            if (!technician) return null;
            return (
          <ProviderCard
            key={technician.id}
            technician={technician}
            ranking={ranking.factors}
            score={ranking.score}
            recommended={ranking.recommended && index === 0}
            showFullAddress={true}
            allowOverride={allowOverride}
            onAssign={() => onAssign(technician.id, ranking.score)}
          />
            );
          })()
        ))}
      </div>
    </ScrollArea>
  );
}
