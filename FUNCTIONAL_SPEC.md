# FUNCTIONAL_SPEC.md — money-matters

> **Last updated:** 2026-07-24  
> **Status:** V2 Core Functional Specification.

---

## 1. Overview & Terminology

- **Everyday Pool**: Single discretionary spending category per household. Seeded automatically on tenant creation.
- **Regular Bills**: Recurring fixed obligations (e.g. Rent, Electricity, Internet).
- **Save Toward (Goals)**: Target savings categories with target amounts and target dates.
- **Income & Expenses**: Management of recurring and one-off income sources and expense bills.
- **Bank Reconciliation**: Adjusting actual bank account balances against expected balance calculated from linked categories.

---

## 2. Archival & Editing Rules Lifecycle

1. **Category Archival**:
   - Blocked if there are active upcoming expenses or pending income allocations against the category.
   - Default Everyday category cannot be deleted or archived.
   - Default savings or default excess pool categories cannot be archived.

2. **Bank Account Archival**:
   - Blocked if non-archived categories are linked to the account.

3. **Income / Expense Source Archival & Editing**:
   - **Editing Income/Expenses**:
     - *Amount Changes*: Cascades to all unperformed/unconfirmed upcoming occurrences (`status === 'UPCOMING'`).
     - *Date Changes (One-off)*: Updates expected date on unperformed occurrences.
     - *Frequency / Start Date Changes*: Deletes unperformed future occurrences and regenerates future occurrences from new start date.
     - *Switch Recurring $\leftrightarrow$ Single*: Deletes unperformed future occurrences and creates single/recurring future occurrences.
     - *Historical Protection*: Any paycheck split or bill payment already confirmed/paid (`status !== 'UPCOMING'`) is **never** mutated or deleted.
   - **Archival**:
     - Relaxed rule: When an income stream or expense bill is archived, all **unperformed future occurrences are permanently deleted**, while the source record is soft-archived (`archivedAt`). Paid/confirmed historical occurrences remain intact in history.
     - Displays customer-focused warning prior to confirming archival.

---

## 3. Dashboard Experience (Web & Mobile)

- **Collapsible Quick Actions Panel**:
  - Persists open/collapsed state per user across logins.
  - 4 Stat Chips: Total Income, Spent this Month, Saved this Month, Everyday Balance.
  - Dual-mode Quick Record transaction card/modal (Expense & Income) + segmented mode toggle (`DEBIT` vs `CREDIT`), featuring Expense Bill Name, Income Source Name, and Receiving Bank Account selector.
  - Bank Account Balances & Reconciliation card with link to Bank Settings.
  - Interactive "Can We Afford This?" calculator widget.
  - Shared "Move Money" button & modal.
  - Category Health shortcuts (At Risk - Orange, Missed - Red) taking user to pre-filtered Categories tab.
- **Unified Upcoming Events Panel**:
  - Combined Income Deposits and Expense Bills sorted by ascending date.
  - Filter tabs: All, Income & Paychecks, Bills & Expenses.
  - Responsive search across names, categories, and notes.
  - Distinct styling for past overdue events (Action Required).
  - Unified "Edit / Mark Paid" modal for Expense events featuring Master Series notice, category before/after balance, health status (future dates), amount validation (>= 0), notes, permanent deletion, and "Save without Marking Paid".
  - Unified "Process Payday / Edit" modal for Income events featuring Master Series notice, receiving bank account selector, notes, amount validation (>= 0), category before/after balance, health status (future dates), expandable allocation reasoning dialog ("ⓘ Why this amount?"), permanent deletion, and "Save without Marking Paid".

---

## 4. Categories Management

- Filter groups:
  - Health: All, On Track (Green), At Risk (Orange), Missed (Red).
  - Type: All, Save Toward, Regular Bills, Everyday.
- Sorting across Category Name, Type, Balance, and Health.
- Clicking Category Name opens Category Detail Drawer with full transaction history.
- Move Money modal for instant transfer between categories.

---

## 5. Income & Expenses Management

- Split side-by-side or stacked tables for Income Sources and Expense Sources.
- One-off vs recurring schedule definitions.
- 12-month rolling burst engine for future event generation.

---

## 6. Transactions & Audit Export

- Filter groups: Category Type, Category, Flow (Debit / Credit).
- Responsive search across Category, Note, and Amount.
- Multi-column sorting (default: descending date).
- One-click CSV Export.

---

## 8. Release 2 Deferred Scope

1. **Bank CSV Statement Import & Open Banking Hub**:
   - Deferred to Release 2.
   - Will support drag-and-drop CSV imports for major Australian banks (CBA, Westpac, ANZ, NAB, Macquarie, ING) and Open Banking CDR integration via Basiq.

## 9. Internationalization (i18n) & Localization Governance

- **Zero Hardcoded User-Facing Text**: 100% of user-facing UI labels, error messages, headings, modal prompts, placeholders, and tooltips are externalized into `@money-matters/i18n`.
- **Dynamic Parameter Interpolation**: Support multi-language rendering and dynamic parameters (e.g. `{page}`, `{totalPages}`, `{rate}`, `{appName}`).
- **Cross-Platform String Alignment**: Shared dictionary keys ensure consistent terminology between Web (`apps/web`), Mobile (`apps/mobile`), and UI primitives (`packages/ui`).
- **Automated Verification**: Build & lint pipeline executes `check-i18n` verification script to validate key presence and prevent un-translated strings.
