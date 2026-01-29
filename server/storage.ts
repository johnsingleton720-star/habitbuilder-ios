import { habits, users, type Habit, type InsertHabit, type User, type HabitTip, type HabitQuestion, type DailyPlan, type ProgressEntry } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface HabitUpdates extends Partial<InsertHabit> {
  questions?: HabitQuestion[];
  dailyPlans?: DailyPlan[];
  progress?: ProgressEntry[];
  aiTips?: HabitTip[];
  setupComplete?: boolean;
  planDuration?: string;
  planStartDate?: string;
  planEndDate?: string;
  aiContext?: string;
  totalTimeSpent?: number;
  currentStreak?: number;
  longestStreak?: number;
}

export interface IStorage {
  getHabits(userId: string): Promise<Habit[]>;
  getHabit(id: number): Promise<Habit | undefined>;
  createHabit(userId: string, habit: InsertHabit): Promise<Habit>;
  updateHabit(id: number, userId: string, updates: HabitUpdates): Promise<Habit | undefined>;
  deleteHabit(id: number, userId: string): Promise<void>;
  getUser(userId: string): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getHabits(userId: string): Promise<Habit[]> {
    return await db.select().from(habits).where(eq(habits.userId, userId));
  }

  async getHabit(id: number): Promise<Habit | undefined> {
    const [habit] = await db.select().from(habits).where(eq(habits.id, id));
    return habit;
  }

  async createHabit(userId: string, insertHabit: InsertHabit): Promise<Habit> {
    const [habit] = await db
      .insert(habits)
      .values({ ...insertHabit, userId })
      .returning();
    return habit;
  }

  async updateHabit(id: number, userId: string, updates: HabitUpdates): Promise<Habit | undefined> {
    const [updated] = await db
      .update(habits)
      .set(updates)
      .where(and(eq(habits.id, id), eq(habits.userId, userId)))
      .returning();
    return updated;
  }

  async deleteHabit(id: number, userId: string): Promise<void> {
    await db
      .delete(habits)
      .where(and(eq(habits.id, id), eq(habits.userId, userId)));
  }

  async getUser(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }
}

export const storage = new DatabaseStorage();
