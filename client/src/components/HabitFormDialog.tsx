import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type HabitSchedule } from "@shared/schema";
import { type HabitResponse } from "@shared/routes";
import { useCreateHabit, useUpdateHabit, useHabits } from "@/hooks/use-habits";
import { useSubscription } from "@/hooks/use-subscription";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SchedulePicker } from "@/components/SchedulePicker";
import { IconColorPicker, ICON_OPTIONS } from "@/components/IconColorPicker";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Calendar, ChevronDown, ChevronUp, Sparkles, Star, Crown, Lock, ArrowRight } from "lucide-react";
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
  const [showSchedule, setShowSchedule] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [schedule, setSchedule] = useState<HabitSchedule | undefined>(habitToEdit?.schedule as HabitSchedule | undefined);
  const [customIcon, setCustomIcon] = useState<string>("Star");
  const [customColor, setCustomColor] = useState<string>("#0d9488");
  
  // Get the selected icon component
  const SelectedIcon = ICON_OPTIONS.find(i => i.name === customIcon)?.icon || Star;

  const form = useForm<HabitFormData>({
    resolver: zodResolver(habitFormSchema),
    defaultValues: {
      title: "",
      description: "",
      goal: "",
      category: "",
    },
  });

  useEffect(() => {
    if (open) {
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
    }
  }, [open, habitToEdit, initialValues, form]);

  const onSubmit = async (data: HabitFormData) => {
    try {
      const scheduleData = showSchedule && schedule?.days?.length ? schedule : undefined;
      
      if (isEditing && habitToEdit) {
        await updateHabit.mutateAsync({ 
          id: habitToEdit.id, 
          title: data.title,
          description: data.description || null,
          goal: data.goal || null,
          schedule: scheduleData,
          customIcon,
          customColor,
          category: data.category || null,
        });
        onOpenChange(false);
      } else {
        const newHabit = await createHabit.mutateAsync({
          title: data.title,
          description: data.description || null,
          goal: data.goal || null,
          schedule: scheduleData,
          customIcon,
          customColor,
          category: data.category || null,
        });
        onOpenChange(false);
        if (newHabit?.id) {
          setLocation(`/habit/${newHabit.id}`);
        }
      }
    } catch (error) {
      console.error("Failed to submit habit:", error);
    }
  };

  const isPending = createHabit.isPending || updateHabit.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? "Edit Habit" : (
              <>
                <Sparkles className="w-5 h-5 text-primary" />
                Create New Habit
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update your habit details below."
              : "Enter your habit details. After creating, you'll answer a few questions to build a personalized action plan."}
          </DialogDescription>
        </DialogHeader>

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
              onClick={() => { onOpenChange(false); setLocation('/paywall'); }}
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
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground"
            >
              Maybe later
            </Button>
          </div>
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Icon/Color Picker with Title */}
            <div className="flex gap-3 items-start">
              <button
                type="button"
                className="flex-shrink-0 w-14 h-14 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors flex items-center justify-center bg-muted/30 hover:bg-muted/50"
                data-testid="button-customize-icon"
                title="Click to customize icon and color"
                onClick={() => setShowIconPicker(!showIconPicker)}
              >
                <SelectedIcon className="w-7 h-7" style={{ color: customColor }} />
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
                  onIconChange={(icon) => {
                    setCustomIcon(icon);
                  }}
                  onColorChange={(color) => {
                    setCustomColor(color);
                  }}
                />
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
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
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Create & Setup
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        )}
        </DialogContent>
    </Dialog>
  );
}
