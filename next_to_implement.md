

# AGENT - In progress...


Do a deep code review and make recommendations (and a detailed implementation plan) that addresses the revamp of the Settings > Account & Data screen in the web app. No coding - discussion only. [/grill-me](slashCommand;grill-me) instead of making assumptions.

# Settings > Account & Data

This screen is incredibly buggy, under-developed and flawed and needs a full re-think and re-architecture. I don't like the layout, wording, titles, etc.

Here are just some issues with it. However, I want you to re-think this completely.

* The "🔒 Your Money Data is Locked Down Tight" seems misplaced. Perhaps it should be in the Legal & Compliance Documents section?

* The "Household Shared Space & Data Control" and "Manage Governance" phrases mean nothing! You don't need a whole new other page. You need to bring it into here, but make it far more succint and use Aussie terminology.

* Legal & Compliance Documents section - most modern websites have a separate section accessible from the footer that covers this. Align with modern standards. Re-think this entirely. Use the right language.

* Promote "📦 Archived Categories & Bills" (rename to "Archived Data") into its own tab between Household and "Account & Data".

* Report a Bug - while we are in Beta, I want  this to be more prominent. Do you suggest we put it on the navigation bar and call it "Provide feedback", calling out that the app is in Beta?

* When I click Download Zipped CSV Backup --> "No Export Data Returned". Also, remove the JSON option and all related functionality. Also ensure that all data stored for the user including profile is exported. Check that every table with the user/tenant id is exported. Use user-friendly names for filenames (like History instead of Transaction Ledger).


# Rules

* Strict adherence to AGENTS.md including no hardcoding of user facing literals, keeping FUNCTIONAL & Technical Specs md current, vertical slice architecture, test cases coverage, Remove redundant code, etc.

* Ignore mobile app for now

* NO hardcoding user facing literals

* NO dead code or table fields or API code or repeated UI/capability code. MECE principle.












# Random
* Show the two Timeline & 12-Month view options on the left (instead of right) between the tab header and the explanation; being on the top right it gets missed. Change "Forward-looking payday planning matrix. Cell edits auto-sweep into the designated Surplus Target category." to something more functional and userfriendly and move to (i) icon.
http://localhost:3000/subscription/upgrade
* Ensure features list is still accurate
* No way of going back to the signed-in part of the app if I got here through the Settings page
* "This will remove the sweep target from your existing designated category. Continue?" - change to something more user-friendly and include the current category. In fact, even next to the checkbox itself, show the currently assigned category.



# Rules
* Strict adherence to AGENTS.md including no hardcoding of user facing literals, keeping FUNCTIONAL & Technical Specs md current, vertical slice architecture, test cases coverage, Remove redundant code, etc.
* Ignore mobile app for now
* NO hardcoding user facing literals
* NO dead code or table fields or API code or repeated UI/capability code. MECE principle.

# General

## Home
* Remove Re-run of setup button - I thought we took that off R1 scope.

### New/Edit of Everday/Bills

## "Pools"

## "History"###
### Transactions
### Allocation History

## Bank Accounts
### Adding/Editing Modal:

## Pools
* I setup a Category as the Sweep target. However, when I save, firstly, it should refresh the whole page instead of just the table. Secondly, when I open the same category again, it looks unchecked. I checked the DB and the field is set to TRUE (so it's been set in DB)
* When I scrub, is it really actually updating any of the Pool balances? Check that this functionality works.

## "Income & Bills"
### Timeline & Grid
* Grid view: I thought we allowed the user to edit the Income for that day (remembering that it could come from more than one source)? I suggest a hyperlink on the amount that pops up a modal that shows the different incomes that make up that number. Perhaps there we allow the user to mark specific ones to Skip too? Discuss 


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



