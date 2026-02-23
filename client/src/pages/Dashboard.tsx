import { useAuth } from "@/hooks/use-auth";
import { useHabits } from "@/hooks/use-habits";
import { HabitCard } from "@/components/HabitCard";
import { HabitFormDialog } from "@/components/HabitFormDialog";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { DailyQuote } from "@/components/DailyQuote";
import { TrialBanner } from "@/components/TrialBanner";
import { ProgressSummary } from "@/components/ProgressSummary";
import { TodaysFocus } from "@/components/TodaysFocus";
import { StreakBrokenModal } from "@/components/StreakBrokenModal";
import { AchievementsDisplay } from "@/components/AchievementsDisplay";
import { TemplateGallery } from "@/components/TemplateGallery";
import { GamificationDisplay } from "@/components/GamificationDisplay";
import { MoodTracker } from "@/components/MoodTracker";
import { QuickTasks } from "@/components/QuickTasks";
import { HabitStacks } from "@/components/HabitStacks";
import { NewUserFeedback } from "@/components/NewUserFeedback";
import { DashboardHeroCard } from "@/components/DashboardHeroCard";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, User as UserIcon, Settings, Moon, Sun, BarChart3, Users, Smartphone, MessageSquare, Sparkles, Link2, ArrowRight, Crown, ChevronDown, ChevronUp, Maximize2, Minimize2, BookOpen, Check, Target, Zap, X } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InstallAppDialog } from "@/components/InstallAppDialog";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/components/ThemeProvider";
import type { Habit, HabitTemplate, HabitStack } from "@shared/schema";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery } from "@tanstack/react-query";

interface BrokenStreakInfo {
  habitId: number;
  habitTitle: string;
  previousStreak: number;
}

export default function Dashboard() {
  usePageTitle("Dashboard", "Your personal habit coaching dashboard. Track progress, complete guided sessions, earn XP, and stay on top of your daily habits.");
  const { user, logout } = useAuth();
  const { data: habits, isLoading } = useHabits();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<HabitTemplate | null>(null);
  const [brokenStreak, setBrokenStreak] = useState<BrokenStreakInfo | null>(null);
  const [habitsCollapsed, setHabitsCollapsed] = useState(true);
  const [welcomeBannerDismissed, setWelcomeBannerDismissed] = useState(() => {
    return localStorage.getItem('welcomeBannerDismissed') === 'true';
  });
  const [, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { features, isFreeUser } = useSubscription();

  const { data: habitStacks } = useQuery<HabitStack[]>({
    queryKey: ["/api/habit-stacks"],
    enabled: features.hasHabitStacking,
  });

  const activeHabits = habits?.filter(h => !h.archived);
  
  const handleSelectTemplate = (template: HabitTemplate) => {
    setSelectedTemplate(template);
    setIsDialogOpen(true);
  };

  // Detect broken streaks when habits load (skip for free users - streaks are a paid feature)
  useEffect(() => {
    if (!habits || habits.length === 0 || isFreeUser) return;

    // Get stored streaks from localStorage
    const storedStreaksJson = localStorage.getItem('habitStreaks');
    const storedStreaks: Record<number, number> = storedStreaksJson ? JSON.parse(storedStreaksJson) : {};

    // Check each habit for broken streaks
    let brokenFound: BrokenStreakInfo | null = null;
    const newStreaks: Record<number, number> = {};

    for (const habit of habits) {
      const currentStreak = habit.currentStreak || 0;
      const previousStreak = storedStreaks[habit.id];

      // Only check habits that have a setup complete and had a streak before
      if (habit.setupComplete && previousStreak !== undefined && previousStreak > 0 && currentStreak === 0) {
        // Check if we've already notified about this break
        const notifiedKey = `streakBrokenNotified_${habit.id}`;
        const alreadyNotified = localStorage.getItem(notifiedKey);
        
        if (!alreadyNotified) {
          brokenFound = {
            habitId: habit.id,
            habitTitle: habit.title,
            previousStreak: previousStreak,
          };
          // Mark as notified
          localStorage.setItem(notifiedKey, 'true');
          break; // Show one at a time
        }
      }

      newStreaks[habit.id] = currentStreak;
    }

    // Update stored streaks
    localStorage.setItem('habitStreaks', JSON.stringify(newStreaks));

    // Clear notification flags for habits with active streaks (so they can be notified again if broken later)
    for (const habit of habits) {
      if ((habit.currentStreak || 0) > 0) {
        localStorage.removeItem(`streakBrokenNotified_${habit.id}`);
      }
    }

    if (brokenFound) {
      setBrokenStreak(brokenFound);
    }
  }, [habits]);

  // Get greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const handleStartFresh = () => {
    if (brokenStreak) {
      navigate(`/habit/${brokenStreak.habitId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 md:p-8 font-body">
      <div className="mx-auto max-w-5xl space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl border border-primary/20">
              {user?.firstName?.[0] || user?.email?.[0] || "U"}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{greeting},</p>
              <h1 className="font-display text-2xl font-bold text-foreground">
                {user?.firstName || user?.email?.split('@')[0]}
              </h1>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
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
                  <Badge variant="secondary" className="ml-auto text-[10px]">Premium</Badge>
                </DropdownMenuItem>
              </Link>
              <Link href="/journal">
                <DropdownMenuItem className="cursor-pointer" data-testid="menu-journal">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Daily Journal
                  <Badge variant="secondary" className="ml-auto text-[10px]">Pro+</Badge>
                </DropdownMenuItem>
              </Link>
              <Link href="/resources">
                <DropdownMenuItem className="cursor-pointer" data-testid="menu-resources">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Resource Library
                  <Badge variant="secondary" className="ml-auto text-[10px]">Premium</Badge>
                </DropdownMenuItem>
              </Link>
              <Link href="/community">
                <DropdownMenuItem className="cursor-pointer" data-testid="menu-community">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Community Forum
                  <span className="ml-auto text-xs text-muted-foreground">Soon</span>
                </DropdownMenuItem>
              </Link>
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
        </header>

        {/* Trial Banner */}
        <TrialBanner />

        {/* Hero Card - Level, XP, Streak at a glance */}
        <DashboardHeroCard />

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
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-500" /> Personalized AI plans</span>
                      <span className="text-border">|</span>
                      <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5 text-primary" /> Guided daily sessions</span>
                      <span className="text-border">|</span>
                      <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-purple-500" /> Track your progress</span>
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

        {isFreeUser && (
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
                      <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className="w-3 h-3 text-primary flex-shrink-0" />
                        <span>Unlimited habits & AI-powered action plans</span>
                      </li>
                      <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className="w-3 h-3 text-primary flex-shrink-0" />
                        <span>Streak tracking, achievements & XP multipliers</span>
                      </li>
                      <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className="w-3 h-3 text-primary flex-shrink-0" />
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
        )}

        {/* Daily Quote - Positive start */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          <DailyQuote />
        </motion.section>

        {/* Today's Focus - What to do NOW */}
        {habits && habits.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <TodaysFocus habits={activeHabits || []} stacks={habitStacks} />
          </motion.section>
        )}

        {/* Quick Tasks */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <QuickTasks />
        </motion.section>

        {/* Progress Summary */}
        {habits && habits.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <ProgressSummary habits={activeHabits || []} />
          </motion.section>
        )}

        {/* Achievements (compact) - Show progress before challenges */}
        {habits && habits.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <AchievementsDisplay compact />
          </motion.section>
        )}

        {/* Gamification - XP, Levels, Daily Challenges */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <GamificationDisplay />
        </motion.section>

        {/* Mood Tracker */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <MoodTracker />
        </motion.section>

        {/* Daily Journal Card */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.38 }}
        >
          {features.hasJournal ? (
            <Link href="/journal">
              <Card className="hover-elevate cursor-pointer border-indigo-200/50 dark:border-indigo-800/30" data-testid="card-journal-link">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">Daily Journal</p>
                      <p className="text-xs text-muted-foreground">Write reflections and get AI insights</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card className="border-muted" data-testid="card-journal-locked">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      Daily Journal
                      <Badge variant="secondary" className="text-[10px]">Pro+</Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">Upgrade to write reflections and get AI insights</p>
                  </div>
                  <Link href="/paywall">
                    <Button size="sm" variant="outline" className="gap-1 flex-shrink-0" data-testid="button-journal-upgrade">
                      <Crown className="w-3 h-3" />
                      Upgrade
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.section>

        {/* Habits Section - Bottom, Collapsible */}
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => activeHabits && activeHabits.length > 0 && setHabitsCollapsed(!habitsCollapsed)}
              data-testid="button-toggle-habits-view"
            >
              <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                Your Habits
                <span className="bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-full">
                  {activeHabits?.length || 0}
                </span>
              </h2>
              {activeHabits && activeHabits.length > 0 && (
                habitsCollapsed ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                )
              )}
            </button>
            <div className="flex gap-2">
              <TemplateGallery onSelectTemplate={handleSelectTemplate} />
              <Button onClick={() => { setSelectedTemplate(null); setIsDialogOpen(true); }} className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                <Plus className="w-4 h-4" />
                New Habit
              </Button>
            </div>
          </div>

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
                  <div className="flex flex-col items-center justify-center py-12 text-center bg-gradient-to-br from-primary/5 via-card/80 to-accent/5 dark:from-primary/10 dark:via-card dark:to-accent/10 rounded-3xl border border-dashed border-primary/20">
                    <div className="relative mb-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Target className="w-8 h-8 text-primary" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-accent" />
                      </div>
                    </div>
                    <h3 className="font-display text-lg font-medium text-foreground">Your habits will live here</h3>
                    <p className="text-muted-foreground max-w-sm mt-2 text-sm">
                      Once you create a habit, you'll see your daily plans, progress, and guided sessions right here. Most people start with something simple — like reading for 10 minutes a day.
                    </p>
                    <Button onClick={() => setIsDialogOpen(true)} className="mt-5 gap-2 shadow-lg shadow-primary/20">
                      <Plus className="w-4 h-4" />
                      Create Your First Habit
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeHabits?.map((habit) => (
                      <HabitCard key={habit.id} habit={habit} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Habit Stacks Section (Premium) */}
        {activeHabits && activeHabits.length >= 2 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
          >
            <HabitStacks />
          </motion.section>
        )}
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

      {user && !user.onboardingComplete && <OnboardingWizard />}

      {/* New User Feedback Prompt */}
      <NewUserFeedback />

      {/* Streak Broken Modal */}
      {brokenStreak && (
        <StreakBrokenModal
          habitTitle={brokenStreak.habitTitle}
          previousStreak={brokenStreak.previousStreak}
          open={!!brokenStreak}
          onOpenChange={(open) => !open && setBrokenStreak(null)}
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
