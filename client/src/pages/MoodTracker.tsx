import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import {
  SmilePlus,
  Smile,
  Meh,
  Frown,
  AlertCircle,
  Zap,
  Brain,
  Moon,
  ArrowLeft,
  Sparkles,
  Loader2,
  Calendar,
  TrendingUp,
  Activity,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/use-subscription";
import { usePageTitle } from "@/hooks/use-page-title";
import { Link } from "wouter";
import { format, subDays, parseISO } from "date-fns";

type MoodType = "great" | "good" | "okay" | "bad" | "terrible";

interface MoodEntry {
  id: number;
  userId: string;
  date: string;
  mood: MoodType;
  energy?: number;
  stress?: number;
  sleep?: number;
  notes?: string;
  habitIds?: number[];
  createdAt?: string;
}

const MOOD_CONFIG: Record<MoodType, { label: string; icon: typeof Smile; color: string; bgColor: string; dotColor: string; value: number }> = {
  great: { label: "Great", icon: SmilePlus, color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/40", dotColor: "bg-emerald-500", value: 5 },
  good: { label: "Good", icon: Smile, color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/40", dotColor: "bg-green-500", value: 4 },
  okay: { label: "Okay", icon: Meh, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/40", dotColor: "bg-amber-500", value: 3 },
  bad: { label: "Bad", icon: Frown, color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-100 dark:bg-orange-900/40", dotColor: "bg-orange-500", value: 2 },
  terrible: { label: "Terrible", icon: AlertCircle, color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/40", dotColor: "bg-red-500", value: 1 },
};

export default function MoodTracker() {
  usePageTitle("Mood Insights", "Analyze your mood patterns, energy, stress, and sleep trends with AI-powered insights.");
  const { features } = useSubscription();
  const { toast } = useToast();

  const [aiInsight, setAiInsight] = useState<string | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  const { data: entries = [], isLoading } = useQuery<MoodEntry[]>({
    queryKey: ["/api/mood"],
  });

  const todayEntry = entries.find(e => e.date === today);

  const aiInsightMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/mood/ai-insights", {});
      return await res.json();
    },
    onSuccess: (data: { insight: string }) => {
      setAiInsight(data.insight);
    },
    onError: (error: Error) => {
      toast({ title: "Could not get insights", description: error.message, variant: "destructive" });
    },
  });

  if (!features.hasMoodTracker) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4 md:p-8 font-body">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back-dashboard">
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
          </div>
          <UpgradePrompt
            feature="Mood Insights"
            description="Analyze your mood patterns, energy, stress, and sleep trends. Get AI-powered insights about what affects your well-being."
            variant="card"
          />
        </div>
      </div>
    );
  }

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
    const entry = entries.find(e => e.date === date);
    return { date, entry };
  });

  const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);

  const energyEntries = entries.filter(e => e.energy && e.energy > 0);
  const stressEntries = entries.filter(e => e.stress && e.stress > 0);
  const sleepEntries = entries.filter(e => e.sleep && e.sleep > 0);
  const avgEnergy = energyEntries.length > 0 ? (energyEntries.reduce((s, e) => s + (e.energy || 0), 0) / energyEntries.length).toFixed(1) : "-";
  const avgStress = stressEntries.length > 0 ? (stressEntries.reduce((s, e) => s + (e.stress || 0), 0) / stressEntries.length).toFixed(1) : "-";
  const avgSleep = sleepEntries.length > 0 ? (sleepEntries.reduce((s, e) => s + (e.sleep || 0), 0) / sleepEntries.length).toFixed(1) : "-";

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 md:p-8 font-body">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back-dashboard">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2" data-testid="text-mood-title">
                <Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                Mood Insights
              </h1>
              <p className="text-sm text-muted-foreground">Trends and patterns from your mood check-ins</p>
            </div>
          </div>
          {todayEntry && (
            <Badge variant="outline" className="gap-1.5" data-testid="badge-today-logged">
              {(() => { const Icon = MOOD_CONFIG[todayEntry.mood].icon; return <Icon className={cn("w-3.5 h-3.5", MOOD_CONFIG[todayEntry.mood].color)} />; })()}
              Logged today
            </Badge>
          )}
        </div>

        <Card className="border-teal-200/30 dark:border-teal-800/20 bg-teal-50/30 dark:bg-teal-950/10" data-testid="card-log-cta">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center flex-shrink-0">
              <SmilePlus className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{todayEntry ? "Today's mood is logged" : "Haven't checked in today"}</p>
              <p className="text-xs text-muted-foreground">Log your mood from the dashboard Mood Check-in card</p>
            </div>
            <Link href="/">
              <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0" data-testid="button-go-checkin">
                <Home className="w-3.5 h-3.5" />
                Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <Card data-testid="stat-avg-energy">
            <CardContent className="p-3 text-center">
              <Zap className="w-4 h-4 text-amber-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{avgEnergy}</p>
              <p className="text-xs text-muted-foreground">Avg Energy</p>
            </CardContent>
          </Card>
          <Card data-testid="stat-avg-stress">
            <CardContent className="p-3 text-center">
              <Brain className="w-4 h-4 text-purple-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{avgStress}</p>
              <p className="text-xs text-muted-foreground">Avg Stress</p>
            </CardContent>
          </Card>
          <Card data-testid="stat-avg-sleep">
            <CardContent className="p-3 text-center">
              <Moon className="w-4 h-4 text-blue-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{avgSleep}</p>
              <p className="text-xs text-muted-foreground">Avg Sleep</p>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-mood-timeline">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              7-Day Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="relative">
                <div className="flex items-end justify-between gap-1 px-2" style={{ height: 120 }}>
                  {last7Days.map(({ date, entry }, i) => {
                    const moodValue = entry ? MOOD_CONFIG[entry.mood].value : 0;
                    const dotHeight = moodValue > 0 ? 20 + (moodValue / 5) * 80 : 0;
                    const config = entry ? MOOD_CONFIG[entry.mood] : null;
                    const dayLabel = format(parseISO(date), "EEE");
                    const dateLabel = format(parseISO(date), "d");

                    return (
                      <div key={date} className="flex-1 flex flex-col items-center gap-1" data-testid={`timeline-day-${i}`}>
                        <div className="relative flex-1 w-full flex items-end justify-center" style={{ height: 80 }}>
                          {entry && config ? (
                            <div
                              className={cn("w-4 h-4 rounded-full transition-all", config.dotColor)}
                              style={{ marginBottom: `${dotHeight - 20}px` }}
                              title={`${config.label} - ${format(parseISO(date), "MMM d")}`}
                            />
                          ) : (
                            <div
                              className="w-3 h-3 rounded-full bg-muted border border-border"
                              title={`No entry - ${format(parseISO(date), "MMM d")}`}
                            />
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground leading-none">{dayLabel}</p>
                          <p className={cn("text-xs font-medium leading-tight", date === today ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground")}>{dateLabel}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {(() => {
                  const filledDays = last7Days.filter(d => d.entry);
                  if (filledDays.length < 2) return null;
                  return (
                    <svg className="absolute inset-0 pointer-events-none" style={{ height: 80, top: 0, left: 0, right: 0 }} preserveAspectRatio="none">
                      <polyline
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeOpacity="0.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={last7Days
                          .map(({ entry }, i) => {
                            if (!entry) return null;
                            const x = (i / 6) * 100;
                            const y = 100 - (MOOD_CONFIG[entry.mood].value / 5) * 80 - 10;
                            return `${x}%,${y}%`;
                          })
                          .filter(Boolean)
                          .join(" ")}
                      />
                    </svg>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-teal-200/50 dark:border-teal-800/30 bg-gradient-to-br from-teal-50/50 to-cyan-50/30 dark:from-teal-950/20 dark:to-cyan-950/10" data-testid="card-ai-insights">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              AI Pattern Analysis
            </CardTitle>
            <CardDescription>Discover trends in your mood data</CardDescription>
          </CardHeader>
          <CardContent>
            {aiInsight ? (
              <div className="space-y-3">
                <p className="text-sm text-foreground leading-relaxed" data-testid="text-ai-insight">{aiInsight}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => aiInsightMutation.mutate()}
                  disabled={aiInsightMutation.isPending}
                  data-testid="button-refresh-insights"
                >
                  {aiInsightMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Refresh
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => aiInsightMutation.mutate()}
                disabled={aiInsightMutation.isPending || entries.length < 3}
                className="gap-2"
                data-testid="button-get-insights"
              >
                {aiInsightMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {entries.length < 3 ? `Need ${3 - entries.length} more entries` : "Get AI Insights"}
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-mood-history">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              Recent History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : sortedEntries.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-sm text-muted-foreground" data-testid="text-no-entries">
                  No mood entries yet.
                </p>
                <Link href="/">
                  <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-start-logging">
                    <Home className="w-3.5 h-3.5" />
                    Go to Dashboard to log your first mood
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedEntries.map((entry) => {
                  const config = MOOD_CONFIG[entry.mood];
                  const Icon = config.icon;
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover-elevate"
                      data-testid={`mood-entry-${entry.id}`}
                    >
                      <div className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0", config.bgColor)}>
                        <Icon className={cn("w-5 h-5", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("text-sm font-medium", config.color)}>{config.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(entry.date), "MMM d, yyyy")}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          {entry.energy && (
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3 text-amber-500" />
                              {entry.energy}/5
                            </span>
                          )}
                          {entry.stress && (
                            <span className="flex items-center gap-1">
                              <Brain className="w-3 h-3 text-purple-500" />
                              {entry.stress}/5
                            </span>
                          )}
                          {entry.sleep && (
                            <span className="flex items-center gap-1">
                              <Moon className="w-3 h-3 text-blue-500" />
                              {entry.sleep}/5
                            </span>
                          )}
                        </div>
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-muted-foreground truncate max-w-[120px] hidden sm:block">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
