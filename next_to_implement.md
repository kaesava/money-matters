
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
Rules: Be critical and thorough. /Grill me if needed instead of making assumptions. Think through implications large and subtle/edge case from a functionality point of view.
* Once linked, we stopped the user from changing the Bank Account linked to a pool and vice-versa to preserve history, sensitive access, etc. given bank accounts could be private or shared. Should we apply the same constraint in changing the Pool linked to to a Category once set? Discuss. 
* If the user clicks Adds an Income or Bill Schedule but makes it one-off, we allow them to do that but we simply create a standalone Income or Bill Event that is not linked to a schedule (i.e., don't create a schedule record) (just as we would have if they created it using the Quick modal)? Then this view doesn't get cluttered with one-offs and is there to setup schedules. Discuss.

# General
* When there are hyperlinks that open other screens with a search criteria entered (there are many examples of this), ensure the search text is fully highlighted so th user can change it.
* In all Edit screens/modals, guard against input fields being misused (be defensive in checking). If this can be managed centrally, do so so future input field creation automatically inherits this protection. Examples (not exhaustive but indicative - you come up with an exhaustive list) based on input type:
amount: 0000.4, 9999999999999999999999999999999999999999999999999999, negative when only expecting 0+, etc.
string: {dangerous control characters}, malicious scripts in text, etc
date: only use date picker
number: -9999999999999999999999999999999999999999 
* In all Edit screens/modals, mark mandatory fields (say with a red asterisk) and grey out the button until all mandatory fields are filled.
## Landing Page

## UI COnsistency
### Tables - Sort, font, font size, header & item alignment, search, filters, pagination
### Literals
* In some places "Everyday" in some places "Everyday Spending" and in others, "Everyday Spending Pool" - be consistent across the app - Everyday Spending preferred
* In some places "Regular" in some places "Bills" in some places "Regular Bills" - be consistent across the app - Bills preferred
* In some places "History" in some places "Transactions" - be consistent across the app - History preferred
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
* rename "Dashboard" to "Money Matters - Simple, honest household budgeting.""

### Manually adjusting Bills or Everyday.
### Account Reconciliation (Transaction flowthrough)
### Can I afford

### Quick Action (triggered from multiple places)
#### Income
* When I pick an Income future dated I get this warning: "Scheduled for Payday Waterfall. This future income deposit will be included as an upcoming event in your payday allocation horizon.". Instead, simply change the button from "Record Income" to "Setup Income" or something to this effect.
* When I pick an Income for today/in the past, include a check box asking if the user wants to also run a payday allocation (doe not apply for future). Please use language consistent with the rest of the app and targeted at Aussie family. Given default date is today and checkbox should be checked by default, the buttons will say "Mark Received", and clicking it will trigger the same Mark Received functioanlity - reuse (i.e., the allocation waterfall and screen for override) for that pay. If unchecked, the button will say "Setup Income". This will simply create a record and mark as Pending so it can be triggered manually from the List.
Ensure everything gets cleared when the user closes modal and changes tabs.
#### Expense
* When I pick  an Expense future dated I get this warning: "Scheduled for Payday Waterfall. This future expense bill will be included as an upcoming event in your payday allocation horizon." This does not make sense. Take it off. Instead, Instead, change the button from "Record Expense" in red to a more neutral "Setup Expense" or something to this effect.
When I pick  an Expense for today or past, use the button text "Mark Paid" for consistency. Use this as default since the Quick Expense opens with today's date as default. So "Record Expense" will never be used.
Ensure everything gets cleared when the user closes modal and changes tabs.
### Transfer
* Ensure everything gets cleared when the user closes modal and changes tabs.
* Use the newly design Pool/Category picked
* Change "From Category (Source)" to "From Pool (Source)" and To "Category (Destination)" to "To Pool (Destination)"

 

"
## "Pools"
* This is a broad instruction and I want you to apply your best UX and UI judgement rather than me telling you exactly what I want.
* Instead of the Categories as a column, I want to see Pool Types, Pools and Categories as hierarchies maybe each occupying one row, perhaps with a + sign to expand. For example

* So Fully collapse it might look something like this.
Pools & Categories | Bank Account | Current Balance | Target | Progress | History
▶ Everyday Pools (2) (+) {button to create New Pool with functionality as today} | - | $1000 | $800 | On Track | <blank>
▶ Bills Pools (2) (+) {button to create New Pool with functionality as today} | - | $10000 | $8000 | At Risk | <blank>
▶ Goals (4) (+) {button to create New Pool with functionality as today} | - | $100000 | $8000 | Shortfall | <blank>

* When opened one level
▼ Everyday Pools (2) (+) {button to create New Pool with functionality as today} | - | $1000 | $800 | On Track | <blank>
  ▶ Joint Everyday Pool {hyperlink to open Pool in Edit mode} (2) {number of Categories in Pool} (+) {button to create New Category within Pool with functionality as today} | Joint Bank Account {hyperlink go to open Bank screen as today} | $800 | $700 | On Track | History {hyperlink to History screen with functionality as today}
  ▶ Private Pool 🔒 {hyperlink to open Pool in Edit mode} (4) {number of Categories in Pool} (+) {button to create New Category as today}  | Personal Everyday Bank Account {hyperlink go to open Bank screen as today} | $200 | $100 | At Risk | History {hyperlink to History as today}
▶ Bills Pools (2) (+) {button to create New Pool with functionality as today} | - | $10000 | $8000 | At Risk | <blank>
▶ Goals (4) (+) {button to create New Pool with functionality as today} | - | $100000 | $8000 | Shortfall | <blank>
* opened two levels
▼ Everyday Pools (2) (+) {button to create New Pool with functionality as today} | - | $1000 | $800 | On Track | <blank>
  ▼ Joint Everyday Pool {hyperlink to open Pool in Edit mode} (2) {number of Categories in Pool} (+) {button to create New Category within Pool with functionality as today} | Joint Bank Account {hyperlink go to open Bank screen as today} | $800 | $700 | On Track | History {hyperlink to History screen with functionality as today}
    Groceries & Food {hyperlink to open Category in Edit mode} | - | -  | $260.00/month {nothing under it as $260 per month was entered - avoid duplication } | - | History {hyperlink to History screen with functionality as today}
    Fuel {hyperlink to open Category in Edit mode} | - | -  | $65/month {under it "$15 per week" in grey as this was entered and monthly was calculated} | - | History {hyperlink to History screen with functionality as today}
  ▶ Private Pool 🔒 {hyperlink to open Pool in Edit mode} (4) {number of Categories in Pool} (+) {button to create New Category as today}  | Personal Everyday Bank Account {hyperlink go to open Bank screen as today} | $200 | $100 | At Risk | History {hyperlink to History as today}
screen with functionality as today)
▶ Bills Pools (2) (+) {button to create New Pool with functionality as today} | - | $10000 | $8000 | At Risk | <blank>
▶ Goals (4) (+) {button to create New Pool with functionality as today} | - | $100000 | $8000 | Shortfall | <blank>
* I'm not wedded to this design since there will be lots of empty columns. If you can think of a better way to present this, I'm happy to hear it. Be critical. Discuss.
* Show Level 1 expanded by default and Level 2 collapsed by default.
* Number of pools under pool type or categories under pool in brackets like (2) when un-expanded is a proposal
* Why is the Target amount on some pools blank - they should all have a number. For Everyday/Bills - this is the sum of categories that make it up (and show it per month). Could be $0 if no categories. For Goal, this is explicitly entered.
* Discuss the "Prioritise this category when allocating income" - does this work? What does it drive?
* Discuss whether it is ok to allow users to change the target pool of a category (between Every & Bills) - what about one pool is linked to a private bank account and another to a shared? We stopped users from re-linking pools once linked.
* The Pool (level 2) can include a number in brackets indicating number of categories and a (+) button (just as we have today in the Categories column) so users can create new Categories under the Pool. This applies to Everyday and Bill Pools only since Goals pools don't have user-editable categories.
* Level 1 Amt fields will be a sum of Level 2 fields. Leave Level 1 Bank Account blank. Determine how best to roll up Pools to the Pool Type level for the Progress & Timelines Views. We need to be very deliberate and user-focussed in how we define On Track, At Risk and Shortfall carefully at each level, without overcrowding the table with colours, visuals, icons or badges to overwhem the user.

* Given this, we don't need a categories column any more.

Split the Pools table into three sections within the one table. No need for three different tables, we still only want one table in exactly the same format, but now introducing three section headers (effectively rows that span all columns) with "Everyday Spending Pools", "Bill Pools" and "Goal Pools" as section headings, allowing expand and collapse. Leave the table columns as is. No flashy icons, keep it very simple. So effecitvely, the first row in the table spans all columns and is called "Everyday Spending" and all the Pool Type Everyday follow as rows (just as is today in terms of formats and columns). They you'll see Bills row which spans all columns followed by all Bill Pool Type Pools, then the Goals row which spans all columns followed by all the Goal Pool Type Pools. You no longer need the badges All Sort will work within these groups  (i.e., sort within Everyday Spending, Bills, Goals). You should be able to expand and collapse these three sections. You can add little (i) icons next to them which explain using plain language targeted at an Aussie family what they mean in the context of the app.

### Pool/Category picker
* Change the design of the Picker to re-use a simplified version of the newly proposed redesign of the table in the Pools screen (the one with hierarchies opened with +). Keep the search. Remove the Pool Type filters as this is the first hierarchy of the table. Instead of all the columns, just create one column with Pool Type/Pool Name (3)/Category Name (3) {where the example 3 is the number of Pools in Pool Name or Categories in Pool for non-Goal Pools} ($443.43) {available balance}.

## "Income & Bill Management"
* Change tab name "Pending List" to "Upcoming" and "Allocate Pending Income" to "Allocate Income"

### Allocate Income (currently known as Allocate Pending Income)
* ▶🏦 Surplus Accumulator Pool - 
#### Payday allocation - bulk

### Upcoming (currently  known as Pending List)
* When I click on "Mark Received", it says it has been marked received, but nothing happens. What I'm expecting to see is the waterfall allocation flow, the same as when the button correspomding to that pay is clicked  in the Allocation Income tab. reuse all functionality.
* I was expecting to see present and past Income Events that are not marked Skipped or Confirmed. This seems to be the case with one-offs, but for recurring, it seems to be hiding past ones. Note that there might be a past expense or Income that I need to process. This screen should not filter out past ones, just confirmed and skipped ones.
* Instead of showing All Types as a drop-down, be consistent with the look and feel of the filters in the Pools screen where All | Everyday | Bills | Goals is shown.
* 

#### Individual Income/Expense - Edit Modal (new)
* Change "Assigned Pool" to "Pool"
* Archive link is not consistent with standard for Archive links
* Recurring - Allowing me to save 
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
* Move "Expected $10,000.00. Reconcile Available Surplus of $38,500.00" badge to Account Name and shorten (so "Reconcile Surplus/Shortfall of $xxx")
* Linked Pools - make the Pool Name a hyperlink that takes the user to the Pools screen with the Pool Name entered in to the Search tab so the screen is filtered. Do not refresh the whole app. Ensure re-use of similar functionality from the History -> Pool screen for example. Ensure text is highlighted on the search.
* Change "All Accounts" to "All Pools"
* Change 🔒 Private to 🔒 (and if user hovers, show "Private"). This applies every time 🔒 is shown across the app.
### Edit Modal 
#### Reconciliation
#### Linked Pools popup
* Allow Escape to close - this applies across the app.


#### Private Bank Accounts

### Bank Account & Statement csv Import
#### CSV Import Log
#### CSV Import Flow
##### Step 1
##### Step 2
##### Step 3

## "History"###
### Transactions
* for Transfers, where it shows for example "Emergency Reserve ➔ New Everyday", show both Pools/Categories as separate hyperlinks, with each hyperlink taking the user to the Pools screen, but with the clicked Pool/Category Name pre-entered in the search field (instead of the "From" field that is used currently).
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
* Allow the user to click on the Avatar itself and it can open a view where the user can alter the avatar (zoom/pan) - use the same view as when uploading an avatar but use the existing one and allow user to save or change image (upload another one) from here.
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
* Also recommend highly to the user that they Cancel and download their data first. Maybe link them to the screen where they can do this?

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



