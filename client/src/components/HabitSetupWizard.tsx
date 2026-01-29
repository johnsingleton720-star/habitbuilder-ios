import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Loader2, ArrowRight, Check, Calendar, Clock, Target, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Habit, HabitQuestion, DailyPlan } from "@shared/schema";

interface HabitSetupWizardProps {
  habit: Habit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

type Phase = "intro" | "questions" | "duration" | "generating" | "complete";

const DURATION_OPTIONS = [
  { value: "daily", label: "Daily", description: "One day at a time", days: 1 },
  { value: "weekly", label: "Weekly", description: "7-day action plan", days: 7 },
  { value: "monthly", label: "Monthly", description: "30-day transformation", days: 30 },
];

export function HabitSetupWizard({ habit, open, onOpenChange, onComplete }: HabitSetupWizardProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<HabitQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("weekly");
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const generateQuestionsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/habits/${habit.id}/generate-questions`);
      return response.json();
    },
    onSuccess: (data) => {
      setQuestions(data.questions);
      setIsLoadingQuestions(false);
      setQuestionError(null);
      setPhase("questions");
    },
    onError: (error: Error) => {
      setIsLoadingQuestions(false);
      setQuestionError("Couldn't generate questions. Please try again.");
    },
  });

  const saveAnswerMutation = useMutation({
    mutationFn: async (updatedQuestions: HabitQuestion[]) => {
      const response = await apiRequest("PATCH", `/api/habits/${habit.id}`, {
        questions: updatedQuestions,
      });
      return response.json();
    },
  });

  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/habits/${habit.id}/generate-plan`, {
        duration: selectedDuration,
        questions: questions,
      });
      return response.json();
    },
    onSuccess: () => {
      setIsGeneratingPlan(false);
      setGenerationError(null);
      setPhase("complete");
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits", habit.id] });
    },
    onError: (error: Error) => {
      setIsGeneratingPlan(false);
      setGenerationError("Something went wrong creating your plan. Please try again.");
      setPhase("duration");
    },
  });

  const handleStartInterview = () => {
    setIsLoadingQuestions(true);
    setQuestionError(null);
    generateQuestionsMutation.mutate();
  };

  const handleSubmitAnswer = () => {
    if (!currentAnswer.trim()) return;

    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestionIndex] = {
      ...updatedQuestions[currentQuestionIndex],
      answer: currentAnswer.trim(),
    };
    setQuestions(updatedQuestions);
    saveAnswerMutation.mutate(updatedQuestions);
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setCurrentAnswer("");
    } else {
      setPhase("duration");
    }
  };

  const handleGeneratePlan = () => {
    setIsGeneratingPlan(true);
    setGenerationError(null);
    setPhase("generating");
    generatePlanMutation.mutate();
  };

  const handleComplete = () => {
    onComplete();
    onOpenChange(false);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = phase === "questions" 
    ? ((currentQuestionIndex + (currentAnswer ? 0.5 : 0)) / questions.length) * 100
    : phase === "duration" ? 80
    : phase === "generating" || phase === "complete" ? 100
    : 0;

  useEffect(() => {
    if (phase === "questions" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase, currentQuestionIndex]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Setting Up: {habit.title}
          </DialogTitle>
        </DialogHeader>

        <Progress value={progress} className="h-1.5 mb-4" />

        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 py-4"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <MessageCircle className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Let's personalize your journey</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    I'll ask you a few questions about "{habit.title}" to create a personalized action plan just for you.
                  </p>
                </div>
              </div>

              <Card className="bg-muted/30">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="w-4 h-4 text-primary" />
                    <span>Understand your goals and current level</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Create a schedule that fits your life</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>Build daily routines tailored to you</span>
                  </div>
                </CardContent>
              </Card>

              {questionError && (
                <Card className="border-destructive/50 bg-destructive/10">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-destructive font-medium">{questionError}</p>
                  </CardContent>
                </Card>
              )}

              <Button 
                onClick={handleStartInterview} 
                className="w-full gap-2"
                disabled={isLoadingQuestions}
                data-testid="button-start-interview"
              >
                {isLoadingQuestions ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Preparing questions...
                  </>
                ) : (
                  <>
                    Let's Begin
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {phase === "questions" && currentQuestion && (
            <motion.div
              key={`question-${currentQuestionIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 py-4"
            >
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </Badge>
              </div>

              <div className="space-y-4">
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <p className="text-base font-medium">{currentQuestion.question}</p>
                  </CardContent>
                </Card>

                <Textarea
                  ref={inputRef}
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="min-h-[100px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.metaKey) {
                      handleSubmitAnswer();
                    }
                  }}
                  data-testid="input-question-answer"
                />

                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Press ⌘+Enter to submit
                  </span>
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={!currentAnswer.trim()}
                    className="gap-2"
                    data-testid="button-submit-answer"
                  >
                    {currentQuestionIndex < questions.length - 1 ? (
                      <>
                        Next
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {phase === "duration" && (
            <motion.div
              key="duration"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 py-4"
            >
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Choose your plan duration</h3>
                <p className="text-sm text-muted-foreground">
                  How long would you like your action plan to be?
                </p>
              </div>

              {generationError && (
                <Card className="border-destructive/50 bg-destructive/10">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-destructive font-medium">{generationError}</p>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                {DURATION_OPTIONS.map((option) => (
                  <Card
                    key={option.value}
                    className={cn(
                      "cursor-pointer transition-all hover-elevate",
                      selectedDuration === option.value 
                        ? "border-primary bg-primary/5" 
                        : ""
                    )}
                    onClick={() => setSelectedDuration(option.value)}
                    data-testid={`duration-${option.value}`}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{option.label}</p>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                      {selectedDuration === option.value && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button 
                onClick={handleGeneratePlan} 
                className="w-full gap-2"
                disabled={generatePlanMutation.isPending}
                data-testid="button-generate-plan"
              >
                <Sparkles className="w-4 h-4" />
                Create My Action Plan
              </Button>
            </motion.div>
          )}

          {phase === "generating" && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 text-center space-y-6"
            >
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Creating your personalized plan</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Analyzing your answers and building daily routines...
                </p>
              </div>
            </motion.div>
          )}

          {phase === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto"
              >
                <Check className="w-10 h-10 text-primary" />
              </motion.div>
              
              <div>
                <h3 className="text-xl font-semibold">Your plan is ready!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  I've created a personalized {selectedDuration} action plan based on your answers. 
                  Start your first session to begin your journey.
                </p>
              </div>

              <Button 
                onClick={handleComplete} 
                className="w-full gap-2"
                data-testid="button-view-plan"
              >
                View My Plan
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
