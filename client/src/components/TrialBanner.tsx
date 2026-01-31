import { usePaymentStatus } from "@/hooks/use-payment";
import { Button } from "@/components/ui/button";
import { Clock, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { differenceInHours, differenceInMinutes } from "date-fns";

export function TrialBanner() {
  const { isTrialActive, hasPaid, trialEndsAt } = usePaymentStatus();

  if (hasPaid || !isTrialActive || !trialEndsAt) {
    return null;
  }

  const trialEnd = new Date(trialEndsAt);
  const now = new Date();
  const hoursRemaining = differenceInHours(trialEnd, now);
  const minutesRemaining = differenceInMinutes(trialEnd, now) % 60;

  let timeText = "";
  if (hoursRemaining > 0) {
    timeText = `${hoursRemaining}h ${minutesRemaining}m`;
  } else if (minutesRemaining > 0) {
    timeText = `${minutesRemaining} minutes`;
  } else {
    timeText = "ending soon";
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/50 dark:border-amber-800/50 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            Free trial: <span className="text-amber-600 dark:text-amber-400">{timeText}</span> remaining
          </p>
          <p className="text-xs text-muted-foreground">
            Unlock full access for just $6/month
          </p>
        </div>
      </div>
      <Link href="/paywall">
        <Button size="sm" className="gap-1.5" data-testid="button-upgrade">
          <Sparkles className="h-3.5 w-3.5" />
          Upgrade
        </Button>
      </Link>
    </div>
  );
}
