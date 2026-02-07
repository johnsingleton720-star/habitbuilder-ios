import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Zap, Trophy, Target, Star, Flame, Clock, Check, Sparkles, HelpCircle, Crown, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { CelebrationAnimation } from "./CelebrationAnimation";

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

interface GamificationStats {
  xpPoints: number;
  level: number;
  levelTitle: string;
  xpToNextLevel: number;
  levelProgress: number;
  dailyChallengesCompleted: number;
  weeklyXpGoal: number;
  todaysChallenges: DailyChallenge[];
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
    type: "level_up" | "challenge";
    title: string;
    subtitle?: string;
  }>({ show: false, type: "challenge", title: "" });
  
  const previousLevelRef = useRef<number | null>(null);
  const previousCompletedRef = useRef<number | null>(null);
  
  const { data: stats, isLoading } = useQuery<GamificationStats>({
    queryKey: ["/api/gamification/stats"],
  });
  
  useEffect(() => {
    if (!stats) return;
    
    if (previousLevelRef.current !== null && stats.level > previousLevelRef.current) {
      setCelebration({
        show: true,
        type: "level_up",
        title: `Level ${stats.level}!`,
        subtitle: `You're now a ${stats.levelTitle}. Keep up the amazing work!`,
      });
    }
    previousLevelRef.current = stats.level;
    
    const completedCount = stats.todaysChallenges.filter(c => c.completed).length;
    if (previousCompletedRef.current !== null && completedCount > previousCompletedRef.current) {
      const newlyCompleted = stats.todaysChallenges.find(c => c.completed);
      if (newlyCompleted && !celebration.show) {
        toast({
          title: "Challenge Complete!",
          description: `+${newlyCompleted.xpReward} XP earned!`,
        });
      }
    }
    previousCompletedRef.current = completedCount;
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
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-6 bg-muted rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const hasChallenges = stats.todaysChallenges.length > 0;

  return (
    <>
    <CelebrationAnimation
      show={celebration.show}
      type={celebration.type}
      title={celebration.title}
      subtitle={celebration.subtitle}
      onComplete={() => setCelebration(prev => ({ ...prev, show: false }))}
    />
    <div className="space-y-4">
      {/* XP & Level Card */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display text-xl font-bold">Level {stats.level}</span>
                  <Badge variant="secondary" className="text-xs">{stats.levelTitle}</Badge>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-6 w-6" data-testid="button-level-info">
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
                          Earn XP by completing daily challenges. As you accumulate XP, you level up and unlock new titles.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="space-y-1">
                          <p className="text-sm font-medium mb-2">How to earn XP</p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li className="flex items-center gap-2"><Target className="w-3.5 h-3.5 text-primary shrink-0" /> Complete daily challenges (40-100 XP each)</li>
                            <li className="flex items-center gap-2"><Flame className="w-3.5 h-3.5 text-primary shrink-0" /> Maintain habit streaks</li>
                            <li className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-primary shrink-0" /> Spend time on your habits</li>
                            <li className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-primary shrink-0" /> Work on all your active habits</li>
                          </ul>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">All Levels</p>
                          <div className="space-y-1 max-h-[280px] overflow-y-auto">
                            {XP_LEVELS.map((lvl) => (
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
                                    <Badge variant="default" className="text-[10px] px-1.5 py-0">You</Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {lvl.minXp.toLocaleString()} XP
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <p className="text-sm text-muted-foreground">
                  {stats.xpPoints.toLocaleString()} XP
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary">{Math.round(stats.levelProgress)}%</span>
              <p className="text-xs text-muted-foreground">to Level {stats.level + 1}</p>
            </div>
          </div>
          
          <div className="space-y-1">
            <Progress value={stats.levelProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {stats.xpToNextLevel > 0 
                ? `${stats.xpToNextLevel.toLocaleString()} XP to next level`
                : "Max level reached!"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Daily Challenges Card */}
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
              <Badge variant="outline" className="text-xs">
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
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        challenge.completed ? "bg-green-500/20" : "bg-primary/10"
                      )}>
                        {challenge.completed ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <ChallengeIcon className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-medium text-sm",
                            challenge.completed && "line-through text-muted-foreground"
                          )}>
                            {challenge.title}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            +{challenge.xpReward} XP
                          </Badge>
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
