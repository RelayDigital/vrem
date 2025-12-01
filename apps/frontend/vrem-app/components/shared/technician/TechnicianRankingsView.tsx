'use client';

import { JobRequest, Technician } from '../../../types';
import { TechnicianCard } from '../../features/technician';
import { rankTechnicians } from '../../../lib/ranking';
import { ScrollArea } from '../../ui/scroll-area';

interface TechnicianRankingsViewProps {
  job: JobRequest;
  technicians: Technician[];
  onAssign: (technicianId: string, score: number) => void;
  preferredVendors?: string[];
}

export function TechnicianRankingsView({
  job,
  technicians,
  onAssign,
  preferredVendors = [],
}: TechnicianRankingsViewProps) {
  const rankings = rankTechnicians(technicians, job, preferredVendors);

  return (
    <ScrollArea className="max-h-[calc(90vh-120px)]">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1 items-stretch">
        {rankings.map((ranking, index) => (
          <TechnicianCard
            key={ranking.technician.id}
            technician={ranking.technician}
            ranking={ranking.factors}
            score={ranking.score}
            recommended={ranking.recommended && index === 0}
            showFullAddress={true}
            onAssign={() => onAssign(ranking.technician.id, ranking.score)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

