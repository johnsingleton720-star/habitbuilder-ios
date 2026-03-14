import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useHabits } from "@/hooks/use-habits";
import { motion } from "framer-motion";
import { Star, Send, Loader2, MessageSquare, ThumbsUp } from "lucide-react";

const LIKELIHOOD_OPTIONS = [
  { value: 1, label: "Unlikely" },
  { value: 2, label: "Maybe" },
  { value: 3, label: "Likely" },
  { value: 4, label: "Very likely" },
  { value: 5, label: "Definitely!" },
];

export function NewUserFeedback() {
  const { user } = useAuth();
  const { data: habits } = useHabits();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [experienceRating, setExperienceRating] = useState(0);
  const [likelihood, setLikelihood] = useState(0);
  const [additionalFeedback, setAdditionalFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!user || !habits) return;

    if (localStorage.getItem("presignup_habit_id")) return;

    const feedbackKey = `newUserFeedbackShown_${user.id}`;
    if (localStorage.getItem(feedbackKey)) return;

    const hasCompletedSetup = habits.some(h => h.setupComplete);
    if (!hasCompletedSetup) return;

    localStorage.setItem(feedbackKey, "true");

    const timer = setTimeout(() => {
      setOpen(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [user, habits]);

  const handleSubmit = async () => {
    if (experienceRating === 0) return;
    setIsSubmitting(true);
    try {
      const message = [
        `Experience rating: ${experienceRating}/5`,
        likelihood > 0 ? `Likelihood to use: ${likelihood}/5 (${LIKELIHOOD_OPTIONS[likelihood - 1]?.label})` : "",
        additionalFeedback ? `Additional feedback: ${additionalFeedback}` : "",
      ].filter(Boolean).join("\n");

      await apiRequest("POST", "/api/feedback", {
        type: "feedback",
        subject: "New User Onboarding Feedback",
        message,
      });
      setSubmitted(true);
    } catch {
      toast({
        title: "Couldn't send feedback",
        description: "No worries — you can always share feedback later from Account settings.",
        variant: "destructive",
      });
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSubmitted(false);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-new-user-feedback">
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center py-6 space-y-4"
          >
            <div className="h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center">
              <ThumbsUp className="w-7 h-7 text-green-500" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">Thanks for your feedback!</h2>
              <p className="text-sm text-muted-foreground">
                It really helps us improve. Enjoy building your habits!
              </p>
            </div>
            <Button onClick={handleClose} data-testid="button-feedback-done">
              Let's go!
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-5 py-2">
            <div className="text-center space-y-1">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">How was your experience?</h2>
              <p className="text-sm text-muted-foreground">
                You just set up your first habit — we'd love to hear how it went!
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">How was the setup process?</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setExperienceRating(star)}
                    className="transition-transform hover:scale-110"
                    data-testid={`btn-experience-star-${star}`}
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= experienceRating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">How likely are you to keep using this app?</p>
              <div className="flex flex-wrap justify-center gap-2">
                {LIKELIHOOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setLikelihood(option.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      likelihood === option.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
                    }`}
                    data-testid={`btn-likelihood-${option.value}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Anything else you'd like to share? <span className="text-muted-foreground font-normal">(optional)</span></p>
              <Textarea
                placeholder="What could we improve? What did you like?"
                value={additionalFeedback}
                onChange={(e) => setAdditionalFeedback(e.target.value)}
                rows={2}
                data-testid="textarea-feedback"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={handleClose}
                className="flex-1"
                data-testid="button-feedback-skip"
              >
                Not now
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={experienceRating === 0 || isSubmitting}
                className="flex-1 gap-2"
                data-testid="button-feedback-submit"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send Feedback
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
