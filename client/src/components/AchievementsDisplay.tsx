import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AchievementBadge } from "./AchievementBadge";
import { ACHIEVEMENTS } from "@/lib/achievements";
import type { Achievement, UserAchievement } from "@shared/schema";

interface AchievementsDisplayProps {
  compact?: boolean;
}

export function AchievementsDisplay({ compact = false }: AchievementsDisplayProps) {
  const { data: userAchievements } = useQuery<UserAchievement[]>({
    queryKey: ['/api/achievements'],
  });
  
  const unlockedIds = new Set(userAchievements?.map(a => a.achievementId) || []);
  
  const achievementsWithStatus = ACHIEVEMENTS.map(achievement => ({
    ...achievement,
    unlocked: unlockedIds.has(achievement.id),
    unlockedAt: userAchievements?.find(a => a.achievementId === achievement.id)?.unlockedAt?.toString(),
  }));
  
  const unlockedCount = achievementsWithStatus.filter(a => a.unlocked).length;
  
  if (compact) {
    const recentUnlocked = achievementsWithStatus
      .filter(a => a.unlocked)
      .slice(0, 5);
    
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Achievements
            <span className="text-sm font-normal text-muted-foreground ml-auto">
              {unlockedCount}/{ACHIEVEMENTS.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {recentUnlocked.length > 0 ? (
              recentUnlocked.map(achievement => (
                <AchievementBadge
                  key={achievement.id}
                  achievement={achievement}
                  unlocked={true}
                  size="sm"
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Complete habits to earn badges!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const groupedAchievements = {
    streak: achievementsWithStatus.filter(a => a.category === "streak"),
    completion: achievementsWithStatus.filter(a => a.category === "completion"),
    time: achievementsWithStatus.filter(a => a.category === "time"),
    milestone: achievementsWithStatus.filter(a => a.category === "milestone"),
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-500" />
          Achievements
        </h2>
        <span className="text-muted-foreground">
          {unlockedCount}/{ACHIEVEMENTS.length} unlocked
        </span>
      </div>
      
      {Object.entries(groupedAchievements).map(([category, achievements]) => (
        <motion.div
          key={category}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="text-lg font-semibold capitalize mb-3">{category} Achievements</h3>
          <div className="flex gap-4 flex-wrap">
            {achievements.map(achievement => (
              <AchievementBadge
                key={achievement.id}
                achievement={achievement}
                unlocked={achievement.unlocked}
                size="md"
              />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
