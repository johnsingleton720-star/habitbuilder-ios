import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Bug, Lightbulb, HelpCircle, Send, Check, Loader2 } from "lucide-react";

interface FeedbackFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FEEDBACK_TYPES = [
  { value: "feedback", label: "General Feedback", icon: MessageSquare, color: "text-blue-500" },
  { value: "bug", label: "Report a Bug", icon: Bug, color: "text-red-500" },
  { value: "feature", label: "Feature Request", icon: Lightbulb, color: "text-amber-500" },
  { value: "support", label: "Need Help", icon: HelpCircle, color: "text-purple-500" },
];

export function FeedbackForm({ open, onOpenChange }: FeedbackFormProps) {
  const [type, setType] = useState("feedback");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/feedback", { type, subject, message });
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback"] });
      setTimeout(() => {
        onOpenChange(false);
        setSubmitted(false);
        setType("feedback");
        setSubject("");
        setMessage("");
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate();
  };

  const selectedType = FEEDBACK_TYPES.find(t => t.value === type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="py-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4"
              >
                <Check className="w-10 h-10 text-primary" />
              </motion.div>
              <h3 className="text-xl font-display font-bold text-foreground">Thank you!</h3>
              <p className="text-muted-foreground mt-2">Your feedback has been received.</p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  Share Your Feedback
                </DialogTitle>
                <DialogDescription>
                  We'd love to hear from you! Your feedback helps us improve.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>What type of feedback?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {FEEDBACK_TYPES.map((feedbackType) => {
                      const Icon = feedbackType.icon;
                      const isSelected = type === feedbackType.value;
                      return (
                        <button
                          key={feedbackType.value}
                          type="button"
                          onClick={() => setType(feedbackType.value)}
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/30 hover:bg-muted/50"
                          }`}
                          data-testid={`feedback-type-${feedbackType.value}`}
                        >
                          <Icon className={`w-4 h-4 ${feedbackType.color}`} />
                          <span className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                            {feedbackType.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Brief summary of your feedback"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    data-testid="input-feedback-subject"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us more details..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="resize-none"
                    data-testid="input-feedback-message"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitMutation.isPending}
                    className="flex-1 gap-2"
                    data-testid="button-submit-feedback"
                  >
                    {submitMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Submit
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
