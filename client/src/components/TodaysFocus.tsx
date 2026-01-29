import { format } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Check, ChevronRight, Clock, Sparkles, Target, Zap, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { HabitResponse } from "@shared/routes";
import type { DailyPlan } from "@shared/schema";

interface TodaysFocusProps {
  habits: HabitResponse[];
}

export function TodaysFocus({ habits }: TodaysFocusProps) {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const dayName = format(today, "EEEE").toLowerCase();

  const getScheduledHabits = () => {
    return habits.filter((habit) => {
      if (!habit.schedule?.days || habit.schedule.days.length === 0) {
        return true;
      }
      return habit.schedule.days.includes(dayName);
    });
  };

  const scheduledHabits = getScheduledHabits();
  
  // Check completion based on daily plans
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

  // Get today's tasks for the next habit
  const getHabitTodayProgress = (habit: HabitResponse) => {
    const dailyPlans = (habit.dailyPlans || []) as DailyPlan[];
    const todayPlan = dailyPlans.find(p => p.date === todayStr);
    if (!todayPlan) return null;
    const completed = todayPlan.tasks.filter(t => t.completed).length;
    const total = todayPlan.tasks.length;
    return { completed, total };
  };

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Today's Focus</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(today, "EEEE, MMMM d")}
              </CardDescription>
            </div>
          </div>
          <Badge variant={progress === 100 ? "default" : "secondary"} className="gap-1">
            {progress === 100 ? <Sparkles className="w-3 h-3" /> : null}
            {completedToday.length}/{scheduledHabits.length} done
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Daily Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {progress === 100 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/50 mb-3">
              <Sparkles className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-display text-lg font-semibold text-green-700 dark:text-green-400">
              All done for today!
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Amazing work! You've completed all your habits.
            </p>
          </motion.div>
        ) : nextHabit ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Up next
            </p>
            <Link href={`/habit/${nextHabit.id}`}>
              <div
                className="group flex items-center justify-between p-4 rounded-xl bg-white dark:bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
                data-testid={`focus-habit-${nextHabit.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate">{nextHabit.title}</h4>
                    {!nextHabit.setupComplete && (
                      <Badge variant="outline" className="text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Setup
                      </Badge>
                    )}
                  </div>
                  {nextHabit.schedule?.time && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
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
                        <p className="text-xs text-primary mt-1">
                          {taskProgress.completed}/{taskProgress.total} tasks completed
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`button-start-focus-${nextHabit.id}`}
                  >
                    <Play className="w-3.5 h-3.5" />
                    Start
                  </Button>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </Link>
          </motion.div>
        ) : null}

        {remainingHabits.length > 1 && (
          <div className="pt-2">
            <p className="text-xs text-muted-foreground mb-2">
              {remainingHabits.length - 1} more habit{remainingHabits.length > 2 ? "s" : ""} remaining today
            </p>
            <div className="flex flex-wrap gap-2">
              {remainingHabits.slice(1, 4).map((habit) => (
                <Link key={habit.id} href={`/habit/${habit.id}`}>
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-muted transition-colors"
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
