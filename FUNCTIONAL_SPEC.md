# Functional Specification — money-matters

> **Last updated:** 2026-07-19  
> **Canonical reference for product behaviour. Update this file whenever functional decisions are made.**  
> Derived from APP_DESCRIPTION.md + design Q&A sessions. Where this file conflicts with APP_DESCRIPTION.md, this file wins.

---

## 1. Product Vision

Money-matters is a **proactive paycheck allocator** for Australian salaried professionals and families. It solves the gap between earning money and confidently knowing where it needs to go.

Every time income arrives, the app automatically runs a waterfall cascade to allocate that income across virtual savings "buckets", so critical expenses and savings are always funded in time.

**Success metric:** A household that never misses a payment because they didn't save enough, and always knows exactly what they can spend day-to-day.

**Differentiator vs YNAB:** The math of *how to split each paycheck* is done for you (allocation waterfall). You don't need to manually assign dollars to categories.  
**Differentiator vs passive trackers (Frollo, Pocketbook):** Forward-looking, not backward-looking. No bank sync required.

---

## 2. Audience & Roles

**Target:** Salaried professionals and families (AU), aged 28–60, moderate-to-complex expense structures (mortgages, children, insurance, irregular major costs).

### Household Model
- A **Household** is the root entity. All data belongs to a Household.
- `tenantId` = `householdId` — the isolation boundary for all data.
- Multi-user within a household: **all members share full read/write access** to all data (no private categories in V1).

### Roles

| Role | Capabilities |
|---|---|
| **Owner** | First user to sign up. Manages setup, income sources, category config, can invite partner. |
| **Member** | Invited partner. Full access to all budgets, categories, transactions. |

**Partner invite is V2.** The `household_members` table is built in V1 schema — Owner is the first row with `role = OWNER`.

---

## 3. Monetisation

| Tier | Features |
|---|---|
| **Free** | Manual allocation (rules-based engine), full core flows |
| **Premium** | AI-powered smart allocation, can-afford indicators, priority suggestions |

Premium gated by `premiumEnabled` and `canAffordCalculator` feature flags.

---

## 4. Category Types (Canonical)

| Type | Display Name | Allocation treatment |
|---|---|---|
| `SAVINGS` | Save Toward | Has target amount + target date. Waterfall engine funds these monthly by computing (target - balance) / monthsToTarget. |
| `REGULAR` | Regular Bills | Has monthly amount. Waterfall engine prorates the monthly amount based on paycheck frequency. |
| `EVERYDAY` | Everyday Spending | Discretionary day-to-day pool. Funded by residual income swept from the waterfall. |

---

## 5. Paycheck Cascade Allocation Waterfall

The waterfall cascade runs automatically when paycheck events occur:
1. **REGULAR categories**: Prorate monthly amount by paycheck frequency (`monthlyAmount * paycheckFrequencyDays / 30.4375`).
2. **SAVINGS committed categories (`isCommitted = true`)**: Allocate needed monthly contribution to keep on track for `targetDate`.
3. **SAVINGS uncommitted categories (`isCommitted = false`)**: Allocate remaining target contribution if funds permit.
4. **EVERYDAY excess category**: Sweeps all residual income into the everyday spending pool.

---

## 6. Pre-Populated Category List (AU Households)

Shown in the setup wizard. Users can select presets or add custom categories.

### REGULAR (Bills)
- Rent / Mortgage Repayment
- Electricity
- Internet / NBN
- Insurance

### SAVINGS (Save-Toward)
- Emergency Fund *(nominated as default excess category)*
- Annual Holiday / Travel
- Car Replacement

### EVERYDAY (Everyday Spending)
- Groceries
- Petrol / Transport
- Eating Out & Takeaway

---

## 7. Core User Flows

### 7.1 Setup Wizard (new household)
- **Step 1 — Income Sources**: Add income name, type, expected net amount, and frequency.
- **Step 2 — Categories**: Select from default presets.
- **Step 3 — Category Configuration**: Setup target amounts/dates for SAVINGS and monthly bills for REGULAR.
- **Step 4 — Bank Accounts**: Add bank account tag (e.g. INCOME_LANDING, SAVINGS, EVERYDAY).

### 7.2 "Can We Afford This?" Calculator
This is the key differentiator widget:
- User inputs a target transaction amount.
- **YES**: Verdict returns green if it fits within the everyday discretionary pool.
- **YES_WITH_IMPACT**: Verdict returns amber if it exceeds everyday pool but fits within uncommitted savings surplus.
- **WAIT**: Verdict returns amber if the next paycheck is within 14 days and resolves the amount.
- **NO**: Verdict returns red if the amount exceeds all pools.

---

## 8. Bank Account Model
- Bank accounts are tagged with a purpose: `INCOME_LANDING`, `SAVINGS`, `EVERYDAY`.
- Confirmation automatically handles allocations by printing credit/debit records to the ledger.
