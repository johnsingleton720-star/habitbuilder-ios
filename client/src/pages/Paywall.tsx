import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { Check, X, Leaf, Sparkles, Crown, Loader2, AlertCircle, Zap, Clock, ArrowLeft, Star, Users, Target } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";
import { SeoSchema } from "@/components/SeoSchema";
import { isIOS } from "@/lib/platform";
import { APPLE_PRODUCT_IDS, purchaseProduct, restorePurchases, initializeAppleIAP } from "@/lib/apple-iap";

interface PricingTier {
  tier: string;
  name: string;
  price: number;
  priceId: string | null;
  annualPrice?: number;
  annualPriceId?: string | null;
  description: string;
  features: string[];
  limitations?: string[];
  popular?: boolean;
}

interface PricingData {
  tiers: PricingTier[];
}

interface FoundingMemberSlots {
  [tier: string]: {
    total: number;
    used: number;
    remaining: number;
    priceYearly: number;
    active: boolean;
  };
}

export default function Paywall() {
  usePageTitle("Choose Your Plan", "Choose the right HabitBuilder.pro plan. 1 habit free forever. Pro at $6 USD/month for unlimited habits, or Premium at $15 USD/month with advanced analytics and community features.");
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { isInTrial, trialExpired, trialDaysRemaining } = useSubscription();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);

  const { data: pricingData, isLoading } = useQuery<PricingData>({
    queryKey: ['/api/stripe/pricing'],
    staleTime: 60000,
  });

  const { data: slotsData } = useQuery<FoundingMemberSlots>({
    queryKey: ['/api/founding-member-slots'],
    staleTime: 30000,
  });
  
  useEffect(() => {
    if (isIOS()) {
      initializeAppleIAP().then(ready => {
        if (!ready) console.warn('[Paywall] IAP initialization returned false');
      });
    }
  }, []);

  const paidTiers = pricingData?.tiers.filter(tier => tier.tier !== 'free') || [];

  const hasAnyAnnualSlots = slotsData && (
    (slotsData.pro?.remaining > 0 && slotsData.pro?.active) ||
    (slotsData.premium?.remaining > 0 && slotsData.premium?.active)
  );

  const checkoutMutation = useMutation({
    mutationFn: async ({ priceId, tier, billingInterval }: { priceId: string; tier: string; billingInterval: string }) => {
      const response = await apiRequest('POST', '/api/checkout', { priceId, tier, billingInterval });
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

  const handleSelectTier = async (tier: PricingTier) => {
    if (isIOS()) {
      const productId = tier.tier === 'pro'
        ? (isAnnual ? APPLE_PRODUCT_IDS.pro_annual : APPLE_PRODUCT_IDS.pro_monthly)
        : (isAnnual ? APPLE_PRODUCT_IDS.premium_annual : APPLE_PRODUCT_IDS.premium_monthly);
      
      setSelectedTier(tier.tier);
      const success = await purchaseProduct(productId);
      if (!success) {
        setSelectedTier(null);
        toast({
          title: "Purchase failed",
          description: "Unable to complete purchase. Please try again.",
          variant: "destructive",
        });
      }
      return;
    }

    if (isAnnual && tier.annualPriceId) {
      setSelectedTier(tier.tier);
      checkoutMutation.mutate({ priceId: tier.annualPriceId, tier: tier.tier, billingInterval: 'year' });
    } else if (tier.priceId) {
      setSelectedTier(tier.tier);
      checkoutMutation.mutate({ priceId: tier.priceId, tier: tier.tier, billingInterval: 'month' });
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

  const getSlotInfo = (tier: string) => {
    if (!slotsData || !slotsData[tier]) return null;
    return slotsData[tier];
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col items-center py-12 px-4 font-body">
      <SeoSchema breadcrumbs={[
        { name: "Home", url: "https://habitbuilder.pro/" },
        { name: "Pricing", url: "https://habitbuilder.pro/paywall" }
      ]} />
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
          <div className="inline-flex items-center gap-2 mb-4">
            <Logo size="lg" />
          </div>
          
          {trialExpired ? (
            <>
              <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-primary font-medium">Free plan - 1 habit included</span>
              </div>
              <h1 className="font-display text-4xl font-bold text-foreground mb-3">
                Unlock Unlimited Habits
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                You can keep using 1 habit for free with 3 sessions per week. Upgrade for unlimited sessions, AI coaching insights, streaks, plan updates, and more.
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

        {hasAnyAnnualSlots && (
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-3 p-1.5 rounded-lg border bg-muted/50" data-testid="toggle-billing-interval">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${!isAnnual ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                data-testid="button-billing-monthly"
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${isAnnual ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                data-testid="button-billing-annual"
              >
                Annual
                <Badge variant="secondary" className="text-xs">
                  Founding Member
                </Badge>
              </button>
            </div>
          </div>
        )}

        {isAnnual && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto mb-8"
          >
            <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 dark:from-primary/15 dark:via-primary/10 dark:to-primary/15 border border-primary/30 rounded-lg px-6 py-4 text-center" data-testid="banner-founding-member">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Star className="w-5 h-5 text-primary" />
                <span className="font-display font-bold text-lg">Founding Member Annual Plans</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Limited-time offer for early supporters. Lock in exclusive annual pricing. Once these spots are filled, annual plans will no longer be available to new members.
              </p>
            </div>
          </motion.div>
        )}

        {!isAnnual && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-2xl mx-auto mb-8"
          >
            <div className="relative bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 dark:from-amber-500/15 dark:via-amber-400/10 dark:to-amber-500/15 border border-amber-500/30 rounded-lg px-6 py-4 text-center" data-testid="banner-promo-premium50">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Crown className="w-5 h-5 text-amber-500" />
                <span className="font-display font-bold text-lg">Launch Special: 50% Off Premium</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Use code <span className="font-mono font-bold text-foreground bg-amber-500/10 px-2 py-0.5 rounded">Premium50</span> at checkout to get your first month for just <span className="font-semibold text-foreground">$7.50</span>. Offer expires March 9th.
              </p>
            </div>
          </motion.div>
        )}

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
              const slotInfo = getSlotInfo(tier.tier);
              const annualSoldOut = isAnnual && slotInfo && (slotInfo.remaining <= 0 || !slotInfo.active);
              const monthlyPrice = tier.price;
              const annualTotal = tier.annualPrice || 0;
              const annualMonthly = annualTotal > 0 ? Math.round(annualTotal / 12) : 0;
              const savings = (monthlyPrice * 12) - annualTotal;
              
              return (
                <motion.div
                  key={tier.tier}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`relative h-full flex flex-col ${tier.popular ? 'border-primary shadow-lg shadow-primary/20' : ''}`}>
                    {isAnnual ? (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                        Founding Member
                      </Badge>
                    ) : tier.popular ? (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                        Most Popular
                      </Badge>
                    ) : null}
                    
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
                        {isAnnual ? (
                          <>
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <span className="text-2xl text-muted-foreground line-through">${formatPrice(monthlyPrice)}/mo</span>
                            </div>
                            <span className={`text-5xl font-display font-bold ${colorClass}`} data-testid={`text-annual-price-${tier.tier}`}>
                              ${formatPrice(annualMonthly)}
                            </span>
                            <span className="text-muted-foreground">/mo</span>
                            <span className="block text-sm text-muted-foreground mt-1" data-testid={`text-annual-total-${tier.tier}`}>
                              ${formatPrice(annualTotal)}/year, billed annually
                            </span>
                            {savings > 0 && (
                              <Badge variant="secondary" className="mt-2" data-testid={`badge-savings-${tier.tier}`}>
                                Save ${formatPrice(savings)}/year
                              </Badge>
                            )}
                          </>
                        ) : (
                          <>
                            <span className={`text-5xl font-display font-bold ${colorClass}`}>
                              ${formatPrice(tier.price)}
                            </span>
                            {tier.price > 0 && (
                              <span className="text-muted-foreground">/month</span>
                            )}
                            {tier.price > 0 && (
                              <span className="block text-xs text-muted-foreground mt-0.5">USD</span>
                            )}
                          </>
                        )}
                      </div>

                      {isAnnual && slotInfo && (
                        <div className="mb-4 p-3 rounded-lg border bg-muted/30 text-center" data-testid={`slots-counter-${tier.tier}`}>
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {slotInfo.remaining > 0 ? (
                                <>{slotInfo.remaining} of {slotInfo.total} spots remaining</>
                              ) : (
                                <span className="text-destructive">Sold Out</span>
                              )}
                            </span>
                          </div>
                          {slotInfo.remaining > 0 && slotInfo.remaining <= 10 && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">Almost gone!</p>
                          )}
                        </div>
                      )}
                      
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
                        disabled={isProcessing || checkoutMutation.isPending || !!annualSoldOut}
                        variant={tier.popular || isAnnual ? "default" : "outline"}
                        className={`w-full ${tier.popular ? 'shadow-lg shadow-primary/25' : ''}`}
                        data-testid={`button-select-${tier.tier}${isAnnual ? '-annual' : ''}`}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : annualSoldOut ? (
                          'Sold Out'
                        ) : isAnnual ? (
                          `Get Founding Member ${tier.name}`
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
          <div className="bg-card rounded-xl p-6 max-w-3xl mx-auto border">
            <h3 className="font-display text-xl font-semibold mb-3">
              Why upgrade to a paid plan?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-medium">AI-Powered Coaching</p>
                <p className="text-muted-foreground">Personalized action plans and session summaries</p>
              </div>
              <div className="text-center">
                <Zap className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-medium">Productivity Suite</p>
                <p className="text-muted-foreground">Journal, focus timer, mood tracking, and daily challenges</p>
              </div>
              <div className="text-center">
                <Target className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-medium">Smart Planning</p>
                <p className="text-muted-foreground">AI daily planner, goals & milestones, and full journal analysis</p>
              </div>
              <div className="text-center">
                <Crown className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="font-medium">Community & Support</p>
                <p className="text-muted-foreground">Accountability partners, forums, AI coach chat, and priority support</p>
              </div>
            </div>
          </div>
        </div>

        {isIOS() && (
          <div className="mt-8 text-center">
            <Button
              variant="ghost"
              onClick={async () => {
                const restored = await restorePurchases();
                toast({
                  title: restored ? "Purchases restored" : "No purchases found",
                  description: restored
                    ? "Your subscription has been restored."
                    : "No previous purchases were found for this account.",
                });
              }}
              className="text-sm text-muted-foreground"
              data-testid="button-restore-purchases"
            >
              Restore Purchases
            </Button>
          </div>
        )}

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
          {isIOS() ? "Subscriptions managed through Apple. " : "Secure payment powered by Stripe. "}Cancel anytime.
        </p>
        <p className="text-xs text-center text-muted-foreground mt-1">
          Prices in USD. {isIOS() ? "Payment will be charged to your Apple ID account." : "International payments accepted worldwide."}
        </p>
        <div className="flex items-center justify-center gap-3 mt-3">
          <Link href="/terms">
            <span className="text-xs text-primary underline underline-offset-2 cursor-pointer" data-testid="link-paywall-terms">Terms of Use</span>
          </Link>
          <span className="text-xs text-muted-foreground">|</span>
          <Link href="/privacy">
            <span className="text-xs text-primary underline underline-offset-2 cursor-pointer" data-testid="link-paywall-privacy">Privacy Policy</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
