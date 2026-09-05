# FUNCTIONAL_SPEC.md — money-matters

> **Last updated:** 2026-09-05  
> **Status:** Fully synchronized across all Master Plan phases & Pool-Centric Architecture enhancements: Pool-Centric Model (`Bank Account → Pool → Category`), `getPoolBalancesMap` DB-side aggregate balance utility in `@money-matters/db`, `budgetingRouter` consolidating pool, category, and budgeting RPC procedures, 100% `privateTenantProcedure` RLS session context injection across private routes (bank accounts, pools, categories, income, payday, expenses, reconciliation), transactional payday allocation plan revert with offsetting DEBIT ledger entries, cascading pool soft-archival to child categories, last-category-in-pool archival protection, 100% i18n externalization & Japanese dictionary parity (`ja.ts`), AST-based `check-i18n` validator, standardized terminology ("Everyday Spending", "Bills", "Expense", "History"), Centralized Form Input Defenses (12-digit amount cap, string HTML/script stripping, date-picker enforcement, mandatory red asterisk UX, and dynamic submit button state blocking), 100% Vitest unit test coverage, Commercial Model (60-Day Free Trial with Hard Paywall Lockdown on Day 61, $9.95 AUD/mo or $89/yr, $69/yr founding member launch price), Revamped Settings 4-Tab Architecture (`My Details`, `Household`, `Archived Data`, `Data & Subscription`), mandatory Name & Notification Email validation, reusable `CountrySelect`, `LocationFields` & `PhoneInput` validation components, custom 256x256 WebP avatar photo uploads, owner-only household member removal with modal confirmation challenge, Pools Surplus Sweep Target assignment across GOAL and REGULAR categories, 12-table Zipped CSV Data Backup, left-aligned Income & Bills Timeline view switcher with `(i)` InfoTooltip, Orthogonal Stealth Privacy (`isPrivate: boolean` flag across `EVERYDAY`, `REGULAR`, `GOAL` pools) with Postgres RLS, 5-Level "Can We Afford This?" Cashflow Engine with Bill Buffer Protection and Daily Pacing Velocity, 3-Step Interactive Setup Wizard across Web & Mobile, 5-Step Waterfall Cascade, Big 4 AU Bank CSV Import, Smart Notifications, Serene Finance Design System with Unified Web & Mobile Toast/Alert Feedback Infrastructure, App-Wide Global Error Boundary (`QueryCache.onError`), Backend Lazy Materialization, Session Draft Persistence (`sessionStorage`), Clean Separation of Public Compliance Legal Info vs In-App Household Governance, Prominent Aussie Household Warnings, Tenant Switcher, Android Mobile Target, Privacy Policy, Support Contact, Sentry Exception Tracker, and PostHog Product Telemetry.

---

## 1. Overview & Core Philosophy

Money Matters is a forward-looking allocation budget app designed for Australian households and families.
- **Commercial Model**: 60-day full Household trial on sign-up (no credit card required). Covers 2 full monthly pay and bill cycles. On Day 61 (`NOW() > trialEndsAt`), the account enters `TRIAL_EXPIRED` hard lockdown mode requiring a $9.95 AUD / month (or $89 AUD / year) subscription to continue dashboard read/write access. CSV Data Export remains permanently accessible so users are never "holding their data hostage."
- **Unified Product Tier (Full Access)**: All users enjoy complete access to the 5-step waterfall engine, unlimited transaction history, unlimited Goal pools, Big 4 AU Bank CSV statement import, **Household Partner Invites**, **Private Pools**, and **Private Personal Bank Accounts** during their 60-day trial or active subscription.
- **Pool-Centric Architecture**: Budgeting, allocations, money movements, and reconciliation operate at the **Pool** level (`Bank Account → Pool → Category`). Categories are sub-tags for expense tracking (`EVERYDAY` and `REGULAR` pools contain categories; `GOAL` pools operate directly without sub-categories).
- **Immutable Pool Bank Account & Type Linking**: Once a Pool is created, its linked Bank Account (`bankAccountId`) and Pool Type (`poolType`) are strictly immutable to preserve historical ledger auditability and prevent stealth privacy leaks. Moving a Pool to a different Bank Account requires archiving the old Pool and creating a new one linked to the target account.
- **Unbudgeted Buffer Constraint**: A Bank Account's Unbudgeted Buffer / Reserved Funds cannot exceed its Current (Last Known) Balance. Inline validation enforces this limit during creation and edit.
- **Orthogonal Privacy Flag (`isPrivate: boolean`) & 100% Stealth Privacy**: Privacy is set on the **Bank Account** level (`bank_accounts.isPrivate`) and inherited by all contained Pools and Categories via `innerJoin`. PostgreSQL Row-Level Security (RLS) with session variable context injection (`privateTenantProcedure`) guarantees 100% stealth privacy isolation.

- **Everyday Pools**: Discretionary spending pools linked to transaction accounts.
- **Regular Bills Pools**: Unified pools for recurring obligations. Sub-categories serve as expense sub-tags and monthly target benchmarks.
- **Goal Pools**: Target sinking funds with target amounts and dates (Emergency Expenses buffer, vehicle maintenance, holidays). GOAL pools operate directly without sub-categories.
- **3-Tab Income & Expenses Command Center (`/dashboard/income-and-bills`)**:
  1. *Tab 1: Income Allocation Grid*: Interactive forward-looking 12-month spreadsheet grid for payday planning out to 12 months with subtle overdue badges on past columns.
  2. *Tab 2: Upcoming*: Pending/un-actioned scheduled events queue ordered by ascending date with subtle overdue highlighting, single-row actioning (*Run Split* hyperlinked action for Income launching the unified Split Income drawer, *Mark Spent*, *Delete*), full-width search bar (`w-full md:w-80 flex-1 max-w-md`), and 100% header-to-cell alignment parity.
  3. *Tab 3: Setup*: Structured resizable tables for recurring Income Schedules and Expense Schedules with custom interval ("Every N") support, top unified search input, embedded "+ Add" buttons, clickable schedule name edit hyperlinks, and discreet modal archiving.
- **Dynamic Waterfall Allocation Engine & Resolution Hierarchy**:
  - *5-Step Priority Waterfall*: Step 0 (Deficit Repair) $\rightarrow$ Step 1 (Essential Regular / Priority Bills) $\rightarrow$ Step 2 (Standard Regular Bills) $\rightarrow$ Step 3 (Committed Goals) $\rightarrow$ Step 4 (Everyday Allowance Top-Up) $\rightarrow$ Step 5 (Uncommitted Goals & Residual Surplus Sweep).
  - *Unified Resolution Hierarchy*: When evaluating any upcoming payday (via Home Screen "Log Payday" drawer, Timeline, or Bulk Allocate tab), the query checks for saved `allocation_plans` in the database first. If custom overrides exist, it returns the saved plan lines. If no saved plan exists, it dynamically computes the 5-step waterfall on-the-fly.
  - *Automatic Recalculation*: Changing category targets/allowances in Setup automatically recalculates unsaved future paydays when opened. Changing income schedules cascade-deletes obsolete `allocation_plans` (`ON DELETE CASCADE`), presenting fresh dynamic allocations for the new schedule without requiring manual background jobs.
  - *Stateless vs Cumulative Math*: Bills and Everyday allowances evaluate time-based per-paycheck math statelessly. Savings goals with target dates evaluate cumulative timeline progress.
- **Zero-Deficit Hard Constraint & Lowest Watermark Validation**: The projection engine evaluates `minProjectedBalance` *between* payday columns to catch intra-cycle cashflow crunches caused by ill-timed bills, rejecting edits that would cause a hidden bounce.
- **Stealth Privacy RLS Math Balancing**: Returns an opaque `hiddenAllocationsTotal` per column so partner views maintain exact zero-sum math without leaking private category names, IDs, or balances.
- **Categories Forward Timeline Slider**: Draggable slider (Today → +12 Months) on `/dashboard/categories` for scrubbing forward in time to inspect projected category balances.

- **Surplus Sweep & Catch-Up Mechanics**: System enforces a single designated `isSurplusTarget` Goal category per household. Deletion of the active Surplus Target category is blocked unless a replacement Goal category is selected. On login after month boundaries, if un-swept Everyday balances exist, an interactive **Catch-Up Sweep Modal** prompts the user to sweep leftover funds into their designated Surplus Target category (or keep them in Everyday spending per household settings).
- **Settings Re-Run Budget Setup Workflow**: Preservative budget adjustment accessible via `Settings → Re-run Budget Setup`. Pre-fills current config into the wizard and presents a final **Budget Impact Review Panel** showing net monthly cap diffs (+/- $), sub-category changes, next-payday effective date notice, and Apply/Cancel controls (0 DB changes on cancel).
- **Actionable Bank Transfer Guidance**: Actionable bank transfer prompt cards with 1-tap `[Copy Amount]` buttons when changing pool bank account links in Settings, plus a 1-tap **Payday Transfer Plan Card** post-allocation for Osko/PayID mobile banking transfers.
- **Partner Collaboration**: Shared household context (`tenantId`) giving partners full read/write visibility.
- **Date Formatting Standard**: All dates rendered in UI views, modals, cards, and tables are formatted in timezone-aware Australian English format (`31 Dec 2026`) via `fmtDate`. Raw ISO date strings (`2026-12-31`) are strictly prohibited in user-facing components.
- **Resizable Table Columns**: All data tables across the app feature interactive draggable column resizing dividers (`<ResizableTh>` & `useResizableColumns`) with clean, sensible default relative widths.
- **Quick Action Suggestion Filters**: The Quick Action "Last 3" recent suggestion pickers automatically filter out system Payday waterfall allocations, category transfers, and manual pool balance adjustments.
- **Paid Bill & Allocated Income Lock**: Once a bill is marked `CONFIRMED` or income allocated, core fields are strictly locked from editing with a `🔒 Paid` / `🔒 Allocated` status badge to prevent ledger drift. Undo/reopening is deferred to V2 scope (`FEAT-V2-005`).

---

## 2. Onboarding Experience (Full Interactive Estimation & Setup Engine)

The onboarding flow delivers an engaging interactive estimation experience completing in under 60 seconds with 2025/2026 ABS benchmark estimates across both Web & Mobile:

1. **Step 1: Income & Earnings (Dynamic Multi-Income Entry)**:
   - Dynamic list of income sources (Primary Income, Side Hustle, Consulting, etc.) allowing users to add as many income sources as needed one at a time.
   - Per-income item details: Name/label, take-home amount ($), and frequency (Weekly / Fortnightly / Monthly). No partner-centric assumptions, supporting both single individuals and multi-income households.
2. **Step 2: Lifestyle Setup (Per-Item Vehicle & Child Configurations)**:
   - **Housing**: Own (Mortgage) | Own (Outright) | Rent (Solo) | Rent (Sharehouse).
   - **Transport (Per-Vehicle Configuration)**: Checkbox for vehicle ownership with dynamic per-vehicle configuration (Vehicle name/label + vehicle class: Small/Hatchback, Mid-size SUV/Sedan, Luxury/4WD). Plus options for Public Transport and Rideshare.
   - **Family (Per-Child Configuration)**: Checkbox for dependents with dynamic per-child configuration (Child name/label + school stage: Childcare, Primary, Secondary + school type: Public, Catholic, Private).
   - **Health & Wellbeing**: Private Health Cover, Gym/Fitness, out-of-pocket medical.
   - **Debt & Pets**: Active debt minimum repayments ($), pet count.
   - **Obligations & Giving**: Charity donations, family financial support ($).
   - **Everyday Spend Sliders**: Weekly spend sliders for Groceries ($270 default), Dining & Fun ($240 default), Personal ($100 default) + dynamic incidental buffer `M`.
3. **Step 3: Estimated Budget Review & Category Management**:
   - Presents a clear, user-friendly breakdown: *"Based on your answers, we've estimated your monthly bills, goal funds, and everyday spending."*
   - Includes **Everyday Spending Categories** (Groceries & Supermarket, Eating Out & Takeaway, Personal & Entertainment, Everyday Incidentals).
   - Allows users to adjust monthly target amounts ($), add custom categories, or **remove categories** (with a ✕ button).
4. **Step 4: Monthly Budget Plan Summary**:
   - Clear, accessible summary comparing Total Monthly Income vs Total Monthly Allocated (Everyday, Bills, Savings Goals).
   - Highlights Net Surplus or Deficit.

### UX Guardrails & Flow Controls
- **Info Tooltips (ℹ️)**: Contextual tooltips on each step explaining *why* information is collected and *how* the 5-step waterfall allocations operate.
- **Discard Warning Guard**: Clicking "Cancel" opens a consistent confirmation modal warning users that un-saved setup changes will be discarded.
- **Zero-Categories Login Guard**: Logging in or navigating to the Dashboard (`/dashboard` on Web, `/(app)/home` on Mobile) with 0 active categories automatically redirects the user directly to the setup wizard.

---

## 3. Bank Statement CSV Import (V1 Launch Feature)

- **Supported Banks**: Commonwealth Bank (CBA), Westpac, ANZ, National Australia Bank (NAB), ING, and Macquarie.
- **Import Flow**:
  - Web: Interactive 3-Step CSV Import Wizard (`Upload` $\rightarrow$ `Review & Map` $\rightarrow$ `Complete & Commit`).
  - Mobile: Informative guidance directing users to the Web App for statement CSV imports with category/income mapping and duplicate prevention.
  - Automatic parsing of bank-specific CSV headers (Date, Description, Amount, Balance) with custom column mapper fallback.
  - Rule-based category matching based on merchant description keywords.
  - Server-side deduplication based on transaction hash (`date + flowType + amount + description`) pre-flagging duplicate rows (`⚠️ Duplicate`).
  - Bulk confirmation & manual category / income source re-assignment before committing to the database.

---

## 4. Household & Partner Collaboration & Security

- **Partner Invitation & Async Email Delivery**: Household owner generates a secure invite token (`invitePartner`) with a strict 48-hour expiration lifetime (`expiresAt`). The API worker dispatches a non-blocking `partner/invited` event to Inngest, which delivers the invitation email via Resend with 3 automatic retries.
- **Acceptance & Identity Flow**: Partner receives email, clicks link (`/invite/[token]`), signs in/up, and automatically joins the household tenant (`tenant_users`) and is redirected to the dashboard. The system enforces email identity matching (accepting user's email must match `inviteEmail`) and blocks expired tokens. Expired or mismatched invites are rejected and require re-invitation by the household owner.
- **Welcome & Onboarding Email Workflow**: Upon new user registration/auto-provisioning (`auth/user.signup`), Inngest asynchronously triggers a welcome email via Resend introducing trial status and dashboard onboarding features.
- **Background Notifications & Scheduled Crons Strategy**: For Release 1 (Web), background cron execution via Inngest is focused on the **Weekly Email Digest** (`notifyWeeklyDigest` running Sundays at 7:00 PM AEST). Payday reminders, bill due dates, and goal milestones are delivered directly via real-time Web UI dashboard banners and instant toast feedback. Mobile push crons (`notifyPaydayIncoming`, `notifyBillDueSoon`, `notifyBillOverdue`, `notifySpendingVelocity`) are retained in the codebase and staged for Release 2 (Mobile App target).
- **Shared Access**: Partner enjoys complete read/write access to categories, transactions, upcoming events, and allocation rules.
- **Password Reset & Security Standard**: Password reset flow (`/reset-password`) validates redirect targets against allowed app schemes (`moneymatters://*`) and domain whitelists (`https://*.kaesava.au`), enforcing strong password complexity (min 8 chars with number/symbol) on mobile and web clients.
- **Async Account Deletion & Confirmation**: Account deletion requests (`deleteMyAccount`) trigger background worker execution (`user/account.delete-requested`) for deep database wipes, storage cleanup, and email confirmation dispatch.

---

## 5. Dashboard & UI Experience (Serene Finance Design System)

- **Design System ("Serene Finance")**:
  - Color Tokens: Serene Blue (`#2563eb`), Primary Navy (`#1B2B4B`), Surface Bright (`#ffffff`), Surface Dim (`#F7F8FA`), Growth Green (`#22c55e`), Burn Red (`#ba1a1a`).
  - Typography: Inter for general UI text; **JetBrains Mono** (`font-mono`, `tabular-nums`) loaded via `next/font/google` for all monetary metrics across Web and Mobile.
  - Dates: Dates are stored in UTC and rendered in timezone-aware AEST/en-AU format via `Intl.DateTimeFormat`.
  - Web Shell: Fixed sidebar (`SideNavBar`), frosted glass top bar (`TopNavBar`), spacious table views, responsive `width=device-width` viewport for standalone PWA / Android shortcut rendering.
  - Mobile Shell: Header (`TopAppBar`) + bottom tab bar (`BottomNavBar`).
- **Dashboard Hierarchy & Visualizations (Action-First Bento Grid)**:
  - **Top-Header Actions**: Instant 1-tap quick action triggers (`🤔 Can I Afford It?`, `⚡ Quick Expense`, `💸 Move Money`) positioned in the top header adjacent to the page title, eliminating the bottom floating action bar.
  - **Action Queue (Top Row)**: Front-and-center focus on immediate user actions upon logging in. The top row pairs `AttentionItemsList` (Bills due soon requiring actioning or marking paid) on the left with `NextPaydayCard` (Upcoming Income allocation preview) on the right.
  - **Secondary Bento Pools Section (`BentoPoolsSection`)**: Located in the middle row. Houses the dark Serene Navy (`#1B2B4B`) Everyday Spending card with a sleek horizontal pacing bar, and the clean white Bills Pool card featuring integrated 14-day shortfall warning status (`⚠️ Shortfall of $X` vs `✅ Next 14 days covered!`). Includes interactive pool balance adjustment with safety confirmation modals and Category Health filter chips (`Behind`, `Attention`, `On Track`).
  - **Goal Progress & Pace Cards**: Enhanced goal card progress tracking with 8px progress bars (`GoalsProgressStrip`), target date countdowns, and celebration banners for near-completion goals.
  - **Attention Items (`AttentionItemsList`)**: Two-tier severity presentation (Red for overdue items; Amber for upcoming-only items due within 3 days). Clean text labels with icon-visibility toggle support.
  - **Quick Expense Card (`QuickExpenseCard`)**: Symmetric Expense/Income active state toggles, collapsed date selector (defaults to today), and inline feedback messaging.
  - **Bank Reconciliation (`BankReconcileCard` & `BankReconcileModal`)**: Static status indicators with direct wiring to the `reconcileBankBalance` tRPC mutation.
  - **Deduplicated & Streamlined Filter Surfaces**: Counter-card health filter integration on Categories screen; permanent 3-way (`All / Debits / Credits`) segmented control on Transaction History screen.
  - **Collapsible Sections & Minimalist View Mode**: Quick Actions, All Upcoming Payments, and Category Health can be collapsed. Users can toggle "Show Decorative Icons" in Settings to switch between iconified vs minimalist typographic UI layouts across Web and Mobile apps.
  - **In-App Bug Reporting & App Versioning**: "Report a Bug" feature accessible from a dedicated "Help & Support" section in Settings on Web and Mobile. Captures issue title, workflow category (`setup`, `waterfall`, `transactions_sync`, `categories_bills`, `ui_ux`, `account_auth`, `other`), 4-level Frustration scale (`Nice to fix` to `Pissed me off!`), description/steps to reproduce, contact consent opt-in, auto-derived system telemetry (`platform`, `appVersion`, `deviceInfo`), auto-dispatches email receipts (`[Ref: BUG-#id]`) & admin notifications (`support@moneymatters.kaesava.au`), and persists directly to PostgreSQL (`bug_reports` table) with strict multi-tenant isolation.
  - **Inconspicuous App Version Footer**: An understated version footer (`Money Matters v1.0.0-beta.1 (#42) • beta channel`) displayed at the bottom of the Settings view on Web and Mobile. Tapping/clicking copies complete environment diagnostics JSON to the clipboard for support troubleshooting.


---

## 6. Smart Notification System (Habit Loop)

1. **Payday Reminders (`notify-payday-incoming`)**: Daily alert at 6pm AEST for upcoming payday tomorrow.
2. **Bill Due Soon Alerts (`notify-bill-due-soon`)**: Daily alert at 9am AEST for bills due in 3 days with category funding status (`Funded ✓` vs `Short by $X ⚠️`).
3. **Overdue Bill Warnings (`notify-bill-overdue`)**: Daily alert at 10am AEST for overdue bills.
4. **Weekly Financial Summary (`notify-weekly-digest`)**: Sunday 7pm AEST digest of weekly spend and category status.
5. **Goal Milestones (`notify-goal-milestone`)**: Real-time push alert when a goal category reaches 25%, 50%, 75%, or 100% target funding.
6. **Spending Velocity Alert (`notify-spending-velocity`)**: Daily pace check warning if Everyday pool spending rate will exhaust funds early.

---

## 7. Lifecycle & Governance Rules

1. **Category Archival**:
   - Blocked if there are active upcoming expenses or pending income allocations against the category.
   - Default Everyday category cannot be deleted or archived.
2. **Income & Expense Source Management**:
   - Amount changes cascade to unperformed upcoming occurrences (`status === 'PENDING'`).
   - Archival deletes unperformed future occurrences while retaining historical paid ledger entries.
3. **Household Governance & Account Erasure**:
   - Role-aware household deletion and leave controls (`/dashboard/settings/delete-account` and public `/privacy/delete-account`).
   - Sole Owners delete household with exact Household Name typing requirement.
   - Owners with partners can delete (notifies partner by email) or leave (transfers ownership to partner, deletes owner's private pools/accounts, notifies partner).
   - Partners can leave (deletes partner's private pools/accounts, notifies owner).
4. **Data Sovereignty & Zipped CSV Backup**:
   - Users can export a single `.zip` archive containing all entity CSV files (`categories.csv`, `income_sources.csv`, `expense_sources.csv`, `transaction_ledger.csv`, `bank_accounts.csv`, `allocation_plans.csv`, `file_notes.csv`).
   - Enforces multi-tenant RLS and stealth privacy (partner's private pools/bank accounts are never included in export).
5. **Redesigned 3-Tab Settings & 2-Tab History Layout**:
   - Settings page expanded to `max-w-5xl` container width with 3 sleek tabs (`Profile`, `Household`, `Account & Data`).
   - History page organized into 2 tabs (`Transactions` ledger & `Payday Allocations` audit history).
6. **i18n Externalization & Parity**:
   - 100% of user-facing UI labels, error messages, headings, modal prompts, placeholders, and tooltips are externalized in `@money-matters/i18n`.
   - Structural parity between `en.ts` and `ja.ts` is strictly enforced and verified via `pnpm check-i18n`.
