import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { Check, X, Leaf, Sparkles, Crown, Loader2, AlertCircle, Zap, Clock, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";

interface PricingTier {
  tier: string;
  name: string;
  price: number;
  priceId: string | null;
  description: string;
  features: string[];
  limitations?: string[];
  popular?: boolean;
}

interface PricingData {
  tiers: PricingTier[];
}

export default function Paywall() {
  usePageTitle("Choose Your Plan");
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { isInTrial, trialExpired, trialDaysRemaining } = useSubscription();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const { data: pricingData, isLoading } = useQuery<PricingData>({
    queryKey: ['/api/stripe/pricing'],
    staleTime: 60000,
  });
  
  // Filter out free tier - only show Pro and Premium
  const paidTiers = pricingData?.tiers.filter(tier => tier.tier !== 'free') || [];

  const checkoutMutation = useMutation({
    mutationFn: async ({ priceId, tier }: { priceId: string; tier: string }) => {
      const response = await apiRequest('POST', '/api/checkout', { priceId, tier });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to start checkout');
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err: Error) => {
      toast({
        title: "Checkout failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSelectTier = (tier: PricingTier) => {
    if (tier.priceId) {
      setSelectedTier(tier.tier);
      checkoutMutation.mutate({ priceId: tier.priceId, tier: tier.tier });
    }
  };

  const formatPrice = (amount: number) => {
    return (amount / 100).toFixed(0);
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'free': return Leaf;
      case 'pro': return Sparkles;
      case 'premium': return Crown;
      default: return Zap;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'text-muted-foreground';
      case 'pro': return 'text-primary';
      case 'premium': return 'text-amber-500';
      default: return 'text-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col items-center py-12 px-4 font-body">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-5xl"
      >
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
        </div>
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4 font-display text-2xl font-bold text-primary">
            <Leaf className="w-8 h-8 fill-primary/20" />
            <span>Habit Builder</span>
          </div>
          
          {trialExpired ? (
            <>
              <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full">
                <Clock className="w-5 h-5 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400 font-medium">Your trial has ended</span>
              </div>
              <h1 className="font-display text-4xl font-bold text-foreground mb-3">
                Continue Your Habit Journey
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Subscribe now to keep building better habits with AI-powered coaching.
              </p>
            </>
          ) : isInTrial ? (
            <>
              <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full">
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-primary font-medium">{trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} left in your trial</span>
              </div>
              <h1 className="font-display text-4xl font-bold text-foreground mb-3">
                Upgrade to Continue Building Great Habits
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Subscribe now to unlock unlimited habits and premium features.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-4xl font-bold text-foreground mb-3">
                Choose Your Plan
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Pick the plan that fits your habit-building journey.
              </p>
            </>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {paidTiers.map((tier, index) => {
              const Icon = getTierIcon(tier.tier);
              const colorClass = getTierColor(tier.tier);
              const isProcessing = selectedTier === tier.tier && checkoutMutation.isPending;
              
              return (
                <motion.div
                  key={tier.tier}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`relative h-full flex flex-col ${tier.popular ? 'border-primary shadow-lg shadow-primary/20' : ''}`}>
                    {tier.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                        Most Popular
                      </Badge>
                    )}
                    
                    <CardHeader className="text-center pb-2">
                      <div className={`inline-flex justify-center mb-2 ${colorClass}`}>
                        <Icon className="w-10 h-10" />
                      </div>
                      <CardTitle className="text-2xl font-display">
                        {tier.name}
                      </CardTitle>
                      <CardDescription className="text-sm min-h-[40px]">
                        {tier.description}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="flex-1">
                      <div className="text-center mb-6">
                        <span className={`text-5xl font-display font-bold ${colorClass}`}>
                          ${formatPrice(tier.price)}
                        </span>
                        {tier.price > 0 && (
                          <span className="text-muted-foreground">/month</span>
                        )}
                      </div>
                      
                      <ul className="space-y-3">
                        {tier.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                        {tier.limitations?.map((limitation, i) => (
                          <li key={`limit-${i}`} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <X className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span>{limitation}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    
                    <CardFooter>
                      <Button
                        onClick={() => handleSelectTier(tier)}
                        disabled={isProcessing || checkoutMutation.isPending}
                        variant={tier.popular ? "default" : "outline"}
                        className={`w-full ${tier.popular ? 'shadow-lg shadow-primary/25' : ''}`}
                        data-testid={`button-select-${tier.tier}`}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          `Subscribe to ${tier.name}`
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="mt-12 text-center">
          <div className="bg-card rounded-xl p-6 max-w-2xl mx-auto border">
            <h3 className="font-display text-xl font-semibold mb-3">
              Why upgrade to a paid plan?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-medium">AI-Powered Coaching</p>
                <p className="text-muted-foreground">Personalized interviews and custom action plans</p>
              </div>
              <div className="text-center">
                <Zap className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-medium">Guided Sessions</p>
                <p className="text-muted-foreground">Step-by-step coaching with timers and notes</p>
              </div>
              <div className="text-center">
                <Crown className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="font-medium">Premium Features</p>
                <p className="text-muted-foreground">Voice notes, accountability partners, and more</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
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

        <p className="text-xs text-center text-muted-foreground mt-6">
          Secure payment powered by Stripe. Cancel anytime.
        </p>
      </motion.div>
    </div>
  );
}
