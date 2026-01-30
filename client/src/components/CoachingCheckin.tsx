import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Loader2, 
  Sparkles, 
  Heart,
  Lightbulb,
  HelpCircle,
  Send,
  Smile,
  Meh,
  Frown
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CoachingCheckinProps {
  habitId: number;
  habitTitle: string;
}

interface CheckinResponse {
  greeting: string;
  progressAcknowledgment: string;
  motivation: string;
  tipForTomorrow: string;
  questionForUser: string;
  encouragingClose: string;
}

const moodOptions = [
  { value: "great", label: "Great", icon: Smile, color: "text-green-500" },
  { value: "okay", label: "Okay", icon: Meh, color: "text-yellow-500" },
  { value: "struggling", label: "Struggling", icon: Frown, color: "text-red-500" },
];

export function CoachingCheckin({ habitId, habitTitle }: CoachingCheckinProps) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [checkinData, setCheckinData] = useState<CheckinResponse | null>(null);

  const checkinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/habits/${habitId}/coaching-checkin`, {
        feedback,
        mood,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setCheckinData(data);
    },
  });

  const handleStartCheckin = () => {
    checkinMutation.mutate();
  };

  const handleClose = () => {
    setOpen(false);
    setFeedback("");
    setMood(null);
    setCheckinData(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="button-coaching-checkin">
          <MessageCircle className="w-4 h-4" />
          Talk to Coach
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="block">Your AI Coach</span>
              <span className="text-sm font-normal text-muted-foreground">{habitTitle}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {checkinMutation.isPending ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <p className="text-muted-foreground">Your coach is preparing feedback...</p>
          </div>
        ) : checkinData ? (
          <div className="space-y-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <p className="font-medium text-primary">{checkinData.greeting}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{checkinData.progressAcknowledgment}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{checkinData.motivation}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Tomorrow's Tip</p>
                    <p className="text-sm mt-1">{checkinData.tipForTomorrow}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm italic">{checkinData.questionForUser}</p>
                </div>
              </CardContent>
            </Card>

            <p className="text-center text-muted-foreground text-sm">
              {checkinData.encouragingClose}
            </p>

            <Button onClick={handleClose} className="w-full" data-testid="button-close-checkin">
              Thanks, Coach!
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-3">How are you feeling about your progress?</p>
              <div className="flex gap-2">
                {moodOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button
                      key={option.value}
                      variant={mood === option.value ? "default" : "outline"}
                      className={cn("flex-1 gap-2", mood !== option.value && option.color)}
                      onClick={() => setMood(option.value)}
                      data-testid={`button-mood-${option.value}`}
                    >
                      <Icon className="w-4 h-4" />
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-3">Anything you want to share with your coach? (optional)</p>
              <Textarea
                placeholder="I've been struggling with... / I'm proud that... / I need help with..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                data-testid="input-feedback"
              />
            </div>

            <Button 
              onClick={handleStartCheckin} 
              className="w-full gap-2"
              disabled={checkinMutation.isPending}
              data-testid="button-get-coaching"
            >
              <Send className="w-4 h-4" />
              Get Personalized Coaching
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
