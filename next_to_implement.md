# Rules
* Strict adherence to AGENTS.md including no hardcoding of user facing literals, keeping FUNCTIONAL & Technical Specs md current, NO hardcoding user facing literals, vertical slice architecture, O dead/redundant tables/table fields/API code/UI code/capability code/other package code/etc, ensure UI elements, look-and-feel, colour, UI styling, etc is defined once and re-used, MECE principle for re-use of logic/screens/modals/etc., test cases coverage, etc.
* As you build code, you decide whether you want to run pnpm typecheck/lint/test/test coverage/i8ln-check/install/ for the modules you want. However, at the end, ensure pnpm validate runs successfully. Because pnpm validate is made up of multiple commands, just run the commands that failed sequentially until all of them pass, then try pnpm validate again. If it fails, repeat by running just the failed commands and then by running pnpm validate again. Once successful, commit code, but ask me before pushing the code.
* Output: Detail implementation plan - including db push for dev & prod and if any seed adjustment, then seed push to dev and prod.
* Ignore mobile app


## Bank Accounts Screen
* The information (i) popup falls off the screen - fix
* Instead of "2 pools linked", maye we show the first two Pools that are linked (as hyperlinks that take the user to the Pools page with that Pool id queried), and with a "more" button if there were more than 3 linked, which would open the read-only modal that shows the Linked Pools (re-use existing)

## History screen
* Change from "About History & Allocations  A complete record of all your household spending and payday money moves." to "About History & Payday Splits    A complete record of all your household income, expenses and pool transfers as well as your income splits."
### History tab
* Show the Transaction Type (give it a friendlier name) as a column, allowing sort on it and remove the badge that says "Expense", etc from the Description. Ensure values like "TRANSFER_OUT" are translated into something more user-friendly.
* Pools drop-down - don't show the balance (make this a mandatory parameter to the Pool picker and update across the app all instances where it's called to either show or not show balance depending on the calling context)
* Remove the icon from Export csv
### Payday Allocation tab
* Change tab name from "Payday Allocations" to "Income Splits"
* Change "DATE" to "ICOME SPLIT DATE" and add another column which shows the Income date.
* Split the Income & Description columns into two columns (but only if they are different columns in the database) . For one of them, make it a hyperlink so when clicked, it opens the Details drawer (like the "View Details" button).
* Now that we have a way to open the Income Split details, remove the Actions column (which has the "View Details" buttons)
* Clicking the Bank Account hyperlink does not behave like other hyperlinks (which take you to the page with the pills, etc.) - fix
* Remove the icon from Export csv
* The Bank Accounts drop-down is not showing all Bank Accounts linked to the tenant (i.e., shared + private for the user).
#### Payday Allocation Details Drawer
* Change "Payday Allocation Details" to "Income Split Details"
* The header looks messy - make it look more beautiful

## Income & Expenses
### Income Split
* Change order of Pending/Confirmed/All to All/Pending/Confirmed and put a subtle "|" divider between the filter groups
### Upcoming
* Pool / Bank Account column - Remove all icons (I noticed icons for expenses). 
* For Expense events, remove the Bank account, we only need the Pool or Pool & Category name (noting that the expense could be linked to the Pool level or Category level)
* FOr Bank Accounts, make it a hyperlink, consistent with other hyperlinks that takes the user to the Bank Accounts screen with the Bank Account queried.

### Setup
* When I changed only the name of an expense, it warned me about applying the new amount to all unconfirmed future events. I am guessing the logic tests changes to name or amounts (these don't have to change schedules) - ensure the message reflects this correctly. Also, I was expecting any deleted events to remain deleted because we shouldn't be re-creating events based on the schedule (unless the schedule fields - like start date, end date, frequency, etc. change).


## Mark Spent modal
* Show a header section that shows the Pool/Category and Current Balance for the Pool (readonly) and for the green confirmation meessage (when there is sufficient balance), don't include these details, so say something like "Click confirm to draw down from the Pool" or something to this effect (user-friendly). Similarly, where there is not sufficient balance, remove these details, so something like "The Expense cannot be paid as the Pool is short $116.24. Select other Pools to transfer funds from before proceeding". This is because the header section shows the Pool/Vategory and Current Balance for the Pool.
* Why are the "Confirm Transfer and Mark Paid" button (when Pools is insufficient) and "Mark Paid" (change to "Mark Spent") button (when pool is sufficient) disabled by default. It seems like only when I change the date, it becomes enabled? Oh, I think I know. I can see a message "The expense date previously scheduled for 2026-09-11 has now been defaulted to today." for past expenses. It's the other way around. When a future date is attempted to be Marked Paid, the date must change to today with this message. But we should allow past dates to be marked Paid.
* Change button label from "Mark Paid" to "Mark Spent"

## Settings
### Data & Subscription

* These two sections ("Aussie Privacy & Security Guarantee" & "Data Sovereignty & Zipped CSV Backup") have a different width to the first section.
* Also, the information doesn't seem to flow. We already have a Privacy policy. And the wording around RLS stealth is useless to the user. Re-think the UI for these two section - perhaps merge and be clear on why we are showing this information here - perhaps we check if the Privacy page needs an update and link to it instead? Clean up.
* We still want the ability for the user to download a complete zipped CSV archive of EVERYTHING that belongs to their tenant/private user id.
* Ensure wording across the app doesn't reference payday allocations but rather, Income splits
* When user has not purchased a subscription, change "Subscribe to Household" to something that asks them to get the full version - be consistent with the wording in the dashboard navigation bar. The wording needs to be consitent - are we calling it Trial vs. Premium or just Trial vs. "Household Plan"?


## Quick modal (One-Off Expense)
* For all three tabs, the (i) tooltip is getting cut off. Re-word carefully to be consistent with the expected functionality and agreed terminology and be user-friendly/
* Allow user to pick a Pool or Category for an expense.
* In the Expense tab, when I future-date, change the button label from "One-off Expense" to "Save Only".
* For Transfer, change future dated button label from "Setup Transfer" to "Save Only" and for today's as "Transfer"
* For Income, change "Save hyperlink" into a more subtle button that say "Save Only"
* Remove all icons except for QUick Picks across the modal (all three tabs)
* Quick Picks says most Frequent - is this right - I assumed it was a combination of 3 most recent + 3 most frequent. For most frequent, I'm not sure the code is correct. The calculation would need to be much more complex as we'd need to consider all of them (or at all within the last say 3-6 months) and then pick the most frequent not taking into account the amount (i.e., expense $5 coffee and expense $3 coffee should both be counted when calculating frequency), and account for transfers, income & expense events in the History. Review code - make a recommendation.

## General
* In all screens (Pools, History > History, History > Payday Allocations, etc) - show the pill between the search bar and the table, not above the (where the user was taken to that screen by following a item hyperlink). Also, if the user got to that screen by entering an invalid or archived or outside their RLS scope id of a filter item - instead of showing nothing, show the full table and still show the pill, but a generic message to say the item cannot be filtered.
* In all tables/modals/screens with hyperlinks  that link to other, include a subtle 
* Put a subtle "|" divider between the filter groups - applies on all screens where there is more than one filter group
* Whe a confirmation modal (or secondary modal) is launched from a modal (like Mark Paid), ensure that the escape key works on the outer-most (i.e., secondary) modal. Applies across the app.



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

Bank Account & Statement CSV Import (REMOVED FROM V1 - DEFERRED TO V2: see V2_SCOPE.md)
CSV Import Log (DEFERRED TO V2)
CSV Import Flow - Step 1, Step 2, Step 3 (DEFERRED TO V2)



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

### Bank Account & Statement CSV Import (REMOVED FROM V1 - DEFERRED TO V2: see V2_SCOPE.md)
#### CSV Import Log (DEFERRED TO V2)
#### CSV Import Flow (DEFERRED TO V2)
##### Step 1: Upload (DEFERRED TO V2)
##### Step 2: Review & Allocation (DEFERRED TO V2)
##### Step 3: Confirmation (DEFERRED TO V2)


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
 Bank Balance Alignment: Open Bank Account Reconciliation modal -> enter actual balance -> verify variance adjustment transaction created.
 Transaction History & Export: Filter by date/category -> export CSV -> verify downloaded file integrity.

### Phase 4: Multi-Tenancy & Billing
 Partner Invites: Send invite from /dashboard/settings -> accept link /invite/[token] in incognito window -> verify second user sees shared tenant.
 Tenant Isolation (RLS): Attempt cross-tenant query -> verify PostgreSQL RLS blocks unauthorized access.
 Stripe Upgrade (/subscription/upgrade): Upgrade to Household plan using test card -> verify status updates to ACTIVE and /subscription/manage opens Customer Portal.

### Phase 5: Mobile Offline & Native UX
 Offline Mode: Enable Airplane mode -> view categories & transactions via local SQLite cache. Re-enable network -> verify sync.
 Quick Expense Modal: Add transaction via native numeric keypad -> verify smooth modal dismissal and list update.



