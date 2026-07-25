# TECHNICAL_SPEC.md — money-matters

> **Last updated:** 2026-07-25  
> **Status:** Overhaul & Feature Parity Complete. 100% Documentation (TSDoc) and 100% Unit Test Coverage across all monorepo layers (`packages/*` and `apps/*`).

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
| Mobile styling | NativeWind / StyleSheet | 4.0.36 | Configured |
| Async workflows | Inngest | ^3.19.14 | 6 Scheduled Notification Triggers Wired |
| Push notifications | Expo Push Notifications | via expo-notifications | Wired |
| Email service | Resend | via @money-matters/capability-notifications | Wired |
| Testing | Vitest | ^4.1.10 | 100% test suite execution |
| Linting | ESLint | ^9 | Configured |

---

## 2. Monorepo Topology & Capabilities

```
money-matters/
├── apps/
│   ├── api/           # Fastify server — bootstrap + route wiring (TSDoc + 100% Unit Tests)
│   ├── mobile/        # Expo React Native — 2-step setup, Hero card dashboard (<250 lines)
│   └── web/           # Next.js Web UI App Router — 2-step setup, Hero card dashboard (<250 lines)
├── packages/
│   ├── capabilities/
│   │   ├── tenant/          # Household creation, partner invite (invitePartner/acceptInvite), bank account CRUD
│   │   ├── budgeting/       # V2 3-bucket waterfall & burst engine (TSDoc + 100% Unit Tests)
│   │   ├── transactions/    # Daily ledger & canAfford calculator (TSDoc + 100% Unit Tests)
│   │   ├── notifications/   # Expo push + 6 scheduled notification functions (payday, bill, overdue, digest, goal, velocity)
│   │   └── file-notes/      # Notes, comments, attachments (TSDoc + Unit Tests)
│   ├── core/          # DB client, logger, auth session resolver, hooks (TSDoc + 100% Unit Tests)
│   ├── config/        # Zod env schemas, app registry, feature flags (TSDoc + 100% Unit Tests)
│   ├── db/            # Drizzle schema + base mixins (TSDoc + 100% Unit Tests)
│   ├── i18n/          # Centralized dictionary & type-safe t() helper (TSDoc + 100% Unit Tests)
│   ├── types/         # Zod domain schemas, setup presets (AUSTRALIAN_FAMILY_PRESETS), status state machine
│   └── ui/            # Design tokens & UI components (CollapsibleSection for web & mobile)
```

---

## 3. Multi-Tenancy & Platform Architecture

- **`tenantId` = `householdId`** — root isolation boundary for all data.
- **`appId`** = product/app shell identifier resolved server-side.
- **Partner Invitation MVP**: Household owners send secure partner invites (`invitePartner`). Invited partner accepts (`acceptInvite`) to share full read/write access to the tenant household.
- **Single Canonical Everyday Category**: Exactly 1 `EVERYDAY` category seeded per tenant; locked at API & UI layers.
- **User Preference Storage**: `user_preferences` table persists UI collapse states and notification alert toggles per user and tenant.
- PostgreSQL RLS policies enforce `tenantId` + `appId` at the DB layer.
- **Strict IoC**: Capabilities export standalone commands, queries, and handlers without direct cross-capability imports.

---

## 4. Canonical Data Model

### 4.1 Entity Relationship

```
households (tenant)
├── tenant_users (userId, role: OWNER|MEMBER, inviteEmail, inviteToken, inviteStatus: PENDING|ACCEPTED|REVOKED)
├── bank_accounts (lastKnownBalance, purpose: INCOME_LANDING|SAVINGS|EVERYDAY, isOffset)
├── user_preferences (quickActionsCollapsed, paydayAlertsEnabled, billRemindersEnabled, weeklyDigestEnabled, etc.)
├── income_sources (name, amount, receivingAccountId, rrule, startDate, endDate)
│   └── income_events (expectedDate, expectedAmount, actualAmount, status: UPCOMING|PAID)
├── expense_sources (name, amount, categoryId, rrule, startDate, endDate)
│   └── expense_events (expectedDate, expectedAmount, actualAmount, status: UPCOMING|PAID)
├── categories (name, type: REGULAR|GOAL|EVERYDAY, bankAccountId, rolloverRule: ROLLOVER|SWEEP|RESET, isDefaultSavings)
│   ├── category_schedules (targetAmount, targetDate, dueDate)
│   └── transaction_ledger (flowType: DEBIT|CREDIT, source: MANUAL|IMPORT, recordedAt, note)
└── file_notes (entityType: CATEGORY|TRANSACTION, comment, fileKey, fileName, mimeType)
```

---

## 5. Engines & Notification Services

### 5.1 5-Step Waterfall Cascade Engine
1. **`DEFICIT REPAIR` (Step 0)**: Mandatory first priority restoring negative category balances (`currentBalance < 0`) to $0.
2. **`REGULAR` (Bills)**: Prorates monthly bill targets by paycheck frequency.
3. **`GOAL` committed**: Allocates target monthly contribution.
4. **`EVERYDAY` top-up cap**: Top-up pooled Everyday balance to target cap.
5. **`GOAL` uncommitted / Surplus sweep**: Sweeps residual income to default excess category.

### 5.2 Smart Scheduled Notification Triggers (Inngest)
1. **`notify-payday-incoming`**: Daily 6pm AEST check for upcoming payday tomorrow.
2. **`notify-bill-due-soon`**: Daily 9am AEST check for bills due in 3 days with category funding status (`Funded ✓` vs `Short by $X ⚠️`).
3. **`notify-bill-overdue`**: Daily 10am AEST check for overdue bills.
4. **`notify-weekly-digest`**: Sunday 7pm AEST summary of spent amount & category health status.
5. **`notify-goal-milestone`**: Triggered on transaction/allocation crossing 25%, 50%, 75%, or 100% goal completion.
6. **`notify-spending-velocity`**: Daily spending pace alert comparing 7-day spend rate against days until payday.

---

## 6. Onboarding & Dashboard Experience

- **2-Step Instant Value Onboarding**:
  - Step 1: "How much do you get paid?" (Name, Amount, Frequency)
  - Step 2: "Which bills do you have?" (Australian Family presets checklist + inline amounts)
- **Dashboard Information Hierarchy**:
  - Hero Card (`DashboardHeroCard`): Prominent Everyday balance, overall status, and next payday.
  - Attention Items (`AttentionItemsList`): Overdue and upcoming bills due within 3 days.
  - Collapsible Sections (`CollapsibleSection`): Quick Actions, All Upcoming, Category Health.
- **Strict File Size Limit**: All component and page files maintained <250 lines per AGENTS.md §22.
