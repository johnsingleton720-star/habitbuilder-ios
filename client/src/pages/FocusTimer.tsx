import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Timer,
  Clock,
  Coffee,
  ArrowLeft,
  Flame,
  Target,
  Lock,
} from "lucide-react";
import { Link } from "wouter";
import type { Habit, FocusSession } from "@shared/schema";

const PRESETS = [
  { label: "15 min", value: 15 },
  { label: "25 min", value: 25 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = "sine";
    gain.gain.value = 0.3;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.stop(ctx.currentTime + 0.8);
  } catch {
  }
}

export default function FocusTimer() {
  const { features } = useSubscription();
  const { toast } = useToast();

  const [duration, setDuration] = useState(25);
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionType, setSessionType] = useState<"focus" | "break">("focus");
  const [selectedHabitId, setSelectedHabitId] = useState<string>("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [breakDuration, setBreakDuration] = useState(5);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const totalSeconds = sessionType === "focus" ? duration * 60 : breakDuration * 60;
  const progress = totalSeconds > 0 ? (totalSeconds - timeRemaining) / totalSeconds : 0;

  if (!features.hasFocusTimer) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-lg mx-auto pt-8">
          <div className="flex items-center gap-2 mb-6">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-locked">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold" data-testid="text-focus-locked-title">Focus Timer</h1>
          </div>
          <UpgradePrompt
            feature="Focus Timer"
            description="Use the Pomodoro technique to stay focused on your habits. Track your focus sessions and link them to your habits."
            variant="card"
          />
        </div>
      </div>
    );
  }

  const statsQuery = useQuery<{ totalMinutes: number; totalSessions: number; todayMinutes: number; todaySessions: number }>({
    queryKey: ["/api/focus-sessions/stats"],
  });

  const sessionsQuery = useQuery<FocusSession[]>({
    queryKey: ["/api/focus-sessions"],
  });

  const habitsQuery = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
  });

  const createSession = useMutation({
    mutationFn: async (data: { habitId?: number; title?: string; duration: number; breakDuration: number }) => {
      const res = await apiRequest("POST", "/api/focus-sessions", data);
      return res.json();
    },
    onSuccess: (session: FocusSession) => {
      setActiveSessionId(session.id);
      queryClient.invalidateQueries({ queryKey: ["/api/focus-sessions"] });
    },
  });

  const updateSession = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/focus-sessions/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/focus-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/focus-sessions/stats"] });
    },
  });

  const handleStart = useCallback(() => {
    if (!isRunning && !isPaused) {
      startTimeRef.current = Date.now();
      if (sessionType === "focus") {
        createSession.mutate({
          habitId: selectedHabitId ? parseInt(selectedHabitId) : undefined,
          title: sessionTitle || undefined,
          duration,
          breakDuration,
        });
      }
    }
    setIsRunning(true);
    setIsPaused(false);
  }, [isRunning, isPaused, sessionType, selectedHabitId, sessionTitle, duration, breakDuration, createSession]);

  const handlePause = useCallback(() => {
    setIsRunning(false);
    setIsPaused(true);
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 60000);
    setElapsedMinutes(prev => prev + elapsed);
    startTimeRef.current = Date.now();
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeRemaining(sessionType === "focus" ? duration * 60 : breakDuration * 60);
    setElapsedMinutes(0);
    if (activeSessionId && sessionType === "focus") {
      updateSession.mutate({ id: activeSessionId, updates: { status: "cancelled" } });
    }
    setActiveSessionId(null);
    setShowNotes(false);
  }, [sessionType, duration, breakDuration, activeSessionId, updateSession]);

  const handleComplete = useCallback(() => {
    playBeep();

    if (sessionType === "focus") {
      const completedMin = Math.max(1, Math.round((totalSeconds - timeRemaining + (isRunning ? (Date.now() - startTimeRef.current) / 1000 : 0)) / 60));
      if (activeSessionId) {
        updateSession.mutate({
          id: activeSessionId,
          updates: { status: "completed", completedDuration: Math.min(completedMin, duration) },
        });
      }
      setShowNotes(true);
      toast({
        title: "Focus session complete!",
        description: `Great work! You focused for ${Math.min(completedMin, duration)} minutes.`,
      });
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Focus Session Complete", { body: "Time for a break!" });
      }
    } else {
      toast({
        title: "Break is over!",
        description: "Ready for another focus session?",
      });
    }

    setIsRunning(false);
    setIsPaused(false);
    setElapsedMinutes(0);
  }, [sessionType, totalSeconds, timeRemaining, isRunning, activeSessionId, duration, updateSession, toast]);

  const handleSkipToBreak = useCallback(() => {
    const completedMin = Math.max(1, Math.round((totalSeconds - timeRemaining) / 60));
    if (activeSessionId) {
      updateSession.mutate({
        id: activeSessionId,
        updates: { status: "completed", completedDuration: completedMin },
      });
    }
    setIsRunning(false);
    setIsPaused(false);
    setActiveSessionId(null);
    setSessionType("break");
    setTimeRemaining(breakDuration * 60);
    setElapsedMinutes(0);
    setShowNotes(false);
  }, [totalSeconds, timeRemaining, activeSessionId, breakDuration, updateSession]);

  const handleStartBreak = useCallback(() => {
    setSessionType("break");
    setTimeRemaining(breakDuration * 60);
    setShowNotes(false);
    setActiveSessionId(null);
    setIsRunning(true);
    setIsPaused(false);
    startTimeRef.current = Date.now();
  }, [breakDuration]);

  const handleNewSession = useCallback(() => {
    setSessionType("focus");
    setTimeRemaining(duration * 60);
    setIsRunning(false);
    setIsPaused(false);
    setShowNotes(false);
    setActiveSessionId(null);
    setElapsedMinutes(0);
    setSessionNotes("");
  }, [duration]);

  const handleSaveNotes = useCallback(() => {
    if (activeSessionId && sessionNotes.trim()) {
      updateSession.mutate({
        id: activeSessionId,
        updates: { notes: sessionNotes.trim() },
      });
    }
    setShowNotes(false);
    setSessionNotes("");
  }, [activeSessionId, sessionNotes, updateSession]);

  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, handleComplete]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const selectPreset = (mins: number) => {
    if (isRunning || isPaused) return;
    setDuration(mins);
    setTimeRemaining(mins * 60);
  };

  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference * (1 - progress);

  const stats = statsQuery.data;
  const sessions = sessionsQuery.data || [];
  const habits = habitsQuery.data || [];
  const completedSessions = sessions.filter(s => s.status === "completed");

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold" data-testid="text-focus-title">Focus Timer</h1>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card data-testid="card-today-stats">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Today</span>
              </div>
              {statsQuery.isLoading ? (
                <Skeleton className="h-6 w-16 mx-auto" />
              ) : (
                <>
                  <p className="text-lg font-bold" data-testid="text-today-minutes">{stats?.todayMinutes || 0} min</p>
                  <p className="text-xs text-muted-foreground" data-testid="text-today-sessions">{stats?.todaySessions || 0} sessions</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card data-testid="card-total-stats">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Target className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">All Time</span>
              </div>
              {statsQuery.isLoading ? (
                <Skeleton className="h-6 w-16 mx-auto" />
              ) : (
                <>
                  <p className="text-lg font-bold" data-testid="text-total-minutes">{stats?.totalMinutes || 0} min</p>
                  <p className="text-xs text-muted-foreground" data-testid="text-total-sessions">{stats?.totalSessions || 0} sessions</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200/50 dark:border-amber-800/30" data-testid="card-timer">
          <CardContent className="p-6 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              {sessionType === "focus" ? (
                <Badge variant="secondary" className="gap-1" data-testid="badge-focus">
                  <Timer className="w-3 h-3" />
                  Focus
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" data-testid="badge-break">
                  <Coffee className="w-3 h-3" />
                  Break
                </Badge>
              )}
            </div>

            <div className="relative w-64 h-64 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 260 260">
                <circle
                  cx="130"
                  cy="130"
                  r="120"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-muted/20"
                />
                <circle
                  cx="130"
                  cy="130"
                  r="120"
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className={sessionType === "focus" ? "stroke-amber-500 dark:stroke-amber-400" : "stroke-emerald-500 dark:stroke-emerald-400"}
                  style={{ transition: "stroke-dashoffset 0.5s ease" }}
                />
                <defs>
                  <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </linearGradient>
                </defs>
              </svg>

              <div className={`flex flex-col items-center z-10 ${isRunning ? "animate-pulse" : ""}`} style={{ animationDuration: "3s" }}>
                <span className="text-5xl font-mono font-bold tracking-tight" data-testid="text-time-display">
                  {formatTime(timeRemaining)}
                </span>
                <span className="text-sm text-muted-foreground mt-1">
                  {sessionType === "focus" ? `${duration} min session` : `${breakDuration} min break`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-center">
              {!isRunning && !isPaused && timeRemaining === totalSeconds ? (
                <Button onClick={handleStart} className="gap-1.5" data-testid="button-start">
                  <Play className="w-4 h-4" />
                  Start
                </Button>
              ) : isRunning ? (
                <Button onClick={handlePause} variant="secondary" className="gap-1.5" data-testid="button-pause">
                  <Pause className="w-4 h-4" />
                  Pause
                </Button>
              ) : isPaused ? (
                <Button onClick={handleStart} className="gap-1.5" data-testid="button-resume">
                  <Play className="w-4 h-4" />
                  Resume
                </Button>
              ) : null}

              {(isRunning || isPaused) && (
                <Button onClick={handleReset} variant="outline" size="icon" data-testid="button-reset">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}

              {sessionType === "focus" && (isRunning || isPaused) && (
                <Button onClick={handleSkipToBreak} variant="outline" className="gap-1.5" data-testid="button-skip-break">
                  <SkipForward className="w-4 h-4" />
                  Break
                </Button>
              )}

              {timeRemaining === 0 && sessionType === "focus" && !showNotes && (
                <Button onClick={handleStartBreak} variant="outline" className="gap-1.5" data-testid="button-start-break">
                  <Coffee className="w-4 h-4" />
                  Start Break
                </Button>
              )}

              {timeRemaining === 0 && (
                <Button onClick={handleNewSession} className="gap-1.5" data-testid="button-new-session">
                  <Play className="w-4 h-4" />
                  New Session
                </Button>
              )}
            </div>

            {!isRunning && !isPaused && timeRemaining === totalSeconds && sessionType === "focus" && (
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {PRESETS.map(p => (
                  <Button
                    key={p.value}
                    variant={duration === p.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => selectPreset(p.value)}
                    className="toggle-elevate"
                    data-testid={`button-preset-${p.value}`}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {showNotes && (
          <Card data-testid="card-session-notes">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Session Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="How did this session go? What did you accomplish?"
                value={sessionNotes}
                onChange={e => setSessionNotes(e.target.value)}
                className="resize-none"
                rows={3}
                data-testid="input-session-notes"
              />
              <div className="flex items-center gap-2">
                <Button onClick={handleSaveNotes} size="sm" data-testid="button-save-notes">
                  Save Notes
                </Button>
                <Button onClick={() => { setShowNotes(false); setSessionNotes(""); }} variant="ghost" size="sm" data-testid="button-skip-notes">
                  Skip
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!isRunning && !isPaused && timeRemaining === totalSeconds && sessionType === "focus" && (
          <Card data-testid="card-session-config">
            <CardContent className="p-4 space-y-3">
              {habits.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Link to Habit</label>
                  <Select value={selectedHabitId} onValueChange={setSelectedHabitId}>
                    <SelectTrigger data-testid="select-habit">
                      <SelectValue placeholder="No habit linked" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No habit linked</SelectItem>
                      {habits.map(h => (
                        <SelectItem key={h.id} value={String(h.id)} data-testid={`select-habit-${h.id}`}>
                          {h.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Session Title (optional)</label>
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={e => setSessionTitle(e.target.value)}
                  placeholder="e.g., Deep work on project"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  data-testid="input-session-title"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {completedSessions.length > 0 && (
          <Card data-testid="card-session-history">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Recent Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {completedSessions.slice(0, 10).map(session => (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-2 py-2 border-b border-border/50 last:border-0"
                  data-testid={`session-item-${session.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {session.title || "Focus Session"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.completedAt ? new Date(session.completedAt).toLocaleDateString() : ""}
                      {session.notes ? ` - ${session.notes.substring(0, 40)}...` : ""}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0" data-testid={`badge-duration-${session.id}`}>
                    {session.completedDuration || 0} min
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
