import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, 
  Check, 
  CheckCircle2, 
  Clock, 
  Heart,
  Pause,
  Play, 
  Sparkles, 
  Target, 
  X,
  Volume2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { HabitStep } from "@shared/schema";
import type { HabitResponse } from "@shared/routes";

interface GuidedSessionProps {
  habit: HabitResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateSteps: (steps: HabitStep[]) => void;
  onComplete: () => void;
}

type SessionPhase = "checklist" | "steps" | "timer" | "complete";

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "1", text: "I'm in a quiet, comfortable space", checked: false },
  { id: "2", text: "I've set aside uninterrupted time", checked: false },
  { id: "3", text: "I'm focused and ready to begin", checked: false },
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function GuidedSession({ 
  habit, 
  open, 
  onOpenChange, 
  onUpdateSteps,
  onComplete 
}: GuidedSessionProps) {
  const steps = (habit.steps || []) as HabitStep[];
  
  const [phase, setPhase] = useState<SessionPhase>("checklist");
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepNotes, setStepNotes] = useState<Record<string, string>>({});
  
  const [timerDuration, setTimerDuration] = useState(10 * 60);
  const [timeRemaining, setTimeRemaining] = useState(10 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showTimerOption, setShowTimerOption] = useState(false);

  useEffect(() => {
    if (open) {
      setPhase("checklist");
      setChecklist(DEFAULT_CHECKLIST.map(item => ({ ...item, checked: false })));
      setCurrentStepIndex(0);
      setStepNotes({});
      setTimeRemaining(timerDuration);
      setTimerRunning(false);
      setShowTimerOption(false);
      
      const existingNotes: Record<string, string> = {};
      steps.forEach(step => {
        if (step.notes) existingNotes[step.id] = step.notes;
      });
      setStepNotes(existingNotes);
    }
  }, [open, timerDuration, steps]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            playCompletionSound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timeRemaining]);

  const playCompletionSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.4);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.8);
    } catch (e) {
      console.log("Audio not supported");
    }
  }, []);

  const allChecklistDone = checklist.every(item => item.checked);
  const currentStep = steps[currentStepIndex];
  const progress = steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0;
  const timerProgress = timerDuration > 0 ? ((timerDuration - timeRemaining) / timerDuration) * 100 : 0;

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const startSession = () => {
    if (steps.length > 0) {
      setPhase("steps");
    } else {
      setShowTimerOption(true);
    }
  };

  const saveCurrentStepNotes = () => {
    if (!currentStep) return;
    const updatedSteps = steps.map((step, idx) => 
      idx === currentStepIndex 
        ? { ...step, notes: stepNotes[step.id] || "", completed: true }
        : step
    );
    onUpdateSteps(updatedSteps);
  };

  const goToNextStep = () => {
    saveCurrentStepNotes();
    
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      setShowTimerOption(true);
    }
  };

  const skipToTimer = () => {
    saveCurrentStepNotes();
    setShowTimerOption(true);
  };

  const startTimer = (minutes: number) => {
    setTimerDuration(minutes * 60);
    setTimeRemaining(minutes * 60);
    setTimerRunning(true);
    setPhase("timer");
  };

  const skipTimer = () => {
    setPhase("complete");
  };

  const finishSession = () => {
    onComplete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <AnimatePresence mode="wait">
          {phase === "checklist" && (
            <motion.div
              key="checklist"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              <DialogHeader className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <DialogTitle className="font-display text-xl">{habit.title}</DialogTitle>
                </div>
                <DialogDescription>
                  Let's make sure you're ready to focus on your habit
                </DialogDescription>
              </DialogHeader>

              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
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

          {phase === "steps" && currentStep && (
            <motion.div
              key={`step-${currentStepIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              <DialogHeader className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <DialogTitle className="font-display text-lg">
                    Step {currentStepIndex + 1} of {steps.length}
                  </DialogTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={skipToTimer}
                    className="text-xs"
                  >
                    Skip to timer
                  </Button>
                </div>
                <Progress value={progress} className="h-2" />
              </DialogHeader>

              <Card className="mb-6 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                      <span className="text-sm font-bold text-primary">{currentStepIndex + 1}</span>
                    </div>
                    <p className="text-base font-medium leading-relaxed" data-testid="text-current-step">
                      {currentStep.text}
                    </p>
                  </div>

                  {currentStep.options && currentStep.options.filter(o => o.selected).length > 0 && (
                    <div className="mb-4 p-3 rounded-lg bg-muted/50">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Your choices:</p>
                      <ul className="space-y-1">
                        {currentStep.options.filter(o => o.selected).map(opt => (
                          <li key={opt.id} className="text-sm flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                            <span>{opt.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Your notes for this step:</Label>
                    <Textarea
                      placeholder="Add your thoughts, reflections, or answers here..."
                      value={stepNotes[currentStep.id] || ""}
                      onChange={(e) => setStepNotes(prev => ({ 
                        ...prev, 
                        [currentStep.id]: e.target.value 
                      }))}
                      className="min-h-[100px] resize-none"
                      data-testid="input-step-notes"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                {currentStepIndex > 0 && (
                  <Button 
                    variant="outline"
                    onClick={() => setCurrentStepIndex(prev => prev - 1)}
                    data-testid="button-prev-step"
                  >
                    Back
                  </Button>
                )}
                <Button 
                  onClick={goToNextStep}
                  className="flex-1 gap-2"
                  data-testid="button-next-step"
                >
                  {currentStepIndex < steps.length - 1 ? (
                    <>
                      Mark Complete & Continue
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Complete All Steps
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {showTimerOption && phase !== "timer" && phase !== "complete" && (
            <motion.div
              key="timer-option"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              <DialogHeader className="mb-6">
                <DialogTitle className="font-display text-xl flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Set a Focus Timer?
                </DialogTitle>
                <DialogDescription>
                  Would you like to set a timer for practicing {habit.title}?
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {[5, 10, 15, 20, 30, 45].map((mins) => (
                  <Button
                    key={mins}
                    variant="outline"
                    onClick={() => startTimer(mins)}
                    className="h-16 flex-col gap-1"
                    data-testid={`button-timer-${mins}`}
                  >
                    <span className="text-lg font-bold">{mins}</span>
                    <span className="text-xs text-muted-foreground">minutes</span>
                  </Button>
                ))}
              </div>

              <Button 
                variant="ghost" 
                onClick={skipTimer}
                className="w-full"
                data-testid="button-skip-timer"
              >
                Skip timer and finish
              </Button>
            </motion.div>
          )}

          {phase === "timer" && (
            <motion.div
              key="timer"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-6 text-center"
            >
              <DialogHeader className="mb-6">
                <DialogTitle className="font-display text-xl">{habit.title}</DialogTitle>
                <DialogDescription>Focus on your practice</DialogDescription>
              </DialogHeader>

              <div className="relative mx-auto w-48 h-48 mb-6">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className="text-primary"
                    strokeDasharray={2 * Math.PI * 88}
                    strokeDashoffset={2 * Math.PI * 88 * (1 - timerProgress / 100)}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-display font-bold" data-testid="text-timer">
                    {formatTime(timeRemaining)}
                  </span>
                  <span className="text-sm text-muted-foreground">remaining</span>
                </div>
              </div>

              <div className="flex justify-center gap-3 mb-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTimerRunning(!timerRunning)}
                  data-testid="button-timer-toggle"
                >
                  {timerRunning ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setTimeRemaining(timerDuration);
                    setTimerRunning(false);
                  }}
                  data-testid="button-timer-reset"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {timeRemaining === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Volume2 className="w-5 h-5" />
                    <span className="font-medium">Time's up!</span>
                  </div>
                  <Button onClick={() => setPhase("complete")} className="gap-2" data-testid="button-timer-done">
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}

              {timeRemaining > 0 && (
                <Button 
                  variant="ghost" 
                  onClick={() => setPhase("complete")}
                  className="mt-4"
                >
                  End early and finish
                </Button>
              )}
            </motion.div>
          )}

          {phase === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center"
              >
                <Sparkles className="w-10 h-10 text-white" />
              </motion.div>

              <DialogHeader className="mb-6">
                <DialogTitle className="font-display text-2xl text-primary">
                  Amazing work!
                </DialogTitle>
                <DialogDescription className="text-base">
                  You've completed your {habit.title} session. Keep up the momentum!
                </DialogDescription>
              </DialogHeader>

              <Card className="mb-6 border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Heart className="w-5 h-5 fill-current" />
                    <span className="font-medium">You're building something great</span>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={finishSession} className="w-full gap-2" data-testid="button-finish-session">
                <Check className="w-4 h-4" />
                Mark Today Complete
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
