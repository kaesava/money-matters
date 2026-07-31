# Implementation Plan — Wave 3 Architecture Enhancements & Refinements

> **Generated:** 2026-08-01  
> **Status:** Proposed Implementation Plan (Pending User Approval).  
> **Scope:** Smart Due-Date Allocation Engine, Aggregated Bills Pool Health, Exact Paycheck Annualization, Category-Type Level Bank Mapping, Guided 3-Tap Reconciliation, and Incidental Buffer.

---

## Proposed Changes

### Component 1: Smart Due-Date & Essential Waterfall Allocation Engine
#### [MODIFY] [allocation-engine.ts](file:///home/kaesava/projects/money-matters/packages/capabilities/budgeting/src/engine/allocation-engine.ts)
#### [MODIFY] [allocation-engine.test.ts](file:///home/kaesava/projects/money-matters/packages/capabilities/budgeting/src/engine/allocation-engine.test.ts)
- Add `isEssential` boolean and `dueDate` ISO string to `EngineBucket`.
- Update `runAllocationEngine` to sort `REGULAR` bills by essential status first, then by due date urgency relative to `paycheckDate`.
- Replace `30.4375` average days proration with exact annualization scaling (`(monthlyAmount * 12) / paychecksPerYear`).

---

### Component 2: Category-Type Level Bank Account Mapping & Bills Pool Health
#### [MODIFY] [category.ts](file:///home/kaesava/projects/money-matters/packages/db/src/schema/category.ts)
#### [MODIFY] [bank_account.ts](file:///home/kaesava/projects/money-matters/packages/db/src/schema/bank_account.ts)
#### [NEW] [BillsPoolHealthCard.tsx](file:///home/kaesava/projects/money-matters/apps/web/src/components/BillsPoolHealthCard.tsx)
- Support linking physical `bank_accounts` by `purpose` (`REGULAR`, `EVERYDAY`, `GOAL`) to category bucket types.
- Add `BillsPoolHealthCard` component on Web and Mobile showing *Current Bills Pool Balance vs Total Bills Due Before Next Payday*.

---

### Component 3: Paycheck-Cycle Sweeps (On Payday Morning)
#### [MODIFY] [burst-engine.ts](file:///home/kaesava/projects/money-matters/packages/capabilities/budgeting/src/engine/burst-engine.ts)
- Align sweep executions with the user's exact paycheck cycle dates instead of calendar month boundaries.

---

### Component 4: Guided 3-Tap Reconciliation & Incidental Buffer
#### [MODIFY] [ReconciliationModal.tsx](file:///home/kaesava/projects/money-matters/apps/web/src/components/ReconciliationModal.tsx)
#### [NEW] [MobileReconciliationModal.tsx](file:///home/kaesava/projects/money-matters/apps/mobile/src/components/MobileReconciliationModal.tsx)
- Upgrade `ReconciliationModal` to a guided 3-step wizard:
  - Step 1: Input actual bank balance.
  - Step 2: Show discrepancy amount.
  - Step 3: 1-tap absorption choices: (A) Absorb from Everyday Pool, (B) Absorb from Incidental Buffer, (C) Log as Unbudgeted Expense.

---

## Verification Plan

### Automated Tests
- Run `pnpm test` across `@money-matters/capability-budgeting`, `@money-matters/capability-transactions`, and all monorepo packages.
- Run `pnpm typecheck` across all 14 monorepo packages.

### Manual Verification
- Test allocation engine with upcoming due dates and essential flags.
- Test 3-tap reconciliation flow on web and mobile.
