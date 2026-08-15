# AGENT - In progress...



# WEB

## General
* The app is live but I'm still testing it. I want to keep the landing page, but block the user from registering/logging in. However, I want to easily be able to turn on/off a flag as the developer to turn on/off the sign-up and sign-in capability (which will unlock the rest of the app), for example to test in production. How do I do this?

## "Accounts"
* Be consistent with Everday, Bills, Goal - across the app - I can see Savings Goal, Save Towards, etc all over the app. Be consistent.
* Ensure that a Category type can only be linked to one Bank account. If I try to link it to another, warn the user and if the user saves, unlink from previous bank account at the same time you link to the current one (atomic)
* Import CSV should auto detect Bank based on Account Bank selected.



## "My Money"
## "Income & Bills"
## "Settings"


### Account Deletion

### Bank Account & Statement Import


# TEST
## Household Parnter
## CRON
## REGULAR vs Bills
## Burst Event Regeneration
## Tenant Switching
## Scheduled Notifications
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



