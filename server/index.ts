import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from './stripeClient';
import { WebhookHandlers } from './webhookHandlers';
import { startEmailScheduler } from './emailScheduler';
import { injectSeo } from './seoInjector';
import { db } from './db';
import { foundingMemberSlots } from '@shared/models/auth';
import { habits } from '@shared/schema';
import { sql, eq } from 'drizzle-orm';

async function backfillProgressEntries() {
  try {
    const allHabits = await db.select().from(habits);
    let totalAdded = 0;
    for (const habit of allHabits) {
      const dailyPlans = (habit.dailyPlans || []) as any[];
      const progress = [...((habit.progress as any[]) || [])];
      const existingDates = new Set(progress.map((p: any) => p.date));
      let added = 0;

      for (const plan of dailyPlans) {
        if (!plan.completed || !plan.date || existingDates.has(plan.date)) continue;
        const activeTasks = (plan.tasks || []).filter((t: any) => !t.skipped);
        if (activeTasks.length === 0) continue;
        const completedTasks = (plan.tasks || []).filter((t: any) => t.completed);
        progress.push({
          date: plan.date,
          tasksCompleted: completedTasks.length,
          totalTasks: activeTasks.length,
          timeSpent: plan.timeSpent || 0,
          notes: "",
          autoRecorded: true,
        });
        existingDates.add(plan.date);
        added++;
      }

      if (added > 0) {
        progress.sort((a: any, b: any) => a.date.localeCompare(b.date));
        await db.update(habits).set({ progress }).where(eq(habits.id, habit.id));
        totalAdded += added;
      }
    }
    if (totalAdded > 0) {
      console.log(`[Backfill] Added ${totalAdded} missing progress entries`);
    }
  } catch (err) {
    console.error("[Backfill] Error:", err);
  }
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception (server kept running):', err.message);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('Unhandled Rejection (server kept running):', reason?.message || reason);
});

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn('DATABASE_URL not found - skipping Stripe initialization');
    return;
  }

  try {
    console.log('Initializing Stripe schema...');
    await runMigrations({ databaseUrl });
    console.log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    console.log('Setting up managed webhook...');
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    const result = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`
    );
    console.log(`Webhook configured: ${result?.webhook?.url || 'webhook ready'}`);

    console.log('Syncing Stripe data...');
    stripeSync.syncBackfill()
      .then(() => {
        console.log('Stripe data synced');
      })
      .catch((err: Error) => {
        console.error('Error syncing Stripe data:', err);
      });
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}

app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      await WebhookHandlers.processWebhook(req.body as Buffer, sig);

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(
  express.json({
    limit: '50mb', // Increased for audio uploads
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

async function seedFoundingMemberSlots() {
  try {
    const existing = await db.select().from(foundingMemberSlots);
    if (existing.length === 0) {
      await db.insert(foundingMemberSlots).values([
        { tier: 'pro', totalSlots: 50, usedSlots: 0, priceYearly: 4800, active: true },
        { tier: 'premium', totalSlots: 100, usedSlots: 0, priceYearly: 14000, active: true },
      ]);
      console.log('Seeded founding member slots');
    }
  } catch (e: any) {
    console.error('Error seeding founding member slots:', e?.message);
  }
}

(async () => {
  await initStripe();
  await seedFoundingMemberSlots();
  await registerRoutes(httpServer, app);
  startEmailScheduler();
  backfillProgressEntries();

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    app.use((req: Request, res: Response, next: NextFunction) => {
      const url = req.path;
      if (url.startsWith("/api") || url.startsWith("/vite-hmr") || url.includes(".")) {
        return next();
      }
      const originalEnd = res.end;
      res.end = function (this: Response, ...args: any[]) {
        const chunk = args[0];
        if (chunk && typeof chunk === "string" && chunk.includes("<!DOCTYPE html>")) {
          try {
            const injected = injectSeo(chunk, url);
            args[0] = injected;
            const contentLength = Buffer.byteLength(injected);
            this.setHeader("Content-Length", contentLength);
          } catch (e) {
            console.error("SEO injection error:", e);
          }
        }
        return originalEnd.apply(this, args as any);
      } as any;
      next();
    });

    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    async () => {
      log(`serving on port ${port}`);
      try {
        const { db } = await import("./db");
        const { funnelEvents } = await import("@shared/schema");
        const { eq, inArray } = await import("drizzle-orm");
        const adminSessions = await db.select({ sessionId: funnelEvents.sessionId }).from(funnelEvents).where(eq(funnelEvents.userId, "53886343"));
        const ids = [...new Set(adminSessions.map(r => r.sessionId).filter(Boolean))] as string[];
        if (ids.length > 0) {
          const result = await db.delete(funnelEvents).where(inArray(funnelEvents.sessionId, ids));
          log(`[Cleanup] Deleted ${result.rowCount || 0} admin funnel events from ${ids.length} sessions`);
        } else {
          log(`[Cleanup] No admin funnel events to clean`);
        }
      } catch (e) {
        log(`[Cleanup] Error: ${e}`);
      }
    },
  );
})();
