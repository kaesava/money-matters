# AGENT - In progress...

## "Settings"
* I noticed there are a lot of "black background" button in Settings but not elsewhere. Unless there's an important reason (like the button is a deletion button), I want the look and feel of all buttons to be the same across the app (reuse UI where possible so less chance of definitions diverging).

### Profile
### My Details
* For Country dropdown in Mobile number, move New Zealand to just like any other country. You don't need to section it like "Featured/Local", just start with "Australia (+61)" (default) and then list all others. Also, when I selected Canada, it default to the United States! Fix.
* "Upload PNG, JPG, or WEBP up to 2MB": This will rarely apply - so don't include it here. If they try to upload a file that does not meet these requirements, you can shown an error around format and size.
* Upload avatar - allow user to zoom and centre, as most modern apps allow you to do when uploading an avatar so the user can decide the content to go into the box
### Household
* Household Profile & Location - section seems oddly formatted - doesn't take up the full width nor half - design properly.
* Country - move New Zealand like any other country ()
* You already have (i) next to Add a "Household Member" and "Household Members". Remove the sub-titles. In the "Add a Household Member" (i) - ensure you reference "household members" as they maybe family but may also not be - they may be housemates. This applies across the app. Ensure this is the case across the app.
* "Household Exit & Danger Zone" --> "DANGER ZONE" in RED with "Manager mem..." in (i) icon
* When I removed a member, I got no confirmation.
* When I tried to leave a Household - I got an obscure error - something about violating foreign keys. But when I attempted it again, it blew the user away from the users table instead of just removing their association. Please audit this code (to leave the household). This is incredibly important to get right.

_________


# Rules
* Strict adherence to AGENTS.md including no hardcoding of user facing literals, keeping FUNCTIONAL & Technical Specs md current, vertical slice architecture, test cases coverage, Remove redundant code, etc.
* Ignore mobile app for now
* NO hardcoding user facing literals
* NO dead code or table fields or API code or repeated UI/capability code. MECE principle.

# General
## Landing
* Ensure features list is still accurate

## Home
### New/Edit of Everday/Bills

## "Pools"

## "Income & Bills"
### List View
### Timeline & Grid
### Setup

## Bank Accounts
### Adding/Editing Modal:

## "History"###
### Transactions
### Allocation History

## "Settings"

### Profile
### My Details
### Household
* When I invite a household member, it says "Invite link created! Share URL: http://localhost:3000/invite/46649913-1e1b-4c85-af7f-8dbd35216b82". It's not clear if the user will receive an email or if I need to share the link with the user. Preference is the former, don't provide the link here - let them know that an email has been sent. Also, it will be good to include in the Household members list which household members have not accepted. If accepted, don't add anything, if waiting, maybe a badge indicating that the user has not yet accepted their invite?

### Account & Data
### Subscription
### Provide Feedback


## "Main Dashboard"


## Workflows

### Import CSV
IN PROGRESS
### Manually adjusting Bills or Everyday.
### Can I afford
### Sign-up - Google, Apple, Email/password
### Verify Password
### Sign In - different method to sign-up (Google after Email, Apple after Email, Email after Google, Email after Apple, etc.)
### Payday cascade
### User Account / Tenant Deletion
### Archive/Unarchive - feature by feature - Account, Category, Transaction(?), Income/Expense schedule, Income/Expense Item, Quick Add Expense/Income/Transfer, etc.
### Setup Flows
Does not include bank accounts - ok?
### Burst Event Regeneration
### Tenant Switching
### Account Reconciliation
### Notification Settings
### Subscription Upgrade, Pay, cancel
### Household Parnter Invitation & Acceptance
### Bank Account & Statement Import
### Stripe Payment Readiness
### Apple Sign in Readiness
### Private Bank Accounts, Private Categories
### Show/Hide Icon setting & implication
### Profile upload of Avatar






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



