import { registerPlugin } from "@capacitor/core";
import { isNative } from "@/lib/platform";

interface AppReviewPlugin {
  requestReview(): Promise<void>;
}

const AppReview = registerPlugin<AppReviewPlugin>("AppReview");

const STORAGE_KEY_PREFIX = "reviewPromptShown_";

export async function triggerAppReviewIfEligible(
  userId: string | undefined,
  currentStreak: number
): Promise<void> {
  if (!userId || !isNative()) return;
  if (currentStreak < 3) return;

  const storageKey = `${STORAGE_KEY_PREFIX}${userId}`;
  if (localStorage.getItem(storageKey)) return;

  localStorage.setItem(storageKey, "1");

  try {
    await AppReview.requestReview();
  } catch {
    // Silently ignore if plugin is not installed in the native build
  }
}
