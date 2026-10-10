# FUNCTIONAL_SPEC.md — money-matters

> **Last updated:** 2026-10-10  
> **Status:** Fully synchronized across all Master Plan phases & Pool-Centric Architecture enhancements: Radical Low-Friction UX Simplification across Web and Mobile with 100% parity, 4-Pillar MECE Navigation ("Envelopes", "Plan", "Activity", "Allocate Payday"), Single Hero Metric ("Safe to Spend Right Now" with daily pace `~$X/day to payday`), Progressive Payday Allocation Disclosure with 1-tap `[ Confirm Income Split ]` celebration card, Instant Modal "Can I Afford It?" tool, 1-Tap Shortfall Resolution from Surplus, Day-1 Interactive Payday Sandbox in Setup wizard, Automated Everyday Spending Estimation Model ($M \times 12 / 365$) with Safety Buffer Floor protection (`safetyBufferFloor`) and zero manual receipts, Payday Rollover with 1-tap reported leftover cash deduction chip, Strict Pool Topology Constraints (at most 1 Shared Everyday + 1 Shared Bills pool per household, at most 1 Private Everyday + 1 Private Bills pool per partner; multiple Goals allowed), Action Queue prioritization, Pool-Centric Model (`Bank Account → Pool → Category`), `getPoolBalancesMap` DB-side aggregate balance utility in `@money-matters/db`, `budgetingRouter` consolidating pool, category, and budgeting RPC procedures, 100% `privateTenantProcedure` RLS session context injection across private routes (bank accounts, pools, categories, income, payday, expenses, reconciliation), immutable confirmed payday allocation plans with client-side form recalculation, authoritative `SCHEMA_DATA_DICTIONARY.md` and automated `pnpm audit:schema` verification, cascading pool soft-archival to child categories, last-category-in-pool archival protection, 100% i18n externalization (`en.ts`, with `ja.ts` archived for Release 2), AST-based `check-i18n` validator, standardized terminology ("Envelopes", "Bills", "Plan", "Activity"), Centralized Form Input Defenses (12-digit amount cap, string HTML/script stripping, date-picker enforcement, mandatory red asterisk UX, and dynamic submit button state blocking), 100% Vitest unit test coverage, and active Neon PostgreSQL DB schema & seed dispatches.

---

## 1. Overview & Core Philosophy

Money Matters is a forward-looking allocation budget app designed for Australian households and families.
- **Commercial Model**: 60-day full Household trial on sign-up (no credit card required). Covers 2 full monthly pay and bill cycles. On Day 61 (`NOW() > trialEndsAt`), the account enters `TRIAL_GRACE` (7-day read-only grace period where dashboard data is viewable but mutations are blocked). On Day 68 (`NOW() > trialGraceEndsAt`), the account enters `TRIAL_EXPIRED` hard paywall lockdown, redirecting all dashboard routes to the isolated `/subscription/expired` holding screen. Users can upgrade ($9.95 AUD / month or $89 AUD / year) or download their data via Zipped CSV Export so users are never "holding their data hostage."
- **Unified Product Tier (Full Access)**: All users enjoy complete access to the 5-step waterfall engine, unlimited transaction history, unlimited Goal pools, 1-click bank balance alignment, **Household Partner Invites**, **Private Pools**, and **Private Personal Bank Accounts** during their 60-day trial or active subscription.
- **Pool-Centric Architecture**: Budgeting, allocations, money movements, and reconciliation operate at the **Pool** level (`Bank Account → Pool → Category`). Categories are sub-tags for expense tracking (`EVERYDAY` and `REGULAR` pools contain categories; `GOAL` pools operate directly without sub-categories).
- **Immutable Pool Bank Account & Type Linking**: Once a Pool is created, its linked Bank Account (`bankAccountId`) and Pool Type (`poolType`) are strictly immutable to preserve historical ledger auditability and prevent stealth privacy leaks. Moving a Pool to a different Bank Account requires archiving the old Pool and creating a new one linked to the target account.
- **Unbudgeted Buffer Constraint**: A Bank Account's Unbudgeted Buffer / Reserved Funds cannot exceed its Current (Last Known) Balance. Inline validation enforces this limit during creation and edit.
- **Orthogonal Privacy Flag (`isPrivate: boolean`) & 100% Stealth Privacy**: Privacy is set on the **Bank Account** level (`bank_accounts.isPrivate`) and inherited by all contained Pools and Categories via `innerJoin`. PostgreSQL Row-Level Security (RLS) with session variable context injection (`privateTenantProcedure`) guarantees 100% stealth privacy isolation.

- **Everyday Pools**: Discretionary spending pools linked to transaction accounts.
- **Regular Bills Pools**: Unified pools for recurring obligations. Sub-categories serve as expense sub-tags and monthly target benchmarks.
- **Goal Pools**: Target sinking funds with target amounts and dates (Emergency Expenses buffer, vehicle maintenance, holidays). GOAL pools operate directly without sub-categories. In the Pools table, target dates are clearly displayed directly underneath the progress percentage badge (`15 Dec 2026`).
- **3-Tab Income & Expenses Command Center (`/dashboard/income-and-bills`)**:
  1. *Tab 1: Income Allocation Grid*: Interactive forward-looking 12-month spreadsheet grid for payday planning out to 12 months with subtle overdue badges on past columns.
  2. *Tab 2: Upcoming*: Pending/un-actioned scheduled events queue ordered by ascending date with subtle overdue highlighting, clickable event name hyperlinks allowing direct editing of individual events (Name, Date, Amount), single-row actioning (*Run Split* hyperlinked action for Income launching the Income Split screen `/dashboard/income-split`, *Transfer* modal, *Mark Spent*, *Delete*), full-width search bar (`w-full md:w-80 flex-1 max-w-md`), and 100% header-to-cell alignment parity.
     - *Mark Spent Modal*: Validates payment dates against future dates (`max={todayStr}` in Sydney timezone), enforces positive amounts (`> $0.00`), correctly identifies target pool balances, and prompts with "Select Funding Pools to cover shortfall:" when a shortfall exists. Nonzero funding transfers are executed first in the transaction ledger before the expense event is confirmed (`status = 'CONFIRMED'`), ensuring confirmed events no longer influence the waterfall engine.
  3. *Tab 3: Setup*: Structured resizable tables for recurring Income Schedules and Expense Schedules with custom interval ("Every N") support, top unified search input, embedded "+ Add" buttons, clickable schedule name edit hyperlinks, and discreet modal archiving.
- **Dedicated Income Split Screen (`/dashboard/income-split`)**:
  - *Standard Layout & Seamless Navigation*: Integrates with the standard Dashboard shell (desktop sidebar, mobile navigation header, legal/version footer, and FAB) matching other primary dashboard screens. Features the forward-looking **12-Month Income Split** overview when visited without parameters (accessible directly via `[ 📅 12-Month Income Split ]` in Paychecks and `12-Month Split →` in Dashboard), and the parameterized split studio `/dashboard/income-split?id=[incomeEventId]&returnTo=[path]`. Refresh-safe (`F5`) and deep-linkable.
  - *Sleek Header with Plan Source Badges & Prominent Re-calculate*: Crystal-clear badges distinguish `✨ Auto-Calculated` (waterfall engine), `💾 Custom Saved Plan`, and `✓ Confirmed & Executed` with informative tooltips. Prominently features `🔄 Re-calculate` button: on auto plans, refreshes waterfall allocations from current paycheck amount; on saved custom plans, prompts confirmation dialog to discard custom overrides and re-run the 5-step waterfall engine.
  - *Clean Serene Finance Pool Table (`IncomeSplitPoolTable`)*: High-density structured table replacing busy card stacks with 100% column header/cell alignment parity (Left for Pool, Center for Target, Right for Balance, Right for Allocation & Controls). Features collapsible subtle group headers (`▼ Everyday Pools`, `▼ Bills Pools`, `▼ Goals`) with group subtotals allowing users to collapse reviewed sections. Clean direct amount inputs with quick chips `[100%]`, `[$0]` for fast adjustments with zero confusing sliders or noisy tags.
  - *Reactive Auto-Surplus & Elastic Deficit*: The designated Surplus pool automatically absorbs residual funds in real time without its own slider. Highlighted in emerald with an `Auto-Surplus` badge. If allocations exceed income, Surplus turns red with an active deficit banner (`-$X.XX Deficit`), disabling "Save" and "Run Income Split" until balanced.
  - *Bank-Account-Aware Transfer Rollup (`BankTransferRollupCard`)*: Automatically tracks the paycheck's deposit bank account (`income_sources.receivingAccountId`). Pools held in the same bank account are marked as *Retained in source account* ($0 external transfer required). Pools in external bank accounts are rolled up into **1 single transfer per destination bank account** (e.g. 1 transfer to Up Bank Bills covering multiple bill pools) with constituent pool explanations and 1-click amount copy for banking apps.
  - *Collapsible Command Panel*: Live Paycheck Details editor with collapsible toggle, Reactive Surplus Meter with 3-segment visual proportion bar (Bills / Goals / Surplus), and the Bank Transfer Rollup card.
  - *Full State Parity & Confirmation Safety*: Handles Draft/Pending paydays (interactive split studio) and Confirmed paydays (read-only receipt breakdown). ConfirmDialog protections on Discard Changes (dirty state), Run Income Split (balance execution warning), Delete Income, and Recalculate Saved Plan.
- **Dynamic Waterfall Allocation Engine & Resolution Hierarchy**:
  - *Two-Horizon Priority Waterfall*: Step 0 (Deficit Repair: Negative balance restorations to $0) $\rightarrow$ Step 1 (Immediate Cashflow Feasibility Guard: 100% funding for upcoming bills due before next payday, essential bills first) $\rightarrow$ Step 2 (Reserve Sinking Funds: Pro-rata cycle accumulation for future bills) $\rightarrow$ Step 3 (Committed Goals: Imminent gaps funded 100%, future gaps paced) $\rightarrow$ Step 4 (Everyday Allowance: Cap-aware top-up or full deposit) $\rightarrow$ Step 5 (Uncommitted Goals & Residual Surplus Sweep).
  - *Unified Resolution Hierarchy*: When evaluating any upcoming payday (via Home Screen "Log Payday" drawer, Timeline, or Bulk Allocate tab), the query checks for saved `allocation_plans` in the database first. If custom overrides exist, it returns the saved plan lines. If no saved plan exists, it dynamically computes the Two-Horizon waterfall on-the-fly.
  - *Automatic Recalculation*: Changing category targets/allowances in Setup automatically recalculates unsaved future paydays when opened. Changing income schedules cascade-deletes obsolete `allocation_plans` (`ON DELETE CASCADE`), presenting fresh dynamic allocations for the new schedule without requiring manual background jobs.
  - *Stateless vs Cumulative Math*: Bills evaluate both immediate due-date feasibility and pro-rata cycle math. Everyday allowances evaluate cap-aware top-ups or rollover sweeps. Savings goals evaluate cumulative timeline progress.
- **Zero-Deficit Hard Constraint & Lowest Watermark Validation**: The projection engine evaluates `minProjectedBalance` *between* payday columns to catch intra-cycle cashflow crunches caused by ill-timed bills, rejecting edits that would cause a hidden bounce.
- **Stealth Privacy RLS Math Balancing**: Returns an opaque `hiddenAllocationsTotal` per column so partner views maintain exact zero-sum math without leaking private category names, IDs, or balances.
- **Categories Forward Timeline Slider**: Draggable slider (Today → +12 Months) on `/dashboard/categories` for scrubbing forward in time to inspect projected category balances.

- **Surplus Sweep & Catch-Up Mechanics**: System enforces a single designated `isSurplusTarget` Goal category per household. Deletion of the active Surplus Target category is blocked unless a replacement Goal category is selected. On login after month boundaries, if un-swept Everyday balances exist, an interactive **Catch-Up Sweep Modal** prompts the user to sweep leftover funds into their designated Surplus Target category (or keep them in Everyday spending per household settings).
- **Settings Re-Run Budget Setup Workflow**: Preservative budget adjustment accessible via `Settings → Re-run Budget Setup` (both Web `/setup?mode=rerun` and Mobile `/(setup)/income?mode=rerun`). 100% parity across platforms: 3-step streamlined re-calibration flow (Income Sources $\rightarrow$ Bank Accounts & Pools $\rightarrow$ Review & Commit Categories) skipping Goals and Lifestyle Quiz to preserve custom user categories and prevent default ABS overrides. Automatically pre-populates existing database entities, verifies pool balance sweeps (`SetupBalanceSweepModal` / `MobileSearchSelect`) if removing positive-balance pools, maps soft-archived categories directly to UUIDs, and offers safe Cancel confirmation dialogs. Zero DB modifications on cancellation.
- **Actionable Bank Transfer Guidance**: Actionable bank transfer prompt cards with 1-tap `[Copy Amount]` buttons when changing pool bank account links in Settings, plus a 1-tap **Payday Transfer Plan Card** post-allocation for Osko/PayID mobile banking transfers.
- **Partner Collaboration**: Shared household context (`tenantId`) giving partners full read/write visibility.
- **Date Formatting Standard**: All dates rendered in UI views, modals, cards, and tables are formatted using the user's active regional locale and presentation timezone via `fmtDate` / `fmtDateMedium` from `@money-matters/ui` (e.g. `en-AU` → `31/12/2026`, `en-CA` → `2026-12-31`, `en-US` → `12/31/2026`, `ja-JP` → `2026/12/31`). Web components consume `fmtDate` from `useLocale()`; mobile components call `formatDate()` / `formatIsoDate()` from `apps/mobile/src/lib/format.ts`, which delegates to the same UI primitives with the active `MobileLocaleConfig`. Raw ISO date strings (`2026-12-31`) are strictly prohibited in user-facing components.
- **Quick Action Suggestion Subgroups**: The Quick Action suggestion picker features two distinct categories: "Recent" (up to 2 most recent unique presets) and "Frequent" (up to 2 most frequent presets aggregated across past 180 days, deduplicated from recent), filtering out system allocations, transfers, and adjustments.
- **Paid Bill & Allocated Income Lock**: Once a bill is marked `CONFIRMED` or income allocated, core fields are strictly locked from editing with a `🔒 Paid` / `🔒 Allocated` status badge to prevent ledger drift. Undo/reopening is deferred to V2 scope (`FEAT-V2-005`).
- **Table Filter Param Resilience & Fallback**: When navigating to Bank Accounts, Pools, or History with an invalid or archived filter ID in query params, the UI preserves the full table of records, displays a `Filter: Item unavailable` pill between the search bar and table, and renders an inline amber advisory notice.
- **History Tab 2 (Split History) Layout**: Streamlined table featuring `INCOME SPLIT DATE`, `INCOME DATE`, `Income` (hyperlink opening the `SlideOverAllocationDrawer`), `Bank Account` (hyperlink with `↗`), and `Total Amount`, with 100% header alignment and drawer metadata card header.
- **Settings Data Privacy & Complete Export**: Merged full-width card on `/dashboard/settings` providing direct navigation to `/privacy` and 1-click Zipped CSV backup download. Terminological parity enforces "Household Plan" and "Upgrade to Household Plan".

---

## 2. The Two-Horizon Waterfall Allocation Engine (Comprehensive Functional Specification)

The core innovation of Money Matters is the **Two-Horizon Waterfall Engine** (`@money-matters/capability-budgeting`). It automates payday income allocation across household pools, eliminating both intra-cycle overdrafts and forward sinking fund shortfalls.

### 2.1 The Two-Horizon Architecture: Core Philosophy & Design Intent

Traditional budgeting apps fail Australian households due to a fundamental structural dichotomy:
1. **The Pure Sinking-Fund Failure**: Traditional budgeting systems divide monthly bills evenly across paychecks (e.g. a \$2,000 monthly rent divided into \$1,000 per fortnightly pay). When rent is due 3 days after Payday 1, the user only has \$1,000 in their bills pool, causing direct debits to bounce and incurring bank overdraft fees.
2. **The Pure Cashflow Failure**: Traditional cashflow trackers only look at bills due immediately, leaving future irregular obligations (quarterly council rates, annual vehicle registration, car insurance) un-funded until the week they arrive, creating massive financial shockwaves.

Money Matters resolves this tension with a **Two-Horizon Hybrid Allocation Engine**:
- **Horizon 1 (Immediate Cashflow Feasibility)**: Evaluates upcoming scheduled obligations due on or before the next paycheck cutoff date (`expectedDate <= nextPaydayCutoff`). If any pool faces a shortfall, the engine allocates 100% of the required cash immediately, prioritizing essential living shelter (rent, mortgage, utilities) first.
- **Horizon 2 (Reserve Sinking Funds)**: For bills due beyond the next paycheck, the engine smoothly accrues pro-rata cycle targets using exact calendar factors ($\frac{1}{26}$ fortnightly, $\frac{1}{52}$ weekly, $\frac{1}{12}$ monthly), ensuring long-term obligations are fully funded well ahead of time.

This guarantees that:
- **Direct Debits Never Bounce**: Imminent bills are ring-fenced 100% upfront.
- **Everyday Spending is Guilt-Free**: The remaining Everyday pool is purely discretionary and safe to spend to zero.
- **Zero Mental Math**: The user never has to calculate how much to leave behind for next week's bills.

---

### 2.2 The 6-Step Priority Cascade Hierarchy

When an incoming paycheck (or ad-hoc deposit) is processed, the engine executes a strict 6-step sequential cascade. At each step, funds are deducted from `remainingNetPay` until depleted:

```
[ Incoming Net Paycheck ]
           │
           ▼
[ Step 0: Deficit Repair ] ──────────────────────► Clears negative pool balances back to $0.00
           │
           ▼
[ Step 1: Immediate Cashflow Feasibility Guard ] ──► 100% funding for bills due <= next payday (Essential first)
           │
           ▼
[ Step 2: Reserve Sinking Funds ] ───────────────► Pro-rata accrual for future bills (1/26, 1/52, 1/12)
           │
           ▼
[ Step 3: Committed Savings Goals ] ─────────────► Target-date pacing (100% if due <= next pay, paced otherwise)
           │
           ▼
[ Step 3: Bills Safety Floor Cushion ] ──────────────► Top up bills safety cushion (e.g. $200–$500)
           │
           ▼
[ Step 4: Baseline Everyday Living Allowance ] ──────► Secure groceries & fuel for the pay cycle
           │
           ▼
[ Step 5: Reserve Sinking Funds (Future Bills) ] ────► Pro-rata smoothing for future bills
           │
           ▼
[ Step 6: Committed Savings Goals ] ─────────────────► Contractual target-date goals paced
           │
           ▼
[ Step 7: Uncommitted Goals & Surplus Sweep ] ───────► Voluntary goals funded & 100% residual swept to Surplus Target
           │
           ▼
[ Unallocated Cash ≡ $0.00 ]
```

#### Step 1: Immediate Cashflow Feasibility Guard (Due-Date + Lookahead Buffer Aware)
- **Objective**: Guarantee that all scheduled bills due on or before the next incoming paycheck (plus a configurable lookahead buffer, default 3 calendar days) are 100% funded, preventing direct debit rejections and late fees from weekend or public holiday payroll delays.
- **Cutoff Horizon**: `bufferedPaydayCutoff = nextPaydayCutoff + dueBufferDays` (default: 3 days).
- **Shortfall Calculation**:
  For each `REGULAR` pool, the engine aggregates all pending expense events (`status === 'PENDING'`) where `expectedDate <= bufferedPaydayCutoff`:
  $$\text{Due Amount} = \sum_{e \in \text{PendingEvents}} e.\text{amount}$$
  $$\text{Net Shortfall} = \max(0, \text{Due Amount} - \text{currentPoolBalance})$$
- **Priority Tier Sorting**:
  1. **Essential Bills First** (`isEssential: true`): Derived automatically from child categories marked essential (e.g. Rent, Mortgage, Electricity, Gas, Water, Internet). Sorted chronologically by `expectedDate` ASC.
  2. **Standard Bills Second** (`isEssential: false`): Discretionary subscriptions and lifestyle bills (e.g. Gym, Streaming, Club memberships). Sorted chronologically by `expectedDate` ASC.
- **Allocation Rule**:
  $$\text{Allocated}_i = \min(\text{remainingNetPay}, \text{Net Shortfall}_i)$$
  $$\text{remainingNetPay} \leftarrow \text{remainingNetPay} - \text{Allocated}_i$$
  $$\text{runningBalance}_i \leftarrow \text{runningBalance}_i + \text{Allocated}_i$$

#### Step 2: Deficit Repair (Negative Balance Clearing)
- **Objective**: Restore overdrawn pool balances back to \$0.00.
- **Architectural Rationale**: Repaired after immediate due bills, but strictly *before* discretionary Everyday allowances or voluntary savings are distributed, eliminating overdraft interest and bank dishonour flags.
- **Allocation Rule**:
  For any pool where $\text{currentBalance} < 0$:
  $$\text{Deficit}_i = |\text{currentBalance}_i|$$
  $$\text{Allocated}_i = \min(\text{remainingNetPay}, \text{Deficit}_i)$$
  $$\text{remainingNetPay} \leftarrow \text{remainingNetPay} - \text{Allocated}_i$$

#### Step 3: Bills Pool Safety Floor Cushion
- **Objective**: Maintain a dedicated safety cushion in the Bills pool (e.g. \$200–\$500) to absorb unexpected utility bill fluctuations and price hikes.
- **Allocation Rule**:
  $$\text{Floor Deficit}_i = \max(0, \text{safetyBufferFloor}_i - \text{runningBalance}_i)$$
  $$\text{Allocated}_i = \min(\text{remainingNetPay}, \text{Floor Deficit}_i)$$
  $$\text{remainingNetPay} \leftarrow \text{remainingNetPay} - \text{Allocated}_i$$

#### Step 4: Baseline Everyday Living Allowance (Living Pool Funding)
- **Objective**: Fund the household's primary transaction account for discretionary groceries, transport, fuel, and daily living expenses *before* future sinking reserves and savings goals.
- **Frequency-Adjusted Allowance**:
  $$\text{Cycle Allowance} = \frac{\text{monthlyTarget} \times 12}{\text{payCycleDivisor}}$$
- **Rollover Rule Modes**:
  - `RESET` (Top-up to cap): If the user has leftover funds from the prior period, the engine tops up only what is needed to reach the cap:
    $$\text{Top-Up Need} = \max(0, \text{Cycle Allowance} - \text{currentBalance})$$
    $$\text{Allocated} = \min(\text{remainingNetPay}, \text{Top-Up Need})$$
  - `ROLLOVER` / `SWEEP` (Default): The engine deposits the full cycle allowance unconditionally, allowing unspent funds to accumulate for future discretionary rewards:
    $$\text{Allocated} = \min(\text{remainingNetPay}, \text{Cycle Allowance})$$

#### Step 5: Reserve Sinking Funds (Pro-Rata Cycle Accumulation)
- **Objective**: Accumulate smooth reserves for future obligations due beyond the buffered payday cutoff, transforming large quarterly, semi-annual, and annual bills into steady, bite-sized paycheck contributions.
- **Exact Calendar Cycle Factors**:
  - Fortnightly Pay (26 cycles/year): $\text{Cycle Target} = \frac{\text{monthlyTarget} \times 12}{26}$
  - Weekly Pay (52 cycles/year): $\text{Cycle Target} = \frac{\text{monthlyTarget} \times 12}{52}$
  - Monthly Pay (12 cycles/year): $\text{Cycle Target} = \text{monthlyTarget}$
- **Incremental Delta Funding**:
  $$\text{Incremental Need}_i = \max(0, \text{Cycle Target}_i - \text{PriorAllocated}_i)$$
  $$\text{Allocated}_i = \min(\text{remainingNetPay}, \text{Incremental Need}_i)$$
  $$\text{remainingNetPay} \leftarrow \text{remainingNetPay} - \text{Allocated}_i$$

#### Step 6: Committed Savings Goals (Target-Date Horizon Pacing)
- **Objective**: Fund high-priority committed goals (Emergency Fund, Car Maintenance, Tax Provision) according to their contractual deadlines.
- **Sorting**: Sorted chronologically by `targetDate` ASC (most urgent deadlines first).
- **Dual-Horizon Pacing**:
  - *Imminent Horizon* ($\text{targetDate} \le \text{nextPaydayCutoff}$): The goal deadline arrives before the next paycheck. The full remaining gap must be funded immediately:
    $$\text{Shortfall} = \max(0, \text{targetAmount} - \text{currentBalance})$$
    $$\text{Allocated} = \min(\text{remainingNetPay}, \text{Shortfall})$$
  - *Future Horizon* ($\text{targetDate} > \text{nextPaydayCutoff}$): The deadline is in the future. The gap is smoothly paced across remaining paychecks:
    $$\text{Remaining Paychecks} = \max\left(1, \left\lfloor \frac{\text{targetDate} - \text{paydayDate}}{\text{payCycleDays}} \right\rfloor\right)$$
    $$\text{Paced Need} = \frac{\max(0, \text{targetAmount} - \text{currentBalance})}{\text{Remaining Paychecks}}$$
    $$\text{Allocated} = \min(\text{remainingNetPay}, \text{Paced Need})$$

#### Step 7: Uncommitted Goals & 100% Residual Surplus Sweep
- **Objective**: Direct every single leftover cent to productive wealth generation, ensuring zero unallocated cash.
- **Uncommitted Goals**: Any flexible `GOAL` pools without explicit target dates receive funding up to their configured target amounts if funds remain.
- **100% Residual Surplus Sweep**:
  The engine designates a single primary surplus pool (`isSurplusTarget === true`, such as a Mortgage Offset account, High-Yield Emergency Buffer, or Investment bucket):
  $$\text{Surplus} = \text{remainingNetPay}$$
  $$\text{Allocated}_{\text{SurplusTarget}} \leftarrow \text{Allocated}_{\text{SurplusTarget}} + \text{Surplus}$$
  $$\text{remainingNetPay} \equiv 0.00$$
- **Invariant**: The engine guarantees $\text{unallocatedAmount} \equiv 0.00$. Zero cents are orphaned or left unaccounted for.

---

### 2.3 Multi-User Household & Partner Income Pooling

Money Matters natively supports shared households without compromising personal autonomy:
1. **Universal Household Pooling**: All income sources in the household flow into a single unified waterfall cascade. Joint household bills (rent, power, groceries) are funded collectively based on household cashflow.
2. **Orthogonal Stealth Privacy**:
   - Individual partners can link private bank accounts and private pools (`isPrivate: true`).
   - Private pools participate fully in the waterfall according to their configured targets.
   - In the partner's dashboard view, private pool details, names, and individual allocations are completely masked and aggregated into a single opaque `hiddenAllocationsTotal` figure.
   - This ensures 100% mathematical zero-sum ledger balance without exposing personal financial independence.
3. **Staggered Multi-Income Scheduling**:
   - If Partner A is paid fortnightly on Thursdays and Partner B is paid monthly on the 15th, each incoming paycheck independently evaluates immediate feasibility and pro-rata smoothing against the unified household obligations.

---

### 2.4 12-Month Cumulative Projection Engine & Wealth Conservation

The forward-looking **Income Split Planning Matrix** (`runCumulativeProjection`) projects pool balances across a rolling 12-month window:
1. **Chronological Iteration**: Iterates through all pending income events (`status !== 'CONFIRMED'`) ordered chronologically.
2. **Intermediate Scheduled Expense Deductions**: Between each payday $T_i$ and $T_{i+1}$, all scheduled expense events occurring within that date window are deducted from their respective pool running balances.
3. **Everyday Pro-Rata Discretionary Burn**: Discretionary Everyday spending occurs continuously. To prevent Everyday balances from compounding unrealistically, a daily burn rate $\frac{\text{monthlyTarget}}{30} \times \text{daysElapsed}$ is simulated between paydays, decaying the balance back toward baseline.
4. **Anti-Runaway Cap with Wealth Conservation**: Regular bill pools are clamped at a maximum ceiling of $1.5\times$ monthly target. Unlike simplistic models that discard excess, Money Matters automatically routes 100% of any trimmed excess into the designated `isSurplusTarget` pool. Household wealth is strictly conserved across the entire 12-month simulation.

---

### 2.5 Operational Payday Experience: The Actionable Transfer Plan

Once a user reviews and confirms an allocation plan:
1. **Atomic Ledger Execution**: The system generates immutable `CREDIT` entries in `transactionLedger` with linked `bankAccountId` values, instantly updating current pool balances.
2. **Actionable Payday Transfer Plan (`PaydayTransferCard`)**:
   - The UI immediately renders a clean, actionable transfer card.
   - Identifies the required inter-account bank transfers (e.g. *"Transfer \$850 from Salary Account to Bills Account"*).
   - Features 1-tap `[Copy Amount]` buttons formatted for Australian mobile banking apps (Osko / PayID), enabling the user to complete physical bank transfers in under 15 seconds.

---

## 3. Onboarding & Setup Re-calibration Experience

The onboarding flow delivers an engaging interactive estimation experience completing in under 60 seconds with 2025/2026 ABS benchmark estimates across both Web & Mobile:

1. **Step 1: Income & Earnings (Dynamic Multi-Income Entry)**:
   - Dynamic list of income sources (Primary Income, Side Hustle, Consulting, etc.) allowing users to add as many income sources as needed one at a time.
   - Per-income item details: Name/label, take-home amount ($), and frequency (Weekly / Fortnightly / Monthly). No partner-centric assumptions, supporting both single individuals and multi-income households.
2. **Step 2: Australian Household Banking Architecture (Archetypes & Routing)**:
   - **3 Household Archetypes**:
     1. *The Aussie 2-Account Blueprint (Recommended)*: Everyday Spending Card (tap & go, zero guilt) + Bills & Savings Goals (direct debits, ring-fenced). Eliminates daily budgeting friction.
     2. *Couples: Yours, Mine & Ours (Popular for Couples)*: Joint Bills + Joint Everyday + Private Personal Accounts with stealth privacy built-in.
     3. *All-in-One Account (Virtual Tracking)*: 1 Single Account. Money Matters tracks pools virtually on screen with zero barrier to entry. Pro-tip banners in payday transfer plans and bank accounts guide users toward graduating to 2 accounts when ready.
   - **60-Second Australian Bank Cheat Sheet**: In-app modal drawer detailing how to open a fee-free sub-account directly inside current banking apps (CBA Smart Access/Goal Saver, Up Savers/2Up, Macquarie Transaction, ING Orange Everyday, and Big 4) in under 60 seconds.
3. **Step 3: Goals & Commitments (Initial Setup)**:
   - Configures targeted savings goals (Emergency Reserve, Holiday, Car, etc.) with target amounts and due dates.
4. **Step 4: Lifestyle Setup (Initial Setup)**:
   - Housing, transport (per-vehicle configuration), family (dependents), health cover, debt repayments, pets, and giving.
5. **Step 5: Estimated Budget Review & Category Management**:
   - Compares Total Monthly Income vs Total Monthly Allocated (Everyday, Bills, Savings Goals).
   - Allows users to adjust monthly target amounts ($), add custom categories, or remove categories.

### Safe Forward-Looking Setup Re-calibration (`mode=rerun`)
- **3-Step Streamlined Flow**:
  - Accessible via Settings ("Re-calibrate Household Budget") or Pools header ("⚙️ Re-calibrate Household Budget").
  - Skips Lifestyle Quiz to protect custom category amounts from being overwritten by ABS national averages.
  - Step 1: Incomes $\rightarrow$ Step 2: Bank Accounts & Routing $\rightarrow$ Step 3: Pools & Category Targets.
- **Atomic Balance Sweep on Pool Deletion**:
  - If a user deletes an active pool that holds positive funds ($> \$0.00$), the system blocks silent loss and presents the **Move Remaining Balance** modal.
  - Prompts destination pool selection (defaulting to the Surplus Target pool).
  - Atomically records balanced `TRANSFER_OUT` and `TRANSFER_IN` ledger entries before soft-archiving the pool, guaranteeing 100% historical ledger integrity.

### UX Guardrails & Flow Controls
- **Discard Warning & Skip Guard**: Clicking "Cancel" on Web or "Skip for now" on Mobile prompts a confirmation modal. Confirming skip/discard updates `setupStatus: 'COMPLETED'` on the household tenant in the database, allowing users to proceed to the Dashboard with default seeded categories and avoiding endless setup redirect loops.
- **Database-Backed Setup Guard (`setupCompleted`)**: Logging in or navigating to the Dashboard (`/dashboard` on Web, `/(app)/home` on Mobile) when `setupStatus` is not `'COMPLETED'` on the `tenants` record automatically redirects the user directly to the setup wizard. Because this state is tracked at the household (`tenants`) level, once established by any household member, secondary invited partners immediately enter the active household dashboard with zero duplicate onboarding friction. Both platforms synchronize this state through Neon DB.

---

## 4. Bank Account Balance Alignment, Cross-Bank Transfers & Ingestion Scope

- **Core Philosophy Alignment**: Money Matters automates forward-looking payday allocation (ring-fencing bills and committed savings so users can spend their remaining Everyday pool freely with zero friction and zero guilt). In alignment with this core principle, retroactively importing historical line-item CSV statements is omitted from V1 to eliminate backward-looking receipt policing and micro-categorization friction.
- **1-Click Bank Balance Alignment (V1 Feature)**:
  - Accessible directly on the Bank Accounts dashboard (`/dashboard/bank-accounts`) via inline action badges (`Align Surplus` / `Align Shortfall`) and the dedicated `<ReconciliationModal />`.
  - When balanced, accounts display `"Expected $X,XXX.XX. Balanced"` directly below the account name; when differing, `"Expected $X,XXX.XX."` appears adjacent to the alignment action button. Linked pool balances are cleanly focused on active pools without redundant expected totals.
  - Supports optional user-provided Reason notes stored directly in the transaction ledger (defaulting to `"Balance Alignment"`).
  - Enables users to instantly sync their real-world bank account balance with their Money Matters pool balances in two clicks, recording deterministic `ACCOUNT_ALIGNMENT` / `BALANCE_ADJUSTMENT` ledger events.
- **Cross-Account Bank Transfer Prompt (`<CrossBankTransferModal />`)**:
  - Whenever an internal pool transfer spans pools tied to distinct bank accounts (`sourcePool.bankAccountId !== destPool.bankAccountId`), Money Matters immediately prompts the user with an instructional confirmation modal.
  - Reminds users to move the real money in their banking app, detailing source and destination bank accounts, exact transfer amount, and a 1-tap "Copy Amount" button.
- **Zipped CSV Data Export (V1 Feature)**:
  - Users retain 100% data sovereignty via full zipped CSV data backup (`exportTenantData`), available anytime in Settings and on trial expiration holding screens.
- **Automated Bank Statement Import / Open Banking Feeds**:
  - Formally scheduled for Release 2 (`V2_SCOPE.md`), evaluating Consumer Data Right (CDR) read-only bank feeds and a streamlined pool-centric onboarding catch-up assistant.

---

## 5. Household & Partner Collaboration & Security

- **Partner Invitation & Async Email Delivery**: Household owner generates a secure invite token (`invitePartner`) with a strict 48-hour expiration lifetime (`expiresAt`). The API worker dispatches a non-blocking `partner/invited` event to Inngest, which delivers the invitation email via Resend with 3 automatic retries.
- **Acceptance & Identity Flow**: Partner receives email, clicks link (`/invite/[token]`), signs in/up, and automatically joins the household tenant (`tenant_users`) and is redirected to the dashboard. The system enforces email identity matching (accepting user's email must match `inviteEmail`) and blocks expired tokens. Expired or mismatched invites are rejected and require re-invitation by the household owner.
- **Welcome & Onboarding Email Workflow**: Upon new user registration/auto-provisioning (`auth/user.signup`), Inngest asynchronously triggers a welcome email via Resend introducing trial status and dashboard onboarding features.
- **Background Notifications & Scheduled Crons Strategy**: For Release 1 (Web), background cron execution via Inngest is focused on the **Weekly Email Digest** (`notifyWeeklyDigest` running Sundays at 7:00 PM AEST). Payday reminders, bill due dates, and goal milestones are delivered directly via real-time Web UI dashboard banners and instant toast feedback. Mobile push crons (`notifyPaydayIncoming`, `notifyBillDueSoon`, `notifyBillOverdue`, `notifySpendingVelocity`) are retained in the codebase and staged for Release 2 (Mobile App target).
- **Shared Access**: Partner enjoys complete read/write access to categories, transactions, upcoming events, and allocation rules.
- **Password Reset & Security Standard**: Password reset flow (`/forgot-password`) uses a seamless 6-digit email OTP verification model, eliminating redirect and deep linking failure points while enforcing strong password complexity (min 8 chars with number/symbol) on mobile and web clients.
- **Async Account Deletion & Confirmation**: Account deletion requests (`deleteMyAccount`) trigger background worker execution (`user/account.delete-requested`) for deep database wipes, storage cleanup, and email confirmation dispatch.

---

## 6. Dashboard & UI Experience (Serene Finance Design System)

### 6.0 Unified UI Design System, Form Inputs & Modal Standards ("Set Once & Re-Use")
- **Aggressive Code Re-use & Zero Duplication**:
  - All shared UI elements, forms, inputs, modals, buttons, and tokens are centralized in `@money-matters/ui` (`@money-matters/ui/web` and `@money-matters/ui/mobile`), eliminating redundant local implementations.
  - Defining ad-hoc input styling, custom modal wrappers, local confirm popups, or duplicate button components inside `apps/web` or `apps/mobile` is strictly banned.
- **Color & Typography Design Tokens (`tokens.ts`)**:
  - Serene Blue (`#2563eb`), Primary Navy (`#1B2B4B`), Surface Bright (`#ffffff`), Surface Dim (`#F7F8FA`), Growth Green (`#22c55e`), Burn Red (`#ba1a1a`).
  - Typography: Inter for general UI headings and body; **JetBrains Mono** (`font-mono`, `tabular-nums`) for all monetary metrics across Web and Mobile.
  - Strict zero-hex policy: Raw inline hex colors are banned in favor of tokenized Tailwind classes and `tokens.colors`.
- **Form Input Defenses & Consistency**:
  - **Monetary Amounts (`AmountField` / `AmountInput`)**: Centrally enforces `$` currency indicator, monospace numerals (`font-mono tabular-nums`), non-negative values, max 12 digits, and max 2 decimal places. Auto-selects existing content on focus (`selectTextOnFocus` on mobile, `e.target.select()` on web) so users can immediately start typing. Inputs automatically format on blur without losing active caret position during numeric typing.
  - **Mandatory Field Labels (`FormLabel`)**: Mandatory fields are denoted with a subtle red asterisk (`*`).
  - **Inline Field Errors (`FormFieldError`)**: Form validation errors render consistently as subtle red helper text directly below the invalid input, replacing native browser HTML5 bubbles and ad-hoc popups.
  - **Form Error Banners (`FormErrorBanner`)**: Top-level API or submission error alerts display in a clean, subtle red-tinted banner with a warning icon at the head of the form.
  - **Button State & Actions (`Button` / `MobileButton`)**: Submit actions remain disabled until the form is dirty and valid (`!isDirty || !isValid`). Includes built-in spinner loading states that prevent duplicate clicks and preserve button geometry. Distinct variants: `primary`, `secondary`, `destructive`, and `ghost`.
  - **Focus Management**: The first editable input on any modal or form automatically receives focus (`autoFocus`).
- **Modal & Drawer Hierarchy**:
  - **LIFO Dismissal & Discard Confirmations**: Unified `ModalDialog` (web) and `MobileModalDialog` (mobile) track form dirtiness (`isDirty`). Attempting to dismiss via Cancel, backdrop click, or `Escape` key automatically prompts the user with an unsaved changes confirmation before discarding.
  - **Standardized Confirm Dialogs**: User action confirmations (archiving, deleting, marking paid, discarding) use `<ConfirmDialog />` on web and `<MobileConfirmDialog />` (`showMobileConfirm`) on mobile. Native browser `confirm()` and `Alert.alert` popups are strictly banned.
- **Universal Table & List Controls**:
  - **Table Header & Cell Parity**: Left-aligned for text/names/categories/accounts; Center-aligned for dates/status/actions; Right-aligned for monetary amounts.
  - **Sortable Columns (`SortHeader`)**: Standardized sort header with visual direction arrows (`▲`/`▼`) and keyboard accessibility.
  - **Conditional Pagination**: Pagination controls (`<PaginationBar />` and `<MobilePaginationBar />`) render conditionally only when the total record count is 5 or more (`totalItems >= 5`).
  - **Skeleton Loading**: Data fetching states across tables and lists display `<SkeletonTable />` / `<SkeletonCard />` loading animations to eliminate cumulative layout shift (CLS).
- **Dates & Timezones**:
  - Dates stored in UTC; rendered in timezone-aware AEST/en-AU format via `Intl.DateTimeFormat`.

- **Web Shell**: Fixed sidebar (`SideNavBar`), frosted glass top bar (`TopNavBar`), spacious table views, responsive `width=device-width` viewport for standalone PWA / Android shortcut rendering.
- **Mobile Shell**: Header (`TopAppBar`) + bottom tab bar (`BottomNavBar`).
- **Dashboard Hierarchy & Visualizations (Action-First Bento Grid)**:
  - **Top-Header Actions**: Consolidated 2-button layout in the top header adjacent to the page title: Primary Serene Blue `+ Quick Action` button with dropdown chevron menu (`Record Expense`, `Record Income`, `Transfer between Pools`) and secondary `Can I Afford It?` button matching exact height and radius, eliminating button wrapping across all viewports.
  - **Income Split Planning & Dynamic Allocation Engine**: Multi-payday timeline view (`/dashboard/income-and-bills?tab=MATRIX`) named **Income Split Planning**. Displays a 12-month grid of upcoming income events and pool allocations. Uses a centralized cumulative projection engine (`runCumulativeProjection`) to project pool balances sequentially across all unconfirmed paydays while deducting intermediate scheduled expenses. Enforces an **Assumed Pro-Rata Burn Rate** for `EVERYDAY` discretionary pools (silently decaying balance based on days elapsed between paydays) and an **Anti-Runaway Cap** (`1.5x` monthly target ceiling) for `REGULAR` bill pools to prevent infinite accumulation, guaranteeing hyper-accurate long-term surplus projections. Clicking "Review" on any payday opens the **Income Split** action drawer with context-aware proposed allocations. Users can lock in splits ("Save"), run splits immediately ("Run Income Split" in red), or reset the form back to automatic calculations ("Reset"). Confirmed payday allocation splits are strictly immutable to safeguard ledger history.
  - **Action Queue (Top Row)**: Front-and-center focus on immediate user actions upon logging in. The top row pairs `AttentionItemsList` (Bills due soon requiring actioning or marking paid) on the left with `NextPaydayCard` (Upcoming Income allocation preview) on the right.
  - **Secondary Bento Pools Section (`BentoPoolsSection`)**: Located in the middle row. Houses the Serene Navy (`#1B2B4B`) Everyday Spending card featuring a prominent **Daily Spendable Pace (`$XX / day`)** with days-until-payday countdown, dynamic pacing status badges (`On Track ✓`, `Pace Tightened`, `Bills at Risk`), and a 1-click **Update Balance** quick action. The clean white Bills Pool card features integrated 14-day shortfall warning status (`⚠️ Shortfall of $X` vs `✅ Next 14 days covered!`). Eliminates manual everyday receipt/coffee entry in favor of automated theoretical pacing and reality recalibration upon bank reconciliation.
  - **Goal Progress & Pace Cards**: Enhanced goal card progress tracking with 8px progress bars (`GoalsProgressStrip`), target date countdowns, and celebration banners for near-completion goals.
  - **Attention Items (`AttentionItemsList`)**: Two-tier severity presentation (Red for overdue items; Amber for upcoming-only items due within 3 days). Clean text labels with icon-visibility toggle support.
  - **Quick Expense Card (`QuickExpenseCard`)**: Symmetric Expense/Income active state toggles, collapsed date selector (defaults to today), and inline feedback messaging.
  - **Bank Reconciliation (`BankReconcileCard` & `BankReconcileModal`)**: Static status indicators with direct wiring to the `reconcileBankBalance` tRPC mutation.
  - **Deduplicated & Streamlined Filter Surfaces**: Counter-card health filter integration on Categories screen; permanent 3-way (`All / Debits / Credits`) segmented control on Transaction History screen.
  - **Collapsible Sections & Minimalist View Mode**: Quick Actions, All Upcoming Payments, and Category Health can be collapsed. Users can toggle "Show Decorative Icons" in Settings to switch between iconified vs minimalist typographic UI layouts across Web and Mobile apps.
  - **In-App Feedback & Diagnostics**: "Provide Feedback" feature accessible from Settings on Web and Mobile. Captures user feedback, category, description, and auto-derived system diagnostics (`platform`, `appVersion`, build number, channel, platform, and device metadata), automatically formatting and dispatching directly via `mailto:info@moneymatters.kaesava.au`.
  - **Inconspicuous App Version Footer**: An understated version footer (`Money Matters v1.0.0-beta.1 (#42) • beta channel`) displayed at the bottom of the Settings view on Web and Mobile. Tapping/clicking copies complete environment diagnostics JSON to the clipboard for support troubleshooting.

### 6.1 Native Android Mobile App Experience (`apps/mobile`) — 100% Feature Parity
- **Bottom Navigation (4 Primary Tabs)**:
  - **1. Home (`/(app)/home`)**: High-level financial cockpit with Hero card, linked bank balances, bento pool cards, and attention queue.
  - **2. Schedules (`/(app)/paychecks`)**: Renamed from "Income & Expenses", houses the 12-Month Rolling Cash-Flow Matrix Plan (`MobileMatrixPlanTab`) and recurring Income/Expense schedules.
  - **3. Upcoming (`/(app)/upcoming`)**: Dedicated tab taking users directly into the chronological events timeline (`/(app)/paychecks?tab=events`), allowing instant access to pending paychecks and scheduled bills without extra taps.
  - **4. Pools (`/(app)/categories`)**: Visual pool and category management with forward projection scrubber and 1-click balance alignment.
  - Dynamic edge-to-edge padding via `useSafeAreaInsets` ensures the tab bar floats cleanly above Android's system gesture bar.
- **Header Avatar & Profile Menu (`ScreenHeader` & `ScreenMenuModal`)**:
  - Displays the user's avatar image if uploaded, or a clean person icon / initials avatar.
  - Tapping opens the financial profile menu:
    - User Identity Card: Avatar, User Name, Email, Active Household Badge.
    - **Change Household**: Displayed only if the user belongs to >1 household. Opens `MobileTenantSwitcherModal`, marks the active household with `✓ Active`, and provides 1-tap switching persisted to `SecureStore`.
    - **Bank Accounts**: Direct link to `/(app)/settings/bank-accounts`.
    - **History**: Direct link to `/(app)/transactions`.
    - **Settings**: Direct link to `/(app)/settings`.
    - **Sign Out**: Guarded by styled `<MobileConfirmDialog />`.
- **Serene Finance Date Picker (`<DatePickerField />` & `<CalendarModal />`)**:
  - Standardized across all mobile modals and screens (`QuickExpenseModal`, `CreateIncomeEventModal`, `EventOverrideModal`, `RecurrenceBuilder`, `settings/income.tsx`).
  - Displays localized AEST/en-AU formatted date with calendar icon.
  - Quick-pick shortcut chips: `[ Today ]`, `[ Yesterday ]`, `[ Tomorrow ]` with active pill indicators.
  - Custom bottom-sheet calendar modal with month/year traversal and circular date selection adhering to Serene Finance tokens.
- **Settings Screen Reorganization (`/(app)/settings`)**:
  - Modular 4-tab segmented control eliminating vertical scroll fatigue:
    1. **🏡 Household**: Active Household Card with switch button, Household Details form, Partner & Member invites, and Quick Hub links.
    2. **⚙️ Preferences**: User Profile, Presentation Preferences (Locale, Language, Timezone, Icons), Biometric App Lock, and Push Notifications.
    3. **💳 Plan**: Active Subscription status, trial countdown, feature entitlements, and upgrade link.
    4. **🛡️ Privacy**: APPs & RLS compliance, 12-table Zipped CSV Export, Data Erasure request, In-App Diagnostics/Feedback, and guarded Danger Zone.
- **Home & Dashboard (`/(app)/home`)**:
  - Hero card displaying household name, AEST formatted current date, and primary action bar.
  - Linked Bank Account summary strip with provider badges (`BankProviderBadge`) and last known balances.
  - Bento pool cards: Everyday Spending (dark navy with pacing meter), Bills Pool (shortfall alerts & 14-day coverage), and Goal progress strip (`GoalsProgressStrip`).
  - Action Queue / Attention Items list (`AttentionItemsList`) with overdue/due soon alerts and deep links.
  - Quick Action FAB & `QuickExpenseModal` with `<MobileDatePickerField />` and `<MobileSegmentedTabs />`.
  - Pull-to-refresh (`RefreshControl`) updating all core tenant, pool, category, and event queries.
  - Active Trial banner with remaining trial countdown and upgrade link.
- **Paychecks & 12-Month Matrix Hub (`/(app)/paychecks`)**:
  - 3-Tab Segmented Control: `Upcoming`, `12-Month Matrix Plan`, and `Recurring Schedules`.
  - **12-Month Rolling Cash-Flow Matrix (`MobileMatrixPlanTab`)**: Interactive pay-cycle timeline carousel mapping upcoming paydays against ring-fenced bills, showing net income, total bills, everyday allocation, and cumulative surplus/deficit per cycle.
  - **Upcoming Queue**: Chronological list of scheduled income events and expense bills with 1-tap actioning (*Run Split* button opening the Split Studio, *Mark Spent* modal with shortfall resolution, *Delete*).
  - **Recurring Schedules**: Structured lists of recurring Income Schedules and Expense Bills with frequency badges and modal editing.
- **Income Split Studio (`/(app)/paychecks/[id]`)**:
  - Dedicated distraction-free screen for interactive payday allocation.
  - Plan source badges (`Auto-Calculated`, `Custom Saved`, `Confirmed & Executed`) with recalculation controls.
  - Structured pool table with collapsible group headers, direct amount inputs, and quick percentage chips (`[100%]`, `[$0]`).
  - Reactive Auto-Surplus absorber and elastic deficit alert banners (`-$X.XX Deficit`).
  - Bank-aware transfer rollup card (`MobileBankTransferRollupCard`) with 1 single aggregated transfer per external bank account.
- **Pools & Categories Hub (`/(app)/categories` & `/(app)/pools/[id]`)**:
  - 12-Month forward projection scrubber slider and grouped pool cards.
  - 1-Click Balance Alignment modal (`MobileReconciliationModal`).
  - Dedicated Pool Detail screen (`/(app)/pools/[id]`) with itemized category list, Move Money modal, and Category Detail bottom sheet (`CategoryItemModal`).
- **Can-Afford Simulator (`/(app)/afford-check`)**:
  - Full-featured simulation screen testing ad-hoc purchase amounts against Everyday discretionary funds.
  - 5-level verdict (`Affordable`, `Caution`, `Stretch`, `Deficit`, `Critical`), daily spending velocity impact, and savings goal delay calculations.
- **2-Tab History & Audit Ledger (`/(app)/transactions`)**:
  - **Tab 1: Transactions Ledger**: Paired transfer detection (`Source ➔ Dest`), search, multi-filter dropdowns, pagination bar, and CSV export via native `Share.share`.
  - **Tab 2: Payday Allocations**: Historical waterfall allocation runs with itemized 5-step breakdown modal (`MobilePaydayAllocationDetailModal`).
  - `(app)/settings/history.tsx` seamlessly redirects to `/(app)/transactions?tab=payday-allocations` (MECE compliance).
- **100% Elimination of Native `Alert.alert`**:
  - All native `Alert.alert(...)` modals eradicated monorepo-wide in favor of `showMobileConfirm(...)`, `useMobileToast()`, `<FormFieldError />`, and `<FormErrorBanner />`.
- **Biometric App Lock & Inactivity Security**:
  - Optional Face ID / Touch ID / Fingerprint / Device PIN app lock with toggle switch in Profile Settings.
  - Automatically engages a secure authentication overlay (`BiometricLockOverlay`) when the app is backgrounded for 2 or more minutes.
  - State persisted securely via `expo-secure-store` (`mm_biometric_lock_enabled`).
- **Tactile Haptic Feedback System**:
  - Responsive tactile vibration feedback using `expo-haptics` across key interactions: Quick Action FAB, Expense/Income logging, Split Execution, pull-to-refresh, and destructive action confirmations.
  - User toggle switch in Profile Settings (`mm_haptics_enabled`) allowing complete tactile preference control.
- **Resilient Mobile Auth & Networking**:
  - Centralized 401 token refresh interceptor in tRPC client automatically reloading refreshed JWT credentials from `SecureStore` upon expiration.
  - Foreground push notification listener seamlessly rendering non-blocking in-app toast alerts.

---

## 7. Smart Notification System (Habit Loop)

1. **Payday Reminders (`notify-payday-incoming`)**: Daily alert at 6pm AEST for upcoming payday tomorrow.
2. **Bill Due Soon Alerts (`notify-bill-due-soon`)**: Daily alert at 9am AEST for bills due in 3 days with category funding status (`Funded ✓` vs `Short by $X ⚠️`).
3. **Overdue Bill Warnings (`notify-bill-overdue`)**: Daily alert at 10am AEST for overdue bills.
4. **Weekly Financial Summary (`notify-weekly-digest`)**: Sunday 7pm AEST digest of weekly spend and category status.
5. **Goal Milestones (`notify-goal-milestone`)**: Real-time push alert when a goal category reaches 25%, 50%, 75%, or 100% target funding.
6. **Spending Velocity Alert (`notify-spending-velocity`)**: Daily pace check warning if Everyday pool spending rate will exhaust funds early.

---

## 8. Lifecycle & Governance Rules

1. **Category Archival**:
   - Blocked if there are active upcoming expenses or pending income allocations against the category.
   - Default Everyday category cannot be deleted or archived.
2. **Income & Expense Source Management**:
   - Amount changes cascade to unperformed upcoming occurrences (`status === 'PENDING'`).
   - Archival deletes unperformed future occurrences while retaining historical paid ledger entries.
3. **Household Governance & Account Erasure**:
   - Role-aware household deletion and leave controls (`/dashboard/settings/delete-account`).
   - Sole Owners delete household with exact Household Name typing requirement.
   - Owners with partners can delete (notifies partner by email) or leave (transfers ownership to partner, deletes owner's private pools/accounts, notifies partner).
   - Partners can leave (deletes partner's private pools/accounts, notifies owner).
4. **Data Sovereignty & 1-Click Zipped CSV Backup**:
   - Web & Mobile support 1-click zipped CSV backup bundling 12 complete database tables into a single archive (`money-matters-backup-YYYY-MM-DD.zip`).
   - Web utilizes in-memory `JSZip` triggering immediate browser download. Mobile utilizes `JSZip`, writes to `FileSystem.cacheDirectory` via `expo-file-system/legacy`, and invokes the native OS share sheet via `expo-sharing`.
   - Enforces multi-tenant RLS and stealth privacy (partner's private pools/bank accounts are never included in export).
5. **Redesigned 3-Tab Settings & 2-Tab History Layout**:
   - Settings page expanded to `max-w-5xl` container width with 3 sleek tabs (`Profile`, `Household`, `Account & Data`).
   - **Settings Read-Only Default Mode & Discard Confirmation**: Personal details ("My Details") and household details ("Household") views on Web and Mobile render in read-only mode by default to protect against unintended changes. An explicit "Edit" button enters editable form mode with "Save" and "Cancel" actions. Cancelling with unsaved edits (`isDirty`) triggers an explicit discard confirmation dialog.
   - **Centralized InfoTooltip Visibility**: A global "Show information icons" toggle in My Details centrally controls `(i)` tooltip icon visibility across all screens, modals, drawers, and headers on Web and Mobile across all households.
   - **Profile Tab**: Supports user Display Name, Email, Theme (`Light` / `Dark`), User Language (`English`, `日本語`), Date Format (`Australia (DD/MM/YYYY)`, `Canada (YYYY-MM-DD)`, `United States (MM/DD/YYYY)`, `United Kingdom (DD/MM/YYYY)`, `Japan (YYYY/MM/DD)`), and presentation Timezone.
   - **Timezone Decoupling**: Tenant accounting timezone (`tenants.timezone`) is decoupled from User presentation timezone (`user_preferences.timezone`). User input dates are captured in the user's timezone, stored in UTC, and formatted back to the user's timezone on retrieval.
   - **Household Tab**: Household Name, Country selection with flags (`SUPPORTED_COUNTRIES`), Base Currency (`AUD`, `USD`, `EUR`, `GBP`, `CAD`, `JPY`, `NZD`, `SGD`), Household Accounting Timezone, and member collaboration management. Currency changes trigger a Serene Finance `<ConfirmDialog>` warning that historical transaction records and category limits are not converted via foreign exchange rates.
   - **Zero-Decimal Currencies**: For currencies without minor units (e.g. `JPY`), monetary values are rendered without decimal places, and amount inputs (`<AmountField />`) disallow entering the decimal point.
   - History page organized into 2 tabs (`Transactions` ledger & `Payday Allocations` audit history).
6. **i18n Externalization & Language Scope**:
   - 100% of user-facing UI labels, error messages, headings, modal prompts, placeholders, and tooltips are externalized in `@money-matters/i18n`.
   - Release 1 supports English (`en.ts`), with full translation completeness enforced and verified via `pnpm check-i18n`. Japanese localization (`ja.ts`) is archived and deferred to Release 2 (`V2_SCOPE.md`).
7. **Commercial Subscription Lifecycle, Stripe Dynamic Payments & Abuse Prevention**:
   - **Trial Timeline & Dynamic Reactivation**: New households receive a 60-day full-access trial (`TRIAL_ACTIVE`). On Day 61, the household transitions to `TRIAL_EXPIRED`, immediately blocking mutations and presenting the holding screen with 1-click full zipped CSV backup download (`exportMyData`) and upgrade options. The legacy grace period (`TRIAL_GRACE`) has been retired. Furthermore, if `trial_ends_at` is extended in the database (e.g. support or promotion), the system automatically reactivates `TRIAL_ACTIVE`.
   - **Isolated Holding Screen (`/subscription/expired`)**: Clean, distraction-free screen offering an Upgrade CTA, 1-click full zipped CSV backup download (`exportMyData`), and Sign Out. Users are never locked out of retrieving their financial data.
   - **Australian Payment Methods**: Stripe Checkout sessions omit restrictive payment method types to dynamically offer standard credit/debit cards (Visa, Mastercard, AMEX), Apple Pay, Google Pay, and Link in AUD ($9.95/mo or $89/yr).
   - **Synchronous Post-Checkout Transition**: Upon completing checkout, Stripe redirects to `/subscription/success?session_id={CHECKOUT_SESSION_ID}`. The page invokes `billing.verifyCheckoutSession` mutation to immediately verify the session with Stripe, set the tenant to `SUBSCRIBED`, record the invoice in `billing_invoices`, and bust the client query cache so the trial badge disappears instantly.
   - **Subscription Cancellation & 1-Click Resumption**: When a user cancels their subscription via the Stripe Customer Portal, `customer.subscription.updated` sets `cancelAtPeriodEnd = true`. Access is retained through the paid period with an amber "Canceling" notice and a reassuring banner in Settings confirming billing has halted, specifying the exact date access terminates, and providing a direct "Resume Plan ↗" button to undo cancellation in Stripe. The account transitions to `TRIAL_EXPIRED` only after period expiry.
   - **On-Demand Portal Return Synchronization**: When users return from managing their subscription in the Customer Portal (`?tab=account-data&stripe_sync=true`) or click the manual refresh button (`↻`), Money Matters instantly reconciles subscription state and backfills the latest 10 invoices from Stripe.
   - **Advance Renewal Reminders**: Hybrid renewal reminder architecture: Stripe sends automated 7-day advance reminder emails for annual recurring subscriptions, and Money Matters displays an informative in-app banner within 7 days of the renewal date.
   - **Invoice History & Receipts**: Paid and failed invoices are persisted to `billing_invoices`. The Settings "Data & Subscription" tab renders recent invoices with direct links to Stripe-hosted invoice PDFs.
   - **Anti-Abuse Protections**: Each user can own at most 1 active household (`role === 'OWNER'`). Additionally, a permanent `hasUsedTrial` flag on `users` alongside a case-insensitive email check across all registered accounts (`lower(users.email)`) ensures that any subsequent household created by the same user or email address starts in `TRIAL_EXPIRED` status, preventing recurring trial reset abuse.
   - **100% Mobile Parity for Data & Subscription and Feedback**: Full feature and styling parity is implemented in the mobile app, including the interactive subscription status card with on-demand Stripe sync, cancellation callouts with "Resume Plan ↗", receipt downloads, Founding Member plan selection ($69/yr), Australian Privacy Guarantee tooltip, Zipped CSV backup export, and an in-app "Provide Feedback" modal with system diagnostics dispatched to `info@moneymatters.kaesava.au`.
   - **Support & Feedback Channel**: Australian customer support contact (`info@moneymatters.kaesava.au`) is surfaced across the upgrade page, settings subscription section, and invoice receipts.

---

## 9. "Can I Afford It?" Simulation Engine

The "Can I Afford It?" feature is a stateless, pure-simulation forward cashflow evaluation engine (`packages/capabilities/simulation` and `/dashboard/afford-check`). It adheres strictly to the "What Gives" hierarchy: Bills are non-negotiable, Everyday spending is protected to a safe cushion, and Savings Goals give first.

1. **Dual Simulation Modes & Liquidity Rules**:
   - *One-Off Purchase*: Evaluates immediate balance liquidity against upcoming bill obligations before payday. If affordable today, evaluates remaining cash against a prorated total dollar safe cushion until payday. If short today, presents a dual path: tapping flexible Savings Goals ("What Gives", showing exact goal delay) vs. waiting for future income on payday.
   - *Recurring Commitment*: Evaluates 12-month budget feasibility. Protects Bills 100% and guarantees Everyday spending allowance does not drop below 80% of expected allowance. Absorbs commitment first via uncommitted goals/surplus, then committed goals (`GOAL_DELAYED`). Provides Day-1 timing advice if ongoing budget is affordable but today's cash is low.
2. **6-Verdict Classification**:
   - `SAFE_YES` (Green): Sufficient liquidity and post-spend Everyday cash $\ge$ recommended safe cushion until payday. All bills protected.
   - `PACING_TIGHT` (Amber): Sufficient liquidity but remaining cash drops below the recommended safe cushion until payday. Clearly shows cushion shortfall in dollars.
   - `BILLS_RISK` (Orange): Current cash balance appears sufficient, but unfunded bills due before payday consume the buffer. Itemizes upcoming bills.
   - `WAIT_FOR_PAYCYCLE` (Blue): Shortfall today, but projected income by paycycle $N$ accumulates sufficient Everyday balance. Features flexible Savings Goal alternative if funds exist.
   - `GOAL_DELAYED` (Orange): Recurring commitment is affordable, but pushes back target dates of committed savings targets or flexible goals across 12-month forecast.
   - `HARD_NO` (Red): Recurring commitment would starve essential Everyday spending below 80% of planned allowance, or one-off shortfall cannot be accumulated across 12 months.
3. **Prorated Safe Cushion (Total Dollar Buffer)**:
   - Calculated dynamically as `dailyAllowance * 0.25 * daysUntilPayday` (where `dailyAllowance = everydayMonthlyAllowance / 30`, fallback $15 * days). Formatted and communicated purely as total dollars remaining until payday, eliminating developer jargon ("$/day", "floor").
4. **Human-Centric Trust Copy**:
   - Zero references to daily velocity tracking or floors. Clear, reassuring phrasing (`Leaves you with $X until payday`, `Recommended safe cushion: $Y`, `All upcoming bills are 100% covered`, `Can afford today using savings`).
5. **Pure Stateless Execution**:
   - Performs zero database mutations. State is ephemeral and client-driven.

---

## 10. UI Standardization, AmountField & Transfer Confirmation Workflow

1. **Canonical `<AmountField />` Component (`packages/ui`)**:
   - Universal monetary input primitive implementing Serene Finance design tokens (`#2563eb`, `#1B2B4B`).
   - Integrated stacked chevron steppers (`ChevronUp`, `ChevronDown`) for `$1.00` increments/decrements, hiding native browser spinner controls.
   - On blur formatting: converts values to 2 decimal places (`toFixed(2)`), keeping blank if empty.
   - Negative value handling: `allowNegative={true}` renders negative amounts with `text-rose-600 font-bold`.
   - Defensive limits: 12-character maximum input length with at most 2 decimal digits.
   - Rolled out across all 18 input locations across `apps/web` (modals, setup wizards, drawers, reconciliation).

2. **DatePicker Boundaries (`DatePickerField`)**:
   - Enhanced `DatePickerField` in `@money-matters/ui` to support `min` and `max` constraints.
   - Prevents selecting past dates on future-oriented actions (e.g. transfers with `min={todayStr}`).
   - Prevents selecting future dates on historical confirmations (e.g. Mark Paid with `max={todayStr}`).

3. **Transfer Confirmation Modal & Workflow**:
   - When triggering a transfer from the Upcoming timeline or Home dashboard, displays `TransferModal` instead of instant execution.
   - Editable fields: Transfer Name, Amount (`<AmountField />`), and Transfer Date (`<DatePickerField min={todayStr} />`).
   - Past-date auto-adjustment: Opening an event scheduled in the past auto-adjusts its date to `todayStr` and renders an informative blue notice banner.
   - Source pool liquidity guard: Compares entered amount against available source pool balance; renders an inline warning banner and disables submission if balance is insufficient.
   - Dynamic action button:
     - Future dates (`date > today`): Button displays `"Save"`, calling `updateTransferEvent` (draft save without ledger impact) and showing toast `"Transfer saved"`.
     - Today (`date === today`): Button displays `"Confirm"`, executing the transfer via `executeTransferEvent` and showing toast `"Transfer completed"`.
   - Delete action: Inconspicuous bottom-left delete button triggering a `<ConfirmDialog />` and showing toast `"Transfer deleted"`.
   - Form discard protection: Prompts discard confirmation if closed with uncommitted edits (`isDirty`).

4. **Upcoming Expenses & Transfers Dashboard Card**:
   - Re-architected `AttentionItemsList.tsx` into clean pill-card design matching `NextPaydayCard.tsx`.
   - Displays combined upcoming Expense and Transfer events with priority sorting (Overdue first, then by ascending date).
   - Distinct badge pills: `Overdue` (rose), `Transfer` (indigo), and `Due Soon` (amber).
   - Contextual actions: "Mark Paid" + "Delete" for expenses; "Transfer" + "Delete" for transfers.

5. **Goals Progress Card (`GoalsProgressStrip`)**:
   - Renamed title from "Savings Goals" to `"Goals"`.
   - Container height alignment (`h-full flex flex-col justify-between`) aesthetically aligned with adjacent `BentoPoolsSection`.
   - Attention-filtered display: Shows only the top 2 goals needing attention (Overdue > Red health > Amber health > Lagging pace > Lowest funded %).
   - Progress bar with vertical time-elapsed pacing needle:
     - Filled bar width represents funded percentage.
     - Vertical marker placed at `timeElapsedPct` (elapsed time between creation and target date).
     - Color coding: Green (`bg-emerald-500`) when on or ahead of pace, Amber (`bg-amber-500`) when within 20% behind, Red (`bg-rose-500`) when lagging or overdue.
   - Fixes 0% default calculation bug so unstarted goals display 0% instead of 100%.

6. **Mark Spent Workflow & Date Formatting Parity**:
   - Transaction ledger note automatically prepends the Expense event name.
   - Allows past dates to support retroactive entry of paid bills, while strictly forbidding future dates (`max={todayStr}`).
   - If an expense scheduled for a future date is actioned early, the date defaults to today and displays an informational notice formatted in the user's regional locale (e.g. `DD/MM/YYYY` in `en-AU`) rather than raw ISO format, maintaining consistency with date pickers.
   - Date display consistency is strictly enforced across all modals (Mark Spent, Transfer, Upcoming Expense, Payday Allocation, Budget Impact Review), alerts, cards, and list views across both Web and Mobile apps, adhering 100% to user presentation timezone and regional date locale.

---

## 11. Public Pre-Login Experience & Authentication Architecture

### 11.1 Brand Identity & Value Proposition
- **Standardized Name**: "Money Matters" universally across all titles, headers, footers, JSON-LD schemas, and legal documentation (all historical "by Kaesava" brand strings completely removed).
- **Core Tagline**: *"Zero bill shock. Real progress on long-term goals. Zero daily tracking."*
  - Replaced legacy *"Simple, honest household budgeting."* across the entire application and metadata surfaces.
  - Articulates the core differentiation: automated forward-looking payday allocation ring-fencing bills and long-term committed savings, delivering a guilt-free Everyday spending pool with zero daily receipt logging and zero friction.

### 11.2 Landing Page Experience (`/`)
- **Interactive Split Hero**:
  - **Traditional vs Modern Comparison**: Contrast panel demonstrating "The Traditional Budgeting Way" (47 receipts logged, surprise bill panic, broken spreadsheets) vs "The Money Matters Way" (Payday ring-fencing, guilt-free everyday spending, visible goal pacing).
  - **Live Serene Bento Showcase**: Interactive widget showcasing the 4 pillars:
    1. *Zero Bill Shock*: Live upcoming bills ring-fenced before payday.
    2. *Real Goal Progress*: Target-date pacing needle tracking long-term milestones.
    3. *Everyday Safe Spend*: Real-time remaining balance safe to spend to zero.
    4. *Instant "Can I Afford This?" Micro-Tester*: Interactive micro-calculator letting prospective users test ad-hoc purchases against everyday balances in real time.
- **Problem & Solution Narrative**:
  - 4 Fatal Budgeting Traps: The Receipt Ledger Trap, The Sinking Fund Surprise, Relationship Surveillance, and Spreadsheet Fragility.
  - The 3-Step Solution: Connect Accounts, Automate Waterfall on Payday, Spend Everyday pool guilt-free.
  - Unfair Advantages: The 5-Step Waterfall, 5-Level "Can We Afford This?" Engine, and Harmonious Shared & Personal Budgets (shared bill clarity + 100% confidential personal spending without surveillance).
- **Full-Width Interactive Payday Timeline Simulator (`<PaycheckSimulator />`)**:
  - Full-width Day 0 to Day 28 timeline scrubber with milestone markers, auto-play controls (`[▶ Play / ⏸ Pause]`), and scrubbing speed controls.
  - **Payday Checkpoint Banner (`<PaydayCheckpointBanner />`)**: Automatically pauses at Payday 1 (Day 0) and Payday 2 (Day 14), enabling users to test their own take-home income ($1,800 - $4,500) via slider or quick chips and immediately watch their 5-step waterfall splits adapt.
  - **Continuous Everyday Drawdowns & Step Bill Deductions**: Models realistic living cadence with continuous daily Everyday drawdowns (~$25/day weekdays, ~$60/day weekends) and scheduled step deductions for committed bills (Rent -$950 on Day 3, Electricity -$210 on Day 18).
  - **Interactive Pool Transfers Modal (`<PoolTransferModal />`)**: Inconspicuous `[⇄ Transfer]` trigger on each pool card allowing users to simulate ad-hoc reallocations between pools with instant balance adjustments and live narrative confirmation.
  - **Dynamic Plain-English Commentary**: Live narrative below the timeline bar explaining exact cashflow dynamics, safety margins, and transfer effects on the fly.
  - Variable-speed synchronized pool fill bars with subtle 100% completion celebration badge (`✓ 100% Funded`).
- **Customer Lifecycle Personalization**:
  - Header, Hero, Pricing Card, and Footer conversion banners dynamically reflect the visitor's authentication and subscription status:
    - *Anonymous Visitors*: High-impact "Start 60-Day Free Trial" and transparent pricing.
    - *Active Trial Users (`TRIAL_ACTIVE`)*: Displays remaining trial days badge, "Go to Dashboard →" hero CTA, and "Lock In Founding Member Rate ($69/yr)" pricing CTA.
    - *Subscribed Members (`SUBSCRIBED`)*: Displays "Active Household Member ✓" ribbon, "Go to Your Dashboard →" hero CTA, and "Manage Subscription & Invoices →" billing portal CTA.
    - *Expired Trial Accounts (`TRIAL_EXPIRED`)*: Displays amber holding ribbon and paywall guidance with "Upgrade to Household Plan →" CTA and 1-click data export.
- **In-Place Auth Modal (`<AuthModal />`)**:
  - Direct modal integration on `/` eliminating legacy early access gating.
  - Seamless toggle between `[Sign In]` and `[Start 60-Day Free Trial]`.
  - Accessible dialog supporting backdrop and `Escape` key dismissal.

### 11.3 Public Pre-Login Layout & Modular Auth Primitives
- **Unified Public Primitives (`@money-matters/web/components/public`)**:
  - `<PublicHeader />`: Clean top navigation with logo, brand title, and context-aware action buttons (*← Back to Home*, *← Back to Dashboard*, or *Sign In*).
  - `<PublicFooter />`: Unified footer with dynamic copyright, official tagline, Serene Finance badge, and legal links (`/terms`, `/privacy`).
- **Dedicated Pre-Login Routes (<250 lines rule compliant)**:
  - `/sign-in` & `/sign-up`: Modular auth flows powered by `<SocialAuthButtons />`, `<PasswordStrengthIndicator />`, and `<OtpVerificationView />`.
  - `/forgot-password`: Self-service 6-digit OTP password recovery with 100% externalized i18n copy.
  - `/terms` & `/privacy`: Public legal documentation with Australian legal standing (ASIC/AFSL general advice exemption under Corporations Act 2001, Australian Consumer Law statutory guarantees, consumer data privacy, SaaS subscription terms, NSW jurisdiction) and CDR compliant account privacy information.
  - `/subscription/upgrade`: Transparent pricing and founding member subscription checkout with extracted `<ActiveSubscriptionCard />`.
  - `/invite/[token]`: Household partner invitation acceptance landing page.

---

## 12. Complete Functional Capability Inventory (Web & Mobile Parity)

This section provides the authoritative, exhaustive breakdown of every functional capability across Money Matters, detailing user interactions, fields, defensive validations, confirmation flows, alerts, and Web vs Mobile parity differences.

### 12.1 General & Cross-Cutting Infrastructure
* **Connection Interrupted Banner & Auto-Retry**:
  - *Web*: Global network boundary detecting offline events; renders amber floating notification banner with manual "Retry Connection" button and exponential backoff retry on failed tRPC queries.
  - *Mobile*: Integrated NetInfo listener displaying non-blocking in-app toast; pull-to-refresh on core views (`/(app)/home`) to force data synchronization; automatic 401 token refresh interceptor reloading JWT credentials from `SecureStore`.
* **Universal Table & Card Standards (Set Once & Re-Use)**:
  - *Web*: High-density Serene Finance tables with standardized `SortHeader` (direction indicators `▲`/`▼`), search input with `left-3.5` icon spacing and `pl-10` text indent, `<SkeletonTable />` loading states, column alignment parity (Left: text/names; Center: dates/status/actions; Right: monetary amounts `tabular-nums font-mono`), and conditional `<PaginationBar />` (rendered only when total records $\ge 5$).
  - *Mobile*: Touch-optimized card lists (`BankAccountCard`, `TransactionRow`, `ExpenseBillCard`, `IncomeSourceCard`, `MatrixPaydayCard`) with `<SkeletonCard />` loading skeletons and conditional `<MobilePaginationBar />` ($\ge 5$ records).
* **Modal Dialog & Drawer Behavior Hierarchy**:
  - *Web*: Unified `<ModalDialog />` supporting centered popups and side-drawers (`<SlideOverAllocationDrawer />`, `<SlideOverCategoryDrawer />`, `<QuickExpenseDrawer />`). LIFO dismissal via Escape key, clean state checks, backdrop click-away dismissal, and `<ConfirmDialog />` discard warnings on dirty forms.
  - *Mobile*: Bottom-sheet dialogs (`<MobileModalDialog />`, `<CategoryItemModal />`, `<LinkedPoolsModalSheet />`, `<PoolsFilterSheet />`) with native drag indicators, backdrop dismissal, and `showMobileConfirm(...)` discard warnings when form state is dirty (`isDirty`).
* **Form Validation & Input Defenses**:
  - *Universal*: 100% Zod `.strict()` schema-driven validation. Mandatory fields rendered with red asterisk `<FormLabel required={true}>`. Field errors rendered inline via `<FormFieldError />`. Top-level submission/API errors rendered via `<FormErrorBanner />`. Submit buttons disabled unless form is dirty and valid (`!isDirty || !isValid`).
  - *Monetary Inputs*: `<AmountField />` (web) and `<AmountInput />` (mobile) enforcing `$` prefix, monospace font, non-negative values, max 12 digits, max 2 decimal places, and automatic select-on-focus (`selectTextOnFocus={true}` / `e.target.select()`) for immediate typing without manual clearing. Browser spinner arrows suppressed in favor of custom steppers.
  - *Date Pickers*: `<DatePickerField />` enforcing user presentation timezone (AEST/en-AU) and boundaries (`min` / `max` dates). Raw ISO strings (`YYYY-MM-DD`) forbidden in user views.
* **Information Tooltips (`InfoTooltip`)**:
  - *Universal*: Contextual `(i)` trigger rendering user-friendly plain-English financial explanations with zero technical jargon. Globally toggled on/off via the "Show information icons" switch in Settings > My Details across both Web and Mobile.

### 12.2 Public Marketing, Legal & Privacy (Unauthenticated)
* **Landing Page (`/`)**:
  - *Web*: Interactive split hero comparing Traditional Budgeting (receipt chaos) vs Money Matters (payday ring-fencing), 4-pillar Bento showcase, Problem/Solution narrative, full-width 28-day interactive Payday Timeline Simulator (`<PaycheckSimulator />`) with pool transfers modal, dynamic pricing CTA adapted to visitor trial/auth status, and embedded `<AuthModal />`.
  - *Mobile*: Native onboarding screen (`/(auth)/sign-in`) with brand identity, key value props, and direct auth routing.
* **Terms of Service (`/terms`)**:
  - *Web*: Full Australian legal framework under NSW jurisdiction, Corporations Act 2001 general advice warnings, Australian Consumer Law guarantees, and SaaS subscription terms.
  - *Mobile*: In-app webview / browser link from Profile Settings and public footer.
* **Privacy Policy (`/privacy`)**:
  - *Web*: Australian Privacy Principles (APPs 12 & 13) compliance details, Consumer Data Right (CDR) privacy standards, RLS data isolation architecture, and data retention/erasure rights.
  - *Mobile*: Dedicated Privacy section in Settings (`/(app)/settings`) with 1-click APPs 12/13 export and erasure requests.
* **Custom 404 Page (`/invalid-route`)**:
  - *Web*: Branded Aussie 404 screen with "Back to Dashboard" / "Back to Home" navigation buttons.
  - *Mobile*: Expo Router fallback screen redirecting to `/(app)/home` or `/(auth)/sign-in`.

### 12.3 Authentication & Account Security
* **Sign-Up Flow (`/sign-up`, `/(auth)/sign-up`)**:
  - *Universal*: Multi-method registration via Google OAuth, Apple Sign-In, and Email/Password. Enforces full name, valid email, and strong password complexity (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character). Features real-time visual `<PasswordStrengthIndicator />` / `<MobilePasswordStrength />`.
  - *Duplicate Account Handling*: If an existing email is entered with a different provider, clean informative notice guides the user to sign in using their original registration provider.
* **Sign-In Flow (`/sign-in`, `/(auth)/sign-in`)**:
  - *Universal*: Email/Password and Social OAuth (Google, Apple). Auto-redirects to active household dashboard upon successful verification, or to `/setup` if household onboarding is pending.
* **Password Reset & Verification (`/forgot-password`, `/(auth)/forgot-password`)**:
  - *Universal*: Stage 1: Email submission dispatches 6-digit OTP via Resend. Stage 2: In-place OTP verification (`<OtpVerificationView />` / `<MobileOtpInput />`), new password, and password confirmation with rate limiting and automated session establishment.
* **Partner Invitation Acceptance (`/invite/[token]`, `/(auth)/invite/[token]`)**:
  - *Universal*: Token validation (48-hour expiration lifetime), email matching guardrail (accepting user email must match invite email), auto-association with inviting household tenant (`tenant_users` with role `MEMBER`), and instant dashboard redirect.

### 12.4 Household Setup & Budget Re-calibration Wizard
* **Initial Onboarding Wizard (`/setup`, `/(setup)/*`)**:
  - *Step 1: Income Setup*: Dynamic addition of income sources (Primary Salary, Side Hustle, Investments) with Name, Amount ($), Frequency (Weekly, Fortnightly, Monthly), and Start Date.
  - *Step 2: Australian Household Banking Architecture*: Archetype selection (Aussie 2-Account Blueprint, Yours Mine & Ours, All-in-One Account) with 60-Second Australian Bank Cheat Sheet modal (CBA, Up, Macquarie, ING).
  - *Step 3: Goals & Commitments*: Targeted savings goals (Emergency Fund, Car, Holiday) with target amount and target date.
  - *Step 4: Lifestyle Category Budgeting*: ABS 2025/2026 benchmark estimations for housing, transport, food, family, and utilities.
  - *Step 5: Review & Confirm*: Total Monthly Income vs Total Monthly Budgeted comparison; custom category adjustments; automated recurring bill expense schedule generation (`autoCreateExpenseSchedules`, defaulting to enabled with opt-out checkbox in the Regular Bills section) which creates `expense_sources` and 12 projected `expense_events` anchored to the 1st of next month for monthly bills (or next pay cycle for weekly/fortnightly bills) to prevent Day 1 Cashflow Guard distortions; single-click commit creating pools, categories, bill schedules, and setting `setupStatus = 'COMPLETED'`.
* **Budget Re-calibration (`/setup?mode=rerun`)**:
  - *Universal*: 3-step streamlined flow skipping lifestyle quiz: Step 1 Incomes $\rightarrow$ Step 2 Bank Accounts $\rightarrow$ Step 3 Categories & Targets.
  - *Strict Add-Only Schedule Preservation*: Re-running budget setup preserves existing bill schedules, custom due dates, and historical confirmed payment events untouched; newly introduced `REGULAR` categories without existing schedules are automatically created and scheduled.
  - *Atomic Balance Sweep on Pool Deletion*: Prompts `<MoveMoneyModal>` to sweep positive balances ($> \$0.00$) into destination pool before pool soft-archival, recording balanced `TRANSFER_OUT`/`TRANSFER_IN` ledger entries.
  - *Budget Impact Review Panel*: Diff preview showing +/- changes to monthly caps and effective start date before committing.

### 12.5 Global Shell & Navigation
* **Web Desktop & Tablet Shell**:
  - Left fixed sidebar (`SideNavBar`) with brand logo, primary navigation links (`Dashboard`, `Income & Expenses`, `Pools & Categories`, `History`, `Settings`), active trial countdown badge, tenant switcher dropdown, and user profile footer with sign-out.
  - Sticky frosted-glass top navigation bar (`TopNavBar`) with responsive mobile hamburger drawer trigger.
* **Mobile Shell (`/(app)/_layout.tsx`)**:
  - Fixed bottom navigation bar (`BottomNavBar`) with 4 primary destinations: Home (`/(app)/home`), Schedules (`/(app)/paychecks`), Upcoming (`/(app)/upcoming`), and Pools (`/(app)/categories`).
  - Top app bar (`ScreenHeader`) featuring Household title, active trial badge, and User Avatar button opening `ScreenMenuModal`.
  - Header Avatar Menu (`ScreenMenuModal`): User Identity Card, Change Household (tenant switcher modal), Bank Accounts link, History link, Settings link, and Sign Out confirmation.
* **Multi-Household Tenant Switching**:
  - *Web*: Inconspicuous dropdown in sidebar footer (`TenantSwitcher.tsx`).
  - *Mobile*: Modal sheet (`MobileTenantSwitcherModal`) triggered from avatar menu, persisting active selection to `SecureStore`.

### 12.6 Dashboard & Home Financial Cockpit
* **Hero Financial Overview Card**:
  - Displays Household Greeting, AEST formatted localized date, Total Net Worth / Available Balance.
  - Pacing meter: Everyday Spending card with daily spendable pace (`$XX / day`), days-until-payday countdown, and pacing status (`On Track ✓`, `Pace Tightened`, `Bills at Risk`).
  - Regular Bills Card: Shortfall alerts (`⚠️ Shortfall of $X` vs `✅ Next 14 days covered!`) and next bill due date.
  - Home Afford Banner Card (`HomeAffordBannerCard`): Prominent navigational card positioned directly below Hero Card providing 1-tap access to the "Can I Afford It?" studio.
* **Goals Progress Strip (`GoalsProgressStrip`)**:
  - Horizontal progress strip displaying top 2 goals needing attention with percentage funded, target amount, target date, and vertical time-elapsed pacing needle (Green = on track, Amber = within 20% behind, Red = lagging).
* **Attention Queue & Action Items (`AttentionItemsList`)**:
  - Two-tier urgency alerts: Red for overdue items; Amber for bills due within 3 days. Contextual 1-click action triggers: "Mark Paid" (opens Mark Spent modal) and "Delete".
* **Next Payday Preview Card (`NextPaydayCard`, `MobileNextPaydayCard`)**:
  - Upcoming paycheck deposit date, expected amount, days countdown, and "Split Income" / "Review Split" CTA button.
* **Bank Balances Strip (`BankBalancesStrip`)**:
  - Linked accounts horizontal strip with branded institution badges (`BankProviderBadge`), current balances, and 1-click reconciliation triggers.
* **Missing Schedules Advisory Banner (`MissingSchedulesBanner`)**:
  - Warns when active categories have \$0 targets with direct setup link.

### 12.7 Quick Actions (Expense, Income, Transfer)
* **Trigger**:
  - *Web*: Header "+ Quick Action" dropdown button (`Record Expense`, `Record Income`, `Transfer between Pools`).
  - *Mobile*: Floating Action Button (FAB) at bottom-right of screen opening `QuickExpenseModal` with tactile haptic feedback.
* **Quick Expense / Income Drawer & Modal**:
  - *Form Fields*: Flow Type toggle (Debit / Credit), Amount (`<AmountField>` / `<AmountInput>`), Date picker (defaults to today), Pool & Category picker (`<PoolPicker>` on web, `<MobilePoolPicker>` on mobile with inline dropdown mode, type grouping, subcategory indentation, and search filtering), optional Note.
  - *Quick-Pick Suggestion Badges (`QuickPickBadges`)*: 1-tap chips for frequent Everyday purchases (`☕ Coffee $5.50`, `🥗 Lunch $18.00`, `🛒 Groceries $80.00`, `⛽ Fuel $70.00`), auto-filling amount and category.
  - *Recent & Frequent Presets*: Automatically aggregates up to 2 most recent presets and 2 most frequent presets from the past 180 days.
  - *Defensive Guardrails*: Inline liquidity warning if debit exceeds pool balance; negative amount blocking; submit button disabled until valid.

### 12.8 "Can I Afford It?" Simulation Studio (`/dashboard/afford-check`, `/(app)/afford-check`)
* **Core Modes**:
  - *One-Off Purchase Mode*: Evaluates immediate purchase amount against available Everyday spending and upcoming bills before payday.
  - *Recurring Commitment Mode*: Evaluates 12-month budget impact; protects bills 100% and guarantees Everyday spending remains $\ge 80\%$ of monthly allowance.
* **6-Verdict Classification**:
  - `SAFE_YES` (Green): Sufficient liquidity and Everyday balance $\ge$ recommended safe cushion.
  - `PACING_TIGHT` (Amber): Affordable, but Everyday balance drops below safe cushion ($X remaining until payday).
  - `BILLS_RISK` (Orange): Unfunded bills due before payday consume the buffer; itemizes upcoming bills.
  - `WAIT_FOR_PAYCYCLE` (Blue): Shortfall today, but projected income by paycycle $N$ accumulates sufficient funds; offers flexible savings alternative.
  - `GOAL_DELAYED` (Orange): Recurring commitment pushes back target dates of savings goals across 12-month forecast. Rendered via reusable `<GoalDelayCard>` displaying committed vs optional goal badges and original vs new projected dates.
  - `HARD_NO` (Red): Recurring commitment starves essential Everyday spending below 80% allowance.
* **Prorated Safe Cushion**: Formatted purely as total dollars remaining until payday (`$X safe cushion`), eliminating technical velocity jargon.
* **Pure Stateless Execution**: Performs zero database mutations.

### 12.9 Pools & Categories Hub (`/dashboard/pools`, `/(app)/categories`, `/(app)/pools/[id]`)
* **Projection Timeline Scrubber**:
  - Draggable timeline slider (Today $\rightarrow$ +12 Months) scrubbing forward in time to inspect projected pool and category balances with real-time math simulation.
* **Pools Table & List View**:
  - *Web*: Full-width structured table with expandable/collapsible pool rows, SortHeader, search bar, filters (All / Everyday / Bills / Goals & All / Shared / Private), pagination, and Category itemization.
  - *Mobile*: Filterable pool card list with `PoolsFilterSheet`, category progress badges, and dedicated Pool Detail screen (`/(app)/pools/[id]`).
* **Add & Edit Pool Modal (`<PoolFormModal>`)**:
  - *Fields*: Pool Name, Pool Type (`EVERYDAY`, `REGULAR`, `GOAL`), Linked Bank Account, Target Amount (for Goal pools), Target Date (for Goal pools), Surplus Target toggle (`isSurplusTarget`).
  - *Immutable Linking Protection*: Bank Account link and Pool Type are strictly locked after creation to preserve ledger auditability.
* **Archive & Restore Pool**:
  - Cascades soft-archival to child categories. Blocked if active positive balance exists (prompts balance sweep) or if last remaining Everyday pool.
  - Restoration available in Settings > Archived Data.
* **Add & Edit Category Modal (`<CategoryFormModal>`)**:
  - *Fields*: Category Name, Parent Pool, Target Amount ($), Frequency (Weekly, Fortnightly, Monthly, Annually), Monthly Equivalent preview ($/mo), Essential Bill toggle (`isEssential`), Lucide icon picker.
  - *Immutable Pool Linking*: Parent Pool locked after creation.
* **Prioritized Categories**: Categories marked `isEssential: true` receive priority funding in Step 1 of the waterfall allocation engine.
* **Stealth Private Pools**: Pools linked to private bank accounts inherit `isPrivate: true`, masked in partner views via RLS session variables.

### 12.10 Bank Accounts Management & 1-Click Alignment (`/dashboard/bank-accounts`, `/(app)/settings/bank-accounts`)
* **Bank Accounts Table & Card Deck**:
  - Account Name, Branded Provider Badge, Account Type, Last 4 Digits, Current Balance, Unbudgeted Buffer, Expected Pool Balance, and Linked Pools count.
* **Add & Edit Bank Account Modal (`<BankAccountFormModal>`)**:
  - *Fields*: Bank Provider select, Account Name, Account Type (`CHECKING`, `SAVINGS`, `OFFSET`, `CREDIT_CARD`), Last 4 Digits, Current Balance ($), Unbudgeted Buffer / Reserved Funds ($), Stealth Private toggle (`isPrivate`).
  - *Unbudgeted Buffer Constraint*: Unbudgeted Buffer cannot exceed Current Balance; inline validation blocks invalid entries.
  - *Stealth Private Flag*: Locks ownership to creator; masked from household partner in RLS queries.
* **1-Click Bank Balance Alignment (`<ReconciliationModal>`, `<MobileReconciliationModal>`)**:
  - Compares Actual Bank Balance vs Expected Balance (Sum of linked pools + Unbudgeted Buffer).
  - *Surplus Alignment*: Allocates positive variance to designated Surplus Target pool or user-selected pool.
  - *Shortfall Alignment*: Prompts funding source selection from non-zero pools up to available balance; records deterministic `ACCOUNT_ALIGNMENT` ledger transactions.
* **Cross-Bank Transfer Warning Modal (`<CrossBankTransferModal>`)**:
  - Triggered whenever an internal transfer spans pools in distinct physical bank accounts; displays source/destination bank accounts and 1-tap "Copy Amount" button for banking apps.

### 12.11 Income & Expenses Command Center (`/dashboard/income-and-bills`, `/(app)/paychecks`)
* **Tab 1: 12-Month Matrix Plan (`MatrixPlanTab`, `MobileMatrixPlanTab`)**:
  - *Web*: 12-month forward-looking spreadsheet grid with paydays as columns and pools/bills as rows, intermediate expense deductions, assumed pro-rata Everyday burn rate, and 1.5x anti-runaway cap. Clicking any payday column header opens the Income Split action drawer.
  - *Mobile*: Horizontally scrollable pay-cycle timeline carousel card deck where each card summarizes a pay period with expandable bill lists.
* **Tab 2: Upcoming Queue (`UpcomingTimelineTab`, `/(app)/upcoming`)**:
  - Chronological queue of pending Income, Expense, and Transfer events with Overdue badges, search, and type filters.
  - Actions: "Run Split" (Income events $\rightarrow$ opens Income Split studio), "Mark Paid" (Expense events $\rightarrow$ opens Mark Spent modal), "Transfer" (Transfer events $\rightarrow$ opens Transfer modal), "Delete" (inconspicuous confirm).
* **Tab 3: Setup & Sources (`SetupSourcesTab`)**:
  - Structured tables for recurring Income Schedules and Expense Schedules.
  - *Add/Edit Schedule Modal (`<IncomeExpenseFormModal>`)*: Name, Amount ($), Recurrence (Weekly, Fortnightly, Monthly, Annually), Interval ("Every N"), Start Date, End Date, Receiving/Paying Bank Account, Category link.
  - *Burst & Re-Burst Engine*: Generates 12 months of forward occurrences. Editing schedule automatically re-bursts unperformed future events while preserving historical paid records.

### 12.12 Dedicated Income Split Studio (`/dashboard/income-split`, `/(app)/income-split/[id]`)
* **Layout & Navigation**:
  - *Web*: Dedicated screen route `/dashboard/income-split?id=[incomeEventId]` integrated with standard sidebar and header shell.
  - *Mobile*: Dedicated screen `/(app)/income-split/[id]` with back navigation and discard changes confirmation.
* **Header & Status Badges**:
  - Crystal-clear plan source badges: `✨ Auto-Calculated` (5-step waterfall engine), `💾 Custom Saved Plan`, `✓ Confirmed & Executed`.
  - Prominent "🔄 Re-calculate" / "Reset" action: refreshes dynamic allocations or discards custom saved plans via `resetAllocationPlan` to restore live algorithmic waterfall calculations.
* **Structured Serene Pool Table & Detail Sheets**:
  - Collapsible category groups (`▼ Everyday Pools`, `▼ Bills Pools`, `▼ Goals`) with group subtotals.
  - Direct amount inputs with quick percentage chips (`[100%]`, `[$0]`).
  - Tapping pool titles opens the reusable 3-tab `MobileCategoryDetailSheet` (Categories, Upcoming Expenses with Mark Paid, Transaction History).
* **Reactive Auto-Surplus & Deficit Banner**:
  - Designated Surplus pool automatically absorbs residual funds in real time.
  - Active deficit alert banner (`-$X.XX Deficit`) if allocations exceed net income, disabling Save and Confirm actions.
* **Bank-Account-Aware Transfer Rollup Card**:
  - Identifies paycheck deposit bank account; groups external transfers into **1 single transfer per destination bank account** with constituent pool breakdown and 1-click amount copy.
* **Execution & Ledger Confirmation**:
  - "Run Income Split" confirms allocations, generates immutable `CREDIT` entries in `transactionLedger`, marks income event and allocation plan as `CONFIRMED`, and presents the actionable transfer plan.

### 12.13 Mark Paid / Spent Workflow (`<MarkPaidModal>`)
* **Trigger**: Upcoming bills queue, Attention Items list on dashboard, or Pool detail views.
* **Form Controls**:
  - Event Name (editable), Actual Amount Paid (`<AmountField>`), Payment Date (`<DatePickerField max={todayStr}>` in user timezone).
* **Shortfall Resolution Workflow**:
  - Compares paid amount against target pool balance. If shortfall exists, prompts: "Select Funding Pools to cover shortfall:".
  - Allows selecting non-zero pools up to their available balance, defaulting to the household Surplus Target pool.
  - Automatically records required funding `TRANSFER_OUT`/`TRANSFER_IN` transactions before confirming the expense as `CONFIRMED`.

### 12.14 Scheduled & Ad-Hoc Transfers Workflow (`<TransferModal>`, `<MobileTransferModal>`)
* **Trigger**: Upcoming timeline, dashboard Quick Action FAB/menu, or pool cards.
* **Form Controls**:
  - Transfer Name, Amount (`<AmountField>`), Date (`<DatePickerField min={todayStr}>`), Source Pool select, Destination Pool select.
* **Validation & Actions**:
  - Source pool liquidity check (prevents overdrafting source pool).
  - Date branching: Future dates display "Save" (updates scheduled event); Today displays "Confirm" (executes transfer immediately via `moveMoneyCommand`).
  - Discard protection on dirty state (`isDirty`).

### 12.15 History & Audit Ledger (`/dashboard/history`, `/(app)/transactions`)
* **Tab 1: Transactions Ledger**:
  - Paired transfer detection (`Source ➔ Dest`), search, multi-filter dropdowns (All / Spent / Received / Transfer, Pool filter), sortable headers, pagination, and CSV export.
  - *Web*: Direct CSV download. *Mobile*: Native OS share sheet via `expo-sharing`.
* **Tab 2: Payday Allocations History**:
  - Historical allocation runs with Income Source, Bank Account, Payday Date, Split Execution Date, and Total Amount.
  - Clicking any run opens `<SlideOverAllocationDrawer>` (web) or `<MobilePaydayAllocationDetailModal>` (mobile) displaying read-only pool breakdowns and ledger notes.

### 12.16 Settings — My Details (Profile & Preferences)
* **Read-Only Default Mode**: Renders in clean read-only mode by default to prevent accidental edits; explicit "Edit" button enters edit mode with "Save" and "Cancel" (with dirty discard confirm).
* **Fields & Validation**:
  - Display Name (mandatory), Notification Email (valid email regex), Phone Country Code (`CountrySelect`), Phone Number (`PhoneInput` with Australian mobile `04` validation), Presentation Timezone (AEST/en-AU), Locale & Date Format, UI Theme (`Light` / `Dark` / `System`), and "Show information icons" toggle.
* **Avatar Photo Upload**:
  - *Web*: File upload with interactive 256x256 WebP pan/zoom modal (`<AvatarCropModal>`).
  - *Mobile*: Native image picker with built-in crop square.

### 12.17 Settings — Household Management & Governance
* **Household Details**:
  - Household Name, Country, Base Currency (`AUD`, `USD`, `EUR`, `GBP`, `CAD`, `JPY`, `NZD`, `SGD`), Household Accounting Timezone. Currency change triggers warning dialog regarding historical non-conversion.
* **Member Collaboration & Invites**:
  - Active member list with avatar, role (`OWNER`, `MEMBER`), and pending status badges.
  - Partner Invite: Owner enters email; dispatches 48-hour invite token via Inngest and Resend.
  - Member Removal: Owner can remove member with confirmation challenge, soft-archiving their private accounts/pools.
* **Household Danger Zone & Account Erasure**:
  - *Leave Household*: Non-owners can leave; transfers ownership to next member or deletes private data with confirmation challenge.
  - *Delete Household & All Data*: Sole owner deletes entire tenant with exact household name confirmation typing requirement.

### 12.18 Settings — Archived Data & Cascading Restoration
* **Archived Items Table & Cards**:
  - Filters by Item Type (All, Pools, Categories, Bank Accounts, Income Schedules, Expense Schedules).
  - Search input, archived timestamp, and "Restore" action button.
* **Cascading Archival & Restoration Safeguards**:
  - Archiving a Bank Account cascades to its Pools and Categories.
  - Restoring a Category requires its parent Pool to be active. Restoring a Pool requires its linked Bank Account to be active. Date-sensitive integrity checks prevent orphaned child records.

### 12.19 Settings — Data & Subscription Lifecycle (Stripe & Trial)
* **60-Day Trial Status**:
  - Prominent trial countdown badge (`X days remaining on trial`).
  - Anti-abuse guard: Users can own at most 1 active trial household (`hasUsedTrial` flag).
* **Hard Paywall Lockdown (`TRIAL_EXPIRED`)**:
  - On Day 61, tenant transitions to `TRIAL_EXPIRED`, redirecting dashboard routes to `/subscription/expired`.
  - Mutation blocking on API worker (`requiresWriteAccess`).
  - Isolated holding screen offers Upgrade CTA, 1-click Zipped CSV Backup download (`exportMyData`), and Sign Out.
* **Stripe Checkout & Billing Portal**:
  - Checkout session creation ($9.95 AUD/mo or $89 AUD/yr) supporting Cards, Apple Pay, Google Pay.
  - Synchronous verification on return (`/subscription/success?session_id=...`).
  - Stripe Customer Portal integration for cancellation with grace access through paid period.
* **Invoice History**: Paid and failed invoices table with direct links to Stripe-hosted invoice PDFs.
* **1-Click Zipped CSV Backup**:
  - Bundles 12 complete database tables into `money-matters-backup-YYYY-MM-DD.zip`.
  - *Web*: In-memory JSZip browser download. *Mobile*: JSZip shared via native OS share sheet.

### 12.20 Native Android Mobile Capabilities
* **Biometric App Lock (`BiometricLockOverlay`)**:
  - Optional Face ID / Touch ID / Fingerprint / Device PIN lock enabled in Profile Settings (`mm_biometric_lock_enabled`).
  - Engages secure authentication overlay when backgrounded for $\ge 2$ minutes.
* **Tactile Haptic Feedback**:
  - `expo-haptics` vibrations on FAB press, expense/income submission, split execution, pull-to-refresh, and destructive action confirmations (user toggleable in Settings).
* **Push Notifications & In-App Toast Feedback**:
  - Expo push notification registration with background cron dispatch; foreground push listener rendering non-blocking in-app toasts.
* **Offline Resilience & Local Cache**:
  - SQLite local caching for offline viewing; resilient 401 token refresh in tRPC client.

---

## 13. Comprehensive Test Matrix & Validation Specification

Money Matters enforces strict, multi-tiered test coverage across capabilities, API routers, database schemas, and user interfaces.

### 13.1 Vitest Unit Test Suites (`pnpm test` & `pnpm test:coverage`)

| Package / Domain | Test Suite File | Coverage Target & Key Invariants Verified |
|---|---|---|
| `@money-matters/capability-budgeting` | `allocation-engine.test.ts` | 5-step waterfall cascade; Step 0 deficit repair; Step 1 essential bills due $\le$ next payday; Step 2 pro-rata calendar divisors (26, 52, 12); Step 3 goal deadlines; Step 4 allowance cap; Step 5 residual surplus sweep; zero unallocated cash invariant. |
| `@money-matters/capability-budgeting` | `bill-lifecycle-fsm.test.ts` | Finite state transitions for expense events: `PENDING` $\rightarrow$ `CONFIRMED` $\rightarrow$ `ARCHIVED`; date locks; paid bill immutability. |
| `@money-matters/capability-budgeting` | `burst-engine.test.ts` | RFC 5545 recurrence generation; 12-month forward horizon materialization; interval ("Every N") calculations; burst idempotency. |
| `@money-matters/capability-budgeting` | `cumulative-projection.test.ts` | Rolling 12-month simulation; intermediate expense subtractions; pro-rata Everyday burn rate; 1.5x regular pool ceiling with wealth conservation to surplus. |
| `@money-matters/capability-budgeting` | `due-date-guardrail.test.ts` | Next payday cutoff boundaries; shortfalls detected before direct debit bounces; pro-rata delta funding. |
| `@money-matters/capability-budgeting` | `move-money.command.test.ts` | Balanced double-entry ledger creation (`TRANSFER_OUT` + `TRANSFER_IN`); shared `transferGroupId`; source liquidity check. |
| `@money-matters/capability-budgeting` | `archive-category.test.ts` | Archival blocking if active upcoming expenses exist; default category protection; soft delete timestamp. |
| `@money-matters/capability-budgeting` | `archive-pool.test.ts` | Balance sweep requirement on positive funds; cascading soft delete to child categories; last Everyday pool guard. |
| `@money-matters/capability-budgeting` | `restore-item.test.ts` | Cascading restoration integrity; parent pool dependency validation; bank account dependency validation. |
| `@money-matters/capability-tenant` | `index.test.ts` | Tenant creation; owner role assignment; partner invitation token generation; 48-hour expiration; email identity verification on acceptance; governance info. |
| `@money-matters/capability-transactions` | `index.test.ts` | Expense recording; double-entry transfers; idempotency key deduplication; category ledger queries; CSV generation. |
| `@money-matters/capability-billing` | `index.test.ts` | Stripe checkout session generation; customer portal URL creation; webhook signature verification; subscription status transitions; invoice logging. |
| `@money-matters/capability-simulation` | `can-afford-simulation.test.ts` | 6-verdict classification (`SAFE_YES`, `PACING_TIGHT`, `BILLS_RISK`, `WAIT_FOR_PAYCYCLE`, `GOAL_DELAYED`, `HARD_NO`); safe cushion math; 80% living allowance floor. |
| `@money-matters/capability-notifications` | `email.test.ts`, `index.test.ts` | Resend email dispatch; partner invitation template; weekly digest template; push token registration and deregistration. |
| `@money-matters/core` | `logger.test.ts`, `australian-calendar.test.ts`, `correlation-id.test.ts` | Automatic PII redaction (tokens, passwords, emails); correlation ID propagation; Australian public holiday and date formatting. |
| `@money-matters/db` | `base.test.ts` | Standard audit column inheritance (`id`, `tenantId`, `appId`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `archivedAt`); soft delete filter behavior. |
| `@money-matters/types` | `commands.types.test.ts`, `locale.types.test.ts`, `settings.types.test.ts`, `status.types.test.ts`, `bank-account.types.ts` | Zod `.strict()` parsing; 12-digit amount cap regex; frequency enum boundaries; country code defaults. |
| `@money-matters/ui` | `format.test.ts`, `is-dirty.test.ts`, `month-progress.test.ts`, `phone-validation.ts` | Timezone-aware date formatting; form dirty state comparator; Australian mobile phone regex validation (`04...`). |
| `apps/api` | `app.test.ts`, `bank-reconciliation.test.ts`, `router-protections.test.ts`, `edge-context.test.ts` | Tenant isolation enforcement; `privateTenantProcedure` RLS session context injection; `ownerProcedure` role barriers; write-access lockdown on trial expiration; 1-click balance alignment ledger transactions. |
| `apps/mobile` | `biometrics.test.ts`, `format.test.ts`, `haptics.test.ts`, `version.test.ts`, `trpc.test.ts` | SecureStore biometric persistence; currency/date formatting; tactile haptic triggers; 401 retry interceptor. |
| `apps/web` | `bank-rollup.test.ts`, `categories.test.ts`, `simulationData.test.ts`, `trpc.test.ts` | Payday bank transfer aggregation (1 transfer per external bank); category balance hooks; interactive simulator event callouts. |

---

### 13.2 Comprehensive Screen-by-Screen E2E Test Suite Specification

This specification governs the exhaustive end-to-end Playwright master suite (`apps/web/e2e/screen-by-screen.spec.ts`) and manual testing protocols:

1. **Pre-Login & Public Flow**:
   - `E2E-001`: Landing Hero rendering, SEO metadata, tagline accuracy, and "Start 60-Day Free Trial" CTA.
   - `E2E-002`: Interactive Payday Simulator (`#simulator`): scrubber dragging, payday checkpoint pauses, transfer between pools modal, live plain-English narrative update.
   - `E2E-003`: Public Legal Pages: `/terms` and `/privacy` compliance content, Australian jurisdiction clauses.
   - `E2E-004`: Branded 404 handler (`/invalid-route`) and return navigation.
2. **Authentication & Password Recovery**:
   - `E2E-005`: Sign-in screen: email/password inputs, Google OAuth CTA, forgot password navigation.
   - `E2E-006`: Sign-up screen: validation boundaries, password strength meter real-time feedback, social auth buttons.
   - `E2E-007`: Forgot password OTP flow: 6-digit email OTP entry, password reset, confirm password validation.
   - `E2E-008`: Partner invite acceptance: `/invite/[token]` validation and auto-tenant membership.
3. **Onboarding & Setup Re-calibration**:
   - `E2E-009`: Initial setup wizard (Steps 1-4): dynamic income entry, archetype selection, 60-second cheat sheet modal, ABS lifestyle sliders, review screen commit.
   - `E2E-010`: Budget re-calibration (`/setup?mode=rerun`): pre-filled values, 3-step streamlined flow, budget impact review panel diff confirmation.
4. **Dashboard Financial Cockpit**:
   - `E2E-011`: Dashboard layout: Hero card, Everyday pacing meter, Bills shortfall banner, Goals progress strip, Attention queue, Next Payday card, Bank balances strip.
   - `E2E-012`: Quick Action menu & FAB: Record Expense, Record Income, Transfer between Pools, Quick Pick badges, recent/frequent suggestions.
   - `E2E-013`: Keyboard shortcuts modal (`?` trigger) and Escape dismissal.
   - `E2E-014`: Multi-tenant switcher in sidebar and mobile avatar menu.
5. **Bank Accounts & Reconciliation**:
   - `E2E-015`: Bank accounts table: branded provider badges, last 4 digits, balances, unbudgeted buffer.
   - `E2E-016`: Add & Edit Bank Account modal: field validation, buffer $\le$ balance constraint, stealth private toggle.
   - `E2E-017`: 1-Click Balance Alignment modal: surplus auto-route to Surplus Target, shortfall resolution from available pools, ledger transaction creation.
   - `E2E-018`: Cross-Bank Transfer warning modal with 1-tap copy amount button.
6. **Pools & Categories**:
   - `E2E-019`: Pools table: search, filter (Everyday/Bills/Goals, Shared/Private), pagination, projection scrubber.
   - `E2E-020`: Add & Edit Pool modal: field validation, immutable bank account/type lock on edit, surplus target designation.
   - `E2E-021`: Add & Edit Category modal: target amount, frequency select, monthly equivalent preview, essential toggle.
   - `E2E-022`: Pool archival with positive balance: `<MoveMoneyModal>` sweep challenge and balanced transfer execution.
7. **Income & Expenses Hub**:
   - `E2E-023`: 12-Month Matrix Plan tab: forward paydays grid, intermediate expense deductions, slide-over category inspection drawer.
   - `E2E-024`: Upcoming Queue tab: chronological sorting, overdue highlighting, search and type filters.
   - `E2E-025`: Mark Spent workflow: past/today date validation, shortfall funding multi-pool selection, confirmed status lock.
   - `E2E-026`: Scheduled Transfers workflow: date branching (Save vs Confirm), source liquidity guard.
   - `E2E-027`: Setup & Sources tab: recurring income and expense schedule CRUD, "Every N" custom intervals, automatic re-bursting.
8. **Dedicated Income Split Studio**:
   - `E2E-028`: Navigation to `/dashboard/income-split?id=[id]`: plan source badges (`Auto-Calculated`, `Custom Saved`, `Confirmed`).
   - `E2E-029`: Interactive pool adjustments: quick chips `[100%]`, `[$0]`, reactive Auto-Surplus meter, active deficit warning banner.
   - `E2E-030`: Bank Transfer Rollup Card: aggregation into 1 transfer per external bank account, 1-click copy buttons.
   - `E2E-031`: Confirm Income Split execution: ledger credit creation, transfer plan display, dirty discard protections.
9. **"Can I Afford It?" Simulation**:
   - `E2E-032`: One-off purchase simulation: safe cushion dollar check, 6-verdict badges, "What Gives" savings alternative.
   - `E2E-033`: Recurring commitment simulation: 12-month budget feasibility, goal delay schedule impact.
10. **History & Audit**:
    - `E2E-034`: Transactions ledger: search, debits/credits/transfers tabs, sortable headers, CSV export download.
    - `E2E-035`: Payday Allocations audit tab: historical runs list, slide-over detail drawer with read-only split breakdown.
11. **Settings, Governance & Subscriptions**:
    - `E2E-036`: My Details: read-only default mode, edit form validation, country/phone formatting, presentation display timezone picker (`user_preferences.timezone`), avatar pan/zoom upload, info tooltip toggle.
    - `E2E-037`: Household: permanent base currency lock (read-only with informative tooltip explaining transaction and account integrity), accounting timezone picker (`tenants.timezone`), member list, partner invitation dispatch, leave household challenge.
    - `E2E-038`: Archived Data: filter by entity type, cascading restore integrity validation.
    - `E2E-039`: Data & Subscription: trial countdown, Stripe checkout redirect, customer portal link, invoice receipts, 1-click 12-table Zipped CSV Backup download.
    - `E2E-040`: Household Danger Zone & Account Deletion: exact household name typing confirmation, automated database erasure dispatch.
