import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

export function usePushNotifications() {
  const { user } = useAuth();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      attemptedRef.current = false;
      return;
    }
    if (attemptedRef.current) return;
    if (!user.pushNotificationsEnabled) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;

    attemptedRef.current = true;

    (async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) return;

        if (Notification.permission === "denied") return;

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidKey) return;

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        });

        await apiRequest("POST", "/api/push/subscribe", { subscription: subscription.toJSON() });
      } catch (err) {
        console.error("[Push] Auto-subscribe error:", err);
      }
    })();
  }, [user]);
}
