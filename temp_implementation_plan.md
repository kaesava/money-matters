# Budget Model Migration — money-matters

Migrate from the current `MAJOR | RECURRING | EVERYDAY` + RRULE + shortfall/reconciliation model to a clean `REGULAR | SAVINGS | EVERYDAY` model with auto-allocation and a "Can we afford this?" calculator. Ruthlessly remove complexity that doesn't serve a real Aussie family.

---

## What We Decided

| Decision | Answer |
|---|---|
| Primary allocation trigger | **Paycheck** (income event — kept as-is) |
| Primary display/planning lens | **Calendar month** (aggregation over paycheck events) |
| Allocation style | **Auto** — no user review required. Notification shows result. Override on demand. |
| Bucket types | **REGULAR \| SAVINGS \| EVERYDAY** (SAVINGS combines old sinking fund + goals) |
| Migration approach | **Clean break** — map what maps, drop what doesn't |
| Transaction entry | **Manual** — data model designed for future bank import |
| Everyday sub-buckets | **Optional** — single pool default, named sub-buckets for power users |

---

## User Review Required

> [!CAUTION]
> **Shortfall events and savings reconciliation are being completely removed.** All existing `shortfall_events` and `savings_reconciliations` data will be dropped. The code handling these flows (handlers, UI screens) will be deleted. This is non-reversible. Confirm before execution.

> [!WARNING]
> **Category type rename is a breaking migration.** The `MAJOR` and `RECURRING` pg enum values are being replaced. This requires a new Drizzle migration that drops and recreates the enum. Existing category data will be migrated in the same transaction (`MAJOR → SAVINGS`, `RECURRING → REGULAR`). Priority ranks will be dropped.

> [!IMPORTANT]
> **Auto-allocation removes the paycheck review screen.** The `DRAFT → REVIEWED → CONFIRMED` workflow is being replaced by auto-`CONFIRMED` with a notification. Users can still tap into the allocation to override, but there is no required approval step. This is a significant UX change.

---

## Open Questions

> [!IMPORTANT]
> **1. `isCommitted` flag behaviour on insufficient income:** If a paycheck cannot fully fund all committed SAVINGS contributions plus all REGULAR amounts, what should the app do?
> - Option A: Fund REGULAR first (you must pay the mortgage), then committed SAVINGS pro-rata, then uncommitted SAVINGS, Everyday gets whatever's left (possibly zero).
> - Option B: Alert the user and let them decide — no auto-resolution.
> My recommendation: **Option A** with a visible alert ("We couldn't fully fund your Car Rego this paycheck — $45 short. You're now 3 paychecks from the due date."). No silent under-funding.

> [!NOTE]
> **2. EVERYDAY sub-bucket carry-over:** When a user creates named Everyday sub-buckets (e.g., Groceries, Eating Out), does unspent Groceries money carry to next month? Recommendation: **No carry-over on any Everyday bucket.** Residual goes to the default excess SAVINGS bucket (Emergency Fund). Keeps Everyday clean.

---

## The New Mental Model

```
Income (paycheck arrives)
    │
    ▼
Auto-allocation engine runs
    │
    ├── REGULAR buckets (bills): fund to monthly amount, prorated per paycheck
    │   (Mortgage, Electricity, Phone, Netflix...)
    │
    ├── SAVINGS — Committed (isCommitted=true): fund monthly contribution
    │   (Car Rego, School Fees, Council Rates...)
    │
    ├── SAVINGS — Uncommitted: fund monthly contribution if funds remain
    │   (Holiday, Christmas, Home Reno...)
    │
    └── EVERYDAY: everything left over
        (Single pool, or optional named sub-buckets)

"Can we afford this?" = run this engine in reverse from a given spend amount
```

---

## What's Being Removed

The following are **deleted entirely** — no V2 path, no carry-forward:

| Removed | Reason |
|---|---|
| `shortfall_events` table + all handlers | Replaced by "Can we afford this?" — proactive, not reactive |
| `savings_reconciliations` table + all handlers | Too complex, too infrequent, wrong tool for the job |
| Multi-tier priority waterfall (5-step engine) | Replaced by 3-step simplified engine |
| `RRULE` on `category_schedules` | Categories don't need recurrence rules. Income sources do. |
| `DRAFT \| REVIEWED` allocation plan statuses | Auto-confirm removes the review gate |
| Push notification: `notify-category-red` cron | Removed with category health complexity |
| Push notification: `notify-reconciliation-due` cron | Removed with reconciliation |
| Category `priorityRank` column | Replaced by `isCommitted` boolean |
| `Paychecks` tab in bottom nav | Replaced — paycheck events visible inside home screen |
| Shortfall resolution screen | Entire concept removed |
| Reconciliation screen | Entire concept removed |

---

## Proposed Changes

### Phase 1 — Foundation (Prerequisite: AGENTS.md critical gaps)

These must be fixed before any feature work. They are security-critical.

---

#### `packages/core` [NEW]

> [!CAUTION]
> `packages/core` does not exist yet. It is a hard prerequisite per AGENTS.md §3. Nothing in Phase 2 should be built without it.

**[NEW] `packages/core/src/db-client.ts`**
- Injectable Drizzle/Neon client factory
- Accepts `NEON_DATABASE_URL` from validated config
- Exported as `createDbClient(config)` — no singleton, testable

**[NEW] `packages/core/src/auth.ts`**
- JWT verification (JWKS) + opaque session token verification (Neon Auth DB session table)
- Extracts `userId`, `tenantId` from verified claims — **never from client headers**
- `resolveSession(request): Promise<AuthSession>` — throws `UnauthorizedError` if invalid

**[NEW] `packages/core/src/logger.ts`**
- Pino structured logger
- Strips PII fields by config (`email`, `name` etc.)
- Injects `correlationId` on every log line

**[NEW] `packages/core/src/correlation-id.ts`**
- Fastify plugin: reads or generates `X-Correlation-ID` on each request, sets on reply

**[NEW] `packages/core/src/rate-limiter.ts`**
- Fastify `@fastify/rate-limit` wrapper with sensible defaults

---

#### `packages/config` [NEW]

**[NEW] `packages/config/src/env.ts`**
- Zod `.strict()` schema for all env vars
- Validated at startup — process exits on invalid config
- `DATABASE_URL`, `NEON_AUTH_*`, `INNGEST_*`, `APP_ID`, `NODE_ENV`

**[NEW] `packages/config/src/app-registry.ts`**
- Map of `appId → AppConfig`
- `appId` resolved server-side from registry — **never from client input**

**[NEW] `packages/config/src/feature-flags.ts`**
- Typed flag definitions: `premiumEnabled`, `offlineSync`, `partnerInvite`
- Each flag: `owner`, `defaultValue`, `expiryVersion`, `tenantScopable`

---

#### Fix critical gaps in `apps/api` and `packages/capabilities`

**[MODIFY] tRPC middleware** — Stop trusting `tenantId` from client headers. `tenantProcedure` must extract `tenantId` from the verified session only.

**[MODIFY] `appId` references** — Remove hardcoded UUID literal. Resolve from `packages/config` app registry.

---

### Phase 2 — Data Model (Clean break migration)

---

#### `packages/db`

**[MODIFY] `src/schema/category.ts`**
```diff
- export const categoryTypeEnum = pgEnum("category_type_enum", ["MAJOR", "RECURRING", "EVERYDAY"]);
+ export const categoryTypeEnum = pgEnum("category_type_enum", ["REGULAR", "SAVINGS", "EVERYDAY"]);

  export const categories = pgTable("categories", {
    ...
-   priorityRank: integer("priority_rank"),
+   isCommitted: boolean("is_committed").notNull().default(false), // SAVINGS only: funded before uncommitted
+   monthlyAmount: numeric("monthly_amount", { precision: 12, scale: 2 }), // REGULAR only
    isDefaultExcess: boolean("is_default_excess").notNull().default(false),
    ...
  });
```

**[MODIFY] `src/schema/category_schedule.ts`**
```diff
  export const categorySchedules = pgTable("category_schedules", {
    ...
    targetAmount: numeric(...),
-   rrule: varchar("rrule", { length: 500 }),      // REMOVED — categories don't have recurrence
-   nextDueDate: date("next_due_date"),              // REMOVED — computed from targetDate
+   targetDate: date("target_date"),                 // SAVINGS only: when is the money needed?
    dueDate: date("due_date"),                       // KEEP — for annual point-in-time events
    ...
  });
```

**[MODIFY] `src/schema/allocation_plan.ts`**
```diff
- status: pgEnum(["DRAFT", "REVIEWED", "CONFIRMED"])
+ status: pgEnum(["PENDING", "CONFIRMED"])          // PENDING = brief auto-confirm window only
```

**[MODIFY] `src/schema/transaction_ledger.ts`**
```diff
+ source: pgEnum("transaction_source", ["MANUAL", "IMPORT"]).notNull().default("MANUAL"),
```

**[DELETE] `src/schema/shortfall_event.ts`** — table dropped in migration

**[DELETE] `src/schema/savings_reconciliation.ts`** — table dropped in migration

**[NEW] Migration file** — single deterministic migration that:
1. Creates new enum `category_type_enum_v2` with `REGULAR | SAVINGS | EVERYDAY`
2. Updates all `MAJOR` rows → `SAVINGS`, `isCommitted = true`
3. Updates all `RECURRING` rows → `REGULAR`
4. Sets `monthlyAmount` from existing schedule `targetAmount` for REGULAR rows
5. Drops old enum, renames new enum
6. Drops `priority_rank` column
7. Drops `shortfall_events` table
8. Drops `savings_reconciliations` table
9. Drops `rrule` and `nextDueDate` from `category_schedules`
10. Adds `targetDate`, `monthlyAmount`, `isCommitted`, `source` columns

---

### Phase 3 — Capability Refactor (Vertical slices)

The current `packages/capabilities/money` is a monolith. Per AGENTS.md §3–§4, capabilities must be vertical slices with strict isolation. Split into two:

```
packages/capabilities/
├── budgeting/          # Buckets, allocation engine, paycheck plans
│   ├── commands/
│   │   ├── create-bucket.command.ts
│   │   ├── update-bucket.command.ts
│   │   ├── archive-bucket.command.ts
│   │   └── run-allocation.command.ts
│   ├── queries/
│   │   ├── list-buckets.query.ts
│   │   ├── get-bucket-detail.query.ts
│   │   ├── get-monthly-summary.query.ts
│   │   └── get-paycheck-allocation.query.ts
│   ├── engine/
│   │   └── allocation-engine.ts     # Pure function — no DB deps, fully testable
│   ├── events.ts                    # Inngest event definitions
│   ├── router.ts                    # tRPC router wiring
│   └── index.ts
│
└── transactions/       # Expense entry, ledger reads, "Can we afford this?"
    ├── commands/
    │   └── record-expense.command.ts
    ├── queries/
    │   ├── list-transactions.query.ts
    │   └── can-afford.query.ts       # "Can we afford this?" — THE differentiator
    ├── router.ts
    └── index.ts
```

---

#### `packages/capabilities/budgeting`

**[NEW] `engine/allocation-engine.ts`**

Pure function — no DB calls, no side effects. Fully unit-testable.

```typescript
// Input: income amount + all bucket states
// Output: allocation plan lines with reasoning
function runAllocationEngine(input: AllocationEngineInput): AllocationEngineOutput

// Three-step waterfall (replaces 5-step complexity):
// Step 1: REGULAR buckets — prorate monthly amount by paycheck frequency
//         (e.g. fortnightly = monthlyAmount ÷ 2.17)
// Step 2: SAVINGS committed — (targetAmount - currentBalance) ÷ monthsToTargetDate
// Step 3: SAVINGS uncommitted — same calc, funded if funds remain
// Remainder → EVERYDAY default bucket
// If Step 1+2 cannot be met → INSUFFICIENT flag, no silent under-funding
```

**[NEW] `commands/run-allocation.command.ts`**
- Triggered by Inngest `income_event.received`
- Calls pure `runAllocationEngine()`
- Inserts `allocation_plan` + lines in a single DB transaction
- Status goes directly to `CONFIRMED` (no DRAFT gate)
- Fires `allocation_plan.confirmed` event → notification capability picks it up

**[DELETE] `money-handlers.ts`** (entire file — replaced by command/query handlers)
**[DELETE] `confirm-plan.ts`** (replaced by simplified run-allocation command)
**[DELETE] `allocation.ts`** (replaced by pure allocation-engine.ts)

---

#### `packages/capabilities/transactions`

**[NEW] `queries/can-afford.query.ts`**

The differentiator. Input: `amount: Decimal`. Returns:

```typescript
type CanAffordResult =
  | { verdict: 'YES'; source: 'everyday'; everydayRemaining: Decimal }
  | { verdict: 'YES_WITH_IMPACT'; source: 'savings'; affectedBucket: string; newBalance: Decimal }
  | { verdict: 'WAIT'; daysUntilNextPaycheck: number; amountExpected: Decimal }
  | { verdict: 'NO'; shortfall: Decimal }
```

Simple logic:
1. Fetch current EVERYDAY balance
2. If amount ≤ everyday balance → `YES`
3. If amount > everyday but ≤ everyday + uncommitted savings surplus → `YES_WITH_IMPACT` (names the bucket it would draw from)
4. If next paycheck within 14 days and paycheck would cover it → `WAIT`
5. Otherwise → `NO`

**[NEW] `commands/record-expense.command.ts`**
- Creates `transaction_ledger` DEBIT row
- `source: 'MANUAL'` (bank import hook ready for V3)
- Decrements from the nominated bucket balance
- Returns updated bucket state to client immediately

---

### Phase 4 — Mobile UI

---

#### `apps/mobile` screen changes

**[MODIFY] Home screen (`home.tsx`)**
- Top half: Monthly summary — "July: $X income, $Y spent, $Z in savings, $W everyday remaining"
- Bottom half: Bucket health cards (REGULAR → SAVINGS → EVERYDAY)
- Remove: "Next paycheck readiness" widget → fold into monthly summary
- Remove: "Paychecks" CTA from prominent placement

**[MODIFY] Buckets screen (`buckets.tsx`)**
- Rename: "Buckets" → unchanged (keep the name, it's good)
- Three sections: Regular · Savings · Everyday
- Each SAVINGS card shows: fund name, balance/target, target date, monthly contribution, progress bar
- Each REGULAR card shows: name, monthly amount, current month status (paid/pending)
- Everyday: single card showing pool amount + optional sub-bucket list

**[NEW] "Can we afford this?" screen (`afford.tsx`)**
- Accessible from FAB (quick-add) or dedicated button on home screen
- Large numeric input
- Instant result with verdict + clear reasoning text
- If YES: shows which bucket, remaining balance after
- If YES_WITH_IMPACT: names the savings bucket affected, shows new balance
- If WAIT: shows countdown + next paycheck amount
- If NO: shows shortfall — doesn't suggest "borrow from savings" (we removed that complexity)

**[MODIFY] Transaction entry (`transactions.tsx`)**
- Remove category required for Everyday transactions (just assign to EVERYDAY pool)
- Optional: assign to named Everyday sub-bucket
- Remove shortfall alert flow entirely

**[MODIFY] Bottom nav**
- Old: Home · Buckets · Transactions · Paychecks · Settings
- New: **Home · Buckets · Add (FAB) · Transactions · Settings**
- Paychecks tab removed — paycheck history accessible from Home screen

**[DELETE] Reconciliation screen** — entire screen and navigation removed

**[DELETE] Shortfall resolution screen** — entire screen and navigation removed

**[MODIFY] Setup wizard**
- Step 2 (Categories): pre-populated list updated to `REGULAR` and `SAVINGS` labels (not MAJOR/RECURRING)
- Step 3 (Configure): for SAVINGS, collect `targetAmount` + `targetDate` + `isCommitted` toggle. For REGULAR, collect `monthlyAmount`. Remove priority rank drag-reorder entirely.
- Remove: Step 4 bank accounts complexity — simplify to "name your savings account" only

---

### Phase 5 — Infrastructure & AGENTS.md compliance

(Can run in parallel with Phase 3/4)

**RLS policies** — add to all tables: `tenantId = current_setting('app.tenant_id')::uuid`

**Indexes** — add `(tenantId, appId)` composite index to every table that lacks it

**i18n** — move all new user-facing strings into `packages/i18n`

**Tests (Vitest)**
- `allocation-engine.ts` → unit tests for all three steps + insufficient income case
- `can-afford.query.ts` → unit tests for all four verdict types
- `run-allocation.command.ts` → integration test with test DB
- `record-expense.command.ts` → integration test

**Feature flags** — add `canAffordCalculator: { owner: 'product', default: true }` flag

---

## Verification Plan

### Automated Tests
```bash
pnpm test --filter @money-matters/capabilities-budgeting
pnpm test --filter @money-matters/capabilities-transactions
pnpm typecheck
pnpm lint
```

### Database Migration Verification
```bash
pnpm db:migrate        # Run migration
pnpm db:studio         # Visually verify schema + data migration
```

### Manual Verification
1. Run setup wizard → confirm only Regular/Savings/Everyday types shown
2. Add income source → trigger allocation → verify auto-confirm (no review gate)
3. Check push notification received with allocation summary
4. Open "Can we afford this?" → test all four verdict types
5. Confirm Paychecks tab and Reconciliation screen are gone from navigation
6. Confirm shortfall resolution flow is completely unreachable

---

## Execution Order

```
Phase 1 (Foundation)     ← Must be first. Unblocks everything.
    │
    ▼
Phase 2 (Data Model)     ← Unblocks Phase 3 + 5 in parallel
   / \
  /   \
Phase 3   Phase 5        ← Can run in parallel
(Capabilities) (Infra)
    │
    ▼
Phase 4 (Mobile UI)      ← Last. Depends on Phase 3 APIs being ready.
```

**Estimated scope by phase:**
- Phase 1: Medium (missing packages, security fixes)
- Phase 2: Medium (schema migration + data migration)
- Phase 3: Large (capability split + engine rewrite + new affordability query)
- Phase 4: Medium (screen updates + deletions)
- Phase 5: Small-Medium (runs in parallel)
