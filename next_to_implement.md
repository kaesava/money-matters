# AGENT - In progress...

### Setup
## "Settings"

### Profile
* I changed and saved Your Display Name - but it didn't seem to save it (reverted though it said it saved). Change the label to "Name". The field must be mandatory.
* I changed left the Display Name blank and tried to save. It failed with weird error - show error message instead.
* No validation on Mobile number - Validate Australian numbers only. Is there a standard function to validate numbers from any country? If so, based on country picked, include. Why are the mobile number prefix country drop-down options limited. Ensure standard best practice to include all countries.  Standardise this. For both, move to reusable UI/rules (component?). Use best practice.
* If the User picks Australia, limit options for State and ensure Postcode format is correct. If they pick any other country, no need for validation, unless there is a standard function to validate state and postcode, If so, based on country picked, include. Standardise this. Move to resuable UI/rules (component?). Use best practice.
* Default the Notification Email (Optional) to the Login Email when User record is created, but allow override after. And make it mandatory.
* Be consistent with the Save button. Align with the look and feel in the Profile tab (colour and placement).
* Instead of "Add your Partner", say "Add another Household member". This applies across the app. Ensure the language is household member, not partner as the app will also be used by housemates.
* Critically review the Profile tab and ensure the data flows, UI is optimal, fields captured are correct, etc.
* Allow the user to upload an avatar. Use best practice in terms of file size, file formats allowed, etc. We want to be functional but reasonable size.
* If db changes are made, ensure seed is updated and db changes and seed are pushed to dev and prod database servers.

### Household
* If I provide a blank Household name, it failed with weird error. Show error message instead.
* Show Country as drop-down - start with Australia & New Zealand and then allow user to pick any coutrny. Standardise this. Move to reusable UI. Use best practice.
* Show the list of household members  in a section next to the Add your Partner (now Add a Household Member) section. This list should show who the Ower is, and their email address and name.
* The owner must be able to remove the household member. This would reuse the "Leave Household" functionality already built, but for the household member selected. The same confirmation challenge needs to apply. Non-owners will not see the functionality to remove household members. Users cannot remove themselves or shutdown the tenant from here - they will need to use the Account & Data screen.


## "Pools"
* I setup a Category as the Sweep target. However, when I save, firstly, it should refresh the table and not the whole page. Secondly, when I open the same category again, it looks unchecked. I checked the DB and the field is set to TRUE (so it's been set in DB)
* When I scrub, is it really actually updating any of the Pool balances? Check that this functionality works. Has this been built correctly?
* "This will remove the sweep target from your existing designated category. Continue?" - change to something more user-friendly and include the current category. In fact, even next to the checkbox itself, show the currently assigned category.
* Show the two Timeline & 12-Month view options on the left (instead of right) between the tab header and the explanation; being on the top right it gets missed. Change "Forward-looking payday planning matrix. Cell edits auto-sweep into the designated Surplus Target category." to something more functional and userfriendly and move to (i) icon.
http://localhost:3000/subscription/upgrade



_________


# Rules
* Strict adherence to AGENTS.md including no hardcoding of user facing literals, keeping FUNCTIONAL & Technical Specs md current, vertical slice architecture, test cases coverage, Remove redundant code, etc.
* Ignore mobile app for now
* NO hardcoding user facing literals
* NO dead code or table fields or API code or repeated UI/capability code. MECE principle.

# General
## Landing
* Ensure features list is still accurate

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
### Profile
### Household
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



