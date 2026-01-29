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

// Daily routine task within an action plan
export interface RoutineTask {
  id: string;
  title: string;
  description: string;
  duration: number; // Minutes
  completed: boolean;
  notes?: string;
}

// Daily action plan for a specific date
export interface DailyPlan {
  date: string; // ISO date string
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
