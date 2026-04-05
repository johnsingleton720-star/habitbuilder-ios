import { useEffect, useRef } from "react";
import { isNative } from "@/lib/platform";

const STORAGE_KEY_PREFIX = "reviewPromptShown_";

async function requestNativeReview(): Promise<void> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;

    // Try calling the AppReview plugin if it's registered in the native layer.
    // This works when @capacitor-community/app-review is installed in the iOS/Android project.
    // Silently no-ops if the plugin isn't present (future iOS build will activate it).
    const plugins = (Capacitor as any).Plugins;
    if (plugins?.AppReview?.requestReview) {
      await plugins.AppReview.requestReview();
    }
  } catch {
    // Silently ignore if plugin not available
  }
}

export function useAppReview(userId: string | undefined, habits: any[] | undefined) {
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (!userId || !habits || !isNative()) return;
    if (hasTriggered.current) return;

    const storageKey = `${STORAGE_KEY_PREFIX}${userId}`;
    if (localStorage.getItem(storageKey)) return;

    const hasThreeDayStreak = habits.some(
      (h) => !h.archived && (h.currentStreak || 0) >= 3
    );
    if (!hasThreeDayStreak) return;

    hasTriggered.current = true;
    localStorage.setItem(storageKey, "1");
    requestNativeReview();
  }, [userId, habits]);
}
