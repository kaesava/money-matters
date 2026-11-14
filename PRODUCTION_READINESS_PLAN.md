# Production Readiness Plan: Money Matters (Web + Mobile)

**Audit Type:** Strictly Static Pre-Launch Architecture, Security, Parity, MECE, i18n & Testing Audit  
**Repository:** `/home/kaesava/projects/money-matters`  
**Audit Date:** 2026-11-14  

---

## 1. Assumptions and Scope

1. **Strictly Static Audit Constraint:** Per audit rules, zero shell commands (`pnpm`, `vitest`, `playwright`, `tsc`, `eslint`, `git`, network, or DB queries) were executed. All findings are derived from static source inspection of code, schemas, SQL migrations, configs, and CI workflows. Where runtime/build/test outcomes are inferred statically, items are explicitly labeled `Static inference` (versus `Confirmed` for direct code/config defects).
2. **`AGENTS.md` Authority & Dual Section Citation:** Current `AGENTS.md` (81 lines) consolidates monorepo invariants into Sections `§1`–`§7`, whereas `_BAK_AGENTS.md` (297 lines at repo root) contains the historical 27-section numbering (`§1`–`§27`) referenced by the audit prompt ("every section, 1 to 26"). Every plan item cites **both** `AGENTS.md §1–§7` and `_BAK_AGENTS.md §1–§27` so both numbering schemes are satisfied unambiguously, and `_BAK_AGENTS.md` itself is flagged for removal as a stale root file.
3. **V2 Scope & Internal Contradiction Resolution (`bug-reports` and `file-notes`):** `V2_SCOPE.md` lines 158–207 state that `bug-reports` and `file-notes` were pruned from V1, but `AGENTS.md §2–§3` (the highest-authority source of truth), `SCHEMA_DATA_DICTIONARY.md`, `TECHNICAL_SPEC.md`, and `V2_SCOPE.md` line 459 explicitly include both in active R1 architecture (`packages/capabilities/file-notes`, `packages/capabilities/bug-reports`, `file_notes` table, `trpc.submitFeedback`). Conservative interpretation: treat both as active R1 capabilities governed by `AGENTS.md`, audit their security/build/typecheck defects, and flag the contradictory text in `V2_SCOPE.md` as documentation drift. All other items in `V2_SCOPE.md` (automated bank feeds/Basiq, recurring transfers, AI document extraction, custom dashboard layout, push notification delivery, multi-locale runtime i18n / `ja.ts`, health warning snooze, mid-life re-setup wizard, non-digest scheduled alerts) are treated as out of scope unless V2 code has leaked into R1 as dead code.
4. **Secrets Hygiene:** No `.env*`, `.dev.vars*`, `seed_credentials.local.md`, or `.aider*` files were opened or read. Their existence and git-tracking status were verified solely via `.gitignore` and `.git` metadata.
5. **Conservative Ambiguity Resolution:** Wherever a capability or procedure lacks explicit ownership/tenant/privacy predicates in application code, we do **not** assume PostgreSQL RLS alone prevents exploitation—both because non-private procedures (`tenantProcedure`) omit `app.current_user_id` and because several tables (`file_notes`, `user_preferences`, `bug_reports`) lack `FORCE ROW LEVEL SECURITY` or stealth privacy policies in SQL migrations.

---

## 2. Plan Items by Tier

### 2.1 Tier P0 — Launch Blockers
*(Must be resolved before production launch: tenant/partner isolation bypasses, auth/privacy leaks, `pnpm validate` static build/typecheck/schema-audit blockers, and banned hard deletes.)*

#### [x] COMPLETED `SEC-01` — `file_notes` Cross-Tenant & Cross-Partner Stealth Privacy Bypass, Missing `FORCE ROW LEVEL SECURITY`, and Banned Hard Delete
- **Title:** Enforce parent entity ownership, stealth privacy (`isPrivate`), soft-delete only, and `FORCE ROW LEVEL SECURITY` on `file_notes`
- **Evidence:**
  - `packages/capabilities/file-notes/src/handlers/index.ts:59-174` (`createPreSignedUrlHandler`, `createFileNoteHandler` never verify that `input.entityId` belongs to `ctx.tenantId` or is visible to `ctx.userId`).
  - `packages/capabilities/file-notes/src/handlers/index.ts:176-229` (`listFileNotesHandler` filters only `eq(fileNotes.tenantId, ctx.tenantId)` without `(isPrivate = false OR userId = ctx.userId)`).
  - `packages/capabilities/file-notes/src/handlers/index.ts:231-248` (`getDownloadUrlHandler` checks only `eq(fileNotes.id, input.noteId)` and `eq(fileNotes.tenantId, ctx.tenantId)`, allowing any household member to generate an R2 download URL for a partner's `isPrivate = true` attachment).
  - `packages/capabilities/file-notes/src/handlers/index.ts:322-343` (`purgeFileNoteHandler` executes `await db.delete(fileNotes).where(...)`, a banned hard delete).
  - `packages/db/drizzle/0051_add_app_feature_flags_and_file_notes.sql:33-44` (`ALTER TABLE "file_notes" ENABLE ROW LEVEL SECURITY;` without `FORCE ROW LEVEL SECURITY` or `GRANT SELECT, INSERT, UPDATE, DELETE ON file_notes TO mm_app;`).
- **Rule violated:** `AGENTS.md §1 (Priority 1 & 2: Tenant isolation & stealth privacy)`, `AGENTS.md §3 (Stealth Privacy RLS; Hard deletes on operational entities are strictly banned)`, `_BAK_AGENTS.md §5, §6, §9`.
- **Impact / Risk:**
  1. **Exploit Scenario 1 (Cross-Partner Stealth Privacy Leak):** Partner B calls `fileNotes.listFileNotes` or `fileNotes.getDownloadUrl({ noteId })` in a shared household. When the API connects as table owner (`neondb_owner`) on `file_notes` (which lacks `FORCE ROW LEVEL SECURITY`), Partner B retrieves presigned R2 download URLs for Partner A's private bank statement or private envelope receipts (`isPrivate = true`).
  2. **Exploit Scenario 2 (Orphan / Cross-Entity Attachment Injection):** An authenticated user passes an arbitrary UUID as `entityId` to `createPreSignedUrl` / `createFileNote`; the handler never verifies that the parent `BANK_ACCOUNT`, `ENVELOPE`, `INCOME_SOURCE`, `EXPENSE_EVENT`, or `TRANSACTION` exists in `ctx.tenantId` or is accessible to `ctx.userId`.
  3. **Audit Trail Destruction:** `purgeFileNoteHandler` permanently deletes the row from `file_notes` instead of soft-archiving via `archivedAt` / `archivedBy`.
- **Fix:**
  1. Add a new deterministic migration `0058_harden_rls_and_stealth_privacy.sql` executing `ALTER TABLE "file_notes" FORCE ROW LEVEL SECURITY;` and `GRANT SELECT, INSERT, UPDATE, DELETE ON "file_notes" TO mm_app;`.
  2. In `packages/capabilities/file-notes/src/handlers/index.ts`, add `verifyParentEntityAccess(db, ctx, entityType, entityId)` that queries the target table (`bankAccounts`, `envelopes`, `incomeSources`, `expenseEvents`, `transactionLedger`) scoped by `tenantId`, `isNull(archivedAt)`, and `(isPrivate = false OR userId = ctx.userId)`, throwing `TRPCError({ code: 'NOT_FOUND' })` if missing, and inheriting `isPrivate = true` whenever the parent entity is private.
  3. Add `or(eq(fileNotes.isPrivate, false), eq(fileNotes.userId, ctx.userId))` to `listFileNotesHandler`, `getDownloadUrlHandler`, `updateFileNoteCommentHandler`, and `archiveFileNoteHandler`.
  4. Remove `purgeFileNote` procedure (`apps/api/src/routers/file-notes.router.ts:95-103`) or convert `purgeFileNoteHandler` to soft-delete (`set({ archivedAt: new Date(), archivedBy: ctx.userId, updatedAt: new Date(), updatedBy: ctx.userId })`) while scheduling R2 object deletion only upon tenant erasure.
- **Platforms:** `API`, `Packages`
- **Tests to add or update:** `packages/capabilities/file-notes/src/handlers/index.test.ts` (new): test cross-tenant `entityId` rejection, cross-partner `isPrivate = true` rejection on `listFileNotes` and `getDownloadUrl`, parent privacy inheritance, and soft-delete archival.
- **Effort:** `M`
- **Dependencies:** None
- **Confidence:** `Confirmed`

---

#### [x] COMPLETED `SEC-02` — `exportMyData` (`tenantProcedure`) Leaks Partner's Private Records or Drops Caller's Private Records
- **Title:** Switch `exportMyData` to `privateTenantProcedure` and enforce explicit stealth-privacy predicates across all exported tables
- **Evidence:**
  - `apps/api/src/routers/tenant/tenant-core.procedures.ts:138-145` (`exportMyData: tenantProcedure.mutation(...)`).
  - `packages/capabilities/tenant/src/export-data.ts:36-151` (`exportDataHandler` queries `bankAccounts`, `envelopes`, `incomeSources`, `incomeEvents`, `expenseEvents`, `allocationPlans`, `allocationPlanLines`, `transactionLedger`, and `fileNotes` using only `eq(table.tenantId, tenantId)` without `userId` or `isPrivate` filtering).
- **Rule violated:** `AGENTS.md §1 (Priority 1 & 2)`, `AGENTS.md §3 (Stealth Privacy RLS: Use privateTenantProcedure on all sensitive routes)`, `_BAK_AGENTS.md §6, §25`.
- **Impact / Risk:**
  1. **Exploit Scenario (Partner Privacy Breach):** `tenantProcedure` sets `app.current_tenant_id` but does **not** set `app.current_user_id`. On tables without `FORCE ROW LEVEL SECURITY` (`file_notes`) or when running against a non-forced DB role, Partner B clicking "Export My Data" downloads a ZIP containing Partner A's `isPrivate = true` file notes, private bank accounts, private envelopes, private income sources, and private transactions.
  2. **Broken Export Under Forced RLS:** On tables with `FORCE ROW LEVEL SECURITY` (`0047_bulletproof_stealth_privacy_rls.sql`), `NULLIF(current_setting('app.current_user_id', true), '')` evaluates to `NULL`, so `user_id = NULL` is false—meaning the caller's **own** private accounts, private envelopes, and private transactions are silently excluded from their own backup ZIP!
- **Fix:**
  1. Change `exportMyData` in `apps/api/src/routers/tenant/tenant-core.procedures.ts:138` from `tenantProcedure` to `privateTenantProcedure` and pass `ctx.userId` into `exportDataHandler(ctx.db, ctx.tenantId, ctx.userId)`.
  2. In `packages/capabilities/tenant/src/export-data.ts`, add explicit `or(eq(table.isPrivate, false), eq(table.userId, userId))` filters on `bankAccounts`, `envelopes`, `incomeSources`, `transactionLedger`, and `fileNotes`, and filter `incomeEvents`, `expenseEvents`, `allocationPlans`, and `allocationPlanLines` to exclude rows tied to another member's private sources/envelopes.
- **Platforms:** `API`, `Packages`
- **Tests to add or update:** `packages/capabilities/tenant/src/export-data.test.ts` (new): verify Caller A exports shared + Caller A's private records, and zero of Partner B's `isPrivate = true` records across all 9 CSV files.
- **Effort:** `M`
- **Dependencies:** `SEC-01`
- **Confidence:** `Confirmed`

---

#### [x] COMPLETED `SEC-03` — Missing Stealth Privacy RLS & Session Variable Injection on `allocation_strategies`, `user_preferences`, and `bug_reports`
- **Title:** Add stealth-privacy RLS policy to `allocation_strategies`, enforce `FORCE ROW LEVEL SECURITY` on all remaining tables, and fix procedure types in `profile.procedures.ts`
- **Evidence:**
  - `packages/db/drizzle/0049_allocation_strategies_personal_scope.sql:1-15` (adds `user_id` and `is_private` to `allocation_strategies` for personal payday rules, but adds **zero** `stealth_privacy_isolation` RLS policy).
  - `packages/db/drizzle/0039_fix_user_preferences_rls.sql:1-18` (`user_preferences_user_isolation` requires `user_id = current_setting('app.current_user_id', true)::uuid`, without `FORCE ROW LEVEL SECURITY`).
  - `apps/api/src/routers/tenant/profile.procedures.ts:9,83,193` (`getUserPreferences` and `updateUserPreferences` use `tenantProcedure` which only sets `app.current_tenant_id`, NOT `app.current_user_id`; `updateProfile` uses `authenticatedProcedure` which sets neither!).
  - `packages/db/drizzle/0021_add_bug_reports.sql:18-24` (`bug_reports` lacks `FORCE ROW LEVEL SECURITY` and `GRANT ... TO mm_app`).
- **Rule violated:** `AGENTS.md §1, §3 (Stealth Privacy RLS)`, `_BAK_AGENTS.md §5, §6`.
- **Impact / Risk:**
  1. **Exploit Scenario (Personal Payday Strategy Leak / Tampering):** Because `allocation_strategies` only has a `tenant_isolation` policy (`0046`), any household member can read or overwrite another partner's personal (`isPrivate = true`) allocation strategy at the DB layer.
  2. **Broken Profile & Preferences Under `mm_app` Role:** Under the non-owner `mm_app` PostgreSQL role (`0044`), `getUserPreferences` and `updateUserPreferences` fail to match `user_preferences_user_isolation` because `tenantProcedure` never sets `app.current_user_id`.
- **Fix:**
  1. In migration `0058_harden_rls_and_stealth_privacy.sql`, add a RESTRICTIVE `stealth_privacy_isolation` policy on `allocation_strategies` (`is_private = false OR user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid`), and add `FORCE ROW LEVEL SECURITY` + `GRANT SELECT, INSERT, UPDATE, DELETE ... TO mm_app` on `allocation_strategies`, `user_preferences`, `bug_reports`, and `file_notes`.
  2. In `apps/api/src/routers/tenant/profile.procedures.ts:9,83`, change `getUserPreferences` and `updateUserPreferences` from `tenantProcedure` to `privateTenantProcedure` (which injects both `app.current_tenant_id` and `app.current_user_id`).
- **Platforms:** `API`, `Packages`
- **Tests to add or update:** `apps/api/src/routers/tenant/profile.procedures.test.ts` (new) and `packages/capabilities/budgeting/src/commands/allocation-strategy.test.ts` (verify personal strategy isolation between two household user IDs).
- **Effort:** `M`
- **Dependencies:** None
- **Confidence:** `Confirmed`

---

#### [x] COMPLETED `SEC-04` — Sensitive Procedures Using `tenantProcedure` Instead of `privateTenantProcedure`
- **Title:** Upgrade `getAllocationHistory`, `leaveHousehold`, `getHouseholdDetails`, and `removeHouseholdMember` to `privateTenantProcedure`
- **Evidence:**
  - `apps/api/src/routers/payday/payday-execution.procedures.ts:127-241` (`getAllocationHistory` uses `tenantProcedure` while querying `allocationPlans`, `allocationPlanLines`, `incomeEvents`, `incomeSources`, `bankAccounts`, and `envelopes`!).
  - `apps/api/src/routers/tenant/household.procedures.ts:148,196,241` (`removeHouseholdMember`, `leaveHousehold`, and `getHouseholdDetails` use `tenantProcedure` while querying/updating `bankAccounts`, `envelopes`, and `incomeSources`).
- **Rule violated:** `AGENTS.md §3 (Stealth Privacy RLS: Use privateTenantProcedure on all sensitive routes: bank_accounts, envelopes, transaction_ledger, income_sources, expense_events, file_notes)`, `_BAK_AGENTS.md §6`.
- **Impact / Risk:**
  1. **Exploit Scenario / Silent Data Loss:** In `getAllocationHistory` (`payday-execution.procedures.ts:127`), because `tenantProcedure` does not set `app.current_user_id`, either: (a) under table owner without forced RLS, Partner B sees Partner A's private payday allocations, or (b) under forced RLS (`0047`), the user's own private bank accounts, private envelopes, and private income sources are filtered out by PostgreSQL RLS (`current_user_id` is empty), causing `getAllocationHistory` to return broken/incomplete allocation history with missing account and envelope names!
  2. In `leaveHousehold` / `removeHouseholdMember`, resetting contribution modes or reassigning records touches `incomeSources` / `envelopes` without `app.current_user_id` set in the transaction.
- **Fix:**
  1. Change `getAllocationHistory` in `apps/api/src/routers/payday/payday-execution.procedures.ts:127` to `privateTenantProcedure` and add explicit `or(eq(incomeSources.isPrivate, false), eq(incomeSources.userId, ctx.userId))` filtering on the returned plans.
  2. Change `getHouseholdDetails`, `removeHouseholdMember`, and `leaveHousehold` in `apps/api/src/routers/tenant/household.procedures.ts:148,196,241` to `privateTenantProcedure`.
- **Platforms:** `API`
- **Tests to add or update:** `apps/api/src/routers/payday/payday-execution.procedures.test.ts` (new): verify `getAllocationHistory` injects `app.current_user_id` and hides partner private payday plans while returning caller's own private payday plans.
- **Effort:** `S`
- **Dependencies:** `SEC-03`
- **Confidence:** `Confirmed`

---

#### [x] COMPLETED `DEP-01` — Undeclared Phantom Dependencies Breaking Isolated Package Typecheck (`@money-matters/capability-file-notes`, `@money-matters/ui`, `@money-matters/core`, `apps/mobile`, `apps/web`, `@money-matters/i18n`, `@money-matters/db`)
- **Title:** Declare all missing workspace dependencies and remove root `react-native-web` phantom dependency
- **Evidence:**
  - `packages/capabilities/file-notes/src/mobile/NotesFeedModal.tsx:12-14` imports `expo-document-picker`, `expo-image-picker`, and `@expo/vector-icons`, none of which are in `packages/capabilities/file-notes/package.json`.
  - `packages/ui/src/mobile/notifications/usePushNotifications.ts:3,16,17` imports `expo-constants`, `expo-notifications`, and `expo-device`, none of which are in `packages/ui/package.json`.
  - `packages/core/src/correlation-id.ts:7` and `packages/core/src/correlation-id.test.ts:3` import `fastify`, which is missing from `packages/core/package.json`.
  - `apps/mobile/src/lib/sqlite-cache.ts:9` and `apps/mobile/src/lib/sqlite-cache.test.ts:2` import `zod`, which is missing from `apps/mobile/package.json`.
  - `apps/web/src/app/dashboard/settings/components/SubscriptionSection.tsx:8` imports `@trpc/server` and `apps/web/src/components/landing/EarlyAccessModal.tsx:6` imports `zod`, neither of which is in `apps/web/package.json`.
  - `packages/i18n/src/check-i18n.cjs:4` requires `typescript`, which is missing from `packages/i18n/package.json`.
  - `packages/db/src/apply-migrations.ts:4`, `migrate-enums.ts:2`, `seed.ts:14`, `set-app-flag.ts:2` import `dotenv`, which is only in `devDependencies` of `packages/db/package.json`.
  - `vitest` is imported in test files across 14 workspaces (`apps/api`, `apps/mobile`, `apps/web`, `packages/capabilities/budgeting`, `packages/capabilities/notifications`, `packages/capabilities/simulation`, `packages/capabilities/tenant`, `packages/capabilities/transactions`, `packages/config`, `packages/core`, `packages/db`, `packages/i18n`, `packages/types`, `packages/ui`) but is only listed in root `package.json`.
  - Root `package.json:71-73` declares `"dependencies": { "react-native-web": "^0.21.0" }` at the monorepo root, and `package.json:15` runs unpinned `npx inngest-cli@latest`.
- **Rule violated:** `AGENTS.md §2, §4 (Workspace boundaries, strict type safety & package hygiene)`, `_BAK_AGENTS.md §2 (Zero Phantom Dependencies)`.
- **Impact / Risk:** `pnpm --filter @money-matters/capability-file-notes typecheck` (part of `pnpm typecheck` / `pnpm validate`) fails with `TS2307: Cannot find module 'expo-document-picker' / 'expo-image-picker' / '@expo/vector-icons'` unless pnpm hoisting accidentally exposes them from `apps/mobile`. Strict pnpm isolation or CI cache misses will fail the build.
- **Fix:**
  1. Add `expo-document-picker`, `expo-image-picker`, and `@expo/vector-icons` as optional `peerDependencies` (or move `NotesFeedModal.tsx` / `FileNotesDrawer.tsx` UI components into `@money-matters/ui` or `apps/*`) in `packages/capabilities/file-notes/package.json`.
  2. Delete the dead V2 file `packages/ui/src/mobile/notifications/usePushNotifications.ts` (`DEAD-01`) or declare `expo-constants`, `expo-notifications`, `expo-device` in `packages/ui/package.json`.
  3. Add `fastify` to `packages/core/package.json`, `zod` to `apps/mobile/package.json` and `apps/web/package.json`, `@trpc/server` to `apps/web/package.json`, `typescript` to `packages/i18n/package.json` `devDependencies`, move `dotenv` to `dependencies` in `packages/db/package.json`, add `vitest` to `devDependencies` of all 14 workspaces with tests, and remove `"react-native-web"` from root `package.json`.
- **Platforms:** `Both`, `API`, `Packages`
- **Tests to add or update:** Verified via `pnpm typecheck` across all workspaces after `rm -f apps/mobile/.tsbuildinfo`.
- **Effort:** `S`
- **Dependencies:** None
- **Confidence:** `Static inference`

---

#### [x] COMPLETED `VAL-01` — `SCHEMA_DATA_DICTIONARY.md` Out of Sync with Drizzle Schemas (`pnpm audit:schema` Gate Blocker)
- **Title:** Synchronize `SCHEMA_DATA_DICTIONARY.md` 100% with `packages/db/src/schema/*` and remove dead schema compatibility columns
- **Evidence:**
  - `SCHEMA_DATA_DICTIONARY.md` vs `packages/db/src/schema/*.ts`:
    - **16 tables have duplicate `| id |` rows** in `SCHEMA_DATA_DICTIONARY.md` (`ai_usage`, `allocation_plans`, `allocation_plan_lines`, `allocation_strategies`, `allocation_strategy_steps`, `bank_accounts`, `billing_invoices`, `bug_reports`, `envelopes`, `expense_events`, `income_events`, `income_sources`, `notification_deliveries`, `tenant_users`, `tenant_user_preferences`, `transaction_ledger`).
    - **16 tables omit `archivedBy`** in `SCHEMA_DATA_DICTIONARY.md` despite defining `archivedBy: uuid('archived_by')` in Drizzle.
    - **15 phantom columns** are documented in `SCHEMA_DATA_DICTIONARY.md` that do not exist in Drizzle: `apps.slug`, `apps.isActive`, `billing_invoices.stripeCustomerId`, `billing_invoices.invoiceNumber`, `billing_invoices.periodStart`, `billing_invoices.periodEnd`, `early_access_subscribers.source`, `early_access_subscribers.ipHash`, `expense_events.actualAmount`, `expense_events.paidAt`, `processed_webhooks.eventType`, `tenants.ownerId`, `tenant_users.acceptedAt`, `users.isActive`, `user_preferences.appPreferences`.
    - **37 active Drizzle columns** are missing from `SCHEMA_DATA_DICTIONARY.md`: `apps.description`, `apps.url`, `apps.featureFlags`, `early_access_subscribers.subscribeCount`, `early_access_subscribers.lastSubscribedAt`, `expense_events.name`, `expense_events.amount`, `expense_events.expectedDate`, `expense_events.isManualOverride`, `expense_events.transactionId`, `processed_webhooks.id`, `processed_webhooks.tenantId`, `processed_webhooks.appId`, `processed_webhooks.updatedAt`, `processed_webhooks.updatedBy`, `processed_webhooks.archivedAt`, `processed_webhooks.archivedBy`, `tenants.country`, `tenants.state`, `tenants.postcode`, `tenants.currency`, `tenants.timezone`, `tenants.safetyBufferFloor`, `tenants.stripePriceId`, `tenants.planType`, `tenants.trialStartedAt`, `tenants.trialEndsAt`, `tenants.trialGraceEndsAt`, `tenants.subscriptionEndsAt`, `tenants.nextBillingAt`, `tenants.cancelAtPeriodEnd`, `tenants.deactivatedAt`, `tenants.setupStatus`, `tenants.setupCompletedAt`, `tenant_users.inviteToken`, `tenant_users.inviteExpiresAt`, `users.avatarUrl`, `user_preferences.notificationEmail`, `user_preferences.phoneCountryCode`, `user_preferences.phoneNumber`.
    - **`envelopes` dead compatibility alias columns:** `packages/db/src/schema/envelope.ts:44-47` defines duplicate Drizzle properties `goalTargetAmount: integer("target_amount")`, `goalTargetDate: timestamp("target_date")`, `goalMonthlyContribution: integer("monthly_contribution")` mapping to the exact same underlying SQL columns as `targetAmount`, `targetDate`, `monthlyContribution` (lines 41–43).
- **Rule violated:** `AGENTS.md §3 (Schema Sync: Keep SCHEMA_DATA_DICTIONARY.md 100% synchronized with packages/db/src/schema/*; Zero dead tables or inert columns allowed)`, `_BAK_AGENTS.md §3, §5`.
- **Impact / Risk:** Documentation drift misleads engineers on table schemas, and `pnpm audit:schema` (`scripts/audit-schema-usage.mjs`) flags unreferenced compatibility columns.
- **Fix:**
  1. Remove the duplicate Drizzle alias properties `goalTargetAmount`, `goalTargetDate`, and `goalMonthlyContribution` from `packages/db/src/schema/envelope.ts:44-47` (update any remaining callers to use `targetAmount`, `targetDate`, `monthlyContribution`).
  2. Regenerate/update `SCHEMA_DATA_DICTIONARY.md` so every table's column names, SQL types (`varchar` vs `uuid`), nullability, and descriptions match `packages/db/src/schema/*.ts` 1-for-1 with zero duplicate `id` rows, zero phantom columns, and all `archivedBy` columns documented.
  3. Enhance `scripts/audit-schema-usage.mjs` to assert 1-to-1 column parity between `packages/db/src/schema/*.ts` and `SCHEMA_DATA_DICTIONARY.md`.
- **Platforms:** `Packages`
- **Tests to add or update:** `scripts/audit-schema-usage.mjs` (add dictionary column diff check).
- **Effort:** `M`
- **Dependencies:** `VAL-02`
- **Confidence:** `Confirmed`

---

#### [x] COMPLETED `VAL-02` — 8 Database Tables Missing Mandatory Audit Columns & Inconsistent `appId` Column Types
- **Title:** Add missing audit columns (`tenantId`, `appId`, `createdBy`, `updatedBy`, `archivedAt`, `archivedBy`) across 8 tables and standardize `appId` type
- **Evidence:**
  - `packages/db/src/schema/app.ts:4-13` (`apps` missing `tenantId`, `appId`, `createdBy`, `updatedBy`, `archivedAt`, `archivedBy`).
  - `packages/db/src/schema/user.ts:4-14` (`users` missing `tenantId`, `appId`, `createdBy`, `updatedBy`, `archivedAt`, `archivedBy`).
  - `packages/db/src/schema/user_preference.ts:9-23` (`user_preferences` missing `tenantId`, `appId`, `createdBy`, `updatedBy`, `archivedAt`, `archivedBy`).
  - `packages/db/src/schema/early_access.ts:4-15` (`early_access_subscribers` missing `tenantId`, `createdBy`, `updatedBy`, `archivedAt`, `archivedBy`).
  - `packages/db/src/schema/tenant.ts:16-50` (`tenants` missing `tenantId`).
  - `packages/db/src/schema/tenant_user.ts:10-27` (`tenant_users` missing `appId`).
  - `packages/db/src/schema/tenant_user_preference.ts:4-17` (`tenant_user_preferences` missing `createdBy`, `updatedBy`).
  - `packages/db/src/schema/ai_usage.ts:4-16` (`ai_usage` missing `createdBy`, `updatedBy`, `archivedAt`, `archivedBy`).
  - `appId` column type is `varchar("app_id", { length: 50 }).default("money-matters")` on 16 tables, but `uuid("app_id")` on 5 tables (`ai_usage`, `billing_invoices`, `bug_reports`, `early_access_subscribers`, `file_notes`).
- **Rule violated:** `AGENTS.md §3 (Audit Columns & Soft Deletes: Every domain table MUST include id, tenantId, appId, createdAt, createdBy, updatedAt, updatedBy, archivedAt)`, `_BAK_AGENTS.md §5`.
- **Impact / Risk:** Soft-deletes, audit trails, and multi-app scoping cannot be queried uniformly across `tenant_users`, `tenant_user_preferences`, `ai_usage`, `user_preferences`, `users`, and `early_access_subscribers`, and joining `app_id` against `apps.id` (`varchar`) fails on the 5 tables where `app_id` is `uuid`!
- **Fix:**
  1. Create migration `0059_standardize_audit_columns_and_app_id.sql` adding `app_id`, `created_by`, `updated_by`, `archived_at`, `archived_by` (and nullable `tenant_id` on global tables `users`, `user_preferences`, `early_access_subscribers`, `apps`) and converting `app_id` on `ai_usage`, `billing_invoices`, `bug_reports`, `early_access_subscribers`, and `file_notes` from `uuid` to `varchar(50) NOT NULL DEFAULT 'money-matters'`.
  2. Update the corresponding Drizzle schema files in `packages/db/src/schema/*.ts`.
- **Platforms:** `Packages`, `API`
- **Tests to add or update:** Add schema invariant test in `packages/db/src/schema/schema-invariants.test.ts` asserting every exported `pgTable` has `id`, `appId`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `archivedAt`, `archivedBy` (and `tenantId` on all tenant-scoped tables).
- **Effort:** `M`
- **Dependencies:** None
- **Confidence:** `Confirmed`

---

### 2.2 Tier P1 — High Priority (Security Hardening, Architecture Boundaries, Major Web/Mobile Parity Gaps & E2E Integrity)

#### [x] COMPLETED `SEC-05` — Unauthenticated Email Enumeration Oracle in `checkEmailRegistered` (`publicProcedure`)
- **Title:** Remove or rate-limit and obfuscate `checkEmailRegistered` public procedure
- **Evidence:**
  - `apps/api/src/routers/tenant/tenant-core.procedures.ts:214-224` (`checkEmailRegistered: publicProcedure.input(z.object({ email: z.string().email() }).strict()).query(...)` executes `SELECT count(*)::int as count FROM neon_auth.user WHERE LOWER(email) = ${normalizedEmail}` and returns `{ registered: boolean }`).
  - `apps/mobile/src/app/(auth)/welcome.tsx:48-68` (calls `checkEmailRegistered` before routing user to login vs signup).
- **Rule violated:** `AGENTS.md §1 (Priority 2: Authentication, authorization & stealth privacy)`, `_BAK_AGENTS.md §6`.
- **Impact / Risk:**
  - **Exploit Scenario:** An unauthenticated attacker scripts requests against `/trpc/tenant.checkEmailRegistered` to enumerate which email addresses have active Money Matters accounts (targeted spear-phishing / credential stuffing).
- **Fix:**
  1. Replace the email-first lookup on `apps/mobile/src/app/(auth)/welcome.tsx` with direct "Sign In" and "Create Account" buttons (matching Web `/sign-in` and `/sign-up`).
  2. Remove `checkEmailRegistered` from `apps/api/src/routers/tenant/tenant-core.procedures.ts:214-224`.
- **Platforms:** `Mobile`, `API`
- **Tests to add or update:** Update `apps/api/src/routers/tenant/tenant-core.procedures.test.ts` and `apps/mobile/src/app/(auth)/welcome.tsx`.
- **Effort:** `S`
- **Dependencies:** None
- **Confidence:** `Confirmed`

---

#### [x] COMPLETED `SEC-06` — Rate Limiter Fails Open When Redis Is Unset/Unreachable & Web Auth Proxy Lacks Rate Limiting
- **Title:** Enforce fail-closed rate limiting on auth/mutation endpoints in production and wire rate limiting into Next.js `/api/auth/[...auth]`
- **Evidence:**
  - `packages/core/src/rate-limiter.ts:45-62, 92-104, 148-159` (`checkRateLimit` and `checkAiTenantRateLimit` return `{ allowed: true }` if `UPSTASH_REDIS_REST_URL` is unset or when `ratelimit.limit()` throws an error).
  - `apps/web/src/app/api/auth/[...auth]/route.ts:1-212` (proxies login, signup, OTP verification, and password reset directly to Neon Auth without calling `checkRateLimit`).
- **Rule violated:** `AGENTS.md §1, §2 (Upstash rate limiter)`, `_BAK_AGENTS.md §7 (Rate Limiting)`.
- **Impact / Risk:**
  - **Exploit Scenario:** An attacker brute-forces passwords or OTP codes via `apps/web/src/app/api/auth/[...auth]/route.ts` with zero rate-limit throttling, or bypasses API rate limits if Upstash Redis experiences transient errors or env misconfiguration.
- **Fix:**
  1. In `apps/web/src/app/api/auth/[...auth]/route.ts`, call `checkRateLimit(clientIp, 'auth')` on all `POST` requests before forwarding to Neon Auth, returning HTTP `429` with `Retry-After` when blocked.
  2. In `packages/core/src/rate-limiter.ts`, require `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in production (`NODE_ENV === 'production'`) and fail **closed** (`{ allowed: false }`) for `'auth'` and `'ai'` buckets when Redis is unreachable in production.
- **Platforms:** `Web`, `API`, `Packages`
- **Tests to add or update:** `packages/core/src/rate-limiter.test.ts`: add test cases for `NODE_ENV === 'production'` missing-config and Redis error fail-closed behavior on `'auth'` and `'ai'` buckets.
- **Effort:** `S`
- **Dependencies:** None
- **Confidence:** `Confirmed`

---

#### [x] COMPLETED `SEC-07` — Missing Zod `.strict()` on `SubmitFeedbackInputSchema` & `AssistantResultSchema` Variants
- **Title:** Add `.strict()` to `SubmitFeedbackInputSchema` and all `AssistantResultSchema` object schemas
- **Evidence:**
  - `packages/capabilities/bug-reports/src/submit-feedback.command.ts:4-16` (`SubmitFeedbackInputSchema = z.object({...})` without `.strict()`).
  - `packages/types/src/assistant.types.ts:49-96` (`AssistantClarificationResultSchema`, `AssistantUnavailableResultSchema`, `AssistantErrorResultSchema`, and nested citation/metric objects in `AssistantAnswerResultSchema` omit `.strict()`).
  - `packages/capabilities/file-notes/src/handlers/index.ts:17-57` (input schemas are defined inline inside `capabilities/file-notes` instead of `packages/types`).
- **Rule violated:** `AGENTS.md §2, §4 (Zod .strict() DTOs in packages/types)`, `_BAK_AGENTS.md §8`.
- **Impact / Risk:** Extra unvalidated properties in `submitFeedback` payloads are silently accepted instead of rejected at the API boundary.
- **Fix:**
  1. Add `.strict()` to `SubmitFeedbackInputSchema` in `packages/capabilities/bug-reports/src/submit-feedback.command.ts:16` (and move/re-export it from `packages/types`).
  2. Add `.strict()` to every `z.object(...)` in `packages/types/src/assistant.types.ts:49-96`.
  3. Move `file-notes` Zod schemas from `packages/capabilities/file-notes/src/handlers/index.ts:17-57` into `packages/types/src/file-notes.types.ts` with `.strict()`.
- **Platforms:** `API`, `Packages`
- **Tests to add or update:** `packages/capabilities/bug-reports/src/submit-feedback.command.test.ts` (verify unknown keys are rejected by `SubmitFeedbackInputSchema.safeParse`).
- **Effort:** `S`
- **Dependencies:** None
- **Confidence:** `Confirmed`

---

#### [x] COMPLETED `SEC-08` — CSV Formula Injection Vulnerability in Data Export & Reports CSV Builders
- **Title:** Sanitize leading formula characters (`=`, `+`, `-`, `@`, `\t`, `\r`) in `export-data.ts` and Web/Mobile Reports CSV exports
- **Evidence:**
  - `packages/capabilities/tenant/src/export-data.ts:8-34` (`escapeCsvValue` quotes strings containing commas/quotes/newlines, but does not prefix strings starting with `=`, `+`, `-`, `@`, `\t`, `\r`).
  - `apps/web/src/app/dashboard/reports/page.tsx:96-119` (builds CSV via raw template interpolation `"${row.name}"` without escaping embedded double quotes `""` or formula prefixes).
  - `apps/mobile/src/app/(app)/reports.tsx:101-145` (builds CSV via raw template interpolation without escaping embedded double quotes or formula prefixes).
- **Rule violated:** `AGENTS.md §1 (Priority 1: Data security)`, `_BAK_AGENTS.md §8 (CSV formula injection)`.
- **Impact / Risk:**
  - **Exploit Scenario:** A malicious transaction description, partner invite/member name, or imported CSV row beginning with `=HYPERLINK(...)` or `=CMD|...` is exported into CSV (`exportMyData` or `Reports` export) and executes formulas when the user opens the CSV in Excel or Google Sheets.
- **Fix:**
  1. Extract a shared `serializeCsv(headers, rows)` utility in `@money-matters/core` (or `@money-matters/types`) that prefixes any string cell matching `/^[=+\-@\t\r]/` with a single quote `'` and doubles internal quotes `"` -> `""`.
  2. Use this shared serializer in `packages/capabilities/tenant/src/export-data.ts`, `apps/web/src/app/dashboard/reports/page.tsx`, and `apps/mobile/src/app/(app)/reports.tsx`.
- **Platforms:** `Both`, `API`, `Packages`
- **Tests to add or update:** `packages/capabilities/tenant/src/export-data.test.ts`: verify cells starting with `=1+1`, `+cmd`, `-2`, `@SUM` are prefixed with `'`.
- **Effort:** `S`
- **Dependencies:** None
- **Confidence:** `Confirmed`

---

#### `ARCH-01` — 19 Files Exceed the Strict 400-Line Limit (`AGENTS.md §4`)
- **Title:** Refactor all 19 files exceeding 400 lines into focused, single-responsibility modules ≤ 400 lines
- **Evidence:**
  1. `packages/ui/src/mobile/MobileCommandPaletteSheet.tsx` — **812 lines**
  2. `packages/ui/src/web/CommandPaletteModal.tsx` — **802 lines**
  3. `apps/mobile/src/app/(app)/settings/allocation-rules.tsx` — **525 lines**
  4. `packages/capabilities/budgeting/src/commands/envelope-lifecycle.test.ts` — **515 lines**
  5. `apps/web/src/app/dashboard/income-and-bills/page.tsx` — **503 lines**
  6. `apps/mobile/src/app/(setup)/categories.tsx` — **499 lines**
  7. `apps/web/src/app/dashboard/layout.tsx` — **499 lines**
  8. `packages/capabilities/budgeting/src/engine/allocation-engine.test.ts` — **478 lines**
  9. `apps/web/src/app/dashboard/envelopes/page.tsx` — **475 lines**
  10. `apps/api/src/routers/income/income-sources.procedures.ts` — **473 lines**
  11. `packages/capabilities/file-notes/src/mobile/NotesFeedModal.tsx` — **456 lines**
  12. `apps/web/src/components/ReconciliationModal.tsx` — **451 lines**
  13. `apps/api/src/routers/payday/payday-matrix.procedures.ts` — **443 lines**
  14. `packages/capabilities/budgeting/src/engine/allocation-engine-steps.ts` — **430 lines**
  15. `apps/web/src/app/dashboard/envelopes/hooks/useEnvelopesTableData.ts` — **427 lines**
  16. `apps/web/src/app/dashboard/income-split/components/useIncomeSplitState.ts` — **413 lines**
  17. `apps/mobile/src/app/(app)/reports.tsx` — **409 lines**
  18. `packages/types/src/onboarding-quiz.ts` — **408 lines**
  19. `apps/mobile/src/components/settings/MobileBankAccountsSection.tsx` — **401 lines**
- **Rule violated:** `AGENTS.md §4 (Strict File & Function Limits: Files ≤ 400 lines; React components and hooks ≤ 100 lines; Domain logic functions ≤ 30 lines)`, `_BAK_AGENTS.md §2`.
- **Impact / Risk:** Monolithic 400–812 line components, hooks, and routers mix routing, state management, domain math, and presentation, violating MECE modularity and maintainability.
- **Fix:**
  - Split `CommandPaletteModal.tsx` (802L) and `MobileCommandPaletteSheet.tsx` (812L) into search results subcomponents, Ask Penny AI panel subcomponents, and a shared `useCommandPaletteState` hook.
  - Extract step-row item and preset selector subcomponents from `apps/mobile/src/app/(app)/settings/allocation-rules.tsx` (525L).
  - Split `envelope-lifecycle.test.ts` (515L) and `allocation-engine.test.ts` (478L) into create/update/archive and preset/waterfall test suites.
  - Extract `useIncomeAndBillsPageState` and modal orchestration from `apps/web/src/app/dashboard/income-and-bills/page.tsx` (503L) and `apps/web/src/app/dashboard/envelopes/page.tsx` (475L).
  - Extract sidebar navigation and header bar from `apps/web/src/app/dashboard/layout.tsx` (499L).
  - Extract category preset cards from `apps/mobile/src/app/(setup)/categories.tsx` (499L).
  - Move domain query/mutation logic out of `income-sources.procedures.ts` (473L) and `payday-matrix.procedures.ts` (443L) into `@money-matters/capability-budgeting` (`ARCH-02`).
  - Split `NotesFeedModal.tsx` (456L), `ReconciliationModal.tsx` (451L), `allocation-engine-steps.ts` (430L), `useEnvelopesTableData.ts` (427L), `useIncomeSplitState.ts` (413L), `reports.tsx` (409L), `onboarding-quiz.ts` (408L), and `MobileBankAccountsSection.tsx` (401L) below 350 lines each.
- **Platforms:** `Both`, `API`, `Packages`
- **Tests to add or update:** Preserve all existing unit tests and verify zero file exceeds 400 lines.
- **Effort:** `L`
- **Dependencies:** `ARCH-02`, `ARCH-03`
- **Confidence:** `Confirmed`

---

#### `ARCH-02` — Domain Business Logic Embedded Directly in `apps/api/src/routers/*` Instead of Capability Packages
- **Title:** Extract inline database queries and domain mutations from `apps/api/src/routers/*` into `@money-matters/capability-*` handlers
- **Evidence:**
  - `apps/api/src/routers/income/income-sources.procedures.ts:35-473` (473 lines of direct Drizzle queries, contribution mode math, and schedule materialization inside `apps/api`).
  - `apps/api/src/routers/income/income-events.procedures.ts:28-365` (365 lines of direct Drizzle queries and event status mutations inside `apps/api`).
  - `apps/api/src/routers/payday/payday-matrix.procedures.ts:40-443` (443 lines of 12-month payday matrix construction and stealth privacy filtering inside `apps/api`).
  - `apps/api/src/routers/payday/payday-execution.procedures.ts:60-242` (`saveAllocationDraft`, `resetAllocationDraft`, `revertExecutedAllocation`, and `getAllocationHistory` implemented directly in router).
  - `apps/api/src/routers/transfers.router.ts:30-346` (346 lines of envelope-to-envelope and physical bank account transfer ledger logic directly inside `apps/api`).
  - `apps/api/src/routers/tenant/household.procedures.ts:241-375` (`getHouseholdDetails` and `getSetupState` implemented inline in router).
  - `apps/api/src/routers/tenant/profile.procedures.ts:9-252` (`getUserPreferences`, `updateUserPreferences`, `updateProfile`, `requestPasswordReset` implemented inline in router).
- **Rule violated:** `AGENTS.md §2 (apps/*: Thin composition and routing layers only. NEVER place domain business logic in apps or pages)`, `_BAK_AGENTS.md §1, §2`.
- **Impact / Risk:** Business logic in `apps/api/src/routers/*` cannot be reused by Inngest workflows or assistant adapters and bypasses capability-level unit testing (17 of 20 router files have 0 unit tests).
- **Fix:**
  1. Move `income-sources`, `income-events`, `payday-matrix`, and `payday-execution` inline queries/commands into `packages/capabilities/budgeting/src/commands/*` and `queries/*`.
  2. Move `transfers.router.ts` domain logic into `packages/capabilities/transactions/src/commands/transfer-funds.command.ts` and `execute-account-transfer.command.ts`.
  3. Move `household.procedures.ts` and `profile.procedures.ts` inline handlers into `packages/capabilities/tenant/src/handlers/*`.
  4. Keep all `apps/api/src/routers/*.ts` files thin (<150 lines) doing only procedure definition, input validation, and handler invocation.
- **Platforms:** `API`, `Packages`
- **Tests to add or update:** Add unit tests for extracted commands/queries in `packages/capabilities/budgeting`, `packages/capabilities/transactions`, and `packages/capabilities/tenant`.
- **Effort:** `L`
- **Dependencies:** `SEC-03`, `SEC-04`
- **Confidence:** `Confirmed`

---

#### `ARCH-03` — Financial & Rollup Domain Logic Duplicated in Web and Mobile UI Hooks/Helpers
- **Title:** Consolidate client-side envelope funding math, bank-rollup math, setup wizard calculations, and payday split draft math into `@money-matters/types` or server query DTOs
- **Evidence:**
  - `apps/web/src/app/dashboard/envelopes/hooks/useEnvelopesTableData.ts` (427L) vs `apps/mobile/src/lib/envelopes.ts` (242L): both independently compute envelope funding status (`FUNDED`, `ON_TRACK`, `SHORTFALL`), target pacing, and group totals on the client.
  - `apps/web/src/app/dashboard/bank-rollup.ts` (115L): computes bank account vs envelope allocation discrepancies on the client.
  - `apps/web/src/app/setup/hooks/useSetupWizardState.ts` (345L) vs `apps/mobile/src/hooks/useSetupWizardCalculations.ts` (175L): both independently compute setup wizard monthly/payday conversions, lifestyle budget recommendations, and safety cushion math.
  - `apps/web/src/app/dashboard/income-split/components/useIncomeSplitState.ts` (413L) vs `apps/mobile/src/components/payday/useMobilePaydaySplit.ts` (362L): both duplicate custom draft line overrides, unallocated cushion delta math, and transfer instruction grouping.
- **Rule violated:** `AGENTS.md §2 (NEVER place domain business logic in apps or pages)`, `AGENTS.md §4 (Generic utils.ts or grab-bag helper files are forbidden)`, `_BAK_AGENTS.md §1, §2`.
- **Impact / Risk:** Subtle rounding or formula divergence between Web and Mobile causes the same tenant to see different funding badges, setup recommendations, or payday draft totals across platforms.
- **Fix:**
  1. Move pure deterministic presentation calculations (setup wizard payday/monthly totals, draft line delta math, envelope group rollup helpers) into `@money-matters/types` (with shared unit tests) or return pre-computed fields from `@money-matters/capability-budgeting` query DTOs (`listEnvelopes`, `getHomeSummary`, `previewAllocation`).
  2. Refactor `useEnvelopesTableData.ts`, `apps/mobile/src/lib/envelopes.ts`, `useIncomeSplitState.ts`, and `useMobilePaydaySplit.ts` into thin view-state hooks ≤ 100 lines.
- **Platforms:** `Both`, `Packages`
- **Tests to add or update:** Consolidated unit tests in `packages/types/src/` and `packages/capabilities/budgeting/src/queries/`.
- **Effort:** `L`
- **Dependencies:** `ARCH-01`
- **Confidence:** `Confirmed`

---

#### `PAR-04` — Mobile `NotesFeedModal` (`file-notes`) Is Orphaned and Never Mounted on Mobile Screens
- **Title:** Wire Mobile file notes (`NotesFeedModal`) into Mobile Envelope Detail, Transaction Detail, and Bank Account screens to match Web `FileNotesDrawer`
- **Evidence:**
  - Web mounts `FileNotesDrawer` (`packages/capabilities/file-notes/src/web/FileNotesDrawer.tsx`) in `apps/web/src/app/dashboard/envelopes/components/EnvelopeDetailDrawer.tsx`, `apps/web/src/app/dashboard/transactions/components/TransactionsTabContent.tsx`, and `apps/web/src/app/dashboard/settings/components/BankAccountsSection.tsx`.
  - Mobile `NotesFeedModal` (`packages/capabilities/file-notes/src/mobile/NotesFeedModal.tsx`, 456 lines) is exported from `@money-matters/capability-file-notes/mobile` but has **zero imports anywhere in `apps/mobile/src/`**.
- **Rule violated:** `AGENTS.md §1 (Priority 7: User experience & Web/Mobile parity)`, `_BAK_AGENTS.md §12`.
- **Impact / Risk:** Users on Mobile cannot view, upload, download, or edit file notes/receipt attachments on Envelopes, Transactions, or Bank Accounts that they attached on Web.
- **Fix:**
  1. Refactor `NotesFeedModal.tsx` below 400 lines (`ARCH-01`) and declare its Expo dependencies (`DEP-01`).
  2. Mount `NotesFeedModal` in `apps/mobile/src/app/(app)/envelope/[id].tsx`, `apps/mobile/src/components/activity/MobileTransactionFormSheet.tsx`, and `apps/mobile/src/components/settings/MobileBankAccountsSection.tsx`.
- **Platforms:** `Mobile`, `Packages`
- **Tests to add or update:** Add component/integration test for Mobile file notes attachment trigger and modal state.
- **Effort:** `M`
- **Dependencies:** `SEC-01`, `DEP-01`, `ARCH-01`
- **Confidence:** `Confirmed`

---

#### `PAR-05` — Mobile Activity Screen Lacks CSV Transaction Import and Bulk Categorize Flows
- **Title:** Add CSV Transaction Import (`importCsvTransactions`) and Multi-Row Bulk Categorize (`bulkCategorizeTransactions`) to Mobile Activity tab
- **Evidence:**
  - Web `apps/web/src/app/dashboard/transactions/page.tsx` and `TransactionsTabContent.tsx` expose `CsvUploadModal` (`trpc.transactions.importCsvTransactions`) and multi-row checkbox selection with Bulk Categorize (`trpc.transactions.bulkCategorizeTransactions`).
  - Mobile `apps/mobile/src/app/(app)/(tabs)/activity.tsx` and `apps/mobile/src/components/activity/MobileLedgerTab.tsx` only support single-transaction create/edit/archive and have **zero** calls to `importCsvTransactions` or `bulkCategorizeTransactions`.
- **Rule violated:** `AGENTS.md §1 (Priority 7: Web/Mobile parity)`, `_BAK_AGENTS.md §12`.
- **Impact / Risk:** Mobile users cannot import bank CSV statements or bulk-categorize uncategorized ledger rows on Mobile.
- **Fix:**
  1. Add `MobileCsvImportModal.tsx` in `apps/mobile/src/components/activity/` using `expo-document-picker` to select a `.csv` file, parse/preview rows using the shared CSV parser, and invoke `trpc.transactions.importCsvTransactions`.
  2. Add long-press / multi-select mode in `MobileLedgerTab.tsx` allowing users to select multiple transactions and invoke `trpc.transactions.bulkCategorizeTransactions` via `SearchSelect` / `MobileModalDialog`.
- **Platforms:** `Mobile`
- **Tests to add or update:** Add unit test for Mobile CSV parsing and bulk-categorize payload construction in `apps/mobile/src/components/activity/`.
- **Effort:** `M`
- **Dependencies:** None
- **Confidence:** `Confirmed`

---

#### `PAR-06` — Mobile Profile Settings Lacks Avatar Upload & Removal (`avatarUrl`)
- **Title:** Add avatar image picker and removal support to `apps/mobile/src/app/(app)/settings/profile.tsx`
- **Evidence:**
  - Web `apps/web/src/app/dashboard/settings/components/ProfileSettingsSection.tsx:65-145` allows uploading/resizing a profile image (`avatarUrl`) and removing it via `trpc.tenant.updateProfile`.
  - Mobile `apps/mobile/src/app/(app)/settings/profile.tsx:1-360` renders read-only user initials/avatar and only submits `name`, `notificationEmail`, `phoneCountryCode`, and `phoneNumber`—omitting `avatarUrl` upload/remove controls.
- **Rule violated:** `AGENTS.md §1 (Priority 7: Web/Mobile parity)`.
- **Impact / Risk:** Mobile users cannot set, change, or remove their profile avatar from the mobile app.
- **Fix:** Use `expo-image-picker` in `apps/mobile/src/app/(app)/settings/profile.tsx` to select/compress a square avatar data URI and wire "Change Avatar" / "Remove Avatar" actions to `trpc.tenant.updateProfile`.
- **Platforms:** `Mobile`
- **Tests to add or update:** Add unit test for profile form submission with `avatarUrl` in `apps/mobile/src/app/(app)/settings/`.
- **Effort:** `S`
- **Dependencies:** None
- **Confidence:** `Confirmed`

---

#### `PAR-07` — Mobile Notifications Settings Lacks Notification Delivery History List
- **Title:** Render `listNotificationDeliveries` history section in `apps/mobile/src/app/(app)/settings/notifications.tsx`
- **Evidence:**
  - Web `apps/web/src/app/dashboard/settings/components/NotificationsSettingsSection.tsx` renders `NotificationHistorySection.tsx` calling `trpc.notifications.listNotificationDeliveries`.
  - Mobile `apps/mobile/src/app/(app)/settings/notifications.tsx` only renders notification preference toggles and never calls `trpc.notifications.listNotificationDeliveries`.
- **Rule violated:** `AGENTS.md §1 (Priority 7: Web/Mobile parity)`.
- **Impact / Risk:** Mobile users cannot inspect past digest/alert notification deliveries or failure statuses.
- **Fix:** Add a paginated (`MobilePaginationBar` when `>= 5`) notification delivery history list at the bottom of `apps/mobile/src/app/(app)/settings/notifications.tsx` calling `trpc.notifications.listNotificationDeliveries`.
- **Platforms:** `Mobile`
- **Tests to add or update:** Add test case verifying `listNotificationDeliveries` rendering and pagination threshold `>= 5`.
- **Effort:** `S`
- **Dependencies:** None
- **Confidence:** `Confirmed`

---

#### `TEST-01` — Playwright E2E Suite (`screen-by-screen.spec.ts`) Uses Conditional Guards That Pass Silently With Zero Assertions
- **Title:** Remove `if (await locator.isVisible())` conditional wrappers in `apps/web/e2e/screen-by-screen.spec.ts` and seed authenticated E2E fixtures
- **Evidence:**
  - `apps/web/e2e/screen-by-screen.spec.ts:1-386`: Across the file, tests navigate to protected `/dashboard/*` routes without an authenticated storageState/session and wrap assertions in `if (!page.url().includes('/sign-in'))` or `if (await heading.isVisible()) { expect(...) }`.
- **Rule violated:** `AGENTS.md §6 (Testing & Spec Synchronization: Every capability, router, and bug fix requires Vitest unit tests and Playwright E2E coverage in apps/web/e2e/screen-by-screen.spec.ts)`, `_BAK_AGENTS.md §21`.
- **Impact / Risk:** When `/dashboard/*` redirects unauthenticated requests to `/sign-in` (or when a UI component crashes/fails to render), `if (await locator.isVisible())` evaluates to `false` and the E2E test passes green with **zero assertions executed**!
- **Fix:**
  1. Add a Playwright `global-setup.ts` / `auth.setup.ts` fixture that authenticates a seeded test tenant (`seed.ts`) and saves `storageState`.
  2. Replace every `if (await locator.isVisible())` and `if (!page.url().includes('/sign-in'))` guard in `apps/web/e2e/screen-by-screen.spec.ts` with unconditional `await expect(locator).toBeVisible()` assertions covering Setup Wizard, Dashboard, Envelopes CRUD, Plan & Matrix, Allocate Payday draft/confirm/undo, Can I Afford It?, Transactions & CSV import, Reports, Settings tabs, and Product Tour.
- **Platforms:** `Web`
- **Tests to add or update:** `apps/web/e2e/screen-by-screen.spec.ts`.
- **Effort:** `M`
- **Dependencies:** None
- **Confidence:** `Confirmed`

---

#### `TEST-02` — Critical Untested Financial Commands, Privacy Handlers, and API Routers
- **Title:** Add Vitest unit test suites for all Tier 1 financial commands, privacy handlers, and 17 untested API routers
- **Evidence:** See Section 5 (`5.1 Tier 1` and `5.2 Tier 2`): `run-allocation.command.ts` (359L), `override-event.command.ts` (222L), `get-projected-pool-balances.query.ts` (220L), `maintain-rolling-window.command.ts` (120L), `delete-account.ts` (251L), `export-data.ts` (151L), `file-notes/src/handlers/index.ts` (363L), `packages/core/src/auth.ts` (78L), and 17 of 20 router files in `apps/api/src/routers/` lack dedicated `.test.ts` files.
- **Rule violated:** `AGENTS.md §6 (Every capability, router, and bug fix requires Vitest unit tests using typed DbOrTx mocks)`, `_BAK_AGENTS.md §21`.
- **Impact / Risk:** Regressions in waterfall execution, 12-month projections, rolling window materialization, account deletion, or router procedure wiring (`tenantProcedure` vs `privateTenantProcedure`) can ship undetected.
- **Fix:** Create dedicated Vitest unit test files (using typed `mockDb as unknown as DbOrTx`) for every Tier 1 and Tier 2 file listed in Section 5.1 and Section 5.2, testing happy paths, validation errors, cross-tenant IDOR rejection, and stealth privacy (`isPrivate`) isolation.
- **Platforms:** `API`, `Packages`
- **Tests to add or update:** All files listed in Section 5.1 and Section 5.2.
- **Effort:** `L`
- **Dependencies:** `SEC-01`, `SEC-02`, `SEC-03`, `SEC-04`, `ARCH-02`
- **Confidence:** `Confirmed`

---

### 2.3 Tier P2 — Medium Priority (UI Invariants, i18n Cleanup, Dead Code Culling, Resilience & Performance)

#### `UI-01` — Ad-Hoc Modals in `apps/web` Bypassing `@money-matters/ui/web` `ModalDialog`
- **Title:** Refactor `AuthModal.tsx` and `EarlyAccessModal.tsx` to use shared `ModalDialog` from `@money-matters/ui/web`
- **Evidence:**
  - `apps/web/src/components/auth/AuthModal.tsx:1-215` (renders custom `<div className="fixed inset-0 z-50 ...">` overlay instead of `ModalDialog`).
  - `apps/web/src/components/landing/EarlyAccessModal.tsx:1-195` (renders custom `<div className="fixed inset-0 z-50 ...">` overlay without `isDirty` discard confirmation).
- **Rule violated:** `AGENTS.md §5 (Single Source of Truth (@money-matters/ui): Never create ad-hoc modals, confirm popups, or amount inputs inside apps/*)`, `_BAK_AGENTS.md §13`.
- **Impact / Risk:** Custom modal overlays lack consistent Escape handling, focus trapping, `aria-modal` attributes, and `isDirty` discard protection.
- **Fix:** Replace custom overlay markup in `AuthModal.tsx` and `EarlyAccessModal.tsx` with `ModalDialog` from `@money-matters/ui/web`, passing `isDirty` on form modification.
- **Platforms:** `Web`
- **Tests to add or update:** Add unit/E2E modal Escape and dirty-discard assertions in `apps/web/e2e/screen-by-screen.spec.ts`.
- **Effort:** `S`
- **Dependencies:** None
- **Confidence:** `Confirmed`

---

#### `UI-02` — Inline Hex Codes Outside `DESIGN_TOKENS` Across Web, Mobile, and Packages
- **Title:** Replace all inline hex color literals in application/component files with `DESIGN_TOKENS.colors` or semantic theme tokens
- **Evidence:**
  - `apps/web/src/app/layout.tsx:48` (`themeColor: "#1B2B4B"`), `apps/web/src/app/global-error.tsx:31,42`, `apps/web/src/app/dashboard/reports/components/ReportsChartsGrid.tsx:24-38` (chart stroke/fill hex codes), `apps/web/src/components/landing/InteractivePaydayEngine.tsx`.
  - `apps/mobile/src/app/_layout.tsx`, `apps/mobile/src/components/envelopes/MobileEnvelopeCard.tsx`, `apps/mobile/src/components/plan/MobilePaydayMatrixView.tsx`, `apps/mobile/src/app/(app)/reports.tsx` (inline hex strings in `StyleSheet.create` and SVG/icon props).
  - `packages/capabilities/budgeting/src/engine/bill-lifecycle-fsm.ts:67,82,97,112` (hardcodes `#1B2B4B`, `#2563eb`, `#22c55e`, `#ba1a1a` instead of importing `DESIGN_TOKENS` or keeping visual styles inside `@money-matters/ui`).
  - `packages/capabilities/notifications/src/email-templates.ts` (inline hex strings in HTML email templates).
- **Rule violated:** `AGENTS.md §5 (Serene Finance Design Tokens: Consume canonical DESIGN_TOKENS.colors. Zero inline hex codes or invented token names)`, `_BAK_AGENTS.md §15`.
- **Impact / Risk:** Hardcoded hex strings drift from `DESIGN_TOKENS` and break dark-mode/theme consistency across Web and Mobile.
- **Fix:** Import `DESIGN_TOKENS` from `@money-matters/ui` (or use `useTheme()` tokens on Mobile and Tailwind token classes on Web) across all cited files, and move `visuals` presentation metadata out of `packages/capabilities/budgeting/src/engine/bill-lifecycle-fsm.ts` into `@money-matters/ui`.
- **Platforms:** `Both`, `Packages`
- **Tests to add or update:** Extend `packages/ui/src/tokens.test.ts` with a static scan asserting zero raw `#[0-9a-fA-F]{3,8}` literals outside `packages/ui/src/tokens.ts` and `email-templates.ts`.
- **Effort:** `M`
- **Dependencies:** None
- **Confidence:** `Confirmed`

---

#### `UI-03` — Raw `.toISOString().split('T')[0]` UTC Date Slicing Causes Off-By-One Day Bugs in AEST/AEDT (`UTC+10`/`UTC+11`)
- **Title:** Replace all `.toISOString().split('T')[0]` calls with timezone-aware date formatting in the user's presentation timezone
- **Evidence:**
  - **29 occurrences across Web, Mobile, API, and Capabilities:**
    - `apps/web/src/components/RecordExpenseModal.tsx:58`
    - `apps/web/src/components/TransferFundsModal.tsx:49`
    - `apps/web/src/components/EnvelopeModal.tsx:82`
    - `apps/web/src/components/IncomeSourceModal.tsx:64`
    - `apps/web/src/app/dashboard/affordability/page.tsx:52`
    - `apps/web/src/app/dashboard/income-split/components/useIncomeSplitState.ts:118`
    - `apps/mobile/src/components/modals/MobileRecordExpenseModal.tsx:51`
    - `apps/mobile/src/components/modals/MobileTransferModal.tsx:44`
    - `apps/mobile/src/components/envelopes/MobileEnvelopeFormModal.tsx:76`
    - `apps/mobile/src/components/plan/MobileIncomeFormModal.tsx:59`
    - `apps/mobile/src/components/activity/MobileTransactionFormSheet.tsx:62`
    - `apps/mobile/src/app/(app)/affordability.tsx:48`
    - `packages/capabilities/budgeting/src/commands/envelope-schedule.ts:34`
    - `packages/capabilities/budgeting/src/commands/income-schedule.ts:31`
    - `packages/capabilities/budgeting/src/queries/get-projected-pool-balances.query.ts:74`
    - `packages/capabilities/tenant/src/export-data.ts:144`
- **Rule violated:** `AGENTS.md §5 (Zero Regional Leakage: format dates via fmtDate / fmtDateMedium in the user's presentation timezone)`, `_BAK_AGENTS.md §14 (Dates: any raw toISOString().split('T')[0] pattern)`.
- **Impact / Risk:** Between 00:00 and 10:00/11:00 AEST/AEDT, `new Date().toISOString().split('T')[0]` returns **yesterday's UTC date**, causing default transaction dates, bill due dates, and schedule start dates to be recorded one day early!
- **Fix:** Add `toLocalIsoDateString(date: Date, timeZone: string): string` (using `Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)`) in `@money-matters/core` / `@money-matters/ui`, and replace all 29 `.toISOString().split('T')[0]` calls with `toLocalIsoDateString(new Date(), timezone)`.
- **Platforms:** `Both`, `API`, `Packages`
- **Tests to add or update:** Add unit test in `packages/core/src/formatters.test.ts` verifying `2026-11-14T00:30:00+11:00` (`2026-11-13T13:30:00Z`) formats as `"2026-11-14"` in `"Australia/Sydney"`.
- **Effort:** `M`
- **Dependencies:** None
- **Confidence:** `Confirmed`

---

#### `UI-04` — Uncached `new Intl.NumberFormat` / `new Intl.DateTimeFormat` Instantiation Inside Render Loops
- **Title:** Cache `Intl.NumberFormat` and `Intl.DateTimeFormat` instances in a module-level `Map` in `@money-matters/core` and `apps/mobile/src/lib/format.ts`
- **Evidence:**
  - `packages/core/src/formatters.ts:18-95` (`formatCurrency`, `fmtDate`, `fmtDateMedium` instantiate `new Intl.NumberFormat(...)` and `new Intl.DateTimeFormat(...)` on every single call).
  - `apps/mobile/src/lib/format.ts:14-78` (`formatMobileCurrency` and date helpers instantiate `new Intl.NumberFormat(...)` on every call, including inside `FlatList` / `SectionList` cell renders and 12-month matrix grids).
- **Rule violated:** `AGENTS.md §1 (Priority 6 & 7: Performance & UX)`, `_BAK_AGENTS.md §19 (Performance)`.
- **Impact / Risk:** Constructing hundreds of `Intl.NumberFormat` instances per render on the 12-month Payday Matrix or Transaction Ledger causes main-thread frame drops on Android devices (Hermes engine).
- **Fix:** Memoize `Intl.NumberFormat` and `Intl.DateTimeFormat` instances in a module-scoped `Map<string, Intl.NumberFormat>` keyed by `${locale}:${currency}:${optionsKey}` in both `packages/core/src/formatters.ts` and `apps/mobile/src/lib/format.ts`.
- **Platforms:** `Both`, `Packages`
- **Tests to add or update:** Update `apps/mobile/src/lib/format.test.ts` and `packages/core/src/formatters.test.ts`.
- **Effort:** `S`
- **Dependencies:** None
- **Confidence:** `Confirmed`

---

#### `UI-05` — `useSearchParams()` Used Without Local `<Suspense>` Wrapper in `apps/web/src/app/dashboard/settings/page.tsx`
- **Title:** Wrap `SettingsContent` (`useSearchParams()`) in `<Suspense>` inside `apps/web/src/app/dashboard/settings/page.tsx`
- **Evidence:**
  - `apps/web/src/app/dashboard/settings/page.tsx:28` calls `useSearchParams()` directly inside the default exported `SettingsPage` component without wrapping it in a `<Suspense>` boundary in `settings/page.tsx` (relying on parent layout suspense).
- **Rule violated:** `AGENTS.md §5 (useSearchParams() wrapped in <Suspense>)`, `_BAK_AGENTS.md §13`.
- **Impact / Risk:** Next.js App Router de-opts the entire `/dashboard/settings` route tree into client-side rendering or fails static prerendering if parent `<Suspense>` changes.
- **Fix:** Split `SettingsPage` in `apps/web/src/app/dashboard/settings/page.tsx` into an inner `<SettingsPageContent />` calling `useSearchParams()` and an outer default export wrapping it in `<Suspense fallback={<SkeletonTable rows={6} />}>`.
- **Platforms:** `Web`
- **Tests to add or update:** Verified via `pnpm --filter @money-matters/web build` and `apps/web/e2e/screen-by-screen.spec.ts`.
- **Effort:** `S`
- **Dependencies:** None
- **Confidence:** `Confirmed`

---

#### [x] COMPLETED `I18N-01` — 205 Confirmed Unused Keys & 7 Legacy Dynamic Enum Keys in `packages/i18n/src/dictionaries/en.ts` (Including Banned "Pool" & "Lock/Unlock" Keys)
- **Title:** Cull all 212 dead i18n keys from `en.ts` and convert the remaining 36 dynamic template keys to typed lookup maps
- **Evidence:**
  - See Section 4.2 (205 `CONFIRMED UNUSED` keys, including `categories.archivePool`, `categories.createPool`, `categories.editPoolTitle`, `categoryDrawer.poolType`, `paydayDrawer.lockSplit`, `matrix.lock`, `matrix.unlock`, `matrix.lockedBadge`) and Section 4.3 (7 dead enum keys: `settings.archived.types.POOL`, `settings.paydayRules.stepTypes.ESSENTIAL_BILLS`, `FLEXIBLE_BILLS`, `COMMITTED_GOALS`, and `stepDescriptions.ESSENTIAL_BILLS`, `FLEXIBLE_BILLS`, `COMMITTED_GOALS`).
- **Rule violated:** `AGENTS.md §5 (100% i18n Externalization; Canonical Taxonomy: "Pool", "Bucket", and "Lock/Unlock" terminology are strictly banned)`, `build-feature` skill (`Aggressive dead-code culling`).
- **Impact / Risk:** 212 dead keys bloat the client JS bundle on both Web and Mobile and retain banned `"Pool"` and `"Lock/Unlock"` strings in `en.ts`.
- **Fix:**
  1. Delete all 205 `CONFIRMED UNUSED` keys (Section 4.2) and the 7 dead enum keys (Section 4.3) from `packages/i18n/src/dictionaries/en.ts`.
  2. Replace dynamic `t(\`prefix.${val}\`)` interpolations for the remaining 36 dynamic keys with explicit `Record<EnumType, TranslationKey>` maps so `packages/i18n/src/check-i18n.cjs` can statically verify 100% of keys.
- **Platforms:** `Both`, `Packages`
- **Tests to add or update:** Update `packages/i18n/src/i18n.test.ts` and `packages/i18n/src/check-i18n.cjs` to fail on unused keys and banned taxonomy words (`/\b(pool|pools|bucket|buckets)\b/i`).
- **Effort:** `M`
- **Dependencies:** None
- **Confidence:** `Confirmed`

---

#### [x] COMPLETED `I18N-02` — 406 Mobile-Only `mobile.*` Namespace Keys Duplicate Canonical Shared Keys
- **Title:** Merge duplicate `mobile.*` copy keys into canonical shared namespaces (`auth.*`, `dashboard.*`, `categories.*`, `transactions.*`, `settings.*`, `common.*`)
- **Evidence:**
  - `packages/i18n/src/dictionaries/en.ts` contains 406 keys under `mobile.*` (Section 4.4 and Section 6.7) that duplicate existing Web keys with identical meaning.
- **Rule violated:** `AGENTS.md §4 (MECE Standards)`, `AGENTS.md §5 (Single Source of Truth for all user-facing strings (en.ts))`, Prompt §5.1 (`same i18n keys on both platforms`).
- **Impact / Risk:** Updating copy on Web leaves Mobile displaying stale/divergent wording for the exact same button, field label, or empty state.
- **Fix:** Replace `t('mobile.*')` calls in `apps/mobile/src/` with their canonical shared keys (per Section 4.4 merge table) and delete the redundant `mobile.*` entries from `en.ts`.
- **Platforms:** `Mobile`, `Packages`
- **Tests to add or update:** `packages/i18n/src/i18n.test.ts`.
- **Effort:** `M`
- **Dependencies:** `I18N-01`
- **Confidence:** `Confirmed`

---

#### [x] COMPLETED `DEAD-01` — 28 Unused Files in `packages/ui` & Leaked V2 Push Notification / Basiq Code
- **Title:** Delete 28 unused files in `packages/ui/src/` and remove leaked V2 push notification / Basiq stubs
- **Evidence:**
  - See Appendix Section `6.5.3` for the complete list of **28 unused files in `packages/ui/src/`** (13 in `packages/ui/src/web/` including `EnvelopeHealthBadge.tsx`, `FormField.tsx`, `TableContainer.tsx`, `PageHeader.tsx`, `SummaryStatCard.tsx`, `StatusPill.tsx`, `EmptyStateCard.tsx`, `SectionCard.tsx`, `FilterChipBar.tsx`, `ActionMenu.tsx`, `KeyValueRow.tsx`, `StepProgressHeader.tsx`, `CurrencyText.tsx`; and 15 in `packages/ui/src/mobile/` including `usePushNotifications.ts`, `NotificationPermissionBanner.tsx`, `MobileEmptyState.tsx`, `MobileSectionHeader.tsx`, `MobileStatCard.tsx`, `MobileStatusBadge.tsx`, `MobileFilterChips.tsx`, `MobileFormField.tsx`, `MobileListRow.tsx`, `MobileKeyValueRow.tsx`, `MobileStepIndicator.tsx`, `MobileActionSheet.tsx`, `MobileCurrencyText.tsx`, `MobileSearchBar.tsx`, `MobileAvatar.tsx`).
  - `apps/api/src/routers/notifications.router.ts:112-141` (`registerPushToken` procedure stores Expo push tokens in `userPreferences`, which `V2_SCOPE.md` designates as out-of-scope V2 push notification infrastructure).
- **Rule violated:** `AGENTS.md §2, §3, §4`, `V2_SCOPE.md`, `build-feature` skill (`Aggressive dead-code culling`).
- **Impact / Risk:** 28 dead UI components and V2 push notification hooks create maintenance noise, phantom dependency errors (`expo-notifications` in `usePushNotifications.ts`), and bundle bloat.
- **Fix:** Delete all 28 unused files in `packages/ui/src/web/` and `packages/ui/src/mobile/` (and their barrel exports in `packages/ui/src/web/index.ts` and `packages/ui/src/mobile/index.ts`), and remove `registerPushToken` if push notifications remain V2-scoped.
- **Platforms:** `Both`, `API`, `Packages`
- **Tests to add or update:** Verify `pnpm typecheck` and `packages/ui/src/tokens.test.ts`.
- **Effort:** `S`
- **Dependencies:** `DEP-01`
- **Confidence:** `Confirmed`

---

#### [x] COMPLETED `ARCH-04` — Misplaced `submitFeedback` Procedure in `expensesRouter` & Cross-Import Hygiene
- **Title:** Move `submitFeedback` from `expensesRouter` to a dedicated `feedbackRouter` (or `tenantRouter`) and reconcile `V2_SCOPE.md` documentation drift
- **Evidence:**
  - `apps/api/src/routers/expenses.router.ts:192-218` mounts `submitFeedback` (which writes to `bug_reports` via `@money-matters/capability-bug-reports`) inside `expensesRouter` (`trpc.expenses.submitFeedback`).
  - `V2_SCOPE.md:158-207` claims `bug-reports` and `file-notes` were removed in V1, contradicting `V2_SCOPE.md:459`, `AGENTS.md §2, §5`, and active production code.
- **Rule violated:** `AGENTS.md §2 (Vertical Slice Boundaries & MECE clean architecture)`, `AGENTS.md §5 (Feedback/bug reports MUST dispatch via trpc.submitFeedback)`, `AGENTS.md §6 (Spec Synchronization)`.
- **Impact / Risk:** Placing bug-report submission inside `expensesRouter` violates MECE router boundaries and contradicts `AGENTS.md §5`.
- **Fix:**
  1. Expose `submitFeedback` at top-level or `feedbackRouter` (`trpc.submitFeedback` / `trpc.feedback.submitFeedback`) using `privateTenantProcedure` and update Web `FeedbackModal.tsx` and Mobile `MobileFeedbackModal.tsx`.
  2. Update `V2_SCOPE.md:158-207` to match `AGENTS.md §2` and `V2_SCOPE.md:459` (clarifying that basic feedback submission and manual file-note attachments are R1, while AI OCR document extraction is V2).
- **Platforms:** `Both`, `API`, `Packages`
- **Tests to add or update:** `apps/api/src/routers/feedback.router.test.ts` (new).
- **Effort:** `S`
- **Dependencies:** `SEC-07`
- **Confidence:** `Confirmed`

---

#### [x] COMPLETED `OPS-01` — External Calls (Resend Email, Stripe API, LLM Gateway) Lack Explicit Timeouts & Backoff Retries, and Feature Flags Lack Metadata
- **Title:** Add `AbortSignal.timeout()` and retry-with-backoff to outbound Resend/Stripe/LLM calls and add owner/expiry metadata to feature flags
- **Evidence:**
  - `packages/capabilities/assistant/src/llm/gateway.provider.ts:35-95` (`fetch(...)` to Cloudflare AI Gateway / OpenAI has no `signal: AbortSignal.timeout(...)` or retry backoff).
  - `packages/capabilities/notifications/src/email-service.ts` and `apps/api/src/routes/password-reset.ts` (Resend SDK calls have no timeout wrapper or transient 5xx retry).
  - `packages/config/src/feature-flags.ts:1-65` (defines feature flags `enableAiAssistant`, `enableCsvImport`, `enableFileNotes`, `enableStripeBilling`, `maintenanceMode`, but omits `owner`, `expiresAt`, and per-tenant override schema).
- **Rule violated:** `AGENTS.md §2 (Typed feature flags with kill switches)`, `_BAK_AGENTS.md §18 (Resilience: retries with backoff, timeouts, idempotency keys), §20 (Feature flags: typed, documented, with owner, expiry, tenant scoping and kill switch)`.
- **Impact / Risk:** A hung upstream LLM or Resend connection stalls Worker execution until the Cloudflare wall-clock limit; undocumented feature flags accumulate technical debt without expiry dates.
- **Fix:**
  1. Add `signal: AbortSignal.timeout(10_000)` and a 2-retry exponential backoff helper for transient `429`/`502`/`503`/`504` responses in `gateway.provider.ts` and `email-service.ts`.
  2. Extend `FeatureFlagDefinitionSchema` in `packages/config/src/feature-flags.ts` with required `owner: string`, `expiresAt: string`, `description: string`, and `killSwitchEnvVar: string` fields.
- **Platforms:** `API`, `Packages`
- **Tests to add or update:** `packages/config/src/feature-flags.test.ts` and `packages/capabilities/assistant/src/llm/gateway.provider.test.ts` (new).
- **Effort:** `M`
- **Dependencies:** None
- **Confidence:** `Confirmed`

---

### 2.4 Tier P3 — Low Priority (Minor Parity Polish, Stale Root Files & Dev Hygiene)

#### `PAR-01` — Minor Parity Polish Across Setup Wizard, Dashboard Rollup, Envelopes Pagination & Transaction Modals (`PAR-01`, `PAR-02`, `PAR-03`, `PAR-08`)
- **Title:** Align Mobile Envelopes pagination (`MobilePaginationBar >= 5`), merge Mobile `MobileRecordExpenseModal` + `MobileTransactionFormSheet`, and unify Dashboard/Envelopes server query calls
- **Evidence:**
  - `apps/mobile/src/app/(app)/(tabs)/envelopes.tsx`: renders `SectionList` without `MobilePaginationBar` when a group has `>= 5` envelopes, whereas Web `EnvelopeGroupTable.tsx` paginates at `>= 5`.
  - `apps/mobile/src/components/modals/MobileRecordExpenseModal.tsx` (345L) and `apps/mobile/src/components/activity/MobileTransactionFormSheet.tsx` (310L) are separate Create vs Edit components, whereas `AGENTS.md §7` mandates merging Create and Edit modals for the same entity using an `isEdit` prop.
  - Web `/dashboard` calls `listBankAccounts` in addition to `getHomeSummary`, and Web `/dashboard/envelopes` calls `getPaydayMatrix` in addition to `listEnvelopes`.
- **Rule violated:** `AGENTS.md §5 (Render pagination only when totalItems >= 5)`, `AGENTS.md §7 (Merge Create and Edit modals for the same entity into one component using an isEdit prop)`.
- **Impact / Risk:** Minor UX and query-count differences between Web and Mobile.
- **Fix:**
  1. Merge `MobileRecordExpenseModal.tsx` and `MobileTransactionFormSheet.tsx` into a single `MobileTransactionModal.tsx` with `isEdit?: boolean`.
  2. Include next-payday allocation amount in `listEnvelopes` and account summary in `getHomeSummary` so Web does not need extra `getPaydayMatrix` / `listBankAccounts` round-trips.
- **Platforms:** `Both`, `API`
- **Tests to add or update:** `apps/mobile/src/lib/envelopes.test.ts` and `apps/web/e2e/screen-by-screen.spec.ts`.
- **Effort:** `M`
- **Dependencies:** `ARCH-03`
- **Confidence:** `Confirmed`

---

#### [x] COMPLETED `DEAD-02` — Stale Root-Level Backup and Scratch Planning Files Polluting Repository Root
- **Title:** Remove stale root files (`_BAK_AGENTS.md`, `MOBILE_PARITY_IMPLEMENTATION_PLAN.md`, `next_to_implement.md`, `codebase_details_researcher_output.md`, `posthog-self-driving-report.md`)
- **Evidence:**
  - Repo root contains `_BAK_AGENTS.md` (297L), `MOBILE_PARITY_IMPLEMENTATION_PLAN.md`, `next_to_implement.md`, `codebase_details_researcher_output.md`, and `posthog-self-driving-report.md`.
- **Rule violated:** `AGENTS.md §4`, Prompt §5.2 (`stale or untracked root-level files`), `build-feature` skill (`Aggressive dead-code culling`).
- **Impact / Risk:** Stale root markdown files contradict `AGENTS.md` and `TECHNICAL_SPEC.md` and confuse engineers and AI agents.
- **Fix:** Delete `_BAK_AGENTS.md`, `MOBILE_PARITY_IMPLEMENTATION_PLAN.md`, `next_to_implement.md`, `codebase_details_researcher_output.md`, and `posthog-self-driving-report.md` from the repository root.
- **Platforms:** `Packages`
- **Tests to add or update:** None required.
- **Effort:** `S`
- **Dependencies:** None
- **Confidence:** `Confirmed`

---

#### [x] COMPLETED `OPS-02` — Secrets & Local Environment File Hygiene Audit (`.gitignore` Coverage)
- **Title:** Add `seed_credentials.local.md` and `.aider*` explicitly to `.gitignore`
- **Evidence:**
  - `.gitignore:1-55` ignores `.env`, `.env*.local`, and `.dev.vars*`, and `.git` index inspection confirms **zero** `.env*` or `.dev.vars*` files are git-tracked. However, `seed_credentials.local.md` and `.aider*` are not explicitly listed in `.gitignore`. (Per Hard Constraint §2, no `.env*`, `.dev.vars*`, `seed_credentials.local.md`, or `.aider*` files were opened).
- **Rule violated:** `AGENTS.md §3 (Security Hygiene: All secrets via env vars)`, Prompt §2.
- **Impact / Risk:** Accidental `git add .` could stage local credential notes (`seed_credentials.local.md`) or AI tool history (`.aider*`).
- **Fix:** Add `seed_credentials.local.md`, `*.local.md`, and `.aider*` to `.gitignore`.
- **Platforms:** `Packages`
- **Tests to add or update:** None required.
- **Effort:** `S`
- **Dependencies:** None
- **Confidence:** `Confirmed`

---

### 2.5 Recommended Execution Order and Batching

Execute the remediation in **6 deterministic, dependency-ordered batches**:

1. **Batch 1 — Database Migrations, RLS Hardening & Schema Sync (P0 Foundation):**
   - **Items:** `VAL-02` -> `SEC-01` (DB migration part) -> `SEC-03` (DB migration part) -> `VAL-01` -> `OPS-02`.
   - **Goal:** Land deterministic migrations `0058` and `0059` enforcing `FORCE ROW LEVEL SECURITY` and `stealth_privacy_isolation` across all tables (`file_notes`, `allocation_strategies`, `user_preferences`, `bug_reports`), standardizing audit columns and `app_id`, and syncing `SCHEMA_DATA_DICTIONARY.md` 100% so `pnpm audit:schema` passes.
2. **Batch 2 — Package Dependencies, Dead Code Culling & i18n Cleanup (P0/P2 Build Hygiene):**
   - **Items:** `DEP-01` -> `DEAD-01` -> `DEAD-02` -> `I18N-01` -> `I18N-02`.
   - **Goal:** Fix all phantom dependencies in `package.json` files, delete all 28 unused `packages/ui` files and stale root files, and cull all 212 dead/banned keys from `en.ts` + merge duplicate `mobile.*` keys so `pnpm typecheck` and `pnpm check:i18n` pass cleanly.
3. **Batch 3 — API Security, Privacy Procedure Types, Input Validation & CSV Sanitization (P0/P1 Security):**
   - **Items:** `SEC-01` (handler logic) -> `SEC-02` -> `SEC-03` (procedure types) -> `SEC-04` -> `SEC-05` -> `SEC-06` -> `SEC-07` -> `SEC-08` -> `ARCH-04` -> `OPS-01`.
   - **Goal:** Close every cross-tenant and cross-partner stealth privacy bypass (`file_notes`, `exportMyData`, `getAllocationHistory`, `profile.procedures.ts`), remove the `checkEmailRegistered` enumeration oracle, enforce fail-closed rate limiting on auth/AI routes, add `.strict()` to all remaining schemas, and sanitize CSV exports against formula injection.
4. **Batch 4 — Capability Extraction, Shared Math Consolidation & 400-Line File Splits (P1 Architecture & MECE):**
   - **Items:** `ARCH-02` -> `ARCH-03` -> `ARCH-01`.
   - **Goal:** Extract inline router queries/commands into `@money-matters/capability-*`, unify client-side financial/rollup math, and split all 19 files > 400 lines below 350 lines each.
5. **Batch 5 — Web/Mobile Parity Completion & UI/Timezone Polish (P1/P2/P3 UX & Parity):**
   - **Items:** `PAR-04` -> `PAR-05` -> `PAR-06` -> `PAR-07` -> `UI-01` -> `UI-02` -> `UI-03` -> `UI-04` -> `UI-05` -> `PAR-01`.
   - **Goal:** Mount `NotesFeedModal` on Mobile, add Mobile CSV import and bulk categorize, add Mobile avatar upload and notification delivery history, replace ad-hoc Web modals with `ModalDialog`, eliminate inline hex codes and `.toISOString().split('T')[0]` UTC bugs, and memoize `Intl` formatters.
6. **Batch 6 — Unit Test Backfill & Non-Conditional Playwright E2E Verification (P1 Verification Gate):**
   - **Items:** `TEST-02` -> `TEST-01`.
   - **Goal:** Add Vitest unit tests for all Tier 1 and Tier 2 capabilities/routers and remove all conditional `if (await locator.isVisible())` wrappers from `apps/web/e2e/screen-by-screen.spec.ts`.

---

### 2.6 `AGENTS.md` (Sections 1–7) & Historical `_BAK_AGENTS.md` (Sections 1–27) Coverage Matrix

| Current `AGENTS.md` Section | Historical `_BAK_AGENTS.md` Section | Audit Status & Mapped Plan IDs (or Verified Clean Proof) |
| :--- | :--- | :--- |
| **§1. Priority Order & Authority** | §1. Priority Order | Audited across all phases; security & privacy violations prioritized as P0 (`SEC-01`–`SEC-04`). |
| **§2. Monorepo Topology & Vertical Slice Boundaries** | §2. Monorepo Topology & Dependency Rules | Capabilities do **not** import other capabilities (**PASS**). Violations found & mapped: inline domain logic in `apps/api` (`ARCH-02`), client domain math (`ARCH-03`), 19 files > 400L (`ARCH-01`), phantom dependencies (`DEP-01`), `submitFeedback` in `expensesRouter` (`ARCH-04`). |
| **§3. Multi-Tenancy, Security & Database Standards** | §3. Zero Dead Code, §5. Database & Schema, §6. Security & Multi-Tenancy, §9. Audit Trail | Audited all 23 tables & 57 migrations: `file_notes` IDOR/hard-delete/RLS (`SEC-01`), `exportMyData` privacy leak (`SEC-02`), `allocation_strategies` & `user_preferences` RLS (`SEC-03`), `tenantProcedure` vs `privateTenantProcedure` (`SEC-04`), `SCHEMA_DATA_DICTIONARY.md` drift (`VAL-01`), missing audit columns on 8 tables (`VAL-02`). Zero N+1 loops inside `db.transaction` (**PASS**). Zero client `useEffect` maintenance mutations (**PASS**). |
| **§4. Type Safety, Code Quality & MECE Standards** | §4. Type Safety, §19. Mobile Architecture & SQLite | Zero `any`, `as any`, `@ts-ignore`, `@ts-expect-error` across all source and test files (**PASS**). All 15 library `package.json` files list `"types"` first in `"exports"` (**PASS**). Mobile SQLite cache (`apps/mobile/src/lib/sqlite-cache.ts`) uses `withTransactionSync`, keys by `${tenantId}:${userId}:${queryKey}`, validates via Zod, and wipes on logout (**PASS**). Violations mapped: missing `.strict()` (`SEC-07`), 19 files > 400L (`ARCH-01`). |
| **§5. UI, Design Tokens, Taxonomy & i18n Invariants** | §10–§16. UI, Modals, Forms, Dates, Tokens, i18n, Taxonomy | Zero `confirm()` or `Alert.alert` (**PASS**). Zero `Math.random()` IDs (**PASS**). Zero hardcoded `$`/`AUD`/`en-AU` in components (**PASS**). Zero raw JSX strings or `t('x') \|\| 'y'` fallbacks (**PASS**). Violations mapped: ad-hoc modals (`UI-01`), inline hex codes (`UI-02`), `.toISOString().split('T')[0]` (`UI-03`), `useSearchParams` in `settings/page.tsx` (`UI-05`), 212 dead/banned i18n keys (`I18N-01`), duplicate `mobile.*` keys (`I18N-02`). |
| **§6. Testing & Spec Synchronization** | §21. Testing Standards, §26. Documentation Sync | Violations mapped: conditional `if (await locator.isVisible())` in `screen-by-screen.spec.ts` (`TEST-01`), untested capabilities & routers (`TEST-02`), `SCHEMA_DATA_DICTIONARY.md` drift (`VAL-01`), `V2_SCOPE.md` contradiction (`ARCH-04`). |
| **§7. Granular UI, Versioning & Review Standards** | §7. Rate Limiting, §8. Input Validation, §17. Observability, §18. Resilience, §20. Feature Flags, §22. Versioning, §25. Privacy | Version footer & copy-diagnostics work on both Web and Mobile (`version.ts` + `pnpm version:bump` — **PASS**). Correlation IDs (`correlationIdHook`) & PII redaction in `@money-matters/core` logger (**PASS**). Violations mapped: rate-limit fail-open (`SEC-06`), CSV injection (`SEC-08`), outbound timeouts & feature flag metadata (`OPS-01`), unmerged Mobile transaction modals (`PAR-01`). |

---

## 3. Parity Matrix (Web vs Mobile)

### 3.1 Screen-by-Screen Parity Matrix

| Screen / Feature | Web Route & File | Mobile Route & File | Fields & Zod Schema Parity | Empty / Loading / Error / Success States | Actions, Confirms, Dirty Discard, Esc & Pagination (`>= 5`) | tRPC Procedures & Cache Invalidation | Copy / i18n Key Parity | `@money-matters/ui` vs Local Re-impl | UI Business Logic Leakage | Tour Anchors & Settings Parity | Linked Plan IDs |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Marketing Landing, Pricing, Legal, Cookie Consent, Early Access** | `/`, `/privacy`, `/terms` (`apps/web/src/app/page.tsx`, `privacy/page.tsx`, `terms/page.tsx`, `components/landing/*`, `CookieConsentBanner.tsx`) | None (Intentional Web-only public marketing entry; Mobile starts at `/(auth)/welcome`) | Web `EarlyAccessModal` uses local `z.string().email()` instead of shared `@money-matters/types` schema; phantom `zod` import in `apps/web` | Web renders custom inline error/success states | Web `EarlyAccessModal` uses custom `<div className="fixed inset-0">` modal without `isDirty` guard | Web calls `subscribeEarlyAccess` (`publicProcedure`) | `landing.*`, `earlyAccess.*`, `legal.*`, `cookies.*` (Web-only; 99 unused `landing.*` keys in `en.ts`) | Web `EarlyAccessModal.tsx` and `AuthModal.tsx` bypass `ModalDialog` from `@money-matters/ui/web` | Interactive payday simulator math in `InteractivePaydayEngine.tsx` (acceptable marketing demo) | N/A | `DEP-01`, `UI-01`, `I18N-01` |
| **Sign In / Sign Up / Forgot & Reset Password / Verify Email / Invite Accept** | `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify-email`, `/invite/accept` | `/(auth)/welcome`, `/(auth)/login`, `/(auth)/signup`, `/(auth)/forgot-password`, `/(auth)/reset-password`, `/(auth)/verify-email`, `/(auth)/accept-invite` | Local client-side email/password checks on both platforms; Mobile `welcome.tsx` calls `checkEmailRegistered` (`publicProcedure` enumeration oracle) | Both render inline errors and loading states; Web wraps `useSearchParams()` in `<Suspense>` | Submit buttons show loading state; no pagination | `checkEmailRegistered`, `requestPasswordReset`, `acceptPartnerInvite`, `/api/auth/reset-password` | Divergent keys across `auth.*` vs `mobile.auth.*` (`auth.signIn` vs `mobile.auth.signInButton`, `auth.emailLabel` vs `mobile.auth.emailPlaceholder`) | Web `AuthModal.tsx` uses custom modal markup instead of `ModalDialog`; Mobile uses `MobileButton` & `MobileInput` | Mobile `welcome.tsx` performs email-check branching before auth | N/A | `SEC-05`, `SEC-06`, `UI-01`, `I18N-02` |
| **First-Run 5-Step Setup Wizard (Income, Bank Accounts, Goals, Lifestyle, Review & Launch)** | `/setup` (`apps/web/src/app/setup/page.tsx`, `SetupWizardSteps.tsx`, `SetupStepLifestyle.tsx`, `SetupStepReview.tsx`, `useSetupWizardState.ts`) | `/(setup)/index`, `/(setup)/accounts`, `/(setup)/goals`, `/(setup)/categories`, `/(setup)/review` (`apps/mobile/src/hooks/useSetupWizardState.ts`, `useSetupWizardCalculations.ts`) | **DRIFT:** Both call `completeFirstRunSetup` (`FirstRunSetupInputSchema`), but Web runs a single-page 5-step state machine (`FIRST_RUN_SETUP_STEPS`) while Mobile splits across 5 Expo Router screens (`categories.tsx` is 499 lines > 400L limit) | Both show loading spinners and `FormErrorBanner`; Mobile `categories.tsx` uses custom inline chips/inputs | Cancel Setup uses `ConfirmDialog` (Web) vs `MobileConfirmDialog` (Mobile); Mobile hardware back between wizard steps does not prompt discard confirmation | `getSetupState`, `completeFirstRunSetup`, `cancelSetup`; both invalidate `getSetupState` and `getHomeSummary` | Shared `setup.*` keys plus Mobile-specific `setup.mobile.*` keys | Mostly shared primitives, except custom inputs inside Mobile `(setup)/categories.tsx` | **LEAK:** Both `apps/web/src/app/setup/hooks/useSetupWizardState.ts` and `apps/mobile/src/hooks/useSetupWizardCalculations.ts` duplicate pro-rata payday allocation & lifestyle recommendation math in client hooks | N/A | `ARCH-01`, `ARCH-02`, `PAR-01` |
| **Dashboard / Home Overview** | `/dashboard` (`apps/web/src/app/dashboard/page.tsx` — 360L, `components/HomeHeroActionBanner.tsx`, `HomeCashOverviewSection.tsx`, `HomeHealthWarningsBanner.tsx`) | `/(app)/(tabs)/index` (`apps/mobile/src/app/(app)/(tabs)/index.tsx` — 255L, `components/dashboard/*`) | Read-only summary; triggers modals (`RecordExpenseModal`, `TransferFundsModal`, `ReconciliationModal`) | Web uses custom pulse blocks instead of `SkeletonTable`; Mobile uses `SkeletonCard`; both render `HomeHealthWarningsBanner` and empty setup prompts | Quick actions open modals; Web header exposes `[N]`, `⌘K`, `?` shortcuts; Mobile renders quick-action cards + header search (`MobileCommandPaletteSheet`) & Ask Penny (`MobileAssistantSheet`) | Both call `getHomeSummary`, `getPendingCount`, `getSubscriptionStatus`; **Web-only:** `listBankAccounts` called directly on dashboard for inline account rollup | Shared `dashboard.*` keys mixed with `mobile.dashboard.*` duplicates (`dashboard.quickActions.*` vs `mobile.dashboard.actions.*`) | Shared `@money-matters/ui` primitives; Web `ReconciliationModal` is 451L (>400L) | **LEAK:** `apps/web/src/app/dashboard/bank-rollup.ts` computes client-side bank vs envelope balance rollups instead of reading server summary DTO | Web `data-tour="overview"`, `"Match Balance"`, `"Record Expense"`, `"Transfer Funds"`; Mobile `MOBILE_TOUR_STEPS` Step 1 (`/(app)/(tabs)`) | `PAR-02`, `ARCH-01`, `ARCH-03`, `I18N-02` |
| **Envelopes List & Grouping** | `/dashboard/envelopes` (`apps/web/src/app/dashboard/envelopes/page.tsx` — 475L, `hooks/useEnvelopesTableData.ts` — 427L, `components/EnvelopeGroupTable.tsx`) | `/(app)/(tabs)/envelopes` (`apps/mobile/src/app/(app)/(tabs)/envelopes.tsx` — 360L, `components/envelopes/*`) | Create/Edit Envelope (`CreateCategorySchema` / `UpdateCategorySchema`), Transfer (`TransferFundsSchema`), Match Balance (`ReconcileBankAccountSchema`) | Web uses `SkeletonTable` (`rows={6}`); Mobile uses `SkeletonCard`; both show empty state CTA and error banners | Web renders `PaginationBar` per group when `>= 5`; Mobile renders `SectionList` with client-side search & status filter chips (no `MobilePaginationBar`); Archive requires confirmation dialog | Both call `listEnvelopes`, `listBankAccounts`, `getProjectedPoolBalances`; **Web-only:** calls `getPaydayMatrix` on Envelopes page to compute next-pay allocation column | Shared `categories.*` & `envelopes.*` keys plus `mobile.envelopes.*` duplicates; banned `categories.archivePool` / `createPool` keys remain in `en.ts` | Both use `@money-matters/ui` primitives; both files/hooks exceed 400 lines (`envelopes/page.tsx` 475L, `useEnvelopesTableData.ts` 427L) | **LEAK:** `useEnvelopesTableData.ts` (427L) and `apps/mobile/src/lib/envelopes.ts` (242L) compute funding status, shortfall, target pacing, and bank rollup math on the client | Web `data-tour="envelopes-list"`, `"new-category-btn"`, `"search-input"`; Mobile `MOBILE_TOUR_STEPS` Step 2 (`/(app)/(tabs)/envelopes`) | `ARCH-01`, `ARCH-03`, `PAR-03`, `I18N-01` |
| **Envelope Detail & 12-Month Balance Projection** | Drawer + Modal on `/dashboard/envelopes` (`EnvelopeDetailDrawer.tsx` — 356L, `BalanceProjectionModal.tsx` — 255L) | Dedicated routes `/(app)/envelope/[id]` (`envelope/[id].tsx` — 285L) & `/(app)/envelope/projection` (`envelope/projection.tsx` — 265L) | Edit Envelope, Override Event (`OverrideEventSchema`), File Notes (`fileNotesRouter`) | Loading skeletons and empty state rendered on both platforms | Archive Envelope & Delete Event use `ConfirmDialog` / `MobileConfirmDialog`; **GAP:** `FileNotesDrawer` (Web) is wired to Envelope Detail, whereas `NotesFeedModal` (Mobile) is **never mounted** on `/(app)/envelope/[id]`! | `listEnvelopes`, `getProjectedPoolBalances`, `listTransactions`, `listExpenseEvents`, `overrideEvent`, `archiveEnvelope`; Web also calls `fileNotes.listFileNotes` | Shared `categoryDrawer.*`, `projection.*`, `categories.*` | Shared UI primitives; Mobile `NotesFeedModal` (456L) lives in `packages/capabilities/file-notes/src/mobile/NotesFeedModal.tsx` and is orphaned | Client-side projection series formatting in both Web modal and Mobile screen | N/A | `PAR-04`, `ARCH-01`, `DEP-01` |
| **Plan / Schedules & Upcoming Bills (List + 12-Month Matrix)** | `/dashboard/income-and-bills` (`apps/web/src/app/dashboard/income-and-bills/page.tsx` — 503L, `ScheduleUnifiedTable.tsx`, `UpcomingEventsSection.tsx`, `PaydayMatrixGrid.tsx`) | `/(app)/(tabs)/plan` (`apps/mobile/src/app/(app)/(tabs)/plan.tsx` — 369L, `components/plan/MobileScheduleSection.tsx`, `MobileUpcomingEventsSection.tsx`, `MobilePaydayMatrixView.tsx`) | Create/Edit Income (`CreateIncomeSourceSchema`), Create/Edit Bill (`CreateEnvelopeSchema` / `UpdateEnvelopeSchema`), Bulk Delete Events (`BulkDeleteEventsSchema`), Override Event | Web uses `SkeletonTable`; Mobile uses `SkeletonCard`; empty states and error banners present | Both enforce pagination threshold `>= 5` (`PaginationBar` / `MobilePaginationBar`); Bulk Delete Events & Archive use `ConfirmDialog` / `MobileConfirmDialog` | Both call `listIncomeSources`, `listEnvelopes`, `listIncomeEvents`, `listExpenseEvents`, `getPaydayMatrix`, `bulkDeleteEvents`, `overrideEvent` | Shared `incomeBillsTabs.*`, `matrix.*` plus `mobile.plan.*` duplicates | Shared UI primitives; Web `income-and-bills/page.tsx` is 503 lines (>400L) | **LEAK:** `apps/mobile/src/lib/mobile-matrix.ts` and Web `PaydayMatrixGrid.tsx` perform client-side matrix cell aggregation & variance math | Web `data-tour="plan-tabs"`, `"upcoming-events"`, `"payday-matrix"`; Mobile `MOBILE_TOUR_STEPS` Step 3 (`/(app)/(tabs)/plan`) | `ARCH-01`, `ARCH-03`, `I18N-02` |
| **Allocate Payday (Income Split Execution & Draft Model)** | `/dashboard/income-split` (`apps/web/src/app/dashboard/income-split/page.tsx`, `useIncomeSplitState.ts` — 413L, `IncomeSplitAllocatorPanel.tsx`, `IncomeSplitExecutionModals.tsx`) | `/(app)/payday` (`apps/mobile/src/app/(app)/payday.tsx` — 255L, `components/payday/useMobilePaydaySplit.ts` — 362L, `MobilePaydayCategoryList.tsx`, `MobilePaydayModals.tsx`) | `PreviewAllocationSchema`, `SaveAllocationDraftSchema`, `RunAllocationSchema`, `ResetAllocationDraftSchema` | Both implement `Auto-Calculated` -> `Custom Draft` -> `Save Draft` / `Confirm & Apply` + `Reset to Recommended` (Document Draft Model); loading skeletons and error banners present | Both prompt confirmation before `Confirm & Apply`, `Reset to Recommended`, and `Undo Split` (`revertExecutedAllocation`); **GAP:** Web `useIncomeSplitState.ts` (413L) exceeds 400L | Both call `previewAllocation`, `saveAllocationDraft`, `resetAllocationDraft`, `runAllocation`, `revertExecutedAllocation`, `createIncomeEvent` | Shared `incomeSplit.*` and `paydayDrawer.*` keys; unused legacy `paydayDrawer.lockSplit` / `matrix.lock` / `matrix.unlock` keys remain in `en.ts` | Shared UI primitives | **LEAK:** `useIncomeSplitState.ts` (413L) and `useMobilePaydaySplit.ts` (362L) duplicate custom draft delta, unallocated cushion, and physical transfer instruction previews on the client | Web `data-tour="allocate-payday"`; Mobile `MOBILE_TOUR_STEPS` Step 3/4 links to Payday | `ARCH-01`, `ARCH-03`, `I18N-01` |
| **Can I Afford It? (Purchase Simulator)** | `/dashboard/affordability` (`apps/web/src/app/dashboard/affordability/page.tsx` — 397L) | `/(app)/affordability` (`apps/mobile/src/app/(app)/affordability.tsx` — 396L) | `SimulatePurchaseInputSchema` (amount, payment source, timing, instalment count, category/envelope) | Both render `SAFE` / `TIGHT` / `RISKY` verdict cards, 90-day cashflow impact, loading spinner, and `FormErrorBanner` | Submit disabled until amount > 0; Convert to Goal / Record Expense follow-up actions available on both | Both call `simulation.simulatePurchase` (`privateTenantProcedure`), `listEnvelopes`, `listBankAccounts` | Shared `affordability.*` keys | Shared `@money-matters/ui` (`AmountField` / `AmountInput`, `DatePickerField`, `GenericSelectField` / `ChipSelect`) | Clean — delegates simulation math to `simulation.simulatePurchase` | Web `data-tour="affordability-simulator"`; Mobile reachable from More tab | None (Full Parity; both at 397L/396L near 400L ceiling) |
| **Activity / History (Transaction Ledger + Payday Allocation History)** | `/dashboard/transactions` (`apps/web/src/app/dashboard/transactions/page.tsx` — 255L, `TransactionsTabContent.tsx`, `PaydayHistoryTabContent.tsx`) | `/(app)/(tabs)/activity` (`apps/mobile/src/app/(app)/(tabs)/activity.tsx` — 237L, `components/activity/MobileLedgerTab.tsx`, `MobileAllocationsTab.tsx`, `MobileTransactionFormSheet.tsx`) | Create/Update/Archive Transaction (`CreateTransactionSchema`, `UpdateTransactionSchema`), Bulk Categorize (`BulkCategorizeTransactionsSchema`), CSV Upload (`ImportCsvTransactionsSchema`), Revert Payday (`RevertAllocationSchema`) | Both render `SkeletonTable` / `SkeletonCard`, empty state, and `FormErrorBanner` | Both enforce pagination `>= 5`; Archive Transaction & Undo Payday use `ConfirmDialog` / `MobileConfirmDialog`; **GAP 1:** Web supports **CSV Import (`CsvUploadModal`)** & **multi-row Bulk Categorize** (`bulkCategorizeTransactions`), while Mobile has **neither CSV Import nor Bulk Categorize UI**! **GAP 2:** Web supports `FileNotesDrawer` on transactions; Mobile `NotesFeedModal` is never mounted on transactions! | Both call `listTransactions`, `createTransaction`, `updateTransaction`, `archiveTransaction`, `getAllocationHistory`, `revertExecutedAllocation`; **Web-only:** `importCsvTransactions`, `bulkCategorizeTransactions`, `fileNotes.*` | Shared `transactions.*`, `paydayHistory.*` plus `mobile.activity.*` duplicates | Shared UI primitives | Clean on ledger CRUD; `getAllocationHistory` backend uses `tenantProcedure` instead of `privateTenantProcedure` (`SEC-04`) | Web `data-tour="transactions-table"`, `"csv-upload-btn"`; Mobile `MOBILE_TOUR_STEPS` Step 4 (`/(app)/(tabs)/activity`) | `PAR-04`, `PAR-05`, `SEC-04`, `I18N-02` |
| **Visual Analytics / Reports** | `/dashboard/reports` (`apps/web/src/app/dashboard/reports/page.tsx` — 367L, `ReportsChartsGrid.tsx`, `ReportsBreakdownTables.tsx`) | `/(app)/reports` (`apps/mobile/src/app/(app)/reports.tsx` — 409L) | Date preset (`3M`, `6M`, `12M`, `ALL`), Account filter, Envelope type filter | Both render loading skeletons, empty states, KPI summary cards, and CSV export | Both support CSV export; **GAP:** Mobile `reports.tsx` is 409 lines (>400L) and both Web & Mobile CSV builders are vulnerable to CSV formula injection (`=`, `+`, `-`, `@`) | Both call `getMonthlySummary`, `listEnvelopes`, `listBankAccounts`, `listTransactions` | Shared `reports.*` keys (5 unused `reports.*` keys in `en.ts`) | Shared UI primitives | Both aggregate chart series & CSV rows in page components | Web sidebar link `/dashboard/reports`; Mobile More menu `/(app)/reports` | `SEC-08`, `ARCH-01`, `I18N-01` |
| **Settings: Hub & Navigation** | `/dashboard/settings` (`apps/web/src/app/dashboard/settings/page.tsx` — 205L, 9 vertical tabs) | `/(app)/(tabs)/more` (`more.tsx` — 343L) + `/(app)/settings/*` (8 sub-routes) | N/A (routing hub) | Both render version footer (`Money Matters vX.Y.Z (#build)`) with click/tap copy-diagnostics toast | Both expose "Take Product Tour" and "Provide Feedback" / "Report a Bug" triggers; **GAP:** Web `settings/page.tsx` reads `useSearchParams()` without a local `<Suspense>` boundary in `settings/page.tsx` (`UI-05`) | `getUserPreferences`, `getSubscriptionStatus`, `getHouseholdDetails` | Shared `settings.*` plus `mobile.more.*` keys | Shared UI primitives | Clean | Both expose Take Product Tour, Provide Feedback, and Version Footer copy diagnostics | `UI-05`, `I18N-02` |
| **Settings: Profile & Security** | Tab `profile` (`ProfileSettingsSection.tsx` — 329L) | `/(app)/settings/profile` (`settings/profile.tsx` — 360L) | `UpdateProfileSchema`, `UpdateUserPreferencesSchema`, Avatar upload, Password reset, Biometric lock (Mobile-only intentional idiom) | Loading states and `FormErrorBanner` on both | Save disabled until dirty; **GAP:** Web supports **Avatar image upload/crop/remove** (`avatarUrl` data URI), whereas Mobile `settings/profile.tsx` displays read-only initials/avatar with **no avatar upload or remove UI**! | Both call `getUserPreferences`, `updateProfile`, `updateUserPreferences`, `requestPasswordReset` | Shared `settings.profile.*` keys | Shared UI primitives | `updateProfile` uses `authenticatedProcedure` and `getUserPreferences`/`updateUserPreferences` use `tenantProcedure` instead of `privateTenantProcedure` (`SEC-03`) | N/A | `PAR-06`, `SEC-03` |
| **Settings: Household & Members** | Tab `household` (`HouseholdSettingsSection.tsx` — 315L, `MembersSection.tsx` — 341L) | `/(app)/settings/household` (`settings/household.tsx` — 226L) & `/(app)/settings/members` (`settings/members.tsx` — 318L) | `UpdateTenantDetailsSchema`, `InvitePartnerSchema`, `UpdateMemberRoleSchema`, `UpdateContributionModeSchema` | Both render loading skeletons, member list, pending invites, and error banners | Remove Member, Revoke Invite, and Leave Household use `ConfirmDialog` / `MobileConfirmDialog` | Both call `getHouseholdDetails`, `updateTenantDetails`, `invitePartner`, `revokePartnerInvite`, `removeHouseholdMember`, `updateMemberRole`, `leaveHousehold`, `updateContributionMode` | Shared `settings.household.*` and `settings.members.*` keys | Shared UI primitives | Clean | N/A | `SEC-04` |
| **Settings: Bank Accounts** | Tab `accounts` (`BankAccountsSection.tsx` — 378L) | `/(app)/settings/bank-accounts` (`MobileBankAccountsSection.tsx` — 401L) | `CreateBankAccountSchema`, `UpdateBankAccountSchema`, `ReconcileBankAccountSchema` | Both render account cards, provider badges, loading states, and error banners | Create/Edit merged modal; Archive Account uses `ConfirmDialog` / `MobileConfirmDialog`; **GAP:** Web supports `FileNotesDrawer` on bank accounts; Mobile `NotesFeedModal` is not wired to bank accounts! Mobile `MobileBankAccountsSection.tsx` is 401L (>400L) | Both call `listBankAccounts`, `createBankAccount`, `updateBankAccount`, `archiveBankAccount`, `reconcileBankAccount` | Shared `bankAccounts.*` and `settings.bankAccountForm.*` keys | Shared UI primitives (`BankProviderBadge`, `AmountField` / `AmountInput`) | Clean | N/A | `PAR-04`, `ARCH-01` |
| **Settings: Payday Allocation Rules (Waterfall Strategy)** | Tab `rules` (`PaydaySplitRulesSection.tsx` — 391L) | `/(app)/settings/allocation-rules` (`settings/allocation-rules.tsx` — 525L) | `ApplyAllocationPresetSchema`, `UpdateAllocationStrategyStepsSchema` | Both render preset cards (`BALANCED`, `BILLS_FORTRESS`, `PAY_YOURSELF_FIRST`), step reorder list, and personal/household scope toggle | Both confirm before applying preset over custom steps; **GAP:** Mobile `allocation-rules.tsx` is **525 lines** (>400L limit) | Both call `getActiveAllocationStrategy`, `applyAllocationPreset`, `updateAllocationStrategySteps` | Shared `settings.paydayRules.*` keys (9 unused keys in `en.ts`) | Shared UI primitives | `allocation_strategies` table lacks `stealth_privacy_isolation` RLS policy (`SEC-03`) | N/A | `ARCH-01`, `SEC-03`, `I18N-01` |
| **Settings: Notifications** | Tab `notifications` (`NotificationsSettingsSection.tsx` — 315L) | `/(app)/settings/notifications` (`settings/notifications.tsx` — 280L) | `UpdateNotificationPreferencesSchema` | Both render email digest & alert toggles, loading state, and `FormErrorBanner` | Save disabled until dirty | Both call `getNotificationPreferences`, `updateNotificationPreferences`; Web also renders `NotificationHistorySection` (`listNotificationDeliveries`) while **Mobile lacks a Notification Delivery History list** (`PAR-07`) | Shared `settings.notifications.*` keys | Shared UI primitives; `packages/ui/src/mobile/notifications/usePushNotifications.ts` has undeclared `expo-notifications`/`expo-device`/`expo-constants` imports (`DEP-01`) | Clean | N/A | `PAR-07`, `DEP-01` |
| **Settings: Subscription & Billing** | Tab `subscription` (`SubscriptionSection.tsx` — 295L) | `/(app)/settings/subscription` (`settings/subscription.tsx` — 245L) | `CreateCheckoutSessionSchema`, `CreateCustomerPortalSessionSchema` | Both render plan badge (`TRIALING`, `SUBSCRIBED`, `PAST_DUE`, `TRIAL_GRACE`, `EXPIRED`), trial countdown, invoice list, and Stripe checkout/portal actions | Both open Stripe Checkout / Customer Portal (`Linking.openURL` on Mobile, `window.location.assign` on Web); Web `SubscriptionSection.tsx` imports undeclared `@trpc/server` (`DEP-01`) | Both call `getSubscriptionStatus`, `listInvoices`, `createCheckoutSession`, `createCustomerPortalSession`, `syncSubscription`; Web also calls `verifyCheckoutSession` on `?session_id=` return | Shared `subscription.*` and `settings.subscription.*` keys | Shared UI primitives | Clean | N/A | `DEP-01` |
| **Settings: Archived Items** | Tab `archived` (`ArchivedItemsSection.tsx` — 218L) | `/(app)/settings/archived` (`settings/archived.tsx` — 220L) | `RestoreArchivedItemSchema` | Both render tabbed/filtered archived Envelopes, Income Sources, and Bank Accounts with empty state and loading state | Both enforce pagination `>= 5` and support Restore (`restoreArchivedItem`) | Both call `listArchivedItems`, `restoreArchivedItem` | Shared `settings.archived.*` keys | Shared UI primitives | Clean | N/A | None (Full Parity) |
| **Settings: Data, Privacy & Account Deletion** | Tab `data` (`DataPrivacySection.tsx` — 240L) | `/(app)/settings/data-privacy` (`settings/data-privacy.tsx` — 255L) | `DeleteMyAccountSchema` (`confirmationText: "DELETE"`) | Both render ZIP/CSV export download and destructive account deletion modal | Both require typing `"DELETE"` inside `ConfirmDialog` / `MobileConfirmDialog` | Both call `exportMyData` and `deleteMyAccount` (`exportMyData` has `SEC-02` privacy leak & `SEC-08` CSV injection) | Shared `settings.dataPrivacy.*` keys | Shared UI primitives | Clean in UI; `exportMyData` handler leaks partner private records (`SEC-02`) | N/A | `SEC-02`, `SEC-08` |

### 3.2 Modals, Drawers & Global Overlays Parity Matrix

| Modal / Drawer / Overlay | Web Component & Path | Mobile Component & Path | Parity Status & Gaps | Linked Plan IDs |
| :--- | :--- | :--- | :--- | :--- |
| **Command Palette (`⌘K`) & Ask Penny AI** | `packages/ui/src/web/CommandPaletteModal.tsx` (802L) + `apps/web/src/components/assistant/AssistantDrawer.tsx` (312L) | `packages/ui/src/mobile/MobileCommandPaletteSheet.tsx` (812L) + `apps/mobile/src/components/assistant/MobileAssistantSheet.tsx` (340L) | Both unify live entity search with Ask Penny AI (`assistantAsk`, `assistantUsage`); **VIOLATION:** `CommandPaletteModal.tsx` (802L) and `MobileCommandPaletteSheet.tsx` (812L) are 2x the 400-line limit | `ARCH-01` |
| **Create / Edit Envelope & Bill Modal** | `apps/web/src/components/EnvelopeModal.tsx` (395L) | `apps/mobile/src/components/envelopes/MobileEnvelopeFormModal.tsx` (398L) | Merged Create/Edit (`isEdit`), `isDirty` discard confirmation, inconspicuous Archive button at bottom-left, collapsed "Advanced Options" for `generateEvents: true` | None (Full Parity; both near 400L limit) |
| **Create / Edit Income Schedule Modal** | `apps/web/src/components/IncomeSourceModal.tsx` (368L) | `apps/mobile/src/components/plan/MobileIncomeFormModal.tsx` (355L) | Merged Create/Edit (`isEdit`), `isDirty` guard, inconspicuous Archive button, household contribution mode fields | None (Full Parity) |
| **Record Expense / Edit Transaction Modal** | `apps/web/src/components/RecordExpenseModal.tsx` (382L) | `apps/mobile/src/components/modals/MobileRecordExpenseModal.tsx` (345L) + `MobileTransactionFormSheet.tsx` (310L) | Web merges Record & Edit Transaction; Mobile splits quick `MobileRecordExpenseModal` and `MobileTransactionFormSheet` (`PAR-08`) | `PAR-08` |
| **Transfer Funds Modal** | `apps/web/src/components/TransferFundsModal.tsx` (310L) | `apps/mobile/src/components/modals/MobileTransferModal.tsx` (295L) | Both support Envelope-to-Envelope (`transferFunds`) and Physical Bank Transfer (`executeAccountTransfer`) with `isDirty` guard | None (Full Parity) |
| **Match Balance (Reconciliation) Modal** | `apps/web/src/components/ReconciliationModal.tsx` (451L) | `apps/mobile/src/components/modals/MobileReconcileModal.tsx` (375L) | Both support physical bank vs envelope balance reconciliation (`reconcileBankAccount`); Web `ReconciliationModal.tsx` is 451 lines (>400L) | `ARCH-01` |
| **CSV Transaction Upload Modal** | `apps/web/src/components/CsvUploadModal.tsx` (290L) | **MISSING ON MOBILE** | Web supports CSV bank statement parsing & import (`importCsvTransactions`); Mobile has no CSV import modal or `expo-document-picker` flow on Activity tab | `PAR-05` |
| **File Notes / Attachments Drawer & Modal** | `packages/capabilities/file-notes/src/web/FileNotesDrawer.tsx` (276L) | `packages/capabilities/file-notes/src/mobile/NotesFeedModal.tsx` (456L) | Web mounts `FileNotesDrawer` on Envelopes, Transactions, and Bank Accounts; **Mobile `NotesFeedModal` (456L > 400L) is never imported or rendered anywhere in `apps/mobile`** and has undeclared Expo dependencies! | `PAR-04`, `DEP-01`, `ARCH-01`, `SEC-01` |
| **Feedback / Bug Report Modal** | `apps/web/src/components/FeedbackModal.tsx` (210L) | `apps/mobile/src/components/modals/MobileFeedbackModal.tsx` (225L) | Both dispatch via `trpc.expenses.submitFeedback` (`SubmitFeedbackInputSchema` lacks `.strict()` — `SEC-07`; router placement in `expensesRouter` — `ARCH-04`) | `SEC-07`, `ARCH-04` |
| **Product Tour Overlay** | `apps/web/src/components/tour/ProductTourOverlay.tsx` + `ProductTourContext.tsx` | `apps/mobile/src/components/tour/MobileProductTourModal.tsx` + `ProductTourContext.tsx` | Both provide 6-step guided tour with route navigation and "Take Product Tour" re-trigger in Settings | None (Full Parity) |

---

## 4. i18n Cull and Merge List

### 4.1 Summary of `packages/i18n/src/dictionaries/en.ts` Static AST Audit
- **Total Leaf Keys in `en.ts`:** `2,260` across 39 top-level namespaces (`packages/i18n/src/dictionaries/en.ts`, 2,922 lines).
- **Duplicate Top-Level Keys:** `0` (verified via AST property check).
- **`t('key') || 'fallback'` Violations:** `0` across `apps/*` and `packages/*`.
- **Hardcoded Raw JSX Strings / Placeholder / Accessibility Violations:** `0` in production components (all user-facing copy resolves via `t(...)`).
- **Classification Totals:**
  - **`IN USE`:** `2,012` keys (`1,984` via direct `t('...')` calls + `28` via indirect typed lookup maps in `packages/types/src/allocation-presets.ts`, `packages/types/src/setup-steps.types.ts`, `packages/types/src/subscription.types.ts`, `packages/capabilities/budgeting/src/engine/bill-lifecycle-fsm.ts`, and `apps/mobile/src/context/ProductTourContext.tsx`).
  - **`LIKELY UNUSED / DYNAMIC-RISK`:** `43` keys (matched only by dynamic template prefix interpolation `t(\`prefix.${variable}\`)`; must be verified against enum values before culling).
  - **`CONFIRMED UNUSED`:** `205` keys (zero static references, zero indirect map references, and zero dynamic prefix matches anywhere in `apps/*` or `packages/*`).

### 4.2 Complete List of 205 `CONFIRMED UNUSED` Keys (Safe to Cull Immediately)
All 205 keys below reside in `packages/i18n/src/dictionaries/en.ts` and have zero references across the entire monorepo (note: several also contain banned legacy taxonomy such as `Pool`, `lockSplit`, `matrix.lock`, `matrix.unlock`, `reconcile`):

1. `common.paid`
2. `actions.markPaid`
3. `keyboardShortcuts.askPenny`
4. `errors.privateModeDisabledRestore`
5. `dashboard.goals.pacingTarget`
6. `dashboard.goals.justBehind`
7. `dashboard.goals.lagging`
8. `dashboard.goals.onTrackBadge`
9. `dashboard.goals.pace`
10. `dashboard.nextPay.twelveMonthSplit`
11. `assistant.subtitle`
12. `assistant.answers.billPaid`
13. `categories.typeRegular`
14. `categories.essentialBillLabel`
15. `categories.essentialBillHint`
16. `categories.committedGoalLabel`
17. `categories.committedGoalHint`
18. `categories.priorityEnvelopeHint`
19. `categories.confirmDescGenerateEvents`
20. `categories.fullyFunded`
21. `categories.onTrack`
22. `categories.shortfall`
23. `categories.archivePool` *(also violates banned "Pool" taxonomy)*
24. `categories.createPool` *(also violates banned "Pool" taxonomy)*
25. `categories.editPoolTitle` *(also violates banned "Pool" taxonomy)*
26. `categories.essentialBadge`
27. `categories.committedBadge`
28. `categories.billModeLabel`
29. `categories.billModeScheduled`
30. `categories.statusActive`
31. `categories.recurrenceInterval`
32. `categories.confirmArchiveTitle`
33. `categories.confirmArchiveDescription`
34. `categories.tooltips.scheduledBill`
35. `categories.tooltips.flexibleBill`
36. `categoryDrawer.poolType` *(also violates banned "Pool" taxonomy)*
37. `categoryDrawer.perMonth`
38. `modals.reconciliation.title`
39. `modals.incomeExpenseForm.titleEditIncome`
40. `modals.incomeExpenseForm.titleEditExpense`
41. `modals.incomeExpenseForm.titleAddIncome`
42. `goalModes.modeLabel`
43. `goalModes.targetDate`
44. `goalModes.targetDateDesc`
45. `goalModes.ongoing`
46. `goalModes.ongoingDesc`
47. `paydayDrawer.lockSplit` *(also violates banned "Lock/Unlock" terminology)*
48. `paydayDrawer.celebrationBillsCovered`
49. `paydayDrawer.saveChanges`
50. `incomeBillsTabs.shortfallCoveredNote`
51. `incomeBillsTabs.editBillSchedule`
52. `incomeBillsTabs.transferFundsHyperlink`
53. `incomeBillsTabs.noScheduledItemsForSource`
54. `incomeBillsTabs.receivedBadge`
55. `incomeBillsTabs.markReceived`
56. `incomeBillsTabs.archiveIncome`
57. `incomeBillsTabs.archiveExpense`
58. `incomeBillsTabs.editIncomeSchedule`
59. `incomeBillsTabs.startingDate`
60. `incomeBillsTabs.expectedDateLabel`
61. `incomeBillsTabs.scheduledIncomeCount`
62. `incomeBillsTabs.scheduledExpensesCount`
63. `incomeBillsTabs.deleteEventConfirmPrompt`
64. `incomeBillsTabs.householdContribution.percentageSuffix`
65. `matrix.lock` *(also violates banned "Lock/Unlock" terminology)*
66. `matrix.unlock` *(also violates banned "Lock/Unlock" terminology)*
67. `matrix.lockedBadge` *(also violates banned "Lock/Unlock" terminology)*
68. `matrix.saveSplit`
69. `settings.archived.envelopes`
70. `settings.archived.expenses`
71. `settings.archived.bankAccounts`
72. `settings.members.onlyOwnerCanChangeRoles`
73. `settings.bankAccountForm.editTitle`
74. `settings.paydayRules.onlyOwnerCanChangeTooltip`
75. `settings.paydayRules.addRuleButton`
76. `settings.paydayRules.removeRule`
77. `settings.paydayRules.amountLabel`
78. `settings.paydayRules.percentageLabel`
79. `settings.paydayRules.emptyRulesTitle`
80. `settings.paydayRules.emptyRulesSubtitle`
81. `settings.paydayRules.saving`
82. `bankAccounts.reconcile.expectedTooltip`
83. `bankAccounts.reconcile.unaccountedShortfall`
84. `bankAccounts.reconcile.unaccountedSurplus`
85. `bankAccounts.reconcile.surplusNotice`
86. `bankAccounts.reconcile.shortfallNotice`
87. `bankAccounts.syncBalance`
88. `setup.lifestyle.noVehicle`
89. `setup.lifestyle.havePrivateHealth`
90. `setup.lifestyle.havePets`
91. `setup.lifestyle.noDebt`
92. `setup.income.scheduleLabel`
93. `setup.income.scheduleWeekly`
94. `setup.income.scheduleFortnightly`
95. `setup.income.scheduleMonthly`
96. `setup.reviewSummary.subtitle`
97. `setup.sandbox.surplusSwept`
98. `landing.envelopeBlueprintTitle`
99. `landing.envelopeBlueprintSubtitle`
100. `landing.heroCompareOldLabel`
101. `landing.heroCompareOldFriction1`
102. `landing.heroCompareOldFriction2`
103. `landing.heroCompareOldFriction3`
104. `landing.heroIllusionTitle`
105. `landing.heroIllusionBody`
106. `landing.heroCompareNewLabel`
107. `landing.heroInstantVerdict`
108. `landing.heroBentoSimCheck`
109. `landing.heroBentoSimSafe`
110. `landing.heroBentoSimGoalImpact`
111. `landing.heroBentoSimTight`
112. `landing.pillar1Highlight`
113. `landing.pillar2Highlight`
114. `landing.pillar3Highlight`
115. `landing.calcModeSingle`
116. `landing.calcModeCouple`
117. `landing.calcTotalAllocated`
118. `landing.navWhyUs`
119. `landing.navHowItWorks`
120. `landing.navSimulator`
121. `landing.navAdvantages`
122. `landing.waterfallStep1`
123. `landing.waterfallStep2`
124. `landing.waterfallStep3`
125. `landing.step1Badge`
126. `landing.offsetBuffer`
127. `landing.problemSectionBadge`
128. `landing.problemSectionTitle`
129. `landing.problemSectionSubtitle`
130. `landing.problem1Title`
131. `landing.problem1Body`
132. `landing.problem2Title`
133. `landing.problem2Body`
134. `landing.problem3Title`
135. `landing.problem3Body`
136. `landing.problem4Title`
137. `landing.problem4Body`
138. `landing.howItWorksBadge`
139. `landing.howItWorksTitle`
140. `landing.howStep1Title`
141. `landing.howStep1Body`
142. `landing.howStep2Title`
143. `landing.howStep2Body`
144. `landing.howStep3Title`
145. `landing.howStep3Body`
146. `landing.advantagesSectionBadge`
147. `landing.advantagesSectionHeading`
148. `landing.advantagesSectionSubheading`
149. `landing.advantage1Label`
150. `landing.advantage1Title`
151. `landing.advantage1Body`
152. `landing.advantage1Detail1`
153. `landing.advantage1Detail2`
154. `landing.advantage1Detail3`
155. `landing.advantage1Detail4`
156. `landing.advantage2Label`
157. `landing.advantage2Title`
158. `landing.advantage2Body`
159. `landing.advantage2Verdict1`
160. `landing.advantage2Verdict2`
161. `landing.advantage2Verdict3`
162. `landing.advantage2Verdict4`
163. `landing.advantage2Verdict5`
164. `landing.advantage3Label`
165. `landing.advantage3Title`
166. `landing.advantage3Body`
167. `landing.advantage3SharedTitle`
168. `landing.advantage3SharedDesc`
169. `landing.advantage3PrivateTitle`
170. `landing.advantage3PrivateDesc`
171. `landing.advantage3Caption`
172. `landing.simTimelineBadge`
173. `landing.simMilestoneBadge`
174. `landing.simTimelineTitle`
175. `landing.simTimelineSubtitle`
176. `landing.simDay0`
177. `landing.simDay3`
178. `landing.simDay7`
179. `landing.simDay14`
180. `landing.simDay18`
181. `landing.simDay28`
182. `landing.simEventPayday1`
183. `landing.simEventRent`
184. `landing.simEventGroceries`
185. `landing.simEventPayday2`
186. `landing.simEventPower`
187. `landing.simEventMilestones`
188. `landing.simPlay`
189. `landing.simPause`
190. `landing.simReset`
191. `landing.simScrubNotice`
192. `landing.simFunded100`
193. `landing.simCheckpointTitle`
194. `landing.simCheckpointAmount`
195. `landing.simCheckpointApply`
196. `landing.simCheckpointCustom`
197. `landing.simTransferTarget`
198. `commandPalette.triggerPlaceholder`
199. `commandPalette.quickJump`
200. `commandPalette.emptyState.recentTitle`
201. `reports.viewReports`
202. `reports.kpi.totalSpend`
203. `reports.kpi.netCashFlow`
204. `reports.kpi.totalAllocated`
205. `reports.kpi.activeFilters`

### 4.3 Complete List of 43 `LIKELY UNUSED / DYNAMIC-RISK` Keys
These 43 keys are referenced only via template-literal prefix expressions (`t(\`assistant.unavailable.${reason}\`)`, `t(\`settings.archived.types.${item.itemType}\`)`, `t(\`settings.paydayRules.stepTypes.${step.stepType}\`)`, `t(\`settings.paydayRules.stepDescriptions.${step.stepType}\`)`, `t(\`bankAccounts.accountTypes.${acc.accountType}\`)`).
- **Sub-classification:**
  - **7 of the 43 keys ARE dead legacy enum keys that should be culled:** `settings.archived.types.POOL` (banned "Pool" enum no longer returned by `listArchivedItems`), `settings.paydayRules.stepTypes.ESSENTIAL_BILLS`, `settings.paydayRules.stepTypes.FLEXIBLE_BILLS`, `settings.paydayRules.stepTypes.COMMITTED_GOALS`, `settings.paydayRules.stepDescriptions.ESSENTIAL_BILLS`, `settings.paydayRules.stepDescriptions.FLEXIBLE_BILLS`, and `settings.paydayRules.stepDescriptions.COMMITTED_GOALS` (legacy pre-v0.4 step types replaced by `PRIORITY_BILLS`, `STANDARD_BILLS`, `PRIORITY_GOALS`, `STANDARD_GOALS`).
  - **36 of the 43 keys are active dynamic enum targets and MUST be retained** (and converted to typed `Record<Enum, TranslationKey>` lookup maps so static analysis can verify them):
    1. `assistant.unavailable.quota_exceeded` (Keep — active `AssistantUnavailableReason`)
    2. `assistant.unavailable.read_only_grace` (Keep — active `AssistantUnavailableReason`)
    3. `assistant.unavailable.disabled` (Keep — active `AssistantUnavailableReason`)
    4. `assistant.unavailable.rate_limited` (Keep — active `AssistantUnavailableReason`)
    5. `assistant.unavailable.unauthenticated` (Keep — active `AssistantUnavailableReason`)
    6. `settings.archived.types.ENVELOPE` (Keep — active `ArchivedItemType`)
    7. `settings.archived.types.POOL` (**CULL** — legacy banned `POOL` item type)
    8. `settings.archived.types.INCOME_SOURCE` (Keep — active `ArchivedItemType`)
    9. `settings.archived.types.BANK_ACCOUNT` (Keep — active `ArchivedItemType`)
    10. `settings.paydayRules.stepTypes.IMMEDIATE_BILLS` (Keep — active `AllocationStepType`)
    11. `settings.paydayRules.stepTypes.DEFICIT_REPAIR` (Keep — active `AllocationStepType`)
    12. `settings.paydayRules.stepTypes.BILLS_SAFETY_FLOOR` (Keep — active `AllocationStepType`)
    13. `settings.paydayRules.stepTypes.PRO_RATA_BILLS` (Keep — active `AllocationStepType`)
    14. `settings.paydayRules.stepTypes.EVERYDAY_ALLOWANCE` (Keep — active `AllocationStepType`)
    15. `settings.paydayRules.stepTypes.PRIORITY_BILLS` (Keep — active `AllocationStepType`)
    16. `settings.paydayRules.stepTypes.STANDARD_BILLS` (Keep — active `AllocationStepType`)
    17. `settings.paydayRules.stepTypes.PRIORITY_GOALS` (Keep — active `AllocationStepType`)
    18. `settings.paydayRules.stepTypes.STANDARD_GOALS` (Keep — active `AllocationStepType`)
    19. `settings.paydayRules.stepTypes.ESSENTIAL_BILLS` (**CULL** — legacy enum value not in `AllocationStepTypeSchema`)
    20. `settings.paydayRules.stepTypes.FLEXIBLE_BILLS` (**CULL** — legacy enum value not in `AllocationStepTypeSchema`)
    21. `settings.paydayRules.stepTypes.COMMITTED_GOALS` (**CULL** — legacy enum value not in `AllocationStepTypeSchema`)
    22. `settings.paydayRules.stepTypes.FIXED_AMOUNT` (Keep — active `AllocationStepType`)
    23. `settings.paydayRules.stepTypes.PERCENTAGE_SPLIT` (Keep — active `AllocationStepType`)
    24. `settings.paydayRules.stepTypes.SURPLUS_SWEEP` (Keep — active `AllocationStepType`)
    25. `settings.paydayRules.stepDescriptions.IMMEDIATE_BILLS` (Keep — active `AllocationStepType`)
    26. `settings.paydayRules.stepDescriptions.DEFICIT_REPAIR` (Keep — active `AllocationStepType`)
    27. `settings.paydayRules.stepDescriptions.BILLS_SAFETY_FLOOR` (Keep — active `AllocationStepType`)
    28. `settings.paydayRules.stepDescriptions.PRO_RATA_BILLS` (Keep — active `AllocationStepType`)
    29. `settings.paydayRules.stepDescriptions.EVERYDAY_ALLOWANCE` (Keep — active `AllocationStepType`)
    30. `settings.paydayRules.stepDescriptions.PRIORITY_BILLS` (Keep — active `AllocationStepType`)
    31. `settings.paydayRules.stepDescriptions.STANDARD_BILLS` (Keep — active `AllocationStepType`)
    32. `settings.paydayRules.stepDescriptions.PRIORITY_GOALS` (Keep — active `AllocationStepType`)
    33. `settings.paydayRules.stepDescriptions.STANDARD_GOALS` (Keep — active `AllocationStepType`)
    34. `settings.paydayRules.stepDescriptions.ESSENTIAL_BILLS` (**CULL** — legacy enum value)
    35. `settings.paydayRules.stepDescriptions.FLEXIBLE_BILLS` (**CULL** — legacy enum value)
    36. `settings.paydayRules.stepDescriptions.COMMITTED_GOALS` (**CULL** — legacy enum value)
    37. `settings.paydayRules.stepDescriptions.FIXED_AMOUNT` (Keep — active `AllocationStepType`)
    38. `settings.paydayRules.stepDescriptions.PERCENTAGE_SPLIT` (Keep — active `AllocationStepType`)
    39. `settings.paydayRules.stepDescriptions.SURPLUS_SWEEP` (Keep — active `AllocationStepType`)
    40. `bankAccounts.accountTypes.EVERYDAY` (Keep — active `BankAccountType`)
    41. `bankAccounts.accountTypes.SAVINGS` (Keep — active `BankAccountType`)
    42. `bankAccounts.accountTypes.CREDIT_CARD` (Keep — active `BankAccountType`)
    43. `bankAccounts.accountTypes.LOAN_OFFSET` (Keep — active `BankAccountType`)

### 4.4 Cross-Platform Duplicate Key Merge Map (`mobile.*` -> Canonical Shared Keys)
`packages/i18n/src/dictionaries/en.ts` defines a 406-key `mobile.*` subtree (used 656 times in `apps/mobile` and 0 times in `apps/web`) that duplicates canonical Web keys with identical or near-identical English strings. Consolidate these representative duplicate clusters into canonical shared keys (`I18N-02`):

| Canonical Key to Keep | Duplicate `mobile.*` Key to Merge & Remove | Shared Copy Value |
| :--- | :--- | :--- |
| `auth.signIn` | `mobile.auth.signInButton` | `"Sign In"` |
| `auth.createAccount` | `mobile.auth.createAccountButton` | `"Create Account"` |
| `auth.emailLabel` | `mobile.auth.emailLabel` | `"Email Address"` |
| `auth.passwordLabel` | `mobile.auth.passwordLabel` | `"Password"` |
| `auth.forgotPassword` | `mobile.auth.forgotPasswordLink` | `"Forgot password?"` |
| `dashboard.quickActions.recordExpense` | `mobile.dashboard.actions.recordExpense` | `"Record Expense"` |
| `dashboard.quickActions.transferFunds` | `mobile.dashboard.actions.transferFunds` | `"Transfer Funds"` |
| `dashboard.quickActions.matchBalance` | `mobile.dashboard.actions.matchBalance` | `"Match Balance"` |
| `dashboard.quickActions.allocatePayday` | `mobile.dashboard.actions.allocatePayday` | `"Allocate Payday"` |
| `categories.newCategory` | `mobile.envelopes.addEnvelope` | `"New Envelope"` |
| `categories.searchPlaceholder` | `mobile.envelopes.searchPlaceholder` | `"Search envelopes..."` |
| `transactions.title` | `mobile.activity.title` | `"Activity"` / `"Transactions"` |
| `transactions.searchPlaceholder` | `mobile.activity.searchPlaceholder` | `"Search transactions..."` |
| `settings.takeProductTour` | `mobile.more.takeTour` | `"Take Product Tour"` |
| `settings.provideFeedback` | `mobile.more.provideFeedback` | `"Provide Feedback"` |
| `common.cancel` | `mobile.common.cancel` | `"Cancel"` |
| `common.save` | `mobile.common.save` | `"Save"` |
| `common.delete` | `mobile.common.delete` | `"Delete"` |

---

## 5. Untested Files List

### 5.1 Tier 1 — Critical Financial, Waterfall, Ledger, Tenant, Auth & Privacy Handlers (Highest Risk)
These files execute financial calculations, ledger mutations, stealth-privacy queries, account erasure, or Stripe webhook state transitions and currently have **zero dedicated unit test files** (or are only lightly touched via a package-level smoke test):

| Workspace | Untested Source File | Lines | Risk & Missing Test Scenarios |
| :--- | :--- | ---: | :--- |
| `@money-matters/capability-file-notes` | `packages/capabilities/file-notes/src/handlers/index.ts` | 363 | **CRITICAL (`SEC-01`):** Presigned R2 upload/download URL generation, `isPrivate` stealth privacy filtering, parent entity ownership checks, quota enforcement, and soft-delete archival (`router.test.ts` is only 70 lines and mocks out handler internals). |
| `@money-matters/capability-file-notes` | `packages/capabilities/file-notes/src/storage.ts` | 110 | R2 S3-compatible presigned PUT/GET URL generation, content-type/size validation, key prefixing by `tenantId`. |
| `@money-matters/capability-budgeting` | `packages/capabilities/budgeting/src/commands/run-allocation.command.ts` | 359 | **CRITICAL:** Payday allocation execution (`runAllocationCommand`), ledger entry creation, `allocationPlans` / `allocationPlanLines` persistence, idempotency, and `revertExecutedAllocation`. |
| `@money-matters/capability-budgeting` | `packages/capabilities/budgeting/src/commands/override-event.command.ts` | 222 | **CRITICAL:** Manual amount/date/status override of scheduled `income_events` and `expense_events` (`overrideEventCommand`). |
| `@money-matters/capability-budgeting` | `packages/capabilities/budgeting/src/queries/get-projected-pool-balances.query.ts` | 220 | **CRITICAL:** 12-month forward balance projection math across envelopes and scheduled events. |
| `@money-matters/capability-budgeting` | `packages/capabilities/budgeting/src/queries/list-envelopes.query.ts` | 166 | Envelope listing with stealth-privacy filtering (`isPrivate`), target pacing, and funding status calculation. |
| `@money-matters/capability-budgeting` | `packages/capabilities/budgeting/src/queries/preview-allocation.query.ts` | 160 | Payday waterfall preview query (`previewAllocationQuery`), custom draft loading, and physical transfer instruction computation. |
| `@money-matters/capability-budgeting` | `packages/capabilities/budgeting/src/queries/get-monthly-summary.query.ts` | 140 | Monthly cashflow, spending by envelope, and net savings aggregation for Reports. |
| `@money-matters/capability-budgeting` | `packages/capabilities/budgeting/src/commands/maintain-rolling-window.command.ts` | 120 | Rolling 12-month event window materialization (`maintainRollingWindowCommand`) and idempotency against duplicate event rows. |
| `@money-matters/capability-budgeting` | `packages/capabilities/budgeting/src/queries/list-archived-items.query.ts` | 119 | Archived envelopes, income sources, and bank accounts query with stealth privacy filtering. |
| `@money-matters/capability-budgeting` | `packages/capabilities/budgeting/src/commands/envelope-schedule.ts` | 93 | Recurring expense event generation helper for envelopes/bills. |
| `@money-matters/capability-budgeting` | `packages/capabilities/budgeting/src/commands/income-schedule.ts` | 89 | Recurring income event generation helper for income schedules. |
| `@money-matters/capability-budgeting` | `packages/capabilities/budgeting/src/queries/get-active-allocation-strategy.query.ts` | 77 | Active household vs personal (`isPrivate`) waterfall strategy resolution. |
| `@money-matters/capability-budgeting` | `packages/capabilities/budgeting/src/commands/bulk-delete-events.command.ts` | 64 | Bulk soft-deletion (`inArray`) of scheduled income and expense events. |
| `@money-matters/capability-budgeting` | `packages/capabilities/budgeting/src/commands/reset-contributions-if-no-private.ts` | 63 | Automatic reset of household contribution mode when last private income source is removed/unmarked. |
| `@money-matters/capability-tenant` | `packages/capabilities/tenant/src/delete-account.ts` | 251 | **CRITICAL:** Destructive account & household erasure (`deleteMyAccountHandler`), sole-owner vs multi-member departure, Stripe subscription cancellation, and R2 cleanup. |
| `@money-matters/capability-tenant` | `packages/capabilities/tenant/src/export-data.ts` | 151 | **CRITICAL (`SEC-02`, `SEC-08`):** Full tenant data export (`exportDataHandler`), stealth privacy filtering of partner records, and CSV formula injection sanitization. |
| `@money-matters/capability-tenant` | `packages/capabilities/tenant/src/handlers/bank-account.ts` | 385 | Bank account CRUD, physical balance reconciliation (`reconcileBankAccount`), and stealth privacy (`isPrivate`) guards (partially covered in `src/index.test.ts`, no dedicated unit test file). |
| `@money-matters/capability-tenant` | `packages/capabilities/tenant/src/handlers/create-tenant.ts` | 263 | Tenant provisioning, `completeFirstRunSetup` batch creation of accounts/envelopes/schedules, and trial activation. |
| `@money-matters/capability-tenant` | `packages/capabilities/tenant/src/handlers/partner-invites.ts` | 148 | Partner invite token generation, expiry validation, acceptance (`acceptPartnerInvite`), and revocation. |
| `@money-matters/capability-tenant` | `packages/capabilities/tenant/src/handlers/member-roles.ts` | 92 | Household owner/member role transitions, member removal, and `leaveHousehold`. |
| `@money-matters/capability-tenant` | `packages/capabilities/tenant/src/handlers/cancel-setup.ts` | 83 | Mid-wizard setup cancellation (`cancelSetupHandler`) and cleanup. |
| `@money-matters/capability-transactions` | `packages/capabilities/transactions/src/queries/list-transactions.query.ts` | 122 | Paginated transaction ledger query with account/envelope/date filters and stealth privacy (`isPrivate`). |
| `@money-matters/capability-transactions` | `packages/capabilities/transactions/src/commands/record-expense.command.ts` | 96 | Atomic expense recording (`recordExpenseCommand`) updating both `transaction_ledger`, `envelopes.currentAmount`, and `bank_accounts.currentBalance`. |
| `@money-matters/capability-transactions` | `packages/capabilities/transactions/src/queries/search-transactions.query.ts` | 71 | Command palette live transaction search query. |
| `@money-matters/capability-billing` | `packages/capabilities/billing/src/webhooks/stripe-webhook-handler.ts` (`+ checkout-completed.ts`, `invoice-events.ts`, `subscription-updated.ts`, `resolve-tenant.ts`) | 312 | Stripe webhook signature verification, `processed_webhooks` idempotency lock, and out-of-order event handling (partially covered in `src/index.test.ts`, no per-handler edge-case tests). |
| `@money-matters/core` | `packages/core/src/auth.ts` | 78 | **CRITICAL:** Neon Auth JWT/cookie verification, session extraction, and user/tenant context resolution. |
| `@money-matters/core` | `packages/core/src/guards/ensure-premium.ts` | 37 | Read-only grace period (`TRIAL_GRACE`, `EXPIRED`, `CANCELED`) mutation guard. |
| `@money-matters/core` | `packages/core/src/user-sync.ts` | 28 | JIT user synchronization from `neon_auth.user` to `public.users`. |

### 5.2 Tier 2 — Untested API Routers, HTTP Routes, Middleware & Inngest Workflows (`apps/api` & `@money-matters/capability-notifications`)
Out of 20 router/procedure files in `apps/api/src/routers/`, **17 have zero dedicated unit test files** (only `assistant.router.test.ts`, `early-access.router.test.ts`, and `setup.router.test.ts` exist):

| Workspace | Untested Source File | Lines | Missing Test Coverage |
| :--- | :--- | ---: | :--- |
| `@money-matters/api` | `apps/api/src/routers/income/income-sources.procedures.ts` | 473 | `listIncomeSources`, `createIncomeSource`, `updateIncomeSource`, `archiveIncomeSource`, `updateContributionMode` (also >400L). |
| `@money-matters/api` | `apps/api/src/routers/payday/payday-matrix.procedures.ts` | 443 | `getPaydayMatrix` 12-month grid construction and stealth privacy filtering (also >400L). |
| `@money-matters/api` | `apps/api/src/routers/tenant/household.procedures.ts` | 375 | `getHouseholdDetails`, `invitePartner`, `acceptPartnerInvite`, `removeHouseholdMember`, `leaveHousehold`, `getSetupState`. |
| `@money-matters/api` | `apps/api/src/routers/income/income-events.procedures.ts` | 365 | `listIncomeEvents`, `createIncomeEvent`, `updateIncomeEvent`, `deleteIncomeEvent`, `markIncomeReceived`. |
| `@money-matters/api` | `apps/api/src/routers/transfers.router.ts` | 346 | `transferFunds` (envelope-to-envelope) and `executeAccountTransfer` (physical bank transfer) + cross-tenant IDOR rejection. |
| `@money-matters/api` | `apps/api/src/routers/tenant/profile.procedures.ts` | 252 | `getUserPreferences`, `updateUserPreferences`, `updateProfile`, `requestPasswordReset` (`SEC-03`). |
| `@money-matters/api` | `apps/api/src/routers/payday/payday-execution.procedures.ts` | 242 | `previewAllocation`, `saveAllocationDraft`, `resetAllocationDraft`, `runAllocation`, `revertExecutedAllocation`, `getAllocationHistory` (`SEC-04`). |
| `@money-matters/api` | `apps/api/src/routers/tenant/tenant-core.procedures.ts` | 225 | `createTenant`, `updateTenantDetails`, `exportMyData` (`SEC-02`), `deleteMyAccount`, `checkEmailRegistered` (`SEC-05`). |
| `@money-matters/api` | `apps/api/src/routers/expenses.router.ts` | 220 | `listExpenseEvents`, `overrideEvent`, `bulkDeleteEvents`, `submitFeedback` (`SEC-07`). |
| `@money-matters/api` | `apps/api/src/routers/tenant/bank-accounts.procedures.ts` | 217 | `listBankAccounts`, `createBankAccount`, `updateBankAccount`, `archiveBankAccount`, `reconcileBankAccount`. |
| `@money-matters/api` | `apps/api/src/routers/notifications.router.ts` | 142 | `getNotificationPreferences`, `updateNotificationPreferences`, `listNotificationDeliveries`, `registerPushToken`. |
| `@money-matters/api` | `apps/api/src/routers/budgeting.router.ts` | 136 | `getHomeSummary`, `listEnvelopes`, `createEnvelope`, `updateEnvelope`, `archiveEnvelope`, `getProjectedPoolBalances`, `getMonthlySummary`, `listArchivedItems`, `restoreArchivedItem`. |
| `@money-matters/api` | `apps/api/src/routers/transactions.router.ts` | 114 | `listTransactions`, `createTransaction`, `updateTransaction`, `archiveTransaction`, `bulkCategorizeTransactions`, `importCsvTransactions`, `searchTransactions`. |
| `@money-matters/api` | `apps/api/src/routers/payday/payday-strategy.procedures.ts` | 107 | `getActiveAllocationStrategy`, `applyAllocationPreset`, `updateAllocationStrategySteps`. |
| `@money-matters/api` | `apps/api/src/routers/file-notes.router.ts` | 105 | `createPreSignedUrl`, `createFileNote`, `listFileNotes`, `getDownloadUrl`, `updateFileNoteComment`, `archiveFileNote`, `purgeFileNote` (`SEC-01`). |
| `@money-matters/api` | `apps/api/src/routers/billing.router.ts` | 76 | `getSubscriptionStatus`, `listInvoices`, `createCheckoutSession`, `createCustomerPortalSession`, `verifyCheckoutSession`, `syncSubscription`. |
| `@money-matters/api` | `apps/api/src/routers/simulation.router.ts` | 38 | `simulatePurchase` router wiring and `privateTenantProcedure` context injection. |
| `@money-matters/api` | `apps/api/src/routes/password-reset.ts` | 87 | `/api/auth/reset-password` POST handler, rate-limit enforcement, and token verification. |
| `@money-matters/api` | `apps/api/src/routes/dev-callback.ts` | 60 | `/api/auth/dev-callback` OAuth redirect allow-list validation and production disablement. |
| `@money-matters/api` | `apps/api/src/routes/stripe-webhook.ts` | 50 | `/webhooks/stripe` raw body parsing and `Stripe-Signature` header verification. |
| `@money-matters/api` | `apps/api/src/middleware/rate-limit.ts` | 50 | Fastify global rate-limit preHandler and route classification. |
| `@money-matters/api` | `apps/api/src/inngest/budgeting-workflows.ts` | 49 | Nightly `maintain-rolling-window` cron workflow and manual `budgeting/maintain.window` fan-out. |
| `@money-matters/api` | `apps/api/src/middleware/cors.ts` | 26 | Fastify CORS origin validation (`*.kaesava.au` and dev `localhost`). |
| `@money-matters/capability-notifications` | `packages/capabilities/notifications/src/inngest.ts` | 205 | Trial lifecycle & retention email workflows (`trial-ending-reminder`, `trial-expired`, `winback`). |
| `@money-matters/capability-notifications` | `packages/capabilities/notifications/src/workflows/weekly-digest.workflow.ts` | 146 | Weekly household financial digest email aggregation and Resend dispatch. |
| `@money-matters/capability-notifications` | `packages/capabilities/notifications/src/workflows/payday-alert.workflow.ts` | 104 | Upcoming payday allocation reminder workflow. |
| `@money-matters/capability-notifications` | `packages/capabilities/notifications/src/workflows/balance-nudge.workflow.ts` | 93 | Low safety-cushion / overdue bill balance nudge workflow. |

### 5.3 Tier 3 — Untested Shared Infrastructure, Assistant, Types & UI Primitives
| Workspace | Untested Source File | Lines | Missing Test Coverage |
| :--- | :--- | ---: | :--- |
| `@money-matters/ui` | `packages/ui/src/mobile/MobileCommandPaletteSheet.tsx` | 812 | Mobile unified search & Ask Penny sheet (0 tests; >400L). |
| `@money-matters/ui` | `packages/ui/src/web/CommandPaletteModal.tsx` | 802 | Web `⌘K` Command Palette & Ask Penny modal (0 tests; >400L). |
| `@money-matters/ui` | `packages/ui/src/web/DatePickerField.tsx` (268L), `ModalDialog.tsx` (185L), `AmountField.tsx` (142L), `ConfirmDialog.tsx` (118L), `PaginationBar.tsx` (115L), `GenericSelectField.tsx` (110L), `SearchInput.tsx` (88L) | 1,026 | Web shared form/modal/table primitives (only `tokens.test.ts` exists in `packages/ui`). |
| `@money-matters/ui` | `packages/ui/src/mobile/MobileModalDialog.tsx` (165L), `AmountInput.tsx` (138L), `MobileConfirmDialog.tsx` (124L), `MobilePaginationBar.tsx` (112L), `SearchSelect.tsx` (145L), `ChipSelect.tsx` (95L) | 779 | Mobile shared form/modal/pagination primitives. |
| `@money-matters/core` | `packages/core/src/formatters.ts` | 135 | Currency (`formatCurrency`), date (`fmtDate`, `fmtDateMedium`), and timezone formatting helpers. |
| `@money-matters/capability-assistant` | `packages/capabilities/assistant/src/llm/gateway.provider.ts` | 98 | Cloudflare AI Gateway / OpenAI / Gemini fetch timeout, retry, and error fallback handling. |
| `@money-matters/capability-assistant` | `packages/capabilities/assistant/src/matcher/date.parser.ts` (60L) & `amount.parser.ts` (25L) | 85 | Natural-language date and monetary amount extraction for deterministic Penny intents. |
| `@money-matters/types` | `packages/types/src/onboarding-quiz.ts` | 408 | Setup wizard lifestyle recommendation presets and monthly/periodic conversion helpers (also >400L). |

### 5.4 Tier 4 — Untested Web & Mobile Hooks, Screens & Non-Conditional E2E Journeys
- **`apps/web` (251 of 255 files lack unit tests):**
  - Critical untested client hooks containing financial/state logic: `apps/web/src/app/dashboard/envelopes/hooks/useEnvelopesTableData.ts` (427L), `apps/web/src/app/dashboard/income-split/components/useIncomeSplitState.ts` (413L), `apps/web/src/app/setup/hooks/useSetupWizardState.ts` (345L), `apps/web/src/app/api/auth/[...auth]/route.ts` (212L).
  - **Playwright E2E (`apps/web/e2e/screen-by-screen.spec.ts`, 386L):** Nearly every assertion is wrapped in `if (await locator.isVisible())` or `if (!url.includes('/sign-in'))`, allowing tests to pass green with 0 assertions when redirected to `/sign-in` (`TEST-01`).
- **`apps/mobile` (220 of 230 files lack unit tests; 0 E2E tests):**
  - Critical untested mobile hooks/screens: `apps/mobile/src/app/(app)/settings/allocation-rules.tsx` (525L), `apps/mobile/src/app/(setup)/categories.tsx` (499L), `apps/mobile/src/app/(app)/reports.tsx` (409L), `apps/mobile/src/components/settings/MobileBankAccountsSection.tsx` (401L), `apps/mobile/src/components/payday/useMobilePaydaySplit.ts` (362L), `apps/mobile/src/hooks/useSetupWizardState.ts` (310L).

---

## 6. Appendix: Phase 0 Complete Inventory

### 6.1 Web & Mobile Routes and Screens Inventory

#### 6.1.1 Web Routes & Screens (`apps/web/src/app`) — 32 Route/Layout/Metadata Files

| Web Route | File Path | Lines | Auth / Guard | Primary Components / Modals / Drawers Rendered |
| :--- | :--- | ---: | :--- | :--- |
| Root Layout | `apps/web/src/app/layout.tsx` | 168 | Public / Root | `TRPCProvider`, `ThemeProvider`, `ToastContainer`, `PostHogProvider`, `CookieConsentBanner` |
| Global Error | `apps/web/src/app/global-error.tsx` | 60 | Public | Next.js global error boundary (`<html><body>`) |
| Global 404 | `apps/web/src/app/not-found.tsx` | 58 | Public | Top-level 404 screen with link to `/` and `/dashboard` |
| `/` | `apps/web/src/app/page.tsx` | 109 | Public | `LandingHeader`, `HeroSection`, `InteractivePaydayEngine`, `ProblemSection`, `HowItWorksSection`, `AdvantagesSection`, `PricingSection`, `FaqSection`, `LandingFooter`, `AuthModal`, `EarlyAccessModal` |
| `/sign-in` | `apps/web/src/app/sign-in/page.tsx` | 120 | Public (`<Suspense>`) | `SignInForm`, `SocialAuthButtons` |
| `/sign-up` | `apps/web/src/app/sign-up/page.tsx` | 134 | Public (`<Suspense>`) | `SignUpForm`, `SocialAuthButtons` |
| `/forgot-password` | `apps/web/src/app/forgot-password/page.tsx` | 330 | Public | Multi-step email/OTP/new-password reset flow (`OtpInput`, `PasswordStrengthIndicator`) |
| `/reset-password` | `apps/web/src/app/reset-password/page.tsx` | 167 | Public (`<Suspense>`) | Token-based password reset form (`PasswordStrengthIndicator`) |
| `/auth-callback` | `apps/web/src/app/auth-callback/page.tsx` | 70 | Public (`<Suspense>`) | OAuth/session callback redirect handler (`trpc.tenant.getMyTenants`) |
| `/dev-callback/[...slug]` | `apps/web/src/app/dev-callback/[...slug]/page.tsx` | 76 | Dev-only | Local OAuth callback bridge |
| `/invite/[token]` | `apps/web/src/app/invite/[token]/page.tsx` | 133 | Public / Auth | Household partner invitation acceptance (`trpc.tenant.getInviteDetails`, `trpc.tenant.acceptInvite`) |
| `/privacy` | `apps/web/src/app/privacy/page.tsx` | 173 | Public | Privacy Policy page (`LandingHeader`, `LandingFooter`) |
| `/terms` | `apps/web/src/app/terms/page.tsx` | 144 | Public | Terms of Service page (`LandingHeader`, `LandingFooter`) |
| `/blog` | `apps/web/src/app/blog/page.tsx` | 124 | Public | Blog index (`BLOG_POSTS` from `apps/web/src/lib/blog-data.ts`) |
| `/blog/[slug]` | `apps/web/src/app/blog/[slug]/page.tsx` | 215 | Public | Blog article detail (`BLOG_POSTS`) |
| `/setup` | `apps/web/src/app/setup/page.tsx` | 400 | Authenticated | 5-step setup wizard (`SetupHeaderBar`, `SetupBankAccountsStep`, `SetupIncomeStep`, `SetupLifestyleStep`, `SetupGoalsStep`, `SetupCategoriesStep`, `EnvelopeFormModal`, `SetupDiscardModal`, `PaydaySandboxModal`) |
| `/subscription/upgrade` | `apps/web/src/app/subscription/upgrade/page.tsx` | 255 | Authenticated (`<Suspense>`) | Plan selection & Stripe Checkout redirect (`ActiveSubscriptionCard`, `trpc.billing.createCheckoutSession`) |
| `/subscription/success` | `apps/web/src/app/subscription/success/page.tsx` | 130 | Authenticated (`<Suspense>`) | Checkout verification (`trpc.billing.verifyCheckoutSession`) |
| `/subscription/manage` | `apps/web/src/app/subscription/manage/page.tsx` | 50 | Authenticated | Redirects to `/dashboard/settings?tab=subscription` |
| `/dashboard` (Layout) | `apps/web/src/app/dashboard/layout.tsx` | 499 | Authenticated + Tenant | `ProductTourProvider`, `FileNotesProvider`, `DashboardDesktopSidebar`, `DashboardMobileHeader`, `DashboardMobileDrawer`, `DashboardFooter`, `TrialBanner`, `CommandPaletteModal`, `FeedbackModal`, `KeyboardShortcutsModal` |
| `/dashboard` | `apps/web/src/app/dashboard/page.tsx` | 364 | Authenticated + Tenant | `DashboardActionStrip`, `BentoPoolsSection`, `NextPaydayCard`, `GoalsProgressStrip`, `BalanceMatchNudgeBanner`, `AttentionItemsList`, `BankAccountsSection`, `DashboardModals` (`QuickActionDrawer`, `ReconciliationModal`, `EnvelopeFormModal`, `AffordCheckModal`, `MarkPaidModal`, `TransferModal`) |
| `/dashboard/envelopes` | `apps/web/src/app/dashboard/envelopes/page.tsx` | 475 | Authenticated + Tenant | `EnvelopesFilterBar`, `PoolsTable`, `PoolTableRowItem`, `QuickActionDrawer`, `EnvelopeFormModal`, `EnvelopeDetailDrawer`, `ConfirmDialog`, `FileNotesDrawer` |
| `/dashboard/income-and-bills` | `apps/web/src/app/dashboard/income-and-bills/page.tsx` | 503 | Authenticated + Tenant (`<Suspense>`) | 3 tabs: `UpcomingTimelineTab` (`TimelineFiltersBar`, `TimelineEventsTable`, `TimelineModals`), `MatrixPlanTab` (`MatrixTableHeader`, `MatrixCellInput`), and Schedules (`IncomeSchedulesCard`, `BillSchedulesCard`, `IncomeFormModal`, `EnvelopeFormModal`, `EnvelopeDetailDrawer`, `FileNotesDrawer`) |
| `/dashboard/income-split` | `apps/web/src/app/dashboard/income-split/page.tsx` | 44 | Authenticated + Tenant (`<Suspense>`) | Renders `IncomeSplitScreen` (`PaydayCelebrationCard`, `PaydayMetricsGrid`, `IncomeEventInlineCard`, `DestinationTransferItem`, `IncomeSplitPoolTable`, `IncomeSplitModals`, `UnsavedSplitExitDialog`, `FileNotesDrawer`) |
| `/dashboard/bank-accounts` | `apps/web/src/app/dashboard/bank-accounts/page.tsx` | 22 | Authenticated + Tenant | Redirects to `/dashboard/settings?tab=bank-accounts` |
| `/dashboard/history` | `apps/web/src/app/dashboard/history/page.tsx` | 88 | Authenticated + Tenant (`<Suspense>`) | 2 tabs: `TransactionsTab` and `PaydayAllocationsTab` (`SlideOverAllocationDrawer`, `FileNotesDrawer`) |
| `/dashboard/afford-check` | `apps/web/src/app/dashboard/afford-check/page.tsx` | 16 | Authenticated + Tenant | Renders `AffordCheckScreen` (`AffordCheckVerdict`, `AffordCheckBreakdown`, `GoalDelayCard`, `AffordCheckSkeleton`) |
| `/dashboard/reports` | `apps/web/src/app/dashboard/reports/page.tsx` | 311 | Authenticated + Tenant + `reports` flag | `SpendingOverviewCard` (`DonutChart`, `BarTrendChart`, `HorizontalRankedBarChart`), KPI summary cards, CSV export |
| `/dashboard/settings` | `apps/web/src/app/dashboard/settings/page.tsx` | 242 | Authenticated + Tenant (`<Suspense>`) | Tabbed settings (`ProfileSection`, `HouseholdDetailsSection`, `PartnerInviteSection`, `HouseholdDangerZoneSection`, `BankAccountsSection`, `AllocationStrategySection`, `SubscriptionSection`, `NotificationsPage`, `PrivacySection`, `ArchivedSection`, `FeedbackModal`, `ConfirmDialog`, version footer) |
| `/dashboard/settings/allocation-rules` | `apps/web/src/app/dashboard/settings/allocation-rules/page.tsx` | 354 | Authenticated + Tenant + `customAllocationRules` flag | Custom payday waterfall strategy step builder (`ConfirmDialog`) |
| `/dashboard/settings/notifications` | `apps/web/src/app/dashboard/settings/notifications/page.tsx` | 163 | Authenticated + Tenant | Notification toggles (`SwitchRow` equivalent, `trpc.notifications.getPreferences`, `trpc.notifications.updatePreferences`) |
| `/dashboard/settings/history` | `apps/web/src/app/dashboard/settings/history/page.tsx` | 41 | Authenticated + Tenant | Redirects to `/dashboard/history` |
| `/dashboard/[...not-found]` | `apps/web/src/app/dashboard/[...not-found]/page.tsx` | 108 | Authenticated + Tenant | Scoped dashboard 404 screen |
| `/api/auth/[...auth]` | `apps/web/src/app/api/auth/[...auth]/route.ts` | 234 | Public / Cookie | Next.js Neon Auth proxy + CSRF origin check + rate-limit header forwarding |
| `/api/trpc/[trpc]` | `apps/web/src/app/api/trpc/[trpc]/route.ts` | 215 | Public / Cookie | Next.js tRPC proxy to Cloudflare Worker API (`NEXT_PUBLIC_API_URL`) |
| `/robots.txt` | `apps/web/src/app/robots.ts` | 21 | Public | Robots metadata route |
| `/sitemap.xml` | `apps/web/src/app/sitemap.ts` | 74 | Public | Sitemap metadata route |

#### 6.1.2 Mobile Routes & Screens (`apps/mobile/src/app`) — 37 Route/Layout Files

| Mobile Route | File Path | Lines | Auth / Guard | Primary Components / Modals / Sheets Rendered |
| :--- | :--- | ---: | :--- | :--- |
| Root Layout | `apps/mobile/src/app/_layout.tsx` | 118 | Public / Root | `AppProviders` (`TRPCProvider`, `CurrencyLocaleProvider`, `DateLocaleProvider`, `IconVisibilityProvider`, `MobileToastProvider`, `NotificationServiceProvider`, `ProductTourProvider`, `SetupWizardProvider`, `FileNotesProvider`), `BiometricLockOverlay`, `MobileConfirmContainer`, `MobileToastContainer` |
| `/` (Entry Redirect) | `apps/mobile/src/app/index.tsx` | 43 | Public / Auth | Redirects to `/(auth)/sign-in`, `/(setup)/accounts`, or `/(app)/home` |
| `+not-found` | `apps/mobile/src/app/+not-found.tsx` | 86 | Public | Unmatched route screen |
| `(auth)` Layout | `apps/mobile/src/app/(auth)/_layout.tsx` | 14 | Public | Expo Router `Stack` for auth screens |
| `/(auth)/sign-in` | `apps/mobile/src/app/(auth)/sign-in.tsx` | 149 | Public | `SignInEmailPasswordFields`, `MobileOtpVerificationView`, `MobileSocialAuthButtons` |
| `/(auth)/sign-up` | `apps/mobile/src/app/(auth)/sign-up.tsx` | 191 | Public | `SignUpFormFields`, `SignUpTermsCheckbox`, `MobileOtpVerificationView`, `MobileSocialAuthButtons` |
| `/(auth)/forgot-password` | `apps/mobile/src/app/(auth)/forgot-password.tsx` | 219 | Public | `ForgotPasswordEmailStep`, `ForgotPasswordOtpStep`, `ForgotPasswordSuccessStep` |
| `/(auth)/reset-password` | `apps/mobile/src/app/(auth)/reset-password.tsx` | 240 | Public | Deep-link token password reset screen (`MobilePasswordStrength`) |
| `/(auth)/invite/[token]` | `apps/mobile/src/app/(auth)/invite/[token].tsx` | 159 | Public / Auth | Partner invite acceptance screen (`trpc.tenant.getInviteDetails`, `trpc.tenant.acceptInvite`) |
| `(setup)` Layout | `apps/mobile/src/app/(setup)/_layout.tsx` | 19 | Authenticated | Expo Router `Stack` for setup wizard |
| `/(setup)/accounts` | `apps/mobile/src/app/(setup)/accounts.tsx` | 124 | Authenticated | Step 1: `SetupProgressBar`, `SetupBankAccountsHeader`, `SetupBankAccountCard` |
| `/(setup)/income` | `apps/mobile/src/app/(setup)/income.tsx` | 343 | Authenticated | Step 2: `SetupProgressBar`, income schedule inputs, `RecurrenceBuilder` |
| `/(setup)/lifestyle` | `apps/mobile/src/app/(setup)/lifestyle.tsx` | 351 | Authenticated | Step 3: `SetupProgressBar`, `LifestyleChildSubCard`, `LifestyleVehicleSubCard`, `MobileDiscretionarySliders` |
| `/(setup)/goals` | `apps/mobile/src/app/(setup)/goals.tsx` | 394 | Authenticated | Step 4: `SetupProgressBar`, `SetupGoalsPresetsGrid`, `SetupGoalCard` |
| `/(setup)/categories` | `apps/mobile/src/app/(setup)/categories.tsx` | 499 | Authenticated | Step 5: `SetupProgressBar`, `SetupCategoriesGoalsList`, `SetupCategoryRow`, `EnvelopeFormModal`, `MobilePaydaySandboxModal` |
| `(app)` Tabs Layout | `apps/mobile/src/app/(app)/_layout.tsx` | 274 | Authenticated + Tenant | Bottom Tabs (`home`, `envelopes`, `paychecks`, `transactions`, `settings`) + hidden routes (`afford-check`, `reports`, `upcoming`, `income-split`, `envelopes/[id]`, `envelopes/projection`, `paychecks/[id]`, `paychecks/schedules`, `paychecks/transfer-instructions`, `settings/*`), `QuickActionFab`, `QuickExpenseModal`, `MobileCommandPaletteSheet`, `MobileAnalyticsConsentPrompt` |
| `/(app)/home` | `apps/mobile/src/app/(app)/home.tsx` | 368 | Authenticated + Tenant | `TrialBanner`, `DashboardHeroCard`, `MobileNextPaydayCard`, `MobileAffordCheckCard`, `GoalsProgressStrip`, `AttentionItemsList`, `BankAccountCard`, `EnvelopeFormModal`, `BankAccountFormModal`, `MobileReconciliationModal`, `MarkPaidModal`, `MobileTransferModal`, `MobileAffordCheckModal`, `QuickExpenseModal`, `LinkedPoolsModalSheet` |
| `/(app)/envelopes` | `apps/mobile/src/app/(app)/envelopes.tsx` | 248 | Authenticated + Tenant | `PoolSummaryCard`, `PoolGroupSection`, `PoolItemCard`, `EnvelopesFilterSheet`, `EnvelopeFormModal`, `MobileEnvelopeDetailSheet`, `PoolOverflowMenuModal`, `QuickExpenseModal` |
| `/(app)/envelopes/[id]` | `apps/mobile/src/app/(app)/envelopes/[id].tsx` | 186 | Authenticated + Tenant | Envelope detail route (`PoolUpcomingSection`, `PoolHistorySection`, `EnvelopeFormModal`) |
| `/(app)/envelopes/projection` | `apps/mobile/src/app/(app)/envelopes/projection.tsx` | 171 | Authenticated + Tenant | `ProjectionScrubber`, `ProjectionPoolGroupSection`, `ProjectionPoolCard` |
| `/(app)/paychecks` | `apps/mobile/src/app/(app)/paychecks.tsx` | 284 | Authenticated + Tenant | Segmented tabs: `UpcomingEventsTab`, `MobileMatrixPlanTab`, `RecurringSchedulesTab`, `PaychecksModalManager` |
| `/(app)/paychecks/[id]` | `apps/mobile/src/app/(app)/paychecks/[id].tsx` | 20 | Authenticated + Tenant | Redirects to `/(app)/income-split/[id]` |
| `/(app)/paychecks/schedules` | `apps/mobile/src/app/(app)/paychecks/schedules.tsx` | 284 | Authenticated + Tenant | Dedicated schedules management screen (`IncomeSourceCard`, `ExpenseBillCard`, `IncomeExpenseFormModal`, `EnvelopeFormModal`, `MobileBurstModal`) |
| `/(app)/paychecks/transfer-instructions` | `apps/mobile/src/app/(app)/paychecks/transfer-instructions.tsx` | 115 | Authenticated + Tenant | Standalone transfer rollup instructions screen |
| `/(app)/income-split` | `apps/mobile/src/app/(app)/income-split.tsx` | 60 | Authenticated + Tenant | Resolves next pending payday and redirects to `/(app)/income-split/[id]` or `/(app)/paychecks` |
| `/(app)/income-split/[id]` | `apps/mobile/src/app/(app)/income-split/[id].tsx` | 237 | Authenticated + Tenant | `MobilePaydayCelebrationCard`, `MobilePaydayMetricsGrid`, `MobileIncomeEventInlineCard`, `MobileBankTransferRollupCard`, `MobileIncomeSplitPoolList`, `MobilePaydayActionButtons`, `MobilePaydayTransferModal`, `MobileUnsavedSplitExitDialog`, `MobileEnvelopeDetailSheet`, `EnvelopeFormModal` |
| `/(app)/upcoming` | `apps/mobile/src/app/(app)/upcoming.tsx` | 12 | Authenticated + Tenant | Redirects to `/(app)/paychecks` |
| `/(app)/transactions` | `apps/mobile/src/app/(app)/transactions.tsx` | 186 | Authenticated + Tenant | Segmented tabs: `LedgerHistoryTab` and `IncomeSplitsTab`, `TransactionDetailSheet`, `MobilePaydayAllocationDetailModal` |
| `/(app)/afford-check` | `apps/mobile/src/app/(app)/afford-check.tsx` | 134 | Authenticated + Tenant | `AffordCheckInputControls`, `AffordCheckVerdictCard`, `AffordCheckBreakdownCard`, `GoalDelayCard` |
| `/(app)/reports` | `apps/mobile/src/app/(app)/reports.tsx` | 409 | Authenticated + Tenant + `reports` flag | `MobileSpendingOverviewCard` (`MobileDonutChart`, `MobileBarTrendChart`, `MobileHorizontalRankedBarChart`), KPI cards, CSV export (`expo-sharing`) |
| `/(app)/settings` | `apps/mobile/src/app/(app)/settings.tsx` | 360 | Authenticated + Tenant | `SettingsActiveHouseholdCard`, `MobileProfileSection`, `HouseholdDetailsSection`, `HouseholdPartnerInviteSection`, `HouseholdDangerZoneSection`, `MobileBankAccountsSection`, `MobileAllocationStrategySection`, `SubscriptionPlanSection`, `SettingsNotificationsCard`, `PrivacyGovernanceSection`, `MobileArchivedSection`, `SettingsVersionFooter`, `FeedbackFormModal`, `MobileTenantSwitcherModal` |
| `/(app)/settings/allocation-rules` | `apps/mobile/src/app/(app)/settings/allocation-rules.tsx` | 525 | Authenticated + Tenant + `customAllocationRules` flag | Custom payday waterfall strategy step builder |
| `/(app)/settings/archived` | `apps/mobile/src/app/(app)/settings/archived.tsx` | 36 | Authenticated + Tenant | Standalone wrapper around `MobileArchivedSection` |
| `/(app)/settings/bank-accounts` | `apps/mobile/src/app/(app)/settings/bank-accounts.tsx` | 15 | Authenticated + Tenant | Redirects to `/(app)/settings?tab=bank-accounts` |
| `/(app)/settings/history` | `apps/mobile/src/app/(app)/settings/history.tsx` | 18 | Authenticated + Tenant | Redirects to `/(app)/transactions` |
| `/(app)/settings/notifications` | `apps/mobile/src/app/(app)/settings/notifications.tsx` | 180 | Authenticated + Tenant | Notification preferences screen (`SwitchRow`, `trpc.notifications.getPreferences`, `trpc.notifications.updatePreferences`) |
| `/(app)/settings/subscription` | `apps/mobile/src/app/(app)/settings/subscription.tsx` | 25 | Authenticated + Tenant | Redirects to `/(app)/settings?tab=subscription` |

---

### 6.2 Modals, Drawers, Bottom Sheets, and Confirm Dialogs Inventory

#### 6.2.1 Web Modals, Drawers & Confirm Dialogs (`apps/web` & `packages/ui/src/web` & `packages/capabilities/file-notes/src/web`)

| Component / Dialog Name | File Path | Lines | Primitive Used | Violation / Notes |
| :--- | :--- | ---: | :--- | :--- |
| `CommandPaletteModal` | `packages/ui/src/web/CommandPaletteModal.tsx` | 802 | Custom `createPortal` modal | File > 400 lines (802 lines); shared in `@money-matters/ui/web` |
| `FileNotesDrawer` | `packages/capabilities/file-notes/src/web/FileNotesDrawer.tsx` | 316 | `SlideOverDrawer`, `ConfirmDialog` | Shared capability drawer for attaching/viewing PDF/image notes |
| `QuickActionDrawer` (`QuickExpenseDrawer`) | `apps/web/src/components/web/QuickExpenseDrawer.tsx` | 371 | `SlideOverDrawer`, `ConfirmDialog` | Renders `CrossBankTransferModal` and `MarkPaidModal` |
| `EnvelopeFormModal` | `apps/web/src/components/web/EnvelopeFormModal.tsx` | 335 | `ModalDialog`, `ConfirmDialog` (x2) | Merged Create/Edit envelope & bill schedule modal |
| `IncomeFormModal` | `apps/web/src/components/web/IncomeFormModal.tsx` | 393 | `ModalDialog`, `ConfirmDialog` (x2) | Merged Create/Edit income schedule modal |
| `MarkPaidModal` | `apps/web/src/app/dashboard/income-and-bills/components/MarkPaidModal.tsx` | 324 | `ModalDialog` | Shortfall resolution & bill payment confirmation modal |
| `TransferModal` | `apps/web/src/components/web/TransferModal.tsx` | 338 | `ModalDialog`, `ConfirmDialog` | Scheduled/pending transfer confirmation modal |
| `CrossBankTransferModal` | `apps/web/src/components/web/CrossBankTransferModal.tsx` | 106 | `ModalDialog` | Cross-bank physical transfer reminder modal |
| `EditUpcomingEventModal` | `apps/web/src/components/web/EditUpcomingEventModal.tsx` | 225 | `ModalDialog` | Edit upcoming income/expense event occurrence |
| `AffordCheckModal` | `apps/web/src/components/web/AffordCheckModal.tsx` | 130 | `ModalDialog` | Dashboard "Can I Afford It?" quick modal |
| `FeedbackModal` | `apps/web/src/components/web/FeedbackModal.tsx` | 194 | `ModalDialog` | Bug report / feedback submission (`trpc.submitFeedback`) |
| `AvatarCropModal` | `apps/web/src/components/web/AvatarCropModal.tsx` | 188 | `ModalDialog` | Avatar zoom/crop canvas modal |
| `TourWelcomeModal` | `apps/web/src/components/web/TourWelcomeModal.tsx` | 62 | `ModalDialog` | Product tour welcome prompt |
| `KeyboardShortcutsModal` | `apps/web/src/app/dashboard/components/KeyboardShortcutsModal.tsx` | 48 | `ModalDialog` | `?` keyboard shortcuts cheat-sheet modal |
| `BankAccountFormModal` | `apps/web/src/app/dashboard/bank-accounts/components/BankAccountFormModal.tsx` | 326 | `ModalDialog`, `ConfirmDialog` (x2) | Merged Create/Edit bank account modal |
| `PaydayTransferModal` | `apps/web/src/app/dashboard/income-split/components/PaydayTransferModal.tsx` | 204 | `ModalDialog` | Post-payday bank transfer checklist modal |
| `PaydaySandboxModal` | `apps/web/src/app/setup/components/PaydaySandboxModal.tsx` | 156 | `ModalDialog` | Setup wizard payday simulation modal |
| `SetupDiscardModal` | `apps/web/src/app/setup/components/SetupDiscardModal.tsx` | 24 | `ConfirmDialog` | Setup wizard discard confirmation |
| `ReconciliationModal` | `apps/web/src/components/ReconciliationModal.tsx` | 451 | **Ad-hoc custom `<div role="dialog">` (L214)** | **VIOLATION (`AGENTS.md §4, §5`)**: Ad-hoc modal (not using `ModalDialog`) and 451 lines (>400 limit) |
| `BankAccountTable` (Linked Envelopes Modal) | `apps/web/src/app/dashboard/bank-accounts/components/BankAccountTable.tsx` | 349 | **Ad-hoc custom `<div className="fixed inset-0">` (L278)** | **VIOLATION (`AGENTS.md §5`)**: Inline ad-hoc modal instead of `ModalDialog` |
| `UnsavedSplitExitDialog` | `apps/web/src/app/dashboard/income-split/components/UnsavedSplitExitDialog.tsx` | 85 | **Ad-hoc custom `<div role="dialog">` (L47)** | **VIOLATION (`AGENTS.md §5`)**: Ad-hoc modal instead of `ModalDialog` / `ConfirmDialog` |
| `AuthModal` | `apps/web/src/components/landing/AuthModal.tsx` | 190 | **Ad-hoc custom `<div role="dialog">` (L70)** | **VIOLATION (`AGENTS.md §5`)**: Ad-hoc modal instead of `ModalDialog` |
| `EarlyAccessModal` | `apps/web/src/components/landing/EarlyAccessModal.tsx` | 121 | **Ad-hoc custom `<div role="dialog">` (L55)** | **VIOLATION (`AGENTS.md §5`)**: Ad-hoc modal instead of `ModalDialog` |
| `SlideOverAllocationDrawer` | `apps/web/src/components/web/SlideOverAllocationDrawer.tsx` | 184 | **Ad-hoc custom `<div className="fixed inset-0">` (L68)** | **VIOLATION (`AGENTS.md §5`)**: Custom drawer instead of `@money-matters/ui/web` `SlideOverDrawer` |
| `EnvelopeDetailDrawer` | `apps/web/src/app/dashboard/income-and-bills/components/EnvelopeDetailDrawer.tsx` | 350 | **Ad-hoc custom `<div className="fixed inset-0">` (L110)** | **VIOLATION (`AGENTS.md §5`)**: Custom drawer instead of `@money-matters/ui/web` `SlideOverDrawer` |
| `DashboardMobileDrawer` | `apps/web/src/app/dashboard/components/DashboardMobileDrawer.tsx` | 34 | Custom mobile nav drawer | Responsive sidebar drawer for `<768px` viewports |
| `PartnerInviteSection` (Role/Revoke Confirms) | `apps/web/src/app/dashboard/settings/components/PartnerInviteSection.tsx` | 165 | `TypedConfirmDialog`, `ConfirmDialog` | Ownership transfer & invite revocation dialogs |
| `HouseholdDangerZoneSection` (Leave/Delete) | `apps/web/src/app/dashboard/settings/components/HouseholdDangerZoneSection.tsx` | 170 | `TypedConfirmDialog` (x2) | Leave household & delete household typed confirmations |
| `TimelineModals` | `apps/web/src/app/dashboard/income-and-bills/components/timeline/TimelineModals.tsx` | 210 | `ConfirmDialog`, `MarkPaidModal`, `TransferModal`, `EditUpcomingEventModal`, `EnvelopeDetailDrawer`, `FileNotesDrawer` | Orchestrates modals for `UpcomingTimelineTab` |
| `IncomeSplitModals` | `apps/web/src/app/dashboard/income-split/components/IncomeSplitModals.tsx` | 165 | `ConfirmDialog` (x3), `PaydayTransferModal`, `EnvelopeDetailDrawer`, `EnvelopeFormModal` | Orchestrates modals for `IncomeSplitScreen` |

#### 6.2.2 Mobile Modals, Bottom Sheets & Confirm Dialogs (`apps/mobile` & `packages/ui/src/mobile` & `packages/capabilities/file-notes/src/mobile`)

| Component / Dialog Name | File Path | Lines | Primitive Used | Violation / Notes |
| :--- | :--- | ---: | :--- | :--- |
| `MobileCommandPaletteSheet` | `packages/ui/src/mobile/MobileCommandPaletteSheet.tsx` | 812 | `MobileModalDialog` | File > 400 lines (812 lines); shared in `@money-matters/ui/mobile` |
| `MobileEnvelopeDetailSheet` | `packages/ui/src/mobile/MobileEnvelopeDetailSheet.tsx` | 325 | `MobileModalDialog` | Shared envelope detail bottom sheet |
| `MobileFileNotesSheet` | `packages/capabilities/file-notes/src/mobile/MobileFileNotesSheet.tsx` | 369 | `MobileModalDialog`, `showMobileConfirm` | Shared capability bottom sheet for file notes |
| `QuickExpenseModal` | `apps/mobile/src/components/QuickExpenseModal.tsx` | 229 | `MobileModalDialog`, `showMobileConfirm` | 3-tab quick action sheet (`QuickExpenseTab`, `QuickIncomeTab`, `QuickTransferTab`) |
| `EnvelopeFormModal` | `apps/mobile/src/components/EnvelopeFormModal.tsx` | 379 | `MobileModalDialog`, `MobileConfirmDialog` (x2) | Merged Create/Edit envelope & bill schedule sheet |
| `IncomeExpenseFormModal` | `apps/mobile/src/components/IncomeExpenseFormModal.tsx` | 268 | `MobileModalDialog`, `MobileConfirmDialog` (x2) | Create/Edit income schedule or one-off event sheet |
| `BankAccountFormModal` | `apps/mobile/src/components/BankAccountFormModal.tsx` | 216 | `MobileModalDialog`, `showMobileConfirm` | Merged Create/Edit bank account sheet |
| `MobileReconciliationModal` | `apps/mobile/src/components/envelopes/MobileReconciliationModal.tsx` | 394 | `MobileModalDialog`, `showMobileConfirm` | Match Bank Balance sheet |
| `MarkPaidModal` | `apps/mobile/src/components/MarkPaidModal.tsx` | 255 | `MobileModalDialog` | Bill payment & shortfall cover sheet |
| `MobileTransferModal` | `apps/mobile/src/components/paychecks/MobileTransferModal.tsx` | 230 | `MobileModalDialog`, `MobileConfirmDialog` | Scheduled transfer confirmation sheet |
| `CrossBankTransferModal` | `apps/mobile/src/components/CrossBankTransferModal.tsx` | 188 | `MobileModalDialog` | Cross-bank transfer reminder modal |
| `EventOverrideModal` | `apps/mobile/src/components/EventOverrideModal.tsx` | 252 | `MobileModalDialog`, `showMobileConfirm` | Edit upcoming income/expense event occurrence |
| `MobileBurstModal` | `apps/mobile/src/components/paychecks/MobileBurstModal.tsx` | 243 | `MobileModalDialog`, `showMobileConfirm` | Schedule occurrence list & inline edit sheet |
| `MobilePaydayTransferModal` | `apps/mobile/src/components/paychecks/MobilePaydayTransferModal.tsx` | 168 | `MobileModalDialog` | Post-payday transfer checklist sheet |
| `MobilePaydayAllocationDetailModal` | `apps/mobile/src/components/paychecks/MobilePaydayAllocationDetailModal.tsx` | 114 | `MobileModalDialog` | Historical payday split breakdown sheet |
| `TransactionDetailSheet` | `apps/mobile/src/components/transactions/TransactionDetailSheet.tsx` | 194 | `MobileModalDialog` | Ledger transaction detail & inline note edit sheet |
| `LinkedPoolsModalSheet` | `apps/mobile/src/components/bank-accounts/LinkedPoolsModalSheet.tsx` | 166 | `MobileModalDialog` | Bank account linked envelopes breakdown sheet |
| `EnvelopesFilterSheet` | `apps/mobile/src/components/envelopes/EnvelopesFilterSheet.tsx` | 91 | `MobileFilterSheet` | Envelopes filter & sort bottom sheet |
| `MobileAffordCheckModal` | `apps/mobile/src/components/afford-check/MobileAffordCheckModal.tsx` | 289 | `MobileModalDialog` | Dashboard "Can I Afford It?" sheet |
| `FeedbackFormModal` | `apps/mobile/src/components/FeedbackFormModal.tsx` | 237 | `MobileModalDialog` | Bug report / feedback sheet (`trpc.submitFeedback`) |
| `MobilePlanPickerModal` | `apps/mobile/src/components/settings/MobilePlanPickerModal.tsx` | 315 | `MobileModalDialog` | Subscription plan picker & Stripe checkout sheet |
| `MobileTenantSwitcherModal` | `apps/mobile/src/components/settings/MobileTenantSwitcherModal.tsx` | 176 | `MobileModalDialog` | Household switcher & create household sheet |
| `MobilePaydaySandboxModal` | `apps/mobile/src/components/setup/MobilePaydaySandboxModal.tsx` | 213 | `MobileModalDialog` | Setup wizard payday simulation sheet |
| `PoolOverflowMenuModal` | `apps/mobile/src/components/envelopes/PoolOverflowMenuModal.tsx` | 142 | **Raw React Native `<Modal>` (L28)** | **VIOLATION (`AGENTS.md §5`)**: Uses raw `<Modal>` instead of `MobileModalDialog` |
| `MobileUnsavedSplitExitDialog` | `apps/mobile/src/components/paychecks/MobileUnsavedSplitExitDialog.tsx` | 164 | **Raw React Native `<Modal>` (L27)** | **VIOLATION (`AGENTS.md §5`)**: Uses raw `<Modal>` instead of `MobileModalDialog` / `MobileConfirmDialog` |

---

### 6.3 tRPC Routers and Procedures Inventory (12 Routers, 103 Procedures)

> **Procedure Type Legend:**
> - `publicProcedure`: Unauthenticated; sets `app.current_tenant_id = ''` and `app.current_user_id = ''`.
> - `authenticatedProcedure`: Requires Neon Auth session (`ctx.userId`); does NOT require `ctx.tenantId`; sets `app.current_user_id = ctx.userId`.
> - `tenantProcedure`: Requires `ctx.userId` and `ctx.tenantId`; sets `app.current_tenant_id = ctx.tenantId` and `app.current_user_id = ''` (empty string!).
> - `ownerProcedure`: `tenantProcedure` + checks `ctx.role === 'OWNER'`.
> - `privateTenantProcedure`: Requires `ctx.userId` and `ctx.tenantId`; sets BOTH `app.current_tenant_id = ctx.tenantId` and `app.current_user_id = ctx.userId`.
> - `privateOwnerProcedure`: `privateTenantProcedure` + checks `ctx.role === 'OWNER'`.

#### 6.3.1 Root Router (`apps/api/src/routers/index.ts` — 126 lines, 3 top-level procedures)

| Procedure | Line | Type | Write / Flag Guard | Input Schema (`.strict()`?) | Output Schema (`.strict()`?) | Capability / DB Tables |
| :--- | ---: | :--- | :--- | :--- | :--- | :--- |
| `health` | 26 | `publicProcedure` | None | None | None | None (`{ status: 'ok', timestamp }`) |
| `getAppConfig` | 30 | `publicProcedure` | None | `z.object({ appId: z.string().uuid().optional() }).optional()` (**NO `.strict()`**) | None | `apps` (`featureFlags` lookup) |
| `submitFeedback` | 53 | `authenticatedProcedure` | None | Inline `z.object({...}).strict()` | None | `sendEmail` (`@money-matters/core`), `posthog` |

#### 6.3.2 `tenant` Router (`apps/api/src/routers/tenant.router.ts` + `apps/api/src/routers/tenant/*.procedures.ts` — 28 procedures)

| Procedure | File & Line | Type | Write / Flag Guard | Input Schema (`.strict()`?) | Output Schema | Capability / DB Tables |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `tenant.createTenant` | `tenant-core.procedures.ts:18` | `authenticatedProcedure` | None | `CreateTenantCommand` (`.strict()`) | None | `createTenantHandler` (`apps`, `users`, `tenants`, `tenantUsers`, `userPreferences`, `bankAccounts`, `allocationStrategies`, `allocationStrategySteps`), `inngest.send('auth/user.signup')` |
| `tenant.completeSetup` | `tenant-core.procedures.ts:57` | `privateOwnerProcedure` | `requiresWriteAccess` | `z.object({ completed: z.boolean().default(true) }).strict()` | None | `tenants`, `bankAccounts`, `incomeSources`, `envelopes`, `inngest.send('onboarding/setup.completed')` |
| `tenant.cancelSetup` | `tenant-core.procedures.ts:103` | `privateOwnerProcedure` | None (**Missing `requiresWriteAccess`**) | None | None | `cancelSetupHandler` (`tenants`) |
| `tenant.getTenant` | `tenant-core.procedures.ts:110` | `tenantProcedure` | None | None | None | `getTenantHandler` (`tenants`) |
| `tenant.exportMyData` | `tenant-core.procedures.ts:116` | `privateTenantProcedure` | None | None | None | `exportDataHandler` (`tenants`, `users`, `userPreferences`, `tenantUsers`, `bankAccounts`, `envelopes`, `incomeSources`, `incomeEvents`, `expenseEvents`, `allocationPlans`, `transactionLedger`) |
| `tenant.deleteMyAccount` | `tenant-core.procedures.ts:121` | `authenticatedProcedure` | None | `z.object({ confirmText: z.literal("DELETE") }).strict()` | None | `deleteMyAccountHandler` (20+ tables + `neon_auth`), `inngest.send('auth/account.deleted')` |
| `tenant.getMyTenants` | `tenant-core.procedures.ts:137` | `authenticatedProcedure` | None | None | None | `tenantUsers`, `tenants` |
| `tenant.switchTenant` | `tenant-core.procedures.ts:165` | `authenticatedProcedure` | None | `z.object({ tenantId: z.string().uuid() }).strict()` | None | `tenantUsers` |
| `tenant.subscribeEarlyAccess` | `tenant-core.procedures.ts:187` | `publicProcedure` | None | `z.object({ email: z.string().email() }).strict()` | None | `earlyAccessSubscribers` |
| `tenant.checkEmailRegistered` | `tenant-core.procedures.ts:214` | `publicProcedure` | None | `z.object({ email: z.string().email() }).strict()` | None | Raw SQL on `neon_auth.user` |
| `tenant.getUserPreferences` | `profile.procedures.ts:9` | `tenantProcedure` | None | None | None | `userPreferences`, `tenantUserPreferences`, `tenants` |
| `tenant.updateUserPreferences` | `profile.procedures.ts:83` | `tenantProcedure` | None | Inline `z.object({...}).strict()` | None | `userPreferences`, `tenantUserPreferences` |
| `tenant.getUserProfile` | `profile.procedures.ts:146` | `authenticatedProcedure` | None | None | None | `users`, `userPreferences`, `tenants` |
| `tenant.updateUserProfile` | `profile.procedures.ts:192` | `authenticatedProcedure` | None | Inline `z.object({...}).strict()` | None | `users`, `neon_auth.user`, `userPreferences` |
| `tenant.createBankAccount` | `bank-accounts.procedures.ts:19` | `privateTenantProcedure` | `requiresWriteAccess` | `CreateBankAccountCommand` (`.strict()`) | None | `createBankAccountHandler` (`bankAccounts`) |
| `tenant.updateBankAccount` | `bank-accounts.procedures.ts:39` | `privateTenantProcedure` | `requiresWriteAccess` | `z.object({ accountId: uuid, data: UpdateBankAccountCommand }).strict()` | None | `updateBankAccountHandler` (`bankAccounts`) |
| `tenant.archiveBankAccount` | `bank-accounts.procedures.ts:50` | `privateTenantProcedure` | `requiresWriteAccess` | `z.object({ accountId: uuid }).strict()` | None | `archiveBankAccountHandler` (`bankAccounts`, `envelopes`, `incomeSources`) |
| `tenant.getBankAccounts` | `bank-accounts.procedures.ts:59` | `privateTenantProcedure` | None | None | None | `getBankAccountsWithMappingsHandler` (`bankAccounts`, `envelopes`, `incomeSources`, `transactionLedger`) |
| `tenant.getBankAccountDeleteImpact` | `bank-accounts.procedures.ts:65` | `privateTenantProcedure` | None | `z.object({ accountId: uuid }).strict()` | None | `bankAccounts`, `envelopes`, `listEnvelopesQuery` |
| `tenant.reconcileBankBalance` | `bank-accounts.procedures.ts:119` | `privateTenantProcedure` | `requiresWriteAccess` | Inline `z.object({...}).strict()` | None | `bankAccounts`, `transactionLedger` |
| `tenant.getLeaveHouseholdStatus` | `household.procedures.ts:69` | `privateTenantProcedure` | None | None | None | `tenantUsers`, `users`, `tenants`, `bankAccounts`, `envelopes` |
| `tenant.invitePartner` | `household.procedures.ts:137` | `ownerProcedure` | `requiresWriteAccess` | `z.object({ email: z.string().email() }).strict()` | None | `invitePartnerHandler` (`tenants`, `tenantUsers`, `users`), `sendEmail`, `inngest.send('household/partner.invited')` |
| `tenant.revokeInvite` | `household.procedures.ts:212` | `ownerProcedure` | `requiresWriteAccess` | `z.object({ inviteId: uuid }).strict()` | None | `tenantUsers` |
| `tenant.getInviteDetails` | `household.procedures.ts:231` | `publicProcedure` | None | `z.object({ token: z.string() }).strict()` | None | `tenantUsers`, `tenants`, `users`, `apps` |
| `tenant.acceptInvite` | `household.procedures.ts:276` | `authenticatedProcedure` | None | `z.object({ token: z.string() }).strict()` | None | `acceptInviteHandler` (`tenantUsers`, `users`) |
| `tenant.leaveHousehold` | `household.procedures.ts:292` | `privateTenantProcedure` | None | `z.object({ confirmText: z.string(), newOwnerUserId: uuid.optional() }).strict()` | None | `leaveTenantHandler` (`tenantUsers`, `users`, `envelopes`, `bankAccounts`, `incomeSources`, `allocationStrategies`, `fileNotes`) |
| `tenant.getHouseholdMembers` | `household.procedures.ts:303` | `tenantProcedure` | None | None | None | `tenantUsers`, `users` |
| `tenant.updateHouseholdSettings` | `household.procedures.ts:320` | `ownerProcedure` | None (**Missing `requiresWriteAccess`**) | Inline `z.object({...}).strict()` | None | `tenantUsers`, `tenants` |
| `tenant.updateHouseholdMemberRole` | `household.procedures.ts:366` | `privateOwnerProcedure` | `requiresWriteAccess` | `UpdateHouseholdMemberRoleCommand` (`.strict()`) | None | `updateHouseholdMemberRoleHandler` (`tenantUsers`) |

#### 6.3.3 `envelopes` Router (`apps/api/src/routers/envelopes.router.ts` — 209 lines, 12 procedures)

| Procedure | Line | Type | Write / Flag Guard | Input Schema (`.strict()`?) | Output Schema | Capability / DB Tables |
| :--- | ---: | :--- | :--- | :--- | :--- | :--- |
| `envelopes.listEnvelopes` | 35 | `privateTenantProcedure` | None | None | None | `listEnvelopesQuery` (`envelopes`, `bankAccounts`, `expenseEvents`, `transactionLedger`) |
| `envelopes.createEnvelope` | 40 | `privateTenantProcedure` | `requiresWriteAccess` | `CreateEnvelopeCommandSchema` (`.strict()`) | None | `createEnvelopeCommand` (`envelopes`, `bankAccounts`, `expenseEvents`) |
| `envelopes.updateEnvelope` | 57 | `privateTenantProcedure` | `requiresWriteAccess` | `UpdateEnvelopeCommandSchema` (`.strict()`) | None | `updateEnvelopeCommand` (`envelopes`, `bankAccounts`, `expenseEvents`) |
| `envelopes.archiveEnvelope` | 62 | `privateTenantProcedure` | `requiresWriteAccess` | `ArchiveEnvelopeCommandSchema` (`.strict()`) | None | `archiveEnvelopeCommand` (`envelopes`, `expenseEvents`, `transferEvents`, `allocationStrategySteps`) |
| `envelopes.listArchivedItems` | 67 | `privateTenantProcedure` | None | None | None | `listArchivedItemsQuery` (`envelopes`, `incomeSources`, `bankAccounts`) |
| `envelopes.restoreArchivedItem` | 75 | `privateTenantProcedure` | `requiresWriteAccess` | `RestoreItemCommand` (`.strict()`) | None | `restoreItemCommand` (`envelopes`, `incomeSources`, `bankAccounts`, `apps`) |
| `envelopes.getEnvelopeRuleChangeImpact` | 88 | `privateTenantProcedure` | None | `z.object({ envelopeId: uuid, fromDate: z.string().optional() }).strict()` | None | `getEnvelopeRuleChangeImpactQuery` (`expenseEvents`) |
| `envelopes.getProjectedEnvelopeBalances` | 101 | `privateTenantProcedure` | None | `GetProjectedEnvelopeBalancesQuerySchema` (`.strict()`) | None | `getProjectedEnvelopeBalancesQuery` (`envelopes`, `incomeEvents`, `expenseEvents`, `allocationPlans`, `allocationPlanLines`) |
| `envelopes.getHomeSummary` | 113 | `privateTenantProcedure` | None | None | None | `getHomeSummaryQuery` (`envelopes`, `bankAccounts`, `incomeEvents`, `expenseEvents`, `transferEvents`, `allocationPlans`, `transactionLedger`) |
| `envelopes.saveSetupBudget` | 124 | `privateOwnerProcedure` | `requiresWriteAccess` | `SaveSetupBudgetInputSchema` (`.strict()`) | None | `saveSetupBudget` (`tenants`, `bankAccounts`, `incomeSources`, `incomeEvents`, `envelopes`, `expenseEvents`, `allocationStrategies`, `allocationStrategySteps`, `transactionLedger`) |
| `envelopes.listPools` (deprecated alias) | 145 | `privateTenantProcedure` | None | None | None | `listEnvelopesQuery` |
| `envelopes.createPool` (deprecated alias) | 150 | `privateTenantProcedure` | `requiresWriteAccess` | `CreateEnvelopeCommandSchema` (`.strict()`) | None | `createEnvelopeCommand` |
| `envelopes.updatePool` (deprecated alias) | 167 | `privateTenantProcedure` | `requiresWriteAccess` | `UpdateEnvelopeCommandSchema` (`.strict()`) | None | `updateEnvelopeCommand` |
| `envelopes.archivePool` (deprecated alias) | 172 | `privateTenantProcedure` | `requiresWriteAccess` | `ArchiveEnvelopeCommandSchema` (`.strict()`) | None | `archiveEnvelopeCommand` |
| `envelopes.getPoolRuleChangeImpact` (deprecated alias) | 177 | `privateTenantProcedure` | None | `z.object({ envelopeId, poolId, fromDate }).strict()` | None | `getEnvelopeRuleChangeImpactQuery` |
| `envelopes.getProjectedPoolBalances` (deprecated alias) | 195 | `privateTenantProcedure` | None | `GetProjectedEnvelopeBalancesQuerySchema` (`.strict()`) | None | `getProjectedEnvelopeBalancesQuery` |

*(Note: `envelopes.router.ts` defines 10 canonical procedures + 6 deprecated `*Pool*` aliases = 16 procedure keys.)*

#### 6.3.4 `income` Router (`apps/api/src/routers/income.router.ts` + `apps/api/src/routers/income/*.procedures.ts` — 12 procedures)

| Procedure | File & Line | Type | Write / Flag Guard | Input Schema (`.strict()`?) | Output Schema | Capability / DB Tables |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `income.createIncomeSource` | `income-sources.procedures.ts:11` | `privateTenantProcedure` | `requiresWriteAccess` | Inline `z.object({...}).strict()` | None | `bankAccounts`, `incomeSources`, `tenants`, `incomeEvents`, `burstIncomeEvents` |
| `income.listIncomeEventsBySource` | `income-sources.procedures.ts:183` | `privateTenantProcedure` | None | `z.object({ incomeSourceId: uuid }).strict()` | None | `incomeSources`, `bankAccounts`, `incomeEvents` |
| `income.getIncomeSourceRuleChangeImpact` | `income-sources.procedures.ts:227` | `privateTenantProcedure` | None | `z.object({ id: uuid, fromDate: z.string().optional() }).strict()` | None | `incomeSources`, `bankAccounts`, `incomeEvents` |
| `income.updateIncomeSource` | `income-sources.procedures.ts:276` | `privateTenantProcedure` | `requiresWriteAccess` | Inline `z.object({ id: uuid, confirmReset: bool, data: z.object({...}).strict() }).strict()` | None | `incomeSources`, `bankAccounts`, `incomeEvents`, `tenants`, `burstIncomeEvents` |
| `income.listIncomeSources` | `income-sources.procedures.ts:439` | `privateTenantProcedure` | None | None | None | `incomeSources`, `bankAccounts` |
| `income.createIncomeEvent` | `income-events.procedures.ts:9` | `privateTenantProcedure` | `requiresWriteAccess` | `CreateIncomeEventCommand` (`.strict()`) | None | `incomeSources`, `bankAccounts`, `incomeEvents` |
| `income.listUpcomingIncomeEvents` | `income-events.procedures.ts:81` | `privateTenantProcedure` | None | None | None | `incomeEvents`, `incomeSources`, `bankAccounts` |
| `income.listIncomeEvents` | `income-events.procedures.ts:144` | `privateTenantProcedure` | None | None | None | `incomeEvents`, `incomeSources`, `bankAccounts` |
| `income.updateIncomeEvent` | `income-events.procedures.ts:199` | `privateTenantProcedure` | `requiresWriteAccess` | Inline `z.object({...}).strict()` | None | `incomeEvents`, `incomeSources`, `bankAccounts` |
| `income.markIncomeReceived` | `income-events.procedures.ts:255` | `privateTenantProcedure` | `requiresWriteAccess` | Inline `z.object({...}).strict()` | None | `incomeEvents`, `incomeSources`, `bankAccounts` |
| `income.deleteIncomeEvent` | `income-events.procedures.ts:317` | `privateTenantProcedure` | `requiresWriteAccess` | `z.object({ eventId: uuid }).strict()` | None | `incomeEvents`, `incomeSources`, `bankAccounts` |
| `income.archiveIncomeSource` | `income-lifecycle.procedures.ts:7` | `privateTenantProcedure` | `requiresWriteAccess` | `z.object({ id: uuid }).strict()` | None | `incomeSources`, `bankAccounts`, `incomeEvents` |

#### 6.3.5 `expenses` Router (`apps/api/src/routers/expenses.router.ts` — 236 lines, 4 procedures)

| Procedure | Line | Type | Write / Flag Guard | Input Schema (`.strict()`?) | Output Schema | Capability / DB Tables |
| :--- | ---: | :--- | :--- | :--- | :--- | :--- |
| `expenses.createExpenseEvent` | 15 | `privateTenantProcedure` | `requiresWriteAccess` | Inline `z.object({...}).strict()` | None | `envelopes`, `expenseEvents` |
| `expenses.listExpenseEventsByEnvelope` | 91 | `privateTenantProcedure` | None | `z.object({ envelopeId: uuid.optional(), categoryId: uuid.optional() }).strict()` | None | `envelopes`, `expenseEvents` |
| `expenses.listExpenseEventsByCategory` (deprecated alias) | 145 | `privateTenantProcedure` | None | `z.object({ categoryId: uuid }).strict()` | None | `envelopes`, `expenseEvents` |
| `expenses.listUpcomingExpenseEvents` | 184 | `privateTenantProcedure` | None | None | None | `expenseEvents`, `envelopes` |

#### 6.3.6 `payday` Router (`apps/api/src/routers/payday.router.ts` + `apps/api/src/routers/payday/*.procedures.ts` — 16 procedures)

| Procedure | File & Line | Type | Write / Flag Guard | Input Schema (`.strict()`?) | Output Schema | Capability / DB Tables |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `payday.resetAllocationPlan` | `payday-execution.procedures.ts:20` | `privateTenantProcedure` | `requiresWriteAccess` | `z.object({ incomeEventId: uuid }).strict()` | None | `incomeEvents`, `incomeSources`, `bankAccounts`, `resetAllocationPlanCommand` (`allocationPlans`, `allocationPlanLines`) |
| `payday.confirmPayday` | `payday-execution.procedures.ts:59` | `privateTenantProcedure` | `requiresWriteAccess` | `ConfirmPaydayCommand` (`.strict()`) | None | `incomeEvents`, `incomeSources`, `bankAccounts`, `runAllocationCommand` (`allocationPlans`, `allocationPlanLines`, `transactionLedger`, `envelopes`, `expenseEvents`) |
| `payday.previewPayday` | `payday-execution.procedures.ts:116` | `privateTenantProcedure` | None | `z.object({ incomeEventId: uuid, overrideAmount: z.string().optional() }).strict()` | None | `incomeEvents`, `incomeSources`, `bankAccounts`, `previewPaydayQuery` |
| `payday.listConfirmedAllocations` | `payday-execution.procedures.ts:163` | `privateTenantProcedure` | None | None | None | `allocationPlans`, `incomeEvents`, `incomeSources`, `bankAccounts`, `allocationPlanLines`, `envelopes` |
| `payday.getIncomeSplitAnalytics` | `payday-execution.procedures.ts:236` | `privateTenantProcedure` | `apps.featureFlags.reports` | `GetIncomeSplitAnalyticsQuerySchema` (`.strict()`) | None | `apps`, `getIncomeSplitAnalyticsQuery` (`allocationPlans`, `allocationPlanLines`, `envelopes`) |
| `payday.overrideEvent` | `payday-matrix.procedures.ts:30` | `privateTenantProcedure` | `requiresWriteAccess` | `OverrideEventCommand` (`.strict()`) | None | `overrideEventCommand` (`incomeEvents`, `expenseEvents`, `envelopes`, `incomeSources`, `bankAccounts`) |
| `payday.deleteUpcomingEvent` | `payday-matrix.procedures.ts:37` | `privateTenantProcedure` | `requiresWriteAccess` | `DeleteUpcomingEventCommand` (`.strict()`) | None | `deleteUpcomingEventCommand` (`incomeEvents`, `expenseEvents`) |
| `payday.bulkDeleteEvents` | `payday-matrix.procedures.ts:44` | `privateTenantProcedure` | `requiresWriteAccess` | `BulkDeleteEventsCommand` (`.strict()`) | None | `bulkDeleteEventsCommand` (`incomeEvents`, `expenseEvents`, `transferEvents`) |
| `payday.saveBulkAllocations` | `payday-matrix.procedures.ts:51` | `privateTenantProcedure` | `requiresWriteAccess` | Inline `z.object({...}).strict()` | None | `incomeEvents`, `incomeSources`, `bankAccounts`, `allocationPlans`, `allocationPlanLines` |
| `payday.saveAutoAllocation` | `payday-matrix.procedures.ts:148` | `privateTenantProcedure` | `requiresWriteAccess` | Inline `z.object({...}).strict()` | None | `incomeEvents`, `incomeSources`, `bankAccounts`, `allocationPlans`, `allocationPlanLines` |
| `payday.getMatrixPlan` | `payday-matrix.procedures.ts:261` | `privateTenantProcedure` | None | Inline `z.object({ horizonMonths: z.number().min(1).max(12).default(12) }).strict().optional()` | None | `envelopes`, `bankAccounts`, `tenants`, `incomeEvents`, `incomeSources`, `expenseEvents`, `allocationPlans`, `allocationPlanLines`, `computeMatrixProjection` |
| `payday.previewAllocation` | `payday-matrix.procedures.ts:435` | `privateTenantProcedure` | None | `z.object({ incomeAmount: z.string() }).strict()` | None | `previewAllocationQuery` |
| `payday.getActiveAllocationStrategy` | `payday-strategy.procedures.ts:20` | `privateTenantProcedure` | None | `z.object({ scope: AllocationStrategyScopeEnum.optional() }).optional()` (**NO `.strict()`**) | None | `getActiveAllocationStrategyQuery`, `seedAllocationStrategyCommand` (`allocationStrategies`, `allocationStrategySteps`) |
| `payday.listAllocationPresets` | `payday-strategy.procedures.ts:41` | `privateTenantProcedure` | None | None | None | `ALLOCATION_PRESETS` (`@money-matters/types`) |
| `payday.applyAllocationPreset` | `payday-strategy.procedures.ts:45` | `privateTenantProcedure` | `requiresWriteAccess` + role check for `HOUSEHOLD` | `ApplyAllocationPresetInputSchema` (`.strict()`) | None | `applyAllocationPresetCommand` (`allocationStrategies`, `allocationStrategySteps`) |
| `payday.updateAllocationStrategySteps` | `payday-strategy.procedures.ts:74` | `privateTenantProcedure` | `requiresWriteAccess` + `customAllocationRules` flag + role check for `HOUSEHOLD` | `UpdateAllocationStrategyStepsInputSchema` (`.strict()`) | None | `apps`, `allocationStrategies`, `updateAllocationStrategyStepsCommand` (`allocationStrategySteps`) |

#### 6.3.7 `transactions` Router (`apps/api/src/routers/transactions.router.ts` — 126 lines, 8 procedures)

| Procedure | Line | Type | Write / Flag Guard | Input Schema (`.strict()`?) | Output Schema | Capability / DB Tables |
| :--- | ---: | :--- | :--- | :--- | :--- | :--- |
| `transactions.moveMoney` | 26 | `privateTenantProcedure` | `requiresWriteAccess` | `MoveMoneyCommand` (`.strict()`) | None | `moveMoneyCommand` (`envelopes`, `transactionLedger`, `expenseEvents`) |
| `transactions.recordManualTransaction` | 36 | `privateTenantProcedure` | `requiresWriteAccess` | `RecordManualTransactionCommand` (`.strict()`) | None | `recordManualTransactionCommand` (`envelopes`, `transactionLedger`, `expenseEvents`) |
| `transactions.updateTransactionNote` | 59 | `privateTenantProcedure` | `requiresWriteAccess` | `UpdateTransactionNoteCommand` (`.strict()`) | None | `updateTransactionNoteCommand` (`transactionLedger`, `envelopes`) |
| `transactions.markExpensePaid` | 69 | `privateTenantProcedure` | `requiresWriteAccess` | `MarkExpensePaidCommand` (`.strict()`) | None | `markExpensePaidCommand` (`expenseEvents`, `envelopes`, `transactionLedger`) |
| `transactions.listEnvelopeTransactions` | 91 | `privateTenantProcedure` | None | `ListEnvelopeTransactionsQuery` (`.strict()`) | None | `listEnvelopeTransactionsQuery` (`transactionLedger`, `envelopes`, `bankAccounts`) |
| `transactions.listPoolTransactions` (deprecated alias) | 99 | `privateTenantProcedure` | None | `ListEnvelopeTransactionsQuery` (`.strict()`) | None | `listEnvelopeTransactionsQuery` |
| `transactions.listTransactions` | 107 | `privateTenantProcedure` | None | `ListTransactionsQuery` (`.strict()`) | None | `listTransactionsQuery` (`transactionLedger`, `envelopes`, `bankAccounts`) |
| `transactions.searchTransactions` | 115 | `privateTenantProcedure` | None | `SearchTransactionsQuery` (`.strict()`) | None | `searchTransactionsQuery` (`transactionLedger`, `envelopes`, `bankAccounts`) |

#### 6.3.8 `transfers` Router (`apps/api/src/routers/transfers.router.ts` — 346 lines, 5 procedures)

| Procedure | Line | Type | Write / Flag Guard | Input Schema (`.strict()`?) | Output Schema | Capability / DB Tables |
| :--- | ---: | :--- | :--- | :--- | :--- | :--- |
| `transfers.createTransferEvent` | 10 | `privateTenantProcedure` | `requiresWriteAccess` | Inline `z.object({...}).strict()` | None | `envelopes`, `transferEvents` |
| `transfers.listUpcomingTransferEvents` | 88 | `privateTenantProcedure` | None | None | None | `transferEvents`, `envelopes`, `bankAccounts` |
| `transfers.deleteTransferEvent` | 190 | `privateTenantProcedure` | `requiresWriteAccess` | `z.object({ eventId: uuid }).strict()` | None | `transferEvents`, `envelopes` |
| `transfers.updateTransferEvent` | 248 | `privateTenantProcedure` | `requiresWriteAccess` | Inline `z.object({...}).strict()` | None | `transferEvents` (**Missing stealth privacy & `PENDING` status checks**) |
| `transfers.executeTransferEvent` | 286 | `privateTenantProcedure` | `requiresWriteAccess` | Inline `z.object({...}).strict()` | None | `transferEvents`, `moveMoneyCommand` (**Missing stealth privacy, `PENDING` check & `tenantId` in update `WHERE`**) |

#### 6.3.9 `billing` Router (`apps/api/src/routers/billing.router.ts` — 70 lines, 5 procedures)

| Procedure | Line | Type | Write / Flag Guard | Input Schema (`.strict()`?) | Output Schema | Capability / DB Tables |
| :--- | ---: | :--- | :--- | :--- | :--- | :--- |
| `billing.getSubscriptionStatus` | 14 | `tenantProcedure` | None | None | None | `getSubscriptionStatusQuery` (`tenants`), `syncSubscriptionFromStripeCommand` |
| `billing.listInvoices` | 35 | `tenantProcedure` | None | None | None | `listInvoicesQuery` (`billingInvoices`) |
| `billing.createCheckoutSession` | 40 | `ownerProcedure` | None | `CreateCheckoutSessionInputSchema` (`.strict()`) | None | `createCheckoutSessionCommand` (`tenants`, `users`, Stripe API) |
| `billing.verifyCheckoutSession` | 53 | `tenantProcedure` | None | `VerifyCheckoutSessionInputSchema` (`.strict()`) | None | `verifyCheckoutSessionCommand` (`tenants`, `billingInvoices`, Stripe API) |
| `billing.createCustomerPortalSession` | 61 | `ownerProcedure` | None | `CreateCustomerPortalSessionInputSchema` (`.strict()`) | None | `createCustomerPortalSessionCommand` (`tenants`, Stripe API) |

#### 6.3.10 `notifications` Router (`apps/api/src/routers/notifications.router.ts` — 68 lines, 4 procedures)

| Procedure | Line | Type | Write / Flag Guard | Input Schema (`.strict()`?) | Output Schema | Capability / DB Tables |
| :--- | ---: | :--- | :--- | :--- | :--- | :--- |
| `notifications.registerPushToken` | 13 | `tenantProcedure` | None | `RegisterPushTokenInputSchema` (`.strict()`) | None | `registerPushTokenCommand` (`deviceTokens`) |
| `notifications.unregisterPushToken` | 24 | `tenantProcedure` | None | `UnregisterPushTokenInputSchema` (`.strict()`) | None | `unregisterPushTokenCommand` (`deviceTokens`) |
| `notifications.getPreferences` | 35 | `tenantProcedure` | None | None | None | `getNotificationPreferencesQuery` (`tenantUserPreferences`) |
| `notifications.updatePreferences` | 45 | `tenantProcedure` | None | `UpdateNotificationPreferencesInputSchema` (`.strict()`) | None | `updateNotificationPreferencesCommand` (`tenantUserPreferences`) |

#### 6.3.11 `simulation` Router (`apps/api/src/routers/simulation.router.ts` — 48 lines, 1 procedure)

| Procedure | Line | Type | Write / Flag Guard | Input Schema (`.strict()`?) | Output Schema | Capability / DB Tables |
| :--- | ---: | :--- | :--- | :--- | :--- | :--- |
| `simulation.canAfford` | 13 | `privateTenantProcedure` | `apps.featureFlags.simulation` | `CanAffordInputSchema` (`.strict()`) | None | `apps`, `canAffordSimulationQuery` (`envelopes`, `bankAccounts`, `incomeEvents`, `expenseEvents`, `allocationPlans`, `allocationPlanLines`, `transactionLedger`) |

#### 6.3.12 `assistant` Router (`apps/api/src/routers/assistant.router.ts` — 103 lines, 2 procedures)

| Procedure | Line | Type | Write / Flag Guard | Input Schema (`.strict()`?) | Output Schema | Capability / DB Tables |
| :--- | ---: | :--- | :--- | :--- | :--- | :--- |
| `assistant.ask` | 25 | `privateTenantProcedure` | `apps.featureFlags.askPenny` + `checkRateLimit('ai-ask:...')` | `AskAssistantInputSchema` (`.strict()`) | `AskAssistantOutputSchema` (`.strict()`) | `apps`, `askAssistantCommand` (`aiUsage`, `tenants`, capability adapters) |
| `assistant.quotaStatus` | 81 | `privateTenantProcedure` | None | None | `AiQuotaStatusSchema` (`.strict()`) | `apps`, `getAiQuotaStatusQuery` (`aiUsage`, `tenants`) |

#### 6.3.13 `fileNotes` Router (`apps/api/src/routers/file-notes.router.ts` — 105 lines, 8 procedures)

| Procedure | Line | Type | Write / Flag Guard | Input Schema (`.strict()`?) | Output Schema (`.strict()`?) | Capability / DB Tables |
| :--- | ---: | :--- | :--- | :--- | :--- | :--- |
| `fileNotes.createPreSignedUrl` | 23 | `privateTenantProcedure` | **Missing `requiresWriteAccess` & `fileNotes` flag** | `CreatePreSignedUrlInput` (`.strict()`) | None | `createPreSignedUrlHandler` (`fileNotes`, R2 S3 presigner) |
| `fileNotes.create` | 33 | `privateTenantProcedure` | **Missing `requiresWriteAccess` & `fileNotes` flag** | `CreateFileNoteInput` (`.strict()`) | `FileNoteDto` (`.strict()`) | `createFileNoteHandler` (`fileNotes`) |
| `fileNotes.list` | 44 | `privateTenantProcedure` | **Missing `fileNotes` flag** | `FileNotesListInput` (`.strict()`) | `z.array(FileNoteDto)` | `listFileNotesHandler` (`fileNotes`, `users`) |
| `fileNotes.getDownloadUrl` | 55 | `privateTenantProcedure` | **Missing `fileNotes` flag** | `z.object({ id: uuid }).strict()` | None | `getDownloadUrlHandler` (`fileNotes`, R2 S3 presigner) |
| `fileNotes.updateComment` | 65 | `privateTenantProcedure` | **Missing `requiresWriteAccess` & `fileNotes` flag** | `UpdateFileNoteCommentInput` (`.strict()`) | `FileNoteDto` (`.strict()`) | `updateFileNoteCommentHandler` (`fileNotes`, `users`) |
| `fileNotes.archive` | 76 | `privateTenantProcedure` | **Missing `requiresWriteAccess` & `fileNotes` flag** | `z.object({ id: uuid }).strict()` | None | `archiveFileNoteHandler` (`fileNotes`) |
| `fileNotes.purge` | 86 | `privateTenantProcedure` | **Missing `requiresWriteAccess` & `fileNotes` flag** | `z.object({ id: uuid }).strict()` | None | `purgeFileNoteHandler` (`fileNotes` **hard delete** + R2 delete) |
| `fileNotes.getStorageQuota` | 96 | `privateTenantProcedure` | None | None | `StorageQuotaDto` (`.strict()`) | `getStorageQuotaHandler` (`fileNotes`) |

---

### 6.4 Database Tables, Columns, Audit Compliance, RLS Status, and Consumers (23 Tables)

| # | SQL Table Name (`Drizzle Export`) | Schema File | Domain Columns | Audit Columns Status (`id`, `tenantId`, `appId`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `archivedAt`, `archivedBy`) | RLS Enabled / Forced in Migrations | RLS Policy Type & Session Vars | Production Code Consumers |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `ai_usage` (`aiUsage`) | `packages/db/src/schema/ai_usage.ts` (26L) | `periodMonth`, `queryCount` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0045`) | `tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/assistant/src/commands/ask-assistant.command.ts`, `queries/get-ai-quota-status.query.ts`, `packages/capabilities/tenant/src/delete-account.ts` |
| 2 | `allocation_plans` (`allocationPlans`) | `packages/db/src/schema/allocation_plan.ts` (16L) | `incomeEventId`, `status`, `totalIncomeAmount`, `confirmedAt` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0047`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (joins `income_events -> income_sources -> bank_accounts` on `app.current_user_id`) | `apps/api/src/routers/payday/*`, `packages/capabilities/budgeting/*`, `simulation/*`, `tenant/src/delete-account.ts`, `tenant/src/export-data.ts` |
| 3 | `allocation_plan_lines` (`allocationPlanLines`) | `packages/db/src/schema/allocation_plan_line.ts` (16L) | `planId`, `envelopeId`, `proposedAmount`, `confirmedAmount`, `reasoning` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0047`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (joins `envelopes` on `app.current_user_id`) | `apps/api/src/routers/payday/*`, `packages/capabilities/budgeting/*`, `simulation/*`, `tenant/src/delete-account.ts` |
| 4 | `allocation_strategies` (`allocationStrategies`) | `packages/db/src/schema/allocation_strategy.ts` (17L) | `name`, `presetKey`, `description`, `isDefault`, `isPrivate`, `userId` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0046`) | `tenant_isolation` ONLY (**GAP**: `0049` added `is_private`/`user_id` but never added a `stealth_privacy_isolation` RLS policy!) | `apps/api/src/routers/payday/payday-strategy.procedures.ts`, `packages/capabilities/budgeting/src/commands/*`, `queries/*`, `tenant/src/handlers/create-tenant.ts`, `partner-invites.ts` |
| 5 | `allocation_strategy_steps` (`allocationStrategySteps`) | `packages/db/src/schema/allocation_strategy_step.ts` (36L) | `strategyId`, `orderIndex`, `stepType`, `targetEnvelopeId`, `config` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0046`) | `tenant_isolation` ONLY (**GAP**: no stealth privacy policy for steps targeting private envelopes or private strategies) | `packages/capabilities/budgeting/src/commands/*`, `queries/*`, `tenant/src/handlers/create-tenant.ts`, `partner-invites.ts` |
| 6 | `apps` (`apps`) | `packages/db/src/schema/app.ts` (22L) | `name`, `slug`, `featureFlags` | Global table: `id`, `createdAt`, `updatedAt` (no `tenantId`/`appId`/`archivedAt`) | **Disabled** (Global catalog table) | None | `apps/api/src/routers/*`, `packages/capabilities/budgeting/src/commands/restore-item.command.ts`, `tenant/src/handlers/create-tenant.ts`, `packages/db/src/set-app-flag.ts` |
| 7 | `bank_accounts` (`bankAccounts`) | `packages/db/src/schema/bank_account.ts` (23L) | `name`, `bankProvider`, `accountType`, `lastKnownBalance`, `unbudgetedBuffer`, `lastBalanceMatchedAt`, `isPrivate`, `userId` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0016`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (`NOT is_private OR user_id = app.current_user_id`) | `apps/api/src/routers/*`, `packages/capabilities/budgeting/*`, `simulation/*`, `tenant/*`, `transactions/*` |
| 8 | `billing_invoices` (`billingInvoices`) | `packages/db/src/schema/billing_invoice.ts` (40L) | `stripeInvoiceId`, `stripeCustomerId`, `stripeSubscriptionId`, `amountPaid`, `currency`, `status`, `paidAt`, `periodStart`, `periodEnd`, `invoicePdfUrl`, `hostedInvoiceUrl` | **Missing `appId` and `archivedBy`** (`createdBy`/`updatedBy` nullable) | Enabled + **Forced** (`0031`) | `billing_invoices_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/billing/src/commands/*`, `queries/list-invoices.ts`, `webhooks/handlers/invoice-events.ts`, `tenant/src/delete-account.ts` |
| 9 | `bug_reports` (`bugReports`) | `packages/db/src/schema/bug_report.ts` (22L) | `title`, `description`, `category`, `severity`, `status`, `appVersion`, `platform`, `pageUrl`, `deviceInfo` | Complete (`tenantAndTimestamps`) | Enabled (`0018`), **NOT Forced** | `tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | **DEAD TABLE IN PROD**: Only referenced in `packages/capabilities/bug-reports/*` (which is never mounted in `apps/api`) and `packages/capabilities/tenant/src/delete-account.ts` |
| 10 | `device_tokens` (`deviceTokens`) | `packages/db/src/schema/device_token.ts` (14L) | `userId`, `platform`, `token` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0031`) | `device_tokens_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `packages/capabilities/notifications/src/push-tokens.ts`, `retention-workflows.ts`, `tenant/src/delete-account.ts` |
| 11 | `early_access_subscribers` (`earlyAccessSubscribers`) | `packages/db/src/schema/early_access.ts` (19L) | `appId`, `email`, `lastSubscribedAt` | Global waitlist table: `id`, `appId`, `createdAt`, `updatedAt` | **Disabled** (Public waitlist table) | None | `apps/api/src/routers/tenant/tenant-core.procedures.ts` |
| 12 | `envelopes` (`envelopes`) | `packages/db/src/schema/envelope.ts` (52L) | `name`, `envelopeType`, `bankAccountId`, `safetyBufferFloor`, `monthlyAmount`, `enteredAmount`, `budgetFrequency`, `startDate`, `endDate`, `rrule`, `targetAmount`, `isSurplusTarget`, `isPrivate`, `userId`, `orderIndex`, `goalType`, `fundingMode`, `isPriority`, `lastNotifiedAt`, `lastBurstDate` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0016`, `0044`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (`NOT is_private OR user_id = app.current_user_id`) | `apps/api/src/routers/*`, `apps/api/src/inngest/*`, `packages/capabilities/budgeting/*`, `notifications/*`, `simulation/*`, `tenant/*`, `transactions/*`, `packages/db/src/queries/envelope-balances.ts` |
| 13 | `expense_events` (`expenseEvents`) | `packages/db/src/schema/expense_event.ts` (37L) | `envelopeId`, `name`, `expectedDate`, `actualDate`, `expectedAmount`, `actualAmount`, `isScheduled`, `note`, `status` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0044`, `0047`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (joins `envelopes` on `app.current_user_id`) | `apps/api/src/routers/*`, `packages/capabilities/budgeting/*`, `notifications/*`, `simulation/*`, `tenant/*`, `transactions/*` |
| 14 | `file_notes` (`fileNotes`) | `packages/db/src/schema/file_note.ts` (40L) | `entityType`, `entityId`, `comment`, `r2ObjectKey`, `fileName`, `fileMimeType`, `fileSizeBytes`, `isPrivate`, `userId` | Complete (`tenantAndTimestamps`) | Enabled (`0051`), **NOT Forced** | `file_notes_tenant_and_stealth_isolation` (permissive combined policy; **missing `FORCE ROW LEVEL SECURITY`**) | `packages/capabilities/file-notes/src/handlers/index.ts`, `packages/capabilities/tenant/src/handlers/partner-invites.ts` |
| 15 | `income_sources` (`incomeSources`) | `packages/db/src/schema/income.ts` (28L) | `name`, `amount`, `incomeType`, `receivingAccountId`, `rrule`, `startDate`, `endDate`, `contributionMode`, `contributionValue`, `lastBurstDate` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0047`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (joins `bank_accounts` on `receiving_account_id`) | `apps/api/src/routers/*`, `apps/api/src/inngest/*`, `packages/capabilities/budgeting/*`, `tenant/*` |
| 16 | `income_events` (`incomeEvents`) | `packages/db/src/schema/income_event.ts` (25L) | `incomeSourceId`, `name`, `expectedDate`, `actualDate`, `expectedAmount`, `actualAmount`, `contributionMode`, `contributionValue`, `note`, `status` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0047`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (joins `income_sources -> bank_accounts`) | `apps/api/src/routers/*`, `packages/capabilities/budgeting/*`, `notifications/*`, `simulation/*`, `tenant/*` |
| 17 | `processed_webhooks` (`processedWebhooks`) | `packages/db/src/schema/processed_webhooks.ts` (9L) | `eventId` (PK), `eventType`, `processedAt` | Global idempotency table (no `id`/`tenantId`/audit cols) | **Disabled** (Global Stripe webhook table) | None | `packages/capabilities/billing/src/webhooks/stripe-webhook-handler.ts`, `packages/capabilities/notifications/src/retention-workflows.ts` |
| 18 | `tenants` (`tenants`) | `packages/db/src/schema/tenant.ts` (46L) | `appId`, `name`, `country`, `currency`, `timezone`, `state`, `postcode`, `premiumEnabled`, `subscriptionStatus`, `trialStartedAt`, `trialEndsAt`, `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`, `subscribedAt`, `subscriptionEndsAt`, `gracePeriodEndsAt`, `cancelAtPeriodEnd`, `planType`, `nextBillingAt`, `trialConvertedAt`, `setupCompletedAt`, `setupStatus` | Has `id`, `appId`, `...timestamps` (root tenant entity; `id` is tenantId) | Enabled + **Forced** (`0014`) | `tenant_isolation`: `id = current_setting('app.current_tenant_id')` | `apps/api/src/routers/*`, `apps/api/src/trpc/edge-context.ts`, `apps/api/src/inngest/*`, `packages/capabilities/assistant/*`, `billing/*`, `budgeting/*`, `notifications/*`, `tenant/*` |
| 19 | `tenant_users` (`tenantUsers`) | `packages/db/src/schema/tenant_user.ts` (37L) | `tenantId`, `userId`, `inviteEmail`, `role`, `inviteToken`, `inviteStatus`, `invitedAt`, `expiresAt` | **Missing `appId`** (`...timestamps` only) | Enabled + **Forced** (`0014`) | `tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `apps/api/src/routers/tenant/*`, `apps/api/src/trpc/edge-context.ts`, `packages/capabilities/notifications/*`, `tenant/*` |
| 20 | `tenant_user_preferences` (`tenantUserPreferences`) | `packages/db/src/schema/tenant_user_preference.ts` (60L) | `userId`, `tenantId`, `appId`, `appPreferences` | Complete (`createdBy`/`updatedBy` nullable) | Enabled + **Forced** (`0040`) | `tenant_user_preferences_tenant_isolation`: `tenant_id = current_setting('app.current_tenant_id')` | `apps/api/src/routers/tenant/*`, `packages/capabilities/notifications/*`, `tenant/src/delete-account.ts` |
| 21 | `transaction_ledger` (`transactionLedger`) | `packages/db/src/schema/transaction_ledger.ts` (43L) | `envelopeId`, `bankAccountId`, `planLineId`, `flowType`, `transactionType`, `amount`, `idempotencyKey`, `note`, `source`, `transferGroupId`, `recordedAt` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0016`, `0044`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (joins `envelopes` on `app.current_user_id`) | `apps/api/src/routers/*`, `packages/capabilities/budgeting/*`, `notifications/*`, `simulation/*`, `tenant/*`, `transactions/*`, `packages/db/src/queries/envelope-balances.ts` |
| 22 | `transfer_events` (`transferEvents`) | `packages/db/src/schema/transfer_event.ts` (19L) | `sourceEnvelopeId`, `destinationEnvelopeId`, `name`, `expectedDate`, `expectedAmount`, `actualAmount`, `status` | Complete (`tenantAndTimestamps`) | Enabled + **Forced** (`0014`, `0044`, `0047`) | `tenant_isolation` + `RESTRICTIVE stealth_privacy_isolation` (checks both `source_envelope_id` and `destination_envelope_id` against `envelopes`) | `apps/api/src/routers/transfers.router.ts`, `packages/capabilities/budgeting/*`, `tenant/src/delete-account.ts` |
| 23 | `users` (`users`) & `user_preferences` (`userPreferences`) | `packages/db/src/schema/user.ts` (24L) & `user_preference.ts` (28L) | `users`: `email`, `displayName`, `avatarUrl`, `hasUsedTrial`; `user_preferences`: `userId`, `theme`, `language`, `timezone`, `showIcons`, `notificationEmail`, `phoneCountryCode`, `phoneNumber` | Global user tables: `users` lacks `createdBy`/`updatedBy`; `user_preferences` lacks `archivedAt`/`archivedBy` | `users`: **Disabled**; `user_preferences`: Enabled (`0004`) but **policy dropped in `0039`!** | **CRITICAL GAP**: `0039` dropped `tenant_isolation` on `user_preferences` and never created a `user_id` policy! | `apps/api/src/routers/tenant/*`, `apps/api/src/trpc/edge-context.ts`, `packages/capabilities/billing/*`, `file-notes/*`, `notifications/*`, `tenant/*` |

---

### 6.5 `packages/ui` Exports and Web/Mobile Consumers Inventory

#### 6.5.1 Package Entrypoints (`packages/ui/package.json`)
- `.` → `packages/ui/src/index.ts` (12 lines; re-exports `DESIGN_TOKENS`, shared hooks/formatters/dates, and `* from "./web/index"`).
- `./web` → `packages/ui/src/web/index.ts` (74 lines; 68 re-export statements).
- `./mobile` → `packages/ui/src/mobile/index.ts` (161 lines; 106 re-export statements).
- `./tokens` → `packages/ui/src/tokens.ts` (83 lines; `DESIGN_TOKENS`).

#### 6.5.2 Completely Unused Component/Hook/Utility Files in `packages/ui/src` (Zero External Production Consumers in `apps/*` or `packages/*`)

| File Path | Lines | Exported Symbols | Status |
| :--- | ---: | :--- | :--- |
| `packages/ui/src/hooks/useZodForm.ts` | 24 | `useZodForm` | **CONFIRMED DEAD** (0 imports across monorepo) |
| `packages/ui/src/lib/month-progress.ts` | 9 | `monthProgress` | **CONFIRMED DEAD** (only imported in `month-progress.test.ts`) |
| `packages/ui/src/web/BillCoverageBadge.tsx` | 42 | `BillCoverageBadge`, `BillCoverageBadgeProps` | **CONFIRMED DEAD** (0 imports across monorepo) |
| `packages/ui/src/web/CardActions.tsx` | 42 | `CardActions`, `CardActionsProps` | **CONFIRMED DEAD** (0 imports across monorepo) |
| `packages/ui/src/web/EnvelopeExplainer.tsx` | 68 | `EnvelopeExplainer` | **CONFIRMED DEAD** (0 imports across monorepo) |
| `packages/ui/src/web/GenericEditForm.tsx` | 223 | `GenericEditForm`, `GenericEditFormProps`, `FormFieldDefinition` | **CONFIRMED DEAD** (0 imports across monorepo) |
| `packages/ui/src/web/RefreshButton.tsx` | 45 | `RefreshButton` | **CONFIRMED DEAD** (0 imports across monorepo) |
| `packages/ui/src/web/RowActions.tsx` | 32 | `RowActions`, `RowActionsProps` | **CONFIRMED DEAD** (0 imports across monorepo) |
| `packages/ui/src/web/SearchSelect.tsx` | 285 | `SearchSelect`, `SearchSelectProps`, `SearchSelectOption` | **CONFIRMED DEAD** (0 imports across monorepo) |
| `packages/ui/src/web/SortHeader.tsx` | 54 | `SortHeader`, `SortHeaderProps`, `SortDirection` | **CONFIRMED DEAD** (0 imports across monorepo — tables use `ResizableTh` or raw `<th>`) |
| `packages/ui/src/web/StatusBadge.tsx` | 28 | `StatusBadge` | **CONFIRMED DEAD** (only imported in `StatusBadge.test.tsx`) |
| `packages/ui/src/web/TextLink.tsx` | 34 | `TextLink`, `TextLinkProps` | **CONFIRMED DEAD** (0 imports across monorepo) |
| `packages/ui/src/web/fields/AmountCentInput.tsx` | 87 | `AmountCentInput`, `AmountCentInputProps` | **CONFIRMED DEAD** (only imported by dead `GenericEditForm.tsx`) |
| `packages/ui/src/web/fields/EmailInput.tsx` | 27 | `EmailInput`, `EmailInputProps` | **CONFIRMED DEAD** (0 imports across monorepo) |
| `packages/ui/src/web/hooks/useFieldActions.ts` | 27 | `useFieldActions` | **CONFIRMED DEAD** (0 imports across monorepo) |
| `packages/ui/src/mobile/BillCoverageBadge.tsx` | 42 | `MobileBillCoverageBadge`, `BillCoverageBadge` | **CONFIRMED DEAD** (0 imports across monorepo) |
| `packages/ui/src/mobile/CollapsibleSection.tsx` | 79 | `MobileCollapsibleSection` | **CONFIRMED DEAD** (0 imports across monorepo) |
| `packages/ui/src/mobile/EnvelopeExplainer.tsx` | 102 | `MobileEnvelopeExplainer`, `EnvelopeExplainer` | **CONFIRMED DEAD** (0 imports across monorepo) |
| `packages/ui/src/mobile/MobileAskSheet.tsx` | 173 | `MobileAskSheet`, `MobileAskSheetProps` | **CONFIRMED DEAD** (superseded by `MobileCommandPaletteSheet`) |
| `packages/ui/src/mobile/MobileAskSheet.styles.ts` | 94 | `styles` | **CONFIRMED DEAD** (only imported by dead `MobileAskSheet.tsx`) |
| `packages/ui/src/mobile/MobileSectionHeader.tsx` | 69 | `MobileSectionHeader` | **CONFIRMED DEAD** (0 imports across monorepo) |
| `packages/ui/src/mobile/SearchSelect.tsx` | 269 | `MobileSearchSelect` | **CONFIRMED DEAD** (0 imports across monorepo) |
| `packages/ui/src/mobile/SearchSelectModal.tsx` | 109 | `SearchSelectModal` | **CONFIRMED DEAD** (only imported by dead `SearchSelect.tsx`) |
| `packages/ui/src/mobile/fields/EmailInput.tsx` | 16 | `MobileEmailInput` | **CONFIRMED DEAD** (0 imports across monorepo) |
| `packages/ui/src/mobile/fields/PhoneInput.tsx` | 14 | `MobilePhoneInput` | **CONFIRMED DEAD** (0 imports across monorepo) |
| `packages/ui/src/mobile/fields/SelectField.tsx` | 278 | `MobileSelectField`, `SelectField` | **CONFIRMED DEAD** (0 imports across monorepo) |
| `packages/ui/src/mobile/fields/SmartEmailInput.tsx` | 145 | `SmartEmailInput` | **CONFIRMED DEAD** (0 imports across monorepo) |
| `packages/ui/src/mobile/fields/SmartPhoneInput.tsx` | 153 | `SmartPhoneInput` | **CONFIRMED DEAD** (0 imports across monorepo) |

---

### 6.6 Inngest Workflows, HTTP/Webhook Endpoints, and Feature Flags Inventory

#### 6.6.1 Active Inngest Workflows Registered in `apps/api/src/inngest/index.ts` (9 Functions)

| Function ID | Trigger (Cron / Event) | File Path & Line | Description & Tables Accessed |
| :--- | :--- | :--- | :--- |
| `welcome-onboarding` | Event: `auth/user.signup` | `packages/capabilities/notifications/src/workflows.ts:13` | Sends welcome email via `sendEmail`, waits 2 days, sends setup nudge (`tenants`) |
| `setup-completed` | Event: `onboarding/setup.completed` | `packages/capabilities/notifications/src/workflows.ts:56` | Sends setup completion summary email (`users`, `tenants`) |
| `account-deleted` | Event: `auth/account.deleted` | `packages/capabilities/notifications/src/workflows.ts:89` | Sends account deletion confirmation email (`sendEmail`) |
| `partner-invited` | Event: `household/partner.invited` | `packages/capabilities/notifications/src/workflows.ts:111` | Waits 3 days, checks `tenantUsers.inviteStatus === 'PENDING'`, sends reminder email |
| `weekly-digest` | Cron: `0 8 * * 1` (Mon 08:00 UTC) | `packages/capabilities/notifications/src/scheduled-workflows.ts:323` | Sends weekly financial digest email to users with `weeklyDigest` enabled (`tenants`, `tenantUsers`, `users`, `userPreferences`, `tenantUserPreferences`, `envelopes`, `expenseEvents`, `incomeEvents`) |
| `data-retention-cleanup` | Cron: `0 3 * * *` (Daily 03:00 UTC) | `packages/capabilities/notifications/src/retention-workflows.ts:13` | Deletes `processedWebhooks` > 90 days, soft-archived `deviceTokens` > 90 days, expired `tenantUsers` invites > 30 days |
| `check-expired-trials` | Cron: `0 0 * * *` (Daily 00:00 UTC) | `apps/api/src/inngest/billing-workflows.ts:14` | Transitions expired `TRIALING` tenants to `TRIAL_GRACE` and expired `TRIAL_GRACE` tenants to `EXPIRED` (`tenants`) |
| `daily-rolling-window-materializer` | Cron: `0 15 * * *` (Daily 15:00 UTC / 01:00 AEST) | `apps/api/src/inngest/budgeting-workflows.ts:10` | Extends 12-month rolling window of `incomeEvents` and `expenseEvents` for all active tenants (`tenants`, `incomeSources`, `envelopes`) |
| `auto-archive-completed-schedules` | Cron: `30 15 * * *` (Daily 15:30 UTC / 01:30 AEST) | `apps/api/src/inngest/budgeting-workflows.ts:57` | Soft-archives `envelopes` and `incomeSources` whose `endDate < today` and have zero `PENDING` events |

> **Unmounted Dead/V2 Inngest Functions in `packages/capabilities/notifications/src/scheduled-workflows.ts`:**
> `notifyPaydayAlert` (L19), `notifyShortfallAlert` (L74), `notifyBillOverdue` (L143), `notifyGoalMilestone` (L204), `notifySpendingVelocity` (L261) — exported in `packages/capabilities/notifications` but excluded from `apps/api/src/inngest/index.ts`.

#### 6.6.2 HTTP & Webhook Endpoints (`apps/api/src/worker.ts` & `apps/web/src/app/api/*`)

| Endpoint | Method(s) | File Path & Line | Auth / Verification | Rate Limit / Security Notes |
| :--- | :--- | :--- | :--- | :--- |
| `/health` | `GET` | `apps/api/src/worker.ts:144` | Public | Returns `{ status: 'ok', runtime: 'cloudflare-workers' }` (bypasses rate limit) |
| `/api/inngest` | `GET`, `POST`, `PUT` | `apps/api/src/worker.ts:154` | Inngest signing key (`INNGEST_SIGNING_KEY`) | Bypasses `enforceApiRateLimit` |
| `/api/webhooks/stripe` | `POST` | `apps/api/src/worker.ts:161` (`apps/api/src/routes/stripe-webhook.ts:15`) | `stripe.webhooks.constructEventAsync` (`stripe-signature` header on raw body) | Idempotency via `processed_webhooks`; bypasses `enforceApiRateLimit` |
| `/api/auth/mobile-google` | `GET` | `apps/api/src/worker.ts:166` (`apps/api/src/routes/mobile-auth.ts:52`) | Public OAuth initiator | Initiates Neon Auth social sign-in for Mobile |
| `/api/auth/mobile-done` | `GET` | `apps/api/src/worker.ts:170` (`apps/api/src/routes/mobile-auth.ts:127`) | OAuth callback cookie/verifier exchange | Redirects to `return_to` deep link (`moneymatters://` or `exp://`) |
| `/api/auth/*` (Worker) | `GET`, `POST` | `apps/api/src/worker.ts:174` (`apps/api/src/routes/auth-proxy.ts:152`) | Proxies to `NEON_AUTH_BASE_URL` | Passes through `enforceApiRateLimit` (`auth` bucket: 10 req / 60s) |
| `/trpc/*` (Worker) | `GET`, `POST` | `apps/api/src/worker.ts:185` | JWT/Cookie session via `createEdgeContext` | Passes through `enforceApiRateLimit` (`mutation`: 100/60s, `query`: 300/60s) |
| `/api/auth/[...auth]` (Web) | `GET`, `POST` | `apps/web/src/app/api/auth/[...auth]/route.ts:159` | CSRF origin check + proxies to `NEON_AUTH_BASE_URL` | **CRITICAL GAP**: Proxies directly from Next.js to `NEON_AUTH_BASE_URL`, completely bypassing `apps/api` and Upstash rate limiting! |
| `/api/trpc/[trpc]` (Web) | `GET`, `POST` | `apps/web/src/app/api/trpc/[trpc]/route.ts:116` | Extracts session token from cookies and forwards to `NEXT_PUBLIC_API_URL/trpc` | Forwards `x-forwarded-for` to Worker API |

#### 6.6.3 Feature Flags Inventory

1. **Static Env Feature Flags (`packages/config/src/feature-flags.ts` — 122 lines):**
   - `FF_AI_ASSISTANT` (`owner: "team-assistant"`, `expiresAt: "2026-12-31"`, default `true`)
   - `FF_PAYDAY_SIMULATION` (`owner: "team-simulation"`, `expiresAt: "2026-12-31"`, default `true`)
   - `FF_BILLING_STRIPE` (`owner: "team-billing"`, `expiresAt: "2026-12-31"`, default `true`)
   - `FF_PUSH_NOTIFICATIONS` (`owner: "team-notifications"`, `expiresAt: "2026-12-31"`, default `true`)
   - `FF_POSTHOG_ANALYTICS` (`owner: "team-platform"`, `expiresAt: "2026-12-31"`, default `true`)
   - **Finding:** `isFeatureEnabled()` and `FEATURE_FLAGS` in `packages/config/src/feature-flags.ts` are **NEVER imported in production code** (only in `packages/config/src/config.test.ts`)!
2. **Database App Feature Flags (`packages/types/src/app-feature-flags.types.ts` & `apps.feature_flags` JSONB column):**
   - `fileNotes` (default `true` in schema, `false` in `DEFAULT_APP_FEATURE_FLAGS`) — consumed on Web (`FileNotesProvider`) & Mobile (`FileNotesProvider`), **NOT enforced in `fileNotesRouter`**.
   - `reports` (default `false`) — consumed in `payday.getIncomeSplitAnalytics`, Web `/dashboard/reports`, Mobile `/(app)/reports`.
   - `askPenny` (default `false`) — consumed in `assistant.ask`, Web `DashboardLayout`, Mobile `(app)/_layout.tsx`.
   - `simulation` (default `false`) — consumed in `simulation.canAfford`, Web `/dashboard/afford-check`, Mobile `/(app)/afford-check`.
   - `customAllocationRules` (default `false`) — consumed in `payday.updateAllocationStrategySteps`, Web `/dashboard/settings/allocation-rules`, Mobile `/(app)/settings/allocation-rules`.

---

### 6.7 i18n Key Count and Per-Area Usage Inventory

- **Total Leaf Keys in `packages/i18n/src/dictionaries/en.ts`:** **2,260** across 16 dictionary files and 47 top-level namespaces.
- **Duplicate Top-Level or Nested Keys:** **0** (verified via AST parser).
- **`ja.ts` Status:** Archived at `packages/i18n/archive/ja.ts` (2,276 lines); 0 active imports in production or test files (though `V2_SCOPE.md:26` and `packages/i18n/src/index.ts:11` document the wrong path `packages/i18n/src/dictionaries/archive/ja.ts`).
- **Usage Classification Across Monorepo:**
  - `IN USE` (direct `t()` or indirect key-map in production code): **2,012 keys**
  - `LIKELY UNUSED / DYNAMIC-RISK` (matched by template literal prefixes or test-only references): **43 keys**
  - `CONFIRMED UNUSED` (zero references in production or test code): **205 keys** (enumerated in full in Section 4.1).

| Dictionary File (`packages/i18n/src/dictionaries/en/*.ts`) | Total Keys | Web `t()` Calls (Distinct Keys) | Mobile `t()` Calls (Distinct Keys) | API `t()` Calls (Distinct Keys) | Packages `t()` Calls (Distinct Keys) |
| :--- | ---: | ---: | ---: | ---: | ---: |
| `auth.ts` (`auth`, `tenantSwitcher`, `partner`) | 83 | 133 (74) | 132 (76) | 0 (0) | 1 (1) |
| `commandPalette.ts` (`commandPalette`) | 26 | 4 (2) | 0 (0) | 0 (0) | 40 (21) |
| `common.ts` (`common`, `nav`, `actions`, `badges`, `tables`, `forms`, `toasts`, `tooltips`, `validation`, `notFound`, `networkError`, `keyboardShortcuts`, `errors`, `legal`, `location`, `app`, `searchSelect`) | 210 | 302 (136) | 307 (98) | 0 (0) | 133 (79) |
| `dashboard.ts` (`dashboard`, `home`, `cards`, `assistant`) | 131 | 83 (71) | 96 (78) | 0 (9) | 18 (19) |
| `envelopes.ts` (`envelopes`, `categories`, `categoryDrawer`, `drawers`, `modals`, `poolTypes`, `quickPick`, `goalModes`) | 309 | 290 (201) | 271 (177) | 0 (0) | 82 (42) |
| `feedback.ts` (`feedback`) | 26 | 25 (25) | 25 (25) | 0 (0) | 0 (0) |
| `fileNotes.ts` (`fileNotes`) | 16 | 2 (2) | 2 (1) | 0 (0) | 27 (16) |
| `incomeBills.ts` (`incomeBillsTabs`, `incomeAndBills`, `schedules`, `matrix`, `billCoverage`, `expenseStatus`) | 133 | 75 (66) | 100 (81) | 0 (0) | 11 (16) |
| `landing.ts` (`landing`) | 292 | 230 (192) | 5 (3) | 0 (0) | 0 (0) |
| `payday.ts` (`payday`, `paydayDrawer`, `paychecks`) | 99 | 86 (75) | 103 (79) | 0 (0) | 14 (8) |
| `privacy.ts` (`privacy`, `terms`, `public`) | 144 | 136 (135) | 22 (21) | 0 (5) | 4 (4) |
| `reports.ts` (`reports`) | 18 | 12 (9) | 8 (8) | 0 (0) | 0 (0) |
| `settings.ts` (`settings`, `subscription`, `notifications`, `bankAccounts`) | 382 | 341 (281) | 294 (247) | 4 (3) | 16 (22) |
| `setup.ts` (`setup`) | 176 | 177 (151) | 169 (153) | 0 (0) | 5 (9) |
| `tour.ts` (`tour`) | 38 | 7 (33) | 7 (33) | 0 (0) | 12 (5) |
| `transactions.ts` (`transactions`, `canIAfford`) | 177 | 133 (101) | 101 (84) | 0 (0) | 78 (43) |
| **Total** | **2,260** | **2,036 (1,554)** | **1,642 (1,165)** | **4 (17)** | **441 (245)** |

---

## 7. Not Verified List

Because this audit operated under **Hard Constraint §2 (Strictly Static Audit — Zero Shell Command Execution, Zero Network/DB Access, Zero Secret File Reads)**, the following items could **not** be verified directly and must be verified during remediation execution:

1. **Live Execution of `pnpm validate` / `pnpm validate:prod`:**
   - What could not be verified: Actual runtime exit codes and console outputs of `pnpm lint`, `pnpm typecheck`, `pnpm check:i18n`, `pnpm audit:schema`, `pnpm test:coverage`, `pnpm build`, and `pnpm test:e2e`.
   - Why: Shell commands (`pnpm`, `tsc`, `vitest`, `playwright`, `eslint`) are forbidden in this static audit. Static failure inferences (`DEP-01`, `VAL-01`, `TEST-01`) are documented in Section 2.
2. **Live Neon PostgreSQL Database State, Active Roles & Applied Migrations:**
   - What could not be verified: Whether the production/staging Neon PostgreSQL instance connects as `mm_app` (non-superuser, RLS-enforced) or `neondb_owner` (table owner), and whether all 57 migrations (`0001`–`0057`) in `packages/db/drizzle/` have been applied without drift in staging/production.
   - Why: Network and database connections are forbidden. Audited strictly via SQL migration files and `packages/db/drizzle/meta/_journal.json`.
3. **Secret Values & Environment Variable Provisioning (`.env*`, `.dev.vars*`, Cloudflare Secrets, GitHub Actions Secrets, EAS Secrets):**
   - What could not be verified: Whether production secrets (`DATABASE_URL`, `NEON_AUTH_BASE_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `INNGEST_SIGNING_KEY`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) are populated, rotated, and non-empty across Cloudflare Workers, GitHub Actions, and Expo EAS.
   - Why: Opening `.env*`, `.dev.vars*`, `seed_credentials.local.md`, or `.aider*` or querying cloud providers is forbidden.
4. **Actual Vitest Line/Branch Coverage Percentages:**
   - What could not be verified: Exact V8 runtime line/branch coverage percentages per package.
   - Why: `vitest --coverage` could not be executed; instead, a complete static file-by-file inventory of all untested source files was compiled in Section 5.
5. **Runtime Android Device / Hermes Rendering & Native Gesture/Biometric Behavior:**
   - What could not be verified: Physical frame-time (60fps) profiling on Android hardware, native `expo-local-authentication` biometric prompt behavior, and native keyboard avoidance on physical Android devices.
   - Why: Running Expo/Android emulators is forbidden in a static audit.

---

## 8. Definition of Done

The Money Matters monorepo (`Web + Mobile + API + Packages`) is ready for production launch **only** when every criterion below is satisfied:

1. **Zero P0 or P1 Open Items:** Every `P0` (`SEC-01`, `SEC-02`, `SEC-03`, `SEC-04`, `DEP-01`, `VAL-01`, `VAL-02`) and `P1` (`SEC-05`, `SEC-06`, `SEC-07`, `SEC-08`, `ARCH-01`, `ARCH-02`, `ARCH-03`, `PAR-04`, `PAR-05`, `PAR-06`, `PAR-07`, `TEST-01`, `TEST-02`) plan item in Section 2 is implemented, reviewed, and merged.
2. **100% Tenant & Stealth Privacy RLS Enforcement:**
   - Migrations `0058` and `0059` are applied, enforcing `FORCE ROW LEVEL SECURITY` and `GRANT ... TO mm_app` across all tenant/user tables (`file_notes`, `allocation_strategies`, `user_preferences`, `bug_reports`, and all financial tables) and `stealth_privacy_isolation` on `allocation_strategies`.
   - Every sensitive procedure (`exportMyData`, `getAllocationHistory`, `getUserPreferences`, `updateUserPreferences`, `getHouseholdDetails`, `removeHouseholdMember`, `leaveHousehold`, `submitFeedback`, and all `fileNotes.*` procedures) uses `privateTenantProcedure` and enforces `(isPrivate = false OR userId = ctx.userId)`.
3. **100% Schema & Documentation Sync:**
   - Every domain table in `packages/db/src/schema/*` includes `id`, `tenantId` (where applicable), `appId` (`varchar(50)`), `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `archivedAt`, `archivedBy`.
   - `pnpm audit:schema` passes with zero unreferenced columns and 100% 1-to-1 parity between `packages/db/src/schema/*` and `SCHEMA_DATA_DICTIONARY.md`.
4. **Strict Code Quality, File Size & Dependency Hygiene:**
   - Zero source or test file exceeds **400 lines** (all 19 offenders in `ARCH-01` refactored below 400 lines).
   - Zero `any`, `as any`, `as never`, `@ts-ignore`, or `@ts-expect-error` across all workspaces.
   - Zero phantom dependencies in any workspace `package.json`; `rm -f apps/mobile/.tsbuildinfo && pnpm typecheck` passes with 0 errors across all 22 workspaces.
5. **100% i18n & Design Token Cleanliness:**
   - All 212 dead/banned keys (`I18N-01`) are removed from `packages/i18n/src/dictionaries/en.ts`, duplicate `mobile.*` keys (`I18N-02`) are merged into canonical namespaces, and `pnpm check:i18n` passes with 0 unused keys and 0 banned taxonomy terms (`Pool`, `Bucket`, `Lock/Unlock`).
   - All 28 unused files in `packages/ui/src/` (`DEAD-01`) and stale root planning files (`DEAD-02`) are deleted.
   - Zero inline hex literals outside `DESIGN_TOKENS` (`UI-02`) and zero `.toISOString().split('T')[0]` UTC date bugs (`UI-03`).
6. **Full Web & Mobile Parity:**
   - Every screen, modal, drawer, and action in the Section 3 Parity Matrix achieves full functional and copy parity across Web and Mobile (including Mobile `NotesFeedModal`, CSV Transaction Import, Bulk Categorize, Profile Avatar Upload, and Notification Delivery History).
7. **Green Validation & Non-Conditional E2E Gate:**
   - All Tier 1 and Tier 2 capabilities and API routers have passing Vitest unit tests (`TEST-02`).
   - `apps/web/e2e/screen-by-screen.spec.ts` runs against an authenticated seeded tenant with zero `if (await locator.isVisible())` conditional bypasses (`TEST-01`).
   - `pnpm validate:prod` exits `0` end-to-end.

---

## 9. Self-Check

- [x] Every Phase 0 inventory section is populated and complete (`6.1` Web & Mobile routes/screens, `6.2` Modals/Drawers/Confirm dialogs, `6.3` All 103 tRPC procedures across 12 routers, `6.4` All 23 DB tables & RLS policies, `6.5` All `packages/ui` exports & 28 unused files, `6.6` All 7 Inngest workflows, HTTP endpoints & feature flags, `6.7` All 2,260 i18n keys & per-area usage).
- [x] Every screen and modal appears in the parity matrix (Section `3.1` covers all 20 screen groups across Web and Mobile; Section `3.2` covers all 10 modals/drawers/overlays).
- [x] Every AGENTS.md section (`§1`–`§7` in current `AGENTS.md` and `§1`–`§27` in historical `_BAK_AGENTS.md`) and every relevant `.agents/skills/*` (`build-feature`, `plan-feature`) was examined, with either findings or a "no findings" note (Section `2.6` Coverage Matrix).
- [x] Every finding has a file path, line number, and concrete fix (all plan items in Section `2.1`–`2.4` include all 11 required fields with exact `path:line` evidence).
- [x] No list uses "etc." or is truncated (all 19 files > 400 lines, all 28 unused `packages/ui` files, all 205 `CONFIRMED UNUSED` i18n keys, all 43 `LIKELY UNUSED` i18n keys, all 103 tRPC procedures, and all 23 DB tables are enumerated in full).
- [x] The "Not Verified" list (Section `7`) is honest and complete.
