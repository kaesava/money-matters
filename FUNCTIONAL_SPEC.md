# FUNCTIONAL_SPEC.md — money-matters

> **Last updated:** 2026-07-25  
> **Status:** V2 Product Overhaul & Feature Parity Specification.

---

## 1. Overview & Terminology

- **Everyday Pool**: Single discretionary spending category per household. Seeded automatically on setup.
- **Regular Bills**: Recurring fixed obligations (e.g. Rent/Mortgage, Electricity, Council Rates, Car Insurance).
- **Save Toward (Goals)**: Target savings categories with target amounts and target dates (e.g. Emergency Fund, Holiday Fund).
- **Income & Expenses**: Management of recurring and one-off income sources and expense bills.
- **Bank Reconciliation**: Adjusting actual bank account balances against expected balance calculated from linked categories.
- **Household / Partner Collaboration**: Shared multi-user tenant scope enabling partners to manage finances together with full read/write access.

---

## 2. Onboarding Experience (2-Step Instant Value Flow)

1. **Step 1: Income Setup ("How much do you earn?")**:
   - Single income source setup (Name default `"My Salary"`, Net Pay Amount, Frequency default `FORTNIGHTLY`).
   - Sensible Aussie defaults to minimize setup friction under 60 seconds.
2. **Step 2: Bill & Goal Checklist ("Which bills do you have?")**:
   - Checkbox checklist of Australian Family presets (`AUSTRALIAN_FAMILY_PRESETS` in `@money-matters/types`).
   - Includes Mortgage/Rent, Electricity, Gas, Water, Council Rates, Home & Car Insurance, Car Rego, Health Insurance, Internet, School Fees, Childcare, Emergency Fund, Holiday Fund.
   - Pre-filled editable Australian suggested monthly amounts.
   - Immediate dashboard unlock on completion. Bank accounts and fine-tuning moved to Settings (progressive disclosure).

---

## 3. Dashboard Experience (Web & Mobile)

- **Hero Card (`DashboardHeroCard`)**:
  - Prominently displays Everyday Pool balance as the #1 central metric.
  - Overall system traffic-light health indicator (On Track / At Risk / Needs Attention).
  - Next payday summary (Source name, expected amount, date, and days away countdown).
- **Needs Attention Items (`AttentionItemsList`)**:
  - Automatically filters upcoming bills for overdue events or items due within 3 days.
  - Displays inline category funding status (`Funded ✓` vs `Short by $X ⚠️`).
  - Hidden when zero items require attention.
- **Collapsible Sections (`CollapsibleSection`)**:
  - Quick Actions & Tools (default collapsed to reduce cognitive friction).
  - All Upcoming Events & Payments (scrollable, searchable, bulk-deletable).
  - Category Health.

---

## 4. Smart Notification System

1. **Payday Reminders (`notify-payday-incoming`)**: Daily alert at 6pm AEST for upcoming payday tomorrow.
2. **Bill Due Soon Alerts (`notify-bill-due-soon`)**: Daily alert at 9am AEST for bills due within 3 days with category funding status.
3. **Overdue Bill Warnings (`notify-bill-overdue`)**: Daily alert at 10am AEST for overdue bills.
4. **Weekly Financial Summary (`notify-weekly-digest`)**: Sunday 7pm AEST digest of weekly spend and category status.
5. **Goal Milestones (`notify-goal-milestone`)**: Real-time push alert when a goal category reaches 25%, 50%, 75%, or 100% target funding.
6. **Spending Velocity Alert (`notify-spending-velocity`)**: Daily pace check warning if Everyday pool spending rate will exhaust funds early.

---

## 5. Partner Invite & Household Management (MVP)

- **Send Invitation (`invitePartner`)**: Household owners send secure invite tokens to a partner's email address.
- **Accept Invitation (`acceptInvite`)**: Partner clicks deep link (`/invite/[token]`) or accepts in app to join the household tenant.
- **Shared Access**: Partner gains full read/write access to categories, transactions, upcoming events, and payday processing.

---

## 6. Archival & Editing Rules Lifecycle

1. **Category Archival**:
   - Blocked if there are active upcoming expenses or pending income allocations against the category.
   - Default Everyday category cannot be deleted or archived.
2. **Income / Expense Source Archival & Editing**:
   - *Amount Changes*: Cascades to unperformed upcoming occurrences (`status === 'UPCOMING'`).
   - *Archival*: Deletes unperformed future occurrences; soft-archives source record. Paid/confirmed historical occurrences remain intact in ledger.

---

## 7. Internationalization (i18n) & Governance

- **Zero Hardcoded User-Facing Text**: 100% of user-facing UI labels, error messages, headings, modal prompts, placeholders, and tooltips are externalized into `@money-matters/i18n`.
- **Dynamic Parameter Interpolation**: Support multi-language rendering and dynamic parameters (`{step}`, `{amount}`, `{billName}`, `{date}`, `{shortfall}`).
- **Automated Verification**: Build & lint pipeline executes `check-i18n` verification script to validate key presence.
