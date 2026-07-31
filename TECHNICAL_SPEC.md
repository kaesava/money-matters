# TECHNICAL_SPEC.md — money-matters

> **Last updated:** 2026-08-01  
> **Status:** Synchronized with Cloudflare Workers production migration, full interactive onboarding engine, Bank CSV import capability, Serene Finance UI system, Universal Logger, Android-only mobile config, Privacy Policy, and Wave 2 security runbooks.

---

## 1. Stack & Infrastructure

| Layer | Package / Service | Target Environment | Details |
|---|---|---|---|
| Runtime | Node.js (≥20) / Cloudflare Workers | Cloudflare Workers (`nodejs_compat`) | Edge runtime for Web & API |
| Package Manager | pnpm | 9.0.0 | Workspace monorepo |
| Build Orchestration | Turborepo | 2.0.14 | Turbo pipeline |
| Language | Strict TypeScript | ^6.0.3 | Zero `any` |
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
| Mobile Framework | React Native / Expo | Expo SDK 54 / RN 0.81.5 | iOS / Android native apps |
| Styling & UI | NativeWind / Vanilla CSS | Serene Finance Tokens | Standardized design tokens & JetBrains Mono for metrics |
| CI/CD Pipeline | GitHub Actions | GitHub & Cloudflare | Lint, typecheck, test, and `wrangler deploy` on push to `main` |

---

## 2. Monorepo Topology & Capabilities

```
money-matters/
├── apps/
│   ├── api/           # Fastify server on Cloudflare Workers (`wrangler.toml`)
│   ├── mobile/        # Expo React Native app (iOS/Android)
│   └── web/           # Next.js web app on Cloudflare Workers via OpenNext (`wrangler.jsonc`)
├── packages/
│   ├── capabilities/
│   │   ├── tenant/          # Household creation, partner invite (invitePartner/acceptInvite), bank account CRUD
│   │   ├── budgeting/       # 3-bucket waterfall & allocation engine (Deficit Repair, Regular, Goal, Everyday)
│   │   ├── transactions/    # Daily ledger, canAfford calculator & spending velocity
│   │   ├── import/          # Bank CSV parser (CBA, Westpac, ANZ, NAB, ING, Macquarie) & auto-categorization
│   │   ├── notifications/   # Expo push + 6 scheduled Inngest functions (payday, bill, overdue, digest, goal, velocity)
│   │   └── file-notes/      # Notes, comments, attachments via Cloudflare R2
│   ├── core/          # DB client, logger, auth session resolver, rate limiter, correlation ID hook
│   ├── config/        # Zod env schemas, app registry, feature flags
│   ├── db/            # Drizzle schemas (`app_categories`, `user_preferences` JSONB), migrations & seeds
│   ├── i18n/          # Centralized dictionary & type-safe t() helper
│   ├── types/         # Zod domain contracts, setup presets, status state machines, CSV import types
│   └── ui/            # Serene Finance UI components & design tokens
```

---

## 3. Multi-Tenancy, Auth & Platform Architecture

- **`tenantId` = `householdId`**: Root isolation boundary for all data. PostgreSQL RLS policies enforce `tenantId` + `appId` at DB layer.
- **`appId`**: Product shell identifier (`01908bde-34bb-7b19-a178-574211bc93aa` for Money Matters).
- **Authentication & Security**:
  - Neon Auth (Better Auth) JWT & cookie session verification in Fastify (`apps/api/src/index.ts`) & Next.js middleware (`apps/web/src/middleware.ts`).
  - Strict CORS limited to `*.kaesava.au` and `localhost` (dev).
  - Fastify Helmet enabled for security headers.
  - Credential security: All secrets managed via environment variables (Cloudflare Secrets & GitHub Secrets); `.env` ignored.
- **Partner Invitation MVP**: Owner creates invite token -> sends email via Resend -> partner accepts at `/invite/[token]` -> linked to `tenantId` with full read/write permissions.
- **App Preferences Storage**: `user_preferences.app_preferences` JSONB blob keyed by `appId` (e.g. `{ "01908bde-...": { "quick_actions_collapsed": true } }`).
- **Template Category Seeding**: `app_categories` table stores master templates. On new tenant creation, `createTenantHandler` copies `app_categories` rows into `categories` for the new `tenantId`.

---

## 4. Canonical Data Model

### 4.1 Entity Relationship Diagram

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

### 5.3 Bank CSV Import Engine (`@money-matters/capability-import`)
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

