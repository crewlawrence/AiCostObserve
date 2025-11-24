# AI Observability SDK

## Overview

This is a full-stack AI observability platform designed to provide real-time monitoring, cost tracking, and performance insights for AI applications. The application enables developers to stream telemetry data from AI models, track costs per request, monitor latency, and analyze usage patterns across multiple projects and environments.

The platform is built as a multi-tenant SaaS application where workspaces contain projects, each project can have multiple API keys for authentication, and all AI interactions are logged as telemetry events with comprehensive metadata including prompts, responses, token usage, costs, and performance metrics.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### Stripe Payment Integration (November 19, 2024)
- **Subscription Billing**: Added Stripe Checkout integration for $49/month subscriptions
- **14-Day Free Trial**: All new workspaces start with automatic 14-day trial period
- **Webhook Handling**: Complete webhook integration for subscription lifecycle events (created, updated, canceled, payment failures)
- **Portable Payment System**: Works on any platform with simple environment variable configuration
- **Database Schema**: Added subscription tracking fields (stripeCustomerId, stripeSubscriptionId, subscriptionStatus, trialEndsAt)
- **Comprehensive Documentation**: Created STRIPE_SETUP.md with step-by-step setup guide and DEPLOYMENT.md updates
- **Backend API Routes**: Checkout session creation, subscription status, cancellation endpoints
- **Stripe SDK**: Integrated with proper API versioning and error handling
- **True SaaS Platform**: Application is now a complete SaaS product with subscription billing

### Portable Authentication System (November 18, 2024)
- **Email/Password Authentication**: Replaced Replit Auth with portable Passport.js Local Strategy using bcrypt password hashing (10 rounds)
- **Complete Registration Flow**: Users create accounts with email/password, automatic workspace provisioning with owner role
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple with auto-table creation
- **Collision-Resistant Slugs**: Workspace slug generation using nanoid with retry logic and transaction wrapping
- **Platform Portability**: Application now runs on any platform with Node.js and PostgreSQL (Vercel, AWS, Railway, etc.)
- **Comprehensive Deployment Docs**: Created DEPLOYMENT.md with instructions for multiple hosting platforms including Docker
- **Security Hardening**: bcrypt password hashing, secure session cookies, CSRF protection, comprehensive authorization middleware
- **Code Cleanup**: Removed all Replit Auth dependencies and OIDC-specific code paths
- **Production-Ready**: All security vulnerabilities addressed and approved through architect review

### Previous Features
- **Multi-tenant Workspace System**: Automatic workspace creation for new users with owner role assignment
- **Role-Based Access Control (RBAC)**: Four-tier permission system (owner, admin, member, viewer) with granular authorization checks
- **Team Management**: Full CRUD operations for workspace members including role updates and removal
- **Advanced Search**: Boolean search operators (AND, OR, NOT) for log filtering with whitespace normalization
- **Real-time WebSocket Streaming**: Live telemetry updates with workspace-scoped connections

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server, providing fast HMR and optimized production builds
- **Wouter** for lightweight client-side routing instead of React Router
- **TanStack Query (React Query)** for server state management, caching, and real-time data synchronization

**UI & Styling**
- **shadcn/ui** component library built on Radix UI primitives for accessible, customizable components
- **Tailwind CSS** with custom design system following Linear/Stripe-inspired aesthetics
- **Custom theme system** with light/dark mode support using CSS variables
- **Design tokens** defined in `design_guidelines.md` specifying typography (Inter for UI, JetBrains Mono for code), spacing primitives, and component standards

**State Management**
- Local state with React hooks
- Server state cached and synchronized via TanStack Query
- WebSocket integration for real-time log streaming
- LocalStorage for workspace selection and theme persistence

**Key Pages**
- Dashboard: Real-time metrics overview with charts
- Logs: Filterable, searchable telemetry log viewer with real-time updates
- Analytics: Cost analysis, model usage breakdowns, performance metrics
- Projects: CRUD operations for organizing telemetry
- API Keys: Secure key management for SDK authentication
- Settings: User preferences and workspace configuration

### Backend Architecture

**Server Framework**
- **Express.js** on Node.js with TypeScript
- **HTTP server** with WebSocket upgrade support for real-time features
- **Custom middleware** for request logging, JSON parsing with raw body preservation (for webhook verification)

**API Design**
- RESTful endpoints under `/api/*` prefix
- WebSocket endpoint at `/ws` for real-time telemetry streaming
- Token-based authentication for WebSocket connections using HMAC signatures
- API key authentication via `x-api-key` header for SDK clients

**WebSocket Architecture**
- Workspace-scoped connections to prevent cross-tenant data leakage
- Token generation with expiry (24-hour TTL)
- HMAC-SHA256 signed tokens for secure WebSocket authentication
- Client tracking with automatic cleanup on disconnect
- Real-time broadcasting of new telemetry logs to connected clients in same workspace

**Data Access Layer**
- Storage abstraction interface (`IStorage`) for database operations
- Drizzle ORM with Neon serverless PostgreSQL adapter
- Connection pooling via `@neondatabase/serverless` with WebSocket support
- Schema-first design with Zod validation derived from Drizzle schemas

### Database Architecture

**ORM & Migrations**
- **Drizzle ORM** for type-safe database queries and schema management
- **Drizzle Kit** for schema migrations
- **drizzle-zod** for automatic Zod schema generation from database schema

**Schema Design (Multi-tenant)**

1. **Workspaces** - Top-level tenant isolation
   - UUID primary key with auto-generation
   - Unique slug for URL-friendly identification
   - Cascading deletes to all related entities

2. **Projects** - Organizational units within workspaces
   - Foreign key to workspace with cascade delete
   - Index on `workspace_id` for efficient queries
   - Optional description field

3. **API Keys** - Authentication credentials
   - Scoped to workspace with cascade delete
   - Unique key constraint for global lookups
   - `last_used_at` tracking for usage monitoring
   - Indexes on `workspace_id` and `key` for performance

4. **Telemetry Logs** - Core observability data
   - Comprehensive tracking: prompt, response, model, tokens, cost, latency
   - Environment field (production/staging/development)
   - JSONB metadata field for flexible additional data
   - Composite indexes on common filter combinations (workspace, project, environment, timestamp)
   - Foreign keys to workspace and project with cascade delete

**Multi-tenancy Strategy**
- Workspace ID on every table for row-level isolation
- Cascading deletes ensure complete data removal
- Indexed foreign keys for query performance
- No shared data between workspaces

### Authentication & Security

**User Authentication**
- **Passport.js Local Strategy** with email/password credentials
- **bcrypt password hashing** with 10 rounds for secure storage
- **PostgreSQL session store** using connect-pg-simple with auto-table creation
- **Secure session cookies** with httpOnly flag and secure flag in production
- **Transaction-wrapped registration** prevents partial user creation on errors
- Automatic workspace provisioning on registration with owner role assignment

**API Authentication**
- API key-based authentication for SDK clients
- Keys stored in database with workspace association
- Header-based transmission (`x-api-key`)
- Usage tracking via `last_used_at` timestamp updates

**WebSocket Authentication**
- HMAC-SHA256 signed tokens with workspace scope
- Token expiry enforcement (24-hour window)
- Separate token generation endpoint requiring valid API key
- Connection validation before establishing WebSocket

**Security Hardening**
- Email uniqueness constraint prevents duplicate accounts
- Collision-resistant workspace slugs using nanoid with retry logic
- Authorization middleware protects all workspace-scoped routes
- Role-based access control (RBAC) with owner/admin/member/viewer tiers
- Environment variable for session secret (`SESSION_SECRET`)
- Workspace isolation prevents cross-tenant data access

### Real-time Features

**WebSocket Implementation**
- Workspace-scoped pub/sub pattern
- New telemetry logs broadcast to all connected clients in same workspace
- TanStack Query cache invalidation on new data
- Automatic reconnection handling in client
- Connection status indicators in UI

**Data Flow**
1. SDK posts telemetry to REST endpoint
2. Server validates API key and workspace association
3. Log stored in database
4. WebSocket broadcast to all workspace clients
5. Client cache updated, UI re-renders with new data

## External Dependencies

### Database
- **Neon Postgres** - Serverless PostgreSQL database
  - Accessed via `DATABASE_URL` environment variable
  - WebSocket-based connection using `@neondatabase/serverless`
  - Schema managed with Drizzle migrations

### UI Component Libraries
- **Radix UI** - Headless accessible component primitives (accordion, dialog, dropdown, select, tabs, toast, tooltip, etc.)
- **shadcn/ui** - Pre-styled component implementations built on Radix
- **Recharts** - Charting library for analytics visualizations
- **Embla Carousel** - Carousel/slider functionality
- **cmdk** - Command palette component

### Utilities & Tooling
- **Zod** - Runtime type validation and schema definition
- **React Hook Form** - Form state management with Zod resolver
- **date-fns** - Date formatting and manipulation
- **nanoid** - Unique ID generation
- **class-variance-authority** - Component variant styling
- **clsx** + **tailwind-merge** - Conditional className utilities

### Development Tools
- **TypeScript** - Type safety across frontend and backend
- **tsx** - TypeScript execution for development server
- **esbuild** - Fast bundling for production server
- **Replit plugins** - Development environment enhancements (error overlay, cartographer, dev banner)

### Fonts
- **Google Fonts CDN** - Inter (UI typography) and JetBrains Mono (code/monospace)