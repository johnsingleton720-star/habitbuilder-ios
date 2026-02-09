import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import { Link } from "wouter";

export default function PrivacyPolicy() {
  usePageTitle("Privacy Policy", "Learn how HabitBuilder.pro collects, uses, and protects your personal data. Read our Privacy Policy covering GDPR, CCPA, cookies, AI data usage, and your rights.");

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-privacy">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-lg">Privacy Policy</span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-8 text-sm leading-relaxed">
          <div>
            <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-privacy-heading">Privacy Policy</h1>
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">1. Introduction</h2>
            <p className="text-muted-foreground">
              HabitBuilder.pro ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our web application and related services (collectively, the "Service"). By using the Service, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">2. Information We Collect</h2>
            <h3 className="font-medium">2.1 Information You Provide</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong>Account Information:</strong> When you sign in through Replit Auth, we receive your name, email address, and profile image.</li>
              <li><strong>Habit Data:</strong> Habits you create, action plans, session notes, completion records, and related progress data.</li>
              <li><strong>Community Content:</strong> Posts, comments, messages, and profile information you share in the community forum.</li>
              <li><strong>Feedback:</strong> Any feedback, bug reports, or feature requests you submit.</li>
              <li><strong>Payment Information:</strong> Payment processing is handled by Stripe. We do not store your credit card details. We receive subscription status and billing identifiers from Stripe.</li>
            </ul>

            <h3 className="font-medium">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong>Usage Data:</strong> Pages visited, features used, session duration, and interaction patterns to improve the Service.</li>
              <li><strong>Device Information:</strong> Browser type, operating system, screen resolution, and device type.</li>
              <li><strong>Cookies:</strong> We use essential cookies for authentication, session management, and remembering your preferences (such as theme settings). See our Cookie section below for details.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>To provide, maintain, and improve the Service</li>
              <li>To personalize your experience, including AI-generated coaching plans and action items</li>
              <li>To process your subscription and manage your account</li>
              <li>To communicate with you about your account, updates, and support</li>
              <li>To monitor and analyze usage trends to improve functionality</li>
              <li>To detect, prevent, and address technical issues or abuse</li>
              <li>To enforce our Terms of Service and Community Guidelines</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">4. AI-Generated Content</h2>
            <p className="text-muted-foreground">
              We use OpenAI's API to generate personalized habit coaching plans, interview questions, session summaries, and insights. When you interact with AI features, relevant habit data is sent to OpenAI for processing. OpenAI does not use your data to train their models when accessed via their API. AI-generated content is provided as guidance and is not professional medical, legal, or financial advice.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">5. Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground">We do not sell your personal information. We may share information in the following circumstances:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong>Service Providers:</strong> We work with third-party services (Stripe for payments, OpenAI for AI features, Replit for hosting and authentication) that process data on our behalf under strict contractual obligations.</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required by law, subpoena, or legal process.</li>
              <li><strong>Safety:</strong> We may disclose information to protect the rights, safety, or property of our users or the public.</li>
              <li><strong>Community Content:</strong> Posts, comments, and profile information you share in the community forum are visible to other users according to your privacy settings.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">6. Cookies and Tracking</h2>
            <p className="text-muted-foreground">We use cookies for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong>Essential Cookies:</strong> Required for authentication, session management, and security. These cannot be disabled.</li>
              <li><strong>Preference Cookies:</strong> Store your theme preferences (light/dark mode), color themes, and other display settings.</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how visitors use the Service so we can improve it.</li>
            </ul>
            <p className="text-muted-foreground">
              You can control cookie preferences through your browser settings. Disabling essential cookies may prevent you from using the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">7. Data Security</h2>
            <p className="text-muted-foreground">
              We implement industry-standard security measures to protect your data, including encrypted connections (HTTPS/TLS), secure authentication through Replit Auth, and database encryption at rest. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">8. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your account and habit data for as long as your account is active. If you delete your account, we will remove your personal data within 30 days, except where retention is required by law or for legitimate business purposes (such as resolving disputes or enforcing agreements).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">9. Your Rights</h2>
            <p className="text-muted-foreground">Depending on your location, you may have the following rights regarding your personal data:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data.</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data ("right to be forgotten").</li>
              <li><strong>Portability:</strong> Request a copy of your data in a machine-readable format.</li>
              <li><strong>Objection:</strong> Object to certain processing of your data.</li>
              <li><strong>Withdraw Consent:</strong> Where processing is based on consent, withdraw that consent at any time.</li>
            </ul>
            <p className="text-muted-foreground">
              To exercise any of these rights, please contact us at the email address below.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">10. Children's Privacy</h2>
            <p className="text-muted-foreground">
              The Service is not intended for users under 18 years of age. We do not knowingly collect personal information from children under 18. If we learn that we have collected data from a child under 18, we will take steps to delete that information promptly.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">11. International Data Transfers</h2>
            <p className="text-muted-foreground">
              Your data may be processed in the United States or other countries where our service providers operate. By using the Service, you consent to the transfer of your data to these locations. We ensure appropriate safeguards are in place for international data transfers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">12. California Privacy Rights (CCPA)</h2>
            <p className="text-muted-foreground">
              If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information is collected, the right to delete your data, and the right to opt-out of the sale of personal information. We do not sell personal information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">13. European Privacy Rights (GDPR)</h2>
            <p className="text-muted-foreground">
              If you are in the European Economic Area (EEA), you have rights under the General Data Protection Regulation (GDPR). The legal basis for processing your data includes: performance of contract (providing the Service), consent (optional features), and legitimate interests (improving the Service and preventing abuse). You have the right to lodge a complaint with your local data protection authority.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">14. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on this page with a revised "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">15. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy or wish to exercise your data rights, please contact us at:
            </p>
            <p className="text-muted-foreground">
              <strong>Email:</strong> privacy@habitbuilder.pro
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
