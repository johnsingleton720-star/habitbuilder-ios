import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Leaf, ShieldCheck, Sparkles } from "lucide-react";

export default function Landing() {
  const scrollToLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background font-body overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-panel border-b-0 rounded-none px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 font-display text-2xl font-bold text-primary">
            <Leaf className="w-6 h-6 fill-primary/20" />
            <span>Habit Builder</span>
          </div>
          <Button onClick={scrollToLogin} variant="outline" className="font-semibold">
            Sign In
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden">
        {/* Floating decorative elements */}
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
              <span>Start your journey today</span>
            </div>
            
            <h1 className="font-display text-5xl lg:text-7xl font-bold leading-tight tracking-tight text-foreground">
              Build habits that <br />
              <span className="text-gradient">actually stick.</span>
            </h1>
            
            <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-xl">
              Transform your daily routine with a beautifully simple habit tracker designed to help you focus on what matters most.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button onClick={scrollToLogin} size="lg" className="h-14 px-8 text-lg rounded-xl shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all">
                Start 2-Day Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
            
            <div className="flex items-center gap-6 pt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>2-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Then just $6/month</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-3xl transform rotate-6 animate-pulse-glow" />
            {/* Abstract visual representation of the app */}
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
                    className="flex items-center gap-4 p-4 bg-white/80 dark:bg-white/10 rounded-xl shadow-sm hover:shadow-md transition-shadow"
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

      {/* Features Grid */}
      <section className="py-24 bg-white/50 dark:bg-card/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-display text-3xl lg:text-4xl font-bold">Everything you need to grow</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              An interactive coach in your pocket. We guide you through every step of building lasting habits.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <CheckCircle2 className="w-8 h-8 text-primary" />,
                title: "Guided Sessions",
                desc: "Start each habit with a pre-action checklist, then get coached through every step with timers and prompts."
              },
              {
                icon: <Sparkles className="w-8 h-8 text-accent" />,
                title: "AI Action Plans",
                desc: "Generate personalized step-by-step plans with AI. Explore each step, add notes, and track your answers."
              },
              {
                icon: <Leaf className="w-8 h-8 text-emerald-500" />,
                title: "Smart Scheduling",
                desc: "Set specific days and times for each habit. Your dashboard shows exactly what to focus on today."
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={scrollToLogin}
                className="bg-white dark:bg-card p-8 rounded-2xl shadow-sm border border-border/50 hover:shadow-xl hover:border-primary/30 transition-all duration-300 cursor-pointer group"
              >
                <div className="mb-6 p-3 bg-background dark:bg-muted rounded-xl w-fit group-hover:bg-primary/10 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="font-display text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Try it free
                  <ArrowRight className="w-4 h-4" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border">
        <p>&copy; {new Date().getFullYear()} HabitGrow. All rights reserved.</p>
      </footer>
    </div>
  );
}
