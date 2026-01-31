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
    streak: unlocked ? "bg-orange-500/20 text-orange-500 border-orange-500/30" : "bg-muted text-muted-foreground border-border",
    completion: unlocked ? "bg-green-500/20 text-green-500 border-green-500/30" : "bg-muted text-muted-foreground border-border",
    time: unlocked ? "bg-blue-500/20 text-blue-500 border-blue-500/30" : "bg-muted text-muted-foreground border-border",
    milestone: unlocked ? "bg-purple-500/20 text-purple-500 border-purple-500/30" : "bg-muted text-muted-foreground border-border",
  };
  
  const badge = (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: unlocked ? 1.1 : 1 }}
      className={`${sizeClasses[size]} rounded-full border-2 flex items-center justify-center ${categoryColors[achievement.category]} ${unlocked ? 'shadow-lg' : 'opacity-50'}`}
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
