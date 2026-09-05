
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

## ******* "Income & Expense Management"

#### Allocate Sidebar
* Change title and subtitle to "Split Income" and "Confirm Income & review Income Splits across Pools"
* Change "Deposit Details" to "Income Details" and show with collapse/expand for the section - collapsed by default
* Change "Income Source" to "Income Source / Description" - effectively align with the Quick Actions > Income labels.
* Change "Waterfall Split" to "Split Income across Pools"
* Show the Pools re-using the Pool Type > Pool  structure look & feel from the Pools screen. Find a way to show current balance and target for each (read-only). I like the summary (Everyday, Bills, Goals)
* Show the Pool that is marked as the default Sweep Pool at the end in the Total section with a read-only amount that is the balance of the unallocated amount. This way, the Total Allocated would always be the full amount so you don't need to show it. Show the Income Amount though.
* If the Sweep Pool becomes negative, don't allow Save. It can be >0.
* All the rules about marking AUTO vs. MANUAL apply (i.e., when the user changes any field).If it is AUTO, then re-opening this will re-trigger. If this is MANUAL (i.e., overridden), opening will pull data frmo the DB instead of calculaiting. Show that it is MANUAL or AUTO wiht an (i) to share implication. (use user-friendly language targeted at Aussie audience)
* No Pool can go negative. Ensure defensive fields (i.e. user doesn't enter 99999999999999999) etc.
* Include a checkbox ("Run Splits to update Categories and mark Income CONFIRMED") near the Save if the Income date is today/past. Make it readonly if the date is the future (noting that they can change the date from this sidebar). If the user leaves unchecked (checked by default if enabled, unchecked if disabled), it means the user wants to save the Allocation but not actually mark the Income as confirmed.
You can include a (i) to explain this to the user (use user-friendly language targeted at Aussie audience). 

#### Skip Functionality
* Warn the user that the skipped event will be deleted. Actually delete it when skipped.

#### Income Allocation

### Setup
* All Pools filter - show the Pool picker - launch it so you can't pick Categories - only Pools - only pick one Pool

#### Create/Edit modal - Expense Schedule & Income Schedule (applies to both)
* Expense Schedule: UX for the "Every" number is broken. It won't allow me to clear the field to enter a number.
* Both: I changed the start date to 01-Jan-26, End date to 31-Dec-26 and "Every" to 3 (and frequency to "Weekly"). When I look at the DB, I see FREQ=WEEKLY	2026-01-01	2026-12-31 (rrule, start_date, end_date) so the "3" is not registered in the rrule.
* Both: When I re-open the Schedule, the end date and "Every" are blank - not getting picked up from the database?
* Expense Schedule: (Edit) When I change the Recurring/One-Off, Frequency, Start Date, End date OR "Every" number, it doesn't register the change and so the Update field is read-only. Fix this so a change in any of these fields makes me enables Save (unless there are fields that don't meet format/mandatory).
* Income Schedule: (Edit) When I open and make no change, it still allows Save. It should only show Save if I made a change in any of the fields: Income Name, Expected Amount,  Bank Account, Recurring/One-Off, Frequency, Every, First Date, End Date.
* Effectively, these two shoudld operate very similarly - re-use code as much as possible across them.

#### Change Start/Frequency/End-date/Amount/Other - check re-burst
#### Delete - check event delete (archival)
#### Burst Event Regeneration (Check Transactions)

### Allocate Income Sidebar
* Remove all icons from the screen (including in the tables)
* For column 1, Re-use the expand/collapse of Pool Types & Pools from the Pools screen (but don't show Categories). Show the Current Balance

### Upcoming
* The search bar shouldn't get stunted like it is (width)
* Actions - Show Mark Spent Mark Received and Allocate Actions as hyperlinks - stay consistent across the app (similar to Pools screenscrteen) - leave Skip as is.
* There are many Income Events, one on 1 July another on 15 July, etc. (part of the same series). For some reason, the one on 15-Jul allows "Mark Received" while the 1 July has Allocate. I am expecting the earliest (PENDING Status) income record in this list.


## ******* "Bank Accounts"
* Remove "+"" from the "Add Bank Account" button label
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



