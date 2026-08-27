
# AGENT - In progress...

## Setup

# Rules
* Strict adherence to AGENTS.md including no hardcoding of user facing literals, keeping FUNCTIONAL & Technical Specs md current, vertical slice architecture, test cases coverage, Remove redundant code, etc.
* Ignore mobile app for now

## General
* Screen names not reflective of titles (like /transactions instead of history and /categories instead of pools, etc. Refactor to make all the links and filenames consistent with user presentation. Be thorough across the app. Ensure you don't leave any redundant or dead code or files.

## Home
### New/Edit of Everday/Bills

## "Pools"
* PENDING - Upcoming Coverage

## "History"###
### Transactions
### Allocation History

## Bank Accounts
### Adding/Editing Modal:

## "Income & Bills"
### Upcoming
### Bulk
### Setup

## "Settings"
* Do we need a Household set of fields to update (like Household name)? Should we capture anything else like postcode that can help us as developers (balance between usefulness and not creating friction)
* Default the Notification Email (Optional) to the Login Email
* Download Zipped CSV Backup --> "No Export Data Returned". Also, remove the JSON option and all related functionality (no dead code anywhere in the app)
* Household Governance & Erasure & "Manage Governance" - please use Aussie approachable terminology - not just here but across the app
### Profile
### Subscription
### Account
### http://localhost:3000/subscription/upgrade
### Report a bug
### Delete account page - http://localhost:3000/privacy/delete-account
* Ensure features list is still accurate
* No way of going back to the signed-in part of the app if I got here through the Settings page
* 

## "Main Dashboard"


## Workflows

### Import CSV
IN PROGRESS
### Manually adjusting Bills or Everyday.
### Can I afford
### Sign-up - Google, Apple, Email/password
### Verify Password
### Sign In - different method to sign-up (Google after Email, Apple after Email, Email after Google, Email after Apple, etc.)
### Payday cascade
### User Account / Tenant Deletion
### Archive/Unarchive - feature by feature - Account, Category, Transaction(?), Income/Expense schedule, Income/Expense Item, Quick Add Expense/Income/Transfer, etc.
### Setup Flows
Does not include bank accounts - ok?
### Burst Event Regeneration
### Tenant Switching
### Account Reconciliation
### Notification Settings
### Subscription Upgrade, Pay, cancel
### Household Parnter Invitation & Acceptance
### Bank Account & Statement Import
### Stripe Payment Readiness
### Apple Sign in Readiness
### Private Bank Accounts, Private Categories
### Icon setting

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



