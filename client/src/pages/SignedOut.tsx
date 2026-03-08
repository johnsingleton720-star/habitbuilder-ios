import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SignedOut() {
  const [phase, setPhase] = useState<"clearing" | "done">("clearing");

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", "142 45% 42%");
    root.style.setProperty("--primary-foreground", "0 0% 100%");
    root.style.setProperty("--accent", "142 45% 42%");
    root.style.setProperty("--accent-foreground", "0 0% 100%");

    const timer = setTimeout(() => setPhase("done"), 1500);
    return () => clearTimeout(timer);
  }, []);

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
            <h1 className="text-xl font-semibold text-gray-900" data-testid="text-signed-out">You've been signed out</h1>
            <p className="text-gray-500 text-sm">
              Your session has been cleared. You can sign in with any account.
            </p>
            <div className="pt-2">
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
