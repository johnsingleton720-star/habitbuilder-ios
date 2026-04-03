import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Lock, ChevronDown, ChevronUp, Loader2, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProfileData {
  chronotype: string;
  weeklyHours: string;
  pastObstacles: string;
  energyLevels: string;
  peakFocusTime: string;
  scheduleUnpredictable: string;
  idealWeek: string;
  anythingElse: string;
}

const BLANK: ProfileData = {
  chronotype: "",
  weeklyHours: "",
  pastObstacles: "",
  energyLevels: "",
  peakFocusTime: "",
  scheduleUnpredictable: "",
  idealWeek: "",
  anythingElse: "",
};

export function AiContextProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<ProfileData>(BLANK);

  const { data, isLoading } = useQuery<{ profile: Record<string, string> | null }>({
    queryKey: ["/api/user/ai-context"],
    enabled: isOpen,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (data?.profile) {
      setForm({ ...BLANK, ...data.profile } as ProfileData);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (profile: ProfileData) => {
      const res = await apiRequest("POST", "/api/user/ai-context", { profile });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/ai-context"] });
      toast({ title: "Saved", description: "Your AI coaching profile has been updated." });
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    },
  });

  const set = (key: keyof ProfileData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Card data-testid="card-ai-context-profile">
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setIsOpen((v) => !v)}
        data-testid="button-toggle-ai-context"
      >
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            About Me — AI Coaching Profile
          </span>
          {isOpen
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </CardTitle>
        <CardDescription>
          Optional. Your answers help the AI coach give you more relevant, personalised guidance.
        </CardDescription>
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-5">
          <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/15 px-3 py-2.5">
            <Lock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your answers are private and only used to personalise your AI coaching. They are never shown to other users or sold.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-5">

              <div className="space-y-1.5" data-testid="field-chronotype">
                <p className="text-sm font-medium">Are you more of a morning person or a night owl?</p>
                <Select value={form.chronotype} onValueChange={(v) => set("chronotype", v)}>
                  <SelectTrigger data-testid="select-chronotype">
                    <SelectValue placeholder="Choose one…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="early_bird">Early bird — sharpest before 9am</SelectItem>
                    <SelectItem value="morning">Morning person — best before midday</SelectItem>
                    <SelectItem value="midday">Midday — I hit my stride around noon</SelectItem>
                    <SelectItem value="afternoon">Afternoon — I warm up after lunch</SelectItem>
                    <SelectItem value="evening">Evening — I come alive after 6pm</SelectItem>
                    <SelectItem value="night_owl">Night owl — best work done late at night</SelectItem>
                    <SelectItem value="varies">It varies a lot</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5" data-testid="field-weekly-hours">
                <p className="text-sm font-medium">Roughly how many hours a week do you work or study?</p>
                <Select value={form.weeklyHours} onValueChange={(v) => set("weeklyHours", v)}>
                  <SelectTrigger data-testid="select-weekly-hours">
                    <SelectValue placeholder="Choose one…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under_20">Under 20 hours</SelectItem>
                    <SelectItem value="20_30">20–30 hours</SelectItem>
                    <SelectItem value="30_40">30–40 hours</SelectItem>
                    <SelectItem value="40_50">40–50 hours</SelectItem>
                    <SelectItem value="over_50">Over 50 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5" data-testid="field-past-obstacles">
                <p className="text-sm font-medium">What has made it hardest to stick to habits in the past?</p>
                <Select value={form.pastObstacles} onValueChange={(v) => set("pastObstacles", v)}>
                  <SelectTrigger data-testid="select-past-obstacles">
                    <SelectValue placeholder="Choose the biggest one…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="motivation">Losing motivation after the first week</SelectItem>
                    <SelectItem value="time">Not enough time</SelectItem>
                    <SelectItem value="forgot">Simply forgetting</SelectItem>
                    <SelectItem value="all_or_nothing">All-or-nothing thinking — miss one day, give up</SelectItem>
                    <SelectItem value="stress">Life getting in the way (stress, illness, travel)</SelectItem>
                    <SelectItem value="boring">The habit felt boring or like a chore</SelectItem>
                    <SelectItem value="too_hard">The plan was too ambitious</SelectItem>
                    <SelectItem value="other">Something else</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5" data-testid="field-energy-levels">
                <p className="text-sm font-medium">How would you describe your current energy levels day-to-day?</p>
                <Select value={form.energyLevels} onValueChange={(v) => set("energyLevels", v)}>
                  <SelectTrigger data-testid="select-energy-levels">
                    <SelectValue placeholder="Choose one…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High — consistently energetic</SelectItem>
                    <SelectItem value="moderate">Moderate — steady through the day</SelectItem>
                    <SelectItem value="variable">Variable — good days and tough days</SelectItem>
                    <SelectItem value="low">Low — often tired or drained</SelectItem>
                    <SelectItem value="morning_peak">High in the morning, drops later</SelectItem>
                    <SelectItem value="afternoon_peak">Low in the morning, peaks in the afternoon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5" data-testid="field-peak-focus">
                <p className="text-sm font-medium">What time of day do you feel most focused and productive?</p>
                <Select value={form.peakFocusTime} onValueChange={(v) => set("peakFocusTime", v)}>
                  <SelectTrigger data-testid="select-peak-focus">
                    <SelectValue placeholder="Choose one…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="early_morning">Early morning (before 7am)</SelectItem>
                    <SelectItem value="morning">Morning (7am–noon)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (noon–5pm)</SelectItem>
                    <SelectItem value="evening">Evening (5pm–9pm)</SelectItem>
                    <SelectItem value="late_night">Late night (after 9pm)</SelectItem>
                    <SelectItem value="no_clear">No clear peak</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5" data-testid="field-schedule-unpredictable">
                <p className="text-sm font-medium">Do you have regular commitments that make your schedule unpredictable?</p>
                <Select value={form.scheduleUnpredictable} onValueChange={(v) => set("scheduleUnpredictable", v)}>
                  <SelectTrigger data-testid="select-schedule-unpredictable">
                    <SelectValue placeholder="Choose one…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="very_consistent">No — my schedule is very consistent</SelectItem>
                    <SelectItem value="mostly_consistent">Mostly consistent with occasional exceptions</SelectItem>
                    <SelectItem value="somewhat_variable">Somewhat variable week to week</SelectItem>
                    <SelectItem value="very_variable">Very variable — hard to plan ahead</SelectItem>
                    <SelectItem value="shift_work">Shift work or irregular hours</SelectItem>
                    <SelectItem value="carer">Caring responsibilities that can change daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5" data-testid="field-ideal-week">
                <p className="text-sm font-medium">What does your ideal habit-building week look like?</p>
                <Textarea
                  placeholder="e.g. Short sessions every morning before work, with weekends a bit more flexible…"
                  value={form.idealWeek}
                  onChange={(e) => set("idealWeek", e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="resize-none text-sm"
                  data-testid="textarea-ideal-week"
                />
              </div>

              <div className="space-y-1.5" data-testid="field-anything-else">
                <p className="text-sm font-medium">Is there anything else you'd like your AI coach to know about you?</p>
                <Textarea
                  placeholder="e.g. I have ADHD so I need very small steps. I travel for work one week a month…"
                  value={form.anythingElse}
                  onChange={(e) => set("anythingElse", e.target.value)}
                  maxLength={1000}
                  rows={4}
                  className="resize-none text-sm"
                  data-testid="textarea-anything-else"
                />
              </div>

              <Button
                className="w-full gap-2"
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending}
                data-testid="button-save-ai-context"
              >
                {saveMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Save className="w-4 h-4" />}
                {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
