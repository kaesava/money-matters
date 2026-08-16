# Money Matters — Production Readiness Master Implementation Plan

> **Audit Scope:** Web application (`apps/web`), API server (`apps/api`), shared packages (`core`, `db`, `types`, `ui`, `i18n`, `config`, `capabilities/*`), CI/CD, database schemas/RLS, and security.  
> **Standard:** Strict compliance with `AGENTS.md` monorepo rules, `TECHNICAL_SPEC.md`, `FUNCTIONAL_SPEC.md`, and OWASP Top 10 security standards.  
> **Execution Model:** Discrete, unambiguous, AI-executable tasks with exact file paths, code changes, and validation commands.

---

## Table of Contents
1. [Phase 1 — Priority 1 Launch Blockers: Security (SEC)](#phase-1--priority-1-launch-blockers-security-sec)
2. [Phase 2 — Priority 1 Launch Blockers: Database & Data Integrity (DB)](#phase-2--priority-1-launch-blockers-database--data-integrity-db)
3. [Phase 3 — Priority 1 Launch Blockers: Financial Calculations & Engine Bugs (MATH)](#phase-3--priority-1-launch-blockers-financial-calculations--engine-bugs-math)
4. [Phase 4 — Priority 2 Functional Completeness Gaps (FUNC)](#phase-4--priority-2-functional-completeness-gaps-func)
5. [Phase 5 — Priority 2 UI/UX, Design Tokens & Accessibility (UI)](#phase-5--priority-2-uiux-design-tokens--accessibility-ui)
6. [Phase 6 — Priority 2 Monorepo Architecture & Dead Code Elimination (ARCH)](#phase-6--priority-2-monorepo-architecture--dead-code-elimination-arch)
7. [Phase 7 — Priority 2 Code Quality, Refactoring & N+1 Fixes (CQ)](#phase-7--priority-2-code-quality-refactoring--n1-fixes-cq)
8. [Phase 8 — Priority 2 Test Coverage & Observability (OBS)](#phase-8--priority-2-test-coverage--observability-obs)
9. [Phase 9 — Priority 2 Performance, SEO & Metadata (PERF)](#phase-9--priority-2-performance-seo--metadata-perf)
10. [Phase 10 — Priority 3 Hardening & Documentation Synchronization (DOC / NICE)](#phase-10--priority-3-hardening--documentation-synchronization-doc--nice)
11. [Phase 11 — End-to-End Test Suite (Playwright & Manual Checklist)](#phase-11--end-to-end-test-suite-playwright--manual-checklist)
12. [Final Production Verification Suite](#final-production-verification-suite)

---

## Phase 1 — Priority 1 Launch Blockers: Security (SEC)

### SEC-01 · [CRITICAL] Remove Open Redirect in `/dev-callback` Route
- **Severity:** Critical (Token Exfiltration)
- **Target Files:**
  - `apps/web/src/app/dev-callback/[...slug]/page.tsx`
  - `apps/web/src/middleware.ts`
- **Problem:** `/dev-callback/[...slug]` is in `PUBLIC_PREFIXES` in `middleware.ts`. It constructs arbitrary redirect URLs from slug params and forwards query params (including session tokens) to attacker-controlled domains.
- **Implementation:**
  1. In `apps/web/src/app/dev-callback/[...slug]/page.tsx`: Add production kill-switch at the top of the component:
     ```typescript
     if (process.env.NODE_ENV === "production") {
       window.location.href = "/dashboard";
       return null;
     }
     ```
  2. In `apps/web/src/middleware.ts`: Guard `"/dev-callback/"` prefix so it is only in `PUBLIC_PREFIXES` when `process.env.NODE_ENV !== "production"`.
  3. Validate destination host against allowed domains (`*.kaesava.au` and `localhost`).
- **Verification:** `pnpm test` in `apps/web`; GET `/dev-callback/https/evil.com` in production redirects to `/dashboard`.

---

### SEC-02 · [CRITICAL] Fix Cross-Tenant S3 Object Access (IDOR) & Path Traversal in File Notes
- **Severity:** Critical (Tenant Data Exfiltration / Overwrite)
- **Target Files:**
  - `packages/capabilities/file-notes/src/handlers/file-notes-commands.ts`
  - `packages/capabilities/file-notes/src/handlers/file-notes-queries.ts`
  - `apps/api/src/routers/file-notes.router.ts`
- **Problem:**
  1. `createPreSignedUploadUrl` takes unvalidated `entityType: z.string()`, allowing path traversal: `../../other-tenant-id/expenses`.
  2. `createFileNote` takes arbitrary `attachment.fileKey: z.string()` without verifying tenant scoping. An attacker can attach another tenant's file and retrieve it via `getFileNoteDownloadUrl`.
- **Implementation:**
  1. In `apps/api/src/routers/file-notes.router.ts`: Constrain `entityType` to `z.enum(["TRANSACTION", "EXPENSE", "CATEGORY", "BANK_ACCOUNT", "INCOME"])`.
  2. In `file-notes-commands.ts` (`createFileNoteHandler`): Add strict prefix check:
     ```typescript
     if (input.attachment && !input.attachment.fileKey.startsWith(`tenants/${tenantId}/`)) {
       throw new TRPCError({ code: "BAD_REQUEST", message: "Attachment file key must belong to the active tenant" });
     }
     ```
  3. In `file-notes-queries.ts` (`getFileNoteDownloadUrlHandler`): Validate `existing.fileKey.startsWith(`tenants/${tenantId}/`)` before calling S3 presigner.
  4. In `file-notes-commands.ts` (`purgeFileNoteHandler`): Validate tenant prefix before `deleteFileFromBucket`.
- **Verification:** Unit tests covering path traversal payload and cross-tenant `fileKey` attachments.

---

### SEC-03 · [CRITICAL] Fix CSRF Protection Bypass in Auth Proxy and tRPC Proxy
- **Severity:** Critical (Session Fixation / Account Takeover via Cross-Origin Requests)
- **Target Files:**
  - `apps/web/src/app/api/auth/[...auth]/route.ts`
  - `apps/web/src/app/api/trpc/[trpc]/route.ts`
- **Problem:**
  1. `apps/web/src/app/api/auth/[...auth]/route.ts` hardcodes `Host`, `Origin`, and `Referer` to the backend auth domain specifically to bypass upstream CSRF checks without validating the incoming request's `Origin`.
  2. `apps/web/src/app/api/trpc/[trpc]/route.ts` forwards cookies as Bearer tokens without origin checking.
- **Implementation:**
  1. In both proxy routes, implement strict `Origin` / `Referer` validation against an allowlist:
     ```typescript
     const ALLOWED_ORIGINS = [
       "https://moneymatters.kaesava.au",
       "https://api.moneymatters.kaesava.au",
       ...(process.env.NODE_ENV !== "production" ? ["http://localhost:3000", "http://127.0.0.1:3000"] : [])
     ];
     function validateOrigin(request: Request): boolean {
       const origin = request.headers.get("origin");
       if (!origin) {
         const referer = request.headers.get("referer");
         if (!referer) return true; // Non-browser / same-origin GET
         try {
           return ALLOWED_ORIGINS.some(allowed => new URL(referer).origin === allowed);
         } catch { return false; }
       }
       return ALLOWED_ORIGINS.includes(origin);
     }
     ```
  2. If `request.method !== 'GET' && !validateOrigin(request)`, reject with `403 Forbidden`.
- **Verification:** Vitest proxy tests verifying cross-origin `POST` from `https://evil.com` returns 403.

---

### SEC-04 · [HIGH] Implement Sliding-Window Rate Limiting in Cloudflare Worker API
- **Severity:** High (DoS & Brute Force Vulnerability)
- **Target Files:**
  - `apps/api/src/worker.ts`
  - `packages/core/src/rate-limiter.ts`
- **Problem:** Rate limiting is only registered in Fastify local dev (`index.ts`). The production Cloudflare Worker `fetch` handler in `worker.ts` has zero rate limiting.
- **Implementation:**
  1. In `packages/core/src/rate-limiter.ts`: Export a standalone edge-compatible helper `checkSlidingWindowRateLimit(identifier: string, limit: number, windowSeconds: number, env: { UPSTASH_REDIS_REST_URL?: string; UPSTASH_REDIS_REST_TOKEN?: string }): Promise<{ allowed: boolean; remaining: number; reset: number }>`.
  2. In `apps/api/src/worker.ts`: At the top of the `fetch` handler, identify client via `authorization` token or `CF-Connecting-IP` / `x-forwarded-for`.
  3. Enforce rate limits:
     - `/trpc/*`: 120 req / 60s
     - `/api/auth/*`: 30 req / 60s
     - `/reset-password`: 10 req / 60s
     - `/webhooks/stripe`: 60 req / 60s
  4. Return `429 Too Many Requests` with `Retry-After` header when limit exceeded.
- **Verification:** Unit test for rate limiter helper; integration test simulating burst requests.

---

### SEC-05 · [HIGH] Fix Reflected XSS in Password Reset HTML Template
- **Severity:** High (Arbitrary Code Execution in Browser)
- **Target File:** `apps/api/src/worker.ts` (lines 50–85, 113–133)
- **Problem:** `renderPasswordResetHtml` interpolates raw query params `token` and `error` inside an inline `<script>` via `JSON.stringify()`. `JSON.stringify` does not escape `</script>`, allowing attackers to break out of the script tag.
- **Implementation:**
  1. Add an HTML/script sanitizer:
     ```typescript
     function escapeForInlineScript(str: string): string {
       return JSON.stringify(str).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
     }
     ```
  2. Pass `token` and `error` via DOM `data-*` attributes on `<div id="reset-payload" data-token="${escapeHtml(token)}" data-error="${escapeHtml(error)}"></div>` and read via `document.getElementById('reset-payload').dataset`.
- **Verification:** Vitest test with payload `token = '</script><script>alert("xss")</script>'`.

---

### SEC-06 · [HIGH] Fix Middleware Auth Bypass via `neon_auth_session_verifier` Query Parameter
- **Severity:** High (Unauthenticated Access to Dashboard)
- **Target File:** `apps/web/src/middleware.ts` (lines 28–31)
- **Problem:** Adding `?neon_auth_session_verifier=1` to any protected URL bypasses session cookie validation globally.
- **Implementation:**
  1. Restrict the verifier bypass strictly to `/auth-callback`:
     ```typescript
     if (pathname === "/auth-callback" && request.nextUrl.searchParams.has("neon_auth_session_verifier")) {
       return NextResponse.next();
     }
     ```
  2. Ensure all `/dashboard/*`, `/setup`, and protected sub-paths require a valid session cookie.
- **Verification:** Unit test: GET `/dashboard?neon_auth_session_verifier=mock` returns 307 redirect to `/sign-in`.

---

### SEC-07 · [HIGH] Filter Revoked & Archived Memberships in Edge & Server Context
- **Severity:** High (Unauthorized Tenant Access)
- **Target Files:**
  - `apps/api/src/trpc/edge-context.ts` (lines 176–189)
  - `apps/api/src/trpc/context.ts` (lines 115–128)
- **Problem:** `resolveTenantMembership` queries `tenant_users` by `userId` without checking `inviteStatus = 'ACCEPTED'` or `archivedAt IS NULL`. Revoked members retain access by supplying old `x-tenant-id`.
- **Implementation:**
  1. Add `and(eq(tenantUsers.userId, claims.userId), eq(tenantUsers.inviteStatus, "ACCEPTED"), isNull(tenantUsers.archivedAt))` to the query in both files.
  2. Return `null` / fallback to owner tenant if user is revoked.
- **Verification:** Unit test: revoked user receives `FORBIDDEN` or tenant fallback.

---

### SEC-08 · [HIGH] Remove Session ID Fallback in Database Auth Resolution
- **Severity:** High (Auth Bypass via Known UUIDs)
- **Target Files:**
  - `apps/api/src/trpc/edge-context.ts` (line 73)
  - `apps/api/src/trpc/context.ts` (line 39)
- **Problem:** SQL query checks `s.id::text = ${token}` allowing authentication via database row UUIDs instead of cryptographic session secret tokens.
- **Implementation:**
  1. Remove all `s.id::text = ...` checks from SQL queries. Match exclusively against `s.token`.
- **Verification:** Unit test asserting that session record UUID fails auth resolution.

---

### SEC-09 · [HIGH] Add Write Access & Paid Tier Guards to Unprotected File Notes & Notifications Mutations
- **Severity:** High (Permission Bypass / Tier Bypass)
- **Target Files:**
  - `apps/api/src/routers/file-notes.router.ts`
  - `apps/api/src/routers/notifications.router.ts`
- **Problem:**
  - `updateFileNoteComment`, `archiveFileNote`, `restoreFileNote`, `purgeFileNote` omit `requiresWriteAccess(ctx)` and `requiresPaidTier(ctx, 'file_notes')`.
  - `registerToken` and `removeToken` omit `requiresWriteAccess(ctx)`.
- **Implementation:**
  1. Add `requiresWriteAccess(ctx)` and `requiresPaidTier(ctx, "file_notes")` to all 4 file-notes mutations.
  2. Add `requiresWriteAccess(ctx)` to notification token mutations.
- **Verification:** Unit tests verifying read-only and free-tier tenants are blocked.

---

### SEC-10 · [MEDIUM] Implement Custom tRPC Error Formatter (Prevent Information Leakage)
- **Severity:** Medium (Stack Trace / Schema Leakage)
- **Target File:** `apps/api/src/trpc/trpc.ts`
- **Problem:** Default tRPC error handler can leak raw Drizzle SQL errors or internal details to clients.
- **Implementation:**
  1. Configure `errorFormatter` in `initTRPC.context<Context>().create()`:
     ```typescript
     errorFormatter({ shape, error }) {
       return {
         ...shape,
         message: error.code === "INTERNAL_SERVER_ERROR" && process.env.NODE_ENV === "production"
           ? "An unexpected error occurred. Please try again later."
           : error.message,
         data: {
           ...shape.data,
           stack: process.env.NODE_ENV === "production" ? undefined : shape.data.stack,
         }
       };
     }
     ```
- **Verification:** Unit test verifying production error responses redact internal database error strings.

---

### SEC-11 · [MEDIUM] Add Content Security Policy (CSP) Headers in Web App
- **Target File:** `apps/web/next.config.ts`
- **Implementation:** Configure CSP headers in `headers()` function allowing only trusted domains (`moneymatters.kaesava.au`, `api.moneymatters.kaesava.au`, PostHog, Sentry, Neon Auth, Google Fonts). Frame-ancestors `none`.

---

### SEC-12 · [LOW] Partner Invite Fail-Closed Email Verification & Cookie Hardening
- **Target Files:**
  - `packages/capabilities/tenant/src/handlers/partner-invites.ts`
  - `apps/web/src/components/TenantSwitcher.tsx`
- **Implementation:**
  1. In `partner-invites.ts`: Enforce strict fail-closed: if `invite.inviteEmail` is present and `userEmail` is missing or mismatched, throw `TRPCError({ code: 'FORBIDDEN' })`.
  2. In `TenantSwitcher.tsx`: Add `; SameSite=Lax; Secure` to `active_tenant_id` cookie setting.

---

### SEC-13 · [LOW] Stripe Webhook Idempotency Table
- **Target Files:**
  - `packages/db/src/schema/processed_webhooks.ts` (new)
  - `packages/capabilities/billing/src/webhooks/stripe-webhook-handler.ts`
- **Implementation:** Create `processed_webhook_events` table (`id`, `event_id` unique, `event_type`, `processed_at`). Verify and store `event.id` before executing billing mutations.

---

## Phase 2 — Priority 1 Launch Blockers: Database & Data Integrity (DB)

### DB-01 · Add 14 Critical Database Indexes via Migration 0014
- **Target Files:**
  - `packages/db/drizzle/0014_add_critical_indexes.sql` (new migration)
  - `packages/db/src/schema/*.ts`
- **Indexes to Add:**
  1. `tenant_users`: `(user_id)`, `(invite_token)`, `(invite_email)`
  2. `categories`: `(tenant_id, type)`, `(tenant_id, is_surplus_target)`, `(user_id)`
  3. `expense_events`: `(tenant_id, expected_date, status)`
  4. `income_events`: `(tenant_id, expected_date, status)`
  5. `transaction_ledger`: `(bank_account_id)`, `(category_id)`, `(idempotency_key)`
  6. `file_notes`: `(tenant_id, entity_type, entity_id)`
  7. `user_preferences`: `(user_id, tenant_id)`
  8. `tenants`: `(stripe_customer_id)`
- **Verification:** Migration applies cleanly via `pnpm --filter @money-matters/db migrate`.

---

### DB-02 · Ensure RLS Policy on `bank_account_category_mappings`
- **Target File:** `packages/db/drizzle/0014_add_critical_indexes.sql`
- **Implementation:** Enable RLS and add tenant isolation policy on `bank_account_category_mappings`:
  ```sql
  ALTER TABLE bank_account_category_mappings ENABLE ROW LEVEL SECURITY;
  CREATE POLICY bank_account_category_mappings_tenant_isolation ON bank_account_category_mappings
    AS RESTRICTIVE USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
  ```

---

### DB-03 · Add Standard Audit Columns to `user_preferences` Table
- **Target Files:**
  - `packages/db/src/schema/user_preference.ts`
  - Migration `0014`
- **Implementation:** Add `app_id`, `created_by`, `updated_by`, `archived_at`, `archived_by` to align with AGENTS.md Rule #6.

---

### DB-04 · Synchronize Drizzle Meta Journal (`_journal.json`)
- **Target File:** `packages/db/drizzle/meta/_journal.json`
- **Implementation:** Add missing journal entries for migrations `0004` through `0014` to ensure Drizzle Kit tracks all migrations deterministically.

---

## Phase 3 — Priority 1 Launch Blockers: Financial Calculations & Engine Bugs (MATH)

### MATH-01 · Fix Burst Engine Month Rollover Drift (29th/30th/31st)
- **Target File:** `packages/capabilities/budgeting/src/engine/burst-engine.ts` (lines 58–64)
- **Problem:** `new Date(year, month + 1, day)` on Jan 31 evaluates to March 3 in JavaScript. February is skipped, and all future dates drift to the 3rd of each month.
- **Fix:**
  ```typescript
  if (isMonthly) {
    const targetMonth = current.getMonth() + 1;
    const targetYear = current.getFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = targetMonth % 12;
    const originalDay = start.getDate();
    const daysInTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
    current = new Date(targetYear, normalizedMonth, Math.min(originalDay, daysInTargetMonth));
  }
  ```
- **Verification:** Unit test generating monthly bursts starting on Jan 31 -> verifies Feb 28/29, Mar 31, Apr 30.

---

### MATH-02 · Fix Burst Engine Infinite Loop / Cutoff Bug (`&&` vs `||`)
- **Target File:** `packages/capabilities/budgeting/src/engine/burst-engine.ts` (line 54)
- **Problem:** `dates.length >= maxOccurrences && current > cutOff` requires BOTH conditions. With default `maxOccurrences = 1000`, the loop fails to stop at `cutOff` and generates 30+ years of dates.
- **Fix:** Change condition to `if (dates.length >= maxOccurrences || (cutOff && current > cutOff)) break;`.
- **Verification:** Unit test with 12-month cutoff -> verifies exactly 12 occurrences returned.

---

### MATH-03 · Fix Allocation Engine $0 and Negative Income Edge Cases
- **Target File:** `packages/capabilities/budgeting/src/engine/allocation-engine.ts`
- **Problems:**
  1. Entry point does not guard negative income (`input.incomeAmount < 0` produces negative allocations).
  2. `isInsufficient` evaluation guards on `input.incomeAmount > 0`, causing `$0` income to return `status: "OK"` when regular bills are unfunded.
- **Fix:**
  1. At entry: `const incomeAmount = Math.max(0, input.incomeAmount || 0);`.
  2. Update `isInsufficient` check:
     ```typescript
     const hasUnfundedEssentials = lines.some((l) => {
       const bucket = input.buckets.find((b) => b.id === l.bucketId);
       if (!bucket || (!bucket.isEssential && !bucket.isCommitted && bucket.type !== "REGULAR")) return false;
       return l.proposedAmount === 0 && (bucket.monthlyAmount || 0) > 0;
     });
     const status = (hasUnfundedEssentials || remainingCents > 0 && lines.length === 0) ? "INSUFFICIENT" : "OK";
     ```
- **Verification:** Unit test with `$0` income and $500 rent bill -> status is `INSUFFICIENT`.

---

### MATH-04 · Fix Can-Afford Goal Surplus Calculation on Negative Everyday Deficit
- **Target File:** `packages/capabilities/transactions/src/queries/can-afford.query.ts` (line 176)
- **Problem:** When `everydayBalance < 0`, `goalSurplusUsed` ignores the negative balance overdraft and informs the user their purchase is covered.
- **Fix:** Ensure deficit is factored into surplus availability:
  ```typescript
  const netDeficit = everydayBalance < 0 ? Math.abs(everydayBalance) : 0;
  const effectiveSurplus = Math.max(0, bestSavingsSurplus - netDeficit);
  ```
- **Verification:** Unit test with Everyday balance -$100, goal surplus $200, purchase $150 -> verdict accounts for deficit.

---

### MATH-05 · Enforce CSV Import Row & Payload Limits (Prevent Worker DoS)
- **Target Files:**
  - `packages/types/src/commands.types.ts`
  - `packages/capabilities/transactions/src/csv-import.ts`
  - `packages/capabilities/transactions/src/commands/commit-csv-import.command.ts`
- **Implementation:**
  1. In `BankCsvImportInputSchema`: Add `csvText: z.string().min(1).max(2 * 1024 * 1024, "CSV payload cannot exceed 2MB")`.
  2. In `CommitCsvImportCommand`: Add `transactions: z.array(CsvImportItemSchema).min(1).max(1000, "Cannot import more than 1,000 transactions at once")`.
  3. In `commitCsvImportCommand.ts`: Chunk database operations in batches of 200 items.
- **Verification:** Unit test verifying oversized CSV rejection.

---

### MATH-06 · Validate Calendar Date Parsing in CSV Normalization
- **Target File:** `packages/capabilities/transactions/src/csv-import.ts` (`normalizeDate`)
- **Problem:** Regex accepts `"99/99/9999"`, causing PostgreSQL timestamp insertion errors.
- **Fix:** Validate parsed date via `isNaN(new Date(formatted).getTime())`. If invalid, fallback to current UTC date.
- **Verification:** Unit test with malformed dates.

---

### MATH-07 · Harden Move Money Command (Bulk Insert & Validation)
- **Target Files:**
  - `packages/types/src/commands.types.ts`
  - `packages/capabilities/budgeting/src/commands/move-money.command.ts`
- **Implementation:**
  1. Require `amount: z.string().regex(/^\d+(\.\d{1,2})?$/).refine(val => parseFloat(val) > 0, "Amount must be greater than 0")`.
  2. Refactor sequential `tx.insert()` to single bulk insert `tx.insert(transactionLedger).values([debitRow, creditRow])` to comply with AGENTS.md Rule #6.
- **Verification:** Unit test verifying $0 amount rejection and bulk insert behavior.

---

## Phase 4 — Priority 2 Functional Completeness Gaps (FUNC)

### FUNC-01 · Create Missing Password Reset Web Route
- **Target File:** `apps/web/src/app/reset-password/page.tsx` (new)
- **Implementation:** Build the web password reset page (consuming token from search params, validating new password with strict constraints, invoking reset API, showing success confirmation).
- **Verification:** Playwright test verifying complete password reset flow.

---

### FUNC-02 · Wire Due-Date Guardrail Amber Shortfall Card into Web Dashboard
- **Target Files:**
  - `apps/web/src/app/dashboard/page.tsx`
  - `apps/web/src/components/web/dashboard/DueDateGuardrailCard.tsx` (new or wire existing)
- **Implementation:**
  1. Call `trpc.categories.evaluateDueGuardrail.useQuery()` on dashboard page.
  2. If `status === 'SHORTFALL_ALERT'`, render amber warning card displaying `shortfallAmount` and affected bills.
- **Verification:** Visual verification and Playwright test with mocked shortfall.

---

### FUNC-03 · Move Zero-Categories Login Guard to Dashboard Layout
- **Target Files:**
  - `apps/web/src/app/dashboard/layout.tsx`
  - `apps/web/src/app/dashboard/page.tsx`
- **Implementation:** Move category count check and redirect to `/setup` into `dashboard/layout.tsx` so all `/dashboard/*` sub-routes are protected.
- **Verification:** Direct navigation to `/dashboard/settings` with 0 categories redirects to `/setup`.

---

### FUNC-04 · Dispatch Asynchronous Inngest Event for Account Deletion
- **Target Files:**
  - `packages/capabilities/tenant/src/delete-account.ts`
  - `packages/capabilities/tenant/src/inngest/account-deletion-workflow.ts`
- **Implementation:** Update `deleteMyAccount` to dispatch `user/account.delete-requested` Inngest cloud workflow for async erasure, as specified in `FUNCTIONAL_SPEC.md`.

---

### FUNC-05 · Enforce Surplus Target Protection on Category Archival
- **Target File:** `packages/capabilities/budgeting/src/commands/archive-category.command.ts`
- **Implementation:** Block archiving an active `isSurplusTarget: true` category unless a replacement Goal category is selected or it is the last category.

---

### FUNC-06 · Clean Up Dead/Orphaned Web Components
- **Target Files:**
  - `apps/web/src/components/web/CatchUpSweepModal.tsx`
  - `apps/web/src/components/PaydayTransferCard.tsx`
  - `apps/web/src/components/BankTransferPromptCard.tsx`
  - `apps/web/src/components/BudgetImpactReviewModal.tsx`
  - `apps/web/src/components/TenantSwitcher.tsx`
- **Implementation:** Wire `TenantSwitcher.tsx` into dashboard header; wire or safely deprecate orphaned modal components.

---

## Phase 5 — Priority 2 UI/UX, Design Tokens & Accessibility (UI)

### UI-01 · Replace 146+ Non-Token Hex Codes (`#00B4A6`) with Serene Finance Tokens
- **Target Files:**
  - `apps/web/src/app/globals.css`
  - `packages/ui/src/tokens.ts`
  - `apps/web/src/**/*.tsx` (all 146 instances)
- **Standard Tokens (AGENTS.md Rule #13):**
  - Primary Blue: `#2563eb` (`--color-primary`, `bg-blue-600`)
  - Deep Navy: `#1B2B4B` (`--dash-navy`, `text-[#1B2B4B]`)
  - Off-White Background: `#F7F8FA` (`--dash-bg`)
  - Success Green: `#22c55e` (`--dash-success`)
  - Critical Red / Burn: `#ba1a1a` / `#ef4444` (`--dash-critical`)
- **Implementation:** Remove `--dash-teal: #00B4A6` and replace all teal buttons, badges, rings, and borders with Serene Blue (`#2563eb` / `blue-600`) or Serene Navy.

---

### UI-02 · Enforce `React.useId()` and Accessible Form Input Associations
- **Target Files:**
  - `apps/web/src/app/dashboard/bank-accounts/page.tsx`
  - `apps/web/src/components/CsvImportModal.tsx`
  - `apps/web/src/components/web/**/*.tsx`
- **Implementation:** Use `const id = useId()` for all `<label htmlFor={id}>` and `<input id={id}>` pairs across forms and modals. Remove hardcoded strings.

---

### UI-03 · Accessibility & Modal Dialog Standards
- **Implementation:**
  1. Add `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` to custom modals (`bank-accounts/page.tsx`, `MoveMoneyModal.tsx`, `BankReconcileModal.tsx`).
  2. Add `aria-label="Close"` to all icon-only close buttons (`✕`).
  3. Add Escape key event listeners on all open dialogs.

---

### UI-04 · Loading Spinners, Skeletons & Mutation Error Feedback
- **Target Files:**
  - `apps/web/src/app/dashboard/bank-accounts/page.tsx`
  - `apps/web/src/app/dashboard/transactions/page.tsx`
  - `apps/web/src/app/dashboard/settings/page.tsx`
- **Implementation:**
  1. Render animated skeleton loaders while `isLoading === true` (prevent flashing empty states).
  2. Add `onError: (err) => { toast.error(err.message); }` callbacks to all tRPC mutations.

---

### UI-05 · Enforce Monospace Metrics (`font-mono`) and Standard Date Formatting
- **Implementation:**
  1. Ensure every monetary display element includes `font-mono` class.
  2. Consolidate all date rendering to use `toAustralianDate(date)` (`en-AU`, AEST).

---

## Phase 6 — Priority 2 Monorepo Architecture & Dead Code Elimination (ARCH)

### ARCH-01 · Decouple Cross-Capability Imports (Tenant -> Billing)
- **Target Files:**
  - `packages/capabilities/tenant/src/handlers/bank-account.ts`
  - `packages/capabilities/tenant/src/handlers/partner-invites.ts`
- **Problem:** Direct import of `ensurePremiumAccess` from `@money-matters/capability-billing` violates AGENTS.md Rule #4.
- **Fix:** Inject subscription tier checking via context or perform check in tRPC router layer. Remove direct package import.

---

### ARCH-02 · Clean Web Application Dependencies
- **Target Files:**
  - `apps/web/package.json`
  - `apps/web/next.config.ts`
- **Implementation:**
  1. Remove `@money-matters/capability-billing`, `capability-budgeting`, `capability-transactions` from `apps/web/package.json`.
  2. Remove them from `transpilePackages` in `next.config.ts`.

---

### ARCH-03 · Refactor N+1 Query in `tenant.router.ts` (`reconcileBankBalance`)
- **Target File:** `apps/api/src/routers/tenant.router.ts` (lines 370–393)
- **Fix:** Fetch categories in bulk using `inArray(categories.id, splitCategoryIds)` and execute ledger entries via bulk insert.

---

### ARCH-04 · Prune Dead Exports & Duplicate Utility Functions
- **Implementation:**
  1. Prune 16 unused Zod schemas and 12 unused types from `packages/types/src/index.ts`.
  2. Prune 18 unused web UI components from `packages/ui/src/web/index.ts`.
  3. Replace duplicate loggers in `apps/web/src/lib/logger.ts` and `apps/mobile/src/lib/logger.ts` with imports from `@money-matters/core`.
  4. Consolidate currency formatters to canonical `@money-matters/ui` / `@money-matters/types`.
  5. Resolve `CategoryType` collision in `bank-accounts/page.tsx`.

---

### ARCH-05 · Root Workspace Hygiene & Stale Files
- **Implementation:**
  1. Remove `.aider.*` files, `posthog-self-driving-report.md`, `codebase_details_researcher_output.md`, `interactive_onboarding_prompt.md`, and stray `vitest.workspace.*` artifacts from repository root.
  2. Move `ui_design_google_stitch/` and `under_construction_page/` to `docs/` or remove.

---

## Phase 7 — Priority 2 Code Quality, Refactoring & N+1 Fixes (CQ)

### CQ-01 · Replace All Direct `console.log` with Structured Logger & Enforce ESLint Rule
- **Target Files:**
  - `eslint.config.js`
  - `apps/web/eslint.config.mjs`
  - All 28+ files in `apps/web/src/` and `apps/api/src/` with console calls
- **Implementation:**
  1. Replace all console calls with `logger.info`, `logger.warn`, `logger.error`.
  2. Add `'no-console': ['error', { allow: [] }]` to ESLint configs (with `/* eslint-disable no-console */` strictly in canonical logger files).

---

### CQ-02 · Promote `@typescript-eslint/no-explicit-any` to `error`
- **Target Files:**
  - `eslint.config.js`
  - `apps/web/eslint.config.mjs`
  - Test files in `packages/capabilities/*`, `packages/db/src/seed.ts`
- **Implementation:** Set rule to `error` and replace all `as any` occurrences with typed interfaces and test doubles.

---

### CQ-03 · Externalize All 240+ Hardcoded Strings into `@money-matters/i18n`
- **Target Files:**
  - `packages/i18n/src/dictionaries/en.ts`
  - `packages/i18n/src/dictionaries/ja.ts`
  - `apps/web/src/app/dashboard/bank-accounts/page.tsx`
  - `apps/web/src/components/CsvImportModal.tsx`
  - `apps/web/src/app/dashboard/income-and-bills/page.tsx`
  - `apps/web/src/app/setup/page.tsx`
  - `apps/web/src/app/page.tsx`
  - `apps/web/src/components/web/**/*.tsx`
- **Implementation:** Extract all user-facing strings to dictionary keys and replace with `t("...")`. Verify with `pnpm check-i18n`.

---

### CQ-04 · Refactor Oversized Files (>500 Lines)
- **Target Files & Modular Strategy:**
  1. `CsvImportModal.tsx` (860 lines) -> Extract `CsvUploadStep.tsx`, `CsvReviewStep.tsx`, `CsvCommitStep.tsx`, `useCsvImport.ts`.
  2. `bank-accounts/page.tsx` (775 lines) -> Extract `BankAccountTable.tsx`, `BankAccountFormModal.tsx`, `PoolMappingSection.tsx`, `BankAccountReconcileSection.tsx`.
  3. `income-and-bills/page.tsx` (553 lines) -> Extract `IncomeSourcesList.tsx`, `ExpenseSourcesList.tsx`, `UpcomingEventsCalendar.tsx`.
  4. `PaydayPreviewModal.tsx` (531 lines) -> Extract `AllocationLineItems.tsx`, `PaydayConfirmActions.tsx`.
  5. `landing page.tsx` (521 lines) -> Extract `HeroSection.tsx`, `FeaturesSection.tsx`, `PricingSection.tsx`.
  6. `SetupLifestyleStep.tsx` (506 lines) -> Extract `HousingSection.tsx`, `TransportSection.tsx`, `FamilySection.tsx`.
  7. `packages/db/src/seed.ts` (1,098 lines) -> Extract `seed-users.ts`, `seed-tenants.ts`, `seed-categories.ts`, `seed-income-expenses.ts`.

---

### CQ-05 · Fix N+1 Category Creation Mutations in Setup Flow
- **Target Files:**
  - `apps/api/src/routers/categories.router.ts`
  - `apps/web/src/app/setup/page.tsx`
- **Implementation:** Create `bulkCreateCategories` tRPC mutation that inserts categories in a single transaction with bulk insert. Update setup page to call `bulkCreateCategories.mutateAsync(...)`.

---

### CQ-06 · Delete Deprecated Schema Stub
- **Target File:** `packages/db/src/schema/income_source_schedule.ts`
- **Implementation:** Remove file and clean up re-exports.

---

## Phase 8 — Priority 2 Test Coverage & Observability (OBS)

### OBS-01 · Core Infrastructure Unit Tests
- Create Vitest test suites for:
  - `packages/core/src/auth.test.ts` (JWT verification, claims extraction, expired token rejection)
  - `packages/core/src/rate-limiter.test.ts` (sliding window calculations, Redis mock)
  - `packages/core/src/user-sync.test.ts` (upsert idempotency)
  - `packages/core/src/email.test.ts` (Resend dispatch mock, error fallback)

### OBS-02 · Capability Unit Tests
- Create Vitest test suites for:
  - `packages/capabilities/billing/src/stripe-webhook-handler.test.ts` (idempotency, subscription activation)
  - `packages/capabilities/file-notes/src/file-notes-commands.test.ts` (cross-tenant isolation, path traversal rejection)
  - `packages/capabilities/tenant/src/partner-invites.test.ts` (invite generation, email matching, revoke guards)
  - `packages/capabilities/budgeting/src/engine/burst-engine.test.ts` (month boundary drift, cutoff verification)
  - `packages/capabilities/budgeting/src/engine/allocation-engine.test.ts` ($0 income, deficit repair prioritization)

### OBS-03 · Web App Route & Middleware Tests
- Create Vitest test suites for:
  - `apps/web/src/middleware.test.ts` (session verifier guard, public prefix allowlist, auth redirect)
  - `apps/web/src/app/api/trpc/[trpc]/route.test.ts` (CSRF validation, header forwarding)
  - `apps/web/src/app/api/auth/[...auth]/route.test.ts` (CSRF validation, cookie forwarding)

### OBS-04 · Config & Environment Schema Tests
- Create Vitest test suites for:
  - `packages/config/src/env.test.ts` (production refinement validation)
  - `packages/config/src/feature-flags.test.ts` (tenant scoping, kill-switches)

---

## Phase 9 — Priority 2 Performance, SEO & Metadata (PERF)

### PERF-01 · Convert Landing Page to Server Component with Rich Metadata
- **Target File:** `apps/web/src/app/page.tsx`
- **Implementation:** Refactor `page.tsx` into a Server Component. Extract interactive widgets (`EarlyAccessModal`, `PaycheckSimulator`) to client components. Export `metadata: Metadata` with OpenGraph and Twitter cards.

### PERF-02 · Add Structured Data (JSON-LD)
- **Target File:** `apps/web/src/app/layout.tsx`
- **Implementation:** Add Organization, WebApplication, and SoftwareApplication schema JSON-LD scripts.

### PERF-03 · Add `robots.txt` and Dynamic `sitemap.ts`
- **Target Files:**
  - `apps/web/public/robots.txt` (new)
  - `apps/web/src/app/sitemap.ts` (new)
- **Implementation:** Generate standard `robots.txt` and dynamic sitemap indexing public landing and all blog posts.

### PERF-04 · Fix Production `metadataBase` Domain
- **Target File:** `apps/web/src/app/layout.tsx`
- **Implementation:** Change fallback domain from `https://moneymatters.app` to canonical `https://moneymatters.kaesava.au`.

---

## Phase 10 — Priority 3 Hardening & Documentation Synchronization (DOC / NICE)

### DOC-01 · Synchronize TECHNICAL_SPEC.md Canonical Data Model & Schema
- **Target File:** `TECHNICAL_SPEC.md`
- **Updates:** Update schema definitions to reflect current database state (all 4 category types `REGULAR`, `GOAL`, `EVERYDAY`, `PERSONAL`, `bank_accounts` buffer columns, `transaction_ledger` source enums, `allocation_plans`, `bank_account_category_mappings`, and update "Last updated" date to 2026-08-16).

### DOC-02 · Synchronize FUNCTIONAL_SPEC.md Pool Model & Features
- **Target File:** `FUNCTIONAL_SPEC.md`
- **Updates:** Document 4 category types, 5-step waterfall allocation details, due-date guardrails, and update "Last updated" date.

### DOC-03 · Clean Legacy Deployment Artifacts
- **Target File:** `render.yaml` (mark deprecated or delete)

---

## Phase 11 — End-to-End Test Suite (Playwright & Manual Checklist)

### E2E-01 · Set Up Playwright Test Infrastructure
1. Install `@playwright/test` in `apps/web`.
2. Configure `apps/web/playwright.config.ts` targeting `http://localhost:3000`.
3. Add `"e2e": "playwright test"` to `apps/web/package.json`.

### E2E-02 · Playwright Automated Test Specs (`apps/web/e2e/`)
1. `auth.spec.ts`: Sign-up, Sign-in, Sign-out, Auth bypass verification (`?neon_auth_session_verifier=x` blocked), Password reset flow.
2. `onboarding-setup.spec.ts`: 4-step setup wizard (income, lifestyle, categories, summary), negative number validation, discard modal.
3. `dashboard.spec.ts`: Donut ring hero card, quick expense submission, due-date shortfall card, can-afford widget.
4. `categories.spec.ts`: Category pool list, create regular bill/goal, edit targets, move money, archive category.
5. `income-and-bills.spec.ts`: Income sources, expense sources, upcoming events calendar, confirm/skip status toggles.
6. `cascade.spec.ts`: 5-step waterfall payday allocation preview and confirmation.
7. `transactions.spec.ts`: Transaction filtering, CSV import (CBA format, Westpac format), duplicate row detection, rollback.
8. `settings.spec.ts`: Profile preferences, partner invite, data export (CSV zip), account deletion flow.
9. `bank-accounts.spec.ts`: Account creation, pool mapping associations, bank reconciliation.
10. `subscription.spec.ts`: Pricing matrix display ($9.95/mo, $89/yr, $69/yr founding), trial banner.
11. `public-pages.spec.ts`: Landing page rendering, early access signup, blog listing & article view, privacy policy.
12. `edge-cases.spec.ts`: Negative numbers, $0 inputs, invalid dates, XSS script strings in inputs, 404 page, error boundary.

### E2E-03 · Committed Manual Walkthrough Checklist
- **Target File:** `apps/web/e2e/MANUAL_WALKTHROUGH.md` (new)
- **Implementation:** Step-by-step human verification checklist covering all 12 core journeys with pass/fail checkmarks.

---

## Final Production Verification Suite

After all discrete tasks are executed, the following commands must execute cleanly with zero errors:

```bash
# 1. Strict TypeScript compilation across all packages and apps
pnpm typecheck

# 2. Global ESLint enforcement (no-console: error, no-explicit-any: error)
pnpm lint

# 3. 100% i18n externalization parity check
pnpm check-i18n

# 4. Monorepo Vitest unit & integration test suite (100% pass)
pnpm test

# 5. Security dependency vulnerability audit
pnpm audit --audit-level=high

# 6. Production Cloudflare Workers builds (Web & API)
pnpm build
cd apps/api && pnpm wrangler build
cd apps/web && pnpm opennextjs-cloudflare build

# 7. Playwright E2E test execution on local server
cd apps/web && pnpm e2e
```
