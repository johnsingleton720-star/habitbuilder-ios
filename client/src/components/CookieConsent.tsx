import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Cookie } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

const COOKIE_CONSENT_KEY = "habit-builder-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function accept() {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(COOKIE_CONSENT_KEY, "declined");
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-4 left-4 right-4 z-50 flex justify-center pointer-events-none"
        >
          <Card className="max-w-lg w-full p-4 pointer-events-auto shadow-lg" data-testid="card-cookie-consent">
            <div className="flex items-start gap-3">
              <Cookie className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We use essential cookies for authentication and preferences. By continuing to use HabitBuilder.pro, you agree to our use of cookies.{" "}
                  <Link href="/privacy" className="text-primary underline underline-offset-2">
                    Privacy Policy
                  </Link>
                </p>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={accept} data-testid="button-accept-cookies">
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={decline} data-testid="button-decline-cookies">
                    Decline Optional
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
