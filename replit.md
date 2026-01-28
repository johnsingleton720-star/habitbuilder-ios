# HabitGrow - Habit Tracking Application

## Overview

HabitGrow is a habit tracking web application that helps users build positive habits through daily tracking and AI-powered motivation. The app features a React frontend with a modern UI, Express backend, PostgreSQL database, Stripe payment integration for lifetime access, and Replit authentication.

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
  - `users` - User accounts with payment status
  - `sessions` - Session storage for authentication
  - `habits` - User habits with completion tracking (JSONB for dates)
  - `conversations` / `messages` - AI chat support

### Authentication Flow
- Replit Auth integration via OpenID Connect
- Sessions stored in PostgreSQL with 1-week TTL
- Protected routes use `isAuthenticated` middleware
- User data synced on login via upsert pattern

### Payment System
- Stripe integration for one-time lifetime access purchase ($2.99)
- Webhook handling for checkout completion
- User `hasPaid` flag controls access to main features
- Paywall page displayed for unpaid authenticated users

### AI Integrations
The `server/replit_integrations/` folder contains modular AI capabilities:
- **Audio**: Voice chat with OpenAI (speech-to-text, text-to-speech)
- **Chat**: Conversation storage and streaming responses
- **Image**: Image generation via OpenAI
- **Batch**: Rate-limited batch processing utilities

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