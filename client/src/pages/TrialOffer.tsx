import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { isIOS } from "@/lib/platform";
import { APPLE_PRODUCT_IDS, purchaseProduct, initializeAppleIAP, type PurchaseResult } from "@/lib/apple-iap";
import { trackFunnelEvent } from "@/hooks/use-funnel-tracking";
import {
  Crown,
  Sparkles,
  Check,
  Loader2,
  Brain,
  Flame,
  Zap,
  Target,
  BookOpen,
  BarChart2,
  Shield,
} from "lucide-react";
import { Logo } from "@/components/Logo";

const PRO_FEATURES = [
  { icon: Brain, label: "AI-powered habit coaching & action plans" },
  { icon: Flame, label: "Unlimited habits with streak tracking" },
  { icon: Zap, label: "Focus timer, journal & mood tracking" },
  { icon: Target, label: "Guided sessions with AI summaries" },
  { icon: BookOpen, label: "Weekly progress reports" },
  { icon: BarChart2, label: "Advanced analytics & insights" },
];

const PREMIUM_EXTRAS = [
  "Goals & milestones",
  "Accountability partners",
  "AI coach chat",
  "Community forum",
  "Daily AI planner",
];

export default function TrialOffer() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedTier, setSelectedTier] = useState<"pro" | "premium">("pro");
  const [isStartingIAP, setIsStartingIAP] = useState(false);

  useEffect(() => {
    trackFunnelEvent("trial_offer_viewed", { platform: isIOS() ? "ios" : "web" });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("cancelled") === "true") {
      trackFunnelEvent("trial_stripe_cancelled");
      toast({
        title: "Trial not started",
        description: "No worries — you can start your free trial anytime.",
      });
      window.history.replaceState({}, "", "/trial-offer");
    }
  }, []);

  const markTrialOfferShown = async () => {
    try {
      await apiRequest("POST", "/api/user/decline-trial");
    } catch {}
    queryClient.setQueryData(["/api/auth/user"], (old: any) =>
      old ? { ...old, trialOfferShown: true } : old
    );
  };

  const trialMutation = useMutation({
    mutationFn: async (tier: "pro" | "premium") => {
      trackFunnelEvent("trial_start_tapped", { tier, method: "stripe" });
      const res = await apiRequest("POST", "/api/checkout/trial", { tier });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to start trial");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        trackFunnelEvent("trial_stripe_redirect", { tier: selectedTier });
        window.location.href = data.url;
      }
    },
    onError: (err: Error) => {
      trackFunnelEvent("trial_start_failed", { tier: selectedTier, method: "stripe", error: err.message });
      toast({
        title: "Couldn't start trial",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async () => {
      trackFunnelEvent("trial_offer_declined", { platform: isIOS() ? "ios" : "web" });
      const res = await apiRequest("POST", "/api/user/decline-trial");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], (old: any) =>
        old ? { ...old, trialOfferShown: true } : old
      );
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      navigate("/");
    },
    onError: () => {
      queryClient.setQueryData(["/api/auth/user"], (old: any) =>
        old ? { ...old, trialOfferShown: true } : old
      );
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      navigate("/");
    },
  });

  const handleStartTrial = async () => {
    if (isIOS()) {
      setIsStartingIAP(true);
      trackFunnelEvent("trial_start_tapped", { tier: selectedTier, method: "apple_iap" });
      try {
        await initializeAppleIAP();
        const productId =
          selectedTier === "premium"
            ? APPLE_PRODUCT_IDS.premium_monthly
            : APPLE_PRODUCT_IDS.pro_monthly;
        const result = await purchaseProduct(productId);
        if (result.success) {
          trackFunnelEvent("trial_iap_authorized", { tier: selectedTier, productId });
          await markTrialOfferShown();
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          navigate("/?post_purchase=true");
        } else {
          trackFunnelEvent("trial_iap_failed", {
            tier: selectedTier,
            productId,
            reason: result.errorCode || "unknown",
            error: result.error || "purchase_failed",
          });
          const isCancelled = result.errorCode === '6777010' || 
                              result.errorCode === 'PAYMENT_CANCELLED' || 
                              (result.error || '').toLowerCase().includes('cancel');
          toast({
            title: isCancelled ? "Purchase cancelled" : "Purchase not completed",
            description: isCancelled 
              ? "No charge was made. Tap the button to try again when you're ready."
              : `Something went wrong (${result.errorCode || 'unknown'}). Please try again.`,
            variant: isCancelled ? "default" : "destructive",
          });
        }
      } catch (err: any) {
        trackFunnelEvent("trial_iap_failed", { tier: selectedTier, reason: "exception", error: err?.message || "unknown" });
        toast({
          title: "Purchase error",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsStartingIAP(false);
      }
      return;
    }
    trialMutation.mutate(selectedTier);
  };

  const isLoading = trialMutation.isPending || isStartingIAP;
  const proPrice = "$6";
  const premiumPrice = "$15";
  const price = selectedTier === "premium" ? premiumPrice : proPrice;
  const onIOS = isIOS();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5 flex flex-col items-center safe-top safe-bottom">
      <div className="w-full max-w-lg px-5 py-6 flex flex-col min-h-screen">
        <div className="flex items-center justify-between mb-8">
          <Logo size="sm" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex-1 flex flex-col"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring" }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4"
            >
              <Crown className="w-8 h-8 text-primary" />
            </motion.div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2" data-testid="text-trial-headline">
              Start Your 7-Day Free Trial
            </h1>
            <p className="text-muted-foreground text-sm">
              {onIOS
                ? "Try everything free for 7 days — you won't be charged until your trial ends."
                : "Enter your card today — you won't be charged until your trial ends."}
            </p>
          </div>

          <div className="flex gap-3 mb-6" data-testid="tier-selector">
            <button
              onClick={() => { setSelectedTier("pro"); trackFunnelEvent("trial_tier_selected", { tier: "pro" }); }}
              className={`flex-1 rounded-xl border-2 p-4 text-left transition-all ${
                selectedTier === "pro"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card"
              }`}
              data-testid="button-select-pro"
            >
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Pro</span>
                {selectedTier === "pro" && (
                  <Badge className="ml-auto text-xs py-0">Selected</Badge>
                )}
              </div>
              <p className="text-xl font-display font-bold text-foreground">
                {proPrice}<span className="text-sm font-normal text-muted-foreground">/mo after trial</span>
              </p>
            </button>
            <button
              onClick={() => { setSelectedTier("premium"); trackFunnelEvent("trial_tier_selected", { tier: "premium" }); }}
              className={`flex-1 rounded-xl border-2 p-4 text-left transition-all ${
                selectedTier === "premium"
                  ? "border-amber-500 bg-amber-500/5"
                  : "border-border bg-card"
              }`}
              data-testid="button-select-premium"
            >
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4 text-amber-500" />
                <span className="font-semibold text-sm">Premium</span>
                {selectedTier === "premium" && (
                  <Badge className="ml-auto text-xs py-0 bg-amber-500">Selected</Badge>
                )}
              </div>
              <p className="text-xl font-display font-bold text-foreground">
                {premiumPrice}<span className="text-sm font-normal text-muted-foreground">/mo after trial</span>
              </p>
            </button>
          </div>

          <div className="bg-card border rounded-xl p-4 mb-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              {selectedTier === "pro" ? "Pro" : "All Pro features, plus:"}
            </p>
            <ul className="space-y-2">
              {(selectedTier === "pro" ? PRO_FEATURES : PRO_FEATURES.slice(0, 3)).map((f, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>{f.label}</span>
                </li>
              ))}
              {selectedTier === "premium" &&
                PREMIUM_EXTRAS.map((f, i) => (
                  <li key={`ex-${i}`} className="flex items-center gap-2.5 text-sm">
                    <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
            </ul>
          </div>

          <div className="mt-auto space-y-3">
            <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-center">
              <p className="text-sm font-medium text-foreground">
                <span className="text-primary font-bold">$0 today</span>
                {" "}→ then{" "}
                <span className="font-bold">{price}/month</span>
                {" "}starting{" "}
                <span className="font-medium">day 8</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Cancel anytime before your trial ends</p>
            </div>

            <Button
              onClick={handleStartTrial}
              disabled={isLoading}
              className="w-full h-14 text-base font-semibold rounded-xl shadow-lg shadow-primary/20"
              data-testid="button-start-trial"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Setting up trial...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  Start My Free Trial
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              {onIOS
                ? "Subscription managed through Apple. Cancel anytime in Settings."
                : "Secure payment via Stripe. No charge for 7 days. Cancel anytime."}
            </p>

            <div className="text-center pt-1">
              <button
                onClick={() => declineMutation.mutate()}
                disabled={declineMutation.isPending}
                className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                data-testid="button-trial-no-thanks-bottom"
              >
                {declineMutation.isPending ? "Continuing..." : "No thanks, continue with the free plan"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
