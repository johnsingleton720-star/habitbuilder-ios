import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertHabitSchema, type HabitSchedule } from "@shared/schema";
import { type HabitInput, type HabitResponse } from "@shared/routes";
import { useCreateHabit, useUpdateHabit } from "@/hooks/use-habits";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SchedulePicker } from "@/components/SchedulePicker";
import { useEffect, useState } from "react";
import { Loader2, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface HabitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habitToEdit?: HabitResponse;
}

export function HabitFormDialog({ open, onOpenChange, habitToEdit }: HabitFormDialogProps) {
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const isEditing = !!habitToEdit;
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedule, setSchedule] = useState<HabitSchedule | undefined>(habitToEdit?.schedule as HabitSchedule | undefined);

  const form = useForm<HabitInput>({
    resolver: zodResolver(insertHabitSchema),
    defaultValues: {
      title: "",
      description: "",
      goal: "",
      frequency: "daily",
    },
  });

  // Reset form when dialog opens/closes or habitToEdit changes
  useEffect(() => {
    if (open) {
      form.reset({
        title: habitToEdit?.title || "",
        description: habitToEdit?.description || "",
        goal: habitToEdit?.goal || "",
        frequency: habitToEdit?.frequency || "daily",
      });
      setSchedule(habitToEdit?.schedule as HabitSchedule | undefined);
      setShowSchedule(!!habitToEdit?.schedule);
    }
  }, [open, habitToEdit, form]);

  const onSubmit = async (data: HabitInput) => {
    try {
      const scheduleData = showSchedule && schedule?.days?.length ? schedule : undefined;
      
      if (isEditing && habitToEdit) {
        await updateHabit.mutateAsync({ 
          id: habitToEdit.id, 
          title: data.title,
          description: data.description,
          goal: data.goal,
          frequency: data.frequency,
          schedule: scheduleData,
        });
      } else {
        await createHabit.mutateAsync({
          ...data,
          schedule: scheduleData,
        } as HabitInput);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to submit habit:", error);
    }
  };

  const isPending = createHabit.isPending || updateHabit.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isEditing ? "Edit Habit" : "New Habit"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update your habit details below." 
              : "What positive routine do you want to build?"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Morning Meditation" {...field} className="h-11" />
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
                      placeholder="Why is this habit important?" 
                      className="resize-none min-h-[80px]" 
                      {...field} 
                      value={field.value || ""}
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
                      placeholder="e.g. Meditate 30 mins daily for 30 days" 
                      {...field} 
                      value={field.value || ""}
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
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
                    {showSchedule ? "Schedule Settings" : "Add Schedule (Optional)"}
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

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="min-w-[100px]">
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  isEditing ? "Save Changes" : "Create Habit"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
