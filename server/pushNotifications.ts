import webpush from "web-push";
import { db } from "./db";
import { pushSubscriptions, users } from "@shared/schema";
import { eq } from "drizzle-orm";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:support@habitbuilder.pro",
    vapidPublicKey,
    vapidPrivateKey
  );
}

export async function saveSubscription(userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const existing = await db.query.pushSubscriptions.findFirst({
    where: eq(pushSubscriptions.endpoint, subscription.endpoint),
  });

  if (existing) {
    return existing;
  }

  const [saved] = await db.insert(pushSubscriptions).values({
    userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  }).returning();

  return saved;
}

export async function removeSubscription(userId: string, endpoint: string) {
  await db.delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function removeAllSubscriptions(userId: string) {
  await db.delete(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
}

export async function sendPushToUser(userId: string, payload: { title: string; body: string; icon?: string; badge?: string; url?: string; tag?: string }) {
  const subs = await db.query.pushSubscriptions.findMany({
    where: eq(pushSubscriptions.userId, userId),
  });

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/icon-72x72.png",
    data: { url: payload.url || "/" },
    tag: payload.tag || "habit-reminder",
  });

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          notification
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
          console.log(`[Push] Removed stale subscription for user ${userId}`);
        } else {
          console.error(`[Push] Error sending to user ${userId}:`, err.message);
        }
        throw err;
      }
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return { sent, total: subs.length };
}
