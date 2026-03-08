import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePaymentStatus } from "@/hooks/use-payment";
import { useSubscription } from "@/hooks/use-subscription";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Bell, Camera, Check, Crown, LogOut, Mail, Shield, Calendar, Sparkles, CreditCard, Loader2, ExternalLink, MessageSquare, Settings, BarChart3, Users, Eye, TrendingUp, XCircle, RefreshCw, ArrowUpDown, AlertTriangle, Globe, Pencil, X, Star, Trash2, Smartphone, HelpCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { FeedbackForm } from "@/components/FeedbackForm";
import { ThemeSelector } from "@/components/ThemeSelector";
import { isNative, isIOS } from "@/lib/platform";
import { registerNativePush } from "@/hooks/use-push-notifications";
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
import { usePageTitle } from "@/hooks/use-page-title";

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  subscriptionTier: string;
  hasPaid: boolean;
  subscriptionStatus: string;
  stripeCustomerId: string;
  trialEndsAt: string;
  createdAt: string;
}

interface UserActivity {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    subscriptionTier: string;
    subscriptionStatus: string;
    hasPaid: boolean;
    stripeCustomerId: string;
    trialEndsAt: string;
    createdAt: string;
    updatedAt: string;
    xpPoints: number;
    level: number;
    dailyChallengesCompleted: number;
    onboardingComplete: boolean;
    timezone: string;
    isFoundingMember: boolean;
    billingInterval: string;
  };
  habits: {
    id: number;
    title: string;
    currentStreak: number;
    longestStreak: number;
    totalTimeSpent: number;
    setupComplete: boolean;
    archived: boolean;
    category: string;
    createdAt: string;
  }[];
}

function UserActivityPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery<UserActivity>({
    queryKey: ['/api/admin/users', userId, 'activity'],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${userId}/activity`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 border rounded-md bg-muted/30">
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
      </div>
    );
  }

  if (!data) return null;

  const { user, habits: userHabits } = data;
  const activeHabits = userHabits.filter(h => !h.archived);
  const totalMinutes = userHabits.reduce((sum, h) => sum + (h.totalTimeSpent || 0), 0);
  const bestStreak = Math.max(0, ...userHabits.map(h => h.longestStreak || 0));

  return (
    <div className="p-4 border rounded-md bg-muted/30 space-y-4" data-testid={`user-activity-panel-${userId}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="font-semibold text-sm">{user.firstName} {user.lastName}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-close-activity">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="text-center p-2 rounded-md bg-background border">
          <p className="text-xl font-bold">{user.level || 0}</p>
          <p className="text-sm text-muted-foreground">Level</p>
        </div>
        <div className="text-center p-2 rounded-md bg-background border">
          <p className="text-xl font-bold">{user.xpPoints || 0}</p>
          <p className="text-sm text-muted-foreground">XP</p>
        </div>
        <div className="text-center p-2 rounded-md bg-background border">
          <p className="text-xl font-bold">{bestStreak}</p>
          <p className="text-sm text-muted-foreground">Best Streak</p>
        </div>
        <div className="text-center p-2 rounded-md bg-background border">
          <p className="text-xl font-bold">{totalMinutes < 60 ? `${totalMinutes}m` : `${Math.round(totalMinutes / 60)}h`}</p>
          <p className="text-sm text-muted-foreground">Time Invested</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="flex items-center justify-between gap-1">
          <span className="text-muted-foreground">Tier:</span>
          <Badge variant={user.subscriptionTier === 'premium' ? 'default' : user.subscriptionTier === 'pro' ? 'secondary' : 'outline'} className="text-xs">
            {user.subscriptionTier || 'free'}
          </Badge>
        </div>
        <div className="flex items-center justify-between gap-1">
          <span className="text-muted-foreground">Status:</span>
          <span className="font-medium">{user.subscriptionStatus || 'none'}</span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <span className="text-muted-foreground">Joined:</span>
          <span className="font-medium">{user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'N/A'}</span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <span className="text-muted-foreground">Timezone:</span>
          <span className="font-medium truncate max-w-[120px]">{user.timezone || 'Not set'}</span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <span className="text-muted-foreground">Onboarding:</span>
          <span className="font-medium">{user.onboardingComplete ? 'Complete' : 'Incomplete'}</span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <span className="text-muted-foreground">Founding:</span>
          <span className="font-medium">{user.isFoundingMember ? 'Yes' : 'No'}</span>
        </div>
        {user.billingInterval && (
          <div className="flex items-center justify-between gap-1">
            <span className="text-muted-foreground">Billing:</span>
            <span className="font-medium">{user.billingInterval}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-1">
          <span className="text-muted-foreground">Challenges:</span>
          <span className="font-medium">{user.dailyChallengesCompleted || 0}</span>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold mb-2">Habits ({activeHabits.length} active, {userHabits.length - activeHabits.length} archived)</p>
        {userHabits.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No habits created yet</p>
        ) : (
          <div className="space-y-1.5">
            {userHabits.map((h) => (
              <div key={h.id} className={`flex items-center justify-between gap-2 p-2 rounded-md text-xs border ${h.archived ? 'opacity-50' : ''}`} data-testid={`habit-row-${h.id}`}>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{h.title}</p>
                  <div className="flex items-center gap-2 flex-wrap text-muted-foreground">
                    {h.category && <span>{h.category}</span>}
                    {h.archived && <span className="text-orange-500">(archived)</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-center">
                    <p className="font-bold">{h.currentStreak || 0}</p>
                    <p className="text-muted-foreground leading-none">streak</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">{h.longestStreak || 0}</p>
                    <p className="text-muted-foreground leading-none">best</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">{(h.totalTimeSpent || 0) < 60 ? `${h.totalTimeSpent || 0}m` : `${Math.round((h.totalTimeSpent || 0) / 60)}h`}</p>
                    <p className="text-muted-foreground leading-none">time</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminUserManager() {
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("premium");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allUsers, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const filteredUsers = allUsers?.filter(u =>
    !u.email?.includes("example.com") && !u.email?.includes("test.com") &&
    (searchEmail === "" || u.email?.toLowerCase().includes(searchEmail.toLowerCase()) || u.id.toLowerCase().includes(searchEmail.toLowerCase()))
  );

  const updateMutation = useMutation({
    mutationFn: async ({ userId, tier, hasPaid }: { userId: string; tier: string; hasPaid: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/subscription`, { subscriptionTier: tier, hasPaid });
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast({ title: "Updated", description: `User ${variables.userId} set to ${variables.tier}` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update user", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4" />
        <span className="font-medium text-sm">User Management</span>
        {allUsers && <Badge variant="outline" className="text-xs">{allUsers.length} total</Badge>}
      </div>
      <Input
        placeholder="Search by email or user ID..."
        value={searchEmail}
        onChange={(e) => setSearchEmail(e.target.value)}
        data-testid="input-admin-search-users"
      />
      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filteredUsers?.map((u) => (
            <div key={u.id} className="space-y-2">
              <div
                className="flex items-center justify-between gap-2 p-2 border rounded-md text-sm hover-elevate cursor-pointer"
                onClick={() => setExpandedUserId(expandedUserId === u.id ? null : u.id)}
                data-testid={`admin-user-row-${u.id}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{u.email || u.id}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={u.subscriptionTier === 'premium' ? 'default' : u.subscriptionTier === 'pro' ? 'secondary' : 'outline'}>
                      {u.subscriptionTier || 'free'}
                    </Badge>
                    {u.hasPaid && <Badge variant="outline">Paid</Badge>}
                    <span className="text-xs text-muted-foreground">
                      {u.createdAt ? format(new Date(u.createdAt), 'MMM d, yyyy') : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Select defaultValue={u.subscriptionTier || 'free'} onValueChange={(val) => setSelectedTier(val)}>
                    <SelectTrigger className="w-24" data-testid={`select-tier-${u.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => updateMutation.mutate({ userId: u.id, tier: selectedTier, hasPaid: selectedTier !== 'free' })}
                    disabled={updateMutation.isPending}
                    data-testid={`button-update-tier-${u.id}`}
                  >
                    {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
              {expandedUserId === u.id && (
                <UserActivityPanel userId={u.id} onClose={() => setExpandedUserId(null)} />
              )}
            </div>
          ))}
          {filteredUsers?.length === 0 && <p className="text-muted-foreground text-center text-sm py-2">No users found</p>}
        </div>
      )}
    </div>
  );
}

const COMMON_TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Anchorage", "Pacific/Honolulu", "America/Phoenix",
  "America/Toronto", "America/Vancouver", "America/Edmonton", "America/Winnipeg",
  "America/Halifax", "America/St_Johns",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Rome", "Europe/Madrid",
  "Europe/Amsterdam", "Europe/Brussels", "Europe/Stockholm", "Europe/Oslo",
  "Europe/Helsinki", "Europe/Athens", "Europe/Moscow", "Europe/Istanbul",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Bangkok", "Asia/Singapore",
  "Asia/Shanghai", "Asia/Tokyo", "Asia/Seoul", "Asia/Hong_Kong",
  "Australia/Sydney", "Australia/Melbourne", "Australia/Perth", "Australia/Brisbane",
  "Pacific/Auckland", "Pacific/Fiji",
  "America/Sao_Paulo", "America/Argentina/Buenos_Aires", "America/Mexico_City",
  "Africa/Cairo", "Africa/Johannesburg", "Africa/Lagos", "Africa/Nairobi",
];

function formatTzLabel(tz: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const time = formatter.format(now);
    const offset = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(now).find(p => p.type === "timeZoneName")?.value || "";
    const city = tz.split("/").pop()?.replace(/_/g, " ") || tz;
    return `${city} (${offset}, ${time})`;
  } catch {
    return tz;
  }
}

function TimezoneSettings({ user }: { user: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [selectedTz, setSelectedTz] = useState(user?.timezone || detectedTz || "America/New_York");

  const updateTzMutation = useMutation({
    mutationFn: async (timezone: string) => {
      const res = await apiRequest("PATCH", "/api/user/timezone", { timezone });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      toast({ title: "Timezone updated", description: `Your timezone is now set to ${selectedTz.split("/").pop()?.replace(/_/g, " ")}` });
    },
    onError: () => {
      toast({ title: "Failed to update timezone", variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-500" />
          Timezone
        </CardTitle>
        <CardDescription>
          Set your timezone so tasks and schedules match your local time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="timezone-select" className="text-base">Your Timezone</Label>
          <Select value={selectedTz} onValueChange={setSelectedTz}>
            <SelectTrigger data-testid="select-timezone">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {Array.from(new Set([
                ...(user?.timezone && !COMMON_TIMEZONES.includes(user.timezone) ? [user.timezone] : []),
                ...(detectedTz && !COMMON_TIMEZONES.includes(detectedTz) ? [detectedTz] : []),
                ...COMMON_TIMEZONES,
              ])).map(tz => (
                <SelectItem key={tz} value={tz}>
                  {formatTzLabel(tz)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {detectedTz && detectedTz !== selectedTz && (
          <p className="text-sm text-muted-foreground">
            Your browser detected: <span className="font-medium">{detectedTz.split("/").pop()?.replace(/_/g, " ")}</span>
            {" "}
            <Button
              variant="ghost"
              className="p-0 h-auto text-sm text-primary underline"
              onClick={() => setSelectedTz(detectedTz)}
              data-testid="button-use-detected-tz"
            >
              Use this
            </Button>
          </p>
        )}
        <Button
          onClick={() => updateTzMutation.mutate(selectedTz)}
          disabled={updateTzMutation.isPending || selectedTz === user?.timezone}
          data-testid="button-save-timezone"
        >
          {updateTzMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save Timezone
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Account() {
  usePageTitle("Account", "Manage your HabitBuilder.pro account settings, email preferences, timezone, and subscription.");
  const { user, logout } = useAuth();
  const { hasPaid } = usePaymentStatus();
  const { tier, isPro, isPremium, isFreeUser } = useSubscription();
  const { data: habits } = useHabits();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [, navigate] = useLocation();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [analyticsRange, setAnalyticsRange] = useState<"7d" | "30d" | "90d">("7d");
  const [editingName, setEditingName] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");

  const updateNameMutation = useMutation({
    mutationFn: async ({ firstName, lastName }: { firstName: string; lastName: string }) => {
      const res = await apiRequest("PATCH", "/api/user/name", { firstName, lastName });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Name updated", description: "Your display name has been changed." });
      setEditingName(false);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update name", description: err.message, variant: "destructive" });
    },
  });

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
    trafficSources: { source: string; count: number; uniqueVisitors: number }[];
    googleAds: { views: number; uniqueVisitors: number; signups: number };
    campaignBreakdown: { campaign: string; source: string; views: number; uniqueVisitors: number }[];
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

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showChangePlan, setShowChangePlan] = useState(false);

  interface RenewalWarning {
    showWarning: boolean;
    daysRemaining?: number;
    renewalDate?: string;
    interval?: string;
    isFoundingMember?: boolean;
    amount?: number;
  }

  interface SubscriptionDetails {
    hasSubscription: boolean;
    subscriptionId?: string;
    status?: string;
    cancelAtPeriodEnd?: boolean;
    currentPeriodEnd?: number;
    currentTier?: string;
    priceId?: string;
    amount?: number;
    interval?: string;
    isFoundingMember?: boolean;
    productName?: string;
  }

  const { data: subDetails, isLoading: isLoadingSubDetails } = useQuery<SubscriptionDetails>({
    queryKey: ["/api/subscription/details"],
    enabled: !!user,
  });

  const { data: renewalWarning } = useQuery<RenewalWarning>({
    queryKey: ["/api/subscription/renewal-warning"],
    enabled: !!user && !!subDetails?.hasSubscription,
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/cancel");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/details"] });
      setShowCancelConfirm(false);
      toast({ title: "Subscription cancelled", description: "You'll keep access until the end of your billing period." });
    },
    onError: () => {
      toast({ title: "Failed to cancel subscription", variant: "destructive" });
    },
  });

  const reactivateSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/reactivate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/details"] });
      toast({ title: "Subscription reactivated", description: "Your subscription will continue as normal." });
    },
    onError: () => {
      toast({ title: "Failed to reactivate subscription", variant: "destructive" });
    },
  });

  const changePlanMutation = useMutation({
    mutationFn: async (targetTier: string) => {
      const res = await apiRequest("POST", "/api/subscription/change-plan", { targetTier });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-status"] });
      setShowChangePlan(false);
      toast({ title: "Plan changed", description: `You're now on the ${data.newTier} plan.` });
    },
    onError: () => {
      toast({ title: "Failed to change plan", variant: "destructive" });
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
        title: "Unable to open billing portal",
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
      <div className="mx-auto max-w-2xl space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 mb-4" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
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
                {editingName ? (
                  <div className="mt-4 w-full max-w-xs space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-first-name" className="text-sm text-muted-foreground">First Name</Label>
                      <Input
                        id="edit-first-name"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        placeholder="First name"
                        data-testid="input-edit-first-name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-last-name" className="text-sm text-muted-foreground">Last Name</Label>
                      <Input
                        id="edit-last-name"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        placeholder="Last name (optional)"
                        data-testid="input-edit-last-name"
                      />
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateNameMutation.mutate({ firstName: editFirstName, lastName: editLastName })}
                        disabled={!editFirstName.trim() || updateNameMutation.isPending}
                        data-testid="button-save-name"
                      >
                        {updateNameMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingName(false)}
                        data-testid="button-cancel-edit-name"
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-4">
                    <h1 className="font-display text-2xl font-bold" data-testid="text-user-name">
                      {user?.firstName} {user?.lastName}
                    </h1>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditFirstName(user?.firstName || "");
                        setEditLastName(user?.lastName || "");
                        setEditingName(true);
                      }}
                      data-testid="button-edit-name"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
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
              <div className="flex items-center justify-between flex-wrap gap-2 p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-semibold">Current Plan</p>
                  <p className="text-sm text-muted-foreground">
                    {isPremium
                      ? `Premium (${subDetails?.interval === 'year' ? '$140 USD/year' : '$15 USD/month'})`
                      : isPro
                      ? `Pro (${subDetails?.interval === 'year' ? '$48 USD/year' : '$6 USD/month'})`
                      : "Free Plan"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {subDetails?.isFoundingMember && (
                    <Badge variant="secondary" className="gap-1" data-testid="badge-founding-member">
                      <Star className="w-3 h-3" /> Founding Member
                    </Badge>
                  )}
                  <Badge 
                    variant={hasPaid ? "default" : "secondary"}
                    className="gap-1"
                    data-testid="badge-subscription-status"
                  >
                    {isPremium ? (
                      <><Crown className="w-3 h-3" /> Premium</>
                    ) : isPro ? (
                      <><Check className="w-3 h-3" /> Pro</>
                    ) : (
                      "Free"
                    )}
                  </Badge>
                </div>
              </div>

              {renewalWarning?.showWarning && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30" data-testid="banner-renewal-warning">
                  <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-sm text-blue-800 dark:text-blue-200">
                    Your {renewalWarning.interval === 'year' ? 'annual' : 'monthly'} subscription renews in {renewalWarning.daysRemaining} day{renewalWarning.daysRemaining !== 1 ? 's' : ''}
                    {renewalWarning.amount ? ` ($${(renewalWarning.amount / 100).toFixed(0)} USD)` : ''}.
                    {renewalWarning.isFoundingMember && ' Your founding member rate is locked in.'}
                  </span>
                </div>
              )}

              {isFreeUser && (
                <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50/80 to-amber-100/40 dark:from-amber-950/30 dark:to-amber-900/10" data-testid="card-account-upgrade">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">You're currently on the free demo</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        1 habit, 3 sessions/week, no AI summaries or streaks. Upgrade to unlock the full experience.
                      </p>
                      <Link href="/paywall">
                        <Button
                          size="sm"
                          className="gap-1.5 mt-3"
                          data-testid="button-account-upgrade"
                        >
                          <Crown className="w-3.5 h-3.5" />
                          See Plans
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {(hasPaid || subDetails?.hasSubscription) && !subDetails?.cancelAtPeriodEnd && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800 dark:text-green-200">
                    You have full access to all features
                  </span>
                </div>
              )}

              {subDetails?.cancelAtPeriodEnd && subDetails.currentPeriodEnd && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-amber-800 dark:text-amber-200">
                    Cancellation scheduled - access until {format(new Date(subDetails.currentPeriodEnd * 1000), "MMM d, yyyy")}
                  </span>
                </div>
              )}

              {subDetails?.currentPeriodEnd && !subDetails.cancelAtPeriodEnd && (
                <div className="flex items-center gap-2 p-3 rounded-lg border">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Next billing date: {format(new Date(subDetails.currentPeriodEnd * 1000), "MMM d, yyyy")}
                  </span>
                </div>
              )}

              {isLoadingSubDetails && (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {(subDetails?.hasSubscription || hasPaid) && (
                <div className="space-y-2 pt-2">
                  {subDetails?.cancelAtPeriodEnd ? (
                    <Button
                      variant="default"
                      className="w-full gap-2"
                      onClick={() => reactivateSubscriptionMutation.mutate()}
                      disabled={reactivateSubscriptionMutation.isPending}
                      data-testid="button-reactivate-subscription"
                    >
                      {reactivateSubscriptionMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Reactivate Subscription
                    </Button>
                  ) : (
                    <>
                      {!showChangePlan && !showCancelConfirm && (
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            className="w-full gap-2"
                            onClick={() => setShowChangePlan(true)}
                            data-testid="button-change-plan"
                          >
                            <ArrowUpDown className="w-4 h-4" />
                            {isPro ? "Upgrade to Premium" : "Switch to Pro"}
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full gap-2 text-destructive hover:text-destructive"
                            onClick={() => setShowCancelConfirm(true)}
                            data-testid="button-cancel-subscription"
                          >
                            <XCircle className="w-4 h-4" />
                            Cancel Subscription
                          </Button>
                        </div>
                      )}

                      {showChangePlan && (
                        <div className="p-4 rounded-lg border space-y-3">
                          <p className="font-medium text-sm">
                            {isPro ? "Upgrade to Premium ($15 USD/month)" : "Switch to Pro ($6 USD/month)"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {isPro
                              ? "Get full forum access, advanced analytics, direct messaging, and more."
                              : "Switch to Pro for essential features at a lower price."}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              className="flex-1 gap-2"
                              onClick={() => changePlanMutation.mutate(isPro ? 'premium' : 'pro')}
                              disabled={changePlanMutation.isPending}
                              data-testid="button-confirm-change-plan"
                            >
                              {changePlanMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                              Confirm Change
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setShowChangePlan(false)}
                              data-testid="button-cancel-change-plan"
                            >
                              Back
                            </Button>
                          </div>
                        </div>
                      )}

                      {showCancelConfirm && (
                        <div className="p-4 rounded-lg border border-destructive/30 space-y-3">
                          <p className="font-medium text-sm text-destructive">Cancel your subscription?</p>
                          <p className="text-sm text-muted-foreground">
                            You'll keep access until the end of your current billing period. You can reactivate anytime before then.
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="destructive"
                              className="flex-1 gap-2"
                              onClick={() => cancelSubscriptionMutation.mutate()}
                              disabled={cancelSubscriptionMutation.isPending}
                              data-testid="button-confirm-cancel"
                            >
                              {cancelSubscriptionMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                              Yes, Cancel
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setShowCancelConfirm(false)}
                              data-testid="button-keep-subscription"
                            >
                              Keep Plan
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
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
              <CardDescription>Help us improve HabitBuilder.pro</CardDescription>
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
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => {
                  localStorage.removeItem("featureTourCompleted");
                  navigate("/#tour");
                }}
                data-testid="button-take-tour"
              >
                <HelpCircle className="w-4 h-4" />
                Take a Tour
              </Button>
              {user?.isAdmin && (
                <>
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
                  <Link href="/admin/email">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 text-muted-foreground"
                      data-testid="button-admin-email"
                    >
                      <Settings className="w-4 h-4" />
                      Email Dashboard (Admin)
                    </Button>
                  </Link>
                </>
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
                        <p className="text-sm text-muted-foreground">Page Views</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50 border">
                        <Users className="w-4 h-4 mx-auto mb-1 text-green-500" />
                        <p className="text-2xl font-bold" data-testid="text-unique-visitors">{adminAnalytics.uniqueVisitors}</p>
                        <p className="text-sm text-muted-foreground">Unique Visitors</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50 border">
                        <TrendingUp className="w-4 h-4 mx-auto mb-1 text-purple-500" />
                        <p className="text-2xl font-bold" data-testid="text-logged-in-users">{adminAnalytics.loggedInUsers}</p>
                        <p className="text-sm text-muted-foreground">Logged In Users</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50 border">
                        <Users className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                        <p className="text-2xl font-bold" data-testid="text-total-registered">{adminAnalytics.totalRegisteredUsers}</p>
                        <p className="text-sm text-muted-foreground">Total Users</p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <p className="text-sm font-medium mb-2">Signups</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" data-testid="badge-new-registrations">
                          +{adminAnalytics.newRegistrations} registrations
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {analyticsRange === '7d' ? 'Last 7 days' : analyticsRange === '30d' ? 'Last 30 days' : 'Last 90 days'}
                      </p>
                    </div>

                    {adminAnalytics.googleAds && (adminAnalytics.googleAds.views > 0 || adminAnalytics.googleAds.signups > 0) && (
                      <div className="pt-2">
                        <p className="text-sm font-medium mb-2 flex items-center gap-1">
                          <BarChart3 className="w-4 h-4 text-blue-500" />
                          Google Ads Performance
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border">
                            <p className="text-xl font-bold" data-testid="text-google-ads-views">{adminAnalytics.googleAds.views}</p>
                            <p className="text-sm text-muted-foreground">Ad Clicks</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-950/30 border">
                            <p className="text-xl font-bold" data-testid="text-google-ads-visitors">{adminAnalytics.googleAds.uniqueVisitors}</p>
                            <p className="text-sm text-muted-foreground">Unique Visitors</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border">
                            <p className="text-xl font-bold" data-testid="text-google-ads-signups">{adminAnalytics.googleAds.signups}</p>
                            <p className="text-sm text-muted-foreground">Ad Sign-ups</p>
                          </div>
                        </div>
                        {adminAnalytics.googleAds.uniqueVisitors > 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Conversion rate: {((adminAnalytics.googleAds.signups / adminAnalytics.googleAds.uniqueVisitors) * 100).toFixed(1)}%
                          </p>
                        )}
                      </div>
                    )}

                    {adminAnalytics.trafficSources && adminAnalytics.trafficSources.length > 0 && (
                      <div className="pt-2">
                        <p className="text-sm font-medium mb-2">Traffic Sources</p>
                        <div className="space-y-1">
                          {adminAnalytics.trafficSources.map((src, i) => (
                            <div key={i} className="flex items-center justify-between gap-2 text-sm py-1 border-b last:border-0">
                              <span className="text-muted-foreground" data-testid={`text-traffic-source-${i}`}>{src.source}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" data-testid={`text-traffic-views-${i}`}>{src.count} views</Badge>
                                <Badge variant="secondary" data-testid={`text-traffic-visitors-${i}`}>{src.uniqueVisitors} visitors</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {adminAnalytics.campaignBreakdown && adminAnalytics.campaignBreakdown.length > 0 && (
                      <div className="pt-2">
                        <p className="text-sm font-medium mb-2">Campaign Breakdown</p>
                        <div className="space-y-1">
                          {adminAnalytics.campaignBreakdown.map((camp, i) => (
                            <div key={i} className="flex items-center justify-between gap-2 text-sm py-1 border-b last:border-0">
                              <div className="flex flex-col min-w-0">
                                <span className="text-foreground truncate max-w-[180px]" data-testid={`text-campaign-name-${i}`}>{camp.campaign}</span>
                                <span className="text-xs text-muted-foreground">{camp.source}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge variant="outline">{camp.views} views</Badge>
                                <Badge variant="secondary">{camp.uniqueVisitors} visitors</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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
                          {adminAnalytics.topReferrers.map((ref: { referrer: string; count: number }, i: number) => (
                            <div key={i} className="flex items-center justify-between gap-2 text-sm py-1 border-b last:border-0">
                              <span className="text-muted-foreground truncate max-w-[200px]" data-testid={`text-referrer-${i}`}>{ref.referrer}</span>
                              <Badge variant="outline" data-testid={`text-referrer-count-${i}`}>{ref.count}</Badge>
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

        {user?.isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.37 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-orange-500" />
                  Admin Tools
                </CardTitle>
                <CardDescription>Quick actions for app management</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <AdminUserManager />
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/admin/seed-forum", {
                        method: "POST",
                        credentials: "include",
                      });
                      const data = await res.json();
                      if (res.ok) {
                        toast({
                          title: "Forum Seeded",
                          description: data.message || "Forum content has been added.",
                        });
                      } else {
                        toast({
                          title: "Error",
                          description: data.error || "Failed to seed forum",
                          variant: "destructive",
                        });
                      }
                    } catch (err) {
                      toast({
                        title: "Error",
                        description: "Failed to seed forum",
                        variant: "destructive",
                      });
                    }
                  }}
                  data-testid="button-seed-forum"
                >
                  <Users className="w-4 h-4" />
                  Seed Forum Content
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
        >
          <TimezoneSettings user={user} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.39 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Choose which emails you'd like to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-0">
              <div className="flex items-center justify-between gap-4 py-4">
                <div className="space-y-1">
                  <Label className="text-base font-medium" data-testid="label-daily-reminder">Daily Morning Reminders</Label>
                  <p className="text-sm text-muted-foreground">Get a daily nudge with your tasks and streak info</p>
                </div>
                <Switch
                  checked={user?.dailyReminderEnabled !== false}
                  onCheckedChange={(checked) => {
                    apiRequest("PATCH", "/api/user/email-preferences", { dailyReminderEnabled: checked })
                      .then(() => {
                        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                        toast({ title: checked ? "Daily reminders enabled" : "Daily reminders disabled" });
                      })
                      .catch(() => {
                        toast({ title: "Failed to update preference", variant: "destructive" });
                      });
                  }}
                  data-testid="switch-daily-reminder"
                />
              </div>
              <div className="border-t border-border/50" />
              <div className="flex items-center justify-between gap-4 py-4">
                <div className="space-y-1">
                  <Label className="text-base font-medium" data-testid="label-weekly-digest">Weekly Progress Digest</Label>
                  <p className="text-sm text-muted-foreground">Receive a Sunday summary of your progress</p>
                </div>
                <Switch
                  checked={user?.weeklyDigestEnabled !== false}
                  onCheckedChange={(checked) => {
                    apiRequest("PATCH", "/api/user/email-preferences", { weeklyDigestEnabled: checked })
                      .then(() => {
                        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                        toast({ title: checked ? "Weekly digest enabled" : "Weekly digest disabled" });
                      })
                      .catch(() => {
                        toast({ title: "Failed to update preference", variant: "destructive" });
                      });
                  }}
                  data-testid="switch-weekly-digest"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.395 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                Push Notifications
              </CardTitle>
              <CardDescription>
                Get instant reminders on your phone or computer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 py-1">
                <div className="space-y-1">
                  <Label className="text-base font-medium" data-testid="label-push-notifications">Enable Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive habit reminders even when the app is closed</p>
                </div>
                <Switch
                  checked={user?.pushNotificationsEnabled === true}
                  onCheckedChange={async (checked) => {
                    if (checked) {
                      try {
                        if (isNative() && isIOS()) {
                          await registerNativePush();
                          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                          toast({ title: "Push notifications enabled" });
                        } else {
                          if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
                            toast({ title: "Push notifications are not supported on this browser", variant: "destructive" });
                            return;
                          }
                          const permission = await Notification.requestPermission();
                          if (permission !== "granted") {
                            toast({ title: "Notification permission denied", description: "Please allow notifications in your browser settings", variant: "destructive" });
                            return;
                          }
                          const registration = await navigator.serviceWorker.ready;
                          const subscription = await registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
                          });
                          await apiRequest("POST", "/api/push/subscribe", { subscription: subscription.toJSON() });
                          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                          toast({ title: "Push notifications enabled" });
                        }
                      } catch (err) {
                        console.error("Push subscription error:", err);
                        toast({ title: "Failed to enable push notifications", variant: "destructive" });
                      }
                    } else {
                      try {
                        if (isNative() && isIOS()) {
                          await apiRequest("POST", "/api/push/unsubscribe", {});
                          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                          toast({ title: "Push notifications disabled" });
                        } else {
                          const registration = await navigator.serviceWorker.ready;
                          const subscription = await registration.pushManager.getSubscription();
                          if (subscription) {
                            await subscription.unsubscribe();
                            await apiRequest("POST", "/api/push/unsubscribe", { endpoint: subscription.endpoint });
                          } else {
                            await apiRequest("POST", "/api/push/unsubscribe", {});
                          }
                          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                          toast({ title: "Push notifications disabled" });
                        }
                      } catch (err) {
                        console.error("Push unsubscribe error:", err);
                        toast({ title: "Failed to disable push notifications", variant: "destructive" });
                      }
                    }
                  }}
                  data-testid="switch-push-notifications"
                />
              </div>
              {user?.pushNotificationsEnabled && (
                <>
                  <div className="border-t pt-4 space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Notification Types</p>
                    {[
                      { key: "pushHabitReminders", label: "Habit Reminders", description: "Get reminded to complete your habits", timeKey: "habitReminderTime", timeDefault: "08:00", timeLabel: "Daily reminder time" },
                      { key: "pushStreakAlerts", label: "Streak Alerts", description: "Alerts when your streak is at risk", timeKey: "streakAlertTime", timeDefault: "19:00", timeLabel: "Streak check time" },
                      { key: "pushJournalReminder", label: "Journal Reminder", description: "Daily reminder to write in your journal", timeKey: "journalReminderTime", timeDefault: "20:00", timeLabel: "Journal reminder time" },
                      { key: "pushMoodCheckin", label: "Mood Check-in", description: "Periodic reminders to log your mood", timeKey: "moodCheckinTimes", timeDefault: null, timeLabel: "Check-in times" },
                      { key: "pushTimerComplete", label: "Timer Complete", description: "Notification when your focus timer ends", timeKey: null, timeDefault: null, timeLabel: null },
                      { key: "pushGoalMilestones", label: "Goal Milestones", description: "Celebrate when you hit goal milestones", timeKey: null, timeDefault: null, timeLabel: null },
                      { key: "pushDailyPlanner", label: "Daily Planner", description: "Reminders about your planned tasks", timeKey: "dailyPlannerTime", timeDefault: "07:00", timeLabel: "Planner summary time" },
                    ].map(({ key, label, description, timeKey, timeDefault, timeLabel }) => (
                      <div key={key} className="space-y-2 py-1">
                        <div className="flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <Label className="text-base font-medium" data-testid={`label-${key}`}>{label}</Label>
                            <p className="text-sm text-muted-foreground">{description}</p>
                          </div>
                          <Switch
                            checked={(user as any)?.[key] !== false}
                            onCheckedChange={(checked) => {
                              apiRequest("PATCH", "/api/user/notification-preferences", { [key]: checked })
                                .then(() => {
                                  queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                                  toast({ title: `${label} ${checked ? "enabled" : "disabled"}` });
                                })
                                .catch(() => {
                                  toast({ title: "Failed to update preference", variant: "destructive" });
                                });
                            }}
                            data-testid={`switch-${key}`}
                          />
                        </div>
                        {(user as any)?.[key] !== false && timeKey && timeKey !== "moodCheckinTimes" && (
                          <div className="flex items-center gap-2 pl-1">
                            <Input
                              type="time"
                              value={(user as any)?.[timeKey] || timeDefault || "08:00"}
                              onChange={(e) => {
                                const time = e.target.value;
                                apiRequest("PATCH", "/api/user/notification-preferences", { [timeKey]: time })
                                  .then(() => {
                                    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                                    toast({ title: `${timeLabel} set to ${time}` });
                                  })
                                  .catch(() => {
                                    toast({ title: "Failed to update time", variant: "destructive" });
                                  });
                              }}
                              className="w-32"
                              data-testid={`input-${timeKey}`}
                            />
                            <p className="text-sm text-muted-foreground">{timeLabel}</p>
                          </div>
                        )}
                        {(user as any)?.[key] !== false && timeKey === "moodCheckinTimes" && (
                          <div className="space-y-2 pl-1">
                            <p className="text-sm text-muted-foreground">{timeLabel}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {((user as any)?.moodCheckinTimes || ["09:00", "14:00", "20:00"]).map((time: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-1">
                                  <Input
                                    type="time"
                                    value={time}
                                    onChange={(e) => {
                                      const newTimes = [...((user as any)?.moodCheckinTimes || ["09:00", "14:00", "20:00"])];
                                      newTimes[idx] = e.target.value;
                                      apiRequest("PATCH", "/api/user/notification-preferences", { moodCheckinTimes: newTimes })
                                        .then(() => {
                                          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                                          toast({ title: `Mood check-in time ${idx + 1} set to ${e.target.value}` });
                                        })
                                        .catch(() => {
                                          toast({ title: "Failed to update check-in time", variant: "destructive" });
                                        });
                                    }}
                                    className="w-32"
                                    data-testid={`input-moodCheckinTime-${idx}`}
                                  />
                                  {idx < 2 && <span className="text-xs text-muted-foreground">,</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-4 space-y-3">
                    <div className="space-y-2">
                      <Label className="text-base font-medium" data-testid="label-daily-reminder-time">Daily Morning Reminder Time</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={user?.dailyReminderTime || "08:00"}
                          onChange={(e) => {
                            const time = e.target.value;
                            apiRequest("PATCH", "/api/user/email-preferences", { dailyReminderTime: time })
                              .then(() => {
                                queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                                toast({ title: `Daily morning reminder set to ${time}` });
                              })
                              .catch(() => {
                                toast({ title: "Failed to update reminder time", variant: "destructive" });
                              });
                          }}
                          className="w-32"
                          data-testid="input-daily-reminder-time"
                        />
                        <p className="text-sm text-muted-foreground">When to receive your daily morning reminder</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {isNative() && isIOS() && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          toast({ title: "Re-registering push notifications..." });
                          try {
                            await registerNativePush();
                            toast({ title: "Push registration sent", description: "Device token sent to server. Try a test notification now." });
                          } catch {
                            toast({ title: "Registration failed", description: "Check that notifications are allowed in iOS Settings.", variant: "destructive" });
                          }
                        }}
                        data-testid="button-fix-push"
                      >
                        Fix Push Notifications
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const res = await apiRequest("POST", "/api/push/test");
                          const data = await res.json();
                          if (data.total === 0) {
                            toast({
                              title: "No active subscriptions",
                              description: "Tap \"Fix Push Notifications\" to re-register this device.",
                              variant: "destructive",
                            });
                          } else if (data.sent === 0) {
                            toast({
                              title: "Notification failed to deliver",
                              description: "Your subscription may be expired. Tap \"Fix Push Notifications\".",
                              variant: "destructive",
                            });
                          } else {
                            toast({ title: "Test notification sent!" });
                          }
                        } catch {
                          toast({ title: "Failed to send test notification", variant: "destructive" });
                        }
                      }}
                      data-testid="button-test-push"
                    >
                      Send Test Notification
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <ThemeSelector />
        </motion.div>


        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => logout()}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
              <Link href="/delete-account">
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                  data-testid="button-delete-account"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </Link>
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
