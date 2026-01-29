import { Card, CardContent } from "@/components/ui/card";
import { Flame, Target, TrendingUp, Trophy } from "lucide-react";
import { format, subDays } from "date-fns";
import { Link } from "wouter";
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
  const yesterdayCompletions = habitsWithYesterdayPlans.filter(h => getHabitDayComplete(h, yesterdayStr)).length;

  const totalSessions = habits.reduce((sum, h) => 
    sum + ((h.progress || []) as any[]).length, 0
  );

  const longestStreak = Math.max(...habits.map(h => h.longestStreak || 0), 0);

  const stats = [
    {
      icon: Target,
      label: "Today",
      value: `${todayCompletions}/${habitsWithTodayPlans.length || habits.length}`,
      color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30",
      href: "/progress/today",
    },
    {
      icon: TrendingUp,
      label: "Yesterday",
      value: `${yesterdayCompletions}/${habitsWithYesterdayPlans.length || habits.length}`,
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
      href: "/progress/yesterday",
    },
    {
      icon: Trophy,
      label: "Total Done",
      value: totalSessions.toString(),
      color: "text-amber-500 bg-amber-50 dark:bg-amber-950/30",
      href: "/progress/total",
    },
    {
      icon: Flame,
      label: "Best Streak",
      value: `${longestStreak} days`,
      color: "text-orange-500 bg-orange-50 dark:bg-orange-950/30",
      href: "/progress/streak",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, index) => (
        <Link key={index} href={stat.href}>
          <Card className="border-border/50 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer" data-testid={`stat-card-${stat.label.toLowerCase().replace(' ', '-')}`}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="font-display text-lg font-bold text-foreground" data-testid={`stat-${stat.label.toLowerCase().replace(' ', '-')}`}>
                  {stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
