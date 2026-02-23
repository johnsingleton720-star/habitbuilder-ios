import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSubscription } from "@/hooks/use-subscription";
import { usePageTitle } from "@/hooks/use-page-title";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trash2,
  Plus,
  X,
  BookOpen,
  Loader2,
  Lock,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Crown,
} from "lucide-react";
import { Link } from "wouter";
import { format, addDays, subDays, parseISO } from "date-fns";
import type { JournalEntry } from "@shared/schema";

const MOOD_OPTIONS = [
  { value: "great", icon: "star", label: "Great", color: "text-emerald-500" },
  { value: "good", icon: "smile", label: "Good", color: "text-green-500" },
  { value: "okay", icon: "meh", label: "Okay", color: "text-amber-500" },
  { value: "bad", icon: "frown", label: "Bad", color: "text-orange-500" },
  { value: "terrible", icon: "cloud-rain", label: "Terrible", color: "text-red-500" },
];

function MoodIcon({ mood, className }: { mood: string; className?: string }) {
  const iconMap: Record<string, string> = {
    great: "text-emerald-500",
    good: "text-green-500",
    okay: "text-amber-500",
    bad: "text-orange-500",
    terrible: "text-red-500",
  };
  const labelMap: Record<string, string> = {
    great: "Great",
    good: "Good",
    okay: "Okay",
    bad: "Bad",
    terrible: "Terrible",
  };
  return (
    <span className={`font-medium ${iconMap[mood] || "text-muted-foreground"} ${className || ""}`}>
      {labelMap[mood] || mood}
    </span>
  );
}

export default function Journal() {
  usePageTitle("Daily Journal", "Write daily reflections and get AI-generated insights about your habits and mood patterns.");
  const { features } = useSubscription();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showPastEntries, setShowPastEntries] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef("");

  const isPremium = features.hasGoals;

  if (!features.hasJournal) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4 md:p-8 font-body">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back-dashboard">
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
          </div>
          <Card data-testid="card-journal-locked">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Daily Journal</h2>
              <p className="text-muted-foreground max-w-md mb-6">
                Write daily reflections and get AI-generated insights about your habits and mood patterns. Available on Pro and Premium plans.
              </p>
              <UpgradePrompt feature="Daily Journal" description="Unlock journaling with AI insights" variant="card" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { data: currentEntry, isLoading: isLoadingEntry } = useQuery<JournalEntry | null>({
    queryKey: ["/api/journal", selectedDate],
  });

  const { data: recentEntries, isLoading: isLoadingRecent } = useQuery<JournalEntry[]>({
    queryKey: ["/api/journal"],
  });

  useEffect(() => {
    if (currentEntry) {
      setContent(currentEntry.content || "");
      setMood(currentEntry.mood || "");
      setTags((currentEntry.tags as string[]) || []);
      lastSavedContentRef.current = currentEntry.content || "";
    } else if (!isLoadingEntry) {
      setContent("");
      setMood("");
      setTags([]);
      lastSavedContentRef.current = "";
    }
    setHasUnsavedChanges(false);
  }, [currentEntry, isLoadingEntry, selectedDate]);

  const saveMutation = useMutation({
    mutationFn: async (data: { date: string; content: string; mood: string; tags: string[] }) => {
      const res = await apiRequest("POST", "/api/journal", data);
      return res.json();
    },
    onSuccess: (data: JournalEntry) => {
      lastSavedContentRef.current = data.content;
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journal", selectedDate] });
    },
    onError: () => {
      toast({ title: "Failed to save", description: "Could not save your journal entry. Please try again.", variant: "destructive" });
    },
  });

  const insightsMutation = useMutation({
    mutationFn: async (entryId: number) => {
      const res = await apiRequest("POST", `/api/journal/${entryId}/insights`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      toast({ title: "Insights generated", description: "AI has analyzed your journal entry." });
    },
    onError: () => {
      toast({ title: "Failed to generate insights", variant: "destructive" });
    },
  });

  const fullAnalysisMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/journal/full-analysis", {});
      return res.json();
    },
    onSuccess: (data: { analysis: string }) => {
      toast({ title: "Full analysis ready", description: "AI has analyzed all your journal entries." });
      queryClient.invalidateQueries({ queryKey: ["/api/journal", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
    },
    onError: () => {
      toast({ title: "Failed to generate analysis", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (entryId: number) => {
      await apiRequest("DELETE", `/api/journal/${entryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journal", selectedDate] });
      setContent("");
      setMood("");
      setTags([]);
      toast({ title: "Entry deleted" });
    },
  });

  const saveEntry = useCallback(() => {
    if (!content.trim() && !mood) return;
    if (content === lastSavedContentRef.current && mood === (currentEntry?.mood || "") && JSON.stringify(tags) === JSON.stringify((currentEntry?.tags as string[]) || [])) return;
    saveMutation.mutate({ date: selectedDate, content, mood, tags });
  }, [content, mood, tags, selectedDate, currentEntry, saveMutation]);

  const debouncedSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setHasUnsavedChanges(true);
    saveTimerRef.current = setTimeout(() => {
      saveEntry();
    }, 2000);
  }, [saveEntry]);

  const handleContentChange = (value: string) => {
    setContent(value);
    debouncedSave();
  };

  const handleMoodChange = (newMood: string) => {
    setMood(newMood === mood ? "" : newMood);
    setTimeout(() => saveEntry(), 100);
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      setTags(newTags);
      setTagInput("");
      if (content.trim()) {
        saveMutation.mutate({ date: selectedDate, content, mood, tags: newTags });
      }
    }
  };

  const removeTag = (tag: string) => {
    const newTags = tags.filter(t => t !== tag);
    setTags(newTags);
    if (content.trim()) {
      saveMutation.mutate({ date: selectedDate, content, mood, tags: newTags });
    }
  };

  const goToPrevDay = () => {
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveEntry(); }
    setSelectedDate(format(subDays(parseISO(selectedDate), 1), "yyyy-MM-dd"));
  };
  const goToNextDay = () => {
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveEntry(); }
    setSelectedDate(format(addDays(parseISO(selectedDate), 1), "yyyy-MM-dd"));
  };
  const goToToday = () => {
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveEntry(); }
    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
  };

  const selectEntry = (date: string) => {
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveEntry(); }
    setSelectedDate(date);
    setShowPastEntries(false);
  };

  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");
  const displayDate = format(parseISO(selectedDate), "EEEE, MMMM d, yyyy");
  const sortedRecent = recentEntries ? [...recentEntries].sort((a, b) => b.date.localeCompare(a.date)) : [];

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 md:p-8 font-body">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-indigo-500" />
                Daily Journal
              </h1>
              <p className="text-sm text-muted-foreground">Reflect on your day and discover patterns</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700" data-testid="badge-unsaved">
                Unsaved
              </Badge>
            )}
            {saveMutation.isPending && (
              <Badge variant="outline" className="text-muted-foreground" data-testid="badge-saving">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Saving
              </Badge>
            )}
          </div>
        </div>

        {sortedRecent.length > 0 && (
          <div className="lg:hidden">
            <button
              onClick={() => setShowPastEntries(!showPastEntries)}
              className="flex items-center gap-2 w-full text-left text-sm font-medium text-muted-foreground p-2 rounded-md hover-elevate"
              data-testid="button-toggle-past-entries"
            >
              <BookOpen className="w-4 h-4" />
              Past Entries ({sortedRecent.length})
              {showPastEntries ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
            </button>
            {showPastEntries && (
              <Card className="mt-2" data-testid="card-mobile-past-entries">
                <CardContent className="p-2 max-h-60 overflow-y-auto space-y-1">
                  {sortedRecent.slice(0, 20).map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => selectEntry(entry.date)}
                      className={`w-full text-left p-2.5 rounded-md transition-colors cursor-pointer ${
                        entry.date === selectedDate
                          ? "bg-indigo-100/60 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800"
                          : "hover-elevate"
                      }`}
                      data-testid={`button-entry-mobile-${entry.date}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {format(parseISO(entry.date), "MMM d, yyyy")}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {entry.mood && <MoodIcon mood={entry.mood} className="text-xs" />}
                          {entry.aiInsights && <Sparkles className="w-3 h-3 text-indigo-400" />}
                        </div>
                      </div>
                      <p className="text-sm text-foreground mt-0.5 line-clamp-1">
                        {entry.content.substring(0, 60)}{entry.content.length > 60 ? "..." : ""}
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-indigo-200/50 dark:border-indigo-800/30" data-testid="card-journal-editor">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={goToPrevDay} data-testid="button-prev-day">
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <button
                    onClick={goToToday}
                    className="text-sm font-medium text-foreground cursor-pointer"
                    data-testid="button-go-today"
                  >
                    {displayDate}
                  </button>
                  <Button variant="ghost" size="icon" onClick={goToNextDay} disabled={isToday} data-testid="button-next-day">
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
                {!isToday && (
                  <Button variant="outline" size="sm" onClick={goToToday} data-testid="button-today">
                    Today
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingEntry ? (
                  <Skeleton className="h-40 w-full" />
                ) : (
                  <Textarea
                    placeholder="How was your day? What did you accomplish? What's on your mind..."
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    onBlur={() => { if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); } saveEntry(); }}
                    className="min-h-[200px] resize-none text-base leading-relaxed border-0 focus-visible:ring-1 focus-visible:ring-indigo-300 dark:focus-visible:ring-indigo-700"
                    data-testid="textarea-journal-content"
                  />
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">How are you feeling?</p>
                  <div className="flex flex-wrap gap-2">
                    {MOOD_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        variant={mood === option.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleMoodChange(option.value)}
                        className={`gap-1.5 ${mood === option.value ? "bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-700" : ""}`}
                        data-testid={`button-mood-${option.value}`}
                      >
                        <MoodIcon mood={option.value} className="text-xs" />
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Tags</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1" data-testid={`badge-tag-${tag}`}>
                        {tag}
                        <button onClick={() => removeTag(tag)} data-testid={`button-remove-tag-${tag}`}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    <div className="flex items-center gap-1">
                      <Input
                        placeholder="Add tag..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                        className="h-8 w-28 text-sm"
                        data-testid="input-tag"
                      />
                      <Button variant="ghost" size="icon" onClick={addTag} className="h-8 w-8" data-testid="button-add-tag">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-border">
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => saveEntry()}
                      disabled={saveMutation.isPending || (!content.trim() && !mood)}
                      size="sm"
                      data-testid="button-save-entry"
                    >
                      {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                      Save Entry
                    </Button>
                    {currentEntry && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insightsMutation.mutate(currentEntry.id)}
                        disabled={insightsMutation.isPending}
                        className="gap-1.5 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                        data-testid="button-get-insights"
                      >
                        {insightsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        AI Insights
                      </Button>
                    )}
                    {isPremium && recentEntries && recentEntries.length >= 3 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fullAnalysisMutation.mutate()}
                        disabled={fullAnalysisMutation.isPending}
                        className="gap-1.5 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800"
                        data-testid="button-full-analysis"
                      >
                        {fullAnalysisMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                        Full Analysis
                      </Button>
                    )}
                  </div>
                  {currentEntry && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(currentEntry.id)}
                      disabled={deleteMutation.isPending}
                      className="text-destructive"
                      data-testid="button-delete-entry"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {currentEntry?.aiInsights && (
              <Card className="border-indigo-200/50 dark:border-indigo-800/30 bg-gradient-to-br from-indigo-50/50 to-violet-50/30 dark:from-indigo-950/20 dark:to-violet-950/10" data-testid="card-ai-insights">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                    <Sparkles className="w-4 h-4" />
                    AI Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap" data-testid="text-ai-insights">
                    {currentEntry.aiInsights}
                  </p>
                </CardContent>
              </Card>
            )}

            {fullAnalysisMutation.data && (
              <Card className="border-violet-200/50 dark:border-violet-800/30 bg-gradient-to-br from-violet-50/50 to-purple-50/30 dark:from-violet-950/20 dark:to-purple-950/10" data-testid="card-full-analysis">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-violet-700 dark:text-violet-300">
                    <Crown className="w-4 h-4" />
                    Full Journal Analysis
                    <Badge variant="secondary" className="text-[10px]">Premium</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap" data-testid="text-full-analysis">
                    {fullAnalysisMutation.data.analysis}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="hidden lg:block space-y-4">
            <Card data-testid="card-recent-entries">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Recent Entries</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                {isLoadingRecent ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))
                ) : sortedRecent.length > 0 ? (
                  sortedRecent.slice(0, 20).map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => selectEntry(entry.date)}
                      className={`w-full text-left p-3 rounded-md transition-colors cursor-pointer ${
                        entry.date === selectedDate
                          ? "bg-indigo-100/60 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800"
                          : "hover-elevate"
                      }`}
                      data-testid={`button-entry-${entry.date}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {format(parseISO(entry.date), "MMM d")}
                        </span>
                        {entry.mood && <MoodIcon mood={entry.mood} className="text-xs" />}
                      </div>
                      <p className="text-sm text-foreground mt-1 line-clamp-2">
                        {entry.content.substring(0, 80)}{entry.content.length > 80 ? "..." : ""}
                      </p>
                      {entry.aiInsights && (
                        <div className="flex items-center gap-1 mt-1">
                          <Sparkles className="w-3 h-3 text-indigo-400" />
                          <span className="text-[10px] text-indigo-500 dark:text-indigo-400">Has insights</span>
                        </div>
                      )}
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No entries yet. Start writing today!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
