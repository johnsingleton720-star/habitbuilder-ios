import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Flame, Crown, BarChart3, ArrowRight, Star, Check } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { format } from "date-fns";

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

interface WeekDay {
  date: Date;
  dateStr: string;
  dayLetter: string;
  isToday: boolean;
  allComplete: boolean;
  partial: boolean;
  isFuture: boolean;
  completedCount: number;
  totalCount: number;
}

interface DashboardHeroCardProps {
  todayPercent?: number;
  weeklyPercent?: number;
  totalSessions?: number;
  longestStreak?: number;
  statsLoaded?: boolean;
  weekDays?: WeekDay[];
  selectedWeekDay?: string | null;
  onSelectWeekDay?: (dateStr: string | null) => void;
}

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: "Free", color: "bg-muted text-muted-foreground" },
  trial: { label: "Trial", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  pro: { label: "Pro", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
  premium: { label: "Premium", color: "bg-primary/15 text-primary" },
};

export function DashboardHeroCard({
  todayPercent,
  weeklyPercent,
  totalSessions,
  longestStreak,
  statsLoaded = false,
  weekDays,
  selectedWeekDay,
  onSelectWeekDay,
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
      <Card className="border border-primary/20 dark:border-primary/30 bg-gradient-to-r from-primary/5 to-accent/8 dark:from-primary/10 dark:to-accent/5 overflow-hidden relative shadow-sm" data-testid="card-dashboard-hero">
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
                  className="stroke-primary"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  transform="rotate(-90 34 34)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[14px] font-bold text-primary">{stats.level}</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
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
                  <span className="flex items-center gap-1 text-primary font-semibold">
                    <Zap className="w-3.5 h-3.5" />{stats.streakMultiplierLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          {statsLoaded && (
            <div className="border-t border-border/30 mt-4 pt-3">
              <div className="grid grid-cols-4 gap-2" data-testid="compact-stats-row">
                <div className="text-center">
                  <p className="text-lg font-bold text-primary">{todayPercent ?? 0}%</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Today</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-primary">{weeklyPercent ?? 0}%</p>
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

          {weekDays && weekDays.length > 0 && (
            <div className="border-t border-border/30 mt-3 pt-4">
              <div className="flex justify-between items-start" data-testid="weekly-completion-strip">
                {weekDays.map((day, i) => {
                  const isSelected = selectedWeekDay === day.dateStr;
                  return (
                    <button
                      key={i}
                      onClick={() => onSelectWeekDay?.(isSelected ? null : day.dateStr)}
                      className={`flex flex-col items-center gap-1.5 flex-1 py-1 rounded-xl transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white/60 dark:bg-white/10 shadow-sm ring-1 ring-border/60'
                          : 'hover:bg-white/30'
                      }`}
                      data-testid={`calendar-day-${day.dateStr}`}
                    >
                      <span className={`text-[14px] font-bold tracking-wide ${
                        day.isToday
                          ? 'text-primary'
                          : isSelected
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                      }`}>{day.dayLetter}</span>
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold transition-all ${
                        day.allComplete
                          ? 'bg-gradient-to-br from-primary to-emerald-400 text-white shadow-md'
                          : day.partial
                            ? 'bg-primary/15 text-primary'
                            : day.isToday
                              ? 'bg-white dark:bg-card text-muted-foreground ring-2 ring-muted-foreground/30 shadow-sm'
                              : day.isFuture
                                ? 'bg-gray-100 dark:bg-muted/30 text-muted-foreground/30'
                                : day.totalCount > 0
                                  ? 'bg-white dark:bg-muted/40 text-muted-foreground'
                                  : 'bg-gray-100 dark:bg-muted/30 text-muted-foreground/30'
                      }`}>
                        {day.allComplete ? (
                          <Check className="w-5 h-5" strokeWidth={3} />
                        ) : day.totalCount > 0 && !day.isFuture ? (
                          <span className="text-[11px] font-bold">{day.completedCount}/{day.totalCount}</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/40">·</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
