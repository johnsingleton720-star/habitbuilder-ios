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
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import type { Habit, AccountabilityPartner } from "@shared/schema";

interface PartnerWithProgress extends AccountabilityPartner {
  sharedHabits?: { habitId: number; title: string; streak: number; lastActive: string }[];
}

export default function Accountability() {
  const { isPremium, canUseFeature } = useSubscription();
  const { toast } = useToast();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [selectedHabits, setSelectedHabits] = useState<number[]>([]);

  const { data: partners, isLoading: isLoadingPartners } = useQuery<PartnerWithProgress[]>({
    queryKey: ["/api/accountability-partners"],
    enabled: isPremium,
  });

  const { data: habits } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
    enabled: isPremium,
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
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
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

      <Tabs defaultValue="partners" className="space-y-4">
        <TabsList>
          <TabsTrigger value="partners" data-testid="tab-partners">My Partners</TabsTrigger>
          <TabsTrigger value="progress" data-testid="tab-progress">Shared Progress</TabsTrigger>
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
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-medium">
                                {partner.partnerName || partner.partnerEmail}
                              </h3>
                              <p className="text-sm text-muted-foreground">{partner.partnerEmail}</p>
                              <div className="flex items-center gap-2 mt-1">
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
                                {partner.habitIds && (
                                  <span className="text-xs text-muted-foreground">
                                    Sharing {partner.habitIds.length} habit(s)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {partner.status === "accepted" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendUpdateMutation.mutate(partner.id)}
                                disabled={sendUpdateMutation.isPending}
                                data-testid={`button-send-update-${partner.id}`}
                              >
                                <Send className="w-4 h-4 mr-1" />
                                Send Update
                              </Button>
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

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Your Shared Progress
              </CardTitle>
              <CardDescription>
                What your partners can see about your habit activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {habits && habits.length > 0 ? (
                <div className="space-y-4">
                  {habits.map((habit) => (
                    <div
                      key={habit.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">{habit.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span>{habit.currentStreak || 0} day streak</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {partners?.filter((p) => p.habitIds?.includes(habit.id)).length || 0} partner(s)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Create some habits to share with your partners
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Weekly Summary Preview</CardTitle>
              <CardDescription>
                This is what gets sent to your partners when you share an update
              </CardDescription>
            </CardHeader>
            <CardContent className="bg-muted/50 rounded-lg p-4">
              <div className="space-y-3">
                <p className="font-medium">Hi there!</p>
                <p className="text-sm">
                  Here's my weekly habit progress summary:
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  {habits?.slice(0, 3).map((habit) => (
                    <li key={habit.id}>
                      <strong>{habit.title}</strong>: {habit.currentStreak || 0} day streak,{" "}
                      {Math.floor((habit.totalTimeSpent || 0) / 60)}h {(habit.totalTimeSpent || 0) % 60}m invested
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-muted-foreground italic">
                  Sent via Habit Builder
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
