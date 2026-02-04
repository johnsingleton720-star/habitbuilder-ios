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
-   **Animations**: Framer Motion
-   **PWA Support**: Service worker for offline caching and web app manifest.

### Backend
-   **Framework**: Express.js with TypeScript
-   **Database ORM**: Drizzle ORM with PostgreSQL
-   **Authentication**: Replit Auth (OpenID Connect) with Passport.js
-   **Session Storage**: PostgreSQL-backed sessions
-   **API Design**: RESTful endpoints with Zod validation.

### Data Storage
-   **Primary Database**: PostgreSQL
-   **Key Tables**: `users`, `sessions`, `habits`, `conversations`, `messages`, `feedback`.

### AI-Powered Habit System
The core system enables personalized habit coaching:
-   **Habit Creation**: Users input habit details, then AI generates personalized interview questions.
-   **Action Plan Generation**: Based on user answers, AI creates detailed daily/weekly/monthly action plans.
-   **Guided Sessions**: Interactive sessions walk users through tasks with notes and timers, and provide post-session AI summaries.
-   **Habit Customization**: Users can personalize habits with custom icons, colors, and assign them to categories.

### Payment System
-   **Subscription Tiers**: Free, Pro ($6/month), and Premium ($15/month) tiers.
-   **Integration**: Stripe for subscription management and webhooks.
-   **Trial System**: 2-day free trial with limited features.

### Customer Feedback System
-   Allows users to submit feedback (General, Bug, Feature Request, Support).
-   Admins can view, prioritize, and manage feedback via a dashboard.

### Analytics
-   **Admin Analytics**: Tracks page views, unique visitors, registrations, and free trial sign-ups with time range filters.
-   **Advanced Analytics (Premium)**: Provides trend charts, habit performance breakdowns, AI-generated insights, and data export.

### Achievements
-   An achievement system rewards users for streaks, completions, time invested, and milestones.

### Habit Templates
-   A library of pre-built habit templates is available for various categories.

### Dark Mode
-   Supports theme switching with localStorage persistence.

## External Dependencies

### Third-Party Services
-   **Database**: PostgreSQL (Replit-managed)
-   **Authentication**: Replit Auth
-   **Payments**: Stripe
-   **AI Services**: OpenAI (via Replit AI Integrations)

### Key Environment Variables
-   `DATABASE_URL`
-   `SESSION_SECRET`
-   `REPL_ID`
-   `AI_INTEGRATIONS_OPENAI_API_KEY`
-   `AI_INTEGRATIONS_OPENAI_BASE_URL`