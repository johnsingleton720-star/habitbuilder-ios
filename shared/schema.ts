import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Export Auth and Chat models
export * from "./models/auth";
export * from "./models/chat";

import { users } from "./models/auth";

// Question asked during habit setup interview
export interface HabitQuestion {
  id: string;
  question: string;
  answer: string;
}

// Resource or tool recommendation for a task
export interface TaskResource {
  id: string;
  name: string;
  type: "app" | "website" | "tool" | "book" | "template" | "video";
  url?: string;
  description: string;
}

// Detailed guidance for a task
export interface TaskGuidance {
  examples: string[];
  tips: string[];
  resources: TaskResource[];
  templates?: string[];
  videoSuggestions?: {
    title: string;
    searchQuery: string;
    platform: "youtube" | "other";
  }[];
}

// Daily routine task within an action plan
export interface RoutineTask {
  id: string;
  title: string;
  description: string;
  duration: number; // Minutes
  completed: boolean;
  skipped?: boolean;
  notes?: string;
  guidance?: TaskGuidance;
}

// Daily action plan for a specific date
export interface DailyPlan {
  date: string; // ISO date string
  dayNumber?: number;
  focus?: string; // Theme for the day
  tasks: RoutineTask[];
  completed: boolean;
  timeSpent: number; // Total minutes spent
  sessionNotes?: string;
}

// Progress log entry for tracking
export interface ProgressEntry {
  date: string;
  tasksCompleted: number;
  totalTasks: number;
  timeSpent: number;
  goalTime?: number;
  notes: string;
  mood?: "great" | "good" | "okay" | "struggling";
}

// AI-generated tip type
export interface HabitTip {
  id: string;
  text: string;
  category: "motivation" | "technique" | "science" | "reminder";
}

// Schedule type for habit scheduling
export interface HabitSchedule {
  days: string[]; // Array of day names: "monday", "tuesday", etc.
  time: string; // Default time in HH:mm format (used when no per-day time is set)
  dayTimes?: Record<string, string>; // Per-day times in HH:mm format, e.g. { monday: "07:00", wednesday: "18:00" }
  reminder: boolean; // Whether to show reminders
}

export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  goal: text("goal"),
  
  // Setup phase
  setupComplete: boolean("setup_complete").default(false),
  questions: jsonb("questions").$type<HabitQuestion[]>().default([]),
  
  // Plan configuration
  planDuration: text("plan_duration").default("weekly"), // daily, weekly, monthly
  planStartDate: text("plan_start_date"),
  planEndDate: text("plan_end_date"),
  
  // Schedule
  schedule: jsonb("schedule").$type<HabitSchedule>(),
  
  // Action plans and progress
  dailyPlans: jsonb("daily_plans").$type<DailyPlan[]>().default([]),
  progress: jsonb("progress").$type<ProgressEntry[]>().default([]),
  
  // Stats
  totalTimeSpent: integer("total_time_spent").default(0), // Minutes
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  
  // AI guidance
  aiTips: jsonb("ai_tips").$type<HabitTip[]>().default([]),
  aiContext: text("ai_context"), // Summary of user's goals/context for AI
  
  // Customization
  customIcon: text("custom_icon"), // Icon name from lucide-react
  customColor: text("custom_color"), // Hex color or tailwind color class
  category: text("category"), // User-defined category for organizing habits
  
  // Streak protection (Premium feature)
  streakFreezeUsed: integer("streak_freeze_used").default(0), // Freezes used this month
  streakFreezeMonth: text("streak_freeze_month"), // Month when freeze count resets (YYYY-MM)
  
  // Archiving
  archived: boolean("archived").default(false),
  
  // Habit stacking (Premium feature)
  linkedHabitId: integer("linked_habit_id"), // "After completing this habit, do linked habit next"
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertHabitSchema = createInsertSchema(habits).omit({
  id: true,
  createdAt: true,
  userId: true, // Set by backend from session
});

export type Habit = typeof habits.$inferSelect;
export type InsertHabit = z.infer<typeof insertHabitSchema>;

// Custom types for API
export type CreateHabitRequest = z.infer<typeof insertHabitSchema>;
export type UpdateHabitRequest = Partial<CreateHabitRequest>;

// Customer Feedback table
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  userEmail: text("user_email"),
  userName: text("user_name"),
  type: text("type").notNull().default("feedback"), // feedback, bug, feature, support
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("new"), // new, in_progress, resolved, closed
  priority: text("priority").default("normal"), // low, normal, high, urgent
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  priority: true,
  adminNotes: true,
});

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

// Achievement types
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "streak" | "completion" | "time" | "milestone";
  requirement: number; // e.g., 7 for 7-day streak
  unlockedAt?: string; // ISO date when unlocked
}

// User achievements table
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  achievementId: text("achievement_id").notNull(), // matches Achievement.id
  unlockedAt: timestamp("unlocked_at").defaultNow(),
});

export type UserAchievement = typeof userAchievements.$inferSelect;

// Habit templates library
export const habitTemplates = pgTable("habit_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // health, productivity, wellness, learning, etc.
  icon: text("icon").default("Target"),
  color: text("color").default("teal-600"),
  suggestedGoal: text("suggested_goal"),
  suggestedQuestions: jsonb("suggested_questions").$type<HabitQuestion[]>().default([]),
  suggestedPlan: jsonb("suggested_plan").$type<RoutineTask[]>().default([]),
  isPremium: boolean("is_premium").default(false), // Premium-only templates
  usageCount: integer("usage_count").default(0),
  // Community marketplace fields
  isPublic: boolean("is_public").default(false), // Shared to marketplace
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  createdByName: text("created_by_name"),
  rating: integer("rating").default(0), // Average rating out of 5
  ratingCount: integer("rating_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertHabitTemplateSchema = createInsertSchema(habitTemplates).omit({
  id: true,
  createdAt: true,
  usageCount: true,
});

export type HabitTemplate = typeof habitTemplates.$inferSelect;
export type InsertHabitTemplate = z.infer<typeof insertHabitTemplateSchema>;

export interface SharingSettings {
  showStreaks: boolean;
  showCompletions: boolean;
  showNotes: boolean;
  showActionPlans: boolean;
  showTimeSpent: boolean;
}

export const defaultSharingSettings: SharingSettings = {
  showStreaks: true,
  showCompletions: true,
  showNotes: false,
  showActionPlans: false,
  showTimeSpent: true,
};

// Accountability partners
export const accountabilityPartners = pgTable("accountability_partners", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  partnerEmail: text("partner_email").notNull(),
  partnerName: text("partner_name"),
  partnerUserId: varchar("partner_user_id"),
  status: text("status").default("pending"), // pending, accepted, declined
  inviteToken: text("invite_token"),
  habitIds: jsonb("habit_ids").$type<number[]>().default([]), // Which habits to share
  sharingSettings: jsonb("sharing_settings").$type<SharingSettings>().default(defaultSharingSettings),
  partnerSharingSettings: jsonb("partner_sharing_settings").$type<SharingSettings>().default(defaultSharingSettings),
  partnerHabitIds: jsonb("partner_habit_ids").$type<number[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AccountabilityPartner = typeof accountabilityPartners.$inferSelect;

// Weekly progress reports
export const progressReports = pgTable("progress_reports", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  reportType: text("report_type").notNull(), // weekly, monthly
  periodStart: text("period_start").notNull(), // ISO date
  periodEnd: text("period_end").notNull(), // ISO date
  summary: text("summary"), // AI-generated summary
  stats: jsonb("stats").$type<{
    totalSessions: number;
    totalTimeSpent: number;
    habitsWorkedOn: number;
    tasksCompleted: number;
    averageStreak: number;
    topHabit?: string;
  }>(),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ProgressReport = typeof progressReports.$inferSelect;

// Reminder settings per habit
export const habitReminders = pgTable("habit_reminders", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").notNull().references(() => habits.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  reminderTime: text("reminder_time").notNull(), // HH:mm format
  days: jsonb("days").$type<string[]>().default([]), // ["monday", "tuesday", etc.]
  enabled: boolean("enabled").default(true),
  lastSent: timestamp("last_sent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type HabitReminder = typeof habitReminders.$inferSelect;

// User saved templates (editable templates from resources)
export const userTemplates = pgTable("user_templates", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  habitId: integer("habit_id").references(() => habits.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  originalTitle: text("original_title"), // Original template title for reference
  taskId: text("task_id"), // Which task this template is for
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserTemplateSchema = createInsertSchema(userTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserTemplate = typeof userTemplates.$inferSelect;
export type InsertUserTemplate = z.infer<typeof insertUserTemplateSchema>;

// Mood tracking entries
export const moodEntries = pgTable("mood_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: text("date").notNull(), // ISO date string yyyy-MM-dd
  mood: text("mood").notNull(), // great, good, okay, bad, terrible
  energy: integer("energy"), // 1-5 scale
  stress: integer("stress"), // 1-5 scale
  sleep: integer("sleep"), // 1-5 scale
  notes: text("notes"),
  habitIds: jsonb("habit_ids").$type<number[]>().default([]), // Habits completed that day
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMoodEntrySchema = createInsertSchema(moodEntries).omit({
  id: true,
  createdAt: true,
});

export type MoodEntry = typeof moodEntries.$inferSelect;
export type InsertMoodEntry = z.infer<typeof insertMoodEntrySchema>;

// Quick Tasks - personal checklist items separate from habit action plans
export const quickTasks = pgTable("quick_tasks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  completed: boolean("completed").default(false),
  date: text("date").notNull(), // ISO date string yyyy-MM-dd
  scheduledTime: text("scheduled_time"), // HH:mm format, nullable
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQuickTaskSchema = createInsertSchema(quickTasks).omit({
  id: true,
  createdAt: true,
});

export type QuickTask = typeof quickTasks.$inferSelect;
export type InsertQuickTask = z.infer<typeof insertQuickTaskSchema>;

// Page views for visitor tracking (admin analytics)
export const pageViews = pgTable("page_views", {
  id: serial("id").primaryKey(),
  path: text("path").notNull(),
  userId: varchar("user_id").references(() => users.id), // null for anonymous visitors
  userAgent: text("user_agent"),
  ipHash: text("ip_hash"), // Hashed IP for privacy
  referrer: text("referrer"),
  sessionId: text("session_id"), // To track unique sessions
  createdAt: timestamp("created_at").defaultNow(),
});

export type PageView = typeof pageViews.$inferSelect;
export type InsertPageView = typeof pageViews.$inferInsert;

// ==========================================
// COMMUNITY FEATURES (Premium Only)
// ==========================================

// User profiles for community features
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  displayName: text("display_name"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  
  // Privacy settings
  profileVisible: boolean("profile_visible").default(true),
  showHabitProgress: boolean("show_habit_progress").default(false),
  allowMessages: boolean("allow_messages").default(true),
  allowProfileLikes: boolean("allow_profile_likes").default(true),
  
  // Stats (public-facing)
  totalLikes: integer("total_likes").default(0),
  postsCount: integer("posts_count").default(0),
  commentsCount: integer("comments_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalLikes: true,
  postsCount: true,
  commentsCount: true,
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

// Forum categories
export const forumCategories = pgTable("forum_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  icon: text("icon").default("MessageCircle"),
  color: text("color").default("primary"),
  sortOrder: integer("sort_order").default(0),
  postsCount: integer("posts_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ForumCategory = typeof forumCategories.$inferSelect;

// Forum posts
export const forumPosts = pgTable("forum_posts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  categoryId: integer("category_id").notNull().references(() => forumCategories.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  isPinned: boolean("is_pinned").default(false),
  isLocked: boolean("is_locked").default(false),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertForumPostSchema = createInsertSchema(forumPosts).omit({
  id: true,
  userId: true,
  likesCount: true,
  commentsCount: true,
  isPinned: true,
  isLocked: true,
  lastActivityAt: true,
  createdAt: true,
  updatedAt: true,
});

export type ForumPost = typeof forumPosts.$inferSelect;
export type InsertForumPost = z.infer<typeof insertForumPostSchema>;

// Forum comments
export const forumComments = pgTable("forum_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => forumPosts.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  likesCount: integer("likes_count").default(0),
  parentCommentId: integer("parent_comment_id"), // For nested replies
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertForumCommentSchema = createInsertSchema(forumComments).omit({
  id: true,
  userId: true,
  likesCount: true,
  createdAt: true,
  updatedAt: true,
});

export type ForumComment = typeof forumComments.$inferSelect;
export type InsertForumComment = z.infer<typeof insertForumCommentSchema>;

// Post likes
export const postLikes = pgTable("post_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => forumPosts.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PostLike = typeof postLikes.$inferSelect;

// Comment likes
export const commentLikes = pgTable("comment_likes", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull().references(() => forumComments.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CommentLike = typeof commentLikes.$inferSelect;

// Profile likes
export const profileLikes = pgTable("profile_likes", {
  id: serial("id").primaryKey(),
  profileUserId: varchar("profile_user_id").notNull().references(() => users.id),
  likedByUserId: varchar("liked_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ProfileLike = typeof profileLikes.$inferSelect;

// Conversations (for messaging)
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  participant1Id: varchar("participant1_id").notNull().references(() => users.id),
  participant2Id: varchar("participant2_id").notNull().references(() => users.id),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  lastMessagePreview: text("last_message_preview"),
  unreadCount1: integer("unread_count_1").default(0), // Unread for participant1
  unreadCount2: integer("unread_count_2").default(0), // Unread for participant2
  createdAt: timestamp("created_at").defaultNow(),
});

export type Conversation = typeof conversations.$inferSelect;

// Messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  senderId: true,
  isRead: true,
  createdAt: true,
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// ==========================================
// HABIT STACKS (Premium Only)
// ==========================================

export interface StackTask {
  habitId: number;
  habitTitle: string;
  order: number;
  transitionNote?: string;
}

export interface UnifiedPlanStep {
  id: string;
  title: string;
  description: string;
  duration: number;
  coachingTip?: string;
}

export interface UnifiedPlanResource {
  name: string;
  type: string;
  searchQuery: string;
  description: string;
}

export interface UnifiedPlanTask {
  id: string;
  title: string;
  description: string;
  duration: number;
  habitId: number;
  habitTitle: string;
  order: number;
  completed?: boolean;
  steps: UnifiedPlanStep[];
  coachingTip?: string;
  resources?: UnifiedPlanResource[];
}

export interface UnifiedPlanTransition {
  fromHabitId: number;
  toHabitId: number;
  fromHabitTitle: string;
  toHabitTitle: string;
  message: string;
  tip?: string;
}

export interface UnifiedPlan {
  overview: string;
  totalDuration: number;
  tasks: UnifiedPlanTask[];
  transitions: UnifiedPlanTransition[];
  tips: string[];
  generatedAt: string;
}

export const habitStacks = pgTable("habit_stacks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon").default("Layers"),
  color: text("color").default("primary"),
  habitIds: jsonb("habit_ids").$type<number[]>().default([]),
  habitOrder: jsonb("habit_order").$type<StackTask[]>().default([]),
  scheduledTime: text("scheduled_time"),
  planMode: text("plan_mode").default("separate"),
  stackPlan: jsonb("stack_plan").$type<{
    overview: string;
    totalDuration: number;
    transitions: { fromHabitId: number; toHabitId: number; note: string }[];
    tips: string[];
  }>(),
  unifiedPlan: jsonb("unified_plan").$type<UnifiedPlan>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHabitStackSchema = createInsertSchema(habitStacks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
});

export type HabitStack = typeof habitStacks.$inferSelect;
export type InsertHabitStack = z.infer<typeof insertHabitStackSchema>;

// ==========================================
// AI COACH CHAT (Premium Only)
// ==========================================

export const coachChats = pgTable("coach_chats", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  isActive: boolean("is_active").default(true),
  messageCount: integer("message_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  endedAt: timestamp("ended_at"),
});

export type CoachChat = typeof coachChats.$inferSelect;

export const coachMessages = pgTable("coach_messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull().references(() => coachChats.id),
  role: text("role").notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CoachMessage = typeof coachMessages.$inferSelect;
