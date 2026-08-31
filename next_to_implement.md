


# Seed
* Why is there a target amount on Joint Bills Pool (Bills) but not  on Surplus & Offset Reserve (Goal)?
* Fix & run seed in dev and prod

# History
* When taken to the History screen from Pools by clicking a Categoery hyperlink, it opens "http://localhost:3000/dashboard/history?search=Groceries" but I don't see Groceries in the Search inbox, which means the History table is not filtered. I suspect the same thing is happening when I come from Pool hyperlink (http://localhost:3000/dashboard/history?search=Emergency%20Reserve). Ensure this search term actually gets entered in the Search box.
* Note that while going the other way from History to Pools, this feature is working when it is just a Pool (JKoint Bills Pool") but if the History includes a Category, we don't want to be including it in the search (so "Joint Bills Pool (Mortgage / Rent Payment)" should still only do a search by "Joint Bills Pool".

# Bank Accounts
* When taken to the Bank Accounts screen from Pools by clicking a Bank Account hyperlink, it opens "http://localhost:3000/dashboard/bank-accounts?search=Kaesava%20Personal%20Everyday" but I don't see text in the Search inbox, which means the Bank Accounts table is not filtered.

# Pools
## Pool Edit

## Categories drawer (when user clicks on "3 Categories") - applies to Everyday & Bills only

## Category New/Edit

# Seed

Ensure that you create a detailed implementation plan (ensuring that every requirement here is 100% included), such that any AI can easily and unambiguously implement.
/grill me if needed


# AGENT - In progress...
    
_________


# Rules
* Strict adherence to AGENTS.md including no hardcoding of user facing literals, keeping FUNCTIONAL & Technical Specs md current, NO hardcoding user facing literals, vertical slice architecture, O dead/redundant tables/table fields/API code/UI code/capability code/other package code/etc, ensure UI elements, look-and-feel, colour, UI styling, etc is defined once and re-used, MECE principle for re-use of logic/screens/modals/etc., test cases coverage, etc.
* As you build code, you decide whether you want to run pnpm typecheck/lint/test/test coverage/i8ln-check/install/ for the modules you want. However, at the end, ensure pnpm validate runs successfully. Because pnpm validate is made up of multiple commands, just run the commands that failed sequentially until all of them pass, then try pnpm validate again. If it fails, repeat by running just the failed commands and then by running pnpm validate again. Once successful, commit code, but ask me before pushing the code.
* Ignore mobile app
* Make multiple passes if needed - as there may be cross-dependencies you'll miss if you don't
* Be critical, think deep
* /Grill-me when in doubt or there are unclear or conflicting asks.
* OUtput - detailed implementation plan that can be unambiguously carried out by a low token agent. No need for reports.

# General

## Landing Page

## UI COnsistency
### Tables - Sort, font, font size, header & item alignment, search, filters, pagination

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
#### Expense

## "Pools"

### Pool/Category picker


## "Income & Bill Management"
XX
### Allocate Pending Income
#### Payday allocation - bulk

### Pending List
#### Individual Income/Expense - Edit Modal (new)
#### Skip Functionality
#### Individual Expense - Mark Paid
#### Individual Income - Mark Received
#### Income Split modal.

### Setup
#### Add/Edit modal - Bill Schedule & Income Schedule
#### Add/Edit modal - Bill Schedule
#### Add/Edit modal - Income Schedule
#### Setup One-off, Recurring - check Burst
#### Change Start/Frequency/End-date/Amount/Other - check re-burst
#### Delete - check event delete (archival)
#### Burst Event Regeneration (Check Transactions)


## Bank Accounts

### Edit Modal 
#### Reconciliation


#### Private Bank Accounts

### Bank Account & Statement csv Import
#### CSV Import Log
#### CSV Import Flow
##### Step 1
##### Step 2
##### Step 3

## "History"###
XX
### Transactions
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
#### Delete Household and Data - Delete Household

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



