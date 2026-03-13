import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Shield, ChevronDown, ChevronUp } from "lucide-react";

export function TermsOfServiceModal() {
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
    <div className="min-h-screen bg-background flex items-start justify-center p-4 pt-12 md:pt-20 safe-top safe-bottom">
      <Card className="w-full max-w-lg" data-testid="card-tos-inline">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold" data-testid="text-tos-title">One quick step</h2>
              <p className="text-sm text-muted-foreground">
                Accept our terms to get started
              </p>
            </div>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            data-testid="button-tos-expand"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {expanded ? "Hide full terms" : "Read full terms"}
          </button>

          {expanded && (
            <div className="max-h-60 overflow-y-auto border rounded-md p-3 text-xs space-y-3" data-testid="scroll-tos-content">
              <section>
                <h3 className="font-semibold mb-1">1. Acceptance of Terms</h3>
                <p className="text-muted-foreground">
                  By using HabitBuilder.pro, you agree to these Terms of Service and our Community Guidelines. If you do not agree, you may not use the service.
                </p>
              </section>
              <section>
                <h3 className="font-semibold mb-1">2. Acceptable Use</h3>
                <p className="text-muted-foreground">
                  HabitBuilder.pro is designed to help you build positive, healthy habits. You agree to use the platform for lawful, constructive purposes only. You must be at least 18 years old to use this service.
                </p>
              </section>
              <section>
                <h3 className="font-semibold mb-1">3. Prohibited Content</h3>
                <p className="text-muted-foreground mb-1">You may not create habits, posts, or any content that:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                  <li>Involves exploitation, abuse, or harm to minors</li>
                  <li>Promotes violence, terrorism, or harm to others</li>
                  <li>Encourages illegal drug manufacturing or distribution</li>
                  <li>Promotes self-harm or suicide</li>
                  <li>Contains hate speech or promotes discrimination</li>
                  <li>Facilitates stalking, harassment, or threats</li>
                  <li>Promotes illegal activities</li>
                  <li>Contains explicit sexual or pornographic content</li>
                  <li>Encourages harmful substance abuse</li>
                </ul>
              </section>
              <section>
                <h3 className="font-semibold mb-1">4. AI-Generated Content</h3>
                <p className="text-muted-foreground">
                  AI-generated content is guidance only, not professional medical, legal, or financial advice. Safety filters are in place.
                </p>
              </section>
              <section>
                <h3 className="font-semibold mb-1">5. Community Guidelines</h3>
                <p className="text-muted-foreground">
                  Treat all members with respect. Harassment, bullying, spam, and sharing personal information are prohibited.
                </p>
              </section>
              <section>
                <h3 className="font-semibold mb-1">6. Subscriptions & Privacy</h3>
                <p className="text-muted-foreground">
                  Paid subscriptions can be cancelled anytime. Your habit data is private and not shared with third parties.
                </p>
              </section>
              <p className="text-muted-foreground pt-1">
                Full terms available at <a href="/terms" className="text-primary hover:underline">/terms</a>.
              </p>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Checkbox
              id="accept-tos"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
              data-testid="checkbox-accept-tos"
              className="mt-0.5"
            />
            <label
              htmlFor="accept-tos"
              className="text-sm cursor-pointer leading-relaxed"
            >
              I agree to the{" "}
              <a href="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</a>
              {" "}and{" "}
              <a href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</a>.
              I confirm I am at least 18 years old.
            </label>
          </div>

          <Button
            className="w-full"
            disabled={!accepted || acceptTosMutation.isPending}
            onClick={() => acceptTosMutation.mutate()}
            data-testid="button-accept-tos"
          >
            {acceptTosMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Accept & Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
