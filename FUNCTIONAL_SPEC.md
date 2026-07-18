# Functional Specification — money-matters

> **Last updated:** 2026-07-11  
> **Canonical reference for product behaviour. Update this file whenever functional decisions are made.**  
> Derived from APP_DESCRIPTION.md + design Q&A sessions. Where this file conflicts with APP_DESCRIPTION.md, this file wins.

---

## 1. Product Vision

Money-matters is a **proactive paycheck allocator** for Australian salaried professionals and families. It solves the gap between earning money and confidently knowing where it needs to go.

Every time income arrives, the app recommends a priority-weighted, due-date-aware split of that income across virtual savings "buckets", so critical expenses are always funded in time.

**Success metric:** A household that never misses a payment because they didn't save enough, and always knows exactly what they can spend day-to-day.

**Differentiator vs YNAB:** The math of *how to split each paycheck* is done for you (recommendation engine). You don't need to manually assign dollars to categories — you just review and approve.  
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
| **Member** | Invited partner. Full access to all budgets, categories, transactions, and allocation reviews. |

**Partner invite is V2.** The `household_members` table is built in V1 schema — Owner is the first row with `role = OWNER`.

---

## 3. Monetisation

| Tier | Features |
|---|---|
| **Free** | Manual allocation (rules-based engine), full core flows |
| **Premium** | AI-powered smart allocation, priority suggestions, shortfall recovery plans, AI-guided budget estimation |

Premium gated by `premiumEnabled` feature flag on the Household. V1 implements Free tier only.

---

## 4. Category Types (Canonical)

| Type | Meaning | Allocation treatment |
|---|---|---|
| `MAJOR` | Large, potentially irregular expenses. One-off (holiday) or recurring (private school fees). Saved toward over multiple paychecks. | Has target amount + due date or recurrence rule. Engine computes gap ÷ paychecks remaining. |
| `RECURRING` | Regular bills. Predictable amounts and schedules (utilities, subscriptions, rent/mortgage). | Has target amount + recurrence rule. Treated identically to MAJOR by the engine. |
| `EVERYDAY` | Day-to-day discretionary spending (groceries, petrol, eating out). | No due date. Funded by residual after MAJOR + RECURRING addressed. |

**MAJOR vs RECURRING:** Semantically different (UX, reporting) but **treated identically by the allocation engine**. Both have target + schedule. The distinction is informational — MAJOR suggests saving up, RECURRING suggests regular bill payment.

---

## 5. Priority System

- Priority is an **integer rank** — lower number = higher priority (1 = most critical).
- Multiple categories **may share the same priority rank** (e.g., mortgage and health insurance both priority 1).
- Within a priority tier, allocations are **pro-rata by gap size** (not sequential).
- EVERYDAY categories have **no priority** — they are always residual.
- Priority applies only to MAJOR and RECURRING categories.

---

## 6. Recurrence Rules

- Income sources and category schedules use **iCalendar RRULE strings** (RFC 5545) for recurrence.
- Examples: weekly salary = `FREQ=WEEKLY;BYDAY=FR`, fortnightly = `FREQ=WEEKLY;INTERVAL=2;BYDAY=WE`, monthly = `FREQ=MONTHLY;BYDAY=15`.
- End date or count: `UNTIL=20271231` or `COUNT=52`.
- One-off: no recurrence rule, just a single date.
- The Inngest cron resolves the next occurrence date from the RRULE to generate `IncomeEvent` records.
- UI presents a friendly picker (weekly/fortnightly/monthly/custom) that translates to RRULE internally.

---

## 7. Pre-Populated Category List (AU Households)

Shown in the setup wizard. Users can select, deselect, or add custom categories.

### RECURRING (Bills)
- Rent / Mortgage Repayment
- Electricity
- Gas
- Water
- Internet / NBN
- Mobile Phone Plan
- Health Insurance
- Car Insurance
- Home & Contents Insurance
- Streaming Services (Netflix, Spotify, etc.)
- Gym Membership
- Council Rates
- Body Corporate / Strata Fees

### MAJOR (Save-Toward)
- Emergency Fund *(nominated as default excess category)*
- Car Registration
- Car Maintenance & Servicing
- Home Maintenance & Repairs
- Annual Holiday / Travel
- Christmas / Gifts
- Medical / Dental (out-of-pocket)
- School Fees / Education
- New Appliances / Electronics
- Clothing & Wardrobe

### EVERYDAY (Discretionary — tracking optional)
- Groceries
- Petrol / Transport
- Eating Out & Takeaway
- Coffee & Snacks
- Personal Care
- Kids Activities & Sport

> **Note:** EVERYDAY categories are tracking helpers — the residual amount from allocation goes into the EVERYDAY bucket as a whole. Individual EVERYDAY categories are optional for those who want finer-grained daily tracking.

---

## 8. Core User Flows

### 8.1 Setup Wizard (new household)

Triggered on first sign-up. Can also be re-entered from Settings → Household → Re-run Setup.

**Step 1 — Income Sources**
- Add one or more income sources.
- Fields: name, type (`SALARY` / `FREELANCE` / `OTHER`), expected net amount (after tax), recurrence rule (friendly picker → RRULE), expected first income date, optional end (date or count).
- Receiving bank account (linked in Step 3 — skip-able, linkable later).

**Step 2 — Categories**
- Pre-populated list shown. User selects relevant categories + can add custom.
- Fields per category: name, type (MAJOR / RECURRING / EVERYDAY), icon, colour.

**Step 3 — Category Configuration** (MAJOR + RECURRING only)
- For each: target amount, schedule (RRULE or single due date), priority rank (drag-to-reorder or number entry).
- Nominate one MAJOR category as the **default excess bucket** (Emergency Fund recommended).

**Step 4 — Bank Accounts**
- Add bank accounts (account name, purpose tag: `INCOME_LANDING` / `SAVINGS` / `EVERYDAY`, offset flag).
- Map each income source to an `INCOME_LANDING` account.
- V1: accounts mapped at purpose level. Per-category account mapping is V2.
- Recommendation: "We suggest at least 2 accounts — a savings/bills account plus an everyday spending account."

**Step 5 — Setup Complete**
- Household dashboard unlocked.
- First income event auto-generated if payday is within 30 days.

---

### 8.2 Income Event + Allocation Review ("Paycheck Review")

```
IncomeEvent created (cron or manual)
    │
    ▼
AllocationPlan [DRAFT] generated by allocation engine
    │
    ▼ Push notification: "Your paycheck is coming — review your allocation"
    │
    ▼
User opens "Paycheck Review" screen
    │
    ├── Sees: recommended split per category
    │         with reasoning: "needs $X by [date], Y paychecks left"
    │
    ├── Can: Accept all / Adjust individual amounts (remainder auto-rebalanced)
    │
    └── Confirms → AllocationPlan [CONFIRMED]  (synchronous DB transaction)
                 → Category balances updated
                 → Transfer instructions shown per savings account
```

**IncomeEvent creation rules:**
- Nightly Inngest cron generates `UPCOMING` events from active income source RRULEs.
- Cron does not duplicate — checks for existing event in the period window first.
- User can manually create an `IncomeEvent` at any time (irregular/casual income, bonus).
- User can edit `expectedAmount` and `expectedDate` on any `UPCOMING` event before it becomes `DRAFT`.
- Plan becomes `DRAFT` when the income event date is ≤ 7 days away (configurable).

**AllocationPlan status lifecycle:**
`DRAFT` → `REVIEWED` (user opened) → `CONFIRMED` (user approved)

**Transfer instructions after confirmation (V1):**
- One instruction per distinct SAVINGS account: "Transfer $X to [Account Name]"
- Offset accounts: no instruction shown — labelled "Offset account — no transfer needed"

---

### 8.3 Expense Entry ("Daily Drawdown")

- Quick-entry FAB always visible.
- Fields: amount, category (recently used shown first), optional note.
- On confirm: `TransactionLedger` debit record created, category balance reduced.
- If balance goes negative after debit: **ShortfallAlert** shown immediately.

---

### 8.4 Shortfall Resolution

Triggered when a category balance goes negative after an expense entry.

1. App shows `ShortfallAlert`: category name, shortfall amount.
2. Engine recommends donor: lowest-priority MAJOR/RECURRING category with sufficient surplus.
3. User approves recommendation OR picks a different donor manually.
4. `ShortfallEvent` recorded: donor, recipient, borrowed amount, status `BORROWED`.
5. Both category balances updated immediately (synchronous transaction).
6. Future allocation plans automatically include a **repayment line** to the donor category (the repayment amount = outstanding shortfall, added to donor's gap). User can **defer** the repayment for that plan cycle.
7. `ShortfallEvent.status` = `REPAID` once cumulative repayments cover the borrowed amount.

**Shortfall resolution is always user-approved.**

---

### 8.5 Insufficient Income Handling

When engine determines income cannot fully fund all highest-priority categories:

1. Compute total deficit across all priority-1 categories.
2. **Emergency Fund available:** Propose `ShortfallEvent` borrow in the plan, flagged prominently. User must approve.
3. **No Emergency Fund / insufficient:** Show alert. Engine pro-rates partial funding across priority-1 as a starting point. User must resolve before confirming.

Engine **never silently under-funds.** Reasoning always surfaced with every allocation line.

---

### 8.6 Savings Reconciliation (V1)

Triggered by user from Reconciliation screen (monthly or on-demand).

1. For each registered SAVINGS account (sequentially):
   - App shows: **Expected balance** = Σ category balances mapped to this account's purpose.
   - User enters their actual account balance.
   - If delta: user adjusts individual category balances manually until sum matches actual.
2. `SavingsReconciliation` record saved per account.

**V1:** Free tier — manual adjustment only. V2 adds AI auto-spread (premium).

---

### 8.7 Category Health Dashboard (Home Screen — bottom half)

- All categories as cards grouped by type (MAJOR → RECURRING → EVERYDAY).
- Each card: current balance, target amount, % funded, next due date, traffic-light status.
- Traffic light logic:
  - 🟢 **Green:** Balance ≥ (target × days elapsed / days in period)
  - 🟡 **Amber:** Balance < expected accumulation but positive
  - 🔴 **Red:** Balance ≤ 0 OR will miss due date at current pace
- Tap a card → full history of allocations + drawdowns.

---

### 8.8 Next Paycheck Readiness (Home Screen — top half)

- Next expected income event: source name, expected date, expected amount.
- Summary: N on track, N at risk.
- CTA: "Review Allocation" if `DRAFT` plan exists; "Payday in X days" countdown otherwise.

---

### 8.9 Annual Rollover

**Organic rolling — confirmed.**
- Balances carry forward indefinitely.
- User updates targets as life changes.
- Engine always computes gap from current actual balance — over-funded categories receive less automatically.

---

## 9. Bank Account Model (V1)

- Household registers 1–3 bank accounts.
- Each account has a purpose: `INCOME_LANDING`, `SAVINGS`, `EVERYDAY`. An account can serve multiple purposes.
- Income source nominates one `INCOME_LANDING` account.
- **Offset accounts:** purpose = `SAVINGS`, `isOffset = true`. No transfer instruction generated.
- After allocation confirmation, one transfer instruction per SAVINGS account: "Transfer $X to [Name]".
- Amount per savings account = Σ category allocations of types (MAJOR + RECURRING) associated with that account. V1: all MAJOR + RECURRING allocations go to all SAVINGS accounts pro-rata by balance if multiple exist, OR user nominates a primary savings account during setup. *See V2_SCOPE.md for per-category account mapping.*

---

## 10. Push Notifications

| Trigger | Message |
|---|---|
| Income event upcoming (7 days before) | "Your [Source] paycheck is expected on [date] — get ready to review your allocation" |
| Allocation plan created (DRAFT) | "You have an unreviewed allocation plan. Tap to review your paycheck split." |
| Category goes Red status | "[Category] is at risk of missing its due date. Tap to review." |
| Reconciliation reminder (30 days since last) | "It's been 30 days since your last reconciliation. Tap to check your savings balance." |

Implementation: Expo Push Notifications + Inngest scheduled workflows.

---

## 11. Design System

| Token | Value | Usage |
|---|---|---|
| Primary (Navy) | `#1B2B4B` | Backgrounds, headers |
| Accent (Teal) | `#00B4A6` | CTAs, highlights, progress |
| Background | `#F7F8FA` | Screen backgrounds |
| Green | `#22C55E` | On track status |
| Amber | `#F59E0B` | At risk status |
| Red | `#EF4444` | Underfunded status |
| Card radius | 16px | All cards/tiles |
| Font | Inter | All text |

Motion: subtle — card reveals on scroll, number counting animations on balance changes. Empty states warm and encouraging.

Layout & Headroom: Screen layouts are standard and consistent. They include dynamic top safe-area padding (headroom) preventing content overlap under device notches. A unified sticky header bar displays app branding (or back button for nested views), page titles, and a clickable user profile avatar. Clicking the profile avatar reveals a dropdown spillover menu containing user detail and account actions (dashboard, settings, sign out).

Bottom nav: **Home** · **Buckets** · **Transactions** · **Paychecks** · **Settings**  
Quick-add FAB: always visible, primary action.

---

## 12. Open Questions

> None currently pending. All design decisions captured above.  
> Add new questions here as they arise during implementation.
