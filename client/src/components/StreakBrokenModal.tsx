import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Flame, HeartCrack, RefreshCw, Sparkles } from "lucide-react";

interface StreakBrokenModalProps {
  habitTitle: string;
  previousStreak: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartFresh: () => void;
}

export function StreakBrokenModal({ 
  habitTitle, 
  previousStreak, 
  open, 
  onOpenChange,
  onStartFresh 
}: StreakBrokenModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-center">
            <HeartCrack className="w-5 h-5 text-destructive" />
            Streak Lost
          </DialogTitle>
        </DialogHeader>

        <div className="py-6 text-center space-y-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative mx-auto w-24 h-24"
          >
            <div className="absolute inset-0 rounded-full bg-destructive/10 animate-pulse" />
            <div className="relative w-24 h-24 rounded-full bg-destructive/20 flex items-center justify-center">
              <Flame className="w-12 h-12 text-muted-foreground" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-destructive">0</span>
              </div>
            </div>
          </motion.div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{habitTitle}</h3>
            <p className="text-muted-foreground">
              Your streak has been reset to <span className="font-bold text-destructive">0 days</span>.
            </p>
            {previousStreak > 0 && (
              <p className="text-sm text-muted-foreground">
                You had a {previousStreak} day streak going. Don't worry - every expert was once a beginner!
              </p>
            )}
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Get Back on Track
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li>• Missing a day happens to everyone</li>
              <li>• Focus on progress, not perfection</li>
              <li>• Start small - even 1 minute counts</li>
              <li>• Your experience and skills remain</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => {
                onStartFresh();
                onOpenChange(false);
              }}
              className="w-full gap-2"
              data-testid="button-start-fresh"
            >
              <RefreshCw className="w-4 h-4" />
              Start Fresh Today
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="w-full"
              data-testid="button-dismiss-streak"
            >
              I'll come back later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
