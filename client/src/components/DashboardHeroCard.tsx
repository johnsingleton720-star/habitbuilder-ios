import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Flame, Crown, BarChart3, ArrowRight } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { motion } from "framer-motion";
import { Link } from "wouter";

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

interface DashboardHeroCardProps {
  todayPercent?: number;
  weeklyPercent?: number;
  totalSessions?: number;
  longestStreak?: number;
  statsLoaded?: boolean;
}

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: "Free", color: "bg-muted text-muted-foreground" },
  trial: { label: "Trial", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  pro: { label: "Pro", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
  premium: { label: "Premium", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300" },
};

export function DashboardHeroCard({
  todayPercent,
  weeklyPercent,
  totalSessions,
  longestStreak,
  statsLoaded = false,
}: DashboardHeroCardProps) {
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
  const hasStats = todayPercent !== undefined && weeklyPercent !== undefined && totalSessions !== undefined && longestStreak !== undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.01 }}
    >
      <Card className="border-2 border-primary/25 dark:border-primary/35 bg-gradient-to-r from-primary/10 via-card to-accent/10 dark:from-primary/15 dark:via-card dark:to-accent/15 overflow-hidden relative shadow-md" data-testid="card-dashboard-hero">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0" data-testid="xp-progress-ring">
              <svg width="68" height="68" viewBox="0 0 68 68" className="progress-ring">
                <circle
                  cx="34"
                  cy="34"
                  r="28"
                  fill="none"
                  stroke="hsl(var(--muted) / 0.5)"
                  strokeWidth="5"
                />
                <circle
                  cx="34"
                  cy="34"
                  r="28"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="progress-ring-circle"
                  transform="rotate(-90 34 34)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">{stats.level}</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[15px] font-bold text-foreground">Level {stats.level}</span>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 h-auto ${tierConfig.color} border-0 rounded-full`}>
                  {tierConfig.label === "Premium" && <Crown className="w-2.5 h-2.5 mr-0.5" />}
                  {tierConfig.label}
                </Badge>
              </div>
              <p className="text-[12px] text-muted-foreground mb-1.5">
                {stats.xpPoints.toLocaleString()} XP · {stats.xpToNextLevel.toLocaleString()} to next level
              </p>
              <div className="flex gap-3 text-[12px]">
                {stats.maxStreak > 0 && (
                  <span className="flex items-center gap-1 text-orange-500 font-semibold" data-testid="text-streak-display">
                    <Flame className="w-3.5 h-3.5" />{stats.maxStreak} days
                  </span>
                )}
                {stats.streakMultiplier > 1 && (
                  <span className="flex items-center gap-1 text-primary font-semibold">
                    <Zap className="w-3.5 h-3.5" />{stats.streakMultiplierLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          {statsLoaded && (
            <div className="border-t border-border/40 mt-4 pt-3">
              <div className="grid grid-cols-4 gap-2" data-testid="compact-stats-row">
                <div className="text-center">
                  <p className="text-lg font-bold text-primary">{todayPercent ?? 0}%</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Today</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-violet-500">{weeklyPercent ?? 0}%</p>
                  <p className="text-[10px] text-muted-foreground font-medium">This Week</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-amber-500">{totalSessions ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Total Done</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-orange-500">{longestStreak ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Best Streak</p>
                </div>
              </div>
              <div className="flex justify-center mt-2.5">
                <Link href="/progress/today">
                  <button className="text-[11px] font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors" data-testid="link-view-all-stats">
                    <BarChart3 className="w-3 h-3" />
                    View all stats
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
