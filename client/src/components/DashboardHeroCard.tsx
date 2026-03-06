import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Flame, Crown, Star, TrendingUp } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { motion } from "framer-motion";

interface GamificationStats {
  xpPoints: number;
  level: number;
  levelTitle: string;
  xpToNextLevel: number;
  levelProgress: number;
  streakMultiplier: number;
  streakMultiplierLabel: string;
  maxStreak: number;
  weeklyXpEarned: number;
  weeklyXpGoal: number;
  subscriptionTier: string;
}

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: "Free", color: "bg-muted text-muted-foreground" },
  trial: { label: "Trial", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  pro: { label: "Pro", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
  premium: { label: "Premium", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300" },
};

export function DashboardHeroCard() {
  const { data: stats } = useQuery<GamificationStats>({
    queryKey: ["/api/gamification/stats"],
    staleTime: 2 * 60 * 1000,
  });
  const { tier } = useSubscription();

  if (!stats) return null;

  const xpProgress = stats.levelProgress;
  const circumference = 2 * Math.PI * 28;
  const strokeDashoffset = circumference - (xpProgress / 100) * circumference;
  const tierConfig = TIER_LABELS[tier] || TIER_LABELS.free;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.01 }}
    >
      <Card className="border-2 border-primary/25 dark:border-primary/35 bg-gradient-to-r from-primary/10 via-card to-accent/10 dark:from-primary/15 dark:via-card dark:to-accent/15 overflow-hidden relative shadow-md" data-testid="card-dashboard-hero">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0" data-testid="xp-progress-ring">
              <svg width="68" height="68" viewBox="0 0 68 68" className="progress-ring">
                <circle
                  cx="34"
                  cy="34"
                  r="28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-muted/50"
                />
                <circle
                  cx="34"
                  cy="34"
                  r="28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="text-primary progress-ring-circle"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-foreground">{stats.level}</span>
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-foreground truncate">{stats.levelTitle}</h3>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${tierConfig.color} border-0`}>
                  {tierConfig.label === "Premium" && <Crown className="w-2.5 h-2.5 mr-0.5" />}
                  {tierConfig.label}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Zap className="w-3 h-3 text-amber-500" />
                <span>{stats.xpPoints.toLocaleString()} XP</span>
                <span className="mx-1">·</span>
                <span>{stats.xpToNextLevel.toLocaleString()} to next level</span>
              </div>
              <div className="w-full bg-muted/50 rounded-full h-1.5 mt-1">
                <motion.div
                  className="bg-primary h-1.5 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              {stats.maxStreak > 0 && (
                <div className="flex items-center gap-1 text-sm" data-testid="text-streak-display">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="font-bold text-foreground">{stats.maxStreak}</span>
                </div>
              )}
              {stats.streakMultiplier > 1 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 border-0">
                  <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                  {stats.streakMultiplierLabel}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
