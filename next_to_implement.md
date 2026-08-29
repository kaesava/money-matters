# AGENT - In progress...

### Household
* When I invite a household member, it says "Invite link created! Share URL: http://localhost:3000/invite/46649913-1e1b-4c85-af7f-8dbd35216b82". It's not clear if the user will receive an email or if I need to share the link with the user. Preference is the former (an email needs to be sent from the app to the user with the invite link), don't provide the link here - let them know that an email has been sent. Also, in the Household members list, markhousehold members that are yet to accept. If accepted, don't add anything, if waiting, maybe a badge indicating that the user has not yet accepted their invite?
* I feel like Neon Auth triggers emails to users to validate their email address "Verify Your Email Address - money-matters" when the seed is triggered even though the seed (I hope) expects these users to have been marked as verified in Neon Auth tables. Check

_________


# Rules
* Strict adherence to AGENTS.md including no hardcoding of user facing literals, keeping FUNCTIONAL & Technical Specs md current, vertical slice architecture, test cases coverage, Remove redundant code, etc.
* Ignore mobile app for now
* NO hardcoding user facing literals
* NO dead code or table fields or API code or repeated UI/capability code. MECE principle.

# General
* When the API server is down or there is database is down, ensure that any error in retrieving or pushing data throught the API layer provides a graceful error message to the user. This applies across the web and mobile apps.
## Landing
* Ensure the list of features and the page is still accurate. If you can make the page more compelling for the user to join without making it corny, do so.

## Home
### New/Edit of Everday/Bills

## "Pools"

## "Income & Bills"
### List View
### Timeline & Grid
### Setup
* We should include the abilty for the user to setup their bank accounts - showing the default one created (every new tenant should have the default bank account created with all three pools linked to it - ensure the seed honours this too and the rules exists to enforce this), but allowing users to add new, delete (ensuring at least one exists because every pool must be linked to exactly one bank account), and link/unlink pools - re-use the Bank Accounts > New logic and UI (don't re-invent) as much as possible.
## Bank Accounts
### Adding/Editing Modal:

## "History"###
* Improve the language (target - Aussie family): "A complete record of your itemized spending ledger and automated payday waterfall allocations." Rightnow it's too technical - what's waterfall? what's itemized. 
### Transactions

### Allocation History

## "Settings"

### Profile
### My Details
### Household
* Change "Manage departure from the household budget or permanent erasure of your household data" to "Manage exit from the household or permanent closure of household and erasure of related data".
### Account & Data
### Subscription
### Provide Feedback


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
### User Tenant Exit
### Tenant Deletion
### Archive/Unarchive - feature by feature - Account, Category, Transaction(?), Income/Expense schedule, Income/Expense Item, Quick Add Expense/Income/Transfer, etc. (Check Transactions)
### Setup Flows
Does not include bank accounts - ok?
### Burst Event Regeneration (Check Transactions)
### Tenant Switching
### Account Reconciliation (Check Transactions)
### Notification Settings
### Subscription Upgrade, Pay, cancel
### Household Parnter Invitation & Acceptance (Check Email)
### Bank Account & Statement Import
### Stripe Payment Readiness
### Apple Sign in Readiness
### Private Bank Accounts, Private Categories
### Show/Hide Icon setting & implication
### Profile upload of Avatar






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



