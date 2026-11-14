# Technical Implementation Plan — Final Deep-Audit Gap Closure

> **Scope:** Residual gaps identified across Batches 1–6 after a final codebase-wide pass.  
> **Execution Order:** `packages/types` -> `packages/core` -> `packages/i18n` -> `packages/db` -> `packages/capabilities/*` -> `apps/api` -> `apps/web` -> `apps/mobile` -> `docs` -> `pnpm validate:prod` -> `git commit`.  
> **Non-Negotiable Constraints (`AGENTS.md`):**
> - Zero `any`, `as any`, `as never`, `@ts-ignore`, `@ts-expect-error` (production or tests).
> - Files `<= 400` lines; React components/hooks `<= 100` lines; domain functions/utilities `<= 30` lines.
> - Zero inline hex colors outside `packages/ui/src/tokens.ts` and `globals.css`.
> - Zero uncached `new Intl.*` calls and zero hardcoded `"Australia/Sydney"` / `"en-AU"` in domain/UI formatting (use `DEFAULT_TIMEZONE` / `DEFAULT_LOCALE` from `@money-matters/types` or tenant/user locale).
> - Never read `.env*`, `.dev.vars*`, `seed_credentials.local.md`, or `.aider*`.
> - Always run `rm -f apps/mobile/.tsbuildinfo` before `pnpm --filter @money-matters/mobile typecheck`.
> - Do NOT stage or modify pre-existing dirty files outside this plan's scope.

---

## 1. `packages/types`
1. **Remove hardcoded `"Australia/Sydney"` in `MoveMoneyCommand`** (`packages/types/src/commands.types.ts:180`):
   - Replace `new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date())` with a UTC-12 lower bound (`new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString().slice(0, 10)`) so global clients are never rejected on valid "today" dates while exact tenant-timezone enforcement remains server-side in `moveMoneyCommand`.
2. **Audit Zod `.strict()`:** All command/input schemas in `commands.types.ts` and `file-notes.types.ts` already call `.strict()` before `.refine()`/`.superRefine()`. Verify `packages/types/src/allocation-strategy.types.ts`, `tenant.types.ts`, `ledger.types.ts`, and `envelope.types.ts` and add `.strict()` to any input DTO missing it.

---

## 2. `packages/core`
1. **Export `getCachedDateFormat` (`packages/core/src/formatters.ts:53`):**
   - Change `function getCachedDateFormat(...)` to `export function getCachedDateFormat(...)` (already re-exported via `export * from "./formatters.js"` in `packages/core/src/index.ts`).
2. **Verify `packages/core/src/australian-calendar.ts`:**
   - Replace raw `new Intl.DateTimeFormat(...)` calls at lines 25, 29, 48 with `getCachedDateFormat(...)` from `./formatters.js`.

---

## 3. `packages/i18n`
1. **Split `packages/i18n/src/dictionaries/en/settings.ts` (419 lines -> `<= 400` lines):**
   - Move `subscription`, `notifications`, and `bankAccounts` blocks (`L243–L418`) into `packages/i18n/src/dictionaries/en/settings-sections.ts` (`~180` lines).
   - Import and spread `...settingsSections` inside `packages/i18n/src/dictionaries/en/settings.ts` (`~245` lines), preserving the exact exported `settings` object shape and `as const` inference.
   - Verify with `pnpm check-i18n` and `pnpm --filter @money-matters/i18n test`.

---

## 4. `packages/db`
1. **Remove `as any` casts in `packages/db/src/get-envelope-balances.ts:28-30`:**
   - Replace `(query as any).groupBy` / `await (query as any)` with proper Drizzle query typing (or `const rows = await query.groupBy(transactionLedger.envelopeId)` since Drizzle's `select().from().where()` always exposes `.groupBy()`; update any unit test mock in `packages/capabilities/*` that omits `.groupBy` if needed, or narrow with a typed interface `{ groupBy?: (col: unknown) => Promise<BalanceRow[]> }` using `unknown`, never `any`).

---

## 5. `packages/capabilities/*`
1. **Remove `as any` in production code:**
   - `packages/capabilities/budgeting/src/commands/move-money.command.ts:40,70`: Replace `(sourceRow as any).envelope ?? sourceRow` and `(destRow as any).envelope ?? destRow` with a typed union/narrowing helper (`"envelope" in row ? row.envelope : row`).
2. **Eliminate uncached `new Intl.DateTimeFormat` and hardcoded `"Australia/Sydney"` / `"en-AU"`:**
   - Replace `new Intl.DateTimeFormat("en-CA", ...)` with `getTenantDateString` from `@money-matters/core` in:
     - `packages/capabilities/budgeting/src/commands/save-setup-budget-incomes.ts:49`
     - `packages/capabilities/budgeting/src/commands/income-schedule.ts:35`
     - `packages/capabilities/budgeting/src/commands/save-setup-budget-calculators.ts:22,26,30,143`
     - `packages/capabilities/budgeting/src/engine/allocation-engine.ts:104`
     - `packages/capabilities/simulation/src/queries/simulation-steps/one-off-simulation.ts:124`
     - `packages/capabilities/simulation/src/queries/simulation-steps/recurring-simulation.ts:210`
   - Replace `new Intl.DateTimeFormat(...)` with `getCachedDateFormat(...)` from `@money-matters/core` in:
     - `packages/capabilities/budgeting/src/engine/matrix-projection-engine.ts:107`
     - `packages/capabilities/budgeting/src/queries/income-split-analytics-buckets.ts:12` (accept `locale = DEFAULT_LOCALE` from `@money-matters/types` instead of hardcoded `"en-AU"`)
     - `packages/capabilities/transactions/src/queries/spending-analytics-buckets.ts:12` (accept `locale = DEFAULT_LOCALE` instead of hardcoded `"en-AU"`)
     - `packages/capabilities/assistant/src/matcher/date.parser.ts:6` (accept `timeZone = DEFAULT_TIMEZONE` and use `getCachedDateFormat("en-CA", { timeZone })`)
   - `packages/capabilities/billing/src/webhooks/handlers/invoice-events.ts:69`: Replace `currentPeriodEnd.toLocaleDateString("en-AU")` with `getCachedDateFormat(tenantLocale, { dateStyle: "medium", timeZone: tenantTz }).format(currentPeriodEnd)`.
   - Replace `"Australia/Sydney"` string literals in `packages/capabilities/budgeting/*`, `transactions/*`, and `tenant/*` with `DEFAULT_TIMEZONE` from `@money-matters/types` (where a fallback is required).
3. **Hard-delete audit (`AGENTS.md §3`):**
   - Replace `db.delete(expenseEvents)` / `db.delete(incomeEvents)` on `PENDING` generated schedule rows with soft-archive (`archivedAt: new Date()`, `archivedBy: userId`) or verify and document in `FUNCTIONAL_SPEC.md` if unconfirmed future `PENDING` schedule regeneration intentionally purges unconfirmed generated rows. Affected files:
     - `packages/capabilities/budgeting/src/commands/archive-envelope.command.ts:51`
     - `packages/capabilities/budgeting/src/commands/income-schedule.ts:80`
     - `packages/capabilities/budgeting/src/commands/envelope-schedule.ts:83`
     - `packages/capabilities/budgeting/src/commands/save-setup-budget-sync.ts:14,31,61,133`
     - `packages/capabilities/tenant/src/handlers/bank-account.ts:298,342`
4. **Eliminate `: any` / `as any` in capability test files (`AGENTS.md §4`):**
   - Replace `any` with typed `mockDb as unknown as DbOrTx` and explicit row types in:
     - `packages/capabilities/budgeting/src/queries/get-home-summary.query.test.ts`
     - `packages/capabilities/budgeting/src/queries/list-bill-coverage.test.ts`
     - `packages/capabilities/budgeting/src/commands/envelope-lifecycle.test.ts`
     - `packages/capabilities/budgeting/src/commands/envelope-window-restore.test.ts`
     - `packages/capabilities/budgeting/src/commands/reset-allocation-plan.test.ts`
     - `packages/capabilities/budgeting/src/commands/restore-item.test.ts`
     - `packages/capabilities/budgeting/src/commands/save-setup-budget.test.ts`
     - `packages/capabilities/budgeting/src/commands/move-money.command.test.ts`
     - `packages/capabilities/billing/src/index.test.ts`
     - `packages/capabilities/file-notes/src/router.test.ts`
     - `packages/capabilities/tenant/src/index.test.ts`

---

## 6. `apps/api`
1. **Clean `any` in `apps/api/src/routers/bank-reconciliation.test.ts`:**
   - Replace `any` / `mockDb: any` with `mockDb as unknown as DbOrTx` and explicit typed interfaces.
2. **Hard-delete alignment:**
   - `apps/api/src/routers/income/income-lifecycle.procedures.ts:49`: Align `.delete(incomeEvents)` with the soft-archive vs. generated-`PENDING`-purge rule applied in `packages/capabilities`.
3. **Tier 2 Router Unit Tests (`TEST-02`):**
   - Add dedicated `.test.ts` files (or grouped domain router tests) for the remaining routers using `appRouter.createCaller` with typed `DbOrTx` mocks covering auth (`UNAUTHORIZED`), happy-path delegation, and stealth privacy (`isPrivate`) enforcement:
     - `apps/api/src/routers/billing.router.test.ts`
     - `apps/api/src/routers/budgeting.router.test.ts`
     - `apps/api/src/routers/bug-reports.router.test.ts`
     - `apps/api/src/routers/expenses.router.test.ts`
     - `apps/api/src/routers/file-notes.router.test.ts`
     - `apps/api/src/routers/income.router.test.ts`
     - `apps/api/src/routers/notifications.router.test.ts`
     - `apps/api/src/routers/payday.router.test.ts`
     - `apps/api/src/routers/simulation.router.test.ts`
     - `apps/api/src/routers/tenant.router.test.ts`
     - `apps/api/src/routers/transactions.router.test.ts`
     - `apps/api/src/routers/transfers.router.test.ts`

---

## 7. `apps/web`
1. **Split remaining 3 files `> 400` lines (`ARCH-01`):**
   - `apps/web/src/components/landing/InteractivePaydayEngine.tsx` (505L) -> extract simulator state hook (`useInteractivePaydaySimulator.ts`) and sub-components (`SimulatorEnvelopeGrid.tsx`, `SimulatorTransferModal.tsx`) so every file is `<= 350` lines.
   - `apps/web/src/providers/ProductTourContext.tsx` (424L) -> extract `TOUR_STEPS` configuration (`tour-steps.ts`) and spotlight geometry helpers (`tour-geometry.ts`), preserving all `data-tour` selectors and routes.
   - `apps/web/src/app/setup/page.tsx` (402L) -> extract `SetupStepHeader.tsx` or `SetupStepContent.tsx` into `apps/web/src/app/setup/components/` so `page.tsx` is `<= 350` lines.
2. **Replace inline hex colors (`UI-02`):**
   - `apps/web/src/app/dashboard/components/SidebarContent.tsx:109,177` -> `DESIGN_TOKENS.colors.brandBlue`
   - `apps/web/src/app/dashboard/components/DashboardMobileHeader.tsx:76` -> `DESIGN_TOKENS.colors.brandBlue`
   - `apps/web/src/app/dashboard/income-split/components/PaydayCelebrationCard.tsx:119,148` -> `DESIGN_TOKENS.colors.emeraldGreen` / `brandBlue` / `white`
3. **Replace uncached `new Intl.DateTimeFormat` & `"Australia/Sydney"` / `"en-AU"` (`UI-04` / `AGENTS.md §5`):**
   - Use `getTenantDateString` / `getCachedDateFormat` from `@money-matters/core` and `DEFAULT_TIMEZONE` / `DEFAULT_LOCALE` from `@money-matters/types` in:
     - `apps/web/src/app/dashboard/income-and-bills/components/MarkPaidModal.tsx:62`
     - `apps/web/src/app/dashboard/components/AttentionItemsList.tsx:80`
     - `apps/web/src/app/dashboard/income-split/components/useIncomeSplitState.ts:33,44,119`
     - `apps/web/src/app/dashboard/envelopes/hooks/useEnvelopesTableData.ts:116,127`
     - `apps/web/src/app/setup/page.tsx:63`, `useSetupWizardPrepopulation.ts:108`, `SetupGoalsStep.tsx:27`, `useSetupGoalsState.ts:34`, `useSetupIncomeState.ts:20`, `useSetupWizardState.ts:51,222`
     - `apps/web/src/components/web/quick/useQuickActionState.ts:24,25`
     - `apps/web/src/components/web/useEnvelopeFormModalState.ts:101,247`
     - `apps/web/src/components/web/IncomeFormModal.tsx:68,83,95`
     - `apps/web/src/components/web/TransferModal.tsx:65`
     - `apps/web/src/providers/LocaleProvider.tsx:44-52,78,85`
     - `apps/web/src/app/dashboard/settings/components/HouseholdDetailsSection.tsx:31,41,64,92`, `settings/page.tsx:45`
     - `apps/web/src/components/auth/SignUpForm.tsx:38,40`
4. **Remove all 29 `if (await ...)` conditional guards in `apps/web/e2e/screen-by-screen-features.spec.ts` (`TEST-01`):**
   - Gate authenticated `/dashboard/*` flows via `E2E_AUTHENTICATED === '1'` (or `test.skip(!isAuthenticatedE2E, ...)` / explicit `/sign-in` redirect assertion when unauthenticated) and replace every `if (await locator.isVisible())` with unconditional `await expect(locator).toBeVisible()`.

---

## 8. `apps/mobile`
1. **Remove `any[]` in production hooks:**
   - `apps/mobile/src/components/paychecks/useIncomeExpenseForm.ts:59-60` -> type `rawPools` and `bankAccounts` using `@money-matters/types` DTOs.
   - `apps/mobile/src/components/transactions/hooks/useTransactionsFilter.ts:15` -> type `transactions` using `@money-matters/types` `TransactionItemDto[]` (or explicit interface).
2. **Replace inline hex colors (`UI-02`) with `DESIGN_TOKENS.colors` from `@money-matters/ui/tokens`:**
   - `apps/mobile/src/components/paychecks/MobilePaydayMetricsGrid.tsx:81-111`
   - `apps/mobile/src/components/paychecks/MobilePaydayCelebrationCard.tsx:107-162`
   - `apps/mobile/src/components/paychecks/MobileUnsavedSplitExitDialog.tsx:34-157`
   - `apps/mobile/src/components/paychecks/MobileIncomeEventInlineCard.tsx:118-130`
   - `apps/mobile/src/components/paychecks/MobilePaydayActionButtons.tsx:48-168`
   - `apps/mobile/src/components/paychecks/IncomeExpenseFormFields.tsx:286-287`
   - (Add any missing semantic surface/slate tokens to `packages/ui/src/tokens.ts` if not already defined.)
3. **Replace uncached `new Intl.DateTimeFormat` & `"Australia/Sydney"` / `"en-AU"` (`UI-04` / `AGENTS.md §5`):**
   - Use `getTenantDateString` from `@money-matters/core` and `DEFAULT_TIMEZONE` / `DEFAULT_LOCALE` from `@money-matters/types` in:
     - `apps/mobile/src/components/paychecks/useIncomeExpenseMutations.ts:7`
     - `apps/mobile/src/components/setup/SetupGoalCard.tsx:62`
     - `apps/mobile/src/app/(setup)/goals.tsx:34,64,116`
     - `apps/mobile/src/app/(setup)/income.tsx:39`
     - `apps/mobile/src/components/envelopes/form/useMobileEnvelopeFormState.ts:80,226`
     - `apps/mobile/src/context/useSetupWizardPrepopulation.ts:51,106`
     - `apps/mobile/src/context/SetupWizardContext.tsx:134`
     - `apps/mobile/src/components/auth/useSignUpForm.ts:17,19`
     - `apps/mobile/src/components/settings/profile/useMobileProfileData.ts:39,48,69`
     - `apps/mobile/src/components/settings/HouseholdDetailsSection.tsx:27,37,48`
     - `apps/mobile/src/components/settings/HouseholdReadOnlyView.tsx:61`
     - `apps/mobile/src/lib/locale-config.ts:16,17`
     - `apps/mobile/src/providers/AppProviders.tsx:45,48`

---

## 9. Documentation Sync & Validation Gate
1. **Update MECE Registries (only affected sections):**
   - `FUNCTIONAL_CAPABILITIES_INVENTORY.md` (`§7`): Update i18n file listing (`settings-sections.ts`).
   - `FUNCTIONAL_SPEC.md`: Document generated-`PENDING` schedule event lifecycle (soft-archive vs. regeneration purge).
   - `PRODUCTION_READINESS_PLAN.md`: Record final verification results after `pnpm validate:prod`.
2. **Run Full Gate:**
   - `rm -f apps/mobile/.tsbuildinfo && pnpm validate:prod` (must exit `0` with zero errors).
3. **Commit Locally:**
   - Stage only files modified by this plan and create a clean conventional commit (ask user before `git push`).
