import { Progress } from '../../ui/progress';

interface RankingFactorsProps {
  factors: {
    availability: number;
    distance: number;
    distanceKm: number;
    reliability: number;
    skillMatch: number;
    preferredRelationship: number;
  };
}

export function RankingFactors({ factors }: RankingFactorsProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Availability</span>
            <span className="text-foreground">{factors.availability}%</span>
          </div>
          <Progress value={factors.availability} className="h-1.5" />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Distance</span>
            <span className="text-foreground">{factors.distanceKm.toFixed(1)}km</span>
          </div>
          <Progress value={factors.distance} className="h-1.5" />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Reliability</span>
            <span className="text-foreground">{factors.reliability.toFixed(0)}%</span>
          </div>
          <Progress value={factors.reliability} className="h-1.5" />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Skill Match</span>
            <span className="text-foreground">{factors.skillMatch.toFixed(0)}%</span>
          </div>
          <Progress value={factors.skillMatch} className="h-1.5" />
        </div>
      </div>
      {factors.preferredRelationship > 0 && (
        <div className="p-2 bg-accent rounded-lg border border-primary/20">
          <div className="text-xs text-primary font-medium">✓ Preferred Vendor Relationship</div>
        </div>
      )}
    </div>
  );
}

