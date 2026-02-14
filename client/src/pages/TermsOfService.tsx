import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import { Link } from "wouter";

export default function TermsOfService() {
  usePageTitle("Terms of Service", "Read the HabitBuilder.pro Terms of Service covering acceptable use, subscriptions, billing, AI content, community guidelines, and account policies.");

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-terms">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-lg">Terms of Service</span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-8 text-sm leading-relaxed">
          <div>
            <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-terms-heading">Terms of Service</h1>
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using HabitBuilder.pro ("we," "our," or "us"), you agree to be bound by these Terms of Service and our Community Guidelines. If you do not agree to these terms, you may not use the Service. We may update these terms from time to time; continued use after changes constitutes acceptance.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">2. Eligibility</h2>
            <p className="text-muted-foreground">
              You must be at least 18 years old to use HabitBuilder.pro. By using the Service, you represent and warrant that you meet this age requirement and have the legal capacity to enter into a binding agreement.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">3. Acceptable Use</h2>
            <p className="text-muted-foreground">
              HabitBuilder.pro is designed to help you build positive, healthy habits. You agree to use the platform for lawful, constructive purposes only. You are responsible for all activity that occurs under your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">4. Prohibited Content</h2>
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

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">5. Content for Consenting Adults</h2>
            <p className="text-muted-foreground">
              We support consenting adults in building healthier lifestyles. Habits should be framed positively and focus on personal growth, health, moderation, or well-being. Content that is purely explicit, gratuitous, or harmful will be removed.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">6. AI-Generated Content</h2>
            <p className="text-muted-foreground">
              HabitBuilder.pro uses AI to generate personalized coaching plans, action items, session summaries, and insights. AI-generated content is provided as general guidance and should not be considered professional medical, legal, or financial advice. We implement safety filters on AI-generated content to prevent harmful outputs. You acknowledge that AI responses may occasionally be inaccurate or incomplete.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">7. Subscriptions and Billing</h2>
            <p className="text-muted-foreground mb-2">
              HabitBuilder.pro offers free and paid subscription tiers:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong>Free Plan:</strong> 1 habit with basic AI coaching, personalized action plans, streaks, and access to the template library. Free forever, no credit card required.</li>
              <li><strong>Pro ($6/month USD):</strong> Unlimited habits, guided sessions, achievements, XP leveling, and weekly reports.</li>
              <li><strong>Premium ($15/month USD):</strong> Everything in Pro plus AI Coach Chat, advanced analytics, habit stacking, accountability partners, voice notes, and CSV data export.</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Paid subscriptions are billed monthly through Stripe. You may cancel at any time from your Account settings. When you cancel, you retain access to paid features until the end of your current billing period. No partial refunds are provided for mid-cycle cancellations. Prices are in USD and international payment methods are accepted.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">8. Promotional Codes</h2>
            <p className="text-muted-foreground">
              We may offer promotional discount codes from time to time. Promo codes are subject to specific terms, expiration dates, and usage limits. We reserve the right to modify or discontinue promotional offers at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">9. Community Forum Guidelines</h2>
            <p className="text-muted-foreground">
              When participating in the community forum, treat all members with respect. Harassment, bullying, spam, and sharing of personal information about others without consent are strictly prohibited. Forum access varies by subscription tier. Violations may result in content removal or account suspension.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">10. Intellectual Property</h2>
            <p className="text-muted-foreground">
              The Service, including its design, features, and content, is owned by HabitBuilder.pro and protected by applicable intellectual property laws. You retain ownership of your personal data and user-generated content. By posting content in the community forum, you grant us a non-exclusive license to display that content within the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">11. Account Termination</h2>
            <p className="text-muted-foreground">
              We reserve the right to suspend or terminate accounts that violate these Terms of Service, without prior notice. You may delete your account at any time by contacting us. Refunds for accounts terminated due to violations are not guaranteed.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">12. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We are not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability to you for any claims arising from or related to the Service shall not exceed the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">13. Privacy</h2>
            <p className="text-muted-foreground">
              Your use of the Service is also governed by our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>, which describes how we collect, use, and protect your personal information. By using the Service, you consent to our data practices as described in the Privacy Policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">14. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may update these Terms of Service from time to time. We will notify users of significant changes by posting the updated terms on this page with a revised "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">15. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-muted-foreground">
              <strong>Email:</strong> admin@habitbuilder.pro
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
