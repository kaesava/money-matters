# TECHNICAL_SPEC.md — money-matters

> **Last updated:** 2026-07-20  
> **Status:** V2 Clean 3-Bucket Model & Full Capability UI Exposure Complete.

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
│   │   ├── tenant/          # Household creation & multi-tenant status
│   │   ├── budgeting/       # V2 3-bucket waterfall engine, category CRUD, monthly summary
│   │   ├── transactions/    # Daily transactions ledger & canAfford calculator
│   │   ├── notifications/   # Expo push device token registration
│   │   ├── file-notes/      # Notes, comments, attachments & pre-signed upload URLs
│   │   └── geo/             # Photon OSM location & place autocomplete
│   ├── core/          # DB client, logger, auth session resolver, middleware
│   ├── config/        # Zod env schemas, app registry, feature flags
│   ├── db/            # Drizzle schema + Neon connection + migrations
│   ├── i18n/          # Translation strings
│   ├── types/         # Zod contracts + DTOs
│   └── ui/            # UI design system primitives (Web + Mobile)
```

---

## 3. Multi-Tenancy & Platform Architecture

- **`tenantId` = `householdId`** — root isolation boundary for all data.
- **`appId`** = product/app shell identifier resolved server-side.
- PostgreSQL RLS policies enforce `tenantId` + `appId` at the DB layer.
- **Strict IoC**: Capabilities export standalone commands, queries, and handlers. Handlers are wired into Fastify / tRPC routers without direct cross-capability imports.

---

## 4. Canonical Data Model

### 4.1 Entity Relationship

```
households (tenant)
├── bank_accounts (purpose: INCOME_LANDING|SAVINGS|EVERYDAY, isOffset)
├── income_sources (name, type, expectedAmount, RRULE, receivingAccountId)
│   └── income_events (expectedDate, expectedAmount, actualAmount, status)
│       └── allocation_plans (status: PENDING|CONFIRMED)
│           └── allocation_plan_lines (categoryId, proposedAmount, confirmedAmount, reasoning)
├── categories (name, type: REGULAR|GOAL|EVERYDAY, icon, colour, isCommitted, isDefaultExcess, monthlyAmount)
│   ├── category_schedules (targetAmount, targetDate, dueDate) [GOAL only]
│   └── transaction_ledger (flowType: DEBIT|CREDIT, amount, source: MANUAL|IMPORT, note)
└── file_notes (entityType: CATEGORY|TRANSACTION, comment, fileKey, fileName, mimeType)
```

---

## 5. Allocation & Affordability Engines

### 5.1 3-Tier Waterfall Cascade
1. **`REGULAR` categories**: Prorate monthly bill amount by paycheck frequency (`monthlyAmount * paycheckFrequencyDays / 30.4375`).
2. **`GOAL` committed categories (`isCommitted = true`)**: Allocate needed monthly contribution to keep on track for `targetDate`.
3. **`GOAL` uncommitted categories (`isCommitted = false`)**: Allocate remaining target contribution if funds permit.
4. **`EVERYDAY` excess category**: Sweeps all residual income into the everyday spending pool.

### 5.2 `canAfford` Verdict Engine
- **`YES`**: Amount is fully covered by Everyday balance.
- **`YES_WITH_IMPACT`**: Amount dips into uncommitted goal surplus balance.
- **`WAIT`**: Amount exceeds current balance, but upcoming paycheck in ≤14 days covers it.
- **`NO`**: Amount exceeds available balances and upcoming income.

---

## 6. Capability UI Exposure Matrix

| Capability | Web UI (`apps/web`) | Mobile UI (`apps/mobile`) |
| :--- | :--- | :--- |
| `@money-matters/capability-tenant` | `/setup` wizard | `/(setup)/configure.tsx` |
| `@money-matters/capability-budgeting` | `/dashboard/categories`, `/dashboard/settings/archived` | `/(app)/categories`, `/(app)/categories/[id]`, `/(app)/settings/archived` |
| `@money-matters/capability-transactions` | `<CanWeAffordCard />`, `AppHeader` quick expense | `<CanWeAffordModal />`, `/(app)/transactions`, `QuickExpenseModal` |
| `@money-matters/capability-file-notes` | `FileNotesSection` in `CategoryDetailDrawer` | `FileNotesSection` in `categories/[id]` |
| `@money-matters/capability-notifications` | Push token API ready | `registerToken` called on auth in `sign-in.tsx` |
| `@money-matters/capability-geo` | `getPlaceSuggestions` API ready | `getPlaceSuggestions` location search ready |
