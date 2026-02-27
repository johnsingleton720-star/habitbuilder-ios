import { useState, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Flame, Loader2, Sparkles, Target, Calendar, Clock, Play, Check, CheckCircle2, Pencil, Save, X, ChevronRight, Timer, MessageSquare, Lightbulb, RefreshCw, Link2, Unlink, Crown, ArrowRight, Trophy, RotateCcw, CalendarPlus, AlertCircle, SkipForward, Lock, TrendingDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isFuture, isPast, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { Habit, DailyPlan, RoutineTask } from "@shared/schema";
import { HabitSetupWizard } from "@/components/HabitSetupWizard";
import { GuidedSession } from "@/components/GuidedSession";
import { TaskGuidanceModal } from "@/components/TaskGuidanceModal";
import { CoachingCheckin } from "@/components/CoachingCheckin";
import { DailyMotivation } from "@/components/DailyMotivation";
import { StreakProtection } from "@/components/StreakProtection";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSubscription } from "@/hooks/use-subscription";
import { UpgradePrompt } from "@/components/UpgradePrompt";

export default function HabitDetail() {
  usePageTitle("Habit Details", "View your habit action plan, guided sessions, and detailed progress tracking.");
  const [, params] = useRoute("/habit/:id");
  const habitId = Number(params?.id);
  const queryClient = useQueryClient();
  const { features, isFreeUser } = useSubscription();
  const [, navigate] = useLocation();
  
  const [setupWizardOpen, setSetupWizardOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.habitId === habitId) {
        setSessionOpen(true);
      }
    };
    window.addEventListener('auto-start-session', handler);
    return () => window.removeEventListener('auto-start-session', handler);
  }, [habitId]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [guidanceTask, setGuidanceTask] = useState<RoutineTask | null>(null);
  const [showPlanTypeChanger, setShowPlanTypeChanger] = useState(false);
  const [newPlanDuration, setNewPlanDuration] = useState<string>("");
  const { toast } = useToast();
  
  const { data: habit, isLoading, isError, error, refetch } = useQuery<Habit>({
    queryKey: ["/api/habits", habitId],
    enabled: !isNaN(habitId) && habitId > 0,
  });

  const { data: allHabits } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
  });

  const { data: habitStacks } = useQuery<any[]>({
    queryKey: ["/api/habit-stacks"],
    enabled: features.hasHabitStacking,
  });

  const { data: sessionUsage } = useQuery<{ unlimited: boolean; used: number; limit: number; resetsAt?: string }>({
    queryKey: ["/api/free-session-usage"],
    enabled: isFreeUser,
  });

  const linkHabitMutation = useMutation({
    mutationFn: async (linkedHabitId: number) => {
      const res = await apiRequest("POST", `/api/habits/${habitId}/link`, { linkedHabitId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits", habitId] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      toast({ title: "Habits linked", description: "Your habit stack has been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Could not link habits", description: err?.message || "Please try again.", variant: "destructive" });
    },
  });

  const unlinkHabitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/habits/${habitId}/link`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits", habitId] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      toast({ title: "Link removed", description: "Habit has been unlinked." });
    },
    onError: () => {
      toast({ title: "Could not unlink", description: "Please try again.", variant: "destructive" });
    },
  });

  const regeneratePlanMutation = useMutation({
    mutationFn: async (duration: string) => {
      const res = await apiRequest("POST", `/api/habits/${habitId}/regenerate-plan`, { duration });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits", habitId] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      setShowPlanTypeChanger(false);
      setSelectedDay(null);
      toast({
        title: "Plan updated",
        description: "Your plan has been regenerated with the new schedule.",
      });
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Could not regenerate your plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const adjustPlanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/habits/${habitId}/adjust-plan`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits", habitId] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      setSelectedDay(null);
      toast({
        title: "Plan adjusted",
        description: data.adjustmentSummary || "Your plan has been adapted to better fit your needs.",
      });
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Could not adjust your plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const extendPlanMutation = useMutation({
    mutationFn: async (duration: string) => {
      const res = await apiRequest("POST", `/api/habits/${habitId}/extend-plan`, { duration });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits", habitId] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      setSelectedDay(null);
      toast({
        title: "Plan extended",
        description: "New days have been added to your plan. Keep up the momentum!",
      });
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Could not extend your plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed, skipped, notes, timeSpent }: { taskId: string; completed?: boolean; skipped?: boolean; notes?: string; timeSpent?: number }) => {
      const res = await apiRequest("PATCH", `/api/habits/${habitId}/tasks/${taskId}`, { completed, skipped, notes, timeSpent });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits", habitId] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/achievements"] });
    },
  });

  // Find today's plan or the next upcoming plan
  useEffect(() => {
    if (habit?.dailyPlans?.length && !selectedDay) {
      const today = format(new Date(), "yyyy-MM-dd");
      const todayPlan = habit.dailyPlans.find(p => p.date === today);
      if (todayPlan) {
        setSelectedDay(today);
      } else {
        const futurePlan = habit.dailyPlans.find(p => isFuture(parseISO(p.date)));
        if (futurePlan) {
          setSelectedDay(futurePlan.date);
        } else {
          setSelectedDay(habit.dailyPlans[0]?.date);
        }
      }
    }
  }, [habit?.dailyPlans, selectedDay]);

  // Auto-open setup wizard for new habits
  useEffect(() => {
    if (habit && !habit.setupComplete && !setupWizardOpen) {
      setSetupWizardOpen(true);
    }
  }, [habit?.setupComplete]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" data-testid="loader-habit" />
      </div>
    );
  }

  if (isError) {
    const is401 = error?.message?.includes("401");
    return (
      <div className="min-h-screen bg-gradient-subtle flex flex-col items-center justify-center p-4 gap-4">
        <h1 className="text-2xl font-bold" data-testid="text-habit-error">
          {is401 ? "Please sign in to view this habit" : "Unable to load habit"}
        </h1>
        <p className="text-muted-foreground text-center max-w-md" data-testid="text-habit-error-detail">
          {is401
            ? "Your session may have expired. Please sign in again."
            : "Something went wrong loading this habit. Please try again."}
        </p>
        <div className="flex gap-3">
          {!is401 && (
            <Button variant="outline" onClick={() => refetch()} data-testid="button-retry-habit">
              Try Again
            </Button>
          )}
          <Link href="/">
            <Button data-testid="button-back-home">Go Back Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!habit) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4" data-testid="text-habit-not-found">Habit not found</h1>
        <Link href="/">
          <Button data-testid="button-back-home">Go Back Home</Button>
        </Link>
      </div>
    );
  }

  const dailyPlans = (habit.dailyPlans || []) as DailyPlan[];
  const currentPlan = dailyPlans.find(p => p.date === selectedDay);
  const completedDays = dailyPlans.filter(p => p.completed || (p.tasks.length > 0 && p.tasks.every(t => t.completed))).length;
  const totalDays = dailyPlans.length;
  const overallProgress = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;
  
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const planEndDate = habit.planEndDate ? habit.planEndDate : dailyPlans.length > 0 ? dailyPlans[dailyPlans.length - 1].date : null;
  const lastDailyPlanDate = dailyPlans.length > 0 ? dailyPlans[dailyPlans.length - 1].date : null;
  const allDailyPlansExpired = habit.setupComplete && lastDailyPlanDate ? lastDailyPlanDate < todayStr : false;
  const isPlanExpired = habit.setupComplete ? ((planEndDate ? planEndDate < todayStr : false) || allDailyPlansExpired) : false;
  const isPlanFullyCompleted = totalDays > 0 && completedDays === totalDays;
  const isPlanDone = isPlanExpired || isPlanFullyCompleted;
  const isSelectedDayPast = selectedDay ? selectedDay < todayStr : false;
  const isSelectedDayToday = selectedDay === todayStr;
  
  const totalTasksInPlan = dailyPlans.reduce((sum, p) => sum + p.tasks.length, 0);
  const skippedTasksInPlan = dailyPlans.reduce((sum, p) => sum + p.tasks.filter(t => t.skipped).length, 0);
  const completedTasksInPlan = dailyPlans.reduce((sum, p) => sum + p.tasks.filter(t => t.completed).length, 0);
  const activeTasksInPlan = totalTasksInPlan - skippedTasksInPlan;
  const taskCompletionRate = activeTasksInPlan > 0 ? Math.round((completedTasksInPlan / activeTasksInPlan) * 100) : 0;

  const sessionLimitReached = isFreeUser && sessionUsage && !sessionUsage.unlimited && sessionUsage.used >= sessionUsage.limit;

  const handleToggleTask = (taskId: string, currentCompleted: boolean) => {
    updateTaskMutation.mutate({ 
      taskId, 
      completed: !currentCompleted,
      timeSpent: !currentCompleted ? 5 : 0, // Add 5 min when completing
    });
  };

  const handleSkipTask = (taskId: string) => {
    updateTaskMutation.mutate({ taskId, skipped: true });
  };

  const handleSaveNote = (taskId: string) => {
    updateTaskMutation.mutate({ taskId, notes: noteText });
    setEditingTask(null);
    setNoteText("");
  };

  const handleStartSession = () => {
    setSessionOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b safe-top">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/">
              <Button variant="ghost" className="gap-2" data-testid="button-back-home">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold truncate" data-testid="text-habit-title">
                {habit.title}
              </h1>
              {habit.description && (
                <p className="text-sm text-muted-foreground truncate">{habit.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <Badge variant="secondary" className="gap-1 hidden sm:flex">
              <Flame className="w-3 h-3" />
              {habit.currentStreak || 0} day streak
            </Badge>
            {habit.setupComplete && (
              <CoachingCheckin habitId={habitId} habitTitle={habit.title} />
            )}
            {habit.setupComplete && currentPlan && !isPlanDone && !isSelectedDayPast && (
              sessionLimitReached ? (
                <Button onClick={() => navigate("/paywall")} size="sm" className="gap-1 md:gap-2" data-testid="button-start-session-locked">
                  <Lock className="w-4 h-4" />
                  <span className="hidden sm:inline">Sessions Used</span>
                  <span className="sm:hidden">Locked</span>
                  <Crown className="w-3 h-3 text-amber-400" />
                </Button>
              ) : (
                <Button onClick={handleStartSession} size="sm" className="gap-1 md:gap-2" data-testid="button-start-session">
                  <Play className="w-4 h-4" />
                  <span className="hidden sm:inline">Start Session</span>
                  <span className="sm:hidden">Start</span>
                </Button>
              )
            )}
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {isFreeUser && sessionUsage && !sessionUsage.unlimited && (
          <Card className="border-amber-200 dark:border-amber-800/50 bg-gradient-to-r from-amber-50/60 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/10" data-testid="card-session-tracker">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-8 h-8 rounded-md flex items-center justify-center border transition-colors",
                          i < sessionUsage.used
                            ? "bg-primary/15 border-primary/30 text-primary"
                            : "bg-muted/50 border-border text-muted-foreground"
                        )}
                        data-testid={`session-slot-${i}`}
                      >
                        {i < sessionUsage.used ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Play className="w-3.5 h-3.5 opacity-40" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {sessionUsage.used >= 3
                        ? "All sessions used this week"
                        : `${3 - sessionUsage.used} session${3 - sessionUsage.used !== 1 ? 's' : ''} left this week`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sessionUsage.used >= 3
                        ? "New sessions available Monday"
                        : "Free plan: 3 sessions per week"}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate("/paywall")}
                  className="gap-1.5"
                  data-testid="button-upgrade-sessions"
                >
                  <Crown className="w-3.5 h-3.5" />
                  Unlimited Sessions
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Setup Not Complete Message */}
        {!habit.setupComplete && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6 text-center">
              <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Let's personalize your journey</h3>
              <p className="text-muted-foreground mb-4">
                Answer a few questions to create your personalized action plan.
              </p>
              <Button onClick={() => setSetupWizardOpen(true)} className="gap-2" data-testid="button-setup-habit">
                <Sparkles className="w-4 h-4" />
                Start Setup
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Plan Completed/Expired Banner */}
        {habit.setupComplete && isPlanDone && dailyPlans.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className={cn(
              "border-2",
              isPlanFullyCompleted 
                ? "border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10" 
                : "border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20"
            )}>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.6 }}
                    className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center mx-auto",
                      isPlanFullyCompleted 
                        ? "bg-gradient-to-br from-primary/20 to-accent/20" 
                        : "bg-amber-100 dark:bg-amber-900/30"
                    )}
                  >
                    {isPlanFullyCompleted ? (
                      <Trophy className="w-8 h-8 text-primary" />
                    ) : (
                      <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                    )}
                  </motion.div>
                  
                  <div>
                    <h3 className="text-lg font-display font-bold">
                      {isPlanFullyCompleted ? "Plan Completed!" : "Plan Period Ended"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isPlanFullyCompleted 
                        ? `Amazing work! You completed ${completedDays} of ${totalDays} days with ${taskCompletionRate}% of all tasks done.`
                        : `This ${habit.planDuration} plan ran from ${habit.planStartDate} to ${planEndDate}. You completed ${completedDays} of ${totalDays} days (${taskCompletionRate}% of tasks).`
                      }
                    </p>
                  </div>

                  <div className="w-full bg-muted/50 rounded-full h-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${overallProgress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={cn(
                        "h-full rounded-full",
                        overallProgress === 100 
                          ? "bg-gradient-to-r from-primary to-accent" 
                          : "bg-gradient-to-r from-amber-400 to-orange-500"
                      )}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{completedDays}/{totalDays} days completed</p>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    {isFreeUser ? (
                      <UpgradePrompt
                        variant="card"
                        feature="Plan Management"
                        description="Extend or refresh your plans with Pro. Upgrade to unlock plan management features."
                      />
                    ) : (
                      <>
                        <Button
                          onClick={() => {
                            const extDuration = habit.planDuration === "daily" ? "weekly" : (habit.planDuration || "weekly");
                            extendPlanMutation.mutate(extDuration);
                          }}
                          disabled={extendPlanMutation.isPending}
                          className="flex-1 gap-2"
                          data-testid="button-extend-plan"
                        >
                          {extendPlanMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CalendarPlus className="w-4 h-4" />
                          )}
                          Extend Plan
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setNewPlanDuration(habit.planDuration || "weekly");
                            setShowPlanTypeChanger(true);
                          }}
                          className="flex-1 gap-2"
                          data-testid="button-start-fresh"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Start Fresh
                        </Button>
                      </>
                    )}
                  </div>

                  <AnimatePresence>
                    {showPlanTypeChanger && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 p-4 bg-muted/30 rounded-lg space-y-3">
                          <p className="text-sm text-muted-foreground text-left">
                            Choose a plan duration and regenerate with fresh tasks based on your original interview answers.
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                            <Select value={newPlanDuration} onValueChange={setNewPlanDuration}>
                              <SelectTrigger className="w-full sm:w-48" data-testid="select-fresh-plan-duration">
                                <SelectValue placeholder="Select plan type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily" data-testid="option-fresh-daily">Daily (1 day)</SelectItem>
                                <SelectItem value="weekly" data-testid="option-fresh-weekly">Weekly (7 days)</SelectItem>
                                <SelectItem value="monthly" data-testid="option-fresh-monthly">Monthly (30 days)</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => regeneratePlanMutation.mutate(newPlanDuration)}
                                disabled={regeneratePlanMutation.isPending || !newPlanDuration}
                                data-testid="button-regenerate-fresh"
                              >
                                {regeneratePlanMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                  <Sparkles className="w-4 h-4 mr-1" />
                                )}
                                Generate New Plan
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowPlanTypeChanger(false)}
                                data-testid="button-cancel-fresh"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Daily Motivation from AI Coach */}
        {habit.setupComplete && (
          <DailyMotivation habitId={habitId} />
        )}

        {/* Streak Protection for Premium Users */}
        {habit.setupComplete && (habit.currentStreak || 0) > 0 && (
          <StreakProtection 
            habit={{
              id: habit.id,
              title: habit.title,
              currentStreak: habit.currentStreak || 0,
              streakFreezeUsed: habit.streakFreezeUsed,
              streakFreezeMonth: habit.streakFreezeMonth,
            }}
          />
        )}

        {/* Habit Stacking (Premium Feature) */}
        {habit.setupComplete && (
          <HabitStackInfo habitId={habitId} features={features} />
        )}

        {/* Smart Plan Adjustment Banner */}
        {(() => {
          if (!habit.setupComplete || isPlanDone || isFreeUser) return null;
          const pastDays = dailyPlans.filter(p => p.date <= todayStr);
          if (pastDays.length < 5) return null;
          const pastActiveTasks = pastDays.reduce((sum, p) => sum + p.tasks.filter(t => !t.skipped).length, 0);
          const pastCompletedTasks = pastDays.reduce((sum, p) => sum + p.tasks.filter(t => t.completed).length, 0);
          const pastRate = pastActiveTasks > 0 ? (pastCompletedTasks / pastActiveTasks) * 100 : 100;
          if (pastRate >= 40) return null;
          const hasFutureDays = dailyPlans.some(p => p.date > todayStr);
          if (!hasFutureDays) return null;
          return (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-amber-500/30 bg-gradient-to-r from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10" data-testid="card-adjust-plan">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mt-0.5">
                      <TrendingDown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" data-testid="text-adjust-plan-title">
                        This plan doesn't seem to be fitting your schedule
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Your completion rate is {Math.round(pastRate)}% after {pastDays.length} days. The AI can redesign your remaining days to be easier and better adapted to your patterns.
                      </p>
                      <Button
                        size="sm"
                        className="mt-3 gap-2"
                        onClick={() => adjustPlanMutation.mutate()}
                        disabled={adjustPlanMutation.isPending}
                        data-testid="button-adjust-plan"
                      >
                        {adjustPlanMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        {adjustPlanMutation.isPending ? "Adjusting..." : "Adjust My Plan"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })()}

        {/* Progress Overview */}
        {habit.setupComplete && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{completedDays}/{totalDays}</p>
                    <p className="text-sm text-muted-foreground">Days done</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{taskCompletionRate}%</p>
                    <p className="text-sm text-muted-foreground">Tasks done</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Timer className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{habit.totalTimeSpent || 0}m</p>
                    <p className="text-sm text-muted-foreground">Time spent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Flame className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{habit.longestStreak || 0}d</p>
                    <p className="text-sm text-muted-foreground">Best streak</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Daily Plans */}
        {habit.setupComplete && dailyPlans.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Your {habit.planDuration} Plan
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {habit.planStartDate} to {habit.planEndDate}
                    {habit.schedule?.days && habit.schedule.days.length > 0 && (
                      <span className="block mt-0.5">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {habit.schedule.days.map((d: string) => d.charAt(0).toUpperCase() + d.slice(0, 3)).join(", ")}
                        {habit.schedule.time && (
                          <> at {new Date(`2000-01-01T${habit.schedule.time}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</>
                        )}
                      </span>
                    )}
                  </CardDescription>
                </div>
                {!showPlanTypeChanger && !isFreeUser && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewPlanDuration(habit.planDuration || "weekly");
                      setShowPlanTypeChanger(true);
                    }}
                    data-testid="button-change-plan-type"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Change Plan Type
                  </Button>
                )}
              </div>
              <AnimatePresence>
                {showPlanTypeChanger && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <Card className="mt-3 bg-muted/30">
                      <CardContent className="p-4 space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Switch your plan type and regenerate with fresh tasks. Your existing interview answers will be used to create the new plan.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                          <Select value={newPlanDuration} onValueChange={setNewPlanDuration}>
                            <SelectTrigger className="w-full sm:w-48" data-testid="select-plan-duration">
                              <SelectValue placeholder="Select plan type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily" data-testid="option-daily">Daily (1 day)</SelectItem>
                              <SelectItem value="weekly" data-testid="option-weekly">Weekly (7 days)</SelectItem>
                              <SelectItem value="monthly" data-testid="option-monthly">Monthly (30 days)</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => regeneratePlanMutation.mutate(newPlanDuration)}
                              disabled={regeneratePlanMutation.isPending || newPlanDuration === habit.planDuration}
                              data-testid="button-regenerate-plan"
                            >
                              {regeneratePlanMutation.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4 mr-2" />
                                  Regenerate Plan
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowPlanTypeChanger(false)}
                              disabled={regeneratePlanMutation.isPending}
                              data-testid="button-cancel-change-plan"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                        {newPlanDuration !== habit.planDuration && (
                          <p className="text-xs text-muted-foreground">
                            This will replace your current {habit.planDuration} plan with a new {newPlanDuration} plan. Your progress will be reset.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Day Selector */}
              {dailyPlans.length > 14 ? (
                <div className="space-y-3">
                  {(() => {
                    const weeks: DailyPlan[][] = [];
                    for (let i = 0; i < dailyPlans.length; i += 7) {
                      weeks.push(dailyPlans.slice(i, i + 7));
                    }
                    const selectedWeekIndex = weeks.findIndex(week =>
                      week.some(p => p.date === selectedDay)
                    );
                    const [activeWeek, setActiveWeekState] = [
                      selectedWeekIndex >= 0 ? selectedWeekIndex : 0,
                      (idx: number) => {
                        const firstDay = weeks[idx]?.[0];
                        if (firstDay) setSelectedDay(firstDay.date);
                      }
                    ];
                    return (
                      <>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {weeks.map((week, wIdx) => {
                            const weekCompleted = week.every(p => {
                              const active = p.tasks.filter(t => !t.skipped);
                              return p.completed || (active.length > 0 && active.every(t => t.completed));
                            });
                            const weekPartial = week.some(p => {
                              const active = p.tasks.filter(t => !t.skipped);
                              return p.completed || (active.length > 0 && active.every(t => t.completed));
                            });
                            const isActiveWeek = wIdx === (selectedWeekIndex >= 0 ? selectedWeekIndex : 0);
                            return (
                              <button
                                key={wIdx}
                                onClick={() => setActiveWeekState(wIdx)}
                                className={cn(
                                  "flex-shrink-0 px-3 py-1.5 rounded-md border text-sm transition-all",
                                  isActiveWeek
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-card border-border hover-elevate",
                                  weekCompleted && !isActiveWeek && "bg-primary/10 border-primary/30",
                                  weekPartial && !weekCompleted && !isActiveWeek && "border-primary/20"
                                )}
                                data-testid={`week-selector-${wIdx + 1}`}
                              >
                                Week {wIdx + 1}
                                {weekCompleted && <CheckCircle2 className="w-3 h-3 inline ml-1" />}
                              </button>
                            );
                          })}
                        </div>
                        <div className="grid grid-cols-7 gap-1.5">
                          {weeks[selectedWeekIndex >= 0 ? selectedWeekIndex : 0]?.map((plan, index) => {
                            const planDate = parseISO(plan.date);
                            const isSelected = plan.date === selectedDay;
                            const isDayPast = plan.date < todayStr;
                            const isDayToday = plan.date === todayStr;
                            const activeTasksMonthly = plan.tasks.filter(t => !t.skipped);
                            const isDayCompleted = activeTasksMonthly.length > 0 && activeTasksMonthly.every(t => t.completed) && plan.tasks.some(t => t.completed);
                            const tasksCompleted = plan.tasks.filter(t => t.completed).length;
                            const taskTotal = activeTasksMonthly.length;
                            const hasPartialProgress = tasksCompleted > 0 && !isDayCompleted;
                            return (
                              <button
                                key={plan.date}
                                onClick={() => setSelectedDay(plan.date)}
                                className={cn(
                                  "px-2 py-2 rounded-md border transition-all text-center relative",
                                  isSelected
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : isDayToday
                                    ? "bg-accent/20 border-primary/50 ring-1 ring-primary/30"
                                    : isDayCompleted
                                    ? "bg-primary/10 border-primary/30"
                                    : isDayPast
                                    ? "bg-muted/50 border-border/50 opacity-60"
                                    : "bg-card border-border hover-elevate",
                                )}
                                data-testid={`day-selector-${plan.dayNumber || index + 1}`}
                              >
                                <p className="text-xs opacity-70">Day {plan.dayNumber || index + 1}</p>
                                <p className="font-medium text-sm">{format(planDate, "MMM d")}</p>
                                {isDayCompleted ? (
                                  <CheckCircle2 className={cn("w-3 h-3 mx-auto mt-0.5", isSelected ? "text-primary-foreground" : "text-primary")} />
                                ) : hasPartialProgress ? (
                                  <span className={cn("text-[10px] font-medium mt-0.5 block", isSelected ? "text-primary-foreground" : "text-amber-600 dark:text-amber-400")}>{tasksCompleted}/{taskTotal}</span>
                                ) : isDayPast && !isSelected ? (
                                  <span className="text-[10px] text-muted-foreground mt-0.5 block">missed</span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {dailyPlans.map((plan, index) => {
                    const planDate = parseISO(plan.date);
                    const isSelected = plan.date === selectedDay;
                    const isDayPast = plan.date < todayStr;
                    const isDayToday = plan.date === todayStr;
                    const activeTasks = plan.tasks.filter(t => !t.skipped);
                    const isDayCompleted = plan.completed || (activeTasks.length > 0 && activeTasks.every(t => t.completed));
                    const tasksCompleted = plan.tasks.filter(t => t.completed).length;
                    const taskTotal = activeTasks.length;
                    const hasPartialProgress = tasksCompleted > 0 && !isDayCompleted;
                    
                    return (
                      <button
                        key={plan.date}
                        onClick={() => setSelectedDay(plan.date)}
                        className={cn(
                          "flex-shrink-0 px-4 py-2 rounded-lg border transition-all",
                          isSelected 
                            ? "bg-primary text-primary-foreground border-primary" 
                            : isDayToday
                            ? "bg-accent/20 border-primary/50 ring-1 ring-primary/30"
                            : isDayCompleted
                            ? "bg-primary/10 border-primary/30"
                            : isDayPast
                            ? "bg-muted/50 border-border/50 opacity-60"
                            : "bg-card border-border hover-elevate",
                        )}
                        data-testid={`day-selector-${index + 1}`}
                      >
                        <div className="text-center">
                          <p className="text-xs opacity-70">Day {index + 1}</p>
                          <p className="font-medium">{format(planDate, "MMM d")}</p>
                          {isDayCompleted ? (
                            <CheckCircle2 className={cn("w-3 h-3 mx-auto mt-1", isSelected ? "text-primary-foreground" : "text-primary")} />
                          ) : hasPartialProgress ? (
                            <span className={cn("text-[10px] font-medium mt-1 block", isSelected ? "text-primary-foreground" : "text-amber-600 dark:text-amber-400")}>{tasksCompleted}/{taskTotal}</span>
                          ) : isDayPast && !isSelected ? (
                            <span className="text-[10px] text-muted-foreground mt-1 block">missed</span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Current Day Tasks */}
              {currentPlan && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        {isToday(parseISO(currentPlan.date)) ? "Today's Tasks" : `Tasks for ${format(parseISO(currentPlan.date), "MMMM d")}`}
                        {currentPlan.date < todayStr && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">Past</Badge>
                        )}
                        {isToday(parseISO(currentPlan.date)) && (
                          <Badge variant="outline" className="text-xs border-primary/30 text-primary">Today</Badge>
                        )}
                      </h4>
                      {currentPlan.focus && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          Focus: {currentPlan.focus}
                        </p>
                      )}
                    </div>
                    {(() => {
                      const dayCompleted = currentPlan.tasks.filter(t => t.completed).length;
                      const daySkipped = currentPlan.tasks.filter(t => t.skipped).length;
                      const dayActive = currentPlan.tasks.length - daySkipped;
                      const dayPct = dayActive > 0 ? Math.round((dayCompleted / dayActive) * 100) : 0;
                      const isDayDone = dayCompleted === dayActive && dayActive > 0;
                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full transition-all", isDayDone ? "bg-primary" : "bg-amber-500")}
                              style={{ width: `${dayPct}%` }}
                            />
                          </div>
                          <Badge variant={isDayDone ? "default" : "secondary"}>
                            {dayCompleted}/{dayActive} complete
                            {daySkipped > 0 && ` (${daySkipped} skipped)`}
                          </Badge>
                        </div>
                      );
                    })()}
                  </div>

                  <AnimatePresence mode="popLayout">
                    {currentPlan.tasks.map((task, index) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className={cn(
                          "transition-all",
                          task.completed && "bg-primary/5 border-primary/30 opacity-75",
                          task.skipped && "opacity-60"
                        )}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => {
                                  if (isFreeUser) return;
                                  if (task.skipped) {
                                    updateTaskMutation.mutate({ taskId: task.id, skipped: false });
                                  } else {
                                    handleToggleTask(task.id, task.completed);
                                  }
                                }}
                                className={cn(
                                  "mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                  task.completed
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : task.skipped
                                    ? "bg-muted border-muted-foreground/20 text-muted-foreground"
                                    : isFreeUser
                                    ? "border-muted-foreground/15 cursor-not-allowed"
                                    : "border-muted-foreground/30 hover:border-primary/50"
                                )}
                                disabled={isFreeUser}
                                data-testid={`checkbox-task-${task.id}`}
                              >
                                {task.completed && <Check className="w-3.5 h-3.5" />}
                                {task.skipped && <SkipForward className="w-3 h-3" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className={cn(
                                      "font-medium",
                                      task.completed && "line-through text-muted-foreground",
                                      task.skipped && "line-through text-muted-foreground"
                                    )}>
                                      {task.title}
                                    </p>
                                    {!task.completed && !task.skipped && (
                                      isFreeUser ? (
                                        <div className="mt-1 relative">
                                          <p className="text-sm text-muted-foreground whitespace-pre-line blur-[6px] select-none pointer-events-none" aria-hidden="true">
                                            {task.description}
                                          </p>
                                          <div className="absolute inset-0 flex items-center justify-center">
                                            <Badge variant="outline" className="gap-1 text-xs bg-background/80 backdrop-blur-sm text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                                              <Lock className="w-3 h-3" />
                                              Start a session to view
                                            </Badge>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                                          {task.description}
                                        </p>
                                      )
                                    )}
                                  </div>
                                  <Badge variant={task.completed ? "secondary" : task.skipped ? "outline" : "outline"} className="flex-shrink-0">
                                    {task.completed ? (
                                      <>
                                        <Check className="w-3 h-3 mr-1" />
                                        Done
                                      </>
                                    ) : task.skipped ? (
                                      <>
                                        <SkipForward className="w-3 h-3 mr-1" />
                                        Skipped
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="w-3 h-3 mr-1" />
                                        {task.duration} min
                                      </>
                                    )}
                                  </Badge>
                                </div>

                                {!task.completed && !task.skipped && !isFreeUser && (
                                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-2"
                                      onClick={() => setGuidanceTask(task)}
                                      data-testid={`button-guidance-${task.id}`}
                                    >
                                      <Lightbulb className="w-3 h-3" />
                                      Get Examples & Resources
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="gap-1.5 text-muted-foreground"
                                      onClick={() => handleSkipTask(task.id)}
                                      data-testid={`button-skip-${task.id}`}
                                    >
                                      <SkipForward className="w-3 h-3" />
                                      Skip
                                    </Button>
                                  </div>
                                )}

                                {/* Notes */}
                                {editingTask === task.id ? (
                                  <div className="mt-3 space-y-2">
                                    <Textarea
                                      value={noteText}
                                      onChange={(e) => setNoteText(e.target.value)}
                                      placeholder="Add your notes, reflections, or progress..."
                                      className="min-h-[80px]"
                                      data-testid={`input-task-notes-${task.id}`}
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => handleSaveNote(task.id)}
                                        disabled={updateTaskMutation.isPending}
                                        data-testid={`button-save-notes-${task.id}`}
                                      >
                                        <Save className="w-3 h-3 mr-1" />
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingTask(null);
                                          setNoteText("");
                                        }}
                                      >
                                        <X className="w-3 h-3 mr-1" />
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-2">
                                    {task.notes ? (
                                      <div 
                                        className="text-sm bg-muted/50 p-2 rounded cursor-pointer hover:bg-muted"
                                        onClick={() => {
                                          setEditingTask(task.id);
                                          setNoteText(task.notes || "");
                                        }}
                                      >
                                        <MessageSquare className="w-3 h-3 inline mr-1 text-muted-foreground" />
                                        {task.notes}
                                      </div>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground"
                                        onClick={() => {
                                          setEditingTask(task.id);
                                          setNoteText("");
                                        }}
                                        data-testid={`button-add-notes-${task.id}`}
                                      >
                                        <Pencil className="w-3 h-3 mr-1" />
                                        Add notes
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Next in Stack Prompt - shown when all tasks are done and habit is in a stack */}
                  {(() => {
                    const anyCompleted = currentPlan.tasks.some(t => t.completed);
                    const allResolved = currentPlan.tasks.length > 0 && currentPlan.tasks.every(t => t.completed || t.skipped);
                    const dayDone = allResolved && anyCompleted;
                    if (!dayDone) return null;

                    const myStack = habitStacks?.find(s => (s.habitIds as number[])?.includes(habitId));
                    if (!myStack) return null;

                    const order = (myStack.habitOrder || []) as any[];
                    const myIdx = order.findIndex((o: any) => o.habitId === habitId);
                    if (myIdx < 0 || myIdx >= order.length - 1) return null;

                    const nextInStack = order[myIdx + 1];
                    const nextHabit = allHabits?.find(h => h.id === nextInStack.habitId);
                    if (!nextHabit) return null;

                    const linkedPlans = (nextHabit.dailyPlans || []) as DailyPlan[];
                    const linkedTodayPlan = linkedPlans.find(p => p.date === todayStr);
                    const linkedActiveTasks = linkedTodayPlan ? linkedTodayPlan.tasks.filter(t => !t.skipped) : [];
                    const linkedDone = linkedActiveTasks.length > 0 && linkedActiveTasks.every(t => t.completed);

                    if (linkedDone) return null;

                    const plan = myStack.stackPlan as any;
                    const transition = plan?.transitions?.find((t: any) => t.fromHabitId === habitId && t.toHabitId === nextHabit.id);

                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <ArrowRight className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-muted-foreground" data-testid="text-next-in-stack">Next in "{myStack.name}"</p>
                                <p className="font-semibold truncate" data-testid="text-stacked-habit-title">{nextHabit.title}</p>
                                {transition?.note && (
                                  <p className="text-xs text-muted-foreground mt-0.5 italic">{transition.note}</p>
                                )}
                                {linkedTodayPlan && linkedActiveTasks.length > 0 ? (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {linkedActiveTasks.filter(t => t.completed).length}/{linkedActiveTasks.length} tasks done
                                  </p>
                                ) : !linkedTodayPlan && nextHabit.setupComplete ? (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Not scheduled today
                                  </p>
                                ) : null}
                              </div>
                              <Link href={`/habit/${nextHabit.id}`}>
                                <Button className="gap-1.5" data-testid="button-go-to-stacked-habit">
                                  <Play className="w-4 h-4" />
                                  {linkedTodayPlan ? "Start" : "View"}
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* AI Context Summary */}
        {habit.aiContext && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="w-4 h-4" />
                Your Personalized Approach
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{habit.aiContext}</p>
            </CardContent>
          </Card>
        )}

        {/* Progress History */}
        {habit.progress && habit.progress.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Progress History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {habit.progress.slice(-5).reverse().map((entry, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium">{format(parseISO(entry.date), "MMMM d, yyyy")}</p>
                      {entry.notes && (
                        <p className="text-sm text-muted-foreground">{entry.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{entry.tasksCompleted}/{entry.totalTasks} tasks</p>
                      <p className="text-sm text-muted-foreground">{entry.timeSpent} min</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Setup Wizard */}
      {habit && (
        <HabitSetupWizard
          habit={habit}
          open={setupWizardOpen}
          onOpenChange={setSetupWizardOpen}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/habits", habitId] });
          }}
        />
      )}

      {/* Guided Session */}
      {habit && currentPlan && (
        <GuidedSession
          habit={habit}
          open={sessionOpen}
          onOpenChange={setSessionOpen}
          nextInStack={(() => {
            const myStack = habitStacks?.find(s => (s.habitIds as number[])?.includes(habitId));
            if (!myStack) return null;
            const order = (myStack.habitOrder || []) as any[];
            const myIdx = order.findIndex((o: any) => o.habitId === habitId);
            if (myIdx < 0 || myIdx >= order.length - 1) return null;
            const next = order[myIdx + 1];
            const plan = myStack.stackPlan as any;
            const transition = plan?.transitions?.find((t: any) => t.fromHabitId === habitId && t.toHabitId === next.habitId);
            return { habitId: next.habitId, habitTitle: next.habitTitle, transitionNote: transition?.note };
          })()}
          onStartNextInStack={(nextId) => {
            navigate(`/habit/${nextId}`);
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('auto-start-session', { detail: { habitId: nextId } }));
            }, 500);
          }}
        />
      )}

      {/* Task Guidance Modal */}
      {habit && guidanceTask && (
        <TaskGuidanceModal
          habitId={habit.id}
          task={guidanceTask}
          habitTitle={habit.title}
          open={!!guidanceTask}
          onOpenChange={(open) => !open && setGuidanceTask(null)}
        />
      )}
    </div>
  );
}

function HabitStackInfo({ habitId, features }: { habitId: number; features: any }) {
  const { data: stacks } = useQuery<any[]>({
    queryKey: ["/api/habit-stacks"],
    enabled: features.hasHabitStacking,
  });

  const myStacks = stacks?.filter(s => (s.habitIds as number[])?.includes(habitId)) || [];

  return (
    <Card data-testid="card-habit-stacking">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="w-4 h-4 text-primary" />
            Habit Stacking
          </CardTitle>
          {!features.hasHabitStacking && (
            <Badge variant="secondary" className="gap-1">
              <Crown className="w-3 h-3" />
              Premium
            </Badge>
          )}
        </div>
        <CardDescription>
          This habit's position in your stacks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!features.hasHabitStacking ? (
          <div className="text-center py-3">
            <p className="text-sm text-muted-foreground mb-3">
              Chain habits together with habit stacking. Build powerful routines that flow naturally.
            </p>
            <Link href="/account">
              <Button variant="outline" size="sm" data-testid="button-upgrade-stacking">
                <Crown className="w-4 h-4 mr-1" />
                Upgrade to Premium
              </Button>
            </Link>
          </div>
        ) : myStacks.length === 0 ? (
          <div className="text-center py-3">
            <p className="text-sm text-muted-foreground">
              This habit isn't in any stacks yet. Go to your Dashboard to create stacks.
            </p>
            <Link href="/">
              <Button variant="outline" size="sm" className="mt-2" data-testid="link-go-to-stacks">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        ) : (
          myStacks.map((stack: any) => {
            const order = (stack.habitOrder || []) as any[];
            const myIndex = order.findIndex((o: any) => o.habitId === habitId);
            const prevHabit = myIndex > 0 ? order[myIndex - 1] : null;
            const nextHabit = myIndex < order.length - 1 ? order[myIndex + 1] : null;

            return (
              <div key={stack.id} className="p-3 bg-muted/50 rounded-lg space-y-2" data-testid={`stack-info-${stack.id}`}>
                <p className="text-sm font-medium">{stack.name}</p>
                <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                  {order.map((item: any, idx: number) => (
                    <span key={item.habitId} className="flex items-center gap-1.5">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded",
                        item.habitId === habitId ? "bg-primary/10 text-primary font-medium" : ""
                      )}>
                        {item.habitTitle}
                      </span>
                      {idx < order.length - 1 && <ArrowRight className="w-3 h-3 shrink-0" />}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {prevHabit && (
                    <Link href={`/habit/${prevHabit.habitId}`}>
                      <Button variant="ghost" size="sm" className="text-xs gap-1" data-testid={`link-prev-habit-${prevHabit.habitId}`}>
                        <ArrowLeft className="w-3 h-3" />
                        {prevHabit.habitTitle}
                      </Button>
                    </Link>
                  )}
                  {nextHabit && (
                    <Link href={`/habit/${nextHabit.habitId}`}>
                      <Button variant="ghost" size="sm" className="text-xs gap-1" data-testid={`link-next-habit-${nextHabit.habitId}`}>
                        {nextHabit.habitTitle}
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
