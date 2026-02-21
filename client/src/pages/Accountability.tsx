import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Clock, 
  Check, 
  X, 
  Loader2, 
  Lock,
  Flame,
  Trophy,
  Send,
  Trash2,
  Share2,
  Eye,
  EyeOff,
  ArrowLeft,
  Settings,
  FileText,
  Timer,
  Target,
  Calendar,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import type { Habit, AccountabilityPartner, SharingSettings } from "@shared/schema";
import { defaultSharingSettings } from "@shared/schema";
import { usePageTitle } from "@/hooks/use-page-title";

interface PartnerWithProgress extends AccountabilityPartner {
  mySharedHabits?: { habitId: number; title: string }[];
}

interface SharedHabitDetail {
  habitId: number;
  title: string;
  streak?: number;
  longestStreak?: number;
  totalTimeSpent?: number;
  totalSessions?: number;
  recentProgress?: { date: string; tasksCompleted: number; totalTasks: number; mood?: string }[];
  recentNotes?: { date: string; notes: string }[];
  currentPlan?: { totalTasks: number; planDuration: string } | null;
}

interface SharedWithMeItem {
  partnerId: number;
  inviterName: string;
  inviterEmail: string;
  habits: SharedHabitDetail[];
  sharingSettings: SharingSettings;
  partnerSharingSettings: SharingSettings;
  partnerHabitIds: number[];
}

const REFETCH_INTERVAL = 30000;

function SharingSettingsDialog({ 
  partnerId, 
  currentSettings, 
  currentHabitIds,
  allHabits,
  isPartnerSide,
  onClose 
}: { 
  partnerId: number;
  currentSettings: SharingSettings;
  currentHabitIds: number[];
  allHabits: Habit[];
  isPartnerSide: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SharingSettings>({ ...currentSettings });
  const [selectedHabits, setSelectedHabits] = useState<number[]>([...currentHabitIds]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const endpoint = isPartnerSide 
        ? `/api/accountability-partners/${partnerId}/partner-sharing-settings`
        : `/api/accountability-partners/${partnerId}/sharing-settings`;
      await apiRequest("PATCH", endpoint, { 
        sharingSettings: settings, 
        habitIds: selectedHabits 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accountability-partners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accountability-partners/shared-with-me"] });
      toast({ title: "Settings Updated", description: "Your sharing preferences have been saved." });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Could not save settings. Try again.", variant: "destructive" });
    },
  });

  const toggleSetting = (key: keyof SharingSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleHabit = (habitId: number) => {
    setSelectedHabits(prev => 
      prev.includes(habitId) ? prev.filter(id => id !== habitId) : [...prev, habitId]
    );
  };

  const settingLabels: { key: keyof SharingSettings; label: string; description: string; icon: any }[] = [
    { key: "showStreaks", label: "Streaks", description: "Current and longest streak counts", icon: Flame },
    { key: "showCompletions", label: "Daily Progress", description: "Completion status and mood for recent days", icon: Target },
    { key: "showNotes", label: "Session Notes", description: "Notes written during habit sessions", icon: MessageSquare },
    { key: "showTimeSpent", label: "Time Invested", description: "Total time spent on habits", icon: Timer },
    { key: "showActionPlans", label: "Action Plans", description: "Current plan overview and task count", icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium mb-3">What your partner can see:</h4>
        <div className="space-y-3">
          {settingLabels.map(({ key, label, description, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
              <Switch
                checked={settings[key]}
                onCheckedChange={() => toggleSetting(key)}
                data-testid={`switch-sharing-${key}`}
              />
            </div>
          ))}
        </div>
      </div>

      {allHabits.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Habits to share:</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
            {allHabits.map(habit => (
              <div key={habit.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`share-habit-${habit.id}`}
                  checked={selectedHabits.includes(habit.id)}
                  onCheckedChange={() => toggleHabit(habit.id)}
                  data-testid={`checkbox-share-habit-${habit.id}`}
                />
                <label htmlFor={`share-habit-${habit.id}`} className="text-sm cursor-pointer">
                  {habit.title}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button 
          onClick={() => updateMutation.mutate()} 
          disabled={updateMutation.isPending}
          data-testid="button-save-sharing-settings"
        >
          {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}

function ProgressTimeline({ progress }: { progress: { date: string; tasksCompleted: number; totalTasks: number; mood?: string }[] }) {
  if (!progress || progress.length === 0) return null;

  const moodColors: Record<string, string> = {
    great: "bg-green-500",
    good: "bg-emerald-400",
    okay: "bg-yellow-400",
    struggling: "bg-orange-400",
  };

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground mb-2">Recent Activity</p>
      <div className="flex gap-1">
        {progress.map((entry, i) => {
          const pct = entry.totalTasks > 0 ? Math.round((entry.tasksCompleted / entry.totalTasks) * 100) : 0;
          const date = new Date(entry.date);
          const dayLabel = date.toLocaleDateString(undefined, { weekday: 'short' });
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1" data-testid={`progress-day-${entry.date}`}>
              <div className="text-[10px] text-muted-foreground">{dayLabel}</div>
              <div 
                className={`w-full h-6 rounded-sm flex items-center justify-center text-[10px] font-medium ${
                  pct === 100 ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 
                  pct > 0 ? 'bg-primary/10 text-primary' : 
                  'bg-muted text-muted-foreground'
                }`}
              >
                {pct > 0 ? `${pct}%` : '-'}
              </div>
              {entry.mood && (
                <div className={`w-2 h-2 rounded-full ${moodColors[entry.mood] || 'bg-muted'}`} title={entry.mood} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SharedHabitCard({ habit, settings }: { habit: SharedHabitDetail; settings: SharingSettings }) {
  const [showNotes, setShowNotes] = useState(false);

  return (
    <div className="p-4 border rounded-md space-y-3" data-testid={`shared-habit-${habit.habitId}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-primary" />
          <span className="font-medium">{habit.title}</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {settings.showStreaks && habit.streak !== undefined && (
            <div className="flex items-center gap-1 text-sm">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>{habit.streak} day streak</span>
              {habit.longestStreak !== undefined && habit.longestStreak > 0 && (
                <span className="text-xs text-muted-foreground">(best: {habit.longestStreak})</span>
              )}
            </div>
          )}
          {settings.showTimeSpent && habit.totalTimeSpent !== undefined && habit.totalTimeSpent > 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Timer className="w-4 h-4" />
              <span>{Math.floor(habit.totalTimeSpent / 60)}h {habit.totalTimeSpent % 60}m</span>
            </div>
          )}
        </div>
      </div>

      {settings.showCompletions && habit.recentProgress && habit.recentProgress.length > 0 && (
        <ProgressTimeline progress={habit.recentProgress} />
      )}

      {settings.showCompletions && habit.totalSessions !== undefined && (
        <p className="text-xs text-muted-foreground">
          {habit.totalSessions} total sessions completed
        </p>
      )}

      {settings.showActionPlans && habit.currentPlan && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="w-3 h-3" />
          <span>{habit.currentPlan.totalTasks} tasks in {habit.currentPlan.planDuration} plan</span>
        </div>
      )}

      {settings.showNotes && habit.recentNotes && habit.recentNotes.length > 0 && (
        <div>
          <button
            className="flex items-center gap-1 text-xs text-primary hover:underline"
            onClick={() => setShowNotes(!showNotes)}
            data-testid={`toggle-notes-${habit.habitId}`}
          >
            <MessageSquare className="w-3 h-3" />
            {showNotes ? 'Hide' : 'Show'} {habit.recentNotes.length} recent note(s)
            {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showNotes && (
            <div className="mt-2 space-y-2">
              {habit.recentNotes.map((note, i) => (
                <div key={i} className="pl-3 border-l-2 border-primary/30 text-sm">
                  <p className="text-xs text-muted-foreground">{new Date(note.date).toLocaleDateString()}</p>
                  <p>{note.notes}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Accountability() {
  usePageTitle("Accountability", "Connect with accountability partners to stay motivated. Share progress and support each other's habit goals.");
  const { isPremium, canUseFeature } = useSubscription();
  const { toast } = useToast();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [selectedHabits, setSelectedHabits] = useState<number[]>([]);
  const [settingsPartnerId, setSettingsPartnerId] = useState<number | null>(null);

  const { data: partners, isLoading: isLoadingPartners } = useQuery<PartnerWithProgress[]>({
    queryKey: ["/api/accountability-partners"],
    enabled: isPremium,
    refetchInterval: REFETCH_INTERVAL,
  });

  const { data: habits } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
    enabled: isPremium,
  });

  const { data: sharedWithMe, isLoading: isLoadingShared } = useQuery<SharedWithMeItem[]>({
    queryKey: ["/api/accountability-partners/shared-with-me"],
    enabled: isPremium,
    refetchInterval: REFETCH_INTERVAL,
  });

  const invitePartnerMutation = useMutation({
    mutationFn: async (data: { email: string; name: string; habitIds: number[] }) => {
      const res = await apiRequest("POST", "/api/accountability-partners/invite", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accountability-partners"] });
      toast({
        title: "Invitation Sent",
        description: `An invitation has been sent to ${inviteEmail}`,
      });
      setIsInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setSelectedHabits([]);
    },
    onError: () => {
      toast({
        title: "Invitation Failed",
        description: "Could not send invitation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const removePartnerMutation = useMutation({
    mutationFn: async (partnerId: number) => {
      await apiRequest("DELETE", `/api/accountability-partners/${partnerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accountability-partners"] });
      toast({
        title: "Partner Removed",
        description: "The accountability partner has been removed.",
      });
    },
  });

  const sendUpdateMutation = useMutation({
    mutationFn: async (partnerId: number) => {
      const res = await apiRequest("POST", `/api/accountability-partners/${partnerId}/send-update`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Update Sent",
        description: "Your progress update has been sent to your partner.",
      });
    },
    onError: () => {
      toast({
        title: "Send Failed",
        description: "Could not send update. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleInvite = () => {
    if (!inviteEmail) {
      toast({
        title: "Email Required",
        description: "Please enter your partner's email address.",
        variant: "destructive",
      });
      return;
    }
    if (selectedHabits.length === 0) {
      toast({
        title: "Select Habits",
        description: "Please select at least one habit to share with your partner.",
        variant: "destructive",
      });
      return;
    }
    invitePartnerMutation.mutate({
      email: inviteEmail,
      name: inviteName,
      habitIds: selectedHabits,
    });
  };

  const toggleHabitSelection = (habitId: number) => {
    setSelectedHabits((prev) =>
      prev.includes(habitId)
        ? prev.filter((id) => id !== habitId)
        : [...prev, habitId]
    );
  };

  const getSettingsPartner = () => {
    if (settingsPartnerId === null) return null;
    return partners?.find(p => p.id === settingsPartnerId) || null;
  };


  if (!isPremium) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-4xl">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
        </div>
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <Lock className="w-16 h-16 mx-auto text-muted-foreground" />
            <h2 className="text-2xl font-bold">Social Accountability</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Invite accountability partners to track your progress, send weekly updates, 
              and stay motivated together.
            </p>
            <Badge variant="secondary" className="text-sm">
              Premium Feature
            </Badge>
            <div className="pt-4">
              <Button asChild>
                <a href="/paywall">Upgrade to Premium</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const settingsPartner = getSettingsPartner();

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl space-y-6">
      <div className="mb-2">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            Accountability Partners
          </h1>
          <p className="text-muted-foreground mt-1">
            Share your progress and stay motivated together
          </p>
        </div>

        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-invite-partner">
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Partner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Accountability Partner</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Partner's Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="partner@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  data-testid="input-partner-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Partner's Name (optional)</Label>
                <Input
                  id="name"
                  placeholder="John"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  data-testid="input-partner-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Share Progress For These Habits</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {habits?.map((habit) => (
                    <div key={habit.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`habit-${habit.id}`}
                        checked={selectedHabits.includes(habit.id)}
                        onCheckedChange={() => toggleHabitSelection(habit.id)}
                        data-testid={`checkbox-habit-${habit.id}`}
                      />
                      <label
                        htmlFor={`habit-${habit.id}`}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {habit.title}
                      </label>
                    </div>
                  ))}
                  {(!habits || habits.length === 0) && (
                    <p className="text-sm text-muted-foreground">No habits to share yet</p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleInvite}
                disabled={invitePartnerMutation.isPending}
                data-testid="button-send-invite"
              >
                {invitePartnerMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sharing Settings Dialog - for inviter managing their own sharing */}
      <Dialog open={settingsPartnerId !== null} onOpenChange={(open) => !open && setSettingsPartnerId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Sharing Settings
            </DialogTitle>
          </DialogHeader>
          {settingsPartner && habits && (
            <SharingSettingsDialog
              partnerId={settingsPartner.id}
              currentSettings={(settingsPartner.sharingSettings as SharingSettings) || defaultSharingSettings}
              currentHabitIds={settingsPartner.habitIds || []}
              allHabits={habits}
              isPartnerSide={false}
              onClose={() => setSettingsPartnerId(null)}
            />
          )}
        </DialogContent>
      </Dialog>


      <Tabs defaultValue="partners" className="space-y-4">
        <TabsList>
          <TabsTrigger value="partners" data-testid="tab-partners">My Partners</TabsTrigger>
          <TabsTrigger value="shared" data-testid="tab-shared">
            Shared With Me
            {sharedWithMe && sharedWithMe.length > 0 && (
              <Badge variant="secondary" className="ml-2 no-default-hover-elevate no-default-active-elevate">
                {sharedWithMe.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="partners" className="space-y-4">
          {isLoadingPartners ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : partners && partners.length > 0 ? (
            <div className="grid gap-4">
              <AnimatePresence>
                {partners.map((partner, i) => (
                  <motion.div
                    key={partner.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-medium">
                                {partner.partnerName || partner.partnerEmail}
                              </h3>
                              <p className="text-sm text-muted-foreground">{partner.partnerEmail}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge
                                  variant={
                                    partner.status === "accepted"
                                      ? "default"
                                      : partner.status === "pending"
                                      ? "secondary"
                                      : "destructive"
                                  }
                                >
                                  {partner.status === "accepted" && <Check className="w-3 h-3 mr-1" />}
                                  {partner.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                                  {partner.status === "declined" && <X className="w-3 h-3 mr-1" />}
                                  {partner.status}
                                </Badge>
                                {partner.mySharedHabits && partner.mySharedHabits.length > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    Sharing {partner.mySharedHabits.length} habit(s)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {partner.status === "accepted" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSettingsPartnerId(partner.id)}
                                  data-testid={`button-sharing-settings-${partner.id}`}
                                >
                                  <Settings className="w-4 h-4 mr-1" />
                                  Sharing
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => sendUpdateMutation.mutate(partner.id)}
                                  disabled={sendUpdateMutation.isPending}
                                  data-testid={`button-send-update-${partner.id}`}
                                >
                                  <Send className="w-4 h-4 mr-1" />
                                  Email Update
                                </Button>
                              </>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removePartnerMutation.mutate(partner.id)}
                              data-testid={`button-remove-partner-${partner.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        {partner.status === "accepted" && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <Eye className="w-4 h-4" />
                              <span>You're sharing:</span>
                              {((partner.sharingSettings as SharingSettings) || defaultSharingSettings).showStreaks && <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-xs">Streaks</Badge>}
                              {((partner.sharingSettings as SharingSettings) || defaultSharingSettings).showCompletions && <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-xs">Progress</Badge>}
                              {((partner.sharingSettings as SharingSettings) || defaultSharingSettings).showNotes && <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-xs">Notes</Badge>}
                              {((partner.sharingSettings as SharingSettings) || defaultSharingSettings).showTimeSpent && <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-xs">Time</Badge>}
                              {((partner.sharingSettings as SharingSettings) || defaultSharingSettings).showActionPlans && <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-xs">Plans</Badge>}
                            </div>
                            
                            {partner.mySharedHabits && partner.mySharedHabits.length > 0 && (
                              <div className="mt-3">
                                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                  <Share2 className="w-4 h-4 text-primary" />
                                  Habits You're Sharing
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {partner.mySharedHabits.map((habit) => (
                                    <Badge key={habit.habitId} variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                                      {habit.title}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {(!partner.mySharedHabits || partner.mySharedHabits.length === 0) && partner.status === "accepted" && (
                              <div className="mt-3">
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                  <EyeOff className="w-4 h-4" />
                                  No habits shared yet. Use Sharing settings to select habits to share.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Partners Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Invite someone to hold you accountable on your habit journey
                </p>
                <Button onClick={() => setIsInviteOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Your First Partner
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="shared" className="space-y-4">
          {isLoadingShared ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : sharedWithMe && sharedWithMe.length > 0 ? (
            <div className="grid gap-4">
              {sharedWithMe.map((item) => (
                <Card key={item.partnerId}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base" data-testid={`text-sharer-name-${item.partnerId}`}>
                            {item.inviterName}
                          </CardTitle>
                          <CardDescription>{item.inviterEmail}</CardDescription>
                        </div>
                      </div>
                      
                    </div>
                  </CardHeader>
                  <CardContent>
                    {item.habits.length > 0 ? (
                      <div className="space-y-3">
                        {item.habits.map((habit) => (
                          <SharedHabitCard 
                            key={habit.habitId} 
                            habit={habit} 
                            settings={item.sharingSettings} 
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No shared habits from this partner yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Share2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Shared Progress Yet</h3>
                <p className="text-muted-foreground">
                  When someone invites you as their accountability partner and shares their progress, it will appear here automatically.
                </p>
              </CardContent>
            </Card>
          )}

          {sharedWithMe && sharedWithMe.length > 0 && (
            <p className="text-xs text-center text-muted-foreground">
              Progress updates automatically every 30 seconds
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
