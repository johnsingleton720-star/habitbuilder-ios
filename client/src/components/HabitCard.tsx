import { motion } from "framer-motion";
import { format } from "date-fns";
import { 
  Check, Flame, MoreVertical, Trash2, Edit, ChevronRight, Play, Sparkles,
  Droplets, Heart, BookOpen, Dumbbell, Moon, Coffee, Leaf, Star,
  Footprints, Brain, Smile, Apple, Salad, Timer, Bed, Sun,
  Music, Palette, Camera, Pencil, Target, Trophy, Zap, Compass,
  Mountain, Bike, Waves, Wind, TreePine, Flower2, Cookie, GlassWater,
  Pill, Stethoscope, Scale, Shirt, Home, Users, MessageCircle, Phone,
  Wallet, PiggyBank, GraduationCap, Languages, Code, Laptop, Gamepad2,
  Archive, RefreshCw, AlertTriangle, Clock
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
import { useState, forwardRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { HabitFormDialog } from "./HabitFormDialog";
import { GuidedSession } from "./GuidedSession";
import { HabitSetupWizard } from "./HabitSetupWizard";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { DailyPlan } from "@shared/schema";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/use-subscription";
import { LockedFeature } from "./UpgradePrompt";
import { Crown, Lock } from "lucide-react";

interface HabitCardProps {
  habit: HabitResponse;
}

// Wrapper component that forwards ref for AnimatePresence compatibility
const MotionCard = motion.div;

const HABIT_ICON_MAPPING: { keywords: string[]; icon: typeof Star; color: string }[] = [
  { keywords: ["walk", "walking", "steps", "hike", "hiking"], icon: Footprints, color: "text-green-600" },
  { keywords: ["run", "running", "jog", "jogging", "sprint"], icon: Zap, color: "text-orange-500" },
  { keywords: ["read", "reading", "book", "books", "study", "learn"], icon: BookOpen, color: "text-blue-600" },
  { keywords: ["exercise", "workout", "gym", "fitness", "train", "weight", "lift", "weightlift"], icon: Dumbbell, color: "text-red-500" },
  { keywords: ["meditat", "mindful", "calm", "relax", "zen", "peace"], icon: Brain, color: "text-purple-500" },
  { keywords: ["sleep", "rest", "nap", "bedtime"], icon: Bed, color: "text-indigo-500" },
  { keywords: ["wake", "morning", "early", "sunrise"], icon: Sun, color: "text-amber-500" },
  { keywords: ["water", "hydrat", "drink", "fluid"], icon: GlassWater, color: "text-cyan-500" },
  { keywords: ["eat", "diet", "nutrition", "healthy", "vegetable", "salad"], icon: Salad, color: "text-green-500" },
  { keywords: ["fruit", "apple", "snack"], icon: Apple, color: "text-red-400" },
  { keywords: ["coffee", "tea", "caffeine"], icon: Coffee, color: "text-amber-700" },
  { keywords: ["journal", "write", "writing", "diary", "log", "note"], icon: Pencil, color: "text-violet-500" },
  { keywords: ["music", "instrument", "piano", "guitar", "sing", "practice"], icon: Music, color: "text-pink-500" },
  { keywords: ["art", "draw", "paint", "creative", "sketch"], icon: Palette, color: "text-fuchsia-500" },
  { keywords: ["photo", "photography", "camera"], icon: Camera, color: "text-slate-600" },
  { keywords: ["yoga", "stretch", "flexibility"], icon: Wind, color: "text-teal-500" },
  { keywords: ["swim", "swimming", "pool"], icon: Waves, color: "text-blue-500" },
  { keywords: ["bike", "cycling", "bicycle"], icon: Bike, color: "text-lime-600" },
  { keywords: ["climb", "mountain", "outdoor"], icon: Mountain, color: "text-stone-600" },
  { keywords: ["nature", "garden", "plant", "tree"], icon: TreePine, color: "text-emerald-600" },
  { keywords: ["flower", "bloom"], icon: Flower2, color: "text-pink-400" },
  { keywords: ["medicine", "vitamin", "supplement", "pill"], icon: Pill, color: "text-rose-500" },
  { keywords: ["doctor", "health", "checkup", "medical"], icon: Stethoscope, color: "text-sky-500" },
  { keywords: ["weight", "scale", "measure"], icon: Scale, color: "text-gray-600" },
  { keywords: ["clean", "organize", "tidy", "declutter", "home", "house"], icon: Home, color: "text-amber-600" },
  { keywords: ["social", "friend", "family", "connect", "call", "relationship"], icon: Users, color: "text-blue-400" },
  { keywords: ["talk", "speak", "communicate", "conversation"], icon: MessageCircle, color: "text-green-400" },
  { keywords: ["save", "money", "budget", "finance", "spend"], icon: PiggyBank, color: "text-pink-600" },
  { keywords: ["language", "spanish", "french", "learn", "speak"], icon: Languages, color: "text-indigo-400" },
  { keywords: ["code", "program", "develop", "software"], icon: Code, color: "text-emerald-500" },
  { keywords: ["work", "productivity", "task", "project", "computer"], icon: Laptop, color: "text-slate-500" },
  { keywords: ["game", "gaming", "play"], icon: Gamepad2, color: "text-violet-400" },
  { keywords: ["goal", "target", "achieve", "focus"], icon: Target, color: "text-red-600" },
  { keywords: ["grateful", "gratitude", "thankful", "appreciate"], icon: Heart, color: "text-rose-400" },
  { keywords: ["happy", "smile", "positive", "joy", "mood"], icon: Smile, color: "text-yellow-500" },
  { keywords: ["timer", "pomodoro", "time", "schedule"], icon: Timer, color: "text-orange-400" },
];

const FALLBACK_ICONS = [Star, Leaf, Compass, Trophy, Sparkles, Droplets, Moon, Coffee];

const PASTEL_CLASSES = [
  "habit-pastel-1",
  "habit-pastel-2", 
  "habit-pastel-3",
  "habit-pastel-4",
  "habit-pastel-5",
];

// Map icon name strings to actual icon components
const ICON_NAME_MAP: Record<string, typeof Star> = {
  Star, Leaf, Compass, Trophy, Sparkles, Droplets, Moon, Coffee,
  Footprints, Brain, BookOpen, Dumbbell, Bed, Sun, GlassWater, Salad,
  Apple, Pencil, Music, Palette, Camera, Wind, Waves, Bike, Mountain,
  TreePine, Flower2, Pill, Home, Users, PiggyBank, Languages, Code,
  Laptop, Gamepad2, Target, Heart, Smile, Timer, Zap
};

// Map hex color to a light pastel version for card backgrounds
function getCardBackgroundFromColor(hexColor: string | null | undefined, isDarkMode: boolean = false): { bgStyle?: React.CSSProperties; useCustomBg: boolean } {
  if (!hexColor || !hexColor.startsWith('#')) {
    return { useCustomBg: false };
  }
  
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  const lightOpacity1 = isDarkMode ? 0.30 : 0.22;
  const lightOpacity2 = isDarkMode ? 0.18 : 0.10;
  const lightBg = `linear-gradient(to bottom right, rgba(${r}, ${g}, ${b}, ${lightOpacity1}), rgba(${r}, ${g}, ${b}, ${lightOpacity2}))`;
  const borderColor = `rgba(${r}, ${g}, ${b}, ${isDarkMode ? 0.5 : 0.45})`;
  
  return { 
    bgStyle: { 
      background: lightBg,
      borderColor: borderColor 
    },
    useCustomBg: true 
  };
}

function getSmartHabitIcon(title: string, description: string | null, habitId: number, customIcon?: string | null, customColor?: string | null) {
  // Use custom icon/color if set
  if (customIcon && ICON_NAME_MAP[customIcon]) {
    // Check if customColor is a hex value (starts with #) or a tailwind class
    const isHexColor = customColor?.startsWith('#');
    return { 
      icon: ICON_NAME_MAP[customIcon], 
      color: isHexColor ? undefined : (customColor || "text-primary"),
      colorStyle: isHexColor ? customColor : undefined
    };
  }
  
  const searchText = `${title} ${description || ""}`.toLowerCase();
  
  for (const mapping of HABIT_ICON_MAPPING) {
    for (const keyword of mapping.keywords) {
      if (searchText.includes(keyword)) {
        return { icon: mapping.icon, color: mapping.color, colorStyle: undefined };
      }
    }
  }
  
  return { 
    icon: FALLBACK_ICONS[habitId % FALLBACK_ICONS.length], 
    color: "text-primary",
    colorStyle: undefined
  };
}

function getPastelClass(habitId: number) {
  return PASTEL_CLASSES[habitId % PASTEL_CLASSES.length];
}

export const HabitCard = forwardRef<HTMLDivElement, HabitCardProps>(function HabitCard({ habit }, ref) {
  const deleteHabit = useDeleteHabit();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSession, setShowSession] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { toast } = useToast();
  const { features, isFreeUser } = useSubscription();

  const dailyPlans = (habit.dailyPlans || []) as DailyPlan[];
  const today = format(new Date(), "yyyy-MM-dd");
  const todaysPlan = dailyPlans.find(p => p.date === today);
  const streak = habit.currentStreak || 0;
  const longestStreak = habit.longestStreak || 0;

  const todaysTasks = todaysPlan?.tasks || [];
  const completedTasksCount = todaysTasks.filter(t => t.completed).length;
  const skippedTasksCount = todaysTasks.filter(t => t.skipped).length;
  const activeTasksCount = todaysTasks.length - skippedTasksCount;
  const allResolved = activeTasksCount > 0 && todaysTasks.every(t => t.completed || t.skipped) && completedTasksCount > 0;
  const isCompletedToday = allResolved;
  const totalTasksCount = todaysTasks.length;
  const progressPercent = activeTasksCount > 0 ? (completedTasksCount / activeTasksCount) * 100 : 0;

  const planEndDate = habit.planEndDate ? habit.planEndDate : dailyPlans.length > 0 ? dailyPlans[dailyPlans.length - 1].date : null;
  const lastDailyPlanDate = dailyPlans.length > 0 ? dailyPlans[dailyPlans.length - 1].date : null;
  const allDailyPlansExpired = habit.setupComplete && lastDailyPlanDate ? lastDailyPlanDate < today : false;
  const isPlanCompleted = habit.setupComplete && (
    (planEndDate ? planEndDate < today : false) || allDailyPlansExpired
  );

  const { icon: HabitIcon, color: iconColor, colorStyle } = getSmartHabitIcon(
    habit.title, 
    habit.description, 
    habit.id,
    habit.customIcon,
    habit.customColor
  );
  const pastelClass = getPastelClass(habit.id);
  const { bgStyle: customCardBg, useCustomBg } = getCardBackgroundFromColor(habit.customColor, isDarkMode);

  const extendPlanMutation = useMutation({
    mutationFn: async () => {
      const extDuration = habit.planDuration === "daily" ? "weekly" : (habit.planDuration || "weekly");
      return await apiRequest("POST", `/api/habits/${habit.id}/extend-plan`, { duration: extDuration });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      toast({ title: "Plan extended!", description: "Your plan has been extended with new tasks." });
    },
    onError: () => {
      toast({ title: "Failed to extend plan", variant: "destructive" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/habits/${habit.id}/archive`, { archived: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      toast({ title: "Habit archived", description: "This habit has been moved to your archive." });
    },
    onError: () => {
      toast({ title: "Failed to archive", variant: "destructive" });
    },
  });

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
      <Link href={`/habit/${habit.id}?date=${new Date().toISOString().split('T')[0]}`}>
      <MotionCard
        ref={ref}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className={cn(
          "group relative overflow-hidden rounded-3xl p-5 border-2 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer",
          !useCustomBg && pastelClass,
          isPlanCompleted && "opacity-70"
        )}
        style={useCustomBg ? customCardBg : undefined}
        data-testid={`card-habit-${habit.id}`}
      >
        {/* Decorative blob */}
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/5 blur-2xl" />
        
        <div className="relative flex items-start justify-between">
          <div className="flex-1">
            {/* Icon & Title Row */}
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm border",
                isPlanCompleted 
                  ? "bg-muted/50 dark:bg-muted/20 border-muted" 
                  : "bg-white/80 dark:bg-white/10 border-white/50 dark:border-white/10"
              )}>
                <HabitIcon 
                  className={cn("w-6 h-6", isPlanCompleted ? "text-muted-foreground" : iconColor)} 
                  style={!isPlanCompleted && colorStyle ? { color: colorStyle } : undefined}
                />
              </div>
              <div className="flex-1">
                <h3 className={cn(
                  "font-display text-lg font-bold leading-tight",
                  isPlanCompleted ? "text-muted-foreground line-through" : "text-foreground"
                )}>{habit.title}</h3>
                {isPlanCompleted && (
                  <Badge variant="outline" className="mt-1 text-xs bg-amber-100/50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Plan completed
                  </Badge>
                )}
                {!habit.setupComplete && !isPlanCompleted && (
                  <Badge variant="outline" className="mt-1 text-xs bg-white/50 dark:bg-black/20">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Setup needed
                  </Badge>
                )}
              </div>
            </div>

            {isPlanCompleted ? (
              <div className="space-y-3">
                {habit.description && (
                  <p className="text-sm text-muted-foreground/60 line-clamp-1 line-through">{habit.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.preventDefault()}>
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-1.5 rounded-xl"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); extendPlanMutation.mutate(); }}
                    disabled={extendPlanMutation.isPending}
                    data-testid={`button-extend-card-${habit.id}`}
                  >
                    {extendPlanMutation.isPending ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    Extend Plan
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 rounded-xl"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); archiveMutation.mutate(); }}
                    disabled={archiveMutation.isPending}
                    data-testid={`button-archive-card-${habit.id}`}
                  >
                    {archiveMutation.isPending ? (
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Archive className="w-3.5 h-3.5" />
                    )}
                    Archive
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {habit.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{habit.description}</p>
                )}

                {habit.schedule?.time && habit.schedule?.days?.length > 0 && (
                  <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5" data-testid={`schedule-${habit.id}`}>
                    <Clock className="w-3 h-3" />
                    {habit.schedule.days.map((d: string) => d.charAt(0).toUpperCase() + d.slice(0, 3)).join(", ")}
                    {" at "}
                    {new Date(`2000-01-01T${habit.schedule.time}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </p>
                )}
                
                {habit.setupComplete && totalTasksCount > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground font-medium">Today's Progress</span>
                      <span className="font-bold text-foreground">
                        {completedTasksCount}/{activeTasksCount}
                        {skippedTasksCount > 0 && (
                          <span className="text-muted-foreground font-normal ml-1 text-[10px]">({skippedTasksCount} skipped)</span>
                        )}
                      </span>
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

                <div className="flex items-center gap-3 mb-4">
                  {isFreeUser ? (
                    <Link href="/paywall">
                      <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40 px-3 py-2 rounded-lg border border-amber-200/60 dark:border-amber-800/50 cursor-pointer hover:bg-amber-100/80 dark:hover:bg-amber-900/40 transition-colors" data-testid="prompt-unlock-streaks">
                        <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <span>Track your streaks to stay motivated</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">Pro</Badge>
                      </div>
                    </Link>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
                
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
              </>
            )}
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

            {habit.setupComplete && !isPlanCompleted && (
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

            {isPlanCompleted && (
              <div className="mt-2 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
                <Check className="w-7 h-7 stroke-[3] text-amber-600 dark:text-amber-400" />
              </div>
            )}
          </div>
        </div>
      </MotionCard>
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
});
