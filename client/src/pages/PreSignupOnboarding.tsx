import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Dumbbell,
  Brain,
  BookOpen,
  Droplets,
  Moon,
  PenLine,
  GraduationCap,
  Target,
  Calendar,
  Clock,
  Zap,
  Users,
  LogIn,
} from "lucide-react";
import { Logo } from "@/components/Logo";

interface PresignupData {
  intent: string;
  habitTitle: string;
  customHabit: string;
  frequency: string;
  timeOfDay: string;
  experience: string;
}

interface GeneratedPlan {
  title: string;
  summary: string;
  schedule: string;
  startingWith: string;
  buildingTo: string;
  approach: string;
  day1Tasks: Array<{ task: string; duration: string }>;
  weekOverview: Array<{ day: number; focus: string }>;
  coachTip: string;
}

const HABITS = [
  { name: "Exercise", icon: Dumbbell, color: "text-orange-500", bg: "bg-orange-500/10 dark:bg-orange-500/20" },
  { name: "Meditate", icon: Brain, color: "text-purple-500", bg: "bg-purple-500/10 dark:bg-purple-500/20" },
  { name: "Read", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10 dark:bg-blue-500/20" },
  { name: "Drink Water", icon: Droplets, color: "text-cyan-500", bg: "bg-cyan-500/10 dark:bg-cyan-500/20" },
  { name: "Sleep Better", icon: Moon, color: "text-indigo-500", bg: "bg-indigo-500/10 dark:bg-indigo-500/20" },
  { name: "Journal", icon: PenLine, color: "text-amber-500", bg: "bg-amber-500/10 dark:bg-amber-500/20" },
  { name: "Wake Up Early", icon: Clock, color: "text-rose-500", bg: "bg-rose-500/10 dark:bg-rose-500/20" },
  { name: "Learn", icon: GraduationCap, color: "text-emerald-500", bg: "bg-emerald-500/10 dark:bg-emerald-500/20" },
];

const INTENTS = [
  { id: "build", label: "Build a new habit", desc: "Start something you've been wanting to do", icon: Sparkles },
  { id: "break", label: "Break a bad habit", desc: "Replace something that's holding you back", icon: Target },
  { id: "routine", label: "Build a better routine", desc: "Structure your days with more consistency", icon: Calendar },
  { id: "restart", label: "Get back on track", desc: "I had a habit but fell off", icon: ArrowRight },
];

const BUILDING_STEPS = [
  "Analyzing your schedule",
  "Creating daily sessions",
  "Building accountability triggers",
  "Personalizing your approach",
];

const pageVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

export default function PreSignupOnboarding({ onLogin }: { onLogin: () => void }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<PresignupData>({
    intent: "",
    habitTitle: "",
    customHabit: "",
    frequency: "",
    timeOfDay: "",
    experience: "",
  });
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState(0);
  const [error, setError] = useState("");

  const selectedHabit = data.habitTitle || data.customHabit.trim();

  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setGeneratingStep((prev) => (prev < BUILDING_STEPS.length - 1 ? prev + 1 : prev));
    }, 2000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const generatePlan = useCallback(async () => {
    setIsGenerating(true);
    setError("");
    setGeneratingStep(0);
    setStep(4);

    try {
      const res = await fetch("/api/presignup/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          habitTitle: selectedHabit,
          intent: data.intent,
          frequency: data.frequency,
          timeOfDay: data.timeOfDay,
          experience: data.experience,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Something went wrong" }));
        throw new Error(err.error || "Failed to generate plan");
      }

      const planData = await res.json();
      setPlan(planData);
      setStep(5);
    } catch (e: any) {
      setError(e.message || "Failed to generate plan. Please try again.");
      setStep(3);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedHabit, data]);

  const handleSavePlan = () => {
    localStorage.setItem(
      "presignup_data",
      JSON.stringify({
        habitTitle: selectedHabit,
        intent: data.intent,
        frequency: data.frequency,
        timeOfDay: data.timeOfDay,
        experience: data.experience,
        plan,
      })
    );
    onLogin();
  };

  const goBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const progressPercent = Math.min((step / 5) * 100, 100);

  return (
    <div className="min-h-screen bg-background flex flex-col safe-top safe-bottom">
      {step > 0 && step < 5 && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <button
              onClick={goBack}
              disabled={isGenerating}
              className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground disabled:opacity-30 disabled:pointer-events-none"
              data-testid="button-presignup-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Progress value={progressPercent} className="h-1.5 flex-1" />
            <button
              onClick={onLogin}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              data-testid="button-presignup-login"
            >
              Sign in
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="welcome"
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center text-center space-y-8"
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-center">
                    <Logo size="md" />
                  </div>

                  <div className="space-y-3">
                    <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground leading-tight">
                      Build habits that{" "}
                      <span className="text-primary">actually stick.</span>
                    </h1>
                    <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto">
                      Your AI coach creates a personalized action plan in 30 seconds — then walks you through it daily.
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-primary" />
                      <span>500+ people building better habits</span>
                    </div>
                  </div>
                </div>

                <div className="w-full space-y-3">
                  <Button
                    onClick={() => setStep(1)}
                    size="lg"
                    className="w-full gap-2 text-base h-14 rounded-xl"
                    data-testid="button-presignup-start"
                  >
                    Get My Custom Plan
                    <ArrowRight className="w-5 h-5" />
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    Free — no account needed to start
                  </p>
                </div>

                <button
                  onClick={onLogin}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-presignup-existing-login"
                >
                  <LogIn className="w-4 h-4" />
                  Already have an account? Sign in
                </button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="intent"
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h2 className="text-2xl font-display font-bold text-foreground" data-testid="text-presignup-intent-heading">
                    What brings you here?
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    This helps us personalize your experience
                  </p>
                </div>

                <div className="space-y-3">
                  {INTENTS.map((intent) => {
                    const Icon = intent.icon;
                    const selected = data.intent === intent.id;
                    return (
                      <Card
                        key={intent.id}
                        className={`p-4 cursor-pointer transition-all ${
                          selected
                            ? "border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary/30"
                            : "hover:border-muted-foreground/30"
                        }`}
                        onClick={() => {
                          setData({ ...data, intent: intent.id });
                          setTimeout(() => setStep(2), 300);
                        }}
                        data-testid={`card-intent-${intent.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground text-sm">{intent.label}</p>
                            <p className="text-xs text-muted-foreground">{intent.desc}</p>
                          </div>
                          {selected && <Check className="w-5 h-5 text-primary shrink-0" />}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="habit"
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h2 className="text-2xl font-display font-bold text-foreground" data-testid="text-presignup-habit-heading">
                    Pick your first habit
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    You can add more later — just start with one
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {HABITS.map((habit) => {
                    const Icon = habit.icon;
                    const selected = data.habitTitle === habit.name;
                    return (
                      <Card
                        key={habit.name}
                        className={`p-4 cursor-pointer transition-all text-center ${
                          selected
                            ? "border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary/30"
                            : "hover:border-muted-foreground/30"
                        }`}
                        onClick={() => {
                          setData({ ...data, habitTitle: habit.name, customHabit: "" });
                        }}
                        data-testid={`card-habit-${habit.name.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className={`w-12 h-12 rounded-xl ${habit.bg} flex items-center justify-center`}>
                            <Icon className={`w-6 h-6 ${habit.color}`} />
                          </div>
                          <span className="text-sm font-medium text-foreground">{habit.name}</span>
                          {selected && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-xs text-muted-foreground font-medium">Something else — type your own:</p>
                  <Input
                    placeholder="e.g., Practice guitar, Cook healthy meals..."
                    value={data.customHabit}
                    onChange={(e) => setData({ ...data, customHabit: e.target.value, habitTitle: "" })}
                    className="h-12"
                    data-testid="input-presignup-custom-habit"
                  />
                </div>

                <Button
                  onClick={() => setStep(3)}
                  disabled={!selectedHabit}
                  className="w-full gap-2 h-12 rounded-xl"
                  data-testid="button-presignup-habit-continue"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="setup"
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h2 className="text-2xl font-display font-bold text-foreground" data-testid="text-presignup-setup-heading">
                    Quick setup
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    So your AI coach can build the right plan
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/15" data-testid="text-interview-hint">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This is just a quick start. After signing up, you'll have the option to do a
                    <span className="font-semibold text-foreground"> deeper AI interview </span>
                    for a fully personalized plan.
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm" data-testid="text-presignup-error">
                    {error}
                  </div>
                )}

                <div className="space-y-5">
                  <div className="space-y-2.5">
                    <p className="text-sm font-medium text-foreground">How often?</p>
                    <div className="flex gap-2">
                      {["3x/week", "5x/week", "Daily"].map((freq) => (
                        <button
                          key={freq}
                          onClick={() => setData({ ...data, frequency: freq })}
                          className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all border ${
                            data.frequency === freq
                              ? "border-primary bg-primary/10 dark:bg-primary/20 text-primary"
                              : "border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/40"
                          }`}
                          data-testid={`button-freq-${freq.replace("/", "-")}`}
                        >
                          {freq}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-sm font-medium text-foreground">Best time of day?</p>
                    <div className="flex flex-wrap gap-2">
                      {["Morning", "Afternoon", "Evening"].map((time) => (
                        <button
                          key={time}
                          onClick={() => setData({ ...data, timeOfDay: time })}
                          className={`py-2.5 px-4 rounded-lg text-sm font-medium transition-all border ${
                            data.timeOfDay === time
                              ? "border-primary bg-primary/10 dark:bg-primary/20 text-primary"
                              : "border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/40"
                          }`}
                          data-testid={`button-time-${time.toLowerCase()}`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-sm font-medium text-foreground">Tried this before?</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "First time", value: "first-time" },
                        { label: "Tried, fell off", value: "tried-fell-off" },
                        { label: "Had it, lost it", value: "had-lost" },
                      ].map((exp) => (
                        <button
                          key={exp.value}
                          onClick={() => setData({ ...data, experience: exp.value })}
                          className={`py-2.5 px-4 rounded-lg text-sm font-medium transition-all border ${
                            data.experience === exp.value
                              ? "border-primary bg-primary/10 dark:bg-primary/20 text-primary"
                              : "border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/40"
                          }`}
                          data-testid={`button-exp-${exp.value}`}
                        >
                          {exp.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={generatePlan}
                  disabled={!data.frequency || !data.timeOfDay || !data.experience}
                  className="w-full gap-2 h-12 rounded-xl"
                  data-testid="button-presignup-build-plan"
                >
                  <Sparkles className="w-4 h-4" />
                  Build My Plan
                </Button>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="building"
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center text-center space-y-8 py-8"
              >
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <div className="absolute inset-2 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-display font-bold text-foreground">
                    Building your plan...
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Personalizing for {selectedHabit.toLowerCase()}, {data.frequency}
                  </p>
                </div>

                <div className="w-full max-w-xs space-y-3">
                  {BUILDING_STEPS.map((stepText, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: i <= generatingStep ? 1 : 0.3, x: 0 }}
                      transition={{ delay: i * 0.3, duration: 0.3 }}
                      className="flex items-center gap-3 text-sm"
                    >
                      {i < generatingStep ? (
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 text-primary" />
                        </div>
                      ) : i === generatingStep ? (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                        </div>
                      )}
                      <span className={i <= generatingStep ? "text-foreground" : "text-muted-foreground/50"}>
                        {stepText}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 5 && plan && (
              <motion.div
                key="reveal"
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div className="space-y-3">
                  <Badge className="bg-primary/10 text-primary border-primary/30 hover:bg-primary/10">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Your plan is ready
                  </Badge>

                  <h2 className="text-2xl font-display font-bold text-foreground" data-testid="text-presignup-plan-title">
                    {plan.title || `Your 7-Day ${selectedHabit} Plan`}
                  </h2>
                </div>

                <Card className="p-4 space-y-3 bg-muted/30">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">Schedule</p>
                      <p className="font-medium text-foreground">{plan.schedule || data.frequency}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">Starting with</p>
                      <p className="font-medium text-foreground">{plan.startingWith || "5 min/day"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">Building to</p>
                      <p className="font-medium text-foreground">{plan.buildingTo || "20 min/day"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">Approach</p>
                      <p className="font-medium text-foreground">{plan.approach || "Gradual build"}</p>
                    </div>
                  </div>
                </Card>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Day 1 Preview:</p>
                  <div className="space-y-2">
                    {(plan.day1Tasks || []).map((task, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border"
                        data-testid={`task-day1-${i}`}
                      >
                        <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">{task.task}</p>
                          {task.duration && (
                            <p className="text-xs text-muted-foreground mt-0.5">{task.duration}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {plan.coachTip && (
                  <Card className="p-3 bg-primary/5 dark:bg-primary/10 border-primary/20">
                    <div className="flex gap-2">
                      <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground">{plan.coachTip}</p>
                    </div>
                  </Card>
                )}

                <div className="space-y-3 pt-2">
                  <Button
                    onClick={handleSavePlan}
                    size="lg"
                    className="w-full gap-2 h-14 rounded-xl text-base"
                    data-testid="button-presignup-save"
                  >
                    Save My Plan & Start
                    <ArrowRight className="w-5 h-5" />
                  </Button>

                  <button
                    onClick={handleSavePlan}
                    className="w-full text-center text-sm text-primary hover:underline"
                    data-testid="button-presignup-create-account"
                  >
                    Create a free account to keep your plan
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
