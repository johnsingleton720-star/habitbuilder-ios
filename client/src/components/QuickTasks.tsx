import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, X, ListChecks, HelpCircle, Clock, Calendar, CalendarDays, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, isToday, isTomorrow, isYesterday, isBefore, startOfDay, differenceInDays } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import type { QuickTask } from "@shared/schema";
import { useCompletionCelebration } from "./CompletionCelebration";

type TabType = "today" | "upcoming" | "completed";

export function QuickTasks() {
  const { toast } = useToast();
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [activeTab, setActiveTab] = useState<TabType>("today");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const { celebrate, CelebrationOverlay } = useCompletionCelebration();
  const lastToggleEvent = useRef<{ clientX?: number; clientY?: number } | undefined>(undefined);

  const upcomingEndStr = format(addDays(new Date(), 14), "yyyy-MM-dd");

  const { data: todayTasks = [] } = useQuery<QuickTask[]>({
    queryKey: ["/api/quick-tasks", todayStr],
    queryFn: async () => {
      const res = await fetch(`/api/quick-tasks?date=${todayStr}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  const { data: upcomingTasks = [] } = useQuery<QuickTask[]>({
    queryKey: ["/api/quick-tasks/range", todayStr, upcomingEndStr],
    queryFn: async () => {
      const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");
      const res = await fetch(`/api/quick-tasks/range?from=${tomorrowStr}&to=${upcomingEndStr}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch upcoming tasks");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ title, scheduledTime, date }: { title: string; scheduledTime?: string; date: string }) => {
      return await apiRequest("POST", "/api/quick-tasks", {
        title,
        date,
        scheduledTime: scheduledTime || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-tasks"] });
      setNewTitle("");
      setNewTime("");
      setNewDate(todayStr);
      setShowDatePicker(false);
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
      queryClient.invalidateQueries({ queryKey: ["/api/quick-tasks"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/quick-tasks"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete task", description: error.message, variant: "destructive" });
    },
  });

  const handleAdd = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    createMutation.mutate({ title: trimmed, scheduledTime: newTime || undefined, date: newDate });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const todayCompleted = todayTasks.filter(t => t.completed).length;
  const todayPending = todayTasks.filter(t => !t.completed);
  const todayDone = todayTasks.filter(t => t.completed);
  const allCompleted = [...todayDone, ...upcomingTasks.filter(t => t.completed)];

  const formatTime12h = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  const getRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00");
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (isYesterday(date)) return "Yesterday";
    const days = differenceInDays(date, startOfDay(new Date()));
    if (days > 0 && days <= 7) return format(date, "EEEE");
    return format(date, "MMM d");
  };

  const groupedUpcoming = upcomingTasks.filter(t => !t.completed).reduce((groups, task) => {
    const key = task.date;
    if (!groups[key]) groups[key] = [];
    groups[key].push(task);
    return groups;
  }, {} as Record<string, QuickTask[]>);

  const tabs: { id: TabType; label: string; count: number; icon: any }[] = [
    { id: "today", label: "Today", count: todayPending.length, icon: Calendar },
    { id: "upcoming", label: "Upcoming", count: Object.values(groupedUpcoming).flat().length, icon: CalendarDays },
    { id: "completed", label: "Done", count: allCompleted.length, icon: CheckCircle2 },
  ];

  const isDateFuture = newDate > todayStr;

  return (
    <Card className="overflow-hidden" data-testid="card-quick-tasks">
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="flex items-center gap-2 text-base flex-wrap">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-accent/10">
            <ListChecks className="w-4 h-4 text-primary" />
          </div>
          Quick Tasks
          {todayTasks.length > 0 && (
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20" data-testid="badge-quick-tasks-count">
              {todayCompleted}/{todayTasks.length} today
            </Badge>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" data-testid="button-quick-tasks-info">
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" className="max-w-[260px] text-sm p-3">
              <p className="text-muted-foreground">Personal to-do items like errands, appointments, or one-off tasks. Schedule them for today or any future date.</p>
            </PopoverContent>
          </Popover>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3 space-y-3">
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg" data-testid="quick-tasks-tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                data-testid={`tab-quick-tasks-${tab.id}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={cn(
                    "text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full",
                    activeTab === tab.id
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab !== "completed" && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={activeTab === "upcoming" ? "Schedule a future task..." : "Add a task..."}
                className="flex-1 min-w-[120px] bg-muted/30 border-muted-foreground/10 focus:bg-background"
                disabled={createMutation.isPending}
                data-testid="input-quick-task"
              />
              <Button
                size="icon"
                variant="default"
                className="shrink-0"
                onClick={handleAdd}
                disabled={!newTitle.trim() || createMutation.isPending}
                data-testid="button-add-quick-task"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[100px]">
                <Input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="pl-7 bg-muted/30 border-muted-foreground/10 text-xs h-8"
                  disabled={createMutation.isPending}
                  data-testid="input-quick-task-time"
                />
                <Clock className="w-3 h-3 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <div className="relative flex-1 min-w-[120px]">
                <Input
                  type="date"
                  value={newDate}
                  min={todayStr}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="pl-7 bg-muted/30 border-muted-foreground/10 text-xs h-8"
                  disabled={createMutation.isPending}
                  data-testid="input-quick-task-date"
                />
                <CalendarDays className="w-3 h-3 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {isDateFuture && (
                <Badge variant="outline" className="text-[10px] h-8 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                  <ArrowRight className="w-3 h-3 mr-1" />
                  {getRelativeDate(newDate)}
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {activeTab === "today" && (
              <>
                {todayPending.length === 0 && todayDone.length === 0 && (
                  <motion.div
                    key="empty-today"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-6"
                  >
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary/60" />
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid="text-no-quick-tasks">
                      No tasks for today yet
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Add quick to-dos to stay organized
                    </p>
                  </motion.div>
                )}
                {todayPending.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={(id, completed) => {
                      toggleMutation.mutate({ id, completed });
                    }}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    lastToggleEvent={lastToggleEvent}
                    formatTime12h={formatTime12h}
                  />
                ))}
                {todayDone.length > 0 && todayPending.length > 0 && (
                  <div className="flex items-center gap-2 pt-2">
                    <div className="h-px flex-1 bg-border/50" />
                    <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Done</span>
                    <div className="h-px flex-1 bg-border/50" />
                  </div>
                )}
                {todayDone.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={(id, completed) => {
                      toggleMutation.mutate({ id, completed });
                    }}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    lastToggleEvent={lastToggleEvent}
                    formatTime12h={formatTime12h}
                  />
                ))}
              </>
            )}

            {activeTab === "upcoming" && (
              <>
                {Object.keys(groupedUpcoming).length === 0 && (
                  <motion.div
                    key="empty-upcoming"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-6"
                  >
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center">
                      <CalendarDays className="w-5 h-5 text-blue-500/60" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No upcoming tasks
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Use the date picker above to plan ahead
                    </p>
                  </motion.div>
                )}
                {Object.entries(groupedUpcoming)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([dateStr, tasks]) => (
                    <motion.div
                      key={dateStr}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex items-center gap-2 pt-2 pb-1">
                        <Badge variant="outline" className="text-[10px] bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/50">
                          <Calendar className="w-2.5 h-2.5 mr-1" />
                          {getRelativeDate(dateStr)}
                        </Badge>
                        <div className="h-px flex-1 bg-border/30" />
                      </div>
                      {tasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onToggle={(id, completed) => {
                            toggleMutation.mutate({ id, completed });
                          }}
                          onDelete={(id) => deleteMutation.mutate(id)}
                          lastToggleEvent={lastToggleEvent}
                          formatTime12h={formatTime12h}
                        />
                      ))}
                    </motion.div>
                  ))}
              </>
            )}

            {activeTab === "completed" && (
              <>
                {allCompleted.length === 0 && (
                  <motion.div
                    key="empty-completed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-6"
                  >
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-emerald-500/10 to-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500/60" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No completed tasks yet
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Check off tasks to see them here
                    </p>
                  </motion.div>
                )}
                {allCompleted.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={(id, completed) => {
                      toggleMutation.mutate({ id, completed });
                    }}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    lastToggleEvent={lastToggleEvent}
                    formatTime12h={formatTime12h}
                    showDate
                  />
                ))}
              </>
            )}
          </AnimatePresence>
        </div>

        {activeTab === "today" && todayTasks.length > 0 && todayCompleted === todayTasks.length && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200/50 dark:border-emerald-800/50"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">All done for today!</p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/60">Great job staying on top of things</p>
            </div>
          </motion.div>
        )}
      </CardContent>
      <CelebrationOverlay />
    </Card>
  );
}

function TaskItem({
  task,
  onToggle,
  onDelete,
  lastToggleEvent,
  formatTime12h,
  showDate,
}: {
  task: QuickTask;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
  lastToggleEvent: React.MutableRefObject<{ clientX?: number; clientY?: number } | undefined>;
  formatTime12h: (time: string) => string;
  showDate?: boolean;
}) {
  return (
    <motion.div
      key={task.id}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-center gap-2.5 group p-2 rounded-lg transition-colors",
        task.completed
          ? "bg-muted/30"
          : "hover:bg-muted/40"
      )}
      data-testid={`quick-task-${task.id}`}
    >
      <Checkbox
        checked={!!task.completed}
        onCheckedChange={(checked) => {
          onToggle(task.id, !!checked);
        }}
        onClick={(e) => {
          lastToggleEvent.current = { clientX: e.clientX, clientY: e.clientY };
        }}
        className={cn(
          task.completed && "data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
        )}
        data-testid={`checkbox-quick-task-${task.id}`}
      />
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            "text-sm transition-all block truncate",
            task.completed && "line-through text-muted-foreground/50"
          )}
          data-testid={`text-quick-task-${task.id}`}
        >
          {task.title}
        </span>
        <div className="flex items-center gap-2 mt-0.5">
          {task.scheduledTime && (
            <span className={cn(
              "text-[10px] flex items-center gap-0.5",
              task.completed ? "text-muted-foreground/40" : "text-muted-foreground"
            )} data-testid={`time-quick-task-${task.id}`}>
              <Clock className="w-2.5 h-2.5" />
              {formatTime12h(task.scheduledTime)}
            </span>
          )}
          {showDate && (
            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
              <Calendar className="w-2.5 h-2.5" />
              {format(new Date(task.date + "T12:00:00"), "MMM d")}
            </span>
          )}
        </div>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onDelete(task.id)}
        data-testid={`button-delete-quick-task-${task.id}`}
      >
        <X className="w-3 h-3" />
      </Button>
    </motion.div>
  );
}
