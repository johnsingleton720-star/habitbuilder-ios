import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, ListChecks, HelpCircle, Clock, Calendar, CalendarDays, CheckCircle2, ArrowRight, Sparkles, RefreshCw, ChevronDown, ChevronRight, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, isToday, isTomorrow, isYesterday, isBefore, startOfDay, differenceInDays } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import type { QuickTask } from "@shared/schema";
import { useCompletionCelebration } from "./CompletionCelebration";

type TabType = "today" | "upcoming" | "completed";
type Priority = "low" | "normal" | "high" | "urgent";

const PRIORITY_CONFIG: Record<Priority, { label: string; dotColor: string; borderColor: string; bgAccent: string }> = {
  low: { label: "Low", dotColor: "bg-gray-400", borderColor: "border-l-gray-400", bgAccent: "from-gray-100/80 to-gray-50/60 dark:from-gray-800/30 dark:to-gray-900/20" },
  normal: { label: "Normal", dotColor: "bg-blue-500", borderColor: "border-l-blue-500", bgAccent: "from-blue-100/60 to-blue-50/40 dark:from-blue-900/30 dark:to-blue-950/20" },
  high: { label: "High", dotColor: "bg-amber-500", borderColor: "border-l-amber-500", bgAccent: "from-amber-100/70 to-amber-50/50 dark:from-amber-900/30 dark:to-amber-950/20" },
  urgent: { label: "Urgent", dotColor: "bg-red-500", borderColor: "border-l-red-500", bgAccent: "from-red-100/60 to-red-50/40 dark:from-red-900/30 dark:to-red-950/20" },
};

const CATEGORY_COLORS: Record<string, string> = {
  work: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  personal: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
  health: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  errands: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  finance: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  social: "bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400",
  learning: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400",
};

function getCategoryColor(category: string): string {
  const lower = category.toLowerCase();
  return CATEGORY_COLORS[lower] || "bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-400";
}

const RECURRING_LABELS: Record<string, string> = {
  daily: "Daily",
  weekdays: "Weekdays",
  weekly: "Weekly",
};

export function QuickTasks() {
  const { toast } = useToast();
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newPriority, setNewPriority] = useState<Priority>("normal");
  const [newCategory, setNewCategory] = useState("");
  const [newIsRecurring, setNewIsRecurring] = useState(false);
  const [newRecurringPattern, setNewRecurringPattern] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("today");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<number | null>(null);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [expandedParents, setExpandedParents] = useState<Set<number>>(new Set());
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
    mutationFn: async (payload: {
      title: string;
      scheduledTime?: string;
      date: string;
      priority?: string;
      category?: string;
      parentId?: number;
      isRecurring?: boolean;
      recurringPattern?: string;
    }) => {
      return await apiRequest("POST", "/api/quick-tasks", {
        title: payload.title,
        date: payload.date,
        scheduledTime: payload.scheduledTime || null,
        priority: payload.priority || "normal",
        category: payload.category || null,
        parentId: payload.parentId || null,
        isRecurring: payload.isRecurring || false,
        recurringPattern: payload.recurringPattern || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-tasks"] });
      setNewTitle("");
      setNewTime("");
      setNewDate(todayStr);
      setNewPriority("normal");
      setNewCategory("");
      setNewIsRecurring(false);
      setNewRecurringPattern("");
      setShowDatePicker(false);
      setAddingSubtaskFor(null);
      setSubtaskTitle("");
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
      queryClient.invalidateQueries({ queryKey: ["/api/planner"] });
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
    createMutation.mutate({
      title: trimmed,
      scheduledTime: newTime || undefined,
      date: newDate,
      priority: newPriority,
      category: newCategory || undefined,
      isRecurring: newIsRecurring,
      recurringPattern: newIsRecurring ? newRecurringPattern : undefined,
    });
  };

  const handleAddSubtask = (parentId: number, parentDate: string) => {
    const trimmed = subtaskTitle.trim();
    if (!trimmed) return;
    createMutation.mutate({
      title: trimmed,
      date: parentDate,
      parentId,
      priority: "normal",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleSubtaskKeyDown = (e: React.KeyboardEvent, parentId: number, parentDate: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSubtask(parentId, parentDate);
    }
    if (e.key === "Escape") {
      setAddingSubtaskFor(null);
      setSubtaskTitle("");
    }
  };

  const toggleParentExpanded = (id: number) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const todayCompleted = todayTasks.filter(t => t.completed).length;
  const todayPending = todayTasks.filter(t => !t.completed);
  const todayDone = todayTasks.filter(t => t.completed);
  const allCompleted = [...todayDone, ...upcomingTasks.filter(t => t.completed)];

  const organizedTodayPending = useMemo(() => {
    const parents = todayPending.filter(t => !t.parentId);
    const childMap = new Map<number, QuickTask[]>();
    todayPending.filter(t => t.parentId).forEach(t => {
      const arr = childMap.get(t.parentId!) || [];
      arr.push(t);
      childMap.set(t.parentId!, arr);
    });
    return { parents, childMap };
  }, [todayPending]);

  const organizedTodayDone = useMemo(() => {
    const parents = todayDone.filter(t => !t.parentId);
    const childMap = new Map<number, QuickTask[]>();
    todayDone.filter(t => t.parentId).forEach(t => {
      const arr = childMap.get(t.parentId!) || [];
      arr.push(t);
      childMap.set(t.parentId!, arr);
    });
    return { parents, childMap };
  }, [todayDone]);

  const getSubtaskCount = (taskId: number, allTasks: QuickTask[]) => {
    return allTasks.filter(t => t.parentId === taskId).length;
  };

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

  const tabs: { id: TabType; label: string; count: number; icon: any; activeClasses: string; inactiveClasses: string; countClasses: string }[] = [
    { id: "today", label: "Today", count: todayPending.length, icon: Calendar, activeClasses: "bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 shadow-sm", inactiveClasses: "text-teal-600/70 dark:text-teal-400/60 hover:bg-teal-50 dark:hover:bg-teal-900/30", countClasses: "bg-teal-200/70 text-teal-800 dark:bg-teal-800/50 dark:text-teal-200" },
    { id: "upcoming", label: "Upcoming", count: Object.values(groupedUpcoming).flat().length, icon: CalendarDays, activeClasses: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 shadow-sm", inactiveClasses: "text-blue-600/70 dark:text-blue-400/60 hover:bg-blue-50 dark:hover:bg-blue-900/30", countClasses: "bg-blue-200/70 text-blue-800 dark:bg-blue-800/50 dark:text-blue-200" },
    { id: "completed", label: "Done", count: allCompleted.length, icon: CheckCircle2, activeClasses: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 shadow-sm", inactiveClasses: "text-emerald-600/70 dark:text-emerald-400/60 hover:bg-emerald-50 dark:hover:bg-emerald-900/30", countClasses: "bg-emerald-200/70 text-emerald-800 dark:bg-emerald-800/50 dark:text-emerald-200" },
  ];

  const isDateFuture = newDate > todayStr;

  return (
    <Card className="overflow-hidden border-2 border-amber-200/50 dark:border-amber-700/40 shadow-md" data-testid="card-quick-tasks">
      <CardHeader className="pb-2 bg-gradient-to-r from-amber-100/60 via-orange-50/40 to-rose-100/50 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-rose-950/30">
        <CardTitle className="flex items-center gap-2 text-base flex-wrap">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/15">
            <ListChecks className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          Quick Tasks
          {todayTasks.length > 0 && (
            <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" data-testid="badge-quick-tasks-count">
              {todayCompleted}/{todayTasks.length} today
            </Badge>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-auto" data-testid="button-quick-tasks-info">
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
        <div className="flex gap-1.5 p-1.5 bg-muted/40 rounded-xl" data-testid="quick-tasks-tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200",
                  isActive ? tab.activeClasses : tab.inactiveClasses
                )}
                data-testid={`tab-quick-tasks-${tab.id}`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={cn(
                    "text-[10px] min-w-[20px] h-[20px] flex items-center justify-center rounded-full font-bold",
                    isActive ? tab.countClasses : "bg-muted/60 text-muted-foreground"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab !== "completed" && (
          <div className="space-y-2 p-3 rounded-xl bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-rose-50/50 dark:from-amber-950/20 dark:via-orange-950/10 dark:to-rose-950/20 border border-amber-200/30 dark:border-amber-800/20">
            <div className="flex gap-2">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={activeTab === "upcoming" ? "Schedule a future task..." : "Add a task..."}
                className="flex-1 min-w-[120px] bg-background/80 border-muted-foreground/10 focus:bg-background"
                disabled={createMutation.isPending}
                data-testid="input-quick-task"
              />
              <Select value={newPriority} onValueChange={(v) => setNewPriority(v as Priority)}>
                <SelectTrigger className="w-[110px] bg-background/80" data-testid="select-priority">
                  <SelectValue>
                    <span className="flex items-center gap-1.5">
                      <span className={cn("w-2.5 h-2.5 rounded-full", PRIORITY_CONFIG[newPriority].dotColor)} />
                      <span className="text-xs">{PRIORITY_CONFIG[newPriority].label}</span>
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG[Priority]][]).map(([key, config]) => (
                    <SelectItem key={key} value={key} data-testid={`select-priority-${key}`}>
                      <span className="flex items-center gap-1.5">
                        <span className={cn("w-2.5 h-2.5 rounded-full", config.dotColor)} />
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  className="pl-7 bg-background/80 border-muted-foreground/10 text-xs h-8"
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
                  className="pl-7 bg-background/80 border-muted-foreground/10 text-xs h-8"
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
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[100px]">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Category (optional)"
                  className="pl-7 bg-background/80 border-muted-foreground/10 text-xs h-8"
                  disabled={createMutation.isPending}
                  data-testid="input-quick-task-category"
                />
                <Tag className="w-3 h-3 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={newIsRecurring}
                  onCheckedChange={(c) => {
                    setNewIsRecurring(!!c);
                    if (!c) setNewRecurringPattern("");
                  }}
                  data-testid="checkbox-recurring"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">Recurring</span>
              </div>
              {newIsRecurring && (
                <Select value={newRecurringPattern} onValueChange={setNewRecurringPattern}>
                  <SelectTrigger className="w-[110px] bg-background/80 h-8 text-xs" data-testid="select-recurring-pattern">
                    <SelectValue placeholder="Pattern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily" data-testid="select-recurring-daily">Daily</SelectItem>
                    <SelectItem value="weekdays" data-testid="select-recurring-weekdays">Weekdays</SelectItem>
                    <SelectItem value="weekly" data-testid="select-recurring-weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
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
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-amber-500/60" />
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid="text-no-quick-tasks">
                      No tasks for today yet
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Add quick to-dos to stay organized
                    </p>
                  </motion.div>
                )}
                {organizedTodayPending.parents.map((task) => (
                  <TaskItemWithSubtasks
                    key={task.id}
                    task={task}
                    subtasks={organizedTodayPending.childMap.get(task.id) || []}
                    allTasks={todayTasks}
                    onToggle={(id, completed) => toggleMutation.mutate({ id, completed })}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    lastToggleEvent={lastToggleEvent}
                    formatTime12h={formatTime12h}
                    expanded={expandedParents.has(task.id)}
                    onToggleExpand={() => toggleParentExpanded(task.id)}
                    addingSubtask={addingSubtaskFor === task.id}
                    onStartAddSubtask={() => setAddingSubtaskFor(task.id)}
                    subtaskTitle={subtaskTitle}
                    onSubtaskTitleChange={setSubtaskTitle}
                    onAddSubtask={() => handleAddSubtask(task.id, task.date)}
                    onSubtaskKeyDown={(e) => handleSubtaskKeyDown(e, task.id, task.date)}
                    onCancelSubtask={() => { setAddingSubtaskFor(null); setSubtaskTitle(""); }}
                  />
                ))}
                {todayPending.filter(t => t.parentId && !organizedTodayPending.parents.find(p => p.id === t.parentId)).map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={(id, completed) => toggleMutation.mutate({ id, completed })}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    lastToggleEvent={lastToggleEvent}
                    formatTime12h={formatTime12h}
                    isSubtask
                  />
                ))}
                {todayDone.length > 0 && todayPending.length > 0 && (
                  <div className="flex items-center gap-2 pt-2">
                    <div className="h-px flex-1 bg-border/50" />
                    <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Done</span>
                    <div className="h-px flex-1 bg-border/50" />
                  </div>
                )}
                {organizedTodayDone.parents.map((task) => (
                  <TaskItemWithSubtasks
                    key={task.id}
                    task={task}
                    subtasks={organizedTodayDone.childMap.get(task.id) || []}
                    allTasks={todayTasks}
                    onToggle={(id, completed) => toggleMutation.mutate({ id, completed })}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    lastToggleEvent={lastToggleEvent}
                    formatTime12h={formatTime12h}
                    expanded={expandedParents.has(task.id)}
                    onToggleExpand={() => toggleParentExpanded(task.id)}
                    addingSubtask={false}
                    onStartAddSubtask={() => {}}
                    subtaskTitle=""
                    onSubtaskTitleChange={() => {}}
                    onAddSubtask={() => {}}
                    onSubtaskKeyDown={() => {}}
                    onCancelSubtask={() => {}}
                  />
                ))}
                {todayDone.filter(t => t.parentId && !organizedTodayDone.parents.find(p => p.id === t.parentId)).map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={(id, completed) => toggleMutation.mutate({ id, completed })}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    lastToggleEvent={lastToggleEvent}
                    formatTime12h={formatTime12h}
                    isSubtask
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
                      {tasks.filter(t => !t.parentId).map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onToggle={(id, completed) => toggleMutation.mutate({ id, completed })}
                          onDelete={(id) => deleteMutation.mutate(id)}
                          lastToggleEvent={lastToggleEvent}
                          formatTime12h={formatTime12h}
                          allTasks={tasks}
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
                    onToggle={(id, completed) => toggleMutation.mutate({ id, completed })}
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

function TaskItemWithSubtasks({
  task,
  subtasks,
  allTasks,
  onToggle,
  onDelete,
  lastToggleEvent,
  formatTime12h,
  expanded,
  onToggleExpand,
  addingSubtask,
  onStartAddSubtask,
  subtaskTitle,
  onSubtaskTitleChange,
  onAddSubtask,
  onSubtaskKeyDown,
  onCancelSubtask,
}: {
  task: QuickTask;
  subtasks: QuickTask[];
  allTasks: QuickTask[];
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
  lastToggleEvent: React.MutableRefObject<{ clientX?: number; clientY?: number } | undefined>;
  formatTime12h: (time: string) => string;
  expanded: boolean;
  onToggleExpand: () => void;
  addingSubtask: boolean;
  onStartAddSubtask: () => void;
  subtaskTitle: string;
  onSubtaskTitleChange: (v: string) => void;
  onAddSubtask: () => void;
  onSubtaskKeyDown: (e: React.KeyboardEvent) => void;
  onCancelSubtask: () => void;
}) {
  const subtaskCount = allTasks.filter(t => t.parentId === task.id).length;
  const hasSubtasks = subtaskCount > 0;

  return (
    <div>
      <TaskItem
        task={task}
        onToggle={onToggle}
        onDelete={onDelete}
        lastToggleEvent={lastToggleEvent}
        formatTime12h={formatTime12h}
        allTasks={allTasks}
        subtaskCount={subtaskCount}
        hasSubtasks={hasSubtasks}
        expanded={expanded}
        onToggleExpand={onToggleExpand}
        onStartAddSubtask={onStartAddSubtask}
      />
      {(expanded || !hasSubtasks) && subtasks.map((st) => (
        <TaskItem
          key={st.id}
          task={st}
          onToggle={onToggle}
          onDelete={onDelete}
          lastToggleEvent={lastToggleEvent}
          formatTime12h={formatTime12h}
          isSubtask
        />
      ))}
      {addingSubtask && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="ml-6 pl-3 border-l-2 border-muted-foreground/10"
        >
          <div className="flex gap-2 py-1.5">
            <Input
              value={subtaskTitle}
              onChange={(e) => onSubtaskTitleChange(e.target.value)}
              onKeyDown={onSubtaskKeyDown}
              placeholder="Add subtask..."
              className="flex-1 text-xs h-8 bg-muted/30"
              autoFocus
              data-testid={`input-subtask-${task.id}`}
            />
            <Button size="icon" variant="ghost" onClick={onAddSubtask} disabled={!subtaskTitle.trim()} data-testid={`button-add-subtask-${task.id}`}>
              <Plus className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onCancelSubtask} data-testid={`button-cancel-subtask-${task.id}`}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function TaskItem({
  task,
  onToggle,
  onDelete,
  lastToggleEvent,
  formatTime12h,
  showDate,
  isSubtask,
  allTasks,
  subtaskCount,
  hasSubtasks,
  expanded,
  onToggleExpand,
  onStartAddSubtask,
}: {
  task: QuickTask;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
  lastToggleEvent: React.MutableRefObject<{ clientX?: number; clientY?: number } | undefined>;
  formatTime12h: (time: string) => string;
  showDate?: boolean;
  isSubtask?: boolean;
  allTasks?: QuickTask[];
  subtaskCount?: number;
  hasSubtasks?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onStartAddSubtask?: () => void;
}) {
  const priority = (task.priority || "normal") as Priority;
  const config = PRIORITY_CONFIG[priority];

  return (
    <motion.div
      key={task.id}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-center gap-2.5 group p-2.5 rounded-xl transition-all border",
        isSubtask && "ml-6 pl-3 border-l-2 border-muted-foreground/10",
        task.completed
          ? "bg-muted/30 border-muted/50"
          : cn("bg-gradient-to-r", config.bgAccent, "border-border/40 hover:shadow-sm")
      )}
      data-testid={`quick-task-${task.id}`}
    >
      {!isSubtask && (
        <div className={cn("w-1 self-stretch rounded-full shrink-0", config.dotColor)} />
      )}

      {hasSubtasks && onToggleExpand && (
        <button onClick={onToggleExpand} className="shrink-0 text-muted-foreground" data-testid={`button-expand-${task.id}`}>
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      )}

      <Checkbox
        checked={!!task.completed}
        onCheckedChange={(checked) => {
          onToggle(task.id, !!checked);
        }}
        onClick={(e) => {
          lastToggleEvent.current = { clientX: e.clientX, clientY: e.clientY };
        }}
        className={cn(
          "transition-all",
          task.completed
            ? "data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
            : priority === "urgent"
              ? "border-red-400 data-[state=unchecked]:hover:border-red-500"
              : priority === "high"
                ? "border-amber-400 data-[state=unchecked]:hover:border-amber-500"
                : priority === "low"
                  ? "border-gray-400 data-[state=unchecked]:hover:border-gray-500"
                  : "border-blue-400 data-[state=unchecked]:hover:border-blue-500"
        )}
        data-testid={`checkbox-quick-task-${task.id}`}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn("w-2 h-2 rounded-full shrink-0", config.dotColor)} data-testid={`priority-dot-${task.id}`} />
          <span
            className={cn(
              "text-sm transition-all block truncate",
              task.completed && "line-through text-muted-foreground/50"
            )}
            data-testid={`text-quick-task-${task.id}`}
          >
            {task.title}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {task.scheduledTime && (
            <span className={cn(
              "text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded-md",
              task.completed
                ? "text-muted-foreground/40"
                : "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30"
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
          {task.category && (
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", getCategoryColor(task.category))} data-testid={`category-${task.id}`}>
              {task.category}
            </span>
          )}
          {task.isRecurring && task.recurringPattern && (
            <span className="text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400" data-testid={`recurring-badge-${task.id}`}>
              <RefreshCw className="w-2.5 h-2.5" />
              {RECURRING_LABELS[task.recurringPattern] || task.recurringPattern}
            </span>
          )}
          {typeof subtaskCount === "number" && subtaskCount > 0 && (
            <span className="text-[10px] text-muted-foreground/60" data-testid={`subtask-count-${task.id}`}>
              {subtaskCount} subtask{subtaskCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {!task.completed && !isSubtask && onStartAddSubtask && (
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ visibility: "visible" }}
          onClick={onStartAddSubtask}
          data-testid={`button-start-subtask-${task.id}`}
        >
          <Plus className="w-3 h-3" />
        </Button>
      )}

      <Button
        size="icon"
        variant="ghost"
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ visibility: "visible" }}
        onClick={() => onDelete(task.id)}
        data-testid={`button-delete-quick-task-${task.id}`}
      >
        <X className="w-3 h-3" />
      </Button>
    </motion.div>
  );
}
