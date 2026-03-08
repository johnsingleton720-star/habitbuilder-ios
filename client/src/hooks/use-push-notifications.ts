import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { isNative, isIOS } from "@/lib/platform";

let tokenReceived = false;

async function diagnose(step: string, data?: any, error?: string) {
  try {
    await apiRequest("POST", "/api/push/diagnose", { step, data, error });
  } catch {}
}

export function usePushNotifications() {
  const { user } = useAuth();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      attemptedRef.current = false;
      tokenReceived = false;
      return;
    }
    if (!user.pushNotificationsEnabled) return;

    if (isNative() && isIOS()) {
      if (!attemptedRef.current) {
        attemptedRef.current = true;
        registerNativePush();
      }
    } else {
      if (!attemptedRef.current) {
        attemptedRef.current = true;
        registerWebPush();
      }
    }
  }, [user]);
}

export async function registerNativePush() {
  tokenReceived = false;
  try {
    await diagnose("start", { isNative: isNative(), isIOS: isIOS() });

    const { PushNotifications } = await import("@capacitor/push-notifications");
    await diagnose("plugin-loaded");

    await PushNotifications.removeAllListeners();
    await diagnose("listeners-cleared");

    PushNotifications.addListener("registration", async (token) => {
      tokenReceived = true;
      await diagnose("token-received", { tokenLength: token.value.length, tokenPrefix: token.value.substring(0, 8) });
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
      tokenReceived = true;
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

    const reqResult = await PushNotifications.requestPermissions();
    await diagnose("permissions-requested", { receive: reqResult.receive });

    if (reqResult.receive !== "granted") {
      await diagnose("permissions-not-granted", { receive: reqResult.receive });
      return;
    }

    await PushNotifications.register();
    await diagnose("register-called");

    setTimeout(async () => {
      if (!tokenReceived) {
        await diagnose("no-token-after-5s", { retrying: true });
        try {
          await PushNotifications.register();
          await diagnose("retry-register-called");
        } catch (err: any) {
          await diagnose("retry-register-error", null, err?.message || String(err));
        }
      }
    }, 5000);

    setTimeout(async () => {
      if (!tokenReceived) {
        await diagnose("no-token-after-15s", { finalCheck: true });
      }
    }, 15000);

  } catch (err: any) {
    await diagnose("setup-error", null, err?.message || String(err));
  }
}

export async function registerWebPush(): Promise<{ success: boolean; error?: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return { success: false, error: "Push notifications are not supported in this browser" };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      if (Notification.permission === "denied") {
        return { success: false, error: "Notification permission was denied" };
      }

      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      if (permission !== "granted") {
        return { success: false, error: "Notification permission was denied" };
      }

      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        return { success: false, error: "Push notification configuration is missing" };
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });
    }

    await apiRequest("POST", "/api/push/sync", {
      subscription: subscription.toJSON(),
    });
    return { success: true };
  } catch (err) {
    console.error("[Push] Web push setup error:", err);
    return { success: false, error: "Failed to set up push notifications" };
  }
}
