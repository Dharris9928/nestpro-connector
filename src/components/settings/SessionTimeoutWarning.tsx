import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock } from "lucide-react";

interface SessionTimeoutWarningProps {
  open: boolean;
  timeRemaining: number;
  onExtend: () => void;
  onTimeout: () => void;
}

export function SessionTimeoutWarning({
  open,
  timeRemaining,
  onExtend,
  onTimeout
}: SessionTimeoutWarningProps) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <AlertDialogTitle>Session Timeout Warning</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>
              Your session is about to expire due to inactivity.
            </p>
            <p className="text-lg font-semibold text-foreground">
              Time remaining: {minutes}:{seconds.toString().padStart(2, '0')}
            </p>
            <p className="text-sm text-muted-foreground">
              Click "Stay Logged In" to continue your session, or you will be automatically logged out.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onExtend}>
            Stay Logged In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
