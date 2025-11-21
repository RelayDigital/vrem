"use client";

import { JobRequest } from "../../../../types";
import { JobRequestForm } from "../../../shared/jobs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../ui/dialog";

interface NewJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJobCreate: (job: Partial<JobRequest>) => void;
}

export function NewJobDialog({
  open,
  onOpenChange,
  onJobCreate,
}: NewJobDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Job Request</DialogTitle>
        </DialogHeader>
        <JobRequestForm
          onSubmit={(job) => {
            onJobCreate(job);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

