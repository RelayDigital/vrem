'use client';

import { JobRequest, Photographer } from '../../../types';
import { PhotographerCard } from '../../features/photographer';
import { rankPhotographers } from '../../../lib/ranking';
import { ScrollArea } from '../../ui/scroll-area';

interface PhotographerRankingsViewProps {
  job: JobRequest;
  photographers: Photographer[];
  onAssign: (photographerId: string, score: number) => void;
  preferredVendors?: string[];
}

export function PhotographerRankingsView({
  job,
  photographers,
  onAssign,
  preferredVendors = [],
}: PhotographerRankingsViewProps) {
  const rankings = rankPhotographers(photographers, job, preferredVendors);

  return (
    <ScrollArea className="max-h-[calc(90vh-120px)]">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1 items-stretch">
        {rankings.map((ranking, index) => (
          <PhotographerCard
            key={ranking.photographer.id}
            photographer={ranking.photographer}
            ranking={ranking.factors}
            score={ranking.score}
            recommended={ranking.recommended && index === 0}
            showFullAddress={true}
            onAssign={() => onAssign(ranking.photographer.id, ranking.score)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

