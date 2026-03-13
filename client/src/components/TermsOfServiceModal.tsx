import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Shield, ChevronDown, ChevronUp } from "lucide-react";

export function TermsOfServiceBanner() {
  const [accepted, setAccepted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const acceptTosMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/user/accept-tos");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  return (
    <Card className="border-primary/30 bg-primary/5 dark:bg-primary/10" data-testid="card-tos-inline">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Shield className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold" data-testid="text-tos-title">Accept our terms to get started</h3>
            <p className="text-xs text-muted-foreground">
              One quick step before you begin
            </p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
          data-testid="button-tos-expand"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? "Hide terms" : "Read full terms"}
        </button>

        {expanded && (
          <div className="max-h-48 overflow-y-auto border rounded-md p-3 text-xs space-y-2 bg-background" data-testid="scroll-tos-content">
            <section>
              <h4 className="font-semibold mb-0.5">1. Acceptance of Terms</h4>
              <p className="text-muted-foreground">By using HabitBuilder.pro, you agree to these Terms and Community Guidelines.</p>
            </section>
            <section>
              <h4 className="font-semibold mb-0.5">2. Acceptable Use</h4>
              <p className="text-muted-foreground">Use the platform for lawful, constructive purposes. You must be 18+.</p>
            </section>
            <section>
              <h4 className="font-semibold mb-0.5">3. Prohibited Content</h4>
              <p className="text-muted-foreground">No harmful, illegal, hateful, or explicit content.</p>
            </section>
            <section>
              <h4 className="font-semibold mb-0.5">4. AI Content</h4>
              <p className="text-muted-foreground">AI content is guidance only, not professional advice.</p>
            </section>
            <section>
              <h4 className="font-semibold mb-0.5">5. Subscriptions</h4>
              <p className="text-muted-foreground">Cancel anytime. Your data is private.</p>
            </section>
            <p className="text-muted-foreground pt-1">
              Full terms at <a href="/terms" className="text-primary hover:underline">/terms</a>.
            </p>
          </div>
        )}

        <div className="flex items-start gap-2.5">
          <Checkbox
            id="accept-tos-inline"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked === true)}
            data-testid="checkbox-accept-tos"
            className="mt-0.5"
          />
          <label
            htmlFor="accept-tos-inline"
            className="text-xs cursor-pointer leading-relaxed"
          >
            I agree to the{" "}
            <a href="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</a>.
            I am 18+.
          </label>
        </div>

        <Button
          size="sm"
          className="w-full"
          disabled={!accepted || acceptTosMutation.isPending}
          onClick={() => acceptTosMutation.mutate()}
          data-testid="button-accept-tos"
        >
          {acceptTosMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
          ) : null}
          Accept & Continue
        </Button>
      </CardContent>
    </Card>
  );
}
