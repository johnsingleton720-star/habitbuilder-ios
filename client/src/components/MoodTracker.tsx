import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SmilePlus, Smile, Meh, Frown, AlertCircle, Zap, Brain, Moon, Lock, TrendingUp, TrendingDown, Check, Sparkles, ChevronRight, X, BarChart3, FileText, ArrowUp, ArrowDown, Minus, HelpCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useHabits } from "@/hooks/use-habits";
import { useSubscription } from "@/hooks/use-subscription";
import { Crown, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

type MoodType = "great" | "good" | "okay" | "bad" | "terrible";

interface MoodOption {
  value: MoodType;
  label: string;
  icon: typeof Smile;
  color: string;
  bgColor: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  { value: "great", label: "Great", icon: SmilePlus, color: "text-green-600", bgColor: "bg-green-100" },
  { value: "good", label: "Good", icon: Smile, color: "text-emerald-600", bgColor: "bg-emerald-100" },
  { value: "okay", label: "Okay", icon: Meh, color: "text-amber-600", bgColor: "bg-amber-100" },
  { value: "bad", label: "Bad", icon: Frown, color: "text-orange-600", bgColor: "bg-orange-100" },
  { value: "terrible", label: "Terrible", icon: AlertCircle, color: "text-red-600", bgColor: "bg-red-100" },
];

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
}

interface MoodInsights {
  message?: string;
  insights: string[];
  correlations: {
    habitId: number;
    habitTitle: string;
    correlation: string | null;
    timesCompleted: number;
  }[];
  stats?: {
    avgMood: number;
    avgEnergy: number;
    avgStress: number;
    totalEntries: number;
  };
}

interface MoodReport {
  habitTitle: string;
  totalEntries: number;
  positiveRate: number;
  avgMoodWith: number;
  avgMoodWithout: number;
  moodImpact: number;
  avgEnergy: number;
  avgStress: number;
  avgSleep: number;
  moodDistribution: Record<string, number>;
  notes: {
    date: string;
    mood: string;
    notes: string;
    energy?: number;
    stress?: number;
    sleep?: number;
  }[];
}

export function MoodTracker() {
  const { user } = useAuth();
  const { data: habits } = useHabits();
  const { toast } = useToast();
  const { isFreeUser } = useSubscription();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [energy, setEnergy] = useState([3]);
  const [stress, setStress] = useState([3]);
  const [sleep, setSleep] = useState([3]);
  const [notes, setNotes] = useState("");
  const [selectedHabits, setSelectedHabits] = useState<number[]>([]);
  const [reportHabitId, setReportHabitId] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [showMoodImpactInfo, setShowMoodImpactInfo] = useState(false);
  
  const isPremium = user?.subscriptionTier === 'premium' || user?.isAdmin;
  const today = format(new Date(), "yyyy-MM-dd");
  
  const { data: entries = [] } = useQuery<MoodEntry[]>({
    queryKey: ["/api/mood"],
  });
  
  const { data: insights } = useQuery<MoodInsights>({
    queryKey: ["/api/mood/insights"],
    enabled: Boolean(isPremium && entries.length >= 3),
  });

  const { data: moodReport, isLoading: reportLoading } = useQuery<MoodReport>({
    queryKey: ["/api/mood/report", reportHabitId],
    enabled: Boolean(reportHabitId && reportOpen),
  });
  
  const todayEntry = entries.find(e => e.date === today);
  
  const saveMoodMutation = useMutation({
    mutationFn: async (data: Partial<MoodEntry>) => {
      return await apiRequest("POST", "/api/mood", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mood"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mood/insights"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mood/report"] });
      toast({
        title: "Mood logged!",
        description: "Your mood has been recorded for today.",
      });
      setOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save mood",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const resetForm = () => {
    setSelectedMood(null);
    setEnergy([3]);
    setStress([3]);
    setSleep([3]);
    setNotes("");
    setSelectedHabits([]);
  };
  
  const handleSave = () => {
    if (!selectedMood) return;
    
    saveMoodMutation.mutate({
      date: today,
      mood: selectedMood,
      energy: energy[0],
      stress: stress[0],
      sleep: sleep[0],
      notes: notes || undefined,
      habitIds: selectedHabits,
    });
  };
  
  const toggleHabit = (habitId: number) => {
    setSelectedHabits(prev => 
      prev.includes(habitId) 
        ? prev.filter(id => id !== habitId)
        : [...prev, habitId]
    );
  };

  const openReport = (habitId: number) => {
    setReportHabitId(habitId);
    setReportOpen(true);
  };
  
  const recentMoods = entries.slice(-7).reverse();

  const getMoodLabel = (mood: string) => {
    return MOOD_OPTIONS.find(o => o.value === mood)?.label || mood;
  };

  const getMoodIcon = (mood: string) => {
    return MOOD_OPTIONS.find(o => o.value === mood);
  };

  if (isFreeUser) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <SmilePlus className="w-5 h-5 text-muted-foreground" />
                Mood Tracker
                <Badge variant="outline" className="text-xs gap-1 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                  <Lock className="w-3 h-3" />
                  Pro
                </Badge>
              </CardTitle>
              <CardDescription>Track how you feel and find patterns</CardDescription>
            </div>
            <Button 
              size="sm" 
              onClick={() => navigate("/paywall")}
              className="gap-1.5"
              data-testid="button-upgrade-mood"
            >
              <Crown className="w-3.5 h-3.5" />
              Unlock
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex justify-center gap-3 opacity-40 pointer-events-none select-none py-2">
            {MOOD_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <div key={option.value} className="flex flex-col items-center gap-1 p-2 rounded-lg">
                  <Icon className={cn("w-7 h-7", option.color)} />
                  <span className="text-xs text-muted-foreground">{option.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <SmilePlus className="w-5 h-5 text-primary" />
              Mood Tracker
              {!isPremium && <Badge variant="secondary" className="text-xs">Premium</Badge>}
            </CardTitle>
            <CardDescription>Track how you feel and find patterns</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                variant={todayEntry ? "outline" : "default"}
                data-testid="button-log-mood"
              >
                {todayEntry ? "Update Mood" : "Log Mood"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <SmilePlus className="w-5 h-5 text-primary" />
                  How are you feeling today?
                </DialogTitle>
                <DialogDescription>
                  Track your mood to discover patterns and correlations with your habits.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="flex justify-center gap-2">
                  {MOOD_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selectedMood === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setSelectedMood(option.value)}
                        className={cn(
                          "flex flex-col items-center gap-1 p-3 rounded-lg transition-all",
                          isSelected 
                            ? `${option.bgColor} ring-2 ring-primary scale-110` 
                            : "hover:bg-muted"
                        )}
                        data-testid={`button-mood-${option.value}`}
                      >
                        <Icon className={cn("w-8 h-8", option.color)} />
                        <span className={cn("text-xs font-medium", isSelected && option.color)}>
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                
                <AnimatePresence>
                  {selectedMood && isPremium && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-medium">Energy Level</span>
                          <span className="text-xs text-muted-foreground ml-auto">{energy[0]}/5</span>
                        </div>
                        <Slider
                          value={energy}
                          onValueChange={setEnergy}
                          min={1}
                          max={5}
                          step={1}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-purple-500" />
                          <span className="text-sm font-medium">Stress Level</span>
                          <span className="text-xs text-muted-foreground ml-auto">{stress[0]}/5</span>
                        </div>
                        <Slider
                          value={stress}
                          onValueChange={setStress}
                          min={1}
                          max={5}
                          step={1}
                          className="w-full"
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
                        />
                      </div>
                      
                      {habits && habits.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-sm font-medium">Habits completed today</span>
                          <div className="flex flex-wrap gap-2">
                            {habits.map((habit: { id: number; title: string }) => (
                              <Badge
                                key={habit.id}
                                variant={selectedHabits.includes(habit.id) ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => toggleHabit(habit.id)}
                              >
                                {selectedHabits.includes(habit.id) && <Check className="w-3 h-3 mr-1" />}
                                {habit.title}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <span className="text-sm font-medium">Notes (optional)</span>
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="How are you feeling? What happened today?"
                          className="resize-none"
                          rows={2}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {!isPremium && selectedMood && (
                  <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Upgrade to Premium to track energy, stress, sleep, and get AI insights
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleSave} 
                  disabled={!selectedMood || saveMoodMutation.isPending}
                >
                  {saveMoodMutation.isPending ? "Saving..." : "Save Mood"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {recentMoods.length > 0 && (
          <div className="flex items-center gap-1">
            {recentMoods.map((entry) => {
              const option = MOOD_OPTIONS.find(o => o.value === entry.mood);
              if (!option) return null;
              const Icon = option.icon;
              return (
                <div
                  key={entry.id}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    option.bgColor
                  )}
                  title={`${format(new Date(entry.date), "MMM d")}: ${option.label}`}
                >
                  <Icon className={cn("w-4 h-4", option.color)} />
                </div>
              );
            })}
            {recentMoods.length < 7 && (
              <span className="text-xs text-muted-foreground ml-2">
                Last {recentMoods.length} days
              </span>
            )}
          </div>
        )}
        
        {recentMoods.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Start tracking your mood to see patterns
          </p>
        )}
        
        {isPremium && (insights as MoodInsights | undefined)?.correlations && (insights as MoodInsights).correlations.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">Mood Correlations</span>
            </div>
            <div className="space-y-1">
              {(insights as MoodInsights).correlations.map((corr: { habitId: number; habitTitle: string; correlation: string | null; timesCompleted: number }) => (
                <button
                  key={corr.habitId}
                  onClick={() => corr.correlation !== null ? openReport(corr.habitId) : undefined}
                  className={cn(
                    "flex items-center justify-between text-sm w-full p-2 rounded-lg transition-all text-left",
                    corr.correlation !== null ? "cursor-pointer hover:bg-muted/50" : "cursor-default"
                  )}
                  data-testid={`mood-correlation-${corr.habitId}`}
                >
                  <span className="text-muted-foreground">{corr.habitTitle}</span>
                  <div className="flex items-center gap-2">
                    {corr.correlation !== null ? (
                      <>
                        <TrendingUp className="w-3 h-3 text-green-600" />
                        <span className="text-green-600 font-medium">{corr.correlation}% positive</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">No data yet</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {!isPremium && (
          <div className="pt-3 border-t flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-4 h-4" />
            <span>Premium users can see mood-habit correlations and AI insights</span>
          </div>
        )}
      </CardContent>
    </Card>

    <Dialog open={reportOpen} onOpenChange={(open) => { setReportOpen(open); if (!open) setReportHabitId(null); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Mood Report: {moodReport?.habitTitle || "Loading..."}
          </DialogTitle>
          <DialogDescription>
            Detailed analytics for how this habit affects your mood
          </DialogDescription>
        </DialogHeader>

        {reportLoading ? (
          <div className="py-8 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Analyzing mood data...</p>
          </div>
        ) : moodReport ? (
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-border/50">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{moodReport.positiveRate}%</p>
                  <p className="text-xs text-muted-foreground">Positive mood rate</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{moodReport.totalEntries}</p>
                  <p className="text-xs text-muted-foreground">Entries recorded</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Mood Impact
                  </h4>
                  <button
                    onClick={() => setShowMoodImpactInfo(!showMoodImpactInfo)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="btn-mood-impact-info"
                    aria-label="How mood impact is calculated"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>
                <AnimatePresence>
                  {showMoodImpactInfo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1.5 border border-border/50">
                        <div className="flex items-start gap-2">
                          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                          <div className="space-y-1.5">
                            <p><strong className="text-foreground">With habit</strong> — Your average mood score on days you completed this habit.</p>
                            <p><strong className="text-foreground">Without habit</strong> — Your average mood score on all other days when you logged a mood but didn't do this habit.</p>
                            <p><strong className="text-foreground">Difference</strong> — How much better (or worse) your mood tends to be on days you do this habit. The more entries you log, the more accurate this comparison becomes.</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {moodReport.totalEntries < 3 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Limited data — log more mood entries for a more accurate comparison.
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <p className="text-lg font-bold text-foreground">{moodReport.avgMoodWith}/5</p>
                    <p className="text-xs text-muted-foreground">With habit</p>
                  </div>
                  <div className="text-center px-3">
                    <div className={cn(
                      "flex items-center gap-1 text-sm font-bold",
                      moodReport.moodImpact > 0 ? "text-green-600" : moodReport.moodImpact < 0 ? "text-red-500" : "text-muted-foreground"
                    )}>
                      {moodReport.moodImpact > 0 ? <ArrowUp className="w-4 h-4" /> : moodReport.moodImpact < 0 ? <ArrowDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                      {moodReport.moodImpact > 0 ? "+" : ""}{moodReport.moodImpact}
                    </div>
                    <p className="text-[10px] text-muted-foreground">difference</p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-lg font-bold text-muted-foreground">{moodReport.avgMoodWithout}/5</p>
                    <p className="text-xs text-muted-foreground">Without habit</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {(moodReport.avgEnergy > 0 || moodReport.avgStress > 0 || moodReport.avgSleep > 0) && (
              <Card className="border-border/50">
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-semibold">Averages on days with this habit</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {moodReport.avgEnergy > 0 && (
                      <div className="text-center">
                        <Zap className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                        <p className="text-lg font-bold">{moodReport.avgEnergy}</p>
                        <p className="text-[10px] text-muted-foreground">Energy</p>
                      </div>
                    )}
                    {moodReport.avgStress > 0 && (
                      <div className="text-center">
                        <Brain className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                        <p className="text-lg font-bold">{moodReport.avgStress}</p>
                        <p className="text-[10px] text-muted-foreground">Stress</p>
                      </div>
                    )}
                    {moodReport.avgSleep > 0 && (
                      <div className="text-center">
                        <Moon className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                        <p className="text-lg font-bold">{moodReport.avgSleep}</p>
                        <p className="text-[10px] text-muted-foreground">Sleep</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-semibold">Mood Distribution</h4>
                <div className="space-y-2">
                  {Object.entries(moodReport.moodDistribution).filter(([_, count]) => count > 0).map(([mood, count]) => {
                    const option = getMoodIcon(mood);
                    const total = moodReport.totalEntries;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    if (!option) return null;
                    const Icon = option.icon;
                    return (
                      <div key={mood} className="flex items-center gap-3">
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0", option.bgColor)}>
                          <Icon className={cn("w-3.5 h-3.5", option.color)} />
                        </div>
                        <span className="text-sm text-foreground w-16">{option.label}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", option.bgColor)}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-14 text-right">{count} ({pct}%)</span>
                      </div>
                    );
                  })}
                  {Object.values(moodReport.moodDistribution).every(c => c === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-2">No mood data recorded with this habit yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {moodReport.notes.length > 0 && (
              <Card className="border-border/50">
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Notes Summary ({moodReport.notes.length} entries)
                  </h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {moodReport.notes.map((note, i) => {
                      const option = getMoodIcon(note.mood);
                      const Icon = option?.icon || Meh;
                      return (
                        <div key={i} className="flex gap-3 p-2.5 rounded-lg bg-muted/30">
                          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", option?.bgColor || "bg-muted")}>
                            <Icon className={cn("w-3.5 h-3.5", option?.color || "text-muted-foreground")} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-foreground">
                                {format(new Date(note.date), "MMM d, yyyy")}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {getMoodLabel(note.mood)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{note.notes}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <p>No report data available</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
