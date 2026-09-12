# Rules
* Strict adherence to AGENTS.md including no hardcoding of user facing literals, keeping FUNCTIONAL & Technical Specs md current, NO hardcoding user facing literals, vertical slice architecture, O dead/redundant tables/table fields/API code/UI code/capability code/other package code/etc, ensure UI elements, look-and-feel, colour, UI styling, etc is defined once and re-used, MECE principle for re-use of logic/screens/modals/etc., test cases coverage, etc.
* As you build code, you decide whether you want to run pnpm typecheck/lint/test/test coverage/i8ln-check/install/ for the modules you want. However, at the end, ensure pnpm validate runs successfully. Because pnpm validate is made up of multiple commands, just run the commands that failed sequentially until all of them pass, then try pnpm validate again. If it fails, repeat by running just the failed commands and then by running pnpm validate again. Once successful, commit code, but ask me before pushing the code.
* Output: Detail implementation plan - including db push for dev & prod and if any seed adjustment, then seed push to dev and prod.
* Ignore mobile app


# CHANGES - NOT DONE



################################# KESH currently testing / yet to test



# Home
## Left to Spend Card
## Bills & Committments Pool Card
## Goals card
# Can I Afford It?

# Settings
## My Details
* Show fields as readonly. If the user clicks on Edit (top right of the card), open the fields to read-write. If they make a change, save t
* I tried saving 
## Household
* I can see that the Household Name, Currency and Timezone are locked. However, are you sure the user has the opportunity to set them when a tenant is first created.
# Archive/Unarchive


# MOBILE AUDIT

Do a thorough audit of the mobile app capability and web app capability with the aim of getting the mobile app up to production readiness. The Web app has advanced significantly while the mobile app has stalled. This was intention so I could focus on the web app. However, now I want to mobile app to get to par with the webb App. I want you to do a thorough deep dive into the relative capabilities and identify every single update that needs to be made in the mobile app to bring the functionality in par with the web app. When I say every capability, I literally mean every screen, modal, filter, drop-down, button, input field, workflow, hover text, hyperlink, navigation, search, sort, table, loading animation, field, error message, confirmation modal, label, title, warning message, close button, cancel button, etc. Of course, you will need to translate each UI element from a Next.js convention into an Android mobile app React Native specific UX/UI convention/best practice to ensure native look and feel. Further, there is already a significant amount of build complete. The ask is not to rebuild from scratch. Re-use where possible, but be brutally sure that every capability is built in a native way. This is massive task, and you may need multiple passes through the code.


################################# DISCUSS WITH AI AGENT (Gemini 3.8 High) - AFTER SCHEDULES HAVE RUN

# LANDING PAGE (BEFORE LOGIN)
Do a thorough audit of the landing page for the app and all pages where the user does not have to have logged in, including Sign-Up, Sign-In, etc.. 

For example, in the landing page, I believe the information and graphics are dated - the app has come a long way. Keeping with the look and feel of a modern web application, and taking advantage of our USP, propose changes (and I don't mind a full re-design). Focus on what we have that others in the market dont. Focus on our hero workflows/functionalities. Be critical. Be thorough. Put yourself in the shoes of a user looking for a budgeting app. Appeal to those that have tried and failed or are hesitatnt to try because of usual points of fritction that my app now does not create.

Change the tag line "Simple, honest household budgeting". Right now I don't think it's really that simple. The USP of this app is that you can realistically track your long term goals, and also it provides some assuarance that you're prepared for bills. Apply the tage line across the app (logged in and non-logged in pages)


Functionally, the Login page is not fully integrated into the landing page. Let's remove "by Kaesava" it doesn't show up in the app.
Scope: ALL pages where the user can access without logging in, including but not limited to:
* /
* /terms
* /privacy
* /sign-in
* /sign-up
* /subscription/upgrade


################################# PENDING


# FUNCTIONAL AUDIT

### 2. Lead Business Analyst (V1 Functional Completeness)
* Identify all the Apps Capabilities (partially listed below), and ensure there are 0 Functional Gaps (Built per spec), no edge cases, no Code bugs, no duplicated code where it can be rationalised.

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
* Pool table list (including expand/collapse Pools) - Sort, Search, Filters (All/Everyday/Bills/Goals and All/Shared/Private), Pagination
* Pool table - Hyperlinks to History & Upcoming Events
* Add Pool (from button or from within Pool Type)
* Create Pool
* Edit Pool (including preventing re-linking with Bank Account or Pool Type) and Save/Cancel
* Archive Pool, Unarchive Pool
* Add Category (from button next to Pool)
* Create Category modal
* Edit Category modal (including preventing re-linking with Pool)
* Archive Category, Unarchive Category
* Behaviour of Prioritised Categories
* Behaviour of Private Pools
### Income & expenses
#### Income Split
* Pools list (including hyperlinks that open Pool side drawer, expand/collapse) - Sort, Search, Filters (All/Shared/Private & Show 5 vs. Show full)
* Save, Unsave, Delete, Review each Split - correct Behvaiour
* Pool hyperlink to opern Draawer
##### Pool drawer
* Pool Details (including Pool hyperlink)
* Category table and values (with hyperlinks)
* Upcoming Expenses table with values (including Show All Expenses)
* History (including See Full History) tabs
##### Income Split Drawer
* Update of Name, Amount or Date (and functional implications - for example, if Date in past/today or future)
* Saved badge if Saved
* Pool list (collapse/expand, allow correct entry of split)
* Surplus pool and behaviour
* waterfall triggers & calculation
* Correct load of allocation lines if saved
* Save, Unsave, Delete, Run Income Split, Cancel
#### Upcoming
* Event table - Sort, Search, Filters (All/Shared/Private & All/Income/Expense/Transfer) - pagination
* Mark Spent (including allowing change in amount or date - but not future)
* Mark Spent confirmation (including allowing transfer from non-zero pools up to their balance, defaulting to surplus target, allow non-zero updating pools)
* Mark Spent action (triggering all transfers - should end up as transactions, then confirming and marking spent and drawing down on pool)
* Overdue badge & formatting
#### Setup
* Search & Filter (All/Shared/Private) across Income & Expense tables - pagination
* Income Schedule table (Bank Account filter, sort)
* Expense Schedule table (Pools filter, sort)
* Add Income or Expense Schedule modal
* Edit Income or Expense Schedule modal
* Rules for one-off vs. recurring and coding in database (rrule) - frequency, every, first, last.
* Burst rules
* Re-burst rules (including edit/deletion of previous burst events) - based on what was changed
* One-off behaviour (creation of event and deletion of schedule)
* Archive/Un-archive of Income/Event schedule - implications on events
### History
#### History
* Transactions table (Sort, Search, Filter - All/Spent/Received/Transfer and Pool filter) - pagination
* Export CSV (filtered records) - including pagination
#### Split History
* Payday Allocation table (Search, Filter by Bank Account, sort, 
* Bank Account hyperlink
* Export CSV (filtered records) - including pagination
* View Details
##### Payday Allocation Details drawer
* Header & Total
* Splits (all readonly)



******* "Bank Accounts"
Edit Modal 
Reconciliation
Linked Pools popup

Private Bank Accounts

Bank Account & Statement csv Import
CSV Import Log
CSV Import Flow - Step 1,Step 2, Step 3



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



