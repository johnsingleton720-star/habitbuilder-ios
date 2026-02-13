import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { sql, eq, and, isNotNull } from "drizzle-orm";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { openai as openaiClient } from "./replit_integrations/audio";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { db } from "./db";
import { users, feedback, userAchievements, habitTemplates, userTemplates, accountabilityPartners, progressReports, habits, dailyChallenges, moodEntries, pageViews, userProfiles, forumCategories, forumPosts, forumComments, postLikes, commentLikes, profileLikes, conversations, messages, coachChats, coachMessages, quickTasks } from "@shared/schema";
import crypto from "crypto";
import { checkContentSafety } from "./contentSafety";
import { sendAccountabilityInviteEmail, sendProgressUpdateEmail, sendAdminBulkEmail } from "./email";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const PRIMARY_DOMAIN = "habitbuilder.pro";

  app.use((req, res, next) => {
    const host = req.hostname;
    if (
      host &&
      host !== PRIMARY_DOMAIN &&
      host.endsWith(".replit.app") &&
      (req.method === "GET" || req.method === "HEAD") &&
      !req.path.startsWith("/api/")
    ) {
      const target = `https://${PRIMARY_DOMAIN}${req.originalUrl}`;
      return res.redirect(301, target);
    }
    next();
  });

  // Auth setup
  await setupAuth(app);
  registerAuthRoutes(app);
  
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
  const colorThemeSchema = z.object({
    colorTheme: z.enum(["nature", "minimal", "ocean", "sunset", "lavender", "forest"]),
  });

  const premiumThemes = ["ocean", "sunset", "lavender", "forest"];

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
            const plan = habit.actionPlan as any;
            if (plan?.daily) {
              const dailyTasks = Array.isArray(plan.daily) ? plan.daily : [];
              for (const task of dailyTasks.slice(0, 2)) {
                todayTasks.push({ habitTitle: habit.title, taskTitle: typeof task === 'string' ? task : task.title || task.task || 'Check your plan' });
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

  app.post("/api/quick-tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { title, date, scheduledTime } = req.body;
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
      }).returning();
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating quick task:", error);
      res.status(500).json({ error: "Failed to create quick task" });
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
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }
      const [updated] = await db.update(quickTasks)
        .set(updates)
        .where(and(eq(quickTasks.id, taskId), eq(quickTasks.userId, userId)))
        .returning();
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
      
      // Check trial/subscription limits for habit creation
      const existingHabits = await storage.getHabits(userId);
      const trialEndsAt = user?.trialEndsAt ? new Date(user.trialEndsAt) : null;
      const isInTrial = trialEndsAt && trialEndsAt > new Date();
      const hasPaidSubscription = user?.hasPaid && (user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'premium');
      const isAdmin = user?.isAdmin === true;
      
      // Free users: max 1 habit, Trial users: max 3 habits, Pro/Premium/Admin: unlimited
      if (!hasPaidSubscription && !isAdmin) {
        if (isInTrial && existingHabits.length >= 3) {
          return res.status(403).json({ 
            error: "Trial users can create up to 3 habits. Subscribe to Pro or Premium for unlimited habits." 
          });
        }
        if (!isInTrial && existingHabits.length >= 1) {
          return res.status(403).json({ 
            error: "Free users can have 1 habit. Upgrade to Pro ($6/mo) for unlimited habits." 
          });
        }
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
            'Up to 3 habits',
            'Basic streak tracking',
            'Simple progress charts',
            'Community templates',
          ],
          limitations: [
            'No AI coaching',
            'No personalized plans',
            'No session summaries',
          ],
        },
      ];
      
      if (proProduct) {
        const proPrices = await stripe.prices.list({
          product: proProduct.id,
          active: true,
        });
        const proPrice = proPrices.data.find(p => p.recurring?.interval === 'month');
        
        tiers.push({
          tier: 'pro',
          name: 'Pro',
          price: proPrice?.unit_amount || 600,
          priceId: proPrice?.id,
          description: 'AI-powered habit coaching for serious growth',
          features: [
            'Unlimited habits',
            'AI-powered habit coaching',
            'Personalized action plans',
            'Guided sessions with timers',
            'AI session summaries',
            'Progress streaks & achievements',
            'Habit templates library',
            'Custom icons & colors',
            'Gamification with XP & levels',
            'Dark mode & theme options',
            'Daily challenges',
            'Streak protection',
            'Mood tracking',
            'Weekly progress reports (coming soon)',
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
        
        tiers.push({
          tier: 'premium',
          name: 'Premium',
          price: premiumPrice?.unit_amount || 1500,
          priceId: premiumPrice?.id,
          description: 'Maximum support for transformational habits',
          features: [
            'Everything in Pro',
            'AI Coach Chat (150 msgs/month)',
            'Habit stacking & linking',
            'Voice notes during sessions',
            'Advanced analytics dashboard',
            'AI-powered insights & correlations',
            'Accountability partner sharing',
            'Progress update notifications',
            'Fillable PDF templates (type directly in PDF)',
            'Email reminders (coming soon)',
            'Monthly personalized reports (coming soon)',
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
      const { priceId, tier } = req.body;

      if (!priceId) {
        return res.status(400).json({ error: "Price ID required" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = `https://${PRIMARY_DOMAIN}`;

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

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${baseUrl}/?payment=success&tier=${encodeURIComponent(tier || 'pro')}`,
        cancel_url: `${baseUrl}/?payment=cancelled`,
        customer: customerId,
        allow_promotion_codes: true,
        locale: 'auto',
        metadata: {
          userId: userId,
          tier: tier || 'pro',
        },
        subscription_data: {
          metadata: { userId, tier: tier || 'pro' },
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
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

      console.log(`Synced subscription for user ${userEmail}: tier=${tier}, status=${subscription.status}`);
      
      res.json({ 
        synced: true, 
        tier, 
        status: subscription.status,
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

      res.json({
        hasSubscription: true,
        subscriptionId: activeSub.id,
        status: activeSub.status,
        cancelAtPeriodEnd: activeSub.cancel_at_period_end,
        currentPeriodEnd: (activeSub as any).current_period_end,
        currentTier,
        priceId: price?.id,
        amount,
        productName: product?.name || (currentTier === 'premium' ? 'Premium' : 'Pro'),
      });
    } catch (error: any) {
      console.error("Subscription details error:", error?.message || error);
      res.status(500).json({ error: "Failed to fetch subscription details" });
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

      const prompt = `Create a detailed action plan for building the habit: "${habitTitle}"
${habitDescription ? `Description: ${habitDescription}` : ''}
${goal ? `Goal: ${goal}` : ''}

Return a JSON object with:
1. "steps": An array of 5-7 actionable steps to build this habit. Each step should have:
   - "id": A unique string ID (use step-1, step-2, etc.)
   - "text": A clear, actionable step - phrase as a question or exploration prompt the user can reflect on
   - "completed": false
   - "explored": false
   - "options": [] (empty array)
   - "customResponse": ""

2. "tips": An array of 4 helpful tips/advice. Each tip should have:
   - "id": A unique string ID (use tip-1, tip-2, etc.)
   - "text": A helpful tip or piece of advice
   - "category": One of "motivation", "technique", "science", or "reminder"

IMPORTANT: Make steps interactive and explorable - phrase them as questions or reflective prompts that users can think about deeply (e.g., "Identify what triggers your stress or anxiety" or "Decide on your ideal time and location for this habit").
Make the tips varied across categories. Be specific and practical.`;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a habit coach. Provide actionable, specific guidance for building new habits. Always return valid JSON. IMPORTANT: Never mention specific third-party apps, brands, services, or competitors by name (e.g. no Duolingo, Headspace, Calm, MyFitnessPal, etc.). Use generic descriptions instead (e.g. 'a language learning app' or 'a meditation app').",
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
            content: "You are a behavioral psychologist and expert habit coach trained in techniques from BJ Fogg (Tiny Habits), James Clear (Atomic Habits), and Charles Duhigg (The Power of Habit). Your intake interviews are deeply personal and specific — you never ask generic questions. You probe for exact details about the person's life, routine, past failures, emotional drivers, and environment so you can build a plan rooted in proven behavior change science. Always return valid JSON. Never mention specific third-party apps, brands, or services by name. SAFETY: Do not generate content that promotes violence, illegal activities, exploitation of minors, self-harm, or explicit sexual content. If a habit request seems harmful, respond with questions that redirect toward positive, healthy alternatives.",
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

      // Build context from questionnaire
      const contextSummary = questions
        .filter((q: any) => q.answer)
        .map((q: any) => `Q: ${q.question}\nA: ${q.answer}`)
        .join("\n\n");

      let fixedDailyPlans: any[];

      if (duration === "monthly") {
        const weekPrompt = `Create a personalized 4-week habit plan for: "${habit.title}"

User's interview answers:
${contextSummary}

Create exactly 4 weeks. Each week has a theme and 3-4 daily tasks that apply to each day of that week.
Progress difficulty: Week 1 = easy wins, Week 4 = full routine.

Also recommend a schedule based on the user's answers — which days of the week to practice and the best time of day (in HH:mm 24-hour format). Use their daily routine, available time, and habits they mentioned to pick the optimal days and time.

Return JSON:
{
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "Week theme (e.g., 'Building the Foundation')",
      "dailyTasks": [
        {
          "title": "Action-oriented title",
          "description": "Detailed instructions:\\n1) Step one\\n2) Step two\\nPro Tip: helpful advice",
          "duration": 10
        }
      ]
    }
  ],
  "schedule": {
    "days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    "time": "08:00"
  },
  "aiContext": "2-3 sentence summary of goals and recommended approach"
}

REQUIREMENTS:
1. Each task description: 30-60 words with numbered steps (use \\n)
2. Be specific to their answers (time available, experience level)
3. Progress difficulty gradually across weeks
4. Include concrete numbers (reps, minutes, amounts)
5. Reference their specific situation
6. Schedule days must use lowercase full day names: monday, tuesday, wednesday, thursday, friday, saturday, sunday
7. Schedule time must be in HH:mm 24-hour format (e.g., "07:00", "18:30")`;

        const weekResponse = await openaiClient.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are an expert habit coach. Create detailed, personalized action plans. Always return valid JSON with exactly 4 weeks. Never mention specific third-party apps, brands, or services by name — use generic descriptions instead. SAFETY: Never generate content promoting violence, illegal activities, exploitation of minors, self-harm, or explicit sexual content. Focus only on positive, healthy habit-building.",
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

      const prompt = `Create a personalized ${duration} action plan for: "${habit.title}"

User's interview answers:
${contextSummary}

Create ${daysCount} daily plans with 3-4 tasks each.

Also recommend a schedule based on the user's answers — which days of the week to practice and the best time of day (in HH:mm 24-hour format). Use their daily routine, available time, and habits they mentioned to pick the optimal days and time.

Return JSON:
{
  "dailyPlans": [
    {
      "date": "${startDate.toISOString().split('T')[0]}",
      "dayNumber": 1,
      "focus": "Day theme (e.g., 'Getting Started')",
      "tasks": [
        {
          "id": "day1-task1",
          "title": "Action-oriented title",
          "description": "Detailed instructions formatted with line breaks between steps:\\n1) What to do\\n2) Step-by-step how\\n3) A concrete example\\nPro Tip: One helpful tip. Include specific numbers, durations, and measurable targets.",
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
  "aiContext": "2-3 sentence summary of goals and recommended approach"
}

REQUIREMENTS:
1. Each task description: 50-100 words with numbered steps separated by newlines (use \\n in the JSON)
2. Be specific to their answers (time available, experience level)
3. Progress difficulty gradually - Day 1 is easy wins
4. Include concrete numbers (reps, minutes, amounts)
5. Reference their specific situation in descriptions
6. Format descriptions as: "1) First step\\n2) Second step\\n3) Third step\\nPro Tip: helpful advice"
7. Schedule days must use lowercase full day names: monday, tuesday, wednesday, thursday, friday, saturday, sunday
8. Schedule time must be in HH:mm 24-hour format (e.g., "07:00", "18:30")`;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert habit coach. Create detailed, personalized action plans based on user's specific situation. Always return valid JSON. Never mention specific third-party apps, brands, or services by name — use generic descriptions instead (e.g. 'a meditation app' not 'Headspace'). SAFETY: Never generate content promoting violence, illegal activities, exploitation of minors, self-harm, or explicit sexual content. Focus only on positive, healthy habit-building.",
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

      const contextSummary = questions
        .filter((q: any) => q.answer)
        .map((q: any) => `Q: ${q.question}\nA: ${q.answer}`)
        .join("\n\n");

      let fixedDailyPlans: any[];

      if (duration === "monthly") {
        const weekPrompt = `Create a personalized 4-week habit plan for: "${habit.title}"
${habit.goal ? `Goal: ${habit.goal}` : ""}

User's interview answers:
${contextSummary}

Create exactly 4 weeks. Each week has a theme and 3-4 daily tasks that apply to each day of that week.
Progress difficulty: Week 1 = easy wins, Week 4 = full routine.

Return JSON:
{
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "Week theme",
      "dailyTasks": [
        {
          "title": "Action-oriented title",
          "description": "Detailed instructions:\\n1) Step one\\n2) Step two\\nPro Tip: helpful advice",
          "duration": 10
        }
      ]
    }
  ],
  "aiContext": "2-3 sentence summary of goals and recommended approach"
}

REQUIREMENTS:
1. Each task description: 30-60 words with numbered steps (use \\n)
2. Be specific to their answers (time available, experience level)
3. Progress difficulty gradually across weeks
4. Include concrete numbers (reps, minutes, amounts)
5. Reference their specific situation`;

        const weekResponse = await openaiClient.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are an expert habit coach. Create detailed, personalized action plans. Always return valid JSON with exactly 4 weeks. SAFETY: Never generate content promoting violence, illegal activities, exploitation of minors, self-harm, or explicit sexual content. Focus only on positive, healthy habit-building.",
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
      const prompt = `Create a personalized ${duration} action plan for: "${habit.title}"
${habit.goal ? `Goal: ${habit.goal}` : ""}

User's interview answers:
${contextSummary}

Create ${daysCount} daily plans with 3-4 tasks each.

Return JSON:
{
  "dailyPlans": [
    {
      "date": "${startDate.toISOString().split('T')[0]}",
      "dayNumber": 1,
      "focus": "Day theme",
      "tasks": [
        {
          "id": "day1-task1",
          "title": "Action-oriented title",
          "description": "Detailed instructions:\\n1) What to do\\n2) Step-by-step how\\nPro Tip: One helpful tip.",
          "duration": 10,
          "completed": false,
          "notes": ""
        }
      ],
      "completed": false,
      "timeSpent": 0
    }
  ],
  "aiContext": "2-3 sentence summary of goals and recommended approach"
}

REQUIREMENTS:
1. Each task description: 50-100 words with numbered steps separated by newlines (use \\n in the JSON)
2. Be specific to their answers (time available, experience level)
3. Progress difficulty gradually - Day 1 is easy wins
4. Include concrete numbers (reps, minutes, amounts)
5. Reference their specific situation in descriptions`;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert habit coach. Create detailed, personalized action plans based on user's specific situation. Always return valid JSON. Never mention specific third-party apps, brands, or services by name — use generic descriptions instead (e.g. 'a meditation app' not 'Headspace'). SAFETY: Never generate content promoting violence, illegal activities, exploitation of minors, self-harm, or explicit sexual content. Focus only on positive, healthy habit-building.",
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

      const prompt = `Create an EXTENSION plan for the habit: "${habit.title}"
${habit.goal ? `Goal: ${habit.goal}` : ""}

User's interview answers:
${contextSummary}

Previous plan context: ${habit.aiContext || "No additional context"}
The user completed ${completedDays} out of ${totalDays} days in their previous plan.

Create ${daysCount} new daily plans continuing from where they left off. 
This is a CONTINUATION - build on progress made, increase difficulty slightly.
Day numbering starts at ${totalDays + 1}.

Return JSON:
{
  "dailyPlans": [
    {
      "date": "${newStartDate.toISOString().split('T')[0]}",
      "dayNumber": ${totalDays + 1},
      "focus": "Day theme",
      "tasks": [
        {
          "id": "day${totalDays + 1}-task1",
          "title": "Action-oriented title",
          "description": "Detailed instructions",
          "duration": 10,
          "completed": false,
          "notes": ""
        }
      ],
      "completed": false,
      "timeSpent": 0
    }
  ],
  "aiContext": "Updated summary including extension goals"
}

REQUIREMENTS:
1. Each task description: 50-100 words with numbered steps
2. Build on previous plan progress - increase difficulty
3. Include concrete numbers (reps, minutes, amounts)
4. Reference their specific situation`;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert habit coach. Create detailed, personalized action plans that build on previous progress. Always return valid JSON. SAFETY: Never generate harmful content.",
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
      
      const updated = await storage.updateHabit(habitId, userId, { archived: !!archived });
      res.json(updated);
    } catch (error) {
      console.error("Error archiving habit:", error);
      res.status(500).json({ error: "Failed to archive habit" });
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

      await storage.updateHabit(habitId, userId, {
        dailyPlans,
        totalTimeSpent,
        currentStreak,
        longestStreak: Math.max(habit.longestStreak || 0, currentStreak),
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

  // Save session notes and progress
  app.post("/api/habits/:id/session-complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);
      const { date, tasksCompleted, totalTasks, timeSpent, goalTime, notes, mood } = req.body;
      
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

      const newTotalTime = (habit.totalTimeSpent || 0) + timeSpent;

      await storage.updateHabit(habitId, userId, {
        dailyPlans,
        progress,
        totalTimeSpent: newTotalTime,
        currentStreak,
        longestStreak: Math.max(habit.longestStreak || 0, currentStreak),
      });

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
2. For books, include the book title and author in searchQuery (e.g., "Atomic Habits James Clear book").
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
        const type = resource.type || 'website';
        if (type === 'book') {
          return `https://www.google.com/search?q=${encodeURIComponent(query + ' book')}`;
        }
        if (type === 'course') {
          return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        }
        if (type === 'video' || type === 'podcast') {
          return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        }
        return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
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

      const prompt = `Generate a brief, personalized daily motivation for someone working on: "${habit.title}"

Today's plan: ${tasksToday.length} tasks, ${completedToday} completed
Current streak: ${habit.currentStreak || 0} days
${todayPlan?.focus ? `Today's focus: ${todayPlan.focus}` : ''}

Return JSON with:
{
  "morningMotivation": "Brief inspiring message for starting the day (1-2 sentences)",
  "focusReminder": "What to focus on today specifically",
  "quickTip": "One quick tip for success today",
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

  // Check user payment status and trial - AUTO-SYNC from Stripe if needed
  app.get("/api/payment-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const userEmail = req.user!.claims.email;
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
      
      // Check if trial is still active using trialEndsAt field
      const trialEndsAt = user?.trialEndsAt ? new Date(user.trialEndsAt) : null;
      const isTrialActive = trialEndsAt ? Date.now() < trialEndsAt.getTime() : false;
      
      // Admin users always have access
      const isAdmin = user?.isAdmin || false;
      
      res.json({ 
        hasPaid: user?.hasPaid || isAdmin,
        isTrialActive,
        trialEndsAt: trialEndsAt?.toISOString() || null,
      });
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

      await checkAndAwardAchievements(userId);

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
            content: `You are an expert habit coaching AI. Generate a comprehensive, detailed habit plan for the user's goal. Return ONLY valid JSON with this structure:
{
  "title": "Compelling plan title",
  "summary": "1-2 sentence summary of the approach",
  "daily": [
    {"task": "Specific daily action", "duration": "5 min", "xp": 25},
    {"task": "Another daily action", "duration": "10 min", "xp": 35},
    {"task": "Third daily action", "duration": "15 min", "xp": 50}
  ],
  "weekly": [
    {"task": "Weekly milestone or review task", "duration": "20 min", "xp": 75},
    {"task": "Another weekly goal", "duration": "15 min", "xp": 60}
  ],
  "monthly": [
    {"task": "Monthly assessment or challenge", "xp": 150},
    {"task": "Big picture review", "xp": 100}
  ],
  "insight": "One motivational insight backed by psychology or science",
  "tips": ["Expert tip 1", "Expert tip 2", "Expert tip 3"],
  "resources": [
    {"name": "Resource name", "type": "article", "searchQuery": "specific search terms"},
    {"name": "Resource name", "type": "book", "searchQuery": "book title author"},
    {"name": "Resource name", "type": "video", "searchQuery": "specific video search"}
  ],
  "coachMessage": "A personalized encouraging message from the AI coach about starting this journey, 2-3 sentences",
  "stackSuggestion": "Suggest a complementary habit that pairs well with this one and explain why"
}
Be specific, practical, and personalized. Include realistic time estimates and XP rewards. IMPORTANT: Never mention specific third-party apps, brands, or services by name (no Duolingo, Headspace, Calm, etc.). Use generic descriptions instead. Do not generate any harmful, violent, or explicit content. Resources should have searchQuery fields, NOT urls.`
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
          let url = '';
          if (r.type === 'video') {
            url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
          } else if (r.type === 'book') {
            url = `https://www.google.com/search?q=${encodeURIComponent(query + ' book')}`;
          } else {
            url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
          }
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
            const currentXp = user?.xpPoints || 0;
            await db.update(users)
              .set({
                xpPoints: currentXp + challenge.xpReward,
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
      if (completed && !challenge.completed) {
        const user = await storage.getUser(userId);
        const currentXp = user?.xpPoints || 0;
        await db.update(users)
          .set({ 
            xpPoints: currentXp + challenge.xpReward,
            dailyChallengesCompleted: (user?.dailyChallengesCompleted || 0) + 1,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
      }
      
      res.json({ challenge: updated, completed, xpAwarded: completed ? challenge.xpReward : 0 });
    } catch (error) {
      console.error("Error updating challenge:", error);
      res.status(500).json({ error: "Failed to update challenge" });
    }
  });

  // ===== VISITOR TRACKING & ADMIN ANALYTICS =====

  // Track page view (called from frontend)
  app.post("/api/track", async (req: any, res) => {
    try {
      const { path, referrer, sessionId } = req.body;
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

  return httpServer;
}
