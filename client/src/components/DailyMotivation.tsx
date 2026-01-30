import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sun, 
  Target, 
  Lightbulb, 
  Flame,
  Sparkles
} from "lucide-react";

interface DailyMotivationProps {
  habitId: number;
}

interface MotivationData {
  morningMotivation: string;
  focusReminder: string;
  quickTip: string;
  streakMessage: string;
}

export function DailyMotivation({ habitId }: DailyMotivationProps) {
  const { data: motivation, isLoading } = useQuery<MotivationData>({
    queryKey: ['/api/habits', habitId, 'daily-motivation'],
    enabled: habitId > 0,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!motivation) return null;

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/10 overflow-hidden">
      <CardContent className="p-0">
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Sun className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium">Good Morning!</p>
              <p className="text-xs text-muted-foreground">Your daily motivation</p>
            </div>
            <Badge variant="secondary" className="ml-auto gap-1">
              <Sparkles className="w-3 h-3" />
              AI Coach
            </Badge>
          </div>

          <p className="text-sm leading-relaxed">{motivation.morningMotivation}</p>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-start gap-2 p-2 rounded-lg bg-background/50">
              <Target className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Today's Focus</p>
                <p className="text-xs text-muted-foreground">{motivation.focusReminder}</p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-2 rounded-lg bg-background/50">
              <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Quick Tip</p>
                <p className="text-xs text-muted-foreground">{motivation.quickTip}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <Flame className="w-4 h-4 text-orange-500" />
            <p className="text-xs">{motivation.streakMessage}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
