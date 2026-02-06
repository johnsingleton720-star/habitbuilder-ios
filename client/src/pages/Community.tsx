import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Users, MessageCircle, TrendingUp, Lightbulb, HelpCircle, ArrowLeft, Bell } from "lucide-react";
import { useLocation } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";

const upcomingFeatures = [
  {
    icon: TrendingUp,
    title: "Progress Updates",
    desc: "Share your wins and milestones with the community.",
  },
  {
    icon: Lightbulb,
    title: "Tips & Motivation",
    desc: "Exchange strategies and encouragement with fellow builders.",
  },
  {
    icon: Users,
    title: "Accountability Partners",
    desc: "Find someone to keep you on track and vice versa.",
  },
  {
    icon: HelpCircle,
    title: "Questions & Help",
    desc: "Get advice from experienced habit builders.",
  },
  {
    icon: MessageCircle,
    title: "Direct Messaging",
    desc: "Connect one-on-one with members who inspire you.",
  },
];

export default function Community() {
  usePageTitle("Community Forum");
  const [, navigate] = useLocation();

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="button-back-dashboard">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold" data-testid="text-community-heading">Community Forum</h1>
          <p className="text-sm text-muted-foreground">Connect with fellow habit builders</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
              <Users className="w-8 h-8 text-primary" />
            </div>

            <div className="space-y-2">
              <Badge variant="secondary" className="mb-2" data-testid="badge-coming-soon">
                <Bell className="w-3 h-3 mr-1" />
                Coming Soon
              </Badge>
              <h2 className="font-display text-2xl font-bold" data-testid="text-coming-soon-title">
                The Community Forum is on its way
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                We're building a space where habit builders can connect, share progress, and support each other. Stay tuned — it'll be worth the wait.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg" data-testid="text-whats-planned">What's planned</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {upcomingFeatures.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
              >
                <Card data-testid={`card-upcoming-feature-${i}`}>
                  <CardContent className="pt-4 pb-4 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{feature.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{feature.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="text-center">
        <Button onClick={() => navigate("/")} data-testid="button-back-to-dashboard">
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
