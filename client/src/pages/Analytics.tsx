import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isIOS } from "@/lib/platform";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Brain, 
  Calendar,
  Clock,
  Target,
  Flame,
  Loader2,
  Lock,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Minus,
  ArrowLeft,
  Heart,
  BookOpen,
  MessageCircle,
  CheckSquare,
  Trophy,
  Timer,
  Goal,
  Zap,
  Moon,
  Battery,
  AlertTriangle,
  Crown,
  Award,
  Star
} from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import type { Habit, ProgressEntry } from "@shared/schema";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAuth } from "@/hooks/use-auth";

interface AnalyticsData {
  totalSessions: number;
  totalTimeSpent: number;
  totalTasksCompleted: number;
  averageSessionLength: number;
  currentStreak: number;
  longestStreak: number;
  weeklyTrend: { week: string; sessions: number; time: number }[];
  monthlyTrend: { month: string; sessions: number; time: number }[];
  habitBreakdown: { habitId: number; habitTitle: string; sessions: number; time: number; completion: number }[];
  correlations: { insight: string; strength: "strong" | "moderate" | "weak" }[];
  bestDay: string;
  bestTime: string;
}

interface ComprehensiveData {
  habits: {
    active: number;
    totalSessions: number;
    totalTimeSpent: number;
    totalTasksCompleted: number;
    overallCompletion: number;
    currentStreak: number;
    longestStreak: number;
    details: {
      id: number;
      title: string;
      sessions: number;
      timeSpent: number;
      completion: number;
      currentStreak: number;
      longestStreak: number;
      icon: string;
      color: string;
    }[];
    missReasons: { reason: string; count: number }[];
  };
  mood: {
    totalEntries: number;
    distribution: Record<string, number>;
    averageEnergy: number | null;
    averageStress: number | null;
    averageSleep: number | null;
  };
  journal: {
    totalEntries: number;
    moodDistribution: Record<string, number>;
    entriesWithMood: number;
    recentTags: string[];
  };
  coaching: {
    totalSessions: number;
    totalMessages: number;
  };
  quickTasks: {
    totalCreated: number;
    totalCompleted: number;
    completionRate: number;
  };
  achievements: {
    totalEarned: number;
    badges: { id: string; unlockedAt: string }[];
  };
  focus: {
    totalSessions: number;
    totalMinutes: number;
  };
  goals: {
    active: number;
    total: number;
    milestonesCompleted: number;
    milestonesTotal: number;
  };
  memberSince: string;
}

function StatCard({ icon: Icon, label, value, subValue, color, delay = 0 }: {
  icon: any;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="overflow-hidden" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{label}</p>
              <p className="text-xl font-bold leading-tight">{value}</p>
              {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function CircularProgress({ value, max, label, color, size = 80 }: {
  value: number;
  max: number;
  label: string;
  color: string;
  size?: number;
}) {
  const percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/30" />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className={color} style={{ transition: "stroke-dashoffset 1s ease" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold">{value.toFixed(1)}</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  );
}

function MoodBadge({ mood, count }: { mood: string; count: number }) {
  const moodConfig: Record<string, { emoji: string; bg: string }> = {
    great: { emoji: "😄", bg: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" },
    good: { emoji: "🙂", bg: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" },
    okay: { emoji: "😐", bg: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" },
    bad: { emoji: "😔", bg: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" },
    terrible: { emoji: "😢", bg: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" },
  };
  const config = moodConfig[mood] || { emoji: "❓", bg: "bg-gray-100 dark:bg-gray-800" };
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${config.bg}`} data-testid={`mood-badge-${mood}`}>
      <span>{config.emoji}</span>
      <span className="capitalize">{mood}</span>
      <span className="font-bold">{count}</span>
    </div>
  );
}

const missReasonIcons: Record<string, string> = {
  "Too busy": "⏰",
  "Forgot": "🤔",
  "Too tired": "😴",
  "Schedule conflict": "📅",
  "Didn't feel like it": "😕",
  "Other": "💭",
};

export default function Analytics() {
  usePageTitle("Analytics", "Advanced habit analytics with trend charts, performance breakdowns, AI-generated insights, and data export.");
  const { isPremium } = useSubscription();
  const { user } = useAuth();
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("month");
  const [activeTab, setActiveTab] = useState("overview");
  const reportCacheKey = user?.id ? `comprehensiveReport_${user.id}` : "";
  const [fullReport, setFullReport] = useState<string | null>(() => {
    try { return reportCacheKey ? sessionStorage.getItem(reportCacheKey) : null; } catch { return null; }
  });

  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics", timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?timeRange=${timeRange}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: isPremium,
  });

  const { data: compData, isLoading: isLoadingComp } = useQuery<ComprehensiveData>({
    queryKey: ["/api/analytics/comprehensive"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/comprehensive", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch comprehensive data");
      return res.json();
    },
    enabled: isPremium,
  });

  const generateFullReportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/analytics/comprehensive-report");
      return res.json();
    },
    onSuccess: (data) => {
      const report = data.report || null;
      setFullReport(report);
      try { if (report && reportCacheKey) sessionStorage.setItem(reportCacheKey, report); } catch {}
      setActiveTab("ai-overview");
      toast({ title: "Full Overview Generated", description: "Your comprehensive AI analysis is ready!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate report. Please try again.", variant: "destructive" });
    },
  });

  const exportCSVMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/export");
      const blob = await res.blob();
      const filename = `habit-builder-analytics-${new Date().toISOString().split("T")[0]}.csv`;

      if (isIOS()) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const tempRes = await apiRequest("POST", "/api/temp-file", {
          data: base64,
          filename,
          contentType: "text/csv",
        });
        const { url } = await tempRes.json();
        const fullUrl = `${window.location.origin}${url}`;
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: fullUrl });
      } else {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    },
    onSuccess: () => { toast({ title: "Export Complete", description: "Your data has been downloaded as CSV." }); },
    onError: () => { toast({ title: "Export Failed", description: "Could not export data. Please try again.", variant: "destructive" }); },
  });

  if (!isPremium) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="gap-2" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Advanced Analytics</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              See your habit journey visualized with trend charts, performance breakdowns, AI-powered reports, and exportable data.
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
              <span className="px-2.5 py-1 rounded-full bg-muted/50">Trend charts</span>
              <span className="px-2.5 py-1 rounded-full bg-muted/50">AI reports</span>
              <span className="px-2.5 py-1 rounded-full bg-muted/50">CSV export</span>
              <span className="px-2.5 py-1 rounded-full bg-muted/50">Mood insights</span>
            </div>
            <Badge variant="secondary" className="text-sm">Premium Feature</Badge>
            <div className="pt-2">
              <Button asChild><a href="/paywall">Upgrade to Premium</a></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6 pb-24">
      <div className="mb-2">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            Advanced Analytics
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Your complete habit-building overview
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="default"
            onClick={() => generateFullReportMutation.mutate()}
            disabled={generateFullReportMutation.isPending}
            data-testid="button-full-overview"
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
          >
            {generateFullReportMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Crown className="w-4 h-4 mr-2" />
            )}
            Full AI Overview
          </Button>

          <Button variant="outline" onClick={() => exportCSVMutation.mutate()} disabled={exportCSVMutation.isPending} data-testid="button-export-csv">
            {exportCSVMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            CSV
          </Button>
        </div>
      </div>

      {isLoadingComp ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : compData ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard icon={Target} label="Sessions" value={compData.habits.totalSessions} color="bg-blue-500" delay={0} />
            <StatCard icon={Clock} label="Time Invested" value={`${Math.floor(compData.habits.totalTimeSpent / 60)}h ${compData.habits.totalTimeSpent % 60}m`} color="bg-indigo-500" delay={0.05} />
            <StatCard icon={Flame} label="Best Streak" value={`${compData.habits.longestStreak}d`} subValue={`Current: ${compData.habits.currentStreak}d`} color="bg-orange-500" delay={0.1} />
            <StatCard icon={CheckSquare} label="Tasks Done" value={compData.habits.totalTasksCompleted} subValue={`${compData.habits.overallCompletion}% rate`} color="bg-emerald-500" delay={0.15} />
            <StatCard icon={Trophy} label="Achievements" value={compData.achievements.totalEarned} subValue="badges earned" color="bg-amber-500" delay={0.2} />
            <StatCard icon={Timer} label="Focus Time" value={`${compData.focus.totalMinutes}m`} subValue={`${compData.focus.totalSessions} sessions`} color="bg-purple-500" delay={0.25} />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="habits" data-testid="tab-habits">Habits</TabsTrigger>
              <TabsTrigger value="wellness" data-testid="tab-wellness">Wellness</TabsTrigger>
              <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
              <TabsTrigger value="trends" data-testid="tab-trends">Trends</TabsTrigger>
              <TabsTrigger value="ai-overview" data-testid="tab-ai-overview">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Report
              </TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Habit Performance Summary */}
                <Card data-testid="card-habit-summary">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-500" />
                      Habit Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {compData.habits.details.length > 0 ? compData.habits.details.map((habit, i) => (
                      <div key={habit.id} className="space-y-1.5" data-testid={`habit-overview-${habit.id}`}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium truncate mr-2">{habit.title}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            {habit.currentStreak > 0 && (
                              <span className="flex items-center gap-0.5 text-orange-500 text-xs">
                                <Flame className="w-3 h-3" />{habit.currentStreak}
                              </span>
                            )}
                            <Badge variant={habit.completion >= 70 ? "default" : habit.completion >= 40 ? "secondary" : "destructive"} className="text-xs">
                              {habit.completion}%
                            </Badge>
                          </div>
                        </div>
                        <Progress value={habit.completion} className="h-2" />
                      </div>
                    )) : (
                      <div className="flex flex-col items-center text-center py-6">
                        <Target className="w-8 h-8 text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">Create a habit to see performance data here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Mood Snapshot */}
                <Card data-testid="card-mood-snapshot">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Heart className="w-5 h-5 text-rose-500" />
                      Mood Snapshot
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {compData.mood.totalEntries > 0 ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(compData.mood.distribution).sort((a, b) => b[1] - a[1]).map(([mood, count]) => (
                            <MoodBadge key={mood} mood={mood} count={count} />
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {compData.mood.averageEnergy !== null && (
                            <CircularProgress value={compData.mood.averageEnergy} max={5} label="Energy" color="text-yellow-500" size={70} />
                          )}
                          {compData.mood.averageStress !== null && (
                            <CircularProgress value={compData.mood.averageStress} max={5} label="Stress" color="text-red-500" size={70} />
                          )}
                          {compData.mood.averageSleep !== null && (
                            <CircularProgress value={compData.mood.averageSleep} max={5} label="Sleep" color="text-blue-500" size={70} />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Heart className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">Start tracking your mood to see insights here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Quick Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Card className="border-l-4 border-l-indigo-500" data-testid="card-journal-stat">
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs text-muted-foreground">Journal</span>
                      </div>
                      <p className="text-2xl font-bold">{compData.journal.totalEntries}</p>
                      <p className="text-xs text-muted-foreground">entries written</p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <Card className="border-l-4 border-l-violet-500" data-testid="card-coaching-stat">
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageCircle className="w-4 h-4 text-violet-500" />
                        <span className="text-xs text-muted-foreground">Coaching</span>
                      </div>
                      <p className="text-2xl font-bold">{compData.coaching.totalSessions}</p>
                      <p className="text-xs text-muted-foreground">{compData.coaching.totalMessages} messages</p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <Card className="border-l-4 border-l-emerald-500" data-testid="card-quicktask-stat">
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckSquare className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs text-muted-foreground">Quick Tasks</span>
                      </div>
                      <p className="text-2xl font-bold">{compData.quickTasks.totalCompleted}/{compData.quickTasks.totalCreated}</p>
                      <p className="text-xs text-muted-foreground">{compData.quickTasks.completionRate}% done</p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                  <Card className="border-l-4 border-l-amber-500" data-testid="card-goals-stat">
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Goal className="w-4 h-4 text-amber-500" />
                        <span className="text-xs text-muted-foreground">Goals</span>
                      </div>
                      <p className="text-2xl font-bold">{compData.goals.active}</p>
                      <p className="text-xs text-muted-foreground">{compData.goals.milestonesCompleted}/{compData.goals.milestonesTotal} milestones</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Miss Reasons */}
              {compData.habits.missReasons.length > 0 && (
                <Card data-testid="card-miss-reasons">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      Why Streaks Break
                    </CardTitle>
                    <CardDescription>Understanding your missed days helps improve your plans</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {compData.habits.missReasons.map((mr) => (
                        <div key={mr.reason} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50" data-testid={`miss-reason-${mr.reason}`}>
                          <span className="text-lg">{missReasonIcons[mr.reason] || "💭"}</span>
                          <div>
                            <p className="text-sm font-medium">{mr.reason}</p>
                            <p className="text-xs text-muted-foreground">{mr.count} time{mr.count !== 1 ? "s" : ""}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* HABITS TAB */}
            <TabsContent value="habits" className="space-y-4">
              <Card data-testid="card-habit-breakdown">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-500" />
                    Habit Performance Breakdown
                  </CardTitle>
                  <CardDescription>Detailed view of each habit's progress</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {compData.habits.details.map((habit) => (
                    <motion.div
                      key={habit.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 border rounded-xl space-y-3"
                      data-testid={`habit-detail-${habit.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-base">{habit.title}</h4>
                        <Badge variant={habit.completion >= 70 ? "default" : habit.completion >= 40 ? "secondary" : "destructive"}>
                          {habit.completion}%
                        </Badge>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            habit.completion >= 70 ? "bg-green-500" : habit.completion >= 40 ? "bg-yellow-500" : "bg-red-500"
                          }`}
                          style={{ width: `${habit.completion}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Sessions:</span>
                          <span className="font-medium">{habit.sessions}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Time:</span>
                          <span className="font-medium">{habit.timeSpent}m</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-orange-500" />
                          <span className="text-muted-foreground">Streak:</span>
                          <span className="font-medium">{habit.currentStreak}d</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-muted-foreground">Best:</span>
                          <span className="font-medium">{habit.longestStreak}d</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {compData.habits.details.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">Complete some sessions to see your habit breakdown</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* WELLNESS TAB */}
            <TabsContent value="wellness" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Mood Distribution */}
                <Card data-testid="card-mood-distribution">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Heart className="w-5 h-5 text-rose-500" />
                      Mood Distribution
                    </CardTitle>
                    <CardDescription>How you've been feeling (last 90 days)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {compData.mood.totalEntries > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(compData.mood.distribution).sort((a, b) => b[1] - a[1]).map(([mood, count]) => {
                          const pct = Math.round((count / compData.mood.totalEntries) * 100);
                          const colors: Record<string, string> = {
                            great: "bg-green-500", good: "bg-emerald-500", okay: "bg-yellow-500",
                            bad: "bg-orange-500", terrible: "bg-red-500"
                          };
                          return (
                            <div key={mood} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="capitalize font-medium">{mood}</span>
                                <span className="text-muted-foreground">{count} ({pct}%)</span>
                              </div>
                              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${colors[mood] || "bg-gray-500"}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No mood entries yet. Track your mood to see patterns!</p>
                    )}
                  </CardContent>
                </Card>

                {/* Wellness Scores */}
                <Card data-testid="card-wellness-scores">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-500" />
                      Wellness Averages
                    </CardTitle>
                    <CardDescription>Your average scores over tracked entries</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {compData.mood.totalEntries > 0 && (compData.mood.averageEnergy || compData.mood.averageStress || compData.mood.averageSleep) ? (
                      <div className="flex items-center justify-around py-4">
                        {compData.mood.averageEnergy !== null && (
                          <CircularProgress value={compData.mood.averageEnergy} max={5} label="Energy" color="text-yellow-500" />
                        )}
                        {compData.mood.averageStress !== null && (
                          <CircularProgress value={compData.mood.averageStress} max={5} label="Stress" color="text-red-500" />
                        )}
                        {compData.mood.averageSleep !== null && (
                          <CircularProgress value={compData.mood.averageSleep} max={5} label="Sleep" color="text-blue-500" />
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Moon className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">Track energy, stress, and sleep in mood check-ins</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Journal Overview */}
              <Card data-testid="card-journal-overview">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-500" />
                    Journal Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {compData.journal.totalEntries > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/20">
                          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{compData.journal.totalEntries}</p>
                          <p className="text-xs text-muted-foreground">Total entries</p>
                        </div>
                        <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-950/20">
                          <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{compData.journal.entriesWithMood}</p>
                          <p className="text-xs text-muted-foreground">With mood tagged</p>
                        </div>
                      </div>
                      {compData.journal.recentTags.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Common tags</p>
                          <div className="flex flex-wrap gap-1.5">
                            {compData.journal.recentTags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Start journaling to see your writing insights</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ACTIVITY TAB */}
            <TabsContent value="activity" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Coaching */}
                <Card data-testid="card-coaching-detail">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-violet-500" />
                      AI Coaching
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-lg bg-violet-50 dark:bg-violet-950/20">
                        <p className="text-3xl font-bold text-violet-600 dark:text-violet-400">{compData.coaching.totalSessions}</p>
                        <p className="text-xs text-muted-foreground mt-1">Chat sessions</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                        <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{compData.coaching.totalMessages}</p>
                        <p className="text-xs text-muted-foreground mt-1">Messages exchanged</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Tasks */}
                <Card data-testid="card-quicktask-detail">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckSquare className="w-5 h-5 text-emerald-500" />
                      Quick Tasks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Completion rate</span>
                        <span className="font-bold text-lg">{compData.quickTasks.completionRate}%</span>
                      </div>
                      <Progress value={compData.quickTasks.completionRate} className="h-3" />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{compData.quickTasks.totalCompleted} completed</span>
                        <span>{compData.quickTasks.totalCreated} created</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Focus Sessions */}
                <Card data-testid="card-focus-detail">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Timer className="w-5 h-5 text-purple-500" />
                      Focus Sessions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                        <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{compData.focus.totalSessions}</p>
                        <p className="text-xs text-muted-foreground mt-1">Completed</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-fuchsia-50 dark:bg-fuchsia-950/20">
                        <p className="text-3xl font-bold text-fuchsia-600 dark:text-fuchsia-400">
                          {compData.focus.totalMinutes >= 60
                            ? `${Math.floor(compData.focus.totalMinutes / 60)}h ${compData.focus.totalMinutes % 60}m`
                            : `${compData.focus.totalMinutes}m`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Total time</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Goals */}
                <Card data-testid="card-goals-detail">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Goal className="w-5 h-5 text-amber-500" />
                      Goals & Milestones
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{compData.goals.active}</p>
                          <p className="text-xs text-muted-foreground">Active goals</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{compData.goals.total}</p>
                          <p className="text-xs text-muted-foreground">Total goals</p>
                        </div>
                      </div>
                      {compData.goals.milestonesTotal > 0 && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Milestones</span>
                            <span className="font-medium">{compData.goals.milestonesCompleted}/{compData.goals.milestonesTotal}</span>
                          </div>
                          <Progress value={compData.goals.milestonesTotal > 0 ? (compData.goals.milestonesCompleted / compData.goals.milestonesTotal) * 100 : 0} className="h-2" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Achievements */}
              <Card data-testid="card-achievements-overview">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    Achievements
                  </CardTitle>
                  <CardDescription>{compData.achievements.totalEarned} badges earned on your journey</CardDescription>
                </CardHeader>
                <CardContent>
                  {compData.achievements.totalEarned > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {compData.achievements.badges.map((badge, i) => (
                        <motion.div
                          key={badge.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center"
                          title={badge.id}
                          data-testid={`badge-${badge.id}`}
                        >
                          <Trophy className="w-5 h-5 text-white" />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Complete streaks and milestones to earn badges!</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TRENDS TAB */}
            <TabsContent value="trends" className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
                  <SelectTrigger className="w-32" data-testid="select-time-range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoadingAnalytics ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : analyticsData ? (
                <>
                  <Card data-testid="card-weekly-trend">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Weekly Activity
                      </CardTitle>
                      <CardDescription>Sessions and time over the past weeks</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analyticsData.weeklyTrend.map((week) => (
                          <div key={week.week} className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground w-24">{week.week}</span>
                            <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, (week.sessions / Math.max(...analyticsData.weeklyTrend.map(w => w.sessions), 1)) * 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-20 text-right">{week.sessions} sessions</span>
                            <span className="text-sm text-muted-foreground w-16 text-right">{week.time}m</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader><CardTitle>Best Day to Practice</CardTitle></CardHeader>
                      <CardContent>
                        <div className="text-center">
                          <p className="text-4xl font-bold text-primary">{analyticsData.bestDay}</p>
                          <p className="text-muted-foreground mt-1">Your most consistent day</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle>Peak Performance Time</CardTitle></CardHeader>
                      <CardContent>
                        <div className="text-center">
                          <p className="text-4xl font-bold text-primary">{analyticsData.bestTime}</p>
                          <p className="text-muted-foreground mt-1">When you complete the most tasks</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {analyticsData.correlations.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Brain className="w-5 h-5 text-primary" />
                          Data Patterns
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {analyticsData.correlations.map((correlation, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                              {correlation.strength === "strong" && <ChevronUp className="w-5 h-5 text-green-500 mt-0.5" />}
                              {correlation.strength === "moderate" && <Minus className="w-5 h-5 text-yellow-500 mt-0.5" />}
                              {correlation.strength === "weak" && <ChevronDown className="w-5 h-5 text-red-500 mt-0.5" />}
                              <div>
                                <p className="text-sm">{correlation.insight}</p>
                                <Badge variant="outline" className="mt-1 text-xs">{correlation.strength} correlation</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">No trend data available yet. Complete some sessions to see activity trends.</p>
              )}
            </TabsContent>

            {/* AI OVERVIEW TAB */}
            <TabsContent value="ai-overview" className="space-y-4">
              {fullReport ? (
                <Card className="border-violet-200/50 dark:border-violet-800/30 bg-gradient-to-br from-violet-50/30 to-purple-50/20 dark:from-violet-950/20 dark:to-purple-950/10" data-testid="card-full-ai-report">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
                      <Crown className="w-5 h-5" />
                      Full AI Overview
                      <Badge variant="secondary" className="ml-auto text-xs">Premium</Badge>
                    </CardTitle>
                    <CardDescription>
                      Comprehensive analysis of your entire habit-building journey
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-6">
                    <div className="space-y-2" data-testid="text-full-ai-report">
                      {fullReport.split("\n").filter(line => line.trim()).map((line, i) => (
                        <motion.p
                          key={i}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="text-sm leading-relaxed"
                        >
                          {line}
                        </motion.p>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-6"
                      onClick={() => generateFullReportMutation.mutate()}
                      disabled={generateFullReportMutation.isPending}
                      data-testid="button-regenerate-full-report"
                    >
                      {generateFullReportMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                      Regenerate Report
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="text-center py-12" data-testid="card-generate-prompt">
                  <CardContent className="space-y-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto">
                      <Crown className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold">Full AI Overview</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Get a comprehensive AI analysis of your entire journey — habits, mood, journal, coaching, goals, and more — all in one personalized report.
                    </p>
                    <Button
                      onClick={() => generateFullReportMutation.mutate()}
                      disabled={generateFullReportMutation.isPending}
                      className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                      data-testid="button-generate-full-report"
                    >
                      {generateFullReportMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                      Generate Full Overview
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Data Yet</h3>
            <p className="text-muted-foreground">Complete some habit sessions to see your analytics</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
