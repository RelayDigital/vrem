import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { ProviderCard } from '../../provider';
import { ProviderSearch } from '../../provider';
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
  Building2,
  Send,
} from 'lucide-react';
import { TechnicianRanking, CustomerOrganization } from '../../../../types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { P, H2 } from '@/components/ui/typography';

interface TechnicianSelectionStepProps {
  selectedAddress: string;
  jobDetails: {
    scheduledDate: string;
    scheduledTime: string;
    mediaTypes: string[];
  };
  rankings: TechnicianRanking[];
  showProviderSearch: boolean;
  technicians?: any[];
  companies: any[];
  preferredVendors: string[];
  onToggleSearch: () => void;
  onTechnicianSelect: (technicianId: string) => void;
  onBack: () => void;
  // Agent flow: pre-selected provider
  selectedProvider?: CustomerOrganization | null;
  // Scheduling mode: 'scheduled' (specific time) or 'requested' (let provider choose)
  schedulingMode?: 'scheduled' | 'requested';
}

export function TechnicianSelectionStep({
  selectedAddress,
  jobDetails,
  rankings,
  showProviderSearch,
  technicians,
  companies,
  preferredVendors,
  onToggleSearch,
  onTechnicianSelect,
  onBack,
  selectedProvider,
  schedulingMode = 'scheduled',
}: TechnicianSelectionStepProps) {
  const effectiveTechnicians = technicians || [];

  // Agent flow: provider is pre-selected, show confirmation UI
  const isAgentFlow = !!selectedProvider;
  const isRequestedScheduling = schedulingMode === 'requested';

  return (
    <motion.div
      key="technician"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="container mx-auto p-6 h-full"
    >
      <div className="container mx-auto space-y-6" style={{ maxWidth: '896px' }}>
        {/* Progress */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          {isAgentFlow && (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span>Provider selected</span>
              <ArrowRight className="h-4 w-4 mx-2" />
            </>
          )}
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span>Address selected</span>
          <ArrowRight className="h-4 w-4 mx-2" />
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span>Job details</span>
          <ArrowRight className="h-4 w-4 mx-2" />
          <span className="text-primary font-medium">
            {isAgentFlow ? 'Confirm order' : 'Choose technician'}
          </span>
        </div>

        {/* Job Summary */}
        <Card className="bg-card rounded-2xl border-2 border-border p-6 shadow-sm gap-0">
          <CardHeader className="flex items-start justify-between mb-4 p-0">
            <h2 className="text-xl">Your Shoot Details</h2>
            <Button variant="ghost" size="sm" onClick={onBack}>
              Edit
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-0">
            {/* Provider (for agent flow) */}
            {selectedProvider && (
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground/60 mt-0.5" />
                <div>
                  <div className="text-xs text-muted-foreground/80">Provider</div>
                  <div className="text-sm text-foreground font-medium">{selectedProvider.orgName}</div>
                </div>
              </div>
            )}
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
                  {isRequestedScheduling ? (
                    <span className="text-amber-600 dark:text-amber-400">To be scheduled by provider</span>
                  ) : (
                    <>{jobDetails.scheduledDate} at {jobDetails.scheduledTime}</>
                  )}
                </div>
              </div>
            </div>
            {/* Media Types */}
            <div className="flex items-start gap-3">
              <Camera className="h-5 w-5 text-muted-foreground/60 mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground/80">Media Types</div>
                <div className="flex gap-1 mt-1 flex-wrap">
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

        {/* Agent Flow: Confirmation UI */}
        {isAgentFlow ? (
          <>
            {/* Provider Confirmation Banner */}
            <Card className="bg-primary rounded-2xl p-6 text-primary-foreground gap-0">
              <CardHeader className="flex items-center justify-between mb-2 p-0">
                <div className="flex items-center gap-3">
                  <Building2 className="h-6 w-6" />
                  <h3 className="text-xl">Ready to Submit</h3>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <P className="text-primary-foreground/80">
                  Your order will be sent to <strong>{selectedProvider.orgName}</strong> for fulfillment. 
                  They will assign a technician and confirm your booking.
                </P>
              </CardContent>
            </Card>

            {/* Confirm Button */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button
                variant="outline"
                onClick={onBack}
                className="min-w-[200px]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Details
              </Button>
              <Button
                onClick={() => onTechnicianSelect('confirm')}
                className="min-w-[200px] bg-primary"
                size="lg"
              >
                <Send className="h-4 w-4 mr-2" />
                Submit Order
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Original Flow: AI Matching Banner with Search Option */}
            <Card className="bg-primary rounded-2xl p-6 text-primary-foreground gap-0">
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
              <CardContent className="p-0">
                <P className="text-primary-foreground/80">
                  {showProviderSearch
                    ? 'Search for a specific technician or your preferred media company'
                    : "We've ranked technicians based on availability, proximity, reliability, and your preferred vendors"}
                </P>
              </CardContent>
            </Card>

            {/* Technician Search or AI Ranking */}
            {showProviderSearch ? (
              <div className="bg-card rounded-2xl border-2 border-border p-6 shadow-sm">
                <ProviderSearch
                  technicians={effectiveTechnicians}
                  companies={companies}
                  preferredVendors={preferredVendors}
                  onSelect={onTechnicianSelect}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rankings.map((ranking, index) => {
                  // Handle both legacy TechnicianRanking (technician) and ProviderRanking (provider)
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
                      onAssign={() => onTechnicianSelect(technician.id)}
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
          </>
        )}
      </div>
    </motion.div>
  );
}
