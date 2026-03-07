import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { isNative, isIOS } from "@/lib/platform";

let nativeListenersAdded = false;

export function usePushNotifications() {
  const { user } = useAuth();
  const webAttemptedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      webAttemptedRef.current = false;
      nativeListenersAdded = false;
      return;
    }
    if (!user.pushNotificationsEnabled) return;

    if (isNative() && isIOS()) {
      registerNativePush();
    } else {
      if (!webAttemptedRef.current) {
        webAttemptedRef.current = true;
        registerWebPush();
      }
    }
  }, [user]);
}

export async function registerNativePush() {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const permResult = await PushNotifications.checkPermissions();
    if (permResult.receive === "denied") {
      console.log("[Push] iOS notifications permission denied");
      return;
    }

    if (permResult.receive === "prompt" || permResult.receive === "prompt-with-rationale") {
      const reqResult = await PushNotifications.requestPermissions();
      if (reqResult.receive !== "granted") {
        console.log("[Push] iOS notification permission not granted by user");
        return;
      }
    }

    if (!nativeListenersAdded) {
      nativeListenersAdded = true;

      PushNotifications.addListener("registration", async (token) => {
        console.log("[Push] iOS device token received");
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
        console.error("[Push] iOS registration error:", JSON.stringify(error));
      });

      PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.log("[Push] Foreground notification:", notification.title);
      });

      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const url = action.notification?.data?.url;
        if (url && typeof url === "string") {
          window.location.href = url;
        }
      });
    }

    await PushNotifications.register();
    console.log("[Push] register() called");
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
