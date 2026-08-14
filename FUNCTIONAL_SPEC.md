# FUNCTIONAL_SPEC.md — money-matters

> **Last updated:** 2026-08-09  
> **Status:** Fully synchronized with Freemium Subscription Model (30-Day Free Trial, Permanent Free Tier, Stripe Billing Integration), Interactive Estimation Quiz Onboarding across Web & Mobile, Backend `reSetupBudget` capability integration for Re-Run Budget Setup (`/setup?mode=rerun` and `/(setup)?mode=rerun`), 5-Step Waterfall Cascade, Big 4 AU Bank CSV Import, Smart Notifications, Serene Finance Design System (Streamlined Zone Hero Card, Two-Tier Severity Attention List, Permanent 3-Way Flow Filter), Tenant Switcher, Android Mobile Target, Privacy Policy, Support Contact, Sentry Exception Tracker, and PostHog Product Telemetry.

---

## 1. Overview & Core Philosophy

Money Matters is a forward-looking allocation budget app designed for Australian households and families.
- **Freemium Commercial Model**: 30-day full Household trial on sign-up (no credit card required). Expired trials enter a 7-day read-only grace period before dropping to the permanent Free plan. Users can upgrade anytime to the Household plan ($9.99/mo or $89/yr, with a $69/yr founding member launch price).
- **Free Tier vs Household Plan**: Free plan retains core waterfall allocation, 90 days transaction history, and up to 3 Goal categories. Household plan unlocks full transaction history, unlimited Goal categories, Big 4 AU Bank CSV statement import, and file notes/attachments.
- **Everyday Pool**: Single aggregated discretionary spending pool per tenant (groceries, dining, transport, personal).
- **Unified Bills Pool**: Single aggregated pool for all recurring fixed and semi-fixed obligations (mortgage/rent, utilities, insurance, phone/internet, subscriptions). Sub-categories serve as setup estimation sliders and transaction tags without maintaining separate envelope buckets. Automatic roll-over leaves leftover bills money in the pool, reducing the required top-up on the next paycheck.
- **Due-Date Guardrail Engine**: Background check evaluating whether upcoming bills in the next 14 days exceed the current Bills Pool balance. Displays a calm amber card on the Dashboard if a shortfall is detected.
- **Save Toward (Goals & Emergency Buffer)**: Target sinking funds with target amounts and dates (Emergency Expenses buffer, vehicle maintenance, holidays). Unscheduled or emergency expenses draw down directly from the Emergency Buffer Goal category.
- **5-Step Waterfall Allocation Engine**: Automatic self-healing waterfall allocation engine on every income event:
  1. *Deficit Repair*: Priority 1 restoring any negative pool or category (`< $0`) to $0.
  2. *Bills Pool Allocation*: Tops up the unified Bills Pool: `BillsTopUp = max(0, TargetBillsCap - CurrentBillsPoolBalance)`.
  3. *Committed Goals & Emergency Buffer*: Allocates target monthly savings contribution.
  4. *Everyday Top-Up*: Tops up pooled Everyday discretionary balance to target cap.
  5. *Surplus Sweep*: Sweeps residual unallocated income strictly into the designated `isSurplusTarget` GOAL category (default: *"Surplus & Offset Reserve"*).
- **Surplus Sweep & Catch-Up Mechanics**: System enforces a single designated `isSurplusTarget` Goal category per household. Deletion of the active Surplus Target category is blocked unless a replacement Goal category is selected. On login after month boundaries, if un-swept Everyday balances exist, an interactive **Catch-Up Sweep Modal** prompts the user to sweep leftover funds into their designated Surplus Target category (or keep them in Everyday spending per household settings).
- **Settings Re-Run Budget Setup Workflow**: Preservative budget adjustment accessible via `Settings → Re-run Budget Setup`. Pre-fills current config into the wizard and presents a final **Budget Impact Review Panel** showing net monthly cap diffs (+/- $), sub-category changes, next-payday effective date notice, and Apply/Cancel controls (0 DB changes on cancel).
- **Actionable Bank Transfer Guidance**: Actionable bank transfer prompt cards with 1-tap `[Copy Amount]` buttons when changing pool bank account links in Settings, plus a 1-tap **Payday Transfer Plan Card** post-allocation for Osko/PayID mobile banking transfers.
- **Partner Collaboration**: Shared household context (`tenantId`) giving partners full read/write visibility.

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
  - Web: Drag-and-drop CSV file upload in Bank Accounts / Transactions screen.
  - Mobile: Native file picker selection.
  - Automatic parsing of bank-specific CSV headers (Date, Description, Amount, Balance).
  - Rule-based category matching based on merchant description keywords.
  - Transaction deduplication based on transaction hash (`date + amount + description`).
  - User bulk confirmation & manual category re-assignment.

---

## 4. Household & Partner Collaboration & Security

- **Partner Invitation & Async Email Delivery**: Household owner generates a secure invite token (`invitePartner`) with a strict 48-hour expiration lifetime (`expiresAt`). The API worker dispatches a non-blocking `partner/invited` event to Inngest, which delivers the invitation email via Resend with 3 automatic retries.
- **Acceptance & Identity Flow**: Partner receives email, clicks link (`/invite/[token]`), signs in/up, and joins the household tenant (`tenant_users`). The system enforces email identity matching (accepting user's email must match `inviteEmail`) and blocks expired tokens. Expired or mismatched invites are rejected and require re-invitation by the household owner.
- **Welcome & Onboarding Email Workflow**: Upon new user registration/auto-provisioning (`auth/user.signup`), Inngest asynchronously triggers a welcome email via Resend introducing trial status and dashboard onboarding features.
- **Shared Access**: Partner enjoys complete read/write access to categories, transactions, upcoming events, and allocation rules.
- **Password Reset & Security Standard**: Password reset flow (`/reset-password`) validates redirect targets against allowed app schemes (`moneymatters://*`) and domain whitelists (`https://*.kaesava.au`), enforcing strong password complexity (min 8 chars with number/symbol) on mobile and web clients.
- **Async Account Deletion & Confirmation**: Account deletion requests (`deleteMyAccount`) trigger background worker execution (`user/account.delete-requested`) for deep database wipes, storage cleanup, and email confirmation dispatch.

---

## 5. Dashboard & UI Experience (Serene Finance Design System)

- **Design System ("Serene Finance")**:
  - Color Tokens: Serene Blue (`#2563eb`), Primary Navy (`#1B2B4B`), Surface Bright (`#ffffff`), Surface Dim (`#F7F8FA`), Growth Green (`#22c55e`), Burn Red (`#ba1a1a`).
  - Typography: Inter for general UI text; **JetBrains Mono** (`font-mono`, `tabular-nums`) loaded via `next/font/google` for all monetary metrics across Web and Mobile.
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
3. **i18n Externalization**:
   - 100% of user-facing UI labels, error messages, headings, modal prompts, placeholders, and tooltips are externalized in `@money-matters/i18n`.
   - Verified via `pnpm lint` (`check-i18n`).
