# Habit Builder - AI-Powered Habit Coaching Application

## Overview

Habit Builder is an AI-powered habit coaching application that actively guides users through building positive habits. Unlike simple trackers, Habit Builder conducts personalized interviews to understand each user's goals, then generates tailored daily/weekly/monthly action plans. The app features:

- **AI Interview**: When creating a habit, users answer personalized questions generated specifically for that habit type
- **Personalized Action Plans**: Based on answers, AI creates daily routines with specific tasks
- **Guided Sessions**: Interactive coaching walks users through each task with notes and timers
- **Progress Dashboard**: Time spent, completion stats, streaks, and notes summary

Tech stack: React frontend, Express backend, PostgreSQL database, Stripe payments, Replit Auth, OpenAI for AI features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom nature-themed color palette (teals/greens)
- **Animations**: Framer Motion for smooth transitions
- **Fonts**: Outfit (display) and Plus Jakarta Sans (body)
- **Build Tool**: Vite with HMR support

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: Replit Auth (OpenID Connect) with Passport.js
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **API Design**: RESTful endpoints defined in `shared/routes.ts` with Zod validation

### Data Storage
- **Primary Database**: PostgreSQL (provisioned via Replit)
- **Schema Location**: `shared/schema.ts` and `shared/models/`
- **Tables**:
  - `users` - User accounts with payment status and admin flag
  - `sessions` - Session storage for authentication
  - `habits` - User habits with completion tracking (JSONB for dates)
  - `conversations` / `messages` - AI chat support
  - `feedback` - Customer feedback submissions with admin management

### Authentication Flow
- Replit Auth integration via OpenID Connect
- Sessions stored in PostgreSQL with 1-week TTL
- Protected routes use `isAuthenticated` middleware
- User data synced on login via upsert pattern

### Payment System
- Stripe integration for monthly subscription ($6/month)
- Webhook handling for subscription events (created, updated, cancelled, payment failed)
- User `hasPaid` and `subscriptionStatus` flags control access to main features
- Paywall page displayed for unpaid authenticated users
- Stripe product seeded via `server/seed-products.ts`

### Stripe Files
- `server/stripeClient.ts` - Stripe client with Replit connector credentials
- `server/webhookHandlers.ts` - Webhook processing for subscription lifecycle events
- `server/seed-products.ts` - Script to create the $6/month subscription product

### Customer Feedback System
Users can submit feedback, bug reports, feature requests, and support inquiries. Admins can manage all feedback.

**Features:**
- Four feedback types: General Feedback, Bug Report, Feature Request, Support
- Admin dashboard to view, prioritize, and manage all feedback
- Admin-only access controlled by `isAdmin` flag on user record
- Zod validation for all feedback submissions and updates

**API Endpoints:**
- `POST /api/feedback` - Submit feedback (authenticated users)
- `GET /api/admin/feedback` - Get all feedback (admin only)
- `PATCH /api/admin/feedback/:id` - Update feedback status/priority/notes (admin only)

**Key Components:**
- `FeedbackForm.tsx` - Modal dialog for submitting feedback from Account page
- `AdminFeedback.tsx` - Admin page to view and manage all feedback (route: /admin/feedback)

**Database Schema:**
- `feedback` table: id, userId, userEmail, userName, type, subject, message, status, priority, adminNotes, createdAt, updatedAt

### AI-Powered Habit System
The core feature of Habit Builder is the AI-powered habit coaching system:

**Habit Creation Flow:**
1. User enters habit title, description, and optional goal
2. App redirects to habit detail page where setup wizard opens
3. AI generates 4-5 personalized questions specific to that habit type
4. User answers questions conversationally
5. User selects plan duration (daily, weekly, or monthly)
6. AI generates a complete action plan with daily tasks based on answers

**API Endpoints:**
- `POST /api/habits/:id/generate-questions` - AI generates habit-specific interview questions
- `POST /api/habits/:id/generate-plan` - Creates personalized daily plans from questionnaire answers
- `PATCH /api/habits/:id/tasks/:taskId` - Updates task completion and notes
- `POST /api/habits/:id/session-complete` - Logs completed sessions for progress tracking

**Key Components:**
- `HabitSetupWizard.tsx` - Multi-phase wizard: intro → questions → duration → generating → complete
- `HabitDetail.tsx` - Shows daily plans, task completion, notes, and progress stats
- `GuidedSession.tsx` - Interactive coaching with pre-session checklist, task walkthrough, and timer

### AI Integrations
The `server/replit_integrations/` folder contains modular AI capabilities:
- **Audio**: Voice chat with OpenAI (speech-to-text, text-to-speech)
- **Chat**: Conversation storage and streaming responses
- **Image**: Image generation via OpenAI
- **Batch**: Rate-limited batch processing utilities

### Interactive Guided Sessions
The GuidedSession component (`client/src/components/GuidedSession.tsx`) provides an immersive coaching experience:
- **Pre-session checklist**: Users confirm they're ready (quiet space, uninterrupted time, focused)
- **Step-by-step guidance**: Each action step is presented individually with notes input
- **Timer functionality**: Optional timed sessions (5-45 minutes) with visual progress, pause/play, and audio completion alert
- **Completion celebration**: Animated celebration screen with motivational messaging
- **Framer Motion animations**: Smooth transitions between phases

Launch guided sessions from:
- "Start" button on habit cards
- "Start Session" button on habit detail page header

### PWA Support
- Service worker for offline caching
- Web app manifest for installability
- Mobile-optimized viewport settings

## External Dependencies

### Third-Party Services
- **Database**: PostgreSQL (Replit-managed, requires DATABASE_URL)
- **Authentication**: Replit Auth (OpenID Connect via ISSUER_URL)
- **Payments**: Stripe (API keys via Replit Connectors)
- **AI Services**: OpenAI via Replit AI Integrations (API key and base URL)

### Key Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Express session encryption key
- `REPL_ID` - Replit instance identifier (for auth)
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API access
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI API endpoint

### Database Migrations
- Run `npm run db:push` to sync schema with database
- Drizzle Kit manages migrations in `./migrations` folder

## Recent Updates

### Smart Icon Matching System (Jan 2026)
The HabitCard component (`client/src/components/HabitCard.tsx`) includes a smart icon matching system that automatically assigns relevant icons to habits based on keywords in their title and description:
- 40+ keyword mappings (e.g., "running" → Zap, "reading" → BookOpen, "meditation" → Brain)
- Icons include custom colors (e.g., green-600 for walking, blue-600 for reading)
- Fallback icons for habits without keyword matches

### Guided Session Enhancements (Jan 2026)
- **Individual Task Timers**: Each task has its own timer with start/pause controls and +1m/+5m buttons
- **End Session Early**: Users can end sessions early with confirmation dialog - partial progress is saved
- **AI Session Summary**: After completing a session, AI analyzes all notes and provides personalized insights and encouragement
- **Async State Fix**: Session mutations receive computed data directly to ensure last task notes/time are included in summaries

### UI/UX Enhancements (Jan 2026)
- **Landing Page**: Added floating decorative elements with CSS animations (animate-float, animate-pulse-glow)
- **Hero Visual**: Enhanced with animated habit cards showing progress bars
- **Coach Chat**: Fixed scroll issue with ScrollArea wrapper (max-h-[85vh])
- **HabitCard**: Uses forwardRef for AnimatePresence compatibility

### Tiered Subscription System (Jan 2026)
Three subscription tiers with Stripe integration:
- **Free**: 3 habits max, basic progress tracking
- **Pro** ($6/month): Unlimited habits, AI coaching, progress reports
- **Premium** ($15/month): All Pro features + voice notes, social accountability, priority support

Key files:
- `client/src/hooks/use-subscription.ts` - Hook for tier-based feature gating
- `server/seed-products.ts` - Seeds Stripe products for Pro and Premium tiers
- `server/webhookHandlers.ts` - Updates user `subscriptionTier` on checkout

### Achievements System (Jan 2026)
15 achievement badges across 4 categories (streak, completion, time, milestone):
- Streak achievements: 3, 7, 14, 30, 100 day streaks
- Session completions: 5, 25, 100 sessions
- Time invested: 1hr, 5hr, 20hr total
- Milestones: First plan, habit counts

Key files:
- `client/src/lib/achievements.ts` - Achievement definitions
- `client/src/components/AchievementsDisplay.tsx` - Badges display component
- API: GET /api/achievements, POST /api/achievements/unlock (with ID validation)

### Habit Templates Library (Jan 2026)
10 pre-built habit templates across wellness, health, and learning categories:
- Morning Routine, Daily Exercise, Mindfulness, Healthy Eating, Reading
- Gratitude Journal, Better Sleep, Learn Language, Digital Detox, Water Intake

Key files:
- `client/src/components/TemplateGallery.tsx` - Template browser with category filtering
- API: GET /api/templates, POST /api/templates/seed (admin-only after initial setup)

### Dark Mode (Jan 2026)
Theme switching with localStorage persistence:
- `client/src/components/ThemeProvider.tsx` - Context provider
- `client/src/components/ThemeToggle.tsx` - Toggle button component
- Toggle accessible from Dashboard menu dropdown

### Advanced Analytics (Jan 2026)
Premium-only analytics dashboard with deep insights:
- Trend charts for weekly/monthly activity
- Habit performance breakdown by completion rate
- AI-generated correlation insights and recommendations
- Best day/time analysis for peak performance
- CSV data export for external analysis

Key files:
- `client/src/pages/Analytics.tsx` - Full analytics dashboard
- API: GET /api/analytics, POST /api/analytics/ai-report, GET /api/analytics/export

### Social Accountability (Jan 2026)
Premium-only accountability partner system:
- Invite accountability partners by email
- Select which habits to share with each partner
- Send progress updates to partners
- Weekly summary preview of shared data

Key files:
- `client/src/pages/Accountability.tsx` - Partner management page
- `shared/schema.ts` - accountabilityPartners table
- API: GET/POST /api/accountability-partners, POST /send-update, DELETE

### Trial System Update (Jan 2026)
2-day free trial with limited features:
- Trial: 3 habits max, basic AI coaching, no premium features
- After trial expires: Must subscribe to Pro or Premium
- Pro ($6/month): Unlimited habits, AI coaching, weekly reports
- Premium ($15/month): All Pro + voice notes, analytics, accountability partners, editable templates