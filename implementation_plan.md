# Implementation Plan: Data Export, Account Deletion + Session Cookie Migration

---

## Design: Two Independent Features

### Feature A — "Download My Data" (standalone)
Available at any time from Settings, independent of deletion. The user can download their data as many times as they want. Returns a `.json` file instantly in the browser / saves to device — **no email dependency**.

### Feature B — "Delete My Account"
Completely separate from the download. The confirmation dialog links to the download page and asks: *"Have you downloaded a copy of your data? Your data will be permanently deleted and cannot be recovered."* — but does **not** force or block on the download. The user chooses.

On deletion:
1. All application data is hard-deleted
2. Neon Auth session + user record are hard-deleted
3. A simple **confirmation email** is sent (no attachment — just "Your account has been deleted")

---

## Proposed Changes

---

### Task 1A — tRPC: `exportMyData` Query

#### [NEW] `packages/capabilities/tenant/src/export-data.ts`
A Cloudflare Workers-compatible query handler that:
- Fetches all tenant-scoped data for the user:
  - Categories (name, type, monthly amount, current balance)
  - Income sources and events
  - Expense sources and events
  - Transaction ledger
  - Bank accounts (names + balances)
  - File note metadata (filename, created date — no binary content)
  - User preferences
- Returns a typed `ExportPayload` object (JSON-serialisable)

#### [MODIFY] `packages/capabilities/tenant/src/index.ts`
- Export `exportMyDataHandler`

#### [MODIFY] `apps/api/src/routers/tenant.router.ts`
- Add `exportMyData: authenticatedProcedure.query(...)` — returns the full `ExportPayload`

---

### Task 1B — Web: Download My Data Page

#### [MODIFY] `apps/web/src/app/dashboard/settings/page.tsx`
- Add "📥 Download My Data" row to the settings page
- Calls `trpc.exportMyData.useQuery()` lazily (only fetches on button click)
- On data received: constructs a `Blob`, creates an object URL, and programmatically clicks a hidden `<a download="money-matters-export.json">` — instant browser download
- No page navigation, no email, no dependencies

#### [MODIFY] `apps/web/src/app/privacy/delete-account/page.tsx`
- Add an authenticated Client Component section when user is signed in
- Shows two steps:
  1. **"Download a copy first?"** — prominent link/button to trigger the data export
  2. **Deletion confirmation** — checkbox: *"I understand all my data will be permanently and irreversibly deleted"* + red "Delete My Account" button
- Calls `trpc.deleteMyAccount.useMutation()`
- On success: `authClient.signOut()` + redirect to `/`

---

### Task 1C — Mobile: Download + Delete

#### [MODIFY] `apps/mobile/src/app/(app)/settings.tsx`
- Add **"📥 Download My Data"** row (above the existing "Delete Account" row)
  - Calls `trpc.exportMyData` and writes the JSON to device via `expo-file-system` + `expo-sharing` so the user can save/AirDrop/share the file
- **"🗑️ Delete Account & Data"** row:
  - Two-step `Alert.alert` flow:
    - **Step 1**: "Before you delete — have you downloaded your data? You can do this from the 'Download My Data' option above. Tap Continue to proceed."
    - **Step 2**: "Permanently delete everything? This cannot be undone." → "Yes, Delete Everything" (destructive)
  - Calls `trpc.deleteMyAccount.useMutation()`
  - On success: `authClient.signOut()` + clear SecureStore + navigate to sign-in

---

### Task 1D — tRPC: `deleteMyAccount` Mutation

#### [NEW] `packages/capabilities/tenant/src/delete-account.ts`
Edge-compatible handler (Cloudflare Workers safe — Drizzle + fetch only):
1. Hard-delete all application data in FK-safe order:
   ```
   file_notes → device_tokens → transaction_ledger
   → allocation_plan_lines → allocation_plans
   → expense_events → expense_sources
   → income_events → income_sources
   → category_schedules → categories
   → user_preferences → bank_accounts
   → tenant_users → tenants → users (public schema)
   ```
2. DELETE FROM `neon_auth.session` WHERE `userId = $userId` (revoke all sessions)
3. DELETE FROM `neon_auth.user` WHERE `id = $userId` (remove auth record)
4. Send simple confirmation email via Resend (`sendEmailViaResend`): *"Your Money Matters account has been permanently deleted."*

#### [MODIFY] `apps/api/src/routers/tenant.router.ts`
- Add `deleteMyAccount: authenticatedProcedure.mutation(...)`

---

### Task 2 — Web: localStorage → httpOnly Cookie

CORS already configured (`Access-Control-Allow-Credentials: true`). This is front-end only.

#### [MODIFY] `apps/web/src/lib/trpc.ts`
- Remove `localStorage.getItem("session_token")` from `headers()`
- Add `credentials: 'include'` to `httpBatchLink`

#### [MODIFY] `apps/web/src/providers/AppProviders.tsx`
- Remove `localStorage.setItem("session_token", ...)` from `SessionSyncTracker`
- Remove `[DEBUG client]` console.log

#### [MODIFY] `apps/web/src/app/sign-up/page.tsx`
- Remove `localStorage.setItem("session_token", ...)`

#### [MODIFY] `apps/web/src/app/page.tsx`
- Replace `localStorage.getItem("session_token")` redirect with `authClient.getSession()` async check

#### [MODIFY] `apps/web/src/app/dashboard/layout.tsx`
- Remove `localStorage.removeItem("session_token")` on sign-out

#### [MODIFY] `apps/web/src/app/dashboard/settings/page.tsx`
- Remove `localStorage.removeItem("session_token")` on sign-out

> [!NOTE]
> `TrialEndedModal.tsx` (dismissed-state flag) and `TenantSwitcher.tsx` (active_tenant_id UI state) use `localStorage` for non-sensitive UI preferences — these are safe to keep as-is.

---

## Cloudflare Workers Compatibility ✅

All new code uses only:
- Drizzle ORM (`db.execute`, `db.delete`, `db.select`) — already in use everywhere
- `fetch()` for Resend — same pattern as `email.ts`
- `crypto.randomUUID()` — Web Crypto API, available in Workers

No `fs`, `Buffer`, `process`, `stream`, or Node-only APIs.

---

## Verification Plan

```bash
pnpm run typecheck && pnpm run lint
```

| Test | Expected |
|---|---|
| Sign in → DevTools Local Storage | `session_token` key absent |
| Dashboard loads, tRPC calls work | Cookie path succeeds |
| Settings → Download My Data | `.json` file downloads instantly |
| Settings → Delete Account | Two-step alert, then data wiped + redirected |
| Sign-in with deleted account | Auth fails with invalid credentials |
| Confirmation email received | Simple deletion confirmation (no attachment) |
