import { useHabits } from "@/hooks/use-habits";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Calendar, CalendarCheck, Clock, Flame, Target, TrendingUp, Trophy, CheckCircle2, Award, Zap, Star } from "lucide-react";
import { Link, useRoute } from "wouter";
import { format, subDays, startOfWeek, addDays, differenceInDays, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { DailyPlan, ProgressEntry, Habit } from "@shared/schema";
import { usePageTitle } from "@/hooks/use-page-title";

type ViewType = "today" | "yesterday" | "total" | "streak" | "weekly";

export default function ProgressPage() {
  usePageTitle("Progress", "View your habit progress, streaks, and completion history. Track your growth over time with detailed analytics.");
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
      habits: habits.map(h => {
        const progress = (h.progress || []) as ProgressEntry[];
        const lastSession = progress.length > 0 ? progress[progress.length - 1] : null;
        return {
          ...h,
          sessions: progress.length,
          timeSpent: h.totalTimeSpent || 0,
          lastSessionDate: lastSession?.date || null,
          avgSessionTime: progress.length > 0 ? Math.round((h.totalTimeSpent || 0) / progress.length) : 0,
        };
      })
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
      habits: habits.map(h => {
        const progress = (h.progress || []) as ProgressEntry[];
        const lastSession = progress.length > 0 ? progress[progress.length - 1] : null;
        return {
          ...h,
          currentStreak: h.currentStreak || 0,
          longestStreak: h.longestStreak || 0,
          lastActiveDate: lastSession?.date || null,
          totalSessions: progress.length,
        };
      })
    };
  };

  const viewConfig = {
    today: {
      title: "Today's Progress",
      icon: Target,
      color: "text-blue-500",
      bgColor: "bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30",
      borderColor: "border-blue-200/50 dark:border-blue-800/50",
    },
    yesterday: {
      title: "Yesterday's Progress",
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30",
      borderColor: "border-emerald-200/50 dark:border-emerald-800/50",
    },
    total: {
      title: "All-Time Progress",
      icon: Trophy,
      color: "text-amber-500",
      bgColor: "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30",
      borderColor: "border-amber-200/50 dark:border-amber-800/50",
    },
    streak: {
      title: "Streak Tracking",
      icon: Flame,
      color: "text-orange-500",
      bgColor: "bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30",
      borderColor: "border-orange-200/50 dark:border-orange-800/50",
    },
    weekly: {
      title: "Weekly Progress",
      icon: CalendarCheck,
      color: "text-violet-500",
      bgColor: "bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30",
      borderColor: "border-violet-200/50 dark:border-violet-800/50",
    },
  };

  const config = viewConfig[view];
  const IconComponent = config.icon;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4 md:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="h-8 w-32 bg-muted/30 rounded relative overflow-hidden"><div className="absolute inset-0 animate-shimmer" /></div>
          <div className="h-48 bg-muted/30 rounded-2xl relative overflow-hidden">
            <div className="absolute inset-0 animate-shimmer" />
            <div className="p-6 space-y-4">
              <div className="h-5 w-1/3 bg-muted/50 rounded-lg" />
              <div className="h-4 w-full bg-muted/40 rounded-lg" />
              <div className="h-4 w-2/3 bg-muted/40 rounded-lg" />
              <div className="h-10 w-full bg-muted/30 rounded-xl mt-4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 md:p-8 font-body">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${config.bgColor} ${config.borderColor} border`}>
              <IconComponent className={`w-6 h-6 ${config.color}`} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">{config.title}</h1>
              <p className="text-sm text-muted-foreground">
                {view === "today" && format(today, "EEEE, MMMM d, yyyy")}
                {view === "yesterday" && format(subDays(today, 1), "EEEE, MMMM d, yyyy")}
                {view === "total" && "Your complete journey"}
                {view === "streak" && "Keep the momentum going"}
                {view === "weekly" && "This week's overview"}
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
        
        {view === "weekly" && (
          <WeeklyView habits={habits || []} />
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
      <Card className="border-blue-200/50 dark:border-blue-800/50 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: `${progress}%` }} />
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xl font-semibold">Daily Progress</span>
            <Badge variant={progress === 100 ? "default" : "secondary"} className={progress === 100 ? "bg-gradient-to-r from-blue-500 to-cyan-500" : ""}>
              {stats.completed}/{stats.total} habits
            </Badge>
          </div>
          <Progress value={progress} className="h-3 mb-2" />
          <p className="text-sm text-muted-foreground">{progress}% complete</p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-500" />
          Today's Habits
        </h3>
        {stats.habits.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No habits scheduled for today
            </CardContent>
          </Card>
        ) : (
          stats.habits.map((habit: any, i: number) => (
            <motion.div key={habit.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link href={`/habit/${habit.id}?date=${format(new Date(), "yyyy-MM-dd")}`}>
                <Card className="hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group" data-testid={`progress-habit-${habit.id}`}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        habit.isComplete 
                          ? 'bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-md shadow-emerald-500/20' 
                          : 'bg-blue-50 dark:bg-blue-950/30'
                      }`}>
                        {habit.isComplete ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <span className="text-sm font-bold text-blue-500">{Math.round((habit.completed / Math.max(habit.total, 1)) * 100)}%</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold truncate">{habit.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {habit.completed}/{habit.total} task{habit.total !== 1 ? 's' : ''} completed
                        </p>
                      </div>
                    </div>
                    {!habit.isComplete && (
                      <div className="w-16">
                        <Progress value={(habit.completed / Math.max(habit.total, 1)) * 100} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
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
      <Card className="border-emerald-200/50 dark:border-emerald-800/50 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-green-500" style={{ width: `${progress}%` }} />
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xl font-semibold">Yesterday's Results</span>
            <Badge variant={progress === 100 ? "default" : "secondary"} className={progress === 100 ? "bg-gradient-to-r from-emerald-500 to-green-500" : ""}>
              {stats.completed}/{stats.total} habits
            </Badge>
          </div>
          <Progress value={progress} className="h-3 mb-2" />
          <p className="text-sm text-muted-foreground">{progress}% completed</p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          Yesterday's Habits
        </h3>
        {stats.habits.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No habits were scheduled yesterday
            </CardContent>
          </Card>
        ) : (
          stats.habits.map((habit: any, i: number) => (
            <motion.div key={habit.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link href={`/habit/${habit.id}?date=${format(new Date(), "yyyy-MM-dd")}`}>
                <Card className="hover:border-primary/30 hover:shadow-md transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        habit.isComplete 
                          ? 'bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-md shadow-emerald-500/20' 
                          : 'bg-emerald-50 dark:bg-emerald-950/30'
                      }`}>
                        {habit.isComplete ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <span className="text-sm font-bold text-emerald-500">{Math.round((habit.completed / Math.max(habit.total, 1)) * 100)}%</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold truncate">{habit.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {habit.completed}/{habit.total} task{habit.total !== 1 ? 's' : ''} completed
                        </p>
                      </div>
                    </div>
                    {!habit.isComplete && (
                      <div className="w-16">
                        <Progress value={(habit.completed / Math.max(habit.total, 1)) * 100} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
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

  const mostConsistent = stats.habits.length > 0
    ? stats.habits.reduce((best, h) => h.sessions > best.sessions ? h : best, stats.habits[0])
    : null;

  const mostTimeInvested = stats.habits.length > 0
    ? stats.habits.reduce((best, h) => h.timeSpent > best.timeSpent ? h : best, stats.habits[0])
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Calendar, value: stats.totalSessions, label: "Sessions", gradient: "from-amber-500 to-orange-500", bg: "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30" },
          { icon: Clock, value: formatTime(stats.totalTime), label: "Time Spent", gradient: "from-blue-500 to-cyan-500", bg: "bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30" },
          { icon: CheckCircle2, value: stats.totalTasks, label: "Tasks Done", gradient: "from-emerald-500 to-green-500", bg: "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className={`${stat.bg} border-0 shadow-sm overflow-hidden`}>
              <div className={`h-0.5 bg-gradient-to-r ${stat.gradient}`} />
              <CardContent className="p-4 text-center">
                <div className={`w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-md`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {stats.habits.some((h: any) => h.archived) && (
        <p className="text-xs text-muted-foreground text-center" data-testid="text-includes-archived">
          Includes all habits, including archived ones
        </p>
      )}

      {(mostConsistent || mostTimeInvested) && (
        <div className="grid grid-cols-2 gap-3">
          {mostConsistent && mostConsistent.sessions > 0 && (
            <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border-violet-200/50 dark:border-violet-800/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-violet-500" />
                  <span className="text-sm font-medium text-violet-600 dark:text-violet-400">Most Consistent</span>
                </div>
                <p className="text-base font-semibold truncate">{mostConsistent.title}</p>
                <p className="text-sm text-muted-foreground">{mostConsistent.sessions} session{mostConsistent.sessions !== 1 ? 's' : ''}</p>
              </CardContent>
            </Card>
          )}
          {mostTimeInvested && mostTimeInvested.timeSpent > 0 && (
            <Card className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 border-rose-200/50 dark:border-rose-800/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-rose-500" />
                  <span className="text-sm font-medium text-rose-600 dark:text-rose-400">Most Time Invested</span>
                </div>
                <p className="text-base font-semibold truncate">{mostTimeInvested.title}</p>
                <p className="text-sm text-muted-foreground">{formatTime(mostTimeInvested.timeSpent)}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          Habits Overview
        </h3>
        {stats.habits.map((habit: any, i: number) => (
          <motion.div key={habit.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link href={`/habit/${habit.id}?date=${format(new Date(), "yyyy-MM-dd")}`}>
              <Card className="hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{habit.sessions}</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold truncate">{habit.title}</h4>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(habit.timeSpent)}
                          </span>
                          {habit.avgSessionTime > 0 && (
                            <span className="text-sm text-muted-foreground/70">
                              ~{habit.avgSessionTime} min/session
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {habit.sessions} session{habit.sessions !== 1 ? 's' : ''}
                      </Badge>
                      {habit.lastSessionDate && (
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Last: {format(new Date(habit.lastSessionDate + "T12:00:00"), "MMM d")}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function StreakView({ stats }: { stats: { bestStreak: number; currentStreak: number; habits: any[] } }) {
  const pluralize = (n: number, word: string) => `${n} ${word}${n !== 1 ? 's' : ''}`;

  const activeHabits = stats.habits.filter(h => h.currentStreak > 0);
  const inactiveHabits = stats.habits.filter(h => h.currentStreak === 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-2 gap-4">
        <Card className="overflow-hidden border-0 shadow-md">
          <div className="h-1.5 bg-gradient-to-r from-orange-500 to-red-500" />
          <CardContent className="p-6 text-center bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Flame className="w-7 h-7 text-white" />
            </div>
            <p className="text-3xl font-bold">{stats.currentStreak}</p>
            <p className="text-sm text-muted-foreground">Current Streak</p>
            <p className="text-sm text-muted-foreground/60 mt-1">{pluralize(activeHabits.length, 'active habit')}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-md">
          <div className="h-1.5 bg-gradient-to-r from-amber-500 to-yellow-500" />
          <CardContent className="p-6 text-center bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <p className="text-3xl font-bold">{stats.bestStreak}</p>
            <p className="text-sm text-muted-foreground">Best Streak</p>
            <p className="text-sm text-muted-foreground/60 mt-1">personal record</p>
          </CardContent>
        </Card>
      </div>

      {activeHabits.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            Active Streaks
            <Badge variant="secondary" className="text-xs bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400">
              {activeHabits.length}
            </Badge>
          </h3>
          {activeHabits
            .sort((a, b) => b.currentStreak - a.currentStreak)
            .map((habit: any, i: number) => (
              <motion.div key={habit.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link href={`/habit/${habit.id}?date=${format(new Date(), "yyyy-MM-dd")}`}>
                  <Card className="hover:border-orange-300/50 hover:shadow-md transition-all cursor-pointer overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/15 to-red-500/10 flex items-center justify-center">
                              <Flame className="w-5 h-5 text-orange-500" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-sm">
                              <span className="text-xs font-bold text-white">{habit.currentStreak}</span>
                            </div>
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold truncate">{habit.title}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                                {pluralize(habit.currentStreak, 'day')} streak
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Best: {pluralize(habit.longestStreak, 'day')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {habit.lastActiveDate && (
                            <p className="text-xs text-muted-foreground">
                              Last active: {format(new Date(habit.lastActiveDate + "T12:00:00"), "MMM d")}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground/60">
                            {habit.totalSessions} total session{habit.totalSessions !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress to best</span>
                          <span>{habit.longestStreak > 0 ? Math.min(100, Math.round((habit.currentStreak / habit.longestStreak) * 100)) : 100}%</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-orange-100 dark:bg-orange-950/50 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${habit.longestStreak > 0 ? Math.min(100, (habit.currentStreak / habit.longestStreak) * 100) : 100}%` }}
                            transition={{ duration: 0.8, delay: i * 0.1 }}
                            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
        </div>
      )}

      {inactiveHabits.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            Needs Attention
          </h3>
          {inactiveHabits.map((habit: any, i: number) => (
            <motion.div key={habit.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link href={`/habit/${habit.id}?date=${format(new Date(), "yyyy-MM-dd")}`}>
                <Card className="hover:border-primary/20 hover:shadow-sm transition-all cursor-pointer opacity-80 hover:opacity-100">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">0</span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold truncate text-muted-foreground">{habit.title}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm text-muted-foreground/70">
                              No active streak
                            </span>
                            {habit.longestStreak > 0 && (
                              <span className="text-xs text-amber-500">
                                Best was {pluralize(habit.longestStreak, 'day')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {habit.lastActiveDate && (
                        <span className="text-xs text-muted-foreground/60 shrink-0">
                          Last: {format(new Date(habit.lastActiveDate + "T12:00:00"), "MMM d")}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function WeeklyView({ habits }: { habits: any[] }) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const todayStr = format(new Date(), "yyyy-MM-dd");
  
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayName = format(date, "EEEE").toLowerCase();
    const isToday = dateStr === todayStr;
    const isFuture = dateStr > todayStr;
    
    const scheduledHabits = habits.filter(h => {
      const scheduleDays = h.schedule?.days as string[] | undefined;
      if (scheduleDays && scheduleDays.length > 0) return scheduleDays.includes(dayName);
      const dailyPlans = (h.dailyPlans || []) as any[];
      return dailyPlans.some((p: any) => p.date === dateStr && p.tasks.length > 0);
    });
    
    const completedHabits = scheduledHabits.filter(h => {
      const dailyPlans = (h.dailyPlans || []) as any[];
      const plan = dailyPlans.find((p: any) => p.date === dateStr);
      if (!plan || plan.tasks.length === 0) return false;
      const activeTasks = plan.tasks.filter((t: any) => !t.skipped);
      return activeTasks.length > 0 && activeTasks.every((t: any) => t.completed);
    });
    
    return {
      date,
      dateStr,
      dayLetter: format(date, "EEE"),
      dayNum: format(date, "d"),
      isToday,
      isFuture,
      completed: completedHabits.length,
      total: scheduledHabits.length,
      allComplete: scheduledHabits.length > 0 && completedHabits.length === scheduledHabits.length,
    };
  });
  
  const totalCompleted = weekDays.reduce((sum, d) => sum + d.completed, 0);
  const totalScheduled = weekDays.reduce((sum, d) => sum + d.total, 0);
  const weeklyPercent = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;
  const daysWithPerfect = weekDays.filter(d => d.allComplete && !d.isFuture).length;
  
  const habitWeeklyStats = habits.map(h => {
    let completed = 0;
    let scheduled = 0;
    weekDays.forEach(d => {
      if (d.isFuture) return;
      const dayName = format(d.date, "EEEE").toLowerCase();
      const scheduleDays = h.schedule?.days as string[] | undefined;
      const isScheduled = scheduleDays && scheduleDays.length > 0 
        ? scheduleDays.includes(dayName) 
        : (h.dailyPlans || []).some((p: any) => p.date === d.dateStr && p.tasks.length > 0);
      if (!isScheduled) return;
      scheduled++;
      const dailyPlans = (h.dailyPlans || []) as any[];
      const plan = dailyPlans.find((p: any) => p.date === d.dateStr);
      if (plan) {
        const activeTasks = plan.tasks.filter((t: any) => !t.skipped);
        if (activeTasks.length > 0 && activeTasks.every((t: any) => t.completed)) completed++;
      }
    });
    return { ...h, weekCompleted: completed, weekScheduled: scheduled };
  }).filter(h => h.weekScheduled > 0);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="border-violet-200/50 dark:border-violet-800/50 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-500" style={{ width: `${weeklyPercent}%` }} />
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xl font-semibold">Weekly Progress</span>
            <Badge variant={weeklyPercent === 100 ? "default" : "secondary"} className={weeklyPercent === 100 ? "bg-gradient-to-r from-violet-500 to-purple-500" : ""}>
              {totalCompleted}/{totalScheduled} completed
            </Badge>
          </div>
          <Progress value={weeklyPercent} className="h-3 mb-2" />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{weeklyPercent}% complete</span>
            <span>{daysWithPerfect} perfect day{daysWithPerfect !== 1 ? 's' : ''}</span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-violet-500" />
            Day by Day
          </h3>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => (
              <div key={day.dateStr} className="text-center">
                <span className="text-xs text-muted-foreground font-medium">{day.dayLetter}</span>
                <div className={cn(
                  "w-10 h-10 mx-auto mt-1 rounded-xl flex items-center justify-center text-sm font-bold transition-all",
                  day.isToday && "ring-2 ring-violet-500 ring-offset-2 ring-offset-background",
                  day.allComplete
                    ? "bg-gradient-to-br from-violet-500 to-purple-500 text-white shadow-md shadow-violet-500/20"
                    : day.isFuture
                      ? "bg-muted/30 text-muted-foreground/50"
                      : day.completed > 0
                        ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300"
                        : day.total > 0
                          ? "bg-red-50 dark:bg-red-950/20 text-red-400"
                          : "bg-muted/30 text-muted-foreground/50"
                )}>
                  {day.dayNum}
                </div>
                {!day.isFuture && day.total > 0 && (
                  <span className="text-xs text-muted-foreground mt-1 block">
                    {day.completed}/{day.total}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {habitWeeklyStats.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-violet-500" />
            Habit Breakdown
          </h3>
          {habitWeeklyStats
            .sort((a, b) => (b.weekCompleted / b.weekScheduled) - (a.weekCompleted / a.weekScheduled))
            .map((habit: any, i: number) => {
              const pct = Math.round((habit.weekCompleted / habit.weekScheduled) * 100);
              return (
                <motion.div key={habit.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link href={`/habit/${habit.id}?date=${format(new Date(), "yyyy-MM-dd")}`}>
                    <Card className="hover:border-violet-300/50 hover:shadow-md transition-all cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                              pct === 100
                                ? "bg-gradient-to-br from-violet-500 to-purple-500 text-white shadow-md shadow-violet-500/20"
                                : "bg-violet-50 dark:bg-violet-950/30"
                            )}>
                              {pct === 100 ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <span className="text-sm font-bold text-violet-500">{pct}%</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-semibold truncate">{habit.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {habit.weekCompleted}/{habit.weekScheduled} day{habit.weekScheduled !== 1 ? 's' : ''} completed
                              </p>
                            </div>
                          </div>
                        </div>
                        <Progress value={pct} className="h-2.5" />
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
        </div>
      )}
    </motion.div>
  );
}
