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
import { Sparkles, ArrowRight, Check, Timer, Play, Pause, Plus, Clock, Target, PartyPopper, ChevronRight, Lightbulb, Loader2, Brain, AlertCircle, Layers, ExternalLink, BookOpen, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { HabitStack, UnifiedPlanTask, UnifiedPlanStep, UnifiedPlanTransition } from "@shared/schema";

interface UnifiedRoutineSessionProps {
  stack: HabitStack;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Phase = "checklist" | "transition" | "tasks" | "complete";

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

const HABIT_COLORS_LIGHT = [
  "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
  "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
  "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800",
  "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
  "bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800",
  "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800",
  "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800",
  "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
];

const HABIT_TEXT_COLORS = [
  "text-emerald-700 dark:text-emerald-300",
  "text-blue-700 dark:text-blue-300",
  "text-purple-700 dark:text-purple-300",
  "text-orange-700 dark:text-orange-300",
  "text-pink-700 dark:text-pink-300",
  "text-cyan-700 dark:text-cyan-300",
  "text-yellow-700 dark:text-yellow-300",
  "text-red-700 dark:text-red-300",
];

function getHabitColor(habitId: number, habitIds: number[]): string {
  const index = habitIds.indexOf(habitId);
  return HABIT_COLORS[index % HABIT_COLORS.length];
}

function getHabitLightColor(habitId: number, habitIds: number[]): string {
  const index = habitIds.indexOf(habitId);
  return HABIT_COLORS_LIGHT[index % HABIT_COLORS_LIGHT.length];
}

function getHabitTextColor(habitId: number, habitIds: number[]): string {
  const index = habitIds.indexOf(habitId);
  return HABIT_TEXT_COLORS[index % HABIT_TEXT_COLORS.length];
}

const RESOURCE_ICONS: Record<string, typeof BookOpen> = {
  article: BookOpen,
  book: BookOpen,
  video: Play,
  course: BookOpen,
  blog: BookOpen,
  tool: ExternalLink,
};

export function UnifiedRoutineSession({ stack, open, onOpenChange }: UnifiedRoutineSessionProps) {
  const [phase, setPhase] = useState<Phase>("checklist");
  const [checklist, setChecklist] = useState(ROUTINE_CHECKLIST);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [taskNotes, setTaskNotes] = useState("");
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [skippedTasks, setSkippedTasks] = useState<string[]>([]);
  const [allTaskNotes, setAllTaskNotes] = useState<TaskNote[]>([]);

  const [taskTimerRunning, setTaskTimerRunning] = useState(false);
  const [taskTimeElapsed, setTaskTimeElapsed] = useState(0);
  const [taskTimerStartTime, setTaskTimerStartTime] = useState<Date | null>(null);

  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [showEndEarlyConfirm, setShowEndEarlyConfirm] = useState(false);
  const [showResources, setShowResources] = useState(true);
  const [showSteps, setShowSteps] = useState(true);
  const [pendingTransition, setPendingTransition] = useState<UnifiedPlanTransition | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queryClient = useQueryClient();

  const unifiedPlan = (stack as any)?.unifiedPlan;
  const tasks: UnifiedPlanTask[] = unifiedPlan?.tasks || [];
  const transitions: UnifiedPlanTransition[] = unifiedPlan?.transitions || [];
  const currentTask = tasks[currentTaskIndex];
  const today = format(new Date(), "yyyy-MM-dd");

  const uniqueHabitIds = Array.from(new Set(tasks.map(t => t.habitId)));

  const totalStepsAllTasks = tasks.reduce((sum, t) => sum + Math.max(1, (t.steps?.length || 0)), 0);
  const completedStepsCount = completedSteps.length;
  const overallProgress = totalStepsAllTasks > 0 ? (completedStepsCount / totalStepsAllTasks) * 100 : 0;

  const currentHabitTasksCount = currentTask ? tasks.filter(t => t.habitId === currentTask.habitId).length : 0;
  const currentHabitTaskIndex = currentTask ? tasks.filter(t => t.habitId === currentTask.habitId && t.order <= currentTask.order).length : 0;

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
      setCurrentStepIndex(0);
      setCompletedTasks([]);
      setCompletedSteps([]);
      setSkippedTasks([]);
      setAllTaskNotes([]);
      setTaskNotes("");
      setTaskTimerRunning(false);
      setTaskTimeElapsed(0);
      setTaskTimerStartTime(null);
      setSessionSummary(null);
      setShowEndEarlyConfirm(false);
      setShowResources(false);
      setShowSteps(true);
      setPendingTransition(null);
    }
  }, [open]);

  useEffect(() => {
    setTaskTimeElapsed(0);
    setTaskTimerRunning(false);
    setTaskTimerStartTime(null);
    setCurrentStepIndex(0);
    setShowResources(false);
    setShowSteps(true);
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

  const toggleStep = (stepId: string) => {
    setCompletedSteps(prev =>
      prev.includes(stepId) ? prev.filter(s => s !== stepId) : [...prev, stepId]
    );
  };

  const moveToNextTask = () => {
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
      const nextTask = tasks[currentTaskIndex + 1];
      if (nextTask.habitId !== currentTask.habitId) {
        const transition = transitions.find(
          t => t.fromHabitId === currentTask.habitId && t.toHabitId === nextTask.habitId
        );
        if (transition) {
          setPendingTransition(transition);
          setPhase("transition");
          setCurrentTaskIndex(prev => prev + 1);
          return;
        }
      }
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
      const nextTask = tasks[currentTaskIndex + 1];
      if (currentTask && nextTask.habitId !== currentTask.habitId) {
        const transition = transitions.find(
          t => t.fromHabitId === currentTask.habitId && t.toHabitId === nextTask.habitId
        );
        if (transition) {
          setPendingTransition(transition);
          setPhase("transition");
          setCurrentTaskIndex(prev => prev + 1);
          return;
        }
      }
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

  const handleContinueAfterTransition = () => {
    setPendingTransition(null);
    setPhase("tasks");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
  const currentSteps = currentTask?.steps || [];
  const currentResources = currentTask?.resources || [];
  const allCurrentStepsComplete = currentSteps.length > 0 && currentSteps.every(s => completedSteps.includes(s.id));

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
              <span className="text-xs font-normal text-muted-foreground">Guided Routine</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* ==================== CHECKLIST PHASE ==================== */}
          {phase === "checklist" && (
            <motion.div
              key="checklist"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <p className="text-muted-foreground">
                Your routine has <strong>{tasks.length} guided steps</strong> across{" "}
                <strong>{uniqueHabitIds.length} habits</strong>.
                {unifiedPlan?.totalDuration && (
                  <> Estimated time: <strong>~{unifiedPlan.totalDuration} min</strong>.</>
                )}
              </p>

              {unifiedPlan?.overview && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-sm leading-relaxed">{unifiedPlan.overview}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-wrap gap-1.5">
                {uniqueHabitIds.map((habitId) => {
                  const habitTasks = tasks.filter(t => t.habitId === habitId);
                  const task = habitTasks[0];
                  const color = getHabitColor(habitId, uniqueHabitIds);
                  return (
                    <Badge key={habitId} variant="outline" className="gap-1.5 text-xs">
                      <div className={cn("w-2 h-2 rounded-full", color)} />
                      {task?.habitTitle || "Habit"} ({habitTasks.length} steps)
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
                      className="flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors hover-elevate"
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
                  Begin Routine
                </Button>
              </div>
            </motion.div>
          )}

          {/* ==================== TRANSITION PHASE ==================== */}
          {phase === "transition" && pendingTransition && (
            <motion.div
              key="transition"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-5 py-4"
            >
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-3">
                  <Badge variant="outline" className="gap-1.5">
                    <div className={cn("w-2 h-2 rounded-full", getHabitColor(pendingTransition.fromHabitId, uniqueHabitIds))} />
                    {pendingTransition.fromHabitTitle}
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <Badge variant="outline" className="gap-1.5">
                    <div className={cn("w-2 h-2 rounded-full", getHabitColor(pendingTransition.toHabitId, uniqueHabitIds))} />
                    {pendingTransition.toHabitTitle}
                  </Badge>
                </div>

                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.6 }}
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center mx-auto"
                >
                  <ArrowRight className="w-6 h-6 text-primary" />
                </motion.div>

                <h3 className="text-lg font-display font-bold">Switching Gears</h3>
              </div>

              <Card className={cn("border", getHabitLightColor(pendingTransition.toHabitId, uniqueHabitIds))}>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm leading-relaxed">{pendingTransition.message}</p>
                  {pendingTransition.tip && (
                    <div className="flex items-start gap-2 pt-2 border-t">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground italic">{pendingTransition.tip}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Button
                onClick={handleContinueAfterTransition}
                className="w-full gap-2 h-12 text-base font-semibold"
                data-testid="button-continue-after-transition"
              >
                <ChevronRight className="w-5 h-5" />
                Continue to {pendingTransition.toHabitTitle}
              </Button>
            </motion.div>
          )}

          {/* ==================== TASKS PHASE ==================== */}
          {phase === "tasks" && currentTask && (
            <motion.div
              key={`task-${currentTaskIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Step {currentTaskIndex + 1} of {tasks.length}
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-xs">
                    <div className={cn("w-2 h-2 rounded-full", getHabitColor(currentTask.habitId, uniqueHabitIds))} />
                    {currentTask.habitTitle} ({currentHabitTaskIndex}/{currentHabitTasksCount})
                  </Badge>
                </div>
                <Badge variant="outline" className="gap-1 text-xs">
                  <Clock className="w-3 h-3" />
                  {currentTask.duration}m
                </Badge>
              </div>

              <div className="space-y-1">
                <Progress value={overallProgress} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground text-right">
                  {Math.round(overallProgress)}% overall
                </p>
              </div>

              <Card className={cn("border", getHabitLightColor(currentTask.habitId, uniqueHabitIds))}>
                <CardContent className="p-4 space-y-3">
                  <h3 className={cn("text-lg font-display font-bold", getHabitTextColor(currentTask.habitId, uniqueHabitIds))} data-testid="text-current-routine-task">
                    {currentTask.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-current-routine-description">
                    {currentTask.description}
                  </p>
                </CardContent>
              </Card>

              {currentTask.coachingTip && (
                <div className="flex items-start gap-2.5 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-0.5">Coaching Tip</p>
                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{currentTask.coachingTip}</p>
                  </div>
                </div>
              )}

              {currentResources.length > 0 && (
                <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <p className="text-sm font-semibold">Recommended Resources</p>
                    </div>
                    <div className="space-y-1.5">
                      {currentResources.map((resource, i) => {
                        const ResourceIcon = RESOURCE_ICONS[resource.type] || ExternalLink;
                        const url = resource.url || `https://www.google.com/search?q=${encodeURIComponent(resource.searchQuery)}`;
                        return (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-2.5 p-2.5 rounded-md bg-background border hover-elevate transition-colors group"
                            data-testid={`resource-${i}`}
                          >
                            <ResourceIcon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium group-hover:text-primary transition-colors flex items-center gap-1">
                                {resource.name}
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{resource.description}</p>
                            </div>
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {resource.type}
                            </Badge>
                          </a>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {currentSteps.length > 0 && (
                <div className="space-y-1">
                  <button
                    onClick={() => setShowSteps(prev => !prev)}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground w-full"
                    data-testid="button-toggle-steps"
                  >
                    {showSteps ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    Sub-steps ({completedSteps.filter(s => currentSteps.some(cs => cs.id === s)).length}/{currentSteps.length})
                  </button>
                  {showSteps && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="space-y-1.5"
                    >
                      {currentSteps.map((step, i) => {
                        const isStepDone = completedSteps.includes(step.id);
                        return (
                          <div
                            key={step.id}
                            className={cn(
                              "rounded-md border p-3 transition-colors",
                              isStepDone ? "bg-muted/40 border-muted" : "hover-elevate"
                            )}
                          >
                            <label className="flex items-start gap-2.5 cursor-pointer" data-testid={`step-${step.id}`}>
                              <Checkbox
                                checked={isStepDone}
                                onCheckedChange={() => toggleStep(step.id)}
                                className="mt-0.5"
                              />
                              <div className="min-w-0 flex-1">
                                <p className={cn(
                                  "text-sm font-medium transition-colors",
                                  isStepDone && "line-through text-muted-foreground"
                                )}>
                                  {step.title}
                                  {step.duration > 0 && (
                                    <span className="text-muted-foreground font-normal ml-1">({step.duration}m)</span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.description}</p>
                                {step.coachingTip && !isStepDone && (
                                  <div className="flex items-start gap-1.5 mt-1.5 text-xs text-amber-700 dark:text-amber-400">
                                    <Lightbulb className="w-3 h-3 mt-0.5 shrink-0" />
                                    <span className="italic">{step.coachingTip}</span>
                                  </div>
                                )}
                              </div>
                            </label>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </div>
              )}

              <Card>
                <CardContent className="p-3">
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

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
                <Textarea
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="How did this step go? Any observations?"
                  className="resize-none text-sm"
                  rows={2}
                  data-testid="input-routine-task-notes"
                />
              </div>

              {nextTask && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-md bg-muted/30">
                  <ArrowRight className="w-3 h-3 shrink-0" />
                  <span>
                    Next: <strong>{nextTask.title}</strong>
                    {isTransitioningHabits && (
                      <span className="ml-1">
                        (switching to <span className={getHabitTextColor(nextTask.habitId, uniqueHabitIds)}>{nextTask.habitTitle}</span>)
                      </span>
                    )}
                  </span>
                </div>
              )}

              <Button
                onClick={moveToNextTask}
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
                  <div className="flex-1 flex items-center gap-2 p-2 rounded-md border border-destructive/30 bg-destructive/5">
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

          {/* ==================== COMPLETE PHASE ==================== */}
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <PartyPopper className="w-7 h-7 text-primary" />
                  </motion.div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-3"
                >
                  <h3 className="text-xl font-display font-bold" data-testid="text-routine-complete-title">Routine Complete!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    You completed <strong>{completedTasks.length}</strong> of <strong>{tasks.length}</strong> steps
                  </p>
                </motion.div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xl font-bold text-primary tabular-nums" data-testid="stat-routine-completed-count">
                      {completedTasks.length}/{tasks.length}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Steps Done</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xl font-bold text-primary tabular-nums" data-testid="stat-routine-habits-count">
                      {uniqueHabitIds.length}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Habits</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xl font-bold text-primary tabular-nums" data-testid="stat-routine-time">
                      {Math.round(allTaskNotes.reduce((s, n) => s + n.timeSpent, 0) / 60)}m
                    </p>
                    <p className="text-[10px] text-muted-foreground">Time</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Per-Habit Breakdown</p>
                {getHabitStats().map((stat) => (
                  <div key={stat.habitId} className="flex items-center gap-2 text-sm">
                    <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", getHabitColor(stat.habitId, uniqueHabitIds))} />
                    <span className="font-medium truncate flex-1">{stat.title}</span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {stat.completed}/{stat.total} steps
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {Math.round(stat.time / 60)}m
                    </span>
                  </div>
                ))}
              </div>

              {generateSummaryMutation.isPending && (
                <div className="flex items-center gap-3 p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <div>
                    <p className="text-sm font-medium">Your AI coach is reviewing your routine...</p>
                    <p className="text-xs text-muted-foreground">Analyzing performance across all habits</p>
                  </div>
                </div>
              )}

              {sessionSummary && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Brain className="w-4 h-4 text-primary" />
                        AI Coach Summary
                      </div>
                      <p className="text-sm leading-relaxed" data-testid="text-routine-ai-summary">{sessionSummary.summary}</p>
                      {sessionSummary.insights && sessionSummary.insights.length > 0 && (
                        <div className="space-y-1.5">
                          {sessionSummary.insights.map((insight, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <Sparkles className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                              <span>{insight}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {sessionSummary.performanceTips && sessionSummary.performanceTips.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Performance Tips</p>
                          {sessionSummary.performanceTips.map((tip, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <Lightbulb className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                              <span>{tip}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {sessionSummary.encouragement && (
                        <p className="text-sm italic text-muted-foreground pt-2 border-t" data-testid="text-routine-encouragement">
                          {sessionSummary.encouragement}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              <Button
                onClick={handleFinishSession}
                className="w-full h-12 gap-2 text-base font-semibold"
                data-testid="button-close-routine-session"
              >
                <Check className="w-5 h-5" />
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
