import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, TrendingDown, Users, Smartphone, Globe, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FunnelStep {
  eventName: string;
  count: number;
  uniqueSessions: number;
}

interface FunnelByDay {
  date: string;
  eventName: string;
  count: number;
}

interface FunnelByPlatform {
  platform: string | null;
  eventName: string;
  count: number;
}

interface FunnelData {
  steps: FunnelStep[];
  byDay: FunnelByDay[];
  byPlatform: FunnelByPlatform[];
  newRegistrations: number;
  failureBreakdown: Record<string, number>;
}

const FUNNEL_ORDER = [
  { key: "app_open", label: "App Opened" },
  { key: "onboarding_welcome", label: "Welcome Screen" },
  { key: "onboarding_intent", label: "Selected Intent" },
  { key: "onboarding_habit_select", label: "Selected Habit" },
  { key: "onboarding_tracking_mode", label: "Chose Tracking Mode" },
  { key: "onboarding_ai_details", label: "AI Plan Details" },
  { key: "onboarding_simple_details", label: "Simple Tracking Details" },
  { key: "onboarding_ai_generating", label: "AI Generating Plan" },
  { key: "onboarding_plan_preview", label: "Viewed Plan Preview" },
  { key: "onboarding_cta_signup", label: "Tapped Sign Up CTA" },
  { key: "auth_screen_shown", label: "Auth Screen Shown" },
  { key: "auth_apple_tapped", label: "Tapped Apple Sign In" },
  { key: "auth_google_tapped", label: "Tapped Google Sign In" },
  { key: "auth_email_submit", label: "Email Form Submitted" },
  { key: "auth_signup_success", label: "Sign Up Success" },
  { key: "auth_login_success", label: "Login Success" },
  { key: "auth_signup_failed", label: "Sign Up Failed" },
  { key: "auth_login_failed", label: "Login Failed" },
  { key: "first_habit_created", label: "First Habit Created" },
];

export default function AdminFunnel() {
  usePageTitle("Conversion Funnel");
  const [range, setRange] = useState("7d");
  const { toast } = useToast();
  const qc = useQueryClient();

  const cleanupMutation = useMutation({
    mutationFn: async (body: { sessionIds?: string[]; adminUserId?: string }) => {
      const res = await apiRequest("POST", "/api/admin/funnel/cleanup", body);
      return res.json();
    },
    onSuccess: (data: { deleted: number }) => {
      toast({ title: `Cleaned up ${data.deleted} test events` });
      qc.invalidateQueries({ queryKey: ["/api/admin/funnel"] });
    },
    onError: () => {
      toast({ title: "Cleanup failed", variant: "destructive" });
    },
  });

  const { data, isLoading } = useQuery<FunnelData>({
    queryKey: ["/api/admin/funnel", range],
    queryFn: async () => {
      const res = await fetch(`/api/admin/funnel?range=${range}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load funnel data");
      return res.json();
    },
  });

  const stepMap = new Map<string, FunnelStep>();
  data?.steps?.forEach((s) => stepMap.set(s.eventName, s));

  const knownKeys = new Set(FUNNEL_ORDER.map((f) => f.key));
  const discoveredSteps = (data?.steps || [])
    .filter((s) => !knownKeys.has(s.eventName) && s.count > 0)
    .map((s) => ({
      key: s.eventName,
      label: s.eventName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      count: s.count,
      uniqueSessions: s.uniqueSessions,
    }));

  const orderedSteps = [
    ...FUNNEL_ORDER.map((f) => ({
      ...f,
      count: stepMap.get(f.key)?.count || 0,
      uniqueSessions: stepMap.get(f.key)?.uniqueSessions || 0,
    })).filter((s) => s.count > 0),
    ...discoveredSteps,
  ];

  const maxSessions = orderedSteps.length > 0 ? Math.max(...orderedSteps.map((s) => s.uniqueSessions)) : 1;

  const platformCounts = new Map<string, number>();
  data?.byPlatform?.forEach((p) => {
    const key = p.platform || "unknown";
    platformCounts.set(key, (platformCounts.get(key) || 0) + p.count);
  });

  return (
    <div className="min-h-screen bg-background" data-testid="admin-funnel-page">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/">
            <button className="p-2 rounded-full hover:bg-muted" data-testid="button-funnel-back">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold" data-testid="text-funnel-title">Conversion Funnel</h1>
            <p className="text-sm text-muted-foreground">Track user journey from app open to first habit</p>
          </div>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[100px]" data-testid="select-funnel-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="90d">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={cleanupMutation.isPending}
            data-testid="button-cleanup-admin"
            onClick={() => {
              if (confirm("Remove all funnel events from your admin/test sessions? This cannot be undone.")) {
                cleanupMutation.mutate({ adminUserId: "53886343" });
              }
            }}
          >
            {cleanupMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
            Clean Admin Data
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={cleanupMutation.isPending}
            data-testid="button-cleanup-deleted"
            onClick={() => {
              if (confirm("Remove all funnel events from deleted test account (53887655)? This cannot be undone.")) {
                cleanupMutation.mutate({ adminUserId: "53887655" });
              }
            }}
          >
            {cleanupMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
            Clean Test Account
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold" data-testid="text-funnel-total-sessions">{stepMap.get("app_open")?.uniqueSessions || 0}</p>
                  <p className="text-xs text-muted-foreground">Unique Opens</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold" data-testid="text-funnel-registrations">{data?.newRegistrations || 0}</p>
                  <p className="text-xs text-muted-foreground">New Signups</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold" data-testid="text-funnel-platforms">{platformCounts.size}</p>
                  <p className="text-xs text-muted-foreground">Platforms</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-primary" />
                  Funnel Steps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {orderedSteps.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-funnel-empty">
                    No funnel events recorded yet. Events will appear once users open the app.
                  </p>
                ) : (
                  orderedSteps.map((step, i) => {
                    const prevSessions = i > 0 ? orderedSteps[i - 1].uniqueSessions : step.uniqueSessions;
                    const dropoff = prevSessions > 0 ? Math.round(((prevSessions - step.uniqueSessions) / prevSessions) * 100) : 0;
                    const barWidth = Math.max((step.uniqueSessions / maxSessions) * 100, 2);
                    const isFailureStep = step.key === "auth_signup_failed";
                    const breakdown = isFailureStep && data?.failureBreakdown ? Object.entries(data.failureBreakdown) : [];

                    return (
                      <div key={step.key} className="space-y-1" data-testid={`funnel-step-${step.key}`}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium truncate flex-1">{step.label}</span>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="font-semibold tabular-nums">{step.uniqueSessions}</span>
                            {i > 0 && dropoff > 0 && (
                              <span className={`text-xs tabular-nums ${dropoff > 50 ? "text-red-500" : dropoff > 25 ? "text-amber-500" : "text-muted-foreground"}`}>
                                -{dropoff}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        {isFailureStep && breakdown.length > 0 && (
                          <div className="pl-1 pt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                            {breakdown.sort(([a], [b]) => a.localeCompare(b)).map(([key, count]) => (
                              <span key={key} className="text-xs text-muted-foreground tabular-nums">
                                {key} ×{count}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {platformCounts.size > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-primary" />
                    Events by Platform
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Array.from(platformCounts.entries()).map(([platform, count]) => (
                      <div key={platform} className="flex items-center justify-between text-sm" data-testid={`platform-${platform}`}>
                        <div className="flex items-center gap-2">
                          {platform === "ios" ? <Smartphone className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                          <span className="capitalize">{platform}</span>
                        </div>
                        <span className="font-semibold tabular-nums">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
