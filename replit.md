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

### AI-Powered Habit System
-   **Personalized Coaching**: AI conducts interviews, generates detailed daily/weekly/monthly action plans, and provides interactive guided sessions with post-session summaries.
-   **Adaptive Coaching Check-ins (Pro/Premium)**: Two-way coaching conversations — after the initial AI check-in response, users can reply and have a 2-3 turn conversation with the AI coach. Premium users can use voice input for follow-ups.
-   **Smart Plan Adjustment (Pro/Premium)**: When a user's completion rate drops below 40% after 5+ days, the app detects the plan isn't working and offers to regenerate it. The adjusted plan uses completion patterns, miss reasons, mood data (Pro: 3 entries, Premium: 7 entries), and journal themes (Premium only) to create a better-fitting plan.
-   **Mood/Journal Context in Plan Generation (Tiered)**: Plan generation and regeneration enriches the AI prompt with recent wellbeing data — Pro users get last 5 mood entries; Premium users get last 7 mood entries + last 5 journal summaries.
-   **Missed-Day Reflection (All Tiers)**: When a streak breaks, the StreakBrokenModal asks "What happened?" with tap-to-select reasons (Too busy, Forgot, Too tired, Schedule conflict, Didn't feel like it, Other). Stored in `missReasons` field on the habits table and fed into plan adjustments.
-   **Habit Customization**: Users can personalize habits with icons and colors.
-   **Smart Resources**: AI generates relevant, clickable external resources (articles, books, courses) for tasks, avoiding competing habit trackers.
-   **AI Safety**: Server-side content safety filters and AI guardrails prevent harmful content generation.

### Subscription Downgrade Protection
-   **Habit Archiving on Cancellation**: When a Pro/Premium user cancels and drops to the free tier, a modal prompts them to choose 1 habit to keep active. The rest are archived with a `downgradeArchived` flag.
-   **Auto-Restore on Re-subscription**: When a cancelled user re-subscribes (via checkout or subscription reactivation), all `downgradeArchived` habits are automatically restored.
-   **Unarchive Protection**: Free users cannot unarchive habits if they already have 1 active habit.

### Payment System
-   **Subscription Tiers**: Free, Pro, Premium, managed via Stripe for web/Android and Apple In-App Purchase for iOS.
-   **Trial System**: 2-day free trial, with free tier limitations designed to encourage upgrades.

### Customer Feedback System
-   Allows users to submit various types of feedback (General, Bug, Feature Request, Support).
-   Admins can manage feedback via a dashboard.

### Analytics
-   **Admin Analytics**: Tracks page views, unique visitors, registrations, and trial sign-ups.
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

### Email Notifications
-   Automated daily morning reminders and weekly progress digests, respecting user timezones and preferences.

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
-   **iOS App**: Capacitor framework with iOS safe area insets (viewport-fit=cover, safe-top/safe-bottom CSS utilities), Keyboard/StatusBar/SplashScreen plugin config, allowNavigation for Replit OIDC auth flow. Uses Apple In-App Purchase for payments. Build instructions in `ios-build-instructions.md` cover MacinCloud, Codemagic CI/CD, and direct Mac options.
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