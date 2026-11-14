---
name: playwright-e2e
description: >-
  Author, debug, and run Playwright end-to-end tests in apps/web/e2e. Use whenever
  updating or troubleshooting Money Matters Playwright specs or setting up dev E2E runs.
---

# Money Matters Playwright E2E Playbook

1. **Inspect Live TSX & i18n Before Writing Selectors:**
   * Read the target component (`<= 100` lines) and `@money-matters/i18n` dictionary keys rather than guessing labels or HTML elements.
   * Known control patterns:
     - `AmountField` renders `input[inputmode="decimal"]` (never assume `input[type="number"]`).
     - Interactive cards wired only with `onClick={() => router.push(...)}` (e.g., `/blog`) render `<article>` rather than `<a href>`.
     - Prefer semantic Playwright locators (`getByRole`, `getByLabel`, `data-tour` attributes).

2. **Handle Next.js `"use client"` Hydration Deterministically:**
   * For SSR-rendered elements whose click handler is only attached after React hydration (`router.push` on `<article>` or `<button>`), wrap the click + navigation assertion in Playwright's auto-retrying `toPass()` guarding the source `pathname` (never use `waitForTimeout` or `networkidle`, which hangs on `next dev` HMR):
     ```ts
     await expect(async () => {
       if (new URL(page.url()).pathname === '/blog') {
         await card.click();
       }
       await expect(page).toHaveURL(/\/blog\/.+/, { timeout: 2000 });
     }).toPass({ timeout: 15000 });
     ```

3. **Spec Hygiene & Auth Reuse:**
   * Zero conditional `if (await locator.isVisible())` silent-pass guards.
   * Keep every file under `apps/web/e2e/` at `<= 400` lines; split feature groups into focused `*.spec.ts` files.
   * Call `ensureAuthenticatedSession(page, browser)` from `apps/web/e2e/auth.helper.ts` in `test.beforeEach` so authenticated runs sign in once per worker when `E2E_AUTHENTICATED=1`.

4. **Local Dev Run Checklist:**
   * Install Chromium once: `pnpm --filter @money-matters/web exec playwright install chromium`. If Chromium reports missing OS shared libraries on Linux, run `sudo ./apps/web/node_modules/.bin/playwright install-deps chromium` (avoid `sudo pnpm`).
   * `apps/web/playwright.config.ts` only auto-starts `apps/web` (`:3000`); start `pnpm dev` from repo root first so `apps/api` (`wrangler dev --port 3001`) is running too (`pnpm dev:inngest` optional).
   * Validate spec compilation & registration before finishing:
     ```bash
     pnpm --filter @money-matters/web exec tsc --noEmit && pnpm --filter @money-matters/web lint && pnpm --filter @money-matters/web exec playwright test --list
     ```
   * Run authenticated suite locally:
     ```bash
     E2E_AUTHENTICATED=1 E2E_EMAIL="<verified-email>" E2E_PASSWORD="<password>" pnpm --filter @money-matters/web test:e2e
     ```
