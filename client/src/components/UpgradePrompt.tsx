import { Crown, Lock, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

interface UpgradePromptProps {
  feature: string;
  description?: string;
  variant?: "inline" | "card" | "overlay" | "badge";
  className?: string;
}

export function UpgradePrompt({ feature, description, variant = "inline", className }: UpgradePromptProps) {
  const [, navigate] = useLocation();

  if (variant === "badge") {
    return (
      <Badge
        variant="outline"
        className={cn("gap-1 cursor-pointer text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30", className)}
        onClick={() => navigate("/paywall")}
        data-testid="badge-upgrade-prompt"
      >
        <Crown className="w-3 h-3" />
        Pro
      </Badge>
    );
  }

  if (variant === "overlay") {
    return (
      <div className={cn("relative", className)} data-testid="overlay-upgrade-prompt">
        <div className="absolute inset-0 backdrop-blur-[2px] bg-background/60 dark:bg-background/70 rounded-lg z-10 flex flex-col items-center justify-center gap-2 p-4">
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium">{feature}</span>
          </div>
          <p className="text-xs text-muted-foreground text-center max-w-[200px]">
            {description || "Upgrade to unlock this feature"}
          </p>
          <Button
            size="sm"
            onClick={() => navigate("/paywall")}
            className="gap-1.5 mt-1"
            data-testid="button-upgrade-overlay"
          >
            <Crown className="w-3.5 h-3.5" />
            Unlock with Pro
          </Button>
        </div>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("rounded-lg border border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50/80 to-amber-100/40 dark:from-amber-950/30 dark:to-amber-900/10 p-4", className)} data-testid="card-upgrade-prompt">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{feature}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {description || "This feature is available with a Pro or Premium subscription."}
            </p>
            <Button
              size="sm"
              onClick={() => navigate("/paywall")}
              className="gap-1.5 mt-3"
              data-testid="button-upgrade-card"
            >
              <Crown className="w-3.5 h-3.5" />
              See Plans
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)} data-testid="inline-upgrade-prompt">
      <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
      <span className="text-muted-foreground">{feature}</span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate("/paywall")}
        className="gap-1 ml-auto text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
        data-testid="button-upgrade-inline"
      >
        <Crown className="w-3 h-3" />
        Upgrade
      </Button>
    </div>
  );
}

interface LockedFeatureProps {
  children: React.ReactNode;
  isLocked: boolean;
  feature: string;
  description?: string;
  className?: string;
}

export function LockedFeature({ children, isLocked, feature, description, className }: LockedFeatureProps) {
  const [, navigate] = useLocation();
  
  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative", className)}>
      <div className="opacity-40 pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 z-10">
        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-background/80 dark:bg-background/80 px-3 py-1.5 rounded-full border border-amber-200/50 dark:border-amber-800/50 backdrop-blur-sm">
          <Lock className="w-3 h-3" />
          <span className="text-xs font-medium">{feature}</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate("/paywall")}
          className="text-xs gap-1 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400"
          data-testid="button-unlock-feature"
        >
          <Crown className="w-3 h-3" />
          Unlock
        </Button>
      </div>
    </div>
  );
}

interface SessionLimitReachedProps {
  className?: string;
}

export function SessionLimitReached({ className }: SessionLimitReachedProps) {
  const [, navigate] = useLocation();
  
  return (
    <div className={cn("rounded-lg border border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50/80 to-amber-100/40 dark:from-amber-950/30 dark:to-amber-900/10 p-5 text-center", className)} data-testid="session-limit-reached">
      <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mx-auto mb-3">
        <Sparkles className="w-6 h-6 text-amber-600 dark:text-amber-400" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">You're on a roll!</h3>
      <p className="text-sm text-muted-foreground mb-4">
        You've used all 2 free sessions this week. Upgrade to Pro for unlimited guided sessions and keep your momentum going.
      </p>
      <Button
        onClick={() => navigate("/paywall")}
        className="gap-2"
        data-testid="button-upgrade-session-limit"
      >
        <Crown className="w-4 h-4" />
        Upgrade to Pro
        <ArrowRight className="w-4 h-4" />
      </Button>
      <p className="text-xs text-muted-foreground mt-3">Sessions reset every Monday</p>
    </div>
  );
}
