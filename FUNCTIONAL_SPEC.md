# FUNCTIONAL_SPEC.md — money-matters

> **Last updated:** 2026-08-02  
> **Status:** Fully synchronized with Freemium Subscription Model (30-Day Free Trial, Permanent Free Tier, Stripe Billing Integration), Interactive Quiz Onboarding, 5-Step Waterfall Cascade, Big 4 AU Bank CSV Import, Smart Notifications, Serene Finance Design System, Tenant Switcher, Android Mobile Target, Privacy Policy, and Support Contact.

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
  5. *Surplus Sweep*: Sweeps residual unallocated income to the default excess category (Emergency Fund / Offset).
- **Settings Re-Run Budget Setup Workflow**: Preservative budget adjustment accessible via `Settings → Re-run Budget Setup`. Pre-fills current config into the wizard and presents a final **Budget Impact Review Panel** showing net monthly cap diffs (+/- $), sub-category changes, next-payday effective date notice, and Apply/Cancel controls (0 DB changes on cancel).
- **Actionable Bank Transfer Guidance**: Actionable bank transfer prompt cards with 1-tap `[Copy Amount]` buttons when changing pool bank account links in Settings, plus a 1-tap **Payday Transfer Plan Card** post-allocation for Osko/PayID mobile banking transfers.
- **Partner Collaboration**: Shared household context (`tenantId`) giving partners full read/write visibility.

---

## 2. Onboarding Experience (Full Interactive Quiz & Estimation Engine)

The onboarding flow delivers an engaging interactive quiz completing in under 60 seconds with 2025/2026 ABS benchmark estimates:

1. **Step 1: The Income Engine**:
   - Primary take-home pay (Amount, Frequency: Weekly/Fortnightly/Monthly, Type: Salary/Business/Benefit).
   - Optional partner income / side-hustle addition.
2. **Step 2: The Life-Builder (Interactive Questionnaire)**:
   - **Housing**: Own (Mortgage) | Own (Outright) | Rent (Solo/Family) | Rent (Share).
   - **Transport**: Vehicle selection (count, vehicle class: Small/Mid-SUV/Luxury), Public Transport, Rideshare.
   - **Family**: Children count, school stage (Childcare/Primary/Secondary) & school type (Public/Catholic/Private).
   - **Health & Wellbeing**: Private Health Insurance, Gym/Fitness memberships, out-of-pocket medical.
   - **Debt & Pets**: Active debt minimum repayment ($), pet count.
   - **Obligations & Giving**: Charity donations, family support amount ($).
   - **Everyday Spend Sliders**: Weekly spend sliders for Groceries ($270 default), Dining & Fun ($240 default), Personal ($100 default) + dynamic incidental buffer `M`.
3. **Step 3: Background Estimation & Confirmation**:
   - Converts all inputs into normalized **Monthly** targets using Australian Bureau of Statistics (ABS) & RACQ 2025/2026 benchmark algorithms.
   - User reviews and confirms the monthly breakdown before categories and schedules are generated.

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

## 4. Household & Partner Collaboration MVP

- **Partner Invitation**: Household owner generates a secure invite token (`invitePartner`) and sends an email via Resend.
- **Acceptance Flow**: Partner receives email, clicks deep link (`/invite/[token]`), signs in/up, and joins the household tenant (`tenant_users`).
- **Shared Access**: Partner enjoys complete read/write access to categories, transactions, upcoming events, and allocation rules.

---

## 5. Dashboard & UI Experience (Serene Finance Design System)

- **Design System ("Serene Finance")**:
  - Color Tokens: Serene Blue (`#2563eb`), Primary Navy (`#1B2B4B`), Surface Bright (`#ffffff`), Surface Dim (`#F7F8FA`), Growth Green (`#22c55e`), Burn Red (`#ba1a1a`).
  - Typography: Inter for general UI text; **JetBrains Mono** (`financial-metric`, `tabular-nums`) for all monetary amounts.
  - Web Shell: Fixed sidebar (`SideNavBar`), frosted glass top bar (`TopNavBar`), spacious table views.
  - Mobile Shell: Header (`TopAppBar`) + bottom tab bar (`BottomNavBar`).
- **Dashboard Hierarchy**:
  - **Hero Card (`DashboardHeroCard`)**: Dominates top of screen. Shows Everyday Pool balance, system status (Green/Amber/Red), and next payday countdown.
  - **Attention Items (`AttentionItemsList`)**: Overdue bills and bills due within 3 days (with inline funding status).
  - **Collapsible Sections**: Quick Actions, All Upcoming Payments, Category Health.

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
