import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Target, TrendingUp, Trophy, Calendar, Clock, Check, ChevronRight, X } from "lucide-react";
import { format, subDays, startOfWeek, addDays } from "date-fns";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import type { Habit, DailyPlan } from "@shared/schema";

interface ProgressSummaryProps {
  habits: Habit[];
}

export function ProgressSummary({ habits }: ProgressSummaryProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  if (!habits || habits.length === 0) {
    return null;
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");

  const getHabitDayComplete = (habit: Habit, dateStr: string) => {
    const dailyPlans = (habit.dailyPlans || []) as DailyPlan[];
    const plan = dailyPlans.find(p => p.date === dateStr);
    if (!plan || plan.tasks.length === 0) return false;
    const activeTasks = plan.tasks.filter(t => !t.skipped);
    if (activeTasks.length === 0) return false;
    return plan.completed || activeTasks.every(t => t.completed);
  };

  const todayDayName = format(new Date(), "EEEE").toLowerCase();
  const habitsScheduledToday = habits.filter(h => {
    const scheduleDays = h.schedule?.days as string[] | undefined;
    if (scheduleDays && scheduleDays.length > 0) {
      return scheduleDays.includes(todayDayName);
    }
    const dailyPlans = (h.dailyPlans || []) as DailyPlan[];
    return dailyPlans.some(p => p.date === todayStr && p.tasks.length > 0);
  });

  const todayCompletions = habitsScheduledToday.filter(h => getHabitDayComplete(h, todayStr)).length;
  const todayTotal = habitsScheduledToday.length;
  const todayPercent = todayTotal > 0 ? Math.round((todayCompletions / todayTotal) * 100) : 0;

  const totalSessions = habits.reduce((sum, h) => 
    sum + ((h.progress || []) as any[]).length, 0
  );

  const longestStreak = Math.max(...habits.map(h => h.longestStreak || 0), 0);

  const isHabitScheduledForDate = (habit: Habit, dateStr: string) => {
    const scheduleDays = habit.schedule?.days as string[] | undefined;
    const hasSchedule = scheduleDays && scheduleDays.length > 0;
    const dayName = format(new Date(dateStr + "T12:00:00"), "EEEE").toLowerCase();
    if (hasSchedule) {
      return scheduleDays.includes(dayName);
    }
    const dailyPlans = (habit.dailyPlans || []) as DailyPlan[];
    return dailyPlans.some(p => p.date === dateStr && p.tasks.length > 0);
  };

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const dateStr = format(date, "yyyy-MM-dd");
    const scheduledHabitsForDay = habits.filter(h => isHabitScheduledForDate(h, dateStr));
    const completedCount = scheduledHabitsForDay.filter(h => getHabitDayComplete(h, dateStr)).length;
    const totalCount = scheduledHabitsForDay.length;
    return {
      date,
      dateStr,
      dayLetter: format(date, "EEEEE"),
      isToday: dateStr === todayStr,
      completed: completedCount,
      total: totalCount,
      allComplete: totalCount > 0 && completedCount === totalCount,
    };
  });

  const getHabitsForDate = (dateStr: string) => {
    return habits
      .filter(habit => isHabitScheduledForDate(habit, dateStr))
      .map(habit => {
        const dailyPlans = (habit.dailyPlans || []) as DailyPlan[];
        const plan = dailyPlans.find(p => p.date === dateStr);
        const isComplete = getHabitDayComplete(habit, dateStr);
        const hasTasks = plan && plan.tasks.length > 0;
        return {
          habit,
          plan,
          isComplete,
          isScheduled: true,
          hasTasks,
          completedTasks: plan ? plan.tasks.filter(t => t.completed).length : 0,
          skippedTasks: plan ? plan.tasks.filter(t => t.skipped).length : 0,
          totalTasks: plan ? plan.tasks.filter(t => !t.skipped).length : 0,
        };
      });
  };

  const selectedDateHabits = selectedDate ? getHabitsForDate(selectedDate) : [];

  const stats = [
    {
      icon: Target,
      label: "Today",
      value: todayPercent,
      suffix: "%",
      subtext: `${todayCompletions}/${todayTotal} habits`,
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50 dark:bg-blue-900/50",
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
      bgColor: "bg-amber-50 dark:bg-amber-900/50",
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
      bgColor: "bg-orange-50 dark:bg-orange-900/50",
      iconColor: "text-orange-500",
      href: "/progress/streak",
    },
  ];

  return (
    <div className="space-y-4">
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
              {weekDays.map((day, i) => {
                const isSelected = selectedDate === day.dateStr;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(isSelected ? null : day.dateStr)}
                    className={`flex flex-col items-center gap-1.5 flex-1 py-2 px-1 rounded-xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary/15 ring-2 ring-primary/50'
                        : day.isToday 
                          ? 'bg-primary/10 ring-2 ring-primary/30' 
                          : 'hover:bg-muted/50'
                    }`}
                    data-testid={`calendar-day-${day.dateStr}`}
                  >
                    <span className={`text-xs font-medium ${day.isToday || isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
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
                  </button>
                );
              })}
            </div>

            <AnimatePresence>
              {selectedDate && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-foreground">
                        {format(new Date(selectedDate + "T12:00:00"), "EEEE, MMM d")}
                      </span>
                      <button
                        onClick={() => setSelectedDate(null)}
                        className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                        data-testid="button-close-day-view"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {selectedDateHabits.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-3 text-center">No habits scheduled for this day</p>
                    ) : (
                      <div className="space-y-1.5">
                        {selectedDateHabits.map(({ habit, plan, isComplete, hasTasks, completedTasks, skippedTasks, totalTasks }) => (
                          <Link key={habit.id} href={`/habit/${habit.id}`}>
                            <div
                              className={`flex items-center gap-3 p-2.5 rounded-lg transition-all cursor-pointer ${
                                isComplete 
                                  ? 'bg-primary/5 border border-primary/10' 
                                  : 'hover:bg-muted/50'
                              }`}
                              data-testid={`day-view-habit-${habit.id}`}
                            >
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isComplete 
                                  ? 'bg-primary text-white' 
                                  : 'bg-muted/50 border border-border'
                              }`}>
                                {isComplete ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className={`text-sm font-medium truncate block ${
                                  isComplete ? 'text-muted-foreground line-through' : 'text-foreground'
                                }`}>
                                  {habit.title}
                                </span>
                                {hasTasks && totalTasks > 0 && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex-1 h-1 rounded-full bg-muted/50 overflow-hidden max-w-[80px]">
                                      <div
                                        className={`h-full rounded-full ${isComplete ? 'bg-primary' : 'bg-amber-500'}`}
                                        style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">
                                      {completedTasks}/{totalTasks} tasks
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {habit.schedule?.time && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(`2000-01-01T${habit.schedule.time}`).toLocaleTimeString([], {
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                )}
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
