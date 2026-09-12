# V2 Scope — money-matters

> **Last updated:** 2026-07-25  
> This file captures features, behaviours, and technical enhancements that are explicitly **out of current scope** but must be designed for in early releases to make future versions easier. Update this file whenever scope decisions are made.

---

## Product Features

| Feature | Reason deferred | Design consideration |
|---|---|---|
| **Partner invite / household member invite** | **DELIVERED** | Implemented via `invitePartner` and `acceptInvite` commands in `@money-matters/capability-tenant` with auto-redirect |
| **Tenant Switcher** | **DELIVERED** | Sidebar component allowing users to switch between multiple household contexts seamlessly |
| **Apple Sign-In** | **DELIVERED** | Enabled via Neon Auth social providers alongside Google and Email |
| **5-step waterfall logic details** | **DELIVERED** | Fully implemented in cascading steps: Deficit Repair, Bills, Everyday, Goals, Surplus Sweep |
| **Data export details** | **DELIVERED** | Complete CSV generation supporting transaction ledgers and allocation plans |
| **AEST timezone rendering** | **DELIVERED** | UTC dates formatted timezone-aware via `Intl.DateTimeFormat` |
| **AI/LLM allocation engine** | Premium tier; requires dataset first | Allocation engine abstracted behind interface — rules-based and AI-based are swappable |
| **AI budget estimation** | Premium tier | — |
| **AI shortfall recovery plans** | Premium tier | — |
| **Offline-first sync logic** | Simplifies initial scope; SQLite queue schema scaffolded | All mutations accept `idempotencyKey`; SQLite schema built |
| **Savings reconciliation — AI auto-spread** | Premium tier | Reconciliation service abstracted behind interface |
| **Stripe / subscription payments** | **DELIVERED** | Integrated with trial lockouts, webhooks, and read-only grace periods |
| **Uptime Monitoring (Better Stack / UptimeRobot)** | Deferred to Release 2 | Automated ping checks on `/health` and Web frontend |
| **Product Analytics (PostHog)** | **DELIVERED** | Integrated telemetry and telemetry context providers |
| **Japanese Translation (ja.ts) Parity Check** | Deferred to Release 2 | `check-i18n.cjs` validates `en.ts` completeness and TSX string literal externalization in V1; full EN-JA dictionary key parity deferred to Release 2 |
| **Category-Level Balance Management (Everyday & Bills)** | Deferred to Release 2 | Managed at pool level in V1; see detailed feature spec below |
| **Upcoming Queue Multi-Selection & Batch Actioning** | Deferred to Release 2 | Single-row actioning (*Mark Received / Paid*, *Delete*) delivered in V1; batch checkboxes and bulk mark action bar deferred to V2 |
| **Full Outlook-Style Complex Recurrence Builder** | Deferred to Release 2 | V1 provides simple frequency enums (`WEEKLY`, `FORTNIGHTLY`, `MONTHLY`, `ANNUALLY`) + one-off target date picker via `useRecurrenceBuilder`. Full Outlook-style RRULE rule builder (e.g. 2nd Tuesday of every month, Nth weekday, custom intervals, complex until dates) deferred to V2. |
| **Bank Statement CSV Import & Open Banking Sync** | Deferred to Release 2 | Backward-looking receipt categorization removed from V1 to protect forward-looking zero-friction payday allocation philosophy. V2 will evaluate Consumer Data Right (CDR) read-only bank feeds and a streamlined pool-centric onboarding catch-up assistant. |

---

## Technical Enhancements

| Enhancement | Reason deferred | Design consideration |
|---|---|---|
| **Offline sync (SQLite → Neon)** | Significant complexity; online-first initially | `idempotencyKey` on all write mutations; SQLite queue table schema complete |
| **Async allocation plan confirmation (Inngest)** | Synchronous TX is sufficient; async adds UI complexity | Confirmation handler isolated in a service function |
| **Per-category bank account mapping** | Maps at category-type level initially | `bankAccountId` FK exists on `categories` table (nullable) |
| **Real-time balance updates (WebSockets/SSE)** | Uses pull (React Query refetch) | No blocking concern |
| **Multi-app platform (second app shell)** | Only `money-matters` initially | `appId` on all tables; app registry in `packages/config` |
| **V2 Inngest Scheduled Notifications** | Deferred to Release 2 | The following 5 cron/event-triggered Inngest functions were stubbed out in V1 and removed from `scheduled-notifications.ts`. They must be redesigned with full tenant-scoped DB access (not global `db` singleton) before activation: `notify-payday-alert` (daily, `expenseEvents` today), `notify-shortfall-alert` (daily, pool balance vs upcoming bills), `notify-bill-reminder` (daily, tomorrow's bills), `notify-goal-milestone` (event: `transaction/recorded`), `notify-spending-velocity` (daily, EVERYDAY pool burn rate). |
| **Stripe Subscription Reconciliation Sweeper (Inngest)** | Deferred to Release 2 | Webhooks + real-time pull (`verifyCheckoutSession`, `syncSubscription`, portal return auto-sync) provide 99.9% consistency in V1. V2 adds a daily 3:00 AM AEST Inngest cron (`reconcile-stripe-subscriptions`) iterating active subscribers to heal edge-case drift from unhandled network partitions, dropped webhooks, or inactive churned users. See `FEAT-V2-004-STRIPE-RECONCILIATION-SWEEPER`. |

---

## Bank Account Mapping & Reconciliation

- Categories map at category-type level (`REGULAR`, `GOAL`, `EVERYDAY`).
- Transfer instructions calculate difference between Everyday top-up and target bill/goal buckets.
- Reconciliation compares expected calculated balance against actual entered balance.

---

## Decision Record: Pool-Level vs. Category-Level Management

### Context

During V1 architecture review (2026-08-23), the question was raised: should users be given the choice to manage **Everyday and/or Bills at category level** (i.e. full envelope budgeting with individual category balances) rather than the current pool-level model?

### Decision

**V1 ships with pool-level management only for Everyday and Bills.** Goals remain individually tracked at category level (unchanged).

### Rationale & Product Philosophy

1. **Target audience fit:** Aussie households are the primary segment. The product philosophy (Zero Friction, Zero Daily Micro-Tracking) is fundamentally incompatible with the cognitive overhead of managing individual envelope balances for Everyday and Bills.
2. **The real user need is addressed via Bill Coverage View:** Users want to know *"will my bills be covered before next payday?"* not *"how much is left in my Netflix envelope?"*. The **Enhanced Bill Coverage View** (V1) answers this via read-only coverage status per bill category derived from pool balance vs upcoming expense events — without introducing envelope complexity.
3. **Implementation cost:** A dual-mode system (pool vs category) requires branching logic across the waterfall engine, allocation flow, dashboard, "Can We Afford This?" engine, transaction logging, setup wizard, notifications, and bank reconciliation. Estimated 4–6 weeks of additional build time.
4. **Usage data validation:** V2 category-level envelope scope should be validated by real user demand post-launch before committing engineering effort.

---

## V2 Feature: Category-Level Management Mode for Everyday and/or Bills

### Feature ID

`FEAT-V2-001-CATEGORY-LEVEL-MANAGEMENT`

### Expiry & Governance

Review at 6 months post-launch. Gated by kill switch `feature.categoryLevelManagement.killSwitchEnabled: true`.

### Scope & Technical Requirements

Allow a household to opt in to category-level balance tracking for Everyday and/or Bills:

1. **Data Model (`packages/db`):** Add `tenant_pool_settings` table (`tenantId`, `appId`, `poolType: 'EVERYDAY' | 'REGULAR'`, `managementMode: 'POOL' | 'CATEGORY'`). Standard RLS and audit columns.
2. **Waterfall Engine (`packages/capabilities/budgeting`):** Step 2 (Bills) and Step 4 (Everyday) branch on `managementMode`. In category mode, top-ups split across individual categories by target amount rather than single pool bucket.
3. **"Can We Afford This?" Engine (`packages/capabilities/transactions`):** In category mode, bill buffer checks evaluate individual envelope balances.
4. **UI Surfaces (`apps/web`, `apps/mobile`):** Categories screen displays individual envelope balances instead of "Managed at pool level". Quick Expense and transaction logging debit/credit specific category envelopes.
5. **Setup Wizard:** Add option to select Simple (Pool mode, default) vs Advanced (Category mode).

---

## Known User Risk: Unscheduled Bill Categories

> [!WARNING]
> **Risk Analysis (Bill Coverage View):** If a user creates a bill category (e.g. "Car Insurance" or "Council Rates") but does not set up a recurring expense schedule or upcoming event for it:
> - Naively checking `billsPoolBalance >= totalUpcoming` and marking all categories "Covered ✓" would be **false and misleading** — the user might assume a bill is covered when they simply forgot to schedule it.
> - **V1 Mitigation:** The `listBillCoverageQuery` explicitly returns `NO_SCHEDULE` status for categories without upcoming expense events in the window. The UI renders a neutral grey badge (`"No schedule set ℹ️"`) instead of `"Covered ✓"`, prompting the user to add an upcoming bill event.


---

## V2 Feature: Category Health Warning Suppression & Snooze UX

### Feature ID

`FEAT-V2-002-HEALTH-WARNING-SUPPRESSION`

### Context

During the dashboard redesign (2026-08-23), category health warning indicators (e.g. goal or bill categories showing `AMBER` or `RED` health status) were surfaced as compact chips. Without dismissal mechanisms, a category that falls behind stays highlighted continuously until the goal date or target is modified.

### Scope & Technical Requirements

1. **User Preference / Dismissal State:** Store dismiss/snooze timestamps in `appPreferences` or dedicated `health_warning_acknowledgements` table (`tenantId`, `categoryId`, `snoozedUntil`).
2. **Notification Integration:** Connect health warnings with scheduled email digests and push notification preferences.
3. **UI Behaviour:** Allow users to "Acknowledge / Snooze for 7 days" directly from category cards or dashboard status chips.

---

## V2 Feature: Re-Setup Budget Wizard & Command

Deferred to Release 2. Initial setup wizard (`/setup`) is active in R1. Mid-life household re-setup wizard and reSetupBudget capability are deferred.

Command logic preserved for V2:
- `reSetupBudget(db, input, overrideTenantId, overrideUserId, overrideAppId)`
- Schema: `ReSetupBudgetInputSchema`

---

## V2 Feature: Non-Digest Scheduled Notification Functions

In R1, only `notifyWeeklyDigest` is registered in Inngest scheduled workflows.
The following scheduled notification functions were deferred to Release 2:
- `notifyPaydayAlert`: Daily alert for expected paydays
- `notifyShortfallAlert`: Alert when regular pools shortfall upcoming bills
- `notifyBillOverdue`: Alert when bill dates pass without payment
- `notifyGoalMilestone`: Alert when goal pools cross milestone percentage
- `notifySpendingVelocity`: Alert when daily velocity exceeds recommended rate

---

## V2 Technical: Deferred Command Schemas & Types

The following types were defined for V2 offline/sync or alternative pathways:
- `ConfirmPlanCommand`: Direct plan confirmation schema
- `SyncLedgerMutationCommand`: Offline mutation sync schema
- `WaterfallExecutionPayload`: Background waterfall execution payload

---

## V2 Technical: Deferred Capabilities (Bug Reports & File Notes)

The custom in-app PostgreSQL bug-reports triage pipeline and receipt/PDF attachment capability (`file-notes`) were pruned from V1 scope to reduce maintenance overhead on inactive code.

### 1. Bug Reports Schema & Logic (`bug_reports` table)
```ts
// DB Table: bug_reports
export const bugReports = pgTable("bug_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 50 }).notNull().default("other"),
  severity: varchar("severity", { length: 20 }).notNull().default("medium"),
  frustrationLevel: integer("frustration_level").notNull().default(2),
  contactConsent: boolean("contact_consent").notNull().default(true),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  appVersion: varchar("app_version", { length: 50 }).notNull().default("1.0.0-beta"),
  platform: varchar("platform", { length: 20 }).notNull(),
  pageUrl: varchar("page_url", { length: 512 }),
  deviceInfo: text("device_info"),
  ...tenantAndTimestamps,
});

// Category & Frustration mapping labels
const CATEGORY_LABELS = {
  setup: "Onboarding & Payday Setup",
  waterfall: "Payday Allocation & Waterfalls",
  transactions_sync: "Bank Sync & Statement Import",
  categories_bills: "Category & Bill Management",
  ui_ux: "App Display & Navigation",
  account_auth: "Account & Authentication",
  other: "Something Else",
};
```

### 2. File Notes & Attachments Schema (`file_notes` table)
```ts
// DB Table: file_notes
export const fileNotes = pgTable("file_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // 'expenses' | 'categories' etc.
  entityId: uuid("entity_id").notNull(),
  comment: text("comment"),
  fileKey: varchar("file_key", { length: 512 }),
  fileName: varchar("file_name", { length: 255 }),
  fileMimeType: varchar("file_mime_type", { length: 100 }),
  fileSize: varchar("file_size", { length: 50 }),
  ...tenantAndTimestamps
});
```

---

## V2 Feature: Bank Statement CSV Ingestion & Open Banking Sync

### Feature ID

`FEAT-V2-003-BANK-INGESTION-OPEN-BANKING`

### Context & Strategic Rationale

In V1, historical line-item CSV statement parsing was removed to protect Money Matters' core product philosophy: **forward-looking payday allocation (ring-fencing bills and committed savings so households spend their Everyday pool freely with zero receipt policing and zero micro-tracking)**. Bank reconciliation in V1 is delivered cleanly via 1-click balance alignment (`<ReconciliationModal />`).

For Release 2, bank ingestion will be reintroduced as an onboarding catch-up assistant and automated read-only feed. This document captures 100% of the UI, API, database, parser algorithms, and seed specifications so engineering can pick up and implement V2 without rebuilding from scratch or guessing legacy requirements.

---

### 1. Database Schema Specification

To prevent the data integrity and orphaned rollback flaws identified in V1, V2 implements a first-class relational architecture:

#### A. `import_batches` Table
```typescript
import { pgTable, uuid, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { bankAccounts } from "./bank_account.js";
import { tenantAndTimestamps } from "./base.js";

export const importBatches = pgTable("import_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size").notNull(),
  rowCount: integer("row_count").notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true }).defaultNow().notNull(),
  ...tenantAndTimestamps,
});
```

#### B. `merchant_rules` Table
```typescript
import { pgTable, uuid, varchar, boolean } from "drizzle-orm/pg-core";
import { pools } from "./pool.js";
import { categories } from "./category.js";
import { tenantAndTimestamps } from "./base.js";

export const merchantRules = pgTable("merchant_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  pattern: varchar("pattern", { length: 255 }).notNull(),
  targetPoolId: uuid("target_pool_id").references(() => pools.id).notNull(),
  targetCategoryId: uuid("target_category_id").references(() => categories.id),
  isRegex: boolean("is_regex").default(false).notNull(),
  ...tenantAndTimestamps,
});
```

#### C. `transaction_ledger` Extension
- Add `importBatchId: uuid("import_batch_id").references(() => importBatches.id)` to `transactionLedger` schema.
- Retain `"IMPORT"` in `transactionSourceEnum`.
- Adding `importBatchId` guarantees atomic, single-query rollbacks (`UPDATE transaction_ledger SET archived_at = NOW() WHERE import_batch_id = :batchId`).

---

### 2. Australian Bank CSV Dialect Specifications & Parsers

The parser engine supports 6 major Australian financial institutions with automatic header auto-detection:

| Institution | Date Format | Debit / Credit Representation | Notes & Normalization |
|---|---|---|---|
| **Commonwealth Bank (CBA)** | `DD/MM/YYYY` | Single signed numeric column (`-` for debits, `+` for credits) | Strips enclosing quotes, ignores header row if absent |
| **Westpac (WBC)** | `DD/MM/YYYY` | Separate `Debit` and `Credit` columns | Strips leading/trailing spaces in `Narrative` column |
| **ANZ Bank** | `DD/MM/YYYY` | Single signed numeric column or separate columns | Normalizes merchant prefixes (`EFTPOS`, `VISA DEBIT`) |
| **National Australia Bank (NAB)** | `DD/MM/YYYY` | Single signed column; separate `Transaction Type` column | Parses `Details` column for payee information |
| **ING Direct** | `DD/MM/YYYY` | Separate `Debit` and `Credit` columns | Sanitizes trailing balance column |
| **Macquarie Bank** | `DD/MM/YYYY` | Single signed numeric column; native `Category` column | Maps bank-provided category to tenant categories if matched |

#### Normalization & Deduplication Hash Algorithm
```typescript
import { createHash } from "node:crypto";

export function generateCsvTransactionFingerprint(params: {
  tenantId: string;
  bankAccountId: string;
  dateStr: string; // ISO YYYY-MM-DD
  amount: string;  // Fixed 2 decimal places e.g. "45.50"
  cleanDesc: string; // Trimmed, uppercase, alphanumeric only
}): string {
  const payload = `${params.tenantId}:${params.bankAccountId}:${params.dateStr}:${params.amount}:${params.cleanDesc}`;
  return createHash("sha256").update(payload).digest("hex");
}
```

---

### 3. API Contract & tRPC Router Specification

All procedures enforce `privateTenantProcedure` with database-kernel RLS session injection:

```typescript
// Router: transactions.router.ts (V2 Extension)

// 1. Parse & Preview CSV
parseCsv: privateTenantProcedure
  .input(z.object({
    fileBase64: z.string().max(3_000_000), // ~2MB raw file limit
    fileName: z.string().max(255),
    bankAccountId: z.string().uuid(),
  }).strict())
  .mutation(async ({ ctx, input }) => {
    // 1. Decode base64 and auto-detect bank dialect
    // 2. Normalize rows into { date, amount, description, flowType }
    // 3. Match against merchant_rules for default poolId and categoryId
    // 4. Query transaction_ledger lookback window (90 days) for existing fingerprint hashes
    // 5. Return parsed items with duplicateWarning flags and suggested allocations
  }),

// 2. Commit Batch Import
commitCsvImport: privateTenantProcedure
  .input(z.object({
    bankAccountId: z.string().uuid(),
    fileName: z.string().max(255),
    items: z.array(z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
      flowType: z.enum(["DEBIT", "CREDIT"]),
      description: z.string().max(255),
      poolId: z.string().uuid(),
      categoryId: z.string().uuid().optional(),
      fingerprint: z.string().length(64),
    })).min(1).max(1000),
  }).strict())
  .mutation(async ({ ctx, input }) => {
    // 1. Insert record into import_batches
    // 2. Bulk insert items into transaction_ledger with importBatchId
    // 3. Atomically adjust target pool balances
    // 4. Return { batchId, importedCount, updatedPools }
  }),

// 3. Rollback Import Batch
rollbackCsvBatch: privateTenantProcedure
  .input(z.object({
    batchId: z.string().uuid(),
  }).strict())
  .mutation(async ({ ctx, input }) => {
    // 1. Verify batch ownership within tenant
    // 2. Soft-delete batch (archivedAt = now())
    // 3. Soft-delete all ledger transactions with matching importBatchId
    // 4. Reverse pool balance increments/decrements
  }),

// 4. List Historical Batches
listCsvImportBatches: privateTenantProcedure
  .input(z.object({
    bankAccountId: z.string().uuid().optional(),
    limit: z.number().min(1).max(50).default(20),
    cursor: z.string().uuid().optional(),
  }).strict())
  .query(async ({ ctx, input }) => {
    // Returns paginated import batches with rowCount, fileName, importedAt, and canRollback flag
  }),
```

---

### 4. UI & UX Flow Architecture

The user interface follows Serene Finance design tokens (`#1B2B4B`, `#2563eb`, `#F7F8FA`, `#22c55e`, `#ba1a1a`):

1. **Step 1: Upload & Institution Selection (`CsvStepUpload.tsx`)**:
   - Drag-and-drop file dropzone accepting `.csv` up to 2MB.
   - Bank logo cards (CBA, Westpac, ANZ, NAB, ING, Macquarie, Generic AU).
   - Target bank account picker defaulting to the account selected on `/dashboard/bank-accounts`.
2. **Step 2: Relational Allocation & Review (`CsvStepReview.tsx`)**:
   - Clean data table with left-aligned descriptions, right-aligned monetary amounts, and center-aligned dates.
   - Target destination picker maps directly to **real user Pool IDs (`poolId`) and Category IDs (`categoryId`)**, eliminating the V1 static enum pool type flaw.
   - Multi-select bulk action toolbar allowing users to check multiple rows and apply pool/category assignments simultaneously.
   - Persistent selection state: un-importing or excluding a transaction leaves checkbox state clean without locking UI selection.
   - Amber warning badge on duplicate records (`"Duplicate detected: matching transaction recorded on 12/04/2026"`).
3. **Step 3: Confirmation Summary (`CsvStepComplete.tsx`)**:
   - Celebratory completion card detailing total rows imported, net debits allocated per pool, and updated account balance.
   - Direct button links to `/dashboard/history` and `/dashboard/bank-accounts`.
4. **Batch Log & Rollback Drawer**:
   - Accessible via "Statement Import History" on Bank Accounts management.
   - Displays each batch with filename, date, and row count.
   - "Rollback Batch" action triggers `<ConfirmDialog />` and atomic reverse mutation.

---

### 5. Seed Data & Test Fixture Specifications

When building V2 tests and seeding staging environments:
- Provide mock CSV files in `test/fixtures/csv/`:
  - `cba_sample_statement.csv`: 20 transactions including mixed ATM withdrawals, payroll credits, and supermarket debits.
  - `westpac_sample_statement.csv`: Dual-column debit/credit statements.
  - `ing_sample_statement.csv`: Orange Everyday transaction extract.
- Provide automated regression tests covering:
  - 100% duplicate rejection when re-uploading the same file.
  - Rollback integrity: verifying pool balances return to exact pre-import state.
  - Stealth privacy: ensuring secondary household members cannot import into a private account.

---

## V2 Feature: Stripe Subscription Daily Reconciliation Sweeper

### Feature ID

`FEAT-V2-004-STRIPE-RECONCILIATION-SWEEPER`

### Context

In V1, subscription data integrity is safeguarded via:
1. **Push Vector**: Stripe webhooks with cryptographic signature verification, idempotency guards, and multi-vector tenant fallback resolution (`metadata.tenantId` → `stripeCustomerId` → `stripeSubscriptionId`).
2. **Pull Vector**: Synchronous post-checkout verification (`verifyCheckoutSessionCommand`), portal return auto-reconciliation (`?stripe_sync=true`), and user-triggered on-demand refresh (`syncSubscriptionCommand`).
3. **Time-Decay Guard**: Local evaluation in `getSubscriptionStatus` ensuring expired subscriptions automatically transition to `TRIAL_EXPIRED` at period end.

While this provides 99.9% consistency during standard active usage, a background reconciliation sweeper guarantees 100% mathematical certainty against silent drift (e.g. if a user cancels in Stripe, closes their tab without returning, and webhooks fail due to prolonged upstream network partitions).

### Scope & Technical Requirements for V2

1. **Inngest Daily Cron Job (`reconcile-stripe-subscriptions`)**:
   - Schedule: Runs daily at 3:00 AM AEST (`17:00 UTC`).
   - Query: Selects active or past-due paying tenants (`subscriptionStatus IN ('SUBSCRIBED', 'PAST_DUE')`) whose last update was >24 hours ago.
2. **Batch Reconciliation**:
   - Executes `syncSubscriptionCommand` concurrently across batches using `Promise.all` with concurrency limits (e.g. 10 tenants per batch) to respect Stripe API rate limits.
   - Updates `subscriptionStatus`, `cancelAtPeriodEnd`, `subscriptionEndsAt`, `nextBillingAt`, and `planType`.
   - Backfills any missing paid invoices into `billing_invoices`.
3. **Observability & Anomaly Alerting**:
   - Emits structured telemetry logs if database status diverges from Stripe.
   - Alerts engineers via error logging if rate-limit ceilings or authorization failures occur during reconciliation.

---

## V2 Feature: Mobile Offline SQLite Cache Persistence & Sync Hydration

### Feature ID

`FEAT-V2-005-OFFLINE-SQLITE-PERSISTENCE`

### Context & Design Intent

In V1, mobile relies on online-first tRPC queries with React Query in-memory caching. When an Android user opens the app without cellular or Wi-Fi connectivity, queries display error banners. Release 2 introduces full offline hydration using `@tanstack/react-query-persist-client` backed by `expo-sqlite`, allowing users to inspect balances, upcoming bills, and recent history completely offline.

### Technical Scope

1. **SQLite Storage Adapter**: Implement persistent cache storage via `expo-sqlite` storing serialized React Query query cache.
2. **Mutation Outbox Queue**: Queue offline mutations (`recordExpense`, `quickExpense`, `overrideEvent`) in a local `mutation_queue` SQLite table with UUID idempotency keys.
3. **Background Sync Hydration**: When network connectivity is restored (`expo-network`), hydrate outbox mutations sequentially and refetch active queries.

---

## V2 Feature: Mobile Camera Receipt Capture & Cloudflare R2 Upload

### Feature ID

`FEAT-V2-006-RECEIPT-CAMERA-R2-UPLOAD`

### Context & Design Intent

Web supports uploading receipts and PDF invoices to Cloudflare R2 via presigned URLs in the `file-notes` capability. V2 brings direct native camera and photo gallery receipt attachment into `UpcomingExpenseModal` and `CategoryItemModal`.

### Technical Scope

1. **Native Camera & Gallery Integration**: Use `expo-image-picker` with image compression (`manipulateAsync`) to compress photos to under 1MB WebP/JPEG.
2. **Presigned R2 Upload Contract**: Call `fileNotes.getUploadUrl` tRPC mutation, upload raw binary directly to Cloudflare R2, and attach `fileKey` to the expense event.

---

## V2 Feature: Native Android E2E Automated Testing Suite (Maestro)

### Feature ID

`FEAT-V2-007-MOBILE-E2E-MAESTRO-TESTS`

### Context & Design Intent

Web utilizes Playwright for comprehensive screen-by-screen testing (`apps/web/e2e/screen-by-screen.spec.ts`). Release 2 establishes native device-level E2E automated testing for the Android APK using Maestro running in GitHub Actions.

### Technical Scope

1. **Maestro Flow Definitions (`apps/mobile/e2e/flows/`)**:
   - `01-onboarding.yaml`: Setup wizard flow through income, categories, and completion.
   - `02-dashboard-actions.yaml`: Quick expense entry, can-afford simulator, and move money.
   - `03-income-split-studio.yaml`: Full 5-step waterfall review, custom allocation adjustment, and split execution.
2. **GitHub Actions Matrix**: Headless Android emulator runner building debug APK and running Maestro CLI flows on pull requests.

