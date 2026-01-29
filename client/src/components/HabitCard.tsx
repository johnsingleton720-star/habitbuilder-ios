import { motion } from "framer-motion";
import { format, isToday, parseISO } from "date-fns";
import { Check, Flame, MoreVertical, Trash2, Edit, ChevronRight, Play, Sparkles } from "lucide-react";
import { type HabitResponse } from "@shared/routes";
import { useDeleteHabit } from "@/hooks/use-habits";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { HabitFormDialog } from "./HabitFormDialog";
import { GuidedSession } from "./GuidedSession";
import { HabitSetupWizard } from "./HabitSetupWizard";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import type { DailyPlan } from "@shared/schema";

interface HabitCardProps {
  habit: HabitResponse;
}

export function HabitCard({ habit }: HabitCardProps) {
  const deleteHabit = useDeleteHabit();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSession, setShowSession] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  const dailyPlans = (habit.dailyPlans || []) as DailyPlan[];
  const today = format(new Date(), "yyyy-MM-dd");
  const todaysPlan = dailyPlans.find(p => p.date === today);
  const isCompletedToday = todaysPlan?.completed || false;
  const streak = habit.currentStreak || 0;

  // Calculate today's task progress
  const todaysTasks = todaysPlan?.tasks || [];
  const completedTasksCount = todaysTasks.filter(t => t.completed).length;
  const totalTasksCount = todaysTasks.length;

  const handleStartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!habit.setupComplete) {
      setShowSetupWizard(true);
    } else {
      setShowSession(true);
    }
  };

  return (
    <>
      <Link href={`/habit/${habit.id}`}>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm border border-border/50 hover:shadow-md hover:border-primary/30 transition-all duration-300 dark:bg-card cursor-pointer"
        data-testid={`card-habit-${habit.id}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-semibold text-foreground">{habit.title}</h3>
              {!habit.setupComplete && (
                <Badge variant="outline" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Setup needed
                </Badge>
              )}
            </div>
            {habit.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{habit.description}</p>
            )}
            
            <div className="mt-4 flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-orange-500 bg-orange-50 dark:bg-orange-950/30 px-2.5 py-1 rounded-full border border-orange-100 dark:border-orange-900/50">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>{streak} day streak</span>
              </div>
              
              {habit.planDuration && (
                <span className="text-xs text-muted-foreground capitalize">
                  {habit.planDuration} plan
                </span>
              )}
            </div>
            
            {/* Today's progress */}
            {habit.setupComplete && totalTasksCount > 0 && (
              <div className="mt-3 text-sm text-muted-foreground">
                Today: {completedTasksCount}/{totalTasksCount} tasks
              </div>
            )}
            
            <div className="mt-3 flex items-center gap-3">
              <Button
                size="sm"
                className="gap-1.5 shadow-md shadow-primary/20"
                onClick={handleStartClick}
                data-testid={`button-start-${habit.id}`}
              >
                {habit.setupComplete ? (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    Start
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Setup
                  </>
                )}
              </Button>
              <span className="flex items-center gap-1 text-primary text-sm font-medium">
                View Plan
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2" onClick={(e) => e.preventDefault()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowEditDialog(true); }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => { e.stopPropagation(); setShowDeleteAlert(true); }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {habit.setupComplete && (
              <div
                className={cn(
                  "mt-2 flex h-12 w-12 items-center justify-center rounded-xl border-2 transition-all duration-300",
                  isCompletedToday
                    ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                    : "bg-transparent border-muted-foreground/20 text-muted-foreground"
                )}
              >
                <motion.div
                  initial={false}
                  animate={{ scale: isCompletedToday ? 1 : 0 }}
                >
                  <Check className="w-6 h-6 stroke-[3]" />
                </motion.div>
              </div>
            )}
          </div>
        </div>
        
        {/* Progress bar */}
        <div 
          className="absolute bottom-0 left-0 h-1 bg-primary/20 transition-all duration-500"
          style={{ width: `${Math.min((streak / 21) * 100, 100)}%` }}
        />
      </motion.div>
      </Link>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Habit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{habit.title}"? This action cannot be undone and your progress will be lost.
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

      {/* Setup Wizard */}
      {habit && (
        <HabitSetupWizard
          habit={habit}
          open={showSetupWizard}
          onOpenChange={setShowSetupWizard}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
            setLocation(`/habit/${habit.id}`);
          }}
        />
      )}

      {/* Guided Session Dialog */}
      {habit.setupComplete && (
        <GuidedSession
          habit={habit}
          open={showSession}
          onOpenChange={setShowSession}
        />
      )}
    </>
  );
}
