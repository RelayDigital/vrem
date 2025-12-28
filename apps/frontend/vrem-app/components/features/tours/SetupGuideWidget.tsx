'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Check, X, RotateCcw } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { useTour, TRACK_METADATA, getTourSteps } from '@/context/tour-context';
import { TourTrack } from '@/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

interface SetupGuideWidgetProps {
  className?: string;
}

const TOUR_TRACKS: TourTrack[] = [
  'DASHBOARD_OVERVIEW',
  'JOB_MANAGEMENT',
  'MESSAGING_CHAT',
  'SETTINGS_INTEGRATIONS',
];

export function SetupGuideWidget({ className }: SetupGuideWidgetProps) {
  const { user } = useAuth();
  const {
    status,
    isLoading,
    error,
    isTourActive,
    getTrackProgress,
    startTourFromStep,
    dismissGuide,
    resetProgress,
  } = useTour();

  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedTrack, setExpandedTrack] = useState<string>('');

  // Don't show if dismissed or completed
  if (status?.dismissedGuide || status?.hasCompletedSetup) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <div className="h-5 w-32 bg-muted rounded" />
          <div className="h-3 w-48 bg-muted rounded mt-2" />
        </CardHeader>
        <CardContent>
          <div className="h-2 w-full bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return null;
  }

  // Calculate progress based on visible tracks only (filtered by account type)
  const visibleTracksProgress = TOUR_TRACKS.reduce(
    (acc, track) => {
      const steps = getTourSteps(track, user?.accountType);
      if (steps.length === 0) return acc; // Skip tracks with no steps for this account type
      const trackProgress = getTrackProgress(track);
      return {
        completed: acc.completed + (trackProgress?.completed ?? 0),
        total: acc.total + steps.length,
      };
    },
    { completed: 0, total: 0 }
  );
  const overallProgress = {
    ...visibleTracksProgress,
    percentage: visibleTracksProgress.total > 0
      ? Math.round((visibleTracksProgress.completed / visibleTracksProgress.total) * 100)
      : 0,
  };

  return (
    <Card className={cn('overflow-hidden', className)} data-tour="setup-guide">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="p-4!">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <CardTitle className="text-base font-semibold">
                  Setup Guide
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Get started with a quick tour of the platform
                </p>
                {/* Progress bar with completion status */}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {overallProgress.completed}/{overallProgress.total} completed
                  </span>
                  <Progress value={overallProgress.percentage} className="h-1.5 w-24" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => resetProgress()}
                title="Reset progress"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => dismissGuide()}
                title="Dismiss guide"
              >
                <X className="h-4 w-4" />
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="p-0!">
            <Accordion
              type="single"
              collapsible
              value={expandedTrack}
              onValueChange={setExpandedTrack}
              className="w-full"
            >
              {TOUR_TRACKS.map((track) => {
                const trackProgress = getTrackProgress(track);
                const metadata = TRACK_METADATA[track];
                const isTrackComplete = trackProgress?.finished ?? false;
                const completedCount = trackProgress?.completed ?? 0;
                const steps = getTourSteps(track, user?.accountType);

                // Skip tracks with no steps for this account type
                if (steps.length === 0) {
                  return null;
                }

                return (
                  <AccordionItem
                    key={track}
                    value={track}
                    className="border-b-0 border-t"
                  >
                    <AccordionTrigger className="py-3 px-3 hover:no-underline bg-muted/50 rounded-none items-center">
                      <div className="flex items-center gap-3">
                        <div className="text-left">
                          <p
                            className={cn(
                              'text-sm font-medium',
                              isTrackComplete && 'text-muted-foreground'
                            )}
                          >
                            {metadata.title}
                          </p>
                          {/* <p className="text-xs text-muted-foreground">
                            {isTrackComplete
                              ? 'Completed'
                              : completedCount > 0
                              ? `${completedCount}/${steps.length} completed`
                              : 'Not started'}
                          </p> */}
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="border-t p-0">
                      <div className="flex flex-col gap-1">
                        {steps.map((step, index) => {
                          const isStepCompleted = index < completedCount;
                          const isNextStep = index === completedCount;
                          const isLocked = index > completedCount;

                          return (
                            <button
                              key={step.id}
                              onClick={() => startTourFromStep(track, index)}
                              disabled={isTourActive || isLocked}
                              className={cn(
                                'w-full text-left px-4 py-2.5 text-sm transition-colors',
                                'flex items-center gap-3 rounded-none',
                                isLocked
                                  ? 'opacity-40 cursor-not-allowed'
                                  : 'hover:bg-primary/10',
                                isNextStep && !isLocked && 'text-primary font-medium'
                              )}
                            >
                              {/* Step status indicator */}
                              <div
                                className={cn(
                                  'flex size-5 items-center justify-center rounded-full shrink-0',
                                  isStepCompleted
                                    ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                                    : isNextStep
                                    ? 'border-2 border-primary bg-primary/10'
                                    : 'border-2 border-muted-foreground/20'
                                )}
                              >
                                {isStepCompleted && <Check className="h-3 w-3" />}
                              </div>
                              <span className={cn(isStepCompleted && 'text-muted-foreground')}>
                                {step.title}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
