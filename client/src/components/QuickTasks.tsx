import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, X, ListChecks, HelpCircle, Clock, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, subDays, isToday, isTomorrow, isYesterday, parseISO } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import type { QuickTask } from "@shared/schema";
import { useCompletionCelebration } from "./CompletionCelebration";

export function QuickTasks() {
  const { toast } = useToast();
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { celebrate, CelebrationOverlay } = useCompletionCelebration();
  const lastToggleEvent = useRef<{ clientX?: number; clientY?: number } | undefined>(undefined);

  const { data: tasks = [] } = useQuery<QuickTask[]>({
    queryKey: ["/api/quick-tasks", dateStr],
    queryFn: async () => {
      const res = await fetch(`/api/quick-tasks?date=${dateStr}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ title, scheduledTime }: { title: string; scheduledTime?: string }) => {
      return await apiRequest("POST", "/api/quick-tasks", {
        title,
        date: dateStr,
        scheduledTime: scheduledTime || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-tasks", dateStr] });
      setNewTitle("");
      setNewTime("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add task", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      return await apiRequest("PATCH", `/api/quick-tasks/${id}`, { completed });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-tasks", dateStr] });
      if (variables.completed) {
        celebrate(lastToggleEvent.current);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update task", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/quick-tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-tasks", dateStr] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete task", description: error.message, variant: "destructive" });
    },
  });

  const handleAdd = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    createMutation.mutate({ title: trimmed, scheduledTime: newTime || undefined });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const completedCount = tasks.filter(t => t.completed).length;

  const getDateLabel = () => {
    if (isToday(selectedDate)) return "Today";
    if (isTomorrow(selectedDate)) return "Tomorrow";
    if (isYesterday(selectedDate)) return "Yesterday";
    return format(selectedDate, "EEE, MMM d");
  };

  const formatTime12h = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  return (
    <Card data-testid="card-quick-tasks">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base flex-wrap">
          <ListChecks className="w-4 h-4 text-primary" />
          Quick Tasks
          {tasks.length > 0 && (
            <Badge variant="secondary" className="text-xs" data-testid="badge-quick-tasks-count">
              {completedCount}/{tasks.length}
            </Badge>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" data-testid="button-quick-tasks-info">
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" className="max-w-[260px] text-sm p-3">
              <p className="text-muted-foreground">Personal to-do items like errands, appointments, or one-off tasks — grocery store, bank, doctor visits, etc. These are separate from your habits.</p>
            </PopoverContent>
          </Popover>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-center gap-2" data-testid="quick-tasks-date-nav">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            data-testid="button-quick-tasks-prev-day"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1.5 min-w-[120px] justify-center">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-medium" data-testid="text-quick-tasks-date">
              {getDateLabel()}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            data-testid="button-quick-tasks-next-day"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          {!isToday(selectedDate) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
              data-testid="button-quick-tasks-today"
            >
              Today
            </Button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a task..."
            className="flex-1 min-w-[140px]"
            disabled={createMutation.isPending}
            data-testid="input-quick-task"
          />
          <div className="relative">
            <Input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-[120px] pl-7"
              disabled={createMutation.isPending}
              data-testid="input-quick-task-time"
            />
            <Clock className="w-3.5 h-3.5 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleAdd}
            disabled={!newTitle.trim() || createMutation.isPending}
            data-testid="button-add-quick-task"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2 group"
                data-testid={`quick-task-${task.id}`}
              >
                <Checkbox
                  checked={!!task.completed}
                  onCheckedChange={(checked) => {
                    toggleMutation.mutate({ id: task.id, completed: !!checked });
                  }}
                  onClick={(e) => {
                    lastToggleEvent.current = { clientX: e.clientX, clientY: e.clientY };
                  }}
                  data-testid={`checkbox-quick-task-${task.id}`}
                />
                <span
                  className={cn(
                    "flex-1 text-sm transition-all",
                    task.completed && "line-through text-muted-foreground/60"
                  )}
                  data-testid={`text-quick-task-${task.id}`}
                >
                  {task.title}
                </span>
                {task.scheduledTime && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`time-quick-task-${task.id}`}>
                    <Clock className="w-3 h-3" />
                    {formatTime12h(task.scheduledTime)}
                  </span>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 invisible group-hover:visible"
                  onClick={() => deleteMutation.mutate(task.id)}
                  data-testid={`button-delete-quick-task-${task.id}`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2" data-testid="text-no-quick-tasks">
            No tasks for {getDateLabel().toLowerCase()}
          </p>
        )}
      </CardContent>
      <CelebrationOverlay />
    </Card>
  );
}
