import { Link } from "wouter";
import { ArrowLeft, LayoutDashboard, Zap, Sparkles, Heart, BookOpen, Timer, Target, Calendar, Trophy, Users, UserCircle, Shield, ExternalLink, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";

interface FeatureSection {
  icon: React.ElementType;
  title: string;
  description: string;
  link?: string;
  linkLabel?: string;
  badge?: string;
  comingSoon?: boolean;
}

const features: FeatureSection[] = [
  {
    icon: LayoutDashboard,
    title: "Daily Action Plan",
    description: "Your AI coach builds a personalised daily and weekly plan based on a short interview about your goals, schedule, and lifestyle. Each day you get a clear list of small, achievable actions — no guesswork. Complete tasks and the AI tracks your progress, adjusting the plan when needed.",
    link: "/",
    linkLabel: "Go to Dashboard",
  },
  {
    icon: Zap,
    title: "Guided Sessions",
    description: "When it's time to work on a habit, a Guided Session walks you through each task step-by-step with timers, coaching tips, and encouragement. After you finish, you get a short AI-written summary of what you achieved. Think of it as having a coach beside you the whole time.",
    link: "/",
    linkLabel: "Open a habit to start a session",
  },
  {
    icon: Sparkles,
    title: "AI Coach Chat",
    description: "A private chat with your AI habit coach. Ask anything about your habits, request motivation, or get help when you're stuck. The coach knows your plan, your history, and your goals — so the advice is always relevant to you, not generic.",
    link: "/coach",
    linkLabel: "Open Coach Chat",
    badge: "Premium",
  },
  {
    icon: Heart,
    title: "Mood Check-in",
    description: "Log how you're feeling each day — your energy, stress, and overall wellbeing. Over time the AI uses your mood patterns alongside your habit data to spot connections and adjust your plan. Tracking how you feel is one of the most powerful tools for lasting behaviour change.",
    link: "/mood",
    linkLabel: "Open Mood Check-in",
    badge: "Pro+",
  },
  {
    icon: BookOpen,
    title: "Daily Journal",
    description: "A private daily journal where you can capture thoughts, reflections, or notes about your day. Your journal entries are summarised by the AI and fed into your coaching, helping the AI understand the bigger picture of what's going on in your life.",
    link: "/journal",
    linkLabel: "Open Journal",
    badge: "Pro+",
  },
  {
    icon: Timer,
    title: "Focus Timer",
    description: "A built-in Pomodoro-style timer to help you work without distractions. Use it alongside your habit tasks to build a focused work routine. Sessions are logged so you can see how much focused time you've built up over the week.",
    link: "/focus",
    linkLabel: "Open Focus Timer",
    badge: "Pro+",
  },
  {
    icon: Target,
    title: "Goals & Milestones",
    description: "Set medium and long-term goals alongside your daily habits. Each goal can have milestones that mark meaningful progress. Your AI coach keeps your daily plan aligned with these bigger goals so every small action you take is moving you in the right direction.",
    link: "/goals",
    linkLabel: "Open Goals",
    badge: "Premium",
  },
  {
    icon: Calendar,
    title: "Daily Planner",
    description: "A bird's-eye view of your entire day, combining your habit tasks, focus sessions, and any other commitments you've shared with the AI. The planner helps you see where your time is going and makes sure your habits fit into your real schedule.",
    link: "/planner",
    linkLabel: "Open Daily Planner",
    badge: "Premium",
  },
  {
    icon: Trophy,
    title: "Achievements & XP",
    description: "Every completed habit task, streak, and milestone earns you XP and unlocks achievement badges. Gamification isn't just about fun — it gives you visible proof of progress on the days when motivation is low. All users earn XP and streaks from day one.",
    link: "/",
    linkLabel: "See your stats on the Dashboard",
  },
  {
    icon: Users,
    title: "Accountability Partners",
    description: "Invite someone you trust — a friend, partner, or colleague — to see your habit progress. Knowing someone can see whether you showed up today is one of the most reliable ways to stay consistent. You control exactly which habits are visible to your partner.",
    link: "/accountability",
    linkLabel: "Open Accountability Partners",
    badge: "Premium",
  },
  {
    icon: Users,
    title: "Community",
    description: "Connect with other people building habits, share wins, ask questions, and support others. Reading about someone else's progress on a similar goal can be surprisingly motivating. Pro members will have read-only access; Premium members will be able to post, comment, and message. Launching soon.",
    comingSoon: true,
  },
  {
    icon: UserCircle,
    title: "AI Profile (About Me)",
    description: "A private questionnaire you fill in once — your chronotype, energy levels, past obstacles, and anything else relevant to your goals. The AI will use this context when building plans and coaching you, so advice never feels one-size-fits-all. Find it in Account settings.",
    link: "/account",
    linkLabel: "Open Account settings",
  },
];

export default function AppGuide() {
  usePageTitle("App Guide", "Learn how every feature of HabitBuilder.pro works — your plain-language reference for the AI coach, guided sessions, journal, mood check-in, and everything else.");

  return (
    <div className="min-h-screen bg-gradient-subtle font-body pb-24">
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">

        <div className="flex items-center gap-3">
          <Link href="/account">
            <Button variant="ghost" size="icon" className="shrink-0" data-testid="button-back-guide">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">App Guide</h1>
            <p className="text-sm text-muted-foreground">Every feature explained in plain language</p>
          </div>
        </div>

        <Card className="border-primary/30 bg-primary/5" data-testid="card-privacy-note">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground leading-relaxed">
                <span className="font-semibold">Your privacy is protected.</span>{" "}
                Everything you share with your AI coach stays private. It is never sold, never shared, and only used to personalise your coaching.
              </p>
            </div>
          </CardContent>
        </Card>

        {features.map((feature) => (
          <Card key={feature.title} className="shadow-sm" data-testid={`card-guide-${feature.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <feature.icon className="w-4 h-4 text-primary" />
                </div>
                <span>{feature.title}</span>
                {feature.comingSoon && (
                  <Badge variant="secondary" className="ml-auto text-xs font-medium">Coming soon</Badge>
                )}
                {feature.badge && !feature.comingSoon && (
                  <Badge variant="secondary" className="ml-auto text-xs font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    {feature.badge}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              {feature.link && !feature.comingSoon && (
                <Link href={feature.link}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-primary hover:text-primary hover:bg-primary/10 -ml-3 gap-1.5"
                    data-testid={`button-guide-go-${feature.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                  >
                    {feature.linkLabel || "Go there"}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ))}

        <p className="text-xs text-center text-muted-foreground px-4">
          Pro+ features require a Pro or Premium subscription. Premium features require a Premium subscription. All features are available during your free trial.
        </p>

      </div>
    </div>
  );
}
