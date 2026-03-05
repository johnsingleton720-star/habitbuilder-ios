import { motion } from "framer-motion";
import { ArrowRight, Heart, Sparkles, Target, Brain, Shield, Users, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";
import { Link } from "wouter";
import { PublicNav } from "@/components/PublicNav";
import { SeoSchema } from "@/components/SeoSchema";
import { LogoFooter } from "@/components/Logo";

export default function About() {
  usePageTitle("About HabitBuilder.pro - AI-Powered Habit Coaching", "Learn about the team behind HabitBuilder.pro, our mission to make habit building accessible through AI coaching, and the behavioral science that powers our approach.");

  const scienceCards = [
    {
      icon: Brain,
      title: "Behavioral Science",
      description: "Every feature is grounded in proven behavior design methodology, the science of small habits, and the cue-routine-reward framework.",
    },
    {
      icon: Target,
      title: "Personalized Coaching",
      description: "Our AI doesn't give generic advice. It interviews you, understands your goals and constraints, then builds a plan tailored specifically to your life.",
    },
    {
      icon: Sparkles,
      title: "Guided Sessions",
      description: "Instead of just checking boxes, guided sessions walk you through each task with timers, coaching tips, and post-session summaries.",
    },
  ];

  const valuesItems = [
    {
      icon: Shield,
      title: "Privacy First",
      description: "Your habit data is personal. We encrypt everything, never sell your data, and use Stripe so we never see your payment details.",
    },
    {
      icon: Heart,
      title: "Accessible to Everyone",
      description: "One habit is free forever. No hard paywalls, no pressure. Premium features are there when you're ready.",
    },
    {
      icon: Users,
      title: "Community Driven",
      description: "We build features based on real user feedback. Our community forum and accountability partner system keeps you connected.",
    },
  ];

  return (
    <div className="min-h-screen bg-background font-body">
      <PublicNav />
      <SeoSchema breadcrumbs={[
        { name: "Home", url: "https://habitbuilder.pro/" },
        { name: "About", url: "https://habitbuilder.pro/about" }
      ]} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "HabitBuilder.pro",
        "url": "https://habitbuilder.pro",
        "description": "AI-powered habit coaching application that creates personalized action plans grounded in behavioral science.",
        "founder": {
          "@type": "Person",
          "name": "John Singleton",
          "jobTitle": "Founder & Developer",
          "address": { "@type": "PostalAddress", "addressLocality": "Dallas", "addressRegion": "TX", "addressCountry": "US" }
        },
        "sameAs": ["https://www.instagram.com/habitbuilder.pro"],
        "contactPoint": { "@type": "ContactPoint", "email": "admin@habitbuilder.pro", "contactType": "customer service" }
      }) }} />

      <section className="pt-24 pb-12 px-6" aria-label="About hero">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Badge variant="secondary" className="mb-2">
              <Sparkles className="w-3 h-3 mr-1" />
              About Us
            </Badge>
            <h1 className="font-display text-4xl lg:text-5xl font-bold" data-testid="text-about-heading">
              About HabitBuilder.pro
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mt-4">
              Built in Dallas, Texas by John Singleton
            </p>
          </motion.div>
        </div>
      </section>

      <section className="pb-16 px-6" aria-label="Our mission">
        <motion.div
          className="max-w-3xl mx-auto space-y-4"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-display text-2xl lg:text-3xl font-bold" data-testid="text-mission-heading">
            Our Mission
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            We believe everyone deserves a personal coach for building better habits. Traditional habit trackers just give you a checkbox — we give you a plan, a guide, and the science to back it up. HabitBuilder.pro combines AI-powered personalization with proven behavioral science frameworks from leading psychology research to create coaching experiences that actually work.
          </p>
        </motion.div>
      </section>

      <section className="pb-16 px-6" aria-label="Meet the founder">
        <motion.div
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="font-display text-2xl lg:text-3xl font-bold mb-6" data-testid="text-founder-heading">
            Meet the Founder
          </h2>
          <Card data-testid="card-founder">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1">
                <h3 className="text-xl font-bold" data-testid="text-founder-name">John Singleton</h3>
                <p className="text-muted-foreground font-medium">Founder & Developer</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>Dallas, Texas</span>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Based in Dallas, Texas, John built HabitBuilder.pro from a simple but powerful idea: what if a habit tracker could actually coach you? After spending years cycling through various productivity and habit tracking apps, he kept hitting the same wall. The apps were great at tracking what he did, but none of them helped him figure out what to do or how to stick with it when motivation faded.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                That gap between tracking and actual behavior change became the foundation for HabitBuilder.pro. Drawing on evidence-based behavior design research — micro-habit methodology, the 4 Laws of Behavior Change, and the cue-routine-reward framework — John designed an AI coaching system that interviews you about your goals, understands your schedule and constraints, and generates a personalized action plan — not a generic checklist.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                What makes HabitBuilder different is the guided session experience. Instead of just checking a box and moving on, the app walks you through each task with coaching tips, built-in timers, and post-session AI summaries that help you reflect on what worked. It is the difference between having a to-do list and having a coach in your pocket. John continues to build and improve HabitBuilder.pro based on real user feedback, with the goal of making expert-level habit coaching accessible to everyone — not just people who can afford a personal coach.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      <section className="pb-16 px-6" aria-label="The science behind it">
        <div className="max-w-3xl mx-auto space-y-6">
          <motion.h2
            className="font-display text-2xl lg:text-3xl font-bold"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            data-testid="text-science-heading"
          >
            The Science Behind It
          </motion.h2>
          <div className="grid gap-6 md:grid-cols-3">
            {scienceCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.08 }}
              >
                <Card className="h-full" data-testid={`card-science-${index}`}>
                  <CardContent className="p-6 space-y-3">
                    <card.icon className="w-8 h-8 text-primary" />
                    <h3 className="font-bold text-lg">{card.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-16 px-6" aria-label="Our values">
        <div className="max-w-3xl mx-auto space-y-6">
          <motion.h2
            className="font-display text-2xl lg:text-3xl font-bold"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            data-testid="text-values-heading"
          >
            Our Values
          </motion.h2>
          <div className="grid gap-6 md:grid-cols-3">
            {valuesItems.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.08 }}
              >
                <Card className="h-full" data-testid={`card-value-${index}`}>
                  <CardContent className="p-6 space-y-3">
                    <item.icon className="w-8 h-8 text-primary" />
                    <h3 className="font-bold text-lg">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-primary/5 dark:bg-primary/10" aria-label="Call to action">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="font-display text-2xl lg:text-3xl font-bold" data-testid="text-cta-heading">
            Ready to build better habits?
          </h2>
          <p className="text-muted-foreground text-lg">
            HabitBuilder.pro's AI coach creates personalized action plans based on the science
            of habit formation. Start free and see the difference.
          </p>
          <Button onClick={() => window.location.href = "/api/login"} size="lg" data-testid="button-about-cta">
            Get Started Free
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <p className="text-sm text-muted-foreground">No credit card required. 1 habit free forever.</p>
        </div>
      </section>

      <footer className="py-8 border-t border-border" role="contentinfo">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} HabitBuilder.pro. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-footer-home">Home</Link>
            <Link href="/templates" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-footer-templates">Templates</Link>
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-footer-blog">Blog</Link>
            <Link href="/about" className="text-sm font-medium text-foreground" data-testid="link-footer-about">About</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
