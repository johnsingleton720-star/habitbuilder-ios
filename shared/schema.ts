import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Export Auth and Chat models
export * from "./models/auth";
export * from "./models/chat";

import { users } from "./models/auth";

// Step type for habit action steps
export interface HabitStep {
  id: string;
  text: string;
  completed: boolean;
}

// AI-generated tip type
export interface HabitTip {
  id: string;
  text: string;
  category: "motivation" | "technique" | "science" | "reminder";
}

export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  goal: text("goal"), // Target goal for this habit (e.g., "Run 5K", "Read 30 books")
  frequency: text("frequency").notNull().default("daily"), // daily, weekly
  completedDates: jsonb("completed_dates").$type<string[]>().default([]), // Array of ISO date strings
  steps: jsonb("steps").$type<HabitStep[]>().default([]), // Action steps to achieve the habit
  aiTips: jsonb("ai_tips").$type<HabitTip[]>().default([]), // AI-generated tips and guidance
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
