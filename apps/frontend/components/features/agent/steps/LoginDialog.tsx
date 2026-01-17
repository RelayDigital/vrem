import { Button } from '../../../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../ui/dialog';
import { LogIn, UserPlus } from 'lucide-react';

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onLogin: () => void;
}

export function LoginDialog({ open, onClose, onLogin }: LoginDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-primary" />
            Sign in to confirm booking
          </DialogTitle>
          <DialogDescription>
            You've selected your technician! Sign in or create an account to confirm your booking and get started.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-4">
          <Button
            onClick={() => {
              onClose();
              onLogin();
            }}
            className="w-full bg-primary "
          >
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              onLogin();
            }}
            className="w-full"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Create Account
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full"
          >
            Go Back
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

