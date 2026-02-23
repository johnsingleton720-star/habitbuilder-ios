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
} from "lucide-react";
import { Link } from "wouter";
import type { PlannerBlock, DailyPlannerEntry } from "@shared/schema";

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
};

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

function TimeBlock({
  block,
  onToggle,
  isUpdating,
}: {
  block: PlannerBlock;
  onToggle: () => void;
  isUpdating: boolean;
}) {
  const style = BLOCK_TYPE_STYLES[block.type] || BLOCK_TYPE_STYLES.custom;
  const Icon = style.icon;

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-md border-l-4 ${style.border} ${style.bg} transition-all cursor-pointer hover-elevate`}
      onClick={onToggle}
      data-testid={`block-${block.id}`}
    >
      <div className="flex-shrink-0 pt-0.5">
        {isUpdating ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : block.completed ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" data-testid={`block-check-${block.id}`} />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground" data-testid={`block-circle-${block.id}`} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-sm font-medium ${block.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
            data-testid={`block-title-${block.id}`}
          >
            {block.title}
          </span>
          <Badge variant="outline" className="text-xs no-default-hover-elevate no-default-active-elevate">
            <Icon className="w-3 h-3 mr-1" />
            {style.label}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {block.time}
            {block.endTime ? ` - ${block.endTime}` : ""}
          </span>
          <span className="flex items-center gap-1">
            <Timer className="w-3 h-3" />
            {block.duration}min
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DailyPlanner() {
  usePageTitle("Daily Planner");
  const { features } = useSubscription();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newBlock, setNewBlock] = useState({
    title: "",
    time: "09:00",
    type: "custom" as PlannerBlock["type"],
    duration: 30,
  });
  const [updatingBlockId, setUpdatingBlockId] = useState<string | null>(null);

  const dateStr = formatDate(selectedDate);

  const { data: plannerEntry, isLoading } = useQuery<DailyPlannerEntry | null>({
    queryKey: ["/api/planner", dateStr],
    enabled: features.hasDailyPlanner,
  });

  const blocks: PlannerBlock[] = (plannerEntry?.blocks as PlannerBlock[]) || [];

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/planner/generate", { date: dateStr });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planner", dateStr] });
      toast({ title: "Plan generated", description: "Your AI-optimized schedule is ready." });
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
          description="AI-powered daily schedule optimizer that combines your habits, tasks, and custom time blocks into an optimized daily plan. Available with Premium."
          variant="card"
        />
      </div>
    );
  }

  const completedCount = blocks.filter((b) => b.completed).length;
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

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back-planner">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground" data-testid="text-planner-title">
            Daily Planner
          </h1>
          <p className="text-sm text-muted-foreground">AI-powered schedule optimizer</p>
        </div>
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

      {blocks.length > 0 && (
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
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="bg-gradient-to-r from-sky-500 to-blue-600 text-white border-0"
          data-testid="button-generate-plan"
        >
          {generateMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          {generateMutation.isPending ? "Generating..." : "Generate My Day"}
        </Button>
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
            <div className="w-12 h-12 mx-auto rounded-full bg-sky-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-sky-500" />
            </div>
            <h3 className="text-base font-medium text-foreground">No plan for this day yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Click "Generate My Day" to create an AI-optimized schedule based on your habits and tasks, or manually add time blocks.
            </p>
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
                toggleBlockMutation.mutate({
                  blockId: block.id,
                  completed: !block.completed,
                });
              }}
            />
          ))}
        </div>
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
                <Input
                  type="time"
                  value={newBlock.time}
                  onChange={(e) => setNewBlock({ ...newBlock, time: e.target.value })}
                  data-testid="input-block-time"
                />
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
    </div>
  );
}
