import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, Leaf, ShieldCheck, Sparkles, Smartphone, Trophy, Target, Flame, BarChart3, Users, Zap, Crown, Check, X, CreditCard, BookOpen, Dumbbell, Brain, Apple, Moon, Pencil, Loader2, Send, Link2 } from "lucide-react";
import { InstallAppDialog } from "@/components/InstallAppDialog";
import { LoginTroubleshootDialog } from "@/components/LoginTroubleshootDialog";
import { SocialShare } from "@/components/SocialShare";
import { Logo, LogoFooter } from "@/components/Logo";
import { usePageTitle } from "@/hooks/use-page-title";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

const habitGoals = [
  {
    id: "exercise",
    label: "Exercise More",
    icon: Dumbbell,
    color: "text-orange-500 dark:text-orange-400",
    bgColor: "bg-orange-500/10",
    plan: {
      title: "Daily Exercise Routine",
      summary: "Build a sustainable fitness habit with progressive daily movement goals tailored to your schedule.",
      daily: [
        "5-minute morning stretch routine",
        "15-minute walk during lunch break",
        "10-minute evening bodyweight workout",
      ],
      weekly: [
        "Add 5 minutes to one session each week",
        "Try one new type of exercise",
        "Rest day with light yoga or stretching",
      ],
      insight: "Starting with just 30 minutes spread across the day makes exercise feel effortless. Most users hit their stride by week 2.",
    },
  },
  {
    id: "reading",
    label: "Read Daily",
    icon: BookOpen,
    color: "text-blue-500 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    plan: {
      title: "Daily Reading Habit",
      summary: "Transform reading from a chore into a highlight of your day with structured, achievable page goals.",
      daily: [
        "Read 10 pages before breakfast",
        "Jot down one key takeaway in a journal",
        "Replace 15 min of screen time with reading",
      ],
      weekly: [
        "Review your notes and reflect on themes",
        "Choose next book or topic to explore",
        "Share a favorite passage with a friend",
      ],
      insight: "10 pages a day adds up to 30+ books a year. The key is linking reading to an existing routine like your morning coffee.",
    },
  },
  {
    id: "meditation",
    label: "Meditate",
    icon: Brain,
    color: "text-purple-500 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
    plan: {
      title: "Mindfulness Practice",
      summary: "Develop a calming meditation practice that reduces stress and improves focus, starting with just 5 minutes.",
      daily: [
        "5-minute guided breathing after waking up",
        "1-minute mindful pause before lunch",
        "5-minute body scan before sleep",
      ],
      weekly: [
        "Increase one session by 2 minutes",
        "Try a new meditation technique",
        "Reflect on stress levels in your journal",
      ],
      insight: "Consistency beats duration. 5 minutes daily for a month builds more mental resilience than occasional 30-minute sessions.",
    },
  },
  {
    id: "eating",
    label: "Eat Healthier",
    icon: Apple,
    color: "text-green-500 dark:text-green-400",
    bgColor: "bg-green-500/10",
    plan: {
      title: "Healthy Eating Plan",
      summary: "Make nutritious choices automatic by building small, sustainable changes into your daily meals.",
      daily: [
        "Add one extra serving of vegetables to lunch",
        "Drink a glass of water before each meal",
        "Prep a healthy snack for the afternoon",
      ],
      weekly: [
        "Try one new healthy recipe",
        "Plan meals for the upcoming week",
        "Swap one processed food for a whole food",
      ],
      insight: "Adding healthy foods works better than restricting. Users who focus on adding vegetables see the biggest long-term improvements.",
    },
  },
  {
    id: "sleep",
    label: "Sleep Better",
    icon: Moon,
    color: "text-indigo-500 dark:text-indigo-400",
    bgColor: "bg-indigo-500/10",
    plan: {
      title: "Better Sleep Routine",
      summary: "Create a wind-down ritual that helps you fall asleep faster and wake up feeling refreshed.",
      daily: [
        "Set a consistent bedtime alarm",
        "No screens 30 minutes before bed",
        "5-minute wind-down journaling or stretching",
      ],
      weekly: [
        "Review sleep quality and adjust bedtime",
        "Optimize bedroom environment",
        "Track energy levels to find patterns",
      ],
      insight: "A consistent bedtime is the single biggest factor in sleep quality. Even shifting 15 minutes earlier can transform your mornings.",
    },
  },
  {
    id: "journaling",
    label: "Start Journaling",
    icon: Pencil,
    color: "text-amber-500 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    plan: {
      title: "Daily Journaling Practice",
      summary: "Build self-awareness and clarity through a simple, guided writing practice that takes just minutes.",
      daily: [
        "Write 3 things you're grateful for each morning",
        "Spend 5 minutes free-writing about your day",
        "Note one thing you learned or noticed today",
      ],
      weekly: [
        "Review the week's entries for patterns",
        "Write a letter to your future self",
        "Set one intention for the coming week",
      ],
      insight: "Gratitude journaling is scientifically proven to boost happiness. Most users notice improved mood within just 2 weeks.",
    },
  },
];

interface AIPlan {
  title: string;
  summary: string;
  daily: string[];
  weekly: string[];
  insight: string;
}

export default function Landing() {
  usePageTitle(undefined, "Build lasting habits with AI-powered coaching. Get personalized daily action plans, guided sessions with timers, streak tracking, XP leveling, and progress analytics. Free 2-day trial, then Pro at $6 USD/month or Premium at $15 USD/month.");
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const activeGoal = habitGoals.find((g) => g.id === selectedGoal);

  const [customGoal, setCustomGoal] = useState("");
  const [aiPlan, setAiPlan] = useState<AIPlan | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const scrollToLogin = () => {
    window.location.href = "/api/login";
  };

  const handleCustomGoalSubmit = async () => {
    if (!customGoal.trim() || customGoal.trim().length < 3) return;
    setAiLoading(true);
    setAiError(null);
    setAiPlan(null);
    setSelectedGoal(null);
    try {
      const response = await apiRequest("POST", "/api/demo-plan", { habitGoal: customGoal.trim() });
      const plan = await response.json();
      setAiPlan(plan);
    } catch (err: any) {
      const errorData = err?.message || "Something went wrong. Please try again.";
      setAiError(errorData);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-body overflow-x-hidden">
      <nav className="fixed top-0 w-full z-50 glass-panel border-b-0 rounded-none px-6 py-4" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <a href="/" aria-label="HabitBuilder.pro - Home" data-testid="link-logo-home">
            <Logo />
          </a>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Link href="/templates">
              <Button variant="ghost" size="sm" className="font-medium text-muted-foreground" data-testid="link-nav-templates">
                Templates
              </Button>
            </Link>
            <Link href="/blog">
              <Button variant="ghost" size="sm" className="font-medium text-muted-foreground" data-testid="link-nav-blog">
                Blog
              </Button>
            </Link>
            <Button onClick={scrollToLogin} variant="ghost" className="font-medium text-muted-foreground" data-testid="button-nav-signin">
              Sign In
            </Button>
            <Button onClick={scrollToLogin} data-testid="button-nav-get-started">
              Get Started Free
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden" aria-label="Hero - AI-powered habit coaching">
        <div className="absolute top-32 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute top-64 right-20 w-48 h-48 bg-accent/10 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute bottom-20 left-1/4 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl animate-float" />
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent font-medium text-sm">
              <Sparkles className="w-4 h-4" />
              <span>AI-powered habit coaching</span>
            </div>
            
            <h1 className="font-display text-5xl lg:text-7xl font-bold leading-tight tracking-tight text-foreground" data-testid="text-hero-headline">
              Build habits that <br />
              <span className="text-gradient">actually stick.</span>
            </h1>
            
            <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-xl">
              Your personal AI coach creates custom action plans, guides you through daily sessions, and keeps you motivated with streaks and achievements.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button onClick={scrollToLogin} size="lg" data-testid="button-hero-cta">
                Start Your Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => document.getElementById("try-it")?.scrollIntoView({ behavior: "smooth" })}
                data-testid="button-hero-preview"
              >
                See a Sample Plan
              </Button>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <span className="font-medium">No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>2-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Cancel anytime</span>
              </div>
            </div>
            <LoginTroubleshootDialog />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-3xl transform rotate-6 animate-pulse-glow" />
            <div className="relative glass-panel rounded-2xl p-6 shadow-2xl transform -rotate-2 border border-white/40">
              <div className="space-y-4">
                {[
                  { title: "Morning Meditation", progress: 100, icon: "complete" },
                  { title: "Daily Reading", progress: 60, icon: "active" },
                  { title: "Evening Walk", progress: 0, icon: "pending" }
                ].map((item, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 + i * 0.15 }}
                    className="flex items-center gap-4 p-4 bg-white/80 dark:bg-white/10 rounded-xl shadow-sm"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      item.icon === 'complete' ? 'bg-primary/20 text-primary' : 
                      item.icon === 'active' ? 'bg-accent/20 text-accent' : 
                      'bg-muted text-muted-foreground'
                    }`}>
                      {item.icon === 'complete' && <CheckCircle2 className="w-6 h-6" />}
                      {item.icon === 'active' && <Sparkles className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="text-sm font-medium text-foreground/80">{item.title}</div>
                      <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-primary rounded-full" 
                          initial={{ width: 0 }}
                          animate={{ width: `${item.progress}%` }}
                          transition={{ duration: 0.8, delay: 0.6 + i * 0.15 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-24 bg-white/50 dark:bg-card/30" id="try-it" aria-label="Try a sample habit plan">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12 space-y-4">
            <Badge variant="secondary" className="mb-2">
              <Zap className="w-3 h-3 mr-1" />
              Live AI Demo
            </Badge>
            <h2 className="font-display text-3xl lg:text-4xl font-bold" data-testid="text-tryit-heading">
              Try it now — type any habit goal
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Our AI coach will create a personalized action plan in seconds. Pick a popular goal or type your own.
            </p>
          </div>

          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Learn Spanish, Run a 5K, Practice guitar..."
                value={customGoal}
                onChange={(e) => setCustomGoal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCustomGoalSubmit()}
                className="flex-1"
                maxLength={200}
                data-testid="input-custom-goal"
              />
              <Button 
                onClick={handleCustomGoalSubmit} 
                disabled={aiLoading || customGoal.trim().length < 3}
                data-testid="button-generate-plan"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="ml-2 hidden sm:inline">Generate Plan</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
            {habitGoals.map((goal) => {
              const Icon = goal.icon;
              const isSelected = selectedGoal === goal.id;
              return (
                <button
                  key={goal.id}
                  onClick={() => {
                    setAiPlan(null);
                    setAiError(null);
                    setSelectedGoal(isSelected ? null : goal.id);
                  }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all cursor-pointer toggle-elevate ${
                    isSelected
                      ? "border-primary bg-primary/5 dark:bg-primary/10 toggle-elevated"
                      : "border-border/50 bg-white dark:bg-card"
                  }`}
                  data-testid={`button-goal-${goal.id}`}
                >
                  <div className={`p-2 rounded-lg ${goal.bgColor}`}>
                    <Icon className={`w-5 h-5 ${goal.color}`} />
                  </div>
                  <span className="text-sm font-medium text-center">{goal.label}</span>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {aiLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-muted-foreground">Creating your personalized plan...</p>
              </motion.div>
            )}

            {aiError && !aiLoading && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center py-8"
              >
                <p className="text-sm text-destructive" data-testid="text-ai-error">{aiError}</p>
              </motion.div>
            )}

            {aiPlan && !aiLoading && (
              <motion.div
                key="ai-plan"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
                data-testid="ai-plan-container"
              >
                <Card className="overflow-visible">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3 mb-1">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <Sparkles className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <Badge variant="secondary" className="mb-2">AI Generated</Badge>
                        <h3 className="font-display text-xl font-bold" data-testid="text-ai-plan-title">
                          {aiPlan.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">{aiPlan.summary}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mb-6 mt-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-sm">Daily Actions</span>
                        </div>
                        {aiPlan.daily?.map((item, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <BarChart3 className="w-4 h-4 text-accent" />
                          <span className="font-semibold text-sm">Weekly Goals</span>
                        </div>
                        {aiPlan.weekly?.map((item, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {aiPlan.insight && (
                      <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-2.5">
                          <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <div>
                            <span className="font-semibold text-sm">AI Insight</span>
                            <p className="text-sm text-muted-foreground mt-1">{aiPlan.insight}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t">
                      <p className="text-sm text-muted-foreground">
                        This plan was generated just for you. Sign up to get <span className="font-semibold text-foreground">guided daily sessions, progress tracking, and deeper coaching</span>.
                      </p>
                      <Button onClick={scrollToLogin} className="shrink-0" data-testid="button-ai-plan-signup">
                        Start Building This Habit
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeGoal && !aiPlan && !aiLoading && (
              <motion.div
                key={activeGoal.id}
                initial={{ opacity: 0, y: 20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ duration: 0.35 }}
                data-testid="preview-plan-container"
              >
                <Card className="overflow-visible">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3 mb-6">
                      <div className={`p-2 rounded-lg ${activeGoal.bgColor} shrink-0`}>
                        <activeGoal.icon className={`w-6 h-6 ${activeGoal.color}`} />
                      </div>
                      <div>
                        <h3 className="font-display text-xl font-bold" data-testid="text-plan-title">
                          {activeGoal.plan.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">{activeGoal.plan.summary}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-sm">Daily Actions</span>
                        </div>
                        {activeGoal.plan.daily.map((item, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-sm" data-testid={`text-daily-action-${i}`}>
                            <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <BarChart3 className="w-4 h-4 text-accent" />
                          <span className="font-semibold text-sm">Weekly Goals</span>
                        </div>
                        {activeGoal.plan.weekly.map((item, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-sm" data-testid={`text-weekly-goal-${i}`}>
                            <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-4 mb-6">
                      <div className="flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <span className="font-semibold text-sm">AI Insight</span>
                          <p className="text-sm text-muted-foreground mt-1" data-testid="text-ai-insight">
                            {activeGoal.plan.insight}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t">
                      <p className="text-sm text-muted-foreground">
                        This is just a preview. Sign up to get a <span className="font-semibold text-foreground">fully personalized plan</span> based on your schedule, experience, and goals.
                      </p>
                      <Button onClick={scrollToLogin} className="shrink-0" data-testid="button-preview-signup">
                        Get My Full Plan
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {!selectedGoal && !aiPlan && !aiLoading && !aiError && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-sm text-muted-foreground mt-6"
            >
              Type your own goal above or select a popular one to see an instant plan
            </motion.p>
          )}
        </div>
      </section>

      <section className="py-24" aria-label="Features">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-display text-3xl lg:text-4xl font-bold" data-testid="text-features-heading">Everything you need to grow</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              More than just a tracker. HabitBuilder.pro is an interactive coach that guides you through every step.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Sparkles className="w-7 h-7 text-primary" />,
                title: "AI Coaching Interview",
                desc: "Answer personalized questions about your goals, and AI creates a tailored action plan just for you."
              },
              {
                icon: <Target className="w-7 h-7 text-accent" />,
                title: "Guided Sessions",
                desc: "Step-by-step coaching walks you through each habit with timers, notes, and progress tracking."
              },
              {
                icon: <Flame className="w-7 h-7 text-orange-500 dark:text-orange-400" />,
                title: "Streaks & Achievements",
                desc: "Stay motivated with daily streaks, milestone badges, and a sense of accomplishment."
              },
              {
                icon: <Trophy className="w-7 h-7 text-amber-500 dark:text-amber-400" />,
                title: "XP & Leveling System",
                desc: "Earn XP through daily challenges, level up from Beginner to Habit Hero across 12 tiers."
              },
              {
                icon: <BarChart3 className="w-7 h-7 text-emerald-500 dark:text-emerald-400" />,
                title: "Progress Analytics",
                desc: "Track your journey with visual charts, completion rates, and mood correlation insights."
              },
              {
                icon: <Users className="w-7 h-7 text-blue-500 dark:text-blue-400" />,
                title: "Community Forum (Coming Soon)",
                desc: "Connect with fellow habit builders, share tips, find accountability partners, and stay inspired."
              },
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="bg-white dark:bg-card p-6 rounded-xl border border-border/50"
                data-testid={`card-feature-${i}`}
              >
                <div className="mb-4 p-2.5 bg-background dark:bg-muted rounded-lg w-fit">
                  {feature.icon}
                </div>
                <h3 className="font-display text-lg font-bold mb-2" data-testid={`text-feature-title-${i}`}>{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mt-12 text-center"
          >
            <Button onClick={scrollToLogin} size="lg" data-testid="button-cta-features">
              Try It Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <p className="mt-3 text-sm text-muted-foreground">No credit card needed</p>
          </motion.div>
        </div>
      </section>

      <section className="py-24 px-6 bg-white/50 dark:bg-card/30" aria-label="Habit Stacking">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <Badge variant="secondary" className="gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                Premium Feature
              </Badge>
              <h2 className="font-display text-3xl lg:text-4xl font-bold" data-testid="text-stacking-heading">
                Build powerful routines with Habit Stacking
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Chain your habits together so finishing one naturally flows into the next. 
                Based on the proven "habit stacking" technique from behavioral science, 
                this feature helps you build unstoppable daily routines.
              </p>
              <ul className="space-y-3">
                {[
                  "Link any two habits into a chain",
                  "Finish one habit and seamlessly start the next",
                  "Build morning routines, evening wind-downs, or workout flows",
                  "See your full habit chain at a glance on the dashboard",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button onClick={scrollToLogin} className="gap-2" data-testid="button-cta-stacking">
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <Card data-testid="card-stacking-demo">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <Link2 className="w-5 h-5 text-primary" />
                    <span className="font-display font-bold">Your Morning Stack</span>
                  </div>
                  {[
                    { title: "5-Minute Meditation", icon: Brain, color: "text-violet-500 dark:text-violet-400", bg: "bg-violet-500/10" },
                    { title: "Morning Journaling", icon: Pencil, color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-500/10" },
                    { title: "Healthy Breakfast", icon: Apple, color: "text-green-500 dark:text-green-400", bg: "bg-green-500/10" },
                    { title: "20-Minute Workout", icon: Dumbbell, color: "text-orange-500 dark:text-orange-400", bg: "bg-orange-500/10" },
                  ].map((habit, i, arr) => (
                    <div key={i}>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50" data-testid={`demo-stack-item-${i}`}>
                        <div className={`w-9 h-9 rounded-lg ${habit.bg} flex items-center justify-center shrink-0`}>
                          <habit.icon className={`w-4.5 h-4.5 ${habit.color}`} />
                        </div>
                        <span className="text-sm font-medium">{habit.title}</span>
                        <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto shrink-0" />
                      </div>
                      {i < arr.length - 1 && (
                        <div className="flex justify-center py-1">
                          <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90" />
                        </div>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Complete each habit to unlock the next in your chain
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6" id="pricing" aria-label="Pricing plans">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-display text-3xl lg:text-4xl font-bold" data-testid="text-pricing-heading">Simple, transparent pricing</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Start with a free trial, then pick the plan that works for you. Cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0 }}
            >
              <Card className="h-full flex flex-col" data-testid="card-pricing-trial">
                <CardContent className="pt-6 flex-1 flex flex-col">
                  <div className="text-center mb-6">
                    <div className="inline-flex justify-center mb-3">
                      <Leaf className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-display text-xl font-bold" data-testid="text-plan-trial">Free Trial</h3>
                    <p className="text-sm text-muted-foreground mt-1">Try it for 2 days</p>
                    <div className="mt-3">
                      <span className="text-4xl font-display font-bold">$0</span>
                    </div>
                  </div>
                  <ul className="space-y-2.5 flex-1">
                    {[
                      "Up to 3 habits",
                      "AI coaching interview",
                      "Personalized action plans",
                      "Basic streaks & tracking",
                      "Habit templates library",
                    ].map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                    {[
                      "Advanced analytics",
                      "Community forum (coming soon)",
                      "Voice notes",
                    ].map((f, i) => (
                      <li key={`no-${i}`} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <X className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button onClick={scrollToLogin} variant="outline" className="w-full mt-6" data-testid="button-pricing-trial">
                    Start Free Trial
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Card className="h-full flex flex-col relative border-primary shadow-lg shadow-primary/20" data-testid="card-pricing-pro">
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
                <CardContent className="pt-6 flex-1 flex flex-col">
                  <div className="text-center mb-6">
                    <div className="inline-flex justify-center mb-3">
                      <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-display text-xl font-bold" data-testid="text-plan-pro">Pro</h3>
                    <p className="text-sm text-muted-foreground mt-1">For serious habit builders</p>
                    <div className="mt-3">
                      <span className="text-4xl font-display font-bold text-primary">$6</span>
                      <span className="text-muted-foreground">/month</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">USD</span>
                    </div>
                  </div>
                  <ul className="space-y-2.5 flex-1">
                    {[
                      "Unlimited habits",
                      "AI coaching & action plans",
                      "Guided sessions with summaries",
                      "Streaks & achievements",
                      "XP & leveling system",
                      "Weekly reports",
                      "Community forum (coming soon)",
                      "Habit templates library",
                    ].map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button onClick={scrollToLogin} className="w-full mt-6" data-testid="button-pricing-pro">
                    Get Started
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Card className="h-full flex flex-col" data-testid="card-pricing-premium">
                <CardContent className="pt-6 flex-1 flex flex-col">
                  <div className="text-center mb-6">
                    <div className="inline-flex justify-center mb-3">
                      <Crown className="w-8 h-8 text-amber-500" />
                    </div>
                    <h3 className="font-display text-xl font-bold" data-testid="text-plan-premium">Premium</h3>
                    <p className="text-sm text-muted-foreground mt-1">The complete experience</p>
                    <div className="mt-3">
                      <span className="text-4xl font-display font-bold text-amber-500">$15</span>
                      <span className="text-muted-foreground">/month</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">USD</span>
                    </div>
                  </div>
                  <ul className="space-y-2.5 flex-1">
                    {[
                      "Everything in Pro",
                      "AI Coach Chat (150 msgs/month)",
                      "Advanced analytics & trends",
                      "AI-generated insights & reports",
                      "Habit stacking & linking",
                      "Community forum (coming soon)",
                      "Direct messaging",
                      "Voice notes",
                      "Accountability partners",
                      "Editable templates",
                      "CSV data export",
                      "Priority support",
                    ].map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button onClick={scrollToLogin} variant="outline" className="w-full mt-6" data-testid="button-pricing-premium">
                    Get Started
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            All plans start with a 2-day free trial. No credit card required to start.
          </p>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Prices shown in USD. International payments accepted worldwide.
          </p>
        </div>
      </section>

      <section className="py-24 px-6 bg-white/50 dark:bg-card/30" aria-label="Testimonials">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-display text-3xl lg:text-4xl font-bold">Loved by habit builders</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              See what our members are saying about their transformation.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              {
                quote: "I've tried so many habit apps, but this one finally made it click. The guided sessions keep me accountable, and I've maintained my morning routine for 3 months straight!",
                name: "Sarah M.",
                role: "Marketing Manager",
                streak: "90-day streak"
              },
              {
                quote: "The AI action plans are a game-changer. It broke down my goal of reading more into simple daily steps. Now I read 30 minutes every day without even thinking about it.",
                name: "James K.",
                role: "Software Developer",
                streak: "45-day streak"
              }
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white dark:bg-card p-8 rounded-xl border border-border/50"
                data-testid={`card-testimonial-${i}`}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Sparkles key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-foreground/80 leading-relaxed mb-6 italic">"{testimonial.quote}"</p>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                  <Badge variant="secondary">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {testimonial.streak}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <h2 className="font-display text-3xl lg:text-4xl font-bold">
              Every day you wait is a day without progress
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              The best time to start was yesterday. The second best time is right now. Your future self will thank you for taking action today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button onClick={scrollToLogin} size="lg" data-testid="button-cta-urgency">
                Start Your Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-primary" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-primary" />
                <span>Set up in under 2 minutes</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="py-12 border-t border-border" role="contentinfo">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8">
            <div className="space-y-4">
              <LogoFooter />
              <p className="text-xs text-muted-foreground max-w-md">
                Build better habits with personalized AI coaching. Daily habit tracker, guided sessions, streak tracking, XP leveling system, and progress analytics. Available on web and mobile.
              </p>
              <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} HabitBuilder.pro. All rights reserved.</p>
              <InstallAppDialog 
                trigger={
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" data-testid="button-get-app-landing">
                    <Smartphone className="w-4 h-4" />
                    Want this site as an app?
                  </Button>
                }
              />
            </div>
            <div className="flex flex-col items-start md:items-end gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Link href="/templates" className="text-sm text-muted-foreground hover:text-foreground">Templates</Link>
                <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">Blog</Link>
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-privacy-policy">Privacy Policy</Link>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Share the love:</p>
                <SocialShare variant="compact" />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
