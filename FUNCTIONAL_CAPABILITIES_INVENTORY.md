# Money Matters — Complete Functional Capabilities Inventory (Web & Mobile Parity)

> **Specification Standard**: 100% feature coverage across all screens, modals, drawers, popups, alert dialogs, form fields, validations, and UX interactions.
> **Platform Legend**:
> - `[W]`: Web Application (`apps/web`)
> - `[M]`: Native Mobile Application (`apps/mobile`)
> - `[W/M Parity]`: Identical shared capability / centralized tokenized primitive
> - `[W vs M Diff]`: Platform-specific UX, gesture, navigation, or storage difference

---

## 1. General & Cross-Cutting Infrastructure

### Connection Interrupted & Offline Resilience
* **Validity & Trigger**: Detects network disconnection or API gateway timeout.
* **UX & Retry Flow**:
  * `[W]`: Displays a sticky amber notification banner at the top of the viewport: *"Connection interrupted. Changes will resume when back online."* Provides a *"Retry Connection"* button triggering query cache invalidation.
  * `[M]`: Integrated NetInfo listener dispatches non-blocking in-app toasts; pull-to-refresh (`RefreshControl`) on dashboard and list views forces query re-fetch; tRPC client interceptor automatically reloads refreshed JWT credentials from `SecureStore` upon 401 token expiry.
* `[W vs M Diff]`: Web uses persistent top notification bar; Mobile utilizes native pull-to-refresh gestures and transient toasts.

### Universal Table & Card Standards ("Set Once & Re-Use")
* **Search, Sort, Alignment & Pagination**:
  * `[W]`: High-density Serene Finance tables with standardized `SortHeader` (direction indicators `▲`/`▼`); unified search bar with `left-3.5` icon spacing and `pl-10` text indent; `<SkeletonTable />` loading states; 100% column header-to-cell alignment parity (Left for text/names, Center for dates/badges/actions, Right for monetary amounts `font-mono tabular-nums`); conditional `<PaginationBar />` (rendered only if total records $\ge 5$).
  * `[M]`: Touch-optimized structured cards (`BankAccountCard`, `TransactionRow`, `ExpenseBillCard`, `IncomeSourceCard`, `MatrixPaydayCard`) with `<SkeletonCard />` loading animations; conditional `<MobilePaginationBar />` ($\ge 5$ records); horizontal swipe actions where applicable.
* `[W vs M Diff]`: Web is table/column-oriented with fixed column widths; Mobile is vertical card-oriented with touch targets $\ge 44\text{px}$.

### Modal Dialogs, Drawers & Discard Guardrails
* **Behavior & LIFO Hierarchy**:
  * `[W]`: Unified `<ModalDialog />` (centered dialog) and slide-over side drawers (`<SlideOverAllocationDrawer />`, `<SlideOverCategoryDrawer />`, `<QuickExpenseDrawer />`). LIFO dismissal on `Escape` key; backdrop click dismissal when form is clean; explicit unsaved changes confirmation dialog (`<ConfirmDialog />`) when dirty (`isDirty`).
  * `[M]`: Native bottom-sheet modals (`<MobileModalDialog />`, `<CategoryItemModal />`, `<LinkedPoolsModalSheet />`, `<PoolsFilterSheet />`) with pull-down drag indicator; backdrop dismiss; `showMobileConfirm(...)` discard confirmation when `isDirty`.
* `[W vs M Diff]`: Web slides from right or centers on screen with keyboard `Escape` handling; Mobile slides up from bottom with hardware Android back-button interception.

### Defensive Form Validation & Centralized Inputs
* `[W/M Parity]`: All validation is 100% Zod `.strict()` schema-driven. Mandatory labels use `<FormLabel required={true}>` (subtle red asterisk). Inline field errors render below the input via `<FormFieldError />`. Top-level submission/API errors render in `<FormErrorBanner />`. Primary submit buttons (`Button` / `MobileButton`) are strictly disabled unless the form is dirty and valid (`!isDirty || !isValid`), showing a built-in spinner during mutation.
* **Monetary Inputs**: `<AmountField />` (web) and `<AmountInput />` (mobile) enforce `$` prefix, monospace font (`JetBrains Mono`), non-negative values, max 12 digits, and max 2 decimal places. Browser native number steppers are suppressed in favor of custom steppers.
* **Date Pickers**: Supported boundaries (`min` / `max` dates) prevent invalid past dates on future transfers or future dates on historical payments.

### Information Tooltip Icons (`InfoTooltip`)
* `[W/M Parity]`: Contextual `(i)` trigger providing plain-English, friendly financial explanations (zero technical or banking jargon).
* **Global Visibility Toggle**: Centrally controlled via "Show information icons" toggle in Settings > My Details across both Web and Mobile. When disabled, all `(i)` icons are hidden across all headers, cards, tables, and modals.

### Timezone & Currency Formatting Parity
* `[W/M Parity]`: Dates stored in UTC; rendered in user presentation timezone (AEST/en-AU default) via `fmtDate` / `fmtDateMedium`. Raw ISO strings (`YYYY-MM-DD`) are strictly banned in UI components.
* **Zero-Decimal Currencies**: For zero-decimal currencies (e.g., `JPY`), monetary values disallow decimal input and render without cents.

---

## 2. Public Pre-Login & Legal

### Landing Page (`/`, Unauthenticated)
* `[W]`: Interactive split hero comparing Traditional Budgeting (47 receipts logged, surprise bill shock) vs Money Matters (payday ring-fencing, guilt-free everyday spending), 4-pillar Bento showcase, Problem/Solution narrative, 28-day interactive Payday Timeline Simulator (`<PaycheckSimulator />`) with pool transfers modal, dynamic pricing CTA adapted to visitor trial status, and embedded `<AuthModal />`.
* `[M]`: Mobile sign-in landing screen (`/(auth)/sign-in`) with brand identity, key value props, and direct auth routing.
* `[W vs M Diff]`: Web features full marketing website with rich interactive simulator; Mobile is a direct native authentication portal.

### Terms of Service (`/terms`)
* `[W]`: Full Australian legal framework under NSW jurisdiction, Corporations Act 2001 general advice warnings (ASIC/AFSL exemption), Australian Consumer Law statutory guarantees, and SaaS subscription terms.
* `[M]`: Accessible via in-app browser from Profile Settings.

### Privacy Policy (`/privacy`)
* `[W]`: Complete APPs 12 & 13 privacy documentation, Consumer Data Right (CDR) privacy compliance, Postgres RLS stealth privacy architecture, and data retention/erasure rights.
* `[M]`: Accessible via dedicated in-app Privacy Governance section with direct 1-tap data export and erasure triggers.

### Custom 404 Page (`/invalid-route`)
* `[W]`: Branded Aussie 404 screen with "Back to Dashboard" / "Back to Home" navigation buttons.
* `[M]`: Expo Router fallback screen redirecting to `/(app)/home`.

---

## 3. Authentication & Account Access

### Sign-Up (`/sign-up`, `/(auth)/sign-up`)
* `[W/M Parity]`: Full Name, Email, Password, Google OAuth, Apple Sign-In. Password complexity enforced (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character). Real-time visual `<PasswordStrengthIndicator />` / `<MobilePasswordStrength />`.
* **Provider Conflict Handling**: Attempting to sign up with an existing email via a different provider displays an informative notice to log in using the original method.

### Sign-In (`/sign-in`, `/(auth)/sign-in`)
* `[W/M Parity]`: Email/Password, Google OAuth, Apple Sign-In. Validates credentials; automatically redirects to active household dashboard, or to `/setup` if household onboarding is incomplete (`setupStatus !== 'COMPLETED'`).

### Forgot Password OTP Flow (`/forgot-password`, `/(auth)/forgot-password`)
* `[W/M Parity]`: 2-stage self-service password recovery:
  * *Stage 1*: User submits email $\rightarrow$ API issues 6-digit OTP via Resend.
  * *Stage 2*: User enters 6-digit OTP (`<OtpVerificationView />` / `<MobileOtpInput />`), New Password, and Confirm Password $\rightarrow$ verifies token, updates credentials, and establishes session.

### Partner Invitation Acceptance (`/invite/[token]`, `/(auth)/invite/[token]`)
* `[W/M Parity]`: Validates token against 48-hour expiration window; verifies user email identity matches invite email; joins household tenant (`tenant_users` with role `MEMBER`); redirects directly to household dashboard. Expired or mismatched tokens display actionable error guidance.

---

## 4. Household Setup & Budget Re-calibration Wizard

### Initial Onboarding Wizard (`/setup`, `/(setup)/*`)
* **Step 1: Income Setup**: Dynamic list of income sources (Primary Salary, Freelance, Side Hustle) with Name, Amount ($), Frequency (Weekly, Fortnightly, Monthly), and First Pay Date.
* **Step 2: Australian Household Banking Architecture**: Archetype selection (Aussie 2-Account Blueprint, Yours Mine & Ours, All-in-One Account) + 60-Second Australian Bank Cheat Sheet modal (CBA, Up, Macquarie, ING).
* **Step 3: Goals & Commitments**: Targeted savings goals (Emergency Fund, Car, Holiday) with target amount and target date.
* **Step 4: Lifestyle Category Budgeting**: ABS 2025/2026 benchmark estimations for housing, transport, food, family, and utilities.
* **Step 5: Review & Confirm**: Total Monthly Income vs Total Monthly Budgeted comparison; custom category adjustments; single-click commit creating pools, categories, schedules, and setting `setupStatus = 'COMPLETED'`.
* `[W vs M Diff]`: Web executes as a multi-step progressive form on `/setup`; Mobile executes as a dedicated Expo stack flow (`/(setup)/income`, `/(setup)/accounts`, `/(setup)/categories`, `/(setup)/complete`).

### Budget Re-calibration Flow (`/setup?mode=rerun`)
* `[W/M Parity]`: 3-step streamlined flow skipping lifestyle quiz: Step 1 Incomes $\rightarrow$ Step 2 Bank Accounts $\rightarrow$ Step 3 Categories & Targets.
* **Atomic Balance Sweep on Pool Deletion**: If a user deletes an active pool holding positive funds ($> \$0.00$), system prompts destination pool selection (defaulting to Surplus Target), recording balanced `TRANSFER_OUT`/`TRANSFER_IN` ledger entries before soft-archival.
* **Budget Impact Review Panel**: Diff preview showing +/- changes to monthly caps and effective start date before committing.

---

## 5. Shell, Layout & Global Navigation

### Web Desktop & Tablet Shell
* Left fixed sidebar (`SideNavBar`) with brand logo, primary navigation links (`Dashboard`, `Income & Expenses`, `Pools & Categories`, `History`, `Settings`), active trial countdown badge, tenant switcher dropdown, and user profile footer with sign-out.
* Sticky frosted-glass top navigation bar (`TopNavBar`) with responsive mobile hamburger drawer trigger.

### Mobile Shell (`/(app)/_layout.tsx`)
* Fixed bottom navigation bar (`BottomNavBar`) with 4 primary destinations: Home (`/(app)/home`), Schedules (`/(app)/paychecks`), Upcoming (`/(app)/upcoming`), and Pools (`/(app)/categories`).
* Top app bar (`ScreenHeader`) featuring Household title, active trial badge, and User Avatar button opening `ScreenMenuModal`.
* Header Avatar Menu (`ScreenMenuModal`): User Identity Card, Change Household (tenant switcher modal), Bank Accounts link, History link, Settings link, and Sign Out confirmation.

### Tenant Switching (Multi-Household)
* `[W]`: Dropdown select at the base of the sidebar (`TenantSwitcher.tsx`).
* `[M]`: Dedicated modal sheet (`MobileTenantSwitcherModal`) triggered from avatar menu, persisting active selection to `SecureStore`.

---

## 6. Dashboard / Home Financial Cockpit

### Hero Financial Overview Card
* Displays Household Greeting, AEST formatted localized date, Total Net Worth / Available Balance.
* **Pacing Meter**: Everyday Spending card with daily spendable pace (`$XX / day`), days-until-payday countdown, and pacing status (`On Track ✓`, `Pace Tightened`, `Bills at Risk`).
* **Regular Bills Card**: Shortfall alerts (`⚠️ Shortfall of $X` vs `✅ Next 14 days covered!`) and next bill due date.

### Goals Progress Strip (`GoalsProgressStrip`)
* Horizontal progress strip displaying top 2 goals needing attention with percentage funded, target amount, target date, and vertical time-elapsed pacing needle (Green = on track, Amber = within 20% behind, Red = lagging).

### Attention Queue & Action Items (`AttentionItemsList`)
* Two-tier urgency alerts: Red for overdue items; Amber for bills due within 3 days. Contextual 1-click action triggers: "Mark Paid" (opens Mark Spent modal) and "Delete".

### Next Payday Preview Card (`NextPaydayCard`, `MobileNextPaydayCard`)
* Upcoming paycheck deposit date, expected amount, days countdown, and "Split Income" / "Review Split" CTA button.

### Bank Balances Strip (`BankBalancesStrip`)
* Linked accounts horizontal strip with branded institution badges (`BankProviderBadge`), current balances, and 1-click reconciliation triggers.

### Missing Schedules Advisory Banner (`MissingSchedulesBanner`)
* Warns when active categories have \$0 targets with direct setup link.

---

## 7. Common & Quick Actions (Expense, Income, Transfer)

### Trigger Mechanism
* `[W]`: Consolidated top-header "+ Quick Action" button with dropdown menu (`Record Expense`, `Record Income`, `Transfer between Pools`).
* `[M]`: Floating Action Button (FAB) at bottom-right of screen opening `QuickExpenseModal` with tactile haptic feedback.

### Quick Form Fields & Capabilities
* Flow Type toggle (Debit / Credit), Amount (`<AmountField>` / `<AmountInput>`), Date picker (defaults to today), Pool & Category picker, optional Note.
* **Quick-Pick Suggestion Badges (`QuickPickBadges`)**: 1-tap chips for frequent Everyday purchases (`☕ Coffee $5.50`, `🥗 Lunch $18.00`, `🛒 Groceries $80.00`, `⛽ Fuel $70.00`), auto-filling amount and category.
* **Recent & Frequent Presets**: Automatically aggregates up to 2 most recent presets and 2 most frequent presets from the past 180 days.
* **Defensive Guardrails**: Inline liquidity warning if debit exceeds pool balance; negative amount blocking; submit button disabled until valid.

---

## 8. "Can I Afford It?" Simulation Studio (`/dashboard/afford-check`, `/(app)/afford-check`)

### Core Modes
* **One-Off Purchase Mode**: Evaluates immediate purchase amount against available Everyday spending and upcoming bills before payday.
* **Recurring Commitment Mode**: Evaluates 12-month budget impact; protects bills 100% and guarantees Everyday spending remains $\ge 80\%$ of monthly allowance.

### 6-Verdict Classification
* `SAFE_YES` (Green): Sufficient liquidity and Everyday balance $\ge$ recommended safe cushion.
* `PACING_TIGHT` (Amber): Affordable, but Everyday balance drops below safe cushion ($X remaining until payday).
* `BILLS_RISK` (Orange): Unfunded bills due before payday consume the buffer; itemizes upcoming bills.
* `WAIT_FOR_PAYCYCLE` (Blue): Shortfall today, but projected income by paycycle $N$ accumulates sufficient funds; offers flexible savings alternative.
* `GOAL_DELAYED` (Orange): Recurring commitment pushes back target dates of savings goals across 12-month forecast.
* `HARD_NO` (Red): Recurring commitment starves essential Everyday spending below 80% allowance.

### Prorated Safe Cushion & Stateless Execution
* Formatted purely as total dollars remaining until payday (`$X safe cushion`), eliminating technical velocity jargon.
* Pure stateless execution: Performs zero database writes.

---

## 9. Pools & Categories Hub (`/dashboard/pools`, `/(app)/categories`, `/(app)/pools/[id]`)

### Projection Timeline Scrubber
* Draggable timeline slider (Today $\rightarrow$ +12 Months) scrubbing forward in time to inspect projected pool and category balances with real-time math simulation.

### Pools Table & List View
* `[W]`: Full-width structured table with expandable/collapsible pool rows, SortHeader, search bar, filters (All / Everyday / Bills / Goals & All / Shared / Private), pagination, and Category itemization.
* `[M]`: Filterable pool card list with `PoolsFilterSheet`, category progress badges, and dedicated Pool Detail screen (`/(app)/pools/[id]`).

### Add & Edit Pool Modal (`<PoolFormModal>`)
* **Fields**: Pool Name, Pool Type (`EVERYDAY`, `REGULAR`, `GOAL`), Linked Bank Account, Target Amount (for Goal pools), Target Date (for Goal pools), Surplus Target toggle (`isSurplusTarget`).
* **Immutable Linking Protection**: Bank Account link and Pool Type are strictly locked after creation to preserve ledger auditability.

### Archive & Restore Pool
* Cascades soft-archival to child categories. Blocked if active positive balance exists (prompts balance sweep) or if last remaining Everyday pool.
* Restoration available in Settings > Archived Data.

### Add & Edit Category Modal (`<CategoryFormModal>`)
* **Fields**: Category Name, Parent Pool, Target Amount ($), Frequency (Weekly, Fortnightly, Monthly, Annually), Monthly Equivalent preview ($/mo), Essential Bill toggle (`isEssential`), Lucide icon picker.
* **Immutable Pool Linking**: Parent Pool locked after creation.

### Priority & Stealth Privacy
* Categories marked `isEssential: true` receive priority funding in Step 1 of the waterfall allocation engine.
* Pools linked to private bank accounts inherit `isPrivate: true`, masked in partner views via RLS session variables.

---

## 10. Bank Accounts Management & 1-Click Alignment (`/dashboard/bank-accounts`, `/(app)/settings/bank-accounts`)

### Bank Accounts Table & Card Deck
* Account Name, Branded Provider Badge, Account Type, Last 4 Digits, Current Balance, Unbudgeted Buffer, Expected Pool Balance, and Linked Pools count.

### Add & Edit Bank Account Modal (`<BankAccountFormModal>`)
* **Fields**: Bank Provider select, Account Name, Account Type (`CHECKING`, `SAVINGS`, `OFFSET`, `CREDIT_CARD`), Last 4 Digits, Current Balance ($), Unbudgeted Buffer / Reserved Funds ($), Stealth Private toggle (`isPrivate`).
* **Unbudgeted Buffer Constraint**: Unbudgeted Buffer cannot exceed Current Balance; inline validation blocks invalid entries.
* **Stealth Private Flag**: Locks ownership to creator; masked from household partner in RLS queries.

### 1-Click Bank Balance Alignment (`<ReconciliationModal>`, `<MobileReconciliationModal>`)
* Compares Actual Bank Balance vs Expected Balance (Sum of linked pools + Unbudgeted Buffer).
* **Surplus Alignment**: Allocates positive variance to designated Surplus Target pool or user-selected pool.
* **Shortfall Alignment**: Prompts funding source selection from non-zero pools up to available balance; records deterministic `ACCOUNT_ALIGNMENT` ledger transactions.

### Cross-Bank Transfer Warning Modal (`<CrossBankTransferModal>`)
* Triggered whenever an internal transfer spans pools in distinct physical bank accounts; displays source/destination bank accounts and 1-tap "Copy Amount" button for banking apps.

---

## 11. Income & Expenses Command Center (`/dashboard/income-and-bills`, `/(app)/paychecks`)

### Tab 1: 12-Month Matrix Plan (`MatrixPlanTab`, `MobileMatrixPlanTab`)
* `[W]`: 12-month forward-looking spreadsheet grid with paydays as columns and pools/bills as rows, intermediate expense deductions, assumed pro-rata Everyday burn rate, and 1.5x anti-runaway cap. Clicking any payday column header opens the Income Split action drawer.
* `[M]`: Horizontally scrollable pay-cycle timeline carousel card deck where each card summarizes a pay period with expandable bill lists.

### Tab 2: Upcoming Queue (`UpcomingTimelineTab`, `/(app)/upcoming`)
* Chronological queue of pending Income, Expense, and Transfer events with Overdue badges, search, and type filters.
* Actions: "Run Split" (Income events $\rightarrow$ opens Income Split studio), "Mark Paid" (Expense events $\rightarrow$ opens Mark Spent modal), "Transfer" (Transfer events $\rightarrow$ opens Transfer modal), "Delete" (inconspicuous confirm).

### Tab 3: Setup & Sources (`SetupSourcesTab`)
* Structured tables for recurring Income Schedules and Expense Schedules.
* **Add/Edit Schedule Modal (`<IncomeExpenseFormModal>`)**: Name, Amount ($), Recurrence (Weekly, Fortnightly, Monthly, Annually), Interval ("Every N"), Start Date, End Date, Receiving/Paying Bank Account, Category link.
* **Burst & Re-Burst Engine**: Generates 12 months of forward occurrences. Editing schedule automatically re-bursts unperformed future events while preserving historical paid records.

---

## 12. Dedicated Income Split Studio (`/dashboard/income-split`, `/(app)/paychecks/[id]`)

### Layout & Navigation
* `[W]`: Dedicated screen route `/dashboard/income-split?id=[incomeEventId]` integrated with standard sidebar and header shell.
* `[M]`: Focused screen `/(app)/paychecks/[id]` with back navigation.

### Header & Status Badges
* Crystal-clear plan source badges: `✨ Auto-Calculated` (5-step waterfall engine), `💾 Custom Saved Plan`, `✓ Confirmed & Executed`.
* Prominent "🔄 Re-calculate" button: refreshes dynamic allocations or prompts confirmation to discard custom overrides.

### Structured Serene Pool Table
* Collapsible category groups (`▼ Everyday Pools`, `▼ Bills Pools`, `▼ Goals`) with group subtotals.
* Direct amount inputs with quick percentage chips (`[100%]`, `[$0]`).

### Reactive Auto-Surplus & Deficit Banner
* Designated Surplus pool automatically absorbs residual funds in real time.
* Active deficit alert banner (`-$X.XX Deficit`) if allocations exceed net income, disabling Save and Confirm actions.

### Bank-Account-Aware Transfer Rollup Card
* Identifies paycheck deposit bank account; groups external transfers into **1 single transfer per destination bank account** with constituent pool breakdown and 1-click amount copy.

### Execution & Ledger Confirmation
* "Run Income Split" confirms allocations, generates immutable `CREDIT` entries in `transactionLedger`, marks income event and allocation plan as `CONFIRMED`, and presents the actionable transfer plan.

---

## 13. Mark Paid / Spent Workflow (`<MarkPaidModal>`)

* **Trigger**: Upcoming bills queue, Attention Items list on dashboard, or Pool detail views.
* **Form Controls**:
  * Event Name (editable), Actual Amount Paid (`<AmountField>`), Payment Date (`<DatePickerField max={todayStr}>` in user timezone).
* **Shortfall Resolution Workflow**:
  * Compares paid amount against target pool balance. If shortfall exists, prompts: "Select Funding Pools to cover shortfall:".
  * Allows selecting non-zero pools up to their available balance, defaulting to the household Surplus Target pool.
  * Automatically records required funding `TRANSFER_OUT`/`TRANSFER_IN` transactions before confirming the expense as `CONFIRMED`.

---

## 14. Scheduled & Ad-Hoc Transfers Workflow (`<TransferModal>`, `<MobileTransferModal>`)

* **Trigger**: Upcoming timeline, dashboard Quick Action FAB/menu, or pool cards.
* **Form Controls**:
  * Transfer Name, Amount (`<AmountField>`), Date (`<DatePickerField min={todayStr}>`), Source Pool select, Destination Pool select.
* **Validation & Actions**:
  * Source pool liquidity check (prevents overdrafting source pool).
  * Date branching: Future dates display "Save" (updates scheduled event); Today displays "Confirm" (executes transfer immediately via `moveMoneyCommand`).
  * Discard protection on dirty state (`isDirty`).

---

## 15. History & Audit Ledger (`/dashboard/history`, `/(app)/transactions`)

### Tab 1: Transactions Ledger
* Paired transfer detection (`Source ➔ Dest`), search, multi-filter dropdowns (All / Spent / Received / Transfer, Pool filter), sortable headers, pagination, and CSV export.
* `[W vs M Diff]`: Web triggers immediate browser `.csv` file download; Mobile invokes native OS share sheet via `expo-sharing` (`Share.share`).

### Tab 2: Payday Allocations History
* Historical allocation runs with Income Source, Bank Account, Payday Date, Split Execution Date, and Total Amount.
* Clicking any run opens `<SlideOverAllocationDrawer>` (web) or `<MobilePaydayAllocationDetailModal>` (mobile) displaying read-only pool breakdowns and ledger notes.

---

## 16. Settings — My Details (Profile & Preferences)

* **Read-Only Default Mode**: Renders in clean read-only mode by default to prevent accidental edits; explicit "Edit" button enters edit mode with "Save" and "Cancel" (with dirty discard confirm).
* **Fields & Validation**:
  * Display Name (mandatory), Notification Email (valid email regex), Phone Country Code (`CountrySelect`), Phone Number (`PhoneInput` with Australian mobile `04` validation), Presentation Timezone (AEST/en-AU), Locale & Date Format, UI Theme (`Light` / `Dark` / `System`), and "Show information icons" toggle.
* **Avatar Photo Upload**:
  * `[W]`: File upload with interactive 256x256 WebP pan/zoom modal (`<AvatarCropModal>`).
  * `[M]`: Native image picker with built-in crop square.

---

## 17. Settings — Household Management & Governance

* **Household Details**:
  * Household Name, Country, Base Currency (`AUD`, `USD`, `EUR`, `GBP`, `CAD`, `JPY`, `NZD`, `SGD`), Household Accounting Timezone. Currency change triggers warning dialog regarding historical non-conversion.
* **Member Collaboration & Invites**:
  * Active member list with avatar, role (`OWNER`, `MEMBER`), and pending status badges.
  * Partner Invite: Owner enters email; dispatches 48-hour invite token via Inngest and Resend.
  * Member Removal: Owner can remove member with confirmation challenge, soft-archiving their private accounts/pools.
* **Household Danger Zone & Account Erasure**:
  * *Leave Household*: Non-owners can leave; transfers ownership to next member or deletes private data with confirmation challenge.
  * *Delete Household & All Data*: Sole owner deletes entire tenant with exact household name confirmation typing requirement.

---

## 18. Settings — Archived Data & Cascading Restoration

* **Archived Items Table & Cards**:
  * Filters by Item Type (All, Pools, Categories, Bank Accounts, Income Schedules, Expense Schedules).
  * Search input, archived timestamp, and "Restore" action button.
* **Cascading Archival & Restoration Safeguards**:
  * Archiving a Bank Account cascades to its Pools and Categories.
  * Restoring a Category requires its parent Pool to be active. Restoring a Pool requires its linked Bank Account to be active. Date-sensitive integrity checks prevent orphaned child records.

---

## 19. Settings — Data & Subscription Lifecycle (Stripe & Trial)

* **60-Day Trial Status**:
  * Prominent trial countdown badge (`X days remaining on trial`).
  * Anti-abuse guard: Users can own at most 1 active trial household (`hasUsedTrial` flag).
* **Hard Paywall Lockdown (`TRIAL_EXPIRED`)**:
  * On Day 61, tenant transitions to `TRIAL_EXPIRED`, redirecting dashboard routes to `/subscription/expired`.
  * Mutation blocking on API worker (`requiresWriteAccess`).
  * Isolated holding screen offers Upgrade CTA, 1-click Zipped CSV Backup download (`exportMyData`), and Sign Out.
* **Stripe Checkout & Billing Portal**:
  * Checkout session creation ($9.95 AUD/mo or $89 AUD/yr) supporting Cards, Apple Pay, Google Pay.
  * Synchronous verification on return (`/subscription/success?session_id=...`).
  * Stripe Customer Portal integration for cancellation with grace access through paid period.
* **Invoice History**: Paid and failed invoices table with direct links to Stripe-hosted invoice PDFs.
* **1-Click Zipped CSV Backup**:
  * Bundles 12 complete database tables into `money-matters-backup-YYYY-MM-DD.zip`.
  * `[W vs M Diff]`: Web triggers direct browser `.zip` download via in-memory `JSZip`; Mobile writes `.zip` to `FileSystem.cacheDirectory` and invokes the native OS share sheet via `expo-sharing`.

---

## 20. Native Android Mobile Capabilities

* **Biometric App Lock (`BiometricLockOverlay`)**:
  * Optional Face ID / Touch ID / Fingerprint / Device PIN lock enabled in Profile Settings (`mm_biometric_lock_enabled`).
  * Engages secure authentication overlay when backgrounded for $\ge 2$ minutes.
* **Tactile Haptic Feedback**:
  * `expo-haptics` vibrations on FAB press, expense/income submission, split execution, pull-to-refresh, and destructive action confirmations (user toggleable in Settings).
* **Push Notifications & In-App Toast Feedback**:
  * Expo push notification registration with background cron dispatch; foreground push listener rendering non-blocking in-app toasts.
* **Offline Resilience & Local Cache**:
  * SQLite local caching for offline viewing; resilient 401 token refresh in tRPC client.
