# TECHNICAL_SPEC.md — money-matters

> **Last updated:** 2026-08-15  
> **Status:** Fully synchronized with production Cloudflare Workers architecture (`nodejs_compat`), Fastify API, Neon serverless PostgreSQL with RLS, Expo React Native Android target, OpenNext Web target, Upstash Redis rate limiting, Serene Finance UI design tokens, 4th Category Type (`PERSONAL`) with 100% Stealth Privacy, 5-Step Waterfall Engine (with Step 3b Personal Allowances), CSV Zip Export Bundle, Premium Tier Gating (`ensurePremiumAccess`), Multi-Tenant Header Context Switching (`x-tenant-id`), Schedule Burst Event Regeneration with `endDate` support, Inngest Scheduled Notifications (Spending Velocity & Resend Weekly Email Digest), 100% i18n externalization & Japanese localization (`ja.ts`), AST-based `check-i18n` validator, and 100% Vitest unit test coverage.

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

### 5.1 Onboarding Estimation Engine & Re-Setup Budget Capability (Interactive Quiz)
- Takes user answers (`QuizAnswers`: dynamic income sources array `incomes`, housing status, per-vehicle configuration array `vehicles`, per-child configuration array `children`, health, debt, everyday spend sliders).
- Executes real-time estimation using 2025/2026 ABS & RACQ Australian benchmark algorithms in `@money-matters/types` (`calculateQuizEstimates`).
- Generates normalized monthly targets across **Regular Bills**, **Goal Sinking Funds**, and **Everyday Spending Categories** (Groceries, Dining, Personal, Incidentals).
- Supports full category customization (custom category additions, amount overrides, and category deletions).
- Includes **Info Tooltips (ℹ️)** explaining calculation rationale and a **Discard Warning Modal** on cancellation.
- Enforces an automated **Zero-Categories Redirect Guard** on dashboard entry.
- **Re-Run Budget Setup (`mode=rerun`)**: Accessible via `Settings → Re-run Budget Setup` on Web (`/setup?mode=rerun`) and Mobile (`/(setup)?mode=rerun`). Executes the backend `reSetupBudget` capability (`packages/capabilities/budgeting/src/commands/re-setup-budget.command.ts`) to adjust pool caps and categories while soft-archiving removed categories with transactions to preserve historical audit trails.

### 5.2 5-Step Waterfall Cascade Engine & Category Bucket Rules
- **Category Bucket Rules**:
  - **`EVERYDAY` & `REGULAR` (Bills)**: Managed at **overall pool level**. Categories specify monthly targets to compute total bucket target budget. Spending occurs against pooled balances (pooled discretionary cash or pooled bills balance).
  - **`GOAL` (Save Toward)**: Managed **individually per category** with dedicated target balances, target dates, and progress metrics.
- **Dynamic Paycheck Frequency Engine (`parseRruleFrequencyDays`)**: Automatically evaluates income source recurrence rules (`rrule`) to calculate allocation period days: `WEEKLY` (7 days), `FORTNIGHTLY` (14 days), `MONTHLY` (30 days), and `ANNUALLY`/`YEARLY` (365 days), ensuring prorated target calculations scale precisely with user income schedules.
- **Category UI Screen**: Organized into 3 distinct sections (Everyday Spending [collapsable], Regular Bills [collapsable], Save Toward Goals).
1. **`DEFICIT REPAIR` (Step 0)**: Priority 1 restoring negative category balances (`currentBalance < 0`) to $0.
2. **`REGULAR` (Bills)**: Prorates monthly bill targets by dynamic paycheck frequency (`targetMonthly * (paycheckFrequencyDays / 30)`).
3. **`GOAL` committed**: Allocates target monthly contribution.
4. **`EVERYDAY` top-up cap**: Tops up pooled Everyday balance to target cap.
5. **`GOAL` uncommitted / Surplus sweep**: Sweeps residual income strictly into the category where `isSurplusTarget === true` (default: *"Surplus & Offset Reserve"*).


### 5.3 Bank CSV Import Engine (`@money-matters/capability-transactions`)
- Interactive 3-Step Import Wizard on Web Dashboard (`Upload` $\rightarrow$ `Review & Map` $\rightarrow$ `Complete & Commit`).
- Parses CSV exports from CBA, Westpac, ANZ, NAB, ING, and Macquarie, plus custom column mapping support.
- Keyword auto-categorization for Australian merchants and income sources.
- Server-side deduplication via idempotency keys (`csv-import-${date}-${flowType}-${amount}-${cleanDesc}`) pre-flagged as `⚠️ Duplicate` and pre-unchecked in the preview table.
- Bulk atomic insertion into `transactionLedger` via `commitCsvImportCommand` (Rule #6 compliant single-query insert).
- Support for `DEBIT` (Category target) and `CREDIT` (Income Source or Category target) transaction mapping.

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

### 5.6 5-Level "Can We Afford This?" Engine (`@money-matters/capability-transactions`)
- **Bill Buffer Protection**: Queries `expenseEvents` where `status = 'UPCOMING'` and `expectedDate <= nextPaycheckDate`. Reserves upcoming bill deficits (`billsReserved`) before calculating spendable cash `netAvailableCash = max(0, everydayBalance - billsReserved)`.
- **Daily Pacing Velocity**: Computes `dailyPacingAfterSpend = (everydayBalance - amount - billsReserved) / daysUntilPayday`. Triggers `PACING_WARNING` if daily discretionary allowance drops below $15.00/day.
- **5-Level Discriminated Union Matrix (`CanAffordVerdictDto`)**:
  - `SAFE_YES`: Cash available + healthy daily allowance ($\ge \$15$/day).
  - `PACING_WARNING`: Cash available, but tight daily spending allowance ($< \$15$/day).
  - `IMPACT_GOALS`: Everyday cash short, but covers purchase by dipping into uncommitted goal surplus.
  - `WAIT_FOR_PAYDAY`: Incoming paycheck within 14 days will cover shortfall.
  - `HARD_NO`: Purchase causes an unavoidable bill default or debt deficit.
- **Rationale Step Breakdown**: Returns a step-by-step array of formatted cashflow strings rendered directly in the UI.

### 5.7 Stripe Billing & 7-Day Read-Only Grace Period (`@money-matters/capability-billing`)
- **Decoupled Capability Architecture**: Stripe Checkout (`createCheckoutSessionCommand`), Customer Portal (`createCustomerPortalSessionCommand`), and Webhooks (`handleStripeWebhook`) isolated inside `packages/capabilities/billing`.
- **Cryptographic Signature Verification**: Webhook handler (`POST /webhooks/stripe`) validates raw body signatures via `stripe.webhooks.constructEvent`.
- **Automated Grace Period & Expiration Fallback**:
  - `invoice.payment_failed` / `customer.subscription.deleted` $\rightarrow$ Triggers `deactivateTenantCommand` setting `subscriptionStatus = 'PAST_DUE'` and populating 7-day `trialGraceEndsAt` timestamp. Dashboard access remains unblocked in read-only state.
  - `invoice.payment_succeeded` $\rightarrow$ Triggers `activateSubscriptionCommand`, resetting `subscriptionStatus = 'SUBSCRIBED'` and `premiumEnabled = true`.
  - `getSubscriptionStatus` Query Check $\rightarrow$ Evaluates `now > trialEndsAt` (for active trials) or `now > trialGraceEndsAt` (for past due). Automatically updates database record to `subscriptionStatus = 'TRIAL_EXPIRED'`.


### 5.8 Database & Network Optimization Standards

- **Bulk Database Operations (Anti-N+1)**: All database writes and queries must be batched. Individual inserts or queries in loops are forbidden. Plan lines and ledger entries are prepared in-memory and written in bulk. Deletions and status transitions must use `inArray` operators (e.g. archiving category arrays or deleting account relations) to prevent query waterfalls.
- **Parallelized Network Operations**: Onboarding configurations (e.g., category setup or schedule target insertions) and `reSetupBudget` category updates execute mutations concurrently using batch wrappers (`Promise.all`), preventing sequential async waterfalls.
- **Strict Whitelisted CORS**: Cross-origin resource sharing (CORS) is restricted to whitelisted domains (`*.kaesava.au` and dev `localhost`). Global wildcards (`origin: true`) are explicitly banned.
- **Predictable Unique ID Generation**: UI components generating HTML accessibility IDs must use React's `useId()` hook to avoid hydration mismatches and insecure random string generation.
- **Client & Server Log Scrubbing**: Auth tokens, JWT credentials, and PII must never be emitted to stdout/stderr via `console.log`. Logger abstractions automatically sanitize sensitive fields.

### 5.9 Typed Feature Flags, Kill Switches & Strict DB Typing Standards
- **Typed Feature Flags (`@money-matters/config`)**: All feature flags implement `FeatureFlag` with typed expiry, owner, tenant scoping, and mandatory `killSwitchEnabled: boolean`. When `killSwitchEnabled === true`, `isFeatureEnabled()` immediately disables the capability globally regardless of user rollout percentages.
- **Strict Database Typing (`DbOrTx`)**: Zero `any` policy enforced across all capability command and query signatures. All capability handlers receive strict `DbOrTx` (`DbClient | DbTransaction`) without default client injection parameters, guaranteeing deterministic transactional boundaries and full type safety.


---

## 6. CI/CD & Deployment Strategy

- **Production Deployment**: Cloudflare Workers via Wrangler.
  - Web: `@opennextjs/cloudflare` (`moneymatters.kaesava.au`)
  - API: Fastify on Cloudflare Workers (`api.moneymatters.kaesava.au`)
- **Automated Workflows (`.github/workflows/`)**:
  - `ci.yml`: Runs on PR and push to `main` (Security scan `pnpm audit --audit-level=high`, i18n parity check `pnpm check-i18n`, Typecheck, Lint, Vitest unit tests, Turbo build).
  - `deploy.yml`: Runs on merge to `main` (Executes CI suite as a mandatory prerequisite via `needs: [ci]` before running Drizzle DB migrations and `wrangler deploy` for `apps/web` and `apps/api`).

---

## 7. Future Architecture & Performance Roadmap (Release 2 / R2)

- **`tenantProcedure` Performance Caching**: Adding `getSubscriptionStatus` database queries to every tRPC `tenantProcedure` invocation adds ~1–2ms overhead per request on Neon serverless PostgreSQL. While completely acceptable at V1 launch scale, if database query latency becomes a bottleneck under high concurrent request volume, subscription status resolution can be cached in Upstash Redis using a tenant-scoped cache key (e.g., `tenant:sub_status:<tenantId>`) with a 5-minute TTL, invalidating immediately on Stripe webhooks (`checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`).

---

## 8. External Dependencies & Production Readiness Audit Matrix

| Dependency / Tool | Primary Capability | Config / Secrets Location | Prod Readiness Status | Fallback / Dev Strategy |
|---|---|---|---|---|
| **Cloudflare Workers (`nodejs_compat`)** | Web & API Edge Hosting | `apps/api/wrangler.toml`, `apps/web/wrangler.jsonc` | **READY** (`moneymatters.kaesava.au` & `api.moneymatters.kaesava.au`) | Local Wrangler dev / `next dev` |
| **Cloudflare R2 Storage** | File Notes & Attachment Storage | `.env` (`STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`) | **READY** (`money-matters-production`) | Local storage simulation / S3 client mock |
| **Neon Serverless PostgreSQL** | Database + Row-Level Security (RLS) | `.env` (`DATABASE_URL`) | **READY** (Pooled production connection string & 100% RLS coverage) | Dev Neon branch database |
| **Neon Auth (Better Auth)** | User Auth & Google OAuth 2.0 | `.env` (`NEXT_PUBLIC_NEON_AUTH_URL`, `NEON_AUTH_JWKS_URL`) | **READY** (JWKS verification & Whitelisted OAuth redirect URIs) | Dev Neon Auth instance |
| **Upstash Redis** | Sliding-Window API Rate Limiting | `.env` / Cloudflare Secrets (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) | **READY** (REST pipeline sliding window) | In-process sliding window fallback map |
| **Resend** | Transactional Email & Partner Invites | `.env` (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`) | **READY** (`notifications@moneymatters.kaesava.au`) | Console simulation mode when key absent |
| **Inngest Cloud** | Async Workflows & 6 Scheduled Crons | `.env` (`INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`), `/api/inngest` | **READY** (Production signing key & background event dispatch) | Local Inngest CLI (`pnpm run dev:inngest`) |
| **Stripe API** | Subscriptions, Billing & Webhooks | `.env` / Platform Secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs) | **READY** (Raw signature validation & 7-day read-only grace period) | Vitest mock handlers / Test mode price IDs |
| **Sentry SaaS** | APM & Exception Tracking | `.env` (`SENTRY_DSN`), `next.config.ts`, `sentry.*.config.ts` | **READY** (Integrated across Fastify API, Next.js Web, Expo Mobile) | Gated to production builds (`NODE_ENV === 'production'`) |
| **PostHog SaaS** | Product Analytics & Feature Flags | `.env` (`POSTHOG_API_KEY`, `POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`) | **READY** (Integrated across Fastify API, Next.js Web, Expo Mobile) | Safe null-logger fallback in development |

| **Expo & Expo Push** | Mobile App & Native Push Notifications | `apps/mobile`, `device_tokens` DB table, `https://exp.host/--/api/v2/push/send` | **READY** (Android Native Target SDK 54 / RN 0.81.5) | Expo Go / Android Emulator |
| **Photon (Komoot OSM)** | Public Geocoding | Public Service (`https://photon.komoot.io`) | **READY** (Zero-config public API, no keys required) | Public API fallback |
| **Monorepo Tools** | pnpm 9, Turbo 2, TypeScript 6, Vitest 4, ESLint 9 | `package.json`, `pnpm-workspace.yaml`, `turbo.json` | **READY** (100% strict type safety & Vitest unit tests) | Local turbo build & test pipelines |


