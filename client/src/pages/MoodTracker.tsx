import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

const MOOD_ORDER: MoodType[] = ["great", "good", "okay", "bad", "terrible"];

export default function MoodTracker() {
  usePageTitle("Mood Tracker", "Track your mood, energy, stress, and sleep to discover patterns and improve well-being.");
  const { features } = useSubscription();
  const { toast } = useToast();

  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [energy, setEnergy] = useState([3]);
  const [stress, setStress] = useState([3]);
  const [sleep, setSleep] = useState([3]);
  const [notes, setNotes] = useState("");
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  const { data: entries = [], isLoading } = useQuery<MoodEntry[]>({
    queryKey: ["/api/mood"],
  });

  const todayEntry = entries.find(e => e.date === today);

  const saveMoodMutation = useMutation({
    mutationFn: async (data: Partial<MoodEntry>) => {
      return await apiRequest("POST", "/api/mood", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mood"] });
      toast({ title: "Mood logged!", description: "Your mood has been recorded." });
      setSelectedMood(null);
      setEnergy([3]);
      setStress([3]);
      setSleep([3]);
      setNotes("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save mood", description: error.message, variant: "destructive" });
    },
  });

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

  const handleSave = () => {
    if (!selectedMood) return;
    saveMoodMutation.mutate({
      date: today,
      mood: selectedMood,
      energy: energy[0],
      stress: stress[0],
      sleep: sleep[0],
      notes: notes || undefined,
    });
  };

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
            feature="Mood Tracker"
            description="Track your mood, energy, stress, and sleep patterns. Get AI-powered insights about what affects your well-being."
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
                Mood Tracker
              </h1>
              <p className="text-sm text-muted-foreground">Check in with yourself daily</p>
            </div>
          </div>
          {todayEntry && (
            <Badge variant="outline" className="gap-1.5" data-testid="badge-today-logged">
              {(() => { const Icon = MOOD_CONFIG[todayEntry.mood].icon; return <Icon className={cn("w-3.5 h-3.5", MOOD_CONFIG[todayEntry.mood].color)} />; })()}
              Logged today
            </Badge>
          )}
        </div>

        <Card data-testid="card-mood-checkin">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <SmilePlus className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              {todayEntry ? "Update Today's Check-in" : "Quick Check-in"}
            </CardTitle>
            <CardDescription>How are you feeling right now?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex justify-center gap-2 flex-wrap">
              {MOOD_ORDER.map((mood) => {
                const config = MOOD_CONFIG[mood];
                const Icon = config.icon;
                const isSelected = selectedMood === mood;
                return (
                  <button
                    key={mood}
                    onClick={() => setSelectedMood(mood)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all min-w-[60px]",
                      isSelected
                        ? `${config.bgColor} ring-2 ring-primary scale-105`
                        : "hover-elevate"
                    )}
                    data-testid={`button-mood-${mood}`}
                  >
                    <Icon className={cn("w-7 h-7", config.color)} />
                    <span className={cn("text-xs font-medium", isSelected ? config.color : "text-muted-foreground")}>
                      {config.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedMood && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium">Energy</span>
                    <span className="text-xs text-muted-foreground ml-auto">{energy[0]}/5</span>
                  </div>
                  <Slider
                    value={energy}
                    onValueChange={setEnergy}
                    min={1}
                    max={5}
                    step={1}
                    className="w-full"
                    data-testid="slider-energy"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium">Stress</span>
                    <span className="text-xs text-muted-foreground ml-auto">{stress[0]}/5</span>
                  </div>
                  <Slider
                    value={stress}
                    onValueChange={setStress}
                    min={1}
                    max={5}
                    step={1}
                    className="w-full"
                    data-testid="slider-stress"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">Sleep Quality</span>
                    <span className="text-xs text-muted-foreground ml-auto">{sleep[0]}/5</span>
                  </div>
                  <Slider
                    value={sleep}
                    onValueChange={setSleep}
                    min={1}
                    max={5}
                    step={1}
                    className="w-full"
                    data-testid="slider-sleep"
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium">Notes (optional)</span>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything on your mind?"
                    className="resize-none"
                    rows={2}
                    data-testid="textarea-mood-notes"
                  />
                </div>

                <Button
                  onClick={handleSave}
                  disabled={saveMoodMutation.isPending}
                  className="w-full"
                  data-testid="button-save-mood"
                >
                  {saveMoodMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : todayEntry ? "Update Mood" : "Save Mood"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

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
                          <p className="text-[10px] text-muted-foreground leading-none">{dayLabel}</p>
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
              <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-no-entries">
                No mood entries yet. Start by logging how you feel today.
              </p>
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
