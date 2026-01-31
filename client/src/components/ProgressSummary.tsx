import { Card, CardContent } from "@/components/ui/card";
import { Flame, Target, TrendingUp, Trophy, Calendar } from "lucide-react";
import { format, subDays, startOfWeek, addDays } from "date-fns";
import { Link } from "wouter";
import { motion } from "framer-motion";
import type { Habit, DailyPlan } from "@shared/schema";

interface ProgressSummaryProps {
  habits: Habit[];
}

export function ProgressSummary({ habits }: ProgressSummaryProps) {
  if (!habits || habits.length === 0) {
    return null;
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");

  const getHabitDayComplete = (habit: Habit, dateStr: string) => {
    const dailyPlans = (habit.dailyPlans || []) as DailyPlan[];
    const plan = dailyPlans.find(p => p.date === dateStr);
    if (!plan || plan.tasks.length === 0) return false;
    return plan.completed || plan.tasks.every(t => t.completed);
  };

  const habitsWithTodayPlans = habits.filter(h => {
    const dailyPlans = (h.dailyPlans || []) as DailyPlan[];
    return dailyPlans.some(p => p.date === todayStr && p.tasks.length > 0);
  });

  const habitsWithYesterdayPlans = habits.filter(h => {
    const dailyPlans = (h.dailyPlans || []) as DailyPlan[];
    return dailyPlans.some(p => p.date === yesterdayStr && p.tasks.length > 0);
  });

  const todayCompletions = habitsWithTodayPlans.filter(h => getHabitDayComplete(h, todayStr)).length;
  const todayTotal = habitsWithTodayPlans.length || habits.length;
  const todayPercent = todayTotal > 0 ? Math.round((todayCompletions / todayTotal) * 100) : 0;

  const totalSessions = habits.reduce((sum, h) => 
    sum + ((h.progress || []) as any[]).length, 0
  );

  const longestStreak = Math.max(...habits.map(h => h.longestStreak || 0), 0);
  const currentStreakSum = habits.reduce((sum, h) => sum + (h.currentStreak || 0), 0);

  // Calculate weekly completion data for mini calendar
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const dateStr = format(date, "yyyy-MM-dd");
    const completedCount = habits.filter(h => getHabitDayComplete(h, dateStr)).length;
    const totalCount = habits.filter(h => {
      const dailyPlans = (h.dailyPlans || []) as DailyPlan[];
      return dailyPlans.some(p => p.date === dateStr && p.tasks.length > 0);
    }).length;
    return {
      date,
      dayLetter: format(date, "EEEEE"),
      isToday: dateStr === todayStr,
      completed: completedCount,
      total: totalCount || habits.length,
      allComplete: totalCount > 0 && completedCount === totalCount,
    };
  });

  const stats = [
    {
      icon: Target,
      label: "Today",
      value: todayPercent,
      suffix: "%",
      subtext: `${todayCompletions}/${todayTotal} habits`,
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      iconColor: "text-blue-500",
      href: "/progress/today",
    },
    {
      icon: Trophy,
      label: "Total Done",
      value: totalSessions,
      suffix: "",
      subtext: "completed sessions",
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
      iconColor: "text-amber-500",
      href: "/progress/total",
    },
    {
      icon: Flame,
      label: "Best Streak",
      value: longestStreak,
      suffix: "",
      subtext: "consecutive days",
      color: "from-orange-500 to-red-500",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      iconColor: "text-orange-500",
      href: "/progress/streak",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat, index) => (
          <Link key={index} href={stat.href}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <Card className={`border-0 ${stat.bgColor} shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden`} data-testid={`stat-card-${stat.label.toLowerCase().replace(' ', '-')}`}>
                <CardContent className="p-4 relative">
                  {/* Background gradient accent */}
                  <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.color} opacity-10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2`} />
                  
                  <div className="relative">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bgColor} border border-white/50 dark:border-white/10 mb-3`}>
                      <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                    </div>
                    
                    <div className="flex items-baseline gap-1">
                      <span className={`font-display text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`} data-testid={`stat-${stat.label.toLowerCase().replace(' ', '-')}`}>
                        {stat.value}
                      </span>
                      {stat.suffix && (
                        <span className={`text-lg font-semibold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                          {stat.suffix}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-1 font-medium">{stat.label}</p>
                    <p className="text-[10px] text-muted-foreground/70">{stat.subtext}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Weekly Calendar Strip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">This Week</span>
            </div>
            
            <div className="flex justify-between gap-1">
              {weekDays.map((day, i) => (
                <div 
                  key={i}
                  className={`flex flex-col items-center gap-1.5 flex-1 py-2 px-1 rounded-xl transition-all ${
                    day.isToday 
                      ? 'bg-primary/10 ring-2 ring-primary/30' 
                      : ''
                  }`}
                >
                  <span className={`text-xs font-medium ${day.isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    {day.dayLetter}
                  </span>
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      day.allComplete 
                        ? 'bg-gradient-to-br from-primary to-accent text-white shadow-md shadow-primary/30' 
                        : day.completed > 0 
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : 'bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    {day.allComplete ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      format(day.date, "d")
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
