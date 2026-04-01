import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { isIOS } from "@/lib/platform";
import { APPLE_PRODUCT_IDS, purchaseProduct, initializeAppleIAP } from "@/lib/apple-iap";
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
  X,
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
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [isStartingIAP, setIsStartingIAP] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("cancelled") === "true") {
      toast({
        title: "Trial not started",
        description: "No worries — you can start your free trial anytime.",
      });
      window.history.replaceState({}, "", "/trial-offer");
    }
  }, []);

  const trialMutation = useMutation({
    mutationFn: async (tier: "pro" | "premium") => {
      const res = await apiRequest("POST", "/api/checkout/trial", { tier });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to start trial");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err: Error) => {
      toast({
        title: "Couldn't start trial",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/user/decline-trial");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      navigate("/");
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      navigate("/");
    },
  });

  const handleStartTrial = async () => {
    if (isIOS()) {
      setIsStartingIAP(true);
      try {
        await initializeAppleIAP();
        const productId =
          selectedTier === "premium"
            ? APPLE_PRODUCT_IDS.premium_monthly
            : APPLE_PRODUCT_IDS.pro_monthly;
        const success = await purchaseProduct(productId);
        if (!success) {
          toast({
            title: "Purchase failed",
            description: "Unable to complete purchase. Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        setIsStartingIAP(false);
      }
      return;
    }
    trialMutation.mutate(selectedTier);
  };

  const handleDeclineConfirm = () => {
    declineMutation.mutate();
    setShowDeclineDialog(false);
  };

  const isLoading = trialMutation.isPending || isStartingIAP;
  const proPrice = "$6";
  const premiumPrice = "$15";
  const price = selectedTier === "premium" ? premiumPrice : proPrice;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5 flex flex-col items-center safe-top safe-bottom">
      <div className="w-full max-w-lg px-5 py-6 flex flex-col min-h-screen">
        <div className="flex items-center justify-between mb-8">
          <Logo size="sm" />
          <button
            onClick={() => setShowDeclineDialog(true)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-trial-no-thanks-top"
          >
            No thanks
          </button>
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
              Enter your card today — you won't be charged until your trial ends.
            </p>
          </div>

          <div className="flex gap-3 mb-6" data-testid="tier-selector">
            <button
              onClick={() => setSelectedTier("pro")}
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
              onClick={() => setSelectedTier("premium")}
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
              {isIOS()
                ? "Subscription managed through Apple. Cancel anytime in Settings."
                : "Secure payment via Stripe. No charge for 7 days. Cancel anytime."}
            </p>

            <button
              onClick={() => setShowDeclineDialog(true)}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              data-testid="button-trial-no-thanks-bottom"
            >
              No thanks, continue with the free plan
            </button>
          </div>
        </motion.div>
      </div>

      <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <AlertDialogContent data-testid="dialog-decline-trial">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <X className="w-5 h-5 text-muted-foreground" />
              Continue without a trial?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You'll be limited to 1 habit and basic features on the free plan. You can
              upgrade anytime from your account settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-decline-go-back">
              Go back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeclineConfirm}
              className="bg-muted text-foreground hover:bg-muted/80"
              data-testid="button-decline-confirm"
            >
              Yes, stay on free
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
