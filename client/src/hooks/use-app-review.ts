import { AppReview } from "capacitor-app-review";
import { isNative } from "@/lib/platform";

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
  }
}
