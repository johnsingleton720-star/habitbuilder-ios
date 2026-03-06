import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/use-auth";
import { usePaymentStatus } from "@/hooks/use-payment";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTracking } from "@/hooks/use-tracking";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useVersionCheck } from "@/hooks/use-version-check";
import { PageTransition } from "@/components/PageTransition";
import { isNative } from "@/lib/platform";
import { apiRequest } from "@/lib/queryClient";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Landing from "@/pages/Landing";
import Paywall from "@/pages/Paywall";
import HabitDetail from "@/pages/HabitDetail";
import Account from "@/pages/Account";
import Progress from "@/pages/Progress";
import AdminFeedback from "@/pages/AdminFeedback";
import AdminEmail from "@/pages/AdminEmail";
import Analytics from "@/pages/Analytics";
import Accountability from "@/pages/Accountability";
import Community from "@/pages/Community";
import CoachChat from "@/pages/CoachChat";
import StackDetail from "@/pages/StackDetail";
import PublicTemplates from "@/pages/PublicTemplates";
import BlogList from "@/pages/BlogList";
import BlogArticle from "@/pages/BlogArticle";
import { TermsOfServiceModal } from "@/components/TermsOfServiceModal";
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

const PUBLIC_ROUTES = ["/templates", "/blog", "/privacy", "/terms", "/accept-invite", "/about", "/delete-account"];

function Router() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { hasAccess, isLoading: isPaymentLoading } = usePaymentStatus();
  const [location] = useLocation();
  const { toast } = useToast();
  
  useTracking();
  usePushNotifications();
  useVersionCheck();

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
    return <Landing />;
  }

  if (!user.tosAcceptedAt) {
    return <TermsOfServiceModal />;
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
    <Switch>
      <Route path="/"><PageTransition><Dashboard /></PageTransition></Route>
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
      <Route path="/journal"><PageTransition><Journal /></PageTransition></Route>
      <Route path="/focus"><PageTransition><FocusTimer /></PageTransition></Route>
      <Route path="/mood"><PageTransition><MoodTracker /></PageTransition></Route>
      <Route path="/goals"><PageTransition><Goals /></PageTransition></Route>
      <Route path="/planner"><PageTransition><DailyPlanner /></PageTransition></Route>
      <Route path="/resources"><PageTransition><Resources /></PageTransition></Route>
      <Route path="/paywall"><PageTransition><Paywall /></PageTransition></Route>
      <Route><PageTransition><NotFound /></PageTransition></Route>
    </Switch>
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
  );
}

export default App;
