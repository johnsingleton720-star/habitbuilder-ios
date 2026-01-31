import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type HabitSchedule } from "@shared/schema";
import { type HabitResponse } from "@shared/routes";
import { useCreateHabit, useUpdateHabit } from "@/hooks/use-habits";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SchedulePicker } from "@/components/SchedulePicker";
import { IconColorPicker } from "@/components/IconColorPicker";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Calendar, ChevronDown, ChevronUp, Sparkles, Palette } from "lucide-react";
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
  const [showSchedule, setShowSchedule] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [schedule, setSchedule] = useState<HabitSchedule | undefined>(habitToEdit?.schedule as HabitSchedule | undefined);
  const [customIcon, setCustomIcon] = useState<string>("Star");
  const [customColor, setCustomColor] = useState<string>("#0d9488");

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
      setShowCustomize(!!habitToEdit?.customIcon || !!habitToEdit?.customColor);
    }
  }, [open, habitToEdit, initialValues, form]);

  const onSubmit = async (data: HabitFormData) => {
    try {
      const scheduleData = showSchedule && schedule?.days?.length ? schedule : undefined;
      const customization = showCustomize ? { customIcon, customColor, category: data.category } : { category: data.category };
      
      if (isEditing && habitToEdit) {
        await updateHabit.mutateAsync({ 
          id: habitToEdit.id, 
          title: data.title,
          description: data.description || null,
          goal: data.goal || null,
          schedule: scheduleData,
          ...customization,
        });
        onOpenChange(false);
      } else {
        const newHabit = await createHabit.mutateAsync({
          title: data.title,
          description: data.description || null,
          goal: data.goal || null,
          schedule: scheduleData,
          ...customization,
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
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

            <Collapsible open={showCustomize} onOpenChange={setShowCustomize}>
              <CollapsibleTrigger asChild>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full justify-between"
                  data-testid="button-toggle-customize"
                >
                  <span className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Customize Icon & Color
                  </span>
                  {showCustomize ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Choose an icon and color for your habit</p>
                  <IconColorPicker
                    selectedIcon={customIcon}
                    selectedColor={customColor}
                    onIconChange={setCustomIcon}
                    onColorChange={setCustomColor}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

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
      </DialogContent>
    </Dialog>
  );
}
