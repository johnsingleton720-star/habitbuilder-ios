# Habit Builder - AI-Powered Habit Coaching Application

## Overview

Habit Builder is an AI-powered application designed to help users build positive habits. It goes beyond simple tracking by offering personalized interviews, generating tailored daily, weekly, and monthly action plans, and providing interactive guided sessions. The application uses AI for personalization and coaching to provide a comprehensive habit-building experience. It includes a tiered subscription model (Free, Pro, Premium) to unlock advanced features, gamification, and community interaction. The project's goal is to empower users to achieve personal development goals through consistent habit formation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
-   **Framework**: React 18 with TypeScript and Wouter for routing.
-   **State Management**: TanStack React Query.
-   **UI/Styling**: shadcn/ui, Radix UI primitives, Tailwind CSS with a nature-themed color palette.
-   **Animations**: Framer Motion for page transitions.
-   **Mobile UI**: Fixed bottom navigation, shimmering loading skeletons.
-   **Gamification UI**: Compact level/XP summary, gradient achievement badges, customizable accent colors (Premium).
-   **PWA Support**: Service worker for offline caching and web app manifest.

### Backend
-   **Framework**: Express.js with TypeScript.
-   **Database ORM**: Drizzle ORM with PostgreSQL.
-   **Authentication**: Dual auth system — Replit Auth (OIDC) for Apple/Google social sign-in, plus custom email/password auth with bcrypt hashing. Both share the same Passport.js + PostgreSQL-backed sessions. The `isAuthenticated` middleware auto-renews email auth sessions. Password reset via Resend email with time-limited tokens (`passwordResetTokens` table). iOS app shows in-app `NativeEmailAuth` screen (email form + Apple/Google buttons) instead of external Replit browser.
-   **API Design**: RESTful endpoints with Zod validation.

### Data Storage
-   **Primary Database**: PostgreSQL, storing users, habits, conversations, feedback, quick tasks, and user commitments.

### AI-Powered Habit System
-   **Personalized Coaching**: AI conducts interviews, generates action plans, and provides interactive guided sessions with post-session summaries.
-   **Adaptive Coaching Check-ins (Pro/Premium)**: Two-way coaching conversations, allowing users to reply to AI check-ins for a 2-3 turn interaction. Premium users can use voice input for follow-ups.
-   **Smart Plan Adjustment (Pro/Premium)**: The app detects when a plan isn't working (completion rate below 40% after 5+ days) and offers to regenerate it. The adjusted plan incorporates completion patterns, miss reasons, mood data (Pro: 3 entries, Premium: 7 entries), and journal themes (Premium only). A dashboard banner and daily push notifications highlight struggling habits.
-   **Plan Continuation**: When a habit plan ends, all users see a "Ready for your next phase?" banner with options to continue. Free users can restart their plan (regenerate using existing interview answers) when the plan has ended. Paid users can extend or start fresh. The "Start Fresh" duration picker defaults to monthly. HabitCard shows a "Continue →" link next to the "Plan completed" badge. A push notification is sent when `planEndDate` matches today (skipping archived, simple-mode, and inactive habits).
-   **Mood/Journal Context in Plan Generation (Tiered)**: AI prompt for plan generation and regeneration is enriched with recent wellbeing data (Pro: last 5 mood entries; Premium: last 7 mood entries + last 5 journal summaries).
-   **Missed-Day Reflection (All Tiers)**: When a streak breaks, users are prompted to select reasons for the missed day, which are stored and used in plan adjustments.
-   **Simple Tracking Mode**: Users can create habits in "Simple" mode (vs "AI Plan") for lightweight daily check-ins without AI-generated plans or guided sessions. Simple habits have `trackingMode: "simple"` in the database, `setupComplete` is auto-set to `true`, and they use dedicated check-in/uncheckin endpoints. They are excluded from plan adjustment checks and plan-ended banners. Streaks, progress, XP, and achievements all work identically. Check-ins support optional quantity (numeric) and notes fields stored in the dailyPlan task entry (`quantity`, `quantityLabel`, `notes`). The HabitDetail page shows a "Check-in History" for simple habits (vs "Progress History" for AI plan habits), displaying quantity and notes data. The HabitCard check-in button expands to show quantity/notes fields before confirming.
-   **Tracked Items (Simple Habits)**: Users can define reusable tracked items (name + type: count/time/text) on simple habits via the edit dialog or when creating a new simple habit. These are stored as `trackedItems` JSONB on the habits table (`TrackedItem[]`). When tracked items are defined, the check-in form shows compact labeled input rows for each item instead of generic quantity/notes fields. Values are stored as `trackedValues` (`TrackedValue[]`) in the dailyPlan task entry. The check-in history displays tracked values as inline badges. The comprehensive AI analytics report includes recent tracked item values for richer analysis. Max 20 tracked items per habit, max 50 chars per name, max 200 chars per text value.
-   **Habit Customization**: Users can personalize habits with icons and colors.
-   **Smart Resources**: AI generates relevant external resources for tasks.
-   **AI Safety**: Server-side content safety filters and AI guardrails are implemented.

### Subscription Downgrade Protection
-   **Habit Archiving on Cancellation**: When a user downgrades, they select one habit to keep active, and others are archived.
-   **Auto-Restore on Re-subscription**: Archived habits are automatically restored upon re-subscription.
-   **Unarchive Protection**: Free users cannot unarchive habits if they already have 1 active habit.

### Free Trial
-   **7-Day Premium Trial**: All new users (except the owner/admin) automatically receive a 7-day free trial of all Premium features upon signup. The `trialEndsAt` timestamp is set in `upsertUser` on INSERT only (never on conflict update). The `isTrialActive()` helper in `server/routes.ts` checks `trialEndsAt > now && !hasPaid`. All backend route guards (`isPremium`, `isPro`, `hasPaidSubscription`, `isFreeUser`) include trial awareness. Frontend `useSubscription` hook sets `effectiveTier = 'premium'` during active trial. The `TrialBanner` component on the Dashboard shows countdown during trial and upgrade prompt after expiry. The `DowngradeHabitPicker` triggers automatically when the trial ends and the user has more than 1 active habit.

### Payment System
-   **Subscription Tiers**: Free, Pro, Premium, managed via Stripe for web/Android and Apple In-App Purchase for iOS.
-   **Free Tier**: Permanent free plan with 1 habit limit and basic features.

### Customer Feedback System
-   Allows users to submit various types of feedback (General, Bug, Feature Request, Support) with an admin dashboard for management.

### Analytics
-   **Admin Analytics**: Tracks page views, unique visitors, and registrations.
-   **Advanced Analytics (Premium)**: Includes trend charts, habit performance breakdowns, and AI-generated insights.
-   **Comprehensive Analytics (Premium)**: Full overview dashboard with 6 tabs (Overview, Habits, Wellness, Activity, Trends, AI Report). Aggregates data from habits, mood, journal, coaching, quick tasks, achievements, focus sessions, and goals. An AI analysis report is generated and cached.

### Achievements & Gamification
-   Rewards users with XP and badges for streaks, completions, and milestones.
-   **Tiered Gamification**: Features like XP multipliers, weekly XP goals, unlockable accent colors, and achievement celebration pop-ups are progressively unlocked with higher subscription tiers.

### Habit Templates
-   A library of pre-built, categorized habit templates available via a public gallery.

### Interactive AI Demo
-   A public landing page feature allowing visitors to generate an AI action plan for any habit goal (rate-limited).

### Timezone Support
-   User timezones are stored and auto-detected for accurate reminders, streak calculations, and task scheduling, with manual adjustment options.

### Pre-Signup Onboarding (Value-First Flow)
-   A 6-screen flow for unauthenticated users to generate an anonymous habit plan. Selections and the AI plan are stored locally and handed off after authentication. The original landing page is preserved at `/welcome`.

### Onboarding Wizard
-   A 3-step initial flow for new users: Welcome → Pick a Habit → AI generates first plan.

### Quick Tasks
-   A personal checklist system on the dashboard, separate from habit plans, with completion animations.

### My Routine (User Commitments)
-   Users define recurring fixed time blocks that the AI planner respects when scheduling habits to avoid conflicts.

### Push Notifications & Email Notifications
-   **Dual Push Architecture**: Web Push (VAPID) for browsers/PWA and Apple Push Notification service (APNs) for iOS Capacitor app.
-   **Push Notification Scheduler**: Runs every 15 minutes, sending various push notifications based on user preferences and timezones (daily reminders, journal reminders, mood check-ins, streak alerts, habit reminders, daily planner, goal milestones).
-   **Email Notifications**: Sends weekly digests (tiered, with rich visual reports for Pro/Premium users) and other progress updates.
-   All notification types have individual toggle switches and configurable times in Account settings.
-   **Time-Aware Greeting**: Dynamically adjusts greetings and AI motivation prompts based on the user's local time.

### Dark Mode
-   Supports theme switching with localStorage persistence.

### Accountability Partners (Premium)
-   Users can share specific habits with partners, controlling privacy settings for shared data, with real-time updates.

### Community Forum (Tiered Access)
-   **Pro Users**: Read-only access.
-   **Premium Users**: Full access including posting, commenting, liking, direct messaging, and public profiles with privacy controls.

## External Dependencies

### Email System
-   **Service**: Resend (via Replit Connectors).
-   **Usage**: Sending accountability invites, progress updates, daily reminders, weekly digests, and admin-triggered emails.

### Mobile Applications
-   **iOS App**: Capacitor framework with Apple In-App Purchase for payments (server-side receipt validation). Utilizes a local `capacitor-auth-session` plugin for native iOS authentication.
-   **Android App**: Separate TWA build.

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