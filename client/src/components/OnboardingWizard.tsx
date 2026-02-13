import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dumbbell,
  BookOpen,
  Brain,
  PenLine,
  Apple,
  Moon,
  GraduationCap,
  Footprints,
  Sparkles,
  ArrowRight,
  Check,
  Loader2,
} from "lucide-react";

const HABIT_SUGGESTIONS = [
  { name: "Exercise", icon: Dumbbell },
  { name: "Reading", icon: BookOpen },
  { name: "Meditation", icon: Brain },
  { name: "Journaling", icon: PenLine },
  { name: "Healthy Eating", icon: Apple },
  { name: "Better Sleep", icon: Moon },
  { name: "Learning", icon: GraduationCap },
  { name: "Walking", icon: Footprints },
];

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [selectedHabit, setSelectedHabit] = useState("");
  const [customHabit, setCustomHabit] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createdHabitId, setCreatedHabitId] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const habitTitle = selectedHabit || customHabit.trim();

  const handleSelectSuggestion = (name: string) => {
    setSelectedHabit(name);
    setCustomHabit("");
  };

  const handleCustomInput = (value: string) => {
    setCustomHabit(value);
    setSelectedHabit("");
  };

  const handleContinue = async () => {
    if (step === 1 && habitTitle) {
      setStep(2);
      setIsCreating(true);
      try {
        const res = await apiRequest("POST", "/api/habits", {
          title: habitTitle,
          goal: `Build a consistent ${habitTitle} routine`,
          description: "Created during onboarding",
        });
        const habit = await res.json();
        setCreatedHabitId(habit.id);
        setIsComplete(true);
      } catch (error) {
        toast({
          title: "Something went wrong",
          description: "Failed to create your habit. Please try again.",
          variant: "destructive",
        });
        setStep(1);
      } finally {
        setIsCreating(false);
      }
    }
  };

  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      await apiRequest("PATCH", "/api/user/onboarding");
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      if (createdHabitId) {
        navigate(`/habit/${createdHabitId}`);
      }
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Failed to complete onboarding.",
        variant: "destructive",
      });
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <Dialog open modal>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex justify-center gap-2 pt-2 pb-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === step
                  ? "bg-primary"
                  : i < step
                    ? "bg-primary/50"
                    : "bg-muted-foreground/20"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center space-y-6 py-6"
            >
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">
                  Welcome to HabitBuilder.pro!
                </h2>
                <p className="text-muted-foreground">
                  Let's set up your first habit in under 2 minutes
                </p>
              </div>
              <Button
                onClick={() => setStep(1)}
                className="gap-2"
                data-testid="button-onboarding-start"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="pick-habit"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              className="space-y-5 py-2"
            >
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-foreground">
                  Pick a habit to start
                </h2>
                <p className="text-sm text-muted-foreground">
                  Choose a suggestion or type your own
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {HABIT_SUGGESTIONS.map(({ name, icon: Icon }) => (
                  <Card
                    key={name}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-colors hover-elevate ${
                      selectedHabit === name
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                    onClick={() => handleSelectSuggestion(name)}
                    data-testid={`card-habit-${name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Icon className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-sm font-medium text-foreground">
                      {name}
                    </span>
                    {selectedHabit === name && (
                      <Check className="w-4 h-4 text-primary ml-auto shrink-0" />
                    )}
                  </Card>
                ))}
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Or type your own:
                </p>
                <Input
                  placeholder="e.g., Drink more water"
                  value={customHabit}
                  onChange={(e) => handleCustomInput(e.target.value)}
                  data-testid="input-custom-habit"
                />
              </div>

              <Button
                onClick={handleContinue}
                disabled={!habitTitle}
                className="w-full gap-2"
                data-testid="button-onboarding-continue"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="creating"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center space-y-6 py-8"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-foreground">
                      Creating your plan...
                    </h2>
                    <p className="text-muted-foreground">
                      Your AI coach is creating your personalized plan...
                    </p>
                  </div>
                </>
              ) : isComplete ? (
                <>
                  <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-foreground">
                      Great choice!
                    </h2>
                    <p className="text-muted-foreground">
                      "{habitTitle}" is ready. Next, your AI coach will ask a few quick questions to build your personalized plan.
                    </p>
                  </div>
                  <Button
                    onClick={handleFinish}
                    disabled={isFinishing}
                    className="gap-2"
                    data-testid="button-onboarding-finish"
                  >
                    {isFinishing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        Start AI Interview
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
