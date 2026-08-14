# AGENT - In progress...

		
		
		
		
## Web App
# 100% Full-Coverage E2E Web Application Audit Protocol (Round 1 Focus)

You are acting as a Senior Product Designer, Lead Frontend Engineer, and QA Security Auditor performing a 100% full-coverage, autonomous End-to-End (E2E) audit of the **Money Matters** web application.

Your goal is to systematically exercise **EVERY single page, route, screen, modal, drawer, button, form, slider, tab, dropdown, link, filter, sort control, pagination bar, archive/unarchive action, Google OAuth flow, and CSV/JSON export feature** in Round 1 happy path lifecycle usage.

---

## 🧭 Exhaustive Screen-by-Screen & Control Audit Checklist

### 1. Landing & Public Routes (`/`)
- Audit hero headlines, value proposition cards, header links, footer links, and call-to-action buttons ("Get Started", "Sign In").

### 2. Authentication & Social Auth (`/sign-up`, `/sign-in`, `/auth-callback`, `/dev-callback`)
- **Email/Password Sign-Up:** Fill Name, Email, Password, Confirm Password; test password mismatch validation.
- **Email/Password Sign-In:** Fill credentials, test error messages, verify session cookie creation and `/dashboard` redirect.
- **Google OAuth Social Auth (`handleGoogleSignIn`):** Click "Continue with Google" on `/sign-up` and `/sign-in`; audit callback parameters (`provider: "google"`) and automatic tenant creation (`createTenant`).
- **Forgot Password & Session Persistence:** Trigger password reset email; test `/sign-in` auto-redirect when session exists.

### 3. Interactive Setup Wizard (`/setup` & `/setup?mode=rerun`)
- **Step 1 (Incomes):** Add custom income source (`+ Add Income`), edit name/amount/frequency, remove income source.
- **Step 2 (Life-Builder Quiz & Lifestyle Sliders):** Select housing type, toggle vehicles/public transport/rideshare, toggle kids/health/gym, and adjust range sliders for **🛒 Groceries ($/wk)**, **☕ Dining ($/wk)**, and **🛍️ Personal ($/wk)**.
- **Step 3 (Category Review):** Inspect category list, verify ⭐ Essential Priority Bill badges and 🏦 Designated Surplus Target badges, add custom categories.
- **Step 4 (Bank Accounts & Summary):** Input opening bank balances ($2,500 CBA Everyday), review monthly allocations, execute budget completion -> verify Day 1 auto-waterfall cascade.

### 4. Main Financial Dashboard (`/dashboard`)
- **Hero Card:** Verify Monthly Net Income, Bills Target, Goal Target, and Everyday Allowance metrics.
- **Quick Expense / Income Card:** Submit quick debit/credit entry; test account & category dropdown selectors.
- **Can-I-Afford-This Calculator:** Input dollar amounts; test instant affordability evaluation against Everyday balance.
- **Bank Reconcile Card & Modal (`BankReconcileModal`):** Reconcile actual bank balance vs expected; execute target category transfer.
- **Attention Banners (`AttentionItemsList`):** Test action buttons on pending payday reminders and bill alerts.
- **Move Money Modal (`MoveMoneyModal`):** Open modal, select source/target categories, transfer funds ($50), verify immediate balance updates.

### 5. Payday Cascade & Waterfall Allocation (`/dashboard/paychecks` & `/dashboard/paychecks/cascade`)
- **Paychecks Overview:** Inspect upcoming and historical income events.
- **Payday Waterfall Preview (`PaydayPreviewModal`):** Open preview, audit 5-step cascade breakdown, verify ⭐ Essential Priority and Urgency Acceleration due-date badges. Confirm cascade -> verify atomic transaction ledger entries.

### 6. Category Management & Sinking Funds (`/dashboard/categories`)
- **Category Grids:** Inspect EVERYDAY, REGULAR, and GOAL category sections.
- **Category Form Modal (`CategoryFormModal`):**
  - Create custom category (`+ Add Category`).
  - Edit category name/amount inline.
  - Toggle **"⭐ Mark as Essential Priority Bill"**.
  - Toggle **"🏦 Designated Surplus Target Category"** (verify atomic single-target switching across household).
- **Category Detail Drawer (`CategoryDetailDrawer`):** Open drawer for a category, inspect transaction history list, update target cap, or soft-archive category.

### 7. Transaction History, Search, Filters & Exports (`/dashboard/settings/history`)
- **Filter Bar (`FilterBar`):** Test keyword search input (`search`), Category Type filter (`EVERYDAY`, `REGULAR`, `GOAL`), Category dropdown, and Flow type filter (`DEBIT`, `CREDIT`).
- **Table Sorting:** Sort table by Date (`recordedAt`), Amount (`amount`), or Category (`categoryName`) ascending/descending.
- **Pagination (`PaginationBar`):** Change page size (10, 25, 50) and test Next/Prev pagination navigation.
- **Data Export (`exportMyData`):** Click "Export Data", trigger JSON/CSV download, verify exported payload.

### 8. Bank Accounts Management (`/dashboard/settings/bank-accounts`)
- **Account List:** Inspect linked bank accounts and opening balances.
- **Add Bank Account:** Add new account (e.g. "Macquarie Offset Saver").
- **Category Type Mapping:** Re-bind category types (`EVERYDAY`, `REGULAR`, `GOAL`) to specific bank accounts.

### 9. Archived Items & Unarchive Controls (`/dashboard/settings/archived`)
- View soft-deleted categories; click "Unarchive Category" -> verify restoration to active category grid.

### 10. Household Settings & Partner Invites (`/dashboard/settings`)
- **Profile Info:** Inspect display name, email, initials avatar.
- **Partner Invitation:** Enter partner email, send invite token -> test invite landing page (`/invite/[token]`).
- **Tenant Members List:** Inspect active members and role permissions (`OWNER`, `MEMBER`).
- **Theme & Icons:** Toggle UI icon visibility preference.

### 11. Notifications Preferences (`/dashboard/settings/notifications`)
- Toggle payday alerts, shortfall warnings, bill reminders, and weekly digests.

### 12. Subscriptions & Billing (`/subscription/upgrade` & `/subscription/manage`)
- Inspect Founding Beta Free tier vs. Premium tier features, test Stripe checkout trigger, and customer portal redirection.

---

## 📊 Evaluation Criteria Matrix

For every interaction, evaluate and record findings under:
1. **UX Flow & Friction:** Click count, cognitive clarity, navigation smoothness.
2. **UI Design & Aesthetics:** Alignment, Serene Finance tokens (`#2563eb`, `#1B2B4B`, `#F7F8FA`, `#22c55e`, `#ba1a1a`), JetBrains Mono metrics, micro-animations.
3. **Copywriting & Language:** Financial terms clarity (Waterfall, Surplus Target, Prorated), tone, absence of technical jargon.
4. **Functionality & Data Integrity:** Account balance reconciliation, math precision, modal open/close state transitions.
5. **Engagement & Delight:** Micro-interactions, accomplishment feeling on setup completion.

---

## 📝 Comprehensive Audit Output & Optimization Deliverable

Output a **Structured Actionable Recommendation & Refactoring Backlog** formatted into:

### 1. Visual & UX Teardown
- **Aesthetic Wins & Brand Alignment:** Highlights of high-converting visual design, Serene Finance palette execution, and smooth micro-animations.
- **Visual Hierarchy & Alignment Gaps:** Inconsistent font sizes, misplaced action buttons, or poor contrast areas.
- **Copywriting & Financial Terminology Polish:** Misleading or jargon-heavy labels requiring clearer Australian English phrasing.

### 2. Comprehensive Optimization Opportunities
- **UX Friction & Click Reduction:** Opportunities to collapse multi-step modals or streamline repetitive data entries.
- **Performance & Render Bottlenecks:** Slow queries, un-cached data requests, or missing loading state indicators.
- **Engagement & Delight Hooks:** Places where micro-animations, celebratory toasts, or financial achievement badges would increase user retention.

### 3. Prioritized Actionable Refactoring Backlog
- **P0 (Critical Blockers / Broken Features):** Any broken flows, validation crashes, or data calculation errors.
- **P1 (High Priority UX & Friction Fixes):** Awkward modal transitions, confusing steps, or missing confirmation notices.
- **P2 (Polish, Optimization & Micro-Interactions):** Spacing adjustments, tooltip enhancements, and animation polish.

Each backlog ticket MUST specify:
- `Target File`: Exact absolute path to file requiring edits.
- `Observed Issue`: Detailed description of issue/friction.
- `Recommended Fix`: Concrete code or design modification.


### General

### Home page
#### Hero scorecard
#### Bank Balances & Reconcile
#### Needs Attention section
#### Quick Record section

### Categories Screen
#### Move Money

### Sign-In page

## Mobile
### General
Add Firebase to your Android app - https://console.firebase.google.com/u/0/project/money-matters-504311/settings/general/android:au.kaesava.moneymatters


# Rules
* Always honour AGENTs.md rules
* Ensure FUNCTIONAL_SPECS and TECHNICAL_SPECs are kept up to date
* Always remove any redundant or unused code, db fields api routines, UI elements, labels, text, error messages, etc.
* Re-use and re-factor to re-use where possible.
* Don't make assumptions, /grill-me


# AGENT - To Do

# ME to Do (AI to ignore)

## App Shakeout & QA Task List (Web & Mobile)

### Phase 1: Authentication & Onboarding
 Sign Up / Sign In: Register new account on Web (/sign-up) and Mobile. Verify redirect to /setup. Test invalid password & duplicate email edge cases.
 Session Persistence: Refresh Web browser / restart Mobile app -> verify user stays logged in via session cookie/SecureStore.
 Onboarding Quiz (/setup): Complete 4-step wizard (Household, Income, Categories, Bank Accounts) -> verify 5-step waterfall allocation initializes category balances.

### Phase 2: Core Budgeting & Waterfall
 Dashboard Metrics: Confirm monetary amounts render in JetBrains Mono font. Verify Total Income, Committed Bills Pool, Free Everyday, and Savings totals.
 Deficit Repair Edge Case: Set upcoming expense higher than available income -> verify 5-step waterfall deficit repair highlights deficit in red (#ba1a1a).
 Category Management (/dashboard/categories): Create, edit, archive, and restore categories. Test "Move Money" modal between envelopes.

### Phase 3: Payday & Transactions
 Payday Cascade (/dashboard/paychecks): Preview & execute payday -> verify funds distribute across Bills, Everyday, and Buffer.
 CSV Import (Web): Upload sample bank CSV -> map columns -> verify transactions populate and envelope balances update.
 Reconciliation: Open Bank Account Reconciliation modal -> enter actual balance -> verify variance adjustment transaction created.

### Phase 4: Multi-Tenancy & Billing
 Partner Invites: Send invite from /dashboard/settings -> accept link /invite/[token] in incognito window -> verify second user sees shared tenant.
 Tenant Isolation (RLS): Attempt cross-tenant query -> verify PostgreSQL RLS blocks unauthorized access.
 Stripe Upgrade (/subscription/upgrade): Upgrade to Household plan using test card -> verify status updates to ACTIVE and /subscription/manage opens Customer Portal.

### Phase 5: Mobile Offline & Native UX
 Offline Mode: Enable Airplane mode -> view categories & transactions via local SQLite cache. Re-enable network -> verify sync.
 Quick Expense Modal: Add transaction via native numeric keypad -> verify smooth modal dismissal and list update.


## Due date vs Pay date - past vs future, recurring vs. target

# ME - Non-App To Do...

Register ABN as sole trader at business.gov.au (free, 10 min)
 Open dedicated business bank account (separate from personal)
 Create Stripe account at stripe.com, verify with ABN + bank account
 Create Products & Prices in Stripe Dashboard:
Money Matters Household — $9.99 AUD / month (recurring) → STRIPE_PRICE_MONTHLY
Money Matters Household — $89.00 AUD / year (recurring) → STRIPE_PRICE_ANNUAL
Founding Member — $69.00 AUD / year (recurring, limited coupon or separate price) → STRIPE_PRICE_FOUNDING_ANNUAL
 Configure Stripe Smart Retries (Settings → Revenue Recovery)
 Configure Stripe Customer Portal (Settings → Billing → Customer Portal → enable cancel, update payment)
 Register Stripe webhook endpoint: https://api.moneymatters.kaesava.au/webhooks/stripe
Select events: checkout.session.completed, invoice.payment_succeeded, invoice.payment_failed, customer.subscription.deleted, customer.subscription.updated
 Copy webhook signing secret → STRIPE_WEBHOOK_SECRET
 Add all Stripe env vars to Cloudflare Workers secrets (wrangler secret put)
 Add all Stripe env vars to GitHub Actions secrets (for CI)
 Create PostHog account at posthog.com (free tier is ample)
 Add NEXT_PUBLIC_POSTHOG_KEY to env

