import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Technician } from "@/types";
import { Badge } from "@/components/ui/badge";

interface RoleChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target?: Technician | null;
  newRole?: Technician["role"];
  onConfirm: () => void;
  loading?: boolean;
}

export function RoleChangeDialog({
  open,
  onOpenChange,
  target,
  newRole,
  onConfirm,
  loading = false,
}: RoleChangeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm role change</DialogTitle>
          <DialogDescription>
            Changing roles updates permissions immediately. Promoting another user to OWNER will downgrade your own role to ADMIN.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div>
            Change{" "}
            <span className="font-semibold">
              {target?.name || "this member"}
            </span>{" "}
            to <Badge variant="outline">{newRole}</Badge>?
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading} variant="destructive">
            {loading ? "Updating..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
