import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, Check, Timer, Play, Pause, Plus, Clock, Target, PartyPopper, ChevronRight, Lightbulb, Loader2, Brain, AlertCircle, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { HabitStack, UnifiedPlanTask } from "@shared/schema";

interface UnifiedRoutineSessionProps {
  stack: HabitStack;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Phase = "checklist" | "tasks" | "complete";

interface ChecklistItem {
  id: number;
  text: string;
  checked: boolean;
}

interface TaskNote {
  taskId: string;
  task: string;
  note: string;
  timeSpent: number;
  habitId: number;
  habitTitle: string;
}

interface SessionSummary {
  summary: string;
  insights: string[];
  encouragement: string;
  performanceTips?: string[];
  nextSteps?: string[];
}

const ROUTINE_CHECKLIST: ChecklistItem[] = [
  { id: 1, text: "I'm ready to start my full routine", checked: false },
  { id: 2, text: "I've set aside enough time", checked: false },
  { id: 3, text: "I'm focused and motivated", checked: false },
];

const HABIT_COLORS = [
  "bg-emerald-500",
  "bg-blue-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-yellow-500",
  "bg-red-500",
];

function getHabitColor(habitId: number, habitIds: number[]): string {
  const index = habitIds.indexOf(habitId);
  return HABIT_COLORS[index % HABIT_COLORS.length];
}

export function UnifiedRoutineSession({ stack, open, onOpenChange }: UnifiedRoutineSessionProps) {
  const [phase, setPhase] = useState<Phase>("checklist");
  const [checklist, setChecklist] = useState(ROUTINE_CHECKLIST);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [taskNotes, setTaskNotes] = useState("");
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [skippedTasks, setSkippedTasks] = useState<string[]>([]);
  const [allTaskNotes, setAllTaskNotes] = useState<TaskNote[]>([]);
  const [sessionStartTime] = useState<Date>(new Date());

  const [taskTimerRunning, setTaskTimerRunning] = useState(false);
  const [taskTimeElapsed, setTaskTimeElapsed] = useState(0);
  const [taskTimerStartTime, setTaskTimerStartTime] = useState<Date | null>(null);

  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [showEndEarlyConfirm, setShowEndEarlyConfirm] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queryClient = useQueryClient();

  const unifiedPlan = (stack as any)?.unifiedPlan;
  const tasks: UnifiedPlanTask[] = unifiedPlan?.tasks || [];
  const currentTask = tasks[currentTaskIndex];
  const today = format(new Date(), "yyyy-MM-dd");

  const uniqueHabitIds = [...new Set(tasks.map(t => t.habitId))];

  const completeRoutineMutation = useMutation({
    mutationFn: async ({ finalNotes, finalCompletedCount }: { finalNotes: TaskNote[]; finalCompletedCount: number }) => {
      const totalTimeSpent = finalNotes.reduce((sum, n) => sum + n.timeSpent, 0);
      const timeInMinutes = Math.max(1, Math.round(totalTimeSpent / 60));

      const res = await apiRequest("POST", `/api/habit-stacks/${stack.id}/routine-complete`, {
        date: today,
        tasksCompleted: finalCompletedCount,
        totalTasks: tasks.length,
        timeSpent: timeInMinutes,
        taskBreakdown: finalNotes.map(n => ({
          habitId: n.habitId,
          habitTitle: n.habitTitle,
          taskId: n.taskId,
          task: n.task,
          note: n.note,
          timeSpent: n.timeSpent,
          completed: !skippedTasks.includes(n.taskId),
        })),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habit-stacks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habit-stacks", stack.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/achievements"] });
    },
  });

  const generateSummaryMutation = useMutation({
    mutationFn: async ({ finalNotes, finalCompletedCount }: { finalNotes: TaskNote[]; finalCompletedCount: number }) => {
      const totalTimeSpent = finalNotes.reduce((sum, n) => sum + n.timeSpent, 0);
      const timeInMinutes = Math.max(1, Math.round(totalTimeSpent / 60));

      const notesForSummary = finalNotes
        .filter(n => n.note.trim())
        .map(n => ({ task: n.task, note: n.note, habit: n.habitTitle }));

      const res = await apiRequest("POST", `/api/habit-stacks/${stack.id}/routine-summary`, {
        stackName: stack.name,
        tasksCompleted: finalCompletedCount,
        totalTasks: tasks.length,
        timeSpent: timeInMinutes,
        notes: notesForSummary,
        habits: uniqueHabitIds.map(id => {
          const t = tasks.find(t => t.habitId === id);
          return t?.habitTitle || "Habit";
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setSessionSummary(data);
    },
  });

  useEffect(() => {
    if (open) {
      setPhase("checklist");
      setChecklist(ROUTINE_CHECKLIST.map(c => ({ ...c, checked: false })));
      setCurrentTaskIndex(0);
      setCompletedTasks([]);
      setSkippedTasks([]);
      setAllTaskNotes([]);
      setTaskNotes("");
      setTaskTimerRunning(false);
      setTaskTimeElapsed(0);
      setTaskTimerStartTime(null);
      setSessionSummary(null);
      setShowEndEarlyConfirm(false);
    }
  }, [open]);

  useEffect(() => {
    setTaskTimeElapsed(0);
    setTaskTimerRunning(false);
    setTaskTimerStartTime(null);
  }, [currentTaskIndex]);

  useEffect(() => {
    if (!taskTimerRunning) return;
    const interval = setInterval(() => {
      if (taskTimerStartTime) {
        const elapsed = Math.round((new Date().getTime() - taskTimerStartTime.getTime()) / 1000);
        setTaskTimeElapsed(elapsed);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [taskTimerRunning, taskTimerStartTime]);

  const toggleChecklistItem = (id: number) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const allChecklistDone = checklist.every(item => item.checked);

  const startSession = () => {
    if (tasks.length > 0) {
      setPhase("tasks");
    } else {
      finishSession([], 0);
    }
  };

  const handleTaskTimerToggle = () => {
    if (taskTimerRunning) {
      setTaskTimerRunning(false);
    } else {
      setTaskTimerStartTime(new Date(Date.now() - taskTimeElapsed * 1000));
      setTaskTimerRunning(true);
    }
  };

  const handleAddTime = (seconds: number) => {
    setTaskTimeElapsed(prev => prev + seconds);
    if (taskTimerStartTime) {
      setTaskTimerStartTime(new Date(taskTimerStartTime.getTime() - seconds * 1000));
    }
  };

  const handleCompleteTask = () => {
    if (!currentTask) return;
    setTaskTimerRunning(false);

    const currentTaskNote: TaskNote = {
      taskId: currentTask.id,
      task: currentTask.title,
      note: taskNotes,
      timeSpent: taskTimeElapsed,
      habitId: currentTask.habitId,
      habitTitle: currentTask.habitTitle,
    };

    setAllTaskNotes(prev => [...prev, currentTaskNote]);
    const newCompletedCount = completedTasks.length + 1;
    setCompletedTasks(prev => [...prev, currentTask.id]);
    setTaskNotes("");

    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }

    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
    } else {
      const finalNotes = [...allTaskNotes, currentTaskNote];
      finishSession(finalNotes, newCompletedCount);
    }
  };

  const handleSkipTask = () => {
    let currentTaskNote: TaskNote | null = null;
    if (currentTask) {
      currentTaskNote = {
        taskId: currentTask.id,
        task: currentTask.title,
        note: taskNotes,
        timeSpent: taskTimeElapsed,
        habitId: currentTask.habitId,
        habitTitle: currentTask.habitTitle,
      };
      if (taskTimeElapsed > 0 || taskNotes.trim()) {
        setAllTaskNotes(prev => [...prev, currentTaskNote!]);
      }
      setSkippedTasks(prev => [...prev, currentTask.id]);
    }

    setTaskTimerRunning(false);
    setTaskNotes("");

    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
    } else {
      const finalNotes = currentTaskNote && (taskTimeElapsed > 0 || taskNotes.trim())
        ? [...allTaskNotes, currentTaskNote]
        : [...allTaskNotes];
      finishSession(finalNotes, completedTasks.length);
    }
  };

  const finishSession = (finalNotes: TaskNote[], finalCompletedCount: number) => {
    setTaskTimerRunning(false);
    setPhase("complete");
    completeRoutineMutation.mutate({ finalNotes, finalCompletedCount });
    generateSummaryMutation.mutate({ finalNotes, finalCompletedCount });
  };

  const handleEndSessionEarly = () => {
    let finalNotes = [...allTaskNotes];
    if (currentTask && (taskTimeElapsed > 0 || taskNotes.trim())) {
      finalNotes.push({
        taskId: currentTask.id,
        task: currentTask.title,
        note: taskNotes,
        timeSpent: taskTimeElapsed,
        habitId: currentTask.habitId,
        habitTitle: currentTask.habitTitle,
      });
    }
    setShowEndEarlyConfirm(false);
    finishSession(finalNotes, completedTasks.length);
  };

  const handleFinishSession = () => {
    onOpenChange(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalSessionTime = allTaskNotes.reduce((sum, n) => sum + n.timeSpent, 0) + taskTimeElapsed;

  const getHabitStats = () => {
    const stats: Record<number, { title: string; completed: number; total: number; time: number }> = {};
    for (const task of tasks) {
      if (!stats[task.habitId]) {
        stats[task.habitId] = { title: task.habitTitle, completed: 0, total: 0, time: 0 };
      }
      stats[task.habitId].total++;
    }
    for (const note of allTaskNotes) {
      if (stats[note.habitId]) {
        if (completedTasks.includes(note.taskId)) {
          stats[note.habitId].completed++;
        }
        stats[note.habitId].time += note.timeSpent;
      }
    }
    return Object.entries(stats).map(([id, s]) => ({ habitId: Number(id), ...s }));
  };

  const nextTask = currentTaskIndex < tasks.length - 1 ? tasks[currentTaskIndex + 1] : null;
  const isTransitioningHabits = nextTask && currentTask && nextTask.habitId !== currentTask.habitId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdG+AhYeFhYaFh4mJiYmLjIqJh4WDgXx2cWxnZGVmam92foaOlZyhoaGgn56dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZybmpmXlZKOiYR+d3BpY15aWFlaXmVtd4CIkZidn6CgoKCgoKCgoKCgoKCgoKCgoKCgoKCgn56cmpmWko2HgXpzbGVeWFNPTk9SV15mbniCi5OZnqGjo6Ojo6Ojo6Ojo6Ojo6Ojo6KgnpuYlI+JgHZsYlhOREA+" />

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <span className="truncate block">{stack.name}</span>
              <span className="text-xs font-normal text-muted-foreground">Unified Routine</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {phase === "checklist" && (
            <motion.div
              key="checklist"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <p className="text-muted-foreground">
                Your routine has <strong>{tasks.length} tasks</strong> across{" "}
                <strong>{uniqueHabitIds.length} habits</strong>.
                {unifiedPlan?.totalDuration && (
                  <> Estimated time: <strong>~{unifiedPlan.totalDuration} min</strong>.</>
                )}
              </p>

              <div className="flex flex-wrap gap-1.5">
                {uniqueHabitIds.map((habitId) => {
                  const task = tasks.find(t => t.habitId === habitId);
                  const color = getHabitColor(habitId, uniqueHabitIds);
                  return (
                    <Badge key={habitId} variant="outline" className="gap-1.5 text-xs">
                      <div className={cn("w-2 h-2 rounded-full", color)} />
                      {task?.habitTitle || "Habit"}
                    </Badge>
                  );
                })}
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    Ready to Start?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {checklist.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors hover-elevate"
                      data-testid={`checklist-item-${item.id}`}
                    >
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={() => toggleChecklistItem(item.id)}
                      />
                      <span className={cn(
                        "text-sm transition-colors",
                        item.checked ? "text-muted-foreground line-through" : ""
                      )}>
                        {item.text}
                      </span>
                    </label>
                  ))}
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                  data-testid="button-cancel-routine"
                >
                  Cancel
                </Button>
                <Button
                  onClick={startSession}
                  disabled={!allChecklistDone}
                  className="flex-1 gap-2"
                  data-testid="button-begin-routine"
                >
                  <Play className="w-4 h-4" />
                  Start Routine
                </Button>
              </div>
            </motion.div>
          )}

          {phase === "tasks" && currentTask && (
            <motion.div
              key={`task-${currentTaskIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    Step {currentTaskIndex + 1} of {tasks.length}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <div className={cn("w-2 h-2 rounded-full", getHabitColor(currentTask.habitId, uniqueHabitIds))} />
                    {currentTask.habitTitle}
                  </Badge>
                </div>
                <Badge variant="outline" className="gap-1">
                  <Clock className="w-3 h-3" />
                  {currentTask.duration}m
                </Badge>
              </div>

              <Progress value={((currentTaskIndex + 1) / tasks.length) * 100} className="h-2" />

              <Card>
                <CardContent className="p-5 space-y-3">
                  <h3 className="text-lg font-display font-bold" data-testid="text-current-routine-task">
                    {currentTask.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-current-routine-description">
                    {currentTask.description}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Button
                        variant={taskTimerRunning ? "destructive" : "default"}
                        size="icon"
                        onClick={handleTaskTimerToggle}
                        data-testid="button-routine-timer-toggle"
                      >
                        {taskTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <div className="text-center">
                        <p className="text-2xl font-mono font-bold tabular-nums" data-testid="text-routine-timer">
                          {formatTime(taskTimeElapsed)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          suggested {currentTask.duration}m
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleAddTime(60)} data-testid="button-add-1m">
                        <Plus className="w-3 h-3 mr-1" />1m
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleAddTime(300)} data-testid="button-add-5m">
                        <Plus className="w-3 h-3 mr-1" />5m
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Notes (optional)</label>
                <Textarea
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="How did this task go?"
                  className="resize-none text-sm"
                  rows={2}
                  data-testid="input-routine-task-notes"
                />
              </div>

              {nextTask && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-lg bg-muted/30">
                  <ArrowRight className="w-3 h-3 shrink-0" />
                  <span>
                    Next: <strong>{nextTask.title}</strong>
                    {isTransitioningHabits && (
                      <span className="ml-1">
                        (switching to <span className="text-primary">{nextTask.habitTitle}</span>)
                      </span>
                    )}
                  </span>
                </div>
              )}

              <Button
                onClick={handleCompleteTask}
                className="w-full gap-2 h-12 text-base font-semibold"
                data-testid="button-finish-routine-task"
              >
                <Check className="w-5 h-5" />
                {currentTaskIndex < tasks.length - 1 ? "Complete & Continue" : "Complete Routine"}
              </Button>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkipTask}
                  className="flex-1 text-muted-foreground"
                  data-testid="button-skip-routine-task"
                >
                  Skip
                </Button>
                {showEndEarlyConfirm ? (
                  <div className="flex-1 flex items-center gap-2 p-2 rounded-lg border border-destructive/30 bg-destructive/5">
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                    <span className="text-xs">End now?</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEndEarlyConfirm(false)}
                      className="flex-1 text-xs"
                    >
                      Continue
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleEndSessionEarly}
                      className="flex-1 text-xs"
                      data-testid="button-confirm-end-routine-early"
                    >
                      End
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEndEarlyConfirm(true)}
                    className="flex-1 text-muted-foreground"
                    data-testid="button-end-routine-early"
                  >
                    End early
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {phase === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-4 space-y-5"
            >
              <div className="relative text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", duration: 0.8 }}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto shadow-xl shadow-primary/20"
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 10, 0], scale: [1, 1.1, 1] }}
                    transition={{ repeat: 2, duration: 0.5 }}
                  >
                    <PartyPopper className="w-8 h-8 text-primary" />
                  </motion.div>
                </motion.div>

                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0.5],
                      x: Math.cos(i * 60 * Math.PI / 180) * 50,
                      y: Math.sin(i * 60 * Math.PI / 180) * 50,
                    }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }}
                    className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-gradient-to-r from-primary to-accent"
                  />
                ))}
              </div>

              <div className="text-center">
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
                >
                  Routine Complete!
                </motion.h3>
                <p className="text-sm text-muted-foreground mt-1">{stack.name}</p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-3 gap-2"
              >
                <div className="text-center p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-xl font-bold text-primary">{completedTasks.length}/{tasks.length}</p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Tasks Done</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-xl font-bold text-primary">
                    {totalSessionTime >= 60 ? `${Math.floor(totalSessionTime / 60)}m` : `${totalSessionTime}s`}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Total Time</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-xl font-bold text-primary">{uniqueHabitIds.length}</p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Habits</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-2"
              >
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Per Habit Breakdown</p>
                {getHabitStats().map((stat) => (
                  <div key={stat.habitId} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", getHabitColor(stat.habitId, uniqueHabitIds))} />
                      <span className="text-sm font-medium truncate">{stat.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px]">
                        {stat.completed}/{stat.total}
                      </Badge>
                      {stat.time > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          {stat.time >= 60 ? `${Math.floor(stat.time / 60)}m` : `${stat.time}s`}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className="w-4 h-4 text-primary" />
                      AI Session Review
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {generateSummaryMutation.isPending ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing your routine...
                      </div>
                    ) : sessionSummary ? (
                      <div className="space-y-3">
                        <p className="text-sm">{sessionSummary.summary}</p>

                        {sessionSummary.insights && sessionSummary.insights.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Insights</p>
                            <ul className="space-y-1.5">
                              {sessionSummary.insights.map((insight, i) => (
                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <Lightbulb className="w-3 h-3 text-yellow-500 mt-1 flex-shrink-0" />
                                  {insight}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {sessionSummary.performanceTips && sessionSummary.performanceTips.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tips</p>
                            <ul className="space-y-1.5">
                              {sessionSummary.performanceTips.map((tip, i) => (
                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <Target className="w-3 h-3 text-primary mt-1 flex-shrink-0" />
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="pt-2 border-t">
                          <p className="text-sm italic text-primary">{sessionSummary.encouragement}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Great job completing your routine!
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Button
                  onClick={handleFinishSession}
                  size="lg"
                  className="w-full gap-2 rounded-xl shadow-lg shadow-primary/20"
                  data-testid="button-finish-routine"
                >
                  <Check className="w-5 h-5" />
                  Done
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
