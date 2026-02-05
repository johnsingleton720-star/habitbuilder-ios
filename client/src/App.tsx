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
import Analytics from "@/pages/Analytics";
import Accountability from "@/pages/Accountability";
import Community from "@/pages/Community";
import Messages from "@/pages/Messages";
import UserProfile from "@/pages/UserProfile";

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
        description: "Welcome to Habit Builder. Start building better habits today!",
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
      <Route path="/community/messages" component={Messages} />
      <Route path="/community/profile" component={UserProfile} />
      <Route path="/community/profile/:userId" component={UserProfile} />
      <Route path="/admin/feedback" component={AdminFeedback} />
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
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
