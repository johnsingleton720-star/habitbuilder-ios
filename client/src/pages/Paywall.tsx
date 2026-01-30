import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { CheckCircle2, Leaf, Sparkles, Shield, Zap, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface PriceData {
  price_id: string;
  unit_amount: number;
  name: string;
  description: string;
}

export default function Paywall() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const { data: priceData, isLoading: isPriceLoading, error: priceError, refetch } = useQuery<PriceData>({
    queryKey: ['/api/stripe/lifetime-price'],
    retry: 3,
    retryDelay: 1000,
    staleTime: 0,
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const response = await apiRequest('POST', '/api/checkout', { priceId });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('SESSION_EXPIRED');
        }
        throw new Error(errorData.error || 'Failed to start checkout');
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Unable to create checkout session. Please try again.");
      }
    },
    onError: (err: Error) => {
      if (err.message === 'SESSION_EXPIRED') {
        setError("Your session has expired. Please sign in again.");
        toast({
          title: "Session expired",
          description: "Please sign in again to continue.",
          variant: "destructive",
        });
      } else {
        setError(err.message || "Something went wrong. Please try again.");
        toast({
          title: "Checkout failed",
          description: err.message || "Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleRetry = async () => {
    setError(null);
    setIsRetrying(true);
    try {
      await refetch();
    } finally {
      setIsRetrying(false);
    }
  };

  const handlePurchase = async () => {
    setError(null);
    
    // If no price data, try to fetch it first
    if (!priceData?.price_id) {
      setIsRetrying(true);
      try {
        const result = await refetch();
        if (result.data?.price_id) {
          checkoutMutation.mutate(result.data.price_id);
        } else {
          setError("Unable to load pricing. Please try again.");
        }
      } catch {
        setError("Unable to load pricing. Please check your connection and try again.");
      } finally {
        setIsRetrying(false);
      }
      return;
    }
    
    checkoutMutation.mutate(priceData.price_id);
  };

  const formatPrice = (amount: number) => {
    return (amount / 100).toFixed(2);
  };

  const features = [
    { icon: CheckCircle2, text: "Unlimited habit tracking" },
    { icon: Sparkles, text: "Daily AI-powered motivation" },
    { icon: Zap, text: "Progress visualization" },
    { icon: Shield, text: "Secure cloud sync" },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col items-center justify-center p-4 font-body">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4 font-display text-2xl font-bold text-primary">
            <Leaf className="w-8 h-8 fill-primary/20" />
            <span>HabitGrow</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Unlock Full Access
          </h1>
          <p className="text-muted-foreground">
            One payment. Lifetime access. No subscriptions.
          </p>
        </div>

        <Card className="shadow-xl border-primary/20">
          <CardHeader className="text-center pb-4">
            <CardTitle className="flex items-center justify-center gap-2">
              <span className="text-4xl font-display font-bold text-primary">
                ${isPriceLoading ? "..." : formatPrice(priceData?.unit_amount || 999)}
              </span>
            </CardTitle>
            <CardDescription className="text-base">
              One-time payment for lifetime access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ul className="space-y-3">
              {features.map((feature, i) => (
                <motion.li 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 text-foreground"
                >
                  <feature.icon className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>{feature.text}</span>
                </motion.li>
              ))}
            </ul>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {error?.includes("session") ? (
              <Button 
                onClick={() => window.location.href = "/api/login"}
                className="w-full h-14 text-lg rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                data-testid="button-signin-again"
              >
                Sign In Again
              </Button>
            ) : (
              <Button 
                onClick={handlePurchase}
                disabled={isPriceLoading || checkoutMutation.isPending || isRetrying}
                className="w-full h-14 text-lg rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                data-testid="button-purchase"
              >
                {(checkoutMutation.isPending || isRetrying) ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {isRetrying ? "Loading..." : "Processing..."}
                  </>
                ) : (
                  "Get Lifetime Access"
                )}
              </Button>
            )}

            <p className="text-xs text-center text-muted-foreground">
              Secure payment powered by Stripe. Cancel anytime during checkout.
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Signed in as {user?.email}
          </p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => logout()}
            data-testid="button-logout"
          >
            Sign out
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
