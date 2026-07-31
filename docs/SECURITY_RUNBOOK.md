# Money Matters — Security & Operations Runbook

> **Version:** 1.0.0  
> **Last updated:** 2026-08-01

---

## 1. Production Credential Rotation Runbook

If any `.env` file or secret token is exposed or requires scheduled rotation:

### 1.1 Neon PostgreSQL Password Rotation
1. Log into [Neon Console](https://console.neon.tech).
2. Select `money-matters-production` project -> **Settings** -> **Database Passwords**.
3. Click **Reset Password** for the application user.
4. Copy new `DATABASE_URL`.
5. Update Cloudflare Worker secret:
   ```bash
   pnpm --filter @money-matters/api exec wrangler secret put DATABASE_URL
   ```
6. Update GitHub Actions secret `DATABASE_URL`.

### 1.2 Inngest Signing & Event Key Rotation
1. Log into [Inngest Cloud](https://app.inngest.com).
2. Navigate to **Manage Keys** -> **Rotate Event Key** & **Rotate Signing Key**.
3. Update Cloudflare Secrets:
   ```bash
   pnpm --filter @money-matters/api exec wrangler secret put INNGEST_EVENT_KEY
   pnpm --filter @money-matters/api exec wrangler secret put INNGEST_SIGNING_KEY
   ```

### 1.3 Resend API Key Rotation
1. Log into [Resend Dashboard](https://resend.com/api-keys).
2. Create new API Key `moneymatters-prod-v2`. Delete old key.
3. Update Cloudflare Worker secret:
   ```bash
   pnpm --filter @money-matters/api exec wrangler secret put RESEND_API_KEY
   ```

---

## 2. Cloudflare WAF & Bot Management Configuration

To protect `api.moneymatters.kaesava.au`:

1. **Rate Limiting Rule**:
   - Path: `/trpc/*`
   - Threshold: 100 requests per 1 minute per IP address.
   - Action: Block for 10 minutes.
2. **Bot Management**:
   - Enable **Cloudflare Bot Fight Mode** (Super Bot Fight Mode).
   - Block automated scrapers and malicious user-agents.
3. **CORS Restrictions**:
   - `Access-Control-Allow-Origin`: `https://moneymatters.kaesava.au` only.

---

## 3. Database Migration Hook

Database migrations are executed via GitHub Actions prior to Worker deployment:
```yaml
- name: Run Drizzle DB Migrations
  run: pnpm --filter @money-matters/db db:migrate
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```
