import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

function getSessionId(): string {
  let sessionId = sessionStorage.getItem("tracking_session_id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("tracking_session_id", sessionId);
  }
  return sessionId;
}

export function useTracking() {
  const [location] = useLocation();
  const lastTrackedPath = useRef<string>("");

  useEffect(() => {
    if (location === lastTrackedPath.current) return;
    lastTrackedPath.current = location;

    const sessionId = getSessionId();
    const referrer = document.referrer || "";

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        path: location,
        referrer,
        sessionId,
      }),
    }).catch(() => {});
  }, [location]);
}
