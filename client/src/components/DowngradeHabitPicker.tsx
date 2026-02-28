import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Check, Loader2, Archive } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Habit } from "@shared/schema";

interface DowngradeHabitPickerProps {
  habits: Habit[];
  open: boolean;
}

export function DowngradeHabitPicker({ habits, open }: DowngradeHabitPickerProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const activeHabits = habits.filter(h => !h.archived);

  const handleConfirm = async () => {
    if (!selectedId) return;
    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/habits/downgrade-archive", { keepHabitId: selectedId });
      await queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      toast({
        title: "Habits archived",
        description: `Your other habits have been safely stored. They'll be restored when you resubscribe.`,
      });
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Failed to archive habits. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} modal>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        data-testid="dialog-downgrade-picker"
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-lg">Choose Your Active Habit</DialogTitle>
          </div>
          <DialogDescription className="text-sm">
            Your subscription has ended. Free accounts are limited to 1 active habit. Please choose which habit to keep — the rest will be safely stored and automatically restored when you resubscribe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-4">
          {activeHabits.map((habit) => (
            <Card
              key={habit.id}
              className={`p-3 cursor-pointer transition-all ${
                selectedId === habit.id
                  ? "ring-2 ring-primary border-primary bg-primary/5"
                  : "hover:border-primary/40"
              }`}
              onClick={() => setSelectedId(habit.id)}
              data-testid={`card-downgrade-habit-${habit.id}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  selectedId === habit.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}>
                  {selectedId === habit.id ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{habit.title}</p>
                  {habit.currentStreak ? (
                    <p className="text-xs text-muted-foreground">{habit.currentStreak} day streak</p>
                  ) : habit.description ? (
                    <p className="text-xs text-muted-foreground truncate">{habit.description}</p>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <Button
            className="w-full gap-2"
            disabled={!selectedId || isSubmitting}
            onClick={handleConfirm}
            data-testid="button-confirm-downgrade"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Archiving...
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" />
                Keep Selected Habit
              </>
            )}
          </Button>
          <p className="text-[11px] text-center text-muted-foreground">
            Archived habits are never deleted. Resubscribe anytime to get them all back.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
