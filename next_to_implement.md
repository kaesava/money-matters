
# Rules
* Strict adherence to AGENTS.md including no hardcoding of user facing literals, keeping FUNCTIONAL & Technical Specs md current, NO hardcoding user facing literals, vertical slice architecture, O dead/redundant tables/table fields/API code/UI code/capability code/other package code/etc, ensure UI elements, look-and-feel, colour, UI styling, etc is defined once and re-used, MECE principle for re-use of logic/screens/modals/etc., test cases coverage, etc.
* As you build code, you decide whether you want to run pnpm typecheck/lint/test/test coverage/i8ln-check/install/ for the modules you want. However, at the end, ensure pnpm validate runs successfully. Because pnpm validate is made up of multiple commands, just run the commands that failed sequentially until all of them pass, then try pnpm validate again. If it fails, repeat by running just the failed commands and then by running pnpm validate again. Once successful, commit code, but ask me before pushing the code.
* Ignore mobile app
* [/grill-me](slashCommand;grill-me) instead of making assumptions.
* Make multiple passes if needed - as there may be cross-dependencies you'll miss if you don't
* Be critical, think deep - review code if you're not sure.
* OUTPUT: Create a detailed implementation plan detailed enough for an agent like Gemini 3.6 Medium to unambiguously interprent and execute.
* If section below is blank, it means I don't have any updates for you to make - leave it alone.


# AGENT - In progress...
    
_________

# Questions for CLAUDE

## Consistency Audit
**Role & Scope:** Act as the Principal Software Architect and UI/UX Expert for the V1 Money Matters web platform. Scope is strictly limited to `apps/web`, `apps/api`, `packages/db`, and all capability packages. Completely ignore `apps/mobile` and any features explicitly deferred in `V2_SCOPE.md`. Your primary directive is zero-redundancy code maintenance and strict vertical slice composability.

**Execution Rules:**
*   **UI & UX Consistency:** Strictly utilize existing Serene Finance design tokens and reusable primitives within `@money-matters/ui`. Do not invent new components, modals, layout flows, or error states if a MECE-compliant component already exists.
*   **Localization & Terminology:** 100% of user-facing text must be externalized via `@money-matters/i18n`. Hardcoded string literals in components are strictly forbidden.
*   **Code Optimization:** Enforce DRY principles aggressively. Before generating new functional or UI code, evaluate existing capabilities and extract logic into flexible, argument-driven shared blocks. Ensure data tables, form validations, and error handling are completely uniform across the app.
*   **Documentation:** Implement "Smart Commenting." Document the *why* for complex business logic, waterfall math, and edge cases. Trivial *what* comments (e.g., `// increments count`) are explicitly forbidden.
*   **Governance:** Strictly adhere to all architectural rules in `AGENTS.md`. After any structural or logic change, you must automatically update `README.md`, `FUNCTIONAL_SPEC.md`, and `TECHNICAL_SPEC.md` to perfectly reflect the current state of the codebase.


## Waterfall Audit
You are now going to do a full audit on the waterfall functionality to ensure it calculates splits based on what the user  would reasonably expect, given goals, bills, Priority Bills, Everyday expenses, private pools, etc. What gaps do you see betwene what gets projected and the reality the user might expect (of course, within reason)? Functionally, does it account for (and account correctly for) various circumstances and edge cases like expense events, income irregularity, prioritisation based on due dates, etc. Make recommendations. Be critical. Review through internet research user expectations. 

## 

# General
## Behaviour of tables across the web app
## Behaviour of modal screens (in particular ones with editable fields) across the web app

# Web App Functionality
## Landing Page

## UI COnsistency
### Tables - Sort, font, font size, header & item alignment, search, filters, pagination
### Literals
## Sign-Up
### Sign-up - Google, Apple, Email/password
### Verify Password

## Sign-In
### Sign In - field validation
### Email Sign in
### Google Sign in 
### Apple Sign in
### Apple/Google sign-in after Email login 

## Setup Flows
### Step 1
### Step 2
### Step 3
### Step 4

## Navigation
### Tenant Switching
### User and Sign out
### Provide Feedback


## ******* Home

### Manually adjusting Bills or Everyday.
### Account Reconciliation (Transaction flowthrough)
### Can I afford

### Quick Action (triggered from multiple places)
#### Income
#### Expense
#### Transfer


## ******* "Pools"

### Projection Timeline

### Pool Create/Edit Modal
### Category Create/Edit Modal
### Pool/Category picker


## ******* "Income & Expenses"

### Income Splits
#### Run Splits Sidebar Drawer
#### Pools hyperlink click Sidebar Drawer

### Upcoming

### Setup
#### Create/Edit modal - Expense Schedule & Income Schedule (applies to both)
#### Change Start/Frequency/End-date/Amount/Other - check re-burst
#### Delete - check event delete (archival)
#### Burst Event Regeneration (Check Transactions)



## ******* "Bank Accounts"
### Edit Modal 
#### Reconciliation
#### Linked Pools popup

#### Private Bank Accounts

### Bank Account & Statement csv Import
#### CSV Import Log
#### CSV Import Flow
##### Step 1
##### Step 2
##### Step 3


## ******* "History"

### Transactions
#### Export CSV
### Payday Allocations
#### Payday Allocation Details sidebar
#### Export CSV


## ******* "Settings"

### My Details
#### Change and Save Settings (Name, Notification Email, Mobile Phone Number (AU), Mobile Phone Number (Other)), Display Timezone, Show Icons
#### Notification Settings?
#### Weekly Digest Email?
#### Profile upload of Avatar
#### Avatar View
#### Avatar Replace (Zoom, Pan)
### Show/Hide Icon setting & Flowthrough

### Household
#### Change and Save Settings
#### Add Household Member
#### Remove Household Member
#### Invited Household Member - acceptance
#### Leave Household - Transfer Ownership
#### Delete Household and Data 
#### Delete Household and Data - Delete Household popup

### Archived Data
#### Archive/Unarchive - feature by feature - Account, Category, Transaction(?), Income/Expense schedule, Income/Expense Item, Quick Add Expense/Income/Transfer, etc. (Check Transactions)
### Data & Subscription
#### Upgrade or Change (including Cancel)
#### Payment Success
#### Payment Fail
#### Recurring Payment deduction
#### Billing Portal
### Data Sovereignty & Zipped CSV Backup







# TEST

 Configure Stripe Smart Retries (Settings → Revenue Recovery)
 Configure Stripe Customer Portal (Settings → Billing → Customer Portal → enable cancel, update payment)


## Web App
# AGENT - To Do

# ME to Do (AI to ignore)

## App Shakeout & QA Task List (Web & Mobile)

### Phase 1: Authentication & Onboarding
 Sign Up / Sign In: Register new account on Web (/sign-up) and Mobile. Verify redirect to /setup. Test invalid password & duplicate email edge cases.


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



