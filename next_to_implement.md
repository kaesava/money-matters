# AGENT - In progress...

# AGENT - To Do
### General
* Stripe
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

