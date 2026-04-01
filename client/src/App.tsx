import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/use-auth";
import { usePaymentStatus } from "@/hooks/use-payment";
import { trackFunnelEvent } from "@/hooks/use-funnel-tracking";
import { Loader2, RefreshCw } from "lucide-react";
import { useState, useEffect, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTracking } from "@/hooks/use-tracking";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useVersionCheck } from "@/hooks/use-version-check";
import { PageTransition } from "@/components/PageTransition";
import { isNative, isIOS } from "@/lib/platform";
import { apiRequest } from "@/lib/queryClient";
import { NativeEmailAuth } from "@/components/NativeEmailAuth";
import { IOSNotificationPrompt } from "@/components/IOSNotificationPrompt";
import { WelcomeHub, shouldShowWelcomeHub } from "@/components/WelcomeHub";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App ErrorBoundary caught:", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">An unexpected error occurred. Please refresh the page to continue.</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-primary text-primary-foreground px-6 py-2 text-sm font-semibold"
              data-testid="button-error-reload"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Landing from "@/pages/Landing";
import Paywall from "@/pages/Paywall";
import PreSignupOnboarding from "@/pages/PreSignupOnboarding";
import HabitDetail from "@/pages/HabitDetail";
import Account from "@/pages/Account";
import Progress from "@/pages/Progress";
import AdminFeedback from "@/pages/AdminFeedback";
import AdminEmail from "@/pages/AdminEmail";
import AdminFunnel from "@/pages/AdminFunnel";
import Analytics from "@/pages/Analytics";
import Accountability from "@/pages/Accountability";
import Community from "@/pages/Community";
import CoachChat from "@/pages/CoachChat";
import StackDetail from "@/pages/StackDetail";
import PublicTemplates from "@/pages/PublicTemplates";
import BlogList from "@/pages/BlogList";
import BlogArticle from "@/pages/BlogArticle";
import { TermsOfServiceGate } from "@/components/TermsOfServiceModal";
import { CookieConsent } from "@/components/CookieConsent";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import AcceptInvite from "@/pages/AcceptInvite";
import Resources from "@/pages/Resources";
import About from "@/pages/About";
import DeleteAccount from "@/pages/DeleteAccount";
import Journal from "@/pages/Journal";
import FocusTimer from "@/pages/FocusTimer";
import MoodTracker from "@/pages/MoodTracker";
import Goals from "@/pages/Goals";
import DailyPlanner from "@/pages/DailyPlanner";
import SignedOut from "@/pages/SignedOut";
import ResetPassword from "@/pages/ResetPassword";
import TrialOffer from "@/pages/TrialOffer";

function VersionUpdateBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-primary text-primary-foreground px-4 py-3 shadow-lg safe-top" data-testid="banner-version-update">
      <div className="flex items-center justify-center gap-3 max-w-lg mx-auto">
        <RefreshCw className="w-4 h-4 flex-shrink-0" />
        <p className="text-sm font-medium">A new version is available.</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-md bg-primary-foreground text-primary px-4 py-1.5 text-sm font-semibold whitespace-nowrap"
          data-testid="button-refresh-update"
        >
          Refresh Now
        </button>
      </div>
    </div>
  );
}

const PUBLIC_ROUTES = ["/templates", "/blog", "/privacy", "/terms", "/accept-invite", "/about", "/delete-account", "/signed-out", "/welcome", "/reset-password"];

function Router() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { hasAccess, isLoading: isPaymentLoading } = usePaymentStatus();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [showNativeAuth, setShowNativeAuth] = useState(false);
  const [showWelcomeHub, setShowWelcomeHub] = useState(false);
  const [welcomeHubCheckedUserId, setWelcomeHubCheckedUserId] = useState<string | null>(null);
  const [triggerTourAfterHub, setTriggerTourAfterHub] = useState(false);
  const [triggerCreateHabit, setTriggerCreateHabit] = useState(false);
  const [presignupHandoffDone, setPresignupHandoffDone] = useState(!localStorage.getItem("presignup_data"));
  
  useTracking();
  usePushNotifications();
  const { updateAvailable } = useVersionCheck();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    
    if (payment === 'success') {
      const tier = params.get('tier');
      const value = tier === 'premium' ? 15.0 : 6.0;
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'conversion', {
          'send_to': 'AW-17945383806/BU3-CMnypfYbEP6mg-1C',
          'value': value,
          'currency': 'USD',
          'transaction_id': '',
        });
      }
      toast({
        title: "Payment successful!",
        description: "Welcome to HabitBuilder.pro. Start building better habits today!",
      });
      window.history.replaceState({}, '', '/');
    } else if (payment === 'cancelled') {
      toast({
        title: "Payment cancelled",
        description: "No worries! You can complete your purchase anytime.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/');
    }
  }, [toast]);

  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem("presignup_data");
    if (!stored) {
      if (!presignupHandoffDone) setPresignupHandoffDone(true);
      return;
    }

    if ((window as any).__presignupHandoffInProgress) return;
    (window as any).__presignupHandoffInProgress = true;
    if (presignupHandoffDone) setPresignupHandoffDone(false);

    (async () => {
      try {
        const presignupData = JSON.parse(stored);
        localStorage.removeItem("presignup_data");

        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const res = await apiRequest("POST", "/api/habits/from-presignup", { ...presignupData, clientTimezone: browserTimezone });
        if (res.ok) {
          const createdHabit = await res.json();
          if (createdHabit?.id) {
            localStorage.setItem("presignup_habit_id", String(createdHabit.id));
            trackFunnelEvent("first_habit_created", { habitId: createdHabit.id, mode: presignupData.trackingMode || "ai" });
          }
          queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
          queryClient.invalidateQueries({ queryKey: ["/api/habits/summary"] });
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          if (window.location.pathname !== "/") {
            navigate("/");
          }
          const isSimple = presignupData.trackingMode === "simple";
          toast({
            title: isSimple ? "Your habit is ready!" : "Your plan is saved!",
            description: isSimple
              ? `"${presignupData.habitTitle}" is set up. Check in daily to build your streak!`
              : `"${presignupData.habitTitle}" is ready. Start your first session!`,
          });
        } else {
          try {
            await apiRequest("PATCH", "/api/user/onboarding");
            await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
          } catch {}
          toast({
            title: "Couldn't save your plan",
            description: "But don't worry — you can create a new habit from the dashboard.",
            variant: "destructive",
          });
        }
      } catch (e) {
        console.error("Failed to create habit from presignup data:", e);
        try {
          await apiRequest("PATCH", "/api/user/onboarding");
          await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
        } catch {}
        toast({
          title: "Couldn't save your plan",
          description: "But don't worry — you can create a new habit from the dashboard.",
          variant: "destructive",
        });
      } finally {
        (window as any).__presignupHandoffInProgress = false;
        setPresignupHandoffDone(true);
      }
    })();
  }, [user, toast]);

  // Only new users see TrialOffer. All users who existed before this feature was deployed
  // were backfilled with trialOfferShown=true in the database, so they are never targeted.
  // presignupHandoffDone ensures we don't interrupt the pre-signup onboarding handoff.
  const needsTrialOffer = !!(
    user?.tosAcceptedAt &&
    !user?.isAdmin &&
    !user?.hasPaid &&
    !user?.trialOfferShown &&
    !user?.trialEndsAt &&
    presignupHandoffDone
  );

  useEffect(() => {
    if (!needsTrialOffer) return;
    if (location === '/trial-offer') return;
    navigate('/trial-offer');
  }, [needsTrialOffer, location]);

  useEffect(() => {
    if (!user?.id || isAuthLoading || isPaymentLoading || !presignupHandoffDone) return;
    if (welcomeHubCheckedUserId === user.id) return;
    setWelcomeHubCheckedUserId(user.id);
    if (!shouldShowWelcomeHub(user)) return;
    setShowWelcomeHub(true);
  }, [user?.id, isAuthLoading, isPaymentLoading, welcomeHubCheckedUserId, presignupHandoffDone]);

  const handleWelcomeHubDismiss = (action: "habit" | "tour" | "explore", navigationTarget?: string) => {
    setShowWelcomeHub(false);
    if (action === "tour") {
      setTimeout(() => setTriggerTourAfterHub(true), 300);
    } else if (action === "habit" && navigationTarget) {
      setTimeout(() => navigate(navigationTarget), 100);
    } else if (action === "habit" && !navigationTarget) {
      setTriggerCreateHabit(true);
    }
  };

  const isPublicRoute = PUBLIC_ROUTES.some(route => location.startsWith(route));

  if (isPublicRoute) {
    return (
      <Switch>
        <Route path="/templates" component={PublicTemplates} />
        <Route path="/blog/:slug" component={BlogArticle} />
        <Route path="/blog" component={BlogList} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/accept-invite/:token" component={AcceptInvite} />
        <Route path="/about" component={About} />
        <Route path="/delete-account" component={DeleteAccount} />
        <Route path="/signed-out" component={SignedOut} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/welcome" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  if (isAuthLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-auth" />
      </div>
    );
  }

  if (!user) {
    const showPresignup = isNative() || localStorage.getItem("presignup_data");
    if (showPresignup) {
      return (
        <>
          <PreSignupOnboarding onLogin={() => {
            if (isNative()) {
              setShowNativeAuth(true);
            } else {
              import("@/lib/auth-flow").then(m => m.openAuthFlow());
            }
          }} />
          {showNativeAuth && (
            <NativeEmailAuth
              onClose={() => setShowNativeAuth(false)}
              onSocialAuth={(provider) => {
                setShowNativeAuth(false);
                import("@/lib/auth-flow").then(m => m.openAuthFlow());
              }}
            />
          )}
        </>
      );
    }
    return <Landing />;
  }

  if (!user.tosAcceptedAt) {
    return <TermsOfServiceGate />;
  }

  if (needsTrialOffer && location !== '/trial-offer') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-trial-redirect" />
      </div>
    );
  }

  if (isPaymentLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-payment" />
      </div>
    );
  }

  if (!hasAccess) {
    return <Paywall />;
  }

  return (
    <>
    {showWelcomeHub && <WelcomeHub onDismiss={handleWelcomeHubDismiss} />}
    {updateAvailable && <VersionUpdateBanner />}
    {user && isNative() && isIOS() && !showWelcomeHub && presignupHandoffDone && welcomeHubCheckedUserId === String(user.id) && <IOSNotificationPrompt userId={user.id} />}
    <Switch>
      <Route path="/"><PageTransition><Dashboard triggerTour={triggerTourAfterHub} onTourTriggered={() => setTriggerTourAfterHub(false)} triggerCreateHabit={triggerCreateHabit} onCreateHabitTriggered={() => setTriggerCreateHabit(false)} /></PageTransition></Route>
      <Route path="/habit/:id">{(params) => <PageTransition><HabitDetail /></PageTransition>}</Route>
      <Route path="/stack/:id">{(params) => <PageTransition><StackDetail /></PageTransition>}</Route>
      <Route path="/progress/:view">{(params) => <PageTransition><Progress /></PageTransition>}</Route>
      <Route path="/analytics"><PageTransition><Analytics /></PageTransition></Route>
      <Route path="/accountability"><PageTransition><Accountability /></PageTransition></Route>
      <Route path="/accept-invite/:token">{(params) => <PageTransition><AcceptInvite /></PageTransition>}</Route>
      <Route path="/account"><PageTransition><Account /></PageTransition></Route>
      <Route path="/delete-account"><PageTransition><DeleteAccount /></PageTransition></Route>
      <Route path="/community"><PageTransition><Community /></PageTransition></Route>
      <Route path="/community/post/:id">{(params) => <PageTransition><Community /></PageTransition>}</Route>
      <Route path="/community/messages"><PageTransition><Community /></PageTransition></Route>
      <Route path="/community/profile"><PageTransition><Community /></PageTransition></Route>
      <Route path="/community/profile/:userId">{(params) => <PageTransition><Community /></PageTransition>}</Route>
      <Route path="/coach"><PageTransition><CoachChat /></PageTransition></Route>
      <Route path="/admin/feedback"><PageTransition><AdminFeedback /></PageTransition></Route>
      <Route path="/admin/email"><PageTransition><AdminEmail /></PageTransition></Route>
      <Route path="/admin/funnel"><PageTransition><AdminFunnel /></PageTransition></Route>
      <Route path="/journal"><PageTransition><Journal /></PageTransition></Route>
      <Route path="/focus"><PageTransition><FocusTimer /></PageTransition></Route>
      <Route path="/mood"><PageTransition><MoodTracker /></PageTransition></Route>
      <Route path="/goals"><PageTransition><Goals /></PageTransition></Route>
      <Route path="/planner"><PageTransition><DailyPlanner /></PageTransition></Route>
      <Route path="/resources"><PageTransition><Resources /></PageTransition></Route>
      <Route path="/paywall"><PageTransition><Paywall /></PageTransition></Route>
      <Route path="/trial-offer"><PageTransition><TrialOffer /></PageTransition></Route>
      <Route><PageTransition><NotFound /></PageTransition></Route>
    </Switch>
    </>
  );
}

function NativeAuthHandler() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isNative()) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        const listener = await CapApp.addListener('appUrlOpen', async (event: { url: string }) => {
          const url = event.url;
          if (url.startsWith('habitbuilder://auth')) {
            const params = new URL(url.replace('habitbuilder://', 'https://placeholder/'));
            const token = params.searchParams.get('token');
            if (token) {
              try {
                const { Browser } = await import('@capacitor/browser');
                await Browser.close();
                await apiRequest('POST', '/api/auth/exchange-token', { token });
                await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
                window.location.href = '/';
              } catch (err) {
                console.error('Token exchange failed:', err);
                toast({
                  title: 'Sign-in failed',
                  description: 'Something went wrong. Please try signing in again.',
                  variant: 'destructive',
                });
                navigate('/');
              }
            }
          }
        });
        cleanup = () => listener.remove();
      } catch (e) {
        console.warn('Capacitor App plugin not available:', e);
      }
    })();

    return () => { if (cleanup) cleanup(); };
  }, [toast, navigate]);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <NativeAuthHandler />
            <Router />
            <MobileBottomNav />
            <CookieConsent />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
