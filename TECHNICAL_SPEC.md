# TECHNICAL_SPEC.md — money-matters

> **Last updated:** 2026-10-10  
> **Status:** 100% production-ready standard. Fully executed and synchronized across all Master Plan phases, Mobile Parity & UI Decompositions: Radical Low-Friction UX Simplification across Web and Mobile with 100% parity, 4-Pillar MECE Navigation ("Envelopes", "Plan", "Activity", "Allocate Payday"), Single Hero Metric ("Safe to Spend Right Now" with daily pace `~$X/day to payday`), Progressive Payday Allocation Disclosure with 1-tap `[ Confirm Income Split ]` celebration card, Instant Modal "Can I Afford It?" tool, 1-Tap Shortfall Resolution from Surplus, Day-1 Interactive Payday Sandbox in Setup wizard, Automated Everyday Spending Estimation Model ($M \times 12 / 365$) with Safety Buffer Floor protection (`safetyBufferFloor`) and zero manual receipts, Payday Rollover with 1-tap reported leftover cash deduction chip, Strict Pool Topology Constraints (at most 1 Shared Everyday + 1 Shared Bills pool per household, at most 1 Private Everyday + 1 Private Bills pool per partner; multiple Goals allowed), Action Queue prioritization, Serene Finance design tokens (`#2563eb`, `#1B2B4B`, `#F7F8FA`, `#22c55e`, `#ba1a1a`), JetBrains Mono for financial figures, full user-facing `t(...)` string externalization with 0 build warnings, authoritative `SCHEMA_DATA_DICTIONARY.md` and automated `pnpm audit:schema` verification, and active Neon PostgreSQL DB schema & seed dispatches.

---

## 1. Stack & Infrastructure

| Layer | Package / Service | Target Environment | Details |
|---|---|---|---|
| Runtime | Node.js (≥20) / Cloudflare Workers | Cloudflare Workers (`nodejs_compat`) | Edge runtime for Web & API |
| Package Manager | pnpm | 9.0.0 | Workspace monorepo |
| Build Orchestration | Turborepo | 2.0.14 | Turbo pipeline |
| Language | Strict TypeScript | ^6.0.3 | Zero `any`, mandatory Zod `.strict()` |
| Web Framework | Next.js (App Router) | Cloudflare Workers via `@opennextjs/cloudflare` | Custom domain `moneymatters.kaesava.au` |
| API Server | Cloudflare Worker Fetch API | Cloudflare Workers (`src/worker.ts`) | Custom domain `api.moneymatters.kaesava.au` |
| API Layer | tRPC | ^11.18.0 | Type-safe RPC contracts (`budgetingRouter`, `tenantRouter`, `incomeRouter`, `expensesRouter`, `paydayRouter`, `transactionsRouter`, `billingRouter`, `notificationsRouter`, `assistantRouterMap`, `bugReportsRouter`) |
| ORM | Drizzle ORM | ^0.39.0 | Neon PostgreSQL driver |
| Database (Server) | Neon PostgreSQL (Serverless) | Neon DB | Multi-tenant schema with RLS (`privateTenantProcedure` session injection) |
| Database (Mobile) | Expo SQLite | 16.0.10 | Local SQLite (Scoped `tenantId:userId:queryKey`, validated via Zod, wiped on logout) |
| Auth | Neon Auth (Better Auth) | Neon Auth Service | JWT & session cookie verification |
| Rate Limiting | Upstash Redis | Serverless Redis (ap-southeast-1) | REST API sliding-window rate limiter |
| File Storage | Cloudflare R2 | Cloudflare R2 | Attachments & file notes (`money-matters-production`) |
| Async Workflows | Inngest | Inngest Cloud | Release 1 active background cron (`notifyWeeklyDigest` Sunday 7pm AEST via Resend, `maintainRollingWindow`) & async dispatches |
| Email Service | Resend | Resend API | Transactional emails & partner invites |
| Analytics & Replays | PostHog (Self-driving) | PostHog SaaS | Product usage tracking (opt-in consent, `identify(userId)` only without PII or amounts) |
| Crash & APM | Sentry | Sentry SaaS | Production exception reporting & symbolicated stack traces |
| Mobile Framework | React Native / Expo | Expo SDK 54 / RN 0.81.5 | Android native app |
| Styling & UI | Serene Finance Tokens & Toast/Alert System | `packages/ui` & `apps/web` | Standardized tokens (`#2563eb`, `#1B2B4B`, `#F7F8FA`, `#22c55e`, `#ba1a1a`), JetBrains Mono via `next/font/google`, non-blocking Toast feedback system (`ToastProvider`/`useToast`/`MobileToastProvider`/`useMobileToast`), inline `AlertBanner` primitives, and responsive viewport (`width=device-width`) |
| CI/CD Pipeline | GitHub Actions | GitHub & Cloudflare | Lint, typecheck, test, and `wrangler deploy` on push to `main` |

---

## 2. Monorepo Topology & Capabilities

```
money-matters/
├── apps/
│   ├── api/           # Cloudflare Worker API (`wrangler.toml`, `src/worker.ts`)
│   ├── mobile/        # Expo React Native app (Android target)
│   └── web/           # Next.js web app on Cloudflare Workers via OpenNext (`wrangler.jsonc`)
├── packages/
│   ├── capabilities/
│   │   ├── assistant/       # Ask Penny AI Assistant (Cloudflare Workers AI Gateway, deterministic matcher, usage quota)
│   │   ├── billing/         # Subscription state machine, Stripe checkout & customer portal, raw-body webhook processor
│   │   ├── tenant/          # Household creation, partner invite, bank account CRUD, bank balance reconciliation
│   │   ├── budgeting/       # Envelope-centric architecture (`Bank Account → Envelope → Category`), 5-step waterfall allocation engine, rolling window maintainer
│   │   ├── transactions/    # Daily ledger, expense recording, transaction history, paired transfer resolution
│   │   ├── simulation/      # Stateless "Can I Afford It?" engine with 3-tier verdict model (Safe, Caution, Not Recommended) & goal timeline impact analysis
│   │   ├── notifications/   # Expo push + scheduled weekly digest Inngest workflow + retention workflows
│   │   └── bug-reports/     # Feedback and bug report delivery (`submitFeedback` via Resend with client diagnostics)
│   ├── core/          # DB client, universal logger, auth session resolver, rate limiter, correlation ID hook
│   ├── config/        # Zod env schemas, app registry, feature flags
│   ├── db/            # Drizzle schemas (22 audited tables in SCHEMA_DATA_DICTIONARY.md), migrations & seeds
│   ├── i18n/          # Centralized dictionary & type-safe t() helper
│   ├── types/         # Zod domain contracts, setup presets, status state machines, API DTOs
│   └── ui/            # Serene Finance UI components & design tokens (standard h-10 inputs, modal autofocus, discard guardrails, SearchInput keyboard binding)
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
  - **Tenant Auto-Provisioning & Active Tenant Resolution**:
    - When authenticated users lack a `tenant_users` record, `createContext()` / `createEdgeContext()` automatically provisions a default `"My Household"` tenant and seeds default categories.
    - Default active tenant resolution strictly prioritizes owned households over member households (`sql'CASE WHEN ${tenantUsers.role} = 'OWNER' THEN 0 ELSE 1 END', asc(tenantUsers.createdAt)`), ensuring users with multiple memberships land on their primary household data by default.
  - Strict CORS limited to `*.kaesava.au` and `localhost` (dev), with development regex support for Tailscale Funnel / tunnel testing (`*.tail09ef18.ts.net`).
  - HTTP Security Headers enforced across API worker and web app (`Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`).
  - Upstash Redis sliding-window rate limiting on endpoints.
  - Zero PII logging automatically enforced in `@money-matters/core` logger.
  - Credential security: All secrets managed via environment variables (Cloudflare Secrets & GitHub Secrets); `.env` ignored.
- **Partner Invitation Security**: Owner creates invite token with 48-hour lifetime (`expiresAt`) -> partner accepts at `/invite/[token]` -> system verifies recipient email identity matching `inviteEmail` -> linked to `tenantId` with full read/write permissions. Expired or mismatched invites are rejected and require re-invitation.
- **6-Digit Email OTP Password Reset**: Password resets use direct 6-digit numeric OTPs (`/email-otp/request-password-reset` and `/email-otp/reset-password`), eliminating fragile redirect origins, deep link interception, and open redirect vulnerabilities across web and mobile.
- **Async Inngest Workflows & Resend Email Integration**:
  - `sendWelcomeEmail`: Listens to `auth/user.signup`, sending a welcome transactional email via Resend (`sendEmail` abstraction).
  - `sendPartnerInviteEmail`: Listens to `partner/invited`, delivering partner invitation links (`https://moneymatters.kaesava.au/invite/[token]`) via Resend with 3 automatic retries.
  - `processAccountDeletion`: Listens to `user/account.delete-requested`, executing background account wipe logging, storage cleanup, and email confirmation dispatch.
- **Complete Database RLS**: Row-Level Security policies active across 100% of persistent schema tables (`tenants`, `tenant_users`, `bank_accounts`, `envelopes`, `income_sources`, `income_events`, `allocation_plans`, `allocation_plan_lines`, `transaction_ledger`, `user_preferences`, `tenant_user_preferences`, `expense_sources`, `expense_events`, `transfer_events`, `device_tokens`, `billing_invoices`).
- **Global User Preferences**: `user_preferences` table (1:1 per userId) stores global UI and presentation preferences: `language` (`en`, `ja`), `locale` (`auto`, `en-AU`, `en-US`, `en-GB`, `en-CA`, `ja-JP`), presentation `timezone`, `theme`, and `showIcons` (boolean, default `true`). Toggling "Show information icons" centrally controls `(i)` tooltip icon visibility across all screens, modals, confirmation dialogs, and drawers on both Web and Mobile across all tenants.
- **Tenant Setup & Household State**: `tenants` stores household-level budget configuration lifecycle via `setup_status` (`PENDING` | `COMPLETED`) and `setup_completed_at` (timestamp). Setup completion is a household property: once established by any member, secondary invited partners immediately enter active household dashboard views rather than blank onboarding flows.
- **Tenant User Preferences**: `tenant_user_preferences` (scoped to userId, tenantId, appId) stores per-user household delivery and engagement preferences (e.g. `payday_alerts_enabled`, `shortfall_alerts_enabled`, `bill_reminders_enabled`, `weekly_digest_enabled`).
- **Icon Visibility & Decluttered UI System**: `IconVisibilityProvider` and `useIconVisibility()` hook in `@money-matters/ui` dynamically control decorative icon rendering across Web and Mobile based on user preferences.
- **Collapsible Filter System**: `FilterBar` (Web) and `MobileFilterBar` (Mobile) support collapsible filter groups with active filter count badges.

---

## 4. Canonical Data Model

All persistent domain tables include: `id`, `tenantId`, `appId`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `archivedAt`. Root identity tables (`tenants`, `tenant_users`, `users`, `apps`) use exact single-purpose keys with FK constraints. See `SCHEMA_DATA_DICTIONARY.md` for full column-level documentation.

```
apps (id PK [stable UUID], name, slug UNIQUE)
  │ FK (appId)
  ▼
tenants (id PK, appId FK→apps.id, name, subscriptionTier, stripeCustomerId, stripeSubscriptionId, subscriptionStatus, currentPeriodEnd, cancelAtPeriodEnd, setupStatus, setupCompletedAt)
  │
  ├── tenant_users (tenantId FK→tenants.id, userId FK→users.id, role: OWNER|MEMBER|VIEWER)
  ├── bank_accounts (name, accountType, institution, accountNumberLast4, currentBalance, isPrivate, userId, isOffset, targetReserveAmount)
  │   └── envelopes (bankAccountId, name, envelopeType, safetyBufferFloor, monthlyAmount, enteredAmount, budgetFrequency, startDate, endDate, rrule, goalMode, targetAmount, isEssential, isCommitted, isSurplusTarget, isPrivate, userId, orderIndex)
  │       └── transaction_ledger (poolId, categoryId, bankAccountId, planLineId, flowType: DEBIT|CREDIT, transactionType, amount, note, source, recordedAt, idempotencyKey, transferGroupId)
  ├── user_preferences (userId, theme, locale, showIcons)
  ├── tenant_user_preferences (tenantId, userId, appId, appPreferences: JSONB)
  ├── income_sources (name, amount, isRecurring, frequency, interval, startDate, endDate, rrule, receivingAccountId, isPartner)
  │   └── income_events (incomeSourceId, expectedDate, expectedAmount, actualAmount, status: PROJECTED|CONFIRMED|SKIPPED, receivingAccountId)
  │       └── allocation_plans (incomeEventId, totalIncomeAmount, status: DRAFT|CONFIRMED|ARCHIVED)
  │           └── allocation_plan_lines (planId, poolId, amount, ruleApplied)
  ├── expense_sources (name, amount, isRecurring, frequency, interval, startDate, endDate, rrule, categoryId, targetPoolId)
  │   └── expense_events (expenseSourceId, expectedDate, expectedAmount, actualAmount, status: PENDING|PAID|SKIPPED, paidDate)
  ├── transfer_events (sourceEnvelopeId, destinationEnvelopeId, name, expectedDate, expectedAmount, actualAmount, status: PENDING|CONFIRMED)
  ├── device_tokens (userId, token, platform, lastSeenAt)
  ├── early_access (email, ipAddress, userAgent, status)
  ├── processed_webhooks (eventId, eventType, processedAt)
  └── billing_invoices (stripeInvoiceId, amountPaid, currency, status, invoicePdf, hostedInvoiceUrl, paidAt)
```

> **Tenant-App Relationship & Currency/Locale Architecture**:
> - Every tenant belongs to exactly one app via `tenants.app_id → apps.id`.
> - **Mandatory Country at Sign-Up**: Web and mobile sign-up flows mandate country selection (`SUPPORTED_COUNTRIES` with flags: `AU`, `US`, `GB`, `CA`, `JP`, `NZ`, `SG`, `EU/DE`), automatically seeding country-specific defaults (`COUNTRY_DEFAULTS`: default currency, accounting timezone, and regional date formatting locale).
> - **Tenant Base Currency (`tenants.currency`)**: A single base currency is assigned per household (`AUD`, `USD`, `EUR`, `GBP`, `CAD`, `JPY`, `NZD`, `SGD`, defaulting to `AUD`). Pre-filled from the selected country and overridable at sign-up. Once the household is provisioned, base currency is permanently locked and displayed as read-only across Household Settings on Web and Mobile, accompanied by a lock icon and explanatory tooltip (`settings.currencyLockedTooltip`), protecting transaction ledger and bank account balances from mathematical corruption.
> - **Regional Date & Number Formatting**: User formatting locale (`auto`, `en-AU`, `en-US`, `en-GB`, `en-CA`, `ja-JP`) and language (`en`, `ja`) are cleanly decoupled. Date formatting respects the selected regional pattern (`en-AU`: `DD/MM/YYYY`, `en-CA`: `YYYY-MM-DD`, `en-US`: `MM/DD/YYYY`, `ja-JP`: `YYYY/MM/DD`) rendered universally via `new Intl.DateTimeFormat(resolvedLocale, { timeZone })`. All user-facing notifications, modal notices, warning banners, cards, tables, and dialogs (e.g. `expenseFutureDateAdjustedNotice`, `pastDateAdjustedNotice`, `verdictWaitForPaycycle`, `AttentionItemsList`, `DashboardHeroCard`) dynamically parse and render dates using `fmtDate(d, userTimezone, locale)` on Web and `formatDate(d, locale, timezone)` on Mobile, preventing raw ISO strings (`YYYY-MM-DD`) from appearing in user-facing copy and preventing timezone off-by-one rollover.
> - **Timezone Decoupling (Accounting vs Presentation)**: Tenant accounting timezone (`tenants.timezone`) is decoupled from User presentation timezone (`user_preferences.timezone`). Scheduled paydays, rolling window materialization (`maintainRollingWindow`), and recurring event intervals execute strictly in `tenants.timezone`. User input dates are captured in the user's presentation timezone, converted to UTC for database storage, and formatted back to the user's presentation timezone on retrieval.
> - **Trial Expiration & Extension Lifecycle**: The trial period is governed by `tenants.trial_ends_at` (dead field `trial_grace_ends_at` dropped). If an administrator or support workflow extends `trial_ends_at` into the future (`now <= trial_ends_at`), `getSubscriptionStatus` dynamically reactivates `TRIAL_ACTIVE` even if previously marked as `TRIAL_EXPIRED`.
> - **Settings UX & Read-Only Safety**: Personal details ("My Details") and household details ("Household") views on Web and Mobile render in read-only mode by default to prevent accidental mutations. An explicit "Edit" button switches the view into an editable form with "Save" and "Cancel" actions. Attempting to cancel with dirty form state triggers an explicit discard confirmation dialog. Currency is permanently read-only.
> - **Zero-Decimal Currencies & AmountField**: Currencies with zero minor units (`JPY`) automatically suppress decimal points across all displays and block decimal point input in `<AmountField />` and `<AmountInput />`.
> - **Global Parameterization & Anti-Drift Architecture**: Money Matters is 100% globally parameterized with zero regional assumptions or leaks. Hardcoded currency symbols (`$`), fixed currency codes (`AUD`, `USD`), or fixed timezone strings (`Australia/Sydney`) in UI components, form inputs, error messages, and i18n dictionaries are strictly prohibited and actively audited via `pnpm check-i18n` with banned regex rules. All currency symbols, minor units, and formatting are resolved dynamically via `CurrencyLocaleContext` (`useCurrencyLocale` from `@money-matters/ui`). All dates and timestamps are stored in UTC (or ISO `YYYY-MM-DD` for calendar keys) and rendered dynamically using the user's active timezone with 100% parity across Web and Mobile.
> - **Modular Banking Calendar**: Settlement adjustments (`adjustForBankingCalendar`, `isNonBankingDay`) support national holiday rules parameterized by `countryCode` (Australian BECS holidays for `AU`; weekend-only settlement adjustment fallback for international tenants).

### 4.1 Managed Identity (`neon_auth`) vs Domain Schema (`public`) Architecture

- **Auth Layer (`neon_auth`)**: Managed externally by Neon Auth / Better Auth. Handles identity authentication (passwords, JWTs, session tokens, magic links).
- **Domain Layer (`public.users`)**: Platform-level user profile mirror (`id == neon_auth.user.id`). Foreign key `users_neon_auth_fk` enforces `ON DELETE CASCADE` from `neon_auth.user`. Syncs JIT via `upsertUserFromJwt`.
- **Domain Tenant Engine (`public.tenants` & `public.tenant_users`)**: `public.tenants` owns financial settings (`fyEndMonthDay`), commercial billing (`subscriptionStatus`, Stripe customer IDs), and tenant-level configuration. `public.tenant_users` manages invite tokens, role RBAC, and membership lifecycle.
- **Design Rationale**: Avoiding Neon Auth's `organization` plugin prevents contaminating the auth layer with domain budgeting math, maintains 100% type-safe Drizzle ORM schema control, avoids cross-schema migration risks, and ensures edge compatibility on Cloudflare Workers.
- **Design Rationale**: Avoiding Neon Auth's `organization` plugin prevents contaminating the auth layer with domain budgeting math, maintains 100% type-safe Drizzle ORM schema control, avoids cross-schema migration risks, and ensures edge compatibility on Cloudflare Workers.

---

## 5. Core Engines & Services

### 5.1 Onboarding Estimation Engine & Re-Setup Budget Capability (Interactive Quiz)
- Takes user answers (`QuizAnswers`: dynamic income sources array `incomes`, housing status, per-vehicle configuration array `vehicles`, per-child configuration array `children`, health, debt, everyday spend sliders).
- Executes real-time estimation using 2025/2026 ABS & RACQ Australian benchmark algorithms in `@money-matters/types` (`calculateQuizEstimates`).
- Generates normalized monthly targets across **Regular Bills**, **Goal Sinking Funds**, and **Everyday Spending Categories** (Groceries, Dining, Personal, Incidentals).
- Supports full category customization (custom category additions, amount overrides, and category deletions).
- Enforces an automated **Database-Backed Setup Redirect Guard (`setupCompleted`)** on dashboard entry: Users with `setupStatus === 'PENDING'` (`setupCompleted: false`) on `tenants` are automatically routed to the setup wizard (`/setup` on Web, `/(setup)/income` on Mobile). Cancelling first-run setup invokes `cancelSetup`, which sets `setupStatus = 'CANCELLED'` and `setupCompletedAt = now` while ensuring only 1 bank account and 1 shared `EVERYDAY` envelope (`Everyday Spending`, `isSurplusTarget: true`) linked to that bank account exist (no income schedules, bills, or goals). Completing setup via `saveSetupBudget` sets `setupStatus = 'COMPLETED'`, creating all income schedules (and 12-month burst `income_events`), bank accounts, and envelopes (and 12-month burst `expense_events` for recurring bills). Both `'COMPLETED'` and `'CANCELLED'` satisfy `setupCompleted: true` so the app never loops back to Setup, while manually visiting `/setup` when `'CANCELLED'` still launches the full first-time wizard.
- **Unified Setup & Safe Re-calibration Command (`saveSetupBudgetCommand`)**:
  - Implemented in `packages/capabilities/budgeting/src/commands/save-setup-budget.command.ts` and exposed via `budgeting.saveSetupBudget` mutation under `privateTenantProcedure`.
  - Serves as the single unified backend engine for both initial setup and safe re-calibration across Web and Mobile.
  - Handles atomic bulk upserts of bank accounts, pools, and categories with zero N+1 database queries.
  - **Automated Recurring Bill Schedules**: When `autoCreateExpenseSchedules` is enabled (defaulted to `true` with an opt-out toggle on the final review step), automatically generates recurring bill schedules (`expense_sources`) and 12 projected instances (`expense_events`) for all `BILL` categories. Monthly and annual bills are anchored to the 1st of the next calendar month (in AEST/Sydney) to prevent the Step 1 Immediate Due-Date Feasibility Guard from demanding full monthly funding from Day 1.
  - **Strict Add-Only Re-calibration Idempotency**: Re-running setup (`isRerun: true`) enforces Strict Add-Only schedule handling: existing bill schedules, customized due dates, and historical confirmed payment events are never overwritten, altered, or deleted; only newly introduced `BILL` categories without existing schedules generate new bill schedules.
  - **Australian Banking Archetypes**: Supports 3 household architectures: (1) Aussie 2-Account Blueprint (`AUSSIE_2_ACCOUNT`), (2) Couples Hybrid (`COUPLES_HYBRID`), and (3) All-in-One Virtual (`ALL_IN_ONE_CUSTOM`).
  - **60-Second Sub-Account Cheat Sheet**: In-app modal drawer detailing fee-free sub-account creation across CBA, Up, Macquarie, ING, and Big 4 banks in under 60 seconds.
  - **Safe 3-Step Re-calibration (`isRerun: true`)**: Skips the lifestyle quiz on re-runs to preserve customized user categories. If an active pool with positive balance ($> \$0.00$) is removed, triggers the Move Remaining Balance modal and atomically records balanced `TRANSFER_OUT` / `TRANSFER_IN` ledger records before soft-archiving the pool.

### 5.2 5-Step Waterfall Cascade Engine & Category Bucket Rules
- **Category Bucket Rules**:
  - **`EVERYDAY` & `BILL` (Bills)**: Managed at **overall pool level**. Category form modal (`CategoryFormModal.tsx`) captures **Target Budget Amount ($)** and **Frequency** (`Weekly`, `Fortnightly`, `Monthly`, `Annual`) matching the Setup Wizard, displaying a live calculated monthly target budget badge (`$X.XX/mo`). `BILL` (Bills) categories expose a read-only `listBillCoverageQuery` (budgeting capability) returning per-category `BillCoverageItem` coverage status (`COVERED` / `SHORT_BY` / `NO_SCHEDULE`). Status is derived from pool-level balance vs upcoming expense events due before next payday. No per-category envelope balances are stored.
  - **`GOAL` (Save Toward)**: Managed **individually per category** with dedicated target balances, target dates, and progress metrics. Goal sorting logic automatically places high-priority or nearest-term goals at the top.
- **Dynamic Paycheck Frequency Engine (`parseRruleFrequencyDays`)**: Automatically evaluates income source recurrence rules (`rrule`) to calculate allocation period days: `WEEKLY` (7 days), `FORTNIGHTLY` (14 days), `MONTHLY` (30 days), and `ANNUALLY`/`YEARLY` (365 days), ensuring prorated target calculations scale precisely with user income schedules.
- **Category UI Screen & Slide-Over Drawer**: Organized into 3 distinct sections (Everyday Spending [collapsible], Regular Bills [collapsible], Save Toward Goals). Clicking a category row triggers the Slide-Over Category Drawer showing past transaction history, upcoming scheduled occurrences, and mark paid/archive actions.
- **Universal Soft-Deletes**: All API routers enforce soft deletion (`archivedAt: new Date(), updatedAt: new Date(), updatedBy: ctx.userId`). Hard DELETE operations on operational entities are strictly banned.
- **Design Tokens & Confirmation Parity**: Serene Finance tokens (`#2563eb`, `#1B2B4B`, `#F7F8FA`, `#22c55e`, `#ba1a1a`) are universally applied; legacy teal (`#00B4A6`) is completely retired. All user actions (deletions, un-save, balance adjustments) standardize on `<ConfirmDialog />`.
- **Setup & Re-calibration Wizard Parity (Web & Mobile)**:
  - **Initial Setup (5 Steps, `totalSteps = 5`)**: Full walkthrough (1. Income Schedules $\rightarrow$ 2. Bank Accounts $\rightarrow$ 3. Goals & Commitments $\rightarrow$ 4. Lifestyle Quiz $\rightarrow$ 5. Review & Commit).
  - **Re-calibration Mode (`mode=rerun`) (3 Steps, `totalSteps = 3`)**: Streamlined draft-only re-calibration flow (1. Income Schedules $\rightarrow$ 2. Goals & Commitments $\rightarrow$ 3. Review & Commit). Skips Bank Accounts and Lifestyle Quiz to avoid overwriting existing bank account balances or custom user envelopes with default ABS estimates. All edits/removals across steps are held in client draft state and committed atomically on final Save.
  - **Database Pre-population**: In re-run mode, wizard hooks fetch existing records via tRPC (`listIncomeSources`, `listPools`), preserving existing `id`, `bankAccountId`, `fundingMode`, `enteredAmount`, `budgetFrequency`, `rrule`, `startDate`, `endDate`, `isPriority`, `isSurplusTarget`, `safetyBufferFloor`, and `generateEvents`.
  - **Automatic Balance Sweep on Envelope Archival**: Removing an envelope with balance $> \$0.00$ during re-calibration prompts a confirmation warning and, inside `saveSetupBudget` (`processSetupEnvelopes`), atomically sweeps the positive balance into the household Surplus Sweep Target (`isSurplusTarget: true`, falling back to the shared `EVERYDAY` envelope) via balanced `TRANSFER_OUT` / `TRANSFER_IN` ledger entries before soft-archiving the envelope.
  - **Event Lifecycle Standardization**: Archiving an Envelope or Income Schedule soft-archives the parent `envelopes` / `income_sources` row (`archivedAt: new Date()`) and hard-deletes (`DELETE FROM ... WHERE status = 'PENDING'`) all unperformed scheduled `expense_events` / `income_events`. Updating an existing schedule updates `status = 'PENDING'` events in-place when only name/amount changed, or hard-deletes `status = 'PENDING'` events and re-bursts from today forward when recurrence/schedule rules changed.
- **Universal Table Parity & Conditional Pagination**: Left-aligned names/text, center-aligned dates/badges/actions, right-aligned mono currency figures. Pagination (`<PaginationBar />`) conditionally displays only when record count $\ge 5$.
- **Pool Balance Adjustment Safeguards**: Pool balance adjustment modal enforces loading state and button lockout to prevent duplicate transactions from rapid double-clicking.
- **Application-wide Date Standardisation (`fmtDate`)**: Centralized date utility in `@money-matters/ui` (`fmtDate`) formatting all date strings into standard Australian format (`26 Aug 2026`) across Web tables.
1. **`IMMEDIATE DUE-DATE FEASIBILITY GUARD` (Step 1)**: Guarantees 100% funding for upcoming bills due on or before the next payday cutoff with a configurable lookahead buffer (`expectedDate <= nextPaydayCutoff + dueBufferDays`, default 3 calendar days). Prioritizes essential bills (`isEssential: true`, derived from child categories) first, then standard bills, ensuring rent/mortgage and utility direct debits never bounce due to weekend or public holiday payroll settlement lags.
2. **`DEFICIT REPAIR` (Step 2)**: Restores any overdrawn/negative pool balances (`currentBalance < 0`) to $0.00, ensuring bucket solvency and eliminating overdraft charges before discretionary spending or future savings commitments.
3. **`BILLS POOL SAFETY FLOOR CUSHION` (Step 3)**: If a regular bills pool has an explicit safety buffer floor (`safetyBufferFloor`, e.g. $200–$500 buffer cushion for utility rate spikes), the engine tops up any eroded cushion prior to funding long-term goals.
4. **`BASELINE EVERYDAY LIVING ALLOWANCE` (Step 4)**: Allocates cycle living allowance ($1/26$ fortnightly, $1/52$ weekly, $1/12$ monthly) to secure groceries, fuel, pharmacy, and daily transport BEFORE future sinking reserves and savings goals. In accordance with the Serene Finance Blended Zero-Friction model, discretionary everyday living expenses do not require manual ledger transaction logging. Instead, Everyday is governed by theoretical daily burn pacing ($R_{daily} = \text{cycleAllowance} / \text{daysInCycle}$) between paydays, with 1-click Bank Reconciliation dynamically absorbing variance. Supports rollover & accumulate on payday.
5. **`RESERVE SINKING FUNDS` (Step 5)**: Smoothly accrues pro-rata cycle targets for future bills due beyond the buffered next payday window using exact cycle factors: $1/26$ for fortnightly, $1/52$ for weekly, and $1/12$ for monthly paychecks. Only allocates the incremental delta above Step 1 & Step 3 funding.
6. **`COMMITTED GOALS` (Step 6)**: Prioritizes committed target-date savings goals sorted chronologically by target date. When target date is on or before next payday, allocates 100% of remaining gap; otherwise paces gap across remaining paychecks.
7. **`UNCOMMITTED GOALS & RESIDUAL SURPLUS SWEEP` (Step 7)**: Funds uncommitted goals and sweeps 100% of remaining residual cents into the designated surplus bucket (`isSurplusTarget === true`, e.g. Mortgage Offset or High-Yield Savings). Unallocated cash is strictly $0.00.

### 5.2.1 Payday Preview, Rolling Window & Persistence Resolution Hierarchy (`previewPaydayQuery`, `runCumulativeProjection`)
- **Unified Cumulative Waterfall Projection Engine (`runCumulativeProjection`)**: Centralized math utility (`packages/capabilities/budgeting/src/engine/cumulative-projection.ts`) consumed by both the Matrix Planning Grid (`computeMatrixProjection`) and the Dedicated Income Split Screen `/dashboard/income-split` (`previewPaydayQuery`). Sequentially projects pool balances starting from current ledger balances across all pending income events (`status !== 'CONFIRMED'`) sorted chronologically (`expectedDate` ASC, then `id` ASC for same-day determinism). Passes intermediate scheduled expense events into the Two-Horizon allocation engine.
- **Scheduled Expense Deduction & Pro-Rata Burn Cascade**: Between each simulated income event $i$ and $i+1$, any pending scheduled expenses (`status === 'PENDING'`) due in that date interval are subtracted from running pool balances. To prevent infinite balance accumulation for non-scheduled pools, `runCumulativeProjection` enforces two simulation safeguards:
  1. *EVERYDAY Pro-Rata Burn*: For `EVERYDAY` buckets, a daily burn rate `(monthlyTarget / 30) * daysUntilNext` is subtracted from `runningBalances` between paydays to simulate ongoing discretionary spending (groceries, transport, coffee), decaying balances back towards baseline without producing false negative balances.
  2. *BILL Anti-Runaway Cap with Wealth Conservation*: For `BILL` bill buckets, `runningBalances` carried forward are clamped to a ceiling of `1.5 * monthlyTarget`. Any trimmed excess is automatically swept directly into the designated Surplus Target pool, strictly conserving household wealth across the entire projection horizon.
- **12-Month Materialized Rolling Window (`maintainRollingWindow`)**: On login and event creation, `maintainRollingWindow` materializes 12 months of `PENDING` `income_events` using AEST timezone normalization (`Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' })`) to prevent off-by-one calendar bugs.
- **Schema Cascade Constraint**: `allocation_plans.incomeEventId` and `allocation_plan_lines.planId` enforce `.onDelete("cascade")`. Changing an income schedule in Setup cascade-deletes obsolete `allocation_plans` and `allocation_plan_lines` without manual script intervention. Restricts `DELETE` operations strictly to `WHERE status = 'PENDING'` to prevent destroying historical confirmed paydays.
- **Category-Unified Bill Schedules & Dual-Mode Goals**: For `BILL` bill envelopes, Category *is* the schedule. Creating or updating a Category in a Bills pool defines `startDate`, `endDate`, and recurrence `rrule`, automatically bursting 12 months of `expense_events` (`isScheduled: true`). Goals feature dual operating modes (`goalMode`: `'TARGET_DATE'` for target completion dates vs `'ONGOING'` for continuous monthly allocations). Legacy `expense_sources` table and procedures are eliminated. One-off expenses are scheduled directly as `expense_events` via `createOneOffExpense`.
- **Category Pool Immutability Constraint**: Once a Category is created and linked to a Pool, the `poolId` is strictly immutable to preserve historical reporting accuracy and prevent retroactive data shifts. If a user makes a mistake during setup, they must archive the category and create a new one.
- **Strict Schedule Recurrence Constraint**: Category bill schedules represent recurring commitments. Users schedule one-off non-recurring bills via the dedicated "Add One-off Expense" action (`createOneOffExpense`), inserting an atomic pending `expense_event` without recurring burst overhead.
- **Two-Tier Resolution Sequence**:
  1. *Priority 1 (Saved Plan)*: `previewPaydayQuery` queries `allocation_plans` for `incomeEventId`. If a saved plan exists (created via Grid/Screen *"Save"*), it returns the saved `allocation_plan_lines` from the database.
  2. *Priority 2 (Cumulative Engine Projection)*: If no saved plan exists (e.g. fresh income events or un-edited paydays), `previewPaydayQuery` executes `runCumulativeProjection` on-the-fly to return context-aware proposed allocations that factor in prior simulated income splits and intermediate expense deductions.
  - Across all return paths, `previewPaydayQuery` includes `incomeEvent.receivingAccountId` joining on `income_sources` to identify the originating deposit bank account for downstream transfer orchestration.
- **Bank-Account-Aware Payday Transfer Rollup Engine**:
  - Automatically compares each pool's assigned `bankAccountId` with `incomeEvent.receivingAccountId`.
  - Pools in the same bank account are marked as *Retained in source account* with $0 external transfers.
  - Pools targeting other bank accounts are rolled up into **1 single transfer per destination bank account**, computing aggregate totals and listing constituent pools for 1-click clipboard copying.
- **Immutable Confirmed Paydays & Client-Side Recalculation**: Confirmed payday allocation plans are strictly immutable in the database to preserve historical ledger integrity. In unconfirmed/draft views, clicking **Re-calculate** or **Reset** resets the client-side input form back to the engine's suggested allocation without database mutations.


### 5.3 Bank Account Balance Alignment & V2 Ingestion Architecture
- **Forward-Looking Architecture**: In alignment with Rule 13 ("Money Matters automates forward-looking payday allocation... NEVER describe the product as requiring daily tracking or micro-managing every dollar"), backward-looking CSV statement parsing is deferred to Release 2 (`V2_SCOPE.md`).
- **1-Click Bank Balance Alignment Engine (`@money-matters/capability-tenant`)**:
  - Web & Mobile balance reconciliation via `reconcileBankBalance` procedure.
  - Automatically compares actual bank balance against linked pool balance aggregates (`getPoolBalancesMap`), calculating exact surplus or shortfall.
  - Generates atomic `BALANCE_ADJUSTMENT` or `ACCOUNT_ALIGNMENT` ledger rows in `transaction_ledger` with zero transaction tagging overhead.
- **Zipped Full Tenant CSV Export (`exportTenantData`)**:
  - Secure tenant data backup bundling all relational entities (`categories.csv`, `income_sources.csv`, `expense_sources.csv`, `transaction_ledger.csv`, `bank_accounts.csv`, `allocation_plans.csv`) into a single zipped archive.

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

- **Payday Split Reset Architecture (`resetAllocationPlanCommand`)**:
  - tRPC mutation `resetAllocationPlan` (`privateTenantProcedure`) safely removes pending/saved allocation plans and plan lines for an income event, returning the studio and matrix views to automatic engine calculations (`AUTO`).
  - Mobile Split Pay studio and matrix columns feature a 1-tap "Reset" action to discard custom manual splits and restore algorithmic allocations.
- **Shared Mobile Parity Primitives (`@money-matters/ui/mobile`)**:
  - `GoalDelayCard`: Reusable component displaying impacted goals, delay days, and original vs new target completion dates.
  - `MobileCategoryDetailSheet`: 3-tab drawer (Categories, Upcoming Expenses with Mark Paid action, and Transaction History) shared across Split Pay, Matrix, and Pools.
  - `MobileMatrixFilterBar`: Segmented filter bar controlling Matrix status (All, Pending, Confirmed), scope (All, Shared, Private), and horizon (Next 5 vs 12 months).

### #### Bank Account Management
- **Navigation Bar Label:** "Bank Accounts" (externalized in i18n as `nav.accounts`).
- **Linked Pools:** Everyday, Bills, and Goal pools map 1-to-1 to primary bank accounts. Pools cannot be unchecked directly in account settings (users must re-assign a pool from another account).
- **Privacy Controls:** Marking an account Private or Shared triggers an amber confirmation warning dialog detailing partner visibility implications before state changes.
- **Unbudgeted Buffer / Reserved Funds:** Excluded from available spendable balance calculation (`Available = Current Balance − Reserved Funds`).

### 5.6 5-Level "Can We Afford This?" Engine (`@money-matters/capability-simulation`)
- **Unfunded Bill Shortfall Protection**: Queries `expenseEvents` where `status = 'PENDING'` and `expectedDate <= nextPaycheckDate`. Evaluates bills per BILL pool against pool balance to compute unfunded shortfall (`unfundedBillsShortfall`), preserving Everyday cash for bills that are already funded in their respective pools (`effectiveSpendable = max(0, everydayBalance - unfundedBillsShortfall)`). Bills are strictly non-negotiable.
- **Prorated Everyday Safe Cushion**: Computes `safeCushion = Math.round(dailyAllowance * 0.25 * daysUntilPayday)` where `dailyAllowance = everydayMonthlyAllowance / 30` (fallback $15 * days). Evaluated and displayed purely as total dollars remaining until payday vs recommended safe cushion, completely eliminating velocity/daily pace jargon ("$/day", "floor").
- **ONE-OFF Savings Goal Alternative ("What Gives")**: When a one-off purchase exceeds available Everyday cash (`amount > effectiveSpendable`), the engine checks uncommitted Savings Goals. If a flexible goal has sufficient balance, it computes the goal delay (`shortfall / dailyContrib`) and returns `goalAlternative` alongside the projected future paycycle income date (`WAIT_FOR_PAYCYCLE`).
- **RECURRING Commitment Simulation**:
  - **Budget-First Ongoing Evaluation**: Simulates 12-month forward horizon. Uncommitted goals absorb first, then committed goals (`GOAL_DELAYED`).
  - **Everyday 80% Minimum Allowance Protection**: Rejects any commitment that causes Everyday pool balance to drop negative or total Everyday allocation to drop below 80% of expected allowance over 12 months (`HARD_NO`).
  - **Day-1 Start Advice**: If the commitment fits the ongoing 12-month budget with goals giving, but Day-1 cash is short today (`amount > effectiveSpendable`), attaches clear start advice to wait until next payday without failing the overall budget verdict.
  - **Phantom Bucket Deficit Check (`HARD_NO`)**: Verifies `phantomFinalBalance >= -1`. Rejects commitments where projected 12-month income cannot fund essential obligations.
- **6-Branch Discriminated Union Matrix (`CanAffordVerdictDto`)**:
  - `SAFE_YES`: Cash available + remaining cash $\ge$ recommended safe cushion until payday.
  - `PACING_TIGHT`: Cash available, but leaves balance below recommended safe cushion until payday.
  - `BILLS_RISK`: Raw balance appears sufficient, but upcoming unfunded bills consume the funds. Itemizes bills due.
  - `WAIT_FOR_PAYCYCLE`: Future paycycle accumulates sufficient Everyday balance. Features `goalAlternative` if flexible savings exist today.
  - `GOAL_DELAYED`: Recurring item is affordable ongoing, but delays savings goal target dates. Includes `startAdvice` if Day-1 cash is low.
  - `HARD_NO`: Purchase exceeds 12-month forecast horizon, creates a deficit, or starves Everyday essentials below 80%.
- **Human-Centric Trust Copy**: All user rationale steps are rendered in plain English (`Leaves you with $X until payday`, `Recommended safe cushion: $Y`, `All upcoming bills are 100% covered`). Zero references to velocity or daily pacing floors.

### 5.7 Stripe Billing, Synchronous Verification & Trial Lifecycle (`@money-matters/capability-billing`)
- **Decoupled Capability Architecture**: Stripe Checkout (`createCheckoutSessionCommand`), Synchronous Verification (`verifyCheckoutSessionCommand`), On-Demand Sync (`syncSubscriptionCommand`), Invoices Query (`listInvoicesQuery`), Customer Portal (`createCustomerPortalSessionCommand`), and Webhooks (`handleStripeWebhook`) isolated inside `packages/capabilities/billing`.
- **Dynamic Australian Payment Methods**: Checkout sessions configure AUD billing ($9.95/mo or $89/yr) with dynamic payment methods enabled (omitting restrictive `payment_method_types` arrays to automatically present Visa, Mastercard, AMEX, Apple Pay, Google Pay, and Link).
- **Synchronous Post-Checkout Verification**: `/subscription/success` captures `{CHECKOUT_SESSION_ID}` and calls `billing.verifyCheckoutSession` mutation, instantly validating payment status against Stripe API, updating tenant to `SUBSCRIBED`, recording the initial paid invoice in `billing_invoices`, and busting client-side tRPC query caches so the trial badge disappears synchronously without polling delay.
- **On-Demand Subscription & Invoice Synchronization (`syncSubscriptionCommand`)**: When returning from the Stripe Customer Portal (`?tab=account-data&stripe_sync=true`) or clicking manual refresh (`↻`), the server directly reconciles active subscriptions, cancellation flags, and the 10 most recent invoices with PDF download links from the Stripe API, eliminating webhook delivery latency and local development blindness.
- **Cryptographic Signature Verification & Webhook Resilience**: Webhook handler (`POST /webhooks/stripe`) validates raw body signatures via `stripe.webhooks.constructEvent` with idempotency guards and multi-vector tenant resolution (`metadata.tenantId` $\rightarrow$ `stripeCustomerId` $\rightarrow$ `stripeSubscriptionId` fallback) to prevent silent drops when events originate from the Customer Portal:
  - `customer.subscription.updated`: Synchronizes `cancelAtPeriodEnd`, `subscriptionEndsAt`, `nextBillingAt`, `planType`, `stripePriceId`, and `subscriptionStatus` (`SUBSCRIBED`, `PAST_DUE`, or `TRIAL_EXPIRED`). Retains dashboard access during canceled grace periods.
  - `invoice.payment_succeeded`: Inserts paid receipt in `billing_invoices` and triggers `activateSubscriptionCommand`, resetting `subscriptionStatus = 'SUBSCRIBED'` and `premiumEnabled = true`.
  - `invoice.payment_failed`: Inserts failed record in `billing_invoices`, triggers `deactivateTenantCommand` setting `subscriptionStatus = 'PAST_DUE'` and populating 7-day `trialGraceEndsAt` timestamp.
  - `customer.subscription.deleted`: Marks tenant as `TRIAL_EXPIRED` immediately upon period termination.
- **Scheduled Cancellation & 1-Click Resumption**: When `cancelAtPeriodEnd = true`, the UI surfaces an amber reassurance card confirming billing has stopped, showing the exact access expiration date, and offering a direct `[Resume Plan ↗]` button that redirects to the portal where users can undo cancellation in 1 click.
- **Advance Renewal Notice**: When within 7 days of recurring billing, Settings surfaces an advance renewal banner outlining the upcoming charge date.
- **Daily Background Sweeper (Release 2)**: To guarantee 100% mathematical certainty against edge-case state drift from unhandled network partitions or dropped webhooks, Release 2 introduces a daily 3:00 AM AEST Inngest reconciliation cron (`reconcile-stripe-subscriptions`, feature `FEAT-V2-004-STRIPE-RECONCILIATION-SWEEPER`) that reconciles active subscribers directly against the Stripe API.
- **Automated Grace Period & Expiration Architecture**:
  - `getSubscriptionStatus` Query Check $\rightarrow$ Evaluates trial timelines: Days 1–60 return `TRIALING`. Days 61–67 enter `TRIAL_GRACE` (7-day read-only grace period). Day 68+ returns `TRIAL_EXPIRED` hard paywall lockdown.
  - **Isolated Holding Screen (`/subscription/expired`)**: Hard-blocks access to `/dashboard/*` when `subscriptionStatus === 'TRIAL_EXPIRED'`. Provides isolated Upgrade CTA, full zipped CSV data export via `exportTenantData`, and sign-out actions.
  - **Multi-Tenant & Email Trial Abuse Prevention**: Strict single active owned household per user (`tenant_users.role === 'OWNER'`). When creating a new tenant, `createTenantHandler` verifies `hasUsedTrial === true` for the active user ID and performs a case-insensitive check across existing users matching `lower(email)`. If any matching account has already utilized a trial, newly created households immediately initialize with `subscriptionStatus = 'TRIAL_EXPIRED'` with nullified trial dates.
  - **Full Mobile Parity for Subscriptions & Feedback**: Mobile app matches web parity 100% across Data & Subscription (status card with manual sync, cancel callout with resume action, invoice history with hosted/PDF download, and full plan picker modal with Founding Member rate) and Settings Feedback ("Provide Feedback" dialog with auto-derived system diagnostics routed to `info@moneymatters.kaesava.au`).
- **Billing Ledger Schema (`billing_invoices`)**: Dedicated table tracking `id`, `tenantId`, `stripeInvoiceId`, `amountPaid`, `currency`, `status`, `invoicePdfUrl`, `hostedInvoiceUrl`, `periodStart`, `periodEnd`, and `createdAt` with foreign key indexes and multi-tenant RLS scoping.


### 5.8 Database & Network Optimization Standards

- **Timezone-Aware Formatting**: All dates are stored in UTC within the database. The presentation layer dynamically formats dates using the user's selected `locale` and `timezone` from `user_preferences`, injected via `LocaleProvider` (Web) and `setMobileLocaleConfig` (Mobile). The shared `fmtDate`, `fmtDateMedium`, and `fmtDateIso` utilities in `@money-matters/ui` are the single source of truth for all date rendering. YYYY-MM-DD date strings from the DB are parsed at noon UTC (`Date.UTC(y, m, d, 12)`) to prevent calendar date off-by-one errors across all timezones (UTC-11 to UTC+12).
- **tRPC/Auth Proxy Logging Guards**: Client & Server Log Scrubbing is strictly enforced. Auth tokens, JWT credentials, and PII must never be emitted to stdout/stderr via `console.log`. Logger abstractions automatically sanitize sensitive fields in the tRPC and auth proxy paths.
- **Zipped CSV Data Export Engine**: The `exportTenantData` capability securely generates all entity CSV files (`categories.csv`, `income_sources.csv`, `expense_sources.csv`, `transaction_ledger.csv`, `bank_accounts.csv`, `allocation_plans.csv`). On the web client, files are bundled using `JSZip` into a single `.zip` archive (`money-matters-export-YYYY-MM-DD.zip`), preventing browser multi-download blocking while enforcing stealth privacy (only shared data + current user's private records exported).
- **Settings & History Tabbed Navigation**: Settings is organized into a 3-tab layout (`Profile`, `Household`, `Account & Data`) with container width expanded to `max-w-5xl`. History (`/dashboard/history`) is organized into a 2-tab layout (`Transactions` ledger & `Payday Allocations` audit history). In the Transactions ledger, amounts strictly follow color conventions based on flow direction: positive credits (`+`) are green (`text-emerald-600 dark:text-emerald-400`) and negative debits (`-`) are red (`text-rose-600 dark:text-rose-400`), across all transaction types including transfers.
- **Modal Dialog Portaling**: All modal dialogs (`ModalDialog`, `ConfirmDialog`) use `createPortal(..., document.body)` with client mount guards to break out of parent CSS stacking contexts and `backdrop-filter` containing blocks, guaranteeing consistent full-screen dark backdrops and centered modal presentation.
- **Bulk Database Operations (Anti-N+1)**: All database writes and queries must be batched. Individual inserts or queries in loops are forbidden. Plan lines and ledger entries are prepared in-memory and written in bulk. Deletions and status transitions must use `inArray` operators (e.g. archiving category arrays or deleting account relations) to prevent query waterfalls.
- **Parallelized Network Operations**: Onboarding configurations (e.g., category setup or schedule target insertions) and `reSetupBudget` category updates execute mutations concurrently using batch wrappers (`Promise.all`), preventing sequential async waterfalls.
- **Strict Whitelisted CORS**: Cross-origin resource sharing (CORS) is restricted to whitelisted domains (`*.kaesava.au` and dev `localhost`). Global wildcards (`origin: true`) are explicitly banned.
- **Predictable Unique ID Generation**: UI components generating HTML accessibility IDs must use React's `useId()` hook to avoid hydration mismatches and insecure random string generation.
- **Client & Server Log Scrubbing**: Auth tokens, JWT credentials, and PII must never be emitted to stdout/stderr via `console.log`. Logger abstractions automatically sanitize sensitive fields.

### 5.9 Typed Feature Flags, Kill Switches & Strict DB Typing Standards
- **Typed Feature Flags (`@money-matters/config`)**: All feature flags implement `FeatureFlag` with typed expiry, owner, tenant scoping, and mandatory `killSwitchEnabled: boolean`. When `killSwitchEnabled === true`, `isFeatureEnabled()` immediately disables the capability globally regardless of user rollout percentages.
- **Application Feature Flags & Entitlements (`apps.feature_flags`)**: Validated via strict Zod schema `AppFeatureFlagsSchema` (`@money-matters/types`) and resolved through `useAppFeatures()` on both Web and Mobile platforms:
  - `fileNotes`: Controls file attachment notes on transactions and bank accounts.
  - `askPenny`: Controls Penny AI assistant availability, command palette prompts, and query execution.
  - `privateMode`: Controls stealth personal privacy isolation and partner invitations (`hasPartnerInvites: Boolean(features.privateMode)`). When disabled, partner invites and private envelope tagging are gated.
  - `simulation`: Controls the "Can I Afford It?" Purchase Simulator. When disabled, the Afford Check button, route `/dashboard/afford-check`, Command Palette prompt, and assistant prefill are suppressed, and tRPC `simulation.canAfford` query throws `TRPCError FORBIDDEN`. Onboarding product tour steps dynamically recalculate (7 steps vs 8 steps) to skip afford-check cleanly.
  - `customAllocationRules`: Controls user customization of payday allocation waterfall rules. When disabled, standard strategy presets (`BALANCED`, `BILLS_FORTRESS`, `PAY_YOURSELF_FIRST`) remain fully functional, but custom rule steps editing, the 4th "Custom" preset card, and the `/dashboard/settings/allocation-rules` sub-page are hidden and guarded with `TRPCError FORBIDDEN` on `updateAllocationStrategySteps`.
- **Auth Toggle & Downtime Early Access Flow (`NEXT_PUBLIC_ENABLE_AUTH`)**: When set to `"false"`, `middleware.ts` intercepts all authenticated and sign-in routes and redirects to `/?early_access=true`. The landing page automatically displays `EarlyAccessModal`, allowing prospective or returning users to submit their email via public tRPC procedure `subscribeEarlyAccess` (upserting to `early_access_subscribers`) to be notified when the platform resumes operations.
- **Strict Database Typing (`DbOrTx`)**: Zero `any` policy enforced across all capability command and query signatures. All capability handlers receive strict `DbOrTx` (`DbClient | DbTransaction`) without default client injection parameters, guaranteeing deterministic transactional boundaries and full type safety.

### 5.10 App Versioning Architecture, Database Schema & Diagnostics
- **Independent App SemVer**: Apps (`apps/web`, `apps/mobile`) follow independent Semantic Versioning (`MAJOR.MINOR.PATCH-PRERELEASE`) managed automatically via `pnpm version:bump`.
- **Version Diagnostics Resolver**: `getWebVersionInfo()` (`apps/web/src/lib/version.ts`) and `getMobileVersionInfo()` (`apps/mobile/src/lib/version.ts`) construct `AppVersionInfo` DTOs containing version string, build number, channel (`development` | `preview` | `beta` | `production`), git commit hash, and target platform.
- **Static Build-Time Versioning (no DB table)**: App versioning is managed entirely via build-time environment variables (`NEXT_PUBLIC_APP_VERSION`, `NEXT_PUBLIC_BUILD_NUMBER`, `NEXT_PUBLIC_RELEASE_CHANNEL`, `NEXT_PUBLIC_GIT_COMMIT` for Web; `EXPO_PUBLIC_*` equivalents for Mobile resolved via `expo-constants`). The `app_versions` database table was removed as it was never read or written by any running capability. Version info is constructed at runtime by `getWebVersionInfo()` / `getMobileVersionInfo()` and exposed as `AppVersionInfo` DTOs.
- **Bug Report Diagnostics Integration**: Bug report creation capability (`createBugReportHandler`) logs and stores dynamic app version strings and client environment metadata for rapid support debugging.
- **Automated Release Script (`scripts/version-bump.mjs`)**: CLI script callable via `pnpm version:bump` allowing automated version bumping (`patch`, `minor`, `major`, `beta`) across package manifests and Expo configs, staging standard Git release commits.


---

## 6. CI/CD & Deployment Strategy

- **Production Deployment**: Cloudflare Workers via Wrangler.
  - Web: `@opennextjs/cloudflare` (`moneymatters.kaesava.au`)
  - API: Fastify on Cloudflare Workers (`api.moneymatters.kaesava.au`)
- **Automated Workflows (`.github/workflows/`)**:
  - `ci.yml`: Runs on PR and push to `main` (Security scan `pnpm audit --audit-level=high`, i18n validation `pnpm check-i18n`, Typecheck, Lint, Vitest unit tests, Turbo build).
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
| **Inngest Cloud** | Async Workflows & Release 1 Weekly Email Cron | `.env` (`INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`), `/api/inngest` | **READY** (Production signing key & background event dispatch; mobile push crons staged for Release 2) | Local Inngest CLI (`pnpm run dev:inngest`) |
| **Stripe API** | Subscriptions, Billing & Webhooks | `.env` / Platform Secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`, `STRIPE_PRICE_FOUNDING_ANNUAL`, `NEXT_PUBLIC_ENABLE_FOUNDING_OFFER`) | **READY** (Raw signature validation, 7-day read-only grace period, and strict `planType` checkout routing) | Vitest mock handlers / Test mode price IDs |
| **Sentry SaaS** | APM & Exception Tracking | `.env` (`SENTRY_DSN`), `next.config.ts`, `sentry.*.config.ts` | **READY** (Integrated across Fastify API, Next.js Web, Expo Mobile) | Gated to production builds (`NODE_ENV === 'production'`) |
| **PostHog SaaS** | Product Analytics & Feature Flags | `.env` (`POSTHOG_API_KEY`, `POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`) | **READY** (Integrated across Fastify API, Next.js Web, Expo Mobile) | Safe null-logger fallback in development |

| **Expo & Expo Push** | Mobile App & Native Push Notifications | `apps/mobile`, `device_tokens` DB table, `https://exp.host/--/api/v2/push/send` | **READY** (Android Native Target SDK 54 / RN 0.81.5) | Expo Go / Android Emulator |
| **Photon (Komoot OSM)** | Public Geocoding | Public Service (`https://photon.komoot.io`) | **READY** (Zero-config public API, no keys required) | Public API fallback |
| **Monorepo Tools** | pnpm 9, Turbo 2, TypeScript 6, Vitest 4, ESLint 9 | `package.json`, `pnpm-workspace.yaml`, `turbo.json` | **READY** (100% strict type safety & Vitest unit tests) | Local turbo build & test pipelines |

---

## 9. Complete tRPC Routers and Procedures Registry (12 Routers, 103 Procedures)

> **Cross-Reference (Zero Redundancy):**  
> All Web routes, Mobile routes, Modals/Drawers/Confirm Dialogs, Screen-by-Screen Parity mappings, `@money-matters/ui` primitives, and `@money-matters/i18n` dictionary namespaces are documented in [FUNCTIONAL_CAPABILITIES_INVENTORY.md](file:///home/kaesava/projects/money-matters/FUNCTIONAL_CAPABILITIES_INVENTORY.md).  
> **Procedure Guard Legend:**
> - `publicProcedure`: Unauthenticated; sets `app.current_tenant_id = ''` and `app.current_user_id = ''`.
> - `authenticatedProcedure`: Requires Neon Auth session (`ctx.userId`); sets `app.current_user_id = ctx.userId`.
> - `tenantProcedure`: Requires `ctx.userId` and `ctx.tenantId`; sets `app.current_tenant_id = ctx.tenantId` and `app.current_user_id = ''`.
> - `ownerProcedure`: `tenantProcedure` + checks `ctx.role === 'OWNER'`.
> - `privateTenantProcedure`: Requires `ctx.userId` and `ctx.tenantId`; sets **both** `app.current_tenant_id = ctx.tenantId` and `app.current_user_id = ctx.userId` for stealth privacy RLS.
> - `privateOwnerProcedure`: `privateTenantProcedure` + checks `ctx.role === 'OWNER'`.

### 9.1 Root Router (`apps/api/src/routers/index.ts` — 3 Top-Level Procedures)

| Procedure | Line | Type | Write / Flag Guard | Input Schema (`.strict()`?) | Output Schema | Capability / DB Tables |
| :--- | ---: | :--- | :--- | :--- | :--- | :--- |
| `health` | 26 | `publicProcedure` | None | None | None | None (`{ status: 'ok', timestamp }`) |
| `getAppConfig` | 30 | `publicProcedure` | None | `z.object({ appId: z.string().uuid().optional() }).optional()` | None | `apps` (`featureFlags` lookup) |
| `submitFeedback` | `bug-reports.router.ts:5` | `privateTenantProcedure` | None | `SubmitFeedbackInputSchema` (`.strict()`) | None | `submitFeedbackCommand` (`bugReports`), `sendEmail` (`@money-matters/core`) |

### 9.2 `tenant` Router (`apps/api/src/routers/tenant.router.ts` + `apps/api/src/routers/tenant/*.procedures.ts` — 29 Procedures)

| Procedure | File & Line | Type | Write / Flag Guard | Input Schema (`.strict()`?) | Output Schema | Capability / DB Tables |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `tenant.createTenant` | `tenant-core.procedures.ts:18` | `authenticatedProcedure` | None | `CreateTenantCommand` (`.strict()`) | None | `createTenantHandler` (`apps`, `users`, `tenants`, `tenantUsers`, `userPreferences`, `bankAccounts`, `allocationStrategies`, `allocationStrategySteps`), `inngest.send('auth/user.signup')` |
| `tenant.completeSetup` | `tenant-core.procedures.ts:57` | `privateOwnerProcedure` | `requiresWriteAccess` | `z.object({ completed: z.boolean().default(true) }).strict()` | None | `tenants`, `bankAccounts`, `incomeSources`, `envelopes`, `inngest.send('onboarding/setup.completed')` |
| `tenant.cancelSetup` | `tenant-core.procedures.ts:103` | `privateOwnerProcedure` | None | None | None | `cancelSetupHandler` (`tenants`) |
| `tenant.getTenant` | `tenant-core.procedures.ts:110` | `tenantProcedure` | None | None | None | `getTenantHandler` (`tenants`) |
| `tenant.exportMyData` | `tenant-core.procedures.ts:116` | `privateTenantProcedure` | None | None | None | `exportDataHandler` (`tenants`, `users`, `userPreferences`, `tenantUsers`, `bankAccounts`, `envelopes`, `incomeSources`, `incomeEvents`, `expenseEvents`, `allocationPlans`, `transactionLedger`) |
| `tenant.deleteMyAccount` | `tenant-core.procedures.ts:121` | `authenticatedProcedure` | None | `z.object({ confirmText: z.literal("DELETE") }).strict()` | None | `deleteMyAccountHandler` (20+ tables + `neon_auth`), `inngest.send('auth/account.deleted')` |
| `tenant.getMyTenants` | `tenant-core.procedures.ts:137` | `authenticatedProcedure` | None | None | None | `tenantUsers`, `tenants` |
| `tenant.switchTenant` | `tenant-core.procedures.ts:165` | `authenticatedProcedure` | None | `z.object({ tenantId: z.string().uuid() }).strict()` | None | `tenantUsers` |
| `tenant.subscribeEarlyAccess` | `tenant-core.procedures.ts:187` | `publicProcedure` | None | `z.object({ email: z.string().email() }).strict()` | None | `earlyAccessSubscribers` |
| `tenant.getUserPreferences` | `profile.procedures.ts:9` | `privateTenantProcedure` | None | None | None | `userPreferences`, `tenantUserPreferences`, `tenants` |
| `tenant.updateUserPreferences` | `profile.procedures.ts:70` | `privateTenantProcedure` | `requiresWriteAccess` | Inline `z.object({...}).strict()` | None | `userPreferences`, `tenantUserPreferences` |
| `tenant.getUserProfile` | `profile.procedures.ts:146` | `authenticatedProcedure` | None | None | None | `users`, `userPreferences`, `tenants` |
| `tenant.updateUserProfile` | `profile.procedures.ts:192` | `authenticatedProcedure` | None | Inline `z.object({...}).strict()` | None | `users`, `neon_auth.user`, `userPreferences` |
| `tenant.createBankAccount` | `bank-accounts.procedures.ts:19` | `privateTenantProcedure` | `requiresWriteAccess` | `CreateBankAccountCommand` (`.strict()`) | None | `createBankAccountHandler` (`bankAccounts`) |
| `tenant.updateBankAccount` | `bank-accounts.procedures.ts:39` | `privateTenantProcedure` | `requiresWriteAccess` | `z.object({ accountId: uuid, data: UpdateBankAccountCommand }).strict()` | None | `updateBankAccountHandler` (`bankAccounts`) |
| `tenant.archiveBankAccount` | `bank-accounts.procedures.ts:50` | `privateTenantProcedure` | `requiresWriteAccess` | `z.object({ accountId: uuid }).strict()` | None | `archiveBankAccountHandler` (`bankAccounts`, `envelopes`, `incomeSources`) |
| `tenant.getBankAccounts` | `bank-accounts.procedures.ts:59` | `privateTenantProcedure` | None | None | None | `getBankAccountsWithMappingsHandler` (`bankAccounts`, `envelopes`, `incomeSources`, `transactionLedger`) |
| `tenant.getBankAccountDeleteImpact` | `bank-accounts.procedures.ts:65` | `privateTenantProcedure` | None | `z.object({ accountId: uuid }).strict()` | None | `bankAccounts`, `envelopes`, `listEnvelopesQuery` |
| `tenant.reconcileBankBalance` | `bank-accounts.procedures.ts:119` | `privateTenantProcedure` | `requiresWriteAccess` | Inline `z.object({...}).strict()` | None | `bankAccounts`, `transactionLedger` |
| `tenant.getLeaveHouseholdStatus` | `household.procedures.ts:69` | `privateTenantProcedure` | None | None | None | `tenantUsers`, `users`, `tenants`, `bankAccounts`, `envelopes` |
| `tenant.invitePartner` | `household.procedures.ts:137` | `ownerProcedure` | `requiresWriteAccess` | `z.object({ email: z.string().email() }).strict()` | None | `invitePartnerHandler` (`tenants`, `tenantUsers`, `users`), `sendEmail`, `inngest.send('household/partner.invited')` |
| `tenant.revokeInvite` | `household.procedures.ts:212` | `ownerProcedure` | `requiresWriteAccess` | `z.object({ inviteId: uuid }).strict()` | None | `tenantUsers` |
| `tenant.getInviteDetails` | `household.procedures.ts:231` | `publicProcedure` | None | `z.object({ token: z.string() }).strict()` | None | `tenantUsers`, `tenants`, `users`, `apps` |
| `tenant.acceptInvite` | `household.procedures.ts:276` | `authenticatedProcedure` | None | `z.object({ token: z.string() }).strict()` | None | `acceptInviteHandler` (`tenantUsers`, `users`) |
| `tenant.leaveHousehold` | `household.procedures.ts:292` | `privateTenantProcedure` | None | `z.object({ confirmText: z.string(), newOwnerUserId: uuid.optional() }).strict()` | None | `leaveTenantHandler` (`tenantUsers`, `users`, `envelopes`, `bankAccounts`, `incomeSources`, `allocationStrategies`, `fileNotes`) |
| `tenant.getHouseholdMembers` | `household.procedures.ts:303` | `tenantProcedure` | None | None | None | `tenantUsers`, `users` |
| `tenant.updateHouseholdSettings` | `household.procedures.ts:320` | `ownerProcedure` | None | Inline `z.object({...}).strict()` | None | `tenantUsers`, `tenants` |
| `tenant.updateHouseholdMemberRole` | `household.procedures.ts:366` | `privateOwnerProcedure` | `requiresWriteAccess` | `UpdateHouseholdMemberRoleCommand` (`.strict()`) | None | `updateHouseholdMemberRoleHandler` (`tenantUsers`) |

### 9.3 `envelopes` Router (`apps/api/src/routers/envelopes.router.ts` — 16 Procedures: 10 Canonical + 6 Deprecated `*Pool*` Aliases)

| Procedure | Line | Type | Write / Flag Guard | Input Schema (`.strict()`?) | Output Schema | Capability / DB Tables |
| :--- | ---: | :--- | :--- | :--- | :--- | :--- |
| `envelopes.listEnvelopes` | 35 | `privateTenantProcedure` | None | None | None | `listEnvelopesQuery` (`envelopes`, `bankAccounts`, `expenseEvents`, `transactionLedger`) |
| `envelopes.createEnvelope` | 40 | `privateTenantProcedure` | `requiresWriteAccess` | `CreateEnvelopeCommandSchema` (`.strict()`) | None | `createEnvelopeCommand` (`envelopes`, `bankAccounts`, `expenseEvents`) |
| `envelopes.updateEnvelope` | 57 | `privateTenantProcedure` | `requiresWriteAccess` | `UpdateEnvelopeCommandSchema` (`.strict()`) | None | `updateEnvelopeCommand` (`envelopes`, `bankAccounts`, `expenseEvents`) |
| `envelopes.archiveEnvelope` | 62 | `privateTenantProcedure` | `requiresWriteAccess` | `ArchiveEnvelopeCommandSchema` (`.strict()`) | None | `archiveEnvelopeCommand` (`envelopes`, `expenseEvents`, `transferEvents`, `allocationStrategySteps`) |
| `envelopes.listArchivedItems` | 67 | `privateTenantProcedure` | None | None | None | `listArchivedItemsQuery` (`envelopes`, `incomeSources`, `bankAccounts`) |
| `envelopes.restoreArchivedItem` | 75 | `privateTenantProcedure` | `requiresWriteAccess` | `RestoreItemCommand` (`.strict()`) | None | `restoreItemCommand` (`envelopes`, `incomeSources`, `bankAccounts`, `apps`) |
| `envelopes.getEnvelopeRuleChangeImpact` | 88 | `privateTenantProcedure` | None | `z.object({ envelopeId: uuid, fromDate: z.string().optional() }).strict()` | None | `getEnvelopeRuleChangeImpactQuery` (`expenseEvents`) |
| `envelopes.getProjectedEnvelopeBalances` | 101 | `privateTenantProcedure` | None | `GetProjectedEnvelopeBalancesQuerySchema` (`.strict()`) | None | `getProjectedEnvelopeBalancesQuery` (`envelopes`, `incomeEvents`, `expenseEvents`, `allocationPlans`, `allocationPlanLines`) |
| `envelopes.getHomeSummary` | 113 | `privateTenantProcedure` | None | None | None | `getHomeSummaryQuery` (`envelopes`, `bankAccounts`, `incomeEvents`, `expenseEvents`, `transferEvents`, `allocationPlans`, `transactionLedger`) |
| `envelopes.saveSetupBudget` | 124 | `privateOwnerProcedure` | `requiresWriteAccess` | `SaveSetupBudgetInputSchema` (`.strict()`) | None | `saveSetupBudget` (`tenants`, `bankAccounts`, `incomeSources`, `incomeEvents`, `envelopes`, `expenseEvents`, `allocationStrategies`, `allocationStrategySteps`, `transactionLedger`) |
| `envelopes.listPools` / `createPool` / `updatePool` / `archivePool` / `getPoolRuleChangeImpact` / `getProjectedPoolBalances` | 145–195 | `privateTenantProcedure` | Same as canonical | Same as canonical | None | Deprecated compatibility aliases delegating to canonical `*Envelope*` handlers |

### 9.4 `income` Router (`apps/api/src/routers/income.router.ts` + `apps/api/src/routers/income/*.procedures.ts` — 12 Procedures)

| Procedure | File & Line | Type | Write / Flag Guard | Input Schema (`.strict()`?) | Output Schema | Capability / DB Tables |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `income.createIncomeSource` | `income-sources.procedures.ts:11` | `privateTenantProcedure` | `requiresWriteAccess` | Inline `z.object({...}).strict()` | None | `bankAccounts`, `incomeSources`, `tenants`, `incomeEvents`, `burstIncomeEvents` |
| `income.listIncomeEventsBySource` | `income-sources.procedures.ts:183` | `privateTenantProcedure` | None | `z.object({ incomeSourceId: uuid }).strict()` | None | `incomeSources`, `bankAccounts`, `incomeEvents` |
| `income.getIncomeSourceRuleChangeImpact` | `income-sources.procedures.ts:227` | `privateTenantProcedure` | None | `z.object({ id: uuid, fromDate: z.string().optional() }).strict()` | None | `incomeSources`, `bankAccounts`, `incomeEvents` |
| `income.updateIncomeSource` | `income-sources.procedures.ts:276` | `privateTenantProcedure` | `requiresWriteAccess` | Inline `z.object({ id: uuid, confirmReset: bool, data: z.object({...}).strict() }).strict()` | None | `incomeSources`, `bankAccounts`, `incomeEvents`, `tenants`, `burstIncomeEvents` |
| `income.listIncomeSources` | `income-sources.procedures.ts:439` | `privateTenantProcedure` | None | None | None | `incomeSources`, `bankAccounts` |
| `income.createIncomeEvent` | `income-events.procedures.ts:9` | `privateTenantProcedure` | `requiresWriteAccess` | `CreateIncomeEventCommand` (`.strict()`) | None | `incomeSources`, `bankAccounts`, `incomeEvents` |
| `income.listUpcomingIncomeEvents` | `income-events.procedures.ts:81` | `privateTenantProcedure` | None | None | None | `incomeEvents`, `incomeSources`, `bankAccounts` |
| `income.listIncomeEvents` | `income-events.procedures.ts:144` | `privateTenantProcedure` | None | None | None | `incomeEvents`, `incomeSources`, `bankAccounts` |
| `income.updateIncomeEvent` | `income-events.procedures.ts:199` | `privateTenantProcedure` | `requiresWriteAccess` | Inline `z.object({...}).strict()` | None | `incomeEvents`, `incomeSources`, `bankAccounts` |
| `income.markIncomeReceived` | `income-events.procedures.ts:255` | `privateTenantProcedure` | `requiresWriteAccess` | Inline `z.object({...}).strict()` | None | `incomeEvents`, `incomeSources`, `bankAccounts` |
| `income.deleteIncomeEvent` | `income-events.procedures.ts:317` | `privateTenantProcedure` | `requiresWriteAccess` | `z.object({ eventId: uuid }).strict()` | None | `incomeEvents`, `incomeSources`, `bankAccounts` |
| `income.archiveIncomeSource` | `income-lifecycle.procedures.ts:7` | `privateTenantProcedure` | `requiresWriteAccess` | `z.object({ id: uuid }).strict()` | None | `incomeSources`, `bankAccounts`, `incomeEvents` |

### 9.5 `expenses` Router (`apps/api/src/routers/expenses.router.ts` — 4 Procedures)

| Procedure | Line | Type | Write / Flag Guard | Input Schema (`.strict()`?) | Output Schema | Capability / DB Tables |
| :--- | ---: | :--- | :--- | :--- | :--- | :--- |
| `expenses.createExpenseEvent` | 15 | `privateTenantProcedure` | `requiresWriteAccess` | Inline `z.object({...}).strict()` | None | `envelopes`, `expenseEvents` |
| `expenses.listExpenseEventsByEnvelope` | 91 | `privateTenantProcedure` | None | `z.object({ envelopeId: uuid.optional(), categoryId: uuid.optional() }).strict()` | None | `envelopes`, `expenseEvents` |
| `expenses.listExpenseEventsByCategory` (deprecated alias) | 145 | `privateTenantProcedure` | None | `z.object({ categoryId: uuid }).strict()` | None | `envelopes`, `expenseEvents` |
| `expenses.listUpcomingExpenseEvents` | 184 | `privateTenantProcedure` | None | None | None | `expenseEvents`, `envelopes` |

### 9.6 `payday` Router (`apps/api/src/routers/payday.router.ts` + `apps/api/src/routers/payday/*.procedures.ts` — 16 Procedures)

| Procedure | File & Line | Type | Write / Flag Guard | Input Schema (`.strict()`?) | Output Schema | Capability / DB Tables |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `payday.resetAllocationPlan` | `payday-execution.procedures.ts:20` | `privateTenantProcedure` | `requiresWriteAccess` | `z.object({ incomeEventId: uuid }).strict()` | None | `incomeEvents`, `incomeSources`, `bankAccounts`, `resetAllocationPlanCommand` (`allocationPlans`, `allocationPlanLines`) |
| `payday.confirmPayday` | `payday-execution.procedures.ts:59` | `privateTenantProcedure` | `requiresWriteAccess` | `ConfirmPaydayCommand` (`.strict()`) | None | `incomeEvents`, `incomeSources`, `bankAccounts`, `runAllocationCommand` (`allocationPlans`, `allocationPlanLines`, `transactionLedger`, `envelopes`, `expenseEvents`) |
| `payday.previewPayday` | `payday-execution.procedures.ts:116` | `privateTenantProcedure` | None | `z.object({ incomeEventId: uuid, overrideAmount: z.string().optional() }).strict()` | None | `incomeEvents`, `incomeSources`, `bankAccounts`, `previewPaydayQuery` |
| `payday.listConfirmedAllocations` | `payday-execution.procedures.ts:163` | `privateTenantProcedure` | None | None | None | `allocationPlans`, `incomeEvents`, `incomeSources`, `bankAccounts`, `allocationPlanLines`, `envelopes` |
| `payday.getIncomeSplitAnalytics` | `payday-execution.procedures.ts:236` | `privateTenantProcedure` | `apps.featureFlags.reports` | `GetIncomeSplitAnalyticsQuerySchema` (`.strict()`) | None | `apps`, `getIncomeSplitAnalyticsQuery` (`allocationPlans`, `allocationPlanLines`, `envelopes`) |
| `payday.overrideEvent` | `payday-matrix.procedures.ts:30` | `privateTenantProcedure` | `requiresWriteAccess` | `OverrideEventCommand` (`.strict()`) | None | `overrideEventCommand` (`incomeEvents`, `expenseEvents`, `envelopes`, `incomeSources`, `bankAccounts`) |
| `payday.deleteUpcomingEvent` | `payday-matrix.procedures.ts:37` | `privateTenantProcedure` | `requiresWriteAccess` | `DeleteUpcomingEventCommand` (`.strict()`) | None | `deleteUpcomingEventCommand` (`incomeEvents`, `expenseEvents`) |
| `payday.bulkDeleteEvents` | `payday-matrix.procedures.ts:44` | `privateTenantProcedure` | `requiresWriteAccess` | `BulkDeleteEventsCommand` (`.strict()`) | None | `bulkDeleteEventsCommand` (`incomeEvents`, `expenseEvents`, `transferEvents`) |
| `payday.saveBulkAllocations` | `payday-matrix.procedures.ts:51` | `privateTenantProcedure` | `requiresWriteAccess` | Inline `z.object({...}).strict()` | None | `incomeEvents`, `incomeSources`, `bankAccounts`, `allocationPlans`, `allocationPlanLines` |
| `payday.saveAutoAllocation` | `payday-matrix.procedures.ts:148` | `privateTenantProcedure` | `requiresWriteAccess` | Inline `z.object({...}).strict()` | None | `incomeEvents`, `incomeSources`, `bankAccounts`, `allocationPlans`, `allocationPlanLines` |
| `payday.getMatrixPlan` | `payday-matrix.procedures.ts:261` | `privateTenantProcedure` | None | Inline `z.object({ horizonMonths: z.number().min(1).max(12).default(12) }).strict().optional()` | None | `envelopes`, `bankAccounts`, `tenants`, `incomeEvents`, `incomeSources`, `expenseEvents`, `allocationPlans`, `allocationPlanLines`, `computeMatrixProjection` |
| `payday.previewAllocation` | `payday-matrix.procedures.ts:435` | `privateTenantProcedure` | None | `z.object({ incomeAmount: z.string() }).strict()` | None | `previewAllocationQuery` |
| `payday.getActiveAllocationStrategy` | `payday-strategy.procedures.ts:20` | `privateTenantProcedure` | None | `z.object({ scope: AllocationStrategyScopeEnum.optional() }).optional()` | None | `getActiveAllocationStrategyQuery`, `seedAllocationStrategyCommand` (`allocationStrategies`, `allocationStrategySteps`) |
| `payday.listAllocationPresets` | `payday-strategy.procedures.ts:41` | `privateTenantProcedure` | None | None | None | `ALLOCATION_PRESETS` (`@money-matters/types`) |
| `payday.applyAllocationPreset` | `payday-strategy.procedures.ts:45` | `privateTenantProcedure` | `requiresWriteAccess` + role check for `HOUSEHOLD` | `ApplyAllocationPresetInputSchema` (`.strict()`) | None | `applyAllocationPresetCommand` (`allocationStrategies`, `allocationStrategySteps`) |
| `payday.updateAllocationStrategySteps` | `payday-strategy.procedures.ts:74` | `privateTenantProcedure` | `requiresWriteAccess` + `customAllocationRules` flag + role check for `HOUSEHOLD` | `UpdateAllocationStrategyStepsInputSchema` (`.strict()`) | None | `apps`, `allocationStrategies`, `updateAllocationStrategyStepsCommand` (`allocationStrategySteps`) |

### 9.7 `transactions` Router (`apps/api/src/routers/transactions.router.ts` — 8 Procedures)

| Procedure | Line | Type | Write / Flag Guard | Input Schema (`.strict()`?) | Output Schema | Capability / DB Tables |
| :--- | ---: | :--- | :--- | :--- | :--- | :--- |
| `transactions.moveMoney` | 26 | `privateTenantProcedure` | `requiresWriteAccess` | `MoveMoneyCommand` (`.strict()`) | None | `moveMoneyCommand` (`envelopes`, `transactionLedger`, `expenseEvents`) |
| `transactions.recordManualTransaction` | 36 | `privateTenantProcedure` | `requiresWriteAccess` | `RecordManualTransactionCommand` (`.strict()`) | None | `recordManualTransactionCommand` (`envelopes`, `transactionLedger`, `expenseEvents`) |
| `transactions.updateTransactionNote` | 59 | `privateTenantProcedure` | `requiresWriteAccess` | `UpdateTransactionNoteCommand` (`.strict()`) | None | `updateTransactionNoteCommand` (`transactionLedger`, `envelopes`) |
| `transactions.markExpensePaid` | 69 | `privateTenantProcedure` | `requiresWriteAccess` | `MarkExpensePaidCommand` (`.strict()`) | None | `markExpensePaidCommand` (`expenseEvents`, `envelopes`, `transactionLedger`) |
| `transactions.listEnvelopeTransactions` | 91 | `privateTenantProcedure` | None | `ListEnvelopeTransactionsQuery` (`.strict()`) | None | `listEnvelopeTransactionsQuery` (`transactionLedger`, `envelopes`, `bankAccounts`) |
| `transactions.listPoolTransactions` (deprecated alias) | 99 | `privateTenantProcedure` | None | `ListEnvelopeTransactionsQuery` (`.strict()`) | None | `listEnvelopeTransactionsQuery` |
| `transactions.listTransactions` | 107 | `privateTenantProcedure` | None | `ListTransactionsQuery` (`.strict()`) | None | `listTransactionsQuery` (`transactionLedger`, `envelopes`, `bankAccounts`) |
| `transactions.searchTransactions` | 115 | `privateTenantProcedure` | None | `SearchTransactionsQuery` (`.strict()`) | None | `searchTransactionsQuery` (`transactionLedger`, `envelopes`, `bankAccounts`) |

### 9.8 `transfers`, `billing`, `notifications`, `simulation`, `assistant` & `fileNotes` Routers (25 Procedures)

| Router & Procedure | File & Line | Type | Write / Flag Guard | Input Schema (`.strict()`?) | Output Schema | Capability / DB Tables |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `transfers.createTransferEvent` | `transfers.router.ts:10` | `privateTenantProcedure` | `requiresWriteAccess` | Inline `z.object({...}).strict()` | None | `envelopes`, `transferEvents` |
| `transfers.listUpcomingTransferEvents` | `transfers.router.ts:88` | `privateTenantProcedure` | None | None | None | `transferEvents`, `envelopes`, `bankAccounts` |
| `transfers.deleteTransferEvent` | `transfers.router.ts:190` | `privateTenantProcedure` | `requiresWriteAccess` | `z.object({ eventId: uuid }).strict()` | None | `transferEvents`, `envelopes` |
| `transfers.updateTransferEvent` | `transfers.router.ts:248` | `privateTenantProcedure` | `requiresWriteAccess` | Inline `z.object({...}).strict()` | None | `transferEvents` |
| `transfers.executeTransferEvent` | `transfers.router.ts:286` | `privateTenantProcedure` | `requiresWriteAccess` | Inline `z.object({...}).strict()` | None | `transferEvents`, `moveMoneyCommand` |
| `billing.getSubscriptionStatus` | `billing.router.ts:14` | `tenantProcedure` | None | None | None | `getSubscriptionStatusQuery` (`tenants`), `syncSubscriptionFromStripeCommand` |
| `billing.listInvoices` | `billing.router.ts:35` | `tenantProcedure` | None | None | None | `listInvoicesQuery` (`billingInvoices`) |
| `billing.createCheckoutSession` | `billing.router.ts:40` | `ownerProcedure` | None | `CreateCheckoutSessionInputSchema` (`.strict()`) | None | `createCheckoutSessionCommand` (`tenants`, `users`, Stripe API) |
| `billing.verifyCheckoutSession` | `billing.router.ts:53` | `tenantProcedure` | None | `VerifyCheckoutSessionInputSchema` (`.strict()`) | None | `verifyCheckoutSessionCommand` (`tenants`, `billingInvoices`, Stripe API) |
| `billing.createCustomerPortalSession` | `billing.router.ts:61` | `ownerProcedure` | None | `CreateCustomerPortalSessionInputSchema` (`.strict()`) | None | `createCustomerPortalSessionCommand` (`tenants`, Stripe API) |
| `notifications.registerPushToken` | `notifications.router.ts:13` | `tenantProcedure` | None | `RegisterPushTokenInputSchema` (`.strict()`) | None | `registerPushTokenCommand` (`deviceTokens`) |
| `notifications.unregisterPushToken` | `notifications.router.ts:24` | `tenantProcedure` | None | `UnregisterPushTokenInputSchema` (`.strict()`) | None | `unregisterPushTokenCommand` (`deviceTokens`) |
| `notifications.getPreferences` | `notifications.router.ts:35` | `tenantProcedure` | None | None | None | `getNotificationPreferencesQuery` (`tenantUserPreferences`) |
| `notifications.updatePreferences` | `notifications.router.ts:45` | `tenantProcedure` | None | `UpdateNotificationPreferencesInputSchema` (`.strict()`) | None | `updateNotificationPreferencesCommand` (`tenantUserPreferences`) |
| `simulation.canAfford` | `simulation.router.ts:13` | `privateTenantProcedure` | `apps.featureFlags.simulation` | `CanAffordInputSchema` (`.strict()`) | None | `apps`, `canAffordSimulationQuery` (`envelopes`, `bankAccounts`, `incomeEvents`, `expenseEvents`, `allocationPlans`, `allocationPlanLines`, `transactionLedger`) |
| `assistant.ask` | `assistant.router.ts:33` | `privateTenantProcedure` | `apps.featureFlags.aiAssistant` + `checkAiTenantRateLimit` + subscription/grace checks | `AssistantAskInputSchema` (`.strict()`) | `AssistantResultSchema` (`.strict()`) | `apps`, `askAssistant` (`aiUsage`, `tenants`, `createAssistantIntentHandler`, `loadTenantFormatting`, `CloudflareGatewayLlmProvider`) |
| `assistant.usage` | `assistant.router.ts:75` | `privateTenantProcedure` | `apps.featureFlags.aiAssistant` + subscription status reporting | None | `AssistantUsageSchema` (`.strict()`) | `apps`, `DbUsageStore` (`aiUsage`, `tenants`) |
| `fileNotes.createPreSignedUrl` | `file-notes.router.ts:23` | `privateTenantProcedure` | `requiresWriteAccess` + `fileNotes` flag | `CreatePreSignedUrlInput` (`.strict()`) | None | `createPreSignedUrlHandler` (`fileNotes`, R2 S3 presigner) |
| `fileNotes.create` | `file-notes.router.ts:33` | `privateTenantProcedure` | `requiresWriteAccess` + `fileNotes` flag | `CreateFileNoteInput` (`.strict()`) | `FileNoteDto` (`.strict()`) | `createFileNoteHandler` (`fileNotes`) |
| `fileNotes.list` | `file-notes.router.ts:44` | `privateTenantProcedure` | `fileNotes` flag | `FileNotesListInput` (`.strict()`) | `z.array(FileNoteDto)` | `listFileNotesHandler` (`fileNotes`, `users`) |
| `fileNotes.getDownloadUrl` | `file-notes.router.ts:55` | `privateTenantProcedure` | `fileNotes` flag | `z.object({ id: uuid }).strict()` | None | `getDownloadUrlHandler` (`fileNotes`, R2 S3 presigner) |
| `fileNotes.updateComment` | `file-notes.router.ts:65` | `privateTenantProcedure` | `requiresWriteAccess` + `fileNotes` flag | `UpdateFileNoteCommentInput` (`.strict()`) | `FileNoteDto` (`.strict()`) | `updateFileNoteCommentHandler` (`fileNotes`, `users`) |
| `fileNotes.archive` | `file-notes.router.ts:76` | `privateTenantProcedure` | `requiresWriteAccess` + `fileNotes` flag | `z.object({ id: uuid }).strict()` | None | `archiveFileNoteHandler` (`fileNotes`) |
| `fileNotes.purge` | `file-notes.router.ts:86` | `privateTenantProcedure` | Deprecated (convert to soft-delete per `SEC-01`) | `z.object({ id: uuid }).strict()` | None | `purgeFileNoteHandler` (`fileNotes`) |
| `fileNotes.getStorageQuota` | `file-notes.router.ts:96` | `privateTenantProcedure` | None | None | `StorageQuotaDto` (`.strict()`) | `getStorageQuotaHandler` (`fileNotes`) |

---

## 10. HTTP/Webhook Endpoints, Active Inngest Workflows & Feature Flags Registry

### 10.1 HTTP & Webhook Endpoints (`apps/api/src/worker.ts` & `apps/web/src/app/api/*`)

| Endpoint | Method(s) | File Path & Line | Auth / Verification | Rate Limit & Routing Notes |
| :--- | :--- | :--- | :--- | :--- |
| `/health` | `GET` | `apps/api/src/worker.ts:144` | Public | Returns `{ status: 'ok', runtime: 'cloudflare-workers' }` |
| `/api/inngest` | `GET`, `POST`, `PUT` | `apps/api/src/worker.ts:154` | Inngest signing key (`INNGEST_SIGNING_KEY`) | Executes registered background workflows |
| `/api/webhooks/stripe` | `POST` | `apps/api/src/worker.ts:161` (`apps/api/src/routes/stripe-webhook.ts:15`) | `stripe.webhooks.constructEventAsync` (`stripe-signature` on raw body) | Idempotency via `processed_webhooks` |
| `/api/auth/mobile-google` | `GET` | `apps/api/src/worker.ts:166` (`apps/api/src/routes/mobile-auth.ts:52`) | Public OAuth initiator | Initiates Neon Auth social sign-in for Mobile |
| `/api/auth/mobile-done` | `GET` | `apps/api/src/worker.ts:170` (`apps/api/src/routes/mobile-auth.ts:127`) | OAuth callback cookie/verifier exchange | Redirects to `return_to` deep link (`moneymatters://` or `exp://`) |
| `/api/auth/*` (Worker) | `GET`, `POST` | `apps/api/src/worker.ts:174` (`apps/api/src/routes/auth-proxy.ts:152`) | Proxies to `NEON_AUTH_BASE_URL` | Passes through `enforceApiRateLimit` (`auth` bucket: 10 req / 60s) |
| `/trpc/*` (Worker) | `GET`, `POST` | `apps/api/src/worker.ts:185` | JWT/Cookie session via `createEdgeContext` | Passes through `enforceApiRateLimit` (`mutation`: 100/60s, `query`: 300/60s) |
| `/api/auth/[...auth]` (Web) | `GET`, `POST` | `apps/web/src/app/api/auth/[...auth]/route.ts:159` | CSRF origin check + proxies to `NEON_AUTH_BASE_URL` | Next.js auth proxy (`SEC-06` adds Upstash rate limiting) |
| `/api/trpc/[trpc]` (Web) | `GET`, `POST` | `apps/web/src/app/api/trpc/[trpc]/route.ts:116` | Extracts session token from cookies and forwards to `NEXT_PUBLIC_API_URL/trpc` | Forwards `x-forwarded-for` to Worker API |

### 10.2 Active Inngest Workflows (`apps/api/src/inngest/index.ts` — 9 Functions)

| Function ID | Trigger (Cron / Event) | File Path & Line | Description & Tables Accessed |
| :--- | :--- | :--- | :--- |
| `welcome-onboarding` | Event: `auth/user.signup` | `packages/capabilities/notifications/src/workflows.ts:13` | Sends welcome email via `sendEmail`, waits 2 days, sends setup nudge (`tenants`) |
| `setup-completed` | Event: `onboarding/setup.completed` | `packages/capabilities/notifications/src/workflows.ts:56` | Sends setup completion summary email (`users`, `tenants`) |
| `account-deleted` | Event: `auth/account.deleted` | `packages/capabilities/notifications/src/workflows.ts:89` | Sends account deletion confirmation email (`sendEmail`) |
| `partner-invited` | Event: `household/partner.invited` | `packages/capabilities/notifications/src/workflows.ts:111` | Waits 3 days, checks `tenantUsers.inviteStatus === 'PENDING'`, sends reminder email |
| `weekly-digest` | Cron: `0 8 * * 1` (Mon 08:00 UTC) | `packages/capabilities/notifications/src/scheduled-workflows.ts:323` | Sends weekly financial digest email to opted-in users (`tenants`, `tenantUsers`, `users`, `userPreferences`, `tenantUserPreferences`, `envelopes`, `expenseEvents`, `incomeEvents`) |
| `data-retention-cleanup` | Cron: `0 3 * * *` (Daily 03:00 UTC) | `packages/capabilities/notifications/src/retention-workflows.ts:13` | Deletes `processedWebhooks` > 90 days, soft-archived `deviceTokens` > 90 days, expired `tenantUsers` invites > 30 days |
| `check-expired-trials` | Cron: `0 0 * * *` (Daily 00:00 UTC) | `apps/api/src/inngest/billing-workflows.ts:14` | Transitions expired `TRIALING` tenants to `TRIAL_GRACE` and expired `TRIAL_GRACE` tenants to `EXPIRED` (`tenants`) |
| `daily-rolling-window-materializer` | Cron: `0 15 * * *` (Daily 15:00 UTC / 01:00 AEST) | `apps/api/src/inngest/budgeting-workflows.ts:10` | Extends 12-month rolling window of `incomeEvents` and `expenseEvents` for all active tenants (`tenants`, `incomeSources`, `envelopes`) |
| `auto-archive-completed-schedules` | Cron: `30 15 * * *` (Daily 15:30 UTC / 01:30 AEST) | `apps/api/src/inngest/budgeting-workflows.ts:57` | Soft-archives `envelopes` and `incomeSources` whose `endDate < today` and have zero `PENDING` events |

### 10.3 Feature Flags & Entitlements Registry

1. **Database App Feature Flags (`packages/types/src/app-feature-flags.types.ts` & `apps.feature_flags` JSONB column):**
   - `fileNotes` (`boolean`, default `true` in schema): Controls file attachment notes on Envelopes, Transactions, and Bank Accounts (`FileNotesProvider`, `fileNotesRouter`).
   - `reports` (`boolean`, default `false`): Controls Visual Analytics / Reports (`payday.getIncomeSplitAnalytics`, Web `/dashboard/reports`, Mobile `/(app)/reports`).
   - `askPenny` (`boolean`, default `false`): Controls Ask Penny AI Assistant (`assistant.ask`, Web `DashboardLayout`, Mobile `(app)/_layout.tsx`).
   - `simulation` (`boolean`, default `false`): Controls "Can I Afford It?" Purchase Simulator (`simulation.canAfford`, Web `/dashboard/afford-check`, Mobile `/(app)/afford-check`).
   - `customAllocationRules` (`boolean`, default `false`): Controls custom waterfall step ordering (`payday.updateAllocationStrategySteps`, Web `/dashboard/settings/allocation-rules`, Mobile `/(app)/settings/allocation-rules`).
2. **Static Env Feature Flags (`packages/config/src/feature-flags.ts`):**
   - `FF_AI_ASSISTANT`, `FF_PAYDAY_SIMULATION`, `FF_BILLING_STRIPE`, `FF_PUSH_NOTIFICATIONS`, `FF_POSTHOG_ANALYTICS` (with `owner`, `expiresAt`, and `killSwitchEnabled`).

---

## 11. Security, Stealth Privacy & Australian Privacy Principles (APPs)

### 11.1 Cryptographic & In-Transit Protections
- **In-Transit Encryption**: Strict TLS 1.3 enforced across all API endpoints (`api.moneymatters.kaesava.au`), Web apps (`moneymatters.kaesava.au`), and Cloudflare Worker microservices. Cleartext HTTP is blocked at the Cloudflare edge with automatic HTTPS redirection.
- **At-Rest Encryption**: Database storage on Neon PostgreSQL is encrypted at rest using AES-256-GCM. Sensitive tenant identifiers, tokens, and financial ledgers utilize encrypted volumes with hardware-backed key rotation.
- **Client Secure Storage**: Sensitive tokens on Android/mobile are stored in encrypted hardware-backed storage via `expo-secure-store` (Android KeyStore with AES-256).

### 11.2 Stealth Tenant Isolation & PostgreSQL RLS
- **Dual Session Context Injection (`privateTenantProcedure`)**:
  All sensitive read/write routes (`bank_accounts`, `categories`, `transaction_ledger`, `income_sources`, `expense_sources`) execute inside a transactional context injecting PostgreSQL session variables:
  ```sql
  SET LOCAL app.current_tenant_id = '<tenant-uuid>';
  SET LOCAL app.current_user_id = '<user-uuid>';
  ```
- **Stealth Personal Account Isolation**:
  Bank accounts marked `is_private = true` and their associated pools are 100% invisible to other household members. The PostgreSQL RLS policy evaluates:
  ```sql
  CREATE POLICY stealth_bank_account_isolation ON bank_accounts
  USING (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    AND (is_private = false OR user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  );
  ```
  Neither API responses nor database queries leak private account balances, names, or transaction ledger rows to other household members.

### 11.3 Australian Privacy Principles (APPs) Compliance Matrix
Money Matters is engineered to comply with the 13 Australian Privacy Principles under the *Privacy Act 1988 (Cth)*:

| Principle | Money Matters Implementation Proof |
| :--- | :--- |
| **APP 1: Open & transparent management** | Fully public Privacy Policy (`/privacy`), clearly detailing all data processed, zero third-party data broker sharing, zero advertising tracking. |
| **APP 3: Collection of solicited personal info** | Strict data minimization: only financial names, expected dates, and pool balances necessary for forward-looking payday allocation are collected. |
| **APP 5: Notification of collection** | Explicit in-app consent during sign-up and onboarding before creating household ledgers. |
| **APP 6: Use or disclosure** | Financial data is processed exclusively for running the 5-Step Waterfall cascade, balance reconciliation, and guardrail alerts. Zero secondary disclosure. |
| **APP 8: Cross-border disclosure** | Cloudflare Workers compute and Neon PostgreSQL storage adhere to ISO 27001 / SOC2 Type II certifications with Australian Sydney regional routing. |
| **APP 10: Quality of personal information** | Balance reconciliation wizard (`<ReconciliationModal />`) allows users to correct differences between bank balances and pool totals at any time. |
| **APP 11: Security of personal information** | Bank-grade AES-256-GCM at rest, TLS 1.3 in transit, PostgreSQL RLS, Upstash Redis rate limiting, automatic PII log redaction via universal logger. |
| **APP 12: Access to personal information** | 1-Click Zipped CSV Backup provides instantaneous, self-serve access to 100% of stored household financial data in open, human-readable format. |
| **APP 13: Correction & erasure of information** | Full self-service data erasure under `/settings` ("Delete Household & Wipe Data" and "Leave Household"). Hard deletion cascades and purges all tenant records. |

### 11.4 1-Click Zipped CSV Backup & Data Portability
- **Web Export**:
  - `exportMyData` tRPC query extracts 12 normalized CSV tables (`Bank_Accounts.csv`, `Categories.csv`, `Category_Schedules.csv`, `Income_Sources.csv`, `Income_Events.csv`, `Expense_Sources.csv`, `Expense_Events.csv`, `Income_Split_Plans.csv`, `Income_Split_Plan_Lines.csv`, `Transaction_Ledger.csv`, `File_Notes.csv`, `Tenant_Audit.csv`).
  - In-memory `JSZip` archives all CSV files and triggers direct browser download via Blob URL (`money-matters-backup-YYYY-MM-DD.zip`).
- **Mobile Export**:
  - `apps/mobile/src/components/settings/PrivacyGovernanceSection.tsx` consumes `exportMyData`.
  - In-memory `JSZip` creates the zip archive, converts to base64, and writes to `FileSystem.cacheDirectory` via `expo-file-system/legacy`.
  - Native OS share sheet is triggered via `expo-sharing` (`Sharing.shareAsync`), allowing 1-tap saving to Google Drive, local storage, email, or messaging apps.

### 11.5 Cross-Platform Onboarding Product Tour Architecture
- **State & Persistence Layer**:
  - Stored inside `tenantUserPreferences.appPreferences[appId]` JSONB blob (`packages/db/src/schema/tenant_user_preference.ts`), scoped per `(userId, tenantId, appId, platform)` via `tour_web` and `tour_mobile`.
  - Fields per platform (`PlatformTourStatus`): `has_seen?: boolean`, `completed_at?: string`, `dismissed_at?: string`, `last_step?: number`.
  - Zero database migration requirement; persisted via existing `trpc.updateUserPreferences` mutation. Web and Mobile tour states are tracked independently so each user sees the tour once per app per platform.
- **Web Tour Implementation (`apps/web`)**:
  - `ProductTourContext.tsx`: Manages 9 steps (including `ask-penny`), automated cross-page routing (`/dashboard` $\rightarrow$ `/dashboard/income-and-bills` $\rightarrow$ `/dashboard/history` $\rightarrow$ `/dashboard`), `MutationObserver`-backed element target observation (`getBoundingClientRect` with window resize listeners), and PostHog analytics capture (`tour_prompted`, `tour_started`, `tour_step_viewed`, `tour_completed`, `tour_skipped`).
  - `ProductTourSpotlight.tsx`: Pure SVG cutout overlay mask dims background while leaving target highlighted.
  - `ProductTourPopover.tsx`: Anchored floating card rendered using Serene Finance tokens (`#2563eb`, `#1B2B4B`, `#F7F8FA`), badge chips, keyboard controls (`Escape` to dismiss, arrow keys to navigate), and Next/Back actions.
  - `TourWelcomeModal.tsx`: Unobtrusive welcome dialog offering opt-in start or self-exploration.
- **Mobile Tour Implementation (`apps/mobile`)**:
  - `ProductTourContext.tsx`: Native context managing 9 steps (including `ask-penny`), welcome prompt (`MobileConfirmDialog`), `registerTourTarget` layout measurement, tactile haptic feedback (`expo-haptics`), and programmatic tab/screen navigation (`router.replace`).
  - `MobileProductTourSheet.tsx`: Native bottom sheet drawer rendering step badge, title, localized description, progress dots, and Next/Skip buttons.
- **E2E Test Coverage**:
  - Spec `4.4 - Product Tour Flow` verified in `apps/web/e2e/screen-by-screen.spec.ts`.

### 11.6 Ask Penny AI Assistant Architecture
- **Capability Slice (`packages/capabilities/assistant`)**:
  - Implements decoupled vertical slice with dependency injection (`IntentHandlerPort`, `LlmProviderPort`, `UsageStorePort`) via `askAssistant` (`packages/capabilities/assistant/src/queries/ask.query.ts`).
  - **Deterministic-First Intent Matcher**: Evaluates greetings/help (`GREETING_HELP`), out-of-scope (`OUT_OF_SCOPE`), and core queries/navigation/entity edits (`POOL_BALANCE`, `BILLS_DUE`, `PAYDAY_PREVIEW`, `GOAL_DATE`, `SPENDING_SUMMARY`, `RECORD_EXPENSE`, `ADD_ENTITY`, `EDIT_ENTITY`, `NAVIGATE`) using `$0` local regex, multi-currency `parseAmount`, date, and keyword scoring. Supports `create-*`, `edit-*`, and `history-filter` deep-link prefill payloads alongside read-only answers.
  - **Cloudflare Workers AI Gateway Provider (`CloudflareGatewayLlmProvider`)**: Calls Cloudflare AI Gateway REST endpoint (`@cf/meta/llama-3.1-8b-instruct`) with tenant-scoped privacy-safe context (`buildSafePennyContext` -> `SafePennySnapshot`, zero PII/IDs and Stealth-Privacy filtered via `userId` & `isPrivate`), `cf-aig-skip-cache: "true"` to prevent cross-tenant gateway cache leakage, `cf-aig-collect-log: "false"`, strict `AssistantLlmResponseSchema` validation + output sanitization, and bounded freeform `text` Q&A when structured intent classification returns no action.
  - **Subscription Gating & Quota Protection**: `assistantRouter` enforces `apps.featureFlags.aiAssistant` and returns structured `unavailable` reasons (`disabled`, `subscription_required`, `read_only_grace`, `rate_limited`, `quota_exceeded`, `service_error`, `unauthenticated`). Deterministic `$0` intents remain available during grace periods (`isGracePeriod`), while `decrementLlmCalls` refunds monthly LLM quota strictly on `service_error` gateway failures.
  - **Tenant Quota & Sliding-Window Rate Limiting**: Max monthly LLM calls enforced via `AI_TIER_LIMITS` in `@money-matters/config` (`ai_usage` table with optimistic `llm_calls < limit` guard and monthly reset tracking) plus sliding-window burst rate limiting via Upstash Redis (`checkAiTenantRateLimit`).
- **Client Presentation & Unified Command Palette**:
  - Web: Unified Command Palette `<CommandPaletteModal />` triggered via sidebar link, mobile header button, global `⌘K` / `Ctrl+K`, or `/` hotkey; hybrid discovery combining Tier 1 instant in-memory matches (Pages & Quick Actions, Accounts, Envelopes, `PENDING` Upcoming Events) and Tier 2 debounced `trpc.searchTransactions` queries with Smart Priority Ask Penny (`Enter` vs `Tab` controlled by `shouldPrioritizeAskPenny`); quota status badge rendered in Settings > Subscription (`<AiUsageCard />` gated by `aiAssistant` feature flag with localized `fmtDateMedium` reset date).
  - Mobile: Native command palette sheet `<MobileCommandPaletteSheet />` lifted globally into `CommandPaletteProvider` (`apps/mobile/src/context/CommandPaletteContext.tsx`) and triggered from `AppScreenWrapper` on every authenticated screen with registered `'ask-penny'` tour anchor; native quota usage card (`<MobileAiUsageCard />`) in Settings > Plan section gated by `aiAssistant` feature flag.
  - Zero Direct DB Mutations: All create/edit/action intents return verified deep links and prefill payloads routing users to existing verified Web/Mobile forms and drawers (`EnvelopeFormModal`, `IncomeFormModal`/`IncomeExpenseFormModal`, `QuickExpenseDrawer`/`QuickExpenseModal`, `AffordCheck`, `TransferModal`) for manual confirmation.
