import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star, Flame, Zap, Award, PartyPopper, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface CelebrationAnimationProps {
  show: boolean;
  type: "achievement" | "level_up" | "streak" | "challenge" | "session_complete";
  title?: string;
  subtitle?: string;
  onComplete?: () => void;
}

const CONFETTI_COLORS = [
  "#0d9488", // teal
  "#10b981", // emerald
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
];

function ConfettiPiece({ delay, x, color }: { delay: number; x: number; color: string }) {
  const size = Math.random() * 8 + 4;
  const rotation = Math.random() * 360;
  const duration = Math.random() * 1 + 2;
  
  return (
    <motion.div
      className="absolute"
      style={{
        left: `${x}%`,
        top: -20,
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? "50%" : "0%",
      }}
      initial={{ y: 0, rotate: 0, opacity: 1 }}
      animate={{
        y: [0, 600],
        rotate: [0, rotation + 360],
        opacity: [1, 1, 0],
        x: [0, (Math.random() - 0.5) * 100],
      }}
      transition={{
        duration,
        delay,
        ease: "easeOut",
      }}
    />
  );
}

function Confetti({ count = 50 }: { count?: number }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <ConfettiPiece
          key={i}
          delay={Math.random() * 0.5}
          x={Math.random() * 100}
          color={CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]}
        />
      ))}
    </div>
  );
}

function StarBurst({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
      transition={{ duration: 0.8, delay }}
    >
      <div className="relative w-32 h-32">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute inset-0 flex items-center justify-center"
            style={{ rotate: `${i * 45}deg` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.6, delay: delay + 0.1 }}
          >
            <Star className="w-4 h-4 text-amber-400 fill-amber-400 absolute -top-8" />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

const CELEBRATION_CONFIGS = {
  achievement: {
    icon: Trophy,
    bgGradient: "from-amber-500/20 via-orange-500/20 to-yellow-500/20",
    iconColor: "text-amber-500",
    confettiCount: 60,
  },
  level_up: {
    icon: Zap,
    bgGradient: "from-purple-500/20 via-violet-500/20 to-indigo-500/20",
    iconColor: "text-purple-500",
    confettiCount: 80,
  },
  streak: {
    icon: Flame,
    bgGradient: "from-orange-500/20 via-red-500/20 to-amber-500/20",
    iconColor: "text-orange-500",
    confettiCount: 50,
  },
  challenge: {
    icon: Award,
    bgGradient: "from-teal-500/20 via-emerald-500/20 to-green-500/20",
    iconColor: "text-teal-500",
    confettiCount: 40,
  },
  session_complete: {
    icon: PartyPopper,
    bgGradient: "from-blue-500/20 via-cyan-500/20 to-teal-500/20",
    iconColor: "text-blue-500",
    confettiCount: 50,
  },
};

export function CelebrationAnimation({ 
  show, 
  type, 
  title = "Congratulations!", 
  subtitle, 
  onComplete 
}: CelebrationAnimationProps) {
  const [visible, setVisible] = useState(false);
  
  const config = CELEBRATION_CONFIGS[type];
  const Icon = config.icon;
  
  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);
  
  return (
    <AnimatePresence>
      {visible && (
        <>
          <Confetti count={config.confettiCount} />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setVisible(false);
              onComplete?.();
            }}
          >
            <motion.div
              className={cn(
                "relative bg-gradient-to-br rounded-3xl p-8 max-w-sm mx-4",
                config.bgGradient,
                "bg-card border shadow-2xl"
              )}
              initial={{ scale: 0.5, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 20, opacity: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 300 }}
            >
              <StarBurst />
              <StarBurst delay={0.3} />
              
              <div className="relative text-center space-y-4">
                <motion.div
                  className={cn(
                    "w-20 h-20 mx-auto rounded-full flex items-center justify-center",
                    "bg-gradient-to-br from-white/20 to-white/5 shadow-lg"
                  )}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", damping: 10 }}
                >
                  <Icon className={cn("w-10 h-10", config.iconColor)} />
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h2 className="text-2xl font-bold text-foreground">{title}</h2>
                  {subtitle && (
                    <p className="text-muted-foreground mt-2">{subtitle}</p>
                  )}
                </motion.div>
                
                <motion.div
                  className="flex justify-center gap-1 pt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.7 + i * 0.1 }}
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    </motion.div>
                  ))}
                </motion.div>
                
                <motion.p
                  className="text-xs text-muted-foreground pt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  Tap anywhere to continue
                </motion.p>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function useCelebration() {
  const [celebration, setCelebration] = useState<{
    show: boolean;
    type: CelebrationAnimationProps["type"];
    title?: string;
    subtitle?: string;
  }>({ show: false, type: "achievement" });
  
  const celebrate = (
    type: CelebrationAnimationProps["type"],
    title?: string,
    subtitle?: string
  ) => {
    setCelebration({ show: true, type, title, subtitle });
  };
  
  const closeCelebration = () => {
    setCelebration(prev => ({ ...prev, show: false }));
  };
  
  return {
    celebration,
    celebrate,
    closeCelebration,
    CelebrationComponent: () => (
      <CelebrationAnimation
        show={celebration.show}
        type={celebration.type}
        title={celebration.title}
        subtitle={celebration.subtitle}
        onComplete={closeCelebration}
      />
    ),
  };
}
