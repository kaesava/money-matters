# AGENT - In progress...

I am testing on-boarding and noted these changes:

## General
* Do a thorough audit of whether/how all fields in Step 3 are used and whether they take into account all the information that is available from ABS correctly, and whether they take into account everything that the user has answered. For example, Private Health cover is assumed for 5 people if there are 3 dependents, cap payments (rego, insurance, etc.) accounts for all cars, etc. Are there gaps/recommendations? This question is for discussion only. All other points in this prompt are for discussion and/or action. Are these correctly and fully represented in Step 4? Grill me if needed.
* Include more (i) information icons around "why" we are asking the user questions - for example, why are we asking the type of car. Decide where you think it needs to be added across all Steps. Keep the language targeted at the Aussie user.
* Call it a 3 step process and mark as Steps x of 3, 
* There is a lot of logic that goes into maintaining existing categories, amounts, etc. if the user is "re-doing" this workflow. For Release 1, I think it's risky. Can we disable it as a feature build for Release 2, and what do you recommend we do with code already written? I'm happy to delete. 

## Step 1
* Escape must cancel. However, if they cancel, it immediately brings them back to this screen. If the user has been presented this screen and chose not to proceed, they should not keep getting pulled back into this screen.
* Change "Interactive Budget Setup" to "Quick Setup of Pools"
* Change
Heading: "Welcome to Money Matters! Let's put your cashflow on autopilot ✨"
Text: "Traditional budgeting fails because spreadsheets force manual tracking. Money Matters automatically routes every paycheck through a 5-Step Payday Waterfall so your bills are paid, your savings grow, and your guilt-free spending is clear."
...to...
Heading: "Let's get you setup in no time."
Text: "Quiclly tell us what you're saving for, we'll estimate your bills & everyday spending with some simple lifestyle questions and you're good to go.
^ Do not this Heading & Text as is - Please paraphrase to be consistent with the app's vibe and Aussie audience, keeping the flow, etc.
* Keep "⏱ Takes Under 2 Minutes • No Math Required"

* Button "Continue to Lifestyle Questions" --> "Continue to Savings Goals"
* Change Income Source #1 to Income #1, etc.
* Include Anually as an option in the UI and calculations

## Step 2

* We moved away from monthly targets for Savings and Goals. Instead, we should be asking how much and by when. Assume they are all one-off.
* Remove the Custom Saving Goal icon as a drop-down. Remove from DB and API if it's there
* Change "Car Rego, Service & Tyres" to "New Car" -- the former is not a goal, it's bills.

## Step 3
* Why is Rent(Solo) and Share House separate for the purpose of calculating estimated spend and categories?
* Step 2 has so many icons, this one seems bare. Consider some in the UI. 
* Debt & Pets - seems like an odd pairing - should we combine to say "Other" and use the same formatting as Private Health Cover, etc. for: Active Debt Repayments, Pets (Dogs/Cats/Other), Charity Donations & Family Support
* Change " Incidental Buffer" to "Buffer"
* Checking the three boxes doesn't seem to be doing anything

Step 4
* Combine Steps 4 & 5 - show Step 5 Summary on top of Step 4 adapting to any changes user makes. Don't call this Step 4 - call it Summary
* Hover text in the i next to "Review your estimated Budget" is getting cut off. Also change the settings icon next to it to something more appropriate like a tick
* For the Savings & Goals Fund, it looks like you've estimated the monthly amount needed - call that out. It is ok, as long as it is not being used to calculate waterfall.
* "Designated Surplus Target" - is this still used in the app? If so, should we allow deletion of a category marked as designated target, or give the user the ability to change the designated surplus?
* Show Sub-totals under "Everyday Spending Categories", etc.
* When adding a custom Category, allow the user to change the frequency (/week, etc.) for Everyday Spend and Regular Bill. For Goals, get them to enter the amount and date (consistent with how Categories are usually created). The logic needs to be consistent with how Categories are usually created.
* When I clicked Save & Complete Setup, it immediately re-opened the flow, but when I said 
# WEB

## General

## "Accounts"



## "My Money"
## "Income & Bills"
## "Settings"


### Account Deletion

### Bank Account & Statement Import


# TEST
## Subscription
## Household Parnter
## CRON
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



