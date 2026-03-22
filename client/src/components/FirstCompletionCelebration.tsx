import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Sparkles, Flame, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const CONFETTI_COLORS = [
  "rgb(5, 150, 105)",
  "rgb(16, 185, 129)",
  "rgb(52, 211, 153)",
  "rgb(250, 204, 21)",
  "rgb(251, 146, 60)",
  "rgb(59, 130, 246)",
  "rgb(168, 85, 247)",
];

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  delay: number;
  size: number;
}

function generateConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 20,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotation: Math.random() * 360,
    delay: Math.random() * 0.6,
    size: 6 + Math.random() * 8,
  }));
}

const STORAGE_KEY_PREFIX = "firstCompletionCelebrated";

export function useFirstCompletionCelebration(userId?: number | string) {
  const [show, setShow] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  const storageKey = `${STORAGE_KEY_PREFIX}_${userId || "default"}`;

  const triggerIfFirst = useCallback((earnedXp: number = 0) => {
    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(storageKey, "true");
    setXpEarned(earnedXp);
    setShow(true);
  }, [storageKey]);

  const dismiss = useCallback(() => {
    setShow(false);
  }, []);

  const hasBeenCelebrated = useCallback(() => {
    return !!localStorage.getItem(storageKey);
  }, [storageKey]);

  return { show, xpEarned, triggerIfFirst, dismiss, hasBeenCelebrated };
}

interface FirstCompletionCelebrationProps {
  show: boolean;
  xpEarned: number;
  onDismiss: () => void;
}

export function FirstCompletionCelebration({ show, xpEarned, onDismiss }: FirstCompletionCelebrationProps) {
  const [confetti] = useState(() => generateConfetti(40));

  useEffect(() => {
    if (show) {
      const timer = setTimeout(onDismiss, 8000);
      return () => clearTimeout(timer);
    }
  }, [show, onDismiss]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          onClick={onDismiss}
          data-testid="overlay-first-completion"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {confetti.map((piece) => (
              <motion.div
                key={piece.id}
                initial={{
                  x: `${piece.x}vw`,
                  y: "-5vh",
                  rotate: 0,
                  opacity: 1,
                }}
                animate={{
                  y: "110vh",
                  rotate: piece.rotation + 360,
                  opacity: [1, 1, 0.8, 0],
                }}
                transition={{
                  duration: 2.5 + Math.random(),
                  delay: piece.delay,
                  ease: "easeIn",
                }}
                style={{
                  position: "absolute",
                  width: piece.size,
                  height: piece.size,
                  backgroundColor: piece.color,
                  borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                }}
              />
            ))}
          </div>

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.5, type: "spring", damping: 15 }}
            className="relative z-10 mx-4 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card rounded-2xl p-6 shadow-2xl border border-primary/20 text-center">
              <button
                onClick={onDismiss}
                className="absolute top-3 right-3 text-muted-foreground/60 hover:text-foreground p-1 rounded-md"
                data-testid="button-dismiss-celebration"
              >
                <X className="w-4 h-4" />
              </button>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", damping: 10 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-emerald-400 mx-auto mb-4 flex items-center justify-center shadow-lg"
              >
                <Trophy className="w-10 h-10 text-white" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h2 className="text-xl font-bold text-foreground mb-1" data-testid="text-first-completion-title">
                  First Task Complete!
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  You just took your first step. This is how habits are built — one small action at a time.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex justify-center gap-4 mb-5"
              >
                {xpEarned > 0 && (
                  <div className="flex items-center gap-1.5 bg-primary/10 rounded-full px-3 py-1.5">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-primary" data-testid="text-xp-earned">+{xpEarned} XP</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-orange-500/10 rounded-full px-3 py-1.5">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-bold text-orange-500">1 day streak</span>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-500/10 rounded-full px-3 py-1.5">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold text-amber-500">Level 1</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
              >
                <Button onClick={onDismiss} className="w-full gap-2" data-testid="button-keep-going">
                  Keep going
                  <Star className="w-4 h-4" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
