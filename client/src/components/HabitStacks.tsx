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
import { Layers, Plus, ArrowRight, Sparkles, GripVertical, Trash2, Crown, Loader2, ChevronDown, ChevronUp, Clock, BarChart3 } from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Link } from "wouter";
import type { HabitStack, Habit } from "@shared/schema";

export function HabitStacks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: habits } = useHabits();
  const { features } = useSubscription();
  const [createOpen, setCreateOpen] = useState(false);
  const [editStack, setEditStack] = useState<HabitStack | null>(null);
  const [collapsed, setCollapsed] = useState(false);

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
      const res = await apiRequest("POST", `/api/habit-stacks/${id}/generate-plan`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habit-stacks"] });
      toast({ title: "AI plan generated", description: "Your stack now has transition tips and advice." });
    },
    onError: () => {
      toast({ title: "Failed to generate plan", variant: "destructive" });
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
                    isGenerating={generatePlan.isPending}
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
  isGenerating,
}: {
  stack: HabitStack;
  habits: Habit[];
  onEdit: () => void;
  onDelete: () => void;
  onGeneratePlan: () => void;
  isGenerating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const order = (stack.habitOrder as any[]) || [];
  const plan = stack.stackPlan as any;

  return (
    <div
      className="border rounded-lg p-3 space-y-2"
      data-testid={`stack-item-${stack.id}`}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          className="flex items-center gap-2 cursor-pointer min-w-0"
          onClick={() => setExpanded(!expanded)}
          data-testid={`button-expand-stack-${stack.id}`}
        >
          <Layers className="w-4 h-4 text-primary shrink-0" />
          <span className="font-medium text-sm truncate">{stack.name}</span>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {order.length} habits
          </Badge>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          )}
        </button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onGeneratePlan}
            disabled={isGenerating}
            data-testid={`button-generate-plan-${stack.id}`}
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 mr-1" />
            )}
            {plan ? "Refresh AI Tips" : "AI Tips"}
          </Button>
          <Link href={`/stack/${stack.id}`}>
            <Button variant="ghost" size="sm" data-testid={`button-view-stack-${stack.id}`}>
              <BarChart3 className="w-3.5 h-3.5 mr-1" />
              Details
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={onEdit} data-testid={`button-edit-stack-${stack.id}`}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            data-testid={`button-delete-stack-${stack.id}`}
          >
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {order.map((item: any, idx: number) => {
          const habit = habits.find(h => h.id === item.habitId);
          return (
            <span key={item.habitId} className="flex items-center gap-1.5">
              <Link href={`/habit/${item.habitId}`}>
                <span className="text-xs text-foreground hover:underline cursor-pointer" data-testid={`link-stack-habit-${item.habitId}`}>
                  {habit?.title || item.habitTitle}
                </span>
              </Link>
              {idx < order.length - 1 && (
                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
              )}
            </span>
          );
        })}
        {stack.scheduledTime && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
            <Clock className="w-3 h-3" />
            {stack.scheduledTime}
          </span>
        )}
      </div>

      <AnimatePresence>
        {expanded && plan && (
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

  const updateStack = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/habit-stacks/${stack.id}`, {
        name,
        description: description || undefined,
        habitIds: selectedIds,
        scheduledTime: scheduledTime || undefined,
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
