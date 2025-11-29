import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { PhotographerCard } from '../../photographer';
import { PhotographerSearch } from '../../photographer';
import { motion } from 'framer-motion';
import {
  MapPin,
  Calendar,
  Camera,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Search as SearchIcon,
  Sparkles,
} from 'lucide-react';
import { PhotographerRanking, TechnicianRanking } from '../../../../types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { P } from '@/components/ui/typography';

interface PhotographerSelectionStepProps {
  selectedAddress: string;
  jobDetails: {
    scheduledDate: string;
    scheduledTime: string;
    mediaTypes: string[];
  };
  rankings: PhotographerRanking[] | TechnicianRanking[];
  showPhotographerSearch: boolean;
  photographers?: any[]; // Deprecated: use technicians
  technicians?: any[];
  companies: any[];
  preferredVendors: string[];
  onToggleSearch: () => void;
  onPhotographerSelect: (photographerId: string) => void;
  onBack: () => void;
}

export function PhotographerSelectionStep({
  selectedAddress,
  jobDetails,
  rankings,
  showPhotographerSearch,
  photographers,
  technicians,
  companies,
  preferredVendors,
  onToggleSearch,
  onPhotographerSelect,
  onBack,
}: PhotographerSelectionStepProps) {
  // Use technicians if provided, fallback to photographers for backwards compatibility
  const effectiveTechnicians = technicians || photographers || [];
  return (
    <motion.div
      key="photographer"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="container mx-auto p-6 h-full"
    >
      <div className="container mx-auto space-y-6">
        {/* Progress */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span>Address selected</span>
          <ArrowRight className="h-4 w-4 mx-2" />
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span>Details complete</span>
          <ArrowRight className="h-4 w-4 mx-2" />
          <span className="text-primary">Choose technician</span>
        </div>

        {/* Job Summary */}
        <Card className="bg-card rounded-2xl border-2 border-border p-6 shadow-sm gap-0">
          <CardHeader className="flex items-start justify-between mb-4 p-0">
            <h2 className="text-xl">Your Shoot Details</h2>
            <Button variant="ghost" size="sm" onClick={onBack}>
              Edit
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 p-0">
            {/* Location */}
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground/60 mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground/80">Location</div>
                <div className="text-sm text-foreground">{selectedAddress}</div>
              </div>
            </div>
            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground/60 mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground/80">Date & Time</div>
                <div className="text-sm text-foreground">
                  {jobDetails.scheduledDate} at {jobDetails.scheduledTime}
                </div>
              </div>
            </div>
            {/* Media Types */}
            <div className="flex items-start gap-3">
              <Camera className="h-5 w-5 text-muted-foreground/60 mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground/80">Media Types</div>
                <div className="flex gap-1 mt-1">
                  {jobDetails.mediaTypes.map((type) => (
                    <Badge key={type} variant="outline">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Matching Banner with Search Option */}
        <Card className="bg-primary rounded-2xl p-6! text-primary-foreground gap-0">
          
          <CardHeader className="flex items-center justify-between mb-2 p-0">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6" />
              <h3 className="text-xl">AI-Matched Technicians</h3>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={onToggleSearch}
              className="bg-card/20 hover:bg-card/30 text-primary-foreground border-white/30"
            >
              <SearchIcon className="h-4 w-4 mr-2" />
              Search Specific
            </Button>
          </CardHeader>
          <CardContent className="p-0!">
          <P className="text-secondary">
            {showPhotographerSearch
              ? 'Search for a specific technician or your preferred media company'
              : 'We\'ve ranked technicians based on availability, proximity, reliability, and your preferred vendors'}
          </P>
          </CardContent>
        </Card>

        {/* Photographer Search or AI Ranking */}
        {showPhotographerSearch ? (
          <div className="bg-card rounded-2xl border-2 border-border p-6 shadow-sm">
            <PhotographerSearch
              photographers={effectiveTechnicians}
              companies={companies}
              preferredVendors={preferredVendors}
              onSelect={onPhotographerSelect}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rankings.map((ranking, index) => {
              // Handle both PhotographerRanking and TechnicianRanking
              const technician = 'technician' in ranking ? ranking.technician : ranking.photographer;
              return (
              <PhotographerCard
                  key={technician.id}
                  photographer={technician}
                ranking={ranking.factors}
                score={ranking.score}
                recommended={ranking.recommended && index === 0}
                  onAssign={() => onPhotographerSelect(technician.id)}
              />
              );
            })}
          </div>
        )}

        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="min-w-[200px]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Details
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

