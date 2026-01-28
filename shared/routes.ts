import { z } from 'zod';
import { insertHabitSchema, habits, type HabitStep, type HabitTip } from './schema';

// Step and tip schemas for validation
export const habitStepSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean(),
});

export const habitTipSchema = z.object({
  id: z.string(),
  text: z.string(),
  category: z.enum(["motivation", "technique", "science", "reminder"]),
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
        completedDates: z.array(z.string()).optional(),
        steps: z.array(habitStepSchema).optional(),
        aiTips: z.array(habitTipSchema).optional(),
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
  ai: {
    generatePlan: {
      method: 'POST' as const,
      path: '/api/ai/generate-plan',
      input: z.object({
        habitTitle: z.string(),
        habitDescription: z.string().optional(),
        goal: z.string().optional(),
      }),
      responses: {
        200: z.object({
          steps: z.array(habitStepSchema),
          tips: z.array(habitTipSchema),
        }),
        401: errorSchemas.unauthorized,
        500: errorSchemas.internal,
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
