# TECHNICAL_SPEC.md — money-matters

> **Last updated:** 2026-07-25  
> **Status:** V2 Core Overhaul, 100% Documentation (TSDoc) and 100% Unit Test Coverage across all monorepo layers (`packages/*` and `apps/*`).

---

## 1. Stack Versions

| Layer | Package | Version | Test & Doc Status |
|---|---|---|---|
| Runtime | Node.js | ≥20 (LTS) | Verified |
| Package manager | pnpm | 9.0.0 | Workspace verified |
| Build orchestration | Turborepo | 2.0.14 | 100% test pass |
| Language | TypeScript | ^6.0.3 | Strict zero `any` |
| API server | Fastify | ^4.26.2 | TSDoc & unit tested |
| API layer | tRPC | ^11.18.0 | TSDoc & unit tested |
| ORM | Drizzle ORM | ^0.39.0 | Schema TSDoc & unit tested |
| DB (server) | Neon PostgreSQL (serverless) | @neondatabase/serverless ^0.9.0 | Schema TSDoc & unit tested |
| Auth | Neon Auth / Better Auth | @better-auth/expo / Better Auth | TSDoc & unit tested |
| DB (mobile) | Expo SQLite | 16.0.10 | Schema TSDoc & unit tested |
| Validation | Zod | ^3.23.8 | .strict() contracts & unit tested |
| Mobile framework | React Native / Expo | 0.81.5 / 54.0.36 | Format & UI unit tested |
| Mobile routing | Expo Router | 6.0.24 | Configured |
| Mobile styling | NativeWind | 4.0.36 | Configured |
| Async workflows | Inngest | ^3.19.14 | Wired |
| Push notifications | Expo Push Notifications | via expo-notifications | Wired |
| Testing | Vitest | ^4.1.10 | 100% test suite execution |
| Linting | ESLint | ^9 | Configured |

---

## 2. Monorepo Topology & Capabilities

```
money-matters/
├── apps/
│   ├── api/           # Fastify server — bootstrap + route wiring (TSDoc + 100% Unit Tests)
│   ├── mobile/        # Expo React Native — bootstrap (TSDoc + 100% Unit Tests)
│   └── web/           # Next.js Web UI App Router (TSDoc + 100% Unit Tests)
├── packages/
│   ├── capabilities/
│   │   ├── tenant/          # Household creation & bank account CRUD (TSDoc + 100% Unit Tests)
│   │   ├── budgeting/       # V2 3-bucket waterfall & burst engine (TSDoc + 100% Unit Tests)
│   │   ├── transactions/    # Daily ledger & canAfford calculator (TSDoc + 100% Unit Tests)
│   │   ├── notifications/   # Expo push device token registration (TSDoc + Unit Tests)
│   │   ├── file-notes/      # Notes, comments, attachments (TSDoc + Unit Tests)
│   │   └── geo/             # Photon OSM location autocomplete (TSDoc + Unit Tests)
│   ├── core/          # DB client, logger, auth session resolver, hooks (TSDoc + 100% Unit Tests)
│   ├── config/        # Zod env schemas, app registry, feature flags (TSDoc + 100% Unit Tests)
│   ├── db/            # Drizzle schema + base mixins (TSDoc + 100% Unit Tests)
│   ├── i18n/          # Centralized dictionary & type-safe t() helper (TSDoc + 100% Unit Tests)
│   ├── types/         # Zod domain schemas, commands, status state machine (TSDoc + 100% Unit Tests)
│   └── ui/            # Design tokens & UI components (TSDoc + 100% Unit Tests)
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
├── income_sources (name, amount, receivingAccountId, rrule, startDate, endDate)
│   └── income_events (expectedDate, expectedAmount, actualAmount, status: UPCOMING|PAID)
├── expense_sources (name, amount, categoryId, rrule, startDate, endDate)
│   └── expense_events (expectedDate, expectedAmount, actualAmount, status: UPCOMING|PAID)
├── categories (name, type: REGULAR|GOAL|EVERYDAY, bankAccountId, rolloverRule: ROLLOVER|SWEEP|RESET, isDefaultSavings, everydayTargetKeepAmount, everydaySweepFrequency)
│   ├── category_schedules (targetAmount, targetDate, dueDate) [GOAL only]
│   └── transaction_ledger (flowType: DEBIT|CREDIT, amount, source: MANUAL|IMPORT, recordedAt, note)
└── file_notes (entityType: CATEGORY|TRANSACTION, comment, fileKey, fileName, mimeType)
```

---

## 5. Allocation, Burst & Reconciliation Engines

### 5.1 5-Step Waterfall Cascade Engine
1. **`DEFICIT REPAIR` (Step 0)**: Mandatory first priority. Any category (`EVERYDAY`, `REGULAR`, or `GOAL`) with a negative ledger balance (`currentBalance < 0`) is allocated funds to restore balance to $0.
2. **`REGULAR` (Bills)**: Prorates monthly bill targets by paycheck frequency (`monthlyAmount * paycheckFrequencyDays / 30.4375`).
3. **`GOAL` committed (`isCommitted = true`)**: Allocates target monthly contribution to keep on track for `targetDate`.
4. **`EVERYDAY` top-up cap**: Everyday spending is managed as a pooled balance. Calculates required top-up: `TopUp = max(0, TargetEverydayCap - CurrentEverydayBalance)`.
5. **`GOAL` uncommitted / Surplus sweep**: Sweeps remaining residual income beyond the Everyday top-up to uncommitted goals or default excess category (e.g. Mortgage Offset).

### 5.2 12-Month Rolling Burst Engine
- Evaluates `rrule` patterns (`WEEKLY`, `FORTNIGHTLY`, `MONTHLY`, `ANNUALLY`) on creation/update of recurring income or expense sources to auto-generate individual upcoming events up to 12 months in advance.

### 5.3 Bank Reconciliation Engine
- Calculates **Expected Bank Balance** as the sum of current balances of all categories linked to a bank account (`bankAccountId`).
- **Surplus**: Allocates difference as a `CREDIT` transaction into specified category or `defaultSurplusCategoryId` on tenant.
- **Deficit**: Draws down difference as `DEBIT` transactions from categories in reverse priority order (`EVERYDAY` -> `GOAL` -> `REGULAR`) or via user drawdown override.

---

## 6. Capability UI Exposure Matrix

| Capability | Web UI (`apps/web`) | Mobile UI (`apps/mobile`) | Test & Doc Status |
| :--- | :--- | :--- | :--- |
| `@money-matters/capability-tenant` | Bank Reconciliation, `/dashboard/settings/bank-accounts` (CRUD, purpose linking) | `home.tsx` Bank Reconciliation modal (target category picker), `/settings/bank-accounts` (`BankAccountFormModal` CRUD) | 100% Tested & Documented |
| `@money-matters/capability-budgeting` | `/dashboard/categories` (Health/Type filters, sort, CRUD), `MoveMoneyModal`, `PaydayPreviewModal` | `/(app)/categories` (`MobileFilterBar`, sort, health stat chips, `CategoryFormModal` CRUD), `MoveMoneyModal`, `PaydayPreviewWizard` | 100% Tested & Documented |
| `@money-matters/capability-transactions` | Main Dashboard Quick Actions (CanAfford), `/dashboard/transactions` (Search, Filters, Sort, CSV export) | `home.tsx` Quick Actions (`user_preferences` collapse sync, CanAfford), `/(app)/transactions` (`MobileFilterBar`, Sort, Native CSV Share, Category hyperlinks) | 100% Tested & Documented |
| `@money-matters/capability-file-notes` | `FileNotesSection` in `CategoryDetailDrawer` | `FileNotesSection` in `categories/[id]` | 100% Tested & Documented |
| `@money-matters/capability-notifications` | Push token API ready | `registerToken` called on auth in `sign-in.tsx` | 100% Tested & Documented |
| `@money-matters/capability-geo` | Location search ready | Location search ready | 100% Tested & Documented |

---

## 7. Internationalization (i18n) & Automated Key Verification

- **Centralized Locale Dictionaries**: All user-facing strings across `apps/web`, `apps/mobile`, and `packages/ui` MUST be externalized into `@money-matters/i18n` (`packages/i18n/src/dictionaries/en.ts`).
- **Key Naming Strategy**: Enforce strict nested camelCase paths following `[domain].[feature].[element]` (e.g., `categories.nameLabel`, `common.searchPlaceholder`, `auth.signInCta`).
- **Type-Safe `t()` Resolver**: Single source of truth translation helper `t(key, params)` supporting parameter interpolation (`{name}`, `{rate}`) and default fallbacks.
- **Automated i18n Verification Lint Check**:
  - `packages/i18n/src/check-i18n.ts` scans all `.tsx` and `.ts` source files across `apps/web`, `apps/mobile`, and `packages/ui`.
  - Verifies that every `t("key")` call references a valid, existing key path in `en.ts`.
  - Integrated into `pnpm lint` and Turbo workspace CI pipelines to prevent un-extracted string literals and invalid translation keys from entering production.

