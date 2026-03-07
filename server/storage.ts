import { habits, users, habitStacks, userCommitments, type Habit, type InsertHabit, type User, type HabitTip, type HabitQuestion, type DailyPlan, type ProgressEntry, type HabitStack, type InsertHabitStack, type UserCommitment, type InsertUserCommitment } from "@shared/schema";
import { db } from "./db";
import { eq, and, asc } from "drizzle-orm";

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
  linkHabit(id: number, userId: string, linkedHabitId: number): Promise<Habit | undefined>;
  unlinkHabit(id: number, userId: string): Promise<Habit | undefined>;
  getUser(userId: string): Promise<User | undefined>;
  getCommitments(userId: string): Promise<UserCommitment[]>;
  createCommitment(userId: string, data: InsertUserCommitment): Promise<UserCommitment>;
  updateCommitment(id: number, userId: string, updates: Partial<InsertUserCommitment>): Promise<UserCommitment | undefined>;
  deleteCommitment(id: number, userId: string): Promise<void>;
  getHabitStacks(userId: string): Promise<HabitStack[]>;
  getHabitStack(id: number, userId: string): Promise<HabitStack | undefined>;
  createHabitStack(userId: string, stack: InsertHabitStack): Promise<HabitStack>;
  updateHabitStack(id: number, userId: string, updates: Partial<InsertHabitStack>): Promise<HabitStack | undefined>;
  deleteHabitStack(id: number, userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getHabits(userId: string): Promise<Habit[]> {
    return await db.select().from(habits).where(eq(habits.userId, userId)).orderBy(asc(habits.id));
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

  async linkHabit(id: number, userId: string, linkedHabitId: number): Promise<Habit | undefined> {
    const [updated] = await db
      .update(habits)
      .set({ linkedHabitId })
      .where(and(eq(habits.id, id), eq(habits.userId, userId)))
      .returning();
    return updated;
  }

  async unlinkHabit(id: number, userId: string): Promise<Habit | undefined> {
    const [updated] = await db
      .update(habits)
      .set({ linkedHabitId: null })
      .where(and(eq(habits.id, id), eq(habits.userId, userId)))
      .returning();
    return updated;
  }

  async getUser(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }

  async getCommitments(userId: string): Promise<UserCommitment[]> {
    return await db.select().from(userCommitments).where(eq(userCommitments.userId, userId));
  }

  async createCommitment(userId: string, data: InsertUserCommitment): Promise<UserCommitment> {
    const [created] = await db.insert(userCommitments).values({ ...data, userId }).returning();
    return created;
  }

  async updateCommitment(id: number, userId: string, updates: Partial<InsertUserCommitment>): Promise<UserCommitment | undefined> {
    const [updated] = await db.update(userCommitments).set(updates).where(and(eq(userCommitments.id, id), eq(userCommitments.userId, userId))).returning();
    return updated;
  }

  async deleteCommitment(id: number, userId: string): Promise<void> {
    await db.delete(userCommitments).where(and(eq(userCommitments.id, id), eq(userCommitments.userId, userId)));
  }

  async getHabitStacks(userId: string): Promise<HabitStack[]> {
    return await db.select().from(habitStacks).where(eq(habitStacks.userId, userId));
  }

  async getHabitStack(id: number, userId: string): Promise<HabitStack | undefined> {
    const [stack] = await db.select().from(habitStacks).where(and(eq(habitStacks.id, id), eq(habitStacks.userId, userId)));
    return stack;
  }

  async createHabitStack(userId: string, stack: InsertHabitStack): Promise<HabitStack> {
    const [created] = await db.insert(habitStacks).values({ ...stack, userId }).returning();
    return created;
  }

  async updateHabitStack(id: number, userId: string, updates: Partial<InsertHabitStack>): Promise<HabitStack | undefined> {
    const [updated] = await db.update(habitStacks).set({ ...updates, updatedAt: new Date() }).where(and(eq(habitStacks.id, id), eq(habitStacks.userId, userId))).returning();
    return updated;
  }

  async deleteHabitStack(id: number, userId: string): Promise<void> {
    await db.delete(habitStacks).where(and(eq(habitStacks.id, id), eq(habitStacks.userId, userId)));
  }
}

export const storage = new DatabaseStorage();
