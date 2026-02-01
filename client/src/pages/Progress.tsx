import { useHabits } from "@/hooks/use-habits";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Calendar, Clock, Flame, Target, TrendingUp, Trophy, CheckCircle2 } from "lucide-react";
import { Link, useRoute } from "wouter";
import { format, subDays, startOfWeek, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { motion } from "framer-motion";
import type { DailyPlan, ProgressEntry, Habit } from "@shared/schema";

type ViewType = "today" | "yesterday" | "total" | "streak";

export default function ProgressPage() {
  const [, params] = useRoute("/progress/:view");
  const view = (params?.view as ViewType) || "today";
  const { data: habits, isLoading } = useHabits();
  const { user } = useAuth();

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const yesterdayStr = format(subDays(today, 1), "yyyy-MM-dd");

  const getHabitDayCompletion = (habit: Habit, dateStr: string) => {
    const dailyPlans = (habit.dailyPlans || []) as DailyPlan[];
    const plan = dailyPlans.find(p => p.date === dateStr);
    if (!plan) return { completed: 0, total: 0, isComplete: false };
    const completed = plan.tasks.filter(t => t.completed).length;
    // Consider complete if plan is marked complete OR all tasks are done
    const isComplete = plan.completed || (plan.tasks.length > 0 && plan.tasks.every(t => t.completed));
    return { completed, total: plan.tasks.length, isComplete };
  };

  const getTodayStats = () => {
    if (!habits) return { completed: 0, total: 0, habits: [] };
    const habitsWithTasks = habits.filter(h => {
      const dailyPlans = (h.dailyPlans || []) as DailyPlan[];
      return dailyPlans.some(p => p.date === todayStr && p.tasks.length > 0);
    });
    const completedHabits = habitsWithTasks.filter(h => getHabitDayCompletion(h, todayStr).isComplete);
    return { 
      completed: completedHabits.length, 
      total: habitsWithTasks.length,
      habits: habitsWithTasks.map(h => ({
        ...h,
        ...getHabitDayCompletion(h, todayStr)
      }))
    };
  };

  const getYesterdayStats = () => {
    if (!habits) return { completed: 0, total: 0, habits: [] };
    const habitsWithTasks = habits.filter(h => {
      const dailyPlans = (h.dailyPlans || []) as DailyPlan[];
      return dailyPlans.some(p => p.date === yesterdayStr && p.tasks.length > 0);
    });
    const completedHabits = habitsWithTasks.filter(h => getHabitDayCompletion(h, yesterdayStr).isComplete);
    return { 
      completed: completedHabits.length, 
      total: habitsWithTasks.length,
      habits: habitsWithTasks.map(h => ({
        ...h,
        ...getHabitDayCompletion(h, yesterdayStr)
      }))
    };
  };

  const getTotalStats = () => {
    if (!habits) return { totalSessions: 0, totalTime: 0, totalTasks: 0, habits: [] };
    let totalSessions = 0;
    let totalTime = 0;
    let totalTasks = 0;
    
    habits.forEach(h => {
      const progress = (h.progress || []) as ProgressEntry[];
      totalSessions += progress.length;
      totalTime += h.totalTimeSpent || 0;
      progress.forEach(p => {
        totalTasks += p.tasksCompleted || 0;
      });
    });
    
    return { 
      totalSessions, 
      totalTime, 
      totalTasks,
      habits: habits.map(h => ({
        ...h,
        sessions: ((h.progress || []) as ProgressEntry[]).length,
        timeSpent: h.totalTimeSpent || 0
      }))
    };
  };

  const getStreakStats = () => {
    if (!habits) return { bestStreak: 0, currentStreak: 0, habits: [] };
    let bestStreak = 0;
    let currentStreakSum = 0;
    
    habits.forEach(h => {
      bestStreak = Math.max(bestStreak, h.longestStreak || 0);
      currentStreakSum += h.currentStreak || 0;
    });
    
    return { 
      bestStreak, 
      currentStreak: currentStreakSum,
      habits: habits.map(h => ({
        ...h,
        currentStreak: h.currentStreak || 0,
        longestStreak: h.longestStreak || 0
      }))
    };
  };

  const viewConfig = {
    today: {
      title: "Today's Progress",
      icon: Target,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    yesterday: {
      title: "Yesterday's Progress",
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    total: {
      title: "All-Time Progress",
      icon: Trophy,
      color: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
    },
    streak: {
      title: "Streak Tracking",
      icon: Flame,
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
    },
  };

  const config = viewConfig[view];
  const IconComponent = config.icon;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4 md:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="h-48 bg-muted animate-pulse rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 md:p-8 font-body">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-4 flex-wrap">
          <Link href="/">
            <Button variant="ghost" className="gap-2" data-testid="button-back-home">
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${config.bgColor}`}>
              <IconComponent className={`w-6 h-6 ${config.color}`} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">{config.title}</h1>
              <p className="text-sm text-muted-foreground">
                {view === "today" && format(today, "EEEE, MMMM d, yyyy")}
                {view === "yesterday" && format(subDays(today, 1), "EEEE, MMMM d, yyyy")}
                {view === "total" && "Your complete journey"}
                {view === "streak" && "Keep the momentum going"}
              </p>
            </div>
          </div>
        </div>

        {view === "today" && (
          <TodayView stats={getTodayStats()} />
        )}
        
        {view === "yesterday" && (
          <YesterdayView stats={getYesterdayStats()} />
        )}
        
        {view === "total" && (
          <TotalView stats={getTotalStats()} />
        )}
        
        {view === "streak" && (
          <StreakView stats={getStreakStats()} />
        )}
      </div>
    </div>
  );
}

function TodayView({ stats }: { stats: { completed: number; total: number; habits: any[] } }) {
  const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="border-blue-200 dark:border-blue-900">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-semibold">Daily Progress</span>
            <Badge variant={progress === 100 ? "default" : "secondary"}>
              {stats.completed}/{stats.total} habits
            </Badge>
          </div>
          <Progress value={progress} className="h-3 mb-2" />
          <p className="text-sm text-muted-foreground">{progress}% complete</p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="font-semibold">Today's Habits</h3>
        {stats.habits.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No habits scheduled for today
            </CardContent>
          </Card>
        ) : (
          stats.habits.map((habit: any) => (
            <Link key={habit.id} href={`/habit/${habit.id}`}>
              <Card className="hover:border-primary/30 hover:shadow-md transition-all cursor-pointer" data-testid={`progress-habit-${habit.id}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{habit.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {habit.completed}/{habit.total} tasks completed
                    </p>
                  </div>
                  {habit.isComplete ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <Progress value={(habit.completed / Math.max(habit.total, 1)) * 100} className="w-20 h-2" />
                  )}
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </motion.div>
  );
}

function YesterdayView({ stats }: { stats: { completed: number; total: number; habits: any[] } }) {
  const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="border-emerald-200 dark:border-emerald-900">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-semibold">Yesterday's Results</span>
            <Badge variant={progress === 100 ? "default" : "secondary"}>
              {stats.completed}/{stats.total} habits
            </Badge>
          </div>
          <Progress value={progress} className="h-3 mb-2" />
          <p className="text-sm text-muted-foreground">{progress}% completed</p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="font-semibold">Yesterday's Habits</h3>
        {stats.habits.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No habits were scheduled yesterday
            </CardContent>
          </Card>
        ) : (
          stats.habits.map((habit: any) => (
            <Link key={habit.id} href={`/habit/${habit.id}`}>
              <Card className="hover:border-primary/30 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{habit.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {habit.completed}/{habit.total} tasks completed
                    </p>
                  </div>
                  {habit.isComplete ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <Progress value={(habit.completed / Math.max(habit.total, 1)) * 100} className="w-20 h-2" />
                  )}
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </motion.div>
  );
}

function TotalView({ stats }: { stats: { totalSessions: number; totalTime: number; totalTasks: number; habits: any[] } }) {
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{stats.totalSessions}</p>
            <p className="text-xs text-muted-foreground">Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{formatTime(stats.totalTime)}</p>
            <p className="text-xs text-muted-foreground">Time Spent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{stats.totalTasks}</p>
            <p className="text-xs text-muted-foreground">Tasks Done</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">Habits Overview</h3>
        {stats.habits.map((habit: any) => (
          <Link key={habit.id} href={`/habit/${habit.id}`}>
            <Card className="hover:border-primary/30 hover:shadow-md transition-all cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{habit.title}</h4>
                  <Badge variant="outline">{habit.sessions} sessions</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatTime(habit.timeSpent)} spent
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

function StreakView({ stats }: { stats: { bestStreak: number; currentStreak: number; habits: any[] } }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-orange-200 dark:border-orange-900">
          <CardContent className="p-6 text-center">
            <Flame className="w-10 h-10 mx-auto mb-3 text-orange-500" />
            <p className="text-3xl font-bold">{stats.currentStreak}</p>
            <p className="text-sm text-muted-foreground">Current Streak</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-900">
          <CardContent className="p-6 text-center">
            <Trophy className="w-10 h-10 mx-auto mb-3 text-amber-500" />
            <p className="text-3xl font-bold">{stats.bestStreak}</p>
            <p className="text-sm text-muted-foreground">Best Streak</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">Streak by Habit</h3>
        {stats.habits.map((habit: any) => (
          <Link key={habit.id} href={`/habit/${habit.id}`}>
            <Card className="hover:border-primary/30 hover:shadow-md transition-all cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{habit.title}</h4>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-orange-500">{habit.currentStreak} days</p>
                      <p className="text-xs text-muted-foreground">current</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-amber-500">{habit.longestStreak} days</p>
                      <p className="text-xs text-muted-foreground">best</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
