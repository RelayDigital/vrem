"use client";

import { JobRequest, ProviderProfile } from "../../../../types";
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
  technicians: ProviderProfile[];
  onJobAssign: (jobId: string, technicianId: string, score: number) => void;
}

export function RankingsDialog({
  open,
  onOpenChange,
  selectedJob,
  technicians,
  onJobAssign,
}: RankingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:min-w-[90vw] min-w-[calc(100vw-1rem)] md:max-w-[90vw] md:h-[90vh] h-[calc(100vh-1rem)] md:max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogTitle className="sr-only">
          {selectedJob
            ? `Technician Rankings for ${selectedJob.propertyAddress}`
            : "Technician Rankings"}
        </DialogTitle>
        {selectedJob && (
          <div className="flex-1 min-h-0 overflow-hidden h-full">
            <MapWithSidebar
              jobs={[selectedJob]}
              providers={technicians}
              selectedJob={selectedJob}
              onSelectJob={() => {}}
              onJobAssign={onJobAssign}
              className="size-full"
              fullScreen={true}
              initialSidebarView="rankings"
              initialJobForRankings={selectedJob}
              onGoBack={() => onOpenChange(false)}
              isDispatcherView={true}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
