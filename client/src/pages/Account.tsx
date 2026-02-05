import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePaymentStatus } from "@/hooks/use-payment";
import { useSubscription } from "@/hooks/use-subscription";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Camera, Check, Crown, LogOut, Mail, Shield, Calendar, Sparkles, CreditCard, Loader2, ExternalLink, MessageSquare, Settings, BarChart3, Users, Eye, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { FeedbackForm } from "@/components/FeedbackForm";
import { ThemeSelector } from "@/components/ThemeSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useHabits } from "@/hooks/use-habits";
import { format } from "date-fns";

export default function Account() {
  const { user, logout } = useAuth();
  const { hasPaid, isTrialActive, trialEndsAt } = usePaymentStatus();
  const { tier, isPro, isPremium } = useSubscription();
  const { data: habits } = useHabits();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [analyticsRange, setAnalyticsRange] = useState<"7d" | "30d" | "90d">("7d");

  interface AdminAnalytics {
    totalPageViews: number;
    uniqueVisitors: number;
    loggedInUsers: number;
    totalRegisteredUsers: number;
    newRegistrations: number;
    freeTrialUsers: number;
    newFreeTrialSignups: number;
    pagesByPath: { path: string; count: number }[];
    viewsByDay: { date: string; count: number }[];
    topReferrers: { referrer: string; count: number }[];
    timeRange: string;
  }

  const { data: adminAnalytics, isLoading: isLoadingAnalytics } = useQuery<AdminAnalytics>({
    queryKey: ["/api/admin/analytics", analyticsRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics?range=${analyticsRange}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: user?.isAdmin === true,
  });

  const totalCompletions = habits?.reduce((acc, habit) => acc + (habit.progress?.length || 0), 0) || 0;
  const totalHabits = habits?.length || 0;

  interface CommunityProfile {
    profileVisible: boolean;
    allowMessages: boolean;
    allowProfileLikes: boolean;
    showHabitProgress: boolean;
  }

  const { data: communityProfile } = useQuery<CommunityProfile>({
    queryKey: ["/api/community/profile"],
    enabled: isPremium,
    retry: false,
  });

  const updateCommunitySettings = useMutation({
    mutationFn: async (updates: Partial<CommunityProfile>) => {
      return apiRequest("PATCH", "/api/community/profile", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/profile"] });
      toast({ title: "Community settings updated!" });
    },
    onError: () => {
      toast({ title: "Failed to update settings", variant: "destructive" });
    },
  });

  const manageSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/customer-portal");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Unable to open subscription management",
        description: "Please try again or contact support",
        variant: "destructive",
      });
    },
  });

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be less than 5MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      // Step 1: Get presigned URL
      const urlRes = await fetch("/api/user/profile-image", {
        method: "POST",
        credentials: "include",
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();

      // Step 2: Upload file directly to presigned URL
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) throw new Error("Failed to upload image");

      // Step 3: Confirm upload and update user record
      const confirmRes = await fetch("/api/user/profile-image/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ objectPath }),
      });
      if (!confirmRes.ok) throw new Error("Failed to confirm upload");

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Profile picture updated!" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Failed to upload image", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 md:p-8 font-body">
      <div className="mx-auto max-w-2xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link href="/">
            <Button variant="ghost" className="gap-2 mb-4" data-testid="button-back-home">
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-secondary/20" />
            <CardContent className="relative pt-0">
              <div className="flex flex-col items-center -mt-12">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {user?.firstName?.[0] || user?.email?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                    data-testid="input-profile-image"
                  />
                  <Button
                    size="icon"
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-lg"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    data-testid="button-upload-image"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>
                <h1 className="font-display text-2xl font-bold mt-4" data-testid="text-user-name">
                  {user?.firstName} {user?.lastName}
                </h1>
                <p className="text-muted-foreground flex items-center gap-1.5" data-testid="text-user-email">
                  <Mail className="w-3.5 h-3.5" />
                  {user?.email}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                Subscription Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Current Plan</p>
                  <p className="text-sm text-muted-foreground">
                    {isPremium ? "Premium ($15/month)" : isPro ? "Pro ($6/month)" : isTrialActive ? "Free Trial" : "No Active Plan"}
                  </p>
                </div>
                <Badge 
                  variant={hasPaid ? "default" : isTrialActive ? "secondary" : "destructive"}
                  className="gap-1"
                  data-testid="badge-subscription-status"
                >
                  {isPremium ? (
                    <><Crown className="w-3 h-3" /> Premium</>
                  ) : isPro ? (
                    <><Check className="w-3 h-3" /> Pro</>
                  ) : isTrialActive ? (
                    <><Sparkles className="w-3 h-3" /> Trial</>
                  ) : (
                    "Expired"
                  )}
                </Badge>
              </div>

              {isTrialActive && trialEndsAt && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-amber-800 dark:text-amber-200">
                    Trial ends {format(new Date(trialEndsAt), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
              )}

              {hasPaid && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800 dark:text-green-200">
                    You have full access to all features
                  </span>
                </div>
              )}

              {hasPaid && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => manageSubscriptionMutation.mutate()}
                  disabled={manageSubscriptionMutation.isPending}
                  data-testid="button-manage-subscription"
                >
                  {manageSubscriptionMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  Manage Subscription
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Your Progress
              </CardTitle>
              <CardDescription>Keep up the great work!</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-3xl font-display font-bold text-primary" data-testid="text-total-habits">
                    {totalHabits}
                  </p>
                  <p className="text-sm text-muted-foreground">Active Habits</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-green-50 border border-green-100 dark:bg-green-950/30 dark:border-green-900/50">
                  <p className="text-3xl font-display font-bold text-green-600" data-testid="text-total-completions">
                    {totalCompletions}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Completions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                Feedback & Support
              </CardTitle>
              <CardDescription>Help us improve Habit Builder</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setFeedbackOpen(true)}
                data-testid="button-open-feedback"
              >
                <MessageSquare className="w-4 h-4" />
                Share Feedback
              </Button>
              {user?.isAdmin && (
                <Link href="/admin/feedback">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-muted-foreground"
                    data-testid="button-admin-feedback"
                  >
                    <Settings className="w-4 h-4" />
                    View All Feedback (Admin)
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {user?.isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-500" />
                    Site Analytics (Admin)
                  </CardTitle>
                  <Select value={analyticsRange} onValueChange={(v) => setAnalyticsRange(v as "7d" | "30d" | "90d")}>
                    <SelectTrigger className="w-[120px]" data-testid="select-analytics-range">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <CardDescription>Visitor tracking and site statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingAnalytics ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : adminAnalytics ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="text-center p-3 rounded-lg bg-muted/50 border">
                        <Eye className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                        <p className="text-2xl font-bold" data-testid="text-total-page-views">{adminAnalytics.totalPageViews}</p>
                        <p className="text-xs text-muted-foreground">Page Views</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50 border">
                        <Users className="w-4 h-4 mx-auto mb-1 text-green-500" />
                        <p className="text-2xl font-bold" data-testid="text-unique-visitors">{adminAnalytics.uniqueVisitors}</p>
                        <p className="text-xs text-muted-foreground">Unique Visitors</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50 border">
                        <TrendingUp className="w-4 h-4 mx-auto mb-1 text-purple-500" />
                        <p className="text-2xl font-bold" data-testid="text-logged-in-users">{adminAnalytics.loggedInUsers}</p>
                        <p className="text-xs text-muted-foreground">Logged In Users</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50 border">
                        <Users className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                        <p className="text-2xl font-bold" data-testid="text-total-registered">{adminAnalytics.totalRegisteredUsers}</p>
                        <p className="text-xs text-muted-foreground">Total Users</p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <p className="text-sm font-medium mb-2">Signups & Trials</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" data-testid="badge-new-registrations">
                          +{adminAnalytics.newRegistrations} registrations
                        </Badge>
                        <Badge variant="default" data-testid="badge-new-free-trials">
                          +{adminAnalytics.newFreeTrialSignups} free trial signups
                        </Badge>
                        <Badge variant="outline" data-testid="badge-active-trials">
                          {adminAnalytics.freeTrialUsers} active trials
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {analyticsRange === '7d' ? 'Last 7 days' : analyticsRange === '30d' ? 'Last 30 days' : 'Last 90 days'}
                      </p>
                    </div>

                    {adminAnalytics.pagesByPath && adminAnalytics.pagesByPath.length > 0 && (
                      <div className="pt-2">
                        <p className="text-sm font-medium mb-2">Top Pages</p>
                        <div className="space-y-1">
                          {adminAnalytics.pagesByPath.slice(0, 5).map((page, i) => (
                            <div key={i} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                              <span className="text-muted-foreground truncate max-w-[200px]">{page.path || "/"}</span>
                              <Badge variant="outline">{page.count}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {adminAnalytics.topReferrers && adminAnalytics.topReferrers.length > 0 && (
                      <div className="pt-2">
                        <p className="text-sm font-medium mb-2">Top Referrers</p>
                        <div className="space-y-1">
                          {adminAnalytics.topReferrers.slice(0, 3).map((ref, i) => (
                            <div key={i} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                              <span className="text-muted-foreground truncate max-w-[200px]">{ref.referrer}</span>
                              <Badge variant="outline">{ref.count}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No analytics data available</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <ThemeSelector />
        </motion.div>

        {isPremium && communityProfile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Community Privacy
                </CardTitle>
                <CardDescription>Control your presence in the community</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="profileVisible">Public Profile</Label>
                    <p className="text-sm text-muted-foreground">Allow others to view your profile</p>
                  </div>
                  <Switch
                    id="profileVisible"
                    checked={communityProfile.profileVisible}
                    onCheckedChange={(checked) => updateCommunitySettings.mutate({ profileVisible: checked })}
                    data-testid="switch-profile-visible"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="allowMessages">Direct Messages</Label>
                    <p className="text-sm text-muted-foreground">Allow others to send you messages</p>
                  </div>
                  <Switch
                    id="allowMessages"
                    checked={communityProfile.allowMessages}
                    onCheckedChange={(checked) => updateCommunitySettings.mutate({ allowMessages: checked })}
                    data-testid="switch-allow-messages"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="allowProfileLikes">Profile Likes</Label>
                    <p className="text-sm text-muted-foreground">Allow others to like your profile</p>
                  </div>
                  <Switch
                    id="allowProfileLikes"
                    checked={communityProfile.allowProfileLikes}
                    onCheckedChange={(checked) => updateCommunitySettings.mutate({ allowProfileLikes: checked })}
                    data-testid="switch-allow-likes"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="showHabitProgress">Show Progress</Label>
                    <p className="text-sm text-muted-foreground">Display your habit stats on your profile</p>
                  </div>
                  <Switch
                    id="showHabitProgress"
                    checked={communityProfile.showHabitProgress}
                    onCheckedChange={(checked) => updateCommunitySettings.mutate({ showHabitProgress: checked })}
                    data-testid="switch-show-progress"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => logout()}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <FeedbackForm open={feedbackOpen} onOpenChange={setFeedbackOpen} />

        <p className="text-center text-xs text-muted-foreground pt-4">
          Member since {user?.createdAt ? format(new Date(user.createdAt), "MMMM yyyy") : "recently"}
        </p>
      </div>
    </div>
  );
}
