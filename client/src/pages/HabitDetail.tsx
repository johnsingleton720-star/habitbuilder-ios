import { useRoute, Link } from "wouter";
import { useHabit, useUpdateHabit, useGenerateHabitPlan } from "@/hooks/use-habits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Flame, Loader2, Sparkles, Target, Lightbulb, Brain, Clock, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, subDays, eachDayOfInterval } from "date-fns";
import type { HabitStep, HabitTip } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";

const tipIcons = {
  motivation: Heart,
  technique: Lightbulb,
  science: Brain,
  reminder: Clock,
};

const tipColors = {
  motivation: "text-pink-500 bg-pink-50 dark:bg-pink-950/30",
  technique: "text-amber-500 bg-amber-50 dark:bg-amber-950/30",
  science: "text-blue-500 bg-blue-50 dark:bg-blue-950/30",
  reminder: "text-purple-500 bg-purple-50 dark:bg-purple-950/30",
};

export default function HabitDetail() {
  const [, params] = useRoute("/habit/:id");
  const habitId = Number(params?.id);
  
  const { data: habit, isLoading } = useHabit(habitId);
  const updateHabit = useUpdateHabit();
  const generatePlan = useGenerateHabitPlan();

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

  const steps = (habit.steps || []) as HabitStep[];
  const tips = (habit.aiTips || []) as HabitTip[];
  const completedSteps = steps.filter(s => s.completed).length;
  const stepProgress = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  const last7Days = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date(),
  });

  const completedDates = habit.completedDates || [];
  const weeklyCompletions = last7Days.filter(day => 
    completedDates.includes(format(day, "yyyy-MM-dd"))
  ).length;
  const weeklyProgress = (weeklyCompletions / 7) * 100;

  const handleToggleStep = (stepId: string) => {
    const updatedSteps = steps.map(step => 
      step.id === stepId ? { ...step, completed: !step.completed } : step
    );
    updateHabit.mutate({ id: habit.id, steps: updatedSteps }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [api.habits.get.path, habit.id] });
      }
    });
  };

  const handleGeneratePlan = () => {
    generatePlan.mutate(
      { 
        habitTitle: habit.title, 
        habitDescription: habit.description || undefined,
        goal: habit.goal || undefined,
      },
      {
        onSuccess: (data) => {
          updateHabit.mutate(
            { id: habit.id, steps: data.steps, aiTips: data.tips },
            {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: [api.habits.get.path, habit.id] });
              }
            }
          );
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 md:p-8 font-body">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground" data-testid="text-habit-title">
              {habit.title}
            </h1>
            {habit.description && (
              <p className="text-muted-foreground mt-1" data-testid="text-habit-description">{habit.description}</p>
            )}
          </div>
          <Badge variant="outline" className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-500 fill-current" />
            <span>{completedDates.length} day streak</span>
          </Badge>
        </header>

        {habit.goal && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-3 py-4">
              <Target className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Your Goal</p>
                <p className="font-semibold text-foreground" data-testid="text-habit-goal">{habit.goal}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between gap-2">
                Weekly Progress
                <span className="text-2xl font-bold text-primary">{weeklyCompletions}/7</span>
              </CardTitle>
              <CardDescription>Days completed this week</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={weeklyProgress} className="h-3" />
              <div className="flex justify-between gap-1">
                {last7Days.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const isCompleted = completedDates.includes(dateStr);
                  const isToday = format(new Date(), "yyyy-MM-dd") === dateStr;
                  return (
                    <div key={dateStr} className="flex flex-col items-center gap-1">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                          isCompleted
                            ? "bg-primary text-primary-foreground"
                            : isToday
                            ? "bg-muted border-2 border-primary/50"
                            : "bg-muted text-muted-foreground"
                        }`}
                        data-testid={`day-${dateStr}`}
                      >
                        {format(day, "d")}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {format(day, "EEE")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between gap-2">
                Action Steps
                <span className="text-sm font-normal text-muted-foreground">
                  {completedSteps}/{steps.length} completed
                </span>
              </CardTitle>
              <CardDescription>Your roadmap to success</CardDescription>
            </CardHeader>
            <CardContent>
              {steps.length > 0 ? (
                <div className="space-y-3">
                  <Progress value={stepProgress} className="h-2 mb-4" />
                  <AnimatePresence mode="popLayout">
                    {steps.map((step, index) => (
                      <motion.div
                        key={step.id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <Checkbox
                          checked={step.completed}
                          onCheckedChange={() => handleToggleStep(step.id)}
                          className="mt-0.5"
                          data-testid={`checkbox-step-${step.id}`}
                        />
                        <span
                          className={`text-sm flex-1 ${step.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
                          data-testid={`text-step-${step.id}`}
                        >
                          {step.text}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">
                    No action plan yet. Generate one with AI!
                  </p>
                  <Button
                    onClick={handleGeneratePlan}
                    disabled={generatePlan.isPending}
                    data-testid="button-generate-plan"
                  >
                    {generatePlan.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Action Plan
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {tips.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                Tips & Guidance
              </CardTitle>
              <CardDescription>Personalized advice for your habit journey</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {tips.map((tip, index) => {
                  const Icon = tipIcons[tip.category] || Lightbulb;
                  const colorClass = tipColors[tip.category] || tipColors.technique;
                  return (
                    <motion.div
                      key={tip.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-start gap-3 p-4 rounded-xl ${colorClass}`}
                      data-testid={`tip-${tip.id}`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <Badge variant="outline" className="text-xs mb-2 capitalize">
                          {tip.category}
                        </Badge>
                        <p className="text-sm text-foreground">{tip.text}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {steps.length > 0 && tips.length === 0 && (
          <div className="text-center py-4">
            <Button
              variant="outline"
              onClick={handleGeneratePlan}
              disabled={generatePlan.isPending}
              data-testid="button-regenerate-plan"
            >
              {generatePlan.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Regenerate Plan with Tips
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
