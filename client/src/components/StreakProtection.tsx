import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Flame, Lock, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

interface HabitWithStreak {
  id: number;
  title: string;
  currentStreak: number;
  streakFreezeUsed: number | null;
  streakFreezeMonth: string | null;
}

interface StreakProtectionProps {
  habit: HabitWithStreak;
  onFreezeUsed?: () => void;
}

export function StreakProtection({ habit, onFreezeUsed }: StreakProtectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  
  const isPremium = user?.subscriptionTier === 'premium' || user?.isAdmin;
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  const freezesUsedThisMonth = habit.streakFreezeMonth === currentMonth ? (habit.streakFreezeUsed || 0) : 0;
  const maxFreezes = 2;
  const freezesRemaining = maxFreezes - freezesUsedThisMonth;
  
  const freezeStreakMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/habits/${habit.id}/freeze-streak`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits", habit.id] });
      toast({
        title: "Streak Protected!",
        description: "Your streak freeze has been applied. Your streak is safe for today.",
      });
      setShowDialog(false);
      onFreezeUsed?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to freeze streak",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  if (!isPremium) {
    return (
      <Link href="/paywall">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-dashed cursor-pointer hover:bg-muted/70 transition-colors" data-testid="streak-protection-locked">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Streak Protection</p>
            <p className="text-xs text-muted-foreground">Premium feature - protect your streaks when you can't complete a habit</p>
          </div>
          <Badge variant="secondary" className="text-xs">Premium</Badge>
        </div>
      </Link>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Streak Protection</p>
            <Badge variant="outline" className="text-xs">
              {freezesRemaining}/{maxFreezes} left this month
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Protect your {habit.currentStreak}-day streak if you can't complete today
          </p>
        </div>
        <Button
          size="sm"
          variant={freezesRemaining > 0 ? "default" : "outline"}
          disabled={freezesRemaining === 0 || freezeStreakMutation.isPending}
          onClick={() => setShowDialog(true)}
          data-testid="button-freeze-streak"
        >
          {freezeStreakMutation.isPending ? "Freezing..." : "Use Freeze"}
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Freeze Your Streak
            </DialogTitle>
            <DialogDescription>
              Use a streak freeze to protect your {habit.currentStreak}-day streak on "{habit.title}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-2">
                  <Flame className="w-8 h-8 text-orange-500" />
                </div>
                <p className="font-bold text-xl">{habit.currentStreak}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
              <div className="text-3xl text-muted-foreground">→</div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <p className="font-bold text-xl text-primary">Protected</p>
                <p className="text-xs text-muted-foreground">Safe for today</p>
              </div>
            </div>
            
            <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
              <p className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                Your streak will be protected for today
              </p>
              <p className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                You have {freezesRemaining} freeze{freezesRemaining !== 1 ? 's' : ''} remaining this month
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => freezeStreakMutation.mutate()}
              disabled={freezeStreakMutation.isPending}
            >
              {freezeStreakMutation.isPending ? "Freezing..." : "Confirm Freeze"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
