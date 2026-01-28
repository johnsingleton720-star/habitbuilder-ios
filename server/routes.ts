import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { openai as openaiClient } from "./replit_integrations/audio";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { db } from "./db";
import { users } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth setup
  await setupAuth(app);
  registerAuthRoutes(app);

  // Protected routes
  app.get(api.habits.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user!.claims.sub;
    const habits = await storage.getHabits(userId);
    res.json(habits);
  });

  app.get(api.habits.get.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user!.claims.sub;
    const habit = await storage.getHabit(Number(req.params.id));
    
    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }
    
    if (habit.userId !== userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    res.json(habit);
  });

  app.post(api.habits.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const input = api.habits.create.input.parse(req.body);
      const habit = await storage.createHabit(userId, input);
      res.status(201).json(habit);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.habits.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const input = api.habits.update.input.parse(req.body);
      const habit = await storage.updateHabit(Number(req.params.id), userId, input);
      
      if (!habit) {
        return res.status(404).json({ message: 'Habit not found' });
      }

      res.json(habit);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.habits.delete.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user!.claims.sub;
    await storage.deleteHabit(Number(req.params.id), userId);
    res.status(204).send();
  });

  // Motivational Quote Endpoint
  app.get(api.quotes.daily.path, async (req, res) => {
    try {
      const response = await openaiClient.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          {
            role: "system",
            content: "You are a motivational speaker. Provide a short, inspiring quote for someone building positive habits. Return JSON with 'quote' and 'author'.",
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content from AI");
      
      const quoteData = JSON.parse(content);
      res.json(quoteData);
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.json({
        quote: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
        author: "Aristotle"
      });
    }
  });

  // Stripe public key endpoint
  app.get("/api/stripe/config", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error getting Stripe config:", error);
      res.status(500).json({ error: "Failed to get Stripe configuration" });
    }
  });

  // Get lifetime price from Stripe
  app.get("/api/stripe/lifetime-price", async (req, res) => {
    try {
      const result = await db.execute(
        sql`SELECT pr.id as price_id, pr.unit_amount, p.name, p.description 
            FROM stripe.prices pr 
            JOIN stripe.products p ON pr.product = p.id 
            WHERE p.active = true AND pr.active = true 
            AND p.metadata->>'type' = 'lifetime_access'
            LIMIT 1`
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Lifetime product not found" });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error getting lifetime price:", error);
      res.status(500).json({ error: "Failed to get pricing" });
    }
  });

  // Create checkout session for lifetime purchase
  app.post("/api/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { priceId } = req.body;

      if (!priceId) {
        return res.status(400).json({ error: "Price ID required" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'payment',
        success_url: `${baseUrl}/?payment=success`,
        cancel_url: `${baseUrl}/?payment=cancelled`,
        metadata: {
          userId: userId,
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Check user payment status and trial
  app.get("/api/payment-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      
      // Check if trial is still active (24 hours from account creation)
      const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
      const trialEndTime = user?.createdAt ? new Date(user.createdAt).getTime() + TRIAL_DURATION_MS : 0;
      const isTrialActive = Date.now() < trialEndTime;
      const trialEndsAt = user?.createdAt ? new Date(trialEndTime).toISOString() : null;
      
      res.json({ 
        hasPaid: user?.hasPaid || false,
        isTrialActive,
        trialEndsAt,
      });
    } catch (error) {
      console.error("Error checking payment status:", error);
      res.status(500).json({ error: "Failed to check payment status" });
    }
  });

  return httpServer;
}
