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

function captureUtmParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid"];
  const result: Record<string, string> = {};

  for (const key of utmKeys) {
    const value = params.get(key);
    if (value) {
      result[key] = value;
    }
  }

  if (Object.keys(result).length > 0) {
    const existing = JSON.parse(sessionStorage.getItem("utm_params") || "{}");
    const merged = { ...existing, ...result };
    sessionStorage.setItem("utm_params", JSON.stringify(merged));
    return merged;
  }

  const stored = sessionStorage.getItem("utm_params");
  return stored ? JSON.parse(stored) : {};
}

export function getStoredUtmParams(): Record<string, string> {
  const stored = sessionStorage.getItem("utm_params");
  return stored ? JSON.parse(stored) : {};
}

export function useTracking() {
  const [location] = useLocation();
  const lastTrackedPath = useRef<string>("");

  useEffect(() => {
    if (location === lastTrackedPath.current) return;
    lastTrackedPath.current = location;

    const consent = localStorage.getItem("habit-builder-cookie-consent");
    if (consent !== "accepted") return;

    const sessionId = getSessionId();
    const referrer = document.referrer || "";
    const utmParams = captureUtmParams();

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        path: location,
        referrer,
        sessionId,
        ...utmParams,
      }),
    }).catch(() => {});
  }, [location]);
}
