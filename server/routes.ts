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
import { users } from "@shared/schema";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";

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

They need detailed guidance for this specific task:
Title: "${task.title}"
Description: "${task.description}"

${habit.aiContext ? `Context about this person: ${habit.aiContext}` : ''}

Generate comprehensive, actionable guidance including:

1. EXAMPLES: 3-4 specific, detailed examples of how to complete this task successfully. Be very concrete with exact steps, timings, and measurements.

2. TIPS: 4-5 practical tips for success, including common mistakes to avoid and pro tips from experts.

3. RESOURCES: 5-8 tools, apps, websites, or products that can help with this specific task. Include:
   - Popular apps (with real app names)
   - Websites and online tools
   - Books or guides (with real titles/authors)
   - Templates or worksheets
   - Physical tools or products if applicable

4. TEMPLATES: 2-3 ready-to-use templates, checklists, or structured formats they can follow. Write these out fully - don't just describe them.

5. VIDEO SUGGESTIONS: 3-4 YouTube search queries that would find helpful tutorial videos for this exact task. Be specific (e.g., "beginner morning yoga routine 10 minutes" not just "yoga").

Return a JSON object with this structure:
{
  "examples": ["Detailed example 1...", "Detailed example 2...", ...],
  "tips": ["Tip 1...", "Tip 2...", ...],
  "resources": [
    { "id": "res-1", "name": "Resource Name", "type": "app|website|tool|book|template", "url": "https://...", "description": "What it does and why it helps" },
    ...
  ],
  "templates": ["Full template 1 with placeholders...", "Full template 2...", ...],
  "videoSuggestions": [
    { "title": "Video title description", "searchQuery": "exact youtube search query", "platform": "youtube" },
    ...
  ]
}

IMPORTANT:
- Be extremely specific and detailed - users should be able to follow your guidance without any additional research
- Use real product/app/book names that actually exist
- Make templates actually usable, not just descriptions
- Video search queries should find real, helpful videos on YouTube`;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert habit coach and resource curator. Provide detailed, practical guidance with real tools and resources. Always return valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 3000,
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

      // Ensure required fields exist with defaults
      const safeGuidance = {
        examples: guidance.examples || [],
        tips: guidance.tips || [],
        tools: guidance.tools || [],
        templates: guidance.templates || [],
        videos: guidance.videos || [],
      };

      res.json({ taskId, ...safeGuidance });
    } catch (error) {
      console.error("Error generating task guidance:", error);
      res.status(500).json({ error: "Failed to generate guidance" });
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
