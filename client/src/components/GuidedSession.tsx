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
import { Sparkles, ArrowRight, Check, Timer, Play, Pause, Plus, Clock, Target, PartyPopper, ChevronRight, Lightbulb, Loader2, Brain, AlertCircle, Crown, Lock } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Habit, DailyPlan, RoutineTask } from "@shared/schema";
import { TaskGuidanceModal } from "./TaskGuidanceModal";
import { VoiceNote } from "./VoiceNote";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { UpgradePrompt, SessionLimitReached } from "./UpgradePrompt";

interface NextInStackInfo {
  habitId: number;
  habitTitle: string;
  transitionNote?: string;
}

interface GuidedSessionProps {
  habit: Habit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextInStack?: NextInStackInfo | null;
  onStartNextInStack?: (habitId: number) => void;
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
}

interface SessionSummary {
  summary: string;
  insights: string[];
  encouragement: string;
  performanceTips?: string[];
  nextSteps?: string[];
}

const INITIAL_CHECKLIST: ChecklistItem[] = [
  { id: 1, text: "I'm in a quiet, comfortable space", checked: false },
  { id: 2, text: "I've set aside uninterrupted time", checked: false },
  { id: 3, text: "I'm focused and ready to begin", checked: false },
];

export function GuidedSession({ habit, open, onOpenChange, nextInStack, onStartNextInStack }: GuidedSessionProps) {
  const [phase, setPhase] = useState<Phase>("checklist");
  const [checklist, setChecklist] = useState(INITIAL_CHECKLIST);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [taskNotes, setTaskNotes] = useState("");
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [allTaskNotes, setAllTaskNotes] = useState<TaskNote[]>([]);
  const [sessionStartTime] = useState<Date>(new Date());
  const [guidanceModalOpen, setGuidanceModalOpen] = useState(false);
  
  // Individual task timer state
  const [taskTimerRunning, setTaskTimerRunning] = useState(false);
  const [taskTimeElapsed, setTaskTimeElapsed] = useState(0);
  const [taskTimerStartTime, setTaskTimerStartTime] = useState<Date | null>(null);
  
  // Session summary state
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [showEndEarlyConfirm, setShowEndEarlyConfirm] = useState(false);
  const [sessionLimitReached, setSessionLimitReached] = useState(false);
  
  const { features, isFreeUser } = useSubscription();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queryClient = useQueryClient();

  // Get today's plan
  const today = format(new Date(), "yyyy-MM-dd");
  const dailyPlans = (habit.dailyPlans || []) as DailyPlan[];
  const todaysPlan = dailyPlans.find(p => p.date === today) || dailyPlans.find(p => !p.completed);
  const tasks = todaysPlan?.tasks || [];
  const currentTask = tasks[currentTaskIndex];

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed, notes, timeSpent }: { taskId: string; completed?: boolean; notes?: string; timeSpent?: number }) => {
      const res = await apiRequest("PATCH", `/api/habits/${habit.id}/tasks/${taskId}`, { completed, notes, timeSpent });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits", habit.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/achievements"] });
    },
    onError: () => {
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  const completeSessionMutation = useMutation({
    mutationFn: async ({ finalNotes, finalCompletedCount }: { finalNotes: TaskNote[]; finalCompletedCount: number }) => {
      const totalTimeSpent = finalNotes.reduce((sum, n) => sum + n.timeSpent, 0);
      const timeInMinutes = Math.max(1, Math.round(totalTimeSpent / 60));
      
      const res = await apiRequest("POST", `/api/habits/${habit.id}/session-complete`, {
        date: today,
        tasksCompleted: finalCompletedCount,
        totalTasks: tasks.length,
        timeSpent: timeInMinutes,
        goalTime: 0,
        notes: "",
        mood: "good",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits", habit.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/achievements"] });
    },
    onError: (error: any) => {
      setSessionLimitReached(true);
    },
  });

  const generateSummaryMutation = useMutation({
    mutationFn: async ({ finalNotes, finalCompletedCount }: { finalNotes: TaskNote[]; finalCompletedCount: number }) => {
      if (isFreeUser) {
        return {
          summary: "Complete your session! Upgrade to Pro for personalized AI coaching insights after every session.",
          insights: [],
          encouragement: "You're building great habits!",
          locked: true,
        };
      }
      const totalTimeSpent = finalNotes.reduce((sum, n) => sum + n.timeSpent, 0);
      const timeInMinutes = Math.max(1, Math.round(totalTimeSpent / 60));
      
      const notesForSummary = finalNotes
        .filter(n => n.note.trim())
        .map(n => ({ task: n.task, note: n.note }));
      
      const res = await apiRequest("POST", `/api/habits/${habit.id}/session-summary`, {
        habitTitle: habit.title,
        tasksCompleted: finalCompletedCount,
        totalTasks: tasks.length,
        timeSpent: timeInMinutes,
        notes: notesForSummary,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setSessionSummary(data);
    },
    onError: () => {
      toast({ title: "Failed to generate summary", variant: "destructive" });
    },
  });

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPhase("checklist");
      setChecklist(INITIAL_CHECKLIST);
      setCurrentTaskIndex(0);
      setCompletedTasks([]);
      setAllTaskNotes([]);
      setTaskNotes("");
      setTaskTimerRunning(false);
      setTaskTimeElapsed(0);
      setTaskTimerStartTime(null);
      setSessionSummary(null);
      setShowEndEarlyConfirm(false);
      setGuidanceModalOpen(false);
      setSessionLimitReached(false);
    }
  }, [open]);

  // Close guidance modal when task changes
  useEffect(() => {
    setGuidanceModalOpen(false);
  }, [currentTaskIndex]);

  // Reset task timer when moving to next task
  useEffect(() => {
    setTaskTimeElapsed(0);
    setTaskTimerRunning(false);
    setTaskTimerStartTime(null);
  }, [currentTaskIndex]);

  // Task timer logic
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
    setChecklist(prev => 
      prev.map(item => 
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const allChecklistDone = checklist.every(item => item.checked);

  const startSession = () => {
    if (tasks.length > 0) {
      setPhase("tasks");
    } else {
      // No tasks, just finish session
      finishSession([], 0);
    }
  };

  const handleTaskTimerToggle = () => {
    if (taskTimerRunning) {
      // Pause: save elapsed time
      setTaskTimerRunning(false);
    } else {
      // Start/Resume
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
    
    // Stop timer and save time
    setTaskTimerRunning(false);
    
    // Create current task note entry
    const currentTaskNote: TaskNote = {
      taskId: currentTask.id,
      task: currentTask.title,
      note: taskNotes,
      timeSpent: taskTimeElapsed,
    };
    
    // Save notes and time for this task
    setAllTaskNotes(prev => [...prev, currentTaskNote]);
    
    const timeSpentMinutes = Math.max(1, Math.round(taskTimeElapsed / 60));

    updateTaskMutation.mutate({
      taskId: currentTask.id,
      completed: true,
      notes: taskNotes || undefined,
      timeSpent: timeSpentMinutes,
    });
    
    const newCompletedCount = completedTasks.length + 1;
    setCompletedTasks(prev => [...prev, currentTask.id]);
    setTaskNotes("");
    
    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
    } else {
      // End session with final data including current task
      const finalNotes = [...allTaskNotes, currentTaskNote];
      finishSession(finalNotes, newCompletedCount);
    }
  };

  const handleSkipTask = () => {
    // Build current task note if any time spent
    let currentTaskNote: TaskNote | null = null;
    if (currentTask && taskTimeElapsed > 0) {
      currentTaskNote = {
        taskId: currentTask.id,
        task: currentTask.title,
        note: taskNotes,
        timeSpent: taskTimeElapsed,
      };
      setAllTaskNotes(prev => [...prev, currentTaskNote!]);
    }
    
    setTaskTimerRunning(false);
    setTaskNotes("");
    
    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
    } else {
      // End session with all data including any current task time
      const finalNotes = currentTaskNote ? [...allTaskNotes, currentTaskNote] : [...allTaskNotes];
      finishSession(finalNotes, completedTasks.length);
    }
  };

  const finishSession = (finalNotes: TaskNote[], finalCompletedCount: number) => {
    setTaskTimerRunning(false);
    setPhase("complete");
    completeSessionMutation.mutate({ finalNotes, finalCompletedCount });
    generateSummaryMutation.mutate({ finalNotes, finalCompletedCount });
  };

  const handleEndSessionEarly = () => {
    // Build final notes including current task if any data
    let finalNotes = [...allTaskNotes];
    if (currentTask && (taskTimeElapsed > 0 || taskNotes.trim())) {
      finalNotes.push({
        taskId: currentTask.id,
        task: currentTask.title,
        note: taskNotes,
        timeSpent: taskTimeElapsed,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdG+AhYeFhYaFh4mJiYmLjIqJh4WDgXx2cWxnZGVmam92foaOlZyhoaGgn56dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZybmpmXlZKOiYR+d3BpY15aWFlaXmVtd4CIkZidn6CgoKCgoKCgoKCgoKCgoKCgoKCgoKCgn56cmpmWko2HgXpzbGVeWFNPTk9SV15mbniCi5OZnqGjo6Ojo6Ojo6Ojo6Ojo6Ojo6KgnpuYlI+JgHZsYlhOREA+" />

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            {habit.title}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {sessionLimitReached && (
            <motion.div
              key="session-limit"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <SessionLimitReached />
            </motion.div>
          )}

          {/* Checklist Phase */}
          {!sessionLimitReached && phase === "checklist" && (
            <motion.div
              key="checklist"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <p className="text-muted-foreground">
                Let's make sure you're ready to focus on your habit.
              </p>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    Pre-Session Checklist
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {checklist.map((item) => (
                    <label
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer",
                        item.checked ? "bg-primary/10" : "bg-muted/50 hover:bg-muted"
                      )}
                      data-testid={`checklist-row-${item.id}`}
                    >
                      <Checkbox 
                        checked={item.checked} 
                        onCheckedChange={() => toggleChecklistItem(item.id)}
                        data-testid={`checklist-${item.id}`}
                      />
                      <span className={cn(
                        "text-sm flex-1",
                        item.checked && "text-primary font-medium"
                      )}>
                        {item.text}
                      </span>
                      {item.checked && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                        >
                          <Check className="w-4 h-4 text-primary" />
                        </motion.div>
                      )}
                    </label>
                  ))}
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                  data-testid="button-cancel-session"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={startSession}
                  disabled={!allChecklistDone}
                  className="flex-1 gap-2"
                  data-testid="button-begin-guided-session"
                >
                  {allChecklistDone ? (
                    <>
                      Start Session
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    "Complete checklist first"
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Tasks Phase */}
          {!sessionLimitReached && phase === "tasks" && currentTask && (
            <motion.div
              key={`task-${currentTaskIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  Task {currentTaskIndex + 1} of {tasks.length}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Clock className="w-3 h-3" />
                  {currentTask.duration} min suggested
                </Badge>
              </div>

              <Progress value={((currentTaskIndex + 1) / tasks.length) * 100} className="h-1.5" />

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-lg">{currentTask.title}</h3>
                  <p className="text-muted-foreground whitespace-pre-line">{currentTask.description}</p>
                  {isFreeUser ? (
                    <Link href="/paywall">
                      <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40 rounded-lg p-3 border border-amber-200/60 dark:border-amber-800/50 cursor-pointer hover:bg-amber-100/80 dark:hover:bg-amber-900/40 transition-colors" data-testid="prompt-unlock-resources">
                        <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span className="flex-1">Get AI-curated tips, articles & resources for each task</span>
                        <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 flex-shrink-0">Pro</Badge>
                      </div>
                    </Link>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 w-full"
                      onClick={() => setGuidanceModalOpen(true)}
                      data-testid="button-get-guidance"
                    >
                      <Lightbulb className="w-4 h-4" />
                      Get Examples, Resources & Guidance
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Individual Task Timer */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Timer className="w-4 h-4 text-primary" />
                      Task Timer
                    </span>
                    <span className="text-2xl font-display font-bold text-primary">
                      {formatTime(taskTimeElapsed)}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant={taskTimerRunning ? "outline" : "default"}
                      size="sm"
                      onClick={handleTaskTimerToggle}
                      className="flex-1 gap-2"
                      data-testid="button-task-timer-toggle"
                    >
                      {taskTimerRunning ? (
                        <>
                          <Pause className="w-4 h-4" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          {taskTimeElapsed > 0 ? "Resume" : "Start"}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddTime(60)}
                      className="gap-1"
                      data-testid="button-add-1-min"
                    >
                      <Plus className="w-3 h-3" />
                      1m
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddTime(300)}
                      className="gap-1"
                      data-testid="button-add-5-min"
                    >
                      <Plus className="w-3 h-3" />
                      5m
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Notes (optional)</label>
                  <VoiceNote 
                    onTranscript={(text) => setTaskNotes(prev => prev ? `${prev}\n${text}` : text)}
                    disabled={completeSessionMutation.isPending}
                  />
                </div>
                <Textarea
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="Record your thoughts, progress, or reflections..."
                  className="min-h-[80px]"
                  data-testid="input-task-notes"
                />
              </div>

              {/* Primary Finish Task Button */}
              <Button
                onClick={handleCompleteTask}
                className="w-full gap-2 h-12 text-base font-semibold"
                data-testid="button-finish-task"
              >
                <Check className="w-5 h-5" />
                Finish Task
              </Button>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkipTask}
                  className="flex-1 text-muted-foreground"
                  data-testid="button-skip-task"
                >
                  Skip (don't complete)
                </Button>
              </div>

              {/* End Session Early */}
              <div className="pt-2 border-t">
                {showEndEarlyConfirm ? (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <div className="flex items-start gap-2 mb-3">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">End session early?</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          You've completed {completedTasks.length} of {tasks.length} tasks. Your progress will be saved.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowEndEarlyConfirm(false)}
                        className="flex-1"
                      >
                        Continue Session
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleEndSessionEarly}
                        className="flex-1"
                        data-testid="button-confirm-end-early"
                      >
                        End Session
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEndEarlyConfirm(true)}
                    className="w-full text-muted-foreground"
                    data-testid="button-end-session-early"
                  >
                    End session early
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* Completion Phase */}
          {!sessionLimitReached && phase === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-4 space-y-5"
            >
              {/* Celebration animation */}
              <div className="relative text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", duration: 0.8 }}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto shadow-xl shadow-primary/20"
                >
                  <motion.div
                    animate={{ 
                      rotate: [0, 10, -10, 10, 0],
                      scale: [1, 1.1, 1]
                    }}
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
                  Session Complete!
                </motion.h3>
              </div>

              {/* Session Stats Grid */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-3 gap-2"
              >
                <div className="text-center p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-xl font-bold text-primary">{completedTasks.length}/{tasks.length}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">Tasks Done</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-xl font-bold text-primary">
                    {totalSessionTime >= 60 ? `${Math.floor(totalSessionTime / 60)}m` : `${totalSessionTime}s`}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">Time Spent</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-xl font-bold text-primary">
                    {tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">Completion</p>
                </div>
              </motion.div>

              {/* Per-task breakdown */}
              {allTaskNotes.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Timer className="w-3.5 h-3.5 text-primary" />
                        Task Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {allTaskNotes.map((note, i) => {
                        const timeMin = Math.max(1, Math.round(note.timeSpent / 60));
                        const isTaskDone = completedTasks.some(t => t.id === note.taskId);
                        return (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            {isTaskDone ? (
                              <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                            )}
                            <span className={cn("flex-1 truncate", isTaskDone ? "text-foreground" : "text-muted-foreground")}>
                              {note.task}
                            </span>
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {timeMin}m
                            </Badge>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* AI Summary Section */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                {isFreeUser ? (
                  <UpgradePrompt
                    variant="card"
                    feature="AI Coach Feedback"
                    description="Get personalized insights, performance tips, and next steps after every session. Upgrade to Pro to unlock AI coaching."
                  />
                ) : (
                  <Card className="border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Brain className="w-3.5 h-3.5 text-primary" />
                        AI Coach Feedback
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {generateSummaryMutation.isPending ? (
                        <div className="flex items-center gap-2 text-muted-foreground py-4 justify-center">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Analyzing your session...</span>
                        </div>
                      ) : sessionSummary ? (
                        <div className="space-y-3">
                          <p className="text-sm text-foreground">{sessionSummary.summary}</p>
                          
                          {sessionSummary.insights && sessionSummary.insights.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Key Insights</p>
                              <ul className="space-y-1.5">
                                {sessionSummary.insights.map((insight, i) => (
                                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <Lightbulb className="w-3 h-3 text-amber-500 mt-1 flex-shrink-0" />
                                    {insight}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {sessionSummary.performanceTips && sessionSummary.performanceTips.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Performance Tips</p>
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

                          {sessionSummary.nextSteps && sessionSummary.nextSteps.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Next Steps</p>
                              <ul className="space-y-1.5">
                                {sessionSummary.nextSteps.map((step, i) => (
                                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <ArrowRight className="w-3 h-3 text-primary mt-1 flex-shrink-0" />
                                    {step}
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
                          Great job completing your session! Keep building on this momentum.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </motion.div>

              {nextInStack && onStartNextInStack && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.75 }}
                >
                  <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <ArrowRight className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Next in your stack</p>
                          <p className="text-sm font-semibold truncate">{nextInStack.habitTitle}</p>
                        </div>
                      </div>
                      {nextInStack.transitionNote && (
                        <p className="text-xs text-muted-foreground italic pl-10">{nextInStack.transitionNote}</p>
                      )}
                      <Button
                        onClick={() => {
                          handleFinishSession();
                          onStartNextInStack(nextInStack.habitId);
                        }}
                        size="lg"
                        className="w-full gap-2 rounded-xl"
                        data-testid="button-start-next-in-stack"
                      >
                        <Play className="w-4 h-4" />
                        Start {nextInStack.habitTitle}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: nextInStack ? 0.95 : 0.8 }}
              >
                <Button
                  onClick={handleFinishSession}
                  size="lg"
                  variant={nextInStack ? "outline" : "default"}
                  className={cn("w-full gap-2 rounded-xl", !nextInStack && "shadow-lg shadow-primary/20")}
                  data-testid="button-finish-session"
                >
                  <Check className="w-5 h-5" />
                  Done
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>

      {currentTask && (
        <TaskGuidanceModal
          habitId={habit.id}
          task={currentTask}
          habitTitle={habit.title}
          open={guidanceModalOpen}
          onOpenChange={setGuidanceModalOpen}
        />
      )}
    </Dialog>
  );
}
