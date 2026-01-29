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
import { Sparkles, ArrowRight, Check, Timer, Play, Pause, RotateCcw, Clock, Target, PartyPopper, X, ChevronRight, BookOpen, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, parseISO } from "date-fns";
import type { Habit, DailyPlan, RoutineTask } from "@shared/schema";
import { TaskGuidanceModal } from "./TaskGuidanceModal";

interface GuidedSessionProps {
  habit: Habit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Phase = "checklist" | "tasks" | "timer" | "complete";

interface ChecklistItem {
  id: number;
  text: string;
  checked: boolean;
}

const INITIAL_CHECKLIST: ChecklistItem[] = [
  { id: 1, text: "I'm in a quiet, comfortable space", checked: false },
  { id: 2, text: "I've set aside uninterrupted time", checked: false },
  { id: 3, text: "I'm focused and ready to begin", checked: false },
];

const TIMER_OPTIONS = [5, 10, 15, 20, 30, 45];

export function GuidedSession({ habit, open, onOpenChange }: GuidedSessionProps) {
  const [phase, setPhase] = useState<Phase>("checklist");
  const [checklist, setChecklist] = useState(INITIAL_CHECKLIST);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [taskNotes, setTaskNotes] = useState("");
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [selectedTimer, setSelectedTimer] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [sessionStartTime] = useState<Date>(new Date());
  const [timerStartTime, setTimerStartTime] = useState<Date | null>(null);
  const [accumulatedTime, setAccumulatedTime] = useState(0);
  const [guidanceModalOpen, setGuidanceModalOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queryClient = useQueryClient();

  // Get today's plan
  const today = format(new Date(), "yyyy-MM-dd");
  const dailyPlans = (habit.dailyPlans || []) as DailyPlan[];
  const todaysPlan = dailyPlans.find(p => p.date === today) || dailyPlans.find(p => !p.completed);
  const tasks = todaysPlan?.tasks || [];
  const currentTask = tasks[currentTaskIndex];

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed, notes }: { taskId: string; completed?: boolean; notes?: string }) => {
      const res = await apiRequest("PATCH", `/api/habits/${habit.id}/tasks/${taskId}`, { completed, notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits", habit.id] });
    },
  });

  const completeSessionMutation = useMutation({
    mutationFn: async () => {
      let actualTimeSpent = 0;
      
      if (selectedTimer) {
        if (timerRunning && timerStartTime) {
          const currentElapsed = Math.round((new Date().getTime() - timerStartTime.getTime()) / 1000);
          actualTimeSpent = Math.round((accumulatedTime + currentElapsed) / 60);
        } else {
          actualTimeSpent = Math.round(accumulatedTime / 60);
        }
        if (timeRemaining === 0) {
          actualTimeSpent = selectedTimer;
        }
      } else {
        actualTimeSpent = Math.round((new Date().getTime() - sessionStartTime.getTime()) / 60000);
      }
      
      const res = await apiRequest("POST", `/api/habits/${habit.id}/session-complete`, {
        date: today,
        tasksCompleted: completedTasks.length,
        totalTasks: tasks.length,
        timeSpent: Math.max(1, actualTimeSpent),
        goalTime: selectedTimer || 0,
        notes: "",
        mood: "good",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits", habit.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
    },
  });

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPhase("checklist");
      setChecklist(INITIAL_CHECKLIST);
      setCurrentTaskIndex(0);
      setCompletedTasks([]);
      setTaskNotes("");
      setSelectedTimer(null);
      setTimerRunning(false);
      setTimeRemaining(0);
      setGuidanceModalOpen(false);
    }
  }, [open]);

  // Close guidance modal when task changes
  useEffect(() => {
    setGuidanceModalOpen(false);
  }, [currentTaskIndex]);

  // Timer logic
  useEffect(() => {
    if (!timerRunning || timeRemaining <= 0) return;
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setTimerRunning(false);
          // Play completion sound
          if (audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
          setPhase("complete");
          completeSessionMutation.mutate();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [timerRunning, timeRemaining]);

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
      setPhase("timer");
    }
  };

  const handleCompleteTask = () => {
    if (!currentTask) return;
    
    // Save notes and mark complete
    updateTaskMutation.mutate({
      taskId: currentTask.id,
      completed: true,
      notes: taskNotes || undefined,
    });
    
    setCompletedTasks(prev => [...prev, currentTask.id]);
    setTaskNotes("");
    
    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
    } else {
      setPhase("timer");
    }
  };

  const handleSkipTask = () => {
    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
      setTaskNotes("");
    } else {
      setPhase("timer");
    }
  };

  const handleStartTimer = (minutes: number) => {
    setSelectedTimer(minutes);
    setTimeRemaining(minutes * 60);
    setTimerRunning(true);
    setTimerStartTime(new Date());
  };

  const handleSkipTimer = () => {
    setTimerRunning(false);
    setPhase("complete");
    completeSessionMutation.mutate();
  };

  const handlePauseResume = () => {
    if (timerRunning) {
      if (timerStartTime) {
        const elapsed = Math.round((new Date().getTime() - timerStartTime.getTime()) / 1000);
        setAccumulatedTime(prev => prev + elapsed);
      }
      setTimerRunning(false);
    } else {
      setTimerStartTime(new Date());
      setTimerRunning(true);
    }
  };

  const handleFinishSession = () => {
    onOpenChange(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timerProgress = selectedTimer 
    ? ((selectedTimer * 60 - timeRemaining) / (selectedTimer * 60)) * 100 
    : 0;

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
          {/* Checklist Phase */}
          {phase === "checklist" && (
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
          {phase === "tasks" && currentTask && (
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
                  {currentTask.duration} min
                </Badge>
              </div>

              <Progress value={((currentTaskIndex + 1) / tasks.length) * 100} className="h-1.5" />

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-lg">{currentTask.title}</h3>
                  <p className="text-muted-foreground">{currentTask.description}</p>
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
                </CardContent>
              </Card>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="Record your thoughts, progress, or reflections..."
                  className="min-h-[80px]"
                  data-testid="input-task-notes"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleSkipTask}
                  className="flex-1"
                  data-testid="button-skip-task"
                >
                  Skip
                </Button>
                <Button
                  onClick={handleCompleteTask}
                  className="flex-1 gap-2"
                  data-testid="button-complete-task"
                >
                  <Check className="w-4 h-4" />
                  Complete & Continue
                </Button>
              </div>
            </motion.div>
          )}

          {/* Timer Phase */}
          {phase === "timer" && (
            <motion.div
              key="timer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {!timerRunning && !selectedTimer ? (
                <>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold">Add a focus timer?</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      Set a timer to stay focused on your habit practice.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {TIMER_OPTIONS.map((minutes) => (
                      <Button
                        key={minutes}
                        variant="outline"
                        onClick={() => handleStartTimer(minutes)}
                        className="h-14 flex flex-col gap-1"
                        data-testid={`button-timer-${minutes}`}
                      >
                        <span className="font-bold">{minutes}</span>
                        <span className="text-xs text-muted-foreground">min</span>
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="ghost"
                    onClick={handleSkipTimer}
                    className="w-full"
                    data-testid="button-skip-timer"
                  >
                    Skip timer and finish
                  </Button>
                </>
              ) : (
                <>
                  <div className="relative w-48 h-48 mx-auto">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="96"
                        cy="96"
                        r="88"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-muted/20"
                      />
                      <circle
                        cx="96"
                        cy="96"
                        r="88"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={553}
                        strokeDashoffset={553 - (553 * timerProgress) / 100}
                        strokeLinecap="round"
                        className="text-primary transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold font-mono">
                        {formatTime(timeRemaining)}
                      </span>
                      <span className="text-sm text-muted-foreground">remaining</span>
                    </div>
                  </div>

                  <div className="flex justify-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handlePauseResume}
                      data-testid="button-timer-toggle"
                    >
                      {timerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setTimeRemaining(selectedTimer! * 60)}
                      data-testid="button-timer-reset"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleSkipTimer}
                      data-testid="button-timer-stop"
                    >
                      End early
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Completion Phase */}
          {phase === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", duration: 0.8 }}
                className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto"
              >
                <PartyPopper className="w-12 h-12 text-primary" />
              </motion.div>

              <div>
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-bold"
                >
                  Amazing work!
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-muted-foreground mt-2"
                >
                  You completed {completedTasks.length} task{completedTasks.length !== 1 ? 's' : ''} today.
                  Keep up the momentum!
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Button
                  onClick={handleFinishSession}
                  className="gap-2"
                  data-testid="button-finish-session"
                >
                  <Check className="w-4 h-4" />
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
