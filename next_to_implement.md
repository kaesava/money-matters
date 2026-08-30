# AGENT - In progress...

_________


# Rules
* Strict adherence to AGENTS.md including no hardcoding of user facing literals, keeping FUNCTIONAL & Technical Specs md current, vertical slice architecture, test cases coverage, Remove redundant code, etc.
* Ignore mobile app for now
* NO hardcoding user facing literals
* NO dead code or table fields or API code or repeated UI/capability code. MECE principle.

# General
* Remove the Icon next to Bank Accounts title - it's the only screen with an icon. I need consistency. This principle should apply across the app.
* The search icon in the search bar is touhing the left, give it a little bit of padding on the left, and ensure it still provides padding between it and the placeholder text/text in the text box. Ensure things like this are in AGENTS.md so future builds dont diverge.
* For some tables (like the Incoming & Bills > Upcming List), the header is aligned with the values (left/right/centre) but for others like History > Transactions, it is not. Also, I notied the font sizes/fonts across them is a bit off. Ensure that all tables in the app (don't guess, do a thorough check) are formatted consistently. Actions, Dates, tags/badges should be centre-justified. Amounts should be right justified. Most text should be left justified. Ensure consistent header formatting - define once and re-use across the app. Ensure no manual overrides across the app. Thhis kind of thing should be explicit inAGENTS.md so future builds don;t diverge.
* Income & Bill Management title > move the subtitle to an (i) icon to be consisent with all other screens. This principle should apply across the app.
* Sign-In > When I login, it seems to take a little bit of time for the Loading spinner to be shown - shouldn't it be shown as soon as I hit login?
* History > Payday Allocations - Won't Payday Allocations only show Confirmed ones anway? If so, remove the Confirmed badge, if not, leave in there. Also show this as a table (re-use existing table conventions and practices including sort, search by key fields like Description, amount and bank account), headers, etc.) Show Date, Description, Bank Account, whether manual or auto? and Amount. Allow filter drop-down to show Bank Accounts.
## Landing

## Sign-Up
## Sign-In

## Navigation
### User and Sign out
### Provide Feedback

## Home
### New/Edit of Everday/Bills

## "Pools"

## "Income & Bills"
### List View
### Timeline & Grid
### Setup
## Bank Accounts
### Adding/Editing Modal:

## "History"###
### Transactions
### Allocation History

## "Settings"
### My Details
### Household
### Archived Data
### Data & Subscription
### Subscription


## "Main Dashboard"


## Workflows

### Import CSV
### Manually adjusting Bills or Everyday.
### Can I afford
### Sign-up - Google, Apple, Email/password
### Verify Password
### Sign In - different method to sign-up (Google after Email, Apple after Email, Email after Google, Email after Apple, etc.)
### Payday allocation - individual
### Payday allocation - bulk
### User Tenant Exit
### Tenant Deletion
### Archive/Unarchive - feature by feature - Account, Category, Transaction(?), Income/Expense schedule, Income/Expense Item, Quick Add Expense/Income/Transfer, etc. (Check Transactions)
### Setup Flows
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



