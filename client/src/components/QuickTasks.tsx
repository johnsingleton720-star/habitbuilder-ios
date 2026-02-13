import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import type { QuickTask } from "@shared/schema";

export function QuickTasks() {
  const { toast } = useToast();
  const [newTitle, setNewTitle] = useState("");
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: tasks = [] } = useQuery<QuickTask[]>({
    queryKey: ["/api/quick-tasks"],
  });

  const createMutation = useMutation({
    mutationFn: async (title: string) => {
      return await apiRequest("POST", "/api/quick-tasks", { title, date: today });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-tasks"] });
      setNewTitle("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add task", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      return await apiRequest("PATCH", `/api/quick-tasks/${id}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-tasks"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/quick-tasks"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete task", description: error.message, variant: "destructive" });
    },
  });

  const handleAdd = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <Card data-testid="card-quick-tasks">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="w-4 h-4 text-primary" />
          Quick Tasks
          {tasks.length > 0 && (
            <Badge variant="secondary" className="text-xs" data-testid="badge-quick-tasks-count">
              {completedCount}/{tasks.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a task..."
            className="flex-1"
            disabled={createMutation.isPending}
            data-testid="input-quick-task"
          />
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
                  onCheckedChange={(checked) =>
                    toggleMutation.mutate({ id: task.id, completed: !!checked })
                  }
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
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
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
            No tasks for today
          </p>
        )}
      </CardContent>
    </Card>
  );
}
