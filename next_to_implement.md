

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
## UI COnsistency
### Tables - Sort, font, font size, header & item alignment, search, filters, pagination

## Setup Flows

## Landing

## Sign-Up
### Sign-up - Google, Apple, Email/password
### Verify Password

## Sign-In
### Sign In - field validation
### Email Sign in
### Google Sign in 
### Apple Sign in
### Apple/Google sign-in after Email login 


## Navigation
### Tenant Switching
### User and Sign out
### Provide Feedback

## Home
### Manually adjusting Bills or Everyday.
### Can I afford
### Quick Action (triggered from multiple places)
#### Income
#### Expense

## "Pools"

#### Pool/Category picker

## "Income & Bill Management"

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
* "Please enter a valid positive amount." - make this more user-friendly. All errors must be user-friendly.
* Don't allow one-off where date is blank. I noticed whern I left it blank, the system defaulted to previous date and accepted it. Show error.
* Don't allow recurring where start date is blank. I noticed whern I left it blank, the system reverted to previous date. Show error.
* Archive Schedule - seems a bit too conspicuous. Ensure consistency across all Archive links on Modals across the app. Maybe in grey? Ensure this is across the app and is defined once and reused. Codify in Agents.md/TECHNIVAL Specs. Don't assume coverage - actually check and ensure this change cascades everywhere .
* End date cannot be before Start date. It can be blank.
* Every N (units). It's accepting N if I enter 99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999. Be defensive about all numeric and text field lengths and limits. Apply across the app. Include in Agents.md. Build rule centrally so no code drift. Don't assume coverage - check everywhere. RIght now, I get ugly error message like "[ { "validation": "regex", "code": "invalid_string", "message": "Invalid", "path": [ "amount" ] } ]" when I tried this in the amount field but it accepted in the Every N (units) field.

#### Add/Edit modal - Bill Schedule
* Change "Assigned Pool" --> "Pool"
* Have a way of marking Pools as Private (if they are linked to a Bank Account that is Private) with an icon. This applies across the app where Pools are shown as drop-down or the Pool picker.
* Critical flaw - when I edit a record and save, it is creating a new one!! 

#### Add/Edit modal - Income Schedule
* When I leave Income Name blank, it gives me an error as I expect. However, the error is in ref bold on top. In other places, when I leave a mandatory field blank (like Quick Expense > Expense Name / Merchant), it shows a "Please fill in this field". Do a thorough review of the app and ensure that mandatory fields and fields that are badly formatted are handled consistently whether they are in a screen or modal or anywhere else they can be updated. Codify this in AGENTS.md. Be thorough, don't assume you have 100% coverage without checking across the app and apply the consistency fix throughout the app.

#### Setup One-off, Recurring - check Burst
#### Change Start/Frequency/End-date/Amount/Other - check re-burst
#### Delete - check event delete (archival)
#### Burst Event Regeneration (Check Transactions)

## Bank Accounts
* When I went to Bank Accounts, while it was loading, it did this really cool thing where a outline of the table fading in and out was shown briefly while loading. Was this intentional? Has this been build consistently? I loved it. Could we use this instead of the Loading when a table is being refreshed. When an entire screen is loading, etc. what we have is ok. I'm not 100% with this. So please be critical and suggest something else if you feel is recommended. Codify this in AGENTS.md and/or TECHNICAL_SPECS/FUNCTIONAL_SPECS md
### Edit Modal 
* When I associate a Pool with the Bank account by checking a box and Save, it is not saving the linkage. Other fields (like Private flag, Current Balance, etc.) are being updated.
* Change "Unbudgeted Buffer / Reserved Funds ($)" to "Reserved Funds ($)".
* Change "Funds held in this account that are reserved/earmarked and excluded from your budget (e.g. kids' offset savings, emergency buffer)." to "Reserved Funds are excluded from Budgeting".
* Some "Are you Sure" Confirmation screens look like browser generated (like when I try to Archive a Bank Account). Others we've designed explicitly, like when I try to mark a Bank Account as Private; "Marking this account as Private will hide it completely from your household partner, including its name, balance, and transaction history. Are you sure?". I like the latter. Can you please sweep through the code and identify any confirmations that look like the Archive ones and change them to use this format. Build once and re-use to avoid code drift. Consistency is important. Codify in AGENTS.md/TECHNICAL SPECS. Ensure coverage of this change across app (don't assme - check and make the changes)
* I thougth we introduced a mandatory (but does not drive functionality) field called Bank Account Type (like Savings,Credit, etc.) in the DB?? I beliebe there's a line in R2 Scope that talks about treating Credit accounts differently. Be consistent - either we expose it if is built in the database (mandatory, drop-down and shown in tables where Bank accounts are shown)or we remove it from code and push into R2 scope (and push code into the R2 scope md file fo rlater use).
* Add should work exactly as Edit (other than creating a new instead of editing an existing) - re-use fully.
### Private Bank Accounts
* Change from "Marking this account as Private will hide it completely from your household partner, including its name, balance, and transaction history. Are you sure?" to "Marking this bank account as Private will hide it completely from all other household members, including its name, balance, and transaction history. All Pools linked to this bank account will also become Private. Are you sure?"
* Change "Private Personal Account (Hidden from other users)" to "PRIVATE Account (Hidden from other users)".
### Bank Account & Statement csv Import
#### CSV Import Log
#### CSV Import Flow
* Make the modal wider so the table works
##### Step 2
* I feel we can simplifyt this whole screen significantly. Propose a radically simpler UX/UI without compromising on the core capabilities. I've identified a few issues, but I'm ok with your ground-up re-deisgn as long as the look-and-feel is consistent with other parts of the app.
* Change "Flip Target" to "Flip Income/Expense"
* When I selected lines and hit Exclude or Exclude an individual line, I am unable to unselect it manually and it stays selected. Further, Select All is selecting these too (it shouldnt). The Exclude/Include button should not be greyed out and the checkbox should still function as I should be able to Include these either individually or in bulk. If this is all confusing, propose an intuitive and simple solution.
* Change "Go"  to "Apply" next to Pools and "Include/Exclude" above the table.
* Make the Include/Exclude dropdown in each row a toggle button - Include becomes Exclude and vice-versa.
* If the table gets too wide, it needs a horizontal scroll bar. This is not ideal, but otherwise, its not functional.
* Remove all icons - it's very distracting
* If the user selects only credits, then perhaps Pools is greyed out, and if only debits, then bank accounts is greyed out?
* "MAPPED TARGET"" is very confusing. It needs to be Bank Account (Income) or Pool (Expense) - I realise this title would be too long - propose a better one.
* Blank background for the summary on top is a new theme - be consistent with the rest of the app.

### Account Reconciliation (Transaction flowthrough)


## "History"###
### Transactions
#### Table checks - Pool Filter, Sort, Pagination, Search, Fieds, etc.
* Include Pool in the Transaction list. Make it a hyperlink that takes the user to the Pools screen and ideally takes them to the Pool that was clicked and highlights briefly the Pool. Avoid reloading the entire app if possible.
* The Category field should be renamed to Pool and become a combination of Pool and Category (if one exists). Given Pool is mandatory in all transactions, this will always be there. If there is a Pool and Category, then show both. No icons. Something like "Joint Bills Pool > Internet". For transfers, only show the source and destination Pools.
* Show this new field left-aligned (both values and header) and not as badge but as hyperlink. If the Transaction only had Pool, the hyperlink takes the user to the Pools screen with the Transaction Pool briefly highlighted. If the transaction had a Pool and Category, then the user is taken to the Pools screen with the relevant Pool expanded and the Transaction Category briefly highlighted (highlighted could be fade in & out to direct the user's attention). For Transfers, the user is taken to the destination Pool. Avoid reloading the entire app where possible so the linking is as seamless as possible.
* Column headers are not correctly justified - Column values are correctly aligned. For example, Amount must be right-justified. Ensure this is done correctly. Ensure this is done centrally to avoid code drift in the future.
* In filters, Change "Spent" to "Expense" - we need to be consistent.
* In filters, Change "Transfers" to "Transfer" - consistent in being singular
* Sortable fields should be: Data, Description & Amount only
* Search should search across Description, Pool, Category, Amount or Date only
#### Export CSV
* Make the Export CSV a little less conscpicious - it's ok to stay there. Remove the icon.
* Ideally, when I click on Export, instead of starting the Export, the user must be shown the usual Folder/File selection box so the file can be saved to that location with that filename. This applies across the board everytime Export is used. Ensure this is coded once and re-used.
### Payday Allocations
* Change "Trigger" to "SOURCE" - this needs to be consistent across the app.
* Change MANUAL and AUTO badges not to be coloured - keep it consistent with Transactions.
* Sortable fields should be: Data, Description & Amount only.
* Search should search across Date, Description, Bank Account, or Amount (not Trigger) only.
* Ensure pagination exists (and look and feel should match Transactions)
* Show Bank Account left-aligned (both values and header) and as hyperlinkthat takes the user to the Bank Accounts screen with the Transaction Bank Account briefly highlighted (highlighted could be fade in & out to direct the user's attention). Avoid reloading the entire app where possible so the linking is as seamless as possible. Re-use functionality across the app where there are other similar hyperlinks.

#### Payday Allocation Details
* Remove all icons (Income & Bank)
* Show when the Allocation was made (different from whent he Income was received) and whether it was AUTO or MANUAL
* Show Bank Account that received the Income
* Given these would all have to have been confirmed, is it worth including the CONFIRMED badge - proposal is to take it out. These would all be confirmed payday allocations anyway.
* The Pool field should be a hyperlink that closes the drawer and takes the user to the Pools screen with the Allocation Pool briefly highlighted (highlighted could be fade in & out to direct the user's attention). Be consistent in UI across the app for similar functionality.


#### Export CSV
* Make the Export CSV a little less conscpicious - it's ok to stay there. Remove the icon.
* Ideally, when I click on Export, instead of starting the Export, the user must be shown the usual Folder/File selection box so the file can be saved to that location with that filename. This applies across the board everytime Export is used. Ensure this is coded once and re-used.

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
* Cannot archive a Bank Account that has Pending Income records against it. Cannot archive a Pool/Category that has a Pendig Expense/Bill record against it.
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



