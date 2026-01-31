import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { sql, eq } from "drizzle-orm";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { openai as openaiClient } from "./replit_integrations/audio";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { db } from "./db";
import { users, feedback, userAchievements, habitTemplates } from "@shared/schema";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";
import OpenAI from "openai";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth setup
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Object storage routes
  registerObjectStorageRoutes(app);
  
  const objectStorageService = new ObjectStorageService();

  // Profile image upload endpoint
  app.post("/api/user/profile-image", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      
      // Get presigned URL for upload
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      
      res.json({ 
        uploadURL, 
        objectPath,
        message: "Upload to this URL, then call /api/user/profile-image/confirm" 
      });
    } catch (error) {
      console.error("Error generating profile image upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Confirm profile image upload and update user record
  app.post("/api/user/profile-image/confirm", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { objectPath } = req.body;
      
      if (!objectPath) {
        return res.status(400).json({ error: "objectPath is required" });
      }

      // Set the profile image URL - construct the serving URL
      const profileImageUrl = objectPath;
      
      // Update user's profile image in database
      await db.update(users).set({ 
        profileImageUrl,
        updatedAt: new Date(),
      }).where(eq(users.id, userId));
      
      res.json({ profileImageUrl, success: true });
    } catch (error) {
      console.error("Error confirming profile image:", error);
      res.status(500).json({ error: "Failed to update profile image" });
    }
  });

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

  // Get all tier pricing from Stripe
  app.get("/api/stripe/pricing", async (req, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      
      // Get both products
      const products = await stripe.products.list({
        active: true,
        limit: 100,
      });
      
      const proProduct = products.data.find(p => p.name === 'Habit Builder Pro');
      const premiumProduct = products.data.find(p => p.name === 'Habit Builder Premium');
      
      const tiers: any[] = [
        {
          tier: 'free',
          name: 'Free',
          price: 0,
          priceId: null,
          description: 'Get started with basic habit tracking',
          features: [
            'Up to 3 habits',
            'Basic streak tracking',
            'Simple progress charts',
            'Community templates',
          ],
          limitations: [
            'No AI coaching',
            'No personalized plans',
            'No session summaries',
          ],
        },
      ];
      
      if (proProduct) {
        const proPrices = await stripe.prices.list({
          product: proProduct.id,
          active: true,
        });
        const proPrice = proPrices.data.find(p => p.recurring?.interval === 'month');
        
        tiers.push({
          tier: 'pro',
          name: 'Pro',
          price: proPrice?.unit_amount || 600,
          priceId: proPrice?.id,
          description: 'AI-powered habit coaching for serious growth',
          features: [
            'Unlimited habits',
            'AI-powered habit coaching',
            'Personalized action plans',
            'Guided sessions with timers',
            'AI session summaries',
            'Progress streaks & achievements',
            'Habit templates library',
            'Weekly progress reports',
            'Email reminders',
          ],
          popular: true,
        });
      }
      
      if (premiumProduct) {
        const premiumPrices = await stripe.prices.list({
          product: premiumProduct.id,
          active: true,
        });
        const premiumPrice = premiumPrices.data.find(p => p.recurring?.interval === 'month');
        
        tiers.push({
          tier: 'premium',
          name: 'Premium',
          price: premiumPrice?.unit_amount || 1500,
          priceId: premiumPrice?.id,
          description: 'Maximum support for transformational habits',
          features: [
            'Everything in Pro',
            'Voice notes during sessions',
            'Accountability partner sharing',
            'Priority AI responses',
            'Advanced analytics dashboard',
            'Monthly personalized insights',
            'Priority support',
          ],
        });
      }
      
      res.json({ tiers });
    } catch (error: any) {
      console.error("Error getting tier pricing:", error?.message || error);
      res.status(500).json({ error: "Failed to get pricing" });
    }
  });

  // Get subscription price from Stripe - with fallback to direct API (legacy endpoint)
  app.get("/api/stripe/lifetime-price", async (req, res) => {
    try {
      // Try database first - look for subscription product (prefer Habit Builder Pro)
      try {
        const result = await db.execute(
          sql`SELECT pr.id as price_id, pr.unit_amount, p.name, p.description,
                     pr.recurring->>'interval' as interval
              FROM stripe.prices pr 
              JOIN stripe.products p ON pr.product = p.id 
              WHERE p.active = true AND pr.active = true 
              AND p.name = 'Habit Builder Pro'
              AND pr.recurring->>'interval' = 'month'
              LIMIT 1`
        );
        
        if (result.rows.length > 0) {
          console.log("Returning subscription price from database");
          return res.json(result.rows[0]);
        }
      } catch (dbError) {
        console.log("Database query failed, falling back to Stripe API:", dbError);
      }
      
      // Fallback: Query Stripe API directly
      console.log("Querying Stripe API directly...");
      const stripe = await getUncachableStripeClient();
      
      // List all active products and find the subscription one
      const products = await stripe.products.list({
        active: true,
        limit: 100,
      });
      
      let subscriptionProduct = products.data.find(
        p => p.name === 'Habit Builder Pro'
      );
      
      // Auto-create the product and price if it doesn't exist (for production)
      if (!subscriptionProduct) {
        console.log("Creating subscription product in Stripe...");
        subscriptionProduct = await stripe.products.create({
          name: 'Habit Builder Pro',
          description: 'AI-powered habit coaching with personalized action plans - Monthly subscription',
        });
        console.log("Created product:", subscriptionProduct.id);
      }
      
      console.log("Found product:", subscriptionProduct.id, subscriptionProduct.name);
      
      // Get active recurring price for this product
      const prices = await stripe.prices.list({
        product: subscriptionProduct.id,
        active: true,
        limit: 10,
      });
      
      // Find the monthly recurring price
      let monthlyPrice = prices.data.find(p => p.recurring?.interval === 'month');
      
      // Auto-create the price if it doesn't exist
      if (!monthlyPrice) {
        console.log("Creating monthly price in Stripe...");
        monthlyPrice = await stripe.prices.create({
          product: subscriptionProduct.id,
          unit_amount: 600, // $6.00
          currency: 'usd',
          recurring: {
            interval: 'month',
          },
        });
        console.log("Created price:", monthlyPrice.id);
      }
      
      console.log("Found price:", monthlyPrice.id, monthlyPrice.unit_amount);
      
      res.json({
        price_id: monthlyPrice.id,
        unit_amount: monthlyPrice.unit_amount,
        name: subscriptionProduct.name,
        description: subscriptionProduct.description,
        interval: 'month',
      });
    } catch (error: any) {
      console.error("Error getting subscription price:", error?.message || error);
      res.status(500).json({ error: "Failed to get pricing. Please try again." });
    }
  });

  // Create checkout session for subscription
  app.post("/api/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const userEmail = req.user!.claims.email;
      const { priceId, tier } = req.body;

      if (!priceId) {
        return res.status(400).json({ error: "Price ID required" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

      // Find or create Stripe customer
      let customerId: string | undefined;
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (existingUser?.stripeCustomerId) {
        customerId = existingUser.stripeCustomerId;
      } else if (userEmail) {
        // Create new customer
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: { userId },
        });
        customerId = customer.id;
        
        // Save customer ID to user
        await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId));
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${baseUrl}/?payment=success`,
        cancel_url: `${baseUrl}/?payment=cancelled`,
        customer: customerId,
        metadata: {
          userId: userId,
          tier: tier || 'pro',
        },
        subscription_data: {
          metadata: { userId, tier: tier || 'pro' },
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Create customer portal session for subscription management
  app.post("/api/stripe/customer-portal", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const stripe = await getUncachableStripeClient();
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

      // Get user's Stripe customer ID
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: "No subscription found" });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${baseUrl}/account`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Customer portal error:", error);
      res.status(500).json({ error: "Failed to open subscription management" });
    }
  });

  // AI-generated habit plan with steps and tips
  app.post("/api/ai/generate-plan", isAuthenticated, async (req: any, res) => {
    try {
      const { habitTitle, habitDescription, goal } = req.body;

      const prompt = `Create a detailed action plan for building the habit: "${habitTitle}"
${habitDescription ? `Description: ${habitDescription}` : ''}
${goal ? `Goal: ${goal}` : ''}

Return a JSON object with:
1. "steps": An array of 5-7 actionable steps to build this habit. Each step should have:
   - "id": A unique string ID (use step-1, step-2, etc.)
   - "text": A clear, actionable step - phrase as a question or exploration prompt the user can reflect on
   - "completed": false
   - "explored": false
   - "options": [] (empty array)
   - "customResponse": ""

2. "tips": An array of 4 helpful tips/advice. Each tip should have:
   - "id": A unique string ID (use tip-1, tip-2, etc.)
   - "text": A helpful tip or piece of advice
   - "category": One of "motivation", "technique", "science", or "reminder"

IMPORTANT: Make steps interactive and explorable - phrase them as questions or reflective prompts that users can think about deeply (e.g., "Identify what triggers your stress or anxiety" or "Decide on your ideal time and location for this habit").
Make the tips varied across categories. Be specific and practical.`;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a habit coach. Provide actionable, specific guidance for building new habits. Always return valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content from AI");

      const planData = JSON.parse(content);
      res.json(planData);
    } catch (error) {
      console.error("Error generating habit plan:", error);
      res.status(500).json({ error: "Failed to generate habit plan" });
    }
  });

  // AI-generated options for exploring a specific step
  app.post("/api/ai/generate-step-options", isAuthenticated, async (req: any, res) => {
    try {
      const { habitTitle, stepText, stepId } = req.body;

      const prompt = `You are helping someone build the habit: "${habitTitle}"

They need to complete this specific action step:
"${stepText}"

Generate 6-8 UNIQUE options that are DIRECTLY RELEVANT to this exact step. Each option must:
1. Be a specific, actionable answer to this particular step
2. Be concrete and practical (not vague or generic)
3. Help the user reflect on and complete THIS step

CRITICAL: Your options must be tailored specifically to "${stepText}" - do NOT generate generic habit options.

Return a JSON object with:
{
  "options": [
    { "id": "opt-1", "text": "A specific, actionable option for this exact step", "selected": false },
    { "id": "opt-2", "text": "Another specific option", "selected": false },
    ...
  ]
}

Be creative and diverse. Cover different angles and approaches to completing "${stepText}".`;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful habit coach. Generate specific, relatable options that help users reflect on their habits. Always return valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content from AI");

      const optionsData = JSON.parse(content);
      res.json({ stepId, ...optionsData });
    } catch (error) {
      console.error("Error generating step options:", error);
      res.status(500).json({ error: "Failed to generate step options" });
    }
  });

  // Generate habit-specific interview questions
  app.post("/api/habits/:id/generate-questions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);
      const habit = await storage.getHabit(habitId);
      
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }

      const prompt = `You are an expert habit coach conducting an intake interview to create a personalized action plan.

The user wants to build this habit: "${habit.title}"
${habit.description ? `Additional context: ${habit.description}` : ''}
${habit.goal ? `Their goal: ${habit.goal}` : ''}

Generate 4-5 thoughtful, open-ended questions to understand:
1. Their current experience level with this habit
2. Their specific goals and why this matters to them
3. Their available time and resources
4. Any obstacles they've faced before
5. Their preferred approach or style

Return a JSON object with:
{
  "questions": [
    { "id": "q1", "question": "Your question here", "answer": "" },
    { "id": "q2", "question": "Your question here", "answer": "" },
    ...
  ]
}

Make questions conversational and specific to "${habit.title}". Avoid generic questions.`;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a supportive habit coach. Ask thoughtful questions to understand the user's needs. Always return valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content from AI");

      const data = JSON.parse(content);
      res.json(data);
    } catch (error) {
      console.error("Error generating questions:", error);
      res.status(500).json({ error: "Failed to generate questions" });
    }
  });

  // Generate personalized action plan based on questionnaire answers
  app.post("/api/habits/:id/generate-plan", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);
      const { duration, questions } = req.body;
      
      const habit = await storage.getHabit(habitId);
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }

      // Calculate date range
      const startDate = new Date();
      const daysCount = duration === "daily" ? 1 : duration === "weekly" ? 7 : 30;
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + daysCount - 1);

      // Build context from questionnaire
      const contextSummary = questions
        .filter((q: any) => q.answer)
        .map((q: any) => `Q: ${q.question}\nA: ${q.answer}`)
        .join("\n\n");

      const prompt = `Create a personalized ${duration} action plan for: "${habit.title}"

User's interview answers:
${contextSummary}

Create ${daysCount} daily plans with 3-4 tasks each.

Return JSON:
{
  "dailyPlans": [
    {
      "date": "${startDate.toISOString().split('T')[0]}",
      "dayNumber": 1,
      "focus": "Day theme (e.g., 'Getting Started')",
      "tasks": [
        {
          "id": "day1-task1",
          "title": "Action-oriented title",
          "description": "Detailed instructions with: 1) What to do, 2) Step-by-step how, 3) A concrete example, 4) One pro tip. Include specific numbers, durations, and measurable targets.",
          "duration": 10,
          "completed": false,
          "notes": ""
        }
      ],
      "completed": false,
      "timeSpent": 0
    }
  ],
  "aiContext": "2-3 sentence summary of goals and recommended approach"
}

REQUIREMENTS:
1. Each task description: 50-100 words with numbered steps and one example
2. Be specific to their answers (time available, experience level)
3. Progress difficulty gradually - Day 1 is easy wins
4. Include concrete numbers (reps, minutes, amounts)
5. Reference their specific situation in descriptions`;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert habit coach. Create detailed, personalized action plans based on user's specific situation. Always return valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 4000,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content from AI");

      let planData;
      try {
        planData = JSON.parse(content);
      } catch (parseError) {
        console.error("JSON parse error, raw content:", content);
        throw new Error("Failed to parse AI response");
      }

      if (!planData.dailyPlans || !Array.isArray(planData.dailyPlans)) {
        throw new Error("Invalid plan structure from AI");
      }

      const enhancedContext = planData.aiContext || "";

      // Update habit with the generated plan
      await storage.updateHabit(habitId, userId, {
        questions: questions,
        planDuration: duration,
        planStartDate: startDate.toISOString().split('T')[0],
        planEndDate: endDate.toISOString().split('T')[0],
        dailyPlans: planData.dailyPlans,
        aiContext: enhancedContext,
        setupComplete: true,
      });

      res.json({ success: true, ...planData });
    } catch (error) {
      console.error("Error generating plan:", error);
      res.status(500).json({ error: "Failed to generate plan" });
    }
  });

  // Update a specific task in a daily plan
  app.patch("/api/habits/:id/tasks/:taskId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);
      const taskId = req.params.taskId;
      const { completed, notes, timeSpent } = req.body;
      
      const habit = await storage.getHabit(habitId);
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }

      // Find and update the task in dailyPlans
      const dailyPlans = [...(habit.dailyPlans || [])];
      let taskFound = false;
      let totalTimeSpent = habit.totalTimeSpent || 0;

      for (const plan of dailyPlans) {
        const taskIndex = plan.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          if (completed !== undefined) {
            plan.tasks[taskIndex].completed = completed;
          }
          if (notes !== undefined) {
            plan.tasks[taskIndex].notes = notes;
          }
          if (timeSpent !== undefined) {
            const oldTime = plan.tasks[taskIndex].duration || 0;
            totalTimeSpent += timeSpent;
            plan.timeSpent = (plan.timeSpent || 0) + timeSpent;
          }
          
          // Check if all tasks in this day are complete
          plan.completed = plan.tasks.every(t => t.completed);
          taskFound = true;
          break;
        }
      }

      if (!taskFound) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Calculate streak
      let currentStreak = 0;
      const today = new Date().toISOString().split('T')[0];
      for (let i = dailyPlans.length - 1; i >= 0; i--) {
        if (dailyPlans[i].completed) {
          currentStreak++;
        } else if (dailyPlans[i].date <= today) {
          break;
        }
      }

      await storage.updateHabit(habitId, userId, {
        dailyPlans,
        totalTimeSpent,
        currentStreak,
        longestStreak: Math.max(habit.longestStreak || 0, currentStreak),
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // Save session notes and progress
  app.post("/api/habits/:id/session-complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);
      const { date, tasksCompleted, totalTasks, timeSpent, goalTime, notes, mood } = req.body;
      
      const habit = await storage.getHabit(habitId);
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }

      const progress = [...(habit.progress || [])];
      progress.push({
        date,
        tasksCompleted,
        totalTasks,
        timeSpent,
        goalTime: goalTime || 0,
        notes: notes || "",
        mood,
      });

      // Update streak based on daily plan completion
      const dailyPlans = [...(habit.dailyPlans || [])];
      const todayPlan = dailyPlans.find(p => p.date === date);
      if (todayPlan) {
        todayPlan.completed = true;
        todayPlan.timeSpent = (todayPlan.timeSpent || 0) + timeSpent;
      }

      // Calculate current streak
      let currentStreak = 0;
      const sortedPlans = dailyPlans.sort((a, b) => b.date.localeCompare(a.date));
      for (const plan of sortedPlans) {
        if (plan.completed) {
          currentStreak++;
        } else if (plan.date <= date) {
          break;
        }
      }

      await storage.updateHabit(habitId, userId, {
        dailyPlans,
        progress,
        totalTimeSpent: (habit.totalTimeSpent || 0) + timeSpent,
        currentStreak,
        longestStreak: Math.max(habit.longestStreak || 0, currentStreak),
      });

      res.json({ success: true, currentStreak });
    } catch (error) {
      console.error("Error saving session:", error);
      res.status(500).json({ error: "Failed to save session" });
    }
  });

  // Generate AI session summary from notes
  app.post("/api/habits/:id/session-summary", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);
      const { habitTitle, tasksCompleted, totalTasks, timeSpent, notes } = req.body;
      
      const habit = await storage.getHabit(habitId);
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }

      // If no notes provided, return a simple summary
      if (!notes || notes.length === 0) {
        return res.json({
          summary: `You completed ${tasksCompleted} of ${totalTasks} tasks in ${timeSpent} minutes. Great work on your ${habitTitle} practice today!`,
          insights: [],
          encouragement: "Keep building on this momentum!"
        });
      }

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const notesText = notes.map((n: { task: string; note: string }, i: number) => 
        `Task ${i + 1} (${n.task}): ${n.note}`
      ).join('\n');

      const prompt = `You are a supportive habit coach. The user just completed a habit session for "${habitTitle}". 

Session stats:
- Completed ${tasksCompleted} of ${totalTasks} tasks
- Time spent: ${timeSpent} minutes

Their notes from this session:
${notesText}

Please provide:
1. A brief, warm summary (2-3 sentences) of their session based on their notes
2. 1-2 specific insights or patterns you notice from their notes
3. An encouraging message to keep them motivated

Respond in JSON format:
{
  "summary": "...",
  "insights": ["insight 1", "insight 2"],
  "encouragement": "..."
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || '{}';
      const result = JSON.parse(content);

      res.json(result);
    } catch (error) {
      console.error("Error generating session summary:", error);
      // Return a fallback summary on error
      res.json({
        summary: "Great job completing your session! Every step counts toward building your habit.",
        insights: [],
        encouragement: "Keep up the excellent work!"
      });
    }
  });

  // Generate detailed guidance, examples, and resources for a specific task
  app.post("/api/habits/:id/tasks/:taskId/guidance", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);
      const taskId = req.params.taskId;
      
      const habit = await storage.getHabit(habitId);
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }

      // Find the task
      const dailyPlans = habit.dailyPlans || [];
      let task = null;
      for (const plan of dailyPlans) {
        task = plan.tasks.find(t => t.id === taskId);
        if (task) break;
      }

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const prompt = `You are an expert coach helping someone with the habit: "${habit.title}"

They need comprehensive, actionable guidance for this specific task:
Title: "${task.title}"
Description: "${task.description}"

${habit.aiContext ? `Context about this person: ${habit.aiContext}` : ''}

Generate detailed, practical guidance that someone can follow immediately:

1. EXAMPLES (3-4): Detailed, numbered step-by-step examples. Each example should be 100+ words with exact timings, measurements, and specific actions. Write them like you're walking someone through it.

2. TIPS (5-6): Expert coaching tips including common mistakes, pro tips, and psychology insights. Each tip should be 2-3 sentences with actionable advice.

3. TOOLS (6-8): Real apps, websites, and tools with actual URLs. Include:
   - Popular mobile apps (with actual App Store/Play Store names)
   - Websites (use real URLs like https://mint.com, https://headspace.com, etc.)
   - Online tools and calculators
   - Books with actual author names
   Each tool should have features array and pricing info.

4. TEMPLATES (2-3): Complete, ready-to-use templates with a title and full content. Write out the ENTIRE template, not a description. Include placeholders like [Your Name], [Date], etc. These should be print-ready or copy-paste ready.

5. VIDEOS (4-5): Specific YouTube search queries. Make them very specific like "10 minute morning meditation for beginners guided" not just "meditation".

Return JSON exactly like this:
{
  "examples": ["Step 1: [specific action]... Step 2: ...", "..."],
  "tips": ["Tip text here", "..."],
  "tools": [
    {
      "id": "tool-1",
      "name": "Actual App/Site Name",
      "type": "app",
      "description": "What it does",
      "url": "https://actualurl.com",
      "features": ["Feature 1", "Feature 2"],
      "pricing": "Free" or "$X/month"
    }
  ],
  "templates": [
    {
      "title": "Template Name",
      "content": "Full template text with\\nline breaks and\\n[ ] checkboxes\\n[ ] more items...",
      "format": "checklist"
    }
  ],
  "videos": [
    {
      "title": "Descriptive video title",
      "searchQuery": "very specific youtube search query",
      "channel": "Expected channel type",
      "duration": "~10 min"
    }
  ]
}

CRITICAL: Use REAL app names, REAL website URLs, and REAL book titles. Templates must be complete and usable.`;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert habit coach and resource curator. Provide extremely detailed, practical guidance with real tools and resources. Always return valid JSON with complete, usable content.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 4000,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content from AI");

      let guidance;
      try {
        guidance = JSON.parse(content);
      } catch (parseError) {
        console.error("Guidance JSON parse error:", content);
        throw new Error("Failed to parse AI guidance response");
      }

      // Normalize templates to structured format if they're just strings
      let normalizedTemplates = guidance.templates || [];
      if (normalizedTemplates.length > 0 && typeof normalizedTemplates[0] === 'string') {
        normalizedTemplates = normalizedTemplates.map((t: string, i: number) => ({
          title: `Template ${i + 1}`,
          content: t,
          format: 'text'
        }));
      }

      // Ensure required fields exist with defaults
      const safeGuidance = {
        examples: guidance.examples || [],
        tips: guidance.tips || [],
        tools: guidance.tools || guidance.resources || [],
        templates: normalizedTemplates,
        videos: guidance.videos || guidance.videoSuggestions || [],
      };

      res.json({ taskId, ...safeGuidance });
    } catch (error) {
      console.error("Error generating task guidance:", error);
      res.status(500).json({ error: "Failed to generate guidance" });
    }
  });

  // Get AI coaching check-in - personalized motivation and feedback
  app.post("/api/habits/:id/coaching-checkin", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);
      const { feedback, mood } = req.body;
      
      const habit = await storage.getHabit(habitId);
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }

      // Calculate progress stats
      const dailyPlans = habit.dailyPlans || [];
      const completedDays = dailyPlans.filter(p => p.completed).length;
      const totalDays = dailyPlans.length;
      const completionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
      const currentStreak = habit.currentStreak || 0;

      const prompt = `You are a supportive, encouraging AI habit coach. The user is working on: "${habit.title}"

Their progress:
- Completed ${completedDays} of ${totalDays} days (${completionRate}% completion)
- Current streak: ${currentStreak} days
- Total time invested: ${habit.totalTimeSpent || 0} minutes
${habit.aiContext ? `- About them: ${habit.aiContext}` : ''}
${feedback ? `- Their feedback today: "${feedback}"` : ''}
${mood ? `- Current mood: ${mood}` : ''}

Generate a personalized coaching check-in that includes:
1. Acknowledgment of their effort and specific progress
2. Personalized motivation based on their situation
3. One specific tip to improve tomorrow
4. A question to understand how you can help them better

Keep it warm, personal, and under 200 words. Don't be generic - reference their specific habit and progress.

Return JSON:
{
  "greeting": "Personalized greeting",
  "progressAcknowledgment": "Specific recognition of their progress",
  "motivation": "Personalized motivation message",
  "tipForTomorrow": "One specific, actionable tip",
  "questionForUser": "A caring question to get feedback",
  "encouragingClose": "Warm closing message"
}`;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an empathetic, supportive habit coach. Be warm and personal, not generic. Always return valid JSON." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content from AI");

      const checkin = JSON.parse(content);
      res.json(checkin);
    } catch (error) {
      console.error("Error generating coaching check-in:", error);
      res.status(500).json({ error: "Failed to generate check-in" });
    }
  });

  // Get daily motivation message
  app.get("/api/habits/:id/daily-motivation", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const habitId = Number(req.params.id);
      
      const habit = await storage.getHabit(habitId);
      if (!habit || habit.userId !== userId) {
        return res.status(404).json({ error: "Habit not found" });
      }

      const today = new Date().toISOString().split('T')[0];
      const todayPlan = (habit.dailyPlans || []).find(p => p.date === today);
      const tasksToday = todayPlan?.tasks || [];
      const completedToday = tasksToday.filter(t => t.completed).length;

      const prompt = `Generate a brief, personalized daily motivation for someone working on: "${habit.title}"

Today's plan: ${tasksToday.length} tasks, ${completedToday} completed
Current streak: ${habit.currentStreak || 0} days
${todayPlan?.focus ? `Today's focus: ${todayPlan.focus}` : ''}

Return JSON with:
{
  "morningMotivation": "Brief inspiring message for starting the day (1-2 sentences)",
  "focusReminder": "What to focus on today specifically",
  "quickTip": "One quick tip for success today",
  "streakMessage": "Message about their streak (encouraging if high, supportive if low)"
}`;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an encouraging habit coach. Be brief, specific, and motivating. Return valid JSON." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content from AI");

      const motivation = JSON.parse(content);
      res.json(motivation);
    } catch (error) {
      console.error("Error generating daily motivation:", error);
      res.status(500).json({ error: "Failed to generate motivation" });
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

  // === FEEDBACK ROUTES ===
  
  // Zod schema for feedback submission
  const feedbackSubmitSchema = z.object({
    type: z.enum(["feedback", "bug", "feature", "support"]).default("feedback"),
    subject: z.string().min(1, "Subject is required").max(200),
    message: z.string().min(1, "Message is required").max(5000),
  });
  
  // Zod schema for admin feedback updates
  const feedbackUpdateSchema = z.object({
    status: z.enum(["new", "in_progress", "resolved", "closed"]).optional(),
    priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    adminNotes: z.string().max(5000).optional(),
  });
  
  // Submit feedback (authenticated users)
  app.post("/api/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const userEmail = req.user!.claims.email;
      const userName = `${req.user!.claims.first_name || ''} ${req.user!.claims.last_name || ''}`.trim();
      
      const parseResult = feedbackSubmitSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0].message });
      }
      
      const { type, subject, message } = parseResult.data;
      
      const result = await db.insert(feedback).values({
        userId,
        userEmail,
        userName: userName || undefined,
        type,
        subject,
        message,
      }).returning();
      
      res.json({ success: true, feedback: result[0] });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  // Get all feedback (admin only)
  app.get("/api/admin/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      
      // Check if user is admin
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user[0]?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const result = await db.select().from(feedback).orderBy(sql`${feedback.createdAt} DESC`);
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  // Update feedback status (admin only)
  app.patch("/api/admin/feedback/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      
      // Check if user is admin
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user[0]?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const feedbackId = Number(req.params.id);
      if (isNaN(feedbackId)) {
        return res.status(400).json({ error: "Invalid feedback ID" });
      }
      
      const parseResult = feedbackUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0].message });
      }
      
      const { status, priority, adminNotes } = parseResult.data;
      
      const result = await db.update(feedback)
        .set({
          ...(status && { status }),
          ...(priority && { priority }),
          ...(adminNotes !== undefined && { adminNotes }),
          updatedAt: new Date(),
        })
        .where(eq(feedback.id, feedbackId))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Feedback not found" });
      }
      
      res.json(result[0]);
    } catch (error) {
      console.error("Error updating feedback:", error);
      res.status(500).json({ error: "Failed to update feedback" });
    }
  });

  // ===== ACHIEVEMENTS API =====
  
  // Get user achievements
  app.get("/api/achievements", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const achievements = await db.select()
        .from(userAchievements)
        .where(eq(userAchievements.userId, userId));
      res.json(achievements);
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ error: "Failed to fetch achievements" });
    }
  });

  // Valid achievement IDs
  const VALID_ACHIEVEMENT_IDS = [
    "streak_3", "streak_7", "streak_14", "streak_30", "streak_100",
    "sessions_5", "sessions_25", "sessions_100",
    "time_60", "time_300", "time_1200",
    "habits_3", "habits_5", "first_plan"
  ];

  // Unlock an achievement (internal use, called when conditions are met)
  app.post("/api/achievements/unlock", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { achievementId } = req.body;
      
      if (!achievementId || typeof achievementId !== 'string') {
        return res.status(400).json({ error: "Achievement ID required" });
      }
      
      // Validate achievement ID exists in our definitions
      if (!VALID_ACHIEVEMENT_IDS.includes(achievementId)) {
        return res.status(400).json({ error: "Invalid achievement ID" });
      }
      
      // Check if already unlocked
      const existing = await db.select()
        .from(userAchievements)
        .where(sql`${userAchievements.userId} = ${userId} AND ${userAchievements.achievementId} = ${achievementId}`)
        .limit(1);
      
      if (existing.length > 0) {
        return res.json({ alreadyUnlocked: true, achievement: existing[0] });
      }
      
      // Unlock achievement
      const result = await db.insert(userAchievements).values({
        userId,
        achievementId,
      }).returning();
      
      res.json({ unlocked: true, achievement: result[0] });
    } catch (error) {
      console.error("Error unlocking achievement:", error);
      res.status(500).json({ error: "Failed to unlock achievement" });
    }
  });

  // ===== HABIT TEMPLATES API =====
  
  // Get all habit templates
  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await db.select()
        .from(habitTemplates)
        .orderBy(sql`${habitTemplates.usageCount} DESC`);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // Seed default templates if none exist (admin only or first-time setup)
  app.post("/api/templates/seed", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      
      // Check if user is admin
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user[0]?.isAdmin) {
        // Allow seeding only if no templates exist (first-time setup)
        const existing = await db.select().from(habitTemplates).limit(1);
        if (existing.length > 0) {
          return res.status(403).json({ error: "Admin access required to re-seed templates" });
        }
      }
      
      const existing = await db.select().from(habitTemplates).limit(1);
      if (existing.length > 0) {
        return res.json({ message: "Templates already seeded" });
      }
      
      const defaultTemplates = [
        {
          name: "Morning Routine",
          description: "Start your day with energy and focus",
          category: "wellness",
          icon: "Sunrise",
          color: "amber-500",
          suggestedGoal: "Complete a 30-minute morning routine every day",
        },
        {
          name: "Daily Exercise",
          description: "Build consistent physical activity habits",
          category: "health",
          icon: "Dumbbell",
          color: "green-500",
          suggestedGoal: "Exercise for 30 minutes at least 5 days a week",
        },
        {
          name: "Reading Habit",
          description: "Expand your mind through daily reading",
          category: "learning",
          icon: "BookOpen",
          color: "blue-500",
          suggestedGoal: "Read for 20 minutes every day",
        },
        {
          name: "Meditation Practice",
          description: "Cultivate mindfulness and inner peace",
          category: "wellness",
          icon: "Brain",
          color: "purple-500",
          suggestedGoal: "Meditate for 10 minutes daily",
        },
        {
          name: "Healthy Eating",
          description: "Make better food choices every day",
          category: "health",
          icon: "Apple",
          color: "red-500",
          suggestedGoal: "Eat at least 3 servings of vegetables daily",
        },
        {
          name: "Journaling",
          description: "Reflect on your day and process emotions",
          category: "wellness",
          icon: "PenTool",
          color: "teal-500",
          suggestedGoal: "Write in your journal every evening",
        },
        {
          name: "Learning New Skills",
          description: "Dedicate time to learning something new",
          category: "learning",
          icon: "GraduationCap",
          color: "indigo-500",
          suggestedGoal: "Spend 30 minutes learning a new skill daily",
        },
        {
          name: "Digital Detox",
          description: "Reduce screen time and be more present",
          category: "wellness",
          icon: "Smartphone",
          color: "gray-500",
          suggestedGoal: "Limit recreational screen time to 2 hours daily",
        },
        {
          name: "Sleep Hygiene",
          description: "Improve your sleep quality and consistency",
          category: "health",
          icon: "Moon",
          color: "slate-600",
          suggestedGoal: "Get 7-8 hours of sleep every night",
        },
        {
          name: "Gratitude Practice",
          description: "Cultivate appreciation and positivity",
          category: "wellness",
          icon: "Heart",
          color: "pink-500",
          suggestedGoal: "Write 3 things you're grateful for each day",
        },
      ];
      
      for (const template of defaultTemplates) {
        await db.insert(habitTemplates).values(template);
      }
      
      res.json({ message: "Templates seeded successfully", count: defaultTemplates.length });
    } catch (error) {
      console.error("Error seeding templates:", error);
      res.status(500).json({ error: "Failed to seed templates" });
    }
  });

  // Track template usage
  app.post("/api/templates/:id/use", isAuthenticated, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      
      await db.update(habitTemplates)
        .set({ usageCount: sql`${habitTemplates.usageCount} + 1` })
        .where(eq(habitTemplates.id, templateId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking template usage:", error);
      res.status(500).json({ error: "Failed to track usage" });
    }
  });

  return httpServer;
}
