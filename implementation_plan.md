# Money Matters — Master Implementation Plan

> **Generated:** 2026-08-01  
> **Status:** Active & Canonical Implementation Plan.  
> **Supersedes and replaces:** `mvp_readiness_report.md`, `market_analysis_and_recommendations_results.md`, and `implementation_plan_v2.md`.  
> **Synchronized with:** `TECHNICAL_SPEC.md`, `FUNCTIONAL_SPEC.md`, `V2_SCOPE.md`, `interactive_onboarding_prompt.md`, and `ui_design_google_stitch`.

---

## Executive Overview

This document provides a single, 100% complete implementation plan for Money Matters. All architectural decisions, security requirements, database schema migrations, capability additions, onboarding workflows, UI design updates, and post-launch roadmap items are consolidated here.

---

## Phase 1: Infrastructure, Security & Database Baseline

### 1.1 Credential Rotation & Repository Sanitization
- **Risk**: Live production secrets (Neon DB, Inngest, Resend, Cloudflare R2) were previously committed to `.env`. `.env` is now in `.gitignore`.
- **Tasks**:
  1. Rotate production credentials in Neon, Inngest, Resend, and Cloudflare R2 dashboards.
  2. Run `git filter-repo --path .env --invert-paths` to purge `.env` from all git history.
  3. Force push cleaned history (`git push origin --force --all`).
  4. Confirm `.env.example` contains placeholders only.

### 1.2 `tenant_users` Database Migration (`0008_add_tenant_users_invite_columns.sql`)
- **Issue**: Missing `invite_email`, `invite_token`, `invite_status`, and `invited_at` columns in production database for partner invitation capability.
- **Tasks**:
  1. Resolve migration journal discrepancies in `packages/db/drizzle/meta/_journal.json`.
  2. Create migration file `packages/db/drizzle/0008_add_tenant_users_invite_columns.sql`:
     ```sql
     ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "invite_email" varchar(255);
     ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "invite_token" uuid;
     ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "invite_status" "invite_status_enum" NOT NULL DEFAULT 'ACCEPTED';
     ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "invited_at" timestamptz;
     ```
  3. Execute migration: `pnpm --filter @money-matters/db db:migrate`.

### 1.3 Deployment Configuration & CI/CD Pipeline
- **Production Target**: Cloudflare Workers (`apps/web` on `moneymatters.kaesava.au` via `@opennextjs/cloudflare`, `apps/api` Fastify Worker on `api.moneymatters.kaesava.au`).
- **Tasks**:
  1. Delete legacy `render.yaml` file from root repository.
  2. Create `.github/workflows/deploy.yml`:
     - Triggers on push to `main` branch (after `ci.yml` passes).
     - Deploys Fastify API: `pnpm --filter @money-matters/api exec wrangler deploy`.
     - Deploys Next.js Web: `pnpm --filter @money-matters/web exec wrangler deploy`.
  3. Verify `apps/web/src/middleware.ts` session cookie detection (`__Secure-better-auth.session_token`, `better-auth.session_token`, `session_token`) and route matching (`/dashboard/*`, `/setup/*`).

---

## Phase 2: Schema & Capability Additions

### 2.1 `user_preferences` App Preferences JSONB Migration (`0009_user_preferences_app_jsonb.sql`)
- **Objective**: Store app-specific UI state (e.g. `quick_actions_collapsed`) inside an `app_preferences` JSONB blob keyed by `appId`.
- **Tasks**:
  1. Create schema file `packages/db/src/schema/user_preference.ts` with `appPreferences: jsonb("app_preferences").notNull().default({})`.
  2. Create migration `packages/db/drizzle/0009_user_preferences_app_jsonb.sql`:
     ```sql
     ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "app_preferences" jsonb NOT NULL DEFAULT '{}';
     UPDATE "user_preferences" SET "app_preferences" = jsonb_build_object('01908bde-34bb-7b19-a178-574211bc93aa', jsonb_build_object('quick_actions_collapsed', quick_actions_collapsed)) WHERE quick_actions_collapsed = true;
     ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "quick_actions_collapsed";
     ```
  3. Define `AppPreferencesBlobSchema` in `packages/types/src/app-preferences.ts`.
  4. Update tRPC procedures in API routers to read/write `appPreferences[appId]`.

### 2.2 App Category Templates & Tenant Seeding (`app_categories`)
- **Objective**: Support centralized template categories (`app_categories`) copied to `categories` when new tenants sign up.
- **Tasks**:
  1. Create schema `packages/db/src/schema/app_category.ts` (app-level template table with `annualisedAmount`).
  2. Create migration `packages/db/drizzle/0010_add_app_categories.sql`.
  3. Seed `app_categories` with Australian family presets + default Everyday category (`packages/db/src/seed/app-categories.seed.ts`).
  4. Update `createTenantHandler` in `packages/capabilities/tenant/src/index.ts` to clone `app_categories` rows into `categories` for the new `tenantId`.

### 2.3 Bank Statement CSV Import Capability (`@money-matters/capability-import`)
- **Objective**: Enable monthly statement import for major Australian banks to eliminate manual entry fatigue.
- **Tasks**:
  1. Create capability package `packages/capabilities/import/` (or slice in `packages/capabilities/transactions/`).
  2. Implement CSV parsers for **CBA**, **Westpac**, **ANZ**, **NAB**, **ING**, and **Macquarie**.
  3. Implement rule-based description pattern matching for category auto-assignment.
  4. Implement transaction deduplication via hash (`date + amount + description`).
  5. Web UI: Drag-and-drop upload modal on Bank Accounts / Transactions page with preview and bulk confirm.
  6. Mobile UI: Native file picker + transaction confirmation list.

---

## Phase 3: Interactive Onboarding Engine (`interactive_onboarding_prompt.md`)

- **Objective**: Build a 60-second interactive quiz onboarding experience leveraging 2025/2026 ABS and RACQ cost-of-living benchmarks.

### 3.1 Step 1: The Income Engine
- Inputs: Take-home pay amount ($), pay frequency (Weekly / Fortnightly / Monthly), income type (Salary, Business, Benefit).
- Feature: Optional `+ Add partner income or side-hustle` secondary income stream.

### 3.2 Step 2: The Life-Builder Questionnaire
- **Housing**: Own (Mortgage) | Own (Outright) | Rent (Solo/Family) | Rent (Share).
- **Transport**: Vehicle selection (Count: 1, 2, 3+; Size: Small/Hatch, Mid/SUV, Luxury), Public transport, Rideshare.
- **Family**: Children count, stage (Childcare, Primary, Secondary), school type (Public, Catholic, Private).
- **Health**: Private Health Insurance toggle, Gym/Fitness toggle, medical out-of-pocket.
- **Debt & Pets**: Minimum active debt repayment ($), Pet count.
- **Obligations**: Charity donations, family support amount ($).
- **Everyday Spend Sliders**: Weekly spend sliders for Groceries ($270 default), Dining ($240 default), Personal ($100 default) + dynamic incidental calculation `M`.

### 3.3 Step 3: Estimation Engine & Confirmation
- Converts all user inputs into normalized **Monthly** targets using ABS/RACQ formulas.
- Groups calculated targets into `REGULAR` bills, `GOAL` sinking funds, and single `EVERYDAY` pool.
- Displays editable confirmation screen before generating tenant categories and schedules.

---

## Phase 4: UI System Overhaul & Refactoring (Serene Finance)

### 4.1 Serene Finance Tokens & Design System
- Integrate design system tokens from `ui_design_google_stitch/`:
  - Colors: Serene Blue (`#2563eb`), Surface Bright (`#ffffff`), Surface Dim (`#d9d9e5`), Growth Green (`#22c55e`), Burn Red (`#ba1a1a`).
  - Typography: Inter for UI body text; `JetBrains Mono` (`financial-metric`, `tabular-nums`) for all monetary values.
  - Web Layout: Fixed `SideNavBar` + frosted `TopNavBar` + spacious table rows.
  - Mobile Layout: Top header `TopAppBar` + bottom tab bar `BottomNavBar`.

### 4.2 Component Refactoring & Code Quality
- **`paychecks.tsx` Refactor**: Split `apps/mobile/src/app/(app)/paychecks.tsx` (~500 lines) into `src/components/paychecks/`:
  - `UpcomingEventsList.tsx`
  - `SourcesBillsList.tsx`
  - `IncomeSourceCard.tsx`
  - `ExpenseBillCard.tsx`
- **Type Safety**: Replace `item: any` in `apps/mobile/src/app/(app)/transactions.tsx` with inferred `TransactionRow` type.
- **i18n Check**: Run `pnpm lint` (`check-i18n`) to verify 100% of user-facing strings are externalized in `@money-matters/i18n`.

### 4.3 Quick Wins & Micro-UX Polish
1. Default Quick Actions section to collapsed.
2. Auto-select "Everyday" category in Quick Expense modal.
3. Display "days until next payday" on Hero Card.
4. Pre-fill current date in date pickers.
5. Prefix currency input fields with `$`.
6. Category color dots alongside transaction entries.
7. Undo toast notification after transaction entry.

---

## Phase 5: Post-Launch Roadmap (Release 1.1 / Release 2)

- **5.1 Spending Velocity & Trend Insights**: Month-over-month category trend charts + pace warnings if Everyday spend rate exhausts funds early.
- **5.2 First-Paycheck Guided Walkthrough**: Contextual step-by-step onboarding overlay on first payday event.
- **5.3 One-Tap Bank Reconciliation**: Simplified balance confirmation ("Bank says $12,450 — confirm?") with auto-adjustment to Everyday pool.
- **5.4 Milestone Celebrations**: Toast notifications when goal categories cross 25%, 50%, 75%, and 100% funding targets.

---

## Execution Phasing Summary

```
Phase 1 (Immediate Security & Infra):
  1.1 Rotate credentials & scrub git history
  1.2 Run tenant_users migration (0008)
  1.3 Remove render.yaml & add Cloudflare deploy.yml workflow

Phase 2 (Schema & Capabilities):
  2.1 Run user_preferences JSONB migration (0009)
  2.2 Run app_categories migration (0010) & seed templates
  2.3 Build Bank CSV Import capability (CBA, Westpac, ANZ, NAB, ING, Macquarie)

Phase 3 (Interactive Onboarding):
  3.1 Build Income Engine (Step 1)
  3.2 Build Life-Builder Quiz (Step 2)
  3.3 Build ABS Estimation Engine & Monthly Confirmation (Step 3)

Phase 4 (UI Redesign & Refactoring):
  4.1 Apply Serene Finance design system & JetBrains Mono metrics
  4.2 Refactor paychecks.tsx & fix transactions.tsx type warnings
  4.3 Apply Micro-UX quick wins & run i18n audit

Phase 5 (Post-Launch - Release 1.1):
  5.1 Spending velocity & monthly insights
  5.2 First-paycheck walkthrough
  5.3 One-tap reconciliation
  5.4 Milestone celebrations
```
