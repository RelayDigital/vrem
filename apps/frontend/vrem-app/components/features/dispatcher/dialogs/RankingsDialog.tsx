"use client";

import { JobRequest, Photographer } from "../../../../types";
import { MapWithSidebar } from "../../../shared/dashboard/MapWithSidebar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "../../../ui/dialog";

interface RankingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedJob: JobRequest | null;
  photographers: Photographer[];
  onJobAssign: (jobId: string, photographerId: string, score: number) => void;
}

export function RankingsDialog({
  open,
  onOpenChange,
  selectedJob,
  photographers,
  onJobAssign,
}: RankingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:min-w-[90vw] min-w-[calc(100vw-1rem)] md:max-w-[90vw] md:h-[90vh] h-[calc(100vh-1rem)] md:max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogTitle className="sr-only">
          {selectedJob
            ? `Photographer Rankings for ${selectedJob.propertyAddress}`
            : "Photographer Rankings"}
        </DialogTitle>
        {selectedJob && (
          <div className="flex-1 min-h-0 overflow-hidden h-full">
            <MapWithSidebar
              jobs={[selectedJob]}
              photographers={photographers}
              selectedJob={selectedJob}
              onSelectJob={() => {}}
              onJobAssign={onJobAssign}
              className="size-full"
              fullScreen={true}
              initialSidebarView="rankings"
              initialJobForRankings={selectedJob}
              onGoBack={() => onOpenChange(false)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

