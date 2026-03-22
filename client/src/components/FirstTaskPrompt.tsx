import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { Link } from "wouter";
import { getEmojiForIcon } from "./IconColorPicker";

interface FirstTaskPromptProps {
  habitId: number;
  habitTitle: string;
  habitIcon?: string | null;
  habitColor?: string | null;
  isSimple: boolean;
  userId: number | string;
}

export function FirstTaskPrompt({ habitId, habitTitle, habitIcon, habitColor, isSimple, userId }: FirstTaskPromptProps) {
  const storageKey = `firstTaskPromptDismissed_${userId}`;
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(storageKey) === "true";
  });

  if (dismissed) return null;

  const emoji = getEmojiForIcon(habitIcon);
  const iconBg = habitColor?.startsWith('#') ? `${habitColor}20` : 'hsl(var(--primary) / 0.1)';

  const handleDismiss = () => {
    localStorage.setItem(storageKey, "true");
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-emerald-50/50 to-primary/5 dark:from-primary/15 dark:via-emerald-900/10 dark:to-primary/10 overflow-hidden relative" data-testid="card-first-task-prompt">
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-muted-foreground/60 hover:text-foreground p-1 rounded-md transition-colors z-10"
              data-testid="button-dismiss-first-task"
            >
              <X className="w-4 h-4" />
            </button>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-sm font-semibold text-primary" data-testid="text-plan-ready">Your plan is ready!</p>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: iconBg }}
                >
                  <span className="text-xl leading-none">{emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-foreground truncate" data-testid="text-first-habit-title">{habitTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {isSimple ? "Ready for your first check-in" : "Your first task is waiting"}
                  </p>
                </div>
              </div>
              <Link href={`/habit/${habitId}`}>
                <Button
                  className="w-full gap-2"
                  onClick={handleDismiss}
                  data-testid="button-start-first-task"
                >
                  {isSimple ? "Check in now" : "Start your first task"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
