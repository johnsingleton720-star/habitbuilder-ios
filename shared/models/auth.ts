import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

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
  darkModeSchedule: jsonb("dark_mode_schedule").$type<{ enabled: boolean; startHour: number; endHour: number }>(), // Auto dark mode
  emailReminders: boolean("email_reminders").default(true),
  trialEndsAt: timestamp("trial_ends_at"), // 2-day trial period end date
  
  // Premium features
  streakFreezesAllowed: varchar("streak_freezes_allowed").default("2"), // Freezes allowed per month
  publicProfileEnabled: boolean("public_profile_enabled").default(false),
  publicProfileSlug: varchar("public_profile_slug").unique(), // Unique slug for public profile
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
