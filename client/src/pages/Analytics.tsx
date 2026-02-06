import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import type { Habit, ProgressEntry } from "@shared/schema";
import { usePageTitle } from "@/hooks/use-page-title";

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

export default function Analytics() {
  usePageTitle("Analytics");
  const { isPremium, canUseFeature, getUpgradeMessage } = useSubscription();
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("month");

  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics", timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?timeRange=${timeRange}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: isPremium,
  });

  const { data: habits } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/analytics/ai-report");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      toast({
        title: "Report Generated",
        description: "Your AI insights report is ready!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const exportCSVMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/export");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `habit-builder-analytics-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: "Export Complete",
        description: "Your data has been downloaded as CSV.",
      });
    },
    onError: () => {
      toast({
        title: "Export Failed",
        description: "Could not export data. Please try again.",
        variant: "destructive",
      });
    },
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
            <Lock className="w-16 h-16 mx-auto text-muted-foreground" />
            <h2 className="text-2xl font-bold">Advanced Analytics</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Get detailed insights into your habits with trend charts, correlation analysis, 
              AI-powered reports, and CSV data export.
            </p>
            <Badge variant="secondary" className="text-sm">
              Premium Feature
            </Badge>
            <div className="pt-4">
              <Button asChild>
                <a href="/paywall">Upgrade to Premium</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6">
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
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            Advanced Analytics
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Deep insights into your habit-building journey
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          <Button
            variant="outline"
            onClick={() => generateReportMutation.mutate()}
            disabled={generateReportMutation.isPending}
            data-testid="button-generate-report"
          >
            {generateReportMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Brain className="w-4 h-4 mr-2" />
            )}
            AI Report
          </Button>

          <Button
            variant="outline"
            onClick={() => exportCSVMutation.mutate()}
            disabled={exportCSVMutation.isPending}
            data-testid="button-export-csv"
          >
            {exportCSVMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export CSV
          </Button>
        </div>
      </div>

      {isLoadingAnalytics ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : analyticsData ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Sessions</p>
                      <p className="text-3xl font-bold">{analyticsData.totalSessions}</p>
                    </div>
                    <Target className="w-10 h-10 text-primary/20" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Time Invested</p>
                      <p className="text-3xl font-bold">
                        {Math.floor(analyticsData.totalTimeSpent / 60)}h {analyticsData.totalTimeSpent % 60}m
                      </p>
                    </div>
                    <Clock className="w-10 h-10 text-primary/20" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Streak</p>
                      <p className="text-3xl font-bold">{analyticsData.currentStreak} days</p>
                    </div>
                    <Flame className="w-10 h-10 text-orange-500/20" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Session</p>
                      <p className="text-3xl font-bold">{analyticsData.averageSessionLength}m</p>
                    </div>
                    <Calendar className="w-10 h-10 text-primary/20" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <Tabs defaultValue="trends" className="space-y-4">
            <TabsList>
              <TabsTrigger value="trends" data-testid="tab-trends">Trends</TabsTrigger>
              <TabsTrigger value="habits" data-testid="tab-habits">By Habit</TabsTrigger>
              <TabsTrigger value="insights" data-testid="tab-insights">AI Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="trends" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Weekly Activity
                  </CardTitle>
                  <CardDescription>Your sessions and time over the past weeks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analyticsData.weeklyTrend.map((week, i) => (
                      <div key={week.week} className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground w-24">{week.week}</span>
                        <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, (week.sessions / Math.max(...analyticsData.weeklyTrend.map(w => w.sessions))) * 100)}%` }}
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
                  <CardHeader>
                    <CardTitle>Best Day to Practice</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <p className="text-4xl font-bold text-primary">{analyticsData.bestDay}</p>
                      <p className="text-muted-foreground mt-1">You're most consistent on this day</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Peak Performance Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <p className="text-4xl font-bold text-primary">{analyticsData.bestTime}</p>
                      <p className="text-muted-foreground mt-1">When you complete the most tasks</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="habits" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Habit Performance Breakdown</CardTitle>
                  <CardDescription>Compare your progress across different habits</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.habitBreakdown.map((habit) => (
                      <div key={habit.habitId} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{habit.habitTitle}</h4>
                          <Badge variant="secondary">{habit.completion}% complete</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Sessions: </span>
                            <span className="font-medium">{habit.sessions}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Time: </span>
                            <span className="font-medium">{habit.time} minutes</span>
                          </div>
                        </div>
                        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${habit.completion}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {analyticsData.habitBreakdown.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Complete some sessions to see your habit breakdown
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    AI-Powered Insights
                  </CardTitle>
                  <CardDescription>
                    Patterns and correlations discovered in your habit data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analyticsData.correlations.map((correlation, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        {correlation.strength === "strong" && (
                          <ChevronUp className="w-5 h-5 text-green-500 mt-0.5" />
                        )}
                        {correlation.strength === "moderate" && (
                          <Minus className="w-5 h-5 text-yellow-500 mt-0.5" />
                        )}
                        {correlation.strength === "weak" && (
                          <ChevronDown className="w-5 h-5 text-red-500 mt-0.5" />
                        )}
                        <div>
                          <p className="text-sm">{correlation.insight}</p>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {correlation.strength} correlation
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                    {analyticsData.correlations.length === 0 && (
                      <div className="text-center py-8">
                        <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">
                          Keep tracking your habits to unlock AI insights
                        </p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => generateReportMutation.mutate()}
                          disabled={generateReportMutation.isPending}
                        >
                          {generateReportMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                          )}
                          Generate Insights
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Data Yet</h3>
            <p className="text-muted-foreground">
              Complete some habit sessions to see your analytics
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
