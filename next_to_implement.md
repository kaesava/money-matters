




# Rules
* Strict adherence to AGENTS.md including no hardcoding of user facing literals, keeping FUNCTIONAL & Technical Specs md current, NO hardcoding user facing literals, vertical slice architecture, O dead/redundant tables/table fields/API code/UI code/capability code/other package code/etc, ensure UI elements, look-and-feel, colour, UI styling, etc is defined once and re-used, MECE principle for re-use of logic/screens/modals/etc., test cases coverage, etc.
* As you build code, you decide whether you want to run pnpm typecheck/lint/test/test coverage/i8ln-check/install/ for the modules you want. However, at the end, ensure pnpm validate runs successfully. Because pnpm validate is made up of multiple commands, just run the commands that failed sequentially until all of them pass, then try pnpm validate again. If it fails, repeat by running just the failed commands and then by running pnpm validate again. Once successful, commit code, but ask me before pushing the code.
* Output: Detail implementation plan - including db push for dev & prod and if any seed adjustment, then seed push to dev and prod.
* Ignore mobile app


# CHANGES - NOT DONE

## General
* For Amount fields, I can see the increment/decrement button on the left - move to the right. Also, the $ sign is falling off the field. Reserve some real-estate on the field for the $ sign (noting that it could be a different currency). Right now, it looks a bit cramped. Also, when the user clicks (or tabs or presses) an amount field, 
* Actoss the app, there are many instances of hyperlinks that direct the user to another screen with the record in context's name entered into the search. For example, clicking on the Pool Name in the History takes the user to the Pools screen with the Pool Name entered in the search. However, this seems clunky as there may be duplicates, it might search across another field, etc. Ideally, we want to limit to the selected record (by ID). Propose a solution, noting that the target screen may not have a drop-down filter to pick the record's ID so even if you filter, you need to think about how the user can easily undo the filter. Think carefully. Simple UX. Note that there are many such examples, I want you to go through EVERY single hyperlink and ensure you have applied this change across the board. Ideally, see if you can write once re-use.
* Ensure system errors are never shown to the user. You can log the error for now but show a user-friendly "Something went wrong" kind of error. Do this centrally not on every error. One example when this occurs (of course, this is an example, I might later introduce buggy code where I expect this generic message to still show): When I pick a Pool (happens if I pick a Category too) for an expense from the Pool Pickers and save, I get an error ("insert or update on table "transaction_ledger" violates foreign key constraint "transaction_ledger_category_id_categories_id_fk"").
* In some instances (like Income & Expenses screen), the tooltip (i) icon 
* We currently have a user setting in the app "Show icons". However, we've pretty much cleaned up all the icons in the app. Instead, change the setting to say "Show information icons" or something like that that is user-friendly. Then make every tooltip icon across the app show conditionally on that user setting being set. Default on seed and setup of new user is checked.

## Bank Accounts & Bank Account Reconoliation modal
* Disable user clicks on CSV Imports Log if there are no logs. When user clicks it, rather than opening a panel in the screen, open a modal to be consistent with the rest of the app.
* Edit Bank modal - Change "All Accounts" to "All Pools" and show the Pool picker (re-use code from the one used in the History view).
* New/Edit Bank Account modal - Change "Other / Custom Bank" to "Other" and for New Bank Account, don't default to any bank specifically (right now, it's picking Commonwealth Bank (CBA)).
* Right now, it is not clear to the user why the Bank Account reconciliation modal is there (and why the badge is there). Explain that the actual bank balance needs to align with the bank balance that the app is expecting based on the balance of all the pools linked to the bank account. In general, across the Billing Accunts screen and linked modals, use user-friendly lanuage - avoid overly technical or financial terminology like Reconciliation.
* When the user makes changes to the Bank account (for example to the Current Balance or Reserved amount or anything else for that matter) and Save Changes, ensure the record is saved and the Edit Bank Account closes, before launching (if needed) the reconciliation modal. The reconciliation modal only launches if the total available balance of all pools does not match the Bank Account amount available to budget). This is the same condition under which the reconciliation badge is shown in under Bank Account Name. Again, use user-friendly language. Note that the user can cancel to reconcile later.
* In the Bank Account Edit modal, should we show the Expected Bank Account Balance (based on the sum of the balances of linked pools), so the user knows that when they save changes, they will need to reconcile the difference?
* Bank Account reconciliation modal - The numbers shown  in the Expected Total and Available to Budget are wrong. In my example, I have 2 pools, one with $1,153.85 balance and one with $0 balance linked to a bank account. The bank account has $48,500.00 of which $47,000 is reserved, so only $1,500 can be used. The modal should say Expected total of $1,153.85 but is way off. Fix. The Available to Budget amount also I belive picking up the wrong field.
* Depending on shortfall or surplus, make it clear what is happening when they select Pools. Again, re-think the language used in this modal and in the Bank Account screen in general. Use (i) tooltips where appropriate and messages on the modal where appropriate.
* From the Bank Account reconciliation modal, I clicked on "Transfer funds between pools" link and executed a transfer. After closing the Transfer modal, the Pool balances are not updated automatically (without refreshing the whole page/app). Remember that I can setup a future transfer or cancel from the Transfer modal to return to the reconciliation modal.
* Reconciliation modal - check if there is an opportunity to align/re-use code with the "Mark Paid" modal that also requires showing Pools, albeit to pull money from rather than put money into.
* Once a Bank Account is saved as Private or Shared (Private unchecked), this field cannot be changed. Ensure this is the case. Include a message on the Edit Bank Account Modal to this effect next to the checkbox (similar to the message preventing a Pool's association with a Bank account in the Edit Pool modal). This will prevent accidental exposure of history, etc.
* Bank Account reconciliation modal - Fix the two "$$" in "Allocated Split Total: $48,001.00 / $48,000.00 ($$1.00 remaining)"

# Split Income
* When user clicks on Save either in the Split Income side drawer or the "Income Split" tab, bring up a Confirmation dialog (be consistent with others) to let the user know that when they save this, auto-calculation will be turned off for the Income and whatever was entered will be used. Use user-friendly language. They can Save or Cancel.
* When user clicks on Save either in the Split Income side drawer or the "Income Split" tab, bring up a Confirmation dialog (be consistent with others) to let the user know that when they save this, auto-calculation will be turned off for the Income and whatever was entered will be used. Use user-friendly language. They can Save or Cancel.
* When user clicks on UnSave either in the Split Income side drawer or the "Income Split" tab, bring up a Confirmation dialog (be consistent with others) to let the user know that when they unsave this, their manually entered amounts will be lost and auto-calculation will be turned back on for the Income. Use user-friendly language. They can Save or Cancel.

# Income & Expenses > Upcoming Expenses
* The column headers and columns don't match.
* I can see the Pool Name and Bank Account as two columns but also as badges. Instead of two columns, combine them into one column (POOL / BANK ACCOUNT), so Expenses & Transfers have Pools, Incomes have Bank Accounts. Make the field a hyperlink, so clicking a Bank Account takes the user to the Bank Accounts screen with the clicked Bank Account filtered and clicking on a Pool takes the user to the Pools screen with the clicked Pool filtered. . Apply the same patch needed for hyperlinks as dicussed in the General section in this prompt.
* The badges make it look cluttered. Remove the "Pending" badge. Remove the "Saved" badge from the Name (it's already shown in the last column). Given we have are introducing a Pools / bank account column, remove those badges.
* Put the Delete hyperlink to the right of the "Mark Spent/Run Splt/Transfer" hyperlink.

# Income & Expenses > Split Income
* Right now, the Split Income tab shows only Pending incomes. Instead, add a filter next to the All|Shared|Private filter with options All|Pending|Confirmed defaulted to "Pending".
* For Confirmed Incomes, hide the Save, Unsave & Delete hyperlinks, the amounts will be the actual confirmed amounts when the split was run.
* For Confirmed Incomes, when the user clicks on Review, open the Split Income side drawer in full read-only mode (i.e., they can Expand the Review Income but cannot modify any Income field, they cannot Delete, Save, Run Income Split or Unsave) and cannot edit all Pool amounts).
* Change "Show Full 12 Months (32 Income Events)" to "Show upto 12 months out"


# Income & Expenses > Setup > Add/Edit Expense Schedule
* In the Pool drop-down, show the Pool picker, with the ability to pick a Pool or a Category (similar to the Pool picker launched from the Quick Expense tab). Either way, a Pool Id is captured, but if they select a Category, a Category Id is selected too.

# Pools
* Projection Mode - when on, put a light watermark across the screen to let the user know that they are in Projection mode.

# Pool Picker
* The "All Pools" option should be on the top
* Currently, when a Pool Picker is launched with the ability to show & pick Categories (for example from the Quick Expense or Add/Edit Expense Schedule modals), it shows a + sign to expand a Pool. Instead, it should use the same expand/collapse UI as the Pool Type expand/collapse. Where the Pool Picker is launches with the ability to only pick Pools, this UI element is not available.


## Mark (Expense) Paid Confirmation Modal
* Move the "This transfer was scheduled in the past and has been moved to today." message to near the date field and change to reflect that the Transfer date that was previously scheduled for [date] has now been defaulted to today. This is because the user can change it to the future.
* Change "Total Allocated: $26,773.73" to include expected so something like "Total Allocated: $26,773.73 / $25,000"
* If there is insufficient funds in the pool and the list of Pools is shown, include the "Transfer funds between Pools" hyperlink - using the same look & feel and functionality as the Bank Account Reconciliation modal, with the fix requested as part of this prompt also applied. Re-use code as much as possible.
* Change "Sufficient pool balance available ($3,431.84). Click confirm to mark paid." to "Click confirm to draw fown from the Pool [pool name] (Current balance: $3,431.84)".

## Transaction Type
* We should introduce a History (Transaction) Type. There are many activities (some of which are Transfers, Income Split, Expense & Income confirmations, Bank Income) that result in transactions an in many places, we are polluting the name with the type. Propose a clean Transaction Type that gets sent on *every* creation of a transaction record (like Income Pool Topup, Income Account Adjustment, Transfer from, Transfer to, Expense, Direct Account Adjustment, etc.). This is not exhaustive. I expect you to come up with it. Be thorough. Be critical.

## Quick Transfer
* When I completed a transfer through the QUick Transfer, it said saved successfully instead of something like Transfer complete (it was not futre dated). If future dated, then saved successfully is correct.

## Quick Expense
* When I pick a Pool (happens if I pick a Category too) for an expense from the Pool Pickers and save, I get an error ("insert or update on table "transaction_ledger" violates foreign key constraint "transaction_ledger_category_id_categories_id_fk"").Fix this.

# Home
* CHange the Title font to something more beautiful 
* Remove all icons from the screen.
* In the Upcoming Expenses & Transfer table, make the Delete hyperlink less conspicious (consistent with other screens like the Income & Expenses > Upcoming tab > table). Remove the Overdue badge and instead, make the word "overdue" in bold. Change "Mark Paid" to "Mark Spent"
* In the Upcoming Income table, include a Delete hyperlink and make the word "overdue" bold to make it consistent with the Upcoming Expenses & Transfer table. Add a third line to each row - the Bank Account - and amount available to budget (to also bring it in line with the look and feel of the Upcoming Expenses & Transfer table).
* Change "Move Money" to "Transfer between Pools" - and use the same look-and-feel as other screens like the Pools screen
* Move the "Can I Afford it?" to be more conspicuous.
* Remove the "Edit" button (and ensure you cleanly remove all code for ALL linked functionality and UI) from both the Everyday and Bills & Committments Pools.
* Change "Bills & Commitments Pool" to "Bills Pool"
* 


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


################################# DISCUSS WITH AI AGENT (Gemini 3.8 High) - SCHEDULED

# SUBSCRIPTION

Do a thorough audit of the user's ability to subscribe.

Some questions for you to consder (however, I expect you to also do your additional critical analysis):

* Should the user be able to access /subscription/upgrade when not logged in? Right now, if I click Subscribe, it throws an error "⚠️ Multi-tenancy boundary isolation violation: Missing or invalid verified session tracking parameters.
". Also, there is a "← Home" link?
* We use Stripe to capture payments. What payment methods are available and should be reasonably available to launch in Australia? Are they setup? Are they setup correctly?
* Once I successfully pay for the subacription, do I get redirected correctly? Does the Trial badge disappear (and I am marked as a paying user in the backend)? Is this synchronous or asynchronous, and is the capability setup and setup correctly?
* When the user purchases, do we successfully cancel the trial?
* If I cancel or the payment fails, do I get redirected correctly? Does the Trial badge stay?
* When the user sets up a subscription, what is the trigger to withdraw the money in the next month/year (depending on monthly/annual)? Is this code setup? Do we need to pull money or will Stripe take care of it? * Does the system correctly handly recurring payments? What if they succeed? What if they fail?
* What happens if that subsequent payment is not made, or is made and failed or is made and successful? How do we know? Do we have the plumbing (callbacks/etc.) and the database updates in place to capture?
* How do we handle subscription cancellations? How do we communicate how we handle it and are they aligned? What are the rules? Is this implemented?
* Do we have the right tables in place to ensure that we capture what the user paid, when they paid, when they are covered up to, what plan they are on, when to expect the next payment, any stripe references to plan/schedules/items/subscriptions/customers etc. that's needed?
* Does the grace period for trial work? What happens if they go past? Does the functionality exist to manage this gracefully?
* If my trial period expires, am I still able to login and export my data? Am I prevented from doing anything else? Ideally, if they login successfully and their trial has expired, they should be taken to an isolated screen where the only thing they can do is download their data or Sign Out. They should not then be able to access the dashabord. Is this standard practice? If not, propose.
* Do we ensure the same tenant owner (by email) cannot keep setting up new tenants (cannot be the owner of more than one active tenant)?
* What notifications should we be sending? Are we sending? How can customers contact us for Subscription related queries? Are they clear?
* I assume this payment is against the tenant, which is linked to an app, so I'm paying for the app specifically?
* Is the Free Trial badge in the navigation correctly calculating remaining period? Currently, it is getting cut-off "✨ Free Trial (59... [Upgrade]" - keep it clean.


# IMPORT CSV

Do a thorough audit of the import csv capability. Right now, the UI is not consistent (for example, Step 2 has a card with a black background), the UX in Step 2 is extremely clunky (for example, if the user marks a record not to import and had accidentally selected it to apply a bulk action, they cannot unselect it!) and the functionally just incorrect (we should apply expenses to Pools or Categories not Pool Types). Further, there is a lot of complexity and I am not confident that it is built fully or correctly. I am tempted to remove it from V1 Scope. I want you to do a thorough analysis of this capability from multiple perspectives, code accuracy/completeness, code quality, functional correctness, UX,  and from a market perspective - desirability of this capability, noting that we don't expect users to micro-manage their expenses, so is there much value in it? Be critical. Be thorough. Make a recommendation.

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



