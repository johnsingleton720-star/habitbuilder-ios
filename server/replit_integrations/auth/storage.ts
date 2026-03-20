import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";

// Owner email - this user gets automatic admin access and paid status
const OWNER_EMAIL = "johnsingleton720@gmail.com";

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser, utmData?: Record<string, string>): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser, utmData?: Record<string, string>): Promise<User> {
    const isOwner = userData.email === OWNER_EMAIL;
    const existingUser = await this.getUser(userData.id!);
    
    const utmFields = !existingUser && utmData ? {
      signupSource: utmData.gclid ? "google_ads" : utmData.utm_source || "direct",
      signupUtmSource: utmData.utm_source || null,
      signupUtmMedium: utmData.utm_medium || null,
      signupUtmCampaign: utmData.utm_campaign || null,
      signupGclid: utmData.gclid || null,
    } : {};
    
    const trialFields = !existingUser && !isOwner ? {
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    } : {};
    
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        ...(isOwner && { isAdmin: true, hasPaid: true, subscriptionTier: "premium" }),
        ...utmFields,
        ...trialFields,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          ...(isOwner && { isAdmin: true, hasPaid: true, subscriptionTier: "premium" }),
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
}

export const authStorage = new AuthStorage();
