

### Payday
* Change "Payday" to "Setup Ins & Outs" or something similar and consistent with tone of the app. Applies to Menu and Page Title
* Change "Configure recurring paychecks, bonuses, utility bills, and fixed obligations in one place." to something more user-friendly - like "Setup upcoming paydays and upcoming expenses.".

* Split the table into two tables - "Setup Upcoming Income" and "Setup Upcoming Bills & Expenses"
* Move "Add Income Source" button nex to the first table and the "Add Expense Bill" button to the other table
* Rename "Add Expense Bill" to "Add Upcoming Expense" and "Add Income Source" to "Add Upcoming Income"
* Remove the Filter - won't be needed any more.
* Leave the Search - it should filter across both.
* Pagination should be repeated below each table
* Both tables should allow sort
* Add the Edit and Archive buttons to the popup when user clicks on the NAME. The Edit button will open the same Edit view and behave the same way - we are just moving the button.
* Remove the TYPE from the table.
* Change BUCKET / ACCOUNT to "CATEGORY" in the expense table and "Account" in the Incoming table.
* Honour the Settings > Icons switch in showing icons.
* When I click on a record, it pops up details including the burst out view for recurring.
* It's confusing that there are too many warning and signs - like the exclamation mark, 2026-07-01 (Overdue), Status: CONFIRMED, $5,200.00, CONFIRMED. Simplify.
* Make the burst items consistent with the Home screen. That is, show the item status if it is in the past (skipped, paid (expense)/received (income), overdue). Overdue meaning no action was taken. These should be treated exactly as in the Home page. That is: Show the "Mark Paid" button, allow the user to change amount and add the option to "Skip", next to "Mark Paid", show the due date date - and editable. If changed to a future date "Mark Paid" should change to "Save". When changed to today/a past date, change to "Mark Paid". Allow skip for all (past and future). When Marked paid, it generate a transaction just like in the Home screen.
* Remove Overdue tag - not sure what that means.

# AGENT - In progress...

# AGENT - To Do
### General
### Home page

#### Hero scorecard
* Allow the user to directly update the Everyday amount remaining.
* Instead of a donut, Re-consider the visual. Effectively, it needs to communicate the number of days left in the month, and the expected amount that should be remaining in the Everyday category type, showing whether the actual amount is over/under.
* The exact same visual must be shown for Bills, 
* For Bills too, the user must be able to directly update the Bills amount remaining.
* Once they confirm a change to the Evryday or Bills amount, assume a spend (if they reduced) or top-up (if they increased), create a transaction accordingly for Everyday or Bills pool with current date.
* Show this popup as a confirmation for the user to confirm or cancel. If they cancel, the amount they changed must revert. Allow the user to "Not show this again" - and save this as a user app preferences (jsonb). Ensure if checked, this transaction pops up. If not checked, no transaction pops up but it happens in the background.
* Ensure that the Everyday and Bills visuals are identifical in look and feel.
* For Goals, show the number that are behind, need attention, and are on track (stacked vertically), clickable to be taken to the Categories screen.

#### Bank Balances & Reconcile
* Rename to Bank Balances (section anme)
* The button next to each Bank says Reconcile, sometimes the button says Adjust. Always call it Adjust.
* The Everyday Pool, Bills Pool and Save For pool must all have a linked Bank account. Show the total of all of these that are linked to the Bank acocunt beind adjusted. For example, if the Everyday Pool only was linked to this bank account, show the total amount expected. Effectively, what we're trying to do is say that we expect a certain amount of money to be in the bank account based on the bucket balances.
* When the user changes the bank account amount, if the amount is different than the total of the category types linked to it, we need to adjust the category balances to reflect "reality".
* If only one category type was linked to it, then we need to create an adjustment only for that bucket. For example, if the bank account previously showed $1000, show this as read0only, and the user edits the actual bank balance to $1,200, and if the Everyday balance acoording to the budget is $1800, then we need to create a new Transaction to make up the difference. Show a user-friendly note - something along the lines of "Your Everyday Pool will be adjusted to reflect this amount". On Save, bring up the Transaction record (similar to if the user was adjusting the Everyday balance in the above section) showing the transaction details and allowing them to Confirm or cancel. Cancel will bring them back the Adjust screen for the selected account.
* If there is more than one category type linked to the bank account, assume an even split (i.e., if the actual bank balance is $900 and it islinked to all three categories, assume three transactions of $300 each). Allow the user to change the split but it must total the new bank balance. Integrate this logic when only one category exists (i.e., I don't want divergent flows)
* If one of the category types linked to the bank account is Save For, allow the user to select the "Save For" category to send the money to. They can only send it to one of them.
* show the original Balance as read-nly next to what they edit
* Change "Bank Balance Reconciliation" to "Adjust Bank Balance" and "Confirm Reconciliation" to "Confirm". Include a Cancel option consistent with other modals.
* Remove the Default Category. I realise there's a lot redundant code around default categories and category types. Get rid of all of this logic, db fields (if any), api, ui, etc. We don't need any default categories for anything.

#### Needs Attention section
* Change "Needs Attention" to "Have you paid these bills yet?"
* Allow the user to change amount and add the option to "Skip"
* Next to "Mark Paid", show the due date date - and editable. If set to a future date, change "Mark Paid" to "Save". When set to today/a past date, change "Mark Paid". When "Saved", it should not become a transaction. It should get removed from here.
* Remove Overdue tag
* Instead of "Short by", show the amount available "$0 available" along with Category Name, allowing user to click on Category name and be taken to the Categories screen with the category searched for
* If "Mark Paid" will take category to negative, how do we handle it?
* I assume these are upcoming payments where date is in the past

#### Quick Record section
* Remove "Quick Actions & Financial Tools"

* Remove ""Quick Record Expense Draw down" and "Quick Income Deposit / Credit" and instead change the Expense and Income buttons to "I spent.." and "I received.."
* When user selects "I spent..", make it really easy for the user to find a catory - so maybe they can start typing? Maybe the categories are categorised by "Everyday Stuff", "Bills" and "Saving For". While the transaction will show at the category level, the draw down will happen at the Everyday or Bills level (except for Saving For which happens at category level).
* When the user selects "I spent..", show the Category picker first (mandatory), and make the Expense Bill Name optional and default it to the Category Name and current month (like "Home & Contents Insutance Feb-26").
* When the user selects "I received..", show the Bank Name first (mandatory), and make the Income Source Name optional and default it to the Bank Name and current month (like "ANZ Feb-26").
* Remove the "set custom date" link. Instead show the date picker defaulted to today.

### Categories Screen
* Remove the cards at the top (Total Categories, On Track ,etc)
* Pacing Progress - not easy to read - show start and end of the month dates, current date and make it more untuitive to understand. Align with the Dashboard Home as above. If you have a better idea, discuss.
* When I go to Settings and disable icons, in the Categories & Savings Pool, I can see icons. Ensure that the settings is honoured across the app across all screens, modals, etc. across mobile and web. 
* Remove the "OVERALL POOL" and "PER-CATEGORY TARGET POOLS" banners.
* Don't show Archive option in the Categories list (actross all types). Instead, show it in the modal popup when a category is clicked.
* Instead of a separate Edit action in the Categories list across all types, allow the user to Edit the Category Name, Category Type and Monthly amount in the modal popup when the user clicks the Category hyperlink. Allow Save/Cancel. Ensure Category Name is unique. When saved, refresh the category lists (without refreshing the whole page).
* Remove "Recurring bill obligations. Individual categories set bill targets; managed at overall Bills pool level."
* Remove "Discretionary funds. Budgets set overall target; spent directly from overall Everyday pool."
* Create a filter group within Save Toward (Goals) (All | On Track | Needs Attention | Behind) ensuring you re-use  UI/UX from other screens.
* The floating + must identically replicate the I spent.. I received... functionality from the Home screen as above.
* Remove the Linked Bank Account from the New Category modal.
* When creating/updating a Category (applies when New Category button is pressed or when Editing a Category from the category link), allow the user to specify the amount along with the frequency (consistent with the onboarding flow). In the backend, you translate into a monthly amount, but store it as entered (i.e., if $120 was entered yearly, select $10 monthly in the backend but $120 yearly for edit).
* Save Toward - rename "Current Pool Balance" to "Current Balance".
* Save Toward table - allow sort on all fields.

#### Move Money
* Allow selection of Category Type, and if they select "Save For", then they select the Cateogy in both the From and To Categories.
* How are the 1-tap presets setup? Do they remember prior moves? Do they prioritise negative balances?

# Rules
* Always honour AGENTs.md rules
* Ensure FUNCTIONAL_SPECS and TECHNICAL_SPECs are kept up to date
* Always remove any redundant or unused code, db fields api routines, UI elements, labels, text, error messages, etc.
* Re-use and re-factor to re-use where possible.
* Don't make assumptions, /grill-me

### Sign-In page

## Web
### General
### Sign-In page

## Mobile
### General
Add Firebase to your Android app - https://console.firebase.google.com/u/0/project/money-matters-504311/settings/general/android:au.kaesava.moneymatters


# ME - To do...



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


## Due date vs Pay date - past vs future, recurring vs. target



# ME - Non-App To Do...

Register ABN as sole trader at business.gov.au (free, 10 min)
 Open dedicated business bank account (separate from personal)
 Create Stripe account at stripe.com, verify with ABN + bank account
 Create Products & Prices in Stripe Dashboard:
Money Matters Household — $9.99 AUD / month (recurring) → STRIPE_PRICE_MONTHLY
Money Matters Household — $89.00 AUD / year (recurring) → STRIPE_PRICE_ANNUAL
Founding Member — $69.00 AUD / year (recurring, limited coupon or separate price) → STRIPE_PRICE_FOUNDING_ANNUAL
 Configure Stripe Smart Retries (Settings → Revenue Recovery)
 Configure Stripe Customer Portal (Settings → Billing → Customer Portal → enable cancel, update payment)
 Register Stripe webhook endpoint: https://api.moneymatters.kaesava.au/webhooks/stripe
Select events: checkout.session.completed, invoice.payment_succeeded, invoice.payment_failed, customer.subscription.deleted, customer.subscription.updated
 Copy webhook signing secret → STRIPE_WEBHOOK_SECRET
 Add all Stripe env vars to Cloudflare Workers secrets (wrangler secret put)
 Add all Stripe env vars to GitHub Actions secrets (for CI)
 Create PostHog account at posthog.com (free tier is ample)
 Add NEXT_PUBLIC_POSTHOG_KEY to env

