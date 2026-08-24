

# AGENT - In progress...

Setup does not include bank accounts - ok?

# Rules
* Strict adherence to AGENTS.md including no hardcoding of user facing literals, keeping FUNCTIONAL & Technical Specs md current, vertical slice architecture, test cases coverage, Remove redundant code, etc.
* Ignore mobile app for now

## General
* I'm still seeing dates like 2026-12-31 (for example: Pools > Savings > Target date). Ensure that across the app and all screens, modals, etc. dates are shown like 31 Dec 2026. Update any md file you need to so this is adhered to.
* On All tables in the app, allow the user to resize column widths. Start with reasonable relative widths for all of them - applies to all tables across all screens. Ensure code is written once and re-used.
* In the Quick Add "last 3" Pickers, don't include Payday allocations and Everyday/Bill Adjustments (when users directly updated balance).

## "Pools"
* PENDING - Upcoming Coverae
### Activity
### New/Edit of Everday/Bills

## "History"
DONE

## Bank Accounts
* In the Income & Bills search bar and History search bar, when you type, an x appears for the user to clear the search. Good. However, this is not happening with Bank Accounts search bar. Ensure this is built once and used consistently across the app - including icons, functionality, look and feel, etc. 
* Remove the (i) from the column headers - they don't look good and aren't adding value
* Instead of "Each category pool (Everyday, Bills, Goals) must be linked to a bank account for waterfall payday routing.", make it more functional on why we are asking the user to do this. That is, it will make it easier to reconcile to ensure the app is accurately tracking to reality - of course, use language consistent with the app and targeted to Aussie audience, and not necessarily the tone/language I'm using here with you.


### Adding/Editing Modal:
### Import CSV
* Don't allow creation of new Categories from here. Remove all redundant code.
* When I enter a filter amount and search, then select All, it should only select all among the filtered list. Make sure the Select All and unselect All works intuitively.
* I understand there are rules to map items to specific categories based on text. Remove this capability entirely as it will only produce friction and hardcode when we don't actually know if the user will change category names, etc. Also, don't need to assign to specific categories. Allow assignment to Pools instead. Ensure the Flip Debit/Credit works only on selected items (so no selection means can't flip).
* Review how duplicates are managed - they need to be same date, same amount, same description.
* What does Status mean?

## "Income & Bills"
* Once a Bill is marked Paid (whether one-off or one of the burst items in a recurring series), it cannot be edited; similar with one-off Income Allocated.
## "Settings"
## "Main Dashboard"

### Manually adjusting Bills or Everyday.

## "Pools"






### Main Setting page


## Workflows
### Can I afford
### Payday cascade
### Account Deletion
### Archive/Unarchive - feature by feature - Account, Category, Transaction(?), Income/Expense schedule, Income/Expense Item, Quick Add Expense/Income/Transfer, etc.
## Setup
## Burst Event Regeneration
## Tenant Switching
## Notification Settings
## Subscription Upgrade, Pay, cancel
## Household Parnter Invitation & Acceptance
### Bank Account & Statement Import
## Stripe Payment Readiness
## Apple Sign in Readiness
## Private Bank Accounts, Private Categories
## Icon setting

# TEST

 Configure Stripe Smart Retries (Settings → Revenue Recovery)
 Configure Stripe Customer Portal (Settings → Billing → Customer Portal → enable cancel, update payment)


## Web App
# AGENT - To Do

# ME to Do (AI to ignore)

## App Shakeout & QA Task List (Web & Mobile)

### Phase 1: Authentication & Onboarding
 Sign Up / Sign In: Register new account on Web (/sign-up) and Mobile. Verify redirect to /setup. Test invalid password & duplicate email edge cases.
 Session Persistence: Refresh Web browser / restart Mobile app -> verify user stays logged in via session cookie/SecureStore.
 Onboarding Quiz (/setup): Complete 4-step wizard (Household, Income, Categories, Bank Accounts) -> verify 5-step waterfall allocation initializes category balances.

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



