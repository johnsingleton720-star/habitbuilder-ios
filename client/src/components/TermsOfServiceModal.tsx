import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Shield } from "lucide-react";

export function TermsOfServiceModal() {
  const [accepted, setAccepted] = useState(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <CardTitle data-testid="text-tos-title">Terms of Service & Community Guidelines</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Please review and accept our terms before using Habit Builder.
          </p>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
          <ScrollArea className="flex-1 max-h-[50vh] border rounded-md p-4" data-testid="scroll-tos-content">
            <div className="space-y-4 text-sm pr-4">
              <section>
                <h3 className="font-semibold mb-2">1. Acceptance of Terms</h3>
                <p className="text-muted-foreground">
                  By using Habit Builder, you agree to these Terms of Service and our Community Guidelines. If you do not agree, you may not use the service.
                </p>
              </section>

              <section>
                <h3 className="font-semibold mb-2">2. Acceptable Use</h3>
                <p className="text-muted-foreground">
                  Habit Builder is designed to help you build positive, healthy habits. You agree to use the platform for lawful, constructive purposes only. You must be at least 18 years old to use this service.
                </p>
              </section>

              <section>
                <h3 className="font-semibold mb-2">3. Prohibited Content</h3>
                <p className="text-muted-foreground mb-2">
                  You may not create habits, posts, or any content that:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Involves exploitation, abuse, or harm to minors in any form</li>
                  <li>Promotes violence, terrorism, or harm to others</li>
                  <li>Encourages illegal drug manufacturing, trafficking, or distribution</li>
                  <li>Promotes self-harm or suicide</li>
                  <li>Contains hate speech or promotes discrimination based on race, ethnicity, gender, religion, or sexual orientation</li>
                  <li>Facilitates stalking, harassment, doxxing, or threats</li>
                  <li>Promotes illegal activities including hacking, fraud, theft, or identity theft</li>
                  <li>Contains explicit sexual or pornographic content</li>
                  <li>Encourages harmful substance abuse or addiction</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold mb-2">4. Content for Consenting Adults</h3>
                <p className="text-muted-foreground">
                  We support consenting adults in building healthier lifestyles. Habits should be framed positively and focus on personal growth, health, moderation, or well-being. Content that is purely explicit, gratuitous, or harmful will be removed.
                </p>
              </section>

              <section>
                <h3 className="font-semibold mb-2">5. AI-Generated Content</h3>
                <p className="text-muted-foreground">
                  Habit Builder uses AI to generate personalized coaching plans. AI-generated content is provided as guidance and should not be considered professional medical, legal, or financial advice. We implement safety filters on AI-generated content to prevent harmful outputs.
                </p>
              </section>

              <section>
                <h3 className="font-semibold mb-2">6. Community Forum Guidelines</h3>
                <p className="text-muted-foreground">
                  When participating in the community forum, treat all members with respect. Harassment, bullying, spam, and sharing of personal information about others without consent are strictly prohibited. Violations may result in account suspension.
                </p>
              </section>

              <section>
                <h3 className="font-semibold mb-2">7. Account Termination</h3>
                <p className="text-muted-foreground">
                  We reserve the right to suspend or terminate accounts that violate these terms without notice. Refunds for terminated accounts due to violations are not guaranteed.
                </p>
              </section>

              <section>
                <h3 className="font-semibold mb-2">8. Subscriptions & Billing</h3>
                <p className="text-muted-foreground">
                  Paid subscriptions are billed monthly. You may cancel at any time through your Account page. Access continues until the end of your current billing period. No partial refunds are provided for mid-cycle cancellations.
                </p>
              </section>

              <section>
                <h3 className="font-semibold mb-2">9. Privacy</h3>
                <p className="text-muted-foreground">
                  We collect only the information necessary to provide our service. Your habit data is private and will not be shared with third parties. We use industry-standard security measures to protect your data.
                </p>
              </section>

              <section>
                <h3 className="font-semibold mb-2">10. Changes to Terms</h3>
                <p className="text-muted-foreground">
                  We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the updated terms. We will notify users of significant changes.
                </p>
              </section>
            </div>
          </ScrollArea>

          <div className="flex items-start gap-3 pt-2">
            <Checkbox
              id="accept-tos"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
              data-testid="checkbox-accept-tos"
            />
            <label
              htmlFor="accept-tos"
              className="text-sm cursor-pointer leading-relaxed"
            >
              I have read and agree to the Terms of Service and Community Guidelines. I confirm that I am at least 18 years old.
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
