import { usePaymentStatus } from "@/hooks/use-payment";
import { Button } from "@/components/ui/button";
import { Sparkles, Crown } from "lucide-react";
import { Link } from "wouter";

export function TrialBanner() {
  const { hasPaid } = usePaymentStatus();

  if (hasPaid) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border border-primary/20 px-4 py-3" data-testid="banner-free-upgrade">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <Crown className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            You're on the free plan (1 habit)
          </p>
          <p className="text-xs text-muted-foreground">
            Upgrade to Pro for unlimited habits and more features
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
