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