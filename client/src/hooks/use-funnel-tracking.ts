import { useCallback } from "react";
import { getPlatform, isNative } from "@/lib/platform";

function getSessionId(): string {
  let sessionId = sessionStorage.getItem("tracking_session_id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("tracking_session_id", sessionId);
  }
  return sessionId;
}

export type FunnelEventName =
  | "app_open"
  | "onboarding_welcome"
  | "onboarding_intent"
  | "onboarding_habit_select"
  | "onboarding_tracking_mode"
  | "onboarding_ai_details"
  | "onboarding_simple_details"
  | "onboarding_ai_generating"
  | "onboarding_plan_preview"
  | "onboarding_cta_signup"
  | "auth_screen_shown"
  | "auth_apple_tapped"
  | "auth_google_tapped"
  | "auth_email_submit"
  | "auth_signup_success"
  | "auth_login_success"
  | "auth_signup_failed"
  | "auth_login_failed"
  | "first_habit_created";

export function trackFunnelEvent(
  eventName: FunnelEventName,
  metadata?: Record<string, string | number | boolean>
) {
  const platform = getPlatform();
  const sessionId = getSessionId();

  fetch("/api/track/funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      eventName,
      sessionId,
      platform,
      metadata: metadata || undefined,
    }),
  }).catch(() => {});
}

export function useFunnelTracking() {
  const track = useCallback(
    (eventName: FunnelEventName, metadata?: Record<string, string | number | boolean>) => {
      trackFunnelEvent(eventName, metadata);
    },
    []
  );

  return { track };
}
