# MOBILE AUDIT
Do a thorough audit of the mobile app capability and web app capability with the aim of getting the mobile app up to production readiness. The Web app has advanced significantly while the mobile app has stalled. This was intention so I could focus on the web app. However, now I want to mobile app to get to par with the webb App. I want you to do a thorough deep dive into the relative capabilities and identify every single update that needs to be made in the mobile app to bring the functionality in par with the web app. When I say every capability, I literally mean every screen, modal, filter, drop-down, button, input field, workflow, hover text, hyperlink, navigation, search, sort, table, loading animation, field, error message, confirmation modal, label, title, warning message, close button, cancel button, etc. Of course, you will need to translate these into mobile app specific UX/UI to ensure native look and feel. Further, there is already a significant amount of build complete. The ask is not to rebuild from scratch, though if you do find discrpenecies, fix them

# FUNCTIONAL AUDIT

### 2. Lead Business Analyst (V1 Functional Completeness)
- Identify all the Apps Capabilities (partially listed below), and ensure there are 0 Functional Gaps (Built per spec), no edge cases, no Code bugs, no duplicated code where it can be rationalised.

### General
* Connection interrupted message - validity, retry
* Behaviour of tables across the web app (sort, search, pagination, skeleton loading, reasonable widths, etc.
* Behaviour of modal screens (in particular ones with editable fields) across the web app (defensive field checks to prevent malicious or rubbish data entry), Cancel, Escape to Cancel, Errors, Warnings, COnfirmations, Success toasts, etc.
* Landing Page (Not signed in)
* Privacy Page (Not signed in)
* Sign-Up through Google, Apple, Email/password (and what if they already have one but try another)
* Verify Password capability initiation
* Verify Password capability email trigger
* Sign-In through Email, Google, Apple (and what if they registered via anotehr method)
* Setup Flows - Steps 1-4
### Navigation
* Navigation (including User Details & Sign Out)
* Tenant Switching
* Provide Feedback feature
### Common
* Quick Action (Income)
* Quick Action (Expense)
* Quick Action (Transfer)
* Quick Action - save and pick from Last three & Most frequent 3 previous
* Pool/Category picker (functionality based on where it was called from to show/hide categories, single pick vs multi pick)
* information tooltip icons - user-friendly and targeted at user base (no technical or overly financial jargon)
### Dashboard
* Signed in Landing Page (Dashboard)
* Manually adjusting Bills or Everyday.
* Account Reconciliation (Transaction flowthrough)
* Mark Spent
* Split Income
* Can I afford
### Pools
* Pools - Projection Timeline (on mode vs off mode)
* Pool table list (including hyperlinks to History & Upcoming Expenses, expand/collapse) - Sort, Search, Filters (All/Everyday/Bills/Goals and All/Shared/Private), Pagination
* Add Pool (from button or from within Pool Type)
* Create Pool
* Edit Pool (including preventing re-linking with Bank Account or Pool Type) and Save/Cancel
* Archive Pool, Unarchive Pool
* Add Category (from button next to Pool)
* Create Category
* Edit Category (including preventing re-linking with Pool) and Save/Cancel
* Archive Category, Unarchive Category
* Behaviour of Prioritised Categories
* Behaviour of Private Pools
### Income & expenses
#### Income Split
* Pools list (including hyperlinks that open Pool side drawer, expand/collapse) - Sort, Search, Filters (All/Shared/Private & Show 5 vs. Show full)
* Save, Unsave, Delete, Review each Split - correct Behvaiour
* Pool sidebar - details (including Pool hyperlink), Category list (with hyperlinks), Upcoming Expenses (including Show All Expenses), History (including See Full History) tabs
#### Income Split sidebar
* Update of Name, Amount or Date and functional implications
* Pool list (collapse/expand, allow correct entry of split )
* Surplus pool and behaviour
* waterfall triggers
* Correct load of allocation lines if saved
* Save, Unsave, Delete, Run Income Split, Cancel

### Upcoming
* Mark Spent (including allowing change in amount or date - but not future)
* Mark Spent confirmation (including allowing transfer from non-zero pools up to their balance, defaulting to surplus target, allow updating pools)
* Mark Spent action (triggering all transfers - should end up as transactions, then confirming and marking spent and drawing down on pool)

******* Setup
Create/Edit modal - Expense Schedule & Income Schedule (applies to both)
Change Start/Frequency/End-date/Amount/Other - check re-burst
Delete - check event delete (archival)
Burst Event Regeneration (Check Transactions)

******* "Bank Accounts"
Edit Modal 
Reconciliation
Linked Pools popup

Private Bank Accounts

Bank Account & Statement csv Import
CSV Import Log
CSV Import Flow - Step 1,Step 2, Step 3


******* "History"
Transactions
Export CSV
Payday Allocations
Payday Allocation Details sidebar
Export CSV

******* "Settings"

******** My Details
Change and Save Settings (Name, Notification Email, Mobile Phone Number (AU), Mobile Phone Number (Other)), Display Timezone, Show Icons
Notification Settings?
Weekly Digest Email?
Profile upload of Avatar
Avatar View
Avatar Replace (Zoom, Pan)
Show/Hide Icon setting & Flowthrough

***** Household
Change and Save Settings
Add Household Member
Remove Household Member
Invited Household Member - acceptance
Leave Household - Transfer Ownership
Delete Household and Data 
Delete Household and Data - Delete Household popup

***** Archived Data
Archive/Unarchive - feature by feature - Account, Category, Transaction(?), Income/Expense schedule, Income/Expense Item, Quick Add Expense/Income/Transfer, etc. (Check Transactions)
ata & Subscription
Upgrade or Change (including Cancel)
Payment Success
Payment Fail
Recurring Payment deduction
Billing Portal
 Data Sovereignty & Zipped CSV Backup



These may include Waterfall engine, CSV Bank Statement input, Setup flow, Mark Spent capability, Income Split, New/Edit various entities (like Bank Accounts, Allocations, Allocation Plans,), Personal Settings, Household Settings, Household Member Invite, Free Trial Expiry, Subscription purchase, Subscription Update/Cancel & Grace Period



# Rules
* Strict adherence to AGENTS.md including no hardcoding of user facing literals, keeping FUNCTIONAL & Technical Specs md current, NO hardcoding user facing literals, vertical slice architecture, O dead/redundant tables/table fields/API code/UI code/capability code/other package code/etc, ensure UI elements, look-and-feel, colour, UI styling, etc is defined once and re-used, MECE principle for re-use of logic/screens/modals/etc., test cases coverage, etc.
* As you build code, you decide whether you want to run pnpm typecheck/lint/test/test coverage/i8ln-check/install/ for the modules you want. However, at the end, ensure pnpm validate runs successfully. Because pnpm validate is made up of multiple commands, just run the commands that failed sequentially until all of them pass, then try pnpm validate again. If it fails, repeat by running just the failed commands and then by running pnpm validate again. Once successful, commit code, but ask me before pushing the code.
* Ignore mobile app
* Create a detailed implementation plan detailed enough for an agent like Gemini 3.6 Medium to unambiguously interprent and execute.






# RULES

* Strict adherence to AGENTS.md including no hardcoding of user facing literals, keeping FUNCTIONAL & Technical Specs md current, NO hardcoding user facing literals, vertical slice architecture, O dead/redundant tables/table fields/API code/UI code/capability code/other package code/etc, ensure UI elements, look-and-feel, colour, UI styling, etc is defined once and re-used, MECE principle for re-use of logic/screens/modals/etc., test cases coverage, etc.
* As you build code, you decide whether you want to run pnpm typecheck/lint/test/test coverage/i8ln-check/install/ for the modules you want. However, at the end, ensure pnpm validate runs successfully. Because pnpm validate is made up of multiple commands, just run the commands that failed sequentially until all of them pass, then try pnpm validate again. If it fails, repeat by running just the failed commands and then by running pnpm validate again. Once successful, commit code, but ask me before pushing the code.
* Ignore mobile app
* OUtput - detailed implementation plan that can be unambiguously carried out by a low token agent. No need for reports.
* Make multiple passes if needed - as there may be cross-dependencies you'll miss if you don't
* Be critical, think deep - review code if you're not sure.
* If section below is blank, it means I don't have any updates for you to make - leave it alone.
* [/grill-me](slashCommand;grill-me) instead of making assumptions.



# AGENT - In progress...
    
_________

# Questions

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



