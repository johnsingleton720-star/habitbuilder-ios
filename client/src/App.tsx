import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { usePaymentStatus } from "@/hooks/use-payment";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Landing from "@/pages/Landing";
import Paywall from "@/pages/Paywall";
import HabitDetail from "@/pages/HabitDetail";
import Account from "@/pages/Account";
import Progress from "@/pages/Progress";

function Router() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { hasAccess, isLoading: isPaymentLoading } = usePaymentStatus();
  const [location] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    
    if (payment === 'success') {
      toast({
        title: "Payment successful!",
        description: "Welcome to HabitGrow. Start building better habits today!",
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
      <Route path="/account" component={Account} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
