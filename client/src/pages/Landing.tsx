import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Leaf, ShieldCheck, Sparkles, Smartphone, Trophy, Target, Flame, BarChart3, Users, Zap, Crown, Check, X, CreditCard } from "lucide-react";
import { InstallAppDialog } from "@/components/InstallAppDialog";
import { LoginTroubleshootDialog } from "@/components/LoginTroubleshootDialog";
import { SocialShare } from "@/components/SocialShare";
import { usePageTitle } from "@/hooks/use-page-title";

export default function Landing() {
  usePageTitle();
  const scrollToLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background font-body overflow-x-hidden">
      <nav className="fixed top-0 w-full z-50 glass-panel border-b-0 rounded-none px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-display text-2xl font-bold text-primary">
            <Leaf className="w-6 h-6 fill-primary/20" />
            <span>Habit Builder</span>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={scrollToLogin} variant="ghost" size="sm" className="font-medium text-muted-foreground" data-testid="button-nav-signin">
              Sign In
            </Button>
            <Button onClick={scrollToLogin} size="sm" data-testid="button-nav-get-started">
              Get Started Free
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden">
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

      <section className="py-24 bg-white/50 dark:bg-card/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-display text-3xl lg:text-4xl font-bold" data-testid="text-features-heading">Everything you need to grow</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              More than just a tracker. Habit Builder is an interactive coach that guides you through every step.
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
                title: "Community Forum",
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

      <section className="py-24 px-6" id="pricing">
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
                      "Community forum access",
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
                      "Community forum (read access)",
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
                    </div>
                  </div>
                  <ul className="space-y-2.5 flex-1">
                    {[
                      "Everything in Pro",
                      "Advanced analytics & trends",
                      "AI-generated insights & reports",
                      "Community forum (full access)",
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
        </div>
      </section>

      <section className="py-24 px-6 bg-white/50 dark:bg-card/30">
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

      <footer className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Habit Builder. All rights reserved.</p>
              <InstallAppDialog 
                trigger={
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" data-testid="button-get-app-landing">
                    <Smartphone className="w-4 h-4" />
                    Want this site as an app?
                  </Button>
                }
              />
            </div>
            <div className="flex flex-col items-start md:items-end gap-2">
              <p className="text-sm text-muted-foreground">Share the love:</p>
              <SocialShare variant="compact" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
