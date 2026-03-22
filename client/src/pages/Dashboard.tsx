import { useAuth } from "@/hooks/use-auth";
import { useHabitsSummary, useDeleteHabit } from "@/hooks/use-habits";
import { HabitCard } from "@/components/HabitCard";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { HabitFormDialog } from "@/components/HabitFormDialog";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { DailyQuote } from "@/components/DailyQuote";
import { TrialBanner } from "@/components/TrialBanner";
import { TodaysFocus } from "@/components/TodaysFocus";
import { StreakBrokenModal, type MissReason } from "@/components/StreakBrokenModal";
import { AchievementsDisplay } from "@/components/AchievementsDisplay";
import { TemplateGallery } from "@/components/TemplateGallery";
import { GamificationDisplay } from "@/components/GamificationDisplay";
import { QuickTasks } from "@/components/QuickTasks";
import { HabitStacks } from "@/components/HabitStacks";
import { NewUserFeedback } from "@/components/NewUserFeedback";
import { DashboardHeroCard } from "@/components/DashboardHeroCard";
import { FeatureTour, TOUR_STORAGE_KEY } from "@/components/FeatureTour";
import { DowngradeHabitPicker } from "@/components/DowngradeHabitPicker";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, User as UserIcon, Settings, Moon, Sun, BarChart3, Users, Smartphone, MessageSquare, Sparkles, ArrowRight, Crown, ChevronDown, ChevronUp, Minimize2, BookOpen, Check, Target, Zap, X, Timer, Heart, Calendar, Lock, TrendingDown, TrendingUp, Loader2, Flame, Star, MoreVertical, Edit, Trash2, Layers, Home, AlertTriangle } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MoodTracker } from "@/components/MoodTracker";
import { InstallAppDialog } from "@/components/InstallAppDialog";
import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import type { Habit, HabitTemplate, HabitStack, DailyPlan } from "@shared/schema";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAppTheme } from "@/components/ThemeSelector";
import { getEmojiForIcon } from "@/components/IconColorPicker";
import { format, startOfWeek, addDays } from "date-fns";

interface BrokenStreakInfo {
  habitId: number;
  habitTitle: string;
  previousStreak: number;
}

export default function Dashboard() {
  usePageTitle("Dashboard", "Your personal habit coaching dashboard. Track progress, complete guided sessions, earn XP, and stay on top of your daily habits.");
  const { user, logout } = useAuth();
  const { data: habits, isLoading } = useHabitsSummary();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<HabitTemplate | null>(null);
  const [brokenStreak, setBrokenStreak] = useState<BrokenStreakInfo | null>(null);
  const [habitsCollapsed, setHabitsCollapsed] = useState(true);
  const [selectedWeekDay, setSelectedWeekDay] = useState<string | null>(null);
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const [planAdjustDismissed, setPlanAdjustDismissed] = useState(() =>
    localStorage.getItem(`planAdjustDismissed_${todayKey}`) === "true"
  );
  const [adjustBannerReason, setAdjustBannerReason] = useState<string | null>(null);
  const [adjustingHabitId, setAdjustingHabitId] = useState<number | null>(null);
  const [adjustSuccessMap, setAdjustSuccessMap] = useState<Record<number, string>>({});
  const [welcomeBannerDismissed, setWelcomeBannerDismissed] = useState(() => {
    return localStorage.getItem('welcomeBannerDismissed') === 'true';
  });
  const [showTour, setShowTour] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showInterviewOffer, setShowInterviewOffer] = useState(false);
  const [editingHabit, setEditingHabit] = useState<any>(null);
  const [deletingHabit, setDeletingHabit] = useState<any>(null);
  const deleteHabit = useDeleteHabit();
  const isMobile = useIsMobile();
  const [, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const { features, isFreeUser } = useSubscription();
  const queryClient = useQueryClient();
  const simpleCheckin = useMutation({
    mutationFn: async (habitId: number) => {
      return await apiRequest("POST", `/api/habits/${habitId}/simple-checkin`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/achievements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/comprehensive"] });
      toast({ title: "Checked in!" });
    },
  });
  const simpleUncheckin = useMutation({
    mutationFn: async (habitId: number) => {
      return await apiRequest("POST", `/api/habits/${habitId}/simple-uncheckin`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/comprehensive"] });
      toast({ title: "Check-in removed" });
    },
  });
  const archiveHabit = useMutation({
    mutationFn: async (habitId: number) => {
      return await apiRequest("POST", `/api/habits/${habitId}/archive`, { archived: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      toast({ title: "Habit archived" });
    },
  });


  useAppTheme();
  const [levelUpDismissed, setLevelUpDismissed] = useState(() => {
    const dismissedAt = localStorage.getItem('levelUpBannerDismissed');
    if (!dismissedAt) return false;
    const dismissedDate = new Date(dismissedAt);
    const daysSinceDismissed = Math.floor((Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceDismissed < 7;
  });

  useEffect(() => {
    if (window.location.hash === "#tour") {
      window.history.replaceState(null, "", window.location.pathname);
      setTimeout(() => setShowTour(true), 800);
      return;
    }
    if (window.location.hash === "#habits") {
      setHabitsCollapsed(false);
      setTimeout(() => {
        const habitsSection = document.getElementById("habits-section");
        if (habitsSection) {
          const yOffset = -20;
          const y = habitsSection.getBoundingClientRect().top + window.scrollY + yOffset;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
        window.history.replaceState(null, "", window.location.pathname);
      }, 300);
    }
  }, []);

  useEffect(() => {
    if (!user?.id || isLoading) return;
    const interviewKey = `interview_offer_shown_${user.id}`;
    const presignupHabitId = localStorage.getItem("presignup_habit_id");
    if (presignupHabitId && !localStorage.getItem(interviewKey)) {
      localStorage.setItem(interviewKey, "true");
      setTimeout(() => setShowInterviewOffer(true), 600);
      return;
    }
    const hasExistingHabits = habits && habits.length > 0;

    if (hasExistingHabits && !user.onboardingComplete) {
      apiRequest("PATCH", "/api/user/onboarding").then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }).catch(() => {});
    }

    const tourAlreadyDone = !!localStorage.getItem(TOUR_STORAGE_KEY) || !!user.tourCompleted;
    if (user?.onboardingComplete && !tourAlreadyDone && !presignupHabitId && !hasExistingHabits) {
      localStorage.setItem(TOUR_STORAGE_KEY, "pending");
      setTimeout(() => setShowTour(true), 1000);
    }
  }, [user?.id, user?.onboardingComplete, user?.tourCompleted, habits, isLoading]);

  const { data: habitStacks } = useQuery<HabitStack[]>({
    queryKey: ["/api/habit-stacks"],
    enabled: features.hasHabitStacking,
  });

  const { data: habitsNeedingAdjustment } = useQuery<{ id: number; title: string; customIcon?: string; customColor?: string }[]>({
    queryKey: ["/api/habits/needs-adjustment"],
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  });

  const activeHabits = habits?.filter(h => !h.archived);

  const filteredHabitsNeedingAdjustment = habitsNeedingAdjustment;
  
  const handleSelectTemplate = (template: HabitTemplate) => {
    setSelectedTemplate(template);
    setIsDialogOpen(true);
  };

  // Server-side streak break detection
  const { data: streakBreaks } = useQuery<BrokenStreakInfo[]>({
    queryKey: ["/api/habits/streak-breaks"],
    enabled: !!user,
  });

  useEffect(() => {
    if (streakBreaks && streakBreaks.length > 0) {
      setBrokenStreak(streakBreaks[0]);
    }
  }, [streakBreaks]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const dashboardStats = useMemo(() => {
    if (!activeHabits || activeHabits.length === 0) return null;
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const todayDayName = format(new Date(), "EEEE").toLowerCase();

    const getHabitDayComplete = (habit: Habit, dateStr: string) => {
      const dailyPlans = (habit.dailyPlans || []) as DailyPlan[];
      const plan = dailyPlans.find(p => p.date === dateStr);
      if (habit.trackingMode === "simple") return plan?.completed === true;
      if (!plan || plan.tasks.length === 0) return false;
      const activeTasks = plan.tasks.filter((t: any) => !t.skipped);
      if (activeTasks.length === 0) return false;
      return plan.completed || activeTasks.every((t: any) => t.completed);
    };

    const hasDailyPlanForDate = (habit: Habit, dateStr: string) => {
      const dailyPlans = (habit.dailyPlans || []) as DailyPlan[];
      return dailyPlans.some(p => p.date === dateStr);
    };

    const isPlanExpired = (habit: Habit, dateStr: string) => {
      if (habit.trackingMode === "simple") return false;
      if (!habit.setupComplete) return false;
      const dPlans = (habit.dailyPlans || []) as DailyPlan[];
      const endDate = habit.planEndDate || (dPlans.length > 0 ? dPlans[dPlans.length - 1].date : null);
      if (endDate && endDate < dateStr) return true;
      return false;
    };

    const isHabitScheduledForDate = (habit: Habit, dateStr: string) => {
      if (hasDailyPlanForDate(habit, dateStr)) return true;
      if (isPlanExpired(habit, dateStr)) return false;
      const scheduleDays = habit.schedule?.days as string[] | undefined;
      const dayName = format(new Date(dateStr + "T12:00:00"), "EEEE").toLowerCase();
      if (scheduleDays && scheduleDays.length > 0) return scheduleDays.includes(dayName);
      if (habit.trackingMode === "simple") return true;
      const dailyPlans = (habit.dailyPlans || []) as DailyPlan[];
      return dailyPlans.some(p => p.date === dateStr && p.tasks.length > 0);
    };

    const habitsScheduledToday = activeHabits.filter(h => {
      if (isPlanExpired(h, todayStr)) return false;
      const scheduleDays = h.schedule?.days as string[] | undefined;
      if (scheduleDays && scheduleDays.length > 0) return scheduleDays.includes(todayDayName);
      if (h.trackingMode === "simple") return true;
      const dailyPlans = (h.dailyPlans || []) as DailyPlan[];
      return dailyPlans.some(p => p.date === todayStr && p.tasks.length > 0) || !h.setupComplete;
    });
    const todayCompletions = habitsScheduledToday.filter(h => getHabitDayComplete(h, todayStr)).length;
    const todayTotal = habitsScheduledToday.length;
    const todayPercent = todayTotal > 0 ? Math.round((todayCompletions / todayTotal) * 100) : 0;

    const totalSessions = (habits || []).reduce((sum, h) =>
      sum + ((h as any).progressCount ?? ((h.progress || []) as any[]).length), 0
    );
    const longestStreak = Math.max(...activeHabits.map(h => h.longestStreak || 0), 0);
    const bestActiveStreak = Math.max(...activeHabits.map(h => h.currentStreak || 0), 0);

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const dateStr = format(date, "yyyy-MM-dd");
      const scheduled = activeHabits.filter(h => isHabitScheduledForDate(h, dateStr));
      const completedCount = scheduled.filter(h => getHabitDayComplete(h, dateStr)).length;
      const totalCount = scheduled.length;
      return {
        date,
        dateStr,
        dayLetter: format(date, "EEEEE"),
        isToday: dateStr === todayStr,
        allComplete: totalCount > 0 && completedCount === totalCount,
        partial: totalCount > 0 && completedCount > 0 && completedCount < totalCount,
        isFuture: dateStr > todayStr,
        completedCount,
        totalCount,
      };
    });

    const weeklyCompletions = (() => {
      let completed = 0, total = 0;
      for (let i = 0; i < 7; i++) {
        const dateStr = format(addDays(weekStart, i), "yyyy-MM-dd");
        if (dateStr > todayStr) break;
        const scheduled = activeHabits.filter(h => isHabitScheduledForDate(h, dateStr));
        completed += scheduled.filter(h => getHabitDayComplete(h, dateStr)).length;
        total += scheduled.length;
      }
      return total > 0 ? Math.round((completed / total) * 100) : 0;
    })();

    const getHabitsForDate = (dateStr: string) => {
      const sortByTime = (a: Habit, b: Habit) => {
        const tA = a.schedule?.time, tB = b.schedule?.time;
        if (tA && tB) return tA.localeCompare(tB);
        if (tA) return -1;
        if (tB) return 1;
        return 0;
      };
      return activeHabits
        .filter(h => isHabitScheduledForDate(h, dateStr))
        .sort(sortByTime)
        .map(habit => {
          const dPlans = (habit.dailyPlans || []) as DailyPlan[];
          const plan = dPlans.find(p => p.date === dateStr);
          const isComplete = getHabitDayComplete(habit, dateStr);
          const isSimple = habit.trackingMode === "simple";
          return {
            habit,
            plan,
            isComplete,
            completedTasks: isSimple ? (isComplete ? 1 : 0) : (plan ? plan.tasks.filter((t: any) => t.completed).length : 0),
            totalTasks: isSimple ? 1 : (plan ? plan.tasks.filter((t: any) => !t.skipped).length : 0),
          };
        });
    };

    return { todayPercent, weeklyPercent: weeklyCompletions, totalSessions, longestStreak, bestActiveStreak, weekDays, getHabitsForDate };
  }, [activeHabits, habits]);

  const handleStartFresh = async (reason?: MissReason) => {
    if (brokenStreak) {
      try {
        if (reason) {
          await fetch(`/api/habits/${brokenStreak.habitId}/streak-miss-reason`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason }),
          });
        }
        await fetch(`/api/habits/${brokenStreak.habitId}/dismiss-streak-break`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
        queryClient.invalidateQueries({ queryKey: ["/api/habits/summary"] });
        queryClient.invalidateQueries({ queryKey: ["/api/habits/streak-breaks"] });
      } catch (err) {
        console.error("Failed to save miss reason:", err);
      }
      navigate(`/habit/${brokenStreak.habitId}?fromStreakBreak=true`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 md:p-8 font-body">
      <div className="mx-auto max-w-6xl space-y-7">
        
        {/* Header */}
        <header className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-base border border-primary/25 shadow-sm">
              {user?.firstName?.[0] || user?.email?.[0] || "U"}
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{greeting},</p>
              <h1 className="font-display text-2xl font-bold text-foreground">
                {user?.firstName || user?.email?.split('@')[0]}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dashboardStats && dashboardStats.bestActiveStreak > 0 && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 border border-orange-200 dark:border-orange-800 rounded-full px-3 py-1.5" data-testid="streak-badge-header">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-[13px] font-bold text-orange-600 dark:text-orange-400">{dashboardStats.bestActiveStreak}d</span>
              </div>
            )}

          {isMobile ? (
            <>
              <Button variant="ghost" className="h-10 w-10 rounded-full p-0" data-tour="user-menu-trigger" onClick={() => setMenuOpen(true)} data-testid="button-user-menu">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage src={user?.profileImageUrl || undefined} className="select-none [-webkit-touch-callout:none]" draggable={false} />
                  <AvatarFallback><UserIcon className="w-5 h-5" /></AvatarFallback>
                </Avatar>
              </Button>
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetContent side="bottom" className="rounded-t-2xl pb-safe-bottom max-h-[80vh] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>My Account</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-1">
                    <Link href="/analytics" onClick={() => setMenuOpen(false)}>
                      <button className="flex items-center w-full px-3 py-3 rounded-lg hover:bg-muted text-sm" data-testid="menu-analytics">
                        <BarChart3 className="mr-3 h-4 w-4" />
                        Advanced Analytics
                      </button>
                    </Link>
                    <Link href="/accountability" onClick={() => setMenuOpen(false)}>
                      <button className="flex items-center w-full px-3 py-3 rounded-lg hover:bg-muted text-sm" data-testid="menu-accountability">
                        <Users className="mr-3 h-4 w-4" />
                        Accountability Partners
                      </button>
                    </Link>
                    <Link href="/coach" onClick={() => setMenuOpen(false)}>
                      <button className="flex items-center w-full px-3 py-3 rounded-lg hover:bg-muted text-sm" data-testid="menu-coach-chat">
                        <Sparkles className="mr-3 h-4 w-4" />
                        Coach Chat
                        <Badge variant="secondary" className="ml-auto text-xs">Premium</Badge>
                      </button>
                    </Link>
                    <Link href="/journal" onClick={() => setMenuOpen(false)}>
                      <button className="flex items-center w-full px-3 py-3 rounded-lg hover:bg-muted text-sm" data-testid="menu-journal">
                        <BookOpen className="mr-3 h-4 w-4" />
                        Daily Journal
                        <Badge variant="secondary" className="ml-auto text-xs">Pro+</Badge>
                      </button>
                    </Link>
                    <Link href="/focus" onClick={() => setMenuOpen(false)}>
                      <button className="flex items-center w-full px-3 py-3 rounded-lg hover:bg-muted text-sm" data-testid="menu-focus-timer">
                        <Timer className="mr-3 h-4 w-4" />
                        Focus Timer
                        <Badge variant="secondary" className="ml-auto text-xs">Pro+</Badge>
                      </button>
                    </Link>
                    <Link href="/mood" onClick={() => setMenuOpen(false)}>
                      <button className="flex items-center w-full px-3 py-3 rounded-lg hover:bg-muted text-sm" data-testid="menu-mood-tracker">
                        <Heart className="mr-3 h-4 w-4" />
                        Mood Insights
                        <Badge variant="secondary" className="ml-auto text-xs">Pro+</Badge>
                      </button>
                    </Link>
                    <Link href="/goals" onClick={() => setMenuOpen(false)}>
                      <button className="flex items-center w-full px-3 py-3 rounded-lg hover:bg-muted text-sm" data-testid="menu-goals">
                        <Target className="mr-3 h-4 w-4" />
                        Goals
                        <Badge variant="secondary" className="ml-auto text-xs">Premium</Badge>
                      </button>
                    </Link>
                    <Link href="/planner" onClick={() => setMenuOpen(false)}>
                      <button className="flex items-center w-full px-3 py-3 rounded-lg hover:bg-muted text-sm" data-testid="menu-planner">
                        <Calendar className="mr-3 h-4 w-4" />
                        Daily Planner
                        <Badge variant="secondary" className="ml-auto text-xs">Premium</Badge>
                      </button>
                    </Link>
                    <Link href="/resources" onClick={() => setMenuOpen(false)}>
                      <button className="flex items-center w-full px-3 py-3 rounded-lg hover:bg-muted text-sm" data-testid="menu-resources">
                        <BookOpen className="mr-3 h-4 w-4" />
                        Resource Library
                        <Badge variant="secondary" className="ml-auto text-xs">Premium</Badge>
                      </button>
                    </Link>
                    <Link href="/community" onClick={() => setMenuOpen(false)}>
                      <button className="flex items-center w-full px-3 py-3 rounded-lg hover:bg-muted text-sm" data-testid="menu-community">
                        <MessageSquare className="mr-3 h-4 w-4" />
                        Community Forum
                        <span className="ml-auto text-sm text-muted-foreground">Soon</span>
                      </button>
                    </Link>
                    <Link href="/account" onClick={() => setMenuOpen(false)}>
                      <button className="flex items-center w-full px-3 py-3 rounded-lg hover:bg-muted text-sm" data-testid="menu-account">
                        <Settings className="mr-3 h-4 w-4" />
                        Account Settings
                      </button>
                    </Link>
                    <button className="flex items-center w-full px-3 py-3 rounded-lg hover:bg-muted text-sm" onClick={() => { toggleTheme(); setMenuOpen(false); }} data-testid="menu-theme-toggle">
                      {theme === "light" ? (
                        <><Moon className="mr-3 h-4 w-4" /> Dark Mode</>
                      ) : (
                        <><Sun className="mr-3 h-4 w-4" /> Light Mode</>
                      )}
                    </button>
                    <div className="border-t my-2" />
                    <button className="flex items-center w-full px-3 py-3 rounded-lg hover:bg-muted text-sm text-destructive" onClick={() => { logout(); setMenuOpen(false); }}>
                      <LogOut className="mr-3 h-4 w-4" />
                      Log out
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 w-10 rounded-full p-0" data-tour="user-menu-trigger">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback><UserIcon className="w-5 h-5" /></AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/analytics">
                <DropdownMenuItem className="cursor-pointer" data-testid="menu-analytics">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Advanced Analytics
                </DropdownMenuItem>
              </Link>
              <Link href="/accountability">
                <DropdownMenuItem className="cursor-pointer" data-testid="menu-accountability">
                  <Users className="mr-2 h-4 w-4" />
                  Accountability Partners
                </DropdownMenuItem>
              </Link>
              <Link href="/coach">
                <DropdownMenuItem className="cursor-pointer" data-testid="menu-coach-chat">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Coach Chat
                  <Badge variant="secondary" className="ml-auto text-xs">Premium</Badge>
                </DropdownMenuItem>
              </Link>
              <Link href="/journal">
                <DropdownMenuItem className="cursor-pointer" data-testid="menu-journal">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Daily Journal
                  <Badge variant="secondary" className="ml-auto text-xs">Pro+</Badge>
                </DropdownMenuItem>
              </Link>
              <Link href="/focus">
                <DropdownMenuItem className="cursor-pointer" data-testid="menu-focus-timer">
                  <Timer className="mr-2 h-4 w-4" />
                  Focus Timer
                  <Badge variant="secondary" className="ml-auto text-xs">Pro+</Badge>
                </DropdownMenuItem>
              </Link>
              <Link href="/mood">
                <DropdownMenuItem className="cursor-pointer" data-testid="menu-mood-tracker">
                  <Heart className="mr-2 h-4 w-4" />
                  Mood Insights
                  <Badge variant="secondary" className="ml-auto text-xs">Pro+</Badge>
                </DropdownMenuItem>
              </Link>
              <Link href="/goals">
                <DropdownMenuItem className="cursor-pointer" data-testid="menu-goals">
                  <Target className="mr-2 h-4 w-4" />
                  Goals
                  <Badge variant="secondary" className="ml-auto text-xs">Premium</Badge>
                </DropdownMenuItem>
              </Link>
              <Link href="/planner">
                <DropdownMenuItem className="cursor-pointer" data-testid="menu-planner">
                  <Calendar className="mr-2 h-4 w-4" />
                  Daily Planner
                  <Badge variant="secondary" className="ml-auto text-xs">Premium</Badge>
                </DropdownMenuItem>
              </Link>
              <Link href="/resources">
                <DropdownMenuItem className="cursor-pointer" data-testid="menu-resources">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Resource Library
                  <Badge variant="secondary" className="ml-auto text-xs">Premium</Badge>
                </DropdownMenuItem>
              </Link>
              <Link href="/community">
                <DropdownMenuItem className="cursor-pointer" data-testid="menu-community">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Community Forum
                  <span className="ml-auto text-sm text-muted-foreground">Soon</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <a href="/blog" target="_blank" rel="noopener noreferrer">
                <DropdownMenuItem className="cursor-pointer" data-testid="menu-blog">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Blog
                </DropdownMenuItem>
              </a>
              <a href="/about" target="_blank" rel="noopener noreferrer">
                <DropdownMenuItem className="cursor-pointer" data-testid="menu-about">
                  <Users className="mr-2 h-4 w-4" />
                  About
                </DropdownMenuItem>
              </a>
              <Link href="/account">
                <DropdownMenuItem className="cursor-pointer" data-testid="menu-account">
                  <Settings className="mr-2 h-4 w-4" />
                  Account Settings
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem className="cursor-pointer" onClick={toggleTheme} data-testid="menu-theme-toggle">
                {theme === "light" ? (
                  <><Moon className="mr-2 h-4 w-4" /> Dark Mode</>
                ) : (
                  <><Sun className="mr-2 h-4 w-4" /> Light Mode</>
                )}
              </DropdownMenuItem>
              <InstallAppDialog 
                trigger={
                  <DropdownMenuItem className="cursor-pointer" data-testid="menu-install-app" onSelect={(e) => e.preventDefault()}>
                    <Smartphone className="mr-2 h-4 w-4" />
                    Get the App
                  </DropdownMenuItem>
                }
              />
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => logout()}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          )}
          </div>
        </header>

        {/* Trial Banner */}
        <TrialBanner />

        {/* Hero Card - Level, XP, Streak, Stats, Calendar all in one box */}
        <DashboardHeroCard
          todayPercent={dashboardStats?.todayPercent}
          weeklyPercent={dashboardStats?.weeklyPercent}
          totalSessions={dashboardStats?.totalSessions}
          longestStreak={dashboardStats?.longestStreak}
          statsLoaded={!!dashboardStats}
          weekDays={dashboardStats?.weekDays}
          selectedWeekDay={selectedWeekDay}
          onSelectWeekDay={setSelectedWeekDay}
        />

        {/* Expanded day detail (shown when tapping a calendar day in hero card) */}
        {dashboardStats && selectedWeekDay && dashboardStats.getHabitsForDate && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <Card className="border-border/60 shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground">
                      {format(new Date(selectedWeekDay + "T12:00:00"), "EEEE, MMM d")}
                    </span>
                    <button
                      onClick={() => setSelectedWeekDay(null)}
                      className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                      data-testid="button-close-day-view"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {(() => {
                    const dayHabits = dashboardStats.getHabitsForDate(selectedWeekDay);
                    if (dayHabits.length === 0) {
                      return (
                        <div className="border border-dashed border-border/50 rounded-xl py-5 text-center">
                          <p className="text-sm text-muted-foreground/60">No habits scheduled</p>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-1.5">
                        {dayHabits.map(({ habit, plan, isComplete, completedTasks, totalTasks }) => {
                          const accentColor = habit.customColor || 'hsl(var(--primary))';
                          const habitEmoji = getEmojiForIcon(habit.customIcon);
                          return (
                            <Link key={habit.id} href={`/habit/${habit.id}?date=${plan?.date || format(new Date(), "yyyy-MM-dd")}`}>
                              <div
                                className={`flex items-center gap-3 pl-0 pr-2.5 py-2.5 rounded-xl transition-all cursor-pointer overflow-hidden ${
                                  isComplete
                                    ? 'bg-primary/8 border border-primary/15 shadow-sm'
                                    : 'bg-white/60 dark:bg-white/5 border border-border/60 hover:border-primary/20 hover:shadow-sm'
                                }`}
                                data-testid={`day-view-habit-${habit.id}`}
                              >
                                <div
                                  className="w-1 self-stretch rounded-r-full flex-shrink-0"
                                  style={{ backgroundColor: isComplete ? accentColor : accentColor + '99', minWidth: '4px' }}
                                />
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm ${isComplete ? 'opacity-60' : ''}`}
                                  style={{ backgroundColor: accentColor + '20' }}>
                                  {habitEmoji || <span style={{ color: accentColor }}>●</span>}
                                </div>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                                  isComplete
                                    ? 'bg-primary border-primary text-white'
                                    : 'border-border/60 bg-transparent'
                                }`}>
                                  {isComplete && <Check className="w-3 h-3" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className={`text-sm font-medium truncate block ${
                                    isComplete ? 'text-muted-foreground line-through' : 'text-foreground'
                                  }`}>
                                    {habit.title}
                                  </span>
                                  {totalTasks > 0 && (
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <div className="flex-1 h-1 rounded-full bg-muted/50 overflow-hidden max-w-[80px]">
                                        <div
                                          className="h-full rounded-full transition-all"
                                          style={{
                                            width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%`,
                                            backgroundColor: accentColor
                                          }}
                                        />
                                      </div>
                                      <span className="text-xs text-muted-foreground">
                                        {completedTasks}/{totalTasks} tasks
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {habit.schedule?.time && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                                    {new Date(`2000-01-01T${habit.schedule.time}`).toLocaleTimeString([], {
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Daily Quote - right after hero card */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.02 }}
        >
          <DailyQuote />
        </motion.section>

        {/* Mood Check-in */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <MoodTracker compact />
        </motion.div>

        {filteredHabitsNeedingAdjustment && filteredHabitsNeedingAdjustment.length > 0 && !planAdjustDismissed && (
          <motion.section
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="border-amber-500/30 bg-gradient-to-r from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 card-modern" data-testid="card-plan-adjustment-banner">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mt-0.5">
                    <TrendingDown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {!adjustBannerReason ? (
                      <>
                        <p className="font-bold text-sm" data-testid="text-plan-adjust-title">
                          {filteredHabitsNeedingAdjustment.length === 1
                            ? `You've been missing sessions — what's been getting in the way?`
                            : `You've been missing sessions on ${filteredHabitsNeedingAdjustment.length} habits — what's happened?`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                          {filteredHabitsNeedingAdjustment.length === 1
                            ? `"${filteredHabitsNeedingAdjustment[0].title}" — tap a reason and the AI can adapt your plan.`
                            : "Tap a reason so the AI can adapt your plans."}
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {[
                            { label: "Too busy", emoji: "⏰" },
                            { label: "Forgot", emoji: "🧠" },
                            { label: "Too tired", emoji: "😴" },
                            { label: "Schedule conflict", emoji: "📅" },
                            { label: "Didn't feel like it", emoji: "😶" },
                            { label: "Other", emoji: "💬" },
                          ].map(({ label, emoji }) => (
                            <button
                              key={label}
                              onClick={async () => {
                                setAdjustBannerReason(label);
                                try {
                                  for (const h of filteredHabitsNeedingAdjustment) {
                                    await fetch(`/api/habits/${h.id}/streak-miss-reason`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ reason: label }),
                                    });
                                  }
                                  queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
                                } catch {}
                              }}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-white/60 dark:bg-amber-950/30 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors text-left"
                              data-testid={`button-dashboard-miss-reason-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
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
                          Got it — the AI can work with that
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5 mb-3">
                          {adjustBannerReason === "Too busy" && "The AI can lighten the load and find pockets of time that actually fit your day."}
                          {adjustBannerReason === "Forgot" && "The AI can simplify your plan so it's easier to remember and build into your routine."}
                          {adjustBannerReason === "Too tired" && "The AI can scale back intensity and schedule tasks when you're typically most energized."}
                          {adjustBannerReason === "Schedule conflict" && "The AI can reschedule tasks around your existing commitments."}
                          {adjustBannerReason === "Didn't feel like it" && "The AI can redesign tasks to feel more engaging and easier to start."}
                          {adjustBannerReason === "Other" && "The AI can take a fresh look and adapt your plan to work better for you."}
                        </p>
                        <div className="flex flex-col gap-2">
                          {filteredHabitsNeedingAdjustment.map(h => {
                            const successMsg = adjustSuccessMap[h.id];
                            if (successMsg) {
                              return (
                                <div key={h.id} className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400" data-testid={`text-adjust-success-${h.id}`}>
                                    <Check className="w-4 h-4 flex-shrink-0" />
                                    Plan adjusted for "{h.title}"
                                  </div>
                                  {successMsg && (
                                    <p className="text-xs text-muted-foreground pl-6">{successMsg}</p>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 ml-6"
                                    onClick={() => navigate("/habit/" + h.id)}
                                    data-testid={`button-view-adjusted-plan-${h.id}`}
                                  >
                                    View Updated Plan
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              );
                            }
                            return (
                              <Button
                                key={h.id}
                                size="sm"
                                variant="outline"
                                className="gap-1.5 border-amber-300 dark:border-amber-700 self-start"
                                disabled={adjustingHabitId === h.id}
                                onClick={async () => {
                                  setAdjustingHabitId(h.id);
                                  try {
                                    const res = await fetch(`/api/habits/${h.id}/adjust-plan`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      credentials: "include",
                                    });
                                    const data = await res.json();
                                    if (!res.ok) throw new Error(data.message || "Failed");
                                    const summary = data.adjustmentSummary || "";
                                    setAdjustSuccessMap(prev => ({ ...prev, [h.id]: summary }));
                                    queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
                                    queryClient.invalidateQueries({ queryKey: ["/api/habits/needs-adjustment"] });
                                  } catch {
                                    toast({ title: "Adjustment failed", description: "Please try from the habit page.", variant: "destructive" });
                                  } finally {
                                    setAdjustingHabitId(null);
                                  }
                                }}
                                data-testid={"button-adjust-habit-" + h.id}
                              >
                                {adjustingHabitId === h.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3.5 h-3.5" />
                                )}
                                {adjustingHabitId === h.id ? "Adjusting…" : `Adjust "${h.title}"`}
                              </Button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setPlanAdjustDismissed(true);
                      localStorage.setItem(`planAdjustDismissed_${todayKey}`, "true");
                    }}
                    className="flex-shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                    data-testid="button-dismiss-plan-adjustment"
                    aria-label="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        )}

        {/* Welcome Banner for new users with no habits */}
        {(!habits || habits.length === 0) && !isLoading && !welcomeBannerDismissed && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-emerald-500/5 dark:from-primary/10 dark:to-emerald-500/10 relative overflow-hidden" data-testid="card-welcome-banner">
              <button
                onClick={() => {
                  setWelcomeBannerDismissed(true);
                  localStorage.setItem('welcomeBannerDismissed', 'true');
                }}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-dismiss-welcome"
                aria-label="Dismiss welcome banner"
              >
                <X className="w-4 h-4" />
              </button>
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-base font-bold text-foreground">Welcome! Let's build your first habit</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your AI coach will create a personalized plan just for you. Pick a habit you care about, answer a few quick questions, and you'll have a step-by-step plan in minutes.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-500" /> Personalized AI plans</span>
                      <span className="text-border">|</span>
                      <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5 text-primary" /> Guided daily sessions</span>
                      <span className="text-border">|</span>
                      <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-primary" /> Track your progress</span>
                    </div>
                    <Button
                      onClick={() => { setSelectedTemplate(null); setIsDialogOpen(true); }}
                      className="gap-2"
                      data-testid="button-welcome-create-habit"
                    >
                      <Plus className="w-4 h-4" />
                      Create Your First Habit
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        )}

        {isFreeUser && !levelUpDismissed && (() => {
          const daysActive = user?.createdAt ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
          if (daysActive < 7) return null;
          const totalStreakDays = activeHabits?.reduce((sum, h) => sum + (h.currentStreak || 0), 0) || 0;
          const totalCompletedDays = activeHabits?.reduce((sum, h) => sum + (Array.isArray(h.progress) ? h.progress.length : 0), 0) || 0;
          return (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.03 }}
            >
              <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-emerald-500/5 dark:from-primary/10 dark:to-emerald-500/10 relative overflow-hidden" data-testid="card-level-up-banner">
                <button
                  onClick={() => {
                    setLevelUpDismissed(true);
                    localStorage.setItem('levelUpBannerDismissed', new Date().toISOString());
                  }}
                  className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors z-10"
                  data-testid="button-dismiss-level-up"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Flame className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-foreground" data-testid="text-level-up-title">
                        You've been at this for {daysActive} days — ready to level up?
                      </h3>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                        {totalStreakDays > 0 && (
                          <span className="flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-orange-500" />
                            {totalStreakDays} day streak
                          </span>
                        )}
                        {totalCompletedDays > 0 && (
                          <span className="flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-primary" />
                            {totalCompletedDays} sessions completed
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        With Pro, you'd unlock unlimited sessions, streak protection, full history, plan restarts, and AI coaching insights.
                      </p>
                      <Link href="/paywall">
                        <Button size="sm" className="gap-1.5 mt-3" data-testid="button-level-up-upgrade">
                          <Crown className="w-3.5 h-3.5" />
                          See What You'd Unlock
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          );
        })()}

        {isFreeUser && (() => {
          const daysActive = user?.createdAt ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
          const levelUpVisible = daysActive >= 7 && !levelUpDismissed;
          if (levelUpVisible) return null;
          return (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.02 }}
            >
              <Card className="border-amber-200 dark:border-amber-800/50 bg-gradient-to-r from-amber-50/80 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/15" data-testid="card-free-upgrade-cta">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">Upgrade to unlock the full experience</p>
                      <ul className="mt-1.5 space-y-1">
                        <li className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span>Unlimited habits & AI-powered action plans</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span>Streak tracking, achievements & XP multipliers</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span>AI session summaries & curated resources</span>
                        </li>
                      </ul>
                      <Link href="/paywall">
                        <Button size="sm" className="gap-1.5 mt-3" data-testid="button-dashboard-upgrade">
                          <Sparkles className="w-3.5 h-3.5" />
                          See Plans — Starting at $6/mo
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          );
        })()}

        {/* ===== SECTION 1: TODAY ===== */}
        <div data-tour="daily-action-center" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-primary to-emerald-500" />
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em]" data-testid="text-section-daily-focus">Today</p>
          </div>

          {habits && habits.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <TodaysFocus habits={activeHabits || []} stacks={habitStacks} />
            </motion.section>
          )}

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <QuickTasks />
          </motion.section>
        </div>

        {/* ===== SECTION 2: YOUR HABITS ===== */}
        <section id="habits-section" className="pt-1">
          <Card className="border-border/60 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-emerald-500/10 dark:from-primary/20 dark:to-emerald-500/15 px-4 py-3 flex items-center justify-between flex-wrap gap-3 border-b border-border/40">
              <button
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => activeHabits && activeHabits.length > 0 && setHabitsCollapsed(!habitsCollapsed)}
                data-testid="button-toggle-habits-view"
              >
                <Layers className="w-4 h-4 text-primary" />
                <p className="text-sm font-bold text-foreground">
                  Your Habits
                </p>
                <span className="bg-primary/15 text-primary text-[11px] px-2 py-0.5 rounded-full font-bold">
                  {activeHabits?.length || 0}
                </span>
                {activeHabits && activeHabits.length > 0 && (
                  habitsCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  )
                )}
              </button>
              <div className="flex gap-2">
                <TemplateGallery onSelectTemplate={handleSelectTemplate} />
                <Button onClick={() => { setSelectedTemplate(null); setIsDialogOpen(true); }} size="sm" className="gap-1.5 rounded-xl shadow-sm shadow-primary/20 h-8 text-xs">
                  <Plus className="w-3.5 h-3.5" />
                  New Habit
                </Button>
              </div>
            </div>
            <CardContent className="p-0">

          <AnimatePresence initial={false}>
            {!habitsCollapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                style={{ overflow: "hidden" }}
              >
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-40 rounded-2xl bg-muted/30 border border-border/50 relative overflow-hidden">
                        <div className="absolute inset-0 animate-shimmer" />
                        <div className="p-4 space-y-3">
                          <div className="h-5 w-2/3 bg-muted/50 rounded-lg" />
                          <div className="h-3 w-full bg-muted/40 rounded-lg" />
                          <div className="h-3 w-4/5 bg-muted/40 rounded-lg" />
                          <div className="h-8 w-24 bg-muted/50 rounded-lg mt-4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activeHabits?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-2xl border border-dashed border-primary/20 shadow-sm" data-testid="card-empty-habits">
                    <div className="relative mb-5">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Target className="w-10 h-10 text-primary" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center animate-pulse">
                        <Sparkles className="w-4 h-4 text-accent" />
                      </div>
                    </div>
                    <h3 className="font-display text-xl font-semibold text-foreground">Ready to build your first habit?</h3>
                    <p className="text-muted-foreground max-w-sm mt-2 text-sm leading-relaxed">
                      Your AI coach will create a personalized daily plan just for you. Most people start with something simple — like reading for 10 minutes or a 5-minute meditation.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mt-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/50">
                        <Zap className="w-3 h-3 text-amber-500" /> AI-powered plans
                      </span>
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/50">
                        <Calendar className="w-3 h-3 text-primary" /> Daily guidance
                      </span>
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/50">
                        <Flame className="w-3 h-3 text-orange-500" /> Streak tracking
                      </span>
                    </div>
                    <Button onClick={() => setIsDialogOpen(true)} className="mt-6 gap-2 shadow-lg shadow-primary/20" size="lg" data-testid="button-empty-create-habit">
                      <Plus className="w-4 h-4" />
                      Create Your First Habit
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                      {activeHabits?.map((habit, i) => {
                        const isSimple = habit.trackingMode === "simple";
                        const streak = habit.currentStreak || 0;
                        const plans = (habit.dailyPlans || []) as DailyPlan[];
                        const todayStr = format(new Date(), "yyyy-MM-dd");
                        const todayPlan = plans.find(p => p.date === todayStr);
                        const todayTasks = todayPlan?.tasks || [];
                        const completedTasks = todayTasks.filter((t: any) => t.completed).length;
                        const totalTasks = todayTasks.length;
                        const isCheckedIn = isSimple ? todayPlan?.completed === true : (totalTasks > 0 && completedTasks === totalTasks);
                        const iconColor = habit.customColor?.startsWith('#') ? habit.customColor : undefined;
                        const iconBg = iconColor ? `${iconColor}20` : undefined;
                        const habitEmoji = getEmojiForIcon(habit.customIcon);
                        const isPlanDone = !isSimple && habit.setupComplete && habit.planEndDate && habit.planEndDate < todayStr;

                        return (
                          <div key={habit.id} className={`flex items-center gap-3.5 px-4 py-3.5 group transition-opacity ${isCheckedIn ? 'opacity-60' : ''} ${i < (activeHabits?.length || 0) - 1 ? 'border-b border-border/50' : ''}`} data-testid={`card-habit-${habit.id}`}>
                            <Link href={`/habit/${habit.id}`} className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity ${isCheckedIn || isPlanDone ? 'opacity-50' : ''}`}
                                style={{ backgroundColor: iconBg || 'hsl(var(--primary) / 0.1)' }}
                              >
                                <span className="text-xl leading-none">{habitEmoji}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-[14px] font-semibold truncate ${isCheckedIn ? 'line-through text-muted-foreground' : isPlanDone ? 'text-muted-foreground' : 'text-foreground'}`}>{habit.title}</p>
                                <div className="flex items-center gap-2.5 mt-0.5">
                                  {isPlanDone ? (
                                    <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                                      <AlertTriangle className="w-3 h-3" />Plan ended · <span className="text-primary cursor-pointer hover:underline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/habit/${habit.id}`); }}>Continue →</span>
                                    </span>
                                  ) : (
                                    <>
                                      {streak > 0 && (
                                        <span className="flex items-center gap-0.5 text-[11px] text-orange-500 font-semibold">
                                          <Flame className="w-3 h-3" />{streak}d
                                        </span>
                                      )}
                                      <span className="text-[11px] text-muted-foreground">
                                        {isSimple ? (isCheckedIn ? "Done" : "Simple") : `${completedTasks}/${totalTasks}`}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </Link>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground md:opacity-0 md:group-hover:opacity-100 transition-opacity rounded-lg flex-shrink-0" data-testid={`button-habit-menu-${habit.id}`}>
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditingHabit(habit)}>
                                  <Edit className="w-4 h-4 mr-2" />Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => archiveHabit.mutate(habit.id)}>
                                  <Minimize2 className="w-4 h-4 mr-2" />Archive
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeletingHabit(habit)}>
                                  <Trash2 className="w-4 h-4 mr-2" />Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <button
                              className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isCheckedIn ? 'bg-emerald-500 border-emerald-500' : 'border-muted-foreground/20 hover:border-emerald-400'}`}
                              data-testid={`button-checkin-${habit.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isSimple) {
                                  if (isCheckedIn) {
                                    simpleUncheckin.mutate(habit.id);
                                  } else {
                                    simpleCheckin.mutate(habit.id);
                                  }
                                } else {
                                  navigate(`/habit/${habit.id}`);
                                }
                              }}
                            >
                              {isCheckedIn && <Check className="w-4 h-4 text-white" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {activeHabits && activeHabits.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="p-4 pt-0"
            >
              <HabitStacks />
            </motion.div>
          )}
            </CardContent>
          </Card>
        </section>

        {/* ===== SECTION 3: ACHIEVEMENTS & REWARDS ===== */}
        <div data-tour="achievements-section" className="space-y-3">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em]" data-testid="text-section-achievements">Achievements & Rewards</p>

          {habits && habits.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              <AchievementsDisplay compact />
            </motion.section>
          )}

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <GamificationDisplay hideLevelCard />
          </motion.section>
        </div>

        {/* ===== SECTION 4: TOOLS ===== */}
        <div className="space-y-4">
          <p id="tools-section" className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em]" data-testid="text-section-tools" data-section="tools">Tools</p>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5" data-tour="feature-links">
              <Link href={features.hasMoodTracker ? "/mood" : "/paywall"}>
                <div className="bg-card rounded-2xl border border-teal-100 dark:border-teal-800/40 shadow-sm p-3.5 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow h-full" data-testid="card-mood-tracker-link">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                    <Heart className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">Mood</p>
                    {!features.hasMoodTracker ? (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" /> Pro+</p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">Log mood</p>
                    )}
                  </div>
                </div>
              </Link>

              <Link href={features.hasJournal ? "/journal" : "/paywall"}>
                <div className="bg-card rounded-2xl border border-indigo-100 dark:border-indigo-800/40 shadow-sm p-3.5 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow h-full" data-testid="card-journal-link">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">Journal</p>
                    {!features.hasJournal ? (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" /> Pro+</p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">Reflections</p>
                    )}
                  </div>
                </div>
              </Link>

              <Link href={features.hasFocusTimer ? "/focus" : "/paywall"}>
                <div className="bg-card rounded-2xl border border-amber-100 dark:border-amber-800/40 shadow-sm p-3.5 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow h-full" data-testid="card-focus-timer-link">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <Timer className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">Focus</p>
                    {!features.hasFocusTimer ? (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" /> Pro+</p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">Deep work</p>
                    )}
                  </div>
                </div>
              </Link>

              <Link href={features.hasGoals ? "/goals" : "/paywall"}>
                <div className="bg-card rounded-2xl border border-rose-100 dark:border-rose-800/40 shadow-sm p-3.5 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow h-full" data-testid="card-goals-link">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">Goals</p>
                    {!features.hasGoals ? (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" /> Premium</p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">Set & track</p>
                    )}
                  </div>
                </div>
              </Link>

              <Link href={features.hasDailyPlanner ? "/planner" : "/paywall"}>
                <div className="bg-card rounded-2xl border border-sky-100 dark:border-sky-800/40 shadow-sm p-3.5 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow h-full" data-testid="card-planner-link">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">Planner</p>
                    {!features.hasDailyPlanner ? (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" /> Premium</p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">Plan your day</p>
                    )}
                  </div>
                </div>
              </Link>

              <Link href="/analytics">
                <div className="bg-card rounded-2xl border border-primary/15 dark:border-primary/25 shadow-sm p-3.5 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow h-full" data-testid="card-analytics-link">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">Analytics</p>
                    <p className="text-[10px] text-muted-foreground">View insights</p>
                  </div>
                </div>
              </Link>
            </div>
          </motion.section>
        </div>
      </div>

      <HabitFormDialog 
        open={isDialogOpen} 
        onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setSelectedTemplate(null); }}
        initialValues={selectedTemplate ? {
          title: selectedTemplate.name,
          description: selectedTemplate.description || '',
          goal: selectedTemplate.suggestedGoal || '',
        } : undefined}
      />

      {editingHabit && (
        <HabitFormDialog
          open={!!editingHabit}
          onOpenChange={(open) => { if (!open) setEditingHabit(null); }}
          habitToEdit={editingHabit}
        />
      )}

      <AlertDialog open={!!deletingHabit} onOpenChange={(open) => { if (!open) setDeletingHabit(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Habit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingHabit?.title}"? This action cannot be undone and your progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingHabit) {
                  deleteHabit.mutate(deletingHabit.id, {
                    onSuccess: () => setDeletingHabit(null),
                    onError: () => toast({ title: "Failed to delete habit", variant: "destructive" })
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteHabit.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isFreeUser && !user?.isAdmin && activeHabits && activeHabits.length > 1 && (
        <DowngradeHabitPicker habits={habits || []} open={true} />
      )}

      {user && !user.onboardingComplete && !isLoading && !(habits && habits.length > 0) && !localStorage.getItem("presignup_data") && <OnboardingWizard />}

      {showInterviewOffer && (
        <Dialog open onOpenChange={(open) => {
          if (!open) {
            setShowInterviewOffer(false);
            localStorage.removeItem("presignup_habit_id");
          }
        }}>
          <DialogContent className="sm:max-w-md [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold" data-testid="text-interview-offer-title">Your plan is saved!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Want to personalize it further? A quick AI interview will tailor your plan to your schedule, experience level, and goals.
                </p>
              </div>
              <div className="space-y-2">
                <Button
                  className="w-full gap-2"
                  onClick={async () => {
                    setShowInterviewOffer(false);
                    const storedHabitId = localStorage.getItem("presignup_habit_id");
                    if (storedHabitId) {
                      try {
                        await apiRequest("PUT", `/api/habits/${storedHabitId}`, { setupComplete: false });
                        queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
                        queryClient.invalidateQueries({ queryKey: ["/api/habits/summary"] });
                      } catch (e) {}
                      localStorage.removeItem("presignup_habit_id");
                      navigate(`/habit/${storedHabitId}`);
                    }
                  }}
                  data-testid="button-start-interview"
                >
                  <Sparkles className="w-4 h-4" />
                  Personalize with AI Interview
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => {
                    setShowInterviewOffer(false);
                    localStorage.removeItem("presignup_habit_id");
                    const tourDone = !!localStorage.getItem(TOUR_STORAGE_KEY) || !!user?.tourCompleted;
                    if (user?.onboardingComplete && !tourDone) {
                      localStorage.setItem(TOUR_STORAGE_KEY, "pending");
                      setTimeout(() => setShowTour(true), 500);
                    }
                  }}
                  data-testid="button-keep-plan"
                >
                  Keep my current plan
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showTour && (
        <FeatureTour onComplete={() => {
          setShowTour(false);
          apiRequest("PATCH", "/api/user/tour").then(() => {
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          }).catch(() => {});
        }} />
      )}

      {/* New User Feedback Prompt */}
      <NewUserFeedback />

      {/* Streak Broken Modal */}
      {brokenStreak && (
        <StreakBrokenModal
          habitTitle={brokenStreak.habitTitle}
          previousStreak={brokenStreak.previousStreak}
          open={!!brokenStreak}
          onOpenChange={(open) => {
            if (!open) {
              fetch(`/api/habits/${brokenStreak.habitId}/dismiss-streak-break`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
              }).then(() => {
                queryClient.invalidateQueries({ queryKey: ["/api/habits/streak-breaks"] });
              }).catch(() => {});
              setBrokenStreak(null);
            }
          }}
          onStartFresh={handleStartFresh}
        />
      )}

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-border">
        <div className="text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} HabitBuilder.pro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
