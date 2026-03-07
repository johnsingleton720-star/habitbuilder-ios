# Habit Builder - AI-Powered Habit Coaching Application

## Overview

Habit Builder is an AI-powered habit coaching application designed to guide users in building positive habits. It moves beyond simple tracking by conducting personalized interviews, generating tailored daily/weekly/monthly action plans, and providing interactive guided sessions. The application leverages AI for personalization and coaching, offering a comprehensive habit-building experience. It offers a tiered subscription model (Free, Pro, Premium) to unlock advanced features, gamification, and community interaction. The project aims to empower users to achieve their personal development goals through consistent habit formation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
-   **Framework**: React 18 with TypeScript, Wouter for routing.
-   **State Management**: TanStack React Query.
-   **UI/Styling**: shadcn/ui, Radix UI primitives, Tailwind CSS with a nature-themed color palette.
-   **Animations**: Framer Motion for page transitions.
-   **Mobile UI**: Fixed bottom navigation for authenticated mobile users, shimmering loading skeletons.
-   **Gamification UI**: Compact level/XP summary, gradient achievement badges, customizable accent colors (Premium).
-   **PWA Support**: Service worker for offline caching and web app manifest.

### Backend
-   **Framework**: Express.js with TypeScript.
-   **Database ORM**: Drizzle ORM with PostgreSQL.
-   **Authentication**: Replit Auth (OpenID Connect) with Passport.js, PostgreSQL-backed sessions.
-   **API Design**: RESTful endpoints with Zod validation.

### Data Storage
-   **Primary Database**: PostgreSQL, storing users, habits, conversations, feedback, quick tasks, and user commitments.
-   **Database Indexes**: `habits_user_id_idx` on `habits.user_id`, `user_achievements_user_id_idx` on `user_achievements.user_id`.

### Performance Optimizations
-   **Lightweight Dashboard API**: `GET /api/habits/summary` returns habits with only today's daily plan (not all 30 days) and strips heavy fields (questions, aiContext, aiTips, progress history). Dashboard uses `useHabitsSummary()` hook; detail pages use full `useHabits()`.
-   **Payment Status Cache**: In-memory cache (`paymentStatusCache`) on `/api/payment-status` avoids repeated Stripe API calls within the 5-minute sync interval. Cache invalidated on subscription changes (checkout, Apple IAP validation).
-   **Lazy Achievement Calculation**: `GET /api/achievements` returns stored achievements without recalculating. Achievement checks run on task completion and session saving only.
-   **Deferred Queries**: Template gallery fetches only when opened (`enabled: isOpen`). Non-critical dashboard components (achievements, gamification, mood) use `staleTime` to reduce refetches.

### AI-Powered Habit System
-   **Personalized Coaching**: AI conducts interviews, generates detailed daily/weekly/monthly action plans, and provides interactive guided sessions with post-session summaries.
-   **Adaptive Coaching Check-ins (Pro/Premium)**: Two-way coaching conversations — after the initial AI check-in response, users can reply and have a 2-3 turn conversation with the AI coach. Premium users can use voice input for follow-ups.
-   **Smart Plan Adjustment (Pro/Premium)**: When a user's completion rate drops below 40% after 5+ days, the app detects the plan isn't working and offers to regenerate it. The adjusted plan uses completion patterns, miss reasons, mood data (Pro: 3 entries, Premium: 7 entries), and journal themes (Premium only) to create a better-fitting plan.
-   **Mood/Journal Context in Plan Generation (Tiered)**: Plan generation and regeneration enriches the AI prompt with recent wellbeing data — Pro users get last 5 mood entries; Premium users get last 7 mood entries + last 5 journal summaries.
-   **Missed-Day Reflection (All Tiers)**: When a streak breaks, the StreakBrokenModal asks "What happened?" with tap-to-select reasons (Too busy, Forgot, Too tired, Schedule conflict, Didn't feel like it, Other). Stored in `missReasons` field on the habits table and fed into plan adjustments. Streak break detection is fully server-side: habits table has `previousStreak`, `streakBrokenAt`, and `streakBrokenDismissed` columns. The `GET /api/habits/streak-breaks` endpoint recalculates stale streaks on-demand and returns pending breaks. The Dashboard queries this endpoint instead of using localStorage.
-   **Habit Customization**: Users can personalize habits with icons and colors.
-   **Smart Resources**: AI generates relevant, clickable external resources (articles, books, courses) for tasks, avoiding competing habit trackers.
-   **AI Safety**: Server-side content safety filters and AI guardrails prevent harmful content generation.

### Subscription Downgrade Protection
-   **Habit Archiving on Cancellation**: When a Pro/Premium user cancels and drops to the free tier, a modal prompts them to choose 1 habit to keep active. The rest are archived with a `downgradeArchived` flag.
-   **Auto-Restore on Re-subscription**: When a cancelled user re-subscribes (via checkout or subscription reactivation), all `downgradeArchived` habits are automatically restored.
-   **Unarchive Protection**: Free users cannot unarchive habits if they already have 1 active habit.

### Payment System
-   **Subscription Tiers**: Free, Pro, Premium, managed via Stripe for web/Android and Apple In-App Purchase for iOS.
-   **Free Tier**: Permanent free plan with 1 habit limit and basic features. No time-limited trial.

### Customer Feedback System
-   Allows users to submit various types of feedback (General, Bug, Feature Request, Support).
-   Admins can manage feedback via a dashboard.

### Analytics
-   **Admin Analytics**: Tracks page views, unique visitors, and registrations.
-   **Advanced Analytics (Premium)**: Includes trend charts, habit performance breakdowns, and AI-generated insights.

### Achievements & Gamification
-   Rewards users for streaks, completions, and milestones with XP and badges.
-   **Tiered Gamification**: Features like XP multipliers, weekly XP goals, unlockable accent colors, and achievement celebration pop-ups are progressively unlocked with higher subscription tiers.

### Habit Templates
-   A library of pre-built, categorized habit templates available via a public gallery.

### Blog (SEO Content)
-   Static blog articles (`client/src/data/blog-articles.ts`) for SEO, publicly accessible.

### Interactive AI Demo
-   A public landing page feature allowing visitors to generate an AI action plan for any habit goal (rate-limited).

### Timezone Support
-   User timezones are stored and auto-detected, used for accurate daily reminders, streak calculations, and task scheduling. Users can manually adjust their timezone.

### Onboarding Wizard
-   A 3-step initial flow for new users: Welcome → Pick a Habit → AI generates first plan.

### Quick Tasks
-   A personal checklist system on the dashboard, separate from habit plans, with completion animations.

### My Routine (User Commitments)
-   Users define recurring fixed time blocks (e.g., work, gym) that the AI planner respects when scheduling habits, ensuring no conflicts.

### Push Notifications & Email Notifications
-   **Dual Push Architecture**: Web Push (VAPID) for browsers/PWA, Apple Push Notification service (APNs) for iOS Capacitor app.
    - **Web Push**: Uses `web-push` library with VAPID keys. Subscriptions stored in `push_subscriptions` table with `type='web'`.
    - **iOS Native Push**: Uses `@capacitor/push-notifications` plugin to get APNs device tokens. Tokens stored in `push_subscriptions` table with `type='apns'`. Server sends via HTTP/2 directly to APNs using JWT authentication.
    - **Auto-sync**: On app load, `usePushNotifications` hook detects platform (via `isNative()`/`isIOS()`) and registers appropriately. Web uses `/api/push/sync`, iOS uses `/api/push/register-device`. Both clean up stale subscriptions for the user.
    - **APNs Environment Variables**: `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_KEY_P8` (contents of .p8 file). Set `APNS_PRODUCTION=false` for sandbox.
-   **Push Notification Scheduler** (`server/emailScheduler.ts`): Runs every 15 minutes, checking all users' timezones and preferences. Sends push notifications via `sendPushToUser` (handles both web and native) for:
    - **Daily Morning Reminders**: At user's `dailyReminderTime` (default 08:00) — today's tasks + streak info
    - **Journal Reminders**: At user's `journalReminderTime` (default 20:00) — "Time to reflect"
    - **Mood Check-ins**: At user's `moodCheckinTimes` (defaults 09:00, 14:00, 20:00) — "How are you feeling?"
    - **Streak Alerts**: At user's `streakAlertTime` (default 19:00) — warns if incomplete habits risk streak
    - **Habit Reminders**: Per-habit times from `habitReminders` table on matching days
    - **Daily Planner**: At user's `dailyPlannerTime` (default 07:00) — task count summary
    - **Goal Milestones**: On achievement — celebrates new milestones
    - **Weekly Digests**: Sunday 9am — tiered email digest. Free users get basic summary; Pro/Premium users get rich visual HTML reports with daily activity bar charts, per-habit performance tables with progress bars, streak/XP summaries, achievement badges, and a "View Full Analytics" CTA. Premium users additionally receive mood/wellness overview, miss-reasons breakdown, and journal insights. Built via `sendPaidWeeklyDigestEmail()` in `server/email.ts`
-   All notification types have individual toggle switches and configurable times in Account settings.
-   Deduplication tracking fields prevent duplicate sends across scheduler cycles.
-   **Time-Aware Greeting**: `DailyMotivation.tsx` dynamically shows "Good Morning/Afternoon/Evening/Night" with matching icon based on user's local time. AI motivation prompt also receives time-of-day context.

### Dark Mode
-   Supports theme switching with localStorage persistence.

### Accountability Partners (Premium)
-   Users can explicitly share specific habits with partners, controlling privacy settings for shared data (streaks, completions, notes). Polling ensures real-time updates.

### Community Forum (Tiered Access)
-   **Pro Users**: Read-only access.
-   **Premium Users**: Full access including posting, commenting, liking, direct messaging, and public profiles with privacy controls.

## External Dependencies

### Email System
-   **Service**: Resend (via Replit Connectors).
-   **Usage**: Sending accountability invites, progress updates, daily reminders, weekly digests, and admin-triggered emails.

### Mobile Applications
-   **iOS App**: Capacitor framework with iOS safe area insets (viewport-fit=cover, safe-top/safe-bottom CSS utilities), Keyboard/StatusBar/SplashScreen plugin config. Uses Apple In-App Purchase (`cordova-plugin-purchase` / CdvPurchase) for payments with server-side receipt validation (`/api/apple/validate-receipt`). Auth flow on native iOS uses `@capacitor/browser` plugin to open system browser for OIDC, with a token exchange bridge (`/api/auth/native-complete` → app URL scheme `habitbuilder://auth?token=xxx` → `/api/auth/exchange-token`) to transfer the session back to the WKWebView. `@capacitor/app` handles deep link listening. `allowNavigation` only includes `habitbuilder.pro` (not `replit.com`), so OIDC navigates in the system browser. Build instructions in `ios-build-instructions.md` cover MacinCloud, Codemagic CI/CD, and direct Mac options. Codemagic Podfile is no longer overwritten; instead, the `post_install` fix is appended to the auto-generated Podfile to preserve plugin pods.
-   **Android App**: Separate TWA build (`twa-project/` directory).

### Third-Party Services
-   **Database**: PostgreSQL (Replit-managed).
-   **Authentication**: Replit Auth.
-   **Payments**: Stripe (web/Android), Apple In-App Purchase (iOS).
-   **AI Services**: OpenAI (via Replit AI Integrations).

### Key Environment Variables
-   `DATABASE_URL`
-   `SESSION_SECRET`
-   `REPL_ID`
-   `AI_INTEGRATIONS_OPENAI_API_KEY`
-   `AI_INTEGRATIONS_OPENAI_BASE_URL`
-   `APPLE_SHARED_SECRET`
-   `APNS_KEY_ID`
-   `APNS_TEAM_ID`
-   `APNS_KEY_P8`