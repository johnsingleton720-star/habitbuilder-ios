import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";

// Owner email - this user gets automatic admin access and paid status
const OWNER_EMAIL = "johnsingleton720@gmail.com";

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if this is the owner - grant automatic access
    const isOwner = userData.email === OWNER_EMAIL;
    
    // Check if user already exists (for trial logic)
    const existingUser = await this.getUser(userData.id!);
    
    // Set 2-day trial for new users (not owner)
    const trialEndsAt = !existingUser && !isOwner 
      ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
      : existingUser?.trialEndsAt;
    
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        ...(isOwner && { isAdmin: true, hasPaid: true }),
        ...(!existingUser && !isOwner && { trialEndsAt }),
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          ...(isOwner && { isAdmin: true, hasPaid: true }),
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
}

export const authStorage = new AuthStorage();
