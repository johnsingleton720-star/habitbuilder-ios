import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isNative } from "@/lib/platform";

export default function SignedOut() {
  const [phase, setPhase] = useState<"clearing" | "done">("clearing");

  useEffect(() => {
    localStorage.removeItem("appColorTheme");

    const root = document.documentElement;
    root.style.setProperty("--primary", "142 45% 42%");
    root.style.setProperty("--primary-foreground", "0 0% 100%");
    root.style.setProperty("--accent", "142 45% 42%");
    root.style.setProperty("--accent-foreground", "0 0% 100%");

    const timer = setTimeout(() => setPhase("done"), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleClearAndContinue = () => {
    if (isNative()) {
      import("@capacitor/browser").then(({ Browser }) => {
        Browser.open({ url: "https://replit.com/logout" });
      }).catch(() => {
        window.open("https://replit.com/logout", "_blank");
      });
    } else {
      window.open("https://replit.com/logout", "_blank");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(142,45%,97%)]">
      <div className="text-center space-y-4 px-6 max-w-sm">
        {phase === "clearing" ? (
          <>
            <Loader2 className="w-10 h-10 text-emerald-600 mx-auto animate-spin" />
            <h1 className="text-xl font-semibold text-gray-900" data-testid="text-signing-out">Signing you out...</h1>
            <p className="text-gray-500 text-sm">Clearing your session data</p>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h1 className="text-xl font-semibold text-gray-900" data-testid="text-signed-out">Signed out of Habit Builder</h1>
            <p className="text-gray-500 text-sm">
              To sign in as a different person on this device, clear your login session first, then come back here.
            </p>
            <div className="space-y-3 pt-2">
              <Button
                onClick={handleClearAndContinue}
                variant="outline"
                className="w-full gap-2"
                data-testid="button-clear-login"
              >
                Clear Login Session
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => { window.location.href = "/?logged_out=true"; }}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                data-testid="button-back-home"
              >
                Back to Home
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
