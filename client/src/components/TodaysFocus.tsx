import { useState } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Check, CheckCircle2, ChevronDown, ChevronRight, Clock, Link2, Sparkles, Target, Zap, Play, Sun, Sunrise, Moon, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HabitResponse } from "@shared/routes";
import type { DailyPlan, HabitStack } from "@shared/schema";
import { UnifiedRoutineSession } from "./UnifiedRoutineSession";

interface TodaysFocusProps {
  habits: HabitResponse[];
  stacks?: HabitStack[];
}

const categoryColors: Record<string, { accent: string; bg: string; border: string; progress: string }> = {
  health: { accent: "text-emerald-500", bg: "from-emerald-500/5 to-green-500/5", border: "border-emerald-200/40 dark:border-emerald-800/40", progress: "bg-emerald-500" },
  fitness: { accent: "text-orange-500", bg: "from-orange-500/5 to-amber-500/5", border: "border-orange-200/40 dark:border-orange-800/40", progress: "bg-orange-500" },
  mindfulness: { accent: "text-violet-500", bg: "from-violet-500/5 to-purple-500/5", border: "border-violet-200/40 dark:border-violet-800/40", progress: "bg-violet-500" },
  productivity: { accent: "text-blue-500", bg: "from-blue-500/5 to-cyan-500/5", border: "border-blue-200/40 dark:border-blue-800/40", progress: "bg-blue-500" },
  learning: { accent: "text-indigo-500", bg: "from-indigo-500/5 to-blue-500/5", border: "border-indigo-200/40 dark:border-indigo-800/40", progress: "bg-indigo-500" },
  creativity: { accent: "text-pink-500", bg: "from-pink-500/5 to-rose-500/5", border: "border-pink-200/40 dark:border-pink-800/40", progress: "bg-pink-500" },
  social: { accent: "text-amber-500", bg: "from-amber-500/5 to-yellow-500/5", border: "border-amber-200/40 dark:border-amber-800/40", progress: "bg-amber-500" },
  finance: { accent: "text-teal-500", bg: "from-teal-500/5 to-emerald-500/5", border: "border-teal-200/40 dark:border-teal-800/40", progress: "bg-teal-500" },
};
const defaultColor = { accent: "text-primary", bg: "from-primary/5 to-accent/5", border: "border-gray-100 dark:border-gray-800", progress: "bg-primary" };

function getHabitColor(habit: HabitResponse) {
  const cat = (habit.category || "").toLowerCase();
  return categoryColors[cat] || defaultColor;
}

function getTimeOfDayIcon() {
  const hour = new Date().getHours();
  if (hour < 12) return Sunrise;
  if (hour < 18) return Sun;
  return Moon;
}

export function TodaysFocus({ habits, stacks }: TodaysFocusProps) {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const dayName = format(today, "EEEE").toLowerCase();
  const TimeIcon = getTimeOfDayIcon();
  const [isExpanded, setIsExpanded] = useState(false);
  const [routineSessionStack, setRoutineSessionStack] = useState<HabitStack | null>(null);

  const getScheduledHabits = () => {
    return habits.filter((habit) => {
      const scheduleDays = habit.schedule?.days as string[] | undefined;
      if (scheduleDays && scheduleDays.length > 0) {
        return scheduleDays.includes(dayName);
      }
      const dailyPlans = (habit.dailyPlans || []) as DailyPlan[];
      return dailyPlans.some(p => p.date === todayStr && p.tasks.length > 0) || !habit.setupComplete;
    });
  };

  const sortByScheduleTime = (a: HabitResponse, b: HabitResponse) => {
    const timeA = a.schedule?.time;
    const timeB = b.schedule?.time;
    if (timeA && timeB) return timeA.localeCompare(timeB);
    if (timeA) return -1;
    if (timeB) return 1;
    return 0;
  };

  const scheduledHabits = getScheduledHabits().sort(sortByScheduleTime);
  
  const isHabitCompleted = (h: HabitResponse) => {
    const dailyPlans = (h.dailyPlans || []) as DailyPlan[];
    const todayPlan = dailyPlans.find(p => p.date === todayStr);
    if (!todayPlan) return false;
    if (todayPlan.completed) return true;
    if (todayPlan.tasks && todayPlan.tasks.length > 0) {
      const activeTasks = todayPlan.tasks.filter(t => !t.skipped);
      return activeTasks.length > 0 && activeTasks.every(t => t.completed);
    }
    return false;
  };

  const completedToday = scheduledHabits.filter(isHabitCompleted);
  const remainingHabits = scheduledHabits.filter(h => !isHabitCompleted(h));
  
  const progress = scheduledHabits.length > 0 
    ? Math.round((completedToday.length / scheduledHabits.length) * 100) 
    : 0;

  const getNextHabit = () => {
    if (remainingHabits.length === 0) return null;

    const stackNext = completedToday.find(h => h.linkedHabitId && remainingHabits.some(r => r.id === h.linkedHabitId));
    if (stackNext) {
      return remainingHabits.find(r => r.id === stackNext.linkedHabitId) || null;
    }
    
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

  const isStackedNext = (() => {
    if (!nextHabit) return false;
    return completedToday.some(h => h.linkedHabitId === nextHabit.id);
  })();

  const stackParent = isStackedNext
    ? completedToday.find(h => h.linkedHabitId === nextHabit?.id)
    : null;

  const getHabitTodayProgress = (habit: HabitResponse) => {
    const dailyPlans = (habit.dailyPlans || []) as DailyPlan[];
    const todayPlan = dailyPlans.find(p => p.date === todayStr);
    if (!todayPlan) return null;
    const completed = todayPlan.tasks.filter(t => t.completed).length;
    const skipped = todayPlan.tasks.filter(t => t.skipped).length;
    const total = todayPlan.tasks.length - skipped;
    return { completed, total, skipped };
  };

  const otherRemaining = remainingHabits.filter(h => h.id !== nextHabit?.id);

  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/15 via-primary/10 to-accent/15 dark:from-primary/25 dark:via-primary/15 dark:to-accent/20 shadow-lg dark:border dark:border-primary/20">
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
              <CardTitle className="text-xl font-display text-foreground">Today's Focus</CardTitle>
              <CardDescription className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
                <TimeIcon className="w-3.5 h-3.5" />
                {format(today, "EEEE, MMMM d")}
              </CardDescription>
            </div>
          </div>
          
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
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/80 dark:bg-black/40 backdrop-blur-sm">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-gray-600 dark:text-gray-300 font-medium">Daily Progress</span>
              <span className="font-bold text-gray-900 dark:text-white">{completedToday.length}/{scheduledHabits.length}</span>
            </div>
            <div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
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
            className="text-center py-6"
          >
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-3"
            >
              <Sparkles className="w-8 h-8 text-primary" />
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
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-1.5">
              {isStackedNext ? (
                <>
                  <Link2 className="w-4 h-4 text-primary" />
                  Next in stack
                  {stackParent && (
                    <span className="font-normal text-muted-foreground">
                      (after {stackParent.title})
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-500" />
                  Up next
                </>
              )}
            </p>
            <Link href={`/habit/${nextHabit.id}`}>
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={cn(
                  "group flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r shadow-sm hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary/30",
                  getHabitColor(nextHabit).bg,
                  getHabitColor(nextHabit).border
                )}
                data-testid={`focus-habit-${nextHabit.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-display font-bold text-lg truncate text-gray-900 dark:text-white">{nextHabit.title}</h4>
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
                              className={cn("h-full rounded-full", getHabitColor(nextHabit).progress)}
                              style={{ width: `${(taskProgress.completed / taskProgress.total) * 100}%` }}
                            />
                          </div>
                          <span className={cn("text-xs font-medium", getHabitColor(nextHabit).accent)}>
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

        {/* Unified routine stacks */}
        {stacks && stacks.filter(s => (s as any).planMode === "unified" && (s as any).unifiedPlan).length > 0 && (
          <div className="space-y-2">
            {stacks.filter(s => (s as any).planMode === "unified" && (s as any).unifiedPlan).map((stack) => {
              const uPlan = (stack as any).unifiedPlan;
              const taskCount = uPlan?.tasks?.length || 0;
              const isRoutineCompleted = (stack as any).lastRoutineCompletedDate === todayStr;
              return (
                <motion.div
                  key={`stack-${stack.id}`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={cn(
                    "group flex items-center justify-between p-4 rounded-2xl shadow-sm transition-all cursor-pointer",
                    isRoutineCompleted
                      ? "bg-primary/5 dark:bg-primary/10 border-2 border-primary/30 dark:border-primary/40 opacity-75"
                      : "bg-white dark:bg-gray-900/80 border-2 border-primary/20 dark:border-primary/30 hover:shadow-lg"
                  )}
                  data-testid={`focus-stack-${stack.id}`}
                  onClick={() => setRoutineSessionStack(stack)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isRoutineCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <Layers className="w-4 h-4 text-primary shrink-0" />
                      )}
                      <h4 className={cn(
                        "font-display font-bold text-base truncate",
                        isRoutineCompleted
                          ? "line-through text-muted-foreground"
                          : "text-gray-900 dark:text-white"
                      )}>{stack.name}</h4>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {isRoutineCompleted ? "Done" : "Routine"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {stack.scheduledTime && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(`2000-01-01T${stack.scheduledTime}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {taskCount} tasks
                      </span>
                      {uPlan.totalDuration && (
                        <span className="text-xs text-muted-foreground">
                          ~{uPlan.totalDuration}m
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {isRoutineCompleted ? (
                      <span className="text-xs font-medium text-primary px-3">Completed</span>
                    ) : (
                      <Button
                        size="sm"
                        className="gap-1.5 rounded-xl shadow-md shadow-primary/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRoutineSessionStack(stack);
                        }}
                        data-testid={`button-start-routine-${stack.id}`}
                      >
                        <Play className="w-3.5 h-3.5" />
                        Start
                      </Button>
                    )}
                    <Link href={`/stack/${stack.id}`} onClick={(e: any) => e.stopPropagation()}>
                      <ChevronRight className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Collapsible remaining habits */}
        {otherRemaining.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 w-full text-left p-2 rounded-lg hover:bg-white/30 dark:hover:bg-black/20 transition-colors"
              data-testid="button-toggle-remaining-habits"
            >
              <ChevronDown className={cn(
                "w-4 h-4 text-muted-foreground transition-transform",
                isExpanded ? "rotate-0" : "-rotate-90"
              )} />
              <span className="text-xs font-medium text-muted-foreground">
                {otherRemaining.length} more habit{otherRemaining.length > 1 ? "s" : ""} remaining
              </span>
            </button>
            
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1.5 pt-1">
                    {otherRemaining.map((habit) => {
                      const taskProgress = getHabitTodayProgress(habit);
                      const pct = taskProgress && taskProgress.total > 0 ? Math.round((taskProgress.completed / taskProgress.total) * 100) : 0;
                      const isInStack = habits.some(h => h.linkedHabitId === habit.id) || !!habit.linkedHabitId;
                      return (
                        <Link key={habit.id} href={`/habit/${habit.id}`}>
                          <div
                            className={cn(
                              "group flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r border hover:border-primary/30 transition-all cursor-pointer",
                              getHabitColor(habit).bg,
                              getHabitColor(habit).border
                            )}
                            data-testid={`remaining-habit-${habit.id}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {isInStack && <Link2 className="w-3 h-3 text-primary flex-shrink-0" />}
                                <span className="font-medium text-sm truncate text-gray-900 dark:text-white">{habit.title}</span>
                                {!habit.setupComplete && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">Setup</Badge>
                                )}
                              </div>
                              {taskProgress && taskProgress.total > 0 && (
                                <div className="flex items-center gap-2 mt-1.5">
                                  <div className="flex-1 h-1 rounded-full bg-muted/50 overflow-hidden max-w-[100px]">
                                    <div
                                      className={cn("h-full rounded-full", pct > 0 ? getHabitColor(habit).progress : "bg-muted")}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground font-medium">
                                    {taskProgress.completed}/{taskProgress.total}
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
                              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Completed habits - also collapsible */}
        {completedToday.length > 0 && remainingHabits.length > 0 && (
          <div className="pt-2 space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-primary" />
              {completedToday.length} completed today
            </p>
            <div className="space-y-1">
              {completedToday.map((habit) => (
                <Link key={habit.id} href={`/habit/${habit.id}`}>
                  <div
                    className="group flex items-center gap-3 p-2.5 rounded-xl bg-primary/5 border border-primary/10 cursor-pointer hover:border-primary/30 transition-all"
                    data-testid={`completed-habit-${habit.id}`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm text-muted-foreground line-through truncate flex-1">{habit.title}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {routineSessionStack && (
        <UnifiedRoutineSession
          stack={routineSessionStack}
          open={!!routineSessionStack}
          onOpenChange={(open) => {
            if (!open) setRoutineSessionStack(null);
          }}
        />
      )}
    </Card>
  );
}
