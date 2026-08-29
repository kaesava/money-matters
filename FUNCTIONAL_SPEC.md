# FUNCTIONAL_SPEC.md — money-matters

> **Last updated:** 2026-08-29  
> **Status:** Fully synchronized with 100% i18n externalization & Japanese localization (`ja.ts`), AST-based `check-i18n` validator, 100% Vitest unit test coverage, Commercial Model (60-Day Free Trial with Hard Paywall Lockdown on Day 61, $9.95 AUD/mo or $89/yr, $69/yr founding member launch price), Revamped Settings 4-Tab Architecture (`My Details`, `Household`, `Archived Data`, `Data & Subscription`), mandatory Name & Notification Email validation, reusable `CountrySelect`, `LocationFields` & `PhoneInput` validation components, custom 256x256 WebP avatar photo uploads, owner-only household member removal with modal confirmation challenge, Pools Surplus Sweep Target assignment across GOAL and REGULAR categories, 12-table Zipped CSV Data Backup, left-aligned Income & Bills Timeline view switcher with `(i)` InfoTooltip, Orthogonal Stealth Privacy (`isPrivate: boolean` flag across `EVERYDAY`, `REGULAR`, `GOAL` pools) with Postgres RLS, 5-Level "Can We Afford This?" Cashflow Engine with Bill Buffer Protection and Daily Pacing Velocity, 3-Step Interactive Setup Wizard across Web & Mobile, 5-Step Waterfall Cascade, Big 4 AU Bank CSV Import, Smart Notifications, Serene Finance Design System with Unified Web & Mobile Toast/Alert Feedback Infrastructure, App-Wide Global Error Boundary (`QueryCache.onError`), Backend Lazy Materialization, Session Draft Persistence (`sessionStorage`), Clean Separation of Public Compliance Legal Info vs In-App Household Governance, Prominent Aussie Household Warnings, Tenant Switcher, Android Mobile Target, Privacy Policy, Support Contact, Sentry Exception Tracker, and PostHog Product Telemetry.

---

## 1. Overview & Core Philosophy

Money Matters is a forward-looking allocation budget app designed for Australian households and families.
- **Commercial Model**: 60-day full Household trial on sign-up (no credit card required). Covers 2 full monthly pay and bill cycles. On Day 61 (`NOW() > trialEndsAt`), the account enters `TRIAL_EXPIRED` hard lockdown mode requiring a $9.95 AUD / month (or $89 AUD / year) subscription to continue dashboard read/write access. CSV Data Export remains permanently accessible so users are never "holding their data hostage."
- **Unified Product Tier (Full Access)**: All users enjoy complete access to the 5-step waterfall engine, unlimited transaction history, unlimited Goal pools, Big 4 AU Bank CSV statement import, **Household Partner Invites**, **Private Pools**, and **Private Personal Bank Accounts** during their 60-day trial or active subscription.
- **Orthogonal Privacy Flag (`isPrivate: boolean`) & 100% Stealth Privacy**: Each user in a household can mark any pool type (`EVERYDAY`, `REGULAR`, `GOAL`) or bank account as private. PostgreSQL Row-Level Security (RLS) and query filters (`is_private = false OR user_id = current_user`) guarantee 100% stealth privacy — a user's private pool name, transactions, balances, and private bank accounts are completely invisible to their household partner across all APIs, database queries, and reports.
- **Paywall Lockdown & Data Sovereignty**: When a 60-day trial expires or a subscription payment fails (`invoice.payment_failed` / `customer.subscription.deleted`), the tenant enters `TRIAL_EXPIRED` or `PAST_DUE` lock status. Mutating tRPC operations and main dashboard views display a full-screen Paywall Modal ($9.95 AUD/mo). Data export (`exportTenantData`) remains open for CSV backups including all transaction ledgers and allocation history. If payment succeeds (`invoice.payment_succeeded`), full subscription access is immediately restored.
- **Authentication**: Supports Google and Apple Sign-In alongside standard Email/Password authentication.
- **Tenant Switcher**: Household owners and invited partners can seamlessly switch between multiple household tenants via the Tenant Switcher in the sidebar.
- **5-Level "Can We Afford This?" Cashflow Engine**: Evaluates purchases against a 5-level multi-tier decision matrix:
  1. *Bill Buffer Protection*: Automatically reserves all upcoming bill expense events due before the next payday (`expectedDate <= nextPaycheckDate`), ensuring Everyday cash is strictly evaluated as `netAvailableCash = max(0, everydayBalance - billsReserved)`.
  2. *Daily Pacing Velocity ($/day)*: Computes `dailyPacingAfterSpend = (everydayBalance - amount - billsReserved) / daysUntilPayday`. Triggers a 🟡 `PACING_WARNING` if daily discretionary allowance drops below $15.00/day.
  3. *5 Decision Outcomes*: 🟢 `SAFE_YES` (healthy daily pacing), 🟡 `PACING_WARNING` (cash available but tight pacing), 🟠 `IMPACT_GOALS` (dips into uncommitted goal surplus), 🔵 `WAIT_FOR_PAYDAY` (covered by incoming paycheck within 14 days), 🔴 `HARD_NO` (unavoidable bill default/shortfall).
  4. *Transparent Reasoning Chain*: Displays a step-by-step cashflow breakdown in the UI detailing available cash, reserved bills, and remaining daily allowance velocity.
- **Everyday Pool**: Single aggregated discretionary spending pool per tenant (groceries, dining, transport, personal).
- **Unified Bills Pool**: Single aggregated pool for all recurring fixed and semi-fixed obligations (mortgage/rent, utilities, insurance, phone/internet, subscriptions). Sub-categories serve as setup estimation sliders and transaction tags without maintaining separate envelope buckets. Sub-categories display next-due-date and pool-level coverage status (`Covered ✓` / `Short by $X ⚠️` / `No schedule set ℹ️`) within the Bills Pool section as a read-only display layer derived from pool balance vs upcoming events due before next payday. Automatic roll-over leaves leftover bills money in the pool, reducing the required top-up on the next paycheck.
- **Due-Date Guardrail Engine**: Background check evaluating whether upcoming bills in the next 14 days exceed the current Bills Pool balance. Displays a calm amber card on the Dashboard if a shortfall is detected.
- **Save Toward (Goals & Emergency Buffer)**: Target sinking funds with target amounts and dates (Emergency Expenses buffer, vehicle maintenance, holidays). Unscheduled or emergency expenses draw down directly from the Emergency Buffer Goal category.
- **2-Tab Income & Bills Command Center (`/dashboard/income-and-bills`)**:
  1. *Tab 1: 🗓️ Schedule & Allocations*: Unified schedule tab featuring a segmented view toggle:
     - **📅 Timeline View**: Chronological feed of upcoming salary deposits and bill events for the next 60 days with single-click inline actions and an **Operational Block** that intercepts `Mark Paid` on shortfall bills, prompting 1-click shortfall resolution from the pre-selected Surplus buffer. Enforces strict chronological order (earlier paydays must be resolved or skipped before logging later ones).
     - **📊 12-Month Grid**: Interactive forward-looking 12-month spreadsheet grid for payday planning with explicit "Save Changes" and "Discard Changes" controls. Features read-only Surplus Target cells that automatically highlight in stark red during deficits, an inline **↺ Auto** column header action with confirmation prompt to revert manual paydays back to dynamic waterfall calculations, and `onBlur` cell input performance optimization.
  2. *Tab 2: ⚙️ Setup*: Encapsulates recurring income sources and expense bill rules.
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
- **Paid Bill & Allocated Income Lock**: Once a bill is marked `PAID` or income allocated, core fields are strictly locked from editing with a `🔒 Paid` / `🔒 Allocated` status badge to prevent ledger drift. Undo/reopening is deferred to V2 scope (`FEAT-V2-005`).

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
- **Dashboard Hierarchy & Visualizations**:
  - **Hero Card (`DashboardHeroCard`)**: Dominates top of screen. Features an integrated dual-arc SVG Donut Ring visualization (`DonutRing` on Web, `MobileDonutRing` on Mobile via `react-native-svg`) displaying time elapsed vs Everyday pool spent percentage, wrapping the central Everyday Balance metric. Symmetric health status badges (Behind/Attention/On Track) sit adjacent to the ring.
  - **Pool Pacing Bars (`DualPoolBar`)**: Dual-track stacked progress bars integrated into section headers on the Categories screen for Everyday Spending and Regular Bills, tracking month elapsed vs pool spent percentage with color-coded warning thresholds.
  - **Goal Progress & Pace Cards**: Enhanced goal card progress tracking with 8px animated progress bars, target date countdowns ("X days left"), and dynamic required monthly contribution calculations ("$Y/mo needed").
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
   - Amount changes cascade to unperformed upcoming occurrences (`status === 'UPCOMING'`).
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
