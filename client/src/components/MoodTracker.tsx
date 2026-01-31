import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SmilePlus, Smile, Meh, Frown, AlertCircle, Zap, Brain, Moon, Lock, TrendingUp, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useHabits } from "@/hooks/use-habits";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

type MoodType = "great" | "good" | "okay" | "bad" | "terrible";

interface MoodOption {
  value: MoodType;
  label: string;
  icon: typeof Smile;
  color: string;
  bgColor: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  { value: "great", label: "Great", icon: SmilePlus, color: "text-green-600", bgColor: "bg-green-100" },
  { value: "good", label: "Good", icon: Smile, color: "text-emerald-600", bgColor: "bg-emerald-100" },
  { value: "okay", label: "Okay", icon: Meh, color: "text-amber-600", bgColor: "bg-amber-100" },
  { value: "bad", label: "Bad", icon: Frown, color: "text-orange-600", bgColor: "bg-orange-100" },
  { value: "terrible", label: "Terrible", icon: AlertCircle, color: "text-red-600", bgColor: "bg-red-100" },
];

interface MoodEntry {
  id: number;
  userId: string;
  date: string;
  mood: MoodType;
  energy?: number;
  stress?: number;
  sleep?: number;
  notes?: string;
  habitIds?: number[];
}

interface MoodInsights {
  message?: string;
  insights: string[];
  correlations: {
    habitId: number;
    habitTitle: string;
    correlation: string;
    timesCompleted: number;
  }[];
  stats?: {
    avgMood: number;
    avgEnergy: number;
    avgStress: number;
    totalEntries: number;
  };
}

export function MoodTracker() {
  const { user } = useAuth();
  const { data: habits } = useHabits();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [energy, setEnergy] = useState([3]);
  const [stress, setStress] = useState([3]);
  const [sleep, setSleep] = useState([3]);
  const [notes, setNotes] = useState("");
  const [selectedHabits, setSelectedHabits] = useState<number[]>([]);
  
  const isPremium = user?.subscriptionTier === 'premium' || user?.isAdmin;
  const today = format(new Date(), "yyyy-MM-dd");
  
  const { data: entries = [] } = useQuery<MoodEntry[]>({
    queryKey: ["/api/mood"],
  });
  
  const { data: insights } = useQuery<MoodInsights>({
    queryKey: ["/api/mood/insights"],
    enabled: Boolean(isPremium && entries.length >= 3),
  });
  
  const todayEntry = entries.find(e => e.date === today);
  
  const saveMoodMutation = useMutation({
    mutationFn: async (data: Partial<MoodEntry>) => {
      return await apiRequest("/api/mood", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mood"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mood/insights"] });
      toast({
        title: "Mood logged!",
        description: "Your mood has been recorded for today.",
      });
      setOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save mood",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const resetForm = () => {
    setSelectedMood(null);
    setEnergy([3]);
    setStress([3]);
    setSleep([3]);
    setNotes("");
    setSelectedHabits([]);
  };
  
  const handleSave = () => {
    if (!selectedMood) return;
    
    saveMoodMutation.mutate({
      date: today,
      mood: selectedMood,
      energy: energy[0],
      stress: stress[0],
      sleep: sleep[0],
      notes: notes || undefined,
      habitIds: selectedHabits,
    });
  };
  
  const toggleHabit = (habitId: number) => {
    setSelectedHabits(prev => 
      prev.includes(habitId) 
        ? prev.filter(id => id !== habitId)
        : [...prev, habitId]
    );
  };
  
  const recentMoods = entries.slice(-7).reverse();
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <SmilePlus className="w-5 h-5 text-primary" />
              Mood Tracker
              {!isPremium && <Badge variant="secondary" className="text-xs">Premium</Badge>}
            </CardTitle>
            <CardDescription>Track how you feel and find patterns</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                variant={todayEntry ? "outline" : "default"}
                data-testid="button-log-mood"
              >
                {todayEntry ? "Update Mood" : "Log Mood"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <SmilePlus className="w-5 h-5 text-primary" />
                  How are you feeling today?
                </DialogTitle>
                <DialogDescription>
                  Track your mood to discover patterns and correlations with your habits.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="flex justify-center gap-2">
                  {MOOD_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selectedMood === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setSelectedMood(option.value)}
                        className={cn(
                          "flex flex-col items-center gap-1 p-3 rounded-lg transition-all",
                          isSelected 
                            ? `${option.bgColor} ring-2 ring-primary scale-110` 
                            : "hover:bg-muted"
                        )}
                        data-testid={`button-mood-${option.value}`}
                      >
                        <Icon className={cn("w-8 h-8", option.color)} />
                        <span className={cn("text-xs font-medium", isSelected && option.color)}>
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                
                <AnimatePresence>
                  {selectedMood && isPremium && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-medium">Energy Level</span>
                          <span className="text-xs text-muted-foreground ml-auto">{energy[0]}/5</span>
                        </div>
                        <Slider
                          value={energy}
                          onValueChange={setEnergy}
                          min={1}
                          max={5}
                          step={1}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-purple-500" />
                          <span className="text-sm font-medium">Stress Level</span>
                          <span className="text-xs text-muted-foreground ml-auto">{stress[0]}/5</span>
                        </div>
                        <Slider
                          value={stress}
                          onValueChange={setStress}
                          min={1}
                          max={5}
                          step={1}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Moon className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium">Sleep Quality</span>
                          <span className="text-xs text-muted-foreground ml-auto">{sleep[0]}/5</span>
                        </div>
                        <Slider
                          value={sleep}
                          onValueChange={setSleep}
                          min={1}
                          max={5}
                          step={1}
                          className="w-full"
                        />
                      </div>
                      
                      {habits && habits.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-sm font-medium">Habits completed today</span>
                          <div className="flex flex-wrap gap-2">
                            {habits.map((habit: { id: number; title: string }) => (
                              <Badge
                                key={habit.id}
                                variant={selectedHabits.includes(habit.id) ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => toggleHabit(habit.id)}
                              >
                                {selectedHabits.includes(habit.id) && <Check className="w-3 h-3 mr-1" />}
                                {habit.title}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <span className="text-sm font-medium">Notes (optional)</span>
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="How are you feeling? What happened today?"
                          className="resize-none"
                          rows={2}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {!isPremium && selectedMood && (
                  <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Upgrade to Premium to track energy, stress, sleep, and get AI insights
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleSave} 
                  disabled={!selectedMood || saveMoodMutation.isPending}
                >
                  {saveMoodMutation.isPending ? "Saving..." : "Save Mood"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {recentMoods.length > 0 && (
          <div className="flex items-center gap-1">
            {recentMoods.map((entry) => {
              const option = MOOD_OPTIONS.find(o => o.value === entry.mood);
              if (!option) return null;
              const Icon = option.icon;
              return (
                <div
                  key={entry.id}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    option.bgColor
                  )}
                  title={`${format(new Date(entry.date), "MMM d")}: ${option.label}`}
                >
                  <Icon className={cn("w-4 h-4", option.color)} />
                </div>
              );
            })}
            {recentMoods.length < 7 && (
              <span className="text-xs text-muted-foreground ml-2">
                Last {recentMoods.length} days
              </span>
            )}
          </div>
        )}
        
        {recentMoods.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Start tracking your mood to see patterns
          </p>
        )}
        
        {isPremium && (insights as MoodInsights | undefined)?.correlations && (insights as MoodInsights).correlations.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">Mood Correlations</span>
            </div>
            <div className="space-y-2">
              {(insights as MoodInsights).correlations.slice(0, 3).map((corr: { habitId: number; habitTitle: string; correlation: string; timesCompleted: number }) => (
                <div key={corr.habitId} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{corr.habitTitle}</span>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-green-600" />
                    <span className="text-green-600 font-medium">{corr.correlation}% positive</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {!isPremium && (
          <div className="pt-3 border-t flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-4 h-4" />
            <span>Premium users can see mood-habit correlations and AI insights</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
