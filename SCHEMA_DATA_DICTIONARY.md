# Money Matters — Authoritative Data Dictionary & RLS Registry

> **Version**: 2.1.0 (Unified Flat Envelopes Architecture + Master RLS & Consumer Registry)  
> **Compliance**: Enforced via `pnpm audit:schema` in `pnpm validate`.  
> **Agent Protocol**: This file is the **single source of truth** for all 23 Drizzle tables, column definitions, RLS policies (`ENABLE` / `FORCE ROW LEVEL SECURITY`), session variable requirements (`app.current_tenant_id`, `app.current_user_id`), and production code consumers. Update this file whenever any schema, migration, RLS policy, or table consumer changes.

---

## Master Table, Audit Compliance, RLS Policy & Consumer Registry (23 Tables)

| # | SQL Table Name (`Drizzle Export`) | Schema File | Domain Columns | Audit Columns Status (`id`, `tenantId`, `appId`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `archivedAt`, `archivedBy`) | RLS Enabled / Forced in Migrations | RLS Policy Type & Session Vars | Production Code Consumers |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `ai_usage` (`aiUsage`) | `packages/db/src/schema/ai_usage.ts` (31L) | `periodMonth`, `llmCalls` | Complete (`0059`: `appId`, `archivedBy`) | Enabled + **Forced** (`0045`) | `tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/assistant/src/commands/ask-assistant.command.ts`, `queries/get-ai-quota-status.query.ts`, `packages/capabilities/tenant/src/delete-account.ts` |
| 2 | `allocation_plans` (`allocationPlans`) | `packages/db/src/schema/allocation_plan.ts` (16L) | `incomeEventId`, `status`, `totalIncomeAmount`, `confirmedAt` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0047`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (joins `income_events -> income_sources -> bank_accounts` on `app.current_user_id`) | `apps/api/src/routers/payday/*`, `packages/capabilities/budgeting/*`, `simulation/*`, `tenant/src/delete-account.ts`, `tenant/src/export-data.ts` |
| 3 | `allocation_plan_lines` (`allocationPlanLines`) | `packages/db/src/schema/allocation_plan_line.ts` (16L) | `planId`, `envelopeId`, `proposedAmount`, `confirmedAmount`, `reasoning` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0047`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (joins `envelopes` on `app.current_user_id`) | `apps/api/src/routers/payday/*`, `packages/capabilities/budgeting/*`, `simulation/*`, `tenant/src/delete-account.ts` |
| 4 | `allocation_strategies` (`allocationStrategies`) | `packages/db/src/schema/allocation_strategy.ts` (17L) | `name`, `presetKey`, `description`, `isDefault`, `isPrivate`, `userId` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0046`, `0058`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (`0058`: `is_private = false OR user_id = app.current_user_id`) | `apps/api/src/routers/payday/payday-strategy.procedures.ts`, `packages/capabilities/budgeting/src/commands/*`, `queries/*`, `tenant/src/handlers/create-tenant.ts`, `partner-invites.ts` |
| 5 | `allocation_strategy_steps` (`allocationStrategySteps`) | `packages/db/src/schema/allocation_strategy_step.ts` (36L) | `strategyId`, `orderIndex`, `stepType`, `targetEnvelopeId`, `config` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0046`) | `tenant_isolation` | `packages/capabilities/budgeting/src/commands/*`, `queries/*`, `tenant/src/handlers/create-tenant.ts`, `partner-invites.ts` |
| 6 | `apps` (`apps`) | `packages/db/src/schema/app.ts` (25L) | `name`, `slug`, `featureFlags` | Global catalog table: `id`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `archivedAt`, `archivedBy` (`0059`) | **Disabled** (Global catalog table) | None | `apps/api/src/routers/*`, `packages/capabilities/budgeting/src/commands/restore-item.command.ts`, `tenant/src/handlers/create-tenant.ts`, `packages/db/src/set-app-flag.ts` |
| 7 | `bank_accounts` (`bankAccounts`) | `packages/db/src/schema/bank_account.ts` (23L) | `name`, `bankProvider`, `accountType`, `lastKnownBalance`, `unbudgetedBuffer`, `lastBalanceMatchedAt`, `isPrivate`, `userId` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0016`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (`NOT is_private OR user_id = app.current_user_id`) | `apps/api/src/routers/*`, `packages/capabilities/budgeting/*`, `simulation/*`, `tenant/*`, `transactions/*` |
| 8 | `billing_invoices` (`billingInvoices`) | `packages/db/src/schema/billing_invoice.ts` (38L) | `stripeInvoiceId`, `stripeCustomerId`, `stripeSubscriptionId`, `amountPaid`, `currency`, `status`, `paidAt`, `periodStart`, `periodEnd`, `invoicePdfUrl`, `hostedInvoiceUrl` | Complete (`0059`: `appId`, `archivedBy`) | Enabled + **Forced** (`0031`) | `billing_invoices_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/billing/src/commands/*`, `queries/list-invoices.ts`, `webhooks/handlers/invoice-events.ts`, `tenant/src/delete-account.ts` |
| 9 | `bug_reports` (`bugReports`) | `0021_add_bug_reports.sql` (table) | `title`, `description`, `category`, `severity`, `status`, `appVersion`, `platform`, `pageUrl`, `deviceInfo` | Complete (`tenantAndTimestamps`) | Enabled (`0021`) + **Forced** (`0058`) | `tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/bug-reports/*`, `packages/capabilities/tenant/src/delete-account.ts` |
| 10 | `device_tokens` (`deviceTokens`) | `packages/db/src/schema/device_token.ts` (14L) | `userId`, `platform`, `token` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0031`) | `device_tokens_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/notifications/src/push-tokens.ts`, `retention-workflows.ts`, `tenant/src/delete-account.ts` |
| 11 | `early_access_subscribers` (`earlyAccessSubscribers`) | `packages/db/src/schema/early_access.ts` (23L) | `appId`, `email`, `lastSubscribedAt` | Global waitlist table: `id`, `appId`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `archivedAt`, `archivedBy` (`0059`) | **Disabled** (Public waitlist table) | None | `apps/api/src/routers/tenant/tenant-core.procedures.ts` |
| 12 | `envelopes` (`envelopes`) | `packages/db/src/schema/envelope.ts` (52L) | `name`, `envelopeType`, `bankAccountId`, `safetyBufferFloor`, `monthlyAmount`, `enteredAmount`, `budgetFrequency`, `startDate`, `endDate`, `rrule`, `targetAmount`, `isSurplusTarget`, `isPrivate`, `userId`, `orderIndex`, `goalType`, `fundingMode`, `isPriority`, `lastNotifiedAt`, `lastBurstDate` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0016`, `0044`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (`NOT is_private OR user_id = app.current_user_id`) | `apps/api/src/routers/*`, `apps/api/src/inngest/*`, `packages/capabilities/budgeting/*`, `notifications/*`, `simulation/*`, `tenant/*`, `transactions/*`, `packages/db/src/queries/envelope-balances.ts` |
| 13 | `expense_events` (`expenseEvents`) | `packages/db/src/schema/expense_event.ts` (37L) | `envelopeId`, `name`, `expectedDate`, `actualDate`, `expectedAmount`, `actualAmount`, `isScheduled`, `note`, `status` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0044`, `0047`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (joins `envelopes` on `app.current_user_id`) | `apps/api/src/routers/*`, `packages/capabilities/budgeting/*`, `notifications/*`, `simulation/*`, `tenant/*`, `transactions/*` |
| 14 | `file_notes` (`fileNotes`) | `packages/db/src/schema/file_note.ts` (31L) | `entityType`, `entityId`, `comment`, `fileKey`, `fileName`, `fileMimeType`, `fileSize`, `isPrivate`, `userId` | Complete (`tenantAndTimestamps`) | Enabled (`0051`) + **Forced** (`0058`) | `tenant_and_stealth_isolation` (`tenant_id` + `is_private = false OR user_id = app.current_user_id`) | `packages/capabilities/file-notes/src/handlers/index.ts`, `packages/capabilities/tenant/src/handlers/partner-invites.ts` |
| 15 | `income_sources` (`incomeSources`) | `packages/db/src/schema/income.ts` (28L) | `name`, `amount`, `incomeType`, `receivingAccountId`, `rrule`, `startDate`, `endDate`, `contributionMode`, `contributionValue`, `lastBurstDate` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0047`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (joins `bank_accounts` on `receiving_account_id`) | `apps/api/src/routers/*`, `apps/api/src/inngest/*`, `packages/capabilities/budgeting/*`, `tenant/*` |
| 16 | `income_events` (`incomeEvents`) | `packages/db/src/schema/income_event.ts` (25L) | `incomeSourceId`, `name`, `expectedDate`, `actualDate`, `expectedAmount`, `actualAmount`, `contributionMode`, `contributionValue`, `note`, `status` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0047`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (joins `income_sources -> bank_accounts`) | `apps/api/src/routers/*`, `packages/capabilities/budgeting/*`, `notifications/*`, `simulation/*`, `tenant/*` |
| 17 | `processed_webhooks` (`processedWebhooks`) | `packages/db/src/schema/processed_webhooks.ts` (9L) | `eventId` (PK), `eventType`, `processedAt` | Global idempotency table | **Disabled** (Global Stripe webhook table) | None | `packages/capabilities/billing/src/webhooks/stripe-webhook-handler.ts`, `packages/capabilities/notifications/src/retention-workflows.ts` |
| 18 | `tenants` (`tenants`) | `packages/db/src/schema/tenant.ts` (46L) | `appId`, `name`, `country`, `currency`, `timezone`, `state`, `postcode`, `premiumEnabled`, `subscriptionStatus`, `trialStartedAt`, `trialEndsAt`, `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`, `subscribedAt`, `subscriptionEndsAt`, `gracePeriodEndsAt`, `cancelAtPeriodEnd`, `planType`, `nextBillingAt`, `trialConvertedAt`, `setupCompletedAt`, `setupStatus` | Has `id`, `appId`, `...timestamps` (`id` is tenantId) | Enabled + **Forced** (`0014`) | `tenant_isolation`: `id = current_setting('app.current_tenant_id')` | `apps/api/src/routers/*`, `apps/api/src/trpc/edge-context.ts`, `apps/api/src/inngest/*`, `packages/capabilities/assistant/*`, `billing/*`, `budgeting/*`, `notifications/*`, `tenant/*` |
| 19 | `tenant_users` (`tenantUsers`) | `packages/db/src/schema/tenant_user.ts` (36L) | `tenantId`, `userId`, `inviteEmail`, `role`, `inviteToken`, `inviteStatus`, `invitedAt`, `expiresAt` | Complete (`0059`: `appId`) | Enabled + **Forced** (`0014`) | `tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `apps/api/src/routers/tenant/*`, `apps/api/src/trpc/edge-context.ts`, `packages/capabilities/notifications/*`, `tenant/*` |
| 20 | `tenant_user_preferences` (`tenantUserPreferences`) | `packages/db/src/schema/tenant_user_preference.ts` (60L) | `userId`, `tenantId`, `appId`, `appPreferences` | Complete (`createdBy`/`updatedBy` nullable) | Enabled + **Forced** (`0040`) | `tenant_user_preferences_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `apps/api/src/routers/tenant/*`, `packages/capabilities/notifications/*`, `tenant/src/delete-account.ts` |
| 21 | `transaction_ledger` (`transactionLedger`) | `packages/db/src/schema/transaction_ledger.ts` (43L) | `envelopeId`, `bankAccountId`, `planLineId`, `flowType`, `transactionType`, `amount`, `idempotencyKey`, `note`, `source`, `transferGroupId`, `recordedAt` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0016`, `0044`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (joins `envelopes` on `app.current_user_id`) | `apps/api/src/routers/*`, `packages/capabilities/budgeting/*`, `notifications/*`, `simulation/*`, `tenant/*`, `transactions/*`, `packages/db/src/queries/envelope-balances.ts` |
| 22 | `transfer_events` (`transferEvents`) | `packages/db/src/schema/transfer_event.ts` (19L) | `sourceEnvelopeId`, `destinationEnvelopeId`, `name`, `expectedDate`, `expectedAmount`, `actualAmount`, `status` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0044`, `0047`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (checks both `source_envelope_id` and `destination_envelope_id` against `envelopes`) | `apps/api/src/routers/transfers.router.ts`, `packages/capabilities/budgeting/*`, `tenant/src/delete-account.ts` |
| 23 | `users` (`users`) & `user_preferences` (`userPreferences`) | `packages/db/src/schema/user.ts` (25L) & `user_preference.ts` (28L) | `users`: `email`, `displayName`, `avatarUrl`, `hasUsedTrial`; `user_preferences`: `userId`, `theme`, `language`, `timezone`, `showIcons`, `notificationEmail`, `phoneCountryCode`, `phoneNumber` | Global user tables (`0059`: `createdBy`, `updatedBy`, `archivedAt`, `archivedBy`) | `users`: Disabled; `user_preferences`: Enabled (`0039`) + **Forced** (`0058`) | `user_preferences_user_isolation`: `user_id = current_setting('app.current_user_id')` | `apps/api/src/routers/tenant/*`, `apps/api/src/trpc/edge-context.ts`, `packages/capabilities/billing/*`, `file-notes/*`, `notifications/*`, `tenant/*` |

---

## Per-Table Column Definitions

## Table: `allocation_plans` (`allocation_plan.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `incomeEventId` | uuid | No | Domain column |
| `status` | allocationPlanStatusEnum | No | Domain column |
| `totalIncomeAmount` | numeric | No | Domain column |
| `confirmedAt` | timestamp | Yes | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `allocation_plan_lines` (`allocation_plan_line.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `planId` | uuid | No | Domain column |
| `envelopeId` | uuid | No | Domain column |
| `proposedAmount` | numeric | No | Domain column |
| `confirmedAmount` | numeric | Yes | Domain column |
| `reasoning` | text | Yes | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `allocation_strategies` (`allocation_strategy.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `name` | varchar | No | Strategy profile name |
| `presetKey` | varchar | No | Canonical preset key or CUSTOM |
| `description` | text | Yes | Plain-English strategy explanation |
| `isDefault` | boolean | No | Flag indicating active strategy for tenant |
| `isPrivate` | boolean | No | True if strategy applies to private personal envelopes |
| `userId` | uuid | Yes | Owner User ID for private personal strategy |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `allocation_strategy_steps` (`allocation_strategy_step.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `strategyId` | uuid | Yes | Foreign key to allocation_strategies |
| `orderIndex` | integer | No | Order index within the allocation recipe |
| `stepType` | allocationStepTypeEnum | No | Allocation rule block type |
| `targetEnvelopeId` | uuid | Yes | Target envelope for fixed/sweep steps |
| `config` | jsonb | Yes | Optional step configuration parameters |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `apps` (`app.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `name` | varchar | No | Domain column |
| `slug` | varchar | No | Domain column |
| `featureFlags` | jsonb | No | App-level feature flags and entitlements (`fileNotes`, `askPenny`, `privateMode`, `simulation`, `customAllocationRules`, quotas) |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `bank_accounts` (`bank_account.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `name` | varchar | No | Domain column |
| `bankProvider` | varchar | No | Domain column |
| `accountType` | accountTypeEnum | No | Domain column |
| `lastKnownBalance` | numeric | No | Domain column |
| `unbudgetedBuffer` | numeric | No | Domain column |
| `lastBalanceMatchedAt` | timestamp | Yes | Balance reconciliation timestamp |
| `isPrivate` | boolean | No | Domain column |
| `userId` | uuid | Yes | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `billing_invoices` (`billing_invoice.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `tenantId` | uuid | Yes | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `stripeInvoiceId` | varchar | No | Domain column |
| `stripeCustomerId` | varchar | No | Domain column |
| `stripeSubscriptionId` | varchar | Yes | Domain column |
| `amountPaid` | numeric | No | Domain column |
| `currency` | varchar | No | Domain column |
| `status` | varchar | No | Domain column |
| `paidAt` | timestamp | Yes | Domain column |
| `periodStart` | timestamp | Yes | Domain column |
| `periodEnd` | timestamp | Yes | Domain column |
| `invoicePdfUrl` | varchar | Yes | Domain column |
| `hostedInvoiceUrl` | varchar | Yes | Domain column |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `device_tokens` (`device_token.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `userId` | uuid | No | Domain column |
| `platform` | varchar | No | Domain column |
| `token` | varchar | No | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `early_access_subscribers` (`early_access.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `appId` | uuid | No | Application ID |
| `email` | varchar | No | Domain column |
| `lastSubscribedAt` | timestamp | No | Domain column |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `envelopes` (`envelope.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `name` | varchar | No | Domain column |
| `envelopeType` | envelopeTypeEnum | No | Domain column |
| `bankAccountId` | uuid | Yes | Domain column |
| `safetyBufferFloor` | numeric | Yes | Domain column |
| `fundingMode` | fundingModeEnum | Yes | Funding mode: TARGET_BALANCE or RECURRING |
| `monthlyAmount` | numeric | Yes | Domain column |
| `enteredAmount` | numeric | Yes | Domain column |
| `budgetFrequency` | varchar | Yes | Domain column |
| `startDate` | varchar | Yes | Domain column |
| `endDate` | varchar | Yes | Domain column |
| `rrule` | varchar | Yes | Domain column |
| `targetAmount` | numeric | Yes | Target milestone or buffer amount |
| `isPriority` | boolean | No | Priority flag for allocation waterfalls (Priority Bills & Priority Goals) |
| `isSurplusTarget` | boolean | No | Domain column |
| `isPrivate` | boolean | No | Domain column |
| `generateEvents` | boolean | No | Controls auto-generation of upcoming scheduled expense events (`true` only for `BILL` + `RECURRING`; normalized to `false` otherwise) |
| `userId` | uuid | Yes | Domain column |
| `emoji` | varchar | Yes | Visual envelope emoji icon |
| `colorKey` | varchar | Yes | Visual envelope theme color key |
| `orderIndex` | integer | No | Domain column |
| `lastBurstDate` | date | Yes | Furthest event date generated during previous recurrence burst |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `expense_events` (`expense_event.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `envelopeId` | uuid | No | Domain column |
| `name` | varchar | No | Domain column |
| `expectedDate` | date | No | Domain column |
| `actualDate` | date | Yes | Domain column |
| `expectedAmount` | numeric | No | Domain column |
| `actualAmount` | numeric | Yes | Domain column |
| `isScheduled` | boolean | No | Domain column |
| `note` | varchar | Yes | Domain column |
| `status` | expenseEventStatusEnum | No | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `income_sources` (`income.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `name` | varchar | No | Domain column |
| `amount` | numeric | No | Domain column |
| `incomeType` | incomeTypeEnum | No | Domain column |
| `receivingAccountId` | uuid | Yes | Domain column |
| `rrule` | varchar | Yes | Domain column |
| `startDate` | date | Yes | Domain column |
| `endDate` | date | Yes | Domain column |
| `contributionMode` | incomeContributionModeEnum | No | Contribution mode for shared vs private allocation |
| `contributionValue` | numeric | Yes | Contribution percentage or fixed dollar amount |
| `lastBurstDate` | date | Yes | Furthest event date generated during previous recurrence burst |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `income_events` (`income_event.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `incomeSourceId` | uuid | Yes | Domain column |
| `name` | varchar | Yes | Domain column |
| `expectedDate` | date | No | Domain column |
| `actualDate` | date | Yes | Domain column |
| `expectedAmount` | numeric | No | Domain column |
| `actualAmount` | numeric | Yes | Domain column |
| `contributionMode` | incomeContributionModeEnum | No | Contribution mode for shared vs private allocation |
| `contributionValue` | numeric | Yes | Contribution percentage or fixed dollar amount |
| `note` | varchar | Yes | Domain column |
| `status` | incomeEventStatusEnum | No | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `processed_webhooks` (`processed_webhooks.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `eventId` | varchar | No | Domain column |
| `eventType` | varchar | No | Domain column |
| `processedAt` | timestamp | No | Domain column |

## Table: `tenants` (`tenant.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `appId` | uuid | No | Application ID |
| `name` | varchar | No | Domain column |
| `country` | varchar | No | Domain column |
| `currency` | varchar | No | Domain column |
| `timezone` | varchar | No | Domain column |
| `state` | varchar | Yes | Domain column |
| `postcode` | varchar | Yes | Domain column |
| `premiumEnabled` | boolean | No | Domain column |
| `subscriptionStatus` | varchar | Yes | Domain column |
| `trialStartedAt` | timestamp | Yes | Domain column |
| `trialEndsAt` | timestamp | Yes | Domain column |
| `stripeCustomerId` | varchar | Yes | Domain column |
| `stripeSubscriptionId` | varchar | Yes | Domain column |
| `stripePriceId` | varchar | Yes | Domain column |
| `subscribedAt` | timestamp | Yes | Domain column |
| `subscriptionEndsAt` | timestamp | Yes | Domain column |
| `gracePeriodEndsAt` | timestamp | Yes | Domain column (7-day read-only grace period on payment failure) |
| `cancelAtPeriodEnd` | boolean | No | Domain column |
| `planType` | varchar | Yes | Domain column |
| `nextBillingAt` | timestamp | Yes | Domain column |
| `trialConvertedAt` | timestamp | Yes | Domain column |
| `setupCompletedAt` | timestamp | Yes | Domain column |
| `setupStatus` | varchar | No | Domain column |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tenant_users` (`tenant_user.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `userId` | uuid | Yes | Domain column |
| `inviteEmail` | varchar | Yes | Domain column |
| `role` | memberRoleEnum | No | Domain column |
| `inviteToken` | uuid | Yes | Domain column |
| `inviteStatus` | inviteStatusEnum | No | Domain column |
| `invitedAt` | timestamp | Yes | Domain column |
| `expiresAt` | timestamp | Yes | Domain column |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `tenant_user_preferences` (`tenant_user_preference.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `userId` | uuid | No | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `appPreferences` | jsonb | No | App-keyed JSONB preferences (including per-platform `tour_web` and `tour_mobile` status) |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `transaction_ledger` (`transaction_ledger.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `envelopeId` | uuid | No | Domain column |
| `bankAccountId` | uuid | Yes | Domain column |
| `planLineId` | uuid | Yes | Domain column |
| `flowType` | transactionFlowEnum | No | Domain column |
| `transactionType` | transactionTypeEnum | No | Domain column |
| `amount` | numeric | No | Domain column |
| `idempotencyKey` | text | No | Domain column |
| `note` | text | Yes | Domain column |
| `source` | transactionSourceEnum | No | Domain column |
| `transferGroupId` | uuid | Yes | Domain column |
| `recordedAt` | timestamp | No | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `transfer_events` (`transfer_event.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `sourceEnvelopeId` | uuid | No | Domain column |
| `destinationEnvelopeId` | uuid | No | Domain column |
| `name` | varchar | No | Domain column |
| `expectedDate` | date | No | Domain column |
| `expectedAmount` | numeric | No | Domain column |
| `actualAmount` | numeric | Yes | Domain column |
| `status` | transferEventStatusEnum | No | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `users` (`user.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `email` | text | No | Domain column |
| `displayName` | text | Yes | Domain column |
| `avatarUrl` | text | Yes | Domain column |
| `hasUsedTrial` | boolean | No | Domain column |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `user_preferences` (`user_preference.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `userId` | uuid | No | Domain column |
| `theme` | varchar | No | Domain column |
| `language` | varchar | No | Domain column |
| `timezone` | varchar | Yes | Domain column |
| `showIcons` | boolean | No | Domain column |
| `notificationEmail` | varchar | Yes | Domain column |
| `phoneCountryCode` | varchar | Yes | Domain column |
| `phoneNumber` | varchar | Yes | Domain column |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `ai_usage` (`ai_usage.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `tenantId` | uuid | Yes | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application ID |
| `periodMonth` | date | No | First day of billing month (YYYY-MM-01) |
| `llmCalls` | integer | No | Total count of LLM classification calls made in period |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | Archiver User ID |

## Table: `file_notes` (`file_note.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `entityType` | varchar | No | Target entity polymorphic discriminator ('ENVELOPE', 'BANK_ACCOUNT') |
| `entityId` | uuid | No | Target entity unique identifier |
| `comment` | text | Yes | Plaintext or rich text note contents |
| `fileKey` | varchar | Yes | Cloudflare R2 object storage key path |
| `fileName` | varchar | Yes | Original uploaded file name |
| `fileMimeType` | varchar | Yes | MIME type of uploaded file |
| `fileSize` | varchar | Yes | File size in bytes as string |
| `isPrivate` | boolean | No | Stealth privacy isolation flag |
| `userId` | uuid | Yes | Owner user ID for private notes (stealth RLS isolation) |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | uuid | No | Application Foreign Key |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | No | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | No | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |
| `archivedBy` | uuid | Yes | User ID who soft-deleted the record |
