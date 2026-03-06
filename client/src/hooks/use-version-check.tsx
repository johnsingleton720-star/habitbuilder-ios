import { useState, useEffect, useRef, useCallback } from "react";

const CHECK_INTERVAL = 5 * 60 * 1000;

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const knownVersion = useRef<string | null>(null);

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

      if (serverVersion !== knownVersion.current) {
        if (navigator.serviceWorker?.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
        }
        setUpdateAvailable(true);
      }
    } catch {
    }
  }, []);

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

  return { updateAvailable };
}
