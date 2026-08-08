# TECHNICAL_SPEC.md — money-matters

> **Last updated:** 2026-08-08  
> **Status:** Fully synchronized with production Cloudflare Workers architecture (`nodejs_compat`), Fastify API, Neon serverless PostgreSQL with RLS, Expo React Native Android target, OpenNext Web target, Upstash Redis rate limiting, Serene Finance UI design tokens (with JetBrains Mono metric typography & responsive viewport configuration), Universal Logger, and Vitest suite.

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
| Async Workflows | Inngest | Inngest Cloud | 6 scheduled notification crons & non-blocking background event dispatch (`transaction/recorded`) via `/api/inngest` webhook |
| Email Service | Resend | Resend API | Transactional emails & partner invites |
| Analytics & Replays | PostHog (Self-driving) | PostHog SaaS | Product usage tracking, feature flags, session replays |
| Crash & APM | Sentry | Sentry SaaS | Production exception reporting & symbolicated stack traces |
| Mobile Framework | React Native / Expo | Expo SDK 54 / RN 0.81.5 | Android native app |
| Styling & UI | Serene Finance Tokens | `packages/ui` & `apps/web` | Standardized tokens (`#2563eb`, `#1B2B4B`, `#F7F8FA`, `#22c55e`, `#ba1a1a`), JetBrains Mono via `next/font/google`, and responsive viewport (`width=device-width`) |
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
  - **Google OAuth 2.0 Integration**:
    - Registered Authorized Redirect URI: `https://ep-spring-snow-a70f61xz.neonauth.ap-southeast-2.aws.neon.tech/neondb/auth/callback/google`
    - Registered Authorized Origins: `https://moneymatters.kaesava.au` and Neon Auth base URL.
  - **Tenant Auto-Provisioning**:
    - When authenticated users (e.g. Google OAuth sign-in) lack a `tenant_users` record, `createContext()` / `createEdgeContext()` automatically provisions a default `"My Household"` tenant and seeds default categories.
  - Strict CORS limited to `*.kaesava.au` and `localhost` (dev).
  - HTTP Security Headers enforced across API worker and web app (`Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`).
  - Upstash Redis sliding-window rate limiting on endpoints.
  - Zero PII logging automatically enforced in `@money-matters/core` logger.
  - Credential security: All secrets managed via environment variables (Cloudflare Secrets & GitHub Secrets); `.env` ignored.
- **Partner Invitation Security**: Owner creates invite token with 48-hour lifetime (`expiresAt`) -> partner accepts at `/invite/[token]` -> system verifies recipient email identity matching `inviteEmail` -> linked to `tenantId` with full read/write permissions. Expired or mismatched invites are rejected and require re-invitation.
- **Redirect Domain Whitelisting**: Password reset `/reset-password` endpoint strictly enforces URL validation against allowed app schemes (`moneymatters://*`) and domain whitelist (`https://*.kaesava.au`), blocking open redirect attacks.
- **Async Inngest Workflows & Resend Email Integration**:
  - `sendWelcomeEmail`: Listens to `auth/user.signup`, sending a welcome transactional email via Resend (`sendEmail` abstraction).
  - `sendPartnerInviteEmail`: Listens to `partner/invited`, delivering partner invitation links (`https://moneymatters.kaesava.au/invite/[token]`) via Resend with 3 automatic retries.
  - `processAccountDeletion`: Listens to `user/account.delete-requested`, executing background account wipe logging, storage cleanup, and email confirmation dispatch.
- **Complete Database RLS**: Row-Level Security policies active across 100% of persistent schema tables (`tenants`, `tenant_users`, `bank_accounts`, `categories`, `category_schedules`, `income_sources`, `income_events`, `transaction_ledger`, `user_preferences`, `expense_events`, `expense_sources`, `file_notes`, `device_tokens`).
- **App Preferences & UI Aesthetic Storage**: `user_preferences.app_preferences` JSONB blob keyed by `appId`, storing app-specific UI state (`quick_actions_collapsed`, `show_icons`, `filters_expanded`).
- **Icon Visibility & Decluttered UI System**: `IconVisibilityProvider` and `useIconVisibility()` hook in `@money-matters/ui` dynamically control decorative icon rendering across Web and Mobile based on user preferences.
- **Collapsible Filter System**: `FilterBar` (Web) and `MobileFilterBar` (Mobile) support collapsible filter groups with active filter count badges.

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

### 5.2 5-Step Waterfall Cascade Engine & Category Bucket Rules
- **Category Bucket Rules**:
  - **`EVERYDAY` & `REGULAR` (Bills)**: Managed at **overall pool level**. Categories specify monthly targets to compute total bucket target budget. Spending occurs against pooled balances (pooled discretionary cash or pooled bills balance).
  - **`GOAL` (Save Toward)**: Managed **individually per category** with dedicated target balances, target dates, and progress metrics.
- **Category UI Screen**: Organized into 3 distinct sections (Everyday Spending [collapsable], Regular Bills [collapsable], Save Toward Goals).
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

### 5.5 Visualizations & Pacing Engine
- **Month Progress Helper (`monthProgress`)**: Centralized math utility in `@money-matters/ui` calculating days elapsed, total days in month, and elapsed month percentage.
- **Dual-Arc Donut Ring (`DonutRing` Web / `MobileDonutRing` Mobile)**: Pure SVG arc visualizations wrapping Everyday balance on Hero Cards, tracking time elapsed vs pool consumed percentages with 3-tier color warning states (Green, Amber, Red). Mobile implementation powered by `react-native-svg` and `Animated.Value`.
- **Pool Pacing Progress Bars (`DualPoolBar`)**: Stacked progress bars in Everyday and Bills pool headers on Categories screens tracking month elapsed vs pool spent percentage.
- **Goal Target Countdown & Pace Math**: Dynamically computes target date countdowns (`daysLeftText`) and required monthly savings pace (`(target - balance) / monthsRemaining`) for Save Toward categories.

### 5.6 Database & Network Optimization Standards
- **Bulk Database Operations (Anti-N+1)**: All database writes and queries must be batched. Individual inserts or queries in loops are forbidden. Plan lines and ledger entries are prepared in-memory and written in bulk. Deletions and status transitions must use `inArray` operators (e.g. archiving category arrays or deleting account relations) to prevent query waterfalls.
- **Parallelized Network Operations**: Onboarding configurations (e.g., category setup or schedule target insertions) must execute mutations in parallel using batch wrappers (`Promise.all`), preventing sequential async waterfalls.
- **Strict Whitelisted CORS**: Cross-origin resource sharing (CORS) is restricted to whitelisted domains (`*.kaesava.au` and dev `localhost`). Global wildcards (`origin: true`) are explicitly banned.

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

