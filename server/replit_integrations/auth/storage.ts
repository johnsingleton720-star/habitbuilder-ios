import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq, sql } from "drizzle-orm";

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
    // Check if this is the first user - make them admin
    let shouldBeAdmin = false;
    if (userData.id) {
      const existingUser = await db.select().from(users).where(eq(users.id, userData.id)).limit(1);
      const isNewUser = existingUser.length === 0;
      
      if (isNewUser) {
        const userCount = await db.select({ count: sql<number>`count(*)::int` }).from(users);
        shouldBeAdmin = userCount[0].count === 0;
      }
    }
    
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        ...(shouldBeAdmin && { isAdmin: true }),
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
}

export const authStorage = new AuthStorage();
