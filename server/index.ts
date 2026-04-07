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
import { sendEmail } from './email';

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

async function sendWelcomeBackEmails() {
  const FLAG_KEY = 'welcome_back_emails_sent_v1';
  const recipients = [
    { email: 'd8ywchqr5k@privaterelay.appleid.com', name: null },
    { email: 'shivam.chouksey2023@gmail.com', name: 'Shivam' },
  ];
  const alreadySent = await db.execute(sql`
    SELECT COUNT(*)::int as cnt FROM funnel_events WHERE event_name = ${FLAG_KEY}
  `);
  const rows = (alreadySent as any).rows || alreadySent;
  if (Number(rows[0]?.cnt || 0) > 0) {
    console.log('[Email] Welcome-back emails already sent, skipping');
    return;
  }
  const subject = "We fixed the setup — your habit is waiting!";
  let allSent = true;
  for (const r of recipients) {
    const greeting = r.name ? `Hi ${r.name},` : 'Hi there,';
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #0a1628; font-size: 24px; margin: 0;">
            <span style="color: #0a1628;">Habit</span><span style="color: #059669;">Builder</span><span style="color: #0a1628;">.pro</span>
          </h1>
        </div>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">${greeting}</p>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          Thank you for signing up for HabitBuilder.pro! We noticed you subscribed but didn't get to set up your first habit — that was our fault. There was a bug in the setup flow that we've now fixed.
        </p>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          <strong>Your Pro subscription is active</strong> and all features are ready for you. Just open the app and you'll be guided to create your first habit right away.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="https://habitbuilder.pro" style="display: inline-block; background-color: #059669; color: white; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 12px; text-decoration: none;">
            Open HabitBuilder.pro
          </a>
        </div>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          We're sorry for the hiccup and truly appreciate your support. If you have any questions, just reply to this email.
        </p>
        <p style="font-size: 14px; color: #666; line-height: 1.6; margin-top: 24px;">
          — The HabitBuilder Team
        </p>
      </div>
    `;
    try {
      await sendEmail({ to: r.email, subject, html });
      console.log(`[Email] Welcome-back email sent to ${r.email}`);
    } catch (err) {
      console.error(`[Email] Failed to send welcome-back email to ${r.email}:`, err);
      allSent = false;
    }
  }
  if (allSent) {
    await db.execute(sql`
      INSERT INTO funnel_events (event_name, user_id, platform, metadata, created_at)
      SELECT ${FLAG_KEY}, 'system', 'server', '{}', NOW()
      WHERE NOT EXISTS (SELECT 1 FROM funnel_events WHERE event_name = ${FLAG_KEY})
    `);
  }
}

async function runStartupMigrations() {
  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_funnel_viewer boolean DEFAULT false`);
    // Add trial_offer_shown column (idempotent)
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_offer_shown boolean DEFAULT false`);
    // Backfill: all users who existed before the card-required trial feature (2026-04-01)
    // get trial_offer_shown=true so they are never shown the new paywall gate.
    await db.execute(sql`
      UPDATE users
      SET trial_offer_shown = true
      WHERE trial_offer_shown = false
        AND created_at < '2026-04-01 00:00:00+00'
    `);
    // Add welcome_hub_seen column (server-side tracking replaces unreliable localStorage)
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_hub_seen boolean DEFAULT false`);
    // Backfill: all users created before the WelcomeHub launch (2026-03-26) or who are
    // existing users that have already been onboarded — mark as seen so they don't get
    // the welcome screen unexpectedly. Only brand-new signups (after 2026-04-03) will see it.
    await db.execute(sql`
      UPDATE users
      SET welcome_hub_seen = true
      WHERE welcome_hub_seen = false
        AND created_at < '2026-04-03 00:00:00+00'
    `);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_context_profile jsonb`);

    sendWelcomeBackEmails().catch(err => console.error('[Email] Welcome-back email error:', err));

    console.log('[Migrations] Startup migrations complete');
  } catch (err) {
    console.error('[Migrations] Startup migration error:', err);
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
  await runStartupMigrations();
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
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
