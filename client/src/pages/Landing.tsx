import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";

// Update these URLs once the app is live in each store
const APP_STORE_URL = "https://apps.apple.com/us/app/habitbuilder-pro/id6759849704";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=pro.habitbuilder.app";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2, Leaf, ShieldCheck, Sparkles, Smartphone, Trophy, Target, Flame, BarChart3, Users, Zap, Crown, Check, X, CreditCard, BookOpen, Dumbbell, Brain, Apple, Moon, Pencil, Loader2, Send, Link2, Clock, Star, MessageCircle, Layers, ExternalLink, Lightbulb, Calendar, TrendingUp, Video, FileText, LogIn, ChevronLeft, ChevronRight, PenLine, Timer, Heart, Bell, CheckSquare } from "lucide-react";
import { InstallAppDialog } from "@/components/InstallAppDialog";
import { LoginTroubleshootDialog } from "@/components/LoginTroubleshootDialog";
import { SocialShare } from "@/components/SocialShare";
import { LogoFooter } from "@/components/Logo";
import { usePageTitle } from "@/hooks/use-page-title";
import { SeoSchema } from "@/components/SeoSchema";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { PublicNav } from "@/components/PublicNav";
import { useQuery } from "@tanstack/react-query";
import { SiGoogle, SiApple } from "react-icons/si";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

interface DemoTask {
  task: string;
  duration?: string;
  xp: number;
}

interface DemoResource {
  name: string;
  type: string;
  searchQuery: string;
  url?: string;
}

interface AIPlan {
  title: string;
  summary: string;
  daily: DemoTask[] | string[];
  weekly: DemoTask[] | string[];
  monthly?: DemoTask[];
  insight: string;
  tips?: string[];
  resources?: DemoResource[];
  coachMessage?: string;
  stackSuggestion?: string;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

import { openAuthFlow } from "@/lib/auth-flow";

async function openAuthFlowWithUtm() {
  return openAuthFlow();
}

function LoginTransitionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const handleContinue = async () => {
    onOpenChange(false);
    await openAuthFlowWithUtm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-login-transition">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-display">Create your account in seconds</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <p className="text-center text-muted-foreground text-sm">
            Sign in securely — use your Google, Apple, or email account.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleContinue}
              className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 w-full text-left hover-elevate cursor-pointer"
              data-testid="button-continue-google"
            >
              <div className="w-10 h-10 rounded-full bg-background border flex items-center justify-center shrink-0">
                <SiGoogle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Continue with Google</p>
                <p className="text-xs text-muted-foreground">Use your Gmail or Google account</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
            <button
              onClick={handleContinue}
              className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 w-full text-left hover-elevate cursor-pointer"
              data-testid="button-continue-apple"
            >
              <div className="w-10 h-10 rounded-full bg-background border flex items-center justify-center shrink-0">
                <SiApple className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Continue with Apple</p>
                <p className="text-xs text-muted-foreground">Use your Apple ID</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
            <div className="relative flex items-center py-1">
              <div className="flex-1 border-t border-border/50" />
              <span className="px-3 text-xs text-muted-foreground">or</span>
              <div className="flex-1 border-t border-border/50" />
            </div>
            <button
              onClick={handleContinue}
              className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 w-full text-left hover-elevate cursor-pointer"
              data-testid="button-continue-email"
            >
              <div className="w-10 h-10 rounded-full bg-background border flex items-center justify-center shrink-0">
                <LogIn className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Continue with Email</p>
                <p className="text-xs text-muted-foreground">Create an account with email & password</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          </div>
          <p className="text-xs text-center text-muted-foreground bg-muted/40 rounded-lg p-3">
            You'll be taken to a secure sign-in page. Choose Google, Apple, or create an account with email & password.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Secure & encrypted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              <span>No credit card needed</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LandingPricing({ scrollToLogin }: { scrollToLogin: () => void }) {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section className="py-12 md:py-20 px-4 sm:px-6 relative" id="pricing" aria-label="Pricing plans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,hsl(var(--primary)/0.04),transparent)]" />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-8 md:mb-12 space-y-2 md:space-y-3">
          <Badge variant="secondary" className="mb-2 px-3 py-1 text-xs font-semibold shadow-sm">
            <CreditCard className="w-3.5 h-3.5 mr-1.5 text-primary" />
            Pricing
          </Badge>
          <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold" data-testid="text-pricing-heading">Simple, transparent pricing</h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Start with a 7-day free trial of all Premium features. Then keep 1 habit free forever, or subscribe for unlimited habits and full AI coaching.
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-3 p-1.5 rounded-lg border bg-muted/50" data-testid="toggle-landing-billing">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${!isAnnual ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
              data-testid="button-landing-monthly"
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${isAnnual ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
              data-testid="button-landing-annual"
            >
              Annual
              <Badge variant="secondary" className="text-xs">
                Save up to 30%
              </Badge>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
          <Card className="h-full flex flex-col bg-card/80" data-testid="card-pricing-trial">
            <CardContent className="pt-6 flex-1 flex flex-col">
              <div className="text-center mb-6">
                <div className="inline-flex justify-center mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center icon-container shadow-md">
                    <Leaf className="w-6 h-6 text-muted-foreground" />
                  </div>
                </div>
                <h3 className="font-display text-xl font-bold" data-testid="text-plan-trial">Free Plan</h3>
                <p className="text-sm text-muted-foreground mt-1">7-day Premium trial included</p>
                <div className="mt-3">
                  <span className="text-4xl font-display font-bold">$0</span>
                </div>
              </div>
              <ul className="space-y-2.5 flex-1">
                {[
                  "7-day trial with all Premium features",
                  "1 habit free forever after trial",
                  "First AI action plan",
                  "Habit templates library",
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
                {[
                  "AI coaching insights",
                  "Streaks & achievements",
                  "Productivity tools",
                  "Unlimited sessions",
                ].map((f, i) => (
                  <li key={`no-${i}`} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <X className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button onClick={scrollToLogin} variant="outline" className="w-full mt-6 font-semibold" data-testid="button-pricing-trial">
                Start Free Trial
              </Button>
            </CardContent>
          </Card>

          <Card className={`h-full flex flex-col relative border-primary shadow-xl shadow-primary/15 ring-1 ring-primary/30 ${isAnnual ? 'md:scale-[1.03]' : 'md:scale-[1.03]'}`} data-testid="card-pricing-pro">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] to-transparent rounded-[inherit] pointer-events-none" />
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 shadow-md">
              Most Popular
            </Badge>
            <CardContent className="pt-6 flex-1 flex flex-col relative">
              <div className="text-center mb-6">
                <div className="inline-flex justify-center mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center icon-container shadow-md">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <h3 className="font-display text-xl font-bold" data-testid="text-plan-pro">Pro</h3>
                <p className="text-sm text-muted-foreground mt-1">For serious habit builders</p>
                <div className="mt-3">
                  {isAnnual ? (
                    <>
                      <span className="text-lg text-muted-foreground line-through">$6/mo</span>
                      <br />
                      <span className="text-4xl font-display font-bold text-primary">$4</span>
                      <span className="text-muted-foreground">/mo</span>
                      <span className="block text-sm text-muted-foreground mt-1">$48/year, billed annually</span>
                      <Badge variant="secondary" className="mt-1 text-xs">Save $24/year</Badge>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-display font-bold text-primary">$6</span>
                      <span className="text-muted-foreground">/month</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">USD</span>
                    </>
                  )}
                </div>
              </div>
              <ul className="space-y-2.5 flex-1">
                {[
                  "Unlimited habits",
                  "AI coaching & action plans",
                  "Guided sessions with summaries",
                  "Daily journal",
                  "Focus timer (Pomodoro)",
                  "Mood tracking & check-ins",
                  "Streaks & achievements",
                  "XP & leveling system",
                  "Daily challenges",
                  "Weekly progress reports",
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button onClick={scrollToLogin} size="lg" className="w-full mt-6 shadow-lg shadow-primary/25" data-testid="button-pricing-pro">
                Get Started
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="h-full flex flex-col relative" data-testid="card-pricing-premium">
            <CardContent className="pt-6 flex-1 flex flex-col">
              <div className="text-center mb-6">
                <div className="inline-flex justify-center mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center icon-container shadow-md">
                    <Crown className="w-6 h-6 text-amber-500" />
                  </div>
                </div>
                <h3 className="font-display text-xl font-bold" data-testid="text-plan-premium">Premium</h3>
                <p className="text-sm text-muted-foreground mt-1">The complete experience</p>
                <div className="mt-3">
                  {isAnnual ? (
                    <>
                      <span className="text-lg text-muted-foreground line-through">$15/mo</span>
                      <br />
                      <span className="text-4xl font-display font-bold text-amber-500">~$12</span>
                      <span className="text-muted-foreground">/mo</span>
                      <span className="block text-sm text-muted-foreground mt-1">$140/year, billed annually</span>
                      <Badge variant="secondary" className="mt-1 text-xs">Save $40/year</Badge>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-display font-bold text-amber-500">$15</span>
                      <span className="text-muted-foreground">/month</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">USD</span>
                    </>
                  )}
                </div>
              </div>
              <ul className="space-y-2.5 flex-1">
                {[
                  "Everything in Pro",
                  "AI Coach Chat (150 msgs/month)",
                  "Goals & milestones tracking",
                  "Smart Daily Planner (AI-powered)",
                  "Full Journal AI Analysis",
                  "Habit stacking & linking",
                  "Advanced analytics & trends",
                  "Accountability partners",
                  "Community forum & messaging",
                  "Voice notes",
                  "Unlockable accent colors",
                  "CSV data export",
                  "Priority support",
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button onClick={scrollToLogin} variant="outline" className="w-full mt-6 font-semibold border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/5" data-testid="button-pricing-premium">
                Get Started
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          7-day free Premium trial, then 1 habit free forever. No credit card required.
        </p>
        <p className="text-center text-xs text-muted-foreground mt-2">
          Prices shown in USD. International payments accepted worldwide.
        </p>
      </div>
    </section>
  );
}

const testimonials = [
  {
    quote: "I was skeptical about another habit app, but the AI interview actually understood what I was trying to do. Within a week, I had a morning routine that felt natural instead of forced.",
    name: "Sarah M.",
    role: "Early Tester",
    streak: "7-day streak"
  },
  {
    quote: "What sold me was the guided sessions. Instead of just checking a box, it walks you through each step with coaching tips. After a week of using it, I genuinely look forward to my daily routine.",
    name: "James K.",
    role: "Beta Tester",
    streak: "10-day streak"
  },
  {
    quote: "The habit stacking feature changed everything for me. I linked my reading habit to my morning coffee, and now I've read more books in 2 months than I did all last year. The AI suggestions for stacking are spot-on.",
    name: "Maria L.",
    role: "Pro Member",
    streak: "21-day streak"
  },
  {
    quote: "As someone with ADHD, I've tried every productivity system out there. HabitBuilder's guided sessions with built-in timers keep me on track without feeling overwhelming. The streak tracking gives me that extra push to stay consistent.",
    name: "David R.",
    role: "Premium Member",
    streak: "30-day streak"
  }
];

function TestimonialsSection({ fadeUp, shouldAnimate, isMobile }: { fadeUp: any; shouldAnimate: boolean; isMobile: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const scrollToCard = (idx: number) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const cards = container.children;
    if (cards[idx]) {
      const card = cards[idx] as HTMLElement;
      const scrollLeft = card.offsetLeft - (container.offsetWidth - card.offsetWidth) / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const scrollLeft = container.scrollLeft;
    const cardWidth = container.children[0]?.clientWidth || 1;
    const gap = 12;
    const idx = Math.round(scrollLeft / (cardWidth + gap));
    setActiveIdx(Math.min(idx, testimonials.length - 1));
  };

  return (
    <section className="py-12 md:py-24 px-4 sm:px-6 bg-white/50 dark:bg-card/30" aria-label="Testimonials">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 md:mb-16 space-y-3 md:space-y-4">
          <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold">What our users say</h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Real feedback from people building better habits.
          </p>
        </div>

        {isMobile ? (
          <div className="relative">
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 -mx-4 px-4"
              data-testid="testimonial-carousel"
            >
              {testimonials.map((testimonial, i) => (
                <div
                  key={i}
                  className="w-[85%] min-w-[85%] max-w-[85%] snap-center bg-white dark:bg-card p-5 rounded-2xl border border-border/50 shadow-sm touch-card flex-shrink-0 overflow-hidden"
                  data-testid={`card-testimonial-${i}`}
                >
                  <div className="flex gap-1 mb-3">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-foreground/80 leading-relaxed mb-4 italic text-sm">"{testimonial.quote}"</p>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold text-foreground text-sm">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {testimonial.streak}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 mt-3">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollToCard(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === activeIdx ? 'bg-primary w-5' : 'bg-muted-foreground/30'
                  }`}
                  aria-label={`Go to testimonial ${i + 1}`}
                  data-testid={`dot-testimonial-${i}`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 md:gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ duration: 0.5, delay: shouldAnimate ? i * 0.1 : 0 }}
                className="bg-white dark:bg-card p-6 md:p-8 rounded-2xl border border-border/50 shadow-sm"
                data-testid={`card-testimonial-${i}`}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-foreground/80 leading-relaxed mb-6 italic text-sm md:text-base">"{testimonial.quote}"</p>
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
        )}
      </div>
    </section>
  );
}

function StickyMobileCTA({ onClick }: { onClick: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden" data-testid="sticky-mobile-cta">
      <div className="bg-background/95 backdrop-blur-md border-t border-border/50 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <Button onClick={onClick} size="lg" className="w-full shadow-lg shadow-primary/25" data-testid="button-sticky-cta">
          Start Free — Takes 30 Seconds
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function Landing() {
  usePageTitle(undefined, "Build lasting habits with AI-powered coaching. Get personalized daily action plans, guided sessions with timers, streak tracking, XP leveling, and progress analytics. Try 1 habit free, Pro at $6 USD/month or Premium at $15 USD/month.");
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [customGoal, setCustomGoal] = useState("");
  const [aiPlan, setAiPlan] = useState<AIPlan | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showLoggedOutBanner, setShowLoggedOutBanner] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("logged_out") === "true") {
      window.history.replaceState({}, "", window.location.pathname);
      return true;
    }
    return false;
  });
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !isMobile && !prefersReducedMotion;

  

  const scrollToLogin = () => {
    setShowLoginDialog(true);
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

  const mobileMotion = {
    initial: { opacity: 1 },
    animate: { opacity: 1 },
    whileInView: { opacity: 1 },
  };

  const fadeUp = shouldAnimate
    ? { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } }
    : mobileMotion;

  return (
    <div className="min-h-screen bg-background font-body overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "HabitBuilder.pro",
        "url": "https://habitbuilder.pro",
        "description": "Build lasting habits with AI-powered coaching. Get personalized daily action plans, guided sessions with timers, streak tracking, XP leveling, and progress analytics.",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://habitbuilder.pro/blog?q={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "HabitBuilder.pro",
        "url": "https://habitbuilder.pro",
        "logo": "https://habitbuilder.pro/icon-192.png",
        "description": "AI-powered habit coaching application grounded in evidence-based behavioral science.",
        "founder": {
          "@type": "Person",
          "name": "John Singleton",
          "jobTitle": "Founder",
          "address": { "@type": "PostalAddress", "addressLocality": "Dallas", "addressRegion": "TX", "addressCountry": "US" }
        },
        "contactPoint": { "@type": "ContactPoint", "email": "admin@habitbuilder.pro", "contactType": "customer service" },
        "sameAs": ["https://www.instagram.com/habitbuilder.pro"]
      }) }} />
      <SeoSchema breadcrumbs={[
        { name: "Home", url: "https://habitbuilder.pro/" }
      ]} />
      <PublicNav />

      <AnimatePresence>
        {showLoggedOutBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="fixed top-[56px] md:top-[72px] left-0 right-0 z-50 bg-emerald-600 text-white shadow-md"
            data-testid="banner-logged-out"
          >
            <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3 relative pr-10">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium text-center">
                You've been signed out successfully. To use a different account, sign in below.
              </span>
              <button
                onClick={() => setShowLoggedOutBanner(false)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 transition-colors"
                data-testid="button-dismiss-logged-out"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <LoginTransitionDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} />
      <StickyMobileCTA onClick={scrollToLogin} />

      

      <section className="relative pb-12 md:pb-20 lg:pb-32 px-4 sm:px-6 overflow-hidden pt-20 md:pt-32 lg:pt-48" aria-label="Hero - AI-powered habit coaching">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-accent/[0.06]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)]" />
        {!isMobile && (
          <>
            <div className="absolute top-20 left-[5%] w-72 h-72 bg-primary/[0.08] rounded-full blur-[100px] animate-float-slow" />
            <div className="absolute top-40 right-[10%] w-60 h-60 bg-accent/[0.08] rounded-full blur-[100px] animate-float-delayed" />
            <div className="absolute bottom-10 left-[30%] w-40 h-40 bg-emerald-400/[0.06] rounded-full blur-[80px] animate-float" />
            <div className="absolute top-1/2 right-[5%] w-32 h-32 bg-primary/[0.05] rounded-full blur-[60px] animate-float" />
          </>
        )}
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-16 items-center relative z-10">
          <div className="space-y-5 md:space-y-8">
            <motion.div
              initial={shouldAnimate ? { opacity: 0, y: 10 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-full bg-primary/10 border border-primary/25 text-primary font-semibold text-xs md:text-sm shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>AI-powered habit coaching</span>
            </motion.div>
            
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-foreground" data-testid="text-hero-headline">
              Build habits that <br className="hidden sm:block" />
              <span className="text-gradient">actually stick.</span>
            </h1>
            
            <p className="text-base md:text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-xl">
              Your personal AI coach creates custom action plans, guides you through daily sessions, and keeps you motivated with streaks and achievements.
            </p>

            <div className="flex flex-wrap gap-2" data-testid="hero-use-case-chips">
              {[
                { icon: <Brain className="w-3.5 h-3.5" />, label: "AI Habit Coaching", color: "text-violet-500" },
                { icon: <Calendar className="w-3.5 h-3.5" />, label: "Daily Planner", color: "text-sky-500" },
                { icon: <PenLine className="w-3.5 h-3.5" />, label: "Journal", color: "text-indigo-500" },
                { icon: <Heart className="w-3.5 h-3.5" />, label: "Mood Tracker", color: "text-rose-500" },
                { icon: <CheckSquare className="w-3.5 h-3.5" />, label: "Quick Tasks", color: "text-emerald-500" },
              ].map((chip) => (
                <span key={chip.label} className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/70 bg-white dark:bg-card/60 border border-border/60 rounded-full px-3 py-1.5 shadow-sm">
                  <span className={chip.color}>{chip.icon}</span>
                  {chip.label}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <Button onClick={scrollToLogin} size="lg" className="w-full sm:w-auto text-base shadow-lg shadow-primary/25" data-testid="button-hero-cta">
                Start Free — Takes 30 Seconds
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => document.getElementById("try-it")?.scrollIntoView({ behavior: "smooth" })}
                data-testid="button-hero-preview"
              >
                See a Sample Plan
              </Button>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <SiGoogle className="w-4 h-4" />
                <SiApple className="w-4 h-4" />
              </div>
              <span>Sign in with Google or Apple — no new password needed</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 md:gap-x-6 gap-y-2 text-xs md:text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5 md:gap-2">
                <CreditCard className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                <span className="font-medium">No credit card required</span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                <span>1 habit free forever</span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                <span>Cancel anytime</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1" data-testid="div-store-badges">
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-app-store"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-all shadow-md hover:shadow-lg"
              >
                <SiApple className="w-4 h-4 shrink-0" />
                <span className="leading-tight">
                  <span className="block text-[10px] font-normal opacity-80">Download on the</span>
                  App Store
                </span>
              </a>
              <div
                data-testid="div-play-store-coming-soon"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground/40 text-background text-xs font-medium cursor-not-allowed shadow-sm"
                title="Android app coming soon"
              >
                <Smartphone className="w-4 h-4 shrink-0 opacity-60" />
                <span className="leading-tight">
                  <span className="block text-[10px] font-normal opacity-60">Coming soon to</span>
                  Google Play
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <LoginTroubleshootDialog />
              <a href="https://replit.com/forgot" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground underline" data-testid="link-forgot-password">
                Forgot your password?
              </a>
            </div>
          </div>

          {isMobile ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="mt-2"
              data-testid="mobile-hero-preview"
            >
              <div className="bg-gradient-to-br from-card to-card/80 dark:from-card dark:to-card/90 rounded-xl p-3 shadow-lg border border-border/60">
                <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-border/40">
                  <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-primary" />
                  </div>
                  <span className="font-display font-semibold text-xs">Today's Progress</span>
                  <Badge variant="secondary" className="ml-auto text-xs">3 habits</Badge>
                </div>
                <div className="flex gap-2">
                  {[
                    { title: "Meditation", progress: 100, icon: Brain, color: "text-violet-500", bg: "bg-violet-500/10" },
                    { title: "Reading", progress: 60, icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { title: "Walk", progress: 0, icon: Target, color: "text-emerald-500", bg: "bg-emerald-500/10" }
                  ].map((item, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 p-2 bg-muted/40 dark:bg-muted/20 rounded-lg">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.bg}`}>
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <span className="text-xs font-medium text-center leading-tight">{item.title}</span>
                      <div className="w-full h-1 bg-foreground/[0.06] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${item.progress === 100 ? 'bg-primary' : item.progress > 0 ? 'bg-accent' : 'bg-transparent'}`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      {item.progress === 100 && <CheckCircle2 className="w-3 h-3 text-primary" />}
                      {item.progress > 0 && item.progress < 100 && <span className="text-xs text-muted-foreground">{item.progress}%</span>}
                      {item.progress === 0 && <span className="text-xs text-muted-foreground">6 PM</span>}
                    </div>
                  ))}
                </div>
                <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-500" />
                    <span className="text-xs font-medium">7-day streak</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-amber-500" />
                    <span className="text-xs font-medium">Lvl 3</span>
                  </div>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    <Star className="w-2.5 h-2.5 mr-0.5 text-amber-500" />
                    245 XP
                  </Badge>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
              className="relative hidden lg:block"
            >
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20 rounded-3xl blur-3xl animate-pulse-glow" />
              <div className="relative rounded-2xl overflow-visible">
                <div className="bg-gradient-to-br from-card to-card/80 dark:from-card dark:to-card/90 rounded-2xl p-6 shadow-2xl border border-border/60 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border/40">
                    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-display font-semibold text-sm">Today's Progress</span>
                    <Badge variant="secondary" className="ml-auto text-xs">3 habits</Badge>
                  </div>
                  <div className="space-y-3">
                    {[
                      { title: "Morning Meditation", subtitle: "5 min guided session", progress: 100, icon: Brain, color: "text-violet-500 dark:text-violet-400", bg: "bg-violet-500/10" },
                      { title: "Daily Reading", subtitle: "10 pages completed", progress: 60, icon: BookOpen, color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-500/10" },
                      { title: "Evening Walk", subtitle: "Starts at 6:00 PM", progress: 0, icon: Target, color: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-500/10" }
                    ].map((item, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.5 + i * 0.15 }}
                        className="flex items-center gap-3.5 p-3.5 bg-muted/40 dark:bg-muted/20 rounded-xl"
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${item.bg}`}>
                          <item.icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">{item.title}</span>
                            {item.progress === 100 && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                            {item.progress > 0 && item.progress < 100 && <span className="text-xs text-muted-foreground shrink-0">{item.progress}%</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                          <div className="h-1.5 bg-foreground/[0.06] rounded-full overflow-hidden">
                            <motion.div 
                              className={`h-full rounded-full ${item.progress === 100 ? 'bg-primary' : item.progress > 0 ? 'bg-accent' : 'bg-transparent'}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${item.progress}%` }}
                              transition={{ duration: 0.8, delay: 0.7 + i * 0.15 }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className="text-xs font-medium">7-day streak</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-medium">Level 3</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      <Star className="w-3 h-3 mr-1 text-amber-500" />
                      245 XP
                    </Badge>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white/50 dark:bg-card/30" id="try-it" aria-label="Try a sample habit plan">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 md:mb-12 space-y-3 md:space-y-4">
            <Badge variant="secondary" className="mb-2 px-3 py-1 text-xs font-semibold shadow-sm">
              <Zap className="w-3.5 h-3.5 mr-1.5 text-primary" />
              Live AI Demo
            </Badge>
            <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold" data-testid="text-tryit-heading">
              Try it now — type any habit goal
            </h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
              Our AI coach will create a personalized action plan in seconds. Pick a popular goal or type your own.
            </p>
            <div className="flex items-center justify-center gap-3 md:gap-4 flex-wrap text-xs md:text-sm text-muted-foreground pt-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                <span>No sign-up needed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                <span>Results in seconds</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                <span>100% personalized</span>
              </div>
            </div>
          </div>

          <div className="max-w-2xl mx-auto mb-6 md:mb-8">
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

          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3 mb-8 md:mb-10">
            {habitGoals.map((goal) => {
              const Icon = goal.icon;
              const isSelected = selectedGoal === goal.id;
              return (
                <button
                  key={goal.id}
                  onClick={async () => {
                    if (isSelected) {
                      setSelectedGoal(null);
                      setAiPlan(null);
                      setAiError(null);
                      return;
                    }
                    setSelectedGoal(goal.id);
                    setAiPlan(null);
                    setAiError(null);
                    setCustomGoal("");
                    setAiLoading(true);
                    try {
                      const response = await apiRequest("POST", "/api/demo-plan", { habitGoal: goal.label });
                      const plan = await response.json();
                      setAiPlan(plan);
                    } catch (err: any) {
                      const errorData = err?.message || "Something went wrong. Please try again.";
                      setAiError(errorData);
                    } finally {
                      setAiLoading(false);
                    }
                  }}
                  disabled={aiLoading}
                  className={`flex flex-col items-center gap-2 md:gap-2.5 p-3 md:p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-md shadow-primary/15"
                      : "border-border/40 bg-white dark:bg-card hover:border-primary/30 hover:shadow-md"
                  }`}
                  data-testid={`button-goal-${goal.id}`}
                >
                  <div className={`p-2.5 md:p-3 rounded-xl ${goal.bgColor} icon-container shadow-sm`}>
                    <Icon className={`w-5 h-5 md:w-6 md:h-6 ${goal.color}`} />
                  </div>
                  <span className="text-xs md:text-sm font-semibold text-center leading-tight">{goal.label}</span>
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
                className="text-center py-8 md:py-12"
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
                        <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                      </div>
                      <div>
                        <Badge variant="secondary" className="mb-2">AI Generated</Badge>
                        <h3 className="font-display text-lg md:text-xl font-bold" data-testid="text-ai-plan-title">
                          {aiPlan.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">{aiPlan.summary}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 mb-6 mt-6">
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 mb-3">
                          <Target className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-sm">Daily Actions</span>
                        </div>
                        {aiPlan.daily?.map((item, i) => {
                          const isObj = typeof item === 'object' && item !== null;
                          const task = isObj ? (item as DemoTask).task : item as string;
                          const duration = isObj ? (item as DemoTask).duration : null;
                          const xp = isObj ? (item as DemoTask).xp : null;
                          return (
                            <div key={i} className="flex items-start gap-2 text-sm p-2.5 rounded-lg bg-primary/5 dark:bg-primary/10">
                              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span>{task}</span>
                                {(duration || xp) && (
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    {duration && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" />{duration}
                                      </span>
                                    )}
                                    {xp && (
                                      <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                                        <Star className="w-3 h-3" />+{xp} XP
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar className="w-4 h-4 text-accent" />
                          <span className="font-semibold text-sm">Weekly Goals</span>
                        </div>
                        {aiPlan.weekly?.map((item, i) => {
                          const isObj = typeof item === 'object' && item !== null;
                          const task = isObj ? (item as DemoTask).task : item as string;
                          const duration = isObj ? (item as DemoTask).duration : null;
                          const xp = isObj ? (item as DemoTask).xp : null;
                          return (
                            <div key={i} className="flex items-start gap-2 text-sm p-2.5 rounded-lg bg-accent/5 dark:bg-accent/10">
                              <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span>{task}</span>
                                {(duration || xp) && (
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    {duration && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" />{duration}
                                      </span>
                                    )}
                                    {xp && (
                                      <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                                        <Star className="w-3 h-3" />+{xp} XP
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {aiPlan.monthly && aiPlan.monthly.length > 0 && (
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                            <span className="font-semibold text-sm">Monthly Milestones</span>
                          </div>
                          {aiPlan.monthly.map((item, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm p-2.5 rounded-lg bg-emerald-500/5 dark:bg-emerald-500/10">
                              <Trophy className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span>{typeof item === 'object' ? item.task : item}</span>
                                {typeof item === 'object' && item.xp && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                                      <Star className="w-3 h-3" />+{item.xp} XP
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {aiPlan.insight && (
                      <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-2.5">
                          <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <div>
                            <span className="font-semibold text-sm">AI Insight</span>
                            <p className="text-sm text-muted-foreground mt-1">{aiPlan.insight}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {aiPlan.tips && aiPlan.tips.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-sm">Expert Tips</span>
                        </div>
                        <div className="grid sm:grid-cols-3 gap-2">
                          {aiPlan.tips.map((tip, i) => (
                            <div key={i} className="text-xs text-muted-foreground p-3 rounded-lg border border-border/50 bg-muted/30">
                              {tip}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiPlan.resources && aiPlan.resources.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <BookOpen className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-sm">Recommended Resources</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {aiPlan.resources.map((r, i) => {
                            const typeIcon = r.type === 'video' ? Video : r.type === 'book' ? BookOpen : FileText;
                            const TypeIcon = typeIcon;
                            return (
                              <a
                                key={i}
                                href={r.url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-border/50 bg-muted/30 hover-elevate transition-colors"
                                data-testid={`link-demo-resource-${i}`}
                              >
                                <TypeIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate">{r.name}</span>
                                <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-3 mb-4">
                      {aiPlan.coachMessage && (
                        <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 dark:bg-primary/10">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageCircle className="w-4 h-4 text-primary" />
                            <span className="font-semibold text-xs">AI Coach Chat</span>
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">Premium</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground italic">"{aiPlan.coachMessage}"</p>
                        </div>
                      )}
                      {aiPlan.stackSuggestion && (
                        <div className="p-3 rounded-lg border border-accent/20 bg-accent/5 dark:bg-accent/10">
                          <div className="flex items-center gap-2 mb-2">
                            <Layers className="w-4 h-4 text-accent" />
                            <span className="font-semibold text-xs">Habit Stacking</span>
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">Premium</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{aiPlan.stackSuggestion}</p>
                        </div>
                      )}
                    </div>

                    <div className="bg-accent/5 dark:bg-accent/10 rounded-lg p-4 mb-4 border border-accent/20">
                      <div className="flex items-start gap-2.5">
                        <MessageCircle className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                        <div>
                          <span className="font-semibold text-sm">Your full plan goes deeper</span>
                          <p className="text-sm text-muted-foreground mt-1" data-testid="text-interview-note">
                            When you sign up, your AI coach conducts a personal interview to understand your schedule, experience level, obstacles, and motivations. Every task, tip, and resource is then tailored specifically to you — not a generic template.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t">
                      <p className="text-sm text-muted-foreground">
                        Sign up to unlock <span className="font-semibold text-foreground">guided sessions, XP leveling, streaks, AI coach chat, and more</span>.
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

          </AnimatePresence>

          {!selectedGoal && !aiPlan && !aiLoading && !aiError && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              Type your own goal above or select a popular one to see an instant plan
            </p>
          )}
        </div>
      </section>

      <section className="py-10 md:py-20 px-4 sm:px-6" aria-label="How it works">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 md:mb-14 space-y-3 md:space-y-4">
            <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold" data-testid="text-how-it-works-heading">How it works</h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
              Three simple steps to build habits that last.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                step: "1",
                icon: <MessageCircle className="w-6 h-6 md:w-7 md:h-7" />,
                title: "Tell us your goal",
                desc: "Our AI coach asks a few quick questions about your lifestyle, schedule, and what you want to achieve.",
                gradient: "from-primary/20 to-accent/10"
              },
              {
                step: "2",
                icon: <Calendar className="w-6 h-6 md:w-7 md:h-7" />,
                title: "Get your custom plan",
                desc: "You'll receive a personalized daily, weekly, and monthly action plan built around your life — not a one-size-fits-all checklist.",
                gradient: "from-accent/20 to-emerald-500/10"
              },
              {
                step: "3",
                icon: <TrendingUp className="w-6 h-6 md:w-7 md:h-7" />,
                title: "Build momentum",
                desc: "Follow guided sessions, track your streaks, earn XP, and watch your consistency grow day by day.",
                gradient: "from-emerald-500/20 to-primary/10"
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ duration: 0.4, delay: shouldAnimate ? i * 0.1 : 0 }}
                className="text-center space-y-3 md:space-y-4"
                data-testid={`card-how-it-works-${i}`}
              >
                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br ${item.gradient} text-primary flex items-center justify-center mx-auto icon-container shadow-md`}>
                  {item.icon}
                </div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/8 rounded-full px-3 py-1">Step {item.step}</div>
                <h3 className="font-display text-lg md:text-xl font-bold">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24 relative" id="features" aria-label="Features">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,hsl(var(--primary)/0.05),transparent)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-10 md:mb-16 space-y-3 md:space-y-4">
            <Badge variant="secondary" className="mb-2 px-3 py-1 text-xs font-semibold shadow-sm">
              <Zap className="w-3.5 h-3.5 mr-1.5 text-primary" />
              Powerful Features
            </Badge>
            <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold" data-testid="text-features-heading">Everything you need to grow</h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
              More than just a tracker. HabitBuilder.pro is an interactive coach that guides you through every step.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[
              {
                icon: <Sparkles className="w-6 h-6 md:w-7 md:h-7" />,
                title: "AI Coaching Interview",
                desc: "Answer personalized questions about your goals, and AI creates a tailored action plan just for you.",
                color: "text-rose-600 dark:text-rose-400",
                bg: "bg-gradient-to-br from-rose-500/20 to-pink-500/10",
                borderAccent: "border-rose-500/20"
              },
              {
                icon: <Target className="w-6 h-6 md:w-7 md:h-7" />,
                title: "Guided Sessions",
                desc: "Step-by-step coaching walks you through each habit with timers, notes, and progress tracking.",
                color: "text-violet-600 dark:text-violet-400",
                bg: "bg-gradient-to-br from-violet-500/20 to-purple-500/10",
                borderAccent: "border-violet-500/20"
              },
              {
                icon: <Flame className="w-6 h-6 md:w-7 md:h-7" />,
                title: "Streaks & Achievements",
                desc: "Stay motivated with daily streaks, milestone badges, and a sense of accomplishment.",
                color: "text-orange-600 dark:text-orange-400",
                bg: "bg-gradient-to-br from-orange-500/20 to-red-500/10",
                borderAccent: "border-orange-500/20"
              },
              {
                icon: <Trophy className="w-6 h-6 md:w-7 md:h-7" />,
                title: "XP & Leveling System",
                desc: "Earn XP through daily challenges, level up from Beginner to Habit Hero across 12 tiers.",
                color: "text-amber-600 dark:text-amber-400",
                bg: "bg-gradient-to-br from-amber-500/20 to-yellow-500/10",
                borderAccent: "border-amber-500/20"
              },
              {
                icon: <BarChart3 className="w-6 h-6 md:w-7 md:h-7" />,
                title: "Progress Analytics",
                desc: "Track your journey with visual charts, completion rates, and mood correlation insights.",
                color: "text-emerald-600 dark:text-emerald-400",
                bg: "bg-gradient-to-br from-emerald-500/20 to-teal-500/10",
                borderAccent: "border-emerald-500/20"
              },
              {
                icon: <Users className="w-6 h-6 md:w-7 md:h-7" />,
                title: "Community Forum (Coming Soon)",
                desc: "Connect with fellow habit builders, share tips, find accountability partners, and stay inspired.",
                color: "text-blue-600 dark:text-blue-400",
                bg: "bg-gradient-to-br from-blue-500/20 to-indigo-500/10",
                borderAccent: "border-blue-500/20"
              },
            ].map((feature, i) => (
              <motion.div 
                key={i}
                {...fadeUp}
                transition={{ duration: 0.4, delay: shouldAnimate ? i * 0.08 : 0 }}
                data-testid={`card-feature-${i}`}
              >
                <Card className="h-full hover-elevate touch-card group">
                  <CardContent className="pt-6">
                    <div className={`mb-4 icon-container icon-container-lg ${feature.bg} shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-200`}>
                      <div className={feature.color}>{feature.icon}</div>
                    </div>
                    <h3 className="font-display text-base md:text-lg font-bold mb-1.5 md:mb-2" data-testid={`text-feature-title-${i}`}>{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 md:mt-12 text-center px-4 sm:px-0">
            <Button onClick={scrollToLogin} size="lg" className="w-full sm:w-auto shadow-lg shadow-primary/20" data-testid="button-cta-features">
              Try It Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <p className="mt-3 text-sm text-muted-foreground">No credit card needed</p>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 px-4 sm:px-6 bg-white/50 dark:bg-card/30" id="tools" aria-label="Powerful tools" data-testid="section-powerful-tools">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 md:mb-16 space-y-3 md:space-y-4">
            <Badge variant="secondary" className="mb-2 px-3 py-1 text-xs font-semibold shadow-sm">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-primary" />
              New Features
            </Badge>
            <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold" data-testid="text-tools-heading">Powerful tools for every part of your day</h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
              Go beyond habit tracking with journaling, focus sessions, mood insights, goal planning, and more — all powered by AI.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[
              {
                icon: <PenLine className="w-6 h-6 md:w-7 md:h-7" />,
                title: "Daily Journal & Reflection",
                desc: "Write freely, reflect on your day, and get AI-powered insights that reveal patterns in your thoughts and habits over time.",
                color: "text-indigo-600 dark:text-indigo-400",
                bg: "bg-gradient-to-br from-indigo-500/20 to-violet-500/10",
                tier: "Pro",
                tierColor: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
              },
              {
                icon: <Timer className="w-6 h-6 md:w-7 md:h-7" />,
                title: "Focus Timer / Pomodoro",
                desc: "Deep work sessions using the Pomodoro technique. Link timers to your habits and track focused time automatically.",
                color: "text-amber-600 dark:text-amber-400",
                bg: "bg-gradient-to-br from-amber-500/20 to-orange-500/10",
                tier: "Pro",
                tierColor: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
              },
              {
                icon: <Heart className="w-6 h-6 md:w-7 md:h-7" />,
                title: "Mood Tracker",
                desc: "Track your mood, energy, stress, and sleep quality daily. Discover AI-powered correlations between how you feel and your habits.",
                color: "text-teal-600 dark:text-teal-400",
                bg: "bg-gradient-to-br from-teal-500/20 to-cyan-500/10",
                tier: "Pro",
                tierColor: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
              },
              {
                icon: <Trophy className="w-6 h-6 md:w-7 md:h-7" />,
                title: "Goal Setting & Milestones",
                desc: "Set ambitious long-term goals, break them into achievable milestones, and link each milestone to the habits that drive progress.",
                color: "text-rose-600 dark:text-rose-400",
                bg: "bg-gradient-to-br from-rose-500/20 to-pink-500/10",
                tier: "Premium",
                tierColor: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
              },
              {
                icon: <Calendar className="w-6 h-6 md:w-7 md:h-7" />,
                title: "Smart Daily Planner",
                desc: "Let AI generate your optimized daily schedule from your habits, tasks, and goals — so you always know what to do next.",
                color: "text-sky-600 dark:text-sky-400",
                bg: "bg-gradient-to-br from-sky-500/20 to-blue-500/10",
                tier: "Premium",
                tierColor: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
              },
              {
                icon: <Bell className="w-6 h-6 md:w-7 md:h-7" />,
                title: "Push Notifications",
                desc: "Never miss a habit reminder, mood check-in, or journal prompt. Smart notifications keep you on track throughout the day.",
                color: "text-emerald-600 dark:text-emerald-400",
                bg: "bg-gradient-to-br from-emerald-500/20 to-green-500/10",
                tier: null,
                tierColor: "",
              },
            ].map((tool, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ duration: 0.4, delay: shouldAnimate ? i * 0.08 : 0 }}
                data-testid={`card-tool-${i}`}
              >
                <Card className="h-full hover-elevate touch-card group">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className={`icon-container icon-container-lg ${tool.bg} shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-200 shrink-0`}>
                        <div className={tool.color}>{tool.icon}</div>
                      </div>
                      {tool.tier && (
                        <Badge variant="outline" className={`text-xs font-semibold shrink-0 ${tool.tierColor}`} data-testid={`badge-tier-${i}`}>
                          {tool.tier}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-display text-base md:text-lg font-bold mb-1.5 md:mb-2" data-testid={`text-tool-title-${i}`}>{tool.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{tool.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 md:mt-12 text-center px-4 sm:px-0">
            <Button onClick={scrollToLogin} size="lg" className="w-full sm:w-auto shadow-lg shadow-primary/20" data-testid="button-cta-tools">
              Unlock All Features
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <p className="mt-3 text-sm text-muted-foreground">Start free, upgrade anytime</p>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 px-4 sm:px-6" aria-label="Habit Stacking">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.5 }}
              className="space-y-5 md:space-y-6"
            >
              <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs font-semibold shadow-sm">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                Premium Feature
              </Badge>
              <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold" data-testid="text-stacking-heading">
                Build powerful routines with Habit Stacking
              </h2>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
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
              {...fadeUp}
              transition={{ duration: 0.5, delay: shouldAnimate ? 0.15 : 0 }}
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
                      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/50 border border-border/30" data-testid={`demo-stack-item-${i}`}>
                        <div className={`w-10 h-10 rounded-xl ${habit.bg} flex items-center justify-center shrink-0 icon-container shadow-sm`}>
                          <habit.icon className={`w-5 h-5 ${habit.color}`} />
                        </div>
                        <span className="text-sm font-semibold">{habit.title}</span>
                        <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto shrink-0" />
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

      <LandingPricing scrollToLogin={scrollToLogin} />

      <TestimonialsSection fadeUp={fadeUp} shouldAnimate={shouldAnimate} isMobile={isMobile} />

      <section className="py-16 md:py-24 px-4 sm:px-6" id="faq" aria-label="Frequently asked questions">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 md:mb-16 space-y-3 md:space-y-4">
            <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold" data-testid="text-faq-heading">Frequently Asked Questions</h2>
            <p className="text-muted-foreground text-base md:text-lg">
              Everything you need to know before getting started.
            </p>
          </div>
          <div className="space-y-4 md:space-y-6">
            {[
              {
                q: "Is HabitBuilder really free to start?",
                a: "Yes! The free plan lets you try 1 habit with your first AI-generated action plan, 3 guided sessions per week, and access to the template library. No credit card required. Upgrade to Pro to unlock unlimited sessions, AI coaching insights, streaks, plan updates, and unlimited habits."
              },
              {
                q: "How does the AI coaching work?",
                a: "When you create a habit, our AI conducts a short interview to understand your goals, schedule, and experience level. Based on your answers, it generates a personalized daily, weekly, and monthly action plan grounded in behavioral science. During guided sessions, you get step-by-step coaching with timers and tips."
              },
              {
                q: "Can I cancel my subscription anytime?",
                a: "Absolutely. You can cancel your Pro or Premium subscription at any time from your account settings. You'll keep access to your paid features until the end of your billing period, and your data is never deleted."
              },
              {
                q: "Is my data private and secure?",
                a: "Your privacy is a priority. All data is encrypted and stored securely. We use Stripe for payment processing, so we never see or store your card details. You can read our full Privacy Policy for more details."
              },
              {
                q: "What's the difference between Pro and Premium?",
                a: "Pro ($6/month) gives you unlimited habits, guided sessions, achievements, and weekly reports. Premium ($15/month) adds AI Coach Chat, advanced analytics, habit stacking with unified routines, accountability partners, voice notes, and CSV data export."
              },
              {
                q: "How do I sign up?",
                a: "Just click any 'Get Started' button and sign in with your Google or Apple account. It takes about 30 seconds — no new password to create or remember. You'll be building your first habit right away."
              },
              {
                q: "Do I have to use the AI sessions?",
                a: "Not at all! The AI coaching sessions are completely optional. If you prefer to simply track your habits, check off daily tasks, and go at your own pace, you can do exactly that. The AI is there for those who want personalized plans and guided coaching, but it's never required."
              },
            ].map((faq, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ delay: shouldAnimate ? i * 0.05 : 0 }}
                className="border border-border/50 rounded-2xl p-5 md:p-6 bg-card/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200"
                data-testid={`faq-item-${i}`}
              >
                <h3 className="font-display font-bold text-base md:text-lg mb-2">{faq.q}</h3>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-accent/[0.04] to-primary/[0.08]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,hsl(var(--primary)/0.08),transparent)]" />
        {!isMobile && (
          <>
            <div className="absolute top-10 left-[10%] w-40 h-40 bg-primary/[0.06] rounded-full blur-[80px]" />
            <div className="absolute bottom-10 right-[10%] w-48 h-48 bg-accent/[0.06] rounded-full blur-[80px]" />
          </>
        )}
        <div className="max-w-3xl mx-auto text-center space-y-6 md:space-y-8 relative z-10">
          <div className="space-y-4 md:space-y-6">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/25 text-primary font-semibold text-sm mx-auto shadow-sm">
              <Sparkles className="w-4 h-4" />
              <span>Your journey starts here</span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl lg:text-5xl font-bold leading-tight">
              Every day you wait is a day <br className="hidden sm:block" />
              <span className="text-gradient">without progress</span>
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
              The best time to start was yesterday. The second best time is right now. Your future self will thank you for taking action today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 pt-2 md:pt-4">
              <Button onClick={scrollToLogin} size="lg" className="w-full sm:w-auto text-base shadow-lg shadow-primary/25" data-testid="button-cta-urgency">
                Start Free — Takes 30 Seconds
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 md:gap-x-6 gap-y-2 text-xs md:text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <SiGoogle className="w-3.5 h-3.5" />
                <SiApple className="w-3.5 h-3.5" />
                <span>Google or Apple sign-in</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                <span>No credit card required</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-8 md:py-12 pb-20 md:pb-12 border-t border-border" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="space-y-4">
              <LogoFooter />
              <p className="text-xs text-muted-foreground max-w-md">
                Build better habits with personalized AI coaching grounded in behavioral science. Daily plans, guided sessions, streak tracking, and progress analytics.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-app-store-footer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background text-[11px] font-medium hover:opacity-80 transition-opacity"
                >
                  <SiApple className="w-3.5 h-3.5 shrink-0" />
                  <span className="leading-tight">
                    <span className="block text-[9px] font-normal opacity-80">Download on the</span>
                    App Store
                  </span>
                </a>
                <div
                  data-testid="div-play-store-coming-soon-footer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground/40 text-background text-[11px] font-medium cursor-not-allowed"
                  title="Android app coming soon"
                >
                  <Smartphone className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  <span className="leading-tight">
                    <span className="block text-[9px] font-normal opacity-60">Coming soon to</span>
                    Google Play
                  </span>
                </div>
              </div>
              <InstallAppDialog 
                trigger={
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" data-testid="button-get-app-landing">
                    <Smartphone className="w-4 h-4" />
                    Want this site as an app?
                  </Button>
                }
              />
            </div>
            <div className="space-y-3">
              <h4 className="font-display font-semibold text-sm">Explore</h4>
              <div className="flex flex-col gap-2">
                <Link href="/templates" className="text-sm text-muted-foreground hover:text-foreground">Habit Templates</Link>
                <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">Blog</Link>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">About</Link>
                <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</a>
                <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground">FAQ</a>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-display font-semibold text-sm">Support</h4>
              <div className="flex flex-col gap-2">
                <a href="mailto:admin@habitbuilder.pro" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-contact-email">admin@habitbuilder.pro</a>
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-privacy-policy">Privacy Policy</Link>
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-terms">Terms of Service</Link>
              </div>
              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-2">Share the love:</p>
                <SocialShare variant="compact" />
              </div>
            </div>
          </div>
          <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} HabitBuilder.pro. All rights reserved.</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Secured by Stripe</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SSL Encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
