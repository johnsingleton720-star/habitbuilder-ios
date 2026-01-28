import { Card, CardContent } from "@/components/ui/card";
import { Flame, Target, TrendingUp, Trophy } from "lucide-react";
import { format, subDays } from "date-fns";
import type { Habit } from "@shared/schema";

interface ProgressSummaryProps {
  habits: Habit[];
}

export function ProgressSummary({ habits }: ProgressSummaryProps) {
  if (!habits || habits.length === 0) {
    return null;
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  const todayCompletions = habits.filter(h => 
    (h.completedDates || []).includes(today)
  ).length;

  const yesterdayCompletions = habits.filter(h => 
    (h.completedDates || []).includes(yesterday)
  ).length;

  const totalCompletions = habits.reduce((sum, h) => 
    sum + (h.completedDates || []).length, 0
  );

  const longestStreak = Math.max(...habits.map(h => 
    (h.completedDates || []).length
  ), 0);

  const stats = [
    {
      icon: Target,
      label: "Today",
      value: `${todayCompletions}/${habits.length}`,
      color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30",
    },
    {
      icon: TrendingUp,
      label: "Yesterday",
      value: `${yesterdayCompletions}/${habits.length}`,
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      icon: Trophy,
      label: "Total Done",
      value: totalCompletions.toString(),
      color: "text-amber-500 bg-amber-50 dark:bg-amber-950/30",
    },
    {
      icon: Flame,
      label: "Best Streak",
      value: `${longestStreak} days`,
      color: "text-orange-500 bg-orange-50 dark:bg-orange-950/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, index) => (
        <Card key={index} className="border-border/50">
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
      ))}
    </div>
  );
}
