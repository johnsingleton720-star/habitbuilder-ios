import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useHabits } from "@/hooks/use-habits";
import { useSubscription } from "@/hooks/use-subscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Layers, Plus, ArrowRight, Sparkles, GripVertical, Trash2, Crown, Loader2, ChevronDown, ChevronUp, Clock, BarChart3, Edit, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Link } from "wouter";
import type { HabitStack, Habit } from "@shared/schema";

const STACK_COLORS: { id: string; label: string; border: string; bg: string; accent: string; text: string; dot: string }[] = [
  { id: "primary", label: "Default", border: "border-border", bg: "", accent: "bg-primary/10", text: "text-primary", dot: "bg-primary" },
  { id: "emerald", label: "Forest", border: "border-emerald-300 dark:border-emerald-700", bg: "bg-emerald-50/50 dark:bg-emerald-950/20", accent: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  { id: "blue", label: "Ocean", border: "border-blue-300 dark:border-blue-700", bg: "bg-blue-50/50 dark:bg-blue-950/20", accent: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  { id: "purple", label: "Lavender", border: "border-purple-300 dark:border-purple-700", bg: "bg-purple-50/50 dark:bg-purple-950/20", accent: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
  { id: "orange", label: "Sunset", border: "border-orange-300 dark:border-orange-700", bg: "bg-orange-50/50 dark:bg-orange-950/20", accent: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  { id: "pink", label: "Rose", border: "border-pink-300 dark:border-pink-700", bg: "bg-pink-50/50 dark:bg-pink-950/20", accent: "bg-pink-100 dark:bg-pink-900/40", text: "text-pink-700 dark:text-pink-300", dot: "bg-pink-500" },
  { id: "cyan", label: "Sky", border: "border-cyan-300 dark:border-cyan-700", bg: "bg-cyan-50/50 dark:bg-cyan-950/20", accent: "bg-cyan-100 dark:bg-cyan-900/40", text: "text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500" },
  { id: "amber", label: "Honey", border: "border-amber-300 dark:border-amber-700", bg: "bg-amber-50/50 dark:bg-amber-950/20", accent: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
];

function getStackColor(colorId: string | null | undefined) {
  return STACK_COLORS.find(c => c.id === colorId) || STACK_COLORS[0];
}

export function HabitStacks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: habits } = useHabits();
  const { features } = useSubscription();
  const [createOpen, setCreateOpen] = useState(false);
  const [editStack, setEditStack] = useState<HabitStack | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [generatingStackId, setGeneratingStackId] = useState<number | null>(null);

  const { data: stacks, isLoading } = useQuery<HabitStack[]>({
    queryKey: ["/api/habit-stacks"],
    enabled: features.hasHabitStacking,
  });

  const deleteStack = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/habit-stacks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habit-stacks"] });
      toast({ title: "Stack deleted" });
    },
  });

  const generatePlan = useMutation({
    mutationFn: async (id: number) => {
      setGeneratingStackId(id);
      const res = await apiRequest("POST", `/api/habit-stacks/${id}/generate-plan`);
      return res.json();
    },
    onSuccess: () => {
      setGeneratingStackId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/habit-stacks"] });
      toast({ title: "AI plan generated", description: "Your stack now has transition tips and advice." });
    },
    onError: () => {
      setGeneratingStackId(null);
      toast({ title: "Failed to generate plan", variant: "destructive" });
    },
  });

  const generateUnifiedPlan = useMutation({
    mutationFn: async (id: number) => {
      setGeneratingStackId(id);
      const res = await apiRequest("POST", `/api/habit-stacks/${id}/generate-unified-plan`);
      return res.json();
    },
    onSuccess: () => {
      setGeneratingStackId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/habit-stacks"] });
      toast({ title: "Unified routine plan created", description: "Your stack now has a combined daily routine." });
    },
    onError: () => {
      setGeneratingStackId(null);
      toast({ title: "Failed to generate unified plan", variant: "destructive" });
    },
  });

  const togglePlanMode = useMutation({
    mutationFn: async ({ id, planMode }: { id: number; planMode: string }) => {
      const res = await apiRequest("PATCH", `/api/habit-stacks/${id}/plan-mode`, { planMode });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habit-stacks"] });
    },
  });

  const activeHabits = habits?.filter(h => !h.archived && h.setupComplete) || [];

  if (!features.hasHabitStacking) {
    return (
      <Card data-testid="card-habit-stacks-locked">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="w-4 h-4 text-primary" />
            Habit Stacks
            <Badge variant="secondary" className="text-[10px]">Premium</Badge>
          </CardTitle>
          <CardDescription>
            Chain habits into powerful routines that flow naturally
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Group your habits into stacks and get AI-generated transition tips between each one. Build unstoppable routines.
          </p>
          <Link href="/account">
            <Button variant="outline" size="sm" data-testid="button-upgrade-stacking">
              <Crown className="w-3.5 h-3.5 mr-1.5" />
              Upgrade to Premium
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-habit-stacks">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setCollapsed(!collapsed)}
            data-testid="button-toggle-stacks"
          >
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="w-4 h-4 text-primary" />
              Habit Stacks
              {stacks && stacks.length > 0 && (
                <span className="bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-full">
                  {stacks.length}
                </span>
              )}
            </CardTitle>
            {collapsed ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateOpen(true)}
            disabled={activeHabits.length < 2}
            data-testid="button-create-stack"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Stack
          </Button>
        </div>
        <CardDescription>
          Chain habits into routines with AI transition tips
        </CardDescription>
      </CardHeader>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: "hidden" }}
          >
            <CardContent className="space-y-3 pt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : !stacks || stacks.length === 0 ? (
                <div className="text-center py-6">
                  <Layers className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground mb-1">No stacks yet</p>
                  <p className="text-xs text-muted-foreground">
                    {activeHabits.length < 2
                      ? "You need at least 2 habits with plans to create a stack"
                      : "Create your first stack to chain habits together"}
                  </p>
                </div>
              ) : (
                stacks.map((stack) => (
                  <StackItem
                    key={stack.id}
                    stack={stack}
                    habits={habits || []}
                    onEdit={() => setEditStack(stack)}
                    onDelete={() => deleteStack.mutate(stack.id)}
                    onGeneratePlan={() => generatePlan.mutate(stack.id)}
                    onGenerateUnifiedPlan={() => generateUnifiedPlan.mutate(stack.id)}
                    onTogglePlanMode={(mode) => togglePlanMode.mutate({ id: stack.id, planMode: mode })}
                    isGenerating={generatingStackId === stack.id}
                  />
                ))
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>

      <CreateStackDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        habits={activeHabits}
      />

      {editStack && (
        <EditStackDialog
          open={!!editStack}
          onOpenChange={(open) => { if (!open) setEditStack(null); }}
          stack={editStack}
          habits={activeHabits}
        />
      )}
    </Card>
  );
}

function StackItem({
  stack,
  habits,
  onEdit,
  onDelete,
  onGeneratePlan,
  onGenerateUnifiedPlan,
  onTogglePlanMode,
  isGenerating,
}: {
  stack: HabitStack;
  habits: Habit[];
  onEdit: () => void;
  onDelete: () => void;
  onGeneratePlan: () => void;
  onGenerateUnifiedPlan: () => void;
  onTogglePlanMode: (mode: string) => void;
  isGenerating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const order = (stack.habitOrder as any[]) || [];
  const plan = stack.stackPlan as any;
  const unifiedPlan = (stack as any).unifiedPlan as any;
  const planMode = (stack as any).planMode || "separate";
  const isUnified = planMode === "unified";
  const colorTheme = getStackColor(stack.color);

  return (
    <div
      className={cn("border rounded-lg p-4 space-y-3", colorTheme.border, colorTheme.bg)}
      data-testid={`stack-item-${stack.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <button
            className="flex items-center gap-2 cursor-pointer min-w-0"
            onClick={() => setExpanded(!expanded)}
            data-testid={`button-expand-stack-${stack.id}`}
          >
            <Layers className={cn("w-4 h-4 shrink-0", colorTheme.text)} />
            <span className="font-semibold text-sm truncate">{stack.name}</span>
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
          </button>

          <div className="flex items-center gap-1.5 flex-wrap mt-1.5 ml-6">
            {order.map((item: any, idx: number) => {
              const habit = habits.find(h => h.id === item.habitId);
              return (
                <span key={item.habitId} className="flex items-center gap-1.5">
                  <Link href={`/habit/${item.habitId}`}>
                    <Badge variant="outline" className="text-[10px] cursor-pointer" data-testid={`link-stack-habit-${item.habitId}`}>
                      {habit?.title || item.habitTitle}
                    </Badge>
                  </Link>
                  {idx < order.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                  )}
                </span>
              );
            })}
            {stack.scheduledTime && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-1">
                <Clock className="w-3 h-3" />
                {stack.scheduledTime}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Link href={`/stack/${stack.id}`}>
            <Button variant="ghost" size="icon" data-testid={`button-view-stack-${stack.id}`}>
              <BarChart3 className="w-4 h-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={onEdit} data-testid={`button-edit-stack-${stack.id}`}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} data-testid={`button-delete-stack-${stack.id}`}>
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-lg">
        <button
          className={cn(
            "flex-1 text-xs py-1.5 px-3 rounded-md cursor-pointer transition-all font-medium",
            !isUnified ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
          )}
          onClick={() => onTogglePlanMode("separate")}
          data-testid={`button-mode-separate-${stack.id}`}
        >
          Individual Plans
        </button>
        <button
          className={cn(
            "flex-1 text-xs py-1.5 px-3 rounded-md cursor-pointer transition-all font-medium flex items-center justify-center gap-1.5",
            isUnified ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
          )}
          onClick={() => onTogglePlanMode("unified")}
          data-testid={`button-mode-unified-${stack.id}`}
        >
          <Crown className="w-3 h-3 text-primary" />
          Guided Routine
        </button>
      </div>

      {isUnified && !unifiedPlan && (
        <Button
          className="w-full gap-2"
          onClick={onGenerateUnifiedPlan}
          disabled={isGenerating}
          data-testid={`button-generate-unified-${stack.id}`}
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {isGenerating ? "Creating Your Guided Routine..." : "Create Guided Routine"}
        </Button>
      )}

      {isUnified && unifiedPlan && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onGenerateUnifiedPlan}
            disabled={isGenerating}
            className="gap-1.5 text-xs"
            data-testid={`button-generate-unified-${stack.id}`}
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Refresh Routine
          </Button>
        </div>
      )}

      {!isUnified && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onGeneratePlan}
            disabled={isGenerating}
            className="gap-1.5 text-xs"
            data-testid={`button-generate-plan-${stack.id}`}
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {plan ? "Refresh AI Tips" : "Generate AI Tips"}
          </Button>
        </div>
      )}

      <AnimatePresence>
        {expanded && !isUnified && plan && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 pt-2 border-t space-y-2">
              {plan.overview && (
                <p className="text-xs text-muted-foreground">{plan.overview}</p>
              )}
              {plan.totalDuration && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  ~{plan.totalDuration} minutes total
                </p>
              )}
              {plan.transitions && plan.transitions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-foreground">Transitions:</p>
                  {plan.transitions.map((t: any, idx: number) => {
                    const fromHabit = habits.find(h => h.id === t.fromHabitId);
                    const toHabit = habits.find(h => h.id === t.toHabitId);
                    return (
                      <div key={idx} className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                        <span className="font-medium text-foreground">{fromHabit?.title}</span>
                        <ArrowRight className="w-3 h-3 inline mx-1" />
                        <span className="font-medium text-foreground">{toHabit?.title}</span>
                        <p className="mt-0.5">{t.note}</p>
                      </div>
                    );
                  })}
                </div>
              )}
              {plan.tips && plan.tips.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">Tips:</p>
                  {plan.tips.map((tip: string, idx: number) => (
                    <p key={idx} className="text-xs text-muted-foreground flex gap-1.5">
                      <Sparkles className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                      {tip}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {expanded && isUnified && unifiedPlan && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 pt-2 border-t space-y-2">
              {unifiedPlan.overview && (
                <p className="text-xs text-muted-foreground">{unifiedPlan.overview}</p>
              )}
              {unifiedPlan.totalDuration && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  ~{unifiedPlan.totalDuration} minutes total
                </p>
              )}
              {unifiedPlan.tasks && unifiedPlan.tasks.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-foreground">Routine Tasks:</p>
                  {unifiedPlan.tasks.map((task: any, idx: number) => (
                    <div key={task.id || idx} className="text-xs bg-muted/50 rounded p-2 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground">{task.title}</span>
                        <Badge variant="outline" className="text-[9px] shrink-0">{task.duration}m</Badge>
                      </div>
                      <p className="text-muted-foreground">{task.description}</p>
                      <p className="text-[10px] text-muted-foreground/70">{task.habitTitle}</p>
                    </div>
                  ))}
                </div>
              )}
              {unifiedPlan.tips && unifiedPlan.tips.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">Tips:</p>
                  {unifiedPlan.tips.map((tip: string, idx: number) => (
                    <p key={idx} className="text-xs text-muted-foreground flex gap-1.5">
                      <Sparkles className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                      {tip}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateStackDialog({
  open,
  onOpenChange,
  habits,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habits: Habit[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [scheduledTime, setScheduledTime] = useState("");

  const createStack = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/habit-stacks", {
        name,
        description: description || undefined,
        habitIds: selectedIds,
        scheduledTime: scheduledTime || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habit-stacks"] });
      toast({ title: "Stack created", description: "Your habit stack is ready. Generate AI tips for smooth transitions." });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to create stack", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setSelectedIds([]);
    setScheduledTime("");
  };

  const toggleHabit = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const moveHabit = (id: number, direction: "up" | "down") => {
    const idx = selectedIds.indexOf(id);
    if (idx === -1) return;
    const newIds = [...selectedIds];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newIds.length) return;
    [newIds[idx], newIds[swapIdx]] = [newIds[swapIdx], newIds[idx]];
    setSelectedIds(newIds);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Create Habit Stack
          </DialogTitle>
          <DialogDescription>
            Chain habits together into a flowing routine
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stack-name">Stack Name</Label>
            <Input
              id="stack-name"
              placeholder="e.g., Morning Routine"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-stack-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stack-desc">Description (optional)</Label>
            <Textarea
              id="stack-desc"
              placeholder="What is this stack for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={2}
              data-testid="input-stack-description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stack-time">Scheduled Time (optional)</Label>
            <Input
              id="stack-time"
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              data-testid="input-stack-time"
            />
          </div>

          <div className="space-y-2">
            <Label>Select Habits (min 2)</Label>
            <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
              {habits.map(habit => (
                <label
                  key={habit.id}
                  className="flex items-center gap-3 p-2.5 cursor-pointer hover-elevate"
                  data-testid={`checkbox-habit-${habit.id}`}
                >
                  <Checkbox
                    checked={selectedIds.includes(habit.id)}
                    onCheckedChange={() => toggleHabit(habit.id)}
                  />
                  <span className="text-sm truncate">{habit.title}</span>
                </label>
              ))}
              {habits.length === 0 && (
                <p className="text-sm text-muted-foreground p-3 text-center">
                  No habits with plans available
                </p>
              )}
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="space-y-2">
              <Label>Order (drag or use arrows)</Label>
              <div className="border rounded-lg divide-y">
                {selectedIds.map((id, idx) => {
                  const habit = habits.find(h => h.id === id);
                  return (
                    <div key={id} className="flex items-center gap-2 p-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-xs font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-sm truncate flex-1">{habit?.title}</span>
                      <div className="flex gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={idx === 0}
                          onClick={() => moveHabit(id, "up")}
                          data-testid={`button-move-up-${id}`}
                        >
                          <ChevronUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={idx === selectedIds.length - 1}
                          onClick={() => moveHabit(id, "down")}
                          data-testid={`button-move-down-${id}`}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {selectedIds.map((id, idx) => {
                  const habit = habits.find(h => h.id === id);
                  return (
                    <span key={id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {habit?.title}
                      {idx < selectedIds.length - 1 && <ArrowRight className="w-3 h-3" />}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => { resetForm(); onOpenChange(false); }}
            data-testid="button-cancel-stack"
          >
            Cancel
          </Button>
          <Button
            onClick={() => createStack.mutate()}
            disabled={!name.trim() || selectedIds.length < 2 || createStack.isPending}
            data-testid="button-save-stack"
          >
            {createStack.isPending ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Layers className="w-4 h-4 mr-1.5" />
            )}
            Create Stack
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditStackDialog({
  open,
  onOpenChange,
  stack,
  habits,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stack: HabitStack;
  habits: Habit[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const order = (stack.habitOrder as any[]) || [];
  const [name, setName] = useState(stack.name);
  const [description, setDescription] = useState(stack.description || "");
  const [selectedIds, setSelectedIds] = useState<number[]>((stack.habitIds as number[]) || []);
  const [scheduledTime, setScheduledTime] = useState(stack.scheduledTime || "");
  const [color, setColor] = useState(stack.color || "primary");

  const updateStack = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/habit-stacks/${stack.id}`, {
        name,
        description: description || undefined,
        habitIds: selectedIds,
        scheduledTime: scheduledTime || undefined,
        color,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habit-stacks"] });
      toast({ title: "Stack updated" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to update stack", description: error.message, variant: "destructive" });
    },
  });

  const toggleHabit = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const moveHabit = (id: number, direction: "up" | "down") => {
    const idx = selectedIds.indexOf(id);
    if (idx === -1) return;
    const newIds = [...selectedIds];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newIds.length) return;
    [newIds[idx], newIds[swapIdx]] = [newIds[swapIdx], newIds[idx]];
    setSelectedIds(newIds);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Edit Stack
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-stack-name">Stack Name</Label>
            <Input
              id="edit-stack-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-edit-stack-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-stack-desc">Description</Label>
            <Textarea
              id="edit-stack-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={2}
              data-testid="input-edit-stack-description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-stack-time">Scheduled Time</Label>
            <Input
              id="edit-stack-time"
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              data-testid="input-edit-stack-time"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              Card Color
            </Label>
            <div className="flex flex-wrap gap-2">
              {STACK_COLORS.map((c) => {
                const isSelected = color === c.id;
                return (
                  <button
                    key={c.id}
                    className={cn(
                      "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border cursor-pointer transition-all",
                      c.border, c.bg,
                      isSelected ? "ring-2 ring-primary ring-offset-1 font-medium" : "opacity-70"
                    )}
                    onClick={() => setColor(c.id)}
                    data-testid={`color-${c.id}`}
                  >
                    <span className={cn("w-3 h-3 rounded-full", c.dot)} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Habits in Stack</Label>
            <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
              {habits.map(habit => (
                <label
                  key={habit.id}
                  className="flex items-center gap-3 p-2.5 cursor-pointer hover-elevate"
                >
                  <Checkbox
                    checked={selectedIds.includes(habit.id)}
                    onCheckedChange={() => toggleHabit(habit.id)}
                  />
                  <span className="text-sm truncate">{habit.title}</span>
                </label>
              ))}
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="space-y-2">
              <Label>Order</Label>
              <div className="border rounded-lg divide-y">
                {selectedIds.map((id, idx) => {
                  const habit = habits.find(h => h.id === id);
                  return (
                    <div key={id} className="flex items-center gap-2 p-2">
                      <span className="text-xs font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-sm truncate flex-1">{habit?.title}</span>
                      <div className="flex gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={idx === 0}
                          onClick={() => moveHabit(id, "up")}
                        >
                          <ChevronUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={idx === selectedIds.length - 1}
                          onClick={() => moveHabit(id, "down")}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => updateStack.mutate()}
            disabled={!name.trim() || selectedIds.length < 2 || updateStack.isPending}
            data-testid="button-update-stack"
          >
            {updateStack.isPending ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
