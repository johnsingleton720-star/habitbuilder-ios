import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useQuery } from "@tanstack/react-query";
import { trackFunnelEvent } from "@/hooks/use-funnel-tracking";
import {
  Sparkles,
  ArrowRight,
  Crown,
  Compass,
  Rocket,
  BookOpen,
  Brain,
  Target,
  Zap,
  Flame,
  CheckCircle2,
  Star,
} from "lucide-react";

const WELCOME_HUB_KEY = "welcome_hub_seen";

export function getWelcomeHubKey(userId: string) {
  return `${WELCOME_HUB_KEY}_${userId}`;
}

export function hasSeenWelcomeHub(userId: string): boolean {
  return localStorage.getItem(getWelcomeHubKey(userId)) === "true";
}

function markWelcomeHubSeen(userId: string) {
  localStorage.setItem(getWelcomeHubKey(userId), "true");
}

interface WelcomeHubProps {
  onDismiss: (action: "habit" | "tour" | "explore") => void;
}

const PREMIUM_FEATURES = [
  { icon: Brain, label: "AI Coaching", desc: "Personalized daily action plans" },
  { icon: Sparkles, label: "Coach Chat", desc: "Talk to your AI habit coach" },
  { icon: BookOpen, label: "Journal", desc: "Reflect and track your thoughts" },
  { icon: Target, label: "Goals & Milestones", desc: "Set targets and hit them" },
  { icon: Zap, label: "Focus Timer", desc: "Deep work sessions with Pomodoro" },
  { icon: Flame, label: "Unlimited Habits", desc: "Track everything that matters" },
];

export function WelcomeHub({ onDismiss }: WelcomeHubProps) {
  const { user } = useAuth();
  const { trialDaysRemaining } = useSubscription();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"welcome" | "features">("welcome");

  const presignupHabitId = localStorage.getItem("presignup_habit_id");

  const { data: habits } = useQuery<any[]>({
    queryKey: ["/api/habits/summary"],
    enabled: !!user,
  });

  const presignupHabit = presignupHabitId && habits
    ? habits.find((h: any) => h.id === Number(presignupHabitId))
    : null;

  const hasExistingHabit = habits && habits.length > 0;
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    if (habits === undefined) return;
    trackedRef.current = true;
    trackFunnelEvent("welcome_hub_shown", {
      hasPresignupHabit: !!presignupHabit,
      hasExistingHabit: !!hasExistingHabit,
    });
  }, [habits, presignupHabit, hasExistingHabit]);

  const handleStartHabit = () => {
    if (!user) return;
    markWelcomeHubSeen(user.id);
    trackFunnelEvent("welcome_hub_action", { action: "start_habit" });
    onDismiss("habit");
  };

  const handleShowMeAround = () => {
    if (!user) return;
    markWelcomeHubSeen(user.id);
    trackFunnelEvent("welcome_hub_action", { action: "tour" });
    onDismiss("tour");
  };

  const handleExplore = () => {
    if (!user) return;
    markWelcomeHubSeen(user.id);
    trackFunnelEvent("welcome_hub_action", { action: "explore" });
    onDismiss("explore");
  };

  const firstName = user?.email
    ? user.email.split("@")[0].replace(/[^a-zA-Z]/g, "").slice(0, 12)
    : null;

  const greeting = firstName && firstName.length > 2
    ? `Welcome, ${firstName.charAt(0).toUpperCase() + firstName.slice(1)}!`
    : "Welcome to HabitBuilder!";

  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto safe-top safe-bottom">
      <AnimatePresence mode="wait">
        {step === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="min-h-screen flex flex-col items-center justify-center px-5 py-8"
          >
            <div className="w-full max-w-md space-y-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
                className="flex justify-center"
              >
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-emerald-400/20 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-primary" />
                  </div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center"
                  >
                    <Star className="w-4 h-4 text-amber-500" />
                  </motion.div>
                </div>
              </motion.div>

              <div className="text-center space-y-3">
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl sm:text-3xl font-display font-bold text-foreground"
                  data-testid="text-welcome-greeting"
                >
                  {greeting}
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-muted-foreground text-base"
                >
                  You're all signed up and ready to go.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-primary/5 via-emerald-500/5 to-primary/5 dark:from-primary/10 dark:via-emerald-500/10 dark:to-primary/10 border border-primary/20 rounded-2xl p-5"
                data-testid="card-trial-welcome"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Crown className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      {trialDaysRemaining} days of Premium — free
                    </p>
                    <p className="text-xs text-muted-foreground">
                      No credit card needed
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Brain, text: "AI Coaching" },
                    { icon: Flame, text: "Unlimited Habits" },
                    { icon: Zap, text: "Focus Timer" },
                    { icon: Target, text: "Goals & More" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <item.icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setStep("features")}
                  className="mt-3 text-xs text-primary font-medium hover:underline"
                  data-testid="button-see-all-features"
                >
                  See all Premium features →
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-3"
              >
                {presignupHabit ? (
                  <Button
                    onClick={handleStartHabit}
                    size="lg"
                    className="w-full gap-2 h-14 rounded-xl text-base shadow-lg shadow-primary/20"
                    data-testid="button-welcome-start-habit"
                  >
                    <Rocket className="w-5 h-5" />
                    Start "{presignupHabit.title}"
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : hasExistingHabit ? (
                  <Button
                    onClick={handleStartHabit}
                    size="lg"
                    className="w-full gap-2 h-14 rounded-xl text-base shadow-lg shadow-primary/20"
                    data-testid="button-welcome-start-habit"
                  >
                    <Rocket className="w-5 h-5" />
                    Go to My Habits
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleStartHabit}
                    size="lg"
                    className="w-full gap-2 h-14 rounded-xl text-base shadow-lg shadow-primary/20"
                    data-testid="button-welcome-create-habit"
                  >
                    <Rocket className="w-5 h-5" />
                    Create My First Habit
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={handleShowMeAround}
                  size="lg"
                  className="w-full gap-2 h-12 rounded-xl"
                  data-testid="button-welcome-tour"
                >
                  <Compass className="w-5 h-5" />
                  Show Me Around
                </Button>

                <button
                  onClick={handleExplore}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                  data-testid="button-welcome-explore"
                >
                  I'll explore on my own
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {step === "features" && (
          <motion.div
            key="features"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen flex flex-col px-5 py-8"
          >
            <div className="w-full max-w-md mx-auto space-y-6 flex-1">
              <button
                onClick={() => setStep("welcome")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                data-testid="button-features-back"
              >
                ← Back
              </button>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-display font-bold text-foreground">
                    Your Premium Trial Includes
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Everything unlocked for {trialDaysRemaining} days. No credit card required.
                </p>
              </div>

              <div className="space-y-3">
                {PREMIUM_FEATURES.map((feature, i) => (
                  <motion.div
                    key={feature.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border/60"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">{feature.label}</p>
                      <p className="text-xs text-muted-foreground">{feature.desc}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0">
                      Free
                    </Badge>
                  </motion.div>
                ))}
              </div>

              <div className="pt-2 space-y-3">
                <Button
                  onClick={() => setStep("welcome")}
                  size="lg"
                  className="w-full gap-2 h-12 rounded-xl"
                  data-testid="button-features-continue"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
