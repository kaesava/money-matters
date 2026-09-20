# Money Matters - Schema Data Dictionary

This document provides an exhaustive, authoritative reference of all active PostgreSQL database tables, columns, constraints, and their consumer touchpoints across the monorepo.

> **Zero Dead Code Invariant (AGENTS.md Rules 4, 6 & 22)**:
> Every table and column in this dictionary is actively consumed by at least one capability, API router, or UI screen.
> This invariant is automatically enforced on every CI run via `pnpm audit:schema` (part of `pnpm validate`).
> Any column added to `packages/db/src/schema` MUST be documented here and wired to active consumers; orphaned columns fail CI immediately.

---

## Standard Audit Columns (Inherited by all tables)
Every table in the `public` schema implements these standard columns defined in `@money-matters/db/src/schema/base.ts`:
- `id` (uuid, primary key, default `gen_random_uuid()`): Unique record identifier.
- `tenantId` (uuid, not null): Foreign key / scope to `tenants.id` ensuring multi-tenant isolation (Rule 5).
- `appId` (uuid, not null): Foreign key / scope to `apps.id` for multi-client partitioning.
- `createdAt` (timestamp, not null, default `now()`): Creation timestamp in UTC.
- `createdBy` (text, not null): User ID or system identity that created the record.
- `updatedAt` (timestamp, not null, default `now()`): Last modification timestamp in UTC.
- `updatedBy` (text, not null): User ID or system identity that performed the last update.
- `archivedAt` (timestamp, nullable): Soft deletion timestamp in UTC. Active queries filter `archivedAt IS NULL`.

---

## Active Tables & Column Reference

### 1. `users` (`packages/db/src/schema/user.ts`)
Neon DB Auth user accounts.
- `name` (text, not null): Display name of the user.
- `email` (text, not null, unique): Primary email address used for login and notifications.
- `emailVerified` (boolean, not null): Email verification status.
- `image` (text, nullable): Avatar URL (rendered via `next/image` with `unoptimized`).
- **Consumers**: `@money-matters/capability-tenant`, Neon DB Auth, UI user badge/profile.

### 2. `tenants` (`packages/db/src/schema/tenant.ts`)
Multi-tenant container (household / organization).
- `name` (text, not null): Household or workspace name.
- `subscriptionTier` (`free` | `pro` | `partner`, default `'free'`): Subscription entitlement tier.
- `stripeCustomerId` (text, nullable): Stripe customer reference.
- `stripeSubscriptionId` (text, nullable): Active Stripe subscription ID.
- `subscriptionStatus` (`trialing` | `active` | `past_due` | `canceled` | `unpaid` | `incomplete` | `incomplete_expired` | `paused`, default `'trialing'`): Billing lifecycle status.
- `subscriptionEndsAt` (timestamp with time zone, nullable): Stripe billing period end date.
- `cancelAtPeriodEnd` (boolean, default `false`): Subscription cancellation pending flag.
- `setupCompletedAt` (timestamp with time zone, nullable): Household setup completion timestamp.
- `setupStatus` (`PENDING` | `COMPLETED`, default `'PENDING'`): Household onboarding setup status.
- **Consumers**: `packages/capabilities/tenant`, `packages/capabilities/budgeting`, `packages/capabilities/stripe-billing`, Settings & Subscription UI, Web/Mobile Setup Wizards.

### 3. `tenant_users` (`packages/db/src/schema/tenant_user.ts`)
Join table linking users to tenants with role-based access.
- `userId` (uuid, not null): Reference to `users.id`.
- `role` (`OWNER` | `MEMBER` | `VIEWER`, default `'MEMBER'`): Access level.
- **Consumers**: `@money-matters/core` (auth context), `@money-matters/capability-tenant`.

### 4. `bank_accounts` (`packages/db/src/schema/bank_account.ts`)
Physical financial institution accounts.
- `name` (text, not null): Account label (e.g. "Everyday Checking", "High Interest Saver").
- `accountType` (`SAVINGS` | `CHECKING` | `CREDIT_CARD` | `LOAN` | `OFFSET`, not null): Banking product type.
- `institution` (text, nullable): Bank name (e.g. "Up Bank", "CommBank", "Macquarie").
- `accountNumberLast4` (varchar(4), nullable): Last 4 digits for reconciliation.
- `currentBalance` (numeric(12,2), not null, default `'0.00'`): Synced or manually entered ledger balance.
- `isPrivate` (boolean, not null, default `false`): Stealth privacy isolation flag.
- `userId` (uuid, nullable): Owner user ID when `isPrivate` is true.
- `isOffset` (boolean, not null, default `false`): Mortage offset linking flag.
- `targetReserveAmount` (numeric(12,2), nullable): Minimum balance floor protection.
- **Consumers**: `packages/capabilities/budgeting`, `packages/capabilities/transactions`, Bank Accounts UI.

### 5. `pools` (`packages/db/src/schema/pool.ts`)
Virtual budgeting buckets allocated on payday.
- `bankAccountId` (uuid, not null): Underlying bank account hosting the funds.
- `name` (text, not null): Pool title (e.g. "Everyday", "Committed Bills", "Short-term Savings").
- `poolType` (`EVERYDAY` | `REGULAR` | `GOAL` | `IRREGULAR`, not null): Allocation behavior category.
- `isSurplusTarget` (boolean, not null, default `false`): Designates the overflow bucket (usually Everyday).
- `targetBalance` (numeric(12,2), nullable): Target balance for savings/reserve pools.
- **Consumers**: `packages/capabilities/budgeting` (waterfall allocation engine, pool management), Dashboard, Categories screen.

### 6. `categories` (`packages/db/src/schema/category.ts`)
Budget categories mapped directly under pools.
- `poolId` (uuid, not null): Parent pool.
- `name` (text, not null): Category label (e.g. "Groceries", "Electricity", "Netflix").
- `isEssential` (boolean, not null, default `false`): Priority tag during shortfall/deficit repair.
- `monthlyAmount` (numeric(12,2), nullable): Target monthly spending/allocation amount.
- `enteredAmount` (numeric(12,2), nullable): Amount entered in original user frequency.
- `budgetFrequency` (`WEEKLY` | `FORTNIGHTLY` | `MONTHLY` | `ANNUALLY`, default `'MONTHLY'`): Recurrence interval.
- `icon` (text, nullable): Lucide icon identifier.
- **Consumers**: `packages/capabilities/budgeting`, Categories UI, Allocation preview.

### 7. `income_sources` (`packages/db/src/schema/income.ts`)
Recurring or scheduled income streams (paychecks, bonuses).
- `name` (text, not null): Income label (e.g. "Primary Salary", "Freelancing").
- `amount` (numeric(12,2), not null): Expected net income amount.
- `isRecurring` (boolean, not null, default `true`): Recurrence flag.
- `frequency` (`WEEKLY` | `FORTNIGHTLY` | `MONTHLY` | `ANNUALLY`, default `'MONTHLY'`): Schedule frequency.
- `interval` (integer, default `1`): Multiplier (e.g. every 2 weeks).
- `startDate` (date, not null): Anchor date for schedule projection.
- `endDate` (date, nullable): Optional completion date.
- `rrule` (text, nullable): RFC 5545 recurrence rule.
- `receivingAccountId` (uuid, nullable): Bank account receiving funds.
- `isPartner` (boolean, not null, default `false`): Tag indicating partner's income.
- **Consumers**: `packages/capabilities/budgeting`, Income Schedules UI, Timeline projections.

### 8. `income_events` (`packages/db/src/schema/income_event.ts`)
Materialized payday instances projected or confirmed from income sources.
- `incomeSourceId` (uuid, not null): Origin income source.
- `expectedDate` (date, not null): Projected payday date.
- `expectedAmount` (numeric(12,2), not null): Projected net pay amount.
- `actualAmount` (numeric(12,2), nullable): Reconciled actual net pay deposited.
- `status` (`PENDING` | `CONFIRMED`, not null, default `'PENDING'`): Event lifecycle status. `CONFIRMED` is set when the payday allocation is confirmed.
- `receivingAccountId` (uuid, nullable): Bank account deposited to.
- **Consumers**: `packages/capabilities/budgeting`, Paycheck Detail, Dashboard, Matrix Plan.

### 9. `allocation_plans` (`packages/db/src/schema/allocation_plan.ts`)
The payday split plan created for an income event. Confirmed plans are strictly immutable.
- `incomeEventId` (uuid, not null): Parent income event.
- `totalIncomeAmount` (numeric(12,2), not null): Total pay distributed.
- `status` (`PENDING` | `CONFIRMED`, not null, default `'PENDING'`): Plan status. `PENDING` is used for future-planned (pre-payday) splits; `CONFIRMED` is set upon payday execution.
- **Consumers**: `packages/capabilities/budgeting`, Payday Allocation Split Screen, History log.

### 10. `allocation_plan_lines` (`packages/db/src/schema/allocation_plan_line.ts`)
Line-item allocations mapping money to specific pools on payday.
- `planId` (uuid, not null): Parent allocation plan.
- `poolId` (uuid, not null): Destination pool.
- `proposedAmount` (numeric(12,2), not null): Engine-computed proposed allocation amount.
- `confirmedAmount` (numeric(12,2), nullable): User-confirmed amount (overrides proposedAmount when set).
- `reasoning` (text, nullable): Explainability text generated by the waterfall engine.
- **Consumers**: `packages/capabilities/budgeting`, Payday Allocation Split Screen, Execution engine.

### 11. `transaction_ledger` (`packages/db/src/schema/transaction_ledger.ts`)
Double-entry and single-entry ledger transactions for expenses, deposits, and transfers.
- `poolId` (uuid, **not null**): Allocated pool debited/credited.
- `categoryId` (uuid, nullable): Spending category.
- `bankAccountId` (uuid, nullable): Bank account where movement took place.
- `planLineId` (uuid, nullable): Linked allocation line when created by a payday split.
- `flowType` (`DEBIT` | `CREDIT`, not null): Inflow vs outflow direction.
- `transactionType` (text, nullable): Operational subtype (`EXPENSE`, `INCOME_SPLIT`, `INCOME_DIRECT`, `TRANSFER_OUT`, `TRANSFER_IN`, `ACCOUNT_ALIGNMENT`, `BALANCE_ADJUSTMENT`, `OPENING_BALANCE`).
- `amount` (numeric(12,2), not null): Movement amount.
- `note` (text, nullable): User note or transfer description.
- `source` (`MANUAL` | `SPLIT` (V1 active), `AUTO` | `IMPORT` (deprecated, unused), not null, default `'MANUAL'`): Source of record.
- `recordedAt` (timestamp with time zone, not null, default `now()`): Transaction date in UTC.
- `idempotencyKey` (text, not null, unique): Duplicate submission prevention key.
- `transferGroupId` (uuid, nullable): UUID shared between paired `TRANSFER_OUT` and `TRANSFER_IN` legs.
- **Consumers**: `packages/capabilities/transactions`, `packages/capabilities/budgeting`, History / Transactions UI (Web & Mobile).

### 12. `device_tokens` (`packages/db/src/schema/device_token.ts`)
Push notification tokens for mobile clients.
- `userId` (uuid, not null): Owner user.
- `token` (text, not null): Expo push notification token.
- `platform` (`IOS` | `ANDROID` | `WEB`, not null): Device operating system.
- `lastSeenAt` (timestamp, not null, default `now()`): Liveness timestamp.
- **Consumers**: `packages/capabilities/notifications`, Mobile push registration.

### 13. `user_preferences` (`packages/db/src/schema/user_preference.ts`)
Global individual user preferences.
- `userId` (uuid, not null, unique): Target user.
- `theme` (`LIGHT` | `DARK` | `SYSTEM`, not null, default `'SYSTEM'`): UI theme.
- `locale` (text, not null, default `'en-AU'`): Language and formatting locale.
- `notificationsEnabled` (boolean, not null, default `true`): Master notification gate.
- **Consumers**: `apps/api` (`tenant.router.ts`), User Settings UI.

### 14. `tenant_user_preferences` (`packages/db/src/schema/tenant_user_preference.ts`)
Scoped preferences per user within a specific household/tenant and application.
- `tenantId` (uuid, not null): Target tenant.
- `userId` (uuid, not null): Target user.
- `appId` (uuid, not null): Target application.
- `appPreferences` (jsonb, not null): Scoped per-user tenant notification delivery preferences (`payday_alerts_enabled`, `shortfall_alerts_enabled`, `bill_reminders_enabled`, `weekly_digest_enabled`).
- **Consumers**: `packages/capabilities/notifications`, `apps/api` (`tenant.router.ts`), Notification Settings UI.

### 15. `expense_sources` (`packages/db/src/schema/expense_source.ts`)
Committed bill schedules and recurring expense definitions.
- `name` (text, not null): Bill/expense title (e.g. "Rent", "Health Insurance").
- `amount` (numeric(12,2), not null): Expected billing amount.
- `isRecurring` (boolean, not null, default `true`): Recurring vs one-off flag.
- `frequency` (`WEEKLY` | `FORTNIGHTLY` | `MONTHLY` | `ANNUALLY`, default `'MONTHLY'`): Recurrence interval.
- `interval` (integer, default `1`): Recurrence multiplier.
- `startDate` (date, not null): First due date anchor.
- `endDate` (date, nullable): Expiration date for fixed-term bills.
- `rrule` (text, nullable): RFC 5545 recurrence rule.
- `categoryId` (uuid, nullable): Mapped budgeting category.
- `targetPoolId` (uuid, nullable): Dedicated pool ring-fencing the bill.
- **Consumers**: `packages/capabilities/budgeting`, Bills & Committed Spending UI, Timeline projections.

### 16. `expense_events` (`packages/db/src/schema/expense_event.ts`)
Materialized bill instances projected into future payday cycles.
- `expenseSourceId` (uuid, not null): Parent expense source.
- `expectedDate` (date, not null): Due date.
- `expectedAmount` (numeric(12,2), not null): Due amount.
- `actualAmount` (numeric(12,2), nullable): Paid amount upon reconciliation.
- `status` (`PENDING` | `CONFIRMED`, not null, default `'PENDING'`): Payment lifecycle status. `CONFIRMED` is set when the bill is marked as paid.
- `actualDate` (date, nullable): Reconciliation date when bill was paid.
- **Consumers**: `packages/capabilities/budgeting`, Bill Coverage queries, Upcoming Timeline, Dashboard.

### 17. `transfer_sources` (`packages/db/src/schema/transfer_source.ts`)
Scheduled recurring money movements between pools.
- `name` (text, not null): Transfer title (e.g. "Weekly Savings Sweep").
- `amount` (numeric(12,2), not null): Transfer amount.
- `sourcePoolId` (uuid, not null): Origin pool.
- `destinationPoolId` (uuid, not null): Destination pool.
- `frequency` (`WEEKLY` | `FORTNIGHTLY` | `MONTHLY` | `ANNUALLY`, default `'MONTHLY'`): Recurrence interval.
- `interval` (integer, default `1`): Multiplier.
- `startDate` (date, not null): Starting anchor date.
- **Consumers**: `packages/capabilities/budgeting`, Scheduled Transfers UI.

### 18. `transfer_events` (`packages/db/src/schema/transfer_event.ts`)
Materialized transfer instances scheduled across payday cycles.
- `transferSourceId` (uuid, not null): Parent transfer schedule.
- `expectedDate` (date, not null): Scheduled execution date.
- `expectedAmount` (numeric(12,2), not null): Scheduled amount.
- `status` (`PENDING` | `CONFIRMED`, not null, default `'PENDING'`): Lifecycle status. `CONFIRMED` is set when the transfer is executed.
- **Consumers**: `packages/capabilities/budgeting`, Matrix Plan, Timeline.

### 19. `apps` (`packages/db/src/schema/app.ts`)
Application definition for multi-client tenant installations.
- `name` (text, not null): Application name (e.g. "Money Matters").
- `slug` (text, not null, unique): URL and tenant identifier slug.
- `description` (text, nullable): App description.
- **Consumers**: `@money-matters/db/src/seed.ts`, App initialization.

### 20. `early_access` (`packages/db/src/schema/early_access.ts`)
Landing page waitlist and beta invitation requests.
- `email` (text, not null, unique): Registered email address.
- `ipAddress` (text, nullable): Anti-spam tracking.
- `userAgent` (text, nullable): Browser diagnostics.
- `status` (text, not null, default `'PENDING'`): Signup status.
- **Consumers**: `apps/api/src/routers/early-access.router.ts`, Landing page newsletter form.

### 21. `processed_webhooks` (`packages/db/src/schema/processed_webhooks.ts`)
Idempotency table preventing duplicate processing of Stripe webhooks.
- `eventId` (text, not null, unique): Stripe event identifier (`evt_...`).
- `eventType` (text, not null): Event name (e.g. `customer.subscription.updated`).
- `processedAt` (timestamp, not null, default `now()`): Execution timestamp.
- **Consumers**: `packages/capabilities/stripe-billing/src/webhook-handler.ts`.

### 22. `billing_invoices` (`packages/db/src/schema/billing_invoice.ts`)
Subscription invoices and receipts synced from Stripe.
- `stripeInvoiceId` (text, not null, unique): Stripe invoice identifier (`in_...`).
- `amountPaid` (numeric(12,2), not null): Amount collected.
- `currency` (text, not null, default `'aud'`): Invoice currency.
- `status` (text, not null): Payment status (`paid`, `open`, `void`).
- `invoicePdf` (text, nullable): Direct URL to hosted invoice PDF.
- `hostedInvoiceUrl` (text, nullable): Direct link to Stripe checkout/receipt.
- `paidAt` (timestamp, nullable): Payment completion timestamp.
- **Consumers**: `packages/capabilities/stripe-billing`, Settings & Invoices UI.

---

## Dropped / Purged Tables (Zero Dead Code Archive)
The following tables were audited, found to be dead or orphaned (0 reads, 0 writes, or mock artifacts), and were permanently dropped from the PostgreSQL database in Migration `0024_prune_dead_tables_and_columns.sql`:
1. `app_categories`: Replaced by direct pool/category seeding during tenant onboarding.
2. `app_versions`: Replaced by static `@money-matters/config` client build constants.
3. `bug_reports`: Replaced by direct `mailto:support@moneymatters.kaesava.au` client diagnostic dispatches.
4. `file_notes`: Orphaned stub; no capabilities or UI ever read or wrote to this table.
5. `category_schedules`: Never populated; schedules live on `expense_sources` and `income_sources`.
6. `bank_account_category_mappings`: Replaced by `pools.bankAccountId` and `categories.poolId`.

## Pruned Inert Columns
The following 21 inert columns were permanently dropped in Migration `0024`:
- `tenants.fy_end_month_day`
- `pools.waterfall_priority`, `pools.rollover_rule`, `pools.colour`, `pools.icon`
- `categories.colour`
- `transfer_sources.rrule`, `transfer_sources.end_date`
- `transfer_events.note`, `transfer_events.is_overridden`
- `income_events.is_overridden`
- `expense_events.is_overridden`
- Inert notification JSON toggles: `paydayAlertsEnabled`, `shortfallAlertsEnabled`, `billRemindersEnabled`, `weeklyDigestEnabled`.
