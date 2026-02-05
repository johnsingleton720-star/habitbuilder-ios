import { useAuth } from "@/hooks/use-auth";
import { useHabits } from "@/hooks/use-habits";
import { HabitCard } from "@/components/HabitCard";
import { HabitFormDialog } from "@/components/HabitFormDialog";
import { DailyQuote } from "@/components/DailyQuote";
import { TrialBanner } from "@/components/TrialBanner";
import { ProgressSummary } from "@/components/ProgressSummary";
import { TodaysFocus } from "@/components/TodaysFocus";
import { StreakBrokenModal } from "@/components/StreakBrokenModal";
import { AchievementsDisplay } from "@/components/AchievementsDisplay";
import { TemplateGallery } from "@/components/TemplateGallery";
import { GamificationDisplay } from "@/components/GamificationDisplay";
import { MoodTracker } from "@/components/MoodTracker";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, User as UserIcon, Settings, Moon, Sun, BarChart3, Users, Smartphone, MessageSquare } from "lucide-react";
import { InstallAppDialog } from "@/components/InstallAppDialog";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/components/ThemeProvider";
import type { Habit, HabitTemplate } from "@shared/schema";

interface BrokenStreakInfo {
  habitId: number;
  habitTitle: string;
  previousStreak: number;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { data: habits, isLoading } = useHabits();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<HabitTemplate | null>(null);
  const [brokenStreak, setBrokenStreak] = useState<BrokenStreakInfo | null>(null);
  const [, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  
  const handleSelectTemplate = (template: HabitTemplate) => {
    setSelectedTemplate(template);
    setIsDialogOpen(true);
  };

  // Detect broken streaks when habits load
  useEffect(() => {
    if (!habits || habits.length === 0) return;

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
      <div className="mx-auto max-w-5xl space-y-8">
        
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
              <Link href="/community">
                <DropdownMenuItem className="cursor-pointer" data-testid="menu-community">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Community Forum
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

        {/* Daily Quote Hero Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <DailyQuote />
        </motion.section>

        {/* Today's Focus - What to work on now */}
        {habits && habits.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <TodaysFocus habits={habits} />
          </motion.section>
        )}

        {/* Progress Summary */}
        {habits && habits.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <ProgressSummary habits={habits} />
          </motion.section>
        )}

        {/* Achievements (compact) */}
        {habits && habits.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <AchievementsDisplay compact />
          </motion.section>
        )}

        {/* Gamification - XP, Levels, Daily Challenges */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <GamificationDisplay />
        </motion.section>

        {/* Mood Tracker - Premium Feature */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <MoodTracker />
        </motion.section>

        {/* Habits Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              Your Habits 
              <span className="bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-full">
                {habits?.length || 0}
              </span>
            </h2>
            <div className="flex gap-2">
              <TemplateGallery onSelectTemplate={handleSelectTemplate} />
              <Button onClick={() => { setSelectedTemplate(null); setIsDialogOpen(true); }} className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                <Plus className="w-4 h-4" />
                New Habit
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 rounded-2xl bg-muted/50 animate-pulse border border-border/50" />
              ))}
            </div>
          ) : habits?.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center bg-white/50 rounded-3xl border border-dashed border-border"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display text-lg font-medium text-foreground">No habits yet</h3>
              <p className="text-muted-foreground max-w-sm mt-2 mb-6">
                Start building your routine by adding your first habit. Small steps lead to big changes.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>Create First Habit</Button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {habits?.map((habit) => (
                  <HabitCard key={habit.id} habit={habit} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
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
    </div>
  );
}
