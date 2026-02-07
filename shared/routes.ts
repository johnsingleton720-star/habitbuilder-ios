import { z } from 'zod';
import { insertHabitSchema, habits, type HabitTip } from './schema';

// Habit question schema
export const habitQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
});

// Routine task schema
export const routineTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  duration: z.number(),
  completed: z.boolean(),
  notes: z.string().optional(),
});

// Daily plan schema
export const dailyPlanSchema = z.object({
  date: z.string(),
  tasks: z.array(routineTaskSchema),
  completed: z.boolean(),
  timeSpent: z.number(),
  sessionNotes: z.string().optional(),
});

// Progress entry schema
export const progressEntrySchema = z.object({
  date: z.string(),
  tasksCompleted: z.number(),
  totalTasks: z.number(),
  timeSpent: z.number(),
  notes: z.string(),
  mood: z.enum(["great", "good", "okay", "struggling"]).optional(),
});

export const habitTipSchema = z.object({
  id: z.string(),
  text: z.string(),
  category: z.enum(["motivation", "technique", "science", "reminder"]),
});

export const habitScheduleSchema = z.object({
  days: z.array(z.string()),
  time: z.string(),
  dayTimes: z.record(z.string(), z.string()).optional(),
  reminder: z.boolean(),
});

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  habits: {
    list: {
      method: 'GET' as const,
      path: '/api/habits',
      responses: {
        200: z.array(z.custom<typeof habits.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/habits/:id',
      responses: {
        200: z.custom<typeof habits.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/habits',
      input: insertHabitSchema,
      responses: {
        201: z.custom<typeof habits.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/habits/:id',
      input: insertHabitSchema.partial().extend({
        questions: z.array(habitQuestionSchema).optional(),
        dailyPlans: z.array(dailyPlanSchema).optional(),
        progress: z.array(progressEntrySchema).optional(),
        aiTips: z.array(habitTipSchema).optional(),
        schedule: habitScheduleSchema.optional(),
        setupComplete: z.boolean().optional(),
        planDuration: z.string().optional(),
        planStartDate: z.string().optional(),
        planEndDate: z.string().optional(),
        aiContext: z.string().optional(),
        totalTimeSpent: z.number().optional(),
        currentStreak: z.number().optional(),
        longestStreak: z.number().optional(),
      }),
      responses: {
        200: z.custom<typeof habits.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/habits/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
  },
  quotes: {
    daily: {
      method: 'GET' as const,
      path: '/api/quotes/daily',
      responses: {
        200: z.object({
          quote: z.string(),
          author: z.string().optional(),
        }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type HabitInput = z.infer<typeof api.habits.create.input>;
export type HabitResponse = z.infer<typeof api.habits.create.responses[201]>;
