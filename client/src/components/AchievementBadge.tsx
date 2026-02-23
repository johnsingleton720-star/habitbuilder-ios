import { motion } from "framer-motion";
import { Flame, Target, Clock, Trophy, Crown, Sparkles, ClipboardCheck, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Achievement } from "@shared/schema";

const iconMap: Record<string, typeof Flame> = {
  Flame,
  Target,
  Clock,
  Trophy,
  Crown,
  Sparkles,
  ClipboardCheck,
};

interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked: boolean;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

export function AchievementBadge({ 
  achievement, 
  unlocked, 
  size = "md",
  showTooltip = true 
}: AchievementBadgeProps) {
  const Icon = iconMap[achievement.icon] || Sparkles;
  
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };
  
  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };
  
  const categoryColors = {
    streak: unlocked 
      ? "bg-gradient-to-br from-orange-500/25 to-red-500/20 text-orange-500 border-orange-500/30 shadow-lg shadow-orange-500/30 ring-1 ring-white/20 dark:ring-white/10" 
      : "bg-muted/40 text-muted-foreground/40 border-border/50 opacity-40",
    completion: unlocked 
      ? "bg-gradient-to-br from-emerald-500/25 to-green-500/20 text-emerald-500 border-emerald-500/30 shadow-lg shadow-emerald-500/30 ring-1 ring-white/20 dark:ring-white/10" 
      : "bg-muted/40 text-muted-foreground/40 border-border/50 opacity-40",
    time: unlocked 
      ? "bg-gradient-to-br from-blue-500/25 to-cyan-500/20 text-blue-500 border-blue-500/30 shadow-lg shadow-blue-500/30 ring-1 ring-white/20 dark:ring-white/10" 
      : "bg-muted/40 text-muted-foreground/40 border-border/50 opacity-40",
    milestone: unlocked 
      ? "bg-gradient-to-br from-violet-500/25 to-purple-500/20 text-violet-500 border-violet-500/30 shadow-lg shadow-violet-500/30 ring-1 ring-white/20 dark:ring-white/10" 
      : "bg-muted/40 text-muted-foreground/40 border-border/50 opacity-40",
  };
  
  const badge = (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: unlocked ? 1.1 : 1 }}
      className={`${sizeClasses[size]} rounded-full border-2 flex items-center justify-center ${categoryColors[achievement.category]}`}
    >
      {unlocked ? (
        <Icon className={iconSizes[size]} />
      ) : (
        <Lock className={`${iconSizes[size]} opacity-50`} />
      )}
    </motion.div>
  );
  
  if (!showTooltip) return badge;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-center">
          <p className="font-medium">{achievement.name}</p>
          <p className="text-xs text-muted-foreground">{achievement.description}</p>
          {unlocked && achievement.unlockedAt && (
            <p className="text-xs text-primary mt-1">
              Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
