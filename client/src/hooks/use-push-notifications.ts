import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { isNative, isIOS } from "@/lib/platform";

let nativeListenersAdded = false;

async function diagnose(step: string, data?: any, error?: string) {
  try {
    await apiRequest("POST", "/api/push/diagnose", { step, data, error });
  } catch {}
}

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
    await diagnose("start", { isNative: isNative(), isIOS: isIOS() });

    const { PushNotifications } = await import("@capacitor/push-notifications");
    await diagnose("plugin-loaded");

    const permResult = await PushNotifications.checkPermissions();
    await diagnose("permissions-checked", { receive: permResult.receive });

    if (permResult.receive === "denied") {
      await diagnose("permissions-denied");
      return;
    }

    if (permResult.receive === "prompt" || permResult.receive === "prompt-with-rationale") {
      const reqResult = await PushNotifications.requestPermissions();
      await diagnose("permissions-requested", { receive: reqResult.receive });
      if (reqResult.receive !== "granted") {
        await diagnose("permissions-not-granted");
        return;
      }
    }

    if (!nativeListenersAdded) {
      nativeListenersAdded = true;

      PushNotifications.addListener("registration", async (token) => {
        await diagnose("token-received", { tokenLength: token.value.length });
        try {
          await apiRequest("POST", "/api/push/register-device", {
            deviceToken: token.value,
            platform: "ios",
          });
          await diagnose("token-registered");
        } catch (err: any) {
          await diagnose("register-failed", null, err?.message || String(err));
        }
      });

      PushNotifications.addListener("registrationError", async (error) => {
        await diagnose("registration-error", null, JSON.stringify(error));
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

      await diagnose("listeners-added");
    }

    await PushNotifications.register();
    await diagnose("register-called");
  } catch (err: any) {
    await diagnose("setup-error", null, err?.message || String(err));
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
