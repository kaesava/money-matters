# Money Matters — Authoritative Data Dictionary

> **Version**: 2.0.0 (Unified Flat Envelopes Architecture)
> **Compliance**: Enforced via `pnpm audit:schema` in `pnpm validate`.

## Table: `allocation_plans` (`allocation_plan.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `id` | uuid | - | Domain column |
| `incomeEventId` | uuid | - | Domain column |
| `status` | allocationPlanStatusEnum | - | Domain column |
| `totalIncomeAmount` | numeric | - | Domain column |
| `confirmedAt` | timestamp | - | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | varchar | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |

## Table: `allocation_plan_lines` (`allocation_plan_line.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `id` | uuid | - | Domain column |
| `planId` | uuid | - | Domain column |
| `envelopeId` | uuid | - | Domain column |
| `proposedAmount` | numeric | - | Domain column |
| `confirmedAmount` | numeric | - | Domain column |
| `reasoning` | text | - | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | varchar | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |

## Table: `allocation_strategies` (`allocation_strategy.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `name` | varchar | - | Strategy profile name |
| `presetKey` | varchar | - | Canonical preset key or CUSTOM |
| `description` | text | - | Plain-English strategy explanation |
| `isDefault` | boolean | - | Flag indicating active strategy for tenant |
| `isPrivate` | boolean | No | True if strategy applies to private personal envelopes |
| `userId` | uuid | Yes | Owner User ID for private personal strategy |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | varchar | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |

## Table: `allocation_strategy_steps` (`allocation_strategy_step.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `strategyId` | uuid | - | Foreign key to allocation_strategies |
| `orderIndex` | integer | - | Order index within the allocation recipe |
| `stepType` | allocationStepTypeEnum | - | Allocation rule block type |
| `targetEnvelopeId` | uuid | - | Target envelope for fixed/sweep steps |
| `config` | jsonb | - | Optional step configuration parameters |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | varchar | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |

## Table: `apps` (`app.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `id` | uuid | - | Domain column |
| `name` | varchar | - | Domain column |
| `slug` | varchar | - | Domain column |
| `createdAt` | timestamp | - | Domain column |
| `updatedAt` | timestamp | - | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | varchar | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |

## Table: `bank_accounts` (`bank_account.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `id` | uuid | - | Domain column |
| `name` | varchar | - | Domain column |
| `bankProvider` | varchar | - | Domain column |
| `accountType` | account_type_enum | - | Domain column |
| `lastKnownBalance` | numeric | - | Domain column |
| `unbudgetedBuffer` | numeric | - | Domain column |
| `lastBalanceMatchedAt` | timestamp | Yes | Balance reconciliation timestamp |
| `isPrivate` | boolean | - | Domain column |
| `userId` | uuid | - | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | varchar | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |

## Table: `billing_invoices` (`billing_invoice.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `id` | uuid | - | Domain column |
| `tenantId` | uuid | - | Domain column |
| `stripeInvoiceId` | varchar | - | Domain column |
| `stripeCustomerId` | varchar | - | Domain column |
| `stripeSubscriptionId` | varchar | - | Domain column |
| `amountPaid` | numeric | - | Domain column |
| `currency` | varchar | - | Domain column |
| `status` | varchar | - | Domain column |
| `paidAt` | timestamp | - | Domain column |
| `periodStart` | timestamp | - | Domain column |
| `periodEnd` | timestamp | - | Domain column |
| `invoicePdfUrl` | varchar | - | Domain column |
| `hostedInvoiceUrl` | varchar | - | Domain column |
| `createdAt` | timestamp | - | Domain column |
| `createdBy` | uuid | - | Domain column |
| `updatedAt` | timestamp | - | Domain column |
| `updatedBy` | uuid | - | Domain column |
| `archivedAt` | timestamp | - | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | varchar | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |

## Table: `device_tokens` (`device_token.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `id` | uuid | - | Domain column |
| `userId` | uuid | - | Domain column |
| `platform` | varchar | - | Domain column |
| `token` | varchar | - | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | varchar | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |

## Table: `early_access_subscribers` (`early_access.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `id` | uuid | - | Domain column |
| `appId` | uuid | - | Domain column |
| `email` | varchar | - | Domain column |
| `lastSubscribedAt` | timestamp | - | Domain column |
| `createdAt` | timestamp | - | Domain column |
| `updatedAt` | timestamp | - | Domain column |
| `appIdEmailIdx` | uniqueIndex | - | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | varchar | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |

## Table: `envelopes` (`envelope.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `id` | uuid | - | Domain column |
| `name` | varchar | - | Domain column |
| `envelopeType` | envelopeTypeEnum | - | Domain column |
| `bankAccountId` | uuid | - | Domain column |
| `safetyBufferFloor` | numeric | - | Domain column |
| `monthlyAmount` | numeric | - | Domain column |
| `enteredAmount` | numeric | - | Domain column |
| `budgetFrequency` | varchar | - | Domain column |
| `startDate` | varchar | - | Domain column |
| `endDate` | varchar | - | Domain column |
| `rrule` | varchar | - | Domain column |
| `goalMode` | goalModeEnum | - | Domain column |
| `targetAmount` | numeric | - | Domain column |
| `isEssential` | boolean | - | Domain column |
| `isCommitted` | boolean | - | Domain column |
| `isSurplusTarget` | boolean | - | Domain column |
| `isPrivate` | boolean | - | Domain column |
| `generateEvents` | boolean | No | Controls auto-generation of upcoming scheduled expense events |
| `userId` | uuid | - | Domain column |
| `emoji` | varchar | Yes | Visual envelope emoji icon |
| `colorKey` | varchar | Yes | Visual envelope theme color key |
| `orderIndex` | integer | - | Domain column |
| `lastBurstDate` | date | Yes | Furthest event date generated during previous recurrence burst |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | varchar | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |

## Table: `expense_events` (`expense_event.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `id` | uuid | - | Domain column |
| `envelopeId` | uuid | - | Domain column |
| `name` | varchar | - | Domain column |
| `expectedDate` | date | - | Domain column |
| `actualDate` | date | - | Domain column |
| `expectedAmount` | numeric | - | Domain column |
| `actualAmount` | numeric | - | Domain column |
| `isScheduled` | boolean | - | Domain column |
| `note` | varchar | - | Domain column |
| `status` | expenseEventStatusEnum | - | Domain column |
| `tenantEnvelopeDateIdx` | index | - | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | varchar | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |

## Table: `income_sources` (`income.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `id` | uuid | - | Domain column |
| `name` | varchar | - | Domain column |
| `amount` | numeric | - | Domain column |
| `incomeType` | incomeTypeEnum | - | Domain column |
| `receivingAccountId` | uuid | - | Domain column |
| `rrule` | varchar | - | Domain column |
| `startDate` | date | - | Domain column |
| `endDate` | date | - | Domain column |
| `contributionMode` | incomeContributionModeEnum | - | Contribution mode for shared vs private allocation |
| `contributionValue` | numeric | - | Contribution percentage or fixed dollar amount |
| `lastBurstDate` | date | Yes | Furthest event date generated during previous recurrence burst |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | varchar | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |

## Table: `income_events` (`income_event.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `id` | uuid | - | Domain column |
| `incomeSourceId` | uuid | - | Domain column |
| `name` | varchar | - | Domain column |
| `expectedDate` | date | - | Domain column |
| `actualDate` | date | - | Domain column |
| `expectedAmount` | numeric | - | Domain column |
| `actualAmount` | numeric | - | Domain column |
| `contributionMode` | incomeContributionModeEnum | - | Contribution mode for shared vs private allocation |
| `contributionValue` | numeric | - | Contribution percentage or fixed dollar amount |
| `note` | varchar | - | Domain column |
| `status` | incomeEventStatusEnum | - | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | varchar | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |

## Table: `processed_webhooks` (`processed_webhooks.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `eventId` | varchar | - | Domain column |
| `eventType` | varchar | - | Domain column |
| `processedAt` | timestamp | - | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | varchar | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |

## Table: `tenants` (`tenant.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `id` | uuid | - | Domain column |
| `appId` | uuid | - | Domain column |
| `name` | varchar | - | Domain column |
| `country` | varchar | - | Domain column |
| `currency` | varchar | - | Domain column |
| `timezone` | varchar | - | Domain column |
| `state` | varchar | - | Domain column |
| `postcode` | varchar | - | Domain column |
| `premiumEnabled` | boolean | - | Domain column |
| `subscriptionStatus` | varchar | - | Domain column |
| `trialStartedAt` | timestamp | - | Domain column |
| `trialEndsAt` | timestamp | - | Domain column |
| `stripeCustomerId` | varchar | - | Domain column |
| `stripeSubscriptionId` | varchar | - | Domain column |
| `stripePriceId` | varchar | - | Domain column |
| `subscribedAt` | timestamp | - | Domain column |
| `subscriptionEndsAt` | timestamp | - | Domain column |
| `gracePeriodEndsAt` | timestamp | - | Domain column (7-day read-only grace period on payment failure) |
| `cancelAtPeriodEnd` | boolean | - | Domain column |
| `planType` | varchar | - | Domain column |
| `nextBillingAt` | timestamp | - | Domain column |
| `trialConvertedAt` | timestamp | - | Domain column |
| `setupCompletedAt` | timestamp | - | Domain column |
| `setupStatus` | varchar | - | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | varchar | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |

## Table: `tenant_users` (`tenant_user.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `id` | uuid | - | Domain column |
| `tenantId` | uuid | - | Domain column |
| `userId` | uuid | - | Domain column |
| `inviteEmail` | varchar | - | Domain column |
| `role` | memberRoleEnum | - | Domain column |
| `inviteToken` | uuid | - | Domain column |
| `inviteStatus` | inviteStatusEnum | - | Domain column |
| `invitedAt` | timestamp | - | Domain column |
| `expiresAt` | timestamp | - | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | varchar | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |

## Table: `tenant_user_preferences` (`tenant_user_preference.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `id` | uuid | - | Domain column |
| `userId` | uuid | - | Domain column |
| `tenantId` | uuid | - | Domain column |
| `appId` | uuid | - | Domain column |
| `appPreferences` | jsonb | - | Domain column |
| `createdAt` | timestamp | - | Domain column |
| `createdBy` | uuid | - | Domain column |
| `updatedAt` | timestamp | - | Domain column |
| `updatedBy` | uuid | - | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | varchar | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |

## Table: `transaction_ledger` (`transaction_ledger.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `id` | uuid | - | Domain column |
| `envelopeId` | uuid | - | Domain column |
| `bankAccountId` | uuid | - | Domain column |
| `planLineId` | uuid | - | Domain column |
| `flowType` | transactionFlowEnum | - | Domain column |
| `transactionType` | transactionTypeEnum | - | Domain column |
| `amount` | numeric | - | Domain column |
| `idempotencyKey` | text | - | Domain column |
| `note` | text | - | Domain column |
| `source` | transactionSourceEnum | - | Domain column |
| `transferGroupId` | uuid | - | Domain column |
| `recordedAt` | timestamp | - | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | varchar | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |

## Table: `transfer_events` (`transfer_event.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `id` | uuid | - | Domain column |
| `sourceEnvelopeId` | uuid | - | Domain column |
| `destinationEnvelopeId` | uuid | - | Domain column |
| `name` | varchar | - | Domain column |
| `expectedDate` | date | - | Domain column |
| `expectedAmount` | numeric | - | Domain column |
| `actualAmount` | numeric | - | Domain column |
| `status` | transferEventStatusEnum | - | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | varchar | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |

## Table: `users` (`user.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `id` | uuid | - | Domain column |
| `email` | text | - | Domain column |
| `displayName` | text | - | Domain column |
| `avatarUrl` | text | - | Domain column |
| `hasUsedTrial` | boolean | - | Domain column |
| `createdAt` | timestamp | - | Domain column |
| `updatedAt` | timestamp | - | Domain column |
| `archivedAt` | timestamp | - | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | varchar | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |

## Table: `user_preferences` (`user_preference.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `id` | uuid | - | Domain column |
| `userId` | uuid | - | Domain column |
| `theme` | varchar | - | Domain column |
| `language` | varchar | - | Domain column |
| `timezone` | varchar | - | Domain column |
| `showIcons` | boolean | - | Domain column |
| `notificationEmail` | varchar | - | Domain column |
| `phoneCountryCode` | varchar | - | Domain column |
| `phoneNumber` | varchar | - | Domain column |
| `createdAt` | timestamp | - | Domain column |
| `createdBy` | uuid | - | Domain column |
| `updatedAt` | timestamp | - | Domain column |
| `updatedBy` | uuid | - | Domain column |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `appId` | varchar | No | Application ID |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |


## Table: `ai_usage` (`ai_usage.ts`)

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | uuid | No | Primary Key |
| `tenantId` | uuid | No | Tenant Foreign Key (RLS isolation) |
| `periodMonth` | date | No | First day of billing month (YYYY-MM-01) |
| `llmCalls` | integer | No | Total count of LLM classification calls made in period |
| `createdAt` | timestamp | No | Creation timestamp |
| `createdBy` | uuid | Yes | Creator User ID |
| `updatedAt` | timestamp | No | Last update timestamp |
| `updatedBy` | uuid | Yes | Modifier User ID |
| `archivedAt` | timestamp | Yes | Soft delete timestamp |

---

## System / Global Entities (Non-Tenant Scoped Tables)

The following tables are intentionally global or user-centric and are not partitioned by `tenant_id`:

1. **`apps` (`app.ts`)**: Defines platform application definitions (e.g., Money Matters application UUID `01908bde-34bb-7b19-a178-574211bc93aa`). Serves as the top-level parent entity for application tenancy and configuration.
2. **`users` (`user.ts`)**: Global identity catalog synchronized with Neon Auth (`neon_auth.user`). Users exist independently of tenants and may belong to multiple household tenants through `tenant_users` join records.
3. **`user_preferences` (`user_preference.ts`)**: 1:1 user settings (theme, display icons, notification email/phone) that persist across household switches.
4. **`early_access` (`early_access.ts`)**: Public marketing waitlist for early access signups prior to account provisioning.
5. **`processed_webhooks` (`processed_webhooks.ts`)**: Global webhook idempotency ledger tracking Stripe `event_id` keys to prevent double-processing of webhook events across all accounts.

