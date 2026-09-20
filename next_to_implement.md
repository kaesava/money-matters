
# Rules ########
* Strict adherence to AGENTS.md including no hardcoding of user facing literals, keeping SCHEMA DFINITION, FUNCTIONAL & Technical Specs md current, NO hardcoding user facing literals, vertical slice architecture, O dead/redundant tables/table fields/API code/UI code/capability code/other package code/etc, ensure UI elements, look-and-feel, colour, UI styling, etc is defined once and re-used, MECE principle for re-use of logic/screens/modals/etc., test cases coverage, etc.
* As you build code, you decide whether you want to run pnpm typecheck/lint/test/test coverage/i8ln-check/install/ for the modules you want. However, at the end, ensure pnpm validate runs successfully. Because pnpm validate is made up of multiple commands, just run the commands that failed sequentially until all of them pass, then try pnpm validate again. If it fails, repeat by running just the failed commands and then by running pnpm validate again. Once successful, commit code, but ask me before pushing the code.
* Ensure that if there are schema changes, push both to dev and prod db, and if seed updates needed, push seed to both dev and prod (both environments currently only have dummy data - safe to overwrite)
* Output: Detail implementation plan - including db push for dev & prod and if any seed adjustment, then seed push to dev and prod.
* Each of the requested changes may require a deep-dive into the code - optimise how you do this, but be prepared to go deep for 100% coverage.
* Applies to web & mobile app

################





We are now going to work through screen by screen to ensure that the mobile app and web app are ready for production. For mobile, I've connected it by USB to my machine (running Linux mint) for development.

We will start with Sign-In and Sign-Up pages.

* Ensure that all the capability in the web app is also available and setup correctly on the mobile app. This includes but is not limited to:
** OTP handling if email needs to be verified
** Behaviour when password is incorrect (currently the mobile app does not seem to show error)
** Sign-up/Sign-in through Email and Google (Apple deferred to Release 2)
** Handling of CORS/better auth authentication & headers - coming through correctly?
** Mandatory fields are entered (currently, seems to allow sign-in even though they aren't)
** Mandatory fields are marked up (not currently marked up)
** Forgotten password functionality works perfectly
* Applies to web & mobile: Ensure that there is only one set of keys in l18n relating to sign-up and sign-in fields, error messages, porrly formatted field error messages, backend error messages, etc. and consistent across web and mobile with no hardcoding (using web as guide if conflict.)
* Applies to web & mobile: Sign-Up fields are exactly the fields needed to setup a new tenant and align with format, etc.
* Password rules are consistently applied across mobile and web
* Title and Sub-titles across mobile and web are consistent (for example, use app.tagline)
* Identify and aggressively cull dead/un-used code relating to sign-up or sign-in across web and mobile apps, including l18n literals.
* Consolidate l18n literals relating to sign-in and sign-up where they are similar and repeated. Cull un-used.

IMPORTANT: Do your own comprehensive comparison of all the ways in which the user can sign-up and/or sign-in across mobile and web and ensure functionality parity (web is reference) - of course, UI needs to be web or mobile native.

# Rules ########
* Strict adherence to AGENTS.md
* Output: Detail implementation plan - including db push for dev & prod and if any seed adjustment, then seed push to dev and prod.
* Each of the requested changes may require a deep-dive into the code - optimise how you do this, but be prepared to go deep for 100% coverage.
* Applies to web & mobile app



# Sign in Page & Sign-Up

## Web > Sign-In
* "Failed to sign in. Please check your credentials." shows up twice - it should only show up once.
* When I click on "Send Reset Link" in Forgot Password, I get error: "Invalid redirectURL"
* Sign in with Google - simply redirecting to login - is this because this is dev environment?
* Sign in with Apple - deferred to Release 2 (see V2_SCOPE.md FEAT-V2-009-APPLE-AUTHENTICATION)

## Mobile

## Both
* When I enter invalid password, error messages between web and mobile are different (mobile "Invalid email or password. Please try again." vs. Web "⚠️ Failed to sign in. Please check your credentials."). Ensure consistency. Re-use en.ts literals.

## Both
Ensure all titles, subtitles, labels, errors, format errors, re-use l18n strings, and aggressively cull strings that are related to sign-in and sign-up that are not used across the two.


# Rules
* Strict adherence to AGENTS.md including no hardcoding of user facing literals, keeping SCHEMA DFINITION, FUNCTIONAL & Technical Specs md current, NO hardcoding user facing literals, vertical slice architecture, O dead/redundant tables/table fields/API code/UI code/capability code/other package code/etc, ensure UI elements, look-and-feel, colour, UI styling, etc is defined once and re-used, MECE principle for re-use of logic/screens/modals/etc., test cases coverage, etc.
* As you build code, you decide whether you want to run pnpm typecheck/lint/test/test coverage/i8ln-check/install/ for the modules you want. However, at the end, ensure pnpm validate runs successfully. Because pnpm validate is made up of multiple commands, just run the commands that failed sequentially until all of them pass, then try pnpm validate again. If it fails, repeat by running just the failed commands and then by running pnpm validate again. Once successful, commit code, but ask me before pushing the code.
* Ensure that if there are schema changes, push both to dev and prod db, and if seed updates needed, push seed to both dev and prod (both environments currently only have dummy data - safe to overwrite)
* Output: Detail implementation plan - including db push for dev & prod and if any seed adjustment, then seed push to dev and prod.
* Each of the requested changes may require a deep-dive into the code - optimise how you do this, but be prepared to go deep for 100% coverage.
* Ensure that the mobile app and web app functionality are kept aligned functionally, but always using native UI/UX

# MOBILE
Testing via USB connected to Android Google Pixel 10 connected to this machine.

## Header

## Bottom Navigation links

### General
### Navigation
### Common
### Dashboard
### Pools
#### Pool Picker
* Pool Picker doesn't seem to be working. Needs to be in parity with web application. Re-use as much code as possible.

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
* Identify all the Apps Capabilities (partially listed below), and ensure there are 0 Functional Gaps (Built per spec), no edge cases, no Code bugs, no duplicated code where code can be fully or partially reused, no inconsistencies, no friction UX, no misaligment with functional specs (allowing for the functional specs to not be current & complete), no logic flaws especially at the edges, no redundant or unused code, no dangerous or poor code, etc.

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



