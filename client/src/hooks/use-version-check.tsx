import { useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const CHECK_INTERVAL = 5 * 60 * 1000;

export function useVersionCheck() {
  const { toast } = useToast();
  const knownVersion = useRef<string | null>(null);
  const hasNotified = useRef(false);

  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const serverVersion = data.version;

      if (!knownVersion.current) {
        knownVersion.current = serverVersion;
        return;
      }

      if (serverVersion !== knownVersion.current && !hasNotified.current) {
        hasNotified.current = true;

        if (navigator.serviceWorker?.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
        }

        toast({
          title: "Update available",
          description: "A new version of HabitBuilder is ready.",
          action: (
            <button
              className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
              onClick={() => window.location.reload()}
              data-testid="button-refresh-update"
            >
              Refresh
            </button>
          ),
          duration: 60000,
        });
      }
    } catch {
    }
  }, [toast]);

  useEffect(() => {
    checkVersion();

    const interval = setInterval(checkVersion, CHECK_INTERVAL);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkVersion();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [checkVersion]);
}
