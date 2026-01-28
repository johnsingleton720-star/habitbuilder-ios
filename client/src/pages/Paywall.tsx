import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { CheckCircle2, Leaf, Sparkles, Shield, Zap, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface PriceData {
  price_id: string;
  unit_amount: number;
  name: string;
  description: string;
}

export default function Paywall() {
  const { user, logout } = useAuth();

  const { data: priceData, isLoading: isPriceLoading } = useQuery<PriceData>({
    queryKey: ['/api/stripe/lifetime-price'],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const response = await apiRequest('POST', '/api/checkout', { priceId });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  const handlePurchase = () => {
    if (priceData?.price_id) {
      checkoutMutation.mutate(priceData.price_id);
    }
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
                ${isPriceLoading ? "..." : formatPrice(priceData?.unit_amount || 299)}
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

            <Button 
              onClick={handlePurchase}
              disabled={isPriceLoading || checkoutMutation.isPending}
              className="w-full h-14 text-lg rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
              data-testid="button-purchase"
            >
              {checkoutMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Get Lifetime Access"
              )}
            </Button>

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
