

# AGENT - In progress...

Setup does not include bank accounts - ok?

# WEB

## General
* I'm still seeing dates like 2026-12-31 (for example: Pools > Savings > Target date). Ensure that across the app and all screens, modals, etc. dates are shown like 31 Dec 2026. Update any md file you need to so this is adhered to.
## "Pools"
* PENDING - Upcoming Coverae
### Activity
PENDING
### New/Edit of Everday/Bills
### Move Money

## "History"
DONE
## Accounts
### Adding/Editing Modal:
DONE
### Import CSV
PENDING

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



