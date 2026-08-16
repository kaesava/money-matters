# Money Matters — Production Manual Verification & E2E Testing Protocol

> **Target Environment:** Web (`apps/web` on `http://localhost:3000`) & Fastify API Worker (`apps/api` on `http://localhost:3001`).  
> **Testing Scope:** 12 Core User Journeys, Form Validations, Edge Cases, and Multi-Tenant Isolation Boundaries.

---

## 1. Automated Playwright Suite Execution

To run the Playwright browser test suite against your running local server:

```bash
cd apps/web
pnpm test:e2e
```

---

## 2. 12 Core User Journeys Verification Matrix

| # | User Journey / Screen | Target Route | Critical Fields & Controls | Expected Outcome | Status |
|---|---|---|---|---|---|
| **1** | **Landing Page & SEO** | `/` | OpenGraph tags, JSON-LD scripts, Get Started CTA button | Hero renders correctly, CTA routes to auth/setup | `[✓] PASS` |
| **2** | **Sign In & Authentication** | `/sign-in` | Email input, password input, Google OAuth button, redirect URL | Authenticates user and sets session cookie | `[✓] PASS` |
| **3** | **Forgot & Reset Password** | `/forgot-password`, `/reset-password` | Email input, token validation, new password, confirm password | Sanitizes URL redirect targets (`moneymatters://*`) and resets password | `[✓] PASS` |
| **4** | **Interactive Setup Wizard** | `/setup` | Incomes array, housing type select, vehicle sliders, kids stage, category targets | Calculates ABS/RACQ estimates, prevents negative numbers, creates categories | `[✓] PASS` |
| **5** | **Re-Run Budget Setup** | `/setup?mode=rerun` | Current caps comparison, revised targets, `BudgetImpactReviewModal` | Previews net pool impact and invokes backend `reSetupBudget` capability | `[✓] PASS` |
| **6** | **Dashboard & Hero Donut** | `/dashboard` | Dual-arc SVG donut ring, due-date shortfall amber card, quick expense drawer | Renders month progress vs spend pace, alerts if 14-day bills short | `[✓] PASS` |
| **7** | **Bank Accounts Management** | `/dashboard/bank-accounts` | Bank institution select, account name, balance, unbudgeted buffer, category link checkboxes | Calculates available-to-budget balance (`balance - buffer`) and warns on pool transfer | `[✓] PASS` |
| **8** | **Category Pools Management** | `/dashboard/categories` | 3 pool sections (Everyday, Bills, Goals), search bar, target edit modals, Move Money modal | Enforces 1 surplus target requirement; blocks active surplus category archival | `[✓] PASS` |
| **9** | **Income & Bills Schedule** | `/dashboard/income-and-bills` | Income sources table, expense sources table, upcoming events calendar, paid/skip toggles | Displays burst dates and allows status updates | `[✓] PASS` |
| **10** | **Bank CSV Import Engine** | `/dashboard/transactions` | File upload dropzone (CBA, Westpac, ANZ, NAB, ING, Macquarie), column mapping, review table | Validates 2MB cap, flags duplicate idempotency keys, bulk inserts in 200-item chunks | `[✓] PASS` |
| **11** | **Payday Allocation Cascade** | `/dashboard` (Payday Trigger) | Paycheck amount input, receiving bank account, 5-step waterfall preview, Osko/PayID transfer card | Generates 1-tap transfer plan card with Copy Amount buttons | `[✓] PASS` |
| **12** | **Settings & Data Governance** | `/dashboard/settings` | Notification toggles, partner invite email input, CSV zip export button, delete account CTA | Exports CSV data zip; dispatches Inngest background event (`user/account.delete-requested`) | `[✓] PASS` |

---

## 3. Security & Multi-Tenant Edge Cases Checklist

- [x] **CSRF Proxy Defense**: Direct cross-origin `POST` requests from unauthorized origins return `403 Forbidden`.
- [x] **Rate Limiting**: Burst requests (>120 req/min) return `429 Too Many Requests`.
- [x] **File Notes IDOR**: Requesting pre-signed S3 download URLs for another tenant's `fileKey` returns `400/403`.
- [x] **Read-Only Past-Due Tenant**: Tenants in past-due grace period can view dashboard but mutation calls trigger `403 FORBIDDEN (subscription_read_only)`.
- [x] **Zero-Categories Guard**: Accessing `/dashboard` with 0 active categories automatically redirects to `/setup`.
