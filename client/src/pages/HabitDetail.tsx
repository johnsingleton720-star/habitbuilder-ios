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

function RecentlyAdjustedBanner({ habitId, summary }: { habitId: number; summary: string | null }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-emerald-500/40 bg-gradient-to-r from-emerald-50/60 to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/10" data-testid="card-recently-adjusted">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mt-0.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-emerald-800 dark:text-emerald-300" data-testid="text-recently-adjusted">
                Your plan was recently adjusted
              </p>
              {summary && (
                <p className="text-xs text-muted-foreground mt-0.5">{summary}</p>
              )}
            </div>
            <button
              onClick={() => {
                setDismissed(true);
                localStorage.removeItem(`habitAdjusted_${habitId}`);
                localStorage.removeItem(`habitAdjustedSummary_${habitId}`);
              }}
              className="flex-shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss"
              data-testid="button-dismiss-recently-adjusted"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const MISS_REASONS_OPTIONS = [
  { label: "Too busy", emoji: "⏰" },
  { label: "Forgot", emoji: "🧠" },
  { label: "Too tired", emoji: "😴" },
  { label: "Schedule conflict", emoji: "📅" },
  { label: "Didn't feel like it", emoji: "😶" },
  { label: "Other", emoji: "💬" },
] as const;

type MissReasonOption = typeof MISS_REASONS_OPTIONS[number]["label"];

const REASON_MESSAGES: Record<MissReasonOption, string> = {
  "Too busy": "Life gets hectic. The AI can lighten the load and find pockets of time that actually fit your day.",
  "Forgot": "Out of sight, out of mind. The AI can simplify your plan and add smaller cues to help it stick.",
  "Too tired": "Energy matters. The AI can scale back the intensity and schedule tasks when you're typically at your best.",
  "Schedule conflict": "Timing is everything. The AI can reschedule tasks around your existing commitments.",
  "Didn't feel like it": "Motivation ebbs and flows. The AI can redesign tasks to feel more engaging and achievable.",
  "Other": "The AI can take a fresh look at your plan and adapt it to work better for you.",
};

function MissedSessionsBanner({
  habitId,
  dailyPlans,
  todayStr,
  isPlanDone,
  setupComplete,
  isFreeUser,
  adjustPlanMutation,
  missReasons,
}: {
  habitId: number;
  dailyPlans: any[];
  todayStr: string;
  isPlanDone: boolean;
  setupComplete: boolean;
  isFreeUser: boolean;
  adjustPlanMutation: any;
  missReasons?: { reason: string; date: string }[];
}) {
  const todayReasonEntry = missReasons?.find(r => r.date === todayStr);
  const [selectedReason, setSelectedReason] = useState<MissReasonOption | null>(
    () => (todayReasonEntry ? todayReasonEntry.reason as MissReasonOption : null)
  );
  const [dismissed, setDismissed] = useState(false);
  const queryClient = useQueryClient();

  if (!setupComplete || isPlanDone || dismissed) return null;

  const lastAdjusted = localStorage.getItem(`habitAdjusted_${habitId}`);
  if (lastAdjusted && Date.now() - Number(lastAdjusted) < 7 * 24 * 60 * 60 * 1000) return null;

  const hasFutureDays = dailyPlans.some((p: any) => p.date > todayStr);
  if (!hasFutureDays) return null;

  const pastDaysSorted = [...dailyPlans.filter((p: any) => p.date <= todayStr)]
    .sort((a: any, b: any) => b.date.localeCompare(a.date));

  let consecutiveMissed = 0;
  for (const plan of pastDaysSorted) {
    const tasks = plan.tasks || [];
    const hasActiveTasks = tasks.some((t: any) => !t.skipped);
    if (hasActiveTasks && tasks.some((t: any) => !t.completed && !t.skipped)) {
      consecutiveMissed++;
    } else {
      break;
    }
  }
  if (consecutiveMissed < 2) return null;

  const handleSaveReason = async (reason: MissReasonOption) => {
    setSelectedReason(reason);
    try {
      await apiRequest("POST", `/api/habits/${habitId}/streak-miss-reason`, { reason });
      queryClient.invalidateQueries({ queryKey: ["/api/habits", habitId] });
    } catch {}
  };

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-amber-500/30 bg-gradient-to-r from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10" data-testid="card-adjust-plan">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mt-0.5">
              <TrendingDown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              {!selectedReason ? (
                <>
                  <p className="font-bold text-sm" data-testid="text-missed-sessions-title">
                    You've missed a few sessions — what's been getting in the way?
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                    Tap a reason so the AI can suggest a better-fitting plan.
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {MISS_REASONS_OPTIONS.map(({ label, emoji }) => (
                      <button
                        key={label}
                        onClick={() => handleSaveReason(label)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-white/60 dark:bg-amber-950/30 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors text-left"
                        data-testid={`button-miss-reason-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                      >
                        <span className="text-base leading-none">{emoji}</span>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="font-bold text-sm" data-testid="text-adjust-plan-title">
                    Got it — the AI can fix that
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5 mb-3">
                    {REASON_MESSAGES[selectedReason]}
                  </p>
                  {isFreeUser ? (
                    <p className="text-xs text-muted-foreground italic">
                      Upgrade to Pro to let the AI redesign your plan based on your feedback.
                    </p>
                  ) : (
                    <Button
                      size="sm"
                      className="gap-2"
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
                  )}
                </>
              )}
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="flex-shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              aria-label="Dismiss"
              data-testid="button-dismiss-missed-sessions"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function HabitDetail() {
  usePageTitle("Habit Details", "View your habit action plan, guided sessions, and detailed progress tracking.");
  const [, params] = useRoute("/habit/:id");
  const habitId = Number(params?.id);
  const queryClient = useQueryClient();
  const { features, isFreeUser } = useSubscription();
  const [, navigate] = useLocation();

  const urlDate = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("date")
    : null;
  
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
      queryClient.invalidateQueries({ queryKey: ["/api/habits/needs-adjustment"] });
      localStorage.setItem(`habitAdjusted_${habitId}`, Date.now().toString());
      localStorage.setItem(`habitAdjustedSummary_${habitId}`, data.adjustmentSummary || "");
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
      queryClient.invalidateQueries({ queryKey: ["/api/habits/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/achievements"] });
    },
  });

  // Find today's plan or the next upcoming plan, respecting URL date parameter
  useEffect(() => {
    if (habit?.dailyPlans?.length && !selectedDay) {
      if (urlDate) {
        const urlPlan = habit.dailyPlans.find(p => p.date === urlDate);
        if (urlPlan) {
          setSelectedDay(urlDate);
          return;
        }
      }
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
  }, [habit?.dailyPlans, selectedDay, urlDate]);

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
              <h1 className="font-display text-2xl font-bold truncate" data-testid="text-habit-title">
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
                    <p className="text-base font-semibold text-foreground">
                      {sessionUsage.used >= 3
                        ? "All sessions used this week"
                        : `${3 - sessionUsage.used} session${3 - sessionUsage.used !== 1 ? 's' : ''} left this week`}
                    </p>
                    <p className="text-base text-muted-foreground">
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
              <h3 className="text-lg font-bold mb-2">Let's personalize your journey</h3>
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
                  <p className="text-sm text-muted-foreground">{completedDays}/{totalDays} days completed</p>

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

        {/* Recently Adjusted confirmation banner */}
        {(() => {
          const lastAdjustedTs = localStorage.getItem(`habitAdjusted_${habitId}`);
          if (!lastAdjustedTs) return null;
          if (Date.now() - Number(lastAdjustedTs) > 24 * 60 * 60 * 1000) return null;
          const summary = localStorage.getItem(`habitAdjustedSummary_${habitId}`);
          return (
            <RecentlyAdjustedBanner habitId={habitId} summary={summary} />
          );
        })()}

        {/* Smart Plan Adjustment Banner — two-step: why missed → adjust */}
        <MissedSessionsBanner
          habitId={habitId}
          dailyPlans={dailyPlans}
          todayStr={todayStr}
          isPlanDone={isPlanDone}
          setupComplete={!!habit.setupComplete}
          isFreeUser={isFreeUser}
          adjustPlanMutation={adjustPlanMutation}
          missReasons={(habit.missReasons as { reason: string; date: string }[] | null) ?? []}
        />

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
                        {habit.schedule.days.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(", ")}
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
                          <p className="text-sm text-muted-foreground">
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
                                <p className="text-sm opacity-70">Day {plan.dayNumber || index + 1}</p>
                                <p className="font-semibold text-sm">{format(planDate, "MMM d")}</p>
                                {isDayCompleted ? (
                                  <CheckCircle2 className={cn("w-3 h-3 mx-auto mt-0.5", isSelected ? "text-primary-foreground" : "text-primary")} />
                                ) : hasPartialProgress ? (
                                  <span className={cn("text-xs font-semibold mt-0.5 block", isSelected ? "text-primary-foreground" : "text-amber-600 dark:text-amber-400")}>{tasksCompleted}/{taskTotal}</span>
                                ) : isDayPast && !isSelected ? (
                                  <span className="text-xs text-muted-foreground mt-0.5 block">missed</span>
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
                          <p className="text-sm opacity-70">Day {index + 1}</p>
                          <p className="font-semibold">{format(planDate, "MMM d")}</p>
                          {isDayCompleted ? (
                            <CheckCircle2 className={cn("w-3 h-3 mx-auto mt-1", isSelected ? "text-primary-foreground" : "text-primary")} />
                          ) : hasPartialProgress ? (
                            <span className={cn("text-xs font-semibold mt-1 block", isSelected ? "text-primary-foreground" : "text-amber-600 dark:text-amber-400")}>{tasksCompleted}/{taskTotal}</span>
                          ) : isDayPast && !isSelected ? (
                            <span className="text-xs text-muted-foreground mt-1 block">missed</span>
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
                      <h4 className="font-semibold flex items-center gap-2">
                        {isToday(parseISO(currentPlan.date)) ? "Today's Tasks" : `Tasks for ${format(parseISO(currentPlan.date), "MMMM d")}`}
                        {currentPlan.date < todayStr && (
                          <Badge variant="outline" className="text-sm text-muted-foreground">Past</Badge>
                        )}
                        {isToday(parseISO(currentPlan.date)) && (
                          <Badge variant="outline" className="text-sm border-primary/30 text-primary">Today</Badge>
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
                          <div className="w-16 h-2.5 rounded-full bg-muted/50 overflow-hidden">
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
                                          <p className="text-base text-muted-foreground whitespace-pre-line blur-[6px] select-none pointer-events-none" aria-hidden="true">
                                            {task.description}
                                          </p>
                                          <div className="absolute inset-0 flex items-center justify-center">
                                            <Badge variant="outline" className="gap-1 text-sm bg-background/80 backdrop-blur-sm text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                                              <Lock className="w-3 h-3" />
                                              Start a session to view
                                            </Badge>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-base text-muted-foreground mt-1 whitespace-pre-line">
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
                                        className="text-base bg-muted/50 p-2 rounded cursor-pointer hover:bg-muted"
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
                                <p className="text-sm font-semibold text-muted-foreground" data-testid="text-next-in-stack">Next in "{myStack.name}"</p>
                                <p className="font-bold truncate" data-testid="text-stacked-habit-title">{nextHabit.title}</p>
                                {transition?.note && (
                                  <p className="text-sm text-muted-foreground mt-0.5 italic">{transition.note}</p>
                                )}
                                {linkedTodayPlan && linkedActiveTasks.length > 0 ? (
                                  <p className="text-sm text-muted-foreground mt-0.5">
                                    {linkedActiveTasks.filter(t => t.completed).length}/{linkedActiveTasks.length} tasks done
                                  </p>
                                ) : !linkedTodayPlan && nextHabit.setupComplete ? (
                                  <p className="text-sm text-muted-foreground mt-0.5">
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
                      <p className="font-semibold">{format(parseISO(entry.date), "MMMM d, yyyy")}</p>
                      {entry.notes && (
                        <p className="text-sm text-muted-foreground">{entry.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{entry.tasksCompleted}/{entry.totalTasks} tasks</p>
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
            queryClient.invalidateQueries({ queryKey: ["/api/habits/summary"] });
            queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
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
                <p className="text-sm font-semibold">{stack.name}</p>
                <div className="flex items-center gap-1.5 flex-wrap text-sm text-muted-foreground">
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
                      <Button variant="ghost" size="sm" className="text-sm gap-1" data-testid={`link-prev-habit-${prevHabit.habitId}`}>
                        <ArrowLeft className="w-3 h-3" />
                        {prevHabit.habitTitle}
                      </Button>
                    </Link>
                  )}
                  {nextHabit && (
                    <Link href={`/habit/${nextHabit.habitId}`}>
                      <Button variant="ghost" size="sm" className="text-sm gap-1" data-testid={`link-next-habit-${nextHabit.habitId}`}>
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
