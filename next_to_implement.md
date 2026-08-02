npx -y @posthog/wizard@latest self-driving



## Due date vs Pay date - past vs future, recurring vs. target


# For me to do

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

