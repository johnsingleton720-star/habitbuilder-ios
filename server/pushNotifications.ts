import webpush from "web-push";
import { db } from "./db";
import { pushSubscriptions, users } from "@shared/schema";
import { eq, and, ne } from "drizzle-orm";
import http2 from "http2";
import jwt from "jsonwebtoken";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:support@habitbuilder.pro",
    vapidPublicKey,
    vapidPrivateKey
  );
}

const APNS_KEY_ID = process.env.APNS_KEY_ID;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID;
const APNS_KEY_P8 = process.env.APNS_KEY_P8;
const APNS_BUNDLE_ID = "pro.habitbuilder.app";
const APNS_HOST = process.env.APNS_PRODUCTION === "false"
  ? "api.sandbox.push.apple.com"
  : "api.push.apple.com";

function isApnsConfigured(): boolean {
  return !!(APNS_KEY_ID && APNS_TEAM_ID && APNS_KEY_P8);
}

let apnsJwtToken: string | null = null;
let apnsJwtIssuedAt = 0;

function normalizeP8Key(raw: string): string {
  let key = raw.replace(/\\n/g, "\n").trim();

  const lines = key.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const headerIdx = lines.findIndex(l => l === "-----BEGIN PRIVATE KEY-----");
  const footerIdx = lines.findIndex(l => l === "-----END PRIVATE KEY-----");

  if (headerIdx >= 0 && footerIdx > headerIdx) {
    const base64Lines = lines.slice(headerIdx + 1, footerIdx);
    key = "-----BEGIN PRIVATE KEY-----\n" + base64Lines.join("\n") + "\n-----END PRIVATE KEY-----";
  } else {
    const base64 = lines.join("").replace(/[^A-Za-z0-9+/=]/g, "");
    key = "-----BEGIN PRIVATE KEY-----\n" + base64 + "\n-----END PRIVATE KEY-----";
  }

  return key;
}

function getApnsJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  if (apnsJwtToken && now - apnsJwtIssuedAt < 3000) {
    return apnsJwtToken;
  }

  const signingKey = normalizeP8Key(APNS_KEY_P8!);
  apnsJwtToken = jwt.sign(
    { iss: APNS_TEAM_ID, iat: now },
    signingKey,
    { algorithm: "ES256", header: { alg: "ES256", kid: APNS_KEY_ID! } }
  );
  apnsJwtIssuedAt = now;
  return apnsJwtToken!;
}

async function sendApnsNotification(
  deviceToken: string,
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = http2.connect(`https://${APNS_HOST}`);

    client.on("error", (err) => {
      client.close();
      reject(err);
    });

    const apnsPayload = JSON.stringify({
      aps: {
        alert: { title: payload.title, body: payload.body },
        sound: "default",
        badge: 1,
        "thread-id": payload.tag || "habit-notification",
      },
      url: payload.url || "/",
    });

    const headers = {
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      "authorization": `bearer ${getApnsJwt()}`,
      "apns-topic": APNS_BUNDLE_ID,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "apns-expiration": "0",
      "content-type": "application/json",
    };

    const req = client.request(headers);

    let responseData = "";
    let statusCode = 0;

    req.on("response", (headers) => {
      statusCode = headers[":status"] as number;
    });

    req.on("data", (chunk: Buffer) => {
      responseData += chunk.toString();
    });

    req.on("end", () => {
      client.close();
      if (statusCode === 200) {
        resolve();
      } else {
        const error: any = new Error(`APNs error: ${statusCode} ${responseData}`);
        error.statusCode = statusCode;
        error.response = responseData;
        reject(error);
      }
    });

    req.on("error", (err) => {
      client.close();
      reject(err);
    });

    req.write(apnsPayload);
    req.end();
  });
}

export async function saveSubscription(userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const existing = await db.query.pushSubscriptions.findFirst({
    where: eq(pushSubscriptions.endpoint, subscription.endpoint),
  });

  if (existing) {
    if (existing.p256dh !== subscription.keys.p256dh || existing.auth !== subscription.keys.auth || existing.userId !== userId) {
      await db.update(pushSubscriptions)
        .set({
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userId,
        })
        .where(eq(pushSubscriptions.id, existing.id));
      console.log(`[Push] Updated web subscription keys for user ${userId}`);
    }
    return existing;
  }

  const [saved] = await db.insert(pushSubscriptions).values({
    userId,
    type: "web",
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  }).returning();

  console.log(`[Push] New web subscription saved for user ${userId}`);
  return saved;
}

export async function saveDeviceToken(userId: string, deviceToken: string, platform: string) {
  const existing = await db.query.pushSubscriptions.findFirst({
    where: eq(pushSubscriptions.deviceToken, deviceToken),
  });

  if (existing) {
    if (existing.userId !== userId) {
      await db.update(pushSubscriptions)
        .set({ userId })
        .where(eq(pushSubscriptions.id, existing.id));
      console.log(`[Push] Updated device token ownership to user ${userId}`);
    }
    return existing;
  }

  const [saved] = await db.insert(pushSubscriptions).values({
    userId,
    type: platform === "ios" ? "apns" : "fcm",
    deviceToken,
  }).returning();

  console.log(`[Push] New ${platform} device token saved for user ${userId}`);
  return saved;
}

export async function syncSubscription(userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const saved = await saveSubscription(userId, subscription);

  const deleted = await db.delete(pushSubscriptions)
    .where(and(
      eq(pushSubscriptions.userId, userId),
      eq(pushSubscriptions.type, "web"),
      ne(pushSubscriptions.endpoint, subscription.endpoint)
    ))
    .returning({ id: pushSubscriptions.id });

  if (deleted.length > 0) {
    console.log(`[Push] Cleaned up ${deleted.length} stale web subscription(s) for user ${userId}`);
  }

  return { saved, cleaned: deleted.length };
}

export async function syncDeviceToken(userId: string, deviceToken: string, platform: string) {
  const saved = await saveDeviceToken(userId, deviceToken, platform);

  const type = platform === "ios" ? "apns" : "fcm";
  const deleted = await db.delete(pushSubscriptions)
    .where(and(
      eq(pushSubscriptions.userId, userId),
      eq(pushSubscriptions.type, type),
      ne(pushSubscriptions.deviceToken, deviceToken)
    ))
    .returning({ id: pushSubscriptions.id });

  if (deleted.length > 0) {
    console.log(`[Push] Cleaned up ${deleted.length} stale ${platform} token(s) for user ${userId}`);
  }

  return { saved, cleaned: deleted.length };
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

  if (subs.length === 0) {
    console.log(`[Push] No subscriptions found for user ${userId}`);
    return { sent: 0, total: 0 };
  }

  const webSubs = subs.filter(s => s.type === "web" && s.endpoint && s.p256dh && s.auth);
  const apnsSubs = subs.filter(s => s.type === "apns" && s.deviceToken);

  console.log(`[Push] Sending to ${webSubs.length} web + ${apnsSubs.length} APNs subscription(s) for user ${userId}`);

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/icon-72x72.png",
    data: { url: payload.url || "/" },
    tag: payload.tag || "habit-reminder",
  });

  const webResults = await Promise.allSettled(
    webSubs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint!,
            keys: { p256dh: sub.p256dh!, auth: sub.auth! },
          },
          notification
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
          console.log(`[Push] Removed stale web subscription ${sub.id} for user ${userId} (status: ${err.statusCode})`);
        } else {
          console.error(`[Push] Web push error for user ${userId} (sub ${sub.id}):`, err.statusCode, err.message);
        }
        throw err;
      }
    })
  );

  let apnsResults: PromiseSettledResult<void>[] = [];
  if (apnsSubs.length > 0) {
    if (!isApnsConfigured()) {
      console.log(`[Push] APNs not configured, skipping ${apnsSubs.length} native notification(s)`);
    } else {
      apnsResults = await Promise.allSettled(
        apnsSubs.map(async (sub) => {
          try {
            await sendApnsNotification(sub.deviceToken!, {
              title: payload.title,
              body: payload.body,
              url: payload.url,
              tag: payload.tag,
            });
          } catch (err: any) {
            if (err.statusCode === 410 || err.statusCode === 400) {
              await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
              console.log(`[Push] Removed invalid APNs token ${sub.id} for user ${userId} (status: ${err.statusCode})`);
            } else {
              console.error(`[Push] APNs error for user ${userId} (sub ${sub.id}):`, err.message);
            }
            throw err;
          }
        })
      );
    }
  }

  const allResults = [...webResults, ...apnsResults];
  const sent = allResults.filter((r) => r.status === "fulfilled").length;
  const failed = allResults.filter((r) => r.status === "rejected").length;
  console.log(`[Push] Result for user ${userId}: ${sent}/${subs.length} sent, ${failed} failed`);
  return { sent, total: subs.length };
}
