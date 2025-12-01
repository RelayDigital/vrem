'use client';

import { JobRequest, Technician, TechnicianRanking } from '../../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { TechnicianTable } from '../../shared/tables';
import { RankingFactors } from '../../shared/ranking';
import {
  MapPin,
  Calendar,
  Clock,
  Camera,
} from 'lucide-react';
import { P } from '@/components/ui/typography';

interface JobAssignmentProps {
  job: JobRequest;
  rankings: TechnicianRanking[];
  onAssign: (technicianId: string, score: number) => void;
}

export function JobAssignment({ job, rankings, onAssign }: JobAssignmentProps) {
  return (
    <div className="space-y-6">
      {/* Job Details */}
      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground/60 mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground">Location</div>
                <div className="text-sm">{job.propertyAddress}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground/60 mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground">Date</div>
                <div className="text-sm">{job.scheduledDate}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-5 w-5 text-muted-foreground/60 mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground">Time</div>
                <div className="text-sm">{job.scheduledTime}</div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Camera className="h-5 w-5 text-muted-foreground/60" />
            <div className="flex gap-2 flex-wrap">
              {job.mediaType.map((type) => (
                <Badge key={type} variant="outline">
                  {type}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ranked Technicians */}
      <Card>
        <CardHeader>
          <CardTitle>AI-Ranked Technicians</CardTitle>
          <P className="text-sm text-muted-foreground">
            Technicians ranked by availability, distance, reliability, and skill match
          </P>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rankings.map((ranking, index) => (
              <div
                key={ranking.technician.id}
                className={`p-4 border-2 rounded-xl transition-all ${
                  ranking.recommended && index === 0
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-semibold text-lg">
                      {ranking.technician.name}
                      {ranking.recommended && index === 0 && (
                        <Badge className="ml-2 bg-emerald-600">Recommended</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{ranking.technician.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">
                      {ranking.score.toFixed(0)}
                    </div>
                    <div className="text-xs text-muted-foreground">score</div>
                  </div>
                </div>
                <RankingFactors factors={ranking.factors} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
