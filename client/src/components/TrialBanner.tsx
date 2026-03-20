import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Clock, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export function TrialBanner() {
  const { user } = useAuth();
  const { isInTrial, trialExpired, trialDaysRemaining, trialEndsAt } = useSubscription();

  if (!user) return null;
  if (user.isAdmin) return null;
  if (user.hasPaid) return null;

  if (isInTrial) {
    const hoursRemaining = trialEndsAt
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60)))
      : 0;

    const timeLabel = trialDaysRemaining > 1
      ? `${trialDaysRemaining} days left`
      : trialDaysRemaining === 1
        ? hoursRemaining <= 24 ? `${hoursRemaining} hours left` : "1 day left"
        : `${hoursRemaining} hours left`;

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-emerald-500/5 to-primary/5 dark:from-primary/10 dark:via-emerald-500/10 dark:to-primary/10" data-testid="card-trial-active">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground" data-testid="text-trial-active">Premium Trial Active</p>
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Clock className="w-3 h-3" />
                    {timeLabel}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You have full access to all Premium features. Subscribe before your trial ends to keep them.
                </p>
              </div>
              <Link href="/paywall">
                <Button size="sm" className="gap-1.5 flex-shrink-0" data-testid="button-trial-upgrade">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Subscribe</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (trialExpired) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-amber-300 dark:border-amber-700/50 bg-gradient-to-r from-amber-50/80 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/15" data-testid="card-trial-expired">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground" data-testid="text-trial-expired">Your Premium trial has ended</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Subscribe now to keep unlimited habits, AI coaching, and all Premium features.
                </p>
              </div>
              <Link href="/paywall">
                <Button size="sm" className="gap-1.5 flex-shrink-0" data-testid="button-trial-expired-upgrade">
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Upgrade</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return null;
}
