import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap, Trophy, Target, Star, Flame, Clock, Check, Sparkles, HelpCircle, Crown, RotateCcw, Palette, Lock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { CelebrationAnimation } from "./CelebrationAnimation";
import { ACHIEVEMENTS, getAchievementById } from "@/lib/achievements";
import { APP_THEMES, applyThemeToDocument } from "./ThemeSelector";

interface DailyChallenge {
  id: number;
  challengeType: string;
  title: string;
  description: string;
  xpReward: number;
  targetValue: number | null;
  currentValue: number | null;
  completed: boolean;
}

interface LevelReward {
  color: string;
  colorName: string;
  colorValue: string;
}

interface UnlockedColor extends LevelReward {
  level: number;
}

interface UserAchievement {
  id: number;
  userId: string;
  achievementId: string;
  unlockedAt: string;
}

interface GamificationStats {
  xpPoints: number;
  level: number;
  levelTitle: string;
  xpToNextLevel: number;
  levelProgress: number;
  dailyChallengesCompleted: number;
  weeklyXpGoal: number;
  todaysChallenges: DailyChallenge[];
  streakMultiplier: number;
  streakMultiplierLabel: string;
  maxStreak: number;
  weeklyXpEarned: number;
  levelRewards: Record<string, LevelReward>;
  unlockedColors: UnlockedColor[];
  achievements: UserAchievement[];
  subscriptionTier: string;
  isAdmin: boolean;
  selectedColor: string;
}

const XP_LEVELS = [
  { level: 1, minXp: 0, title: "Beginner" },
  { level: 2, minXp: 100, title: "Starter" },
  { level: 3, minXp: 300, title: "Committed" },
  { level: 4, minXp: 600, title: "Dedicated" },
  { level: 5, minXp: 1000, title: "Consistent" },
  { level: 6, minXp: 1500, title: "Focused" },
  { level: 7, minXp: 2200, title: "Advanced" },
  { level: 8, minXp: 3000, title: "Expert" },
  { level: 9, minXp: 4000, title: "Master" },
  { level: 10, minXp: 5500, title: "Legend" },
  { level: 11, minXp: 7500, title: "Champion" },
  { level: 12, minXp: 10000, title: "Habit Hero" },
];

const CHALLENGE_ICONS: Record<string, typeof Target> = {
  complete_tasks: Target,
  time_goal: Clock,
  all_habits: Star,
  streak_builder: Flame,
  early_bird: Zap,
  note_taker: Sparkles,
};

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

function useTimeUntilMidnight() {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function calculate() {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    }

    calculate();
    const interval = setInterval(calculate, 60000);
    return () => clearInterval(interval);
  }, []);

  return timeLeft;
}

export function GamificationDisplay() {
  const { toast } = useToast();
  const timeUntilReset = useTimeUntilMidnight();
  const [celebration, setCelebration] = useState<{
    show: boolean;
    type: "level_up" | "challenge" | "achievement";
    title: string;
    subtitle?: string;
  }>({ show: false, type: "challenge", title: "" });
  const [localSelectedColor, setLocalSelectedColor] = useState<string | null>(null);
  
  const previousLevelRef = useRef<number | null>(null);
  const previousCompletedRef = useRef<number | null>(null);
  const previousAchievementsRef = useRef<Set<string> | null>(null);
  
  const { data: stats, isLoading } = useQuery<GamificationStats>({
    queryKey: ["/api/gamification/stats"],
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (stats?.selectedColor) {
      setLocalSelectedColor(stats.selectedColor);
    }
  }, [stats?.selectedColor]);

  const isPro = stats ? (stats.subscriptionTier === 'pro' || stats.subscriptionTier === 'premium' || stats.isAdmin) : false;
  const isPremium = stats ? (stats.subscriptionTier === 'premium' || stats.isAdmin) : false;
  
  const accentColorMutation = useMutation({
    mutationFn: async (color: string) => {
      return await apiRequest("PATCH", "/api/user/accent-color", { color });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Accent color updated!",
        description: "Your dashboard color has been changed.",
      });
    },
    onError: () => {
      const previousColor = stats?.selectedColor ?? "nature";
      setLocalSelectedColor(previousColor);
      const revertTheme = APP_THEMES.find(t => t.id === previousColor) || APP_THEMES[0];
      applyThemeToDocument(revertTheme);
      localStorage.setItem("appColorTheme", revertTheme.id);
      toast({
        title: "Couldn't change color",
        description: "You may not have unlocked this color yet.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!stats) return;
    
    if (previousLevelRef.current !== null && stats.level > previousLevelRef.current) {
      const newLevel = stats.level;
      const reward = stats.levelRewards?.[String(newLevel)];
      const rewardText = reward && isPremium
        ? `You unlocked the "${reward.colorName}" accent color!`
        : `You're now a ${stats.levelTitle}. Keep up the amazing work!`;
      setCelebration({
        show: true,
        type: "level_up",
        title: `Level ${stats.level}!`,
        subtitle: rewardText,
      });
    }
    previousLevelRef.current = stats.level;
    
    const completedCount = stats.todaysChallenges.filter(c => c.completed).length;
    if (previousCompletedRef.current !== null && completedCount > previousCompletedRef.current) {
      const newlyCompleted = stats.todaysChallenges.find(c => c.completed);
      if (newlyCompleted && !celebration.show) {
        const multiplierNote = stats.streakMultiplier > 1 
          ? ` (${stats.streakMultiplierLabel} streak bonus!)`
          : "";
        toast({
          title: "Challenge Complete!",
          description: `+${newlyCompleted.xpReward} XP earned${multiplierNote}`,
        });
      }
    }
    previousCompletedRef.current = completedCount;

    if (isPremium && stats.achievements) {
      const currentAchievementIds = new Set(stats.achievements.map(a => a.achievementId));
      if (previousAchievementsRef.current !== null) {
        for (const achievementId of Array.from(currentAchievementIds)) {
          if (!previousAchievementsRef.current.has(achievementId)) {
            const achievement = getAchievementById(achievementId);
            if (achievement) {
              const context = ACHIEVEMENT_CONTEXT[achievementId] || "You're making incredible progress!";
              setCelebration({
                show: true,
                type: "achievement",
                title: achievement.name,
                subtitle: context,
              });
              break;
            }
          }
        }
      }
      previousAchievementsRef.current = currentAchievementIds;
    }
  }, [stats]);
  
  const generateChallengesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/gamification/generate-challenges");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/stats"] });
      toast({
        title: "Daily challenges generated!",
        description: "Complete them to earn XP and level up!",
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 animate-shimmer" />
        <CardHeader className="pb-2">
          <div className="h-6 bg-muted/50 rounded-lg w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted/40 rounded-lg w-full"></div>
            <div className="h-4 bg-muted/40 rounded-lg w-2/3"></div>
            <div className="flex gap-3 mt-2">
              <div className="h-16 w-16 bg-muted/30 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-muted/40 rounded-lg w-full" />
                <div className="h-3 bg-muted/40 rounded-lg w-3/4" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const hasChallenges = stats.todaysChallenges.length > 0;
  const weeklyProgress = stats.weeklyXpGoal > 0 
    ? Math.min(100, (stats.weeklyXpEarned / stats.weeklyXpGoal) * 100)
    : 0;

  const effectiveSelectedColor = localSelectedColor ?? stats.selectedColor;
  const activeAccentColor = isPremium && effectiveSelectedColor && stats.levelRewards
    ? Object.values(stats.levelRewards).find(r => r.color === effectiveSelectedColor)?.colorValue
    : null;

  const accentStyle = activeAccentColor ? {
    '--accent-color': activeAccentColor,
    '--accent-color-light': activeAccentColor.replace(')', ', 0.15)').replace('hsl(', 'hsla('),
    '--accent-color-medium': activeAccentColor.replace(')', ', 0.25)').replace('hsl(', 'hsla('),
  } as React.CSSProperties : {};

  return (
    <>
    <CelebrationAnimation
      show={celebration.show}
      type={celebration.type}
      title={celebration.title}
      subtitle={celebration.subtitle}
      onComplete={() => setCelebration(prev => ({ ...prev, show: false }))}
    />
    <div className="space-y-4" style={accentStyle}>
      <Card
        className={cn(!activeAccentColor && "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent", "border-primary/20")}
        style={activeAccentColor ? {
          background: `linear-gradient(to bottom right, ${activeAccentColor.replace(')', ', 0.12)').replace('hsl(', 'hsla(')}, ${activeAccentColor.replace(')', ', 0.04)').replace('hsl(', 'hsla(')}, transparent)`,
          borderColor: activeAccentColor.replace(')', ', 0.25)').replace('hsl(', 'hsla('),
        } : undefined}
      >
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className={cn("w-12 h-12 rounded-full flex items-center justify-center", !activeAccentColor && "bg-primary/20")}
                style={activeAccentColor ? {
                  backgroundColor: activeAccentColor.replace(')', ', 0.2)').replace('hsl(', 'hsla('),
                } : undefined}
              >
                <Trophy className={cn("w-6 h-6", !activeAccentColor && "text-primary")} style={activeAccentColor ? { color: activeAccentColor } : undefined} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display text-xl font-bold" data-testid="text-level">Level {stats.level}</span>
                  <Badge variant="secondary" className="text-xs" data-testid="badge-level-title">{stats.levelTitle}</Badge>
                  {isPro && stats.streakMultiplier > 1 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="default" className="text-xs bg-amber-500/90 dark:bg-amber-600/90" data-testid="badge-streak-multiplier">
                          <Flame className="w-3 h-3 mr-1" />
                          {stats.streakMultiplierLabel} XP
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm">{stats.maxStreak}-day streak bonus!</p>
                        <p className="text-xs text-muted-foreground">All challenge XP multiplied by {stats.streakMultiplierLabel}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="ghost" data-testid="button-level-info">
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-primary" />
                          How Leveling Up Works
                        </DialogTitle>
                        <DialogDescription>
                          Earn XP by completing daily challenges. As you accumulate XP, you level up and unlock new titles{isPremium ? " and accent colors" : ""}.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        {isPro && (
                          <div className="space-y-1">
                            <p className="text-sm font-medium mb-2">Streak XP Multiplier</p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              <li className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" /> 3-day streak</span><Badge variant="secondary" className="text-xs">1.5x XP</Badge></li>
                              <li className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" /> 7-day streak</span><Badge variant="secondary" className="text-xs">2x XP</Badge></li>
                              <li className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><Flame className="w-3.5 h-3.5 text-red-500 shrink-0" /> 14-day streak</span><Badge variant="secondary" className="text-xs">2.5x XP</Badge></li>
                              <li className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><Flame className="w-3.5 h-3.5 text-red-500 shrink-0" /> 30-day streak</span><Badge variant="secondary" className="text-xs">3x XP</Badge></li>
                            </ul>
                          </div>
                        )}
                        <div className="space-y-1">
                          <p className="text-sm font-medium mb-2">How to earn XP</p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li className="flex items-center gap-2"><Target className="w-3.5 h-3.5 text-primary shrink-0" /> Complete daily challenges (40-100 XP each)</li>
                            <li className="flex items-center gap-2"><Flame className="w-3.5 h-3.5 text-primary shrink-0" /> Maintain habit streaks{isPro ? " for XP multiplier" : ""}</li>
                            <li className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-primary shrink-0" /> Spend time on your habits</li>
                            <li className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-primary shrink-0" /> Work on all your active habits</li>
                          </ul>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">All Levels</p>
                          <div className="space-y-1 max-h-[280px] overflow-y-auto">
                            {XP_LEVELS.map((lvl) => {
                              const reward = stats.levelRewards?.[String(lvl.level)];
                              return (
                                <div
                                  key={lvl.level}
                                  className={cn(
                                    "flex items-center justify-between gap-2 text-sm px-2 py-1.5 rounded-md",
                                    stats.level === lvl.level && "bg-primary/10 font-medium"
                                  )}
                                  data-testid={`level-info-${lvl.level}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      "w-6 text-center font-mono text-xs",
                                      stats.level === lvl.level ? "text-primary font-bold" : "text-muted-foreground"
                                    )}>
                                      {lvl.level}
                                    </span>
                                    <span>{lvl.title}</span>
                                    {stats.level === lvl.level && (
                                      <Badge variant="default" className="text-xs px-1.5 py-0">You</Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {isPremium && reward && (
                                      <div
                                        className={cn(
                                          "w-3 h-3 rounded-full border",
                                          lvl.level <= stats.level ? "border-transparent" : "border-muted-foreground/30"
                                        )}
                                        style={{ backgroundColor: lvl.level <= stats.level ? reward.colorValue : undefined }}
                                        title={reward.colorName}
                                      />
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                      {lvl.minXp.toLocaleString()} XP
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-xp-total">
                  {stats.xpPoints.toLocaleString()} XP
                </p>
              </div>
            </div>
            <div className="text-right">
              <span
                className={cn("text-2xl font-bold", !activeAccentColor && "text-primary")}
                style={activeAccentColor ? { color: activeAccentColor } : undefined}
                data-testid="text-level-progress"
              >
                {Math.round(stats.levelProgress)}%
              </span>
              <p className="text-xs text-muted-foreground">to Level {stats.level + 1}</p>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="relative">
              <Progress value={stats.levelProgress} className="h-2" />
              {activeAccentColor && (
                <div
                  className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.levelProgress}%`,
                      backgroundColor: activeAccentColor,
                    }}
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {stats.xpToNextLevel > 0 
                ? `${stats.xpToNextLevel.toLocaleString()} XP to next level`
                : "Max level reached!"}
            </p>
          </div>

          {isPro && (
            <div className="mt-4 pt-3 border-t border-primary/10">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium" data-testid="text-weekly-xp-label">Weekly XP Goal</span>
                </div>
                <span className="text-sm text-muted-foreground" data-testid="text-weekly-xp-progress">
                  {stats.weeklyXpEarned} / {stats.weeklyXpGoal} XP
                </span>
              </div>
              <div className="relative">
                <Progress value={weeklyProgress} className="h-2" />
                {activeAccentColor && (
                  <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${weeklyProgress}%`,
                        backgroundColor: activeAccentColor,
                      }}
                    />
                  </div>
                )}
              </div>
              {weeklyProgress >= 100 ? (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 text-center" data-testid="text-weekly-xp-complete">
                  Weekly goal reached! Outstanding work.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  {stats.weeklyXpGoal - stats.weeklyXpEarned} XP remaining this week
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isPremium && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="w-5 h-5 text-violet-500" />
                Unlockable Colors
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Each level unlocks a new accent color. Tap to apply an unlocked color.
            </p>
            <div className="grid grid-cols-6 gap-2">
              {Object.entries(stats.levelRewards || {}).map(([lvlStr, reward]) => {
                const lvl = parseInt(lvlStr);
                const isUnlocked = lvl <= stats.level;
                const isSelected = effectiveSelectedColor === reward.color;
                
                return (
                  <Tooltip key={lvl}>
                    <TooltipTrigger asChild>
                      <button
                        className={cn(
                          "relative w-full aspect-square rounded-md border-2 transition-all flex items-center justify-center",
                          isUnlocked 
                            ? isSelected 
                              ? "border-foreground ring-2 ring-foreground/20" 
                              : "border-transparent hover:border-muted-foreground/40 cursor-pointer"
                            : "border-muted cursor-not-allowed opacity-50"
                        )}
                        style={{ backgroundColor: reward.colorValue }}
                        onClick={() => {
                          if (isUnlocked && !isSelected) {
                            setLocalSelectedColor(reward.color);
                            const matchingTheme = APP_THEMES.find(t => t.id === reward.color);
                            if (matchingTheme) {
                              applyThemeToDocument(matchingTheme);
                              localStorage.setItem("appColorTheme", reward.color);
                            }
                            accentColorMutation.mutate(reward.color);
                          }
                        }}
                        disabled={!isUnlocked || accentColorMutation.isPending}
                        data-testid={`color-swatch-${reward.color}`}
                      >
                        {!isUnlocked && (
                          <Lock className="w-3.5 h-3.5 text-white/80" />
                        )}
                        {isSelected && isUnlocked && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-sm font-medium">{reward.colorName}</p>
                      <p className="text-xs text-muted-foreground">
                        {isUnlocked ? (isSelected ? "Currently active" : "Click to apply") : `Unlocks at Level ${lvl}`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-amber-500" />
              Daily Challenges
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs" data-testid="badge-challenges-premium">
                <Crown className="w-3 h-3 mr-1" />
                Pro / Premium
              </Badge>
              <Badge variant="outline" className="text-xs" data-testid="badge-challenges-count">
                {stats.todaysChallenges.filter(c => c.completed).length}/{stats.todaysChallenges.length} Complete
              </Badge>
            </div>
          </div>
          {hasChallenges && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1" data-testid="text-challenge-reset">
              <RotateCcw className="w-3 h-3" />
              <span>Challenges reset in {timeUntilReset}</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!hasChallenges ? (
            <div className="text-center py-4">
              <Sparkles className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground mb-3">No challenges yet today</p>
              <Button 
                onClick={() => generateChallengesMutation.mutate()}
                disabled={generateChallengesMutation.isPending}
                data-testid="button-generate-challenges"
              >
                {generateChallengesMutation.isPending ? "Generating..." : "Generate Daily Challenges"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {stats.todaysChallenges.map((challenge) => {
                  const ChallengeIcon = CHALLENGE_ICONS[challenge.challengeType] || Target;
                  const progress = challenge.targetValue 
                    ? Math.min(100, ((challenge.currentValue || 0) / challenge.targetValue) * 100)
                    : challenge.completed ? 100 : 0;
                  
                  return (
                    <motion.div
                      key={challenge.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                        challenge.completed 
                          ? "bg-green-500/10 border-green-500/30" 
                          : "bg-muted/30 border-transparent hover:border-muted-foreground/20"
                      )}
                      data-testid={`challenge-${challenge.id}`}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                        challenge.completed ? "bg-green-500/20" : "bg-primary/10"
                      )}>
                        {challenge.completed ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <ChallengeIcon className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            "font-medium text-sm",
                            challenge.completed && "line-through text-muted-foreground"
                          )}>
                            {challenge.title}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            +{challenge.xpReward} XP
                          </Badge>
                          {isPro && stats.streakMultiplier > 1 && !challenge.completed && (
                            <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400 border-amber-500/30">
                              {stats.streakMultiplierLabel}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{challenge.description}</p>
                        {challenge.targetValue && !challenge.completed && (
                          <div className="mt-1">
                            <Progress value={progress} className="h-1" />
                            <span className="text-xs text-muted-foreground">
                              {challenge.currentValue || 0}/{challenge.targetValue}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
}
