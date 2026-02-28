import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSubscription } from "@/hooks/use-subscription";
import { usePageTitle } from "@/hooks/use-page-title";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Sparkles,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
  Coffee,
  Zap,
  ListTodo,
  Palette,
  Timer,
  TrendingUp,
  RefreshCw,
  HelpCircle,
  Target,
  Brain,
  AlertTriangle,
  SkipForward,
  CalendarRange,
  X,
  Lightbulb,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  ArrowRight,
  BarChart3,
  Info,
  Briefcase,
  Pencil,
  Trash2,
} from "lucide-react";
import { Link } from "wouter";
import type { PlannerBlock, PlannerInsights, DailyPlannerEntry, UserCommitment } from "@shared/schema";

const BLOCK_TYPE_STYLES: Record<string, { bg: string; border: string; icon: typeof Zap; label: string }> = {
  habit: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    border: "border-l-emerald-500",
    icon: Zap,
    label: "Habit",
  },
  task: {
    bg: "bg-sky-500/10 dark:bg-sky-500/15",
    border: "border-l-sky-500",
    icon: ListTodo,
    label: "Task",
  },
  break: {
    bg: "bg-muted/50",
    border: "border-l-muted-foreground/40",
    icon: Coffee,
    label: "Break",
  },
  custom: {
    bg: "bg-purple-500/10 dark:bg-purple-500/15",
    border: "border-l-purple-500",
    icon: Palette,
    label: "Custom",
  },
  commitment: {
    bg: "bg-slate-500/8 dark:bg-slate-500/12",
    border: "border-l-slate-400 dark:border-l-slate-500",
    icon: Briefcase,
    label: "Commitment",
  },
};

const ENERGY_COLORS = {
  high: "text-orange-500",
  medium: "text-yellow-500",
  low: "text-blue-400",
};

const PRIORITY_STYLES = {
  high: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
};

function formatTime12h(time: string): string {
  if (!time) return "";
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr);
  const m = mStr || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
}

const TIME_OPTIONS: { value: string; label: string }[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of ["00", "30"]) {
    const value = `${String(h).padStart(2, "0")}:${m}`;
    TIME_OPTIONS.push({ value, label: formatTime12h(value) });
  }
}

const DAY_LABELS = [
  { key: "monday", short: "M" },
  { key: "tuesday", short: "T" },
  { key: "wednesday", short: "W" },
  { key: "thursday", short: "T" },
  { key: "friday", short: "F" },
  { key: "saturday", short: "S" },
  { key: "sunday", short: "S" },
];

function formatDaysShort(days: string[]): string {
  const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const weekend = ["saturday", "sunday"];
  const allDays = [...weekdays, ...weekend];
  if (days.length === 7) return "Every day";
  if (weekdays.every(d => days.includes(d)) && !days.includes("saturday") && !days.includes("sunday")) return "M-F";
  if (weekend.every(d => days.includes(d)) && days.length === 2) return "Weekends";
  return days.map(d => {
    const idx = allDays.indexOf(d);
    return ["M", "Tu", "W", "Th", "F", "Sa", "Su"][idx] || d.slice(0, 2);
  }).join(", ");
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function isToday(date: Date): boolean {
  const today = new Date();
  return formatDate(date) === formatDate(today);
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function EnergyIcon({ level }: { level?: string }) {
  if (level === "high") return <BatteryFull className="w-3 h-3 text-orange-500" />;
  if (level === "low") return <BatteryLow className="w-3 h-3 text-blue-400" />;
  return <BatteryMedium className="w-3 h-3 text-yellow-500" />;
}

function TimeBlock({
  block,
  onToggle,
  onSkip,
  isUpdating,
}: {
  block: PlannerBlock;
  onToggle: () => void;
  onSkip: () => void;
  isUpdating: boolean;
}) {
  const style = BLOCK_TYPE_STYLES[block.type] || BLOCK_TYPE_STYLES.custom;
  const Icon = style.icon;
  const isSkipped = block.skipped;
  const isCommitment = block.type === "commitment";

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-md border-l-4 ${style.border} ${isSkipped ? "bg-muted/30 opacity-60" : style.bg} transition-all`}
      data-testid={`block-${block.id}`}
    >
      {isCommitment ? (
        <div className="flex-shrink-0 pt-0.5">
          <Briefcase className="w-5 h-5 text-slate-400" />
        </div>
      ) : (
        <div
          className="flex-shrink-0 pt-0.5 cursor-pointer"
          onClick={onToggle}
        >
          {isUpdating ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : block.completed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" data-testid={`block-check-${block.id}`} />
          ) : isSkipped ? (
            <SkipForward className="w-5 h-5 text-muted-foreground" data-testid={`block-skip-${block.id}`} />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground" data-testid={`block-circle-${block.id}`} />
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-sm font-medium ${isCommitment ? "text-muted-foreground" : block.completed ? "line-through text-muted-foreground" : isSkipped ? "line-through text-muted-foreground" : "text-foreground"}`}
            data-testid={`block-title-${block.id}`}
          >
            {block.title}
          </span>
          <Badge variant="outline" className={`text-xs no-default-hover-elevate no-default-active-elevate ${isCommitment ? "border-slate-300 dark:border-slate-600 text-slate-500" : ""}`}>
            <Icon className="w-3 h-3 mr-1" />
            {style.label}
          </Badge>
          {block.priority === "high" && !block.completed && !isSkipped && !isCommitment && (
            <Badge variant="outline" className={`text-[10px] py-0 ${PRIORITY_STYLES.high}`}>
              <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
              Priority
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime12h(block.time)}
            {block.endTime ? ` - ${formatTime12h(block.endTime)}` : ""}
          </span>
          <span className="flex items-center gap-1">
            <Timer className="w-3 h-3" />
            {block.duration}min
          </span>
          {block.energyLevel && !isCommitment && (
            <span className="flex items-center gap-1">
              <EnergyIcon level={block.energyLevel} />
              <span className={ENERGY_COLORS[block.energyLevel] || ""}>
                {block.energyLevel}
              </span>
            </span>
          )}
        </div>
      </div>
      {!block.completed && !isSkipped && block.type !== "break" && !isCommitment && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); onSkip(); }}
          data-testid={`button-skip-${block.id}`}
        >
          <SkipForward className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}

function FocusThemeCard({ insights }: { insights: PlannerInsights }) {
  const [showTips, setShowTips] = useState(false);

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20" data-testid="card-focus-theme">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Today's Focus</p>
              <h3 className="text-base font-semibold text-foreground" data-testid="text-focus-theme">
                {insights.focusTheme}
              </h3>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowTips(!showTips)}
            data-testid="button-toggle-tips"
          >
            <Lightbulb className={`w-4 h-4 ${showTips ? "text-yellow-500" : "text-muted-foreground"}`} />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground" data-testid="text-focus-desc">
          {insights.focusDescription}
        </p>

        {insights.atRiskHabits && insights.atRiskHabits.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Streak at risk:</span>
            {insights.atRiskHabits.map((h, i) => (
              <Badge key={i} variant="outline" className="text-xs bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400">
                {h}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2">
          <Brain className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{insights.energyStrategy}</p>
        </div>

        {showTips && insights.tipsForToday && (
          <div className="space-y-1.5 pt-1 border-t border-border/50">
            <p className="text-xs font-medium text-foreground flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-yellow-500" />
              Tips for Today
            </p>
            {insights.tipsForToday.map((tip, i) => (
              <p key={i} className="text-xs text-muted-foreground pl-4">
                {i + 1}. {tip}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EnergyCurve({ blocks }: { blocks: PlannerBlock[] }) {
  if (blocks.length === 0) return null;

  const hourSlots: { hour: number; level: number; hasBlock: boolean }[] = [];
  for (let h = 7; h <= 22; h++) {
    const blocksAtHour = blocks.filter(b => {
      const blockHour = parseInt(b.time.split(":")[0]);
      const endHour = b.endTime ? parseInt(b.endTime.split(":")[0]) : blockHour + 1;
      return h >= blockHour && h < endHour;
    });
    const levels = blocksAtHour.map(b => b.energyLevel === "high" ? 3 : b.energyLevel === "low" ? 1 : 2);
    const avgLevel = levels.length > 0 ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;
    hourSlots.push({ hour: h, level: avgLevel, hasBlock: blocksAtHour.length > 0 });
  }

  const maxLevel = 3;

  return (
    <Card data-testid="card-energy-curve">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Battery className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Energy Throughout the Day</span>
        </div>
        <div className="flex items-end gap-[2px] h-10">
          {hourSlots.map((slot) => (
            <div
              key={slot.hour}
              className="flex-1 rounded-t-sm transition-all"
              style={{
                height: slot.hasBlock ? `${(slot.level / maxLevel) * 100}%` : "4px",
                minHeight: "2px",
              }}
              title={`${slot.hour}:00 - ${slot.level === 3 ? "High" : slot.level === 2 ? "Medium" : slot.level === 1 ? "Low" : "Free"} energy`}
            >
              <div
                className={`w-full h-full rounded-t-sm ${
                  slot.level >= 2.5 ? "bg-orange-400" :
                  slot.level >= 1.5 ? "bg-yellow-400" :
                  slot.level >= 0.5 ? "bg-blue-300" :
                  "bg-muted"
                }`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">7am</span>
          <span className="text-[10px] text-muted-foreground">12pm</span>
          <span className="text-[10px] text-muted-foreground">5pm</span>
          <span className="text-[10px] text-muted-foreground">10pm</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface WeeklySummary {
  days: {
    date: string;
    dayName: string;
    hasPlanner: boolean;
    totalBlocks: number;
    completedBlocks: number;
    skippedBlocks: number;
    habitCount: number;
    completedHabits: number;
    totalMinutes: number;
    completionRate: number;
  }[];
  habitDistribution: {
    title: string;
    daysPerWeek: number;
    currentStreak: number;
    totalTime: number;
  }[];
}

function WeeklyView({ startDate, onSelectDay }: { startDate: string; onSelectDay: (date: string) => void }) {
  const { toast } = useToast();

  const { data: summary, isLoading, isError, refetch } = useQuery<WeeklySummary>({
    queryKey: ["/api/planner/weekly-summary", startDate],
    queryFn: async () => {
      const res = await fetch(`/api/planner/weekly-summary?startDate=${startDate}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch weekly summary");
      return res.json();
    },
    staleTime: 0,
  });

  const generateWeekMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/planner/generate-week", { startDate });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/planner/weekly-summary", startDate] });
      for (const r of data.results) {
        queryClient.invalidateQueries({ queryKey: ["/api/planner", r.date] });
      }
      const { generated, skipped } = data.summary;
      toast({
        title: "Weekly plan generated",
        description: `${generated} day${generated !== 1 ? "s" : ""} generated${skipped > 0 ? `, ${skipped} already planned` : ""}.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <div className="space-y-3" data-testid="weekly-view">
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <CalendarRange className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isError ? "Failed to load weekly summary. Tap to retry." : "No weekly data available yet."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              data-testid="button-retry-weekly"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
        <Button
          onClick={() => generateWeekMutation.mutate()}
          disabled={generateWeekMutation.isPending}
          className="w-full bg-gradient-to-r from-primary to-emerald-600 text-white border-0"
          data-testid="button-generate-week"
        >
          {generateWeekMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          {generateWeekMutation.isPending ? "Generating week..." : "Generate My Week"}
        </Button>
      </div>
    );
  }

  const todayStr = formatDate(new Date());
  const daysPlanned = summary.days.filter(d => d.hasPlanner).length;
  const allPlanned = daysPlanned === 7;

  return (
    <div className="space-y-3" data-testid="weekly-view">
      <div className="grid grid-cols-7 gap-1" data-testid="weekly-grid">
        {summary.days.map((day) => {
          const isCurrentDay = day.date === todayStr;
          const isPast = day.date < todayStr;
          return (
            <button
              key={day.date}
              onClick={() => onSelectDay(day.date)}
              className={`p-2 rounded-lg text-center transition-all ${
                isCurrentDay ? "bg-primary/15 border border-primary/30" :
                day.hasPlanner ? "bg-card border border-border hover:border-primary/30" :
                "bg-muted/30 border border-transparent hover:bg-muted/50"
              }`}
              data-testid={`weekly-day-${day.date}`}
            >
              <p className="text-[10px] font-medium text-muted-foreground">{day.dayName}</p>
              <p className={`text-sm font-bold ${isCurrentDay ? "text-primary" : "text-foreground"}`}>
                {new Date(day.date + 'T12:00:00').getDate()}
              </p>
              {day.hasPlanner ? (
                <div className="mt-1">
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${day.completionRate}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{day.completionRate}%</p>
                </div>
              ) : (
                <p className="text-[9px] text-muted-foreground mt-1">{isPast ? "—" : "Plan"}</p>
              )}
            </button>
          );
        })}
      </div>

      <Button
        onClick={() => generateWeekMutation.mutate()}
        disabled={generateWeekMutation.isPending}
        className="w-full bg-gradient-to-r from-primary to-emerald-600 text-white border-0"
        data-testid="button-generate-week"
      >
        {generateWeekMutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4 mr-2" />
        )}
        {generateWeekMutation.isPending
          ? "Generating week..."
          : allPlanned
            ? "Regenerate Week"
            : `Generate My Week${daysPlanned > 0 ? ` (${7 - daysPlanned} days)` : ""}`}
      </Button>

      {summary.habitDistribution.length > 0 && (
        <Card data-testid="card-habit-distribution">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Habit Balance This Week
            </p>
            <div className="space-y-2">
              {summary.habitDistribution.slice(0, 6).map((habit, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-foreground truncate flex-1 min-w-0">{habit.title}</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 7 }).map((_, d) => {
                      const dayData = summary.days[d];
                      const isScheduled = d < habit.daysPerWeek;
                      return (
                        <div
                          key={d}
                          className={`w-3 h-3 rounded-sm ${
                            dayData?.completedHabits > 0 && isScheduled
                              ? "bg-emerald-500"
                              : isScheduled ? "bg-emerald-500/20" : "bg-muted"
                          }`}
                        />
                      );
                    })}
                  </div>
                  <Badge variant="outline" className="text-[10px] py-0 ml-1">
                    {habit.currentStreak}d
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {summary.days.reduce((s, d) => s + d.completedBlocks, 0)}
              </p>
              <p className="text-[10px] text-muted-foreground">Completed</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {Math.round(summary.days.reduce((s, d) => s + d.totalMinutes, 0) / 60 * 10) / 10}h
              </p>
              <p className="text-[10px] text-muted-foreground">Planned</p>
            </div>
            <div>
              <p className="text-lg font-bold text-primary">
                {daysPlanned}/7
              </p>
              <p className="text-[10px] text-muted-foreground">Days Planned</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" data-testid="dialog-help">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            How Smart Planner Works
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Daily Focus Theme
            </h4>
            <p className="text-muted-foreground">
              Each day gets a personalized theme based on which habits need attention, your recent patterns, and what would make the biggest impact today.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Battery className="w-4 h-4 text-orange-500" />
              Energy-Aware Scheduling
            </h4>
            <p className="text-muted-foreground">
              Your schedule adapts to your energy levels. If you've been logging low energy or poor sleep in mood check-ins, demanding tasks are scheduled later in the day. High energy? They go first.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Streak Protection
            </h4>
            <p className="text-muted-foreground">
              Habits with active streaks that haven't been done today are flagged as priorities and placed at optimal times so you don't lose your momentum.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <SkipForward className="w-4 h-4 text-blue-500" />
              Adaptive Rescheduling
            </h4>
            <p className="text-muted-foreground">
              Missed a block? Tap the skip button and the planner will suggest available times later in your day to fit it in, so nothing gets lost.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-purple-500" />
              Weekly Overview
            </h4>
            <p className="text-muted-foreground">
              Switch to the weekly view to see your habit balance across the entire week. See which days are light and which are heavy, and plan ahead.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-slate-500" />
              My Routine
            </h4>
            <p className="text-muted-foreground">
              Set up your fixed commitments like work hours, school, or gym time. The AI will never schedule over these and will plan your habits and tasks around them.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Gets Smarter Over Time
            </h4>
            <p className="text-muted-foreground">
              The more you use mood check-ins and complete sessions, the better the planner understands your patterns. New users get sensible defaults that improve as you build history.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DailyPlanner() {
  usePageTitle("Smart Planner");
  const { features } = useSubscription();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"daily" | "weekly">("daily");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [rescheduleData, setRescheduleData] = useState<{
    blockId: string;
    blockTitle: string;
    suggestedTime: string | null;
    availableSlots: string[];
  } | null>(null);
  const [newBlock, setNewBlock] = useState({
    title: "",
    time: "09:00",
    type: "custom" as PlannerBlock["type"],
    duration: 30,
  });
  const [updatingBlockId, setUpdatingBlockId] = useState<string | null>(null);
  const [showRoutine, setShowRoutine] = useState(false);
  const [showCommitmentDialog, setShowCommitmentDialog] = useState(false);
  const [editingCommitment, setEditingCommitment] = useState<UserCommitment | null>(null);
  const [commitmentForm, setCommitmentForm] = useState({
    title: "",
    startTime: "09:00",
    endTime: "17:00",
    days: ["monday", "tuesday", "wednesday", "thursday", "friday"] as string[],
  });

  const dateStr = formatDate(selectedDate);
  const weekStart = getWeekStart(selectedDate);
  const weekStartStr = formatDate(weekStart);

  const { data: plannerEntry, isLoading } = useQuery<DailyPlannerEntry | null>({
    queryKey: ["/api/planner", dateStr],
    enabled: features.hasDailyPlanner,
  });

  const { data: commitments = [] } = useQuery<UserCommitment[]>({
    queryKey: ["/api/commitments"],
    enabled: features.hasDailyPlanner,
  });

  const createCommitmentMutation = useMutation({
    mutationFn: async (data: { title: string; startTime: string; endTime: string; days: string[] }) => {
      const res = await apiRequest("POST", "/api/commitments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commitments"] });
      setShowCommitmentDialog(false);
      setEditingCommitment(null);
      setCommitmentForm({ title: "", startTime: "09:00", endTime: "17:00", days: ["monday", "tuesday", "wednesday", "thursday", "friday"] });
      toast({ title: "Commitment saved", description: "Your routine has been updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const updateCommitmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<{ title: string; startTime: string; endTime: string; days: string[] }> }) => {
      const res = await apiRequest("PATCH", `/api/commitments/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commitments"] });
      setShowCommitmentDialog(false);
      setEditingCommitment(null);
      setCommitmentForm({ title: "", startTime: "09:00", endTime: "17:00", days: ["monday", "tuesday", "wednesday", "thursday", "friday"] });
      toast({ title: "Commitment updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteCommitmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/commitments/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commitments"] });
      toast({ title: "Commitment removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const blocks: PlannerBlock[] = (plannerEntry?.blocks as PlannerBlock[]) || [];
  const insights: PlannerInsights | null = (plannerEntry as any)?.insights || null;

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/planner/generate", { date: dateStr });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planner", dateStr] });
      queryClient.invalidateQueries({ queryKey: ["/api/planner/weekly-summary"] });
      toast({ title: "Smart plan generated", description: "Your AI-optimized schedule is ready." });
    },
    onError: (err: Error) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  const toggleBlockMutation = useMutation({
    mutationFn: async ({ blockId, completed }: { blockId: string; completed: boolean }) => {
      setUpdatingBlockId(blockId);
      const res = await apiRequest("PATCH", "/api/planner/block", {
        date: dateStr,
        blockId,
        updates: { completed },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planner", dateStr] });
      queryClient.invalidateQueries({ queryKey: ["/api/quick-tasks"] });
      setUpdatingBlockId(null);
    },
    onError: (err: Error) => {
      setUpdatingBlockId(null);
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/planner/refresh", { date: dateStr });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planner", dateStr] });
      queryClient.invalidateQueries({ queryKey: ["/api/quick-tasks"] });
      toast({ title: "Plan refreshed", description: "New tasks synced and completion states updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Refresh failed", description: err.message, variant: "destructive" });
    },
  });

  const skipMutation = useMutation({
    mutationFn: async (blockId: string) => {
      const res = await apiRequest("POST", "/api/planner/reschedule", { date: dateStr, blockId });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/planner", dateStr] });
      if (data.suggestedTime) {
        setRescheduleData({
          blockId: data.skippedBlock.id,
          blockTitle: data.skippedBlock.title,
          suggestedTime: data.suggestedTime,
          availableSlots: data.availableSlots || [],
        });
        setShowRescheduleDialog(true);
      } else {
        toast({ title: "Block skipped", description: "No available slots to reschedule." });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Skip failed", description: err.message, variant: "destructive" });
    },
  });

  const rescheduleConfirmMutation = useMutation({
    mutationFn: async ({ blockId, newTime }: { blockId: string; newTime: string }) => {
      const res = await apiRequest("POST", "/api/planner/reschedule-confirm", {
        date: dateStr,
        blockId,
        newTime,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planner", dateStr] });
      setShowRescheduleDialog(false);
      setRescheduleData(null);
      toast({ title: "Rescheduled", description: "Block moved to a new time slot." });
    },
    onError: (err: Error) => {
      toast({ title: "Reschedule failed", description: err.message, variant: "destructive" });
    },
  });

  const addBlockMutation = useMutation({
    mutationFn: async (block: Omit<PlannerBlock, "id" | "completed">) => {
      const newId = `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const hours = parseInt(block.time.split(":")[0]);
      const mins = parseInt(block.time.split(":")[1]);
      const endMins = mins + block.duration;
      const endH = hours + Math.floor(endMins / 60);
      const endM = endMins % 60;
      const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

      const newPlannerBlock: PlannerBlock = {
        id: newId,
        ...block,
        endTime,
        completed: false,
      };
      const updatedBlocks = [...blocks, newPlannerBlock].sort((a, b) => a.time.localeCompare(b.time));
      const res = await apiRequest("POST", "/api/planner", {
        date: dateStr,
        blocks: updatedBlocks,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planner", dateStr] });
      setShowAddDialog(false);
      setNewBlock({ title: "", time: "09:00", type: "custom", duration: 30 });
      toast({ title: "Block added", description: "New time block added to your schedule." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add block", description: err.message, variant: "destructive" });
    },
  });

  const goToPrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const goToNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const goToToday = () => setSelectedDate(new Date());

  if (!features.hasDailyPlanner) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <UpgradePrompt
          feature="Smart Daily Planner"
          description="AI-powered daily schedule optimizer that adapts to your energy levels, protects your streaks, and gets smarter over time. Available with Premium."
          variant="card"
        />
      </div>
    );
  }

  const completedCount = blocks.filter((b) => b.completed).length;
  const skippedCount = blocks.filter((b) => b.skipped).length;
  const activeBlocks = blocks.filter(b => !b.skipped);
  const totalMinutes = blocks.reduce((sum, b) => sum + b.duration, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const habitCount = blocks.filter((b) => b.type === "habit").length;
  const taskCount = blocks.filter((b) => b.type === "task").length;

  const handleAddBlock = () => {
    if (!newBlock.title.trim()) {
      toast({ title: "Title required", description: "Please enter a title for the block.", variant: "destructive" });
      return;
    }
    addBlockMutation.mutate({
      title: newBlock.title.trim(),
      time: newBlock.time,
      type: newBlock.type,
      duration: newBlock.duration,
    });
  };

  const openCommitmentDialog = (commitment?: UserCommitment) => {
    if (commitment) {
      setEditingCommitment(commitment);
      setCommitmentForm({
        title: commitment.title,
        startTime: commitment.startTime,
        endTime: commitment.endTime,
        days: commitment.days as string[],
      });
    } else {
      setEditingCommitment(null);
      setCommitmentForm({ title: "", startTime: "09:00", endTime: "17:00", days: ["monday", "tuesday", "wednesday", "thursday", "friday"] });
    }
    setShowCommitmentDialog(true);
  };

  const handleSaveCommitment = () => {
    if (!commitmentForm.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    if (commitmentForm.days.length === 0) {
      toast({ title: "Select at least one day", variant: "destructive" });
      return;
    }
    if (commitmentForm.startTime >= commitmentForm.endTime) {
      toast({ title: "End time must be after start time", variant: "destructive" });
      return;
    }
    if (editingCommitment) {
      updateCommitmentMutation.mutate({ id: editingCommitment.id, data: commitmentForm });
    } else {
      createCommitmentMutation.mutate(commitmentForm);
    }
  };

  const toggleCommitmentDay = (day: string) => {
    setCommitmentForm(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day],
    }));
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-24">
      <div className="flex items-center gap-2 flex-wrap">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back-planner">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground" data-testid="text-planner-title">
            Smart Planner
          </h1>
          <p className="text-sm text-muted-foreground">AI-powered schedule that adapts to you</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowHelpModal(true)}
          data-testid="button-help"
        >
          <HelpCircle className="w-5 h-5 text-muted-foreground" />
        </Button>
      </div>

      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg" data-testid="tab-selector">
        <Button
          variant={activeTab === "daily" ? "default" : "ghost"}
          size="sm"
          className="flex-1 h-8"
          onClick={() => setActiveTab("daily")}
          data-testid="tab-daily"
        >
          <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
          Daily
        </Button>
        <Button
          variant={activeTab === "weekly" ? "default" : "ghost"}
          size="sm"
          className="flex-1 h-8"
          onClick={() => setActiveTab("weekly")}
          data-testid="tab-weekly"
        >
          <CalendarRange className="w-3.5 h-3.5 mr-1.5" />
          Weekly
        </Button>
      </div>

      <Card data-testid="card-date-selector">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="icon" onClick={goToPrevDay} data-testid="button-prev-day">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 flex-1 justify-center min-w-0">
              <CalendarDays className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium truncate" data-testid="text-selected-date">
                {formatDisplayDate(selectedDate)}
              </span>
              {!isToday(selectedDate) && (
                <Button variant="outline" size="sm" onClick={goToToday} data-testid="button-today">
                  Today
                </Button>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={goToNextDay} data-testid="button-next-day">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeTab === "weekly" ? (
        <WeeklyView
          startDate={weekStartStr}
          onSelectDay={(date) => {
            setSelectedDate(new Date(date + 'T12:00:00'));
            setActiveTab("daily");
          }}
        />
      ) : (
        <>
          {insights && <FocusThemeCard insights={insights} />}

          {blocks.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="stats-summary">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold text-foreground" data-testid="stat-hours">{totalHours}</p>
                    <p className="text-xs text-muted-foreground">Hours Planned</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold text-foreground" data-testid="stat-completed">
                      {completedCount}/{blocks.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400" data-testid="stat-habits">{habitCount}</p>
                    <p className="text-xs text-muted-foreground">Habits</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold text-sky-600 dark:text-sky-400" data-testid="stat-tasks">{taskCount}</p>
                    <p className="text-xs text-muted-foreground">Tasks</p>
                  </CardContent>
                </Card>
              </div>

              <EnergyCurve blocks={blocks} />
            </>
          )}

          <Card data-testid="card-my-routine">
            <CardContent className="p-3">
              <button
                className="flex items-center justify-between w-full text-left"
                onClick={() => setShowRoutine(!showRoutine)}
                data-testid="button-toggle-routine"
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-foreground">My Routine</span>
                  {commitments.length > 0 && (
                    <Badge variant="outline" className="text-[10px] py-0">{commitments.length}</Badge>
                  )}
                </div>
                {showRoutine ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              {showRoutine && (
                <div className="mt-3 space-y-2">
                  {commitments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No commitments yet. Add your work hours, school, gym, or any fixed time blocks so the AI schedules around them.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {commitments.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg px-2.5 py-1.5 text-xs group"
                          data-testid={`commitment-chip-${c.id}`}
                        >
                          <Briefcase className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="font-medium text-foreground">{c.title}</span>
                          <span className="text-muted-foreground">
                            {formatTime12h(c.startTime)}-{formatTime12h(c.endTime)}
                          </span>
                          <span className="text-muted-foreground">{formatDaysShort(c.days as string[])}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => openCommitmentDialog(c)}
                            data-testid={`button-edit-commitment-${c.id}`}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                            onClick={() => deleteCommitmentMutation.mutate(c.id)}
                            data-testid={`button-delete-commitment-${c.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openCommitmentDialog()}
                    data-testid="button-add-commitment"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Add Commitment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="bg-gradient-to-r from-primary to-emerald-600 text-white border-0"
              data-testid="button-generate-plan"
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {generateMutation.isPending ? "Optimizing..." : blocks.length > 0 ? "Regenerate" : "Generate My Day"}
            </Button>
            {blocks.length > 0 && (
              <Button
                variant="outline"
                onClick={() => refreshMutation.mutate()}
                disabled={refreshMutation.isPending}
                data-testid="button-refresh-plan"
              >
                {refreshMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Sync Tasks
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(true)}
              data-testid="button-add-block"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Block
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-md" />
              ))}
            </div>
          ) : blocks.length === 0 ? (
            <Card data-testid="card-empty-planner">
              <CardContent className="p-8 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-base font-medium text-foreground">Your Smart Planner is Ready</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Hit "Generate My Day" and the AI will create an optimized schedule based on your habits, tasks, energy patterns, and streaks.
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                  <Info className="w-3.5 h-3.5" />
                  <span>Tap the <HelpCircle className="w-3 h-3 inline" /> icon above for details on smart features</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2" data-testid="timeline-view">
              {blocks.map((block) => (
                <TimeBlock
                  key={block.id}
                  block={block}
                  isUpdating={updatingBlockId === block.id}
                  onToggle={() => {
                    if (!block.skipped) {
                      toggleBlockMutation.mutate({
                        blockId: block.id,
                        completed: !block.completed,
                      });
                    }
                  }}
                  onSkip={() => skipMutation.mutate(block.id)}
                />
              ))}
              {skippedCount > 0 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  {skippedCount} block{skippedCount > 1 ? "s" : ""} skipped
                </p>
              )}
            </div>
          )}
        </>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent data-testid="dialog-add-block">
          <DialogHeader>
            <DialogTitle>Add Time Block</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Title</label>
              <Input
                placeholder="e.g., Deep work session"
                value={newBlock.title}
                onChange={(e) => setNewBlock({ ...newBlock, title: e.target.value })}
                data-testid="input-block-title"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Time</label>
                <Select
                  value={newBlock.time}
                  onValueChange={(v) => setNewBlock({ ...newBlock, time: v })}
                >
                  <SelectTrigger data-testid="input-block-time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Duration (min)</label>
                <Input
                  type="number"
                  min={5}
                  max={480}
                  value={newBlock.duration}
                  onChange={(e) => setNewBlock({ ...newBlock, duration: parseInt(e.target.value) || 30 })}
                  data-testid="input-block-duration"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Type</label>
              <Select
                value={newBlock.type}
                onValueChange={(v) => setNewBlock({ ...newBlock, type: v as PlannerBlock["type"] })}
              >
                <SelectTrigger data-testid="select-block-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="habit">Habit</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="break">Break</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={handleAddBlock}
              disabled={addBlockMutation.isPending}
              data-testid="button-confirm-add-block"
            >
              {addBlockMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Block
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent data-testid="dialog-reschedule">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SkipForward className="w-5 h-5 text-primary" />
              Reschedule Block
            </DialogTitle>
          </DialogHeader>
          {rescheduleData && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{rescheduleData.blockTitle}</span> was skipped. Would you like to fit it in later?
              </p>

              {rescheduleData.suggestedTime && (
                <Button
                  className="w-full"
                  onClick={() => rescheduleConfirmMutation.mutate({
                    blockId: rescheduleData.blockId,
                    newTime: rescheduleData.suggestedTime!,
                  })}
                  disabled={rescheduleConfirmMutation.isPending}
                  data-testid="button-reschedule-suggested"
                >
                  {rescheduleConfirmMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4 mr-2" />
                  )}
                  Move to {formatTime12h(rescheduleData.suggestedTime!)} (suggested)
                </Button>
              )}

              {rescheduleData.availableSlots.length > 1 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Or pick a time:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {rescheduleData.availableSlots.filter(s => s !== rescheduleData.suggestedTime).slice(0, 5).map((slot) => (
                      <Button
                        key={slot}
                        variant="outline"
                        size="sm"
                        onClick={() => rescheduleConfirmMutation.mutate({
                          blockId: rescheduleData.blockId,
                          newTime: slot,
                        })}
                        disabled={rescheduleConfirmMutation.isPending}
                        data-testid={`button-slot-${slot}`}
                      >
                        {formatTime12h(slot)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => {
                  setShowRescheduleDialog(false);
                  setRescheduleData(null);
                }}
                data-testid="button-skip-permanently"
              >
                Skip for today
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCommitmentDialog} onOpenChange={setShowCommitmentDialog}>
        <DialogContent data-testid="dialog-commitment">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-slate-500" />
              {editingCommitment ? "Edit Commitment" : "Add Commitment"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">What is it?</label>
              <Input
                placeholder="e.g., Work, School, Gym"
                value={commitmentForm.title}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, title: e.target.value })}
                data-testid="input-commitment-title"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Start Time</label>
                <Select
                  value={commitmentForm.startTime}
                  onValueChange={(v) => setCommitmentForm({ ...commitmentForm, startTime: v })}
                >
                  <SelectTrigger data-testid="select-commitment-start">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">End Time</label>
                <Select
                  value={commitmentForm.endTime}
                  onValueChange={(v) => setCommitmentForm({ ...commitmentForm, endTime: v })}
                >
                  <SelectTrigger data-testid="select-commitment-end">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Which days?</label>
              <div className="flex gap-1.5">
                {DAY_LABELS.map((day, i) => (
                  <button
                    key={day.key}
                    onClick={() => toggleCommitmentDay(day.key)}
                    className={`w-9 h-9 rounded-full text-xs font-medium transition-all ${
                      commitmentForm.days.includes(day.key)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    data-testid={`button-day-${day.key}`}
                  >
                    {day.short}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => setCommitmentForm({ ...commitmentForm, days: ["monday", "tuesday", "wednesday", "thursday", "friday"] })}
                  data-testid="button-weekdays"
                >
                  Weekdays
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => setCommitmentForm({ ...commitmentForm, days: ["saturday", "sunday"] })}
                  data-testid="button-weekends"
                >
                  Weekends
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => setCommitmentForm({ ...commitmentForm, days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] })}
                  data-testid="button-everyday"
                >
                  Every day
                </Button>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleSaveCommitment}
              disabled={createCommitmentMutation.isPending || updateCommitmentMutation.isPending}
              data-testid="button-save-commitment"
            >
              {(createCommitmentMutation.isPending || updateCommitmentMutation.isPending) ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Briefcase className="w-4 h-4 mr-2" />
              )}
              {editingCommitment ? "Update" : "Save"} Commitment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <HelpModal open={showHelpModal} onClose={() => setShowHelpModal(false)} />
    </div>
  );
}
