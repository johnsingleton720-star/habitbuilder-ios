import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Export Auth and Chat models
export * from "./models/auth";
export * from "./models/chat";

import { users } from "./models/auth";

export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  frequency: text("frequency").notNull().default("daily"), // daily, weekly
  completedDates: jsonb("completed_dates").$type<string[]>().default([]), // Array of ISO date strings
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
