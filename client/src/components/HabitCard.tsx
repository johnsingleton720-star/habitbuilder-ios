import { motion } from "framer-motion";
import { format } from "date-fns";
import { 
  Check, Flame, MoreVertical, Trash2, Edit, ChevronRight, Play, Sparkles,
  Droplets, Heart, BookOpen, Dumbbell, Moon, Coffee, Leaf, Star
} from "lucide-react";
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

const HABIT_ICONS = [Droplets, Heart, BookOpen, Dumbbell, Moon, Coffee, Leaf, Star];
const PASTEL_CLASSES = [
  "habit-pastel-1",
  "habit-pastel-2", 
  "habit-pastel-3",
  "habit-pastel-4",
  "habit-pastel-5",
];

function getHabitIcon(habitId: number) {
  return HABIT_ICONS[habitId % HABIT_ICONS.length];
}

function getPastelClass(habitId: number) {
  return PASTEL_CLASSES[habitId % PASTEL_CLASSES.length];
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
  const longestStreak = habit.longestStreak || 0;

  const todaysTasks = todaysPlan?.tasks || [];
  const completedTasksCount = todaysTasks.filter(t => t.completed).length;
  const totalTasksCount = todaysTasks.length;
  const progressPercent = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;

  const HabitIcon = getHabitIcon(habit.id);
  const pastelClass = getPastelClass(habit.id);

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
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className={cn(
          "group relative overflow-hidden rounded-3xl p-5 border shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer",
          pastelClass
        )}
        data-testid={`card-habit-${habit.id}`}
      >
        {/* Decorative blob */}
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/5 blur-2xl" />
        
        <div className="relative flex items-start justify-between">
          <div className="flex-1">
            {/* Icon & Title Row */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 dark:bg-white/10 shadow-sm border border-white/50 dark:border-white/10">
                <HabitIcon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-bold text-foreground leading-tight">{habit.title}</h3>
                {!habit.setupComplete && (
                  <Badge variant="outline" className="mt-1 text-xs bg-white/50 dark:bg-black/20">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Setup needed
                  </Badge>
                )}
              </div>
            </div>

            {habit.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{habit.description}</p>
            )}
            
            {/* Progress bar */}
            {habit.setupComplete && totalTasksCount > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground font-medium">Today's Progress</span>
                  <span className="font-bold text-foreground">{completedTasksCount}/{totalTasksCount}</span>
                </div>
                <div className="h-2.5 rounded-full bg-white/50 dark:bg-black/20 overflow-hidden shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full",
                      isCompletedToday 
                        ? "bg-gradient-to-r from-primary to-accent" 
                        : "bg-gradient-to-r from-primary/70 to-primary"
                    )}
                  />
                </div>
              </div>
            )}

            {/* Stats Row */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-100/80 dark:bg-orange-950/50 px-3 py-1.5 rounded-full border border-orange-200/50 dark:border-orange-800/50">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>{streak} day{streak !== 1 ? 's' : ''}</span>
              </div>
              
              {longestStreak > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-full">
                  <Star className="w-3 h-3" />
                  <span>Best: {longestStreak}</span>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                className="gap-1.5 shadow-md shadow-primary/20 rounded-xl font-semibold"
                onClick={handleStartClick}
                data-testid={`button-start-${habit.id}`}
              >
                {habit.setupComplete ? (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    Start Session
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Setup Plan
                  </>
                )}
              </Button>
              <span className="flex items-center gap-1 text-primary text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                View Details
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </div>

          {/* Right side - Menu & Completion indicator */}
          <div className="flex flex-col items-end gap-2" onClick={(e) => e.preventDefault()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
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
              <motion.div
                initial={false}
                animate={{ 
                  scale: isCompletedToday ? 1.1 : 1,
                  rotate: isCompletedToday ? [0, -10, 10, 0] : 0
                }}
                transition={{ duration: 0.4 }}
                className={cn(
                  "mt-2 flex h-14 w-14 items-center justify-center rounded-2xl border-2 transition-all duration-300",
                  isCompletedToday
                    ? "bg-gradient-to-br from-primary to-accent border-primary text-white shadow-lg shadow-primary/30"
                    : "bg-white/60 dark:bg-black/20 border-muted-foreground/20 text-muted-foreground"
                )}
              >
                <motion.div
                  initial={false}
                  animate={{ scale: isCompletedToday ? 1 : 0.5, opacity: isCompletedToday ? 1 : 0.3 }}
                >
                  <Check className="w-7 h-7 stroke-[3]" />
                </motion.div>
              </motion.div>
            )}
          </div>
        </div>
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
