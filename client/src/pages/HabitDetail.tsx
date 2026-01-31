import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Flame, Loader2, Sparkles, Target, Calendar, Clock, Play, CheckCircle2, Pencil, Save, X, ChevronRight, Timer, MessageSquare, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isFuture, isPast, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { Habit, DailyPlan, RoutineTask } from "@shared/schema";
import { HabitSetupWizard } from "@/components/HabitSetupWizard";
import { GuidedSession } from "@/components/GuidedSession";
import { TaskGuidanceModal } from "@/components/TaskGuidanceModal";
import { CoachingCheckin } from "@/components/CoachingCheckin";
import { DailyMotivation } from "@/components/DailyMotivation";
import { StreakProtection } from "@/components/StreakProtection";

export default function HabitDetail() {
  const [, params] = useRoute("/habit/:id");
  const habitId = Number(params?.id);
  const queryClient = useQueryClient();
  
  const [setupWizardOpen, setSetupWizardOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [guidanceTask, setGuidanceTask] = useState<RoutineTask | null>(null);
  
  const { data: habit, isLoading } = useQuery<Habit>({
    queryKey: ["/api/habits", habitId],
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed, notes, timeSpent }: { taskId: string; completed?: boolean; notes?: string; timeSpent?: number }) => {
      const res = await apiRequest("PATCH", `/api/habits/${habitId}/tasks/${taskId}`, { completed, notes, timeSpent });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits", habitId] });
    },
  });

  // Find today's plan or the next upcoming plan
  useEffect(() => {
    if (habit?.dailyPlans?.length && !selectedDay) {
      const today = format(new Date(), "yyyy-MM-dd");
      const todayPlan = habit.dailyPlans.find(p => p.date === today);
      if (todayPlan) {
        setSelectedDay(today);
      } else {
        const futurePlan = habit.dailyPlans.find(p => isFuture(parseISO(p.date)));
        if (futurePlan) {
          setSelectedDay(futurePlan.date);
        } else {
          setSelectedDay(habit.dailyPlans[0]?.date);
        }
      }
    }
  }, [habit?.dailyPlans, selectedDay]);

  // Auto-open setup wizard for new habits
  useEffect(() => {
    if (habit && !habit.setupComplete && !setupWizardOpen) {
      setSetupWizardOpen(true);
    }
  }, [habit?.setupComplete]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" data-testid="loader-habit" />
      </div>
    );
  }

  if (!habit) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Habit not found</h1>
        <Link href="/">
          <Button data-testid="button-back-home">Go Back Home</Button>
        </Link>
      </div>
    );
  }

  const dailyPlans = (habit.dailyPlans || []) as DailyPlan[];
  const currentPlan = dailyPlans.find(p => p.date === selectedDay);
  const completedDays = dailyPlans.filter(p => p.completed).length;
  const totalDays = dailyPlans.length;
  const overallProgress = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;

  const handleToggleTask = (taskId: string, currentCompleted: boolean) => {
    updateTaskMutation.mutate({ 
      taskId, 
      completed: !currentCompleted,
      timeSpent: !currentCompleted ? 5 : 0, // Add 5 min when completing
    });
  };

  const handleSaveNote = (taskId: string) => {
    updateTaskMutation.mutate({ taskId, notes: noteText });
    setEditingTask(null);
    setNoteText("");
  };

  const handleStartSession = () => {
    setSessionOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold truncate" data-testid="text-habit-title">
                {habit.title}
              </h1>
              {habit.description && (
                <p className="text-sm text-muted-foreground truncate">{habit.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <Badge variant="secondary" className="gap-1">
              <Flame className="w-3 h-3" />
              {habit.currentStreak || 0} day streak
            </Badge>
            {habit.setupComplete && (
              <CoachingCheckin habitId={habitId} habitTitle={habit.title} />
            )}
            {habit.setupComplete && currentPlan && (
              <Button onClick={handleStartSession} className="gap-2" data-testid="button-start-session">
                <Play className="w-4 h-4" />
                Start Session
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Setup Not Complete Message */}
        {!habit.setupComplete && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6 text-center">
              <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Let's personalize your journey</h3>
              <p className="text-muted-foreground mb-4">
                Answer a few questions to create your personalized action plan.
              </p>
              <Button onClick={() => setSetupWizardOpen(true)} className="gap-2" data-testid="button-setup-habit">
                <Sparkles className="w-4 h-4" />
                Start Setup
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Daily Motivation from AI Coach */}
        {habit.setupComplete && (
          <DailyMotivation habitId={habitId} />
        )}

        {/* Streak Protection for Premium Users */}
        {habit.setupComplete && (habit.currentStreak || 0) > 0 && (
          <StreakProtection 
            habit={{
              id: habit.id,
              title: habit.title,
              currentStreak: habit.currentStreak || 0,
              streakFreezeUsed: habit.streakFreezeUsed,
              streakFreezeMonth: habit.streakFreezeMonth,
            }}
          />
        )}

        {/* Progress Overview */}
        {habit.setupComplete && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{completedDays}/{totalDays}</p>
                    <p className="text-sm text-muted-foreground">Days completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Timer className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{habit.totalTimeSpent || 0} min</p>
                    <p className="text-sm text-muted-foreground">Total time spent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Flame className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{habit.longestStreak || 0} days</p>
                    <p className="text-sm text-muted-foreground">Longest streak</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Daily Plans */}
        {habit.setupComplete && dailyPlans.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Your {habit.planDuration} Plan
              </CardTitle>
              <CardDescription>
                {habit.planStartDate} to {habit.planEndDate}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Day Selector */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {dailyPlans.map((plan, index) => {
                  const planDate = parseISO(plan.date);
                  const isSelected = plan.date === selectedDay;
                  const isPastDay = isPast(planDate) && !isToday(planDate);
                  
                  return (
                    <button
                      key={plan.date}
                      onClick={() => setSelectedDay(plan.date)}
                      className={cn(
                        "flex-shrink-0 px-4 py-2 rounded-lg border transition-all",
                        isSelected 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : "bg-card border-border hover:border-primary/50",
                        plan.completed && !isSelected && "bg-primary/10 border-primary/30"
                      )}
                      data-testid={`day-selector-${index + 1}`}
                    >
                      <div className="text-center">
                        <p className="text-xs opacity-70">Day {index + 1}</p>
                        <p className="font-medium">{format(planDate, "MMM d")}</p>
                        {plan.completed && (
                          <CheckCircle2 className="w-3 h-3 mx-auto mt-1" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Current Day Tasks */}
              {currentPlan && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="font-medium">
                        {isToday(parseISO(currentPlan.date)) ? "Today's Tasks" : `Tasks for ${format(parseISO(currentPlan.date), "MMMM d")}`}
                      </h4>
                      {currentPlan.focus && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          Focus: {currentPlan.focus}
                        </p>
                      )}
                    </div>
                    <Badge variant={currentPlan.completed ? "default" : "secondary"}>
                      {currentPlan.tasks.filter(t => t.completed).length}/{currentPlan.tasks.length} complete
                    </Badge>
                  </div>

                  <AnimatePresence mode="popLayout">
                    {currentPlan.tasks.map((task, index) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className={cn(
                          "transition-all",
                          task.completed && "bg-primary/5 border-primary/30"
                        )}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={task.completed}
                                onCheckedChange={() => handleToggleTask(task.id, task.completed)}
                                className="mt-1"
                                data-testid={`checkbox-task-${task.id}`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className={cn(
                                      "font-medium",
                                      task.completed && "line-through text-muted-foreground"
                                    )}>
                                      {task.title}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {task.description}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="flex-shrink-0">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {task.duration} min
                                  </Badge>
                                </div>

                                {/* Guidance Button */}
                                <div className="mt-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => setGuidanceTask(task)}
                                    data-testid={`button-guidance-${task.id}`}
                                  >
                                    <Lightbulb className="w-3 h-3" />
                                    Get Examples & Resources
                                  </Button>
                                </div>

                                {/* Notes */}
                                {editingTask === task.id ? (
                                  <div className="mt-3 space-y-2">
                                    <Textarea
                                      value={noteText}
                                      onChange={(e) => setNoteText(e.target.value)}
                                      placeholder="Add your notes, reflections, or progress..."
                                      className="min-h-[80px]"
                                      data-testid={`input-task-notes-${task.id}`}
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => handleSaveNote(task.id)}
                                        disabled={updateTaskMutation.isPending}
                                        data-testid={`button-save-notes-${task.id}`}
                                      >
                                        <Save className="w-3 h-3 mr-1" />
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingTask(null);
                                          setNoteText("");
                                        }}
                                      >
                                        <X className="w-3 h-3 mr-1" />
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-2">
                                    {task.notes ? (
                                      <div 
                                        className="text-sm bg-muted/50 p-2 rounded cursor-pointer hover:bg-muted"
                                        onClick={() => {
                                          setEditingTask(task.id);
                                          setNoteText(task.notes || "");
                                        }}
                                      >
                                        <MessageSquare className="w-3 h-3 inline mr-1 text-muted-foreground" />
                                        {task.notes}
                                      </div>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground"
                                        onClick={() => {
                                          setEditingTask(task.id);
                                          setNoteText("");
                                        }}
                                        data-testid={`button-add-notes-${task.id}`}
                                      >
                                        <Pencil className="w-3 h-3 mr-1" />
                                        Add notes
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* AI Context Summary */}
        {habit.aiContext && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="w-4 h-4" />
                Your Personalized Approach
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{habit.aiContext}</p>
            </CardContent>
          </Card>
        )}

        {/* Progress History */}
        {habit.progress && habit.progress.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Progress History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {habit.progress.slice(-5).reverse().map((entry, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium">{format(parseISO(entry.date), "MMMM d, yyyy")}</p>
                      {entry.notes && (
                        <p className="text-sm text-muted-foreground">{entry.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{entry.tasksCompleted}/{entry.totalTasks} tasks</p>
                      <p className="text-sm text-muted-foreground">{entry.timeSpent} min</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Setup Wizard */}
      {habit && (
        <HabitSetupWizard
          habit={habit}
          open={setupWizardOpen}
          onOpenChange={setSetupWizardOpen}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/habits", habitId] });
          }}
        />
      )}

      {/* Guided Session */}
      {habit && currentPlan && (
        <GuidedSession
          habit={habit}
          open={sessionOpen}
          onOpenChange={setSessionOpen}
        />
      )}

      {/* Task Guidance Modal */}
      {habit && guidanceTask && (
        <TaskGuidanceModal
          habitId={habit.id}
          task={guidanceTask}
          habitTitle={habit.title}
          open={!!guidanceTask}
          onOpenChange={(open) => !open && setGuidanceTask(null)}
        />
      )}
    </div>
  );
}
