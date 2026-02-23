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
  PenLine,
  FilePlus,
} from "lucide-react";
import { Link } from "wouter";
import { format, addDays, subDays, parseISO } from "date-fns";
import type { JournalEntry } from "@shared/schema";

const MOOD_OPTIONS = [
  { value: "great", label: "Great" },
  { value: "good", label: "Good" },
  { value: "okay", label: "Okay" },
  { value: "bad", label: "Bad" },
  { value: "terrible", label: "Terrible" },
];

function MoodIcon({ mood, className }: { mood: string; className?: string }) {
  const colorMap: Record<string, string> = {
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
    <span className={`font-medium ${colorMap[mood] || "text-muted-foreground"} ${className || ""}`}>
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
  const [showPastEntries, setShowPastEntries] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);

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

  const { data: todayEntries, isLoading: isLoadingToday } = useQuery<JournalEntry[]>({
    queryKey: ["/api/journal", selectedDate],
  });

  const { data: allEntries, isLoading: isLoadingAll } = useQuery<JournalEntry[]>({
    queryKey: ["/api/journal"],
  });

  const clearEditor = () => {
    setContent("");
    setMood("");
    setTags([]);
    setEditingEntryId(null);
    setViewingEntry(null);
  };

  useEffect(() => {
    clearEditor();
  }, [selectedDate]);

  const loadEntryForEditing = (entry: JournalEntry) => {
    setContent(entry.content || "");
    setMood(entry.mood || "");
    setTags((entry.tags as string[]) || []);
    setEditingEntryId(entry.id);
    setViewingEntry(entry);
    setShowPastEntries(false);
    if (entry.date !== selectedDate) {
      setSelectedDate(entry.date);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: { date: string; content: string; mood: string; tags: string[] }) => {
      const res = await apiRequest("POST", "/api/journal", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journal", selectedDate] });
      clearEditor();
      toast({ title: "Entry saved", description: "Your journal entry has been saved." });
    },
    onError: () => {
      toast({ title: "Failed to save", description: "Could not save your journal entry. Please try again.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; content: string; mood: string; tags: string[] }) => {
      const res = await apiRequest("PUT", `/api/journal/${data.id}`, {
        content: data.content,
        mood: data.mood,
        tags: data.tags,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journal", selectedDate] });
      clearEditor();
      toast({ title: "Entry updated", description: "Your journal entry has been updated." });
    },
    onError: () => {
      toast({ title: "Failed to update", description: "Could not update your journal entry.", variant: "destructive" });
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
      clearEditor();
      toast({ title: "Entry deleted" });
    },
  });

  const handleSave = () => {
    if (!content.trim() && !mood) return;
    if (editingEntryId) {
      updateMutation.mutate({ id: editingEntryId, content, mood, tags });
    } else {
      saveMutation.mutate({ date: selectedDate, content, mood, tags });
    }
  };

  const handleMoodChange = (newMood: string) => {
    setMood(newMood === mood ? "" : newMood);
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const goToPrevDay = () => setSelectedDate(format(subDays(parseISO(selectedDate), 1), "yyyy-MM-dd"));
  const goToNextDay = () => setSelectedDate(format(addDays(parseISO(selectedDate), 1), "yyyy-MM-dd"));
  const goToToday = () => setSelectedDate(format(new Date(), "yyyy-MM-dd"));

  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");
  const displayDate = format(parseISO(selectedDate), "EEEE, MMMM d, yyyy");
  const isSaving = saveMutation.isPending || updateMutation.isPending;

  const sortedAllEntries = allEntries ? [...allEntries].sort((a, b) => b.date.localeCompare(a.date) || new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()) : [];
  const todayEntriesList = todayEntries || [];

  const renderEntryItem = (entry: JournalEntry, isMobile: boolean) => {
    const isSelected = editingEntryId === entry.id;
    const prefix = isMobile ? "mobile" : "desktop";
    return (
      <button
        key={entry.id}
        onClick={() => loadEntryForEditing(entry)}
        className={`w-full text-left p-2.5 rounded-md transition-colors cursor-pointer ${
          isSelected
            ? "bg-indigo-100/60 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800"
            : "hover:bg-muted/50"
        }`}
        data-testid={`button-entry-${prefix}-${entry.id}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {format(parseISO(entry.date), "MMM d, yyyy")}
            {entry.createdAt && (
              <span className="ml-1 text-muted-foreground/60">
                {format(new Date(entry.createdAt), "h:mm a")}
              </span>
            )}
          </span>
          <div className="flex items-center gap-1.5">
            {entry.mood && <MoodIcon mood={entry.mood} className="text-xs" />}
            {entry.aiInsights && <Sparkles className="w-3 h-3 text-indigo-400" />}
          </div>
        </div>
        <p className="text-sm text-foreground mt-0.5 line-clamp-2">
          {entry.content.substring(0, 80)}{entry.content.length > 80 ? "..." : ""}
        </p>
      </button>
    );
  };

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
            {isSaving && (
              <Badge variant="outline" className="text-muted-foreground" data-testid="badge-saving">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Saving
              </Badge>
            )}
          </div>
        </div>

        {sortedAllEntries.length > 0 && (
          <div className="lg:hidden">
            <button
              onClick={() => setShowPastEntries(!showPastEntries)}
              className="flex items-center gap-2 w-full text-left text-sm font-medium text-muted-foreground p-2 rounded-md hover:bg-muted/50"
              data-testid="button-toggle-past-entries"
            >
              <BookOpen className="w-4 h-4" />
              Past Entries ({sortedAllEntries.length})
              {showPastEntries ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
            </button>
            {showPastEntries && (
              <Card className="mt-2" data-testid="card-mobile-past-entries">
                <CardContent className="p-2 max-h-60 overflow-y-auto space-y-1">
                  {sortedAllEntries.slice(0, 30).map((entry) => renderEntryItem(entry, true))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {todayEntriesList.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
              Entries for {format(parseISO(selectedDate), "MMM d, yyyy")} ({todayEntriesList.length})
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {todayEntriesList.map((entry) => (
                <Card
                  key={entry.id}
                  className={`cursor-pointer transition-colors ${
                    editingEntryId === entry.id
                      ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50/30 dark:bg-indigo-950/20"
                      : "hover:border-muted-foreground/20"
                  }`}
                  onClick={() => loadEntryForEditing(entry)}
                  data-testid={`card-today-entry-${entry.id}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">
                        {entry.createdAt && format(new Date(entry.createdAt), "h:mm a")}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {entry.mood && <MoodIcon mood={entry.mood} className="text-xs" />}
                        {entry.aiInsights && <Sparkles className="w-3 h-3 text-indigo-400" />}
                      </div>
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">{entry.content}</p>
                    {entry.tags && (entry.tags as string[]).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(entry.tags as string[]).slice(0, 3).map(t => (
                          <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
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
                <div className="flex items-center gap-2">
                  {editingEntryId && (
                    <Badge variant="outline" className="text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700 gap-1">
                      <PenLine className="w-3 h-3" />
                      Editing
                    </Badge>
                  )}
                  {!isToday && !editingEntryId && (
                    <Button variant="outline" size="sm" onClick={goToToday} data-testid="button-today">
                      Today
                    </Button>
                  )}
                  {editingEntryId && (
                    <Button variant="outline" size="sm" onClick={clearEditor} className="gap-1" data-testid="button-new-entry">
                      <FilePlus className="w-4 h-4" />
                      New Entry
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingToday ? (
                  <Skeleton className="h-40 w-full" />
                ) : (
                  <Textarea
                    placeholder="How was your day? What did you accomplish? What's on your mind..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
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
                      onClick={handleSave}
                      disabled={isSaving || (!content.trim() && !mood)}
                      size="sm"
                      data-testid="button-save-entry"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                      {editingEntryId ? "Update Entry" : "Save Entry"}
                    </Button>
                    {editingEntryId && viewingEntry && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insightsMutation.mutate(editingEntryId)}
                        disabled={insightsMutation.isPending}
                        className="gap-1.5 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                        data-testid="button-get-insights"
                      >
                        {insightsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        AI Insights
                      </Button>
                    )}
                    {isPremium && allEntries && allEntries.length >= 3 && (
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
                  {editingEntryId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(editingEntryId)}
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

            {viewingEntry?.aiInsights && (
              <Card className="border-indigo-200/50 dark:border-indigo-800/30 bg-gradient-to-br from-indigo-50/50 to-violet-50/30 dark:from-indigo-950/20 dark:to-violet-950/10" data-testid="card-ai-insights">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                    <Sparkles className="w-4 h-4" />
                    AI Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap" data-testid="text-ai-insights">
                    {viewingEntry.aiInsights}
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
              <CardContent className="space-y-1 max-h-[600px] overflow-y-auto">
                {isLoadingAll ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))
                ) : sortedAllEntries.length > 0 ? (
                  sortedAllEntries.slice(0, 30).map((entry) => renderEntryItem(entry, false))
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
