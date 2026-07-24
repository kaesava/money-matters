# TECHNICAL_SPEC.md — money-matters

> **Last updated:** 2026-07-24  
> **Status:** V2 Core Overhaul, 12-Month Burst Engine, Bank Reconciliation, and Complete Unified UI Exposure.

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
| DB (mobile) | Expo SQLite | 16.0.10 |
| Validation | Zod | ^3.23.8 |
| Mobile framework | React Native / Expo | 0.81.5 / 54.0.36 |
| Mobile routing | Expo Router | 6.0.24 |
| Mobile styling | NativeWind | 4.0.36 |
| Async workflows | Inngest | ^3.19.14 |
| Push notifications | Expo Push Notifications | via expo-notifications |
| Testing | Vitest | ^4.1.10 |
| Linting | ESLint | ^9 |

---

## 2. Monorepo Topology & Capabilities

```
money-matters/
├── apps/
│   ├── api/           # Fastify server — bootstrap + route wiring ONLY
│   ├── mobile/        # Expo React Native — bootstrap ONLY
│   └── web/           # Next.js Web UI App Router
├── packages/
│   ├── capabilities/
│   │   ├── tenant/          # Household creation, bank account CRUD & archival validation
│   │   ├── budgeting/       # V2 3-bucket waterfall engine, 12-month burst engine, category CRUD, bank reconciliation
│   │   ├── transactions/    # Daily transactions ledger & canAfford calculator
│   │   ├── notifications/   # Expo push device token registration
│   │   ├── file-notes/      # Notes, comments, attachments & pre-signed upload URLs
│   │   └── geo/             # Photon OSM location & place autocomplete
│   ├── core/          # DB client, logger, auth session resolver, middleware
│   ├── config/        # Zod env schemas, app registry, feature flags
│   ├── db/            # Drizzle schema + Neon connection + migrations + seeder
│   ├── i18n/          # Translation strings
│   ├── types/         # Zod contracts + DTOs
│   └── ui/            # UI design system primitives (Web + Mobile)
```

---

## 3. Multi-Tenancy & Platform Architecture

- **`tenantId` = `householdId`** — root isolation boundary for all data.
- **`appId`** = product/app shell identifier resolved server-side.
- **Single Canonical Everyday Category**: Exactly 1 `EVERYDAY` category seeded per tenant; creation of additional Everyday categories, renaming, and deletion are strictly locked at API & UI layers.
- **User Preference Storage**: `user_preferences` table persists UI states (such as Quick Actions open/collapsed state) per user and tenant.
- PostgreSQL RLS policies enforce `tenantId` + `appId` at the DB layer.
- **Strict IoC**: Capabilities export standalone commands, queries, and handlers. Handlers are wired into Fastify / tRPC routers without direct cross-capability imports.

---

## 4. Canonical Data Model

### 4.1 Entity Relationship

```
households (tenant)
├── bank_accounts (lastKnownBalance, purpose: INCOME_LANDING|SAVINGS|EVERYDAY, isOffset)
├── user_preferences (quickActionsCollapsed)
├── income_sources (name, type, amount, receivingAccountId)
│   └── income_events (expectedDate, expectedAmount, actualAmount, status: UPCOMING|PAID)
├── expense_sources (name, type, amount, categoryId)
│   └── expense_events (expectedDate, expectedAmount, actualAmount, status: UPCOMING|PAID)
├── categories (name, type: REGULAR|GOAL|EVERYDAY, bankAccountId, rolloverRule: ROLLOVER|SWEEP|RESET, isDefaultSavings, everydayTargetKeepAmount, everydaySweepFrequency)
│   ├── category_schedules (targetAmount, targetDate, dueDate) [GOAL only]
│   └── transaction_ledger (flowType: DEBIT|CREDIT, amount, source: MANUAL|IMPORT, recordedAt, note)
└── file_notes (entityType: CATEGORY|TRANSACTION, comment, fileKey, fileName, mimeType)
```

---

## 5. Allocation, Burst & Reconciliation Engines

### 5.1 3-Tier Waterfall Cascade
1. **`REGULAR` categories**: Prorate monthly bill amount by paycheck frequency (`monthlyAmount * paycheckFrequencyDays / 30.4375`).
2. **`GOAL` committed categories (`isCommitted = true`)**: Allocate needed monthly contribution to keep on track for `targetDate`.
3. **`GOAL` uncommitted categories (`isCommitted = false`)**: Allocate remaining target contribution if funds permit.
4. **`EVERYDAY` excess category**: Sweeps all residual income into the single everyday spending pool.

### 5.2 12-Month Rolling Burst Engine
- Evaluates `rrule` patterns (`WEEKLY`, `FORTNIGHTLY`, `MONTHLY`, `ANNUALLY`) on creation/update of recurring income or expense sources to auto-generate individual upcoming events up to 12 months in advance.

### 5.3 Bank Reconciliation Engine
- Calculates **Expected Bank Balance** as the sum of current balances of all categories linked to a bank account (`bankAccountId`).
- **Surplus**: Allocates difference as a `CREDIT` transaction into specified category or `defaultSurplusCategoryId` on tenant.
- **Deficit**: Draws down difference as `DEBIT` transactions from categories in reverse priority order (`EVERYDAY` -> `GOAL` -> `REGULAR`) or via user drawdown override.

---

## 6. Capability UI Exposure Matrix

| Capability | Web UI (`apps/web`) | Mobile UI (`apps/mobile`) |
| :--- | :--- | :--- |
| `@money-matters/capability-tenant` | Bank Reconciliation, `/dashboard/settings/bank-accounts` | `home.tsx` Bank Reconciliation modal, `/settings/bank-accounts` |
| `@money-matters/capability-budgeting` | `/dashboard/categories` (Health/Type filter groups, sortable columns), MoveMoneyModal | `/(app)/categories`, `/(app)/categories/[id]` modal edit |
| `@money-matters/capability-transactions` | Main Dashboard Quick Actions, `/dashboard/transactions` (CSV export) | `home.tsx` Quick Actions, `/(app)/transactions` |
| `@money-matters/capability-file-notes` | `FileNotesSection` in `CategoryDetailDrawer` | `FileNotesSection` in `categories/[id]` |
| `@money-matters/capability-notifications` | Push token API ready | `registerToken` called on auth in `sign-in.tsx` |
| `@money-matters/capability-geo` | Location search ready | Location search ready |
