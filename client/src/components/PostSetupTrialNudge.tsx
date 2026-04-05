import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  Brain,
  BarChart3,
  Users,
  Mic,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";

const PREMIUM_FEATURES = [
  {
    icon: Brain,
    label: "Unlimited AI coaching sessions",
    color: "text-violet-500",
  },
  {
    icon: BarChart3,
    label: "Advanced analytics & AI insights",
    color: "text-blue-500",
  },
  {
    icon: Users,
    label: "Accountability partners",
    color: "text-green-500",
  },
  {
    icon: Mic,
    label: "Voice input for coaching replies",
    color: "text-orange-500",
  },
];

interface PostSetupTrialNudgeProps {
  open: boolean;
  onClose: () => void;
}

export function PostSetupTrialNudge({ open, onClose }: PostSetupTrialNudgeProps) {
  const { isInTrial, trialDaysRemaining, isFreeUser } = useSubscription();
  const { user } = useAuth();

  if (!user || user.isAdmin || user.hasPaid) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl pb-8 pt-6 px-6 max-w-lg mx-auto"
        data-testid="sheet-trial-nudge"
      >
        <SheetHeader className="mb-4">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Crown className="w-7 h-7 text-primary" />
            </div>
          </div>
          <SheetTitle className="text-center text-xl font-display">
            {isInTrial
              ? `Your Premium trial is active — ${trialDaysRemaining} days left`
              : "Unlock your full plan with Premium"}
          </SheetTitle>
          <p className="text-center text-sm text-muted-foreground mt-1">
            {isInTrial
              ? "You're exploring all Premium features free. Here's what you have access to right now:"
              : "Start a 7-day free trial and unlock everything that makes your AI plan shine."}
          </p>
        </SheetHeader>

        <div className="space-y-3 mb-5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5">
            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="text-sm font-medium">Unlimited habit tracking (no 1-habit cap)</span>
          </div>
          {PREMIUM_FEATURES.map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
              <span className="text-sm">{label}</span>
            </div>
          ))}
        </div>

        {isInTrial ? (
          <Link href="/paywall" onClick={onClose}>
            <Button className="w-full gap-2" size="lg" data-testid="button-trial-nudge-subscribe">
              <Sparkles className="w-4 h-4" />
              Subscribe to keep Premium
            </Button>
          </Link>
        ) : (
          <Link href="/paywall" onClick={onClose}>
            <Button className="w-full gap-2" size="lg" data-testid="button-trial-nudge-start">
              <Sparkles className="w-4 h-4" />
              Start my free 7-day trial
            </Button>
          </Link>
        )}

        <button
          onClick={onClose}
          className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
          data-testid="button-trial-nudge-dismiss"
        >
          {isInTrial ? "Got it, keep exploring" : "Maybe later"}
        </button>
      </SheetContent>
    </Sheet>
  );
}

const STORAGE_KEY_PREFIX = "trialAwarenessNudgeShown_";

export function usePostSetupTrialNudge(userId: string | undefined) {
  const [shouldShow, setShouldShow] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const storageKey = userId ? `${STORAGE_KEY_PREFIX}${userId}` : null;

  const triggerNudge = () => {
    if (!storageKey) return;
    if (!user || user.isAdmin || user.hasPaid) return;
    if (localStorage.getItem(storageKey)) return;
    setIsOpen(true);
  };

  const handleClose = () => {
    if (storageKey) {
      localStorage.setItem(storageKey, "1");
    }
    setIsOpen(false);
  };

  return { isOpen, triggerNudge, handleClose };
}
