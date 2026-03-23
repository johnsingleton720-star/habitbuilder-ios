import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isNative, isIOS } from "@/lib/platform";
import { registerNativePush } from "@/hooks/use-push-notifications";

interface IOSNotificationPromptProps {
  userId: number | string;
}

function getPromptKey(userId: number | string) {
  return `pushPromptShown_${userId}`;
}

export function IOSNotificationPrompt({ userId }: IOSNotificationPromptProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isNative() || !isIOS()) return;
    if (localStorage.getItem(getPromptKey(userId))) return;

    async function checkPermission() {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const result = await PushNotifications.checkPermissions();
        if (result.receive === "prompt" || result.receive === "prompt-with-rationale") {
          setVisible(true);
        }
      } catch {
        // Capacitor not available or permission already set
      }
    }

    const timer = setTimeout(checkPermission, 1500);
    return () => clearTimeout(timer);
  }, [userId]);

  const handleAllow = async () => {
    localStorage.setItem(getPromptKey(userId), "true");
    setVisible(false);
    await registerNativePush();
  };

  const handleLater = () => {
    localStorage.setItem(getPromptKey(userId), "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 px-4 pb-8"
      data-testid="ios-notification-prompt-overlay"
    >
      <div className="w-full max-w-sm rounded-2xl bg-background shadow-2xl overflow-hidden">
        <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 px-6 pt-8 pb-5 text-center">
          <button
            onClick={handleLater}
            className="absolute top-3 right-3 p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
            data-testid="button-push-prompt-dismiss"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
            <Bell className="w-7 h-7 text-primary" />
          </div>
          <h2 className="font-display text-lg font-bold leading-snug mb-1">Stay on track with your habits</h2>
          <p className="text-sm text-muted-foreground">
            Get gentle daily reminders, streak alerts, and coaching check-ins — so your habit never falls off your radar.
          </p>
        </div>
        <div className="px-6 py-5 flex flex-col gap-2.5">
          <Button
            className="w-full"
            onClick={handleAllow}
            data-testid="button-push-prompt-allow"
          >
            <Bell className="w-4 h-4 mr-2" />
            Allow Notifications
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={handleLater}
            data-testid="button-push-prompt-later"
          >
            Maybe Later
          </Button>
        </div>
      </div>
    </div>
  );
}
