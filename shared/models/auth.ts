import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Subscription tier type
export type SubscriptionTier = "free" | "pro" | "premium";

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  hasPaid: boolean("has_paid").default(false),
  subscriptionTier: varchar("subscription_tier").default("free"), // free, pro, premium
  stripeCustomerId: varchar("stripe_customer_id"),
  subscriptionId: varchar("subscription_id"),
  subscriptionStatus: varchar("subscription_status"), // active, cancelled, past_due, etc.
  isAdmin: boolean("is_admin").default(false),
  theme: varchar("theme").default("light"), // light, dark, auto
  colorTheme: varchar("color_theme").default("nature"), // nature, minimal, ocean, sunset, lavender, forest
  darkModeSchedule: jsonb("dark_mode_schedule").$type<{ enabled: boolean; startHour: number; endHour: number }>(), // Auto dark mode
  emailReminders: boolean("email_reminders").default(true),
  timezone: varchar("timezone"),
  trialEndsAt: timestamp("trial_ends_at"), // 7-day trial period end date
  
  // Premium features
  streakFreezesAllowed: varchar("streak_freezes_allowed").default("2"), // Freezes allowed per month
  publicProfileEnabled: boolean("public_profile_enabled").default(false),
  publicProfileSlug: varchar("public_profile_slug").unique(),
  tosAcceptedAt: timestamp("tos_accepted_at"),
  
  // Coach chat usage tracking
  coachMessagesUsed: integer("coach_messages_used").default(0),
  coachMessagesResetAt: timestamp("coach_messages_reset_at"),
  
  // Onboarding
  onboardingComplete: boolean("onboarding_complete").default(false),
  tourCompleted: boolean("tour_completed").default(false),
  
  // Email preferences
  dailyReminderEnabled: boolean("daily_reminder_enabled").default(true),
  weeklyDigestEnabled: boolean("weekly_digest_enabled").default(true),
  dailyReminderTime: varchar("daily_reminder_time").default("08:00"), // HH:mm
  lastDailyReminderSent: varchar("last_daily_reminder_sent"), // ISO date
  lastWeeklyDigestSent: varchar("last_weekly_digest_sent"), // ISO date
  
  // Gamification
  xpPoints: integer("xp_points").default(0),
  level: integer("level").default(1),
  dailyChallengesCompleted: integer("daily_challenges_completed").default(0),
  weeklyXpGoal: integer("weekly_xp_goal").default(500),
  lastDailyChallengeDate: varchar("last_daily_challenge_date"), // ISO date string
  accentColor: varchar("accent_color"), // Premium reward color, separate from colorTheme
  
  pushNotificationsEnabled: boolean("push_notifications_enabled").default(true),
  pushHabitReminders: boolean("push_habit_reminders").default(true),
  pushStreakAlerts: boolean("push_streak_alerts").default(true),
  pushJournalReminder: boolean("push_journal_reminder").default(true),
  pushMoodCheckin: boolean("push_mood_checkin").default(true),
  pushTimerComplete: boolean("push_timer_complete").default(true),
  pushGoalMilestones: boolean("push_goal_milestones").default(true),
  pushDailyPlanner: boolean("push_daily_planner").default(true),
  journalReminderTime: varchar("journal_reminder_time").default("20:00"),
  moodCheckinTimes: jsonb("mood_checkin_times").$type<string[]>().default(["09:00", "14:00", "20:00"]),
  streakAlertTime: varchar("streak_alert_time").default("19:00"),
  dailyPlannerTime: varchar("daily_planner_time").default("07:00"),
  habitReminderTime: varchar("habit_reminder_time").default("08:00"),
  
  lastJournalReminderSent: varchar("last_journal_reminder_sent"),
  lastMoodCheckinSent: jsonb("last_mood_checkin_sent").$type<Record<string, string>>(),
  lastStreakAlertSent: varchar("last_streak_alert_sent"),
  lastDailyPlannerSent: varchar("last_daily_planner_sent"),
  lastGoalMilestoneSent: varchar("last_goal_milestone_sent"),
  lastHabitRemindersSent: jsonb("last_habit_reminders_sent").$type<Record<string, string>>(),
  lastPlanAdjustNotified: varchar("last_plan_adjust_notified"),
  
  signupSource: varchar("signup_source"),
  signupUtmSource: varchar("signup_utm_source"),
  signupUtmMedium: varchar("signup_utm_medium"),
  signupUtmCampaign: varchar("signup_utm_campaign"),
  signupGclid: varchar("signup_gclid"),
  
  billingInterval: varchar("billing_interval"),
  isFoundingMember: boolean("is_founding_member").default(false),

  passwordHash: varchar("password_hash"),
  authProvider: varchar("auth_provider").default("replit"),
  appleUserId: varchar("apple_user_id"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  token: varchar("token").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export const foundingMemberSlots = pgTable("founding_member_slots", {
  id: serial("id").primaryKey(),
  tier: varchar("tier").notNull(),
  totalSlots: integer("total_slots").notNull(),
  usedSlots: integer("used_slots").notNull().default(0),
  priceYearly: integer("price_yearly").notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Daily Challenges table
export const dailyChallenges = pgTable("daily_challenges", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: varchar("date").notNull(), // ISO date string
  challengeType: varchar("challenge_type").notNull(), // complete_habit, time_goal, streak_bonus, etc.
  title: varchar("title").notNull(),
  description: varchar("description").notNull(),
  xpReward: integer("xp_reward").notNull().default(50),
  targetValue: integer("target_value"), // e.g., complete 3 tasks
  currentValue: integer("current_value").default(0),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type DailyChallenge = typeof dailyChallenges.$inferSelect;
export type InsertDailyChallenge = typeof dailyChallenges.$inferInsert;

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type", { length: 10 }).notNull().default("web"),
  endpoint: text("endpoint"),
  p256dh: text("p256dh"),
  auth: text("auth"),
  deviceToken: text("device_token"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
