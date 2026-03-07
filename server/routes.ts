import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { sql, eq, and, isNotNull, gte, lte, desc, gt } from "drizzle-orm";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { openai as openaiClient } from "./replit_integrations/audio";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { db } from "./db";
import { users, feedback, userAchievements, habitTemplates, userTemplates, accountabilityPartners, progressReports, habits, dailyChallenges, moodEntries, pageViews, userProfiles, forumCategories, forumPosts, forumComments, postLikes, commentLikes, profileLikes, conversations, messages, coachChats, coachMessages, quickTasks, foundingMemberSlots, pushSubscriptions, journalEntries, focusSessions, goals, goalMilestones, dailyPlannerEntries, userCommitments, insertCommitmentSchema, nativeAuthTokens } from "@shared/schema";
import { saveSubscription, syncSubscription, syncDeviceToken, removeSubscription, removeAllSubscriptions, sendPushToUser } from "./pushNotifications";
import crypto from "crypto";
import path from "path";
import { checkContentSafety } from "./contentSafety";
import { sendAccountabilityInviteEmail, sendProgressUpdateEmail, sendAdminBulkEmail, sendWelcomeCampaignEmail } from "./email";
import { format } from "date-fns";

function getUserToday(timezone?: string | null): string {
  const tz = timezone || "UTC";
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date());
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";
import OpenAI from "openai";

// Auto-seed templates on startup
async function autoSeedTemplates() {
  try {
    const existing = await db.select().from(habitTemplates).limit(1);
    if (existing.length > 0) {
      return; // Templates already exist
    }
    
    console.log("Seeding default habit templates...");
    const defaultTemplates = [
      {
        name: "Morning Routine",
        description: "Start your day with energy and focus",
        category: "wellness",
        icon: "Sunrise",
        color: "amber-500",
        suggestedGoal: "Complete a 30-minute morning routine every day",
      },
      {
        name: "Daily Exercise",
        description: "Build consistent physical activity habits",
        category: "health",
        icon: "Dumbbell",
        color: "green-500",
        suggestedGoal: "Exercise for 30 minutes at least 5 days a week",
      },
      {
        name: "Reading Habit",
        description: "Expand your mind through daily reading",
        category: "learning",
        icon: "BookOpen",
        color: "blue-500",
        suggestedGoal: "Read for 20 minutes every day",
      },
      {
        name: "Meditation Practice",
        description: "Cultivate mindfulness and inner peace",
        category: "wellness",
        icon: "Brain",
        color: "purple-500",
        suggestedGoal: "Meditate for 10 minutes daily",
      },
      {
        name: "Healthy Eating",
        description: "Make better food choices every day",
        category: "health",
        icon: "Apple",
        color: "red-500",
        suggestedGoal: "Eat at least 3 servings of vegetables daily",
      },
      {
        name: "Journaling",
        description: "Reflect on your day and process emotions",
        category: "wellness",
        icon: "PenTool",
        color: "teal-500",
        suggestedGoal: "Write in your journal every evening",
      },
      {
        name: "Learning New Skills",
        description: "Dedicate time to learning something new",
        category: "learning",
        icon: "GraduationCap",
        color: "indigo-500",
        suggestedGoal: "Spend 30 minutes learning a new skill daily",
      },
      {
        name: "Digital Detox",
        description: "Reduce screen time and be more present",
        category: "wellness",
        icon: "Smartphone",
        color: "gray-500",
        suggestedGoal: "Limit recreational screen time to 2 hours daily",
      },
      {
        name: "Sleep Hygiene",
        description: "Improve your sleep quality and consistency",
        category: "health",
        icon: "Moon",
        color: "slate-600",
        suggestedGoal: "Get 7-8 hours of sleep every night",
      },
      {
        name: "Gratitude Practice",
        description: "Cultivate appreciation and positivity",
        category: "wellness",
        icon: "Heart",
        color: "pink-500",
        suggestedGoal: "Write 3 things you're grateful for each day",
      },
    ];
    
    for (const template of defaultTemplates) {
      await db.insert(habitTemplates).values(template);
    }
    console.log(`Seeded ${defaultTemplates.length} default habit templates`);
  } catch (error) {
    console.error("Error auto-seeding templates:", error);
  }
}

setInterval(async () => {
  try {
    await db.delete(nativeAuthTokens).where(lte(nativeAuthTokens.expiresAt, new Date()));
  } catch (e) {
    console.error("Failed to clean up expired native auth tokens:", e);
  }
}, 60000);

const APP_VERSION = Date.now().toString();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const PRIMARY_DOMAIN = "habitbuilder.pro";

  app.get("/api/version", (_req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json({ version: APP_VERSION });
  });

  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/api/auth/native-complete", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.redirect("/api/login?returnTo=/api/auth/native-complete");
    }
    const claims = (req.user as any).claims;
    if (!claims?.sub) {
      return res.status(400).send("Invalid user session");
    }
    const token = crypto.randomBytes(32).toString("hex");
    const userId = String(claims.sub);
    const expiresAt = new Date(Date.now() + 300000);
    try {
      await db.insert(nativeAuthTokens).values({ token, userId, expiresAt });
    } catch (err) {
      console.error("Failed to store native auth token:", err);
      return res.status(500).send("Authentication error. Please try again.");
    }
    const deepLink = `habitbuilder://auth?token=${token}`;
    res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sign In Complete</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f1a12;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      text-align: center;
      max-width: 320px;
      width: 100%;
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
    p { font-size: 15px; color: #9ca3af; margin-bottom: 32px; line-height: 1.5; }
    .btn {
      display: block;
      width: 100%;
      padding: 18px 24px;
      background: #4ade80;
      color: #0f1a12;
      font-size: 17px;
      font-weight: 700;
      border: none;
      border-radius: 14px;
      text-decoration: none;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .btn:active { background: #22c55e; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>Sign-in successful!</h1>
    <p>Tap the button below to return to HabitBuilder and complete sign-in.</p>
    <a class="btn" href="${deepLink}">Return to HabitBuilder</a>
  </div>
  <script>
    setTimeout(function() { window.location.href = "${deepLink}"; }, 500);
  </script>
</body>
</html>`);
  });

  app.post("/api/auth/exchange-token", async (req, res) => {
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Token required" });
    }
    let tokenData: { userId: string; expiresAt: Date } | undefined;
    try {
      const [row] = await db
        .select()
        .from(nativeAuthTokens)
        .where(eq(nativeAuthTokens.token, token))
        .limit(1);
      if (!row) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }
      if (row.expiresAt < new Date()) {
        await db.delete(nativeAuthTokens).where(eq(nativeAuthTokens.token, token));
        return res.status(401).json({ error: "Token expired" });
      }
      tokenData = { userId: row.userId, expiresAt: row.expiresAt };
      await db.delete(nativeAuthTokens).where(eq(nativeAuthTokens.token, token));
    } catch (err) {
      console.error("Token lookup error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
    try {
      const [user] = await db.select().from(users).where(eq(users.id, tokenData.userId)).limit(1);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const expiresAtSeconds = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
      const sessionUser = { claims: { sub: String(user.id), email: user.email, first_name: user.firstName, last_name: user.lastName, profile_image: user.profileImageUrl }, expires_at: expiresAtSeconds };
      req.login(sessionUser, (err) => {
        if (err) {
          console.error("Native token exchange login error:", err);
          return res.status(500).json({ error: "Session creation failed" });
        }
        req.session.save((saveErr) => {
          if (saveErr) console.error("Session save error:", saveErr);
          res.json({ success: true, user });
        });
      });
    } catch (err) {
      console.error("Token exchange error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/playstore-assets.zip", (_req, res) => {
    const filePath = path.resolve(import.meta.dirname, "..", "client", "public", "playstore-assets.zip");
    res.download(filePath, "playstore-assets.zip");
  });

  app.get("/.well-known/assetlinks.json", (_req, res) => {
    res.json([{
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "pro.habitbuilder.twa",
        sha256_cert_fingerprints: [
          "BE:40:2E:61:B2:41:53:E0:B1:23:59:DA:16:B6:12:AD:C9:4C:40:B3:D0:BD:18:C9:FD:23:99:F5:1D:A4:01:AF"
        ]
      }
    }]);
  });

  app.use((req, res, next) => {
    const host = req.hostname;
    if (
      host &&
      host !== PRIMARY_DOMAIN &&
      host.endsWith(".replit.app") &&
      (req.method === "GET" || req.method === "HEAD") &&
      !req.path.startsWith("/api/") &&
      !req.path.startsWith("/.well-known/") &&
      !req.path.endsWith(".zip")
    ) {
      const target = `https://${PRIMARY_DOMAIN}${req.originalUrl}`;
      return res.redirect(301, target);
    }
    next();
  });

  // Object storage routes
  registerObjectStorageRoutes(app);
  
  // Auto-seed templates on startup
  await autoSeedTemplates();
  
  const objectStorageService = new ObjectStorageService();

  app.post("/api/user/accept-tos", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      await db.update(users).set({ tosAcceptedAt: new Date() }).where(eq(users.id, userId));
      const updatedUser = await storage.getUser(userId);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error accepting TOS:", error);
      res.status(500).json({ error: "Failed to accept terms of service" });
    }
  });

  // Profile image upload endpoint
  app.post("/api/user/profile-image", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      
      // Get presigned URL for upload
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      
      res.json({ 
        uploadURL, 
        objectPath,
        message: "Upload to this URL, then call /api/user/profile-image/confirm" 
      });
    } catch (error) {
      console.error("Error generating profile image upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Zod schema for color theme validation
  const ALL_THEMES = ["nature", "minimal", "ocean", "sunset", "lavender", "forest", "ruby", "amber", "cyan", "rose", "emerald", "platinum", "champion_gold"] as const;
  const colorThemeSchema = z.object({
    colorTheme: z.enum(ALL_THEMES),
  });

  const premiumThemes = ["ocean", "sunset", "lavender", "forest", "ruby", "amber", "cyan", "rose", "emerald", "platinum", "champion_gold"];

  // Save user color theme preference
  app.patch("/api/user/color-theme", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      
      const validatedData = colorThemeSchema.parse(req.body);
      const { colorTheme } = validatedData;
      
      const user = await storage.getUser(userId);
      const isPremium = user?.subscriptionTier === "premium" || user?.isAdmin;
      
      if (premiumThemes.includes(colorTheme) && !isPremium) {
        return res.status(403).json({ error: "This theme requires a Premium subscription" });
      }
      
      const [updated] = await db.update(users)
        .set({ colorTheme, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
      
      res.json({ success: true, colorTheme: updated.colorTheme });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid color theme", details: error.errors });
      }
      console.error("Error saving color theme:", error);
      res.status(500).json({ error: "Failed to save color theme" });
    }
  });

  app.patch("/api/user/name", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { firstName, lastName } = req.body;
      if (typeof firstName !== "string" || firstName.trim().length === 0) {
        return res.status(400).json({ error: "First name is required" });
      }
      if (firstName.trim().length > 50 || (lastName && lastName.length > 50)) {
        return res.status(400).json({ error: "Name is too long" });
      }
      const [updated] = await db.update(users)
        .set({ firstName: firstName.trim(), lastName: (lastName || "").trim(), updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
      res.json(updated);
    } catch (error) {
      console.error("Error updating name:", error);
      res.status(500).json({ error: "Failed to update name" });
    }
  });

  app.patch("/api/user/onboarding", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const [updated] = await db.update(users)
        .set({ onboardingComplete: true, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
      res.json(updated);
    } catch (error) {
      console.error("Error updating onboarding:", error);
      res.status(500).json({ error: "Failed to update onboarding" });
    }
  });

  app.patch("/api/user/timezone", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { timezone } = req.body;
      if (!timezone || typeof timezone !== "string") {
        return res.status(400).json({ error: "Timezone is required" });
      }
      try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
      } catch {
        return res.status(400).json({ error: "Invalid timezone" });
      }
      const [updated] = await db.update(users)
        .set({ timezone, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
      res.json({ success: true, timezone: updated.timezone });
    } catch (error) {
      console.error("Error saving timezone:", error);
      res.status(500).json({ error: "Failed to save timezone" });
    }
  });

  app.patch("/api/user/notification-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const allowedFields = ['pushNotificationsEnabled', 'pushHabitReminders', 'pushStreakAlerts', 'pushJournalReminder', 'pushMoodCheckin', 'pushTimerComplete', 'pushGoalMilestones', 'pushDailyPlanner', 'journalReminderTime', 'moodCheckinTimes', 'streakAlertTime', 'dailyPlannerTime', 'habitReminderTime'];
      const updates: any = { updatedAt: new Date() };
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }
      const [updated] = await db.update(users).set(updates).where(eq(users.id, userId)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ error: "Failed to update notification preferences" });
    }
  });

  app.get("/api/push/vapid-key", (_req, res) => {
    res.json({ vapidPublicKey: process.env.VAPID_PUBLIC_KEY || "" });
  });

  app.patch("/api/user/email-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { dailyReminderEnabled, weeklyDigestEnabled, dailyReminderTime } = req.body;
      const updates: any = { updatedAt: new Date() };
      if (typeof dailyReminderEnabled === 'boolean') updates.dailyReminderEnabled = dailyReminderEnabled;
      if (typeof weeklyDigestEnabled === 'boolean') updates.weeklyDigestEnabled = weeklyDigestEnabled;
      if (dailyReminderTime) updates.dailyReminderTime = dailyReminderTime;
      const [updated] = await db.update(users).set(updates).where(eq(users.id, userId)).returning();
      res.json({ dailyReminderEnabled: updated.dailyReminderEnabled, weeklyDigestEnabled: updated.weeklyDigestEnabled, dailyReminderTime: updated.dailyReminderTime });
    } catch (error) {
      console.error("Error updating email preferences:", error);
      res.status(500).json({ error: "Failed to update email preferences" });
    }
  });

  app.post("/api/push/subscribe", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { subscription } = req.body;
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({ error: "Invalid subscription" });
      }
      const saved = await saveSubscription(userId, subscription);
      await db.update(users).set({ pushNotificationsEnabled: true, updatedAt: new Date() }).where(eq(users.id, userId));
      res.json({ success: true, id: saved.id });
    } catch (error) {
      console.error("Error saving push subscription:", error);
      res.status(500).json({ error: "Failed to save subscription" });
    }
  });

  app.post("/api/push/sync", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { subscription } = req.body;
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({ error: "Invalid subscription" });
      }
      const result = await syncSubscription(userId, subscription);
      res.json({ success: true, cleaned: result.cleaned });
    } catch (error) {
      console.error("Error syncing push subscription:", error);
      res.status(500).json({ error: "Failed to sync subscription" });
    }
  });

  app.post("/api/push/register-device", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { deviceToken, platform } = req.body;
      if (!deviceToken || !platform) {
        return res.status(400).json({ error: "Missing deviceToken or platform" });
      }
      const result = await syncDeviceToken(userId, deviceToken, platform);
      await db.update(users).set({ pushNotificationsEnabled: true, updatedAt: new Date() }).where(eq(users.id, userId));
      res.json({ success: true, cleaned: result.cleaned });
    } catch (error) {
      console.error("Error registering device token:", error);
      res.status(500).json({ error: "Failed to register device" });
    }
  });

  app.post("/api/push/unsubscribe", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { endpoint } = req.body;
      if (endpoint) {
        await removeSubscription(userId, endpoint);
      } else {
        await removeAllSubscriptions(userId);
      }
      await db.update(users).set({ pushNotificationsEnabled: false, updatedAt: new Date() }).where(eq(users.id, userId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing push subscription:", error);
      res.status(500).json({ error: "Failed to remove subscription" });
    }
  });

  app.post("/api/push/test", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const result = await sendPushToUser(userId, {
        title: "HabitBuilder",
        body: "Push notifications are working! You'll get reminders for your habits here.",
        url: "/",
        tag: "test-notification",
      });
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Error sending test push:", error);
      res.status(500).json({ error: "Failed to send test notification" });
    }
  });

  app.delete("/api/user/account", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;

      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
      await db.delete(coachMessages).where(
        sql`chat_id IN (SELECT id FROM coach_chats WHERE user_id = ${userId})`
      );
      await db.delete(coachChats).where(eq(coachChats.userId, userId));
      await db.delete(messages).where(eq(messages.senderId, userId));
      await db.delete(conversations).where(
        sql`user1_id = ${userId} OR user2_id = ${userId}`
      );
      await db.delete(commentLikes).where(eq(commentLikes.userId, userId));
      await db.delete(postLikes).where(eq(postLikes.userId, userId));
      await db.delete(profileLikes).where(eq(profileLikes.likedByUserId, userId));
      await db.delete(forumComments).where(eq(forumComments.userId, userId));
      await db.delete(forumPosts).where(eq(forumPosts.userId, userId));
      await db.delete(userProfiles).where(eq(userProfiles.userId, userId));
      await db.delete(moodEntries).where(eq(moodEntries.userId, userId));
      await db.delete(quickTasks).where(eq(quickTasks.userId, userId));
      await db.delete(userAchievements).where(eq(userAchievements.userId, userId));
      await db.delete(progressReports).where(eq(progressReports.userId, userId));
      await db.delete(accountabilityPartners).where(
        sql`user_id = ${userId} OR partner_user_id = ${userId}`
      );
      await db.delete(userTemplates).where(eq(userTemplates.userId, userId));
      await db.delete(habits).where(eq(habits.userId, userId));
      await db.delete(feedback).where(eq(feedback.userId, userId));
      await db.delete(pageViews).where(eq(pageViews.userId, userId));

      const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
      if (user?.stripeCustomerId) {
        try {
          const stripe = await getUncachableStripeClient();
          const subscriptions = await stripe.subscriptions.list({
            customer: user.stripeCustomerId,
            status: 'active',
          });
          for (const sub of subscriptions.data) {
            await stripe.subscriptions.cancel(sub.id);
          }
        } catch (stripeErr) {
          console.error("Error cancelling Stripe subscription:", stripeErr);
        }
      }

      await db.delete(users).where(eq(users.id, userId));

      req.logout(() => {});
      res.json({ success: true, message: "Account and all data deleted successfully" });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  app.post("/api/admin/send-daily-reminders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const adminUser = await db.query.users.findFirst({ where: eq(users.id, userId) });
      if (!adminUser?.isAdmin) return res.status(403).json({ error: "Admin only" });

      const { sendDailyReminderEmail } = await import('./email');
      const eligibleUsers = await db.query.users.findMany({
        where: and(eq(users.dailyReminderEnabled, true), isNotNull(users.email)),
      });

      let sent = 0, failed = 0;
      const today = new Date().toISOString().split('T')[0];
      
      for (const u of eligibleUsers) {
        if (!u.email) continue;
        if (u.lastDailyReminderSent === today) continue;
        
        try {
          const userHabits = await db.query.habits.findMany({
            where: eq(habits.userId, u.id),
          });
          
          const todayTasks: { habitTitle: string; taskTitle: string }[] = [];
          let maxStreak = 0;
          
          for (const habit of userHabits) {
            if (habit.currentStreak && habit.currentStreak > maxStreak) maxStreak = habit.currentStreak;
            const plans = habit.dailyPlans as any[];
            if (plans && Array.isArray(plans)) {
              for (const plan of plans.slice(0, 2)) {
                const taskTitle = typeof plan === 'string' ? plan : plan.title || plan.task || 'Check your plan';
                todayTasks.push({ habitTitle: habit.title, taskTitle });
              }
            }
          }
          
          await sendDailyReminderEmail({
            toEmail: u.email,
            userName: u.firstName || '',
            todayTasks: todayTasks.slice(0, 5),
            currentStreak: maxStreak,
          });
          
          await db.update(users).set({ lastDailyReminderSent: today }).where(eq(users.id, u.id));
          sent++;
        } catch (err) {
          console.error(`Failed to send daily reminder to ${u.email}:`, err);
          failed++;
        }
        await new Promise(r => setTimeout(r, 500));
      }
      
      res.json({ sent, failed, total: eligibleUsers.length });
    } catch (error) {
      console.error("Error sending daily reminders:", error);
      res.status(500).json({ error: "Failed to send reminders" });
    }
  });

  // ==========================================
  // QUICK TASKS
  // ==========================================

  app.get("/api/quick-tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
      const tasks = await db.select().from(quickTasks)
        .where(and(eq(quickTasks.userId, userId), eq(quickTasks.date, date)))
        .orderBy(quickTasks.sortOrder);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching quick tasks:", error);
      res.status(500).json({ error: "Failed to fetch quick tasks" });
    }
  });

  app.get("/api/quick-tasks/range", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const from = req.query.from as string;
      const to = req.query.to as string;
      if (!from || !to) {
        return res.status(400).json({ error: "from and to dates required" });
      }
      const tasks = await db.select().from(quickTasks)
        .where(and(
          eq(quickTasks.userId, userId),
          gte(quickTasks.date, from),
          lte(quickTasks.date, to)
        ))
        .orderBy(quickTasks.date, quickTasks.sortOrder);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching quick tasks range:", error);
      res.status(500).json({ error: "Failed to fetch quick tasks" });
    }
  });

  app.post("/api/quick-tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { title, date, scheduledTime, priority, category, parentId, isRecurring, recurringPattern } = req.body;
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ error: "Title is required" });
      }
      if (!date || typeof date !== "string") {
        return res.status(400).json({ error: "Date is required" });
      }
      const existing = await db.select().from(quickTasks)
        .where(and(eq(quickTasks.userId, userId), eq(quickTasks.date, date)));
      const sortOrder = existing.length;
      const [task] = await db.insert(quickTasks).values({
        userId,
        title: title.trim(),
        date,
        scheduledTime: scheduledTime || null,
        sortOrder,
        priority: priority || "normal",
        category: category || null,
        parentId: parentId || null,
        isRecurring: isRecurring || false,
        recurringPattern: recurringPattern || null,
      }).returning();
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating quick task:", error);
      res.status(500).json({ error: "Failed to create quick task" });
    }
  });

  app.patch("/api/quick-tasks/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { taskIds } = req.body;
      if (!Array.isArray(taskIds)) {
        return res.status(400).json({ error: "taskIds array is required" });
      }
      for (let i = 0; i < taskIds.length; i++) {
        await db.update(quickTasks)
          .set({ sortOrder: i })
          .where(and(eq(quickTasks.id, taskIds[i]), eq(quickTasks.userId, userId)));
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering quick tasks:", error);
      res.status(500).json({ error: "Failed to reorder tasks" });
    }
  });

  app.patch("/api/quick-tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const taskId = Number(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ error: "Invalid task ID" });
      }
      const [existing] = await db.select().from(quickTasks)
        .where(and(eq(quickTasks.id, taskId), eq(quickTasks.userId, userId)));
      if (!existing) {
        return res.status(404).json({ error: "Task not found" });
      }
      const updates: Record<string, any> = {};
      if (typeof req.body.completed === "boolean") {
        updates.completed = req.body.completed;
      }
      if (typeof req.body.title === "string" && req.body.title.trim().length > 0) {
        updates.title = req.body.title.trim();
      }
      if (req.body.scheduledTime !== undefined) {
        updates.scheduledTime = req.body.scheduledTime || null;
      }
      if (req.body.date !== undefined && typeof req.body.date === "string") {
        updates.date = req.body.date;
      }
      if (req.body.priority !== undefined) {
        updates.priority = req.body.priority;
      }
      if (req.body.category !== undefined) {
        updates.category = req.body.category || null;
      }
      if (req.body.parentId !== undefined) {
        updates.parentId = req.body.parentId || null;
      }
      if (typeof req.body.isRecurring === "boolean") {
        updates.isRecurring = req.body.isRecurring;
      }
      if (req.body.recurringPattern !== undefined) {
        updates.recurringPattern = req.body.recurringPattern || null;
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }
      const [updated] = await db.update(quickTasks)
        .set(updates)
        .where(and(eq(quickTasks.id, taskId), eq(quickTasks.userId, userId)))
        .returning();

      if (typeof req.body.completed === "boolean") {
        try {
          const taskDate = updated.date || existing.date;
          if (taskDate) {
            const [plannerEntry] = await db.select().from(dailyPlannerEntries)
              .where(and(eq(dailyPlannerEntries.userId, userId), eq(dailyPlannerEntries.date, taskDate)));
            if (plannerEntry && Array.isArray(plannerEntry.blocks)) {
              const plannerBlocks = (plannerEntry.blocks as any[]).map(b => {
                if (b.type === "task" && (b.taskId === taskId || b.title === updated.title)) {
                  return { ...b, completed: req.body.completed };
                }
                return b;
              });
              await db.update(dailyPlannerEntries)
                .set({ blocks: plannerBlocks, updatedAt: new Date() })
                .where(eq(dailyPlannerEntries.id, plannerEntry.id));
            }
          }
        } catch (syncErr) {
          console.error("Error syncing task completion to planner:", syncErr);
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating quick task:", error);
      res.status(500).json({ error: "Failed to update quick task" });
    }
  });

  app.delete("/api/quick-tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const taskId = Number(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ error: "Invalid task ID" });
      }
      const [existing] = await db.select().from(quickTasks)
        .where(and(eq(quickTasks.id, taskId), eq(quickTasks.userId, userId)));
      if (!existing) {
        return res.status(404).json({ error: "Task not found" });
      }
      await db.delete(quickTasks)
        .where(and(eq(quickTasks.id, taskId), eq(quickTasks.userId, userId)));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting quick task:", error);
      res.status(500).json({ error: "Failed to delete quick task" });
    }
  });

  // ==========================================
  // JOURNAL ENTRIES
  // ==========================================

  app.get("/api/journal", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const entries = await db.select().from(journalEntries)
        .where(eq(journalEntries.userId, userId))
        .orderBy(sql`${journalEntries.date} DESC`)
        .limit(30);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      res.status(500).json({ error: "Failed to fetch journal entries" });
    }
  });

  app.get("/api/journal/:date", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const entries = await db.select().from(journalEntries)
        .where(and(eq(journalEntries.userId, userId), eq(journalEntries.date, req.params.date)))
        .orderBy(sql`${journalEntries.createdAt} DESC`);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      res.status(500).json({ error: "Failed to fetch journal entries" });
    }
  });

  app.post("/api/journal", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { date, content, mood, tags, habitIds } = req.body;

      const [entry] = await db.insert(journalEntries)
        .values({ userId, date, content, mood, tags, habitIds })
        .returning();
      res.json(entry);
    } catch (error) {
      console.error("Error saving journal entry:", error);
      res.status(500).json({ error: "Failed to save journal entry" });
    }
  });

  app.put("/api/journal/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const id = parseInt(req.params.id);
      const { content, mood, tags, habitIds } = req.body;

      const [existing] = await db.select().from(journalEntries)
        .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)));
      if (!existing) return res.status(404).json({ error: "Entry not found" });

      const [updated] = await db.update(journalEntries)
        .set({ content, mood, tags, habitIds, updatedAt: new Date() })
        .where(eq(journalEntries.id, id))
        .returning();
      res.json(updated);
    } catch (error) {
      console.error("Error updating journal entry:", error);
      res.status(500).json({ error: "Failed to update journal entry" });
    }
  });

  app.post("/api/journal/:id/insights", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const id = parseInt(req.params.id);
      const [entry] = await db.select().from(journalEntries)
        .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)));

      if (!entry) return res.status(404).json({ message: "Not found" });

      const recentEntries = await db.select().from(journalEntries)
        .where(eq(journalEntries.userId, userId))
        .orderBy(sql`${journalEntries.date} DESC`)
        .limit(7);

      const userHabits = await db.select().from(habits)
        .where(eq(habits.userId, userId));

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a compassionate habit coach analyzing a user's journal entries. Provide brief, actionable insights (2-3 sentences) about patterns you notice in their mood, habits, and reflections. Be encouraging and specific. Do not generate harmful or inappropriate content."
          },
          {
            role: "user",
            content: `Today's entry: "${entry.content}" (mood: ${entry.mood || "not specified"})\n\nRecent entries: ${recentEntries.map(e => `${e.date}: ${e.content.substring(0, 100)}... (mood: ${e.mood || "?"})`).join("\n")}\n\nActive habits: ${userHabits.map((h: any) => h.title).join(", ")}`
          }
        ],
        max_tokens: 200,
      });

      const insights = response.choices[0]?.message?.content || "Keep journaling - patterns will emerge over time!";

      const [updated] = await db.update(journalEntries)
        .set({ aiInsights: insights, updatedAt: new Date() })
        .where(eq(journalEntries.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error generating journal insights:", error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  app.post("/api/journal/full-analysis", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      if (!user || user.subscriptionTier !== "premium") {
        return res.status(403).json({ error: "Full journal analysis is a Premium feature" });
      }

      const allEntries = await db.select().from(journalEntries)
        .where(eq(journalEntries.userId, userId))
        .orderBy(sql`${journalEntries.date} DESC`)
        .limit(50);

      if (allEntries.length < 3) {
        return res.status(400).json({ error: "You need at least 3 journal entries for a full analysis" });
      }

      const userHabits = await db.select().from(habits)
        .where(eq(habits.userId, userId));

      const entrySummaries = allEntries.map(e =>
        `${e.date} (mood: ${e.mood || "not specified"}): ${e.content.substring(0, 200)}`
      ).join("\n");

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a compassionate habit coach providing a comprehensive analysis of a user's journal history. Analyze mood trends over time, recurring themes and patterns, correlations between habits and mood, areas of growth, and actionable recommendations. Structure your response with clear sections: Mood Trends, Key Themes, Habit Correlations, Growth Areas, and Recommendations. Be encouraging, specific, and insightful. Do not generate harmful or inappropriate content."
          },
          {
            role: "user",
            content: `Analyze these ${allEntries.length} journal entries:\n\n${entrySummaries}\n\nActive habits: ${userHabits.map((h: any) => h.title).join(", ") || "None"}`
          }
        ],
        max_tokens: 800,
      });

      const analysis = response.choices[0]?.message?.content || "Keep journaling - patterns will emerge over time!";
      res.json({ analysis, entriesAnalyzed: allEntries.length });
    } catch (error) {
      console.error("Error generating full journal analysis:", error);
      res.status(500).json({ error: "Failed to generate analysis" });
    }
  });

  app.delete("/api/journal/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      await db.delete(journalEntries)
        .where(and(eq(journalEntries.id, parseInt(req.params.id)), eq(journalEntries.userId, userId)));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting journal entry:", error);
      res.status(500).json({ error: "Failed to delete journal entry" });
    }
  });

  // Confirm profile image upload and update user record
  app.post("/api/user/profile-image/confirm", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { objectPath } = req.body;
      
      if (!objectPath) {
        return res.status(400).json({ error: "objectPath is required" });
      }

      // Set the profile image URL - construct the serving URL
      const profileImageUrl = objectPath;
      
      // Update user's profile image in database
      await db.update(users).set({ 
        profileImageUrl,
        updatedAt: new Date(),
      }).where(eq(users.id, userId));
      
      res.json({ profileImageUrl, success: true });
    } catch (error) {
      console.error("Error confirming profile image:", error);
      res.status(500).json({ error: "Failed to update profile image" });
    }
  });

  // Track which habits have been fixed to avoid repeated DB writes
  const fixedHabitIds = new Set<number>();

  // Helper function to auto-fix reversed habit dates
  async function autoFixHabitDates(habit: any): Promise<any> {
    // Skip if already fixed this session or no plans
    if (fixedHabitIds.has(habit.id) || !habit.dailyPlans || !Array.isArray(habit.dailyPlans) || habit.dailyPlans.length < 2) {
      return habit;
    }
    
    const plans = habit.dailyPlans as any[];
    
    // Validate that all plans have dayNumber and date
    const hasValidDayNumbers = plans.every(p => typeof p.dayNumber === 'number' && p.date);
    if (!hasValidDayNumbers) {
      fixedHabitIds.add(habit.id);
      return habit;
    }
    
    const firstDate = new Date(plans[0].date);
    const lastDate = new Date(plans[plans.length - 1].date);
    
    // Check if dates are reversed (first date is later than last date)
    // AND verify dayNumber ordering is also inconsistent (dayNumber 1 should have earliest date)
    const firstDayNum = plans[0].dayNumber;
    const lastDayNum = plans[plans.length - 1].dayNumber;
    const isDateReversed = firstDate > lastDate;
    const isDayNumberReversed = firstDayNum > lastDayNum;
    
    // Only fix if dates are reversed but dayNumbers suggest correct order exists
    if (isDateReversed && isDayNumberReversed) {
      // Sort by dayNumber ascending to restore correct order
      const sortedPlans = [...plans].sort((a, b) => a.dayNumber - b.dayNumber);
      
      // Verify fix makes sense: after sorting, first date should be earliest
      const newFirstDate = new Date(sortedPlans[0].date);
      const newLastDate = new Date(sortedPlans[sortedPlans.length - 1].date);
      
      if (newFirstDate <= newLastDate) {
        await db.update(habits)
          .set({ dailyPlans: sortedPlans as any })
          .where(eq(habits.id, habit.id));
        
        console.log(`Auto-fixed reversed dates for habit: ${habit.title} (id: ${habit.id})`);
        fixedHabitIds.add(habit.id);
        
        return { ...habit, dailyPlans: sortedPlans };
      }
    }
    
    // Mark as processed even if no fix needed
    fixedHabitIds.add(habit.id);
    return habit;
  }

  function autoMarkSkippedTasks(habit: any, userTimezone?: string | null): { updated: boolean; habit: any } {
    const today = getUserToday(userTimezone);
    const dailyPlans = habit.dailyPlans || [];
    let updated = false;

    for (const plan of dailyPlans) {
      if (plan.date < today) {
        for (const task of plan.tasks) {
          if (!task.completed && !task.skipped) {
            task.skipped = true;
            task.completed = false;
            updated = true;
          }
          if (task.completed && task.skipped) {
            task.skipped = false;
            updated = true;
          }
        }
        const activeTasks = plan.tasks.filter((t: any) => !t.skipped);
        const anyCompleted = plan.tasks.some((t: any) => t.completed);
        const allResolved = plan.tasks.every((t: any) => t.completed || t.skipped);
        plan.completed = allResolved && anyCompleted && activeTasks.length > 0;
      }
    }

    return { updated, habit: { ...habit, dailyPlans } };
  }

  // Protected routes
  app.get(api.habits.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user!.claims.sub;
    const user = await storage.getUser(userId);
    const userTz = user?.timezone;
    const habits = await storage.getHabits(userId);
    
    // Auto-fix any habits with reversed dates
    const fixedHabits = await Promise.all(habits.map(autoFixHabitDates));

    const processedHabits = [];
    for (const h of fixedHabits) {
      const { updated, habit: processed } = autoMarkSkippedTasks(h, userTz);
      if (updated) {
        await storage.updateHabit(processed.id, userId, { dailyPlans: processed.dailyPlans });
      }
      processedHabits.push(processed);
    }
    
    res.json(processedHabits);
  });

  app.get("/api/habits/summary", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      const userTz = user?.timezone;
      const habits = await storage.getHabits(userId);

      const now = new Date();
      const userNow = userTz
        ? new Date(now.toLocaleString("en-US", { timeZone: userTz }))
        : now;
      const todayStr = `${userNow.getFullYear()}-${String(userNow.getMonth() + 1).padStart(2, "0")}-${String(userNow.getDate()).padStart(2, "0")}`;

      const dayOfWeek = userNow.getDay();
      const weekStartDate = new Date(userNow);
      weekStartDate.setDate(weekStartDate.getDate() - dayOfWeek);
      const weekStartStr = `${weekStartDate.getFullYear()}-${String(weekStartDate.getMonth() + 1).padStart(2, "0")}-${String(weekStartDate.getDate()).padStart(2, "0")}`;
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      const weekEndStr = `${weekEndDate.getFullYear()}-${String(weekEndDate.getMonth() + 1).padStart(2, "0")}-${String(weekEndDate.getDate()).padStart(2, "0")}`;

      const summaries = habits.map((h) => {
        const weekPlans = (h.dailyPlans || []).filter((p: any) => p.date >= weekStartStr && p.date <= weekEndStr);
        return {
          id: h.id,
          userId: h.userId,
          title: h.title,
          description: h.description,
          goal: h.goal,
          setupComplete: h.setupComplete,
          planDuration: h.planDuration,
          planStartDate: h.planStartDate,
          planEndDate: h.planEndDate,
          schedule: h.schedule,
          dailyPlans: weekPlans,
          progress: [],
          progressCount: ((h.progress || []) as any[]).length,
          totalTimeSpent: h.totalTimeSpent,
          currentStreak: h.currentStreak,
          longestStreak: h.longestStreak,
          customIcon: h.customIcon,
          customColor: h.customColor,
          category: h.category,
          archived: h.archived,
          downgradeArchived: h.downgradeArchived,
          linkedHabitId: h.linkedHabitId,
          createdAt: h.createdAt,
          questions: [],
          aiTips: [],
          aiContext: null,
          streakFreezeUsed: h.streakFreezeUsed,
          streakFreezeMonth: h.streakFreezeMonth,
          missReasons: [],
        };
      });

      res.json(summaries);
    } catch (error) {
      console.error("Error fetching habits summary:", error);
      res.status(500).json({ message: "Failed to fetch habits summary" });
    }
  });

  app.get(api.habits.get.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      const userTz = user?.timezone;
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid habit ID' });
      }
      let habit = await storage.getHabit(id);
      
      if (!habit) {
        return res.status(404).json({ message: 'Habit not found' });
      }
      
      if (habit.userId !== userId) {
          return res.status(401).json({ message: 'Unauthorized' });
      }

      // Auto-fix if dates are reversed
      habit = await autoFixHabitDates(habit);

      const { updated, habit: processed } = autoMarkSkippedTasks(habit, userTz);
      if (updated) {
        await storage.updateHabit(processed.id, userId, { dailyPlans: processed.dailyPlans });
      }

      res.json(processed);
    } catch (error) {
      console.error("Error fetching habit:", error);
      res.status(500).json({ message: 'Failed to load habit' });
    }
  });

  app.post(api.habits.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      
      const existingHabits = await storage.getHabits(userId);
      const hasPaidSubscription = user?.hasPaid && (user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'premium');
      const isAdmin = user?.isAdmin === true;
      
      if (!hasPaidSubscription && !isAdmin && existingHabits.length >= 1) {
        return res.status(403).json({ 
          error: "Free users can have 1 habit. Upgrade to Pro ($6/mo) for unlimited habits." 
        });
      }
      
      const input = api.habits.create.input.parse(req.body);
      
      const safetyCheck = checkContentSafety(input.title ?? '', input.description, input.goal);
      if (!safetyCheck.allowed) {
        return res.status(400).json({ 
          error: safetyCheck.message,
          safetyFlag: safetyCheck.reason,
        });
      }
      
      const habit = await storage.createHabit(userId, input);
      res.status(201).json(habit);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.habits.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const input = api.habits.update.input.parse(req.body);
      
      if (input.title || input.description || input.goal) {
        const safetyCheck = checkContentSafety(input.title ?? '', input.description, input.goal);
        if (!safetyCheck.allowed) {
          return res.status(400).json({ 
            error: safetyCheck.message,
            safetyFlag: safetyCheck.reason,
          });
        }
      }
      
      const habit = await storage.updateHabit(Number(req.params.id), userId, input);
      
      if (!habit) {
        return res.status(404).json({ message: 'Habit not found' });
      }

      res.json(habit);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.habits.delete.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user!.claims.sub;
    const habitId = Number(req.params.id);
    await storage.deleteHabit(habitId, userId);

    // Clean up deleted habit from accountability partner shared lists
    try {
      const partnerRows = await db.select().from(accountabilityPartners)
        .where(eq(accountabilityPartners.userId, userId));
      for (const p of partnerRows) {
        if (p.habitIds && p.habitIds.includes(habitId)) {
          const updated = p.habitIds.filter(id => id !== habitId);
          await db.update(accountabilityPartners)
            .set({ habitIds: updated })
            .where(eq(accountabilityPartners.id, p.id));
        }
      }
    } catch (cleanupErr) {
      console.error("Error cleaning up accountability habit references:", cleanupErr);
    }

    res.status(204).send();
  });

  // Streak miss reason (all tiers)
  const missReasonSchema = z.object({
    reason: z.string().min(1).max(200),
  });

  app.post("/api/habits/:id/streak-miss-reason", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);

      const parsed = missReasonSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "A valid reason is required" });
      }

      const habit = await storage.getHabit(habitId);
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }

      const existingReasons = (habit.missReasons as { reason: string; date: string }[] | null) || [];
      const today = getUserToday(null);
      const updatedReasons = [...existingReasons, { reason: parsed.data.reason, date: today }];

      const updated = await storage.updateHabit(habitId, userId, { missReasons: updatedReasons } as any);
      res.json({ success: true, missReasons: updated?.missReasons });
    } catch (error) {
      console.error("Error saving streak miss reason:", error);
      res.status(500).json({ error: "Failed to save miss reason" });
    }
  });

  app.get("/api/habits/:id/streak-miss-reasons", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);

      const habit = await storage.getHabit(habitId);
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }

      res.json(habit.missReasons || []);
    } catch (error) {
      console.error("Error fetching miss reasons:", error);
      res.status(500).json({ error: "Failed to fetch miss reasons" });
    }
  });

  // Server-side streak break detection endpoints
  app.get("/api/habits/streak-breaks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const dbUser = await storage.getUser(userId);
      const userTz = dbUser?.timezone || "UTC";
      const today = getUserToday(userTz);
      const userHabits = await storage.getHabits(userId);

      for (const habit of userHabits) {
        if (habit.archived || !habit.setupComplete) continue;
        const storedStreak = habit.currentStreak || 0;
        if (storedStreak > 0) {
          const dailyPlans = habit.dailyPlans || [];
          let actualStreak = 0;
          const sorted = [...dailyPlans].sort((a: any, b: any) => b.date.localeCompare(a.date));
          for (const plan of sorted) {
            if (plan.completed) {
              actualStreak++;
            } else if (plan.date <= today) {
              break;
            }
          }
          if (actualStreak === 0 && storedStreak > 0) {
            await storage.updateHabit(habit.id, userId, {
              currentStreak: 0,
              previousStreak: storedStreak,
              streakBrokenAt: today,
              streakBrokenDismissed: false,
            });
            habit.currentStreak = 0;
            habit.previousStreak = storedStreak;
            habit.streakBrokenAt = today;
            habit.streakBrokenDismissed = false;
          }
        }
      }

      const breaks = userHabits
        .filter(h => h.streakBrokenAt && !h.streakBrokenDismissed && !h.archived && h.setupComplete)
        .map(h => ({
          habitId: h.id,
          habitTitle: h.title,
          previousStreak: h.previousStreak || 0,
          brokenAt: h.streakBrokenAt,
        }));
      res.json(breaks);
    } catch (error) {
      console.error("Error fetching streak breaks:", error);
      res.status(500).json({ error: "Failed to fetch streak breaks" });
    }
  });

  app.post("/api/habits/:id/dismiss-streak-break", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);
      const habit = await storage.getHabit(habitId);
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }
      await storage.updateHabit(habitId, userId, { streakBrokenDismissed: true });
      res.json({ success: true });
    } catch (error) {
      console.error("Error dismissing streak break:", error);
      res.status(500).json({ error: "Failed to dismiss streak break" });
    }
  });

  // Habit Stacking/Linking (Premium feature)
  const linkHabitSchema = z.object({
    linkedHabitId: z.number().int().positive(),
  });

  app.post("/api/habits/:id/link", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);

      const parsed = linkHabitSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Valid linkedHabitId is required" });
      }
      const { linkedHabitId } = parsed.data;

      // Check premium subscription
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      const isPremium = user?.isAdmin || (user?.hasPaid && user?.subscriptionTier === 'premium');
      if (!isPremium) {
        return res.status(403).json({ error: "Habit stacking requires a Premium subscription" });
      }

      if (habitId === linkedHabitId) {
        return res.status(400).json({ error: "Cannot link a habit to itself" });
      }

      const userHabits = await storage.getHabits(userId);
      const sourceHabit = userHabits.find(h => h.id === habitId);
      const targetHabit = userHabits.find(h => h.id === linkedHabitId);

      if (!sourceHabit || !targetHabit) {
        return res.status(404).json({ error: "Habit not found" });
      }

      let current = linkedHabitId;
      const visited = new Set<number>([habitId]);
      while (current) {
        if (visited.has(current)) {
          return res.status(400).json({ error: "This would create a circular chain. Try a different habit." });
        }
        visited.add(current);
        const nextHabit = userHabits.find(h => h.id === current);
        current = nextHabit?.linkedHabitId ?? 0;
      }

      await storage.linkHabit(habitId, userId, linkedHabitId);

      res.json({ success: true, habitId, linkedHabitId });
    } catch (error) {
      console.error("Error linking habit:", error);
      res.status(500).json({ error: "Failed to link habit" });
    }
  });

  app.delete("/api/habits/:id/link", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);

      const userHabits = await storage.getHabits(userId);
      const habit = userHabits.find(h => h.id === habitId);
      if (!habit) {
        return res.status(404).json({ error: "Habit not found" });
      }

      await storage.unlinkHabit(habitId, userId);

      res.json({ success: true });
    } catch (error) {
      console.error("Error unlinking habit:", error);
      res.status(500).json({ error: "Failed to unlink habit" });
    }
  });

  // ==========================================
  // HABIT STACKS (Premium feature)
  // ==========================================

  app.get("/api/habit-stacks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const stacks = await storage.getHabitStacks(userId);
      res.json(stacks);
    } catch (error) {
      console.error("Error fetching habit stacks:", error);
      res.status(500).json({ error: "Failed to fetch habit stacks" });
    }
  });

  app.get("/api/habit-stacks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const stackId = Number(req.params.id);
      const stack = await storage.getHabitStack(stackId, userId);
      if (!stack) return res.status(404).json({ error: "Stack not found" });
      res.json(stack);
    } catch (error) {
      console.error("Error fetching habit stack:", error);
      res.status(500).json({ error: "Failed to fetch habit stack" });
    }
  });

  app.post("/api/habit-stacks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      const isPremium = user?.isAdmin || (user?.hasPaid && user?.subscriptionTier === 'premium');
      if (!isPremium) {
        return res.status(403).json({ error: "Habit stacking requires a Premium subscription" });
      }

      const { name, description, habitIds, scheduledTime, icon, color } = req.body;
      if (!name || !habitIds || !Array.isArray(habitIds) || habitIds.length < 2) {
        return res.status(400).json({ error: "A stack needs a name and at least 2 habits" });
      }

      const userHabits = await storage.getHabits(userId);
      const validIds = habitIds.filter((id: number) => userHabits.some(h => h.id === id && !h.archived));
      if (validIds.length < 2) {
        return res.status(400).json({ error: "At least 2 active habits are required" });
      }

      const habitOrder = validIds.map((id: number, index: number) => {
        const habit = userHabits.find(h => h.id === id);
        return { habitId: id, habitTitle: habit?.title || "", order: index };
      });

      const stack = await storage.createHabitStack(userId, {
        name,
        description: description || null,
        habitIds: validIds,
        habitOrder,
        scheduledTime: scheduledTime || null,
        icon: icon || "Layers",
        color: color || "primary",
      });

      res.json(stack);
    } catch (error) {
      console.error("Error creating habit stack:", error);
      res.status(500).json({ error: "Failed to create habit stack" });
    }
  });

  app.patch("/api/habit-stacks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const stackId = Number(req.params.id);
      const existing = await storage.getHabitStack(stackId, userId);
      if (!existing) return res.status(404).json({ error: "Stack not found" });

      const { name, description, habitIds, habitOrder, scheduledTime, icon, color } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (scheduledTime !== undefined) updates.scheduledTime = scheduledTime;
      if (icon !== undefined) updates.icon = icon;
      if (color !== undefined) updates.color = color;
      if (habitIds !== undefined) {
        updates.habitIds = habitIds;
        if (habitOrder) {
          updates.habitOrder = habitOrder;
        } else {
          const userHabits = await storage.getHabits(userId);
          updates.habitOrder = habitIds.map((id: number, index: number) => {
            const habit = userHabits.find(h => h.id === id);
            return { habitId: id, habitTitle: habit?.title || "", order: index };
          });
        }
      }

      const updated = await storage.updateHabitStack(stackId, userId, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating habit stack:", error);
      res.status(500).json({ error: "Failed to update habit stack" });
    }
  });

  app.delete("/api/habit-stacks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const stackId = Number(req.params.id);
      const existing = await storage.getHabitStack(stackId, userId);
      if (!existing) return res.status(404).json({ error: "Stack not found" });

      await storage.deleteHabitStack(stackId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting habit stack:", error);
      res.status(500).json({ error: "Failed to delete habit stack" });
    }
  });

  app.post("/api/habit-stacks/:id/generate-plan", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const stackId = Number(req.params.id);
      const stack = await storage.getHabitStack(stackId, userId);
      if (!stack) return res.status(404).json({ error: "Stack not found" });

      const userHabits = await storage.getHabits(userId);
      const stackHabits = (stack.habitOrder as any[]).map((item: any) => {
        const habit = userHabits.find(h => h.id === item.habitId);
        return habit;
      }).filter(Boolean);

      if (stackHabits.length < 2) {
        return res.status(400).json({ error: "Need at least 2 valid habits in the stack" });
      }

      const habitDescriptions = stackHabits.map((h: any, i: number) =>
        `${i + 1}. "${h.title}" - ${h.description || h.goal || "No description"} (${h.totalTimeSpent || 0} minutes spent so far, streak: ${h.currentStreak || 0} days)`
      ).join("\n");

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: `You are an expert habit coach specializing in habit stacking. 
Generate a structured plan for transitioning smoothly between habits in a stack.
Return valid JSON with this structure:
{
  "overview": "Brief description of why these habits work well together",
  "totalDuration": <estimated total minutes>,
  "transitions": [
    { "fromHabitId": <id>, "toHabitId": <id>, "note": "How to transition smoothly between these habits" }
  ],
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}
SAFETY: Never generate content promoting violence, illegal activities, exploitation, self-harm, or explicit content.`
        }, {
          role: "user",
          content: `Create a habit stacking plan for this stack called "${stack.name}":\n\n${habitDescriptions}\n\nThe user wants to do these habits in sequence. Generate transition advice between each pair of consecutive habits and overall tips.`
        }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const planContent = response.choices[0]?.message?.content;
      if (!planContent) {
        return res.status(500).json({ error: "Failed to generate plan" });
      }

      const plan = JSON.parse(planContent);
      const updated = await storage.updateHabitStack(stackId, userId, { stackPlan: plan });
      res.json(updated);
    } catch (error) {
      console.error("Error generating stack plan:", error);
      res.status(500).json({ error: "Failed to generate stack plan" });
    }
  });

  // Toggle stack plan mode (separate vs unified)
  app.patch("/api/habit-stacks/:id/plan-mode", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const stackId = Number(req.params.id);
      const { planMode } = req.body;
      if (!["separate", "unified"].includes(planMode)) {
        return res.status(400).json({ error: "planMode must be 'separate' or 'unified'" });
      }
      const updated = await storage.updateHabitStack(stackId, userId, { planMode });
      if (!updated) return res.status(404).json({ error: "Stack not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating plan mode:", error);
      res.status(500).json({ error: "Failed to update plan mode" });
    }
  });

  // Generate unified plan for a stack - AI creates one cohesive routine plan
  app.post("/api/habit-stacks/:id/generate-unified-plan", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const stackId = Number(req.params.id);
      const stack = await storage.getHabitStack(stackId, userId);
      if (!stack) return res.status(404).json({ error: "Stack not found" });

      const userHabits = await storage.getHabits(userId);
      const stackHabits = (stack.habitOrder as any[]).map((item: any) => {
        const habit = userHabits.find(h => h.id === item.habitId);
        return habit;
      }).filter(Boolean);

      if (stackHabits.length < 2) {
        return res.status(400).json({ error: "Need at least 2 valid habits in the stack" });
      }

      const habitDescriptions = stackHabits.map((h: any, i: number) => {
        const plan = h.actionPlan as any;
        const todayTasks = plan?.dailyPlans?.[0]?.tasks || [];
        const taskList = todayTasks.map((t: any) => `  - ${t.title} (${t.duration || 5}min)`).join("\n");
        return `${i + 1}. "${h.title}" (habitId: ${h.id}) - ${h.description || h.goal || "No description"}\n   Current tasks:\n${taskList || "   - No tasks yet"}`;
      }).join("\n\n");

      const habitIdMap: Record<string, number> = {};
      stackHabits.forEach((h: any) => {
        habitIdMap[h.title.toLowerCase()] = h.id;
      });

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: `You are an expert behavioral psychologist and habit coach trained in evidence-based behavior design methodology, the 4 Laws of Behavior Change, and the cue-routine-reward habit loop model. Generate a UNIFIED daily routine plan that combines all habits into one deeply guided, coaching-driven flow DESIGNED FOR REAL BEHAVIOR CHANGE.

Your unified routines must apply these behavior science principles:
- HABIT STACKING: Each habit in the sequence should serve as the CUE for the next habit. The completion of one activity naturally triggers the start of the next.
- CUE-ROUTINE-REWARD LOOP: Every micro-step must identify the cue (what triggers it), describe the routine (exact action), and include a reward (acknowledgment, celebration, or intrinsic satisfaction).
- PROGRESSIVE STRUCTURE: Within each habit's micro-steps, start with the easiest/warmup action and build to the most demanding. The first micro-step should always be an "activation" step that's nearly effortless.
- TRANSITION PSYCHOLOGY: Transitions between habits should leverage the psychological momentum from completing one habit to fuel starting the next. Reference the "fresh start effect" and "completion momentum."
- ENVIRONMENT DESIGN: Include specific setup instructions that make each step frictionless — what to prepare, where to position yourself, what to have ready.

Instead of giving one task per habit, break EACH habit into 2-4 actionable micro-steps with specific coaching guidance. Think of yourself as a personal coach walking them through every moment of their routine.

Return valid JSON with this exact structure:
{
  "overview": "Brief description of this unified routine explaining WHY the habits are sequenced in this order (reference habit stacking and momentum principles)",
  "totalDuration": <estimated total minutes>,
  "tasks": [
    {
      "id": "task-1",
      "title": "Specific micro-step title",
      "description": "Detailed coaching instruction — what to do, how to do it, and WHY it matters for habit formation. Include the CUE that triggers this step and the REWARD for completing it. Be specific with techniques, timings, and sensory cues. 2-3 sentences minimum.",
      "duration": <minutes for this specific step>,
      "habitId": <which habit this belongs to>,
      "habitTitle": "Name of the habit",
      "order": 1,
      "steps": [
        {
          "id": "step-1-1",
          "title": "Sub-step name",
          "description": "Granular instruction for this part of the micro-step, including environmental setup",
          "duration": <minutes>,
          "coachingTip": "Expert insight citing specific behavior science — WHY this works, not just what to do"
        }
      ],
      "coachingTip": "Expert coaching insight grounded in behavior science — reference a specific principle (e.g., 'This leverages the positive emotion you feel after a small success — that feeling is what actually wires the habit into your brain')",
      "resources": [
        {
          "name": "Resource Name",
          "type": "article|book|video|course|blog|tool",
          "searchQuery": "specific search terms to find this resource",
          "description": "Why this resource is helpful for this specific step"
        }
      ]
    }
  ],
  "transitions": [
    {
      "fromHabitId": <habit id being completed>,
      "toHabitId": <habit id starting next>,
      "fromHabitTitle": "Habit being completed",
      "toHabitTitle": "Habit starting next",
      "message": "A warm transition message that explains how completing the previous habit naturally leads to the next one (reference habit stacking). E.g., 'You just completed your walk and your body is warm and energized — that physical activation is the perfect cue to transition into your stretching routine. Your muscles are primed and your mind is already in movement mode.'",
      "tip": "Specific behavior science tip about why this transition order works (reference momentum, activation energy, or habit stacking research)"
    }
  ],
  "tips": ["Overall routine tip grounded in science", "Practical tip about maintaining the stack", "Identity-based tip about who they're becoming through this routine"]
}

RULES:
1. Create 2-4 micro-steps per habit, each with 1-3 sub-steps with specific, granular instructions.
2. The FIRST micro-step of each habit should be an "activation" step — nearly effortless, designed to overcome starting friction (the "Starter Step" principle from behavior design).
3. Each task MUST have a "coachingTip" that references specific behavior science, not generic motivation.
4. Include 1-2 resources per task — real educational resources (NOT habit tracking apps). For searchQuery, use descriptive search terms. Do NOT include brand names or specific product names to avoid copyright issues. Use generic descriptions like 'beginner meditation technique guide' or 'morning exercise warm up routine'.
5. Create a "transition" entry for every habit change in the sequence. Transitions must explain the psychological connection between the habits and why this order leverages momentum.
6. Descriptions should read like a coach walking them through each moment: "Now I want you to..." or "Notice how completing X has primed you for..."
7. Sequence tasks so they flow with increasing activation energy — easiest/calmest habits first, building to more demanding ones, with a wind-down at the end.
8. NEVER recommend competing habit tracking apps (Habitica, Streaks, Fabulous, etc.).
9. CRITICAL: Each habit in the input has a specific "habitId" number in parentheses. You MUST use that EXACT habitId number for ALL tasks belonging to that habit. Do NOT make up your own IDs.
SAFETY: Never generate content promoting violence, illegal activities, exploitation, self-harm, or explicit content.`
        }, {
          role: "user",
          content: `Create a deeply guided unified daily routine plan for the stack "${stack.name}" (scheduled: ${stack.scheduledTime || "flexible"}):\n\n${habitDescriptions}\n\nBreak each habit into 2-4 coaching-driven micro-steps with sub-steps, tips, and resources. Create smooth transitions between habits. Make it feel like having a personal coach guiding them through every moment.`
        }],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4000,
      });

      const planContent = response.choices[0]?.message?.content;
      if (!planContent) {
        return res.status(500).json({ error: "Failed to generate plan" });
      }

      const plan = JSON.parse(planContent);
      plan.generatedAt = new Date().toISOString();

      if (!plan.transitions) plan.transitions = [];
      for (const tr of plan.transitions) {
        if (tr.fromHabitId) tr.fromHabitId = Number(tr.fromHabitId);
        if (tr.toHabitId) tr.toHabitId = Number(tr.toHabitId);
      }
      if (!plan.tasks) plan.tasks = [];

      const addUrlToResource = (r: any) => {
        const query = r.searchQuery || r.name || '';
        const type = (r.type || '').toLowerCase();
        let suffix = '';
        if (type === 'video') suffix = ' video';
        else if (type === 'book') suffix = ' book';
        else if (type === 'course') suffix = ' course';
        else if (type === 'podcast') suffix = ' podcast';
        else if (type === 'tool' || type === 'template') suffix = ' free tool';
        const url = `https://www.google.com/search?q=${encodeURIComponent(query + suffix)}`;
        return { ...r, url };
      };

      const validHabitIds = new Set(stackHabits.map((h: any) => h.id));

      for (const task of plan.tasks) {
        if (task.habitId) task.habitId = Number(task.habitId);
        if (!validHabitIds.has(task.habitId) && task.habitTitle) {
          const matchedId = habitIdMap[task.habitTitle.toLowerCase()];
          if (matchedId) {
            task.habitId = matchedId;
          } else {
            const partialMatch = Object.entries(habitIdMap).find(([title]) => 
              task.habitTitle.toLowerCase().includes(title) || title.includes(task.habitTitle.toLowerCase())
            );
            if (partialMatch) task.habitId = partialMatch[1];
          }
        }
        if (!task.steps) task.steps = [];
        if (!task.resources) task.resources = [];

        for (const step of task.steps) {
          if (step.resources && Array.isArray(step.resources)) {
            task.resources.push(...step.resources);
            delete step.resources;
          }
        }

        if (task.resources.length > 0) {
          task.resources = task.resources.map(addUrlToResource);
        }
      }

      for (const tr of plan.transitions) {
        if (tr.fromHabitId && !validHabitIds.has(Number(tr.fromHabitId)) && tr.fromHabitTitle) {
          const matched = habitIdMap[tr.fromHabitTitle.toLowerCase()];
          if (matched) tr.fromHabitId = matched;
        }
        if (tr.toHabitId && !validHabitIds.has(Number(tr.toHabitId)) && tr.toHabitTitle) {
          const matched = habitIdMap[tr.toHabitTitle.toLowerCase()];
          if (matched) tr.toHabitId = matched;
        }
      }
      
      const updated = await storage.updateHabitStack(stackId, userId, { 
        unifiedPlan: plan,
        planMode: "unified"
      });
      res.json(updated);
    } catch (error) {
      console.error("Error generating unified plan:", error);
      res.status(500).json({ error: "Failed to generate unified plan" });
    }
  });

  app.post("/api/habit-stacks/:id/routine-complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const stackId = Number(req.params.id);
      const { date, tasksCompleted, totalTasks, timeSpent, taskBreakdown } = req.body;

      const stack = await storage.getHabitStack(stackId, userId);
      if (!stack) return res.status(404).json({ error: "Stack not found" });

      const habitTimeMap: Record<number, number> = {};
      const habitTaskMap: Record<number, { completed: number; total: number }> = {};

      if (taskBreakdown && Array.isArray(taskBreakdown)) {
        for (const t of taskBreakdown) {
          const hid = Number(t.habitId);
          if (!hid || isNaN(hid)) continue;
          if (!habitTimeMap[hid]) habitTimeMap[hid] = 0;
          if (!habitTaskMap[hid]) habitTaskMap[hid] = { completed: 0, total: 0 };
          habitTimeMap[hid] += Math.max(0, Math.round((t.timeSpent || 0) / 60));
          habitTaskMap[hid].total++;
          if (t.completed) habitTaskMap[hid].completed++;
        }
      }

      for (const habitIdStr of Object.keys(habitTimeMap)) {
        const habitId = Number(habitIdStr);
        const habit = await storage.getHabit(habitId);
        if (!habit || habit.userId !== userId) continue;

        const habitTime = habitTimeMap[habitId] || 0;
        const taskStats = habitTaskMap[habitId] || { completed: 0, total: 0 };
        if (habitTime <= 0 && taskStats.completed <= 0) continue;

        const progress = [...(habit.progress || [])];
        progress.push({
          date,
          tasksCompleted: taskStats.completed,
          totalTasks: taskStats.total,
          timeSpent: Math.max(1, habitTime),
          goalTime: 0,
          notes: `Completed via unified routine: ${stack.name}`,
          mood: "good",
        });

        const dailyPlans = [...(habit.dailyPlans || [])];
        const todayPlan = dailyPlans.find((p: any) => p.date === date);
        if (todayPlan && taskStats.completed > 0) {
          todayPlan.completed = true;
          todayPlan.timeSpent = (todayPlan.timeSpent || 0) + Math.max(1, habitTime);
        }

        let currentStreak = 0;
        const sortedPlans = [...dailyPlans].sort((a: any, b: any) => b.date.localeCompare(a.date));
        for (const plan of sortedPlans) {
          if (plan.completed) {
            currentStreak++;
          } else if (plan.date <= date) {
            break;
          }
        }

        const oldStreak = habit.currentStreak || 0;
        const streakBreakFields: any = {};
        if (oldStreak > 0 && currentStreak === 0) {
          streakBreakFields.previousStreak = oldStreak;
          streakBreakFields.streakBrokenAt = date;
          streakBreakFields.streakBrokenDismissed = false;
        } else if (currentStreak > 0 && habit.streakBrokenAt) {
          streakBreakFields.streakBrokenAt = null;
        }

        const finalStreak = Math.max(oldStreak, currentStreak);
        const newTotalTime = (habit.totalTimeSpent || 0) + Math.max(1, habitTime);
        await storage.updateHabit(habitId, userId, {
          dailyPlans,
          progress,
          totalTimeSpent: newTotalTime,
          currentStreak: finalStreak,
          ...streakBreakFields,
        });
      }

      await storage.updateHabitStack(stackId, userId, {
        lastRoutineCompletedDate: date,
      });

      res.json({ success: true, tasksCompleted, totalTasks, timeSpent });
    } catch (error) {
      console.error("Error completing routine:", error);
      res.status(500).json({ error: "Failed to record routine completion" });
    }
  });

  app.post("/api/habit-stacks/:id/routine-summary", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const stackId = Number(req.params.id);
      const { stackName, tasksCompleted, totalTasks, timeSpent, notes, habits } = req.body;

      const stack = await storage.getHabitStack(stackId, userId);
      if (!stack) return res.status(404).json({ error: "Stack not found" });

      if (!notes || notes.length === 0) {
        return res.json({
          summary: `You completed ${tasksCompleted} of ${totalTasks} tasks in ${timeSpent} minutes across your "${stackName}" routine. Well done!`,
          insights: [],
          encouragement: "Your unified routine is building great momentum across all your habits!"
        });
      }

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const notesText = notes.map((n: { task: string; note: string; habit?: string }, i: number) =>
        `Task ${i + 1} (${n.habit ? n.habit + " - " : ""}${n.task}): ${n.note}`
      ).join('\n');

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: `You are an expert habit coach. The user just completed a unified routine session called "${stackName}" combining these habits: ${habits?.join(", ") || "multiple habits"}.

Session stats:
- Completed ${tasksCompleted} of ${totalTasks} tasks (${totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0}% completion)
- Time spent: ${timeSpent} minutes

Their notes:
${notesText}

Provide a session analysis as JSON:
{
  "summary": "2-3 sentence warm summary referencing their actual routine and what they did",
  "insights": ["2-3 specific observations about how the combined routine went"],
  "encouragement": "A motivating sentence about their routine consistency",
  "performanceTips": ["1-2 tips for improving their routine flow"],
  "nextSteps": ["1-2 concrete next steps"]
}
Focus on how the habits work together as a routine, not individually. Be specific based on their notes.
SAFETY: Never generate harmful, violent, or explicit content.`
        }, {
          role: "user",
          content: `Analyze my routine session for "${stackName}".`
        }],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 800,
      });

      const content = response.choices[0].message.content || "";
      try {
        const parsed = JSON.parse(content);
        return res.json(parsed);
      } catch {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.json(parsed);
        }
      }

      res.json({
        summary: `You completed ${tasksCompleted} of ${totalTasks} guided steps in ${timeSpent} minutes across your "${stackName}" routine. Great work stacking your habits together!`,
        insights: ["Your routine consistency is building strong neural pathways for all your habits simultaneously."],
        encouragement: "Every time you complete your unified routine, you're reinforcing the habit stack as one powerful behavior chain!"
      });
    } catch (error) {
      console.error("Error generating routine summary:", error);
      res.json({
        summary: `You completed your routine. Great work!`,
        insights: [],
        encouragement: "Every routine session builds stronger habits!"
      });
    }
  });

  // Motivational Quote Endpoint - Real quotes from famous people
  const realQuotes = [
    { quote: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
    { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { quote: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { quote: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
    { quote: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Rohn" },
    { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { quote: "Small daily improvements are the key to staggering long-term results.", author: "Robin Sharma" },
    { quote: "You will never change your life until you change something you do daily.", author: "John C. Maxwell" },
    { quote: "First forget inspiration. Habit is more dependable.", author: "Octavia Butler" },
    { quote: "Chains of habit are too light to be felt until they are too heavy to be broken.", author: "Warren Buffett" },
    { quote: "The successful person makes a habit of doing what the failing person doesn't like to do.", author: "Thomas Edison" },
    { quote: "Your net worth to the world is usually determined by what remains after your bad habits are subtracted from your good ones.", author: "Benjamin Franklin" },
    { quote: "Good habits formed at youth make all the difference.", author: "Aristotle" },
    { quote: "Depending on what they are, our habits will either make us or break us.", author: "Sean Covey" },
    { quote: "The chains of habit are generally too small to be felt until they are too strong to be broken.", author: "Samuel Johnson" },
    { quote: "Habit is the intersection of knowledge, skill, and desire.", author: "Stephen Covey" },
    { quote: "Quality is not an act, it is a habit.", author: "Aristotle" },
    { quote: "A nail is driven out by another nail; habit is overcome by habit.", author: "Erasmus" },
    { quote: "The hard must become habit. The habit must become easy. The easy must become beautiful.", author: "Doug Henning" },
    { quote: "Habits change into character.", author: "Ovid" },
    { quote: "In essence, if we want to direct our lives, we must take control of our consistent actions.", author: "Tony Robbins" },
    { quote: "Watch your thoughts, they become your words; watch your words, they become your actions.", author: "Lao Tzu" },
    { quote: "The more you sweat in training, the less you bleed in combat.", author: "Richard Marcinko" },
    { quote: "People do not decide their futures, they decide their habits and their habits decide their futures.", author: "F.M. Alexander" },
    { quote: "Make each day your masterpiece.", author: "John Wooden" },
    { quote: "Be the change you wish to see in the world.", author: "Mahatma Gandhi" },
    { quote: "What you do every day matters more than what you do once in a while.", author: "Gretchen Rubin" },
    { quote: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
    { quote: "The difference between who you are and who you want to be is what you do.", author: "Bill Phillips" },
    { quote: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  ];

  app.get(api.quotes.daily.path, async (req, res) => {
    try {
      // Use date-based selection for consistent daily quote
      const today = new Date();
      const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
      const quoteIndex = dayOfYear % realQuotes.length;
      res.json(realQuotes[quoteIndex]);
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.json(realQuotes[0]);
    }
  });

  // Stripe public key endpoint
  app.get("/api/stripe/config", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error getting Stripe config:", error);
      res.status(500).json({ error: "Failed to get Stripe configuration" });
    }
  });

  // Get all tier pricing from Stripe
  app.get("/api/founding-member-slots", async (req, res) => {
    try {
      const slots = await db.select().from(foundingMemberSlots);
      const result: any = {};
      for (const slot of slots) {
        result[slot.tier] = {
          total: slot.totalSlots,
          used: slot.usedSlots,
          remaining: slot.totalSlots - slot.usedSlots,
          priceYearly: slot.priceYearly,
          active: slot.active,
        };
      }
      res.json(result);
    } catch (error) {
      console.error("Error fetching founding member slots:", error);
      res.status(500).json({ error: "Failed to fetch founding member slots" });
    }
  });

  app.get("/api/stripe/pricing", async (req, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      
      // Get both products
      const products = await stripe.products.list({
        active: true,
        limit: 100,
      });
      
      const proProduct = products.data.find(p => p.name === 'Habit Builder Pro');
      const premiumProduct = products.data.find(p => p.name === 'Habit Builder Premium');
      
      const tiers: any[] = [
        {
          tier: 'free',
          name: 'Free',
          price: 0,
          priceId: null,
          description: 'Get started with basic habit tracking',
          features: [
            '1 habit',
            'First AI action plan',
            '3 guided sessions per week',
            'Habit templates library',
          ],
          limitations: [
            'No AI coaching insights',
            'No streaks & achievements',
            'No plan updates or refresh',
            'No productivity tools',
          ],
        },
      ];
      
      if (proProduct) {
        const proPrices = await stripe.prices.list({
          product: proProduct.id,
          active: true,
        });
        const proPrice = proPrices.data.find(p => p.recurring?.interval === 'month');
        let proAnnualPrice = proPrices.data.find(p => p.recurring?.interval === 'year');
        if (!proAnnualPrice) {
          try {
            proAnnualPrice = await stripe.prices.create({
              product: proProduct.id,
              unit_amount: 4800,
              currency: 'usd',
              recurring: { interval: 'year' },
            });
          } catch (e: any) { console.error("Error creating pro annual price:", e?.message); }
        }
        
        tiers.push({
          tier: 'pro',
          name: 'Pro',
          price: proPrice?.unit_amount || 600,
          priceId: proPrice?.id,
          annualPrice: proAnnualPrice?.unit_amount || 4800,
          annualPriceId: proAnnualPrice?.id || null,
          description: 'AI-powered habit coaching for serious growth',
          features: [
            'Unlimited habits',
            'AI-powered habit coaching',
            'Personalized action plans',
            'Guided sessions with timers',
            'AI session summaries',
            'Progress streaks & achievements',
            'Daily journal',
            'Focus timer (Pomodoro)',
            'Mood tracking & check-ins',
            'Daily challenges',
            'Gamification with XP & levels',
            'Custom icons & colors',
            'Habit templates library',
            'Streak protection',
            'Weekly progress reports',
          ],
          popular: true,
        });
      }
      
      if (premiumProduct) {
        const premiumPrices = await stripe.prices.list({
          product: premiumProduct.id,
          active: true,
        });
        const premiumPrice = premiumPrices.data.find(p => p.recurring?.interval === 'month');
        let premiumAnnualPrice = premiumPrices.data.find(p => p.recurring?.interval === 'year');
        if (!premiumAnnualPrice) {
          try {
            premiumAnnualPrice = await stripe.prices.create({
              product: premiumProduct.id,
              unit_amount: 14000,
              currency: 'usd',
              recurring: { interval: 'year' },
            });
          } catch (e: any) { console.error("Error creating premium annual price:", e?.message); }
        }
        
        tiers.push({
          tier: 'premium',
          name: 'Premium',
          price: premiumPrice?.unit_amount || 1500,
          priceId: premiumPrice?.id,
          annualPrice: premiumAnnualPrice?.unit_amount || 14000,
          annualPriceId: premiumAnnualPrice?.id || null,
          description: 'Maximum support for transformational habits',
          features: [
            'Everything in Pro',
            'AI Coach Chat (150 msgs/month)',
            'Goals & milestones tracking',
            'Smart Daily Planner (AI-powered)',
            'Full Journal AI Analysis (all entries)',
            'Habit stacking & linking',
            'Advanced analytics dashboard',
            'AI-powered insights & correlations',
            'Accountability partner sharing',
            'Community forum & direct messaging',
            'Voice notes during sessions',
            'Unlockable accent colors',
            'CSV data export',
            'Priority support',
          ],
        });
      }
      
      res.json({ tiers });
    } catch (error: any) {
      console.error("Error getting tier pricing:", error?.message || error);
      res.status(500).json({ error: "Failed to get pricing" });
    }
  });

  // Get subscription price from Stripe - with fallback to direct API (legacy endpoint)
  app.get("/api/stripe/lifetime-price", async (req, res) => {
    try {
      // Try database first - look for subscription product (prefer Habit Builder Pro)
      try {
        const result = await db.execute(
          sql`SELECT pr.id as price_id, pr.unit_amount, p.name, p.description,
                     pr.recurring->>'interval' as interval
              FROM stripe.prices pr 
              JOIN stripe.products p ON pr.product = p.id 
              WHERE p.active = true AND pr.active = true 
              AND p.name = 'Habit Builder Pro'
              AND pr.recurring->>'interval' = 'month'
              LIMIT 1`
        );
        
        if (result.rows.length > 0) {
          console.log("Returning subscription price from database");
          return res.json(result.rows[0]);
        }
      } catch (dbError) {
        console.log("Database query failed, falling back to Stripe API:", dbError);
      }
      
      // Fallback: Query Stripe API directly
      console.log("Querying Stripe API directly...");
      const stripe = await getUncachableStripeClient();
      
      // List all active products and find the subscription one
      const products = await stripe.products.list({
        active: true,
        limit: 100,
      });
      
      let subscriptionProduct = products.data.find(
        p => p.name === 'Habit Builder Pro'
      );
      
      // Auto-create the product and price if it doesn't exist (for production)
      if (!subscriptionProduct) {
        console.log("Creating subscription product in Stripe...");
        subscriptionProduct = await stripe.products.create({
          name: 'Habit Builder Pro',
          description: 'AI-powered habit coaching with personalized action plans - Monthly subscription',
        });
        console.log("Created product:", subscriptionProduct.id);
      }
      
      console.log("Found product:", subscriptionProduct.id, subscriptionProduct.name);
      
      // Get active recurring price for this product
      const prices = await stripe.prices.list({
        product: subscriptionProduct.id,
        active: true,
        limit: 10,
      });
      
      // Find the monthly recurring price
      let monthlyPrice = prices.data.find(p => p.recurring?.interval === 'month');
      
      // Auto-create the price if it doesn't exist
      if (!monthlyPrice) {
        console.log("Creating monthly price in Stripe...");
        monthlyPrice = await stripe.prices.create({
          product: subscriptionProduct.id,
          unit_amount: 600, // $6.00
          currency: 'usd',
          recurring: {
            interval: 'month',
          },
        });
        console.log("Created price:", monthlyPrice.id);
      }
      
      console.log("Found price:", monthlyPrice.id, monthlyPrice.unit_amount);
      
      res.json({
        price_id: monthlyPrice.id,
        unit_amount: monthlyPrice.unit_amount,
        name: subscriptionProduct.name,
        description: subscriptionProduct.description,
        interval: 'month',
      });
    } catch (error: any) {
      console.error("Error getting subscription price:", error?.message || error);
      res.status(500).json({ error: "Failed to get pricing. Please try again." });
    }
  });

  // Create checkout session for subscription
  app.post("/api/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const userEmail = req.user!.claims.email;
      const { priceId, tier, billingInterval } = req.body;

      if (!priceId) {
        return res.status(400).json({ error: "Price ID required" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = `https://${PRIMARY_DOMAIN}`;

      if (billingInterval === 'year') {
        const slots = await db.select().from(foundingMemberSlots).where(eq(foundingMemberSlots.tier, tier || 'pro'));
        if (slots.length > 0) {
          const slot = slots[0];
          if (slot.usedSlots >= slot.totalSlots) {
            return res.status(400).json({ error: "No founding member slots remaining for this tier" });
          }
        }
      }

      // Find or create Stripe customer
      let customerId: string | undefined;
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (existingUser?.stripeCustomerId) {
        customerId = existingUser.stripeCustomerId;
      } else if (userEmail) {
        // Create new customer
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: { userId },
        });
        customerId = customer.id;
        
        // Save customer ID to user
        await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId));
      }

      const metadata: any = {
        userId: userId,
        tier: tier || 'pro',
        billingInterval: billingInterval || 'month',
      };
      if (billingInterval === 'year') {
        metadata.isFoundingMember = 'true';
      }

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${baseUrl}/?payment=success&tier=${encodeURIComponent(tier || 'pro')}`,
        cancel_url: `${baseUrl}/?payment=cancelled`,
        customer: customerId,
        allow_promotion_codes: true,
        locale: 'auto',
        metadata,
        subscription_data: {
          metadata,
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.post("/api/apple/validate-receipt", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { receiptData, productId } = req.body;

      console.log("[Apple IAP] Validating receipt for user:", userId, "product:", productId);

      if (!receiptData || !productId) {
        return res.status(400).json({ error: "Receipt data and product ID required" });
      }

      const sharedSecret = process.env.APPLE_SHARED_SECRET || '';
      if (!sharedSecret) {
        console.error("[Apple IAP] APPLE_SHARED_SECRET not configured");
      }

      const receiptPayload = JSON.stringify({
        'receipt-data': receiptData,
        password: sharedSecret,
      });

      let appleResult: any = null;

      const prodResponse = await fetch('https://buy.itunes.apple.com/verifyReceipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: receiptPayload,
      });
      appleResult = await prodResponse.json();
      console.log("[Apple IAP] Production validation status:", appleResult.status);

      if (appleResult.status === 21007) {
        console.log("[Apple IAP] Sandbox receipt detected, retrying with sandbox URL");
        const sandboxResponse = await fetch('https://sandbox.itunes.apple.com/verifyReceipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: receiptPayload,
        });
        appleResult = await sandboxResponse.json();
        console.log("[Apple IAP] Sandbox validation status:", appleResult.status);
      }

      if (appleResult.status === 0) {
        const tier = productId.startsWith('pro') ? 'pro' : 'premium';
        await db.update(users).set({
          subscriptionTier: tier,
          hasPaid: true,
        }).where(eq(users.id, userId));
        paymentStatusCache.delete(userId);

        console.log("[Apple IAP] Receipt valid, updated user", userId, "to tier:", tier);
        return res.json({ success: true, valid: true, tier });
      }

      console.error("[Apple IAP] Receipt validation failed with status:", appleResult.status);
      return res.status(400).json({ error: "Invalid receipt", appleStatus: appleResult.status });
    } catch (error) {
      console.error("[Apple IAP] Receipt validation error:", error);
      res.status(500).json({ error: "Failed to validate receipt" });
    }
  });

  // Create customer portal session for subscription management
  app.post("/api/stripe/customer-portal", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const authEmail = req.user!.claims.email;
      const stripe = await getUncachableStripeClient();
      const baseUrl = `https://${PRIMARY_DOMAIN}`;

      // Get user's Stripe customer ID
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(400).json({ error: "No subscription found" });
      }

      let resolvedCustomerId = await resolveStripeCustomerId(stripe, user, true);
      if (!resolvedCustomerId && authEmail) {
        try {
          const customers = await stripe.customers.list({ email: authEmail, limit: 10 });
          for (const customer of customers.data) {
            try {
              const subs = await stripe.subscriptions.list({ customer: customer.id, limit: 1 });
              if (subs.data.length > 0) {
                resolvedCustomerId = customer.id;
                await db.update(users).set({ stripeCustomerId: resolvedCustomerId, email: authEmail }).where(eq(users.id, user.id));
                break;
              }
            } catch (e: any) { /* skip */ }
          }
          if (!resolvedCustomerId && customers.data.length > 0) {
            resolvedCustomerId = customers.data[0].id;
            await db.update(users).set({ stripeCustomerId: resolvedCustomerId, email: authEmail }).where(eq(users.id, user.id));
          }
        } catch (e: any) { console.error("Fallback email lookup:", e?.message); }
      }
      if (!resolvedCustomerId) {
        return res.status(400).json({ error: "No subscription found" });
      }

      // Try to configure portal with cancellation/switching, fall back to default
      let configId: string | undefined;
      try {
        const products = await stripe.products.list({ active: true, limit: 10 });
        const proProduct = products.data.find((p: any) => p.name === 'Habit Builder Pro');
        const premiumProduct = products.data.find((p: any) => p.name === 'Habit Builder Premium');
        
        const switchProducts: any[] = [];
        if (proProduct) {
          const proPrices = await stripe.prices.list({ product: proProduct.id, active: true });
          const proMonthly = proPrices.data.find((p: any) => p.recurring?.interval === 'month');
          if (proMonthly) switchProducts.push({ product: proProduct.id, prices: [proMonthly.id] });
        }
        if (premiumProduct) {
          const premiumPrices = await stripe.prices.list({ product: premiumProduct.id, active: true });
          const premiumMonthly = premiumPrices.data.find((p: any) => p.recurring?.interval === 'month');
          if (premiumMonthly) switchProducts.push({ product: premiumProduct.id, prices: [premiumMonthly.id] });
        }
        
        const portalFeatures: any = {
          subscription_cancel: {
            enabled: true,
            mode: 'at_period_end',
            cancellation_reason: {
              enabled: true,
              options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'other'],
            },
          },
          payment_method_update: { enabled: true },
          invoice_history: { list: true },
        };
        
        if (switchProducts.length > 1) {
          portalFeatures.subscription_update = {
            enabled: true,
            default_allowed_updates: ['price'],
            proration_behavior: 'create_prorations',
            products: switchProducts,
          };
        }

        // Try to find and update existing config, or create a new one
        const existingConfigs = await stripe.billingPortal.configurations.list({ limit: 5 });
        const defaultConfig = existingConfigs.data.find((c: any) => c.is_default);
        
        if (defaultConfig) {
          const updated = await stripe.billingPortal.configurations.update(defaultConfig.id, {
            features: portalFeatures,
          });
          configId = updated.id;
        } else {
          const config = await stripe.billingPortal.configurations.create({
            business_profile: {
              headline: 'Manage your Habit Builder subscription',
            },
            features: portalFeatures,
          });
          configId = config.id;
        }
      } catch (configError: any) {
        console.error("Portal config setup error (falling back to default):", configError?.message || configError);
      }

      // Create portal session (with or without custom config)
      const sessionParams: any = {
        customer: resolvedCustomerId,
        return_url: `${baseUrl}/account`,
      };
      if (configId) {
        sessionParams.configuration = configId;
      }

      const session = await stripe.billingPortal.sessions.create(sessionParams);
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Customer portal error:", error?.message || error);
      res.status(500).json({ error: "Failed to open subscription management" });
    }
  });

  // Sync subscription status from Stripe - called when user accesses account
  app.post("/api/sync-subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const userEmail = req.user!.claims.email;

      const stripe = await getUncachableStripeClient();

      // Get user from database
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // If already showing paid, no need to sync
      if (user.hasPaid && user.subscriptionTier && user.subscriptionTier !== 'free') {
        return res.json({ synced: false, message: "Already synced", tier: user.subscriptionTier });
      }

      // Find customer by email or stripeCustomerId
      let customerId = user.stripeCustomerId;
      
      if (!customerId && userEmail) {
        // Search for customer by email
        const customers = await stripe.customers.list({
          email: userEmail,
          limit: 1,
        });
        
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
          // Save customer ID to user
          await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId));
        }
      }

      if (!customerId) {
        return res.json({ synced: false, message: "No Stripe customer found" });
      }

      // Get active subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 10,
      });

      if (subscriptions.data.length === 0) {
        // Check for trialing subscriptions too
        const trialingSubscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: 'trialing',
          limit: 10,
        });
        
        if (trialingSubscriptions.data.length === 0) {
          return res.json({ synced: false, message: "No active subscription found" });
        }
        
        subscriptions.data.push(...trialingSubscriptions.data);
      }

      // Determine tier from subscription
      const subscription = subscriptions.data[0];
      let tier = 'pro'; // default
      
      // Check subscription metadata or price to determine tier
      if (subscription.metadata?.tier) {
        tier = subscription.metadata.tier;
      } else if (subscription.items?.data[0]?.price) {
        const priceAmount = subscription.items.data[0].price.unit_amount || 0;
        // Premium is $15/month = 1500 cents, Pro is $6/month = 600 cents
        if (priceAmount >= 1500) {
          tier = 'premium';
        }
      }

      // Update user with subscription status
      await db.update(users).set({
        hasPaid: true,
        subscriptionTier: tier as 'free' | 'pro' | 'premium',
        subscriptionStatus: subscription.status,
        subscriptionId: subscription.id,
      }).where(eq(users.id, userId));
      paymentStatusCache.delete(userId);

      const restoredHabits = await db.update(habits)
        .set({ archived: false, downgradeArchived: false })
        .where(and(eq(habits.userId, userId), eq(habits.downgradeArchived, true)))
        .returning({ id: habits.id });

      if (restoredHabits.length > 0) {
        console.log(`Restored ${restoredHabits.length} downgrade-archived habits for user ${userEmail}`);
      }

      console.log(`Synced subscription for user ${userEmail}: tier=${tier}, status=${subscription.status}`);
      
      res.json({ 
        synced: true, 
        tier, 
        status: subscription.status,
        habitsRestored: restoredHabits.length,
        message: "Subscription synced from Stripe" 
      });
    } catch (error: any) {
      console.error("Subscription sync error:", error?.message || error);
      res.status(500).json({ error: "Failed to sync subscription" });
    }
  });

  // Get detailed subscription info from Stripe
  app.get("/api/subscription/details", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const authEmail = req.user!.claims.email;
      const stripe = await getUncachableStripeClient();

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.json({ hasSubscription: false });
      }

      // Use verifyHasSubscription=true so if stored customer has no subs, we re-resolve
      let stripeCustomerId = await resolveStripeCustomerId(stripe, user, true);
      
      // Fallback: try auth claims email if DB email didn't find a customer
      if (!stripeCustomerId && authEmail) {
        try {
          const customers = await stripe.customers.list({ email: authEmail, limit: 10 });
          // Find the customer with an active subscription
          for (const customer of customers.data) {
            try {
              const subs = await stripe.subscriptions.list({ customer: customer.id, limit: 1 });
              if (subs.data.length > 0) {
                stripeCustomerId = customer.id;
                await db.update(users).set({ stripeCustomerId, email: authEmail }).where(eq(users.id, user.id));
                console.log(`Auth email fallback: resolved customer ${customer.id} for user ${user.id}`);
                break;
              }
            } catch (e: any) { /* skip */ }
          }
          // If no customer with sub found, use first customer
          if (!stripeCustomerId && customers.data.length > 0) {
            stripeCustomerId = customers.data[0].id;
            await db.update(users).set({ stripeCustomerId, email: authEmail }).where(eq(users.id, user.id));
          }
        } catch (e: any) {
          console.error("Fallback email lookup error:", e?.message);
        }
      }

      if (!stripeCustomerId) {
        return res.json({ hasSubscription: false });
      }

      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        limit: 5,
        expand: ['data.items.data.price.product'],
      });

      const activeSub = subscriptions.data.find(
        (s: any) => s.status === 'active' || s.status === 'trialing'
      );

      if (!activeSub) {
        return res.json({ hasSubscription: false });
      }

      const item = activeSub.items.data[0];
      const price = item?.price;
      const product = price?.product as any;
      const amount = price?.unit_amount || 0;

      let currentTier = 'pro';
      if (amount >= 1500) currentTier = 'premium';
      if (product?.name?.toLowerCase().includes('premium')) currentTier = 'premium';

      const interval = price?.recurring?.interval || user.billingInterval || 'month';
      
      res.json({
        hasSubscription: true,
        subscriptionId: activeSub.id,
        status: activeSub.status,
        cancelAtPeriodEnd: activeSub.cancel_at_period_end,
        currentPeriodEnd: (activeSub as any).current_period_end,
        currentTier,
        priceId: price?.id,
        amount,
        interval,
        isFoundingMember: user.isFoundingMember || false,
        productName: product?.name || (currentTier === 'premium' ? 'Premium' : 'Pro'),
      });
    } catch (error: any) {
      console.error("Subscription details error:", error?.message || error);
      res.status(500).json({ error: "Failed to fetch subscription details" });
    }
  });

  app.get("/api/subscription/renewal-warning", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const stripe = await getUncachableStripeClient();

      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user || !user.stripeCustomerId) {
        return res.json({ showWarning: false });
      }

      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        limit: 5,
      });

      const activeSub = subscriptions.data.find(
        (s: any) => s.status === 'active' || s.status === 'trialing'
      );

      if (!activeSub) {
        return res.json({ showWarning: false });
      }

      const periodEnd = (activeSub as any).current_period_end;
      const now = Math.floor(Date.now() / 1000);
      const daysRemaining = Math.ceil((periodEnd - now) / 86400);
      const interval = activeSub.items.data[0]?.price?.recurring?.interval || user.billingInterval || 'month';
      const warningThreshold = interval === 'year' ? 30 : 7;

      res.json({
        showWarning: daysRemaining <= warningThreshold && !activeSub.cancel_at_period_end,
        daysRemaining,
        renewalDate: new Date(periodEnd * 1000).toISOString(),
        interval,
        isFoundingMember: user.isFoundingMember || false,
        amount: activeSub.items.data[0]?.price?.unit_amount || 0,
      });
    } catch (error: any) {
      console.error("Renewal warning error:", error?.message || error);
      res.json({ showWarning: false });
    }
  });

  // Helper to resolve a user's Stripe customer ID - searches by subscription ID or email if not stored
  // When multiple customers share an email, picks the one with an active subscription
  const resolveStripeCustomerId = async (stripe: any, user: any, verifyHasSubscription = false): Promise<string | null> => {
    // If we have a stored customer ID, optionally verify it has a subscription
    if (user.stripeCustomerId) {
      if (!verifyHasSubscription) return user.stripeCustomerId;
      // Verify this customer actually has an active subscription
      try {
        const subs = await stripe.subscriptions.list({ customer: user.stripeCustomerId, limit: 1 });
        if (subs.data.length > 0) return user.stripeCustomerId;
        // Stored customer has NO subscriptions - clear it and re-resolve below
        console.log(`Stored customer ${user.stripeCustomerId} has no subs, re-resolving for user ${user.id}`);
        await db.update(users).set({ stripeCustomerId: null }).where(eq(users.id, user.id));
      } catch (e: any) {
        console.error("Error verifying stored customer:", e?.message);
        return user.stripeCustomerId; // On error, still use stored ID
      }
    }

    try {
      // Method 1: Look up via stored subscription ID
      if (user.subscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(user.subscriptionId);
          if (sub?.customer) {
            const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
            await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, user.id));
            return customerId;
          }
        } catch (subErr: any) {
          console.error("Error looking up subscription:", subErr?.message);
        }
      }

      // Method 2: Search by email - find the customer that actually has an active subscription
      const userEmail = user.email;
      if (userEmail) {
        const customers = await stripe.customers.list({
          email: userEmail,
          limit: 10,
        });

        if (customers.data.length > 0) {
          // Check each customer for an active subscription, prefer that one
          for (const customer of customers.data) {
            try {
              const subs = await stripe.subscriptions.list({
                customer: customer.id,
                status: 'active',
                limit: 1,
              });
              if (subs.data.length > 0) {
                await db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, user.id));
                console.log(`Resolved Stripe customer ${customer.id} (has active sub) for user ${user.id}`);
                return customer.id;
              }
              // Also check trialing
              const trialSubs = await stripe.subscriptions.list({
                customer: customer.id,
                status: 'trialing',
                limit: 1,
              });
              if (trialSubs.data.length > 0) {
                await db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, user.id));
                console.log(`Resolved Stripe customer ${customer.id} (has trialing sub) for user ${user.id}`);
                return customer.id;
              }
            } catch (subCheckErr: any) {
              console.error(`Error checking subs for customer ${customer.id}:`, subCheckErr?.message);
            }
          }
          // No customer with active sub found - fall back to first customer
          const customerId = customers.data[0].id;
          await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, user.id));
          return customerId;
        }
      }
    } catch (err: any) {
      console.error("Error resolving Stripe customer:", err?.message || err);
    }

    return null;
  };

  // Helper to find user's active subscription from Stripe
  const findUserSubscription = async (stripe: any, stripeCustomerId: string) => {
    const activeSubscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
      limit: 5,
    });
    if (activeSubscriptions.data.length > 0) return activeSubscriptions.data[0];

    const trialingSubscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'trialing',
      limit: 5,
    });
    if (trialingSubscriptions.data.length > 0) return trialingSubscriptions.data[0];

    return null;
  };

  // Cancel subscription at period end
  app.post("/api/subscription/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const authEmail = req.user!.claims.email;
      const stripe = await getUncachableStripeClient();

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(400).json({ error: "No subscription found" });
      }

      let stripeCustomerId = await resolveStripeCustomerId(stripe, user);
      if (!stripeCustomerId && authEmail && authEmail !== user.email) {
        try {
          const customers = await stripe.customers.list({ email: authEmail, limit: 5 });
          if (customers.data.length > 0) {
            stripeCustomerId = customers.data[0].id;
            await db.update(users).set({ stripeCustomerId, email: authEmail }).where(eq(users.id, user.id));
          }
        } catch (e: any) { console.error("Fallback email lookup:", e?.message); }
      }
      if (!stripeCustomerId) {
        return res.status(400).json({ error: "No subscription found" });
      }

      const subscription = await findUserSubscription(stripe, stripeCustomerId);
      if (!subscription) {
        return res.status(400).json({ error: "No active subscription found" });
      }

      await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      });

      await db.update(users).set({
        subscriptionStatus: 'cancelling',
      }).where(eq(users.id, userId));

      res.json({ success: true, message: "Subscription will be cancelled at the end of the billing period" });
    } catch (error: any) {
      console.error("Cancel subscription error:", error?.message || error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  // Reactivate a subscription that was set to cancel at period end
  app.post("/api/subscription/reactivate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const authEmail = req.user!.claims.email;
      const stripe = await getUncachableStripeClient();

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(400).json({ error: "No subscription found" });
      }

      let stripeCustomerId = await resolveStripeCustomerId(stripe, user);
      if (!stripeCustomerId && authEmail && authEmail !== user.email) {
        try {
          const customers = await stripe.customers.list({ email: authEmail, limit: 5 });
          if (customers.data.length > 0) {
            stripeCustomerId = customers.data[0].id;
            await db.update(users).set({ stripeCustomerId, email: authEmail }).where(eq(users.id, user.id));
          }
        } catch (e: any) { console.error("Fallback email lookup:", e?.message); }
      }
      if (!stripeCustomerId) {
        return res.status(400).json({ error: "No subscription found" });
      }

      const subscription = await findUserSubscription(stripe, stripeCustomerId);
      if (!subscription) {
        return res.status(400).json({ error: "No active subscription found" });
      }

      await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: false,
      });

      await db.update(users).set({
        subscriptionStatus: 'active',
      }).where(eq(users.id, userId));

      res.json({ success: true, message: "Subscription reactivated" });
    } catch (error: any) {
      console.error("Reactivate subscription error:", error?.message || error);
      res.status(500).json({ error: "Failed to reactivate subscription" });
    }
  });

  // Change subscription plan (switch between Pro and Premium)
  app.post("/api/subscription/change-plan", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const authEmail = req.user!.claims.email;
      const { targetTier } = req.body;

      if (!targetTier || !['pro', 'premium'].includes(targetTier)) {
        return res.status(400).json({ error: "Invalid target plan" });
      }

      const stripe = await getUncachableStripeClient();

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(400).json({ error: "No subscription found" });
      }

      let stripeCustomerId = await resolveStripeCustomerId(stripe, user);
      if (!stripeCustomerId && authEmail && authEmail !== user.email) {
        try {
          const customers = await stripe.customers.list({ email: authEmail, limit: 5 });
          if (customers.data.length > 0) {
            stripeCustomerId = customers.data[0].id;
            await db.update(users).set({ stripeCustomerId, email: authEmail }).where(eq(users.id, user.id));
          }
        } catch (e: any) { console.error("Fallback email lookup:", e?.message); }
      }
      if (!stripeCustomerId) {
        return res.status(400).json({ error: "No subscription found" });
      }

      const subscription = await findUserSubscription(stripe, stripeCustomerId);
      if (!subscription) {
        return res.status(400).json({ error: "No active subscription found" });
      }

      const currentItem = subscription.items.data[0];

      const targetProductName = targetTier === 'premium' ? 'Habit Builder Premium' : 'Habit Builder Pro';
      const products = await stripe.products.list({ active: true, limit: 20 });
      const targetProduct = products.data.find((p: any) => p.name === targetProductName);

      if (!targetProduct) {
        return res.status(400).json({ error: `${targetProductName} plan not found` });
      }

      const prices = await stripe.prices.list({ product: targetProduct.id, active: true });
      const monthlyPrice = prices.data.find((p: any) => p.recurring?.interval === 'month');

      if (!monthlyPrice) {
        return res.status(400).json({ error: "Monthly price not found for target plan" });
      }

      await stripe.subscriptions.update(subscription.id, {
        items: [{
          id: currentItem.id,
          price: monthlyPrice.id,
        }],
        proration_behavior: 'create_prorations',
        cancel_at_period_end: false,
      });

      const newTier = targetTier as 'pro' | 'premium';
      await db.update(users).set({
        subscriptionTier: newTier,
        subscriptionStatus: 'active',
      }).where(eq(users.id, userId));

      res.json({ success: true, message: `Plan changed to ${targetTier}`, newTier });
    } catch (error: any) {
      console.error("Change plan error:", error?.message || error);
      res.status(500).json({ error: "Failed to change plan" });
    }
  });

  // AI-generated habit plan with steps and tips
  app.post("/api/ai/generate-plan", isAuthenticated, async (req: any, res) => {
    try {
      const { habitTitle, habitDescription, goal } = req.body;

      const prompt = `Create a behavior-science-backed action plan for building the habit: "${habitTitle}"
${habitDescription ? `Description: ${habitDescription}` : ''}
${goal ? `Goal: ${goal}` : ''}

Apply proven behavior change principles to create a plan that will actually stick:

Return a JSON object with:
1. "steps": An array of 5-7 steps that follow a behavior change progression. Each step should have:
   - "id": A unique string ID (use step-1, step-2, etc.)
   - "text": A clear, reflective prompt using behavior science. Structure as:
     - Steps 1-2: FOUNDATION — Identify the cue/trigger and design the environment (e.g., "What existing daily habit can you stack this onto? Think about something you already do every day without fail.")
     - Steps 3-4: ROUTINE DESIGN — Define the tiny version and build the habit loop (e.g., "What is the absolute smallest version of this habit you could do in under 2 minutes? This is your starting point.")
     - Steps 5-6: OBSTACLE PLANNING — Anticipate barriers and create contingency plans (e.g., "What situation is most likely to make you skip this habit? Create an if-then plan for that moment.")
     - Step 7: IDENTITY & SUSTAINABILITY — Connect to long-term identity (e.g., "What kind of person are you becoming by building this habit? Write down one identity statement.")
   - "completed": false
   - "explored": false
   - "options": [] (empty array)
   - "customResponse": ""

2. "tips": An array of 4 helpful tips backed by specific behavior science. Each tip should have:
   - "id": A unique string ID (use tip-1, tip-2, etc.)
   - "text": A practical tip grounded in real research
   - "category": One of "motivation", "technique", "science", or "reminder"

IMPORTANT: Make steps interactive and deeply reflective — they should help the user understand WHY habits work, not just WHAT to do. Each step builds on the previous one.
Make the tips specific and cite the underlying principle (e.g., "Research shows it takes an average of 66 days to form a habit, not 21 as commonly believed").
Be specific and practical. Never mention specific third-party apps, brands, or services by name.`;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a behavioral psychologist and expert habit coach trained in evidence-based behavior design methodology, the 4 Laws of Behavior Change, and the cue-routine-reward habit loop model. Your plans are rooted in real behavior science — every step serves a specific psychological purpose in the habit formation process. You help users understand not just WHAT to do, but WHY it works. Always return valid JSON. IMPORTANT: Never mention specific third-party apps, brands, services, or competitors by name. Use generic descriptions instead. SAFETY: Do not generate content promoting violence, illegal activities, exploitation, self-harm, or explicit content.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content from AI");

      const planData = JSON.parse(content);
      res.json(planData);
    } catch (error) {
      console.error("Error generating habit plan:", error);
      res.status(500).json({ error: "Failed to generate habit plan" });
    }
  });

  // AI-generated options for exploring a specific step
  app.post("/api/ai/generate-step-options", isAuthenticated, async (req: any, res) => {
    try {
      const { habitTitle, stepText, stepId } = req.body;

      const prompt = `You are helping someone build the habit: "${habitTitle}"

They need to complete this specific action step:
"${stepText}"

Generate 6-8 UNIQUE options that are DIRECTLY RELEVANT to this exact step. Each option must:
1. Be a specific, actionable answer to this particular step
2. Be concrete and practical (not vague or generic)
3. Help the user reflect on and complete THIS step

CRITICAL: Your options must be tailored specifically to "${stepText}" - do NOT generate generic habit options.

Return a JSON object with:
{
  "options": [
    { "id": "opt-1", "text": "A specific, actionable option for this exact step", "selected": false },
    { "id": "opt-2", "text": "Another specific option", "selected": false },
    ...
  ]
}

Be creative and diverse. Cover different angles and approaches to completing "${stepText}".`;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful habit coach. Generate specific, relatable options that help users reflect on their habits. Always return valid JSON. Never mention specific third-party apps, brands, or services by name.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content from AI");

      const optionsData = JSON.parse(content);
      res.json({ stepId, ...optionsData });
    } catch (error) {
      console.error("Error generating step options:", error);
      res.status(500).json({ error: "Failed to generate step options" });
    }
  });

  // Generate habit-specific interview questions
  app.post("/api/habits/:id/generate-questions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);
      const habit = await storage.getHabit(habitId);
      
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }

      const safetyCheck = checkContentSafety(habit.title, habit.description, habit.goal);
      if (!safetyCheck.allowed) {
        return res.status(400).json({ error: safetyCheck.message, safetyFlag: safetyCheck.reason });
      }

      const prompt = `You are a behavioral psychologist and expert habit coach conducting a deep intake interview. Your goal is to gather enough personal, specific detail to build a truly customized action plan that will actually change the user's behavior patterns.

The user wants to build this habit: "${habit.title}"
${habit.description ? `Additional context: ${habit.description}` : ''}
${habit.goal ? `Their goal: ${habit.goal}` : ''}

Generate exactly 5 deeply personal, specific questions. Each question must:
- Be directly tied to "${habit.title}" (never generic)
- Request SPECIFIC details (exact times, places, durations, quantities, past experiences)
- Draw on proven behavior change techniques (habit stacking, implementation intentions, identity-based habits, environment design, temptation bundling)

The 5 questions MUST cover these areas in this order:
1. CURRENT REALITY & HISTORY: Ask about their specific past attempts, what exactly happened, how far they got, and what specifically caused them to stop. Get real details, not vague answers.
2. IDENTITY & DEEP WHY: Ask what kind of person they want to become through this habit — probe the emotional reason behind the goal. What will their life look like in 6 months if they succeed vs. if they don't?
3. DAILY ROUTINE & ENVIRONMENT: Ask them to walk you through their exact daily schedule so you can find the precise moment and physical location to anchor this habit. Ask about existing habits they already do consistently (for habit stacking).
4. OBSTACLES & TRIGGERS: Ask about their specific weak moments — when do they skip things, what situations tempt them to give up, what emotions or circumstances derail them? Ask about their environment and what cues currently work against this habit.
5. CAPACITY & COMMITMENT: Ask about the absolute minimum version of this habit they could do even on their worst day (the "2-minute version"). Ask how much time they can realistically dedicate daily and what they're willing to sacrifice or rearrange to make this work.

Each question should feel like it's coming from a coach who genuinely cares and wants to understand THIS specific person — warm but probing. Use conversational language. Ask follow-up-style questions (e.g., "...and when that happened, what did you do next?").

Return JSON:
{
  "questions": [
    { "id": "q1", "question": "Your detailed question here", "answer": "" },
    { "id": "q2", "question": "Your detailed question here", "answer": "" },
    { "id": "q3", "question": "Your detailed question here", "answer": "" },
    { "id": "q4", "question": "Your detailed question here", "answer": "" },
    { "id": "q5", "question": "Your detailed question here", "answer": "" }
  ]
}`;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a behavioral psychologist and expert habit coach trained in evidence-based behavior design, the 4 Laws of Behavior Change, and the cue-routine-reward habit loop model. Your intake interviews are deeply personal and specific — you never ask generic questions. You probe for exact details about the person's life, routine, past failures, emotional drivers, and environment so you can build a plan rooted in proven behavior change science. Always return valid JSON. Never mention specific third-party apps, brands, or services by name. SAFETY: Do not generate content that promotes violence, illegal activities, exploitation of minors, self-harm, or explicit sexual content. If a habit request seems harmful, respond with questions that redirect toward positive, healthy alternatives.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content from AI");

      const data = JSON.parse(content);
      res.json(data);
    } catch (error) {
      console.error("Error generating questions:", error);
      res.status(500).json({ error: "Failed to generate questions" });
    }
  });

  async function buildMoodJournalContext(userId: string): Promise<string> {
    try {
      const user = await storage.getUser(userId);
      const tier = user?.subscriptionTier;
      const isAdmin = user?.isAdmin === true;
      const isPro = tier === 'pro' || tier === 'premium' || isAdmin;
      const isPremium = tier === 'premium' || isAdmin;

      if (!isPro) return "";

      const moodCount = isPremium ? 7 : 5;
      const recentMoods = await db.select().from(moodEntries)
        .where(eq(moodEntries.userId, userId))
        .orderBy(desc(moodEntries.createdAt))
        .limit(moodCount);

      let contextParts: string[] = [];

      if (recentMoods.length > 0) {
        const moodSummaries = recentMoods.map(m => {
          let parts = [`${m.date}: mood=${m.mood}`];
          if (m.energy != null) parts.push(`energy=${m.energy}/5`);
          if (m.stress != null) parts.push(`stress=${m.stress}/5`);
          if (m.sleep != null) parts.push(`sleep=${m.sleep}/5`);
          return parts.join(", ");
        });

        const energyValues = recentMoods.filter(m => m.energy != null).map(m => m.energy!);
        const stressValues = recentMoods.filter(m => m.stress != null).map(m => m.stress!);
        const avgEnergy = energyValues.length > 0 ? (energyValues.reduce((a, b) => a + b, 0) / energyValues.length).toFixed(1) : null;
        const avgStress = stressValues.length > 0 ? (stressValues.reduce((a, b) => a + b, 0) / stressValues.length).toFixed(1) : null;

        contextParts.push(`\n\nRecent Mood Data (last ${recentMoods.length} entries):\n${moodSummaries.join("\n")}`);
        if (avgEnergy || avgStress) {
          contextParts.push(`Averages: ${avgEnergy ? `energy=${avgEnergy}/5` : ""}${avgEnergy && avgStress ? ", " : ""}${avgStress ? `stress=${avgStress}/5` : ""}`);
        }
      }

      if (isPremium) {
        const recentJournals = await db.select().from(journalEntries)
          .where(eq(journalEntries.userId, userId))
          .orderBy(desc(journalEntries.createdAt))
          .limit(5);

        if (recentJournals.length > 0) {
          const journalSummaries = recentJournals.map(j => {
            const truncated = j.content.length > 100 ? j.content.substring(0, 100) + "..." : j.content;
            return `${j.date}: ${truncated}`;
          });
          contextParts.push(`\nRecent Journal Themes (last ${recentJournals.length} entries):\n${journalSummaries.join("\n")}`);
        }
      }

      if (contextParts.length > 0) {
        return "\n\nUser's recent wellbeing context (use this to tailor the plan to their current state):" + contextParts.join("\n");
      }
      return "";
    } catch (error) {
      console.error("Error building mood/journal context:", error);
      return "";
    }
  }

  // Generate personalized action plan based on questionnaire answers
  app.post("/api/habits/:id/generate-plan", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);
      const { duration, questions } = req.body;
      
      const habit = await storage.getHabit(habitId);
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }

      const safetyCheck = checkContentSafety(habit.title, habit.description, habit.goal);
      if (!safetyCheck.allowed) {
        return res.status(400).json({ error: safetyCheck.message, safetyFlag: safetyCheck.reason });
      }

      // Calculate date range
      const startDate = new Date();
      const daysCount = duration === "daily" ? 1 : duration === "weekly" ? 7 : 30;
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + daysCount - 1);

      const moodJournalContext = await buildMoodJournalContext(userId);

      // Build context from questionnaire
      const contextSummary = questions
        .filter((q: any) => q.answer)
        .map((q: any) => `Q: ${q.question}\nA: ${q.answer}`)
        .join("\n\n") + moodJournalContext;

      let fixedDailyPlans: any[];

      if (duration === "monthly") {
        const weekPrompt = `Create a science-backed 4-week behavior change plan for: "${habit.title}"

User's interview answers:
${contextSummary}

You are applying proven behavior change science. Design exactly 4 weeks following this progression model:

WEEK 1 — FOUNDATION (Micro-Habits + Environment Design)
Theme should reflect "Building the Trigger" or similar.
Focus: Establish the cue-routine-reward loop with the SMALLEST possible version of the habit (the micro-habits method from behavioral research). The user should feel like they CANNOT fail.
Tasks must:
- Identify and set up a specific CUE (time, location, or existing habit to stack onto)
- Practice the "2-minute version" of the habit — absurdly easy, just to build the neural pathway
- Design their physical environment to make the habit obvious and frictionless
- Include a celebration/reward ritual after each completion (even a fist pump or mental "I'm the kind of person who...")

WEEK 2 — CONSISTENCY (Implementation Intentions + Identity)
Theme should reflect "Locking In the Routine" or similar.
Focus: Solidify the habit loop so it becomes automatic. Begin connecting the habit to the user's identity.
Tasks must:
- Use "implementation intentions" format: "When [situation], I will [behavior] at [location]"
- Slightly increase duration or intensity (but still very manageable — no more than 50% increase from Week 1)
- Add a tracking/reflection element so the user sees their streak building
- Include identity reinforcement: "You're becoming someone who [does this habit]"

WEEK 3 — GROWTH (Progressive Overload + Obstacle Planning)
Theme should reflect "Stretching Your Capacity" or similar.
Focus: Increase difficulty toward the target behavior. Proactively address obstacles.
Tasks must:
- Scale the habit to ~75% of the user's target level
- Include "if-then" contingency plans for common obstacles (e.g., "If I miss a day, I will [minimum fallback]")
- Add variety or depth to prevent boredom
- Introduce accountability or social elements where applicable

WEEK 4 — AUTONOMY (Full Routine + Long-term Maintenance)
Theme should reflect "Owning Your New Identity" or similar.
Focus: The habit at full target intensity. Build systems for long-term sustainability.
Tasks must:
- Practice the habit at full target duration/intensity
- Create a "never miss twice" recovery protocol
- Reflect on identity shift: "I am now someone who..."
- Plan for maintaining the habit after the structured plan ends

Also recommend a schedule based on the user's answers — which days of the week to practice and the best time of day (in HH:mm 24-hour format). Use their daily routine, available time, and habits they mentioned to pick the optimal days and time.

Return JSON:
{
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "Week theme (e.g., 'Building the Trigger')",
      "behaviorPhase": "foundation|consistency|growth|autonomy",
      "dailyTasks": [
        {
          "title": "Action-oriented title",
          "description": "Detailed coaching instructions:\\n1) CUE: What triggers this action\\n2) ROUTINE: Exactly what to do (with specific numbers)\\n3) REWARD: How to acknowledge completion\\nCoaching Insight: Why this works (1 sentence of behavior science)",
          "duration": 10
        }
      ]
    }
  ],
  "schedule": {
    "days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    "time": "08:00"
  },
  "aiContext": "2-3 sentence summary of the behavior change approach and why this progression will work for this specific user"
}

REQUIREMENTS:
1. Each task description: 40-80 words with the CUE/ROUTINE/REWARD structure (use \\n for line breaks)
2. Be deeply specific to their interview answers (time available, experience level, past failures, triggers)
3. Week 1 tasks must be embarrassingly easy — the user should think "I can definitely do this"
4. Each week's tasks should feel noticeably different from the previous week, reflecting the phase shift
5. Include concrete numbers (reps, minutes, amounts) that progress across weeks
6. Reference their specific situation, schedule, and obstacles mentioned in the interview
7. Schedule days must use lowercase full day names: monday, tuesday, wednesday, thursday, friday, saturday, sunday
8. Schedule time must be in HH:mm 24-hour format (e.g., "07:00", "18:30")
9. Never mention specific third-party apps, brands, or services by name — use generic descriptions instead`;

        const weekResponse = await openaiClient.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are an expert behavioral psychologist and habit coach trained in evidence-based behavior design methodology, the 4 Laws of Behavior Change, and the cue-routine-reward habit loop model. You design progressive behavior change programs that start with tiny actions and systematically build to full habits through scientifically proven phases. Every task you create includes a clear cue, specific routine, and satisfying reward. Always return valid JSON with exactly 4 weeks. Never mention specific third-party apps, brands, or services by name — use generic descriptions instead. SAFETY: Never generate content promoting violence, illegal activities, exploitation of minors, self-harm, or explicit sexual content. Focus only on positive, healthy habit-building.",
            },
            { role: "user", content: weekPrompt },
          ],
          response_format: { type: "json_object" },
          max_tokens: 4000,
        });

        const weekContent = weekResponse.choices[0].message.content;
        if (!weekContent) throw new Error("No content from AI");

        let weekData;
        try {
          weekData = JSON.parse(weekContent);
        } catch (parseError) {
          console.error("JSON parse error, raw content:", weekContent);
          throw new Error("Failed to parse AI response");
        }

        if (!weekData.weeks || !Array.isArray(weekData.weeks) || weekData.weeks.length === 0) {
          throw new Error("Invalid weekly plan structure from AI");
        }

        const enhancedContextWeekly = weekData.aiContext || "";
        const aiSchedule = weekData.schedule;

        fixedDailyPlans = [];
        for (let dayIndex = 0; dayIndex < daysCount; dayIndex++) {
          const planDate = new Date(startDate);
          planDate.setDate(planDate.getDate() + dayIndex);
          const weekIndex = Math.min(Math.floor(dayIndex / 7), weekData.weeks.length - 1);
          const week = weekData.weeks[weekIndex];

          fixedDailyPlans.push({
            date: planDate.toISOString().split('T')[0],
            dayNumber: dayIndex + 1,
            focus: week.theme || `Week ${weekIndex + 1}`,
            tasks: (week.dailyTasks || []).map((task: any, tIdx: number) => ({
              id: `day${dayIndex + 1}-task${tIdx + 1}`,
              title: task.title,
              description: task.description,
              duration: task.duration || 10,
              completed: false,
              notes: "",
            })),
            completed: false,
            timeSpent: 0,
          });
        }

        const enhancedContext = enhancedContextWeekly;

        const updateData: any = {
          questions: questions,
          planDuration: duration,
          planStartDate: startDate.toISOString().split('T')[0],
          planEndDate: endDate.toISOString().split('T')[0],
          dailyPlans: fixedDailyPlans,
          aiContext: enhancedContext,
          setupComplete: true,
        };

        if (aiSchedule && aiSchedule.days && Array.isArray(aiSchedule.days) && aiSchedule.days.length > 0) {
          const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
          const filteredDays = aiSchedule.days.filter((d: string) => validDays.includes(d.toLowerCase())).map((d: string) => d.toLowerCase());
          if (filteredDays.length > 0) {
            updateData.schedule = {
              days: filteredDays,
              time: aiSchedule.time || "08:00",
              reminder: true,
            };
          }
        }

        await storage.updateHabit(habitId, userId, updateData);

        res.json({ success: true, dailyPlans: fixedDailyPlans, aiContext: enhancedContext, schedule: updateData.schedule });
        return;
      }

      const prompt = `Create a science-backed ${duration} behavior change plan for: "${habit.title}"

User's interview answers:
${contextSummary}

You are applying proven behavior change science. Create ${daysCount} daily plans with 3-4 tasks each.

${daysCount === 1 ? `SINGLE DAY PLAN — BEHAVIOR ACTIVATION
Since this is a one-day plan, focus on establishing the complete habit loop:
- Task 1: ENVIRONMENT SETUP — Prepare the physical space and remove friction (make the habit obvious and easy)
- Task 2: THE TINY VERSION — Practice the absolute smallest version of the habit (the 2-minute rule from behavioral science). The goal is just to START.
- Task 3: THE FULL PRACTICE — Do the habit at a comfortable level with full presence and intention
- Task 4: REFLECTION & REWARD — Celebrate completion, note what worked, and set up tomorrow's cue
Each task must include CUE (what triggers it), ROUTINE (exactly what to do), and REWARD (how to celebrate).` : `WEEKLY PROGRESSION (7 days):
- Days 1-2: FOUNDATION — Tiny habit version only. Focus on showing up and building the cue-routine-reward loop. Tasks should be embarrassingly easy.
- Days 3-4: BUILDING — Increase to ~50% of target intensity. Add implementation intentions ("When X, I will Y at Z"). Begin identity reinforcement.
- Days 5-6: STRETCHING — Reach ~75-100% of target level. Add obstacle planning ("If I miss, I will..."). Introduce variety.
- Day 7: REFLECTION & PLANNING — Full practice plus review of the week. What worked? What needs adjusting? Plan for continued consistency.
Each task must include CUE (what triggers it), ROUTINE (exactly what to do), and REWARD (how to celebrate).`}

Also recommend a schedule based on the user's answers — which days of the week to practice and the best time of day (in HH:mm 24-hour format). Use their daily routine, available time, and habits they mentioned to pick the optimal days and time.

Return JSON:
{
  "dailyPlans": [
    {
      "date": "${startDate.toISOString().split('T')[0]}",
      "dayNumber": 1,
      "focus": "Day theme reflecting the behavior change phase (e.g., 'Setting Up Your Trigger')",
      "tasks": [
        {
          "id": "day1-task1",
          "title": "Action-oriented title",
          "description": "Detailed coaching instructions:\\n1) CUE: What triggers this action — be specific about time and place\\n2) ROUTINE: Step-by-step what to do with exact numbers\\n3) REWARD: How to acknowledge completion — even a small celebration matters\\nCoaching Insight: Why this step matters for building the habit (1 sentence of science)",
          "duration": 10,
          "completed": false,
          "notes": ""
        }
      ],
      "completed": false,
      "timeSpent": 0
    }
  ],
  "schedule": {
    "days": ["monday", "wednesday", "friday"],
    "time": "07:00"
  },
  "aiContext": "2-3 sentence summary of the behavior change approach tailored to this user's specific situation"
}

REQUIREMENTS:
1. Each task description: 50-100 words with CUE/ROUTINE/REWARD structure and line breaks (use \\n in JSON)
2. Be deeply specific to their interview answers (time available, experience level, past failures, triggers)
3. Day 1 tasks must be so easy the user thinks "I can definitely do this" — this builds the neural pathway
4. Include concrete numbers (reps, minutes, amounts) that progress across days
5. Reference their specific situation, daily routine, and obstacles in descriptions
6. Format: "1) CUE: ...\\n2) ROUTINE: ...\\n3) REWARD: ...\\nCoaching Insight: ..."
7. Schedule days must use lowercase full day names: monday, tuesday, wednesday, thursday, friday, saturday, sunday
8. Schedule time must be in HH:mm 24-hour format (e.g., "07:00", "18:30")
9. Never mention specific third-party apps, brands, or services by name — use generic descriptions instead`;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert behavioral psychologist and habit coach trained in evidence-based behavior design methodology, the 4 Laws of Behavior Change, and the cue-routine-reward habit loop model. You design behavior change plans where every task includes a clear cue, specific routine, and satisfying reward. You understand that consistency matters more than intensity — starting tiny and building up is scientifically proven to create lasting habits. Always return valid JSON. Never mention specific third-party apps, brands, or services by name — use generic descriptions instead. SAFETY: Never generate content promoting violence, illegal activities, exploitation of minors, self-harm, or explicit sexual content. Focus only on positive, healthy habit-building.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 4000,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content from AI");

      let planData;
      try {
        planData = JSON.parse(content);
      } catch (parseError) {
        console.error("JSON parse error, raw content:", content);
        throw new Error("Failed to parse AI response");
      }

      if (!planData.dailyPlans || !Array.isArray(planData.dailyPlans)) {
        throw new Error("Invalid plan structure from AI");
      }

      // Fix dates: AI often generates wrong dates, so we override with correct sequential dates
      fixedDailyPlans = planData.dailyPlans.map((plan: any, index: number) => {
        const planDate = new Date(startDate);
        planDate.setDate(planDate.getDate() + index);
        return {
          ...plan,
          date: planDate.toISOString().split('T')[0],
          dayNumber: index + 1,
        };
      });

      const enhancedContext = planData.aiContext || "";
      const aiSchedule = planData.schedule;

      const updateData: any = {
        questions: questions,
        planDuration: duration,
        planStartDate: startDate.toISOString().split('T')[0],
        planEndDate: endDate.toISOString().split('T')[0],
        dailyPlans: fixedDailyPlans,
        aiContext: enhancedContext,
        setupComplete: true,
      };

      if (aiSchedule && aiSchedule.days && Array.isArray(aiSchedule.days) && aiSchedule.days.length > 0) {
        const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
        const filteredDays = aiSchedule.days.filter((d: string) => validDays.includes(d.toLowerCase())).map((d: string) => d.toLowerCase());
        if (filteredDays.length > 0) {
          updateData.schedule = {
            days: filteredDays,
            time: aiSchedule.time || "08:00",
            reminder: true,
          };
        }
      }

      await storage.updateHabit(habitId, userId, updateData);

      res.json({ success: true, ...planData, schedule: updateData.schedule });
    } catch (error) {
      console.error("Error generating plan:", error);
      res.status(500).json({ error: "Failed to generate plan" });
    }
  });

  // Regenerate plan with a different duration, keeping existing questions/answers
  app.post("/api/habits/:id/regenerate-plan", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);
      const { duration } = req.body;

      if (!["daily", "weekly", "monthly"].includes(duration)) {
        return res.status(400).json({ error: "Invalid duration. Must be daily, weekly, or monthly." });
      }

      const habit = await storage.getHabit(habitId);
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }

      const user = await storage.getUser(userId);
      const isFreeUser = !user?.hasPaid && user?.subscriptionTier !== 'pro' && user?.subscriptionTier !== 'premium';
      if (isFreeUser) {
        return res.status(403).json({ 
          error: "paid_feature",
          message: "Plan refresh is available with Pro. Upgrade to get updated, AI-adjusted action plans!"
        });
      }

      if (!habit.setupComplete) {
        return res.status(400).json({ error: "Habit setup must be completed first before changing plan type." });
      }

      const safetyCheck = checkContentSafety(habit.title, habit.description, habit.goal);
      if (!safetyCheck.allowed) {
        return res.status(400).json({ error: safetyCheck.message, safetyFlag: safetyCheck.reason });
      }

      const questions = (habit.questions || []) as any[];
      const startDate = new Date();
      const daysCount = duration === "daily" ? 1 : duration === "weekly" ? 7 : 30;
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + daysCount - 1);

      const moodJournalContext = await buildMoodJournalContext(userId);

      const contextSummary = questions
        .filter((q: any) => q.answer)
        .map((q: any) => `Q: ${q.question}\nA: ${q.answer}`)
        .join("\n\n") + moodJournalContext;

      let fixedDailyPlans: any[];

      if (duration === "monthly") {
        const weekPrompt = `Create a science-backed 4-week behavior change plan for: "${habit.title}"
${habit.goal ? `Goal: ${habit.goal}` : ""}

User's interview answers:
${contextSummary}

You are applying proven behavior change science. Design exactly 4 weeks following this progression model:

WEEK 1 — FOUNDATION (Micro-Habits + Environment Design)
Theme should reflect "Building the Trigger" or similar.
Focus: Establish the cue-routine-reward loop with the SMALLEST possible version of the habit (the micro-habits method from behavioral research). The user should feel like they CANNOT fail.
Tasks must:
- Identify and set up a specific CUE (time, location, or existing habit to stack onto)
- Practice the "2-minute version" of the habit — absurdly easy, just to build the neural pathway
- Design their physical environment to make the habit obvious and frictionless
- Include a celebration/reward ritual after each completion (even a fist pump or mental "I'm the kind of person who...")

WEEK 2 — CONSISTENCY (Implementation Intentions + Identity)
Theme should reflect "Locking In the Routine" or similar.
Focus: Solidify the habit loop so it becomes automatic. Begin connecting the habit to the user's identity.
Tasks must:
- Use "implementation intentions" format: "When [situation], I will [behavior] at [location]"
- Slightly increase duration or intensity (but still very manageable — no more than 50% increase from Week 1)
- Add a tracking/reflection element so the user sees their streak building
- Include identity reinforcement: "You're becoming someone who [does this habit]"

WEEK 3 — GROWTH (Progressive Overload + Obstacle Planning)
Theme should reflect "Stretching Your Capacity" or similar.
Focus: Increase difficulty toward the target behavior. Proactively address obstacles.
Tasks must:
- Scale the habit to ~75% of the user's target level
- Include "if-then" contingency plans for common obstacles (e.g., "If I miss a day, I will [minimum fallback]")
- Add variety or depth to prevent boredom
- Introduce accountability or social elements where applicable

WEEK 4 — AUTONOMY (Full Routine + Long-term Maintenance)
Theme should reflect "Owning Your New Identity" or similar.
Focus: The habit at full target intensity. Build systems for long-term sustainability.
Tasks must:
- Practice the habit at full target duration/intensity
- Create a "never miss twice" recovery protocol
- Reflect on identity shift: "I am now someone who..."
- Plan for maintaining the habit after the structured plan ends

Return JSON:
{
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "Week theme (e.g., 'Building the Trigger')",
      "behaviorPhase": "foundation|consistency|growth|autonomy",
      "dailyTasks": [
        {
          "title": "Action-oriented title",
          "description": "Detailed coaching instructions:\\n1) CUE: What triggers this action\\n2) ROUTINE: Exactly what to do (with specific numbers)\\n3) REWARD: How to acknowledge completion\\nCoaching Insight: Why this works (1 sentence of behavior science)",
          "duration": 10
        }
      ]
    }
  ],
  "aiContext": "2-3 sentence summary of the behavior change approach and why this progression will work for this specific user"
}

REQUIREMENTS:
1. Each task description: 40-80 words with the CUE/ROUTINE/REWARD structure (use \\n for line breaks)
2. Be deeply specific to their interview answers (time available, experience level, past failures, triggers)
3. Week 1 tasks must be embarrassingly easy — the user should think "I can definitely do this"
4. Each week's tasks should feel noticeably different from the previous week, reflecting the phase shift
5. Include concrete numbers (reps, minutes, amounts) that progress across weeks
6. Reference their specific situation, schedule, and obstacles mentioned in the interview
7. Never mention specific third-party apps, brands, or services by name — use generic descriptions instead`;

        const weekResponse = await openaiClient.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are an expert behavioral psychologist and habit coach trained in evidence-based behavior design methodology, the 4 Laws of Behavior Change, and the cue-routine-reward habit loop model. You design progressive behavior change programs that start with tiny actions and systematically build to full habits through scientifically proven phases. Every task you create includes a clear cue, specific routine, and satisfying reward. Always return valid JSON with exactly 4 weeks. Never mention specific third-party apps, brands, or services by name — use generic descriptions instead. SAFETY: Never generate content promoting violence, illegal activities, exploitation of minors, self-harm, or explicit sexual content. Focus only on positive, healthy habit-building.",
            },
            { role: "user", content: weekPrompt },
          ],
          response_format: { type: "json_object" },
          max_tokens: 4000,
        });

        const weekContent = weekResponse.choices[0].message.content;
        if (!weekContent) throw new Error("No content from AI");

        const weekData = JSON.parse(weekContent);
        if (!weekData.weeks || !Array.isArray(weekData.weeks) || weekData.weeks.length === 0) {
          throw new Error("Invalid weekly plan structure from AI");
        }

        fixedDailyPlans = [];
        for (let dayIndex = 0; dayIndex < daysCount; dayIndex++) {
          const planDate = new Date(startDate);
          planDate.setDate(planDate.getDate() + dayIndex);
          const weekIndex = Math.min(Math.floor(dayIndex / 7), weekData.weeks.length - 1);
          const week = weekData.weeks[weekIndex];

          fixedDailyPlans.push({
            date: planDate.toISOString().split('T')[0],
            dayNumber: dayIndex + 1,
            focus: week.theme || `Week ${weekIndex + 1}`,
            tasks: (week.dailyTasks || []).map((task: any, tIdx: number) => ({
              id: `day${dayIndex + 1}-task${tIdx + 1}`,
              title: task.title,
              description: task.description,
              duration: task.duration || 10,
              completed: false,
              notes: "",
            })),
            completed: false,
            timeSpent: 0,
          });
        }

        await storage.updateHabit(habitId, userId, {
          planDuration: duration,
          planStartDate: startDate.toISOString().split('T')[0],
          planEndDate: endDate.toISOString().split('T')[0],
          dailyPlans: fixedDailyPlans,
          aiContext: weekData.aiContext || habit.aiContext,
        });

        res.json({ success: true, dailyPlans: fixedDailyPlans });
        return;
      }

      // Daily or Weekly
      const prompt = `Create a science-backed ${duration} behavior change plan for: "${habit.title}"
${habit.goal ? `Goal: ${habit.goal}` : ""}

User's interview answers:
${contextSummary}

You are applying proven behavior change science. Create ${daysCount} daily plans with 3-4 tasks each.

${daysCount === 1 ? `SINGLE DAY PLAN — BEHAVIOR ACTIVATION
Since this is a one-day plan, focus on establishing the complete habit loop:
- Task 1: ENVIRONMENT SETUP — Prepare the physical space and remove friction (make the habit obvious and easy)
- Task 2: THE TINY VERSION — Practice the absolute smallest version of the habit (the 2-minute rule from behavioral science). The goal is just to START.
- Task 3: THE FULL PRACTICE — Do the habit at a comfortable level with full presence and intention
- Task 4: REFLECTION & REWARD — Celebrate completion, note what worked, and set up tomorrow's cue
Each task must include CUE (what triggers it), ROUTINE (exactly what to do), and REWARD (how to celebrate).` : `WEEKLY PROGRESSION (7 days):
- Days 1-2: FOUNDATION — Tiny habit version only. Focus on showing up and building the cue-routine-reward loop. Tasks should be embarrassingly easy.
- Days 3-4: BUILDING — Increase to ~50% of target intensity. Add implementation intentions ("When X, I will Y at Z"). Begin identity reinforcement.
- Days 5-6: STRETCHING — Reach ~75-100% of target level. Add obstacle planning ("If I miss, I will..."). Introduce variety.
- Day 7: REFLECTION & PLANNING — Full practice plus review of the week. What worked? What needs adjusting? Plan for continued consistency.
Each task must include CUE (what triggers it), ROUTINE (exactly what to do), and REWARD (how to celebrate).`}

Return JSON:
{
  "dailyPlans": [
    {
      "date": "${startDate.toISOString().split('T')[0]}",
      "dayNumber": 1,
      "focus": "Day theme reflecting the behavior change phase (e.g., 'Setting Up Your Trigger')",
      "tasks": [
        {
          "id": "day1-task1",
          "title": "Action-oriented title",
          "description": "Detailed coaching instructions:\\n1) CUE: What triggers this action — be specific about time and place\\n2) ROUTINE: Step-by-step what to do with exact numbers\\n3) REWARD: How to acknowledge completion — even a small celebration matters\\nCoaching Insight: Why this step matters for building the habit (1 sentence of science)",
          "duration": 10,
          "completed": false,
          "notes": ""
        }
      ],
      "completed": false,
      "timeSpent": 0
    }
  ],
  "aiContext": "2-3 sentence summary of the behavior change approach tailored to this user's specific situation"
}

REQUIREMENTS:
1. Each task description: 50-100 words with CUE/ROUTINE/REWARD structure and line breaks (use \\n in JSON)
2. Be deeply specific to their interview answers (time available, experience level, past failures, triggers)
3. Day 1 tasks must be so easy the user thinks "I can definitely do this" — this builds the neural pathway
4. Include concrete numbers (reps, minutes, amounts) that progress across days
5. Reference their specific situation, daily routine, and obstacles in descriptions
6. Never mention specific third-party apps, brands, or services by name — use generic descriptions instead`;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert behavioral psychologist and habit coach trained in evidence-based behavior design methodology, the 4 Laws of Behavior Change, and the cue-routine-reward habit loop model. You design behavior change plans where every task includes a clear cue, specific routine, and satisfying reward. You understand that consistency matters more than intensity — starting tiny and building up is scientifically proven to create lasting habits. Always return valid JSON. Never mention specific third-party apps, brands, or services by name — use generic descriptions instead. SAFETY: Never generate content promoting violence, illegal activities, exploitation of minors, self-harm, or explicit sexual content. Focus only on positive, healthy habit-building.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 4000,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content from AI");

      const planData = JSON.parse(content);
      if (!planData.dailyPlans || !Array.isArray(planData.dailyPlans)) {
        throw new Error("Invalid plan structure from AI");
      }

      fixedDailyPlans = planData.dailyPlans.map((plan: any, index: number) => {
        const planDate = new Date(startDate);
        planDate.setDate(planDate.getDate() + index);
        return {
          ...plan,
          date: planDate.toISOString().split('T')[0],
          dayNumber: index + 1,
        };
      });

      await storage.updateHabit(habitId, userId, {
        planDuration: duration,
        planStartDate: startDate.toISOString().split('T')[0],
        planEndDate: endDate.toISOString().split('T')[0],
        dailyPlans: fixedDailyPlans,
        aiContext: planData.aiContext || habit.aiContext,
      });

      res.json({ success: true, dailyPlans: fixedDailyPlans });
    } catch (error) {
      console.error("Error regenerating plan:", error);
      res.status(500).json({ error: "Failed to regenerate plan" });
    }
  });

  app.post("/api/habits/:id/adjust-plan", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);

      const habit = await storage.getHabit(habitId);
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }

      const user = await storage.getUser(userId);
      const tier = user?.subscriptionTier;
      const isAdmin = user?.isAdmin === true;
      const isPro = tier === 'pro' || tier === 'premium' || isAdmin;
      const isPremium = tier === 'premium' || isAdmin;

      if (!isPro) {
        return res.status(403).json({
          error: "paid_feature",
          message: "Smart plan adjustment is available with Pro. Upgrade to get AI-adapted plans!"
        });
      }

      if (!habit.setupComplete) {
        return res.status(400).json({ error: "Habit setup must be completed first." });
      }

      const safetyCheck = checkContentSafety(habit.title, habit.description, habit.goal);
      if (!safetyCheck.allowed) {
        return res.status(400).json({ error: safetyCheck.message, safetyFlag: safetyCheck.reason });
      }

      const dailyPlans = (habit.dailyPlans || []) as any[];
      const todayStr = getUserToday(user?.timezone);

      const pastPlans = dailyPlans.filter((p: any) => p.date <= todayStr);
      const futurePlans = dailyPlans.filter((p: any) => p.date > todayStr);

      const completedDays = pastPlans.filter((p: any) =>
        p.completed || (p.tasks.length > 0 && p.tasks.every((t: any) => t.completed))
      );
      const missedDays = pastPlans.filter((p: any) =>
        !p.completed && p.tasks.some((t: any) => !t.completed && !t.skipped)
      );

      const completionPatterns = pastPlans.map((p: any) => {
        const totalTasks = p.tasks.length;
        const completedTasks = p.tasks.filter((t: any) => t.completed).length;
        const skippedTasks = p.tasks.filter((t: any) => t.skipped).length;
        return {
          date: p.date,
          dayNumber: p.dayNumber,
          focus: p.focus,
          completed: completedTasks,
          skipped: skippedTasks,
          total: totalTasks,
          rate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        };
      });

      const missReasons = (habit.missReasons as { reason: string; date: string }[] | null) || [];
      const reasonSummary = missReasons.length > 0
        ? missReasons.map(r => `${r.date}: ${r.reason}`).join("\n")
        : "No miss reasons recorded";

      const moodCount = isPremium ? 7 : 3;
      let moodContext = "";
      try {
        const recentMoods = await db.select().from(moodEntries)
          .where(eq(moodEntries.userId, userId))
          .orderBy(desc(moodEntries.createdAt))
          .limit(moodCount);
        if (recentMoods.length > 0) {
          moodContext = "\n\nRecent Mood Data:\n" + recentMoods.map(m => {
            let parts = [`${m.date}: mood=${m.mood}`];
            if (m.energy != null) parts.push(`energy=${m.energy}/5`);
            if (m.stress != null) parts.push(`stress=${m.stress}/5`);
            return parts.join(", ");
          }).join("\n");
        }
      } catch {}

      let journalContext = "";
      if (isPremium) {
        try {
          const recentJournals = await db.select().from(journalEntries)
            .where(eq(journalEntries.userId, userId))
            .orderBy(desc(journalEntries.createdAt))
            .limit(5);
          if (recentJournals.length > 0) {
            journalContext = "\n\nRecent Journal Themes:\n" + recentJournals.map(j => {
              const truncated = j.content.length > 100 ? j.content.substring(0, 100) + "..." : j.content;
              return `${j.date}: ${truncated}`;
            }).join("\n");
          }
        } catch {}
      }

      const questions = (habit.questions || []) as any[];
      const interviewContext = questions
        .filter((q: any) => q.answer)
        .map((q: any) => `Q: ${q.question}\nA: ${q.answer}`)
        .join("\n\n");

      const completionPatternsStr = completionPatterns
        .map(p => `Day ${p.dayNumber} (${p.date}): ${p.completed}/${p.total} tasks (${p.rate}%)${p.skipped > 0 ? ` [${p.skipped} skipped]` : ""}`)
        .join("\n");

      const remainingDaysCount = futurePlans.length;
      const completedDaysList = completedDays.map((p: any) => p.date);

      const prompt = `The user is struggling with their habit plan for "${habit.title}" and needs an adjusted plan.
${habit.goal ? `Goal: ${habit.goal}` : ""}

Original interview answers:
${interviewContext}

Previous AI context: ${habit.aiContext || "None"}

COMPLETION PATTERNS (what actually happened):
${completionPatternsStr}

MISSED DAY REASONS:
${reasonSummary}
${moodContext}${journalContext}

The user has ${remainingDaysCount} remaining days in their plan. They completed ${completedDays.length} out of ${pastPlans.length} past days.

Your job: Generate ${remainingDaysCount} NEW daily plans that REPLACE the remaining future days. Keep the same date range but create plans that are:
1. EASIER — reduce duration, simplify tasks, lower the bar so they can actually succeed
2. DIFFERENTLY TIMED — if they miss certain days consistently, adjust the approach for those patterns
3. RESTRUCTURED — based on their miss reasons and mood data, redesign tasks to address their actual obstacles

The completed days are preserved. You are only replacing future/remaining days starting from tomorrow.

Return JSON:
{
  "adjustedPlans": [
${futurePlans.map((p: any, i: number) => `    {
      "date": "${p.date}",
      "dayNumber": ${p.dayNumber || (pastPlans.length + i + 1)},
      "focus": "Theme reflecting the adjusted approach",
      "tasks": [
        {
          "id": "adj-day${pastPlans.length + i + 1}-task1",
          "title": "Easier, more achievable task title",
          "description": "Clear instructions with CUE/ROUTINE/REWARD structure",
          "duration": 5,
          "completed": false,
          "notes": ""
        }
      ],
      "completed": false,
      "timeSpent": 0
    }`).join(",\n")}
  ],
  "adjustmentSummary": "2-3 sentences explaining what was changed and why, referencing their specific patterns and obstacles",
  "aiContext": "Updated context reflecting the adjusted approach"
}

REQUIREMENTS:
1. Make tasks noticeably easier than the original plan — the user needs quick wins to rebuild momentum
2. Address the specific miss reasons directly in task design
3. Keep 2-3 tasks per day maximum
4. Each task should be 5-15 minutes, not longer
5. Reference their actual completion patterns and obstacles
6. Never mention specific third-party apps, brands, or services by name`;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert behavioral psychologist specializing in plan recovery and habit rescue. When a user is struggling, you redesign their plan to be easier, more achievable, and better aligned with their actual life patterns. You understand that a struggling user needs quick wins, not harder challenges. Every task includes a clear cue, specific routine, and satisfying reward. Always return valid JSON. SAFETY: Never generate harmful content.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 4000,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content from AI");

      const adjustedData = JSON.parse(content);
      if (!adjustedData.adjustedPlans || !Array.isArray(adjustedData.adjustedPlans)) {
        throw new Error("Invalid adjusted plan structure from AI");
      }

      const newDailyPlans = [
        ...pastPlans,
        ...adjustedData.adjustedPlans.map((plan: any, index: number) => ({
          ...plan,
          date: futurePlans[index]?.date || plan.date,
          dayNumber: plan.dayNumber || (pastPlans.length + index + 1),
        })),
      ];

      await storage.updateHabit(habitId, userId, {
        dailyPlans: newDailyPlans,
        aiContext: adjustedData.aiContext || habit.aiContext,
      });

      res.json({
        success: true,
        adjustmentSummary: adjustedData.adjustmentSummary,
        dailyPlans: newDailyPlans,
      });
    } catch (error) {
      console.error("Error adjusting plan:", error);
      res.status(500).json({ error: "Failed to adjust plan" });
    }
  });

  // Extend plan from current end date, preserving existing progress
  app.post("/api/habits/:id/extend-plan", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);
      const { duration } = req.body;

      if (!["daily", "weekly", "monthly"].includes(duration)) {
        return res.status(400).json({ error: "Extension duration must be daily, weekly, or monthly." });
      }

      const habit = await storage.getHabit(habitId);
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }

      const user = await storage.getUser(userId);
      const isFreeUser = !user?.hasPaid && user?.subscriptionTier !== 'pro' && user?.subscriptionTier !== 'premium';
      if (isFreeUser) {
        return res.status(403).json({ 
          error: "paid_feature",
          message: "Plan refresh is available with Pro. Upgrade to get updated, AI-adjusted action plans!"
        });
      }

      if (!habit.setupComplete) {
        return res.status(400).json({ error: "Habit must have a completed plan to extend." });
      }

      const existingPlans = (habit.dailyPlans || []) as any[];
      const lastDailyPlanDate = existingPlans.length > 0 ? existingPlans[existingPlans.length - 1].date : null;
      const effectiveEndDate = habit.planEndDate || lastDailyPlanDate;
      
      if (!effectiveEndDate) {
        return res.status(400).json({ error: "Habit must have a completed plan to extend." });
      }

      const safetyCheck = checkContentSafety(habit.title, habit.description, habit.goal);
      if (!safetyCheck.allowed) {
        return res.status(400).json({ error: safetyCheck.message, safetyFlag: safetyCheck.reason });
      }

      const existingEndDate = new Date(effectiveEndDate);
      const newStartDate = new Date(existingEndDate);
      newStartDate.setDate(newStartDate.getDate() + 1);

      const daysCount = duration === "daily" ? 1 : duration === "weekly" ? 7 : 30;
      const newEndDate = new Date(newStartDate);
      newEndDate.setDate(newEndDate.getDate() + daysCount - 1);

      const questions = (habit.questions || []) as any[];
      const contextSummary = questions
        .filter((q: any) => q.answer)
        .map((q: any) => `Q: ${q.question}\nA: ${q.answer}`)
        .join("\n\n");

      const completedDays = existingPlans.filter((p: any) => p.completed).length;
      const totalDays = existingPlans.length;

      const prompt = `Create a CONTINUATION plan for the habit: "${habit.title}"
${habit.goal ? `Goal: ${habit.goal}` : ""}

User's interview answers:
${contextSummary}

Previous plan context: ${habit.aiContext || "No additional context"}
The user completed ${completedDays} out of ${totalDays} days in their previous plan.

This is NOT a fresh start — this user has already been building this habit. They have established neural pathways and behavioral momentum. Your job is to build on their progress using progressive overload principles.

Based on their completion rate (${completedDays}/${totalDays} days = ${Math.round((completedDays/totalDays)*100)}%):
${completedDays >= totalDays * 0.8 ? `- HIGH CONSISTENCY: They're ready to increase intensity by 25-50%. Challenge them with deeper practice, longer durations, or more complex variations. Reinforce their identity: "You've proven you're someone who does this consistently."` : completedDays >= totalDays * 0.5 ? `- MODERATE CONSISTENCY: Maintain current difficulty but add variety to prevent boredom. Focus on obstacle planning — identify what caused missed days and build "if-then" contingency plans. Don't increase intensity yet.` : `- BUILDING CONSISTENCY: They're still establishing the routine. Keep tasks at the same or slightly easier level. Focus on making the habit more automatic — simplify the cue, reduce friction further, and strengthen the reward. Address what's getting in the way.`}

Create ${daysCount} new daily plans continuing from day ${totalDays + 1}.

Return JSON:
{
  "dailyPlans": [
    {
      "date": "${newStartDate.toISOString().split('T')[0]}",
      "dayNumber": ${totalDays + 1},
      "focus": "Day theme reflecting progression level",
      "tasks": [
        {
          "id": "day${totalDays + 1}-task1",
          "title": "Action-oriented title",
          "description": "Coaching instructions with CUE/ROUTINE/REWARD structure",
          "duration": 10,
          "completed": false,
          "notes": ""
        }
      ],
      "completed": false,
      "timeSpent": 0
    }
  ],
  "aiContext": "Updated summary acknowledging progress made and explaining the next phase of behavior change"
}

REQUIREMENTS:
1. Each task description: 50-100 words with numbered steps
2. Explicitly reference their progress (${completedDays} days completed)
3. Include concrete numbers that reflect appropriate progression
4. Reference their specific situation from the interview answers
5. Never mention specific third-party apps, brands, or services by name`;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert behavioral psychologist and habit coach. You specialize in progressive behavior change and understand that continuation plans must be calibrated to the user's actual consistency level — not just blindly increasing difficulty. You use completion rate data to determine the right next phase: consolidation, growth, or advancement. Always return valid JSON. SAFETY: Never generate harmful content.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 4000,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content from AI");

      const planData = JSON.parse(content);
      if (!planData.dailyPlans || !Array.isArray(planData.dailyPlans)) {
        throw new Error("Invalid plan structure from AI");
      }

      const fixedNewPlans = planData.dailyPlans.map((plan: any, index: number) => {
        const planDate = new Date(newStartDate);
        planDate.setDate(planDate.getDate() + index);
        return {
          ...plan,
          date: planDate.toISOString().split('T')[0],
          dayNumber: totalDays + index + 1,
        };
      });

      const combinedPlans = [...existingPlans, ...fixedNewPlans];

      await storage.updateHabit(habitId, userId, {
        planEndDate: newEndDate.toISOString().split('T')[0],
        dailyPlans: combinedPlans,
        aiContext: planData.aiContext || habit.aiContext,
      });

      res.json({ success: true, dailyPlans: combinedPlans });
    } catch (error) {
      console.error("Error extending plan:", error);
      res.status(500).json({ error: "Failed to extend plan" });
    }
  });

  // Archive/unarchive a habit
  app.post("/api/habits/:id/repair-plan", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);
      const habit = await storage.getHabit(habitId);
      
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }
      
      if (!habit.setupComplete) {
        return res.status(400).json({ error: "Habit setup is not complete" });
      }
      
      const existingPlans = (habit.dailyPlans || []) as any[];
      const planEndDate = habit.planEndDate;
      
      if (!planEndDate || existingPlans.length === 0) {
        return res.status(400).json({ error: "No plan data to repair" });
      }
      
      const lastPlanDate = existingPlans[existingPlans.length - 1].date;
      const endDate = new Date(planEndDate + "T12:00:00");
      const lastDate = new Date(lastPlanDate + "T12:00:00");
      
      if (lastDate >= endDate) {
        return res.json({ success: true, message: "Plan is already complete", repaired: false });
      }
      
      const missingDays: any[] = [];
      const currentDate = new Date(lastDate);
      currentDate.setDate(currentDate.getDate() + 1);
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayNumber = existingPlans.length + missingDays.length + 1;
        
        const weekIndex = Math.floor((dayNumber - 1) / 7);
        const templateDay = existingPlans[Math.min(existingPlans.length - 1, weekIndex % existingPlans.length)];
        
        missingDays.push({
          date: dateStr,
          dayNumber,
          focus: templateDay.focus || `Day ${dayNumber}`,
          tasks: (templateDay.tasks || []).map((task: any, tIdx: number) => ({
            id: `day${dayNumber}-task${tIdx + 1}`,
            title: task.title,
            description: task.description,
            duration: task.duration || 10,
            completed: false,
            notes: "",
          })),
          completed: false,
          timeSpent: 0,
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      if (missingDays.length === 0) {
        return res.json({ success: true, message: "No missing days", repaired: false });
      }
      
      const combinedPlans = [...existingPlans, ...missingDays];
      await storage.updateHabit(habitId, userId, { dailyPlans: combinedPlans });
      
      res.json({ success: true, repaired: true, addedDays: missingDays.length, totalDays: combinedPlans.length });
    } catch (error) {
      console.error("Error repairing plan:", error);
      res.status(500).json({ error: "Failed to repair plan" });
    }
  });

  app.post("/api/habits/:id/archive", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);
      const { archived } = req.body;
      
      const habit = await storage.getHabit(habitId);
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }

      if (!archived) {
        const user = await storage.getUser(userId);
        const hasPaidSubscription = user?.hasPaid && (user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'premium');
        const isAdmin = user?.isAdmin === true;
        if (!hasPaidSubscription && !isAdmin) {
          const allHabits = await storage.getHabits(userId);
          const activeCount = allHabits.filter(h => !h.archived).length;
          if (activeCount >= 1) {
            return res.status(403).json({ error: "Free accounts are limited to 1 active habit. Upgrade to unlock more." });
          }
        }
      }
      
      const updates: any = { archived: !!archived };
      if (!archived) {
        updates.downgradeArchived = false;
      }
      const updated = await storage.updateHabit(habitId, userId, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error archiving habit:", error);
      res.status(500).json({ error: "Failed to archive habit" });
    }
  });

  app.post("/api/habits/downgrade-archive", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { keepHabitId } = req.body;

      if (!keepHabitId || typeof keepHabitId !== 'number') {
        return res.status(400).json({ error: "keepHabitId is required" });
      }

      const allHabits = await storage.getHabits(userId);
      const activeHabits = allHabits.filter(h => !h.archived);

      const keepHabit = activeHabits.find(h => h.id === keepHabitId);
      if (!keepHabit) {
        return res.status(404).json({ error: "Selected habit not found" });
      }

      const toArchive = activeHabits.filter(h => h.id !== keepHabitId);
      for (const habit of toArchive) {
        await storage.updateHabit(habit.id, userId, {
          archived: true,
          downgradeArchived: true,
        } as any);
      }

      res.json({ archived: toArchive.length, kept: keepHabitId });
    } catch (error) {
      console.error("Error downgrade archiving:", error);
      res.status(500).json({ error: "Failed to archive habits" });
    }
  });

  // Update a specific task in a daily plan
  app.patch("/api/habits/:id/tasks/:taskId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      const userTz = user?.timezone;
      const habitId = Number(req.params.id);
      const taskId = req.params.taskId;
      const { completed, skipped, notes, timeSpent } = req.body;
      
      const habit = await storage.getHabit(habitId);
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }

      // Find and update the task in dailyPlans
      const dailyPlans = [...(habit.dailyPlans || [])];
      let taskFound = false;
      let totalTimeSpent = habit.totalTimeSpent || 0;
      let modifiedPlan: any = null;

      for (const plan of dailyPlans) {
        const taskIndex = plan.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          if (completed !== undefined) {
            plan.tasks[taskIndex].completed = completed;
            if (completed) {
              plan.tasks[taskIndex].skipped = false;
            }
          }
          if (skipped !== undefined) {
            plan.tasks[taskIndex].skipped = skipped;
            if (skipped) {
              plan.tasks[taskIndex].completed = false;
            }
          }
          if (notes !== undefined) {
            plan.tasks[taskIndex].notes = notes;
          }
          if (timeSpent !== undefined) {
            totalTimeSpent += timeSpent;
            plan.timeSpent = (plan.timeSpent || 0) + timeSpent;
          }
          
          // Day is complete only if all tasks are either completed or skipped, with at least one completed
          const allResolved = plan.tasks.every(t => t.completed || t.skipped);
          const anyCompleted = plan.tasks.some(t => t.completed);
          plan.completed = allResolved && anyCompleted;
          modifiedPlan = plan;
          taskFound = true;
          break;
        }
      }

      if (!taskFound) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Calculate streak
      let currentStreak = 0;
      const todayForStreak = getUserToday(userTz);
      for (let i = dailyPlans.length - 1; i >= 0; i--) {
        if (dailyPlans[i].completed) {
          currentStreak++;
        } else if (dailyPlans[i].date <= todayForStreak) {
          break;
        }
      }

      // Detect streak break: old streak was positive, new streak is 0
      const oldStreak = habit.currentStreak || 0;
      const streakBreakFields: any = {};
      if (oldStreak > 0 && currentStreak === 0) {
        streakBreakFields.previousStreak = oldStreak;
        streakBreakFields.streakBrokenAt = todayForStreak;
        streakBreakFields.streakBrokenDismissed = false;
      } else if (currentStreak > 0 && habit.streakBrokenAt) {
        streakBreakFields.streakBrokenAt = null;
      }

      // When all tasks for a day are manually completed, add a progress entry
      // so the All-Time Progress page reflects this session
      const progress = [...(habit.progress as any[] || [])];
      if (modifiedPlan) {
        const existingIdx = progress.findIndex((entry: any) => entry.date === modifiedPlan.date);
        if (modifiedPlan.completed && existingIdx === -1) {
          const completedTasks = modifiedPlan.tasks.filter((t: any) => t.completed);
          const activeTasks = modifiedPlan.tasks.filter((t: any) => !t.skipped);
          progress.push({
            date: modifiedPlan.date,
            tasksCompleted: completedTasks.length,
            totalTasks: activeTasks.length,
            timeSpent: modifiedPlan.timeSpent || 0,
            notes: "",
            autoRecorded: true,
          });
        } else if (!modifiedPlan.completed && existingIdx !== -1 && (progress[existingIdx] as any).autoRecorded) {
          progress.splice(existingIdx, 1);
        }
      }

      await storage.updateHabit(habitId, userId, {
        dailyPlans,
        progress,
        totalTimeSpent,
        currentStreak,
        longestStreak: Math.max(habit.longestStreak || 0, currentStreak),
        ...streakBreakFields,
      });

      if (completed) {
        const allHabits = await storage.getHabits(userId);
        const todayForChallenge = getUserToday(userTz);
        const habitsWorkedToday = allHabits.filter(h =>
          h.dailyPlans?.some(p => p.date === todayForChallenge && p.tasks.some(t => t.completed))
        ).length;

        await updateChallengeProgress(userId, {
          tasksCompleted: 1,
          timeSpent: timeSpent || 0,
          habitsWorkedOn: habitsWorkedToday,
          totalActiveHabits: allHabits.length,
          notesAdded: notes ? 1 : 0,
          streakMaintained: currentStreak > 0,
          isBeforeNoon: (() => {
            try {
              const hourStr = new Intl.DateTimeFormat("en-US", { timeZone: userTz || "UTC", hour: "numeric", hour12: false }).format(new Date());
              return parseInt(hourStr) < 12;
            } catch { return new Date().getHours() < 12; }
          })(),
        }, userTz);

        await checkAndAwardAchievements(userId);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.get("/api/free-session-usage", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      const isFreeUser = !user?.hasPaid && user?.subscriptionTier !== 'pro' && user?.subscriptionTier !== 'premium';
      
      if (!isFreeUser) {
        return res.json({ unlimited: true, used: 0, limit: 0 });
      }

      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      const weekStart = format(monday, 'yyyy-MM-dd');

      const allHabits = await storage.getHabits(userId);
      let weeklySessionCount = 0;
      for (const h of allHabits) {
        const progress = h.progress || [];
        weeklySessionCount += progress.filter((p: any) => p.date >= weekStart).length;
      }

      const nextMonday = new Date(monday);
      nextMonday.setDate(nextMonday.getDate() + 7);

      return res.json({ 
        unlimited: false,
        used: weeklySessionCount,
        limit: 3,
        resetsAt: nextMonday.toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Save session notes and progress
  app.post("/api/habits/:id/session-complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);
      const { date, tasksCompleted, totalTasks, timeSpent, goalTime, notes, mood } = req.body;

      const user = await storage.getUser(userId);
      const isFreeUser = !user?.hasPaid && user?.subscriptionTier !== 'pro' && user?.subscriptionTier !== 'premium';
      if (isFreeUser) {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
        monday.setHours(0, 0, 0, 0);

        const weekStart = format(monday, 'yyyy-MM-dd');
        const habit = await storage.getHabit(habitId);
        if (!habit || habit.userId !== userId) {
          return res.status(404).json({ error: "Habit not found" });
        }

        const allHabits = await storage.getHabits(userId);
        let weeklySessionCount = 0;
        for (const h of allHabits) {
          const progress = h.progress || [];
          weeklySessionCount += progress.filter((p: any) => p.date >= weekStart).length;
        }

        if (weeklySessionCount >= 3) {
          return res.status(403).json({ 
            error: "free_session_limit",
            message: "You've reached your 3 free sessions this week. Upgrade to Pro for unlimited sessions!"
          });
        }
      }
      
      const habit = await storage.getHabit(habitId);
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }

      const progress = [...(habit.progress || [])];
      progress.push({
        date,
        tasksCompleted,
        totalTasks,
        timeSpent,
        goalTime: goalTime || 0,
        notes: notes || "",
        mood,
      });

      // Update streak based on daily plan completion
      const dailyPlans = [...(habit.dailyPlans || [])];
      const todayPlan = dailyPlans.find(p => p.date === date);
      if (todayPlan) {
        todayPlan.completed = true;
        todayPlan.timeSpent = (todayPlan.timeSpent || 0) + timeSpent;
        todayPlan.tasks.forEach(task => {
          task.completed = true;
        });
      }

      // Calculate current streak (use spread to avoid mutating original array)
      let currentStreak = 0;
      const sortedPlans = [...dailyPlans].sort((a, b) => b.date.localeCompare(a.date));
      for (const plan of sortedPlans) {
        if (plan.completed) {
          currentStreak++;
        } else if (plan.date <= date) {
          break;
        }
      }

      // Detect streak break
      const oldStreak = habit.currentStreak || 0;
      const streakBreakFields: any = {};
      if (oldStreak > 0 && currentStreak === 0) {
        streakBreakFields.previousStreak = oldStreak;
        streakBreakFields.streakBrokenAt = date;
        streakBreakFields.streakBrokenDismissed = false;
      } else if (currentStreak > 0 && habit.streakBrokenAt) {
        streakBreakFields.streakBrokenAt = null;
      }

      const newTotalTime = (habit.totalTimeSpent || 0) + timeSpent;

      await storage.updateHabit(habitId, userId, {
        dailyPlans,
        progress,
        totalTimeSpent: newTotalTime,
        currentStreak,
        longestStreak: Math.max(habit.longestStreak || 0, currentStreak),
        ...streakBreakFields,
      });

      try {
        const [plannerEntry] = await db.select().from(dailyPlannerEntries)
          .where(and(eq(dailyPlannerEntries.userId, userId), eq(dailyPlannerEntries.date, date)));
        if (plannerEntry && Array.isArray(plannerEntry.blocks)) {
          const plannerBlocks = (plannerEntry.blocks as any[]).map(b => {
            if (b.type === "habit" && (b.habitId === habitId || b.title === habit.title)) {
              return { ...b, completed: true };
            }
            return b;
          });
          await db.update(dailyPlannerEntries)
            .set({ blocks: plannerBlocks, updatedAt: new Date() })
            .where(eq(dailyPlannerEntries.id, plannerEntry.id));
        }
      } catch (syncErr) {
        console.error("Error syncing habit session to planner:", syncErr);
      }

      await checkAndAwardAchievements(userId);

      res.json({ success: true, currentStreak });
    } catch (error) {
      console.error("Error saving session:", error);
      res.status(500).json({ error: "Failed to save session" });
    }
  });

  // Generate AI session summary from notes
  app.post("/api/habits/:id/session-summary", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);
      const { habitTitle, tasksCompleted, totalTasks, timeSpent, notes } = req.body;
      
      const habit = await storage.getHabit(habitId);
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }

      const user = await storage.getUser(userId);
      const isFreeUser = !user?.hasPaid && user?.subscriptionTier !== 'pro' && user?.subscriptionTier !== 'premium';
      if (isFreeUser) {
        return res.status(403).json({ 
          error: "paid_feature",
          message: "AI session summaries are available with Pro. Upgrade to unlock personalized coaching insights!"
        });
      }

      // If no notes provided, return a simple summary
      if (!notes || notes.length === 0) {
        return res.json({
          summary: `You completed ${tasksCompleted} of ${totalTasks} tasks in ${timeSpent} minutes. Great work on your ${habitTitle} practice today!`,
          insights: [],
          encouragement: "Keep building on this momentum!"
        });
      }

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const notesText = notes.map((n: { task: string; note: string }, i: number) => 
        `Task ${i + 1} (${n.task}): ${n.note}`
      ).join('\n');

      const prompt = `You are an expert habit coach providing detailed session analytics. The user just completed a habit session for "${habitTitle}". 

Session stats:
- Completed ${tasksCompleted} of ${totalTasks} tasks (${totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0}% completion rate)
- Time spent: ${timeSpent} minutes

Their notes from this session:
${notesText}

Provide a comprehensive session analysis in JSON format with these fields:
1. "summary": A warm, specific 2-3 sentence summary referencing what they actually did based on their notes
2. "insights": 2-3 specific observations about their approach, patterns, or progress (be concrete, not generic)
3. "performanceTips": 1-2 actionable tips to improve their next session based on what you observe (e.g., time management, focus areas, technique adjustments)
4. "nextSteps": 1-2 specific actions they should take before their next session to build momentum
5. "encouragement": A personalized, motivating message that references something specific from their session

Respond ONLY with valid JSON:
{
  "summary": "...",
  "insights": ["...", "..."],
  "performanceTips": ["...", "..."],
  "nextSteps": ["...", "..."],
  "encouragement": "..."
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || '{}';
      const result = JSON.parse(content);

      res.json(result);
    } catch (error) {
      console.error("Error generating session summary:", error);
      // Return a fallback summary on error
      res.json({
        summary: "Great job completing your session! Every step counts toward building your habit.",
        insights: [],
        encouragement: "Keep up the excellent work!"
      });
    }
  });

  // Generate detailed guidance, examples, and resources for a specific task
  app.post("/api/habits/:id/tasks/:taskId/guidance", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);
      const taskId = req.params.taskId;
      
      const habit = await storage.getHabit(habitId);
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }

      const user = await storage.getUser(userId);
      const isFreeUser = !user?.hasPaid && user?.subscriptionTier !== 'pro' && user?.subscriptionTier !== 'premium';
      if (isFreeUser) {
        return res.status(403).json({ 
          error: "paid_feature",
          message: "AI-powered task resources are available with Pro. Upgrade for detailed guidance, templates, and curated resources!"
        });
      }

      // Find the task
      const dailyPlans = habit.dailyPlans || [];
      let task = null;
      for (const plan of dailyPlans) {
        task = plan.tasks.find(t => t.id === taskId);
        if (task) break;
      }

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const prompt = `You are an expert coach helping someone with the habit: "${habit.title}"

They need comprehensive, actionable guidance for this specific task:
Title: "${task.title}"
Description: "${task.description}"

${habit.aiContext ? `Context about this person: ${habit.aiContext}` : ''}

Generate detailed, practical guidance that someone can follow immediately:

1. EXAMPLES (3-4): Detailed, numbered step-by-step examples. Each example should be 100+ words with exact timings, measurements, and specific actions. Write them like you're walking someone through it. IMPORTANT: Use \\n newlines between each step for proper formatting (e.g., "Step 1: Do this...\\n\\nStep 2: Then do this...").

2. TIPS (5-6): Expert coaching tips including common mistakes, pro tips, and psychology insights. Each tip should be 2-3 sentences with actionable advice.

3. RESOURCES (6-8): Recommend specific external resources that complement this habit. For each resource, provide a descriptive name and a "searchQuery" string (NOT a URL) that can be used to find it. Focus on:
   - Educational articles and blog posts (mention site names like Psychology Today, Harvard Health, WikiHow in the searchQuery)
   - Books with actual author names (include "book" and the author name in searchQuery)
   - Free downloadable templates or printables (mention Canva, Template.net in searchQuery)
   - Online courses (mention Coursera, Skillshare, Khan Academy in searchQuery)
   - Podcasts or educational YouTube channels relevant to the topic
   - Paid resources, tools, or services that help with this specific activity (NOT habit tracking apps)
   
   CRITICAL EXCLUSION: Do NOT recommend any habit tracking apps, habit building apps, goal tracking apps, or anything that competes with a habit coaching platform. No Habitica, Streaks, HabitNow, Loop, Fabulous, Strides, Way of Life, Coach.me, etc. Focus on resources that teach skills, provide knowledge, or offer tools specific to the ACTIVITY itself.
   
   DO NOT generate URLs. Only provide searchQuery strings. The system will generate working links automatically.

4. TEMPLATES (2-3): Complete, ready-to-use templates with a title and full content. Write out the ENTIRE template, not a description. Include placeholders like [Your Name], [Date], etc. These should be print-ready or copy-paste ready.

5. VIDEOS (4-5): Specific search queries for finding helpful videos. Make them very specific like "10 minute morning meditation for beginners guided" not just "meditation".

Return JSON exactly like this:
{
  "examples": ["Step 1: [specific action]...\\n\\nStep 2: [next action]...\\n\\nStep 3: [final step]...", "..."],
  "tips": ["Tip text here", "..."],
  "tools": [
    {
      "id": "resource-1",
      "name": "Specific Resource Name",
      "type": "article",
      "description": "What this resource offers and why it's helpful",
      "searchQuery": "specific search terms to find this resource site:example.com",
      "features": ["Key benefit 1", "Key benefit 2"],
      "pricing": "Free"
    }
  ],
  "templates": [
    {
      "title": "Template Name",
      "content": "Full template text with\\nline breaks and\\n[ ] checkboxes\\n[ ] more items...",
      "format": "checklist"
    }
  ],
  "videos": [
    {
      "title": "Descriptive video title",
      "searchQuery": "very specific search query for finding helpful videos",
      "channel": "Expected content type",
      "duration": "~10 min"
    }
  ]
}

CRITICAL RULES:
1. RESOURCES must have a "searchQuery" field (NOT a URL). The system will generate working search links automatically. Do NOT include any "url" field.
2. For books, include the book title and topic in searchQuery (e.g., "habit formation behavior change book").
3. For articles, include the site name in searchQuery (e.g., "morning routine tips site:psychologytoday.com").
4. For courses, include the platform (e.g., "meditation beginner course Coursera").
5. NEVER recommend habit tracking apps, habit building apps, goal setting apps, or productivity apps that compete with a habit coaching platform (no Habitica, Streaks, HabitNow, Loop, Fabulous, Strides, Way of Life, Coach.me, Todoist, etc.).
6. Resource "type" should be one of: "article", "book", "website", "course", "template", "podcast", "blog", "tool" (for activity-specific tools only, NOT habit trackers).
7. Focus on resources that teach the SKILL or ACTIVITY of the habit (e.g., recipe sites for cooking, language courses for learning languages).
8. Templates must be complete and usable.`;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert habit coach and resource curator. Provide extremely detailed, practical guidance. Always return valid JSON with complete, usable content. For the 'tools' array: recommend external resources with a 'searchQuery' field (NOT a URL). The system will generate working search links from your searchQuery. NEVER recommend habit tracking apps, habit building apps, or goal tracking apps that compete with a habit coaching platform (no Habitica, Streaks, Fabulous, Coach.me, Todoist, etc.). Focus on resources that teach the SKILL or ACTIVITY of the habit itself. SAFETY: Never generate content promoting violence, illegal activities, exploitation of minors, self-harm, or explicit sexual content.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2500,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content from AI");

      let guidance;
      try {
        guidance = JSON.parse(content);
      } catch (parseError) {
        console.error("Guidance JSON parse error:", content);
        throw new Error("Failed to parse AI guidance response");
      }

      // Normalize templates to structured format if they're just strings
      let normalizedTemplates = guidance.templates || [];
      if (normalizedTemplates.length > 0 && typeof normalizedTemplates[0] === 'string') {
        normalizedTemplates = normalizedTemplates.map((t: string, i: number) => ({
          title: `Template ${i + 1}`,
          content: t,
          format: 'text'
        }));
      }

      // Normalize and validate resources - convert searchQuery to working Google search URLs
      const rawResources = guidance.tools || guidance.resources || [];
      const validTypes = ['article', 'book', 'website', 'course', 'template', 'podcast', 'blog', 'tool', 'video'];
      const competitorKeywords = ['habit track', 'habit build', 'goal track', 'habitica', 'streaks app', 'fabulous', 'coach.me', 'todoist', 'strides', 'way of life', 'habitnow', 'loop habit'];
      
      const buildSearchUrl = (resource: any): string => {
        const query = resource.searchQuery || resource.name || '';
        if (!query) return '';
        const type = (resource.type || '').toLowerCase();
        let suffix = '';
        if (type === 'video') suffix = ' video';
        else if (type === 'book') suffix = ' book';
        else if (type === 'course') suffix = ' course';
        else if (type === 'podcast') suffix = ' podcast';
        else if (type === 'tool' || type === 'template') suffix = ' free tool';
        return `https://www.google.com/search?q=${encodeURIComponent(query + suffix)}`;
      }
      
      const validatedResources = rawResources
        .filter((r: any) => {
          if (!r.name || !r.description) return false;
          const nameLower = (r.name || '').toLowerCase();
          const descLower = (r.description || '').toLowerCase();
          return !competitorKeywords.some(kw => nameLower.includes(kw) || descLower.includes(kw));
        })
        .map((r: any, i: number) => ({
          id: r.id || `resource-${i + 1}`,
          name: r.name,
          type: validTypes.includes(r.type) ? r.type : 'website',
          description: r.description,
          url: buildSearchUrl(r),
          features: Array.isArray(r.features) ? r.features : [],
          pricing: r.pricing || 'Free',
        }));

      const safeGuidance = {
        examples: guidance.examples || [],
        tips: guidance.tips || [],
        tools: validatedResources,
        templates: normalizedTemplates,
        videos: guidance.videos || guidance.videoSuggestions || [],
      };

      res.json({ taskId, ...safeGuidance });
    } catch (error) {
      console.error("Error generating task guidance:", error);
      res.status(500).json({ error: "Failed to generate guidance" });
    }
  });

  // Get AI coaching check-in - personalized motivation and feedback
  app.post("/api/habits/:id/coaching-checkin", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);
      const { feedback, mood } = req.body;
      
      const habit = await storage.getHabit(habitId);
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }

      // Calculate progress stats
      const dailyPlans = habit.dailyPlans || [];
      const completedDays = dailyPlans.filter(p => p.completed).length;
      const totalDays = dailyPlans.length;
      const completionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
      const currentStreak = habit.currentStreak || 0;

      const prompt = `You are a supportive, encouraging AI habit coach. The user is working on: "${habit.title}"

Their progress:
- Completed ${completedDays} of ${totalDays} days (${completionRate}% completion)
- Current streak: ${currentStreak} days
- Total time invested: ${habit.totalTimeSpent || 0} minutes
${habit.aiContext ? `- About them: ${habit.aiContext}` : ''}
${feedback ? `- Their feedback today: "${feedback}"` : ''}
${mood ? `- Current mood: ${mood}` : ''}

Generate a personalized coaching check-in that includes:
1. Acknowledgment of their effort and specific progress
2. Personalized motivation based on their situation
3. One specific tip to improve tomorrow
4. A question to understand how you can help them better

Keep it warm, personal, and under 200 words. Don't be generic - reference their specific habit and progress.

Return JSON:
{
  "greeting": "Personalized greeting",
  "progressAcknowledgment": "Specific recognition of their progress",
  "motivation": "Personalized motivation message",
  "tipForTomorrow": "One specific, actionable tip",
  "questionForUser": "A caring question to get feedback",
  "encouragingClose": "Warm closing message"
}`;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an empathetic, supportive habit coach. Be warm and personal, not generic. Always return valid JSON. Never mention specific third-party apps, brands, or services by name. SAFETY: Never generate content promoting violence, illegal activities, exploitation of minors, self-harm, or explicit sexual content." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 600,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content from AI");

      const checkin = JSON.parse(content);
      res.json(checkin);
    } catch (error) {
      console.error("Error generating coaching check-in:", error);
      res.status(500).json({ error: "Failed to generate check-in" });
    }
  });

  app.post("/api/habits/:id/coaching-followup", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);
      const { conversationHistory, userMessage } = req.body;

      if (!userMessage || typeof userMessage !== "string" || userMessage.trim().length === 0) {
        return res.status(400).json({ error: "Message is required" });
      }
      if (!Array.isArray(conversationHistory)) {
        return res.status(400).json({ error: "Conversation history is required" });
      }
      if (conversationHistory.filter((m: any) => m.role === "assistant").length >= 3) {
        return res.status(400).json({ error: "Maximum follow-up exchanges reached" });
      }

      const user = await storage.getUser(userId);
      const isPro = user?.subscriptionTier === "pro" || user?.subscriptionTier === "premium" || user?.isAdmin;
      if (!isPro) {
        return res.status(403).json({ error: "Coaching follow-ups require a Pro or Premium subscription" });
      }

      const habit = await storage.getHabit(habitId);
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }

      const dailyPlans = habit.dailyPlans || [];
      const completedDays = dailyPlans.filter((p: any) => p.completed).length;
      const totalDays = dailyPlans.length;
      const completionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

      const systemPrompt = `You are a supportive, encouraging AI habit coach having a conversation with a user about their habit: "${habit.title}".
Their progress: ${completedDays}/${totalDays} days completed (${completionRate}%), streak: ${habit.currentStreak || 0} days.
${habit.aiContext ? `About them: ${habit.aiContext}` : ''}

Keep responses warm, personal, concise (under 100 words), and actionable. Reference their specific habit and situation.
Never mention specific third-party apps, brands, or services by name.
SAFETY: Never generate content promoting violence, illegal activities, exploitation of minors, self-harm, or explicit sexual content.
Respond in plain text, not JSON.`;

      const messages: any[] = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.slice(-6).map((m: any) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        })),
        { role: "user", content: userMessage.trim() },
      ];

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 300,
      });

      const reply = response.choices[0].message.content;
      if (!reply) throw new Error("No content from AI");

      res.json({ reply });
    } catch (error) {
      console.error("Error generating coaching follow-up:", error);
      res.status(500).json({ error: "Failed to generate follow-up" });
    }
  });

  // Get daily motivation message
  app.get("/api/habits/:id/daily-motivation", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);
      
      const habit = await storage.getHabit(habitId);
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }

      const userForMotiv = await storage.getUser(userId);
      const todayMotiv = getUserToday(userForMotiv?.timezone);
      const todayPlan = (habit.dailyPlans || []).find(p => p.date === todayMotiv);
      const tasksToday = todayPlan?.tasks || [];
      const completedToday = tasksToday.filter(t => t.completed).length;

      const userTz = userForMotiv?.timezone || "America/Chicago";
      let userLocalHour = new Date().getHours();
      let timeOfDay = "morning";
      try {
        const parts = new Intl.DateTimeFormat("en-US", { timeZone: userTz, hour: "numeric", hour12: false }).formatToParts(new Date());
        userLocalHour = parseInt(parts.find(p => p.type === "hour")?.value || "12");
      } catch {}
      if (userLocalHour >= 5 && userLocalHour < 12) timeOfDay = "morning";
      else if (userLocalHour >= 12 && userLocalHour < 17) timeOfDay = "afternoon";
      else if (userLocalHour >= 17 && userLocalHour < 21) timeOfDay = "evening";
      else timeOfDay = "night";

      const prompt = `Generate a brief, personalized motivation for someone working on: "${habit.title}"

Current time of day for user: ${timeOfDay} (${userLocalHour}:00 local time)
Today's plan: ${tasksToday.length} tasks, ${completedToday} completed
Current streak: ${habit.currentStreak || 0} days
${todayPlan?.focus ? `Today's focus: ${todayPlan.focus}` : ''}

IMPORTANT: Tailor your message to the time of day. If it's evening or night, do NOT say "start your day" or "good morning". Reference the appropriate time context naturally (e.g. "wind down", "finish strong", "reflect on today", "great progress today").

Return JSON with:
{
  "morningMotivation": "Brief inspiring message appropriate for the time of day (1-2 sentences)",
  "focusReminder": "What to focus on right now specifically",
  "quickTip": "One quick tip for success",
  "streakMessage": "Message about their streak (encouraging if high, supportive if low)"
}`;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an encouraging habit coach. Be brief, specific, and motivating. Return valid JSON. Never mention specific third-party apps, brands, or services by name. SAFETY: Never generate content promoting violence, illegal activities, exploitation of minors, self-harm, or explicit sexual content." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 400,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content from AI");

      const motivation = JSON.parse(content);
      res.json(motivation);
    } catch (error) {
      console.error("Error generating daily motivation:", error);
      res.status(500).json({ error: "Failed to generate motivation" });
    }
  });

  // Track last sync time per user to avoid excessive Stripe API calls
  const lastSyncTimes = new Map<string, number>();
  const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes between syncs per user
  const paymentStatusCache = new Map<string, { result: any; timestamp: number }>();

  // Check user payment status and trial - AUTO-SYNC from Stripe if needed
  app.get("/api/payment-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const userEmail = req.user!.claims.email;
      
      const cached = paymentStatusCache.get(userId);
      if (cached && Date.now() - cached.timestamp < SYNC_INTERVAL_MS) {
        return res.json(cached.result);
      }
      
      let user = await storage.getUser(userId);
      
      // Check if we should sync (rate limit: once per 5 minutes per user)
      const lastSync = lastSyncTimes.get(userId) || 0;
      const shouldSync = Date.now() - lastSync > SYNC_INTERVAL_MS;
      
      // AUTO-SYNC: Check Stripe if user doesn't have paid status, OR if enough time has passed
      // This handles: new payments, tier corrections, cancellations
      if (user && userEmail && shouldSync) {
        try {
          const stripe = await getUncachableStripeClient();
          
          // Find customer by email or stripeCustomerId
          let customerId = user.stripeCustomerId;
          
          if (!customerId) {
            const customers = await stripe.customers.list({
              email: userEmail,
              limit: 1,
            });
            
            if (customers.data.length > 0) {
              customerId = customers.data[0].id;
              await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId));
            }
          }

          if (customerId) {
            // Check for active/trialing subscriptions
            const subscriptions = await stripe.subscriptions.list({
              customer: customerId,
              status: 'active',
              limit: 5,
            });
            
            let activeSubscription = subscriptions.data[0];
            
            if (!activeSubscription) {
              const trialingSubs = await stripe.subscriptions.list({
                customer: customerId,
                status: 'trialing',
                limit: 5,
              });
              activeSubscription = trialingSubs.data[0];
            }

            if (activeSubscription) {
              // Determine tier from subscription
              let tier: 'pro' | 'premium' = 'pro';
              if (activeSubscription.metadata?.tier) {
                tier = activeSubscription.metadata.tier as 'pro' | 'premium';
              } else if (activeSubscription.items?.data[0]?.price) {
                const priceAmount = activeSubscription.items.data[0].price.unit_amount || 0;
                if (priceAmount >= 1500) {
                  tier = 'premium';
                }
              }

              // Only update if something changed
              if (!user.hasPaid || user.subscriptionTier !== tier || user.subscriptionStatus !== activeSubscription.status) {
                await db.update(users).set({
                  hasPaid: true,
                  subscriptionTier: tier,
                  subscriptionStatus: activeSubscription.status,
                  subscriptionId: activeSubscription.id,
                }).where(eq(users.id, userId));
                
                console.log(`Auto-synced subscription for ${userEmail}: tier=${tier}, status=${activeSubscription.status}`);
                
                // Refresh user data
                user = await storage.getUser(userId);
              }
            } else if (user.hasPaid && !user.isAdmin) {
              // User was marked as paid but has no active subscription - handle cancellation
              // Only downgrade if no active/trialing subscription exists
              // Never downgrade admin/owner accounts
              await db.update(users).set({
                hasPaid: false,
                subscriptionTier: 'free',
                subscriptionStatus: 'canceled',
              }).where(eq(users.id, userId));
              
              console.log(`Subscription canceled/expired for ${userEmail} - downgraded to free`);
              user = await storage.getUser(userId);
            }
          }
          
          // Mark sync time
          lastSyncTimes.set(userId, Date.now());
        } catch (stripeError: any) {
          console.error("Stripe auto-sync error (non-fatal):", stripeError?.message);
          // Continue with existing user data
        }
      }
      
      const isAdmin = user?.isAdmin || false;
      
      const result = { 
        hasPaid: user?.hasPaid || isAdmin,
      };
      paymentStatusCache.set(userId, { result, timestamp: Date.now() });
      res.json(result);
    } catch (error) {
      console.error("Error checking payment status:", error);
      res.status(500).json({ error: "Failed to check payment status" });
    }
  });

  // === FEEDBACK ROUTES ===
  
  // Zod schema for feedback submission
  const feedbackSubmitSchema = z.object({
    type: z.enum(["feedback", "bug", "feature", "support"]).default("feedback"),
    subject: z.string().min(1, "Subject is required").max(200),
    message: z.string().min(1, "Message is required").max(5000),
  });
  
  // Zod schema for admin feedback updates
  const feedbackUpdateSchema = z.object({
    status: z.enum(["new", "in_progress", "resolved", "closed"]).optional(),
    priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    adminNotes: z.string().max(5000).optional(),
  });
  
  // Submit feedback (authenticated users)
  app.post("/api/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const userEmail = req.user!.claims.email;
      const userName = `${req.user!.claims.first_name || ''} ${req.user!.claims.last_name || ''}`.trim();
      
      const parseResult = feedbackSubmitSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0].message });
      }
      
      const { type, subject, message } = parseResult.data;
      
      const result = await db.insert(feedback).values({
        userId,
        userEmail,
        userName: userName || undefined,
        type,
        subject,
        message,
      }).returning();
      
      res.json({ success: true, feedback: result[0] });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  // Get all feedback (admin only)
  app.get("/api/admin/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      
      // Check if user is admin
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user[0]?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const result = await db.select().from(feedback).orderBy(sql`${feedback.createdAt} DESC`);
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  // Update feedback status (admin only)
  app.patch("/api/admin/feedback/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      
      // Check if user is admin
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user[0]?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const feedbackId = Number(req.params.id);
      if (isNaN(feedbackId)) {
        return res.status(400).json({ error: "Invalid feedback ID" });
      }
      
      const parseResult = feedbackUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0].message });
      }
      
      const { status, priority, adminNotes } = parseResult.data;
      
      const result = await db.update(feedback)
        .set({
          ...(status && { status }),
          ...(priority && { priority }),
          ...(adminNotes !== undefined && { adminNotes }),
          updatedAt: new Date(),
        })
        .where(eq(feedback.id, feedbackId))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Feedback not found" });
      }
      
      res.json(result[0]);
    } catch (error) {
      console.error("Error updating feedback:", error);
      res.status(500).json({ error: "Failed to update feedback" });
    }
  });

  // Admin: Send bulk emails to users
  const adminEmailSchema = z.object({
    subject: z.string().min(1, "Subject is required").max(200),
    body: z.string().min(1, "Email body is required").max(10000),
    recipientFilter: z.enum(["all", "free", "pro", "premium"]).default("all"),
    singleEmail: z.string().email().optional(),
  });

  app.post("/api/admin/emails/send", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const parseResult = adminEmailSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0].message });
      }

      const { subject, body, recipientFilter, singleEmail } = parseResult.data;

      let toEmails: string[] = [];

      if (singleEmail) {
        toEmails = [singleEmail];
      } else {
        const allUsers = await db.select({ email: users.email, tier: users.subscriptionTier }).from(users);
        toEmails = allUsers
          .filter(u => u.email && !u.email.endsWith('@example.com') && !u.email.endsWith('@test.com'))
          .filter(u => recipientFilter === "all" || u.tier === recipientFilter)
          .map(u => u.email!);
      }

      if (toEmails.length === 0) {
        return res.status(400).json({ error: "No recipients found for the selected filter" });
      }

      console.log(`Admin email: sending to ${toEmails.length} recipients, subject: "${subject}"`);
      console.log(`Admin email: recipients:`, toEmails);

      const results = await sendAdminBulkEmail({ toEmails, subject, body });

      console.log(`Admin email result: sent=${results.sent}, failed=${results.failed}, errors:`, results.errors);

      res.json({
        success: true,
        totalRecipients: toEmails.length,
        sent: results.sent,
        failed: results.failed,
        errors: results.errors.slice(0, 10),
      });
    } catch (error) {
      console.error("Error sending admin email:", error);
      res.status(500).json({ error: "Failed to send emails" });
    }
  });

  app.get("/api/admin/emails/recipients", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const filter = (req.query.filter as string) || "all";
      const allUsers = await db.select({
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        tier: users.subscriptionTier,
      }).from(users);

      const filtered = allUsers
        .filter(u => u.email && !u.email.endsWith('@example.com') && !u.email.endsWith('@test.com'))
        .filter(u => filter === "all" || u.tier === filter);

      res.json({
        count: filtered.length,
        recipients: filtered.map(u => ({
          email: u.email,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
          tier: u.tier,
        })),
      });
    } catch (error) {
      console.error("Error fetching email recipients:", error);
      res.status(500).json({ error: "Failed to fetch recipients" });
    }
  });

  app.get("/api/admin/emails/welcome-campaign/preview", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const testDomains = ['@example.com', '@test.com', '@example.org'];
      const allUsers = await db.select({ email: users.email, tier: users.subscriptionTier }).from(users);
      const freeUsers = allUsers
        .filter(u => u.email && !testDomains.some(d => u.email!.toLowerCase().endsWith(d)))
        .filter(u => u.tier === "free");

      res.json({ count: freeUsers.length });
    } catch (error) {
      console.error("Error previewing welcome campaign:", error);
      res.status(500).json({ error: "Failed to preview campaign" });
    }
  });

  app.post("/api/admin/emails/welcome-campaign", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const testDomains = ['@example.com', '@test.com', '@example.org'];
      const allUsers = await db.select({ email: users.email, tier: users.subscriptionTier }).from(users);
      const freeEmails = allUsers
        .filter(u => u.email && !testDomains.some(d => u.email!.toLowerCase().endsWith(d)))
        .filter(u => u.tier === "free")
        .map(u => u.email!);

      if (freeEmails.length === 0) {
        return res.status(400).json({ error: "No free-tier users with email addresses found" });
      }

      console.log(`Welcome campaign: sending to ${freeEmails.length} free-tier users`);

      const results = await sendWelcomeCampaignEmail({ toEmails: freeEmails });

      console.log(`Welcome campaign result: sent=${results.sent}, failed=${results.failed}`);

      res.json({
        success: true,
        totalRecipients: freeEmails.length,
        sent: results.sent,
        failed: results.failed,
        errors: results.errors.slice(0, 10),
      });
    } catch (error) {
      console.error("Error sending welcome campaign:", error);
      res.status(500).json({ error: "Failed to send welcome campaign" });
    }
  });

  // Admin: Fix all habits with reversed daily plan dates
  app.post("/api/admin/fix-habit-dates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      // Get all habits from all users
      const allHabits = await db.select().from(habits);
      let fixedCount = 0;
      
      for (const habit of allHabits) {
        const dailyPlans = habit.dailyPlans as any[] || [];
        
        if (dailyPlans.length > 1) {
          // Check if dates are in wrong order (descending instead of ascending)
          const firstDate = dailyPlans[0]?.date;
          const lastDate = dailyPlans[dailyPlans.length - 1]?.date;
          
          // If first date is after last date, the array is reversed
          if (firstDate && lastDate && firstDate > lastDate) {
            // Sort by dayNumber if available, otherwise by date ascending
            const sortedPlans = [...dailyPlans].sort((a, b) => {
              if (a.dayNumber && b.dayNumber) {
                return a.dayNumber - b.dayNumber;
              }
              return a.date.localeCompare(b.date);
            });
            
            // Update the habit with correctly sorted plans
            await db.update(habits)
              .set({ dailyPlans: sortedPlans })
              .where(eq(habits.id, habit.id));
            
            fixedCount++;
          }
        }
      }
      
      res.json({ success: true, fixedCount, message: `Fixed ${fixedCount} habits with reversed dates` });
    } catch (error) {
      console.error("Error fixing habit dates:", error);
      res.status(500).json({ error: "Failed to fix habit dates" });
    }
  });

  // Admin: Fix user subscription status by email
  app.post("/api/admin/fix-subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const adminUser = await storage.getUser(userId);
      
      if (!adminUser?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { email, tier, hasPaid } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      // Find user by email (case-insensitive)
      const [user] = await db.select()
        .from(users)
        .where(sql`LOWER(email) = LOWER(${email})`)
        .limit(1);
      
      if (!user) {
        return res.status(404).json({ error: `User not found with email: ${email}` });
      }
      
      // Update subscription status
      const updateData: any = {};
      if (tier !== undefined) updateData.subscriptionTier = tier;
      if (hasPaid !== undefined) updateData.hasPaid = hasPaid;
      if (tier === 'pro' || tier === 'premium') {
        updateData.hasPaid = true;
        updateData.subscriptionStatus = 'active';
      }
      
      await db.update(users)
        .set(updateData)
        .where(eq(users.id, user.id));
      
      const [updatedUser] = await db.select().from(users).where(eq(users.id, user.id));
      
      res.json({ 
        success: true, 
        message: `Updated subscription for ${email}`,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          subscriptionTier: updatedUser.subscriptionTier,
          hasPaid: updatedUser.hasPaid,
          subscriptionStatus: updatedUser.subscriptionStatus,
        }
      });
    } catch (error) {
      console.error("Error fixing subscription:", error);
      res.status(500).json({ error: "Failed to fix subscription" });
    }
  });

  // Admin: Seed forum categories and starter posts
  app.post("/api/admin/seed-forum", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const adminUser = await storage.getUser(userId);
      
      if (!adminUser?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      // Check if categories already exist
      const existingCategories = await db.select().from(forumCategories);
      if (existingCategories.length > 0) {
        return res.json({ message: "Forum already seeded", categoriesCount: existingCategories.length });
      }
      
      // Create system user for seed posts if not exists
      const systemUserId = "habit-builder-team";
      const existingSystemUser = await db.select().from(users).where(eq(users.id, systemUserId));
      if (!existingSystemUser.length) {
        await db.insert(users).values({
          id: systemUserId,
          email: "team@habitbuilder.app",
          firstName: "HabitBuilder",
          lastName: "Team",
          subscriptionTier: "premium",
        });
        await db.insert(userProfiles).values({
          userId: systemUserId,
          displayName: "Habit Builder Team",
          bio: "The official Habit Builder team account. We share tips, updates, and community guidelines.",
          profileVisible: true,
        });
      }
      
      // Insert categories
      const categoriesData = [
        { name: "Progress Updates", slug: "progress-updates", description: "Share your habit journey milestones and celebrate wins", icon: "TrendingUp", color: "green", sortOrder: 1 },
        { name: "Tips & Motivation", slug: "tips-motivation", description: "Share advice, tips, and inspiring content", icon: "Lightbulb", color: "yellow", sortOrder: 2 },
        { name: "Accountability Partners", slug: "accountability-partners", description: "Find partners to keep you on track", icon: "Users", color: "blue", sortOrder: 3 },
        { name: "Questions & Help", slug: "questions-help", description: "Ask questions and get support from the community", icon: "HelpCircle", color: "purple", sortOrder: 4 },
        { name: "General Discussion", slug: "general-discussion", description: "Chat about anything habit-related", icon: "MessageCircle", color: "primary", sortOrder: 5 },
      ];
      
      for (const cat of categoriesData) {
        await db.insert(forumCategories).values(cat);
      }
      
      // Get inserted categories for their IDs
      const insertedCategories = await db.select().from(forumCategories);
      const catMap: Record<string, number> = {};
      for (const c of insertedCategories) {
        catMap[c.slug] = c.id;
      }
      
      // Seed posts
      const now = new Date();
      const posts = [
        { categoryId: catMap["progress-updates"], title: "Welcome to Progress Updates!", content: "This is the place to share your habit journey milestones! Whether you've completed your first week of morning workouts, hit a 30-day meditation streak, or finally established that reading habit you've been working on – we want to hear about it!\n\nCelebrating wins, big and small, helps reinforce positive behaviors and inspires others in the community. Don't be shy – your progress might be exactly the motivation someone else needs today!", isPinned: true, createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
        { categoryId: catMap["progress-updates"], title: "My First Week Building a Morning Routine", content: "Just completed my first full week of waking up at 6 AM! It was tough at first, but having a clear action plan made all the difference.\n\nWhat helped me:\n- Setting my alarm across the room\n- Preparing my workout clothes the night before\n- Having a reward (coffee!) waiting for me\n\nAnyone else working on their morning routine? Would love to hear your strategies!", isPinned: false, createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
        { categoryId: catMap["tips-motivation"], title: "The 2-Minute Rule: Start Small, Win Big", content: "One of the most powerful habit-building strategies I've discovered is the 2-Minute Rule from James Clear's Atomic Habits.\n\nThe idea is simple: when you start a new habit, it should take less than two minutes to do.\n\nExamples:\n- \"Read before bed\" becomes \"Read one page\"\n- \"Do yoga\" becomes \"Roll out my yoga mat\"\n- \"Study\" becomes \"Open my notes\"\n\nThe point isn't to do the full habit at first – it's to master the art of showing up. Once you're consistent with the 2-minute version, you can gradually expand.\n\nWhat 2-minute versions of your habits have worked for you?", isPinned: true, createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
        { categoryId: catMap["tips-motivation"], title: "Habit Stacking: Connect New Habits to Existing Ones", content: "Here's a technique that's been a game-changer for me: habit stacking!\n\nThe formula is: \"After [CURRENT HABIT], I will [NEW HABIT].\"\n\nMy stacks:\n- After I pour my morning coffee, I will write in my gratitude journal\n- After I sit down at my desk, I will meditate for 5 minutes\n- After I finish dinner, I will take a 10-minute walk\n\nThe key is to link your new habit to something you already do automatically. Your existing habits become triggers for new ones!\n\nShare your habit stacks below!", isPinned: false, createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
        { categoryId: catMap["accountability-partners"], title: "Welcome! How Accountability Partners Work", content: "Welcome to the Accountability Partners category! This is where you can find someone to help keep you on track with your habits.\n\nHow it works:\n1. Post what habit you're working on and what kind of support you need\n2. Connect with someone who has similar goals or schedules\n3. Check in regularly (daily, weekly – whatever works for you both)\n4. Celebrate wins together and support each other through challenges\n\nResearch shows that having an accountability partner can increase your chances of success by up to 95%! So don't be shy – put yourself out there and find your habit buddy.", isPinned: true, createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
        { categoryId: catMap["accountability-partners"], title: "Looking for a Reading Habit Partner!", content: "Hi everyone! I'm trying to build a daily reading habit – aiming for 30 minutes each day.\n\nI'm reading a mix of non-fiction (currently on Atomic Habits) and fiction. Would love to find someone who:\n- Is also working on a reading habit\n- Wants to do daily or weekly check-ins\n- Maybe even wants to read the same books and discuss!\n\nI'm in the EST timezone and usually read in the evenings. Drop a comment if you're interested!", isPinned: false, createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
        { categoryId: catMap["questions-help"], title: "New Here? Start with These Common Questions", content: "Welcome to the Questions & Help section! Here are answers to some frequently asked questions:\n\n**Q: How many habits should I track at once?**\nA: Start with just 1-2 habits. It's tempting to overhaul your entire life, but focusing on fewer habits leads to better success rates.\n\n**Q: What if I miss a day?**\nA: Don't break the chain twice! Missing one day won't ruin your progress, but missing two starts a new pattern. Get back on track immediately.\n\n**Q: How long does it take to form a habit?**\nA: Research suggests 18-254 days, with an average of 66 days. It varies by person and habit complexity.\n\n**Q: Should I track habits daily or weekly?**\nA: Daily habits are easier to maintain because they become automatic. Weekly habits require more conscious effort.\n\nHave more questions? Post them here and the community will help!", isPinned: true, createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
        { categoryId: catMap["questions-help"], title: "How do you handle weekends?", content: "I've been doing great with my habits Monday through Friday, but weekends completely derail me. Different schedule, social events, sleeping in...\n\nHow do you all maintain consistency on weekends? Do you:\n- Keep the exact same routine?\n- Have a modified weekend version?\n- Give yourself permission to take weekends off?\n\nWould love to hear what works for you!", isPinned: false, createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000) },
        { categoryId: catMap["general-discussion"], title: "Welcome to the Habit Builder Community!", content: "Hey everyone! Welcome to our community forum. This is a space for all of us who are on the journey of building better habits.\n\nA few guidelines:\n- Be supportive and encouraging\n- Share what's working for you\n- Ask questions freely\n- Celebrate others' wins\n- Remember we're all at different stages of our journey\n\nThis community is what we make it together. Looking forward to growing with all of you!", isPinned: true, createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000) },
        { categoryId: catMap["general-discussion"], title: "Books That Changed How I Think About Habits", content: "Sharing some books that have been game-changers for my habit journey:\n\n1. **Atomic Habits** by James Clear - The modern bible of habit formation. Clear, practical, and actionable.\n\n2. **The Power of Habit** by Charles Duhigg - Great for understanding the science behind why habits work.\n\n3. **Tiny Habits** by BJ Fogg - Perfect if you struggle with motivation. All about starting incredibly small.\n\n4. **Deep Work** by Cal Newport - Not strictly about habits, but changed how I think about focus and productivity habits.\n\n5. **The Compound Effect** by Darren Hardy - Shows how small consistent actions lead to massive results over time.\n\nWhat books have influenced your habit journey? Always looking for recommendations!", isPinned: false, createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
      ];
      
      for (const post of posts) {
        await db.insert(forumPosts).values({
          ...post,
          userId: systemUserId,
        });
      }
      
      // Update category post counts
      for (const slug of Object.keys(catMap)) {
        const count = posts.filter(p => p.categoryId === catMap[slug]).length;
        await db.update(forumCategories)
          .set({ postsCount: count })
          .where(eq(forumCategories.id, catMap[slug]));
      }
      
      res.json({ success: true, message: "Forum seeded successfully", categoriesCount: 5, postsCount: 10 });
    } catch (error) {
      console.error("Error seeding forum:", error);
      res.status(500).json({ error: "Failed to seed forum" });
    }
  });

  // Admin: List all users with subscription status
  app.get("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        subscriptionTier: users.subscriptionTier,
        hasPaid: users.hasPaid,
        subscriptionStatus: users.subscriptionStatus,
        stripeCustomerId: users.stripeCustomerId,
        trialEndsAt: users.trialEndsAt,
        createdAt: users.createdAt,
      }).from(users);
      
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/users/:userId/activity", isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { userId } = req.params;
      const targetUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!targetUser.length) {
        return res.status(404).json({ error: "User not found" });
      }

      const userHabits = await db.select({
        id: habits.id,
        title: habits.title,
        currentStreak: habits.currentStreak,
        longestStreak: habits.longestStreak,
        totalTimeSpent: habits.totalTimeSpent,
        setupComplete: habits.setupComplete,
        archived: habits.archived,
        category: habits.category,
        createdAt: habits.createdAt,
      }).from(habits).where(eq(habits.userId, userId));

      const user = targetUser[0];
      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          subscriptionTier: user.subscriptionTier,
          subscriptionStatus: user.subscriptionStatus,
          hasPaid: user.hasPaid,
          stripeCustomerId: user.stripeCustomerId,
          trialEndsAt: user.trialEndsAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          xpPoints: user.xpPoints,
          level: user.level,
          dailyChallengesCompleted: user.dailyChallengesCompleted,
          onboardingComplete: user.onboardingComplete,
          timezone: user.timezone,
          isFoundingMember: user.isFoundingMember,
          billingInterval: user.billingInterval,
        },
        habits: userHabits,
      });
    } catch (error) {
      console.error("Error fetching user activity:", error);
      res.status(500).json({ error: "Failed to fetch user activity" });
    }
  });

  app.patch("/api/admin/users/:userId/subscription", isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const admin = await storage.getUser(adminId);
      
      if (!admin?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { userId } = req.params;
      const { subscriptionTier, hasPaid } = req.body;
      
      const updateData: any = {};
      if (subscriptionTier) updateData.subscriptionTier = subscriptionTier;
      if (hasPaid !== undefined) updateData.hasPaid = hasPaid;
      if (hasPaid) updateData.subscriptionStatus = 'active';
      
      await db.update(users).set(updateData).where(eq(users.id, userId));
      
      const updatedUser = await storage.getUser(userId);
      console.log(`Admin ${adminId} updated user ${userId} subscription to ${subscriptionTier}`);
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error updating user subscription:", error);
      res.status(500).json({ error: "Failed to update user subscription" });
    }
  });

  // Fix habit dates for the current user
  app.post("/api/fix-my-habits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      
      // Get all habits for this user
      const userHabits = await db.select().from(habits).where(eq(habits.userId, userId));
      
      let fixed = 0;
      for (const habit of userHabits) {
        if (!habit.dailyPlans || !Array.isArray(habit.dailyPlans) || habit.dailyPlans.length < 2) {
          continue;
        }
        
        const plans = habit.dailyPlans as any[];
        const firstDate = new Date(plans[0].date);
        const lastDate = new Date(plans[plans.length - 1].date);
        
        // Check if dates are reversed (first date is later than last date)
        if (firstDate > lastDate) {
          // Sort by dayNumber ascending
          const sortedPlans = [...plans].sort((a, b) => a.dayNumber - b.dayNumber);
          
          await db.update(habits)
            .set({ dailyPlans: sortedPlans as any })
            .where(eq(habits.id, habit.id));
          
          fixed++;
          console.log(`Fixed reversed dates for habit: ${habit.title} (user: ${userId})`);
        }
      }
      
      res.json({ 
        success: true, 
        fixed,
        message: fixed > 0 ? `Fixed ${fixed} habit(s) with reversed dates` : "All habits already have correct date ordering"
      });
    } catch (error) {
      console.error("Error fixing habits:", error);
      res.status(500).json({ error: "Failed to fix habits" });
    }
  });

  // ===== ACHIEVEMENTS API =====
  
  // Get user achievements
  app.get("/api/achievements", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;

      const achievements = await db.select()
        .from(userAchievements)
        .where(eq(userAchievements.userId, userId));
      res.json(achievements);
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ error: "Failed to fetch achievements" });
    }
  });

  // Valid achievement IDs
  const VALID_ACHIEVEMENT_IDS = [
    "streak_3", "streak_7", "streak_14", "streak_30", "streak_100",
    "sessions_5", "sessions_25", "sessions_100",
    "time_60", "time_300", "time_1200",
    "habits_3", "habits_5", "first_plan"
  ];

  // Unlock an achievement (internal use, called when conditions are met)
  app.post("/api/achievements/unlock", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { achievementId } = req.body;
      
      if (!achievementId || typeof achievementId !== 'string') {
        return res.status(400).json({ error: "Achievement ID required" });
      }
      
      // Validate achievement ID exists in our definitions
      if (!VALID_ACHIEVEMENT_IDS.includes(achievementId)) {
        return res.status(400).json({ error: "Invalid achievement ID" });
      }
      
      // Check if already unlocked
      const existing = await db.select()
        .from(userAchievements)
        .where(sql`${userAchievements.userId} = ${userId} AND ${userAchievements.achievementId} = ${achievementId}`)
        .limit(1);
      
      if (existing.length > 0) {
        return res.json({ alreadyUnlocked: true, achievement: existing[0] });
      }
      
      // Unlock achievement
      const result = await db.insert(userAchievements).values({
        userId,
        achievementId,
      }).returning();
      
      res.json({ unlocked: true, achievement: result[0] });
    } catch (error) {
      console.error("Error unlocking achievement:", error);
      res.status(500).json({ error: "Failed to unlock achievement" });
    }
  });

  // ===== VOICE NOTES API (Premium feature) =====
  
  // Transcribe audio to text (for voice notes in guided sessions)
  app.post("/api/transcribe", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      
      // Check if user has Premium subscription
      const isPremium = user?.subscriptionTier === 'premium' || user?.isAdmin;
      if (!isPremium) {
        return res.status(403).json({ error: "Voice notes require Premium subscription" });
      }
      
      const { audio } = req.body; // base64 encoded audio
      if (!audio) {
        return res.status(400).json({ error: "Audio data required" });
      }
      
      // Import transcription utilities
      const { ensureCompatibleFormat, speechToText } = await import('./replit_integrations/audio/client');
      
      // Convert base64 to buffer and ensure compatible format
      const audioBuffer = Buffer.from(audio, 'base64');
      console.log("Audio buffer size:", audioBuffer.length, "bytes");
      
      let compatibleBuffer: Buffer;
      let format: "wav" | "mp3";
      
      try {
        const result = await ensureCompatibleFormat(audioBuffer);
        compatibleBuffer = result.buffer;
        format = result.format;
        console.log("Converted audio to format:", format, "size:", compatibleBuffer.length);
      } catch (conversionError: any) {
        console.error("Audio conversion error:", conversionError?.message || conversionError);
        return res.status(400).json({ error: "Failed to process audio format. Please try again." });
      }
      
      // Transcribe using OpenAI
      try {
        const transcript = await speechToText(compatibleBuffer, format);
        res.json({ transcript });
      } catch (transcriptionError: any) {
        console.error("OpenAI transcription error:", transcriptionError?.message || transcriptionError);
        return res.status(500).json({ error: "Transcription service error. Please try again." });
      }
    } catch (error: any) {
      console.error("Error transcribing audio:", error?.message || error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });

  // Text-to-speech endpoint (Premium feature)
  app.post("/api/text-to-speech", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      
      // Check if user has Premium subscription
      const isPremium = user?.subscriptionTier === 'premium' || user?.isAdmin;
      if (!isPremium) {
        return res.status(403).json({ error: "Text-to-speech requires Premium subscription" });
      }
      
      const { text } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required" });
      }
      
      // Limit text length for TTS
      const trimmedText = text.slice(0, 2000);
      
      const { textToSpeech } = await import('./replit_integrations/audio/client');
      const audioBuffer = await textToSpeech(trimmedText, "shimmer", "mp3");
      
      res.json({ audio: audioBuffer.toString('base64') });
    } catch (error: any) {
      console.error("Error with text-to-speech:", error?.message || error);
      res.status(500).json({ error: "Text-to-speech service error" });
    }
  });

  // ===== HABIT TEMPLATES API =====
  
  // Get all habit templates
  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await db.select()
        .from(habitTemplates)
        .orderBy(sql`${habitTemplates.usageCount} DESC`);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.get("/api/public-stats", async (_req, res) => {
    try {
      const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
      const totalHabits = await db.select({ count: sql<number>`count(*)` }).from(habits);
      res.json({
        users: Number(totalUsers[0]?.count || 0),
        habits: Number(totalHabits[0]?.count || 0),
      });
    } catch (e) {
      res.json({ users: 0, habits: 0 });
    }
  });

  // Public demo: generate a sample habit plan using AI (rate-limited, no auth required)
  const demoPlanLimiter = new Map<string, { count: number; resetAt: number }>();
  app.post("/api/demo-plan", async (req, res) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || "unknown";
      const now = Date.now();
      const limit = demoPlanLimiter.get(clientIp);
      if (limit && limit.resetAt > now) {
        if (limit.count >= 5) {
          return res.status(429).json({ error: "You've reached the demo limit. Sign up for unlimited AI coaching!" });
        }
        limit.count++;
      } else {
        demoPlanLimiter.set(clientIp, { count: 1, resetAt: now + 3600000 });
      }

      const { habitGoal } = req.body;
      if (!habitGoal || typeof habitGoal !== "string" || habitGoal.trim().length < 3 || habitGoal.length > 200) {
        return res.status(400).json({ error: "Please enter a habit goal (3-200 characters)." });
      }

      const safetyCheck = checkContentSafety(habitGoal);
      if (!safetyCheck.allowed) {
        return res.status(400).json({ error: safetyCheck.message || "That goal isn't supported. Try something positive and constructive!" });
      }

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert habit coaching AI powered by behavioral psychology. You design plans using proven behavior change science: behavior design principles (start absurdly small), the 4 Laws of Behavior Change (make it obvious, attractive, easy, satisfying), and the Cue-Routine-Reward loop. Generate a habit plan that shows users how REAL behavior change works. Return ONLY valid JSON with this structure:
{
  "title": "Compelling plan title that hints at the science-backed approach",
  "summary": "1-2 sentence summary explaining the behavior change approach — mention why starting small works",
  "daily": [
    {"task": "Specific daily action with CUE and REWARD built in (e.g., 'After your morning coffee [CUE], do 5 push-ups [ROUTINE], then mark your streak [REWARD]')", "duration": "5 min", "xp": 25},
    {"task": "Second daily action that builds on the first with slight progression", "duration": "10 min", "xp": 35},
    {"task": "Third daily action focused on environment design or reflection", "duration": "15 min", "xp": 50}
  ],
  "weekly": [
    {"task": "Weekly milestone review — assess what's becoming automatic and what needs adjustment", "duration": "20 min", "xp": 75},
    {"task": "Weekly stretch goal — increase intensity by 10-20% from starting level", "duration": "15 min", "xp": 60}
  ],
  "monthly": [
    {"task": "Monthly identity reflection — 'I am now someone who...' assessment", "xp": 150},
    {"task": "Monthly progressive overload — plan next month's increased targets", "xp": 100}
  ],
  "insight": "One specific insight from behavior change research (cite the principle, e.g., 'Research shows that emotions create habits, not repetition — celebrating tiny wins literally wires the habit into your brain')",
  "tips": ["Tip grounded in specific science", "Practical technique tip", "Mindset/identity tip"],
  "resources": [
    {"name": "Resource name", "type": "article", "searchQuery": "descriptive generic search terms without brand names"},
    {"name": "Resource name", "type": "book", "searchQuery": "topic area guide for beginners"},
    {"name": "Resource name", "type": "video", "searchQuery": "descriptive technique tutorial"}
  ],
  "coachMessage": "A personalized message that explains WHY starting small works and how this plan will progressively build to their full goal. Reference behavior design principles. 2-3 sentences.",
  "stackSuggestion": "Suggest a complementary habit that pairs well and explain the habit stacking principle behind it"
}
Be specific, practical, and grounded in behavior science. Every task should make the user think 'this coach really knows how habits actually form.' Include realistic time estimates and XP rewards. IMPORTANT: Never mention specific third-party apps, brands, or services by name (no Duolingo, Headspace, Calm, etc.). Use generic descriptions instead. Do not generate any harmful, violent, or explicit content. Resources should have searchQuery fields, NOT urls. IMPORTANT: searchQuery values must use generic descriptive terms only — do NOT include brand names, author names, specific product names, or trademarked terms. Use topic-based descriptions like "beginner meditation breathing technique guide" instead.`
          },
          {
            role: "user",
            content: `Create a detailed habit plan for: ${habitGoal.trim()}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "Failed to generate plan. Please try again." });
      }

      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const plan = JSON.parse(cleaned);
      
      if (plan.resources && Array.isArray(plan.resources)) {
        plan.resources = plan.resources.map((r: any) => {
          const query = r.searchQuery || r.name || '';
          const type = (r.type || '').toLowerCase();
          let suffix = '';
          if (type === 'video') suffix = ' video';
          else if (type === 'book') suffix = ' book';
          else if (type === 'course') suffix = ' course';
          else if (type === 'podcast') suffix = ' podcast';
          else if (type === 'tool' || type === 'template') suffix = ' free tool';
          const url = `https://www.google.com/search?q=${encodeURIComponent(query + suffix)}`;
          return { ...r, url };
        });
      }
      
      res.json(plan);
    } catch (error) {
      console.error("Error generating demo plan:", error);
      res.status(500).json({ error: "Failed to generate plan. Please try again." });
    }
  });

  // Seed default templates if none exist (admin only or first-time setup)
  app.post("/api/templates/seed", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      
      // Check if user is admin
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user[0]?.isAdmin) {
        // Allow seeding only if no templates exist (first-time setup)
        const existing = await db.select().from(habitTemplates).limit(1);
        if (existing.length > 0) {
          return res.status(403).json({ error: "Admin access required to re-seed templates" });
        }
      }
      
      const existing = await db.select().from(habitTemplates).limit(1);
      if (existing.length > 0) {
        return res.json({ message: "Templates already seeded" });
      }
      
      const defaultTemplates = [
        {
          name: "Morning Routine",
          description: "Start your day with energy and focus",
          category: "wellness",
          icon: "Sunrise",
          color: "amber-500",
          suggestedGoal: "Complete a 30-minute morning routine every day",
        },
        {
          name: "Daily Exercise",
          description: "Build consistent physical activity habits",
          category: "health",
          icon: "Dumbbell",
          color: "green-500",
          suggestedGoal: "Exercise for 30 minutes at least 5 days a week",
        },
        {
          name: "Reading Habit",
          description: "Expand your mind through daily reading",
          category: "learning",
          icon: "BookOpen",
          color: "blue-500",
          suggestedGoal: "Read for 20 minutes every day",
        },
        {
          name: "Meditation Practice",
          description: "Cultivate mindfulness and inner peace",
          category: "wellness",
          icon: "Brain",
          color: "purple-500",
          suggestedGoal: "Meditate for 10 minutes daily",
        },
        {
          name: "Healthy Eating",
          description: "Make better food choices every day",
          category: "health",
          icon: "Apple",
          color: "red-500",
          suggestedGoal: "Eat at least 3 servings of vegetables daily",
        },
        {
          name: "Journaling",
          description: "Reflect on your day and process emotions",
          category: "wellness",
          icon: "PenTool",
          color: "teal-500",
          suggestedGoal: "Write in your journal every evening",
        },
        {
          name: "Learning New Skills",
          description: "Dedicate time to learning something new",
          category: "learning",
          icon: "GraduationCap",
          color: "indigo-500",
          suggestedGoal: "Spend 30 minutes learning a new skill daily",
        },
        {
          name: "Digital Detox",
          description: "Reduce screen time and be more present",
          category: "wellness",
          icon: "Smartphone",
          color: "gray-500",
          suggestedGoal: "Limit recreational screen time to 2 hours daily",
        },
        {
          name: "Sleep Hygiene",
          description: "Improve your sleep quality and consistency",
          category: "health",
          icon: "Moon",
          color: "slate-600",
          suggestedGoal: "Get 7-8 hours of sleep every night",
        },
        {
          name: "Gratitude Practice",
          description: "Cultivate appreciation and positivity",
          category: "wellness",
          icon: "Heart",
          color: "pink-500",
          suggestedGoal: "Write 3 things you're grateful for each day",
        },
      ];
      
      for (const template of defaultTemplates) {
        await db.insert(habitTemplates).values(template);
      }
      
      res.json({ message: "Templates seeded successfully", count: defaultTemplates.length });
    } catch (error) {
      console.error("Error seeding templates:", error);
      res.status(500).json({ error: "Failed to seed templates" });
    }
  });

  // Track template usage
  app.post("/api/templates/:id/use", isAuthenticated, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      
      await db.update(habitTemplates)
        .set({ usageCount: sql`${habitTemplates.usageCount} + 1` })
        .where(eq(habitTemplates.id, templateId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking template usage:", error);
      res.status(500).json({ error: "Failed to track usage" });
    }
  });

  // ===== USER SAVED TEMPLATES API =====
  
  // Get user's saved templates
  app.get("/api/user-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = req.query.habitId ? parseInt(req.query.habitId as string) : undefined;
      
      let query = db.select().from(userTemplates).where(eq(userTemplates.userId, userId));
      
      if (habitId) {
        query = db.select().from(userTemplates).where(
          and(eq(userTemplates.userId, userId), eq(userTemplates.habitId, habitId))
        );
      }
      
      const templates = await query.orderBy(userTemplates.updatedAt);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching user templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // Save a user template (Premium only)
  app.post("/api/user-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      
      // Check for Premium subscription
      const isPremium = user?.subscriptionTier === 'premium' || user?.isAdmin;
      if (!isPremium) {
        return res.status(403).json({ error: "Editable templates require Premium subscription" });
      }
      
      const { habitId, title, content, originalTitle, taskId } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }
      
      const [template] = await db.insert(userTemplates).values({
        userId,
        habitId: habitId || null,
        title,
        content,
        originalTitle: originalTitle || null,
        taskId: taskId || null,
      }).returning();
      
      res.json(template);
    } catch (error) {
      console.error("Error saving user template:", error);
      res.status(500).json({ error: "Failed to save template" });
    }
  });

  // Update a user template (Premium only)
  app.patch("/api/user-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      
      // Check for Premium subscription
      const isPremium = user?.subscriptionTier === 'premium' || user?.isAdmin;
      if (!isPremium) {
        return res.status(403).json({ error: "Editable templates require Premium subscription" });
      }
      
      const templateId = parseInt(req.params.id);
      const { title, content } = req.body;
      
      // Verify ownership
      const [existing] = await db.select().from(userTemplates)
        .where(and(eq(userTemplates.id, templateId), eq(userTemplates.userId, userId)));
      
      if (!existing) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      const [updated] = await db.update(userTemplates)
        .set({ 
          title: title || existing.title, 
          content: content || existing.content,
          updatedAt: new Date(),
        })
        .where(eq(userTemplates.id, templateId))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating user template:", error);
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  // Delete a user template
  app.delete("/api/user-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const templateId = parseInt(req.params.id);
      
      // Verify ownership
      const [existing] = await db.select().from(userTemplates)
        .where(and(eq(userTemplates.id, templateId), eq(userTemplates.userId, userId)));
      
      if (!existing) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      await db.delete(userTemplates).where(eq(userTemplates.id, templateId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user template:", error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // ===== ADVANCED ANALYTICS API (Premium Only) =====
  
  app.get("/api/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      
      // Check for Premium subscription
      const isPremium = user?.subscriptionTier === 'premium' || user?.isAdmin;
      if (!isPremium) {
        return res.status(403).json({ error: "Advanced Analytics require Premium subscription" });
      }
      
      const timeRange = req.query.timeRange as string || 'month';
      const userHabits = await storage.getHabits(userId);
      
      // Calculate time range filter
      const now = new Date();
      let startDate: Date;
      switch (timeRange) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0); // All time
      }
      
      // Aggregate analytics from habits
      let totalSessions = 0;
      let totalTimeSpent = 0;
      let totalTasksCompleted = 0;
      let currentStreak = 0;
      let longestStreak = 0;
      const habitBreakdown: { habitId: number; habitTitle: string; sessions: number; time: number; completion: number }[] = [];
      const dailyData: Map<string, { sessions: number; time: number }> = new Map();
      
      for (const habit of userHabits) {
        const progress = habit.progress || [];
        const dailyPlans = habit.dailyPlans || [];
        
        let habitSessions = 0;
        let habitTime = 0;
        let habitTasksCompleted = 0;
        let habitTotalTasks = 0;
        
        for (const entry of progress) {
          const entryDate = new Date(entry.date);
          if (entryDate >= startDate) {
            habitSessions++;
            habitTime += entry.timeSpent || 0;
            habitTasksCompleted += entry.tasksCompleted || 0;
            habitTotalTasks += entry.totalTasks || 0;
            
            const dateKey = entry.date.split('T')[0];
            const existing = dailyData.get(dateKey) || { sessions: 0, time: 0 };
            dailyData.set(dateKey, {
              sessions: existing.sessions + 1,
              time: existing.time + (entry.timeSpent || 0),
            });
          }
        }
        
        totalSessions += habitSessions;
        totalTimeSpent += habitTime;
        totalTasksCompleted += habitTasksCompleted;
        currentStreak = Math.max(currentStreak, habit.currentStreak || 0);
        longestStreak = Math.max(longestStreak, habit.longestStreak || 0);
        
        if (habitSessions > 0) {
          habitBreakdown.push({
            habitId: habit.id,
            habitTitle: habit.title,
            sessions: habitSessions,
            time: habitTime,
            completion: habitTotalTasks > 0 ? Math.round((habitTasksCompleted / habitTotalTasks) * 100) : 0,
          });
        }
      }
      
      // Generate weekly trend data
      const weeklyTrend: { week: string; sessions: number; time: number }[] = [];
      const weeksToShow = timeRange === 'week' ? 1 : timeRange === 'month' ? 4 : 12;
      for (let i = weeksToShow - 1; i >= 0; i--) {
        const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        let weekSessions = 0;
        let weekTime = 0;
        
        dailyData.forEach((data, dateKey) => {
          const date = new Date(dateKey);
          if (date >= weekStart && date < weekEnd) {
            weekSessions += data.sessions;
            weekTime += data.time;
          }
        });
        
        weeklyTrend.push({
          week: `Week ${weeksToShow - i}`,
          sessions: weekSessions,
          time: weekTime,
        });
      }
      
      // Calculate best day
      const dayCount: Record<string, number> = {};
      dailyData.forEach((data, dateKey) => {
        const dayName = new Date(dateKey).toLocaleDateString('en-US', { weekday: 'long' });
        dayCount[dayName] = (dayCount[dayName] || 0) + data.sessions;
      });
      const bestDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Not enough data';
      
      // Generate AI correlations
      const correlations: { insight: string; strength: "strong" | "moderate" | "weak" }[] = [];
      
      if (totalSessions >= 5) {
        if (currentStreak >= 7) {
          correlations.push({
            insight: "You've maintained a week-long streak. Consistency is key to habit formation!",
            strength: "strong",
          });
        }
        
        if (habitBreakdown.length > 1) {
          const topHabit = habitBreakdown.sort((a, b) => b.sessions - a.sessions)[0];
          correlations.push({
            insight: `"${topHabit.habitTitle}" is your most practiced habit with ${topHabit.sessions} sessions.`,
            strength: "moderate",
          });
        }
        
        const avgSessionLength = totalTimeSpent / totalSessions;
        if (avgSessionLength > 20) {
          correlations.push({
            insight: "Your average session is over 20 minutes, indicating deep focus on your habits.",
            strength: "strong",
          });
        } else if (avgSessionLength < 10) {
          correlations.push({
            insight: "Short sessions are great for starting! Consider extending them as you build momentum.",
            strength: "weak",
          });
        }
      }
      
      res.json({
        totalSessions,
        totalTimeSpent,
        totalTasksCompleted,
        averageSessionLength: totalSessions > 0 ? Math.round(totalTimeSpent / totalSessions) : 0,
        currentStreak,
        longestStreak,
        weeklyTrend,
        monthlyTrend: weeklyTrend, // Simplified for now
        habitBreakdown,
        correlations,
        bestDay,
        bestTime: "Morning", // Default based on common patterns
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Generate AI Report
  app.post("/api/analytics/ai-report", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      
      const isPremium = user?.subscriptionTier === 'premium' || user?.isAdmin;
      if (!isPremium) {
        return res.status(403).json({ error: "AI Reports require Premium subscription" });
      }
      
      const userHabits = await storage.getHabits(userId);
      
      // Build context for AI
      const habitSummary = userHabits.map(h => ({
        title: h.title,
        streak: h.currentStreak,
        timeSpent: h.totalTimeSpent,
        sessions: (h.progress || []).length,
      }));
      
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a habit coach providing personalized insights. Analyze the user's habit data and provide 3-5 actionable insights. Be encouraging but honest. Keep each insight to 1-2 sentences. Never mention specific third-party apps, brands, or services by name.",
          },
          {
            role: "user",
            content: `Here's my habit data: ${JSON.stringify(habitSummary)}. What insights can you share about my progress?`,
          },
        ],
        max_tokens: 400,
      });
      
      const insights = response.choices[0]?.message?.content || "Keep up the great work on your habits!";
      
      res.json({ insights });
    } catch (error) {
      console.error("Error generating AI report:", error);
      res.status(500).json({ error: "Failed to generate AI report" });
    }
  });

  // Export CSV
  app.get("/api/analytics/export", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      
      const isPremium = user?.subscriptionTier === 'premium' || user?.isAdmin;
      if (!isPremium) {
        return res.status(403).json({ error: "CSV Export requires Premium subscription" });
      }
      
      const userHabits = await storage.getHabits(userId);
      
      // Build CSV
      let csv = "Date,Habit,Tasks Completed,Total Tasks,Time Spent (min),Mood,Notes\n";
      
      for (const habit of userHabits) {
        for (const entry of habit.progress || []) {
          csv += `${entry.date},${habit.title.replace(/,/g, ';')},${entry.tasksCompleted},${entry.totalTasks},${entry.timeSpent},${entry.mood || ''},${(entry.notes || '').replace(/,/g, ';').replace(/\n/g, ' ')}\n`;
        }
      }
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=habit-data.csv');
      res.send(csv);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // ===== ACCOUNTABILITY PARTNERS API (Premium Only) =====
  
  // Get user's accountability partners
  app.get("/api/accountability-partners", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      
      const isPremium = user?.subscriptionTier === 'premium' || user?.isAdmin;
      if (!isPremium) {
        return res.status(403).json({ error: "Accountability Partners require Premium subscription" });
      }
      
      const partners = await db.select().from(accountabilityPartners)
        .where(eq(accountabilityPartners.userId, userId))
        .orderBy(accountabilityPartners.createdAt);
      
      const userHabits = await storage.getHabits(userId);
      const enrichedPartners = partners.map((p) => {
        const myHabitIds = (p.habitIds as number[]) || [];
        const mySharedHabits = myHabitIds.length > 0
          ? userHabits.filter(h => myHabitIds.includes(h.id)).map(h => ({ habitId: h.id, title: h.title }))
          : [];
        return { ...p, mySharedHabits };
      });

      res.json(enrichedPartners);
    } catch (error) {
      console.error("Error fetching accountability partners:", error);
      res.status(500).json({ error: "Failed to fetch partners" });
    }
  });

  // Invite an accountability partner
  const invitePartnerSchema = z.object({
    email: z.string().email("Invalid email address"),
    name: z.string().optional(),
    habitIds: z.array(z.number()).optional().default([]),
  });
  
  app.post("/api/accountability-partners/invite", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      
      const isPremium = user?.subscriptionTier === 'premium' || user?.isAdmin;
      if (!isPremium) {
        return res.status(403).json({ error: "Accountability Partners require Premium subscription" });
      }
      
      // Validate input with Zod
      const parseResult = invitePartnerSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0].message });
      }
      
      const { email, name, habitIds } = parseResult.data;
      
      // Verify user owns all the habits they want to share
      if (habitIds.length > 0) {
        const userHabits = await storage.getHabits(userId);
        const userHabitIds = userHabits.map(h => h.id);
        const invalidHabits = habitIds.filter(id => !userHabitIds.includes(id));
        
        if (invalidHabits.length > 0) {
          return res.status(400).json({ error: "You can only share habits you own" });
        }
      }
      
      // Generate invite token
      const inviteToken = crypto.randomUUID();
      
      const [partner] = await db.insert(accountabilityPartners).values({
        userId,
        partnerEmail: email,
        partnerName: name || null,
        status: "pending",
        inviteToken,
        habitIds,
      }).returning();
      
      try {
        const userHabits = await storage.getHabits(userId);
        const sharedTitles = habitIds.length > 0
          ? userHabits.filter(h => habitIds.includes(h.id)).map(h => h.title)
          : [];

        await sendAccountabilityInviteEmail({
          toEmail: email,
          partnerName: name || undefined,
          inviterName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'A HabitBuilder user',
          inviterEmail: user?.email || '',
          habitTitles: sharedTitles,
          inviteToken,
        });
      } catch (emailErr) {
        console.error("Failed to send invite email (partner still created):", emailErr);
      }

      res.json(partner);
    } catch (error) {
      console.error("Error inviting accountability partner:", error);
      res.status(500).json({ error: "Failed to send invitation" });
    }
  });

  // Send progress update to a partner
  app.post("/api/accountability-partners/:id/send-update", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const partnerId = parseInt(req.params.id);
      
      // Verify ownership
      const [partner] = await db.select().from(accountabilityPartners)
        .where(and(eq(accountabilityPartners.id, partnerId), eq(accountabilityPartners.userId, userId)));
      
      if (!partner) {
        return res.status(404).json({ error: "Partner not found" });
      }
      
      const user = await storage.getUser(userId);
      const userHabits = await storage.getHabits(userId);
      const sharedHabits = partner.habitIds && partner.habitIds.length > 0
        ? userHabits.filter(h => partner.habitIds!.includes(h.id))
        : userHabits;

      try {
        await sendProgressUpdateEmail({
          toEmail: partner.partnerEmail,
          partnerName: partner.partnerName || undefined,
          senderName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Your partner',
          habits: sharedHabits.map(h => ({
            title: h.title,
            streak: h.currentStreak || 0,
            timeSpent: h.totalTimeSpent || 0,
          })),
        });
      } catch (emailErr) {
        console.error("Failed to send progress update email:", emailErr);
        return res.status(500).json({ error: "Failed to send email. Please try again." });
      }

      res.json({ 
        success: true, 
        message: `Update sent to ${partner.partnerEmail}`,
        habitsShared: sharedHabits.length,
      });
    } catch (error) {
      console.error("Error sending partner update:", error);
      res.status(500).json({ error: "Failed to send update" });
    }
  });

  // Remove an accountability partner
  app.delete("/api/accountability-partners/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const partnerId = parseInt(req.params.id);
      
      // Verify ownership
      const [existing] = await db.select().from(accountabilityPartners)
        .where(and(eq(accountabilityPartners.id, partnerId), eq(accountabilityPartners.userId, userId)));
      
      if (!existing) {
        return res.status(404).json({ error: "Partner not found" });
      }
      
      await db.delete(accountabilityPartners).where(eq(accountabilityPartners.id, partnerId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing accountability partner:", error);
      res.status(500).json({ error: "Failed to remove partner" });
    }
  });

  // Accept an accountability partner invite via token (public - no auth required for initial lookup)
  app.get("/api/accountability-partners/invite/:token", async (req: any, res) => {
    try {
      const { token } = req.params;
      const [invite] = await db.select().from(accountabilityPartners)
        .where(eq(accountabilityPartners.inviteToken, token));
      
      if (!invite) {
        return res.status(404).json({ error: "Invitation not found or already used" });
      }

      const inviter = await storage.getUser(invite.userId);
      const inviterName = inviter ? `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() : 'A HabitBuilder user';

      let sharedHabitTitles: string[] = [];
      if (invite.habitIds && invite.habitIds.length > 0) {
        const inviterHabits = await storage.getHabits(invite.userId);
        sharedHabitTitles = inviterHabits
          .filter(h => invite.habitIds!.includes(h.id))
          .map(h => h.title);
      }

      res.json({
        id: invite.id,
        status: invite.status,
        inviterName,
        partnerEmail: invite.partnerEmail,
        sharedHabitTitles,
      });
    } catch (error) {
      console.error("Error looking up invite:", error);
      res.status(500).json({ error: "Failed to look up invitation" });
    }
  });

  // Accept or decline invite (requires auth so we can link partner user ID)
  app.post("/api/accountability-partners/invite/:token/respond", isAuthenticated, async (req: any, res) => {
    try {
      const { token } = req.params;
      const { action } = req.body; // "accept" or "decline"
      const userId = req.user!.claims.sub;

      if (!["accept", "decline"].includes(action)) {
        return res.status(400).json({ error: "Action must be 'accept' or 'decline'" });
      }

      const [invite] = await db.select().from(accountabilityPartners)
        .where(eq(accountabilityPartners.inviteToken, token));

      if (!invite) {
        return res.status(404).json({ error: "Invitation not found" });
      }

      if (invite.status !== "pending") {
        return res.status(400).json({ error: `Invitation already ${invite.status}` });
      }

      if (invite.userId === userId) {
        return res.status(400).json({ error: "You cannot accept your own invitation" });
      }

      const newStatus = action === "accept" ? "accepted" : "declined";

      await db.update(accountabilityPartners)
        .set({ 
          status: newStatus, 
          partnerUserId: action === "accept" ? userId : null,
        })
        .where(eq(accountabilityPartners.id, invite.id));

      res.json({ success: true, status: newStatus });
    } catch (error) {
      console.error("Error responding to invite:", error);
      res.status(500).json({ error: "Failed to respond to invitation" });
    }
  });

  const sharingSettingsSchema = z.object({
    sharingSettings: z.object({
      showStreaks: z.boolean(),
      showCompletions: z.boolean(),
      showNotes: z.boolean(),
      showActionPlans: z.boolean(),
      showTimeSpent: z.boolean(),
    }).optional(),
    habitIds: z.array(z.number()).optional(),
  });

  // Update sharing settings for a partnership (inviter side)
  app.patch("/api/accountability-partners/:id/sharing-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const partnerId = parseInt(req.params.id);

      const parseResult = sharingSettingsSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0].message });
      }
      const { sharingSettings, habitIds } = parseResult.data;

      const [partner] = await db.select().from(accountabilityPartners)
        .where(and(eq(accountabilityPartners.id, partnerId), eq(accountabilityPartners.userId, userId)));

      if (!partner) {
        return res.status(404).json({ error: "Partner not found" });
      }

      if (habitIds && habitIds.length > 0) {
        const userHabits = await storage.getHabits(userId);
        const userHabitIds = userHabits.map(h => h.id);
        if (habitIds.some(id => !userHabitIds.includes(id))) {
          return res.status(400).json({ error: "You can only share habits you own" });
        }
      }

      const updates: any = {};
      if (sharingSettings) updates.sharingSettings = sharingSettings;
      if (habitIds !== undefined) updates.habitIds = habitIds;

      await db.update(accountabilityPartners)
        .set(updates)
        .where(eq(accountabilityPartners.id, partnerId));

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating sharing settings:", error);
      res.status(500).json({ error: "Failed to update sharing settings" });
    }
  });

  // Update partner-side sharing settings (partner controls what THEY share back)
  app.patch("/api/accountability-partners/:id/partner-sharing-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const partnerId = parseInt(req.params.id);

      const parseResult = sharingSettingsSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0].message });
      }
      const { sharingSettings, habitIds } = parseResult.data;

      const [partner] = await db.select().from(accountabilityPartners)
        .where(and(eq(accountabilityPartners.id, partnerId), eq(accountabilityPartners.partnerUserId, userId)));

      if (!partner) {
        return res.status(404).json({ error: "Partnership not found" });
      }

      if (habitIds && habitIds.length > 0) {
        const userHabits = await storage.getHabits(userId);
        const userHabitIds = userHabits.map(h => h.id);
        if (habitIds.some(id => !userHabitIds.includes(id))) {
          return res.status(400).json({ error: "You can only share habits you own" });
        }
      }

      const updates: any = {};
      if (sharingSettings) updates.partnerSharingSettings = sharingSettings;
      if (habitIds !== undefined) updates.partnerHabitIds = habitIds;

      await db.update(accountabilityPartners)
        .set(updates)
        .where(eq(accountabilityPartners.id, partnerId));

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating partner sharing settings:", error);
      res.status(500).json({ error: "Failed to update sharing settings" });
    }
  });

  // Get invites shared with the current user (incoming partnerships) - with rich progress data
  app.get("/api/accountability-partners/shared-with-me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const byUserId = await db.select().from(accountabilityPartners)
        .where(and(
          eq(accountabilityPartners.partnerUserId, userId),
          eq(accountabilityPartners.status, "accepted")
        ));

      const byEmail = user.email ? await db.select().from(accountabilityPartners)
        .where(and(
          eq(accountabilityPartners.partnerEmail, user.email),
          eq(accountabilityPartners.status, "accepted"),
          sql`${accountabilityPartners.partnerUserId} IS NULL`
        )) : [];

      for (const p of byEmail) {
        await db.update(accountabilityPartners)
          .set({ partnerUserId: userId })
          .where(eq(accountabilityPartners.id, p.id));
      }

      const allIncoming = [...byUserId, ...byEmail];

      const enriched = await Promise.all(allIncoming.map(async (p) => {
        const inviter = await storage.getUser(p.userId);
        const inviterName = inviter ? `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() : 'A user';
        const settings = (p.sharingSettings as any) || { showStreaks: true, showCompletions: true, showNotes: false, showActionPlans: false, showTimeSpent: true };

        let habits: any[] = [];
        {
          const inviterHabits = await storage.getHabits(p.userId);
          const filteredHabits = (p.habitIds && p.habitIds.length > 0)
            ? inviterHabits.filter(h => p.habitIds!.includes(h.id))
            : [];
          habits = filteredHabits.map(h => {
              const result: any = {
                habitId: h.id,
                title: h.title,
              };

              if (settings.showStreaks) {
                result.streak = h.currentStreak || 0;
                result.longestStreak = h.longestStreak || 0;
              }

              if (settings.showCompletions && h.progress) {
                const progressEntries = (h.progress as any[]) || [];
                result.recentProgress = progressEntries.slice(-7).map(entry => ({
                  date: entry.date,
                  tasksCompleted: entry.tasksCompleted,
                  totalTasks: entry.totalTasks,
                  mood: entry.mood,
                }));
                result.totalSessions = progressEntries.length;
              }

              if (settings.showNotes && h.progress) {
                const progressEntries = (h.progress as any[]) || [];
                result.recentNotes = progressEntries
                  .filter((entry: any) => entry.notes && entry.notes.trim())
                  .slice(-5)
                  .map((entry: any) => ({
                    date: entry.date,
                    notes: entry.notes,
                  }));
              }

              if (settings.showTimeSpent) {
                result.totalTimeSpent = h.totalTimeSpent || 0;
              }

              if (settings.showActionPlans && h.dailyPlans) {
                const plans = (h.dailyPlans as any[]) || [];
                result.currentPlan = plans.length > 0 ? {
                  totalTasks: plans.reduce((sum: number, p: any) => sum + (p.tasks?.length || 0), 0),
                  planDuration: h.planDuration,
                } : null;
              }

              return result;
            });
        }

        return {
          partnerId: p.id,
          inviterName,
          inviterEmail: inviter?.email || '',
          habits,
          sharingSettings: settings,
          partnerSharingSettings: (p.partnerSharingSettings as any) || { showStreaks: true, showCompletions: true, showNotes: false, showActionPlans: false, showTimeSpent: true },
          partnerHabitIds: p.partnerHabitIds || [],
          createdAt: p.createdAt,
        };
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching shared-with-me:", error);
      res.status(500).json({ error: "Failed to fetch shared partnerships" });
    }
  });

  // ============================================
  // MOOD TRACKING ENDPOINTS (Premium Feature)
  // ============================================

  app.get("/api/mood", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const entries = await db.select()
        .from(moodEntries)
        .where(eq(moodEntries.userId, userId))
        .orderBy(moodEntries.date);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching mood entries:", error);
      res.status(500).json({ error: "Failed to fetch mood entries" });
    }
  });

  const moodEntrySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    mood: z.enum(["great", "good", "okay", "bad", "terrible"]),
    energy: z.number().min(1).max(5).optional(),
    stress: z.number().min(1).max(5).optional(),
    sleep: z.number().min(1).max(5).optional(),
    notes: z.string().max(500).optional(),
    habitIds: z.array(z.number()).optional(),
  });

  app.post("/api/mood", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      
      const validatedData = moodEntrySchema.parse(req.body);
      const { date, mood, energy, stress, sleep, notes, habitIds } = validatedData;
      
      // Check if entry exists for this date
      const existing = await db.select()
        .from(moodEntries)
        .where(and(eq(moodEntries.userId, userId), eq(moodEntries.date, date)))
        .limit(1);
      
      if (existing.length > 0) {
        // Update existing entry
        const [updated] = await db.update(moodEntries)
          .set({ mood, energy, stress, sleep, notes, habitIds })
          .where(eq(moodEntries.id, existing[0].id))
          .returning();
        return res.json(updated);
      }
      
      // Create new entry
      const [entry] = await db.insert(moodEntries)
        .values({
          userId,
          date,
          mood,
          energy,
          stress,
          sleep,
          notes,
          habitIds: habitIds || [],
        })
        .returning();
      
      res.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid mood entry data", details: error.errors });
      }
      console.error("Error saving mood entry:", error);
      res.status(500).json({ error: "Failed to save mood entry" });
    }
  });

  app.get("/api/mood/insights", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      
      const isPremium = user?.subscriptionTier === 'premium' || user?.isAdmin;
      if (!isPremium) {
        return res.status(403).json({ error: "Mood insights require Premium subscription" });
      }
      
      const entries = await db.select()
        .from(moodEntries)
        .where(eq(moodEntries.userId, userId))
        .orderBy(moodEntries.date);
      
      const userHabits = await storage.getHabits(userId);
      
      if (entries.length < 3) {
        return res.json({
          message: "Log at least 3 days of mood data to see insights",
          insights: [],
          correlations: [],
        });
      }
      
      // Calculate basic stats
      const moodValues: Record<string, number> = { great: 5, good: 4, okay: 3, bad: 2, terrible: 1 };
      const avgMood = entries.reduce((sum, e) => sum + (moodValues[e.mood] || 3), 0) / entries.length;
      const avgEnergy = entries.filter(e => e.energy).reduce((sum, e) => sum + (e.energy || 0), 0) / 
        (entries.filter(e => e.energy).length || 1);
      const avgStress = entries.filter(e => e.stress).reduce((sum, e) => sum + (e.stress || 0), 0) / 
        (entries.filter(e => e.stress).length || 1);
      
      // Find habit correlations - union of manually tagged habits AND auto-detected from dailyPlans completion
      // Use per-habit per-date sets to avoid double-counting
      const habitMoodMap = new Map<number, { good: number; bad: number; total: number; countedDates: Set<string> }>();
      
      const ensureHabit = (habitId: number) => {
        if (!habitMoodMap.has(habitId)) {
          habitMoodMap.set(habitId, { good: 0, bad: 0, total: 0, countedDates: new Set() });
        }
        return habitMoodMap.get(habitId)!;
      };
      
      // Build mood entries by date for quick lookup
      const moodByDate = new Map<string, typeof entries[0]>();
      for (const entry of entries) {
        moodByDate.set(entry.date, entry);
      }
      
      // Source 1: Auto-correlate from dailyPlans completion on mood entry dates
      for (const habit of userHabits) {
        const dailyPlans = (habit.dailyPlans || []) as { date: string; completed: boolean; tasks: { completed?: boolean; skipped?: boolean }[] }[];
        for (const plan of dailyPlans) {
          const moodEntry = moodByDate.get(plan.date);
          if (!moodEntry) continue;
          
          const activeTasks = plan.tasks.filter(t => !t.skipped);
          const isCompleted = plan.completed || (activeTasks.length > 0 && activeTasks.every(t => t.completed));
          if (!isCompleted) continue;
          
          const stats = ensureHabit(habit.id);
          if (!stats.countedDates.has(plan.date)) {
            stats.countedDates.add(plan.date);
            stats.total++;
            if (moodValues[moodEntry.mood] >= 4) stats.good++;
            else stats.bad++;
          }
        }
      }
      
      // Source 2: Manually tagged habit IDs from mood entries (fills gaps for habits without dailyPlans)
      for (const entry of entries) {
        const habitIds = (entry.habitIds as number[]) || [];
        const isGoodMood = moodValues[entry.mood] >= 4;
        
        for (const habitId of habitIds) {
          const stats = ensureHabit(habitId);
          if (!stats.countedDates.has(entry.date)) {
            stats.countedDates.add(entry.date);
            stats.total++;
            if (isGoodMood) stats.good++;
            else stats.bad++;
          }
        }
      }
      
      const correlations = userHabits
        .map((habit) => {
          const stats = habitMoodMap.get(habit.id);
          return {
            habitId: habit.id,
            habitTitle: habit.title,
            correlation: stats && stats.total > 0 ? ((stats.good / stats.total) * 100).toFixed(0) : null,
            timesCompleted: stats?.total || 0,
          };
        })
        .sort((a, b) => {
          if (a.correlation === null && b.correlation === null) return 0;
          if (a.correlation === null) return 1;
          if (b.correlation === null) return -1;
          return Number(b.correlation) - Number(a.correlation);
        });
      
      const insights = [
        `Your average mood score is ${avgMood.toFixed(1)}/5`,
        avgEnergy > 0 ? `Average energy level: ${avgEnergy.toFixed(1)}/5` : null,
        avgStress > 0 ? `Average stress level: ${avgStress.toFixed(1)}/5` : null,
        correlations.length > 0 && correlations[0].correlation !== null ? 
          `${correlations[0].habitTitle} is associated with ${correlations[0].correlation}% good mood days` : null,
      ].filter(Boolean);
      
      res.json({
        insights,
        correlations,
        stats: { avgMood, avgEnergy, avgStress, totalEntries: entries.length },
      });
    } catch (error) {
      console.error("Error generating mood insights:", error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  app.post("/api/mood/ai-insights", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const entries = await db.select().from(moodEntries)
        .where(eq(moodEntries.userId, userId))
        .orderBy(sql`${moodEntries.date} DESC`)
        .limit(14);

      if (entries.length < 3) {
        return res.json({ insight: "Keep logging your mood! After a few days, I'll spot patterns for you." });
      }

      const userHabits = await db.select().from(habits)
        .where(eq(habits.userId, userId));

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: "Analyze mood tracking data and provide brief, actionable insights about patterns. Focus on connections between mood, energy, sleep, stress, and habits. Be encouraging. 2-3 sentences max."
        }, {
          role: "user",
          content: `Mood entries (newest first): ${entries.map(e => `${e.date}: mood=${e.mood}, energy=${e.energy}/5, stress=${e.stress}/5, sleep=${e.sleep}/5, notes="${e.notes || 'none'}"`).join("\n")}\n\nHabits: ${userHabits.map((h: any) => h.title).join(", ")}`
        }],
        max_tokens: 200,
      });

      res.json({ insight: response.choices[0]?.message?.content || "Keep tracking!" });
    } catch (error) {
      console.error("Error generating AI mood insights:", error);
      res.status(500).json({ error: "Failed to generate AI insights" });
    }
  });

  // Mood report for a specific habit correlation
  app.get("/api/mood/report/:habitId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = parseInt(req.params.habitId);
      const user = await storage.getUser(userId);
      
      const isPremium = user?.subscriptionTier === 'premium' || user?.isAdmin;
      if (!isPremium) {
        return res.status(403).json({ error: "Mood reports require Premium subscription" });
      }
      
      const habit = await storage.getHabit(habitId);
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }
      
      const allEntries = await db.select()
        .from(moodEntries)
        .where(eq(moodEntries.userId, userId))
        .orderBy(moodEntries.date);
      
      const moodValues: Record<string, number> = { great: 5, good: 4, okay: 3, bad: 2, terrible: 1 };
      
      // Build set of dates where this habit was completed (from dailyPlans)
      const completedDates = new Set<string>();
      const dailyPlans = (habit.dailyPlans || []) as { date: string; completed: boolean; tasks: { completed?: boolean; skipped?: boolean }[] }[];
      for (const plan of dailyPlans) {
        const activeTasks = plan.tasks.filter(t => !t.skipped);
        const isCompleted = plan.completed || (activeTasks.length > 0 && activeTasks.every(t => t.completed));
        if (isCompleted) completedDates.add(plan.date);
      }
      
      // Correlate mood entries with habit using both manual tags AND dailyPlans completion (deduplicated by date)
      const habitEntries: typeof allEntries = [];
      const nonHabitEntries: typeof allEntries = [];
      const countedDates = new Set<string>();
      for (const e of allEntries) {
        const ids = (e.habitIds as number[]) || [];
        if ((ids.includes(habitId) || completedDates.has(e.date)) && !countedDates.has(e.date)) {
          countedDates.add(e.date);
          habitEntries.push(e);
        } else if (!countedDates.has(e.date)) {
          nonHabitEntries.push(e);
        }
      }
      
      const avgMoodWith = habitEntries.length > 0 
        ? habitEntries.reduce((s, e) => s + (moodValues[e.mood] || 3), 0) / habitEntries.length 
        : 0;
      const avgMoodWithout = nonHabitEntries.length > 0 
        ? nonHabitEntries.reduce((s, e) => s + (moodValues[e.mood] || 3), 0) / nonHabitEntries.length 
        : 0;
      
      let energySum = 0, energyCount = 0, stressSum = 0, stressCount = 0, sleepSum = 0, sleepCount = 0;
      for (const e of habitEntries) {
        if (e.energy) { energySum += e.energy; energyCount++; }
        if (e.stress) { stressSum += e.stress; stressCount++; }
        if (e.sleep) { sleepSum += e.sleep; sleepCount++; }
      }
      const avgEnergyWith = energyCount > 0 ? energySum / energyCount : 0;
      const avgStressWith = stressCount > 0 ? stressSum / stressCount : 0;
      const avgSleepWith = sleepCount > 0 ? sleepSum / sleepCount : 0;
      
      // Mood distribution
      const moodDistribution: Record<string, number> = { great: 0, good: 0, okay: 0, bad: 0, terrible: 0 };
      for (const entry of habitEntries) {
        moodDistribution[entry.mood] = (moodDistribution[entry.mood] || 0) + 1;
      }
      
      // Collect notes from entries where this habit was logged
      const notesEntries = habitEntries
        .filter(e => e.notes && e.notes.trim().length > 0)
        .map(e => ({
          date: e.date,
          mood: e.mood,
          notes: e.notes!,
          energy: e.energy,
          stress: e.stress,
          sleep: e.sleep,
        }))
        .reverse(); // Most recent first
      
      // Positive rate
      const positiveCount = habitEntries.filter(e => moodValues[e.mood] >= 4).length;
      const positiveRate = habitEntries.length > 0 ? Math.round((positiveCount / habitEntries.length) * 100) : 0;
      
      res.json({
        habitTitle: habit.title,
        totalEntries: habitEntries.length,
        positiveRate,
        avgMoodWith: Number(avgMoodWith.toFixed(1)),
        avgMoodWithout: Number(avgMoodWithout.toFixed(1)),
        moodImpact: Number((avgMoodWith - avgMoodWithout).toFixed(1)),
        avgEnergy: Number(avgEnergyWith.toFixed(1)),
        avgStress: Number(avgStressWith.toFixed(1)),
        avgSleep: Number(avgSleepWith.toFixed(1)),
        moodDistribution,
        notes: notesEntries,
      });
    } catch (error) {
      console.error("Error generating mood report:", error);
      res.status(500).json({ error: "Failed to generate mood report" });
    }
  });

  // ============================================
  // STREAK PROTECTION ENDPOINTS (Premium Feature)
  // ============================================

  app.post("/api/habits/:id/freeze-streak", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      const isPremium = user?.subscriptionTier === 'premium' || user?.isAdmin;
      if (!isPremium) {
        return res.status(403).json({ error: "Streak protection requires Premium subscription" });
      }
      
      const habit = await storage.getHabit(habitId);
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }
      
      const currentMonth = new Date().toISOString().slice(0, 7);
      const freezesUsedThisMonth = habit.streakFreezeMonth === currentMonth ? (habit.streakFreezeUsed || 0) : 0;
      const maxFreezes = 2;
      
      if (freezesUsedThisMonth >= maxFreezes) {
        return res.status(400).json({ error: "No streak freezes remaining this month" });
      }
      
      const [updated] = await db.update(habits)
        .set({
          streakFreezeUsed: freezesUsedThisMonth + 1,
          streakFreezeMonth: currentMonth,
        })
        .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
        .returning();
      
      res.json({ 
        success: true, 
        message: "Streak frozen for today",
        freezesRemaining: maxFreezes - (freezesUsedThisMonth + 1),
      });
    } catch (error) {
      console.error("Error freezing streak:", error);
      res.status(500).json({ error: "Failed to freeze streak" });
    }
  });

  // ============================================
  // GAMIFICATION ENDPOINTS (Premium Feature)
  // ============================================

  // XP level thresholds
  const XP_LEVELS = [
    { level: 1, minXp: 0, title: "Beginner" },
    { level: 2, minXp: 100, title: "Starter" },
    { level: 3, minXp: 300, title: "Committed" },
    { level: 4, minXp: 600, title: "Dedicated" },
    { level: 5, minXp: 1000, title: "Consistent" },
    { level: 6, minXp: 1500, title: "Focused" },
    { level: 7, minXp: 2200, title: "Advanced" },
    { level: 8, minXp: 3000, title: "Expert" },
    { level: 9, minXp: 4000, title: "Master" },
    { level: 10, minXp: 5500, title: "Legend" },
    { level: 11, minXp: 7500, title: "Champion" },
    { level: 12, minXp: 10000, title: "Habit Hero" },
  ];

  const LEVEL_REWARDS: Record<number, { color: string; colorName: string; colorValue: string }> = {
    1: { color: "nature", colorName: "Nature Green", colorValue: "hsl(166, 72%, 40%)" },
    2: { color: "ocean", colorName: "Ocean Blue", colorValue: "hsl(200, 80%, 45%)" },
    3: { color: "sunset", colorName: "Sunset Orange", colorValue: "hsl(25, 90%, 55%)" },
    4: { color: "lavender", colorName: "Lavender Purple", colorValue: "hsl(270, 60%, 60%)" },
    5: { color: "forest", colorName: "Deep Forest", colorValue: "hsl(150, 50%, 35%)" },
    6: { color: "ruby", colorName: "Ruby Red", colorValue: "hsl(350, 75%, 50%)" },
    7: { color: "amber", colorName: "Golden Amber", colorValue: "hsl(40, 90%, 50%)" },
    8: { color: "cyan", colorName: "Electric Cyan", colorValue: "hsl(185, 80%, 45%)" },
    9: { color: "rose", colorName: "Rose Pink", colorValue: "hsl(330, 70%, 55%)" },
    10: { color: "emerald", colorName: "Emerald Elite", colorValue: "hsl(155, 75%, 40%)" },
    11: { color: "platinum", colorName: "Platinum Silver", colorValue: "hsl(220, 15%, 65%)" },
    12: { color: "champion_gold", colorName: "Champion Gold", colorValue: "hsl(45, 95%, 55%)" },
  };

  function calculateLevel(xp: number): { level: number; title: string; xpToNext: number; progress: number } {
    let currentLevel = XP_LEVELS[0];
    for (const lvl of XP_LEVELS) {
      if (xp >= lvl.minXp) {
        currentLevel = lvl;
      }
    }
    const nextLevel = XP_LEVELS.find(l => l.level === currentLevel.level + 1);
    const xpToNext = nextLevel ? nextLevel.minXp - xp : 0;
    const progress = nextLevel 
      ? ((xp - currentLevel.minXp) / (nextLevel.minXp - currentLevel.minXp)) * 100 
      : 100;
    
    return { level: currentLevel.level, title: currentLevel.title, xpToNext, progress };
  }

  function getStreakMultiplier(maxStreak: number): { multiplier: number; label: string } {
    if (maxStreak >= 30) return { multiplier: 3.0, label: "3x" };
    if (maxStreak >= 14) return { multiplier: 2.5, label: "2.5x" };
    if (maxStreak >= 7) return { multiplier: 2.0, label: "2x" };
    if (maxStreak >= 3) return { multiplier: 1.5, label: "1.5x" };
    return { multiplier: 1.0, label: "1x" };
  }

  async function updateChallengeProgress(userId: string, event: {
    tasksCompleted?: number;
    timeSpent?: number;
    habitsWorkedOn?: number;
    totalActiveHabits?: number;
    notesAdded?: number;
    streakMaintained?: boolean;
    isBeforeNoon?: boolean;
  }, userTimezone?: string | null) {
    try {
      const today = getUserToday(userTimezone);
      const todaysChallenges = await db.select().from(dailyChallenges)
        .where(and(eq(dailyChallenges.userId, userId), eq(dailyChallenges.date, today)));

      if (todaysChallenges.length === 0) return;

      for (const challenge of todaysChallenges) {
        if (challenge.completed) continue;

        let increment = 0;
        switch (challenge.challengeType) {
          case 'complete_tasks':
            if (event.tasksCompleted) increment = event.tasksCompleted;
            break;
          case 'time_goal':
            if (event.timeSpent) increment = event.timeSpent;
            break;
          case 'all_habits':
            if (event.habitsWorkedOn) {
              const target = challenge.targetValue || 3;
              const newVal = Math.min(event.habitsWorkedOn, target);
              increment = Math.max(0, newVal - (challenge.currentValue || 0));
            }
            break;
          case 'streak_builder':
            if (event.streakMaintained) increment = 1;
            break;
          case 'early_bird':
            if (event.isBeforeNoon) increment = 1;
            break;
          case 'note_taker':
            if (event.notesAdded) increment = event.notesAdded;
            break;
        }

        if (increment > 0) {
          const newValue = Math.min((challenge.currentValue || 0) + increment, challenge.targetValue || 1);
          const completed = newValue >= (challenge.targetValue || 1);

          await db.update(dailyChallenges)
            .set({
              currentValue: newValue,
              completed,
              completedAt: completed ? new Date() : null,
            })
            .where(eq(dailyChallenges.id, challenge.id));

          if (completed) {
            const user = await storage.getUser(userId);
            const userHabits = await storage.getHabits(userId);
            let maxStreak = 0;
            for (const habit of userHabits) {
              maxStreak = Math.max(maxStreak, habit.currentStreak || 0, habit.longestStreak || 0);
            }
            const { multiplier } = getStreakMultiplier(maxStreak);
            const baseXp = challenge.xpReward;
            const earnedXp = Math.round(baseXp * multiplier);
            const currentXp = user?.xpPoints || 0;
            await db.update(users)
              .set({
                xpPoints: currentXp + earnedXp,
                dailyChallengesCompleted: (user?.dailyChallengesCompleted || 0) + 1,
                updatedAt: new Date(),
              })
              .where(eq(users.id, userId));
          }
        }
      }
    } catch (error) {
      console.error("Error updating challenge progress:", error);
    }
  }

  async function checkAndAwardAchievements(userId: string) {
    try {
      const existingAchievements = await db.select()
        .from(userAchievements)
        .where(eq(userAchievements.userId, userId));
      const unlockedIds = new Set(existingAchievements.map(a => a.achievementId));

      const userHabits = await storage.getHabits(userId);
      const totalHabits = userHabits.length;
      const hasActionPlan = userHabits.some(h => h.dailyPlans && h.dailyPlans.length > 0);

      let maxStreak = 0;
      let totalSessions = 0;
      let totalTime = 0;

      for (const habit of userHabits) {
        maxStreak = Math.max(maxStreak, habit.currentStreak || 0, habit.longestStreak || 0);
        totalSessions += (habit.progress?.length || 0);
        totalTime += (habit.totalTimeSpent || 0);
      }

      const achievementsToCheck = [
        { id: "streak_3", check: maxStreak >= 3 },
        { id: "streak_7", check: maxStreak >= 7 },
        { id: "streak_14", check: maxStreak >= 14 },
        { id: "streak_30", check: maxStreak >= 30 },
        { id: "streak_100", check: maxStreak >= 100 },
        { id: "sessions_5", check: totalSessions >= 5 },
        { id: "sessions_25", check: totalSessions >= 25 },
        { id: "sessions_100", check: totalSessions >= 100 },
        { id: "time_60", check: totalTime >= 60 },
        { id: "time_300", check: totalTime >= 300 },
        { id: "time_1200", check: totalTime >= 1200 },
        { id: "habits_3", check: totalHabits >= 3 },
        { id: "habits_5", check: totalHabits >= 5 },
        { id: "first_plan", check: hasActionPlan },
      ];

      const newlyUnlocked: string[] = [];
      for (const { id, check } of achievementsToCheck) {
        if (check && !unlockedIds.has(id)) {
          await db.insert(userAchievements).values({ userId, achievementId: id });
          newlyUnlocked.push(id);
        }
      }
      return newlyUnlocked;
    } catch (error) {
      console.error("Error checking achievements:", error);
      return [];
    }
  }

  // Get user's gamification stats
  app.get("/api/gamification/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const xpPoints = user.xpPoints || 0;
      const levelInfo = calculateLevel(xpPoints);
      
      // Get today's challenges
      const todayGami = getUserToday(user?.timezone);
      const todaysChallenges = await db.select().from(dailyChallenges)
        .where(and(eq(dailyChallenges.userId, userId), eq(dailyChallenges.date, todayGami)));

      const userHabits = await storage.getHabits(userId);
      let maxStreak = 0;
      for (const habit of userHabits) {
        maxStreak = Math.max(maxStreak, habit.currentStreak || 0, habit.longestStreak || 0);
      }
      const multiplierInfo = getStreakMultiplier(maxStreak);

      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - mondayOffset);
      const weekStart = monday.toISOString().split('T')[0];

      const weekChallenges = await db.select().from(dailyChallenges)
        .where(and(
          eq(dailyChallenges.userId, userId),
          eq(dailyChallenges.completed, true),
          gte(dailyChallenges.date, weekStart)
        ));
      const weeklyXpEarned = weekChallenges.reduce((sum, c) => sum + (c.xpReward || 0), 0);

      const unlockedColors = Object.entries(LEVEL_REWARDS)
        .filter(([lvl]) => parseInt(lvl) <= levelInfo.level)
        .map(([lvl, reward]) => ({ level: parseInt(lvl), ...reward }));

      const userAchievementsList = await db.select().from(userAchievements)
        .where(eq(userAchievements.userId, userId));

      const tierValue = user.subscriptionTier || 'free';
      const isAdminUser = user.isAdmin || false;

      res.json({
        xpPoints,
        level: levelInfo.level,
        levelTitle: levelInfo.title,
        xpToNextLevel: levelInfo.xpToNext,
        levelProgress: levelInfo.progress,
        dailyChallengesCompleted: user.dailyChallengesCompleted || 0,
        weeklyXpGoal: user.weeklyXpGoal || 500,
        todaysChallenges,
        xpLevels: XP_LEVELS,
        streakMultiplier: multiplierInfo.multiplier,
        streakMultiplierLabel: multiplierInfo.label,
        maxStreak,
        weeklyXpEarned,
        levelRewards: LEVEL_REWARDS,
        unlockedColors,
        achievements: userAchievementsList,
        subscriptionTier: tierValue,
        isAdmin: isAdminUser,
        selectedColor: user.accentColor || null,
      });
    } catch (error) {
      console.error("Error fetching gamification stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Generate daily challenges for user
  app.post("/api/gamification/generate-challenges", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      
      const isPremium = user?.subscriptionTier === 'premium' || user?.isAdmin || user?.subscriptionTier === 'pro';
      if (!isPremium) {
        return res.status(403).json({ error: "Daily challenges require Pro or Premium subscription" });
      }
      
      const todayChallenge = getUserToday(user?.timezone);
      
      // Check if already generated today
      const existing = await db.select().from(dailyChallenges)
        .where(and(eq(dailyChallenges.userId, userId), eq(dailyChallenges.date, todayChallenge)));
      
      if (existing.length > 0) {
        return res.json({ challenges: existing, message: "Challenges already generated for today" });
      }
      
      // Get user's habits for context
      const userHabits = await storage.getHabits(userId);
      
      // Generate 3 daily challenges
      const challengeTemplates = [
        { type: "complete_tasks", title: "Task Master", description: "Complete 5 habit tasks today", target: 5, xp: 50 },
        { type: "time_goal", title: "Time Warrior", description: "Spend 30 minutes on your habits", target: 30, xp: 75 },
        { type: "all_habits", title: "Full Sweep", description: "Work on all your active habits today", target: Math.min(userHabits.length, 3), xp: 100 },
        { type: "streak_builder", title: "Streak Builder", description: "Maintain or extend your streak", target: 1, xp: 50 },
        { type: "early_bird", title: "Early Bird", description: "Start a habit session before noon", target: 1, xp: 60 },
        { type: "note_taker", title: "Reflector", description: "Add notes to 3 completed tasks", target: 3, xp: 40 },
      ];
      
      // Pick 3 random challenges
      const shuffled = challengeTemplates.sort(() => Math.random() - 0.5);
      const selectedChallenges = shuffled.slice(0, 3);
      
      const challenges = [];
      for (const template of selectedChallenges) {
        const [challenge] = await db.insert(dailyChallenges).values({
          userId,
          date: todayChallenge,
          challengeType: template.type,
          title: template.title,
          description: template.description,
          xpReward: template.xp,
          targetValue: template.target,
          currentValue: 0,
          completed: false,
        }).returning();
        challenges.push(challenge);
      }
      
      res.json({ challenges, message: "Daily challenges generated!" });
    } catch (error) {
      console.error("Error generating challenges:", error);
      res.status(500).json({ error: "Failed to generate challenges" });
    }
  });

  // Award XP to user
  app.post("/api/gamification/award-xp", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { amount, reason } = req.body;
      
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: "Invalid XP amount" });
      }
      
      const user = await storage.getUser(userId);
      const currentXp = user?.xpPoints || 0;
      const newXp = currentXp + amount;
      
      const oldLevel = calculateLevel(currentXp);
      const newLevel = calculateLevel(newXp);
      
      // Update user's XP
      await db.update(users)
        .set({ xpPoints: newXp, updatedAt: new Date() })
        .where(eq(users.id, userId));
      
      const leveledUp = newLevel.level > oldLevel.level;
      
      res.json({
        xpAwarded: amount,
        totalXp: newXp,
        reason,
        leveledUp,
        newLevel: leveledUp ? newLevel : undefined,
      });
    } catch (error) {
      console.error("Error awarding XP:", error);
      res.status(500).json({ error: "Failed to award XP" });
    }
  });

  // Update challenge progress
  app.patch("/api/gamification/challenges/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const challengeId = parseInt(req.params.id);
      const { increment } = req.body;
      
      // Verify ownership
      const [challenge] = await db.select().from(dailyChallenges)
        .where(and(eq(dailyChallenges.id, challengeId), eq(dailyChallenges.userId, userId)));
      
      if (!challenge) {
        return res.status(404).json({ error: "Challenge not found" });
      }
      
      if (challenge.completed) {
        return res.json({ challenge, message: "Challenge already completed" });
      }
      
      const newValue = (challenge.currentValue || 0) + (increment || 1);
      const completed = newValue >= (challenge.targetValue || 1);
      
      const [updated] = await db.update(dailyChallenges)
        .set({ 
          currentValue: newValue, 
          completed,
          completedAt: completed ? new Date() : null,
        })
        .where(eq(dailyChallenges.id, challengeId))
        .returning();
      
      // Award XP if just completed
      let xpAwarded = 0;
      if (completed && !challenge.completed) {
        const user = await storage.getUser(userId);
        const userHabits = await storage.getHabits(userId);
        let maxStreak = 0;
        for (const habit of userHabits) {
          maxStreak = Math.max(maxStreak, habit.currentStreak || 0, habit.longestStreak || 0);
        }
        const { multiplier } = getStreakMultiplier(maxStreak);
        const earnedXp = Math.round(challenge.xpReward * multiplier);
        const currentXp = user?.xpPoints || 0;
        await db.update(users)
          .set({ 
            xpPoints: currentXp + earnedXp,
            dailyChallengesCompleted: (user?.dailyChallengesCompleted || 0) + 1,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
        xpAwarded = earnedXp;
      }
      
      res.json({ challenge: updated, completed, xpAwarded });
    } catch (error) {
      console.error("Error updating challenge:", error);
      res.status(500).json({ error: "Failed to update challenge" });
    }
  });

  app.patch("/api/user/accent-color", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { color } = req.body;
      
      if (!color || typeof color !== 'string') {
        return res.status(400).json({ error: "Color is required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      
      const xpPoints = user.xpPoints || 0;
      const levelInfo = calculateLevel(xpPoints);
      const unlockedColorIds = Object.entries(LEVEL_REWARDS)
        .filter(([lvl]) => parseInt(lvl) <= levelInfo.level)
        .map(([, reward]) => reward.color);
      
      if (!unlockedColorIds.includes(color)) {
        return res.status(403).json({ error: "This color has not been unlocked yet" });
      }
      
      await db.update(users).set({ accentColor: color, colorTheme: color, updatedAt: new Date() }).where(eq(users.id, userId));
      res.json({ success: true, color });
    } catch (error) {
      console.error("Error setting accent color:", error);
      res.status(500).json({ error: "Failed to set accent color" });
    }
  });

  // ===== VISITOR TRACKING & ADMIN ANALYTICS =====

  // Track page view (called from frontend)
  app.post("/api/track", async (req: any, res) => {
    try {
      const { path, referrer, sessionId, utm_source, utm_medium, utm_campaign, utm_content, utm_term, gclid } = req.body;
      const userId = req.user?.claims?.sub || null;
      const userAgent = req.get('User-Agent') || null;
      const ip = req.ip || req.connection?.remoteAddress || '';
      const ipHash = ip ? crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16) : null;

      await db.insert(pageViews).values({
        path: path || '/',
        userId,
        userAgent,
        ipHash,
        referrer: referrer || null,
        sessionId: sessionId || null,
        utmSource: utm_source || null,
        utmMedium: utm_medium || null,
        utmCampaign: utm_campaign || null,
        utmContent: utm_content || null,
        utmTerm: utm_term || null,
        gclid: gclid || null,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking page view:", error);
      res.status(500).json({ error: "Failed to track" });
    }
  });

  // Admin: Get visitor analytics
  app.get("/api/admin/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const timeRange = req.query.range || '7d';
      let daysBack = 7;
      if (timeRange === '30d') daysBack = 30;
      if (timeRange === '90d') daysBack = 90;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Get total page views
      const totalViews = await db.select({ count: sql<number>`count(*)` })
        .from(pageViews)
        .where(sql`${pageViews.createdAt} >= ${startDate}`);

      // Get unique visitors (by session_id or ip_hash)
      const uniqueVisitors = await db.select({ count: sql<number>`count(distinct coalesce(${pageViews.sessionId}, ${pageViews.ipHash}))` })
        .from(pageViews)
        .where(sql`${pageViews.createdAt} >= ${startDate}`);

      // Get logged-in users
      const loggedInUsers = await db.select({ count: sql<number>`count(distinct ${pageViews.userId})` })
        .from(pageViews)
        .where(and(
          sql`${pageViews.createdAt} >= ${startDate}`,
          sql`${pageViews.userId} is not null`
        ));

      // Get page views by path
      const pagesByPath = await db.select({
        path: pageViews.path,
        count: sql<number>`count(*)`,
      })
        .from(pageViews)
        .where(sql`${pageViews.createdAt} >= ${startDate}`)
        .groupBy(pageViews.path)
        .orderBy(sql`count(*) desc`)
        .limit(10);

      // Get views by day
      const viewsByDay = await db.select({
        date: sql<string>`date(${pageViews.createdAt})`,
        count: sql<number>`count(*)`,
      })
        .from(pageViews)
        .where(sql`${pageViews.createdAt} >= ${startDate}`)
        .groupBy(sql`date(${pageViews.createdAt})`)
        .orderBy(sql`date(${pageViews.createdAt})`);

      // Get top referrers
      const topReferrers = await db.select({
        referrer: pageViews.referrer,
        count: sql<number>`count(*)`,
      })
        .from(pageViews)
        .where(and(
          sql`${pageViews.createdAt} >= ${startDate}`,
          sql`${pageViews.referrer} is not null and ${pageViews.referrer} != ''`
        ))
        .groupBy(pageViews.referrer)
        .orderBy(sql`count(*) desc`);

      // Get traffic sources (UTM + gclid breakdown)
      const trafficSources = await db.select({
        source: sql<string>`CASE 
          WHEN ${pageViews.gclid} IS NOT NULL THEN 'Google Ads'
          WHEN ${pageViews.utmSource} IS NOT NULL THEN ${pageViews.utmSource}
          WHEN ${pageViews.referrer} IS NOT NULL AND ${pageViews.referrer} != '' THEN 'Referral'
          ELSE 'Direct'
        END`,
        count: sql<number>`count(*)`,
        uniqueVisitors: sql<number>`count(distinct coalesce(${pageViews.sessionId}, ${pageViews.ipHash}))`,
      })
        .from(pageViews)
        .where(sql`${pageViews.createdAt} >= ${startDate}`)
        .groupBy(sql`CASE 
          WHEN ${pageViews.gclid} IS NOT NULL THEN 'Google Ads'
          WHEN ${pageViews.utmSource} IS NOT NULL THEN ${pageViews.utmSource}
          WHEN ${pageViews.referrer} IS NOT NULL AND ${pageViews.referrer} != '' THEN 'Referral'
          ELSE 'Direct'
        END`)
        .orderBy(sql`count(*) desc`);

      // Google Ads specific stats
      const googleAdsViews = await db.select({ count: sql<number>`count(*)` })
        .from(pageViews)
        .where(and(
          sql`${pageViews.createdAt} >= ${startDate}`,
          sql`(${pageViews.gclid} IS NOT NULL OR ${pageViews.utmSource} = 'google')`
        ));

      const googleAdsUniqueVisitors = await db.select({ 
        count: sql<number>`count(distinct coalesce(${pageViews.sessionId}, ${pageViews.ipHash}))` 
      })
        .from(pageViews)
        .where(and(
          sql`${pageViews.createdAt} >= ${startDate}`,
          sql`(${pageViews.gclid} IS NOT NULL OR ${pageViews.utmSource} = 'google')`
        ));

      // Campaign breakdown
      const campaignBreakdown = await db.select({
        campaign: sql<string>`coalesce(${pageViews.utmCampaign}, 'No Campaign')`,
        source: sql<string>`coalesce(${pageViews.utmSource}, 'unknown')`,
        views: sql<number>`count(*)`,
        uniqueVisitors: sql<number>`count(distinct coalesce(${pageViews.sessionId}, ${pageViews.ipHash}))`,
      })
        .from(pageViews)
        .where(and(
          sql`${pageViews.createdAt} >= ${startDate}`,
          sql`(${pageViews.utmSource} IS NOT NULL OR ${pageViews.gclid} IS NOT NULL)`
        ))
        .groupBy(sql`coalesce(${pageViews.utmCampaign}, 'No Campaign')`, sql`coalesce(${pageViews.utmSource}, 'unknown')`)
        .orderBy(sql`count(*) desc`)
        .limit(10);

      // Users who signed up from ads
      const adSignups = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(
          sql`${users.createdAt} >= ${startDate}`,
          sql`(${users.signupGclid} IS NOT NULL OR ${users.signupUtmSource} IS NOT NULL)`
        ));

      // Get total registered users
      const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);

      // Get new registrations in time period
      const newRegistrations = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(sql`${users.createdAt} >= ${startDate}`);

      // Get users currently on free trial (trialEndsAt is in the future)
      const now = new Date();
      const freeTrialUsers = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(
          sql`${users.trialEndsAt} is not null`,
          sql`${users.trialEndsAt} > ${now}`
        ));

      // Get new free trial signups in time period (users created in period who have trialEndsAt set)
      const newFreeTrialSignups = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(
          sql`${users.createdAt} >= ${startDate}`,
          sql`${users.trialEndsAt} is not null`
        ));

      res.json({
        totalPageViews: totalViews[0]?.count || 0,
        uniqueVisitors: uniqueVisitors[0]?.count || 0,
        loggedInUsers: loggedInUsers[0]?.count || 0,
        totalRegisteredUsers: totalUsers[0]?.count || 0,
        newRegistrations: newRegistrations[0]?.count || 0,
        freeTrialUsers: freeTrialUsers[0]?.count || 0,
        newFreeTrialSignups: newFreeTrialSignups[0]?.count || 0,
        pagesByPath,
        viewsByDay,
        topReferrers,
        trafficSources,
        googleAds: {
          views: googleAdsViews[0]?.count || 0,
          uniqueVisitors: googleAdsUniqueVisitors[0]?.count || 0,
          signups: adSignups[0]?.count || 0,
        },
        campaignBreakdown,
        timeRange,
      });
    } catch (error) {
      console.error("Error fetching admin analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // ==========================================
  // COMMUNITY FEATURES
  // Pro users: Read-only access (view forums, read posts)
  // Premium users: Full access (post, comment, like, message)
  // ==========================================

  // Helper to get user with full subscription info
  const getUserSubscriptionInfo = async (userId: string) => {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user.length) return null;
    
    const u = user[0];
    // Admins always have full access
    if (u.isAdmin) {
      return { tier: 'premium', isAdmin: true, hasPaid: true };
    }
    
    // If hasPaid is true but tier is 'free', treat as 'pro' (handles webhook sync delays)
    let effectiveTier = u.subscriptionTier || 'free';
    if (u.hasPaid && effectiveTier === 'free') {
      effectiveTier = 'pro';
    }
    
    return { tier: effectiveTier, isAdmin: u.isAdmin, hasPaid: u.hasPaid };
  };

  // ==========================================
  // AI COACH CHAT (Premium Only - 150 messages/month)
  // ==========================================

  const COACH_MESSAGE_LIMIT = 150;

  const getCoachUsage = async (userId: string) => {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user.length) return { used: 0, limit: COACH_MESSAGE_LIMIT, resetAt: null };
    
    const u = user[0];
    const now = new Date();
    const resetAt = u.coachMessagesResetAt ? new Date(u.coachMessagesResetAt) : null;
    
    if (!resetAt || resetAt <= now) {
      const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      await db.update(users).set({ coachMessagesUsed: 0, coachMessagesResetAt: nextReset }).where(eq(users.id, userId));
      return { used: 0, limit: COACH_MESSAGE_LIMIT, resetAt: nextReset.toISOString() };
    }
    
    return { used: u.coachMessagesUsed || 0, limit: COACH_MESSAGE_LIMIT, resetAt: resetAt.toISOString() };
  };

  app.get("/api/coach/usage", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const usage = await getCoachUsage(userId);
      res.json(usage);
    } catch (error) {
      console.error("Error getting coach usage:", error);
      res.status(500).json({ error: "Failed to get usage" });
    }
  });

  app.get("/api/coach/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const chats = await db.select().from(coachChats)
        .where(eq(coachChats.userId, userId))
        .orderBy(sql`${coachChats.createdAt} DESC`)
        .limit(50);
      res.json(chats);
    } catch (error) {
      console.error("Error getting coach history:", error);
      res.status(500).json({ error: "Failed to get chat history" });
    }
  });

  app.get("/api/coach/chat/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const chatId = parseInt(req.params.id);
      
      const chat = await db.select().from(coachChats)
        .where(and(eq(coachChats.id, chatId), eq(coachChats.userId, userId)))
        .limit(1);
      
      if (!chat.length) {
        return res.status(404).json({ error: "Chat not found" });
      }
      
      const chatMessages = await db.select().from(coachMessages)
        .where(eq(coachMessages.chatId, chatId))
        .orderBy(sql`${coachMessages.createdAt} ASC`);
      
      res.json({ chat: chat[0], messages: chatMessages });
    } catch (error) {
      console.error("Error getting chat:", error);
      res.status(500).json({ error: "Failed to get chat" });
    }
  });

  app.post("/api/coach/start", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      
      const info = await getUserSubscriptionInfo(userId);
      if (!info || (info.tier !== "premium" && !info.isAdmin)) {
        return res.status(403).json({ error: "Premium subscription required for Coach Chat" });
      }

      const usage = await getCoachUsage(userId);
      if (usage.used >= usage.limit) {
        return res.status(429).json({ 
          error: "Monthly coach message limit reached", 
          usage,
          message: `You've used all ${usage.limit} coach messages this month. Your limit resets on ${new Date(usage.resetAt!).toLocaleDateString()}.`
        });
      }

      const [newChat] = await db.insert(coachChats).values({
        userId,
        title: "New Coaching Session",
      }).returning();

      const systemGreeting = "Hi there! I'm your habit coach. What would you like to work on today? Whether it's starting a new habit, staying consistent, or overcoming a challenge, I'm here to help.";

      await db.insert(coachMessages).values({
        chatId: newChat.id,
        role: "assistant",
        content: systemGreeting,
      });

      await db.update(coachChats).set({ messageCount: 1 }).where(eq(coachChats.id, newChat.id));

      res.json({ 
        chat: { ...newChat, messageCount: 1 },
        messages: [{ id: 0, chatId: newChat.id, role: "assistant", content: systemGreeting, createdAt: new Date() }],
        usage,
      });
    } catch (error) {
      console.error("Error starting coach chat:", error);
      res.status(500).json({ error: "Failed to start chat" });
    }
  });

  app.post("/api/coach/chat/:id/message", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const chatId = parseInt(req.params.id);
      const { message } = req.body;

      if (!message || typeof message !== "string" || message.trim().length < 1) {
        return res.status(400).json({ error: "Message is required" });
      }

      if (message.trim().length > 2000) {
        return res.status(400).json({ error: "Message too long (max 2000 characters)" });
      }

      const info = await getUserSubscriptionInfo(userId);
      if (!info || (info.tier !== "premium" && !info.isAdmin)) {
        return res.status(403).json({ error: "Premium subscription required for Coach Chat" });
      }

      const chat = await db.select().from(coachChats)
        .where(and(eq(coachChats.id, chatId), eq(coachChats.userId, userId)))
        .limit(1);
      
      if (!chat.length) {
        return res.status(404).json({ error: "Chat not found" });
      }

      if (!chat[0].isActive) {
        return res.status(400).json({ error: "This chat session has ended. Start a new one." });
      }

      const usage = await getCoachUsage(userId);
      if (usage.used >= usage.limit) {
        return res.status(429).json({ 
          error: "Monthly coach message limit reached",
          usage,
          message: `You've used all ${usage.limit} coach messages this month. Your limit resets on ${new Date(usage.resetAt!).toLocaleDateString()}.`
        });
      }

      const safetyCheck = checkContentSafety(message);
      if (!safetyCheck.allowed) {
        return res.status(400).json({ error: safetyCheck.message || "Please keep the conversation positive and constructive." });
      }

      await db.insert(coachMessages).values({
        chatId,
        role: "user",
        content: message.trim(),
      });

      const previousMessages = await db.select().from(coachMessages)
        .where(eq(coachMessages.chatId, chatId))
        .orderBy(sql`${coachMessages.createdAt} ASC`)
        .limit(30);

      const userHabits = await db.select().from(habits)
        .where(eq(habits.userId, userId))
        .limit(10);

      const habitContext = userHabits.length > 0 
        ? `\n\nUser's current habits: ${userHabits.map(h => `${h.title} (streak: ${h.currentStreak || 0} days, total time: ${h.totalTimeSpent || 0} minutes)`).join(", ")}`
        : "";

      const aiMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
        {
          role: "system",
          content: `You are a warm, encouraging habit coach inside the Habit Builder app. Your role is to help users build, maintain, and improve their habits. Be conversational, empathetic, and practical. Keep responses concise (2-4 paragraphs max). Ask follow-up questions to understand the user better. Offer specific, actionable advice tailored to their situation. Never mention specific third-party apps, brands, or services by name — use generic descriptions instead. When suggesting tools, recommend features within the Habit Builder app (like action plans, guided sessions, templates, streaks, etc.). SAFETY: Never generate content promoting violence, illegal activities, exploitation of minors, self-harm, or explicit content.${habitContext}`
        },
        ...previousMessages.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: aiMessages,
        temperature: 0.8,
        max_tokens: 600,
      });

      const aiContent = response.choices[0]?.message?.content || "I'm here to help! Could you tell me more about what you're working on?";

      await db.insert(coachMessages).values({
        chatId,
        role: "assistant",
        content: aiContent,
      });

      const newMessageCount = (chat[0].messageCount || 0) + 2;
      
      let chatTitle = chat[0].title;
      if (chat[0].title === "New Coaching Session" && newMessageCount >= 3) {
        const words = message.trim().split(" ").slice(0, 6).join(" ");
        chatTitle = words.length > 40 ? words.substring(0, 40) + "..." : words;
      }

      await db.update(coachChats).set({ messageCount: newMessageCount, title: chatTitle }).where(eq(coachChats.id, chatId));

      await db.update(users).set({ 
        coachMessagesUsed: sql`COALESCE(coach_messages_used, 0) + 1` 
      }).where(eq(users.id, userId));

      const updatedUsage = await getCoachUsage(userId);

      res.json({ 
        reply: aiContent,
        usage: updatedUsage,
      });
    } catch (error) {
      console.error("Error in coach chat:", error);
      res.status(500).json({ error: "Failed to get coach response" });
    }
  });

  app.post("/api/coach/chat/:id/end", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const chatId = parseInt(req.params.id);

      const chat = await db.select().from(coachChats)
        .where(and(eq(coachChats.id, chatId), eq(coachChats.userId, userId)))
        .limit(1);
      
      if (!chat.length) {
        return res.status(404).json({ error: "Chat not found" });
      }

      await db.update(coachChats).set({ 
        isActive: false, 
        endedAt: new Date() 
      }).where(eq(coachChats.id, chatId));

      res.json({ success: true });
    } catch (error) {
      console.error("Error ending coach chat:", error);
      res.status(500).json({ error: "Failed to end chat" });
    }
  });

  // ==========================================
  // COMMUNITY FEATURES
  // ==========================================

  // Pro or Premium check middleware (read-only access)
  const requireProOrPremium = async (req: any, res: any, next: any) => {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const info = await getUserSubscriptionInfo(userId);
    if (!info) {
      return res.status(401).json({ error: "User not found" });
    }
    
    // Admins always pass
    if (info.isAdmin) {
      (req as any).userTier = 'premium';
      (req as any).isAdmin = true;
      return next();
    }
    
    if (info.tier !== "pro" && info.tier !== "premium") {
      return res.status(403).json({ error: "Pro or Premium subscription required", code: "PREMIUM_REQUIRED" });
    }
    
    (req as any).userTier = info.tier;
    next();
  };

  // Premium only check middleware (full engagement access)
  const requirePremiumOnly = async (req: any, res: any, next: any) => {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const info = await getUserSubscriptionInfo(userId);
    if (!info) {
      return res.status(401).json({ error: "User not found" });
    }
    
    // Admins always pass
    if (info.isAdmin) {
      (req as any).userTier = 'premium';
      (req as any).isAdmin = true;
      return next();
    }
    
    if (info.tier !== "premium") {
      return res.status(403).json({ error: "Premium subscription required for this action", code: "ENGAGEMENT_PREMIUM_ONLY" });
    }
    
    next();
  };

  // Get or create user profile (Pro can view, Premium can edit)
  app.get("/api/community/profile", isAuthenticated, requireProOrPremium, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      let profile = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
      
      if (!profile.length) {
        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        const displayName = user[0]?.firstName ? `${user[0].firstName} ${user[0].lastName || ''}`.trim() : 'Anonymous';
        await db.insert(userProfiles).values({
          userId,
          displayName,
          avatarUrl: user[0]?.profileImageUrl,
        });
        profile = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
      }
      
      res.json(profile[0]);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Update user profile
  app.patch("/api/community/profile", isAuthenticated, requirePremiumOnly, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { displayName, bio, avatarUrl, profileVisible, showHabitProgress, allowMessages, allowProfileLikes } = req.body;
      
      const existing = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
      if (!existing.length) {
        await db.insert(userProfiles).values({ userId, displayName, bio, avatarUrl, profileVisible, showHabitProgress, allowMessages, allowProfileLikes });
      } else {
        await db.update(userProfiles)
          .set({ displayName, bio, avatarUrl, profileVisible, showHabitProgress, allowMessages, allowProfileLikes, updatedAt: new Date() })
          .where(eq(userProfiles.userId, userId));
      }
      
      const profile = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
      res.json(profile[0]);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Get public profile by user ID
  app.get("/api/community/profile/:userId", isAuthenticated, requireProOrPremium, async (req: any, res) => {
    try {
      const targetUserId = req.params.userId;
      const currentUserId = req.user!.claims.sub;
      
      const profile = await db.select().from(userProfiles).where(eq(userProfiles.userId, targetUserId)).limit(1);
      if (!profile.length || !profile[0].profileVisible) {
        return res.status(404).json({ error: "Profile not found or private" });
      }
      
      const user = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
      const hasLiked = await db.select().from(profileLikes)
        .where(and(eq(profileLikes.profileUserId, targetUserId), eq(profileLikes.likedByUserId, currentUserId)))
        .limit(1);
      
      res.json({
        ...profile[0],
        firstName: user[0]?.firstName,
        level: user[0]?.level || 1,
        xpPoints: user[0]?.xpPoints || 0,
        hasLiked: hasLiked.length > 0,
      });
    } catch (error) {
      console.error("Error fetching public profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Like/unlike a profile
  app.post("/api/community/profile/:userId/like", isAuthenticated, requirePremiumOnly, async (req: any, res) => {
    try {
      const targetUserId = req.params.userId;
      const currentUserId = req.user!.claims.sub;
      
      if (targetUserId === currentUserId) {
        return res.status(400).json({ error: "Cannot like your own profile" });
      }
      
      const profile = await db.select().from(userProfiles).where(eq(userProfiles.userId, targetUserId)).limit(1);
      if (!profile.length || !profile[0].allowProfileLikes) {
        return res.status(404).json({ error: "Profile not found or likes disabled" });
      }
      
      const existingLike = await db.select().from(profileLikes)
        .where(and(eq(profileLikes.profileUserId, targetUserId), eq(profileLikes.likedByUserId, currentUserId)))
        .limit(1);
      
      if (existingLike.length) {
        await db.delete(profileLikes).where(eq(profileLikes.id, existingLike[0].id));
        await db.update(userProfiles)
          .set({ totalLikes: sql`GREATEST(0, ${userProfiles.totalLikes} - 1)` })
          .where(eq(userProfiles.userId, targetUserId));
        res.json({ liked: false });
      } else {
        await db.insert(profileLikes).values({ profileUserId: targetUserId, likedByUserId: currentUserId });
        await db.update(userProfiles)
          .set({ totalLikes: sql`${userProfiles.totalLikes} + 1` })
          .where(eq(userProfiles.userId, targetUserId));
        res.json({ liked: true });
      }
    } catch (error) {
      console.error("Error toggling profile like:", error);
      res.status(500).json({ error: "Failed to toggle like" });
    }
  });

  // Get forum categories
  app.get("/api/community/categories", isAuthenticated, requireProOrPremium, async (req: any, res) => {
    try {
      const categories = await db.select().from(forumCategories).orderBy(forumCategories.sortOrder);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Get posts by category
  app.get("/api/community/categories/:slug/posts", isAuthenticated, requireProOrPremium, async (req: any, res) => {
    try {
      const { slug } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const category = await db.select().from(forumCategories).where(eq(forumCategories.slug, slug)).limit(1);
      if (!category.length) {
        return res.status(404).json({ error: "Category not found" });
      }
      
      const posts = await db.select({
        post: forumPosts,
        profile: userProfiles,
      })
        .from(forumPosts)
        .leftJoin(userProfiles, eq(forumPosts.userId, userProfiles.userId))
        .where(eq(forumPosts.categoryId, category[0].id))
        .orderBy(sql`${forumPosts.isPinned} DESC, ${forumPosts.lastActivityAt} DESC`)
        .limit(limit)
        .offset(offset);
      
      res.json({
        category: category[0],
        posts: posts.map(p => ({
          ...p.post,
          author: p.profile ? { displayName: p.profile.displayName, avatarUrl: p.profile.avatarUrl } : null,
        })),
      });
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  // Create a new post
  app.post("/api/community/posts", isAuthenticated, requirePremiumOnly, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { categoryId, title, content } = req.body;
      
      if (!title?.trim() || !content?.trim()) {
        return res.status(400).json({ error: "Title and content are required" });
      }
      
      const [post] = await db.insert(forumPosts).values({
        userId,
        categoryId,
        title: title.trim(),
        content: content.trim(),
      }).returning();
      
      await db.update(forumCategories)
        .set({ postsCount: sql`${forumCategories.postsCount} + 1` })
        .where(eq(forumCategories.id, categoryId));
      
      await db.update(userProfiles)
        .set({ postsCount: sql`${userProfiles.postsCount} + 1` })
        .where(eq(userProfiles.userId, userId));
      
      res.json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  // Get a single post with comments
  app.get("/api/community/posts/:id", isAuthenticated, requireProOrPremium, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const currentUserId = req.user!.claims.sub;
      
      const postResult = await db.select({
        post: forumPosts,
        profile: userProfiles,
        category: forumCategories,
      })
        .from(forumPosts)
        .leftJoin(userProfiles, eq(forumPosts.userId, userProfiles.userId))
        .leftJoin(forumCategories, eq(forumPosts.categoryId, forumCategories.id))
        .where(eq(forumPosts.id, postId))
        .limit(1);
      
      if (!postResult.length) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      const comments = await db.select({
        comment: forumComments,
        profile: userProfiles,
      })
        .from(forumComments)
        .leftJoin(userProfiles, eq(forumComments.userId, userProfiles.userId))
        .where(eq(forumComments.postId, postId))
        .orderBy(forumComments.createdAt);
      
      const hasLiked = await db.select().from(postLikes)
        .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, currentUserId)))
        .limit(1);
      
      const commentIds = comments.map(c => c.comment.id);
      const userCommentLikes = commentIds.length > 0 ? await db.select().from(commentLikes)
        .where(and(
          sql`${commentLikes.commentId} IN (${sql.join(commentIds.map(id => sql`${id}`), sql`, `)})`,
          eq(commentLikes.userId, currentUserId)
        )) : [];
      
      const likedCommentIds = new Set(userCommentLikes.map(l => l.commentId));
      
      res.json({
        ...postResult[0].post,
        author: postResult[0].profile ? { 
          userId: postResult[0].post.userId,
          displayName: postResult[0].profile.displayName, 
          avatarUrl: postResult[0].profile.avatarUrl 
        } : null,
        category: postResult[0].category,
        hasLiked: hasLiked.length > 0,
        comments: comments.map(c => ({
          ...c.comment,
          author: c.profile ? { 
            userId: c.comment.userId,
            displayName: c.profile.displayName, 
            avatarUrl: c.profile.avatarUrl 
          } : null,
          hasLiked: likedCommentIds.has(c.comment.id),
        })),
      });
    } catch (error) {
      console.error("Error fetching post:", error);
      res.status(500).json({ error: "Failed to fetch post" });
    }
  });

  // Like/unlike a post
  app.post("/api/community/posts/:id/like", isAuthenticated, requirePremiumOnly, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.user!.claims.sub;
      
      const existingLike = await db.select().from(postLikes)
        .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
        .limit(1);
      
      if (existingLike.length) {
        await db.delete(postLikes).where(eq(postLikes.id, existingLike[0].id));
        await db.update(forumPosts)
          .set({ likesCount: sql`GREATEST(0, ${forumPosts.likesCount} - 1)` })
          .where(eq(forumPosts.id, postId));
        res.json({ liked: false });
      } else {
        await db.insert(postLikes).values({ postId, userId });
        await db.update(forumPosts)
          .set({ likesCount: sql`${forumPosts.likesCount} + 1` })
          .where(eq(forumPosts.id, postId));
        res.json({ liked: true });
      }
    } catch (error) {
      console.error("Error toggling post like:", error);
      res.status(500).json({ error: "Failed to toggle like" });
    }
  });

  // Add comment to a post
  app.post("/api/community/posts/:id/comments", isAuthenticated, requirePremiumOnly, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.user!.claims.sub;
      const { content, parentCommentId } = req.body;
      
      if (!content?.trim()) {
        return res.status(400).json({ error: "Content is required" });
      }
      
      const post = await db.select().from(forumPosts).where(eq(forumPosts.id, postId)).limit(1);
      if (!post.length || post[0].isLocked) {
        return res.status(400).json({ error: "Post not found or locked" });
      }
      
      const [comment] = await db.insert(forumComments).values({
        postId,
        userId,
        content: content.trim(),
        parentCommentId: parentCommentId || null,
      }).returning();
      
      await db.update(forumPosts)
        .set({ 
          commentsCount: sql`${forumPosts.commentsCount} + 1`,
          lastActivityAt: new Date(),
        })
        .where(eq(forumPosts.id, postId));
      
      await db.update(userProfiles)
        .set({ commentsCount: sql`${userProfiles.commentsCount} + 1` })
        .where(eq(userProfiles.userId, userId));
      
      const profile = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
      
      res.json({
        ...comment,
        author: profile[0] ? { 
          userId,
          displayName: profile[0].displayName, 
          avatarUrl: profile[0].avatarUrl 
        } : null,
        hasLiked: false,
      });
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Like/unlike a comment
  app.post("/api/community/comments/:id/like", isAuthenticated, requirePremiumOnly, async (req: any, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const userId = req.user!.claims.sub;
      
      const existingLike = await db.select().from(commentLikes)
        .where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, userId)))
        .limit(1);
      
      if (existingLike.length) {
        await db.delete(commentLikes).where(eq(commentLikes.id, existingLike[0].id));
        await db.update(forumComments)
          .set({ likesCount: sql`GREATEST(0, ${forumComments.likesCount} - 1)` })
          .where(eq(forumComments.id, commentId));
        res.json({ liked: false });
      } else {
        await db.insert(commentLikes).values({ commentId, userId });
        await db.update(forumComments)
          .set({ likesCount: sql`${forumComments.likesCount} + 1` })
          .where(eq(forumComments.id, commentId));
        res.json({ liked: true });
      }
    } catch (error) {
      console.error("Error toggling comment like:", error);
      res.status(500).json({ error: "Failed to toggle like" });
    }
  });

  // Get conversations
  app.get("/api/community/messages", isAuthenticated, requirePremiumOnly, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      
      const profile = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
      if (!profile.length || !profile[0].allowMessages) {
        return res.json([]);
      }
      
      const convos = await db.select()
        .from(conversations)
        .where(sql`${conversations.participant1Id} = ${userId} OR ${conversations.participant2Id} = ${userId}`)
        .orderBy(sql`${conversations.lastMessageAt} DESC`);
      
      const result = await Promise.all(convos.map(async (convo) => {
        const otherUserId = convo.participant1Id === userId ? convo.participant2Id : convo.participant1Id;
        const otherProfile = await db.select().from(userProfiles).where(eq(userProfiles.userId, otherUserId)).limit(1);
        const unreadCount = convo.participant1Id === userId ? convo.unreadCount1 : convo.unreadCount2;
        
        return {
          ...convo,
          otherUser: otherProfile[0] ? {
            userId: otherUserId,
            displayName: otherProfile[0].displayName,
            avatarUrl: otherProfile[0].avatarUrl,
          } : null,
          unreadCount,
        };
      }));
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get messages in a conversation
  app.get("/api/community/messages/:conversationId", isAuthenticated, requirePremiumOnly, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const conversationId = parseInt(req.params.conversationId);
      
      const convo = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
      if (!convo.length || (convo[0].participant1Id !== userId && convo[0].participant2Id !== userId)) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      const msgs = await db.select().from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt);
      
      await db.update(messages)
        .set({ isRead: true })
        .where(and(eq(messages.conversationId, conversationId), sql`${messages.senderId} != ${userId}`));
      
      if (convo[0].participant1Id === userId) {
        await db.update(conversations).set({ unreadCount1: 0 }).where(eq(conversations.id, conversationId));
      } else {
        await db.update(conversations).set({ unreadCount2: 0 }).where(eq(conversations.id, conversationId));
      }
      
      const otherUserId = convo[0].participant1Id === userId ? convo[0].participant2Id : convo[0].participant1Id;
      const otherProfile = await db.select().from(userProfiles).where(eq(userProfiles.userId, otherUserId)).limit(1);
      
      res.json({
        conversation: convo[0],
        otherUser: otherProfile[0] ? {
          userId: otherUserId,
          displayName: otherProfile[0].displayName,
          avatarUrl: otherProfile[0].avatarUrl,
        } : null,
        messages: msgs,
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send a message
  app.post("/api/community/messages", isAuthenticated, requirePremiumOnly, async (req: any, res) => {
    try {
      const senderId = req.user!.claims.sub;
      const { recipientId, content, conversationId } = req.body;
      
      if (!content?.trim()) {
        return res.status(400).json({ error: "Message content is required" });
      }
      
      const senderProfile = await db.select().from(userProfiles).where(eq(userProfiles.userId, senderId)).limit(1);
      if (!senderProfile.length || !senderProfile[0].allowMessages) {
        return res.status(400).json({ error: "You have messaging disabled" });
      }
      
      let convoId = conversationId;
      
      if (!convoId && recipientId) {
        const recipientProfile = await db.select().from(userProfiles).where(eq(userProfiles.userId, recipientId)).limit(1);
        if (!recipientProfile.length || !recipientProfile[0].allowMessages) {
          return res.status(400).json({ error: "Recipient has messaging disabled" });
        }
        
        const existingConvo = await db.select().from(conversations)
          .where(sql`(${conversations.participant1Id} = ${senderId} AND ${conversations.participant2Id} = ${recipientId}) OR (${conversations.participant1Id} = ${recipientId} AND ${conversations.participant2Id} = ${senderId})`)
          .limit(1);
        
        if (existingConvo.length) {
          convoId = existingConvo[0].id;
        } else {
          const [newConvo] = await db.insert(conversations).values({
            participant1Id: senderId,
            participant2Id: recipientId,
          }).returning();
          convoId = newConvo.id;
        }
      }
      
      if (!convoId) {
        return res.status(400).json({ error: "Recipient or conversation required" });
      }
      
      const convo = await db.select().from(conversations).where(eq(conversations.id, convoId)).limit(1);
      if (!convo.length || (convo[0].participant1Id !== senderId && convo[0].participant2Id !== senderId)) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      const [message] = await db.insert(messages).values({
        conversationId: convoId,
        senderId,
        content: content.trim(),
      }).returning();
      
      const preview = content.trim().substring(0, 100);
      if (convo[0].participant1Id === senderId) {
        await db.update(conversations)
          .set({ lastMessageAt: new Date(), lastMessagePreview: preview, unreadCount2: sql`${conversations.unreadCount2} + 1` })
          .where(eq(conversations.id, convoId));
      } else {
        await db.update(conversations)
          .set({ lastMessageAt: new Date(), lastMessagePreview: preview, unreadCount1: sql`${conversations.unreadCount1} + 1` })
          .where(eq(conversations.id, convoId));
      }
      
      res.json({ message, conversationId: convoId });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Get unread message count
  app.get("/api/community/messages/unread-count", isAuthenticated, requirePremiumOnly, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      
      const convos = await db.select()
        .from(conversations)
        .where(sql`${conversations.participant1Id} = ${userId} OR ${conversations.participant2Id} = ${userId}`);
      
      let totalUnread = 0;
      for (const convo of convos) {
        totalUnread += convo.participant1Id === userId ? (convo.unreadCount1 || 0) : (convo.unreadCount2 || 0);
      }
      
      res.json({ unreadCount: totalUnread });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  // ===== FOCUS SESSIONS =====
  app.get("/api/focus-sessions/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const sessions = await db.select().from(focusSessions)
        .where(and(eq(focusSessions.userId, userId), eq(focusSessions.status, "completed")));
      const totalMinutes = sessions.reduce((sum, s) => sum + (s.completedDuration || 0), 0);
      const totalSessions = sessions.length;
      const todayStr = new Date().toISOString().split("T")[0];
      const todaySessions = sessions.filter(s => s.completedAt && s.completedAt.toISOString().split("T")[0] === todayStr);
      const todayMinutes = todaySessions.reduce((sum, s) => sum + (s.completedDuration || 0), 0);
      res.json({ totalMinutes, totalSessions, todayMinutes, todaySessions: todaySessions.length });
    } catch (error) {
      console.error("Error fetching focus session stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/focus-sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const sessions = await db.select().from(focusSessions)
        .where(eq(focusSessions.userId, userId))
        .orderBy(sql`${focusSessions.createdAt} DESC`)
        .limit(20);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching focus sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.post("/api/focus-sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { habitId, title, duration, breakDuration } = req.body;
      const [session] = await db.insert(focusSessions)
        .values({ userId, habitId, title, duration: duration || 25, breakDuration: breakDuration || 5, status: "active", startedAt: new Date() })
        .returning();
      res.json(session);
    } catch (error) {
      console.error("Error creating focus session:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  app.patch("/api/focus-sessions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const id = parseInt(req.params.id);
      const updates = req.body;
      if (updates.status === "completed") updates.completedAt = new Date();
      const [session] = await db.update(focusSessions)
        .set(updates)
        .where(and(eq(focusSessions.id, id), eq(focusSessions.userId, userId)))
        .returning();
      res.json(session);
    } catch (error) {
      console.error("Error updating focus session:", error);
      res.status(500).json({ error: "Failed to update session" });
    }
  });

  // ==========================================
  // GOALS & MILESTONES (Premium)
  // ==========================================

  app.get("/api/goals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const userGoals = await db.select().from(goals).where(eq(goals.userId, userId)).orderBy(goals.createdAt);
      const allMilestones = await db.select().from(goalMilestones).where(eq(goalMilestones.userId, userId)).orderBy(goalMilestones.sortOrder);
      const goalsWithMilestones = userGoals.map(g => ({
        ...g,
        milestones: allMilestones.filter(m => m.goalId === g.id),
      }));
      res.json(goalsWithMilestones);
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ error: "Failed to fetch goals" });
    }
  });

  app.post("/api/goals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { title, description, category, targetDate, habitIds, milestones } = req.body;
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ error: "Title is required" });
      }
      const [goal] = await db.insert(goals).values({
        userId,
        title: title.trim(),
        description: description || null,
        category: category || null,
        targetDate: targetDate || null,
        habitIds: habitIds || [],
        progress: 0,
      }).returning();
      if (milestones && Array.isArray(milestones)) {
        for (let i = 0; i < milestones.length; i++) {
          if (milestones[i].title && milestones[i].title.trim()) {
            await db.insert(goalMilestones).values({
              goalId: goal.id,
              userId,
              title: milestones[i].title.trim(),
              description: milestones[i].description || null,
              sortOrder: i,
            });
          }
        }
      }
      const createdMilestones = await db.select().from(goalMilestones).where(eq(goalMilestones.goalId, goal.id)).orderBy(goalMilestones.sortOrder);
      res.status(201).json({ ...goal, milestones: createdMilestones });
    } catch (error) {
      console.error("Error creating goal:", error);
      res.status(500).json({ error: "Failed to create goal" });
    }
  });

  app.patch("/api/goals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const id = parseInt(req.params.id);
      const updates = req.body;
      updates.updatedAt = new Date();
      const [updated] = await db.update(goals)
        .set(updates)
        .where(and(eq(goals.id, id), eq(goals.userId, userId)))
        .returning();
      if (!updated) return res.status(404).json({ error: "Goal not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating goal:", error);
      res.status(500).json({ error: "Failed to update goal" });
    }
  });

  app.delete("/api/goals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const id = parseInt(req.params.id);
      await db.delete(goalMilestones).where(and(eq(goalMilestones.goalId, id), eq(goalMilestones.userId, userId)));
      await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting goal:", error);
      res.status(500).json({ error: "Failed to delete goal" });
    }
  });

  app.post("/api/goals/:id/milestones", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const goalId = parseInt(req.params.id);
      const { title, description } = req.body;
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ error: "Title is required" });
      }
      const existing = await db.select().from(goalMilestones).where(and(eq(goalMilestones.goalId, goalId), eq(goalMilestones.userId, userId)));
      const [milestone] = await db.insert(goalMilestones).values({
        goalId,
        userId,
        title: title.trim(),
        description: description || null,
        sortOrder: existing.length,
      }).returning();
      res.status(201).json(milestone);
    } catch (error) {
      console.error("Error adding milestone:", error);
      res.status(500).json({ error: "Failed to add milestone" });
    }
  });

  app.patch("/api/goals/:goalId/milestones/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const id = parseInt(req.params.id);
      const goalId = parseInt(req.params.goalId);
      const updates: any = { ...req.body };
      if (updates.isCompleted === true && !updates.completedAt) {
        updates.completedAt = new Date();
      }
      if (updates.isCompleted === false) {
        updates.completedAt = null;
      }
      const [updated] = await db.update(goalMilestones)
        .set(updates)
        .where(and(eq(goalMilestones.id, id), eq(goalMilestones.userId, userId), eq(goalMilestones.goalId, goalId)))
        .returning();
      if (!updated) return res.status(404).json({ error: "Milestone not found" });
      const allMilestones = await db.select().from(goalMilestones).where(eq(goalMilestones.goalId, goalId));
      const total = allMilestones.length;
      const completed = allMilestones.filter(m => m.isCompleted).length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      await db.update(goals).set({ progress, updatedAt: new Date() }).where(eq(goals.id, goalId));
      res.json(updated);
    } catch (error) {
      console.error("Error updating milestone:", error);
      res.status(500).json({ error: "Failed to update milestone" });
    }
  });

  app.delete("/api/goals/:goalId/milestones/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const id = parseInt(req.params.id);
      const goalId = parseInt(req.params.goalId);
      await db.delete(goalMilestones).where(and(eq(goalMilestones.id, id), eq(goalMilestones.userId, userId), eq(goalMilestones.goalId, goalId)));
      const allMilestones = await db.select().from(goalMilestones).where(eq(goalMilestones.goalId, goalId));
      const total = allMilestones.length;
      const completed = allMilestones.filter(m => m.isCompleted).length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      await db.update(goals).set({ progress, updatedAt: new Date() }).where(eq(goals.id, goalId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting milestone:", error);
      res.status(500).json({ error: "Failed to delete milestone" });
    }
  });

  app.post("/api/goals/:id/ai-suggestions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const id = parseInt(req.params.id);
      const [goal] = await db.select().from(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)));
      if (!goal) return res.status(404).json({ error: "Goal not found" });
      const userHabits = await db.select().from(habits).where(eq(habits.userId, userId));
      const milestones = await db.select().from(goalMilestones).where(eq(goalMilestones.goalId, id));
      const linkedHabits = userHabits.filter(h => (goal.habitIds as number[] || []).includes(h.id));
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a goal achievement coach. Provide actionable, specific advice for achieving goals. Keep suggestions concise and practical. Format as a numbered list of 5-7 suggestions.",
          },
          {
            role: "user",
            content: `Help me achieve this goal:\n\nGoal: ${goal.title}\nDescription: ${goal.description || "N/A"}\nCategory: ${goal.category || "N/A"}\nTarget Date: ${goal.targetDate || "No deadline"}\nProgress: ${goal.progress}%\n\nCurrent Milestones:\n${milestones.map(m => `- ${m.title} (${m.isCompleted ? "completed" : "pending"})`).join("\n") || "None set"}\n\nLinked Habits:\n${linkedHabits.map(h => `- ${h.title}`).join("\n") || "None linked"}\n\nProvide specific, actionable suggestions to help me make progress on this goal.`,
          },
        ],
        max_tokens: 500,
      });
      const suggestions = completion.choices[0]?.message?.content || "Unable to generate suggestions at this time.";
      await db.update(goals).set({ aiSuggestions: suggestions, updatedAt: new Date() }).where(eq(goals.id, id));
      res.json({ suggestions });
    } catch (error) {
      console.error("Error generating AI suggestions:", error);
      res.status(500).json({ error: "Failed to generate suggestions" });
    }
  });

  // ==========================================
  // SMART DAILY PLANNER (Premium Feature)
  // ==========================================

  app.get("/api/planner/:date", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const [entry] = await db.select().from(dailyPlannerEntries)
        .where(and(eq(dailyPlannerEntries.userId, userId), eq(dailyPlannerEntries.date, req.params.date)));
      if (!entry) return res.json(null);

      const blocks = (entry.blocks || []) as any[];
      let needsUpdate = false;
      const fixedBlocks = blocks.map(b => {
        if (b.type === "habit" && b.habitId && typeof b.habitId !== "number") {
          needsUpdate = true;
          return { ...b, habitId: null };
        }
        return b;
      });

      if (needsUpdate) {
        const userHabits = await db.select().from(habits).where(eq(habits.userId, userId));
        const habitTitleMap = new Map<string, number>();
        for (const h of userHabits) {
          habitTitleMap.set(h.title.toLowerCase().trim(), h.id);
        }
        const correctedBlocks = fixedBlocks.map(b => {
          if (b.type === "habit" && !b.habitId) {
            const title = (b.title || "").toLowerCase().trim();
            let matchedId = habitTitleMap.get(title) || null;
            if (!matchedId) {
              for (const [hTitle, hId] of habitTitleMap.entries()) {
                if (title.includes(hTitle) || hTitle.includes(title)) {
                  matchedId = hId;
                  break;
                }
              }
            }
            return { ...b, habitId: matchedId };
          }
          return b;
        });
        await db.update(dailyPlannerEntries)
          .set({ blocks: correctedBlocks, updatedAt: new Date() })
          .where(eq(dailyPlannerEntries.id, entry.id));
        return res.json({ ...entry, blocks: correctedBlocks });
      }

      res.json(entry);
    } catch (error) {
      console.error("Error fetching planner entry:", error);
      res.status(500).json({ error: "Failed to fetch planner entry" });
    }
  });

  app.post("/api/planner", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { date, blocks } = req.body;
      const [existing] = await db.select().from(dailyPlannerEntries)
        .where(and(eq(dailyPlannerEntries.userId, userId), eq(dailyPlannerEntries.date, date)));
      if (existing) {
        const [updated] = await db.update(dailyPlannerEntries)
          .set({ blocks, updatedAt: new Date() })
          .where(eq(dailyPlannerEntries.id, existing.id))
          .returning();
        return res.json(updated);
      }
      const [entry] = await db.insert(dailyPlannerEntries)
        .values({ userId, date, blocks })
        .returning();
      res.json(entry);
    } catch (error) {
      console.error("Error saving planner entry:", error);
      res.status(500).json({ error: "Failed to save planner entry" });
    }
  });

  async function generatePlanForDate(userId: string, date: string): Promise<any> {
    const user = await db.select().from(users).where(eq(users.id, userId)).then(r => r[0]);
    const userTimezone = user?.timezone || 'America/New_York';
    const dateObj = new Date(date + 'T12:00:00');
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: userTimezone }).toLowerCase();

    const userHabits = await db.select().from(habits).where(eq(habits.userId, userId));
    const activeHabits = userHabits.filter(h => {
      if (h.archived) return false;
      if (h.setupComplete) {
        const dPlans = ((h.dailyPlans || []) as any[]);
        const endDate = h.planEndDate || (dPlans.length > 0 ? dPlans[dPlans.length - 1]?.date : null);
        if (endDate && endDate < date) return false;
      }
      return true;
    });
    const scheduledHabits = activeHabits.filter(h => {
      const scheduleDays = h.schedule ? (h.schedule as any).days : null;
      if (scheduleDays && scheduleDays.length > 0) {
        return scheduleDays.includes(dayOfWeek);
      }
      const dPlans = ((h.dailyPlans || []) as any[]);
      return dPlans.some((p: any) => p.date === date && p.tasks?.length > 0) || !h.setupComplete;
    });

    const tasks = await db.select().from(quickTasks)
      .where(and(eq(quickTasks.userId, userId), eq(quickTasks.date, date)));

    const dayCommitments = await storage.getCommitments(userId);
    const todayCommitments = dayCommitments.filter(c =>
      (c.days as string[]).includes(dayOfWeek)
    );

    const recentMoods = await db.select().from(moodEntries)
      .where(eq(moodEntries.userId, userId))
      .orderBy(desc(moodEntries.createdAt))
      .limit(7);

    const avgEnergy = recentMoods.length > 0
      ? recentMoods.reduce((sum, m) => sum + (m.energy || 3), 0) / recentMoods.length
      : 3;
    const avgStress = recentMoods.length > 0
      ? recentMoods.reduce((sum, m) => sum + (m.stress || 3), 0) / recentMoods.length
      : 3;
    const avgSleep = recentMoods.length > 0
      ? recentMoods.reduce((sum, m) => sum + (m.sleep || 3), 0) / recentMoods.length
      : 3;

    const habitAnalytics = scheduledHabits.map(h => {
      const progress = ((h.progress || []) as any[]);
      const sessionsLast7Days = progress.filter((p: any) => {
        if (!p.date) return false;
        const pDate = new Date(p.date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return pDate >= weekAgo;
      });
      const totalMinutes = h.totalTimeSpent || 0;
      const sessionTimes = progress.map((p: any) => {
        if (p.date) {
          const d = new Date(p.date);
          return d.getHours();
        }
        return -1;
      }).filter((h: number) => h >= 0);
      const peakHour = sessionTimes.length > 0
        ? Math.round(sessionTimes.reduce((s: number, v: number) => s + v, 0) / sessionTimes.length)
        : -1;

      const streakAtRisk = (h.currentStreak || 0) > 2 &&
        !((h.dailyPlans || []) as any[]).some((p: any) =>
          p.date === date && p.tasks?.some((t: any) => t.completed));

      return {
        id: h.id,
        title: h.title,
        currentStreak: h.currentStreak || 0,
        longestStreak: h.longestStreak || 0,
        sessionsThisWeek: sessionsLast7Days.length,
        totalMinutes,
        peakHour,
        streakAtRisk,
        preferredTime: h.schedule ? (h.schedule as any).time || 'flexible' : 'flexible',
      };
    });

    const atRiskHabits = habitAnalytics.filter(h => h.streakAtRisk).map(h => h.title);
    const hasUserData = recentMoods.length > 0 || habitAnalytics.some(h => h.sessionsThisWeek > 0);

    let energyContext = "";
    if (hasUserData) {
      energyContext = `\n\nUser Energy Data (last 7 days):
- Average energy: ${avgEnergy.toFixed(1)}/5 ${avgEnergy < 2.5 ? "(LOW - schedule lighter)" : avgEnergy > 3.5 ? "(HIGH - can handle more)" : "(moderate)"}
- Average stress: ${avgStress.toFixed(1)}/5 ${avgStress > 3.5 ? "(HIGH STRESS - add extra breaks)" : ""}
- Average sleep: ${avgSleep.toFixed(1)}/5 ${avgSleep < 2.5 ? "(POOR SLEEP - ease into day)" : ""}`;
    }

    let habitDetails = "";
    if (habitAnalytics.length > 0) {
      habitDetails = habitAnalytics.map(h => {
        let detail = `- "${h.title}" [habitId=${h.id}] (preferred: ${h.preferredTime}, streak: ${h.currentStreak} days`;
        if (h.peakHour >= 0) detail += `, usually done around ${h.peakHour}:00`;
        if (h.streakAtRisk) detail += `, STREAK AT RISK`;
        detail += `)`;
        return detail;
      }).join("\n");
    } else {
      habitDetails = "No habits scheduled";
    }

    const tasksList = tasks.length > 0
      ? tasks.map(t => `- "${t.title}" (priority: ${t.priority || 'normal'})`).join("\n")
      : "No tasks";

    const commitmentsList = todayCommitments.length > 0
      ? todayCommitments.map(c => `- "${c.title}" from ${c.startTime} to ${c.endTime} (FIXED - cannot move)`).join("\n")
      : "";

    const openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: `You are an expert productivity coach creating a personalized daily schedule. Respond with this exact JSON format:
{
  "insights": {
    "focusTheme": "Short 2-4 word theme for the day (e.g., 'Deep Work & Recovery', 'Momentum Building')",
    "focusDescription": "1 sentence explaining why this theme was chosen based on user data",
    "atRiskHabits": ["habit names that need attention today"],
    "energyStrategy": "1 sentence about how energy is managed in this plan",
    "tipsForToday": ["3 actionable tips personalized to this user's day"]
  },
  "blocks": [
    {
      "id": "block-1",
      "time": "07:00",
      "endTime": "07:30",
      "title": "Morning Routine",
      "type": "habit",
      "habitId": 123,
      "taskId": null,
      "duration": 30,
      "completed": false,
      "energyLevel": "medium",
      "priority": "medium"
    }
  ]
}

SCHEDULING RULES:
- Schedule from 7AM to 10PM
- energyLevel: "high" for demanding habits/tasks, "medium" for moderate, "low" for easy/wind-down
- priority: "high" for streak-at-risk habits and important tasks, "medium" for regular, "low" for optional
- If user has LOW energy data: schedule high-energy blocks later (9-11AM), start with gentle routines
- If user has HIGH stress: add 20-min breaks every 90 minutes, include a relaxation block
- If user has POOR sleep: push demanding tasks to mid-morning, add a short rest block after lunch
- If no user data: use standard energy curve (peaks 9-11AM and 2-4PM)
- Add transition buffers: 5 min between similar tasks, 10-15 min between different types
- Put streak-at-risk habits at their peak productivity times
- Include strategic breaks (not just filler) - suggest activities like stretching, walking, hydrating
- Type must be one of: "habit", "task", "break", "custom", "commitment"
- For habit blocks: set habitId to the numeric ID shown in brackets [habitId=X] from the habit list. This is required for habit blocks.
- For commitment blocks: use type "commitment", set completed to false, do NOT schedule any other blocks during commitment times
- Do not generate harmful content`
      }, {
        role: "user",
        content: `Create my optimized schedule for ${dayOfWeek}, ${date}.
${commitmentsList ? `\nFIXED COMMITMENTS (DO NOT schedule anything during these times — work around them and include them as "commitment" type blocks):\n${commitmentsList}\n` : ""}
My habits:
${habitDetails}

My tasks:
${tasksList}${energyContext}

${atRiskHabits.length > 0 ? `\nIMPORTANT: These habits have active streaks at risk: ${atRiskHabits.join(", ")}. Prioritize them at optimal times.` : ""}
${!hasUserData ? "\nNote: This is a new user with limited history. Use sensible defaults for energy scheduling." : ""}`
      }],
      max_tokens: 3000,
      response_format: { type: "json_object" }
    });

    const rawContent = response.choices[0]?.message?.content || "{}";
    console.log("[Planner] AI raw response:", rawContent.substring(0, 500));

    let blocks: any[] = [];
    let insights: any = null;
    try {
      const parsed = JSON.parse(rawContent);
      insights = parsed.insights || null;
      if (Array.isArray(parsed)) {
        blocks = parsed;
      } else if (Array.isArray(parsed.blocks)) {
        blocks = parsed.blocks;
      } else if (Array.isArray(parsed.schedule)) {
        blocks = parsed.schedule;
      } else if (Array.isArray(parsed.timeBlocks)) {
        blocks = parsed.timeBlocks;
      } else if (Array.isArray(parsed.plan)) {
        blocks = parsed.plan;
      } else {
        const firstArrayKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
        if (firstArrayKey) {
          blocks = parsed[firstArrayKey];
        }
      }
    } catch (e) {
      console.error("[Planner] JSON parse error:", e);
      blocks = [];
    }

    const [existing] = await db.select().from(dailyPlannerEntries)
      .where(and(eq(dailyPlannerEntries.userId, userId), eq(dailyPlannerEntries.date, date)));
    const oldBlocks = existing ? ((existing.blocks || []) as any[]) : [];
    const completedMap = new Map<string, boolean>();
    for (const ob of oldBlocks) {
      if (ob.completed) {
        completedMap.set(ob.title?.toLowerCase()?.trim(), true);
        if (ob.habitId) completedMap.set(`habit-${ob.habitId}`, true);
        if (ob.taskId) completedMap.set(`task-${ob.taskId}`, true);
      }
    }

    const habitTitleToId = new Map<string, number>();
    for (const h of scheduledHabits) {
      habitTitleToId.set(h.title.toLowerCase().trim(), h.id);
    }

    const taskTitleToId = new Map<string, number>();
    for (const t of tasks) {
      taskTitleToId.set(t.title.toLowerCase().trim(), t.id);
    }

    const validHabitIds = new Set(Array.from(habitTitleToId.values()));
    const validTaskIds = new Set(Array.from(taskTitleToId.values()));
    blocks = blocks.map((b: any, i: number) => {
      const title = (b.title || b.name || "Untitled").trim();
      const type = b.type || "custom";
      let habitId = (typeof b.habitId === "number" && validHabitIds.has(b.habitId)) ? b.habitId : null;
      let taskId = (typeof b.taskId === "number" && validTaskIds.has(b.taskId)) ? b.taskId : null;

      if (type === "habit" && !habitId) {
        habitId = habitTitleToId.get(title.toLowerCase()) || null;
        if (!habitId) {
          for (const [hTitle, hId] of habitTitleToId.entries()) {
            if (title.toLowerCase().includes(hTitle) || hTitle.includes(title.toLowerCase())) {
              habitId = hId;
              break;
            }
          }
        }
      }
      if (type === "task" && !taskId) {
        taskId = taskTitleToId.get(title.toLowerCase()) || null;
      }

      const wasCompleted = completedMap.has(title.toLowerCase()) ||
        (habitId && completedMap.has(`habit-${habitId}`)) ||
        (taskId && completedMap.has(`task-${taskId}`));
      return {
        id: b.id || `block-${i + 1}`,
        time: b.time || b.startTime || "09:00",
        endTime: b.endTime || b.end_time || "",
        title,
        type,
        habitId,
        taskId,
        duration: b.duration || 30,
        completed: wasCompleted || false,
        energyLevel: b.energyLevel || "medium",
        priority: b.priority || "medium",
        skipped: false,
      };
    });

    if (!insights) {
      insights = {
        focusTheme: "Productive Day",
        focusDescription: "A balanced schedule designed to help you make progress on your habits and tasks.",
        atRiskHabits: atRiskHabits,
        energyStrategy: hasUserData ? "Schedule adapted based on your recent energy and mood patterns." : "Using standard energy optimization — demanding tasks in the morning, lighter ones later.",
        tipsForToday: ["Focus on one task at a time for best results", "Take breaks between different types of activities", "Stay hydrated throughout the day"],
      };
    }

    console.log(`[Planner] Parsed ${blocks.length} blocks for ${date} (preserved ${Array.from(completedMap.values()).filter(Boolean).length} completed states)`);

    if (existing) {
      const [updated] = await db.update(dailyPlannerEntries)
        .set({ blocks, insights, aiGenerated: true, updatedAt: new Date() })
        .where(eq(dailyPlannerEntries.id, existing.id))
        .returning();
      return updated;
    }
    const [entry] = await db.insert(dailyPlannerEntries)
      .values({ userId, date, blocks, insights, aiGenerated: true })
      .returning();
    return entry;
  }

  app.post("/api/planner/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { date } = req.body;
      const result = await generatePlanForDate(userId, date);
      res.json(result);
    } catch (error) {
      console.error("Error generating planner:", error);
      res.status(500).json({ error: "Failed to generate daily plan" });
    }
  });

  app.post("/api/planner/generate-week", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { startDate } = req.body;

      if (!startDate) {
        return res.status(400).json({ error: "startDate is required" });
      }

      const results: { date: string; status: string }[] = [];

      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate + 'T12:00:00');
        d.setDate(d.getDate() + i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

        const [existing] = await db.select().from(dailyPlannerEntries)
          .where(and(eq(dailyPlannerEntries.userId, userId), eq(dailyPlannerEntries.date, dateStr)));

        if (existing && ((existing.blocks || []) as any[]).length > 0) {
          results.push({ date: dateStr, status: "skipped" });
          continue;
        }

        try {
          await generatePlanForDate(userId, dateStr);
          results.push({ date: dateStr, status: "generated" });
        } catch (dayError) {
          console.error(`[Planner] Failed to generate for ${dateStr}:`, dayError);
          results.push({ date: dateStr, status: "failed" });
        }
      }

      const generated = results.filter(r => r.status === "generated").length;
      const skipped = results.filter(r => r.status === "skipped").length;
      const failed = results.filter(r => r.status === "failed").length;

      res.json({
        results,
        summary: {
          generated,
          skipped,
          failed,
          total: 7,
        },
      });
    } catch (error) {
      console.error("Error generating weekly planner:", error);
      res.status(500).json({ error: "Failed to generate weekly plan" });
    }
  });

  app.post("/api/planner/refresh", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { date } = req.body;

      const [existing] = await db.select().from(dailyPlannerEntries)
        .where(and(eq(dailyPlannerEntries.userId, userId), eq(dailyPlannerEntries.date, date)));
      if (!existing) return res.status(404).json({ message: "No plan for this date to refresh" });

      const currentBlocks = ((existing.blocks || []) as any[]);
      const existingTitles = new Set(currentBlocks.map(b => b.title?.toLowerCase()?.trim()));

      const tasks = await db.select().from(quickTasks)
        .where(and(eq(quickTasks.userId, userId), eq(quickTasks.date, date)));

      const newBlocks: any[] = [];
      for (const task of tasks) {
        if (!existingTitles.has(task.title.toLowerCase().trim())) {
          newBlocks.push({
            id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            time: "09:00",
            endTime: "09:30",
            title: task.title,
            type: "task",
            habitId: null,
            taskId: task.id,
            duration: 30,
            completed: task.completed || false,
          });
        }
      }

      for (const block of currentBlocks) {
        if (block.type === "task") {
          const matchingTask = tasks.find(t =>
            (block.taskId && t.id === block.taskId) || t.title.toLowerCase().trim() === block.title?.toLowerCase()?.trim()
          );
          if (matchingTask && matchingTask.completed && !block.completed) {
            block.completed = true;
          }
        }
      }

      const mergedBlocks = [...currentBlocks, ...newBlocks].sort((a, b) => (a.time || "").localeCompare(b.time || ""));

      const [updated] = await db.update(dailyPlannerEntries)
        .set({ blocks: mergedBlocks, updatedAt: new Date() })
        .where(eq(dailyPlannerEntries.id, existing.id))
        .returning();

      console.log(`[Planner] Refreshed plan for ${date}: added ${newBlocks.length} new blocks`);
      res.json(updated);
    } catch (error) {
      console.error("Error refreshing planner:", error);
      res.status(500).json({ error: "Failed to refresh plan" });
    }
  });

  app.patch("/api/planner/block", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { date, blockId, updates } = req.body;
      const [entry] = await db.select().from(dailyPlannerEntries)
        .where(and(eq(dailyPlannerEntries.userId, userId), eq(dailyPlannerEntries.date, date)));
      if (!entry) return res.status(404).json({ message: "No plan for this date" });
      const originalBlock = ((entry.blocks || []) as any[]).find(b => b.id === blockId);
      const blocks = ((entry.blocks || []) as any[]).map(b => b.id === blockId ? { ...b, ...updates } : b);
      const [updated] = await db.update(dailyPlannerEntries)
        .set({ blocks, updatedAt: new Date() })
        .where(eq(dailyPlannerEntries.id, entry.id))
        .returning();

      if (typeof updates.completed === "boolean" && originalBlock) {
        try {
          if (originalBlock.type === "task") {
            const userTasks = await db.select().from(quickTasks)
              .where(and(eq(quickTasks.userId, userId), eq(quickTasks.date, date)));
            const matchingTask = userTasks.find(t =>
              (originalBlock.taskId && t.id === originalBlock.taskId) || t.title === originalBlock.title
            );
            if (matchingTask) {
              await db.update(quickTasks)
                .set({ completed: updates.completed })
                .where(eq(quickTasks.id, matchingTask.id));
            }
          }
        } catch (syncErr) {
          console.error("Error syncing planner block to task:", syncErr);
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating planner block:", error);
      res.status(500).json({ error: "Failed to update block" });
    }
  });

  app.post("/api/planner/reschedule", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { date, blockId } = req.body;

      const [entry] = await db.select().from(dailyPlannerEntries)
        .where(and(eq(dailyPlannerEntries.userId, userId), eq(dailyPlannerEntries.date, date)));
      if (!entry) return res.status(404).json({ message: "No plan for this date" });

      const blocks = ((entry.blocks || []) as any[]);
      const skippedBlock = blocks.find(b => b.id === blockId);
      if (!skippedBlock) return res.status(404).json({ message: "Block not found" });

      const updatedBlocks = blocks.map(b =>
        b.id === blockId ? { ...b, skipped: true } : b
      );

      const occupiedTimes = new Set(blocks.filter(b => !b.skipped && b.id !== blockId).map(b => b.time));

      const dateObj = new Date(date + 'T12:00:00');
      const user = await db.select().from(users).where(eq(users.id, userId)).then(r => r[0]);
      const userTimezone = user?.timezone || 'America/New_York';
      const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: userTimezone }).toLowerCase();
      const allCommitments = await storage.getCommitments(userId);
      const dayCommitments = allCommitments.filter(c => (c.days as string[]).includes(dayOfWeek));

      const isInCommitment = (slot: string) => {
        return dayCommitments.some(c => slot >= c.startTime && slot < c.endTime);
      };

      const availableSlots: string[] = [];
      const skippedHour = parseInt(skippedBlock.time.split(":")[0]);
      for (let h = Math.max(skippedHour + 1, 7); h <= 21; h++) {
        const slot = `${String(h).padStart(2, "0")}:00`;
        if (!occupiedTimes.has(slot) && !isInCommitment(slot)) {
          availableSlots.push(slot);
        }
        const halfSlot = `${String(h).padStart(2, "0")}:30`;
        if (!occupiedTimes.has(halfSlot) && !isInCommitment(halfSlot)) {
          availableSlots.push(halfSlot);
        }
      }

      const suggestedTime = availableSlots[0] || null;

      await db.update(dailyPlannerEntries)
        .set({ blocks: updatedBlocks, updatedAt: new Date() })
        .where(eq(dailyPlannerEntries.id, entry.id));

      res.json({
        skippedBlock: { ...skippedBlock, skipped: true },
        suggestedTime,
        availableSlots: availableSlots.slice(0, 6),
      });
    } catch (error) {
      console.error("Error rescheduling block:", error);
      res.status(500).json({ error: "Failed to reschedule block" });
    }
  });

  app.post("/api/planner/reschedule-confirm", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { date, blockId, newTime } = req.body;

      const [entry] = await db.select().from(dailyPlannerEntries)
        .where(and(eq(dailyPlannerEntries.userId, userId), eq(dailyPlannerEntries.date, date)));
      if (!entry) return res.status(404).json({ message: "No plan for this date" });

      const blocks = ((entry.blocks || []) as any[]);
      const duration = blocks.find(b => b.id === blockId)?.duration || 30;
      const startH = parseInt(newTime.split(":")[0]);
      const startM = parseInt(newTime.split(":")[1]);
      const endTotalM = startM + duration;
      const endH = startH + Math.floor(endTotalM / 60);
      const endM = endTotalM % 60;
      const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

      const updatedBlocks = blocks.map(b =>
        b.id === blockId ? { ...b, time: newTime, endTime, skipped: false } : b
      ).sort((a, b) => (a.time || "").localeCompare(b.time || ""));

      const [updated] = await db.update(dailyPlannerEntries)
        .set({ blocks: updatedBlocks, updatedAt: new Date() })
        .where(eq(dailyPlannerEntries.id, entry.id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error confirming reschedule:", error);
      res.status(500).json({ error: "Failed to confirm reschedule" });
    }
  });

  app.post("/api/planner/adjust", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { date, instruction } = req.body;
      if (!date || !instruction) return res.status(400).json({ error: "date and instruction required" });
      if (typeof instruction !== "string" || instruction.length > 1000) {
        return res.status(400).json({ error: "Instruction must be under 1000 characters" });
      }

      const [entry] = await db.select().from(dailyPlannerEntries)
        .where(and(eq(dailyPlannerEntries.userId, userId), eq(dailyPlannerEntries.date, date)));
      if (!entry) return res.status(404).json({ message: "No plan for this date" });

      const currentBlocks = (entry.blocks || []) as any[];
      const blocksSummary = currentBlocks.map(b => ({
        id: b.id,
        time: b.time,
        endTime: b.endTime,
        title: b.title,
        type: b.type,
        duration: b.duration,
        completed: b.completed,
        skipped: b.skipped,
        habitId: b.habitId,
        taskId: b.taskId,
        energyLevel: b.energyLevel,
        priority: b.priority,
      }));

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a scheduling assistant. The user has a daily schedule with time blocks. They want to adjust it based on their instruction. Return the COMPLETE updated list of blocks as a JSON array. Each block must have: id, time (HH:MM 24h), endTime (HH:MM 24h), title, type (habit/task/break/custom/commitment), duration (minutes), completed (boolean), skipped (boolean), habitId (number or null), taskId (number or null), energyLevel (high/medium/low or null), priority (high/medium/low or null). Preserve existing block IDs and properties. Only modify times/order as needed. Keep completed/skipped states. Do not remove blocks unless the user asks to. Ensure no time overlaps. Return ONLY the JSON array, no explanation.`
          },
          {
            role: "user",
            content: `Current schedule for ${date}:\n${JSON.stringify(blocksSummary, null, 2)}\n\nUser request: "${instruction}"\n\nReturn the adjusted schedule as a JSON array.`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content || "[]";
      let adjustedBlocks: any[];
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        adjustedBlocks = JSON.parse(jsonMatch ? jsonMatch[0] : content);
      } catch {
        return res.status(500).json({ error: "AI returned invalid schedule format" });
      }

      const originalBlockMap = new Map(currentBlocks.map(ob => [ob.id, ob]));
      const validBlocks = adjustedBlocks.map((b: any) => {
        const orig = originalBlockMap.get(b.id);
        const habitId = (typeof b.habitId === "number") ? b.habitId : (orig?.habitId && typeof orig.habitId === "number" ? orig.habitId : null);
        const taskId = (typeof b.taskId === "number") ? b.taskId : (orig?.taskId && typeof orig.taskId === "number" ? orig.taskId : null);
        return {
          id: b.id || `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          time: b.time || "09:00",
          endTime: b.endTime || b.time || "09:30",
          title: b.title || "Untitled",
          type: b.type || "custom",
          duration: b.duration || 30,
          completed: b.completed || false,
          skipped: b.skipped || false,
          habitId,
          taskId,
          energyLevel: b.energyLevel || null,
          priority: b.priority || null,
        };
      }).sort((a: any, b: any) => (a.time || "").localeCompare(b.time || ""));

      const [updated] = await db.update(dailyPlannerEntries)
        .set({ blocks: validBlocks, updatedAt: new Date() })
        .where(eq(dailyPlannerEntries.id, entry.id))
        .returning();

      console.log(`[Planner] AI adjusted schedule for ${date}: ${validBlocks.length} blocks`);
      res.json(updated);
    } catch (error) {
      console.error("Error adjusting planner:", error);
      res.status(500).json({ error: "Failed to adjust schedule" });
    }
  });

  app.get("/api/planner/weekly-summary", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const startDate = req.query.startDate as string;
      if (!startDate) return res.status(400).json({ error: "startDate required" });

      const days: any[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate + 'T12:00:00');
        d.setDate(d.getDate() + i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const [entry] = await db.select().from(dailyPlannerEntries)
          .where(and(eq(dailyPlannerEntries.userId, userId), eq(dailyPlannerEntries.date, dateStr)));

        const blocks = entry ? ((entry.blocks || []) as any[]) : [];
        const habitBlocks = blocks.filter(b => b.type === "habit");
        const totalBlocks = blocks.length;
        const completedBlocks = blocks.filter(b => b.completed).length;
        const skippedBlocks = blocks.filter(b => b.skipped).length;
        const totalMinutes = blocks.reduce((s, b) => s + (b.duration || 0), 0);

        days.push({
          date: dateStr,
          dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
          hasPlanner: !!entry,
          totalBlocks,
          completedBlocks,
          skippedBlocks,
          habitCount: habitBlocks.length,
          completedHabits: habitBlocks.filter(b => b.completed).length,
          totalMinutes,
          completionRate: totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0,
        });
      }

      const userHabits = await db.select().from(habits).where(eq(habits.userId, userId));
      const activeHabits = userHabits.filter(h => !h.archived);
      const habitDistribution = activeHabits.map(h => {
        const scheduleDays = h.schedule ? (h.schedule as any).days : null;
        const daysPerWeek = scheduleDays?.length || 7;
        return {
          title: h.title,
          daysPerWeek,
          currentStreak: h.currentStreak || 0,
          totalTime: h.totalTimeSpent || 0,
        };
      });

      res.set("Cache-Control", "no-store, no-cache, must-revalidate");
      res.json({ days, habitDistribution });
    } catch (error) {
      console.error("Error fetching weekly summary:", error);
      res.status(500).json({ error: "Failed to fetch weekly summary" });
    }
  });

  // Get recent posts for community home
  app.get("/api/community/recent-posts", isAuthenticated, requireProOrPremium, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      
      const posts = await db.select({
        post: forumPosts,
        profile: userProfiles,
        category: forumCategories,
      })
        .from(forumPosts)
        .leftJoin(userProfiles, eq(forumPosts.userId, userProfiles.userId))
        .leftJoin(forumCategories, eq(forumPosts.categoryId, forumCategories.id))
        .orderBy(sql`${forumPosts.lastActivityAt} DESC`)
        .limit(limit);
      
      res.json(posts.map(p => ({
        ...p.post,
        author: p.profile ? { displayName: p.profile.displayName, avatarUrl: p.profile.avatarUrl } : null,
        category: p.category,
      })));
    } catch (error) {
      console.error("Error fetching recent posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  // ==========================================
  // USER COMMITMENTS (My Routine)
  // ==========================================

  app.get("/api/commitments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const commitments = await storage.getCommitments(userId);
      res.json(commitments);
    } catch (error) {
      console.error("Error fetching commitments:", error);
      res.status(500).json({ error: "Failed to fetch commitments" });
    }
  });

  app.post("/api/commitments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const parsed = insertCommitmentSchema.parse({ ...req.body, userId });
      const commitment = await storage.createCommitment(userId, parsed);
      res.json(commitment);
    } catch (error: any) {
      if (error?.name === "ZodError") {
        return res.status(400).json({ error: "Invalid commitment data", details: error.errors });
      }
      console.error("Error creating commitment:", error);
      res.status(500).json({ error: "Failed to create commitment" });
    }
  });

  app.patch("/api/commitments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const id = parseInt(req.params.id);
      const updated = await storage.updateCommitment(id, userId, req.body);
      if (!updated) return res.status(404).json({ error: "Commitment not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating commitment:", error);
      res.status(500).json({ error: "Failed to update commitment" });
    }
  });

  app.delete("/api/commitments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const id = parseInt(req.params.id);
      await storage.deleteCommitment(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting commitment:", error);
      res.status(500).json({ error: "Failed to delete commitment" });
    }
  });

  return httpServer;
}
