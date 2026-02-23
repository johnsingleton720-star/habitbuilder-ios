# Habit Builder - AI-Powered Habit Coaching Application

## Overview

Habit Builder is an AI-powered habit coaching application designed to guide users in building positive habits. It moves beyond simple tracking by conducting personalized interviews to understand user goals, generating tailored daily/weekly/monthly action plans, and providing interactive guided sessions. The application aims to offer a comprehensive habit-building experience, leveraging AI for personalization and coaching.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
-   **Framework**: React 18 with TypeScript
-   **Routing**: Wouter
-   **State Management**: TanStack React Query
-   **UI Components**: shadcn/ui with Radix UI primitives
-   **Styling**: Tailwind CSS with a nature-themed color palette
-   **Animations**: Framer Motion (page transitions via `PageTransition.tsx` wrapper on all authenticated routes)
-   **Mobile Navigation**: `MobileBottomNav.tsx` - fixed bottom bar (Dashboard, Habits, Progress, Account) visible only on mobile (<768px), only for authenticated users. Habits button scrolls to habits section on dashboard.
-   **Loading States**: Shimmer CSS animation (`animate-shimmer` class in `index.css`) used across all loading skeletons
-   **Dashboard Hero Card**: `DashboardHeroCard.tsx` - compact level/XP ring/streak/tier summary at dashboard top
-   **Achievement Badges**: Gradient backgrounds with category-specific glow effects for unlocked badges
-   **PWA Support**: Service worker for offline caching and web app manifest.

### Backend
-   **Framework**: Express.js with TypeScript
-   **Database ORM**: Drizzle ORM with PostgreSQL
-   **Authentication**: Replit Auth (OpenID Connect) with Passport.js
-   **Session Storage**: PostgreSQL-backed sessions
-   **API Design**: RESTful endpoints with Zod validation.

### Data Storage
-   **Primary Database**: PostgreSQL
-   **Key Tables**: `users`, `sessions`, `habits`, `conversations`, `messages`, `feedback`, `quick_tasks`.

### AI-Powered Habit System
The core system enables personalized habit coaching:
-   **Habit Creation**: Users input habit details, then AI generates personalized interview questions.
-   **Action Plan Generation**: Based on user answers, AI creates detailed daily/weekly/monthly action plans.
-   **Guided Sessions**: Interactive sessions walk users through tasks with notes and timers, and provide post-session AI summaries.
-   **Habit Customization**: Users can personalize habits with custom icons, colors, and assign them to categories.
-   **Smart Resources**: AI generates real, clickable external resources (articles, books, courses, blogs, free templates) relevant to each task. Resources link to actual public pages. NEVER recommends competing habit tracking apps — only complementary educational/skill resources.

### Payment System
-   **Subscription Tiers**: Free, Pro ($6 USD/month), and Premium ($15 USD/month) tiers.
-   **Integration**: Stripe for subscription management and webhooks.
-   **International Payments**: Stripe auto-selects best payment methods per region (cards, Apple Pay, Google Pay, regional methods). Checkout uses `locale: 'auto'` for localized language. Prices displayed in USD with "Prices in USD" notes across all pricing pages.
-   **Promo Codes**: Enabled via `allow_promotion_codes: true` in checkout.
-   **Trial System**: 2-day free trial with expanded features. After trial, free tier allows 1 habit with limited features to drive upgrades.
-   **Free Tier (Demo Mode)**: 1 habit, first AI action plan only, 3 guided sessions per week, template library access. NO AI summaries, NO AI task resources, NO streaks, NO plan refresh/regeneration. Features are shown but locked with friendly upgrade prompts (greyed out with Lock icons). Session limit tracked via `free_sessions_this_week` and `free_sessions_week_start` on users table.

### Customer Feedback System
-   Allows users to submit feedback (General, Bug, Feature Request, Support).
-   Admins can view, prioritize, and manage feedback via a dashboard.

### Analytics
-   **Admin Analytics**: Tracks page views, unique visitors, registrations, and free trial sign-ups with time range filters.
-   **Advanced Analytics (Premium)**: Provides trend charts, habit performance breakdowns, AI-generated insights, and data export.

### Achievements & Gamification
-   An achievement system rewards users for streaks, completions, time invested, and milestones.
-   **Streak XP Multiplier (Pro+)**: 3-day streak = 1.5x, 7-day = 2x, 14-day = 2.5x, 30-day = 3x XP on challenge completions. Multiplier badge shown on dashboard.
-   **Weekly XP Goal (Pro+)**: Progress bar tracking XP earned this week (Monday-based) vs goal (default 500 XP).
-   **Unlockable Accent Colors (Premium)**: 12 level-based color rewards. Users can apply unlocked colors via dashboard. Backend validates level before allowing selection. `PATCH /api/user/accent-color`.
-   **Achievement Celebration Pop-ups (Premium)**: Full-screen celebration modal with motivational context messages (behavioral psychology stats) when new achievements are earned.
-   **Tier Gating**: Free users see basic level/XP. Pro adds multiplier badge + weekly goal. Premium adds unlockable colors + rich achievement celebrations.

### Habit Templates
-   A library of pre-built habit templates is available for various categories.
-   **Public Templates Gallery**: `/templates` - Publicly accessible (no auth required) page showing all templates by category with SEO metadata and sign-up CTAs.

### Blog (SEO Content)
-   **Static blog articles**: Stored in `client/src/data/blog-articles.ts` as structured data (no CMS).
-   **Routes**: `/blog` (listing), `/blog/:slug` (individual articles).
-   **Articles include**: Sections, FAQs with JSON-LD schema, keywords, and sign-up CTAs.
-   **Publicly accessible**: No login required. Targets long-tail SEO keywords.

### Interactive AI Demo
-   Landing page "try it" section allows visitors to type any habit goal and get an AI-generated action plan.
-   **API**: `POST /api/demo-plan` (public, rate-limited to 5 requests/hour per IP).
-   Uses content safety checks and OpenAI gpt-4o-mini model.

### Public Routes
-   App.tsx router supports public routes (`/templates`, `/blog`, `/blog/:slug`) that render without authentication.
-   Public pages share a common nav with links to Home, Templates, Blog, Sign In, and Get Started.

### Terms of Service & Content Safety
-   **TOS Acceptance**: New users must accept Terms of Service before using the app. Modal blocks access until accepted. Stored as `tosAcceptedAt` in users table.
-   **Content Safety Filter**: Server-side validation (`server/contentSafety.ts`) blocks harmful habit creation — violence, exploitation of minors, illegal activities, self-harm, hate speech. Flagged patterns (explicit content, substance promotion, gambling) are blocked with constructive guidance messages.
-   **AI Safety Guardrails**: All AI system prompts include safety instructions preventing generation of harmful, violent, or explicit content.

### Timezone Support
-   **User Timezone**: Stored in `users.timezone` column (IANA timezone string, e.g., "America/New_York").
-   **Auto-Detection**: Browser timezone is auto-detected on login via `Intl.DateTimeFormat().resolvedOptions().timeZone` and synced to server if user hasn't set one.
-   **Server-Side**: `getUserToday(timezone)` helper in `server/routes.ts` computes "today" in user's timezone for auto-skip logic, streak calculations, and daily challenges.
-   **Settings**: Users can manually change timezone in Account page with a dropdown of common timezones.
-   **API**: `PATCH /api/user/timezone` to update timezone.

### Onboarding Wizard
-   **3-step flow**: Welcome → Pick a Habit → AI generates first plan.
-   Shows ONLY for new users when `user.onboardingComplete === false`.
-   After completing, marks `onboardingComplete: true` via `PATCH /api/user/onboarding`.
-   Component: `client/src/components/OnboardingWizard.tsx`.

### Quick Tasks
-   Personal checklist/to-do system on dashboard, separate from habit action plans.
-   Add, toggle complete, and delete tasks per day.
-   **API**: `GET/POST/PATCH/DELETE /api/quick-tasks` (date-filtered).
-   **Database Table**: `quick_tasks` (id, user_id, title, completed, date, sort_order).
-   Component: `client/src/components/QuickTasks.tsx`.
-   Includes completion celebration micro-animation (particle burst effect via `CompletionCelebration.tsx`).

### Email Notifications
-   **Automatic Scheduler**: `server/emailScheduler.ts` runs every 15 minutes, checking each user's timezone and preferred reminder time.
-   **Daily Morning Reminders**: Automatically sent at each user's preferred time (default 8:00 AM) in their timezone. Includes today's tasks and streak info. Opt-out via Account settings.
-   **Weekly Progress Digest**: Automatically sent on Sundays at 9:00 AM in user's timezone. Includes sessions completed, time invested, streaks, completion rate. Opt-out via Account settings.
-   **Admin Trigger**: `POST /api/admin/send-daily-reminders` still available for manual batch-send.
-   **User Preferences**: `PATCH /api/user/email-preferences` with `dailyReminderEnabled`, `weeklyDigestEnabled`, `dailyReminderTime`.
-   **Database Columns**: `daily_reminder_enabled`, `weekly_digest_enabled`, `daily_reminder_time`, `last_daily_reminder_sent`, `last_weekly_digest_sent` on users table.

### Dark Mode
-   Supports theme switching with localStorage persistence.

### Accountability Partners (Premium)
-   **Explicit Sharing**: Users must select specific habits to share when inviting a partner. At least 1 habit required. Empty selection = nothing shared.
-   **My Partners Tab**: Shows YOUR shared habits (as name badges) with that partner. Does NOT show the partner's habits.
-   **Shared With Me Tab**: Shows habits that OTHER users shared with you via their invite. Only explicitly selected habits are visible.
-   **Privacy Controls**: Per-partnership `sharingSettings` JSON with toggles: showStreaks, showCompletions, showNotes, showActionPlans, showTimeSpent. Configurable via Sharing settings button.
-   **Auto-Refresh**: Queries poll every 30 seconds so updates appear automatically without page refresh.
-   **Rich Progress Display**: Shared With Me tab shows real habit data - completion timelines, session notes, time invested, streak stats - filtered by sharer's privacy settings.
-   **No Implicit Sharing**: Partner does NOT see your habits unless you explicitly invite them. No "share back" feature - each direction requires a separate invite.
-   **API**: `PATCH /api/accountability-partners/:id/sharing-settings` (update what you share with a partner).
-   **Database Columns**: `sharing_settings`, `habit_ids` on `accountability_partners` table.

### Community Forum (Tiered Access)
-   **Pro Users**: Read-only access - can view forums and read posts, but cannot engage
-   **Premium Users**: Full access - can post, comment, like, message, and manage their profile
-   **Forum Categories**: Progress Updates, Tips & Motivation, Accountability Partners, Questions & Help, General Discussion
-   **Posts & Comments**: Premium users can create posts, comment, and like content
-   **User Profiles**: Public profiles with display names, bios, and achievement badges (Premium only)
-   **Direct Messaging**: In-app private messaging between premium users
-   **Privacy Controls**: Premium users can toggle profile visibility, messaging, profile likes, and habit progress display
-   **Routes**: `/community`, `/community/post/:id`, `/community/messages`, `/community/profile/:userId`
-   **Database Tables**: `user_profiles`, `forum_categories`, `forum_posts`, `forum_comments`, `post_likes`, `comment_likes`, `profile_likes`, `conversations`, `messages`

## External Dependencies

### Email System (Resend)
-   **Integration**: Resend via Replit Connectors (server/email.ts)
-   **Accountability Invites**: Real emails sent when Premium users invite accountability partners
-   **Progress Updates**: Real emails sent when users share habit progress with partners
-   **Admin Email Dashboard**: `/admin/email` - Admin can compose and send emails to users, filtered by subscription tier (all/free/pro/premium) or to individual emails
-   **HTML Escaping**: All user-provided content is sanitized before inserting into email HTML
-   **Admin API**: `POST /api/admin/emails/send`, `GET /api/admin/emails/recipients`

### iOS App (Capacitor)
-   **Framework**: Capacitor (iOS only — Android uses separate TWA build)
-   **Bundle ID**: `pro.habitbuilder.app`
-   **Config**: `capacitor.config.ts` — points to live `https://habitbuilder.pro` server
-   **Platform Detection**: `client/src/lib/platform.ts` — detects iOS/Android/web at runtime
-   **Payment Routing**: iOS users get Apple In-App Purchase; web and Android users keep Stripe
-   **Apple IAP**: `client/src/lib/apple-iap.ts` — handles purchases and restore via native plugin (only active in iOS builds)
-   **Receipt Validation**: `POST /api/apple/validate-receipt` — server-side Apple receipt verification
-   **Build Instructions**: `ios-build-instructions.md` — full step-by-step guide for building and submitting to App Store
-   **Environment Variable**: `APPLE_SHARED_SECRET` needed for receipt validation (from App Store Connect)

### Third-Party Services
-   **Database**: PostgreSQL (Replit-managed)
-   **Authentication**: Replit Auth
-   **Payments**: Stripe (web/Android), Apple In-App Purchase (iOS)
-   **AI Services**: OpenAI (via Replit AI Integrations)
-   **Email**: Resend (via Replit Connectors)

### Key Environment Variables
-   `DATABASE_URL`
-   `SESSION_SECRET`
-   `REPL_ID`
-   `AI_INTEGRATIONS_OPENAI_API_KEY`
-   `AI_INTEGRATIONS_OPENAI_BASE_URL`
-   `APPLE_SHARED_SECRET` (needed for iOS in-app purchase receipt validation)