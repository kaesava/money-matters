# TECHNICAL_SPEC.md — money-matters

> **Last updated:** 2026-09-05  
> **Status:** 100% production-ready standard. Fully executed and synchronized across all Master Plan phases & capability enhancements: Pool-Centric Architecture (`Bank Account → Pool → Category`), `getPoolBalancesMap` DB-side aggregate SUM(CASE WHEN...) balance utility in `@money-matters/db`, `budgetingRouter` consolidating pool, category, and budgeting RPC procedures, 100% `privateTenantProcedure` RLS session context injection across private routes (bank accounts, pools, categories, income, payday, expenses, reconciliation), transactional payday allocation plan revert with offsetting DEBIT ledger entries, cascading pool soft-archival to child categories, last-category-in-pool archival protection, Profile & Household Settings, AEST timezone date formatting, full user-facing `t(...)` string externalization, standardized terminology ("Everyday Spending", "Bills", "Expense", "History"), Centralized Form Input Defenses (12-digit amount cap, string HTML/script stripping, date-picker enforcement, mandatory red asterisk UX, and dynamic submit button state blocking), and active Neon PostgreSQL DB schema & seed dispatches.

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
| API Layer | tRPC | ^11.18.0 | Type-safe RPC contracts (`budgetingRouter`, `tenantRouter`, `incomeRouter`, `expensesRouter`, `paydayRouter`, `transactionsRouter`, `billingRouter`, `fileNotesRouter`, `bugReportRouter`, `notificationsRouter`) |
| ORM | Drizzle ORM | ^0.39.0 | Neon PostgreSQL driver |
| Database (Server) | Neon PostgreSQL (Serverless) | Neon DB | Multi-tenant schema with RLS (`privateTenantProcedure` session injection) |
| Database (Mobile) | Expo SQLite | 16.0.10 | Local SQLite (Online-first MVP) |
| Auth | Neon Auth (Better Auth) | Neon Auth Service | JWT & session cookie verification |
| Rate Limiting | Upstash Redis | Serverless Redis (ap-southeast-1) | REST API sliding-window rate limiter |
| File Storage | Cloudflare R2 | Cloudflare R2 | Attachments & file notes (`money-matters-production`) |
| Async Workflows | Inngest | Inngest Cloud | Release 1 active background cron (`notifyWeeklyDigest` Sunday 7pm AEST via Resend) & async dispatches; non-digest crons staged for Release 2 (`V2_SCOPE.md`) |
| Email Service | Resend | Resend API | Transactional emails & partner invites |
| Analytics & Replays | PostHog (Self-driving) | PostHog SaaS | Product usage tracking, feature flags, session replays |
| Crash & APM | Sentry | Sentry SaaS | Production exception reporting & symbolicated stack traces |
| Mobile Framework | React Native / Expo | Expo SDK 54 / RN 0.81.5 | Android native app |
| Styling & UI | Serene Finance Tokens & Toast/Alert System | `packages/ui` & `apps/web` | Standardized tokens (`#2563eb`, `#1B2B4B`, `#F7F8FA`, `#22c55e`, `#ba1a1a`), JetBrains Mono via `next/font/google`, non-blocking Toast feedback system (`ToastProvider`/`useToast`/`MobileToastProvider`/`useMobileToast`), inline `AlertBanner` primitives, and responsive viewport (`width=device-width`) |
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
│   │   ├── tenant/          # Household creation, partner invite, bank account CRUD, bank balance reconciliation
│   │   ├── budgeting/       # Pool-centric architecture (`Bank Account → Pool → Category`), immutable pool-bank linking, unbudgeted buffer validation, 5-step waterfall allocation engine (Deficit Repair, Regular, Goal, Everyday, Surplus), rolling window maintainer, payday allocation revert ledger reversals, cascading pool archival, last-category guard
│   │   ├── transactions/    # Daily ledger, expense recording, transaction history
│   │   ├── simulation/      # Stateless "Can I Afford It?" engine with 6-verdict cumulative waterfall simulation & goal timeline impact analysis
│   │   ├── notifications/   # Expo push + scheduled weekly digest Inngest workflow
│   │   ├── file-notes/      # Notes, comments, attachments via Cloudflare R2
│   │   └── bug-reports/     # In-app bug report persistence, Frustration scale & workflow category capture, tenant-isolated bugReports schema, Resend receipt/alert dispatches
│   ├── core/          # DB client, universal logger, auth session resolver, rate limiter, correlation ID hook
│   ├── config/        # Zod env schemas, app registry, feature flags
│   ├── db/            # Drizzle schemas (`app_categories`, `user_preferences` JSONB), migrations & seeds
│   ├── i18n/          # Centralized dictionary & type-safe t() helper
│   ├── types/         # Zod domain contracts, setup presets, status state machines, API DTOs
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

All persistent domain tables include: `id`, `tenantId`, `appId`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `archivedAt`, `archivedBy`. Root identity tables (`tenants`, `tenant_users`, `users`, `apps`) use exact single-purpose keys with FK constraints.

```
apps (id PK [stable UUID], name, slug UNIQUE)
  │ FK (appId)
  ▼
tenants (id PK, appId FK→apps.id, name, currency [varchar(3), default AUD], timezone [default Australia/Sydney], country [default AU], subscriptionStatus, trial*, stripe*)
  │
  ├── tenant_users (tenantId FK→tenants.id, userId FK→users.id [nullable for PENDING], role: OWNER|MEMBER, inviteEmail, inviteToken, inviteStatus: PENDING|ACCEPTED|REVOKED, invitedAt)
  ├── bank_accounts (lastKnownBalance, unbudgetedBuffer, isPrivate, userId)
  │   └── pools (tenantId, appId, name, poolType: EVERYDAY|REGULAR|GOAL, bankAccountId, everydayAllowanceAmount, rolloverRule, targetAmount, targetDate, isCommitted, isSurplusTarget)
  │       ├── categories (tenantId, appId, poolId, name, icon, colour, monthlyAmount, budgetFrequency, isEssential)
  │       └── transaction_ledger (poolId, categoryId [nullable], flowType: DEBIT|CREDIT, source: MANUAL|IMPORT, recordedAt, note)
  ├── user_preferences (Global 1:1 per userId: userId UNIQUE, language [varchar(10), default en], locale [varchar(20), default auto], timezone [varchar(100)], theme, showIcons)
  ├── tenant_user_preferences (Scoped to userId, tenantId, appId: appPreferences: JSONB including alert toggles, UI flags, setup_completed state)
  ├── app_categories (appId, name, type: REGULAR|GOAL|EVERYDAY, icon, colour, annualisedAmount)
  ├── income_sources (name, amount, receivingAccountId, rrule, startDate, endDate)
  │   └── income_events (expectedDate, expectedAmount, actualAmount, status: PENDING|CONFIRMED)
  ├── expense_sources (name, amount, poolId, categoryId, rrule, startDate, endDate)
  │   └── expense_events (expectedDate, expectedAmount, actualAmount, status: PENDING|CONFIRMED)
  └── file_notes (entityType: POOL|CATEGORY|TRANSACTION, comment, fileKey, fileName, mimeType)
```

> **Tenant-App Relationship & Currency/Locale Architecture**:
> - Every tenant belongs to exactly one app via `tenants.app_id → apps.id`.
> - **Tenant Base Currency (`tenants.currency`)**: A single base currency is assigned per household (`AUD`, `USD`, `EUR`, `GBP`, `CAD`, `JPY`, `NZD`, `SGD`, defaulting to `AUD`). All financial calculations, pool balances, targets, and transaction ledger amounts operate in this single currency (no in-app multi-currency FX conversions). Household owners may edit the base currency in Household Details, triggering a confirmation dialog warning that historical numbers are not converted.
> - **User Presentation Locale & Language (`user_preferences`)**: Language (`en`, `ja`) and formatting locale (`auto`, `en-AU`, `en-US`, `en-GB`, `ja-JP`) are cleanly decoupled in `user_preferences`. The web app's `LocaleProvider` dynamically computes `Intl.NumberFormat` and `Intl.DateTimeFormat` configurations based on the user's active preferences and tenant base currency.
> - **Timezone Execution vs Presentation**: Scheduled paydays, rolling window materialization (`maintainRollingWindow`), and recurring event intervals execute strictly in `tenants.timezone` (default `Australia/Sydney`), guaranteeing household financial consistency regardless of where individual users log in. Display dates and times respect tenant timezone with optional user override.
> - **Zero-Decimal Currencies & AmountField**: Currencies with zero minor units (`JPY`) automatically suppress decimal points across all displays and block decimal point input in `<AmountField />`.
> - **Modular Banking Calendar**: Settlement adjustments (`adjustForBankingCalendar`, `isNonBankingDay`) support national holiday rules parameterized by `countryCode` (Australian BECS holidays for `AU`; weekend-only settlement adjustment fallback for international tenants).

### 4.1 Managed Identity (`neon_auth`) vs Domain Schema (`public`) Architecture

- **Auth Layer (`neon_auth`)**: Managed externally by Neon Auth / Better Auth. Handles identity authentication (passwords, JWTs, session tokens, magic links).
- **Domain Layer (`public.users`)**: Platform-level user profile mirror (`id == neon_auth.user.id`). Foreign key `users_neon_auth_fk` enforces `ON DELETE CASCADE` from `neon_auth.user`. Syncs JIT via `upsertUserFromJwt`.
- **Domain Tenant Engine (`public.tenants` & `public.tenant_users`)**: `public.tenants` owns financial settings (`fyEndMonthDay`), commercial billing (`subscriptionStatus`, Stripe customer IDs), and waterfall engine rules (`sweepEverydayLeftover`, `merchantRules`). `public.tenant_users` manages invite tokens, role RBAC, and membership lifecycle.
- **Design Rationale**: Avoiding Neon Auth's `organization` plugin prevents contaminating the auth layer with domain budgeting math, maintains 100% type-safe Drizzle ORM schema control, avoids cross-schema migration risks, and ensures edge compatibility on Cloudflare Workers.

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
  - **`EVERYDAY` & `REGULAR` (Bills)**: Managed at **overall pool level**. Category form modal (`CategoryFormModal.tsx`) captures **Target Budget Amount ($)** and **Frequency** (`Weekly`, `Fortnightly`, `Monthly`, `Annual`) matching the Setup Wizard, displaying a live calculated monthly target budget badge (`$X.XX/mo`). `REGULAR` (Bills) categories expose a read-only `listBillCoverageQuery` (budgeting capability) returning per-category `BillCoverageItem` coverage status (`COVERED` / `SHORT_BY` / `NO_SCHEDULE`). Status is derived from pool-level balance vs upcoming expense events due before next payday. No per-category envelope balances are stored.
  - **`GOAL` (Save Toward)**: Managed **individually per category** with dedicated target balances, target dates, and progress metrics. Goal sorting logic automatically places high-priority or nearest-term goals at the top.
- **Dynamic Paycheck Frequency Engine (`parseRruleFrequencyDays`)**: Automatically evaluates income source recurrence rules (`rrule`) to calculate allocation period days: `WEEKLY` (7 days), `FORTNIGHTLY` (14 days), `MONTHLY` (30 days), and `ANNUALLY`/`YEARLY` (365 days), ensuring prorated target calculations scale precisely with user income schedules.
- **Category UI Screen & Slide-Over Drawer**: Organized into 3 distinct sections (Everyday Spending [collapsible], Regular Bills [collapsible], Save Toward Goals). Clicking a category row triggers the Slide-Over Category Drawer showing past transaction history, upcoming scheduled occurrences, and mark paid/archive actions.
- **Universal Soft-Deletes**: All API routers enforce soft deletion (`archivedAt: new Date(), updatedAt: new Date(), updatedBy: ctx.userId`). Hard DELETE operations on operational entities are strictly banned.
- **Design Tokens & Confirmation Parity**: Serene Finance tokens (`#2563eb`, `#1B2B4B`, `#F7F8FA`, `#22c55e`, `#ba1a1a`) are universally applied; legacy teal (`#00B4A6`) is completely retired. All user actions (deletions, un-save, balance adjustments) standardize on `<ConfirmDialog />`.
- **Universal Table Parity & Conditional Pagination**: Left-aligned names/text, center-aligned dates/badges/actions, right-aligned mono currency figures. Pagination (`<PaginationBar />`) conditionally displays only when record count $\ge 5$.
- **Pool Balance Adjustment Safeguards**: Pool balance adjustment modal enforces loading state and button lockout to prevent duplicate transactions from rapid double-clicking.
- **Application-wide Date Standardisation (`fmtDate`)**: Centralized date utility in `@money-matters/ui` (`fmtDate`) formatting all date strings into standard Australian format (`26 Aug 2026`) across Web tables.
0. **`DEFICIT REPAIR` (Step 0)**: Restores any overdrawn/negative pool balances (`currentBalance < 0`) to $0.00 first, ensuring bucket solvency before discretionary spending or future savings commitments.
1. **`IMMEDIATE DUE-DATE FEASIBILITY GUARD` (Step 1)**: Guarantees 100% funding for upcoming bills due on or before the next payday cutoff (`expectedDate <= nextPaydayCutoff`). Prioritizes essential bills (`isEssential: true`, derived from child categories) first, then standard bills, ensuring rent/mortgage and utility direct debits never bounce.
2. **`RESERVE SINKING FUNDS` (Step 2)**: Smoothly accrues pro-rata cycle targets for future bills due beyond next payday using exact cycle factors: $1/26$ for fortnightly, $1/52$ for weekly, and $1/12$ for monthly paychecks. Only allocates the delta above Step 1 funding.
3. **`COMMITTED GOALS` (Step 3)**: Prioritizes committed target-date goals sorted by target date. When target date is on or before next payday, allocates 100% of remaining gap; otherwise paces gap across remaining paychecks.
4. **`EVERYDAY TIME-BASED ALLOWANCE` (Step 4)**: Allocates cycle allowance ($1/26$ fortnightly, $1/12$ monthly). Supports top-up to cap (`rolloverRule === 'RESET'`) and default full fresh deposit (`'ROLLOVER'` / `'SWEEP'`).
5. **`UNCOMMITTED GOALS & RESIDUAL SURPLUS SWEEP` (Step 5)**: Funds uncommitted goals and sweeps 100% of remaining residual cents into the designated surplus bucket (`isSurplusTarget === true`). Unallocated cash is strictly $0.00.

### 5.2.1 Payday Preview, Rolling Window & Persistence Resolution Hierarchy (`previewPaydayQuery`, `runCumulativeProjection`)
- **Unified Cumulative Waterfall Projection Engine (`runCumulativeProjection`)**: Centralized math utility (`packages/capabilities/budgeting/src/engine/cumulative-projection.ts`) consumed by both the Matrix Planning Grid (`computeMatrixProjection`) and the Dedicated Income Split Screen `/dashboard/income-split` (`previewPaydayQuery`). Sequentially projects pool balances starting from current ledger balances across all pending income events (`status !== 'CONFIRMED'`) sorted chronologically (`expectedDate` ASC, then `id` ASC for same-day determinism). Passes intermediate scheduled expense events into the Two-Horizon allocation engine.
- **Scheduled Expense Deduction & Pro-Rata Burn Cascade**: Between each simulated income event $i$ and $i+1$, any pending scheduled expenses (`status === 'PENDING'`) due in that date interval are subtracted from running pool balances. To prevent infinite balance accumulation for non-scheduled pools, `runCumulativeProjection` enforces two simulation safeguards:
  1. *EVERYDAY Pro-Rata Burn*: For `EVERYDAY` buckets, a daily burn rate `(monthlyTarget / 30) * daysUntilNext` is subtracted from `runningBalances` between paydays to simulate ongoing discretionary spending (groceries, transport, coffee), decaying balances back towards baseline without producing false negative balances.
  2. *REGULAR Anti-Runaway Cap with Wealth Conservation*: For `REGULAR` bill buckets, `runningBalances` carried forward are clamped to a ceiling of `1.5 * monthlyTarget`. Any trimmed excess is automatically swept directly into the designated Surplus Target pool, strictly conserving household wealth across the entire projection horizon.
- **12-Month Materialized Rolling Window (`maintainRollingWindow`)**: On login and event creation, `maintainRollingWindow` materializes 12 months of `PENDING` `income_events` using AEST timezone normalization (`Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' })`) to prevent off-by-one calendar bugs.
- **Schema Cascade Constraint**: `allocation_plans.incomeEventId` and `allocation_plan_lines.planId` enforce `.onDelete("cascade")`. Changing an income schedule in Setup cascade-deletes obsolete `allocation_plans` and `allocation_plan_lines` without manual script intervention. Restricts `DELETE` operations strictly to `WHERE status = 'PENDING'` to prevent destroying historical confirmed paydays.
- **Category Pool Immutability Constraint**: Once a Category is created and linked to a Pool, the `poolId` is strictly immutable to preserve historical reporting accuracy and prevent retroactive data shifts. If a user makes a mistake during setup, they must archive the category and create a new one.
- **Strict Schedule Recurrence Constraint**: The "Add Schedule" flow strictly enforces recurrence. "One-off" frequencies are explicitly banned from schedule creation to prevent orphaned single-execution records from bypassing list views. Users must use the "Quick Add Event" modal for one-off transactions.
- **Two-Tier Resolution Sequence**:
  1. *Priority 1 (Saved Plan)*: `previewPaydayQuery` queries `allocation_plans` for `incomeEventId`. If a saved plan exists (created via Grid/Screen *"Save"*), it returns the saved `allocation_plan_lines` from the database.
  2. *Priority 2 (Cumulative Engine Projection)*: If no saved plan exists (e.g. fresh income events or un-edited paydays), `previewPaydayQuery` executes `runCumulativeProjection` on-the-fly to return context-aware proposed allocations that factor in prior simulated income splits and intermediate expense deductions.
  - Across all return paths, `previewPaydayQuery` includes `incomeEvent.receivingAccountId` joining on `income_sources` to identify the originating deposit bank account for downstream transfer orchestration.
- **Bank-Account-Aware Payday Transfer Rollup Engine**:
  - Automatically compares each pool's assigned `bankAccountId` with `incomeEvent.receivingAccountId`.
  - Pools in the same bank account are marked as *Retained in source account* with $0 external transfers.
  - Pools targeting other bank accounts are rolled up into **1 single transfer per destination bank account**, computing aggregate totals and listing constituent pools for 1-click clipboard copying.
- **Bulk Allocate Persistence & Concurrency (`saveBulkAllocations`)**: Custom grid edits write directly to `allocation_plans` (status: `PENDING`) and `allocation_plan_lines`. Editing a cell auto-sweeps the difference into the designated Surplus Target cell to force unallocated cash to $0. Enforces a strict status check (`income_event.status === 'PENDING'`) to reject race conditions if an event was confirmed in another session.
- **Revert to Automatic Waterfall (`revertAllocationPlan`)**: Exposes `revertAllocationPlan` mutation. Clicking **Re-calculate** or **Unsave** prompts for confirmation and deletes the `allocation_plan` row, restoring dynamic waterfall calculation.


### 5.3 Bank Account Balance Alignment & V2 Ingestion Architecture
- **Forward-Looking Architecture**: In alignment with Rule 13 ("Money Matters automates forward-looking payday allocation... NEVER describe the product as requiring daily tracking or micro-managing every dollar"), backward-looking CSV statement parsing is deferred to Release 2 (`V2_SCOPE.md`).
- **1-Click Bank Balance Alignment Engine (`@money-matters/capability-tenant`)**:
  - Web & Mobile balance reconciliation via `reconcileBankBalance` procedure.
  - Automatically compares actual bank balance against linked pool balance aggregates (`getPoolBalancesMap`), calculating exact surplus or shortfall.
  - Generates atomic `BALANCE_ADJUSTMENT` or `ACCOUNT_ALIGNMENT` ledger rows in `transaction_ledger` with zero transaction tagging overhead.
- **Zipped Full Tenant CSV Export (`exportTenantData`)**:
  - Secure tenant data backup bundling all relational entities (`categories.csv`, `income_sources.csv`, `expense_sources.csv`, `transaction_ledger.csv`, `bank_accounts.csv`, `allocation_plans.csv`, `file_notes.csv`) into a single zipped archive.

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

### #### Bank Account Management
- **Navigation Bar Label:** "Bank Accounts" (externalized in i18n as `nav.accounts`).
- **Linked Pools:** Everyday, Bills, and Goal pools map 1-to-1 to primary bank accounts. Pools cannot be unchecked directly in account settings (users must re-assign a pool from another account).
- **Privacy Controls:** Marking an account Private or Shared triggers an amber confirmation warning dialog detailing partner visibility implications before state changes.
- **Unbudgeted Buffer / Reserved Funds:** Excluded from available spendable balance calculation (`Available = Current Balance − Reserved Funds`).

### 5.6 5-Level "Can We Afford This?" Engine (`@money-matters/capability-simulation`)
- **Unfunded Bill Shortfall Protection**: Queries `expenseEvents` where `status = 'PENDING'` and `expectedDate <= nextPaycheckDate`. Evaluates bills per REGULAR pool against pool balance to compute unfunded shortfall (`unfundedBillsShortfall`), preserving Everyday cash for bills that are already funded in their respective pools (`effectiveSpendable = max(0, everydayBalance - unfundedBillsShortfall)`). Bills are strictly non-negotiable.
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
  - **Multi-Tenant Trial Abuse Prevention**: Strict single active owned household per user (`tenant_users.role === 'OWNER'`), plus permanent `hasUsedTrial: boolean` flag on `public.users` table so recreating a tenant immediately initializes with `TRIAL_EXPIRED`.
- **Billing Ledger Schema (`billing_invoices`)**: Dedicated table tracking `id`, `tenantId`, `stripeInvoiceId`, `amountPaid`, `currency`, `status`, `invoicePdfUrl`, `hostedInvoiceUrl`, `periodStart`, `periodEnd`, and `createdAt` with foreign key indexes and multi-tenant RLS scoping.


### 5.8 Database & Network Optimization Standards

- **Timezone-Aware Formatting**: All dates are stored in UTC within the database. The presentation layer strictly uses `Intl.DateTimeFormat` configured with AEST/en-AU to ensure timezone-aware formatting across all transaction ledgers and reports.
- **tRPC/Auth Proxy Logging Guards**: Client & Server Log Scrubbing is strictly enforced. Auth tokens, JWT credentials, and PII must never be emitted to stdout/stderr via `console.log`. Logger abstractions automatically sanitize sensitive fields in the tRPC and auth proxy paths.
- **Zipped CSV Data Export Engine**: The `exportTenantData` capability securely generates all entity CSV files (`categories.csv`, `income_sources.csv`, `expense_sources.csv`, `transaction_ledger.csv`, `bank_accounts.csv`, `allocation_plans.csv`, `file_notes.csv`). On the web client, files are bundled using `JSZip` into a single `.zip` archive (`money-matters-export-YYYY-MM-DD.zip`), preventing browser multi-download blocking while enforcing stealth privacy (only shared data + current user's private records exported).
- **Settings & History Tabbed Navigation**: Settings is organized into a 3-tab layout (`Profile`, `Household`, `Account & Data`) with container width expanded to `max-w-5xl`. History (`/dashboard/history`) is organized into a 2-tab layout (`Transactions` ledger & `Payday Allocations` audit history). In the Transactions ledger, amounts strictly follow color conventions based on flow direction: positive credits (`+`) are green (`text-emerald-600 dark:text-emerald-400`) and negative debits (`-`) are red (`text-rose-600 dark:text-rose-400`), across all transaction types including transfers.
- **Modal Dialog Portaling**: All modal dialogs (`ModalDialog`, `ConfirmDialog`) use `createPortal(..., document.body)` with client mount guards to break out of parent CSS stacking contexts and `backdrop-filter` containing blocks, guaranteeing consistent full-screen dark backdrops and centered modal presentation.
- **Bulk Database Operations (Anti-N+1)**: All database writes and queries must be batched. Individual inserts or queries in loops are forbidden. Plan lines and ledger entries are prepared in-memory and written in bulk. Deletions and status transitions must use `inArray` operators (e.g. archiving category arrays or deleting account relations) to prevent query waterfalls.
- **Parallelized Network Operations**: Onboarding configurations (e.g., category setup or schedule target insertions) and `reSetupBudget` category updates execute mutations concurrently using batch wrappers (`Promise.all`), preventing sequential async waterfalls.
- **Strict Whitelisted CORS**: Cross-origin resource sharing (CORS) is restricted to whitelisted domains (`*.kaesava.au` and dev `localhost`). Global wildcards (`origin: true`) are explicitly banned.
- **Predictable Unique ID Generation**: UI components generating HTML accessibility IDs must use React's `useId()` hook to avoid hydration mismatches and insecure random string generation.
- **Client & Server Log Scrubbing**: Auth tokens, JWT credentials, and PII must never be emitted to stdout/stderr via `console.log`. Logger abstractions automatically sanitize sensitive fields.

### 5.9 Typed Feature Flags, Kill Switches & Strict DB Typing Standards
- **Typed Feature Flags (`@money-matters/config`)**: All feature flags implement `FeatureFlag` with typed expiry, owner, tenant scoping, and mandatory `killSwitchEnabled: boolean`. When `killSwitchEnabled === true`, `isFeatureEnabled()` immediately disables the capability globally regardless of user rollout percentages.
- **Strict Database Typing (`DbOrTx`)**: Zero `any` policy enforced across all capability command and query signatures. All capability handlers receive strict `DbOrTx` (`DbClient | DbTransaction`) without default client injection parameters, guaranteeing deterministic transactional boundaries and full type safety.

### 5.10 App Versioning Architecture, Database Schema & Diagnostics
- **Independent App SemVer**: Apps (`apps/web`, `apps/mobile`) follow independent Semantic Versioning (`MAJOR.MINOR.PATCH-PRERELEASE`) managed automatically via `pnpm version:bump`.
- **Version Diagnostics Resolver**: `getWebVersionInfo()` (`apps/web/src/lib/version.ts`) and `getMobileVersionInfo()` (`apps/mobile/src/lib/version.ts`) construct `AppVersionInfo` DTOs containing version string, build number, channel (`development` | `preview` | `beta` | `production`), git commit hash, and target platform.
- **`app_versions` Schema (`packages/db/src/schema/app_version.ts`)**: Database table tracking releases per `appId`, version string, build number, release channel, `minSupportedApiVersion`, release notes, mandatory update flags, and release timestamps.
- **Bug Report Diagnostics Integration**: Bug report creation capability (`createBugReportHandler`) logs and stores dynamic app version strings and client environment metadata for rapid support debugging.
- **Automated Release Script (`scripts/version-bump.mjs`)**: CLI script callable via `pnpm version:bump` allowing automated version bumping (`patch`, `minor`, `major`, `beta`) across package manifests and Expo configs, staging standard Git release commits.


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
| **Inngest Cloud** | Async Workflows & Release 1 Weekly Email Cron | `.env` (`INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`), `/api/inngest` | **READY** (Production signing key & background event dispatch; mobile push crons staged for Release 2) | Local Inngest CLI (`pnpm run dev:inngest`) |
| **Stripe API** | Subscriptions, Billing & Webhooks | `.env` / Platform Secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs) | **READY** (Raw signature validation & 7-day read-only grace period) | Vitest mock handlers / Test mode price IDs |
| **Sentry SaaS** | APM & Exception Tracking | `.env` (`SENTRY_DSN`), `next.config.ts`, `sentry.*.config.ts` | **READY** (Integrated across Fastify API, Next.js Web, Expo Mobile) | Gated to production builds (`NODE_ENV === 'production'`) |
| **PostHog SaaS** | Product Analytics & Feature Flags | `.env` (`POSTHOG_API_KEY`, `POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`) | **READY** (Integrated across Fastify API, Next.js Web, Expo Mobile) | Safe null-logger fallback in development |

| **Expo & Expo Push** | Mobile App & Native Push Notifications | `apps/mobile`, `device_tokens` DB table, `https://exp.host/--/api/v2/push/send` | **READY** (Android Native Target SDK 54 / RN 0.81.5) | Expo Go / Android Emulator |
| **Photon (Komoot OSM)** | Public Geocoding | Public Service (`https://photon.komoot.io`) | **READY** (Zero-config public API, no keys required) | Public API fallback |
| **Monorepo Tools** | pnpm 9, Turbo 2, TypeScript 6, Vitest 4, ESLint 9 | `package.json`, `pnpm-workspace.yaml`, `turbo.json` | **READY** (100% strict type safety & Vitest unit tests) | Local turbo build & test pipelines |

---

## 9. UI Primitives, Router Procedures & Transfer Architecture

### 9.1 AmountField Component Specification (`packages/ui`)
- **Package Path**: `packages/ui/src/web/fields/AmountField.tsx`
- **Design Tokens**: Serene Finance primary `#2563eb`, navy `#1B2B4B`, font JetBrains Mono / font-mono tabular-nums.
- **Chevrons**: Custom stacked `ChevronUp` and `ChevronDown` from `lucide-react` stepping by 1. Native browser number spinners hidden via Tailwind utility classes `[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`.
- **Blur 2dp Formatting**: Numeric input is parsed and formatted via `.toFixed(2)` on blur. Empty values remain empty string.
- **Negative Support**: `allowNegative={true}` permits leading `-` character and renders formatted value with `text-rose-600 font-bold`. When `false` (default), minus sign is automatically stripped on input.
- **Input Boundaries**: Max 12 characters (10 integer digits, 2 decimal places).

### 9.2 DatePickerField Boundary Extensions (`packages/ui`)
- **Package Path**: `packages/ui/src/web/fields/DatePickerField.tsx`
- **Props**: `min?: string; max?: string; disabled?: boolean; id?: string;` forwarded directly to `<input type="date" min={min} max={max} ... />`.
- **Keyboard Protection**: Prevents arbitrary text entry on date picker via keydown filter (`Tab` and `Escape` allowed).

### 9.3 Transfer Router Procedures (`apps/api/src/routers/transfers.router.ts`)
- **`updateTransferEvent`**:
  - Access: `privateTenantProcedure` (RLS injected with `tenantId` and `userId`).
  - Input: `eventId` (UUID), `name?` (string min 1), `amount?` (regex 2dp), `expectedDate?` (YYYY-MM-DD).
  - Mutates `transferEvents` table fields without creating transaction ledgers or moving funds.
- **`executeTransferEvent`**:
  - Access: `privateTenantProcedure`.
  - Input: `eventId` (UUID), `name?` (optional string), `amount?` (optional string), `sourcePoolId?`, `destinationPoolId?`.
  - Updates `transferEvents.name`, sets `status = 'CONFIRMED'`, and invokes `moveMoneyCommand` with the resolved transfer name.

### 9.4 Expenses Router Note Formatting (`apps/api/src/routers/expenses.router.ts`)
- **`markExpensePaid`**:
  - Resolves `evt = await ctx.db.select().from(expenseEvents)...`
  - Injects `evt.name` into `transactionNote`: prepends event name to user note (e.g., `${evt.name} - ${input.note}`) or defaults to `Paid scheduled bill: ${evt.name}`.

### 9.5 Pool List Query Additions (`packages/capabilities/budgeting`)
- **`listPoolsQuery`**:
  - Selects and returns `pools.createdAt` to support pacing calculations.
  - Fixes default progress calculation: `target > 0 ? Math.min(100, Math.round((currentBalance / target) * 100)) : 0` (previously defaulted to 100% when balance/target was 0).

### 9.6 UI Primitives & Modal Interaction Hierarchy (`packages/ui`)
- **`PoolPicker`**:
  - Requires mandatory `showBalance: boolean` prop. Controls whether pool chips and dropdown options display current balance badges (useful for contextual selection where balance display might be redundant or clutter the UI).
- **Escape Key Dismissal Stack**:
  - `ConfirmDialog` and `ModalDialog` manage keydown listener registration to ensure that when a confirmation dialog is opened over an underlying form modal, pressing `Escape` dismisses only the topmost confirmation dialog first, preventing accidental parent modal dismissal.
- **`InfoTooltip` Portal Anchoring**:
  - Fixed-position portal rendered directly into `document.body` (`z-[9999]`) with viewport edge clamping, eliminating container overflow clipping in tables and flex headers.

### 9.7 Router & Data Export Refinements
- **Expense Schedule In-Place Updates (`apps/api/src/routers/expenses.router.ts`)**:
  - `updateExpenseSource` compares existing and incoming recurrence rules (`frequency`, `interval`, `startDate`, `endDate`, `dayOfWeek`, `dayOfMonth`). If recurrence patterns remain identical, schedule properties (name, amount, pool) are updated in-place without re-bursting future events, preserving individually modified or deleted occurrences.
- **Data Export Stealth Privacy (`packages/capabilities/tenant/src/export-data.ts`)**:
  - Enforces strict pool privacy filtering on export: pools are included only if `!p.bankAccountId || allowedBankAccountIds.has(p.bankAccountId) || p.createdBy === userId`. Export filenames standardized to `Income_Split_Plans.csv` and `Income_Split_Plan_Lines.csv`.

---

## 10. Web Pre-Login Architecture & Modular Auth Primitives

### 10.1 Unified Public Layout Components (`apps/web/src/components/public`)
- **`PublicHeader.tsx`**:
  - Standardized unauthenticated top navigation bar across `/terms`, `/privacy`, `/privacy/delete-account`, `/subscription/upgrade`, and `/invite/[token]`.
  - Brand identity rendering: SVG Logo mark + "Money Matters" (sans legacy attribution).
  - Navigation actions: Responsive back-links (*← Back to Home*, *← Back to Dashboard*) and direct *Sign In* trigger.
- **`PublicFooter.tsx`**:
  - Unified footer across all pre-login surfaces.
  - Dynamically renders current year copyright (`© {new Date().getFullYear()} Money Matters`), brand tagline, Serene Finance badge, and legal links (`/terms`, `/privacy`).

### 10.2 Modular Authentication Architecture (`apps/web/src/components/auth`)
- **`SocialAuthButtons.tsx`**: Modular Google and Apple SSO OAuth button group with SVG icons and Serene hover states.
- **`PasswordStrengthIndicator.tsx`**: 4-rule security checklist (≥8 chars, uppercase, lowercase, number/special character) with dynamic progress bar and color-coded strength score (Weak / Fair / Good / Strong).
- **`OtpVerificationView.tsx`**: 6-digit email confirmation code entry view with auto-advance inputs and Resend integration.
- **`SignInForm.tsx` & `SignUpForm.tsx`**: Isolated form components cleanly separated from page shells to ensure strict <250 lines compliance across `/sign-in` (98 lines) and `/sign-up` (108 lines).
- **`AuthModal.tsx` (`apps/web/src/components/landing`)**: Accessible overlay on `/` enabling in-place authentication without page navigation. Supports tab switching between Sign In and 60-Day Free Trial, backdrop dismiss, and `Escape` key capture.

- **`LandingHeader.tsx`**: Responsive header featuring passive `requestAnimationFrame` scrollspy navigation (`#why-us`, `#how-it-works`, `#simulator`, `#advantages`, `#pricing`, `#faq`), refined ghost Sign-In secondary action, high-contrast Serene Blue Free Trial CTA, and dynamic `authClient.useSession()` state (user identity badge + direct "Go to Dashboard →" link for authenticated visitors).
- **`page.tsx` (`apps/web/src/app`)**: Root landing page shell with smooth scrolling (`scroll-smooth`). Authenticated users are permitted to freely browse the landing page and simulator without forced redirects to `/dashboard`.
- **`LandingHero.tsx` & `HeroCtaActions.tsx`**: Dual-column hero layout combining the Before/After traditional vs Money Matters comparison with the interactive Serene Bento showcase and context-aware CTA actions tailored to visitor lifecycle state (anonymous visitors see "Start 60-Day Free Trial", active subscribers see "Go to Your Dashboard →", trial users see remaining trial days, and grace-period accounts see "Reactivate Full Access →").
- **`ProblemSection.tsx`**: 4 fatal budgeting traps illustrated with Serene Finance vector icons (zero decorative emojis).
- **`HowItWorksSection.tsx`**: 3-step automated payday allocation pipeline.
- **`PaycheckSimulator.tsx` (`apps/web/src/components/simulator/`)**: Full-Width Multi-Payline Cashflow & Payday Timeline Simulator (<250 lines modular architecture) featuring:
  - `SimulatorTimelineBar.tsx`: Day 0 to Day 28 interactive scrubber with milestone jump chips and auto-play controls.
  - `PaydayCheckpointBanner.tsx`: Interactive payday checkpoint that pauses at Day 0 / Day 14, allowing real-time adjustment of net income ($1,800 to $4,500) and instant waterfall recalculation.
  - `SimulatorPoolCard.tsx`: Variable-speed synchronized pool fill bars with subtle 100% completion celebration badge (`✓ 100% Funded`) and inconspicuous `[⇄ Transfer]` action.
  - `PoolTransferModal.tsx`: Accessible interactive modal enabling simulated ad-hoc transfers between pools with live balance adjustments and full keyboard Escape dismissal.
  - `SimulatorEventCallout.tsx`: Dynamic event narrative displaying cashflow outcomes, step bill deductions (Rent Day 3, Electricity Day 18), continuous daily living drawdowns, and manual transfer records.
  - `simulationData.ts`: Pure mathematical timeline engine modeling step bills deductions, cumulative daily drawdowns, dynamic income scaling, and surplus sweep into Home Loan Offset reserve.
- **`AdvantagesSection.tsx`**: 3 core mechanical guarantees: 5-Step Self-Healing Waterfall, 5-Level "Can We Afford This?" Engine, and Harmonious Shared & Personal Budgets (shared bill clarity + 100% confidential personal spending without surveillance).
- **`PricingSection.tsx`**: Transparent household pricing ($9.95/mo or $89/yr, founding member $69/yr) enhanced with dynamic customer lifecycle personalization (active subscriber ribbon, trial days countdown, grace period read-only alerts, and direct portal/checkout CTAs).
- **`LandingFooter.tsx`**: Standardized footer with brand links, legal routes, and customer-lifecycle-aware conversion banner.





