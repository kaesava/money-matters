
#####################################

# Rules
* Strict adherence to AGENTS.md
* If you need clarity, [/grill-me](slashCommand;grill-me) (don't make assumptions). Be critical.
* I don't need walkthrough at the end. I don't need a fancy report. Just a detail implementation plan that can be unambiguously followed.


# Mobile App

## General

## Mobile > Pools

# Web App

## Pools




## General - the below changes apply to the screens listed in the next section.
* Important: Align mobile app functionality to web app (this includes required fields, branching logic, data retrieval/setting logic, calculation logic, and any functiona logic used). However, the UX for the mobile app must follow UX best practice, and must used every opportunity for reusable UX/UI so other screens have consistent look and feel. If there is significant capability gaps, check with me.
* Actively look for opportunities to rationalise en.ts keys within and across the mobile & web apps. There is a lot of repetition that makes it hard to change terminology in one place. Iteratively identify rationalisation opportunities and apply them across web and mobile apps.
* In the mobile app, all user-facing literals (this includes screen/modal names, headers, titles, sub-titles, descrtiptions, filter labels, button labels, drop-down text, pagination labels, tab names, placeholder text, error messages, warning messages, information, info tooltips, etc.) must be consistent with the corresponding web app UI and importantly, re-uses en.ts keys for like-for-like functionality across web and mobile app. Do not add keys unless certain that they are specific for mobile or web and cannot be re-used.
* Agressively cull unused/redundant keys from en.ts. No hardcoding of literals.
* Mobile app must re-use as much UX as possible, defining UI elements (like fields, calendars, sort/search filter settings, etc.) centrally and re-using - MECE. The UI (theme, colours, general look-and-feel) must be consistent.


## Screens that the previous section apply to:
* Every screen, modal, drawer, popup, confirmation/alert/message box, edit screen, screen tab, etc.

* Settings > Bank Accounts > Add/Edit Bank Account Drawer
* Settings > My Details (including all sub-sections/cards)
* Settings > Household (including all sub-sections/cards)
* Settings > Archived Data (including all sub-sections/tabs) - ensuring that all entities that can be archived can be un-archived from here (if there are gaps in mobile/web app - call out)
* Settings > Data & Subscription






# Web Application 

## General



#####################################


You are now going to do a Mobile app screen by screen check to ensure that each mobile app screen is equivalent (parity) in functionality with the web screen and re-uses user-facing literals.


# Rules
* Strict adherence to AGENTS.md
* If you need clarity, /grill-me.
* I don't need walkthrough at the end. I don't need a fancy report. Just a detail implementation plan that can be unambiguously followed.
* Important: Align mobile app functionality to web app (this includes required fields, branching logic, data retrieval/setting logic, calculation logic, and any functiona logic used). However, the UX for the mobile app must follow UX best practice, and must used every opportunity for reusable UX/UI so other screens have consistent look and feel. If there is significant capability gaps, check with me.
* Actively look for opportunities to rationalise en.ts keys within and across the mobile & web apps. There is a lot of repetition that makes it hard to change terminology in one place. Iteratively identify rationalisation opportunities and apply them across web and mobile apps.
* In the mobile app, all user-facing literals (this includes screen/modal names, headers, titles, sub-titles, descrtiptions, filter labels, button labels, drop-down text, pagination labels, tab names, placeholder text, error messages, warning messages, information, info tooltips, etc.) must be consistent with the corresponding web app UI and importantly, re-uses en.ts keys for like-for-like functionality across web and mobile app. Do not add keys unless certain that they are specific for mobile or web and cannot be re-used.
* Agressively cull unused/redundant keys from en.ts. No hardcoding of literals.
* Mobile app must re-use as much UX as possible, defining UI elements (like fields, calendars, sort/search filter settings, etc.) centrally and re-using - MECE. The UI (theme, colours, general look-and-feel) must be consistent.
    

# Mobile App
Testing on Android Google Pixel 10.

Scope: All Screens, including but not limited to:
* Setup, Setup (Recalibrate Budget) including All steps, flow-on implications
* General (Navigation, Sign out, Settings, Switch Tenant, Spill Navigation, User profile icon, Info Tooltips - parity with web app, Infor tool tip visibility based on settings, currency format based on locale, dates based on locale)
* Home (Hero card - Bills Health/pacing, Everyday Health/pacing, Top Goals health/pacing & View All, Upcoming 5 Income/Expenses and "More", Can I afford it, Quick Actions - Expense, Income, Transfer)
* Pools (Simulator mode - on/off), New Pool, Edit Pool (including Pool/Bank Account lock on create), Pool - Mark as Shortfaull - implications, Category - Mark as priority - implications, New Category, Edit Category (including Target amount, Freq & Equivalent monthly, Pool lock on crete), Pool Types & associated special fields (like Sweep, target amount for goals, Search filter - All|Everyday
Bills|Goals & All|Shared|Private, pagination, History link, Progress)
* Bank Accounts(List with Linked Pools, Search, Sort, Filter - Pools, Markup Private, Available & Actual Balance, New, Edit (no linking Pools), Private Account (and lock on creation), Archive, pagination)
* Bank Account Align/Reconcile balance(surpus vs deficit and transaction creation, default pool, hide $0 pool for draw-down, etc.)
* History (Search, Sort, Filter - Pool, All|Expense|Income|Transfer, CSV export, pagination)
* History > Income Splits (Search, Sort, Filter - Bank Account, All|Expense|Income|Transfer, CSV export, Bank Account hyperlink, pagination, Details - Header with Income Source, Bank Account, Income Date & Income Split Date + Pool splits read-only)
* Schedules (Income SPlit, Upcoming, Setup, pagination)
* Schedule > Income Split (Filter - All, Confirmed, pagination)
* Schedule > Setup (Filter - All|Shared|Private, Search, Sort, Bank Account or Pool filter, New/Edit Expense Schedule, New/Edit Income Schedule, One-off Income/Expense, Recurring Income/Setup, Burst, Re-Burst, Burst rules on Edit, Archive, Pool/Bank hyperlink etc., pagination)
* Schedule > Upcoming (Filter - All|Shared|Private & All|Income|Expense|Transfer, Cancel filter, Search, Sort, Run Split, Mark Spent, Delete, Overdue label, default sort, etc. Pool/Bank hyperlink, pagination)
* Income Split (Actual Split logic of waterfall, Edit Date - future vs today/past, Edit Amount & other fields, Edit splits, overshoot, undershoot, Physical Bank transfer card, Save, Unsave, Run Split, Delete, Reset calculation, Cancel)
* Mark Paid (Edit Date - future vs today/past, Edit Amount & other fields, Insufficient handling & sweep, trigger transfer, Save, Confirm, Cancel)
* Settings > My Details (View, Edit, validations, timezone functionality, date format functionality, currency functionality across app, number & email validation, avatar select, avatar zoom/pan)
* Settings > Household (View, Edit, validations, country, timezone implications, Remove Household member, Send invitation - owner only, Leave Household - warnings, challenge, Delete Household & data - warnings, challenge, owner only)
* Settings > Archived Data (Filters, Search, Restore, Archive cascades, Unarchive cascades, date-sensitive unarchival to prevent unarchiving of individual archives prior to high level archive)
* Settings > Data & Subscription (Current plan, Upgrade plan, Download full zipped data, Signout, Interaction with Stripe, Stripe confirmation/cancel/failure, Payment options)
* Trial: Days remaining on Trial badge, trial prevention if already existing for user, etc. Lockdown on Trial expiry (except for Data download or upgrade)
* Landing page (Logged in, Not logged in), Main (How it works, Why us, Simulator, Advantages, Pricing, FAQ, etc.), environment variable switch to prevent login, privacy policy, Terms of use, Sign-Up, Sign-In)
* Sign-In, Sign-Up (validations, Google, email/password, combinations of these for sign-up and/or sign-in & handling, etc)

-----------------------------------------------



* As you build code, you decide whether you want to run pnpm typecheck/lint/test/test coverage/i8ln-check/install/ for the modules you want. However, at the end, ensure pnpm validate runs successfully. Because pnpm validate is made up of multiple commands, just run the commands that failed sequentially until all of them pass, then try pnpm validate again. If it fails, repeat by running just the failed commands and then by running pnpm validate again. Once successful, commit code, but ask me before pushing the code.


## Header

## Bottom Navigation links

### General
### Navigation
### Common
### Dashboard
* [x] Pool Picker doesn't seem to be working. Needs to be in parity with web application. Re-use as much code as possible. (Completed: MobilePoolPicker unified with inline mode & web parity, removed local ad-hoc picker)

### Income & expenses
#### Income Split
##### Pool drawer
##### Income Split Drawer
#### Upcoming
#### Setup
### History
#### History
#### Split History
##### Payday Allocation Details drawer


/grill-me



################################# KESH currently testing / yet to test




# Home
## Left to Spend Card
## Bills & Committments Pool Card
## Goals card
# Can I Afford It?

# Settings
## My Details
## Household


# Archive/Unarchive





################################# PENDING


# FUNCTIONAL AUDIT

### 2. Lead Business Analyst (V1 Functional Completeness)
* Identify all the Apps Capabilities (partially listed below), and ensure there are 0 Functional Gaps (Built per spec), no edge cases, no Code bugs, no duplicated code where code can be fully or partially reused, no inconsistencies, no friction UX, no misaligment with functional specs (allowing for the functional specs to not be current & complete), no logic flaws especially at the edges, no redundant or unused code, no dangerous code (for example - not defensive against misuse/abuse/bad actors), no poorly written code, etc.

### General
* Connection interrupted message - validity, retry logic
* Consistent behaviour and look-and-feel of tables across the app (sort, search, pagination, skeleton loading, reasonable widths, etc.
* Behaviour of modal/drawers screens (in particular ones with editable fields) across the web app (defensive field checks to prevent malicious or rubbish data entry), Cancel, Escape to Cancel, Errors, Warnings, COnfirmations, Success toasts, Click/Press away to Close, Dirty Edit checks, etc.
* Landing Page (Not signed in) - consistent with actual app functionality, targets audience in language, simple yet compelling use-case
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
### Apple Sign in (Deferred to Release 2)
### Google sign-in after Email login 

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



