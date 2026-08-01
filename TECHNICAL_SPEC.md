# TECHNICAL_SPEC.md — money-matters

> **Last updated:** 2026-08-01  
> **Status:** Fully synchronized with production Cloudflare Workers architecture (`nodejs_compat`), Fastify API, Neon serverless PostgreSQL with RLS, Expo React Native Android target, OpenNext Web target, Upstash Redis rate limiting, Serene Finance UI design tokens, Universal Logger, and Vitest suite.

---

## 1. Stack & Infrastructure

| Layer | Package / Service | Target Environment | Details |
|---|---|---|---|
| Runtime | Node.js (≥20) / Cloudflare Workers | Cloudflare Workers (`nodejs_compat`) | Edge runtime for Web & API |
| Package Manager | pnpm | 9.0.0 | Workspace monorepo |
| Build Orchestration | Turborepo | 2.0.14 | Turbo pipeline |
| Language | Strict TypeScript | ^6.0.3 | Zero `any`, mandatory Zod `.strict()` |
| Web Framework | Next.js (App Router) | Cloudflare Workers via `@opennextjs/cloudflare` | Custom domain `moneymatters.kaesava.au` |
| API Server | Fastify | Cloudflare Workers (`src/worker.ts`) | Custom domain `api.moneymatters.kaesava.au` |
| API Layer | tRPC | ^11.18.0 | Type-safe RPC contracts |
| ORM | Drizzle ORM | ^0.39.0 | Neon PostgreSQL driver |
| Database (Server) | Neon PostgreSQL (Serverless) | Neon DB | Multi-tenant schema with RLS |
| Database (Mobile) | Expo SQLite | 16.0.10 | Local SQLite (Online-first MVP) |
| Auth | Neon Auth (Better Auth) | Neon Auth Service | JWT & session cookie verification |
| Rate Limiting | Upstash Redis | Serverless Redis (ap-southeast-1) | REST API sliding-window rate limiter |
| File Storage | Cloudflare R2 | Cloudflare R2 | Attachments & file notes (`money-matters-production`) |
| Async Workflows | Inngest | Inngest Cloud | 6 scheduled notification functions & background jobs |
| Email Service | Resend | Resend API | Transactional emails & partner invites |
| Mobile Framework | React Native / Expo | Expo SDK 54 / RN 0.81.5 | Android native app |
| Styling & UI | Serene Finance Tokens | `packages/ui` | Standardized tokens (`#2563eb`, `#1B2B4B`, `#F7F8FA`, `#22c55e`, `#ba1a1a`) & JetBrains Mono |
| CI/CD Pipeline | GitHub Actions | GitHub & Cloudflare | Lint, typecheck, test, and `wrangler deploy` on push to `main` |

---

## 2. Monorepo Topology & Capabilities

```
money-matters/
├── apps/
│   ├── api/           # Fastify server on Cloudflare Workers (`wrangler.toml`)
│   ├── mobile/        # Expo React Native app (Android target)
│   └── web/           # Next.js web app on Cloudflare Workers via OpenNext (`wrangler.jsonc`)
├── packages/
│   ├── capabilities/
│   │   ├── billing/         # Subscription state machine, Stripe checkout & customer portal, raw-body webhook processor
│   │   ├── tenant/          # Household creation, partner invite, bank account CRUD
│   │   ├── budgeting/       # 5-step waterfall allocation engine (Deficit Repair, Regular, Goal, Everyday, Surplus)
│   │   ├── transactions/    # Daily ledger, bank CSV statement parser (Big 4 AU), canAfford calculator & spending velocity
│   │   ├── notifications/   # Expo push + 6 scheduled Inngest functions (payday, bill, overdue, digest, goal, velocity)
│   │   └── file-notes/      # Notes, comments, attachments via Cloudflare R2
│   ├── core/          # DB client, universal logger, auth session resolver, rate limiter, correlation ID hook
│   ├── config/        # Zod env schemas, app registry, feature flags
│   ├── db/            # Drizzle schemas (`app_categories`, `user_preferences` JSONB), migrations & seeds
│   ├── i18n/          # Centralized dictionary & type-safe t() helper
│   ├── types/         # Zod domain contracts, setup presets, status state machines, CSV import DTOs
│   └── ui/            # Serene Finance UI components & design tokens
```

---

## 3. Multi-Tenancy, Auth & Platform Architecture

- **`tenantId`**: Root multi-tenant isolation boundary for all data. PostgreSQL RLS policies enforce `tenantId` + `appId` at DB layer.
- **`appId`**: Product shell identifier (`01908bde-34bb-7b19-a178-574211bc93aa` for Money Matters).
- **Authentication & Security**:
  - Neon Auth (Better Auth) JWT & cookie session verification in Fastify (`apps/api/src/index.ts`) & Next.js middleware (`apps/web/src/middleware.ts`).
  - Strict CORS limited to `*.kaesava.au` and `localhost` (dev).
  - Fastify Helmet enabled for security headers.
  - Upstash Redis sliding-window rate limiting on public endpoints.
  - Zero PII logging automatically enforced in `@money-matters/core` logger.
  - Credential security: All secrets managed via environment variables (Cloudflare Secrets & GitHub Secrets); `.env` ignored.
- **Partner Invitation MVP**: Owner creates invite token -> sends email via Resend -> partner accepts at `/invite/[token]` -> linked to `tenantId` with full read/write permissions.
- **App Preferences Storage**: `user_preferences.app_preferences` JSONB blob keyed by `appId`.

---

## 4. Canonical Data Model

All persistent tables include: `id`, `tenantId`, `appId`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `archivedAt`, `archivedBy`.

```
households (tenant)
├── tenant_users (userId, role: OWNER|MEMBER, inviteEmail, inviteToken, inviteStatus: PENDING|ACCEPTED|REVOKED, invitedAt)
├── bank_accounts (lastKnownBalance, purpose: INCOME_LANDING|SAVINGS|EVERYDAY, isOffset)
├── user_preferences (timezone, paydayAlertsEnabled, billRemindersEnabled, appPreferences: JSONB)
├── app_categories (appId, name, type: REGULAR|GOAL|EVERYDAY, icon, colour, annualisedAmount)
├── categories (tenantId, appId, name, type: REGULAR|GOAL|EVERYDAY, bankAccountId, monthlyAmount, rolloverRule, isDefaultExcess)
│   ├── category_schedules (targetAmount, targetDate, dueDate, rrule)
│   └── transaction_ledger (flowType: DEBIT|CREDIT, source: MANUAL|IMPORT, recordedAt, note, metadata)
├── income_sources (name, amount, receivingAccountId, rrule, startDate, endDate)
│   └── income_events (expectedDate, expectedAmount, actualAmount, status: UPCOMING|PAID)
├── expense_sources (name, amount, categoryId, rrule, startDate, endDate)
│   └── expense_events (expectedDate, expectedAmount, actualAmount, status: UPCOMING|PAID)
└── file_notes (entityType: CATEGORY|TRANSACTION, comment, fileKey, fileName, mimeType)
```

---

## 5. Core Engines & Services

### 5.1 Onboarding Estimation Engine (Interactive Quiz)
- Takes user answers (housing status, car details, kids/schooling, health, debt, everyday spend sliders).
- Executes background estimation using 2025/2026 ABS & RACQ Australian benchmark algorithms.
- Normalizes all costs to monthly amounts (`REGULAR`, `GOAL`, `EVERYDAY`) for user confirmation before seeding tenant categories and schedules.

### 5.2 5-Step Waterfall Cascade Engine
1. **`DEFICIT REPAIR` (Step 0)**: Priority 1 restoring negative category balances (`currentBalance < 0`) to $0.
2. **`REGULAR` (Bills)**: Prorates monthly bill targets by paycheck frequency.
3. **`GOAL` committed**: Allocates target monthly contribution.
4. **`EVERYDAY` top-up cap**: Tops up pooled Everyday balance to target cap.
5. **`GOAL` uncommitted / Surplus sweep**: Sweeps residual income to default excess category.

### 5.3 Bank CSV Import Engine (`@money-matters/capability-transactions`)
- Parses CSV exports from CBA, Westpac, ANZ, NAB, ING, and Macquarie.
- Rule-based merchant/description matching to automatically map transactions to existing tenant categories.
- Deduplication via transaction date, amount, and description hash.

### 5.4 Smart Scheduled Notifications (Inngest)
1. **`notify-payday-incoming`**: Daily alert for upcoming payday tomorrow.
2. **`notify-bill-due-soon`**: Alert 3 days before bill due with category funding status (`Funded ✓` vs `Short by $X ⚠️`).
3. **`notify-bill-overdue`**: Daily alert for overdue bills.
4. **`notify-weekly-digest`**: Sunday summary of weekly spend and category health.
5. **`notify-goal-milestone`**: Milestone alert when goal crosses 25%, 50%, 75%, 100%.
6. **`notify-spending-velocity`**: Daily pace warning if Everyday pool runs out early.

---

## 6. CI/CD & Deployment Strategy

- **Production Deployment**: Cloudflare Workers via Wrangler.
  - Web: `@opennextjs/cloudflare` (`moneymatters.kaesava.au`)
  - API: Fastify on Cloudflare Workers (`api.moneymatters.kaesava.au`)
- **Automated Workflows (`.github/workflows/`)**:
  - `ci.yml`: Runs on PR and push to `main` (Lint, Typecheck, Vitest unit tests).
  - `deploy.yml`: Runs on merge to `main` (Executes `wrangler deploy` for `apps/web` and `apps/api`).

---

## 7. Future Architecture & Performance Roadmap (Release 2 / R2)

- **`tenantProcedure` Performance Caching**: Adding `getSubscriptionStatus` database queries to every tRPC `tenantProcedure` invocation adds ~1–2ms overhead per request on Neon serverless PostgreSQL. While completely acceptable at V1 launch scale, if database query latency becomes a bottleneck under high concurrent request volume, subscription status resolution can be cached in Upstash Redis using a tenant-scoped cache key (e.g., `tenant:sub_status:<tenantId>`) with a 5-minute TTL, invalidating immediately on Stripe webhooks (`checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`).

