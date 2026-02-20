import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AchievementBadge } from "./AchievementBadge";
import { ACHIEVEMENTS } from "@/lib/achievements";
import type { Achievement, UserAchievement } from "@shared/schema";
import { useSubscription } from "@/hooks/use-subscription";

const ACHIEVEMENT_CONTEXT: Record<string, string> = {
  streak_3: "Most people quit before day 3. You just proved you're different.",
  streak_7: "A full week! Research shows it takes 7 days to form the neural pathways for a new habit.",
  streak_14: "Two weeks strong! You're now in the top 20% of habit builders.",
  streak_30: "30 days! Science says you've crossed the threshold into automatic behavior. This habit is becoming part of who you are.",
  streak_100: "100 days! Only 2% of people achieve this. You've mastered the art of consistency.",
  sessions_5: "Your first 5 sessions are done. You're building real momentum.",
  sessions_25: "25 sessions completed! You're developing deep expertise in your habits.",
  sessions_100: "100 sessions! You've invested serious time in becoming your best self.",
  time_60: "One full hour invested in growth. Every minute counts.",
  time_300: "5 hours of deliberate practice. That's where mastery begins.",
  time_1200: "20 hours invested! Malcolm Gladwell would be impressed.",
  habits_3: "Three habits growing at once. You're building a well-rounded routine.",
  habits_5: "Five habits! You're creating a comprehensive personal development system.",
  first_plan: "Your first personalized plan is ready. AI-tailored just for you.",
};

const CATEGORY_LABELS: Record<string, string> = {
  streak: "Consistency",
  completion: "Sessions",
  time: "Time Invested",
  milestone: "Milestones",
};

interface AchievementsDisplayProps {
  compact?: boolean;
}

export function AchievementsDisplay({ compact = false }: AchievementsDisplayProps) {
  const { data: userAchievements } = useQuery<UserAchievement[]>({
    queryKey: ['/api/achievements'],
  });
  const { isPremium, isFreeUser } = useSubscription();
  const [selectedAchievement, setSelectedAchievement] = useState<(Achievement & { unlocked: boolean; unlockedAt?: string }) | null>(null);
  
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
      <>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Achievements
              {isFreeUser && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800" data-testid="badge-achievements-pro">
                  <Crown className="w-2.5 h-2.5 mr-0.5" />
                  Pro
                </Badge>
              )}
              <span className="text-sm font-normal text-muted-foreground ml-auto">
                {unlockedCount}/{ACHIEVEMENTS.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {recentUnlocked.length > 0 ? (
                recentUnlocked.map(achievement => (
                  <button
                    key={achievement.id}
                    onClick={() => setSelectedAchievement(achievement)}
                    className="focus:outline-none"
                    data-testid={`achievement-badge-${achievement.id}`}
                  >
                    <AchievementBadge
                      achievement={achievement}
                      unlocked={true}
                      size="sm"
                      showTooltip={false}
                    />
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Complete habits to earn badges!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <AchievementDetailDialog
          achievement={selectedAchievement}
          isPremium={isPremium}
          onClose={() => setSelectedAchievement(null)}
        />
      </>
    );
  }
  
  const groupedAchievements = {
    streak: achievementsWithStatus.filter(a => a.category === "streak"),
    completion: achievementsWithStatus.filter(a => a.category === "completion"),
    time: achievementsWithStatus.filter(a => a.category === "time"),
    milestone: achievementsWithStatus.filter(a => a.category === "milestone"),
  };
  
  return (
    <>
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
            <h3 className="text-lg font-semibold mb-3">{CATEGORY_LABELS[category] || category} Achievements</h3>
            <div className="flex gap-4 flex-wrap">
              {achievements.map(achievement => (
                <button
                  key={achievement.id}
                  onClick={() => setSelectedAchievement(achievement)}
                  className="focus:outline-none"
                  data-testid={`achievement-badge-${achievement.id}`}
                >
                  <AchievementBadge
                    achievement={achievement}
                    unlocked={achievement.unlocked}
                    size="md"
                    showTooltip={false}
                  />
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
      <AchievementDetailDialog
        achievement={selectedAchievement}
        isPremium={isPremium}
        onClose={() => setSelectedAchievement(null)}
      />
    </>
  );
}

function AchievementDetailDialog({
  achievement,
  isPremium,
  onClose,
}: {
  achievement: (Achievement & { unlocked: boolean; unlockedAt?: string }) | null;
  isPremium: boolean;
  onClose: () => void;
}) {
  if (!achievement) return null;

  const context = ACHIEVEMENT_CONTEXT[achievement.id];

  return (
    <Dialog open={!!achievement} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm" data-testid="dialog-achievement-detail">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AchievementBadge
              achievement={achievement}
              unlocked={achievement.unlocked}
              size="sm"
              showTooltip={false}
            />
            {achievement.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <p className="text-sm text-muted-foreground">{achievement.description}</p>
          
          {achievement.unlocked && (
            <>
              {isPremium && context && (
                <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                  <p className="text-sm italic">{context}</p>
                </div>
              )}
              {achievement.unlockedAt && (
                <p className="text-xs text-muted-foreground">
                  Earned on {new Date(achievement.unlockedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
            </>
          )}
          
          {!achievement.unlocked && (
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Locked</Badge>
                <p className="text-xs text-muted-foreground">Keep going to unlock this achievement!</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
