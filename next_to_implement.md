
# RULES

* Strict adherence to AGENTS.md including no hardcoding of user facing literals, keeping FUNCTIONAL & Technical Specs md current, NO hardcoding user facing literals, vertical slice architecture, O dead/redundant tables/table fields/API code/UI code/capability code/other package code/etc, ensure UI elements, look-and-feel, colour, UI styling, etc is defined once and re-used, MECE principle for re-use of logic/screens/modals/etc., test cases coverage, etc.
* As you build code, you decide whether you want to run pnpm typecheck/lint/test/test coverage/i8ln-check/install/ for the modules you want. However, at the end, ensure pnpm validate runs successfully. Because pnpm validate is made up of multiple commands, just run the commands that failed sequentially until all of them pass, then try pnpm validate again. If it fails, repeat by running just the failed commands and then by running pnpm validate again. Once successful, commit code, but ask me before pushing the code.
* Ignore mobile app
* OUtput - detailed implementation plan that can be unambiguously carried out by a low token agent. No need for reports.
* Make multiple passes if needed - as there may be cross-dependencies you'll miss if you don't
* Be critical, think deep
* /Grill-me when in doubt or there are unclear or conflicting asks.



# AGENT - In progress...
    
_________

# Questions

# General
* Sometimes if the session is no longer valid, it shows an error in whatever I'm doing at the time, like "Multi-tenancy boundary isolation violation: Missing or invalid verified session tracking parameters.". If the session is not valid, are we better off when we get this error safely logging out the user?
* Change "Target Pool" to "Pool". I noticed you have field name in capitals in some modals, but not in all. I want consistency. Do a check across ALL modals.

## Behaviour of tables across the web app
IMPORTANT: All changes in this section apply across the web application. You need to do deep research to ensure you apply all changes to all modals without missing any modal. Include in AGENTS.md to prevent drift.
* Ensure loading of all tables is based on the skeleton loading visual. This is already implemented but may not have been applied consistently
* Ensure pagination is shown under every table but only if there are 5 or more records (exception: Pools table in Pools screen - no pagination required). This includes the Income & Expense Schedule tables in Income & Bill Management and every other table across the web app.

## Behaviour of modal screens (in particular ones with editable fields) across the web app
IMPORTANT: All changes in this section apply across the web application. You need to do deep research to ensure you apply all changes to all modals without missing any modal. Include in AGENTS.md to prevent drift.
* Ensure you re-use modals between Create and Edit to limit code and write switch logic as needed. 
* If the user makes changes after opening an EDIT modal view, the Action button (like Submit or Confirm) remains disabled unless (1) they actually make a change to some field relative to when it was loaded AND (2) there are errors in fields like mandatory or invalid values to be resolved.
* If the user clicks away from a modal or hits Escape or Cancel, and the user had made changes to any fields (applies to CREATE or EDIT) (even if there are still invalid fields or un-filled mandatory fields), bring up a Continue or Discard Changes dialog. However, if the user made no changes, then escape or Cancel or clicking away should simply close the modal.
* If the user opens a CREATE modal view, the Action button remains disabled unless (1) they actually make a change to some field AND (2) there are errors in fields like mandatory or invalid values to be resolved.
* Ensure behaviour of Cancel button, escape, or clicking away from modal - all behave the same. Ensure that the look and feel of the Cancel and Action buttons are consistent across the app.
* In some modals, mandatory fields are marked with a red asterisk, in others, when you hover it tells you it's mandatory, and in others, its neither. Stay with the red asterisk next to ALL mandatoryf fields across the app.
* When a modal opens, direct the cursor to the first editable field
* For amounts, prevent user from entering negative numbers, crazy big numbers or numbers with more than 2 decimal places.
* Archive link (if applicable) must be shown consistently (in some places it's red, in some it's more subdued - it needs to be subdued) and shown in a consitent position on the modal.

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

## Home

### Manually adjusting Bills or Everyday.
### Account Reconciliation (Transaction flowthrough)
### Can I afford

### Quick Action (triggered from multiple places)
#### Income
* Change "Setup Income" to "One-off Income".
* When I submitted (past dated) by pressing "Mark Received", it didn't seem to trigger a Payday Allocation, which on confirmation should create transactions..
* Also, when confirmed, I expect a toast, consistent with how the app behaves everywhere else, not it's own confirmation screen.
#### Expense
* Change "Setup Expense" to "One-off Expense".
* When I submitted (past dated) by pressing "Mark Paid", it didn't seem to save it as a transaction.
* Also, when confirmed, I expect a toast, consistent with how the app behaves everywhere else, not it's own confirmation screen.
 
### Transfer

## "Pools"
* Rename Header from "Pools" to "Pools & Categories"
* Change the (i) from ""About Your Virtual Pools Manage your spending pools and savings goals. The 5-Step Waterfall automatically fills your Bills pool and savings upfront on payday" to "Manage your budget categories organised into Everyday spending Pools, Bills Pools and your Savings Goals"
* Remove pagination
* I'm finding that sometimes, Pools disappear from the Everyday/Bills Pools unless I refresh the page. Not sure how to replicate this interimittent issue.

### Projection Timeline
* Change "Projection Timeline" to "Forecast Balance" and "Hide Projection Timeline" to "Hide Forecasted Balance"
* Change "Timeline Projection Slider" to "Project you Pool Balances on future dates as Income allocations are confirmed".

### Pool Create/Edit Modal
* When Creating a Pool, Change heading to "Create Pool".
* Why is Pool Name bold? It needs to be consistent with the rest of the app.
* When I created the Pool, it does nothing (i.e., doesn't seem to actually create a Pool). I didn't see a confirmation toast, I didn't see it show up on the list in the screen. However, I can see it in the database.
* The information (i) next to Mark this pool as Shortfall/Surplus target is getting cutoff and I can't read it properly


### Category Create/Edit Modal
* When editing a Category, change the message under the Pool Type from "Once set, pool types and bank accounts are locked to keep your transaction history clean. If you need to, please archive this pool and create a new one." to one that is more specific to categories (i.e dont reference bank accounts and ask to archive the category not pool).
* My understanding is that in the backend, an Everyday/Bill Category Target Amount is captured as a combination of Amount and Frequency ($10, weekly) and we typically convert it into monthly. When loading a Category in edit mode, don't translate it into Monthly, show it as captured ($10, weekly) with the translation as today.
* Prioritise this category when allocating income - will be good show an information icon (i) with a line describing what this means. "Checking this box will ensure that when Income is split across categories, this category is prioritised over others". Ensure the (i) text doesn't get cut off


### Pool/Category picker
* Remove all Icons


## "Income & Bill Management"
* Change "Income & Bill Management" to "Income & Expenses"
* Change information icon text from "Income & Bill Management Manage your recurring income schedules, bill commitments, and 12-month payday matrix." to "Manage schedules and your upcoming income & expenses"

### Allocate Income
#### Payday allocation - bulk

### Upcoming
* Remove "Only" in the three filters ("Income Only", "Expense Only" and "Transfer Only")
* Remove the number next to All ("All (26)") - make the look and feel consistent across the app (like in the History Screen)
* The "Resolve Earlier Pay" greyed out button logic is incorrect. Right now, it allows "Mark Received" for all past ones and the first today/future date. Instead, it shoudl only be showing "Mark Received" for the earliest pending (i.e., not Skipped or Marked Received) Income. All other Incomes, even if they are in the past, should show - instead of a greyed out "Resolve Earlier Pay" button, a 

 should NOT be based on the date, but rather, on the earliest Income that has not been processed (i.e., not Skipped and not Marked Received). Effectively, only one Pay should have the "Mark Received". For all others, instead of the greyed out "Resolve Earlier Pay", could we not trigger the Allocation (but not the committment of it)? That is, imagine 

#### Individual Income/Expense - Edit Modal (new)
#### Skip Functionality
#### Individual Expense - Mark Paid
#### Individual Income - Mark Received
#### Income Split modal.

### Setup
* Extend the Search bar across both tables and include and include a All|Shared|Private filter (same look and feel as the Pools Screen). In the Expense schedule table, it would filter private/shared pools (i.e., pools linked to private bank accounts). In the Income schedule table, it would filter private/shared bank accounts.
* For Income Schedules table, instead of recurrance, show the Bank Account
* Change "Bill Schedules" to "Expense Schedules" and "Add Bill Schedule" to "Add Expense Schedule" button label and table column uname from "BILL NAME" to "SCHEDULE NAME".
* Allow sort by Schedule Name, Bank Account/Assigned Pool and Amount in both tables
* In the Expense Schedules table, show a drop-down filter with all Pools, similar to the History screen.  This drop-down should be responsive to the Private/Shared filter.
* In the Income Schedules table, show a drop-down filter with all Bank Accounts. This drop-down should be responsive to the Private/Shared filter.
* In both tables, under the Schedule Name, show the recurrence (every 2 weeks starting 09 Aug 26 until 14-Sep 27) - show conspicuously so the screen is still clean.

#### Add/Edit modal - Expense Schedule & Income Schedule (applies to both)
* For both Expense Schedule & Income Schedule modals, Next to the expected amount, show an information icon with the text "These can be updated later"
* For Expense Schedule, change "Add Bill Schedule" to "Add Expense Schedule" and "Bill Name" to "Expense Name"
* In the Pool drop-down, use the Pool picker - can only pick one pool, and cannot pick categories.
* When I saved an Expense schedule (applies to Income Schedule too) for every 2 months and set and end date, it said it saved, but when I reopened, these two fields had defaulted to 1 and blank respectively.
* It shouldn't allow me to enter and end date prior to the start date on both modals.

#### Burst logic
#### Change Start/Frequency/End-date/Amount/Other - check re-burst
#### Delete - check event delete (archival)
#### Burst Event Regeneration (Check Transactions)


## Bank Accounts
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

## "History"###
### Transactions
* Pools drop-down should show Pools, not Pool Types for filtering.
* CHange "Income" to "Received" in filter
* Change "Mark Paid" to "Mark Spent" across the app - 
* Extend Search to include Amount

#### Export CSV
### Payday Allocations
#### Payday Allocation Details sidebar
#### Export CSV

## "Settings"

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



