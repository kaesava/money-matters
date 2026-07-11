# TECHNICAL_ARCH.md — money-matters

> **Last updated:** 2026-07-11  
> **Status:** Early scaffolding. Significant gaps remain. See §12 for full gap registry.

---

## 1. Stack Versions

| Layer | Package | Version |
|---|---|---|
| Runtime | Node.js | ≥20 (LTS) |
| Package manager | pnpm | 9.0.0 |
| Build orchestration | Turborepo | 2.0.14 |
| Language | TypeScript | ^6.0.3 |
| API server | Fastify | ^4.26.2 |
| API layer | tRPC | ^11.18.0 |
| ORM | Drizzle ORM | ^0.39.0 |
| DB (server) | Neon PostgreSQL (serverless) | @neondatabase/serverless ^0.9.0 |
| Auth | Neon Auth / Stack Auth | via @neondatabase/serverless |
| DB (mobile) | Expo SQLite | 14.0.6 |
| Validation | Zod | ^3.23.8 |
| Mobile framework | React Native / Expo | 0.74.5 / 51.0.28 |
| Mobile routing | Expo Router | 57.0.4 |
| Mobile styling | NativeWind | 4.0.36 |
| Async workflows | Inngest | ^3.19.14 |
| Push notifications | Expo Push Notifications | via expo-notifications |
| Testing | Vitest | ^4.1.10 |
| Linting | ESLint | ^9 |

**Missing from stack (to be added):** `packages/core`, `packages/config`, Neon DB Auth, Resend, Svix, RLS policies.

---

## 2. Monorepo Topology

```
money-matters/
├── apps/
│   ├── api/           # Fastify server — bootstrap + route wiring ONLY
│   ├── mobile/        # Expo React Native — bootstrap ONLY
│   └── web/           # (empty — Next.js, deferred)
├── packages/
│   ├── capabilities/
│   │   ├── household/ # Household management (create, members, bank accounts, setup wizard)
│   │   └── money/     # Allocation engine, income events, categories, transactions
│   ├── core/          # [MISSING] DB client, logger, auth session resolver, middleware
│   ├── config/        # [MISSING] Zod env schemas, app registry, feature flags
│   ├── db/            # Drizzle schema + Neon connection + migrations
│   ├── i18n/          # Translation strings (very thin — needs full coverage)
│   ├── types/         # Zod contracts + DTOs (very thin — needs expansion)
│   └── ui/            # [EMPTY] React Native design system primitives
```

---

## 3. Multi-Tenancy & App Identity Model

### Confirmed 2026-07-11

- **`tenantId` = `householdId`** — root isolation boundary for all data.
- **`appId`** = product/app shell identifier. The platform supports multiple app shells defined by config. V1 has one app: `money-matters`. `appId` resolved server-side from app registry in `packages/config` — **never trusted from client input**.
- Every `(tenantId, appId)` pair is a unique enrolment. One household → exactly one app.
- All DB tables carry both `tenantId` and `appId` for future multi-app isolation.
- RLS policies enforce `tenantId` + `appId` at the DB layer.

---

## 4. Canonical Data Model

### 4.1 Entity Relationship

```
households
├── household_members (role: OWNER|MEMBER, inviteToken, inviteStatus)
├── bank_accounts (purpose: INCOME_LANDING|SAVINGS|EVERYDAY, isOffset)
├── income_sources (name, type, expectedAmount, RRULE, receivingAccountId)
│   └── income_source_schedules (RRULE, startDate, endDate, nextOccurrence)
│       └── income_events (expectedDate, expectedAmount, actualAmount, status)
│           └── allocation_plans (status: DRAFT|REVIEWED|CONFIRMED)
│               └── allocation_plan_lines (categoryId, proposedAmount, confirmedAmount, reasoning)
└── categories (name, type: MAJOR|RECURRING|EVERYDAY, icon, colour, priorityRank, isDefaultExcess)
    └── category_schedules (targetAmount, RRULE or dueDate, nextDueDate) [MAJOR+RECURRING only]
    └── transaction_ledger (flowType: DEBIT|CREDIT, amount, idempotencyKey, note)
    └── shortfall_events [as donor or recipient]

shortfall_events (donorCategoryId, recipientCategoryId, borrowedAmount, repaidAmount, status: BORROWED|PARTIAL|REPAID)
savings_reconciliations (bankAccountId, expectedBalance, actualBalance, reconciledAt)
```

### 4.2 Category Type Enum

`MAJOR` | `RECURRING` | `EVERYDAY`

(replaces current `major` | `bills` | `everyday`)

### 4.3 Removed / Replaced

| Old | Replacement | Reason |
|---|---|---|
| `financial_schedules` (direction IN/OUT) | `income_source_schedules` + `category_schedules` | Dual-purpose table is confusing; separate for clarity |
| `income_allocation_snapshots` | `allocation_plans` + `allocation_plan_lines` | JSONB manifest replaced by normalised rows |
| `componentFieldsData` JSONB on categories | Typed columns: `icon`, `colour`, `isDefaultExcess`, `priorityRank` | JSONB violates type safety; not queryable |
| `transaction_ledger.flowType` varchar | `flowType` pgEnum: `DEBIT` | `CREDIT` | Type safety |

### 4.4 Base Columns (all tables)

```ts
{
  id: uuid PK,
  tenantId: uuid NOT NULL,
  appId: uuid NOT NULL,
  createdAt: timestamptz NOT NULL DEFAULT now(),
  createdBy: uuid NOT NULL,  // userId of the actor
  updatedAt: timestamptz NOT NULL DEFAULT now(),
  updatedBy: uuid NOT NULL,
  archivedAt: timestamptz NULL  // soft delete
}
```

Required indexes: `(tenantId, appId)` on every table. Additional indexes per query patterns.

---

## 5. Authentication

### Confirmed 2026-07-11

- **Provider:** Neon Auth (Stack Auth integration).
- JWT issued by Stack Auth, verified server-side in tRPC context.
- `tenantId` and `userId` extracted from verified JWT claims — **never from client headers**.
- `appId` resolved from app registry config keyed by the `appId` claim in the JWT.
- PostgreSQL RLS policies enforce `tenantId` + `appId` at DB layer.
- `tenantProcedure` middleware validates JWT, resolves tenantId + appId, injects into context.

---

## 6. API Layer

### 6.1 tRPC Procedures

| Procedure | Guard | Purpose |
|---|---|---|
| `publicProcedure` | None | Auth endpoints (sign-in, sign-up webhook) |
| `authedProcedure` | JWT verified | Any authenticated user |
| `tenantProcedure` | JWT + tenantId resolved | All household data operations |
| `ownerProcedure` | JWT + role = OWNER | Setup, member management |

### 6.2 Router Namespaces (to be built)

```
household.*    — create, get, update household
members.*      — list members (V2: invite, revoke)
bankAccounts.* — CRUD bank accounts
categories.*   — CRUD categories + category_schedules
incomeSources.*— CRUD income sources + schedules
incomeEvents.* — list, create manual, edit upcoming, trigger plan generation
allocationPlans.* — get draft, submit review, confirm
transactions.* — create expense, list by category, list recent
shortfalls.*   — list open, resolve (approve donor)
reconciliation.* — get expected balance, submit actual, list history
```

### 6.3 Inngest Functions (async)

| Function | Trigger | Action |
|---|---|---|
| `seed-on-signup` | `auth/user.signup` | Create household, seed default categories |
| `generate-income-events` | Cron: nightly | Generate UPCOMING IncomeEvents from RRULEs |
| `generate-allocation-draft` | `income_event.upcoming` (7 days) | Run allocation engine, create DRAFT AllocationPlan |
| `notify-paycheck-upcoming` | `allocation_plan.created` | Send push notification |
| `notify-category-red` | Cron: daily | Detect RED categories, send push |
| `notify-reconciliation-due` | Cron: monthly | Send reconciliation reminder |

---

## 7. Allocation Engine

### Algorithm (3-tier waterfall — to be correctly implemented)

**Inputs:**
- `incomeAmount`: actual income for this event
- `categories`: all MAJOR + RECURRING with `targetAmount`, `currentBalance`, `nextDueDate`, `priorityRank`
- `paychecksRemainingUntilDue`: derived from nextDueDate ÷ income recurrence frequency
- `openShortfalls`: any outstanding borrowed amounts to repay

**Step 0 — Shortfall repayments:** Add outstanding borrowed amounts to donor categories' gaps.

**Step 1 — Tier 1 (Priority rank 1, pro-rata by gap):**
- All categories at priority rank 1 funded together, pro-rata by their individual gap sizes.
- Gap = max(0, targetAmount - currentBalance) / paychecksRemainingUntilDue

**Step 2 — Tier 2 (All other priorities, sequential by rank, pro-rata within each rank):**
- For each subsequent priority rank (2, 3, ...): fund pro-rata by velocity score.
- Velocity = (gap / daysRemaining) × (maxPriority − priorityRank + 1)

**Step 3 — Tier 3 (Residual → EVERYDAY):**
- Remaining funds swept to the household's nominated excess category.

**Insufficient income:**
1. If Tier 1 cannot be fully funded → propose Emergency Fund borrow in plan, require user approval.
2. If no Emergency Fund → alert user, pro-rata partial funding as starting point.

**Rollover:** Engine always reads `currentBalance` from ledger — no hardcoded values.

### Confirmation (V1 — synchronous)

Allocation plan confirmation is a single DB transaction:
1. Update each `allocation_plan_line.confirmedAmount` (may differ from proposed if user adjusted).
2. Insert `TransactionLedger` CREDIT entries per category.
3. Mark `allocation_plan.status = CONFIRMED`.

V2: migrate to Inngest workflow for resilience (see V2_SCOPE.md).

---

## 8. Mobile App

- Framework: Expo Router (file-based routing).
- Auth: Neon Auth / Stack Auth SDK.
- Data: tRPC + React Query (standard stale-while-revalidate — no offline sync in V1).
- Styling: NativeWind (Tailwind tokens in React Native).
- SQLite: offline queue schema scaffolded in V1 for V2 sync — not wired in V1.
- All mutations include `idempotencyKey` from V1 to enable offline replay in V2.

**Screen structure:**
```
(auth)/
  sign-in.tsx
  sign-up.tsx
  verify.tsx
(setup)/
  _layout.tsx (wizard shell)
  income.tsx
  categories.tsx
  configure.tsx
  bank-accounts.tsx
  complete.tsx
(app)/
  _layout.tsx (bottom nav)
  index.tsx          # Home (dashboard)
  buckets/
    index.tsx        # All categories
    [id].tsx         # Category detail + history
  transactions/
    index.tsx        # Transaction history
    new.tsx          # Quick-add expense
  paychecks/
    index.tsx        # Income events + allocation plans
    [id].tsx         # Paycheck review screen
    [id]/review.tsx  # Allocation adjustment screen
  settings/
    index.tsx
    household.tsx
    bank-accounts.tsx
    categories.tsx
    income-sources.tsx
```

---

## 9. packages/core (to be created)

Must contain:
- `db-client.ts` — Neon/Drizzle client factory (injectable, testable)
- `logger.ts` — structured logger, no PII, with correlation ID
- `auth.ts` — JWT verification, session type, tenantId/appId resolution
- `rate-limiter.ts` — Fastify rate limit plugin wrapper
- `correlation-id.ts` — Fastify hook to propagate request IDs

---

## 10. packages/config (to be created)

Must contain:
- `env.ts` — Zod-validated environment schema, fails fast on startup
- `app-registry.ts` — Map of appId → app config (name, features, etc.)
- `feature-flags.ts` — Typed feature flag definitions with `owner`, `expiryDate`, `tenantScopable`

### Feature Flags (V1)

| Flag | Owner | Default | Expiry | Description |
|---|---|---|---|---|
| `premiumEnabled` | product | `false` | none | Enables AI allocation + premium features |
| `offlineSync` | engineering | `false` | v2-release | Enables SQLite ↔ Neon sync |
| `partnerInvite` | product | `false` | v2-release | Enables household member invite flow |

---

## 11. Observability

All to be implemented in `packages/core`:
- Structured JSON logging (Pino) — correlation ID on every log line
- No PII in logs (no email, name, amounts are acceptable)
- Audit log events for: allocation plan confirmed, shortfall created, reconciliation submitted, member invited
- Error tracking: Sentry (to be added)
- Metrics: Inngest provides built-in function metrics

---

## 12. Critical Gaps vs AGENTS.md

| Rule | Gap | Priority |
|---|---|---|
| §5 Multi-Tenancy | `tenantId` trusted from client header | 🔴 Critical |
| §5 Multi-Tenancy | `appId` hardcoded as literal UUID | 🔴 Critical |
| §6 DB Standards | Schema drift: TypeScript ≠ SQL migration | 🔴 Critical |
| §6 DB Standards | Missing indexes on `tenantId`/`appId` | 🔴 Critical |
| §6 DB Standards | No RLS policies | 🔴 Critical |
| §6 DB Standards | `timestamp` not `timestamptz` consistently | 🟡 High |
| §8 Type Safety | `any` in household capability, i18n | 🟡 High |
| §8 Type Safety | `flowType` varchar → pgEnum | 🟡 High |
| §8 Type Safety | `allocationSplitsManifest` JSONB → normalised rows | 🟡 High |
| §8 Type Safety | `componentFieldsData` JSONB → typed columns | 🟡 High |
| §8 Type Safety | `CreateHouseholdCommand` not in types package | 🟡 High |
| §12 Mobile | SQLite schema incomplete; no sync logic | 🟢 Medium (V2) |
| §13 i18n | `t()` uses `any`; only 3 keys | 🟡 High |
| §14 Integrations | Neon DB Auth not integrated | 🔴 Critical |
| §14 Integrations | Resend, Svix not present | 🟢 Medium |
| §16 Performance | No pagination on any query | 🟡 High |
| §17 Feature Flags | Not implemented | 🟡 High |
| §19 Observability | No logging, tracing, correlation IDs | 🟡 High |
| §21 Testing | Zero tests | 🟡 High |
| §22 Code Quality | `packages/capabilities/household` essentially empty | 🟡 High |
| §3 Topology | `packages/core` and `packages/config` missing | 🟡 High |
