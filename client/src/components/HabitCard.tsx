import { motion } from "framer-motion";
import { format, isSameDay, parseISO } from "date-fns";
import { Check, Flame, MoreVertical, Trash2, Edit, ChevronRight } from "lucide-react";
import { type HabitResponse } from "@shared/routes";
import { useToggleHabitDate, useDeleteHabit } from "@/hooks/use-habits";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { HabitFormDialog } from "./HabitFormDialog";
import { Link } from "wouter";

interface HabitCardProps {
  habit: HabitResponse;
}

export function HabitCard({ habit }: HabitCardProps) {
  const toggleDate = useToggleHabitDate();
  const deleteHabit = useDeleteHabit();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const isCompletedToday = habit.completedDates?.includes(todayStr);

  // Calculate streak (simplified version)
  const calculateStreak = () => {
    if (!habit.completedDates || habit.completedDates.length === 0) return 0;
    // Real logic would be more complex, verifying consecutive dates
    // For MVP, just return count of completions in last 30 days
    return habit.completedDates.length; 
  };

  const streak = calculateStreak();

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm border border-border/50 hover:shadow-md hover:border-border transition-all duration-300 dark:bg-card"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-display text-lg font-semibold text-foreground">{habit.title}</h3>
            {habit.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{habit.description}</p>
            )}
            
            <div className="mt-4 flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-orange-500 bg-orange-50 dark:bg-orange-950/30 px-2.5 py-1 rounded-full border border-orange-100 dark:border-orange-900/50">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>{streak} day streak</span>
              </div>
              
              <span className="text-xs text-muted-foreground capitalize">
                {habit.frequency}
              </span>
            </div>
            
            <Link href={`/habit/${habit.id}`}>
              <Button variant="ghost" size="sm" className="mt-3 gap-1 text-primary" data-testid={`button-view-plan-${habit.id}`}>
                View Plan & Progress
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="flex flex-col items-end gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteAlert(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={() => toggleDate.mutate(habit, today)}
              disabled={toggleDate.isPending}
              data-testid={`button-complete-${habit.id}`}
              className={cn(
                "mt-2 flex h-12 w-12 items-center justify-center rounded-xl border-2 transition-all duration-300",
                isCompletedToday
                  ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                  : "bg-transparent border-muted-foreground/20 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5"
              )}
            >
              <motion.div
                initial={false}
                animate={{ scale: isCompletedToday ? 1 : 0 }}
              >
                <Check className="w-6 h-6 stroke-[3]" />
              </motion.div>
            </button>
          </div>
        </div>
        
        {/* Subtle background progress bar effect */}
        <div 
          className="absolute bottom-0 left-0 h-1 bg-primary/20 transition-all duration-500"
          style={{ width: `${Math.min((streak / 21) * 100, 100)}%` }}
        />
      </motion.div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Habit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{habit.title}"? This action cannot be undone and your streak history will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteHabit.mutate(habit.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteHabit.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <HabitFormDialog 
        open={showEditDialog} 
        onOpenChange={setShowEditDialog} 
        habitToEdit={habit} 
      />
    </>
  );
}
