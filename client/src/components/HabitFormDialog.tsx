import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type HabitSchedule, type TrackedItem } from "@shared/schema";
import { type HabitResponse } from "@shared/routes";
import { useCreateHabit, useUpdateHabit, useHabits } from "@/hooks/use-habits";
import { useSubscription } from "@/hooks/use-subscription";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SchedulePicker } from "@/components/SchedulePicker";
import { IconColorPicker, ICON_OPTIONS } from "@/components/IconColorPicker";
import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Loader2, Calendar, ChevronDown, ChevronUp, Sparkles, Star, Crown, Lock, ArrowRight, X, Check, CheckCircle2, Brain, Plus, Trash2, Hash, Clock, Type } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const habitFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  goal: z.string().optional(),
  category: z.string().optional(),
});

const CATEGORY_OPTIONS = [
  "Health & Fitness",
  "Productivity",
  "Learning",
  "Wellness",
  "Finance",
  "Relationships",
  "Creativity",
  "Other",
];

type HabitFormData = z.infer<typeof habitFormSchema>;

interface HabitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habitToEdit?: HabitResponse;
  initialValues?: {
    title: string;
    description: string;
    goal: string;
  };
}

export function HabitFormDialog({ open, onOpenChange, habitToEdit, initialValues }: HabitFormDialogProps) {
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const [, setLocation] = useLocation();
  const isEditing = !!habitToEdit;
  const { isFreeUser, canAddMoreHabits } = useSubscription();
  const { data: existingHabits } = useHabits();
  const activeHabitsCount = existingHabits?.filter(h => !h.archived).length || 0;
  const hasReachedFreeLimit = isFreeUser && !isEditing && !canAddMoreHabits(activeHabitsCount);
  const [trackingMode, setTrackingMode] = useState<"plan" | "simple">("plan");
  const [trackedItems, setTrackedItems] = useState<TrackedItem[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [schedule, setSchedule] = useState<HabitSchedule | undefined>(habitToEdit?.schedule as HabitSchedule | undefined);
  const [customIcon, setCustomIcon] = useState<string>("Star");
  const [customColor, setCustomColor] = useState<string>("#0d9488");
  const [iconColorSaved, setIconColorSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const contentRef = useRef<HTMLDivElement>(null);
  
  const selectedEmoji = ICON_OPTIONS.find(i => i.name === customIcon)?.emoji || "⭐";

  const form = useForm<HabitFormData>({
    resolver: zodResolver(habitFormSchema),
    defaultValues: {
      title: "",
      description: "",
      goal: "",
      category: "",
    },
  });

  const prevOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;

    if (justOpened) {
      form.reset({
        title: habitToEdit?.title || initialValues?.title || "",
        description: habitToEdit?.description || initialValues?.description || "",
        goal: habitToEdit?.goal || initialValues?.goal || "",
        category: habitToEdit?.category || "",
      });
      setSchedule(habitToEdit?.schedule as HabitSchedule | undefined);
      setShowSchedule(!!habitToEdit?.schedule);
      setCustomIcon(habitToEdit?.customIcon || "Star");
      setCustomColor(habitToEdit?.customColor || "#0d9488");
      setShowIconPicker(false);
      setIconColorSaved(false);
      setTrackingMode("plan");
      setTrackedItems((habitToEdit?.trackedItems as TrackedItem[]) || []);
      document.body.style.overflow = 'hidden';
    } else if (!open) {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, habitToEdit, initialValues, form]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const closeDialog = useCallback(() => {
    onOpenChange(false);
    setShowIconPicker(false);
    setIconColorSaved(false);
  }, [onOpenChange]);

  const autoSaveIconColor = useCallback((icon: string, color: string) => {
    if (!isEditing || !habitToEdit) return;
    updateHabit.mutate({
      id: habitToEdit.id,
      customIcon: icon,
      customColor: color,
    }, {
      onSuccess: () => {
        setIconColorSaved(true);
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => setIconColorSaved(false), 1500);
      },
    });
  }, [isEditing, habitToEdit, updateHabit]);

  const handleIconChange = useCallback((icon: string) => {
    setCustomIcon(icon);
    autoSaveIconColor(icon, customColor);
  }, [customColor, autoSaveIconColor]);

  const handleColorChange = useCallback((color: string) => {
    setCustomColor(color);
    autoSaveIconColor(customIcon, color);
  }, [customIcon, autoSaveIconColor]);

  const handleBackdropClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
      closeDialog();
    }
  }, [closeDialog]);

  const onSubmit = async (data: HabitFormData) => {
    try {
      const scheduleData = showSchedule && schedule?.days?.length ? schedule : undefined;
      
      if (isEditing && habitToEdit) {
        const updatePayload: Record<string, any> = { 
          id: habitToEdit.id, 
          title: data.title,
          description: data.description || null,
          goal: data.goal || null,
          schedule: scheduleData,
          customIcon,
          customColor,
          category: data.category || null,
        };
        if (habitToEdit.trackingMode === "simple") {
          updatePayload.trackedItems = trackedItems.filter(i => i.name.trim().length > 0);
        }
        await updateHabit.mutateAsync(updatePayload);
        closeDialog();
      } else {
        const newHabit = await createHabit.mutateAsync({
          title: data.title,
          description: data.description || null,
          goal: data.goal || null,
          schedule: scheduleData,
          customIcon,
          customColor,
          category: data.category || null,
          trackingMode,
          ...(trackingMode === "simple" ? { setupComplete: true, trackedItems: trackedItems.filter(i => i.name.trim().length > 0) } : {}),
        });
        closeDialog();
        if (newHabit?.id) {
          setLocation(`/habit/${newHabit.id}`);
        }
      }
    } catch (error) {
      console.error("Failed to submit habit:", error);
    }
  };

  const isPending = createHabit.isPending || updateHabit.isPending;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      data-testid="habit-form-dialog"
    >
      <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
      <div
        ref={contentRef}
        className="relative z-50 w-full max-w-md max-h-[85vh] overflow-y-auto border bg-background p-6 shadow-lg rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col space-y-1.5 text-left">
          <h2 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
            {isEditing ? "Edit Habit" : (
              <>
                <Sparkles className="w-5 h-5 text-primary" />
                Create New Habit
              </>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isEditing 
              ? "Update your habit details below."
              : trackingMode === "simple"
                ? "Enter your habit details. You'll be able to check in daily right away."
                : "Enter your habit details. After creating, you'll answer a few questions to build a personalized action plan."}
          </p>
        </div>

        <button
          type="button"
          onClick={closeDialog}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          data-testid="button-close-dialog"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {hasReachedFreeLimit ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
              <Lock className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-base">You've used your free habit slot</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                The free plan includes 1 habit to get you started. Upgrade to Pro to create unlimited habits with full AI coaching.
              </p>
            </div>
            <Button
              onClick={() => { closeDialog(); setLocation('/paywall'); }}
              className="gap-2"
              data-testid="button-upgrade-habit-limit"
            >
              <Crown className="w-4 h-4" />
              Upgrade to Pro
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeDialog}
              className="text-muted-foreground"
            >
              Maybe later
            </Button>
          </div>
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="flex gap-3 items-start">
              <button
                type="button"
                className="flex-shrink-0 w-14 h-14 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors flex items-center justify-center bg-muted/30 hover:bg-muted/50"
                data-testid="button-customize-icon"
                title="Click to customize icon and color"
                onClick={() => setShowIconPicker(!showIconPicker)}
              >
                <span className="text-2xl leading-none">{selectedEmoji}</span>
              </button>
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Habit Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Exercise daily, Read more, Meditate" 
                        {...field} 
                        data-testid="input-habit-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground -mt-2">Click the icon to customize color and style</p>

            {showIconPicker && (
              <div className="border border-border rounded-lg p-3 bg-muted/20" data-testid="inline-icon-color-picker">
                <IconColorPicker
                  selectedIcon={customIcon}
                  selectedColor={customColor}
                  onIconChange={handleIconChange}
                  onColorChange={handleColorChange}
                />
                {isEditing && iconColorSaved && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-green-600 dark:text-green-400">
                    <Check className="w-3 h-3" />
                    Saved
                  </div>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your habit in more detail..."
                      className="resize-none"
                      {...field}
                      data-testid="input-habit-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Run a 5K, Read 20 books this year"
                      {...field}
                      data-testid="input-habit-goal"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Tracking Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTrackingMode("plan")}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center",
                      trackingMode === "plan"
                        ? "border-primary bg-primary/5 dark:bg-primary/10"
                        : "border-muted hover:border-muted-foreground/30"
                    )}
                    data-testid="button-mode-plan"
                  >
                    <Brain className="w-5 h-5 text-primary" />
                    <span className="text-sm font-semibold">AI Plan</span>
                    <span className="text-[0.7rem] text-muted-foreground leading-tight">AI builds a daily action plan with guided sessions</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrackingMode("simple")}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center",
                      trackingMode === "simple"
                        ? "border-primary bg-primary/5 dark:bg-primary/10"
                        : "border-muted hover:border-muted-foreground/30"
                    )}
                    data-testid="button-mode-simple"
                  >
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span className="text-sm font-semibold">Simple</span>
                    <span className="text-[0.7rem] text-muted-foreground leading-tight">Just check in daily — no plan or sessions needed</span>
                  </button>
                </div>
              </div>
            )}

            {((isEditing && habitToEdit?.trackingMode === "simple") || (!isEditing && trackingMode === "simple")) && (
              <div className="space-y-2" data-testid="tracked-items-section">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Tracked Items</label>
                  <span className="text-xs text-muted-foreground">{trackedItems.length}/20</span>
                </div>
                <p className="text-xs text-muted-foreground -mt-1">
                  Add things to measure each check-in (e.g. glasses of water, minutes, notes).
                </p>
                {trackedItems.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2" data-testid={`tracked-item-${idx}`}>
                    <div className="flex-shrink-0 w-7 h-7 rounded-md bg-muted/50 flex items-center justify-center">
                      {item.type === "count" ? <Hash className="w-3.5 h-3.5 text-muted-foreground" /> : 
                       item.type === "time" ? <Clock className="w-3.5 h-3.5 text-muted-foreground" /> : 
                       <Type className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                    <Input
                      value={item.name}
                      onChange={(e) => {
                        const updated = [...trackedItems];
                        updated[idx] = { ...item, name: e.target.value.slice(0, 50) };
                        setTrackedItems(updated);
                      }}
                      placeholder="Item name"
                      className="flex-1 h-9 text-sm"
                      data-testid={`input-tracked-item-name-${idx}`}
                    />
                    <Select
                      value={item.type}
                      onValueChange={(val) => {
                        const updated = [...trackedItems];
                        updated[idx] = { ...item, type: val as "count" | "time" | "text" };
                        setTrackedItems(updated);
                      }}
                    >
                      <SelectTrigger className="w-24 h-9 text-xs" data-testid={`select-tracked-item-type-${idx}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="count">Count</SelectItem>
                        <SelectItem value="time">Time</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => setTrackedItems(trackedItems.filter((_, i) => i !== idx))}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      data-testid={`button-remove-tracked-item-${idx}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {trackedItems.length < 20 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 text-xs"
                    onClick={() => setTrackedItems([...trackedItems, { id: crypto.randomUUID(), name: "", type: "count" }])}
                    data-testid="button-add-tracked-item"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add tracked item
                  </Button>
                )}
              </div>
            )}

            <Collapsible open={showSchedule} onOpenChange={setShowSchedule}>
              <CollapsibleTrigger asChild>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full justify-between"
                  data-testid="button-toggle-schedule"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Set Schedule
                  </span>
                  {showSchedule ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <SchedulePicker 
                  value={schedule} 
                  onChange={setSchedule}
                />
              </CollapsibleContent>
            </Collapsible>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isPending}
                className="gap-2"
                data-testid="button-submit-habit"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isEditing ? "Saving..." : "Creating..."}
                  </>
                ) : isEditing ? (
                  "Save Changes"
                ) : trackingMode === "simple" ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Create Habit
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Create & Setup
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
        )}
      </div>
    </div>
  );
}
