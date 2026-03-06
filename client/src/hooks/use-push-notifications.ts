import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { isNative, isIOS } from "@/lib/platform";

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

    attemptedRef.current = true;

    if (isNative() && isIOS()) {
      registerNativePush();
    } else {
      registerWebPush();
    }
  }, [user]);
}

async function registerNativePush() {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const permResult = await PushNotifications.checkPermissions();
    if (permResult.receive === "denied") return;

    if (permResult.receive === "prompt" || permResult.receive === "prompt-with-rationale") {
      const reqResult = await PushNotifications.requestPermissions();
      if (reqResult.receive !== "granted") return;
    }

    PushNotifications.addListener("registration", async (token) => {
      console.log("[Push] iOS device token:", token.value);
      try {
        await apiRequest("POST", "/api/push/register-device", {
          deviceToken: token.value,
          platform: "ios",
        });
        console.log("[Push] Device token registered with server");
      } catch (err) {
        console.error("[Push] Failed to register device token:", err);
      }
    });

    PushNotifications.addListener("registrationError", (error) => {
      console.error("[Push] iOS registration error:", error);
    });

    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("[Push] Notification received in foreground:", notification);
    });

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("[Push] Notification action:", action);
      const url = action.notification?.data?.url;
      if (url && typeof url === "string") {
        window.location.href = url;
      }
    });

    await PushNotifications.register();
  } catch (err) {
    console.error("[Push] Native push setup error:", err);
  }
}

async function registerWebPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      if (Notification.permission === "denied") return;

      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      if (permission !== "granted") return;

      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });
    }

    await apiRequest("POST", "/api/push/sync", {
      subscription: subscription.toJSON(),
    });
  } catch (err) {
    console.error("[Push] Web push setup error:", err);
  }
}
