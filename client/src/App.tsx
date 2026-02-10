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
import PublicTemplates from "@/pages/PublicTemplates";
import BlogList from "@/pages/BlogList";
import BlogArticle from "@/pages/BlogArticle";
import { TermsOfServiceModal } from "@/components/TermsOfServiceModal";
import { CookieConsent } from "@/components/CookieConsent";
import PrivacyPolicy from "@/pages/PrivacyPolicy";

const PUBLIC_ROUTES = ["/templates", "/blog", "/privacy"];

function Router() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { hasAccess, isLoading: isPaymentLoading } = usePaymentStatus();
  const [location] = useLocation();
  const { toast } = useToast();
  
  useTracking();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    
    if (payment === 'success') {
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
        <Route component={Landing} />
      </Switch>
    );
  }

  if (isAuthLoading || !user) {
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
      <Route path="/" component={Dashboard} />
      <Route path="/habit/:id" component={HabitDetail} />
      <Route path="/progress/:view" component={Progress} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/accountability" component={Accountability} />
      <Route path="/account" component={Account} />
      <Route path="/community" component={Community} />
      <Route path="/community/post/:id" component={Community} />
      <Route path="/community/messages" component={Community} />
      <Route path="/community/profile" component={Community} />
      <Route path="/community/profile/:userId" component={Community} />
      <Route path="/coach" component={CoachChat} />
      <Route path="/admin/feedback" component={AdminFeedback} />
      <Route path="/admin/email" component={AdminEmail} />
      <Route path="/paywall" component={Paywall} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
          <CookieConsent />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
