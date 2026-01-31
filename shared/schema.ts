import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Export Auth and Chat models
export * from "./models/auth";
export * from "./models/chat";

import { users } from "./models/auth";

// Question asked during habit setup interview
export interface HabitQuestion {
  id: string;
  question: string;
  answer: string;
}

// Resource or tool recommendation for a task
export interface TaskResource {
  id: string;
  name: string;
  type: "app" | "website" | "tool" | "book" | "template" | "video";
  url?: string;
  description: string;
}

// Detailed guidance for a task
export interface TaskGuidance {
  examples: string[];
  tips: string[];
  resources: TaskResource[];
  templates?: string[];
  videoSuggestions?: {
    title: string;
    searchQuery: string;
    platform: "youtube" | "other";
  }[];
}

// Daily routine task within an action plan
export interface RoutineTask {
  id: string;
  title: string;
  description: string;
  duration: number; // Minutes
  completed: boolean;
  notes?: string;
  guidance?: TaskGuidance;
}

// Daily action plan for a specific date
export interface DailyPlan {
  date: string; // ISO date string
  dayNumber?: number;
  focus?: string; // Theme for the day
  tasks: RoutineTask[];
  completed: boolean;
  timeSpent: number; // Total minutes spent
  sessionNotes?: string;
}

// Progress log entry for tracking
export interface ProgressEntry {
  date: string;
  tasksCompleted: number;
  totalTasks: number;
  timeSpent: number;
  goalTime?: number;
  notes: string;
  mood?: "great" | "good" | "okay" | "struggling";
}

// AI-generated tip type
export interface HabitTip {
  id: string;
  text: string;
  category: "motivation" | "technique" | "science" | "reminder";
}

// Schedule type for habit scheduling
export interface HabitSchedule {
  days: string[]; // Array of day names: "monday", "tuesday", etc.
  time: string; // Time in HH:mm format
  reminder: boolean; // Whether to show reminders
}

export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  goal: text("goal"),
  
  // Setup phase
  setupComplete: boolean("setup_complete").default(false),
  questions: jsonb("questions").$type<HabitQuestion[]>().default([]),
  
  // Plan configuration
  planDuration: text("plan_duration").default("weekly"), // daily, weekly, monthly
  planStartDate: text("plan_start_date"),
  planEndDate: text("plan_end_date"),
  
  // Schedule
  schedule: jsonb("schedule").$type<HabitSchedule>(),
  
  // Action plans and progress
  dailyPlans: jsonb("daily_plans").$type<DailyPlan[]>().default([]),
  progress: jsonb("progress").$type<ProgressEntry[]>().default([]),
  
  // Stats
  totalTimeSpent: integer("total_time_spent").default(0), // Minutes
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  
  // AI guidance
  aiTips: jsonb("ai_tips").$type<HabitTip[]>().default([]),
  aiContext: text("ai_context"), // Summary of user's goals/context for AI
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertHabitSchema = createInsertSchema(habits).omit({
  id: true,
  createdAt: true,
  userId: true, // Set by backend from session
});

export type Habit = typeof habits.$inferSelect;
export type InsertHabit = z.infer<typeof insertHabitSchema>;

// Custom types for API
export type CreateHabitRequest = z.infer<typeof insertHabitSchema>;
export type UpdateHabitRequest = Partial<CreateHabitRequest>;

// Customer Feedback table
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  userEmail: text("user_email"),
  userName: text("user_name"),
  type: text("type").notNull().default("feedback"), // feedback, bug, feature, support
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("new"), // new, in_progress, resolved, closed
  priority: text("priority").default("normal"), // low, normal, high, urgent
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  priority: true,
  adminNotes: true,
});

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

// Achievement types
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "streak" | "completion" | "time" | "milestone";
  requirement: number; // e.g., 7 for 7-day streak
  unlockedAt?: string; // ISO date when unlocked
}

// User achievements table
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  achievementId: text("achievement_id").notNull(), // matches Achievement.id
  unlockedAt: timestamp("unlocked_at").defaultNow(),
});

export type UserAchievement = typeof userAchievements.$inferSelect;

// Habit templates library
export const habitTemplates = pgTable("habit_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // health, productivity, wellness, learning, etc.
  icon: text("icon").default("Target"),
  color: text("color").default("teal-600"),
  suggestedGoal: text("suggested_goal"),
  suggestedQuestions: jsonb("suggested_questions").$type<HabitQuestion[]>().default([]),
  suggestedPlan: jsonb("suggested_plan").$type<RoutineTask[]>().default([]),
  isPremium: boolean("is_premium").default(false), // Premium-only templates
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertHabitTemplateSchema = createInsertSchema(habitTemplates).omit({
  id: true,
  createdAt: true,
  usageCount: true,
});

export type HabitTemplate = typeof habitTemplates.$inferSelect;
export type InsertHabitTemplate = z.infer<typeof insertHabitTemplateSchema>;

// Accountability partners
export const accountabilityPartners = pgTable("accountability_partners", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  partnerEmail: text("partner_email").notNull(),
  partnerName: text("partner_name"),
  status: text("status").default("pending"), // pending, accepted, declined
  inviteToken: text("invite_token"),
  habitIds: jsonb("habit_ids").$type<number[]>().default([]), // Which habits to share
  createdAt: timestamp("created_at").defaultNow(),
});

export type AccountabilityPartner = typeof accountabilityPartners.$inferSelect;

// Weekly progress reports
export const progressReports = pgTable("progress_reports", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  reportType: text("report_type").notNull(), // weekly, monthly
  periodStart: text("period_start").notNull(), // ISO date
  periodEnd: text("period_end").notNull(), // ISO date
  summary: text("summary"), // AI-generated summary
  stats: jsonb("stats").$type<{
    totalSessions: number;
    totalTimeSpent: number;
    habitsWorkedOn: number;
    tasksCompleted: number;
    averageStreak: number;
    topHabit?: string;
  }>(),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ProgressReport = typeof progressReports.$inferSelect;

// Reminder settings per habit
export const habitReminders = pgTable("habit_reminders", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").notNull().references(() => habits.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  reminderTime: text("reminder_time").notNull(), // HH:mm format
  days: jsonb("days").$type<string[]>().default([]), // ["monday", "tuesday", etc.]
  enabled: boolean("enabled").default(true),
  lastSent: timestamp("last_sent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type HabitReminder = typeof habitReminders.$inferSelect;

// User saved templates (editable templates from resources)
export const userTemplates = pgTable("user_templates", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  habitId: integer("habit_id").references(() => habits.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  originalTitle: text("original_title"), // Original template title for reference
  taskId: text("task_id"), // Which task this template is for
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserTemplateSchema = createInsertSchema(userTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserTemplate = typeof userTemplates.$inferSelect;
export type InsertUserTemplate = z.infer<typeof insertUserTemplateSchema>;
