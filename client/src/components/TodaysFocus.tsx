import { format } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Check, ChevronRight, Clock, Sparkles, Target, Zap, Play, Sun, Sunrise, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HabitResponse } from "@shared/routes";
import type { DailyPlan } from "@shared/schema";

interface TodaysFocusProps {
  habits: HabitResponse[];
}

function getTimeOfDayIcon() {
  const hour = new Date().getHours();
  if (hour < 12) return Sunrise;
  if (hour < 18) return Sun;
  return Moon;
}

export function TodaysFocus({ habits }: TodaysFocusProps) {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const dayName = format(today, "EEEE").toLowerCase();
  const TimeIcon = getTimeOfDayIcon();

  const getScheduledHabits = () => {
    return habits.filter((habit) => {
      if (!habit.schedule?.days || habit.schedule.days.length === 0) {
        return true;
      }
      return habit.schedule.days.includes(dayName);
    });
  };

  const scheduledHabits = getScheduledHabits();
  
  const completedToday = scheduledHabits.filter((h) => {
    const dailyPlans = (h.dailyPlans || []) as DailyPlan[];
    const todayPlan = dailyPlans.find(p => p.date === todayStr);
    return todayPlan?.completed || false;
  });
  
  const remainingHabits = scheduledHabits.filter((h) => {
    const dailyPlans = (h.dailyPlans || []) as DailyPlan[];
    const todayPlan = dailyPlans.find(p => p.date === todayStr);
    return !todayPlan?.completed;
  });
  
  const progress = scheduledHabits.length > 0 
    ? Math.round((completedToday.length / scheduledHabits.length) * 100) 
    : 0;

  const getNextHabit = () => {
    if (remainingHabits.length === 0) return null;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const sortedByTime = remainingHabits
      .filter((h) => h.schedule?.time)
      .map((h) => {
        const [hours, mins] = (h.schedule?.time || "08:00").split(":").map(Number);
        return { habit: h, minutes: hours * 60 + mins };
      })
      .sort((a, b) => Math.abs(a.minutes - currentMinutes) - Math.abs(b.minutes - currentMinutes));

    return sortedByTime[0]?.habit || remainingHabits[0];
  };

  const nextHabit = getNextHabit();

  const getHabitTodayProgress = (habit: HabitResponse) => {
    const dailyPlans = (habit.dailyPlans || []) as DailyPlan[];
    const todayPlan = dailyPlans.find(p => p.date === todayStr);
    if (!todayPlan) return null;
    const completed = todayPlan.tasks.filter(t => t.completed).length;
    const total = todayPlan.tasks.length;
    return { completed, total };
  };

  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              initial={{ rotate: -10 }}
              animate={{ rotate: 0 }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-lg shadow-primary/30"
            >
              <Target className="w-6 h-6" />
            </motion.div>
            <div>
              <CardTitle className="text-xl font-display">Today's Focus</CardTitle>
              <CardDescription className="flex items-center gap-1.5 mt-0.5">
                <TimeIcon className="w-3.5 h-3.5" />
                {format(today, "EEEE, MMMM d")}
              </CardDescription>
            </div>
          </div>
          
          {/* Circular progress indicator */}
          <div className="relative">
            <svg className="w-16 h-16 progress-ring" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-muted/30"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
                className="progress-ring-circle"
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--accent))" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-foreground">{progress}%</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60 dark:bg-black/20">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-muted-foreground font-medium">Daily Progress</span>
              <span className="font-bold text-foreground">{completedToday.length}/{scheduledHabits.length}</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
              />
            </div>
          </div>
        </div>

        {progress === 100 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-4"
            >
              <Sparkles className="w-10 h-10 text-primary" />
            </motion.div>
            <h3 className="font-display text-xl font-bold text-gradient">
              All done for today!
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              Amazing work! You've completed all your habits.
            </p>
          </motion.div>
        ) : nextHabit ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              Up next
            </p>
            <Link href={`/habit/${nextHabit.id}`}>
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="group flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-card border-2 border-transparent hover:border-primary/30 shadow-sm hover:shadow-lg transition-all cursor-pointer"
                data-testid={`focus-habit-${nextHabit.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-display font-bold text-lg truncate">{nextHabit.title}</h4>
                    {!nextHabit.setupComplete && (
                      <Badge variant="outline" className="text-xs bg-primary/10 border-primary/20">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Setup
                      </Badge>
                    )}
                  </div>
                  {nextHabit.schedule?.time && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Scheduled for{" "}
                      {new Date(`2000-01-01T${nextHabit.schedule.time}`).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                  {(() => {
                    const taskProgress = getHabitTodayProgress(nextHabit);
                    if (taskProgress && taskProgress.total > 0) {
                      return (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden max-w-[120px]">
                            <div 
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${(taskProgress.completed / taskProgress.total) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-primary font-medium">
                            {taskProgress.completed}/{taskProgress.total} tasks
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <Button
                    size="sm"
                    className="gap-1.5 rounded-xl shadow-md shadow-primary/20"
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`button-start-focus-${nextHabit.id}`}
                  >
                    <Play className="w-3.5 h-3.5" />
                    Start
                  </Button>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ) : null}

        {remainingHabits.length > 1 && (
          <div className="pt-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {remainingHabits.length - 1} more habit{remainingHabits.length > 2 ? "s" : ""} remaining
            </p>
            <div className="flex flex-wrap gap-2">
              {remainingHabits.slice(1, 4).map((habit) => (
                <Link key={habit.id} href={`/habit/${habit.id}`}>
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary/10 transition-colors px-3 py-1"
                    data-testid={`badge-remaining-${habit.id}`}
                  >
                    {habit.title}
                  </Badge>
                </Link>
              ))}
              {remainingHabits.length > 4 && (
                <Badge variant="outline" className="text-muted-foreground">
                  +{remainingHabits.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
