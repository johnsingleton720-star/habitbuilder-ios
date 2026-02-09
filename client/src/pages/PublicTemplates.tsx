import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Sunrise, Dumbbell, BookOpen, Brain, Apple, PenTool, GraduationCap, 
  Smartphone, Moon, Heart, Target, Loader2, ArrowRight, ArrowLeft, Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";
import { Logo, LogoFooter } from "@/components/Logo";
import { Link } from "wouter";
import type { HabitTemplate } from "@shared/schema";

const iconMap: Record<string, typeof Target> = {
  Sunrise, Dumbbell, BookOpen, Brain, Apple, PenTool, GraduationCap, 
  Smartphone, Moon, Heart, Target,
};

const categoryLabels: Record<string, { label: string; description: string }> = {
  wellness: { 
    label: "Wellness & Mindfulness", 
    description: "Build habits that nurture your mental health, reduce stress, and bring more peace into your daily life." 
  },
  health: { 
    label: "Health & Fitness", 
    description: "Create sustainable routines for exercise, nutrition, and sleep that fit your lifestyle." 
  },
  learning: { 
    label: "Learning & Growth", 
    description: "Develop habits that expand your knowledge, skills, and personal development." 
  },
};

function PublicNav() {
  return (
    <nav className="fixed top-0 w-full z-50 glass-panel border-b-0 rounded-none px-6 py-4" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <Link href="/" aria-label="HabitBuilder.pro - Home" data-testid="link-logo-home">
          <Logo />
        </Link>
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
          <Button onClick={() => window.location.href = "/api/login"} variant="ghost" className="font-medium text-muted-foreground" data-testid="button-nav-signin">
            Sign In
          </Button>
          <Button onClick={() => window.location.href = "/api/login"} data-testid="button-nav-get-started">
            Get Started Free
          </Button>
        </div>
      </div>
    </nav>
  );
}

export default function PublicTemplates() {
  usePageTitle("Habit Templates - Free Plans for Every Goal", "Browse our library of free habit templates with AI-generated action plans. Find templates for exercise, meditation, reading, healthy eating, sleep, journaling, and more. Start building better habits today.");

  const { data: templates, isLoading } = useQuery<HabitTemplate[]>({
    queryKey: ['/api/templates'],
  });

  const groupedTemplates = templates?.reduce((acc, template) => {
    const category = template.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {} as Record<string, HabitTemplate[]>) || {};

  return (
    <div className="min-h-screen bg-background font-body">
      <PublicNav />
      
      <section className="pt-24 pb-2 px-6">
        <div className="max-w-5xl mx-auto">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Home
            </Button>
          </Link>
        </div>
      </section>

      <section className="pb-12 px-6" aria-label="Habit templates header">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <Badge variant="secondary" className="mb-2">
            <Target className="w-3 h-3 mr-1" />
            Template Library
          </Badge>
          <h1 className="font-display text-4xl lg:text-5xl font-bold" data-testid="text-templates-heading">
            Habit Templates for Every Goal
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Browse our curated collection of habit templates. Each one comes with AI-powered coaching 
            that creates a personalized action plan just for you.
          </p>
        </div>
      </section>

      <section className="pb-24 px-6" aria-label="Template categories">
        <div className="max-w-5xl mx-auto space-y-16">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" data-testid="loader-templates" />
            </div>
          ) : (
            <>
              {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => {
                const catInfo = categoryLabels[category] || { label: category, description: "" };
                return (
                  <div key={category}>
                    <div className="mb-6">
                      <h2 className="font-display text-2xl font-bold mb-2" data-testid={`text-category-${category}`}>
                        {catInfo.label}
                      </h2>
                      <p className="text-muted-foreground">{catInfo.description}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryTemplates.map((template, index) => {
                        const Icon = iconMap[template.icon || 'Target'] || Target;
                        return (
                          <motion.div
                            key={template.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Card className="h-full" data-testid={`template-card-${template.id}`}>
                              <CardHeader className="pb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <Icon className="w-5 h-5 text-primary" />
                                  </div>
                                  <CardTitle className="text-base">
                                    {template.name}
                                  </CardTitle>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0 space-y-3">
                                <p className="text-sm text-muted-foreground">
                                  {template.description}
                                </p>
                                {template.suggestedGoal && (
                                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                                    <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                                    <span>Goal: {template.suggestedGoal}</span>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {(!templates || templates.length === 0) && (
                <div className="text-center py-16 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Templates are being prepared. Check back soon.</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="py-16 px-6 bg-primary/5 dark:bg-primary/10" aria-label="Call to action">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="font-display text-2xl lg:text-3xl font-bold">
            Ready to start building habits?
          </h2>
          <p className="text-muted-foreground text-lg">
            Sign up for free and get a personalized AI action plan for any habit. 
            Your coach adapts to your schedule, preferences, and goals.
          </p>
          <Button onClick={() => window.location.href = "/api/login"} size="lg" data-testid="button-templates-cta">
            Start Your Free Trial
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <p className="text-sm text-muted-foreground">No credit card required. 2-day free trial.</p>
        </div>
      </section>

      <footer className="py-8 border-t border-border" role="contentinfo">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} HabitBuilder.pro. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Home</Link>
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">Blog</Link>
            <Link href="/templates" className="text-sm font-medium text-foreground">Templates</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
