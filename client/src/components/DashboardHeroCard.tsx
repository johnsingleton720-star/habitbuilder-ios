import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Flame, Crown, BarChart3, ArrowRight, Star } from "lucide-react";
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.01 }}
    >
      <Card className="border border-border/60 bg-gradient-to-r from-primary/8 to-emerald-50 dark:from-primary/10 dark:to-emerald-950/20 overflow-hidden relative shadow-sm" data-testid="card-dashboard-hero">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0" data-testid="xp-progress-ring">
              <svg width="68" height="68" viewBox="0 0 68 68">
                <circle
                  cx="34" cy="34" r="28"
                  fill="none"
                  className="stroke-muted"
                  strokeWidth="5"
                />
                <circle
                  cx="34" cy="34" r="28"
                  fill="none"
                  className="stroke-violet-500 dark:stroke-violet-400"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  transform="rotate(-90 34 34)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[14px] font-bold text-violet-600 dark:text-violet-400">{stats.level}</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center">
                <Star className="w-2.5 h-2.5 text-white" fill="white" />
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
                {stats.xpPoints.toLocaleString()} XP · {stats.xpToNextLevel.toLocaleString()} to next
              </p>
              <div className="flex gap-3 text-[12px]">
                {stats.maxStreak > 0 && (
                  <span className="flex items-center gap-1 text-orange-500 font-semibold" data-testid="text-streak-display">
                    <Flame className="w-3.5 h-3.5" />{stats.maxStreak} days
                  </span>
                )}
                {stats.streakMultiplier > 1 && (
                  <span className="flex items-center gap-1 text-violet-500 dark:text-violet-400 font-semibold">
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
                  <button className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors" data-testid="link-view-all-stats">
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
