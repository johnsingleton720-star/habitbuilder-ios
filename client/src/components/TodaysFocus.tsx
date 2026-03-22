import { useState } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Check, CheckCircle2, ChevronDown, ChevronRight, Clock, Sparkles, Target, Zap, Play, Sun, Sunrise, Moon, Layers, Star, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HabitResponse } from "@shared/routes";
import type { DailyPlan, HabitStack } from "@shared/schema";
import { UnifiedRoutineSession } from "./UnifiedRoutineSession";
import { getEmojiForIcon } from "./IconColorPicker";

function HabitIcon({ habit, size = "sm" }: { habit: HabitResponse; size?: "sm" | "md" }) {
  const iconColor = habit.customColor?.startsWith('#') ? habit.customColor : undefined;
  const iconBg = iconColor ? `${iconColor}20` : undefined;
  const emoji = getEmojiForIcon(habit.customIcon);
  const sizeClass = size === "md" ? "w-9 h-9 rounded-xl" : "w-7 h-7 rounded-lg";
  const emojiSize = size === "md" ? "text-lg" : "text-sm";
  return (
    <div
      className={`${sizeClass} flex items-center justify-center flex-shrink-0`}
      style={{ backgroundColor: iconBg || 'hsl(var(--primary) / 0.1)' }}
    >
      <span className={`${emojiSize} leading-none`}>{emoji}</span>
    </div>
  );
}

interface TodaysFocusProps {
  habits: HabitResponse[];
  stacks?: HabitStack[];
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

  const isPlanExpired = (habit: HabitResponse) => {
    if (habit.trackingMode === "simple") return false;
    if (!habit.setupComplete) return false;
    const dailyPlans = (habit.dailyPlans || []) as DailyPlan[];
    const endDate = habit.planEndDate || (dailyPlans.length > 0 ? dailyPlans[dailyPlans.length - 1].date : null);
    if (endDate && endDate < todayStr) return true;
    return false;
  };

  const getScheduledHabits = () => {
    return habits.filter((habit) => {
      if (isPlanExpired(habit)) return false;
      const scheduleDays = habit.schedule?.days as string[] | undefined;
      if (scheduleDays && scheduleDays.length > 0) {
        return scheduleDays.includes(dayName);
      }
      if (habit.trackingMode === "simple") return true;
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

  const unifiedStacks = stacks?.filter(s => (s as any).planMode === "unified" && (s as any).unifiedPlan) || [];

  return (
    <>
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden" data-testid="card-todays-focus">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-foreground">Daily Focus</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <TimeIcon className="w-3 h-3" />
                {format(today, "EEEE, MMMM d")}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-primary">{progress}%</p>
            <p className="text-[11px] text-muted-foreground">{completedToday.length}/{scheduledHabits.length} done</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 py-2.5 border-b border-border/30">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-3.5">
          {progress === 100 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2"
              >
                <Sparkles className="w-6 h-6 text-primary" />
              </motion.div>
              <h3 className="font-display text-lg font-bold text-foreground">All done for today!</h3>
              <p className="text-[12px] text-muted-foreground mt-1">Amazing work!</p>
            </motion.div>
          ) : nextHabit ? (
            <div>
              <p className="text-[11px] font-bold text-amber-500 flex items-center gap-1 mb-2">
                {isStackedNext ? (
                  <>
                    <Link2 className="w-3.5 h-3.5 text-primary" />
                    <span className="text-primary">Next in stack</span>
                    {stackParent && (
                      <span className="font-normal text-muted-foreground ml-1">(after {stackParent.title})</span>
                    )}
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />Up next
                  </>
                )}
              </p>
              <Link href={`/habit/${nextHabit.id}?date=${format(new Date(), "yyyy-MM-dd")}`}>
                <div
                  className="bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/15 p-3.5 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-all"
                  data-testid={`focus-habit-${nextHabit.id}`}
                >
                  <HabitIcon habit={nextHabit} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-bold text-foreground truncate">{nextHabit.title}</p>
                      {!nextHabit.setupComplete && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 border-primary/20">
                          <Sparkles className="w-2.5 h-2.5 mr-0.5" />Setup
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {nextHabit.schedule?.time && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {new Date(`2000-01-01T${nextHabit.schedule.time}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </span>
                      )}
                      {(() => {
                        const taskProgress = getHabitTodayProgress(nextHabit);
                        if (taskProgress && taskProgress.total > 0) {
                          return (
                            <span className="text-[11px] text-muted-foreground">
                              · {taskProgress.completed}/{taskProgress.total} tasks
                            </span>
                          );
                        }
                        if (nextHabit.trackingMode === "simple") {
                          return <span className="text-[11px] text-muted-foreground">Simple</span>;
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="gap-1.5 rounded-xl shadow-sm text-[12px] font-bold px-3.5 py-2 h-auto"
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`button-start-focus-${nextHabit.id}`}
                  >
                    <Play className="w-3 h-3" fill="currentColor" />Start
                  </Button>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </Link>

              {/* Other remaining - compact 2-col grid */}
              {otherRemaining.length > 0 && otherRemaining.length <= 4 && (
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  {otherRemaining.map((habit) => (
                    <Link key={habit.id} href={`/habit/${habit.id}?date=${format(new Date(), "yyyy-MM-dd")}`}>
                      <div className="bg-muted/40 rounded-xl border border-border/50 p-2.5 flex items-center gap-2 cursor-pointer hover:bg-muted/60 transition-colors" data-testid={`remaining-habit-${habit.id}`}>
                        <HabitIcon habit={habit} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-foreground truncate">{habit.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {habit.schedule?.time
                              ? new Date(`2000-01-01T${habit.schedule.time}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                              : habit.trackingMode === "simple" ? "Simple" : (() => {
                                  const tp = getHabitTodayProgress(habit);
                                  return tp ? `${tp.completed}/${tp.total}` : "";
                                })()
                            }
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* If more than 4 remaining, show collapsible list */}
              {otherRemaining.length > 4 && (
                <div className="mt-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    {(isExpanded ? otherRemaining : otherRemaining.slice(0, 4)).map((habit) => (
                      <Link key={habit.id} href={`/habit/${habit.id}?date=${format(new Date(), "yyyy-MM-dd")}`}>
                        <div className="bg-muted/40 rounded-xl border border-border/50 p-2.5 flex items-center gap-2 cursor-pointer hover:bg-muted/60 transition-colors" data-testid={`remaining-habit-${habit.id}`}>
                          <HabitIcon habit={habit} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-foreground truncate">{habit.title}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {habit.schedule?.time
                                ? new Date(`2000-01-01T${habit.schedule.time}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                                : habit.trackingMode === "simple" ? "Simple" : (() => {
                                    const tp = getHabitTodayProgress(habit);
                                    return tp ? `${tp.completed}/${tp.total}` : "";
                                  })()
                              }
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {!isExpanded && (
                    <button
                      onClick={() => setIsExpanded(true)}
                      className="flex items-center gap-1.5 w-full justify-center mt-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors py-1"
                      data-testid="button-toggle-remaining-habits"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                      {otherRemaining.length - 4} more habits
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {/* Unified routine stacks */}
          {unifiedStacks.length > 0 && (
            <div className={cn("space-y-2", nextHabit && "mt-3 pt-3 border-t border-border/30")}>
              {unifiedStacks.map((stack) => {
                const uPlan = (stack as any).unifiedPlan;
                const taskCount = uPlan?.tasks?.length || 0;
                const isRoutineCompleted = (stack as any).lastRoutineCompletedDate === todayStr;
                return (
                  <div
                    key={`stack-${stack.id}`}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                      isRoutineCompleted
                        ? "bg-muted/30 border-border/30 opacity-70"
                        : "bg-card border-border/50 hover:border-primary/30"
                    )}
                    data-testid={`focus-stack-${stack.id}`}
                    onClick={() => setRoutineSessionStack(stack)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isRoutineCompleted ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        ) : (
                          <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                        <span className={cn(
                          "text-[13px] font-bold truncate",
                          isRoutineCompleted ? "line-through text-muted-foreground" : "text-foreground"
                        )}>{stack.name}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                          {isRoutineCompleted ? "Done" : "Routine"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2.5 mt-0.5 text-[11px] text-muted-foreground">
                        {stack.scheduledTime && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(`2000-01-01T${stack.scheduledTime}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </span>
                        )}
                        <span>{taskCount} tasks</span>
                        {uPlan.totalDuration && <span>~{uPlan.totalDuration}m</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {isRoutineCompleted ? (
                        <span className="text-[11px] font-semibold text-primary">Completed</span>
                      ) : (
                        <Button
                          size="sm"
                          className="gap-1.5 rounded-xl text-[12px] font-bold px-3 py-1.5 h-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRoutineSessionStack(stack);
                          }}
                          data-testid={`button-start-routine-${stack.id}`}
                        >
                          <Play className="w-3 h-3" fill="currentColor" />Start
                        </Button>
                      )}
                      <Link href={`/stack/${stack.id}`} onClick={(e: any) => e.stopPropagation()}>
                        <ChevronRight className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Completed habits summary */}
          {completedToday.length > 0 && remainingHabits.length > 0 && (
            <div className={cn("pt-2.5 mt-2.5 border-t border-border/30")}>
              <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1.5">
                <CheckCircle2 className="w-3 h-3 text-primary" />
                {completedToday.length} completed today
              </p>
              <div className="space-y-1">
                {completedToday.map((habit) => (
                  <Link key={habit.id} href={`/habit/${habit.id}?date=${format(new Date(), "yyyy-MM-dd")}`}>
                    <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer" data-testid={`completed-habit-${habit.id}`}>
                      <HabitIcon habit={habit} />
                      <span className="text-[12px] text-muted-foreground line-through truncate flex-1">{habit.title}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {routineSessionStack && (
        <UnifiedRoutineSession
          stack={routineSessionStack}
          open={!!routineSessionStack}
          onOpenChange={(open) => {
            if (!open) setRoutineSessionStack(null);
          }}
        />
      )}
    </>
  );
}
