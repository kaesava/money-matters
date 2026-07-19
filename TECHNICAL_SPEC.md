# TECHNICAL_ARCH.md — money-matters

> **Last updated:** 2026-07-19  
> **Status:** Phase 1-5 Refactor Complete.

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
| Mobile framework | React Native / Expo | 0.81.5 / 54.0.35 |
| Mobile routing | Expo Router | 6.0.24 |
| Mobile styling | NativeWind | 4.0.36 |
| Async workflows | Inngest | ^3.19.14 |
| Push notifications | Expo Push Notifications | via expo-notifications |
| Testing | Vitest | ^4.1.10 |
| Linting | ESLint | ^9 |

---

## 2. Monorepo Topology

```
money-matters/
├── apps/
│   ├── api/           # Fastify server — bootstrap + route wiring ONLY
│   ├── mobile/        # Expo React Native — bootstrap ONLY
│   └── web/           # Next.js Web UI App Router
├── packages/
│   ├── capabilities/
│   │   ├── tenant/    # Tenant management
│   │   ├── budgeting/  # V2 waterfall budget engine & setup wizard endpoints
│   │   └── transactions/ # Daily transactions ledger & can-afford indicators
│   ├── core/          # DB client, logger, auth session resolver, middleware
│   ├── config/        # Zod env schemas, app registry, feature flags
│   ├── db/            # Drizzle schema + Neon connection + migrations
│   ├── i18n/          # Translation strings
│   ├── types/         # Zod contracts + DTOs
│   └── ui/            # UI design system primitives
```

---

## 3. Multi-Tenancy & App Identity Model

- **`tenantId` = `householdId`** — root isolation boundary for all data.
- **`appId`** = product/app shell identifier. `appId` resolved server-side from app registry in `packages/config`.
- PostgreSQL RLS policies enforce `tenantId` + `appId` at the DB layer.

---

## 4. Canonical Data Model

### 4.1 Entity Relationship

```
households
├── bank_accounts (purpose: INCOME_LANDING|SAVINGS|EVERYDAY, isOffset)
├── income_sources (name, type, expectedAmount, RRULE, receivingAccountId)
│   └── income_events (expectedDate, expectedAmount, actualAmount, status)
│       └── allocation_plans (status: PENDING|CONFIRMED)
│           └── allocation_plan_lines (categoryId, proposedAmount, confirmedAmount, reasoning)
└── categories (name, type: REGULAR|SAVINGS|EVERYDAY, icon, colour, isCommitted, isDefaultExcess, monthlyAmount)
    └── category_schedules (targetAmount, targetDate, dueDate) [SAVINGS only]
    └── transaction_ledger (flowType: DEBIT|CREDIT, amount, source: MANUAL|IMPORT, note)
```

---

## 5. Allocation Engine

### 3-Tier Waterfall Cascade
1. **REGULAR categories**: Prorate monthly amount by paycheck frequency (`monthlyAmount * paycheckFrequencyDays / 30.4375`).
2. **SAVINGS committed categories (`isCommitted = true`)**: Allocate needed monthly contribution to keep on track for `targetDate`.
3. **SAVINGS uncommitted categories (`isCommitted = false`)**: Allocate remaining target contribution if funds permit.
4. **EVERYDAY excess category**: Sweeps all residual income into the everyday spending pool.
