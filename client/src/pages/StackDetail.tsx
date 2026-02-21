import { useState, useEffect, useMemo } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Flame, Loader2, Sparkles, Target, Clock, Play, Check, Layers, BarChart3, ListTodo, Lightbulb, RefreshCw, ArrowRight, Calendar, Trophy, TrendingUp, ChevronRight, BookOpen, ExternalLink, Download, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { HabitStack, Habit } from "@shared/schema";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSubscription } from "@/hooks/use-subscription";
import { UnifiedRoutineSession } from "@/components/UnifiedRoutineSession";

export default function StackDetail() {
  usePageTitle("Stack Details", "View and manage your habit stack. Combine habits for maximum impact with habit stacking.");
  const [, params] = useRoute("/stack/:id");
  const stackId = Number(params?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { features } = useSubscription();
  const [, navigate] = useLocation();
  const [routineSessionOpen, setRoutineSessionOpen] = useState(false);

  const { data: stack, isLoading: stackLoading } = useQuery<HabitStack>({
    queryKey: ["/api/habit-stacks", stackId],
    enabled: !isNaN(stackId) && stackId > 0,
  });

  const { data: allHabits } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
  });

  const stackHabits = useMemo(() => {
    if (!stack || !allHabits) return [];
    const order = (stack.habitOrder || []) as any[];
    return order
      .map((item: any) => allHabits.find(h => h.id === item.habitId))
      .filter(Boolean) as Habit[];
  }, [stack, allHabits]);

  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/habit-stacks/${stackId}/generate-plan`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habit-stacks", stackId] });
      queryClient.invalidateQueries({ queryKey: ["/api/habit-stacks"] });
      toast({ title: "Stack plan updated", description: "AI has refreshed your stack strategy." });
    },
    onError: () => {
      toast({ title: "Could not generate plan", description: "Please try again.", variant: "destructive" });
    },
  });

  const generateUnifiedPlanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/habit-stacks/${stackId}/generate-unified-plan`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habit-stacks", stackId] });
      queryClient.invalidateQueries({ queryKey: ["/api/habit-stacks"] });
      toast({ title: "Unified routine plan created", description: "Your stack now has a combined daily routine." });
    },
    onError: () => {
      toast({ title: "Could not generate unified plan", description: "Please try again.", variant: "destructive" });
    },
  });

  const togglePlanModeMutation = useMutation({
    mutationFn: async (planMode: string) => {
      const res = await apiRequest("PATCH", `/api/habit-stacks/${stackId}/plan-mode`, { planMode });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habit-stacks", stackId] });
      queryClient.invalidateQueries({ queryKey: ["/api/habit-stacks"] });
    },
  });

  const totalTimeInvested = useMemo(() => {
    return stackHabits.reduce((sum, h) => sum + (h.totalTimeSpent || 0), 0);
  }, [stackHabits]);

  const averageStreak = useMemo(() => {
    if (stackHabits.length === 0) return 0;
    return Math.round(stackHabits.reduce((sum, h) => sum + (h.currentStreak || 0), 0) / stackHabits.length);
  }, [stackHabits]);

  const totalSessions = useMemo(() => {
    return stackHabits.reduce((sum, h) => sum + ((h as any).sessionsCompleted || 0), 0);
  }, [stackHabits]);

  const bestStreak = useMemo(() => {
    return Math.max(0, ...stackHabits.map(h => (h as any).bestStreak || h.currentStreak || 0));
  }, [stackHabits]);

  const stackPlan = stack?.stackPlan as any;
  const unifiedPlan = (stack as any)?.unifiedPlan as any;
  const planMode = (stack as any)?.planMode || "separate";
  const isUnified = planMode === "unified";

  const allResources = useMemo(() => {
    if (!unifiedPlan?.tasks) return [];
    const resources: { habitTitle: string; habitId: number; taskTitle: string; resource: any }[] = [];
    for (const task of unifiedPlan.tasks) {
      const taskResources = [...(task.resources || [])];
      if (task.steps) {
        for (const step of task.steps) {
          if ((step as any).resources && Array.isArray((step as any).resources)) {
            taskResources.push(...(step as any).resources);
          }
        }
      }
      for (const r of taskResources) {
        resources.push({
          habitTitle: task.habitTitle || "Habit",
          habitId: task.habitId,
          taskTitle: task.title,
          resource: r,
        });
      }
    }
    return resources;
  }, [unifiedPlan]);

  if (stackLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" data-testid="loading-stack-detail" />
      </div>
    );
  }

  if (!stack) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back-from-stack">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </Link>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Stack not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-2 flex-wrap">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back-from-stack">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Button>
        </Link>
      </div>

      <div className="flex items-start gap-3 flex-wrap">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Layers className="w-6 h-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold truncate" data-testid="text-stack-name">{stack.name}</h1>
          {stack.description && (
            <p className="text-sm text-muted-foreground mt-1">{stack.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="secondary" data-testid="badge-stack-habit-count">
              {stackHabits.length} habits
            </Badge>
            {stack.scheduledTime && (
              <Badge variant="outline">
                <Clock className="w-3 h-3 mr-1" />
                {stack.scheduledTime}
              </Badge>
            )}
            {isUnified && unifiedPlan && (
              <Button
                size="sm"
                className="gap-1.5 rounded-xl shadow-md shadow-primary/20 ml-auto"
                onClick={() => setRoutineSessionOpen(true)}
                data-testid="button-start-unified-routine"
              >
                <Play className="w-3.5 h-3.5" />
                Start Routine
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card data-testid="stat-total-time">
          <CardContent className="p-4 text-center">
            <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalTimeInvested}</p>
            <p className="text-xs text-muted-foreground">Minutes Invested</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-avg-streak">
          <CardContent className="p-4 text-center">
            <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{averageStreak}</p>
            <p className="text-xs text-muted-foreground">Avg Streak</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-total-sessions">
          <CardContent className="p-4 text-center">
            <Target className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalSessions}</p>
            <p className="text-xs text-muted-foreground">Total Sessions</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-best-streak">
          <CardContent className="p-4 text-center">
            <Trophy className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{bestStreak}</p>
            <p className="text-xs text-muted-foreground">Best Streak</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="habits" className="w-full">
        <TabsList className="w-full" data-testid="tabs-stack-detail">
          <TabsTrigger value="habits" className="flex-1 gap-1" data-testid="tab-habits">
            <ListTodo className="w-4 h-4" /> Habits
          </TabsTrigger>
          <TabsTrigger value="plan" className="flex-1 gap-1" data-testid="tab-plan">
            <Sparkles className="w-4 h-4" /> AI Plan
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1 gap-1" data-testid="tab-analytics">
            <BarChart3 className="w-4 h-4" /> Analytics
          </TabsTrigger>
          {isUnified && allResources.length > 0 && (
            <TabsTrigger value="resources" className="flex-1 gap-1" data-testid="tab-resources">
              <BookOpen className="w-4 h-4" /> Resources
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="habits" className="space-y-3 mt-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-lg font-semibold">Habit Sequence</h2>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => {
                if (stackHabits.length > 0) {
                  navigate(`/habit/${stackHabits[0].id}`);
                }
              }}
              disabled={stackHabits.length === 0}
              data-testid="button-start-stack-session"
            >
              <Play className="w-4 h-4" /> Start Stack
            </Button>
          </div>

          <div className="space-y-2">
            {stackHabits.map((habit, index) => {
              const order = (stack.habitOrder || []) as any[];
              const transition = stackPlan?.transitions?.find(
                (t: any) => t.toHabitId === habit.id
              );

              return (
                <div key={habit.id}>
                  {index > 0 && transition?.note && (
                    <div className="flex items-center gap-2 py-1 px-4">
                      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                      <p className="text-xs text-muted-foreground italic">{transition.note}</p>
                    </div>
                  )}
                  <Card
                    className="hover-elevate cursor-pointer"
                    onClick={() => navigate(`/habit/${habit.id}`)}
                    data-testid={`card-stack-habit-${habit.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-primary">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" data-testid={`text-habit-title-${habit.id}`}>{habit.title}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {(habit.currentStreak || 0) > 0 && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Flame className="w-3 h-3 text-orange-500" />
                                {habit.currentStreak} day streak
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {habit.totalTimeSpent || 0}m invested
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Target className="w-3 h-3" />
                              {(habit as any).sessionsCompleted || 0} sessions
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>

          {stackHabits.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No habits in this stack yet. Edit the stack from your dashboard to add habits.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="plan" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-lg font-semibold">AI Stack Strategy</h2>
            <div className="flex items-center gap-2">
              {isUnified ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => generateUnifiedPlanMutation.mutate()}
                  disabled={generateUnifiedPlanMutation.isPending || stackHabits.length < 2}
                  data-testid="button-generate-unified-plan"
                >
                  {generateUnifiedPlanMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {unifiedPlan ? "Refresh Routine" : "Generate Routine"}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => generatePlanMutation.mutate()}
                  disabled={generatePlanMutation.isPending || stackHabits.length < 2}
                  data-testid="button-generate-stack-plan"
                >
                  {generatePlanMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {stackPlan ? "Refresh Tips" : "Generate Tips"}
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className={cn(
                "text-xs px-3 py-1 rounded-full border cursor-pointer transition-colors",
                !isUnified ? "bg-primary/10 border-primary/30 text-primary font-medium" : "border-border text-muted-foreground"
              )}
              onClick={() => togglePlanModeMutation.mutate("separate")}
              data-testid="button-plan-mode-separate"
            >
              Separate Plans
            </button>
            <button
              className={cn(
                "text-xs px-3 py-1 rounded-full border cursor-pointer transition-colors",
                isUnified ? "bg-primary/10 border-primary/30 text-primary font-medium" : "border-border text-muted-foreground"
              )}
              onClick={() => togglePlanModeMutation.mutate("unified")}
              data-testid="button-plan-mode-unified"
            >
              Unified Routine
            </button>
          </div>

          {isUnified ? (
            unifiedPlan ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" /> Routine Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-muted-foreground" data-testid="text-unified-overview">{unifiedPlan.overview}</p>
                    {unifiedPlan.totalDuration && (
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant="secondary">
                          <Clock className="w-3 h-3 mr-1" />
                          ~{unifiedPlan.totalDuration} min total
                        </Badge>
                        <Badge variant="secondary">
                          {unifiedPlan.tasks?.length || 0} tasks
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {unifiedPlan.tasks && unifiedPlan.tasks.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ListTodo className="w-4 h-4 text-primary" /> Routine Tasks
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-2">
                      {unifiedPlan.tasks.map((task: any, i: number) => (
                        <div key={task.id || i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-primary">{i + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="font-medium text-sm" data-testid={`text-unified-task-${i}`}>{task.title}</p>
                              <Badge variant="outline" className="text-[10px] shrink-0">{task.duration}m</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                            <p className="text-[10px] text-primary/70 mt-1">{task.habitTitle}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {unifiedPlan.tips && unifiedPlan.tips.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-yellow-500" /> Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-2">
                      {unifiedPlan.tips.map((tip: string, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-xs text-muted-foreground mt-0.5 shrink-0">{i + 1}.</span>
                          <p className="text-sm">{tip}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center space-y-3">
                  <Layers className="w-10 h-10 text-muted-foreground mx-auto" />
                  <p className="font-medium">Unified Routine Mode</p>
                  <p className="text-sm text-muted-foreground">
                    {stackHabits.length < 2
                      ? "Add at least 2 habits to generate a unified routine."
                      : "Generate a unified routine that combines all your habits into one flowing daily plan."}
                  </p>
                  {stackHabits.length >= 2 && (
                    <Button
                      onClick={() => generateUnifiedPlanMutation.mutate()}
                      disabled={generateUnifiedPlanMutation.isPending}
                      className="gap-1"
                      data-testid="button-generate-unified-empty"
                    >
                      {generateUnifiedPlanMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      Generate Unified Routine
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          ) : (
            stackPlan ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" /> Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-muted-foreground" data-testid="text-stack-overview">{stackPlan.overview}</p>
                    {stackPlan.totalDuration && (
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant="secondary">
                          <Clock className="w-3 h-3 mr-1" />
                          ~{stackPlan.totalDuration} min estimated
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {stackPlan.transitions && stackPlan.transitions.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-primary" /> Transitions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3">
                      {stackPlan.transitions.map((t: any, i: number) => {
                        const fromHabit = allHabits?.find(h => h.id === t.fromHabitId);
                        const toHabit = allHabits?.find(h => h.id === t.toHabitId);
                        return (
                          <div key={i} className="flex items-start gap-3">
                            <div className="shrink-0 mt-1 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                              <ArrowRight className="w-3 h-3 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-muted-foreground">
                                {fromHabit?.title || "Habit"} → {toHabit?.title || "Habit"}
                              </p>
                              <p className="text-sm mt-0.5" data-testid={`text-transition-${i}`}>{t.note}</p>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {stackPlan.tips && stackPlan.tips.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-yellow-500" /> Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-2">
                      {stackPlan.tips.map((tip: string, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-xs text-muted-foreground mt-0.5 shrink-0">{i + 1}.</span>
                          <p className="text-sm" data-testid={`text-tip-${i}`}>{tip}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center space-y-3">
                  <Sparkles className="w-10 h-10 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">
                    {stackHabits.length < 2
                      ? "Add at least 2 habits to your stack to generate an AI plan."
                      : "Generate AI transition tips for your habit stack."}
                  </p>
                  {stackHabits.length >= 2 && (
                    <Button
                      onClick={() => generatePlanMutation.mutate()}
                      disabled={generatePlanMutation.isPending}
                      className="gap-1"
                      data-testid="button-generate-stack-plan-empty"
                    >
                      {generatePlanMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      Generate AI Tips
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 mt-4">
          <h2 className="text-lg font-semibold">Stack Performance</h2>

          {stackHabits.length > 0 ? (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Streak Comparison</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  {stackHabits.map(habit => {
                    const maxStreak = Math.max(1, ...stackHabits.map(h => h.currentStreak || 0));
                    const pct = maxStreak > 0 ? ((habit.currentStreak || 0) / maxStreak) * 100 : 0;
                    return (
                      <div key={habit.id} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm truncate" data-testid={`text-streak-habit-${habit.id}`}>{habit.title}</span>
                          <span className="text-sm font-medium shrink-0 flex items-center gap-1">
                            <Flame className="w-3 h-3 text-orange-500" />
                            {habit.currentStreak || 0}
                          </span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Time Investment</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  {stackHabits.map(habit => {
                    const maxTime = Math.max(1, ...stackHabits.map(h => h.totalTimeSpent || 0));
                    const pct = maxTime > 0 ? ((habit.totalTimeSpent || 0) / maxTime) * 100 : 0;
                    return (
                      <div key={habit.id} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm truncate">{habit.title}</span>
                          <span className="text-sm font-medium shrink-0 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {habit.totalTimeSpent || 0}m
                          </span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Sessions & Completions</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  {stackHabits.map(habit => {
                    const sessions = (habit as any).sessionsCompleted || 0;
                    const maxSessions = Math.max(1, ...stackHabits.map(h => (h as any).sessionsCompleted || 0));
                    const pct = maxSessions > 0 ? (sessions / maxSessions) * 100 : 0;
                    return (
                      <div key={habit.id} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm truncate">{habit.title}</span>
                          <span className="text-sm font-medium shrink-0 flex items-center gap-1">
                            <Check className="w-3 h-3 text-green-500" />
                            {sessions}
                          </span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" /> Stack Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Combined Time</p>
                      <p className="text-lg font-bold">{totalTimeInvested}m</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Combined Sessions</p>
                      <p className="text-lg font-bold">{totalSessions}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Average Streak</p>
                      <p className="text-lg font-bold">{averageStreak} days</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Highest Streak</p>
                      <p className="text-lg font-bold">{bestStreak} days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Add habits to your stack to see analytics.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {isUnified && allResources.length > 0 && (
          <TabsContent value="resources" className="space-y-4 mt-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">Routine Resources</h2>
              <Link href="/resources">
                <Button variant="outline" size="sm" className="gap-1" data-testid="button-view-all-resources">
                  <BookOpen className="w-4 h-4" /> Full Library
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              Educational resources from your routine — articles, books, videos, and more to deepen your practice.
            </p>

            {(() => {
              const grouped: Record<string, typeof allResources> = {};
              for (const r of allResources) {
                if (!grouped[r.habitTitle]) grouped[r.habitTitle] = [];
                grouped[r.habitTitle].push(r);
              }
              return Object.entries(grouped).map(([habitTitle, items]) => (
                <Card key={habitTitle}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      {habitTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2">
                    {items.map((item, i) => {
                      const url = item.resource.url || `https://www.google.com/search?q=${encodeURIComponent(item.resource.searchQuery || item.resource.name)}`;
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-md border hover-elevate">
                          <BookOpen className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium" data-testid={`text-resource-name-${i}`}>{item.resource.name}</p>
                              <Badge variant="secondary" className="text-[10px]">{item.resource.type}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.resource.description}</p>
                            <p className="text-[10px] text-muted-foreground mt-1 italic">From: {item.taskTitle}</p>
                          </div>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0"
                          >
                            <Button variant="ghost" size="icon" data-testid={`button-open-resource-${i}`}>
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </a>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ));
            })()}
          </TabsContent>
        )}
      </Tabs>

      {stack && isUnified && unifiedPlan && (
        <UnifiedRoutineSession
          stack={stack}
          open={routineSessionOpen}
          onOpenChange={setRoutineSessionOpen}
        />
      )}
    </div>
  );
}
