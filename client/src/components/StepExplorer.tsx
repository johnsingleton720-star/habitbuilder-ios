import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Check, MessageSquare } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Habit, HabitStep, StepOption } from "@shared/schema";

interface StepExplorerProps {
  habit: Habit;
  step: HabitStep;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedStep: HabitStep) => void;
}

export function StepExplorer({ habit, step, open, onOpenChange, onSave }: StepExplorerProps) {
  const [options, setOptions] = useState<StepOption[]>(step.options || []);
  const [customResponse, setCustomResponse] = useState(step.customResponse || "");
  const [hasGenerated, setHasGenerated] = useState((step.options?.length ?? 0) > 0);
  const queryClient = useQueryClient();

  const generateOptions = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/generate-step-options", {
        habitTitle: habit.title,
        stepText: step.text,
        stepId: step.id,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setOptions(data.options || []);
      setHasGenerated(true);
    },
  });

  const toggleOption = (optionId: string) => {
    setOptions((prev) =>
      prev.map((opt) =>
        opt.id === optionId ? { ...opt, selected: !opt.selected } : opt
      )
    );
  };

  const handleSave = () => {
    const updatedStep: HabitStep = {
      ...step,
      explored: true,
      options,
      customResponse,
    };
    onSave(updatedStep);
    onOpenChange(false);
  };

  const selectedCount = options.filter((o) => o.selected).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Explore This Step
          </DialogTitle>
          <DialogDescription className="text-base font-medium text-foreground mt-2">
            {step.text}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!hasGenerated ? (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 mx-auto text-primary/30 mb-4" />
              <p className="text-muted-foreground mb-4">
                Let AI help you explore this step with personalized options
              </p>
              <Button
                onClick={() => generateOptions.mutate()}
                disabled={generateOptions.isPending}
                data-testid="button-generate-options"
              >
                {generateOptions.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating options...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Options
                  </>
                )}
              </Button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Select all that apply
                  </Label>
                  {selectedCount > 0 && (
                    <span className="text-xs text-primary font-medium">
                      {selectedCount} selected
                    </span>
                  )}
                </div>

                <div className="grid gap-3">
                  {options.map((option, index) => (
                    <motion.div
                      key={option.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <label
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          option.selected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30 hover:bg-muted/30"
                        }`}
                        data-testid={`option-${option.id}`}
                      >
                        <Checkbox
                          checked={option.selected}
                          onCheckedChange={() => toggleOption(option.id)}
                          className="mt-0.5"
                        />
                        <span className="text-sm leading-relaxed">
                          {option.text}
                        </span>
                      </label>
                    </motion.div>
                  ))}
                </div>

                <div className="pt-4 border-t">
                  <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4" />
                    Add your own thoughts
                  </Label>
                  <Textarea
                    placeholder="Write anything else that comes to mind..."
                    value={customResponse}
                    onChange={(e) => setCustomResponse(e.target.value)}
                    className="min-h-[80px] resize-none"
                    data-testid="input-custom-response"
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasGenerated || (selectedCount === 0 && !customResponse.trim())}
            data-testid="button-save-exploration"
          >
            <Check className="w-4 h-4 mr-2" />
            Save My Answers
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
