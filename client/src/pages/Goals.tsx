import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSubscription } from "@/hooks/use-subscription";
import { usePageTitle } from "@/hooks/use-page-title";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Target,
  Plus,
  Trash2,
  Sparkles,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  Loader2,
  Lock,
  X,
  ChevronDown,
  ChevronUp,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { Link } from "wouter";
import type { Goal, GoalMilestone, Habit } from "@shared/schema";

type GoalWithMilestones = Goal & { milestones: GoalMilestone[] };

const CATEGORIES = [
  { value: "career", label: "Career", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
  { value: "health", label: "Health", color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800" },
  { value: "financial", label: "Financial", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
  { value: "personal", label: "Personal", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800" },
  { value: "learning", label: "Learning", color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800" },
  { value: "creative", label: "Creative", color: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800" },
];

function getCategoryStyle(category: string | null) {
  return CATEGORIES.find(c => c.value === category)?.color || "bg-muted text-muted-foreground";
}

function getCategoryLabel(category: string | null) {
  return CATEGORIES.find(c => c.value === category)?.label || category || "General";
}

function getDaysRemaining(targetDate: string | null) {
  if (!targetDate) return null;
  const target = new Date(targetDate);
  const now = new Date();
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function GoalCard({
  goal,
  habits,
  onExpand,
  isExpanded,
}: {
  goal: GoalWithMilestones;
  habits: Habit[];
  onExpand: () => void;
  isExpanded: boolean;
}) {
  const { toast } = useToast();
  const daysRemaining = getDaysRemaining(goal.targetDate);
  const linkedHabits = habits.filter(h => (goal.habitIds as number[] || []).includes(h.id));
  const completedMilestones = goal.milestones.filter(m => m.isCompleted).length;
  const totalMilestones = goal.milestones.length;
  const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : (goal.progress || 0);

  const toggleMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, isCompleted }: { milestoneId: number; isCompleted: boolean }) => {
      await apiRequest("PATCH", `/api/goals/${goal.id}/milestones/${milestoneId}`, { isCompleted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
    onError: () => {
      toast({ title: "Failed to update milestone", variant: "destructive" });
    },
  });

  return (
    <Card className="overflow-visible" data-testid={`card-goal-${goal.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-base">{goal.title}</CardTitle>
            {goal.category && (
              <Badge variant="outline" className={getCategoryStyle(goal.category)} data-testid={`badge-category-${goal.id}`}>
                {getCategoryLabel(goal.category)}
              </Badge>
            )}
            {goal.status === "completed" && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                Completed
              </Badge>
            )}
          </div>
          {goal.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{goal.description}</p>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onExpand}
          data-testid={`button-expand-goal-${goal.id}`}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" data-testid={`progress-goal-${goal.id}`} />
        </div>

        {daysRemaining !== null && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            {daysRemaining > 0 ? (
              <span>{daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining</span>
            ) : daysRemaining === 0 ? (
              <span className="text-amber-600 dark:text-amber-400">Due today</span>
            ) : (
              <span className="text-red-600 dark:text-red-400">{Math.abs(daysRemaining)} day{Math.abs(daysRemaining) !== 1 ? "s" : ""} overdue</span>
            )}
          </div>
        )}

        {linkedHabits.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {linkedHabits.map(h => (
              <Badge key={h.id} variant="secondary" className="text-xs" data-testid={`badge-habit-${h.id}-goal-${goal.id}`}>
                {h.title}
              </Badge>
            ))}
          </div>
        )}

        {totalMilestones > 0 && (
          <div className="space-y-1.5">
            {goal.milestones.slice(0, isExpanded ? undefined : 3).map(m => (
              <div key={m.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={m.isCompleted || false}
                  onCheckedChange={(checked) => {
                    toggleMilestoneMutation.mutate({ milestoneId: m.id, isCompleted: !!checked });
                  }}
                  data-testid={`checkbox-milestone-${m.id}`}
                />
                <span className={m.isCompleted ? "line-through text-muted-foreground" : ""}>{m.title}</span>
              </div>
            ))}
            {!isExpanded && totalMilestones > 3 && (
              <button
                onClick={onExpand}
                className="text-xs text-muted-foreground hover:text-foreground"
                data-testid={`button-show-more-milestones-${goal.id}`}
              >
                +{totalMilestones - 3} more
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GoalDetailDialog({
  goal,
  habits,
  open,
  onOpenChange,
}: {
  goal: GoalWithMilestones;
  habits: Habit[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editDescription, setEditDescription] = useState(goal.description || "");
  const [editCategory, setEditCategory] = useState(goal.category || "");
  const [editTargetDate, setEditTargetDate] = useState(goal.targetDate || "");
  const linkedHabits = habits.filter(h => (goal.habitIds as number[] || []).includes(h.id));
  const completedMilestones = goal.milestones.filter(m => m.isCompleted).length;
  const totalMilestones = goal.milestones.length;
  const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : (goal.progress || 0);

  const updateGoalMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PATCH", `/api/goals/${goal.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      setEditingGoal(false);
      toast({ title: "Goal updated" });
    },
    onError: () => {
      toast({ title: "Failed to update goal", variant: "destructive" });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/goals/${goal.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      onOpenChange(false);
      toast({ title: "Goal deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete goal", variant: "destructive" });
    },
  });

  const addMilestoneMutation = useMutation({
    mutationFn: async (title: string) => {
      await apiRequest("POST", `/api/goals/${goal.id}/milestones`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      setNewMilestoneTitle("");
    },
    onError: () => {
      toast({ title: "Failed to add milestone", variant: "destructive" });
    },
  });

  const toggleMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, isCompleted }: { milestoneId: number; isCompleted: boolean }) => {
      await apiRequest("PATCH", `/api/goals/${goal.id}/milestones/${milestoneId}`, { isCompleted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: async (milestoneId: number) => {
      await apiRequest("DELETE", `/api/goals/${goal.id}/milestones/${milestoneId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });

  const aiSuggestionsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/goals/${goal.id}/ai-suggestions`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({ title: "AI suggestions generated" });
    },
    onError: () => {
      toast({ title: "Failed to get AI suggestions", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-rose-500" />
            Goal Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {editingGoal ? (
            <div className="space-y-3">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Goal title"
                data-testid="input-edit-goal-title"
              />
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description"
                className="resize-none"
                data-testid="input-edit-goal-description"
              />
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger data-testid="select-edit-goal-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={editTargetDate}
                onChange={(e) => setEditTargetDate(e.target.value)}
                data-testid="input-edit-goal-date"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => updateGoalMutation.mutate({
                    title: editTitle,
                    description: editDescription,
                    category: editCategory,
                    targetDate: editTargetDate,
                  })}
                  disabled={updateGoalMutation.isPending}
                  data-testid="button-save-goal-edit"
                >
                  {updateGoalMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingGoal(false)} data-testid="button-cancel-goal-edit">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-lg">{goal.title}</h3>
                  {goal.description && <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditingGoal(true)} data-testid="button-edit-goal">
                    Edit
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Delete this goal and all its milestones?")) {
                        deleteGoalMutation.mutate();
                      }
                    }}
                    data-testid="button-delete-goal"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {goal.category && (
                  <Badge variant="outline" className={getCategoryStyle(goal.category)}>
                    {getCategoryLabel(goal.category)}
                  </Badge>
                )}
                {goal.targetDate && (
                  <Badge variant="outline" className="gap-1">
                    <Calendar className="w-3 h-3" />
                    {goal.targetDate}
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2.5" data-testid="progress-goal-detail" />
            <p className="text-xs text-muted-foreground">{completedMilestones} of {totalMilestones} milestones completed</p>
          </div>

          {linkedHabits.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1.5">Linked Habits</p>
              <div className="flex flex-wrap gap-1">
                {linkedHabits.map(h => (
                  <Badge key={h.id} variant="secondary" className="text-xs">
                    {h.title}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-medium mb-2">Milestones</p>
            <div className="space-y-2">
              {goal.milestones.map(m => (
                <div key={m.id} className="flex items-center gap-2 group">
                  <Checkbox
                    checked={m.isCompleted || false}
                    onCheckedChange={(checked) => {
                      toggleMilestoneMutation.mutate({ milestoneId: m.id, isCompleted: !!checked });
                    }}
                    data-testid={`checkbox-detail-milestone-${m.id}`}
                  />
                  <span className={`flex-1 text-sm ${m.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                    {m.title}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="invisible group-hover:visible"
                    onClick={() => deleteMilestoneMutation.mutate(m.id)}
                    data-testid={`button-delete-milestone-${m.id}`}
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  placeholder="Add a milestone..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newMilestoneTitle.trim()) {
                      addMilestoneMutation.mutate(newMilestoneTitle.trim());
                    }
                  }}
                  data-testid="input-new-milestone"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (newMilestoneTitle.trim()) {
                      addMilestoneMutation.mutate(newMilestoneTitle.trim());
                    }
                  }}
                  disabled={addMilestoneMutation.isPending}
                  data-testid="button-add-milestone"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <Card data-testid="card-ai-suggestions">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-rose-500" />
                AI Suggestions
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => aiSuggestionsMutation.mutate()}
                disabled={aiSuggestionsMutation.isPending}
                data-testid="button-get-ai-suggestions"
              >
                {aiSuggestionsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Get AI Advice"
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {goal.aiSuggestions || aiSuggestionsMutation.data?.suggestions ? (
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {aiSuggestionsMutation.data?.suggestions || goal.aiSuggestions}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Click "Get AI Advice" for personalized suggestions on how to achieve this goal.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateGoalDialog({ habits, open, onOpenChange }: { habits: Habit[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [selectedHabitIds, setSelectedHabitIds] = useState<number[]>([]);
  const [milestones, setMilestones] = useState<{ title: string }[]>([]);
  const [milestoneInput, setMilestoneInput] = useState("");

  const createGoalMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/goals", {
        title,
        description,
        category: category || null,
        targetDate: targetDate || null,
        habitIds: selectedHabitIds,
        milestones,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      onOpenChange(false);
      setTitle("");
      setDescription("");
      setCategory("");
      setTargetDate("");
      setSelectedHabitIds([]);
      setMilestones([]);
      toast({ title: "Goal created" });
    },
    onError: () => {
      toast({ title: "Failed to create goal", variant: "destructive" });
    },
  });

  const addMilestone = () => {
    if (milestoneInput.trim()) {
      setMilestones([...milestones, { title: milestoneInput.trim() }]);
      setMilestoneInput("");
    }
  };

  const toggleHabit = (habitId: number) => {
    setSelectedHabitIds(prev =>
      prev.includes(habitId) ? prev.filter(id => id !== habitId) : [...prev, habitId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-rose-500" />
            Create New Goal
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you want to achieve?"
              data-testid="input-goal-title"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your goal in more detail..."
              className="resize-none"
              rows={3}
              data-testid="input-goal-description"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="select-goal-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Target Date</label>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              data-testid="input-goal-target-date"
            />
          </div>

          {habits.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Link Habits</label>
              <div className="flex flex-wrap gap-1.5">
                {habits.map(h => (
                  <Badge
                    key={h.id}
                    variant={selectedHabitIds.includes(h.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleHabit(h.id)}
                    data-testid={`badge-select-habit-${h.id}`}
                  >
                    {h.title}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Initial Milestones</label>
            <div className="space-y-1.5">
              {milestones.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Circle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm flex-1">{m.title}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setMilestones(milestones.filter((_, idx) => idx !== i))}
                    data-testid={`button-remove-milestone-${i}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={milestoneInput}
                  onChange={(e) => setMilestoneInput(e.target.value)}
                  placeholder="Add a milestone..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addMilestone();
                    }
                  }}
                  data-testid="input-milestone"
                />
                <Button size="icon" variant="ghost" onClick={addMilestone} data-testid="button-add-initial-milestone">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => createGoalMutation.mutate()}
            disabled={!title.trim() || createGoalMutation.isPending}
            data-testid="button-create-goal"
          >
            {createGoalMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create Goal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Goals() {
  usePageTitle("Goals", "Set long-term goals with milestones, link them to habits, and track your progress.");
  const { features } = useSubscription();
  const { toast } = useToast();
  const [expandedGoalId, setExpandedGoalId] = useState<number | null>(null);
  const [detailGoalId, setDetailGoalId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: goalsData, isLoading: goalsLoading } = useQuery<GoalWithMilestones[]>({
    queryKey: ["/api/goals"],
    enabled: features.hasGoals,
  });

  const { data: habitsData } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
    enabled: features.hasGoals,
  });

  const allGoals = goalsData || [];
  const allHabits = (habitsData || []).filter(h => !h.archived);
  const activeGoals = allGoals.filter(g => g.status === "active");
  const completedGoals = allGoals.filter(g => g.status === "completed");
  const overallProgress = allGoals.length > 0
    ? Math.round(allGoals.reduce((sum, g) => {
        const total = g.milestones.length;
        const done = g.milestones.filter(m => m.isCompleted).length;
        return sum + (total > 0 ? (done / total) * 100 : (g.progress || 0));
      }, 0) / allGoals.length)
    : 0;

  const detailGoal = allGoals.find(g => g.id === detailGoalId) || null;

  if (!features.hasGoals) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4 md:p-8 font-body">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back-dashboard">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
          </div>
          <UpgradePrompt
            feature="Goal Setting & Milestones"
            description="Set long-term goals, break them into milestones, link habits, and track progress with AI-powered suggestions. Available with Premium."
            variant="card"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 md:p-8 font-body">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back-dashboard-goals">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="w-6 h-6 text-rose-500" />
              Goals
            </h1>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5" data-testid="button-open-create-goal">
            <Plus className="w-4 h-4" />
            New Goal
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <Card data-testid="stat-total-goals">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-md bg-rose-500/10 p-2">
                <Target className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{allGoals.length}</p>
                <p className="text-xs text-muted-foreground">Total Goals</p>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-completed-goals">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-md bg-emerald-500/10 p-2">
                <Trophy className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedGoals.length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-overall-progress">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-md bg-blue-500/10 p-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallProgress}%</p>
                <p className="text-xs text-muted-foreground">Overall Progress</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {goalsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : allGoals.length === 0 ? (
          <Card className="p-8 text-center" data-testid="card-no-goals">
            <Target className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg mb-1">No goals yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Set your first goal to start tracking your progress.</p>
            <Button onClick={() => setCreateOpen(true)} className="gap-1.5" data-testid="button-create-first-goal">
              <Plus className="w-4 h-4" />
              Create Your First Goal
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allGoals.map(goal => (
              <div key={goal.id} onClick={() => setDetailGoalId(goal.id)} className="cursor-pointer">
                <GoalCard
                  goal={goal}
                  habits={allHabits}
                  isExpanded={expandedGoalId === goal.id}
                  onExpand={() => {
                    setExpandedGoalId(expandedGoalId === goal.id ? null : goal.id);
                  }}
                />
              </div>
            ))}
          </div>
        )}

        <CreateGoalDialog
          habits={allHabits}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />

        {detailGoal && (
          <GoalDetailDialog
            goal={detailGoal}
            habits={allHabits}
            open={!!detailGoalId}
            onOpenChange={(open) => { if (!open) setDetailGoalId(null); }}
          />
        )}
      </div>
    </div>
  );
}
