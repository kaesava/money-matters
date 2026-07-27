# Money Matters — MVP Readiness Gap Analysis

> **Scope**: Release 1 only. Release 2 (AI allocation, Open Banking CDR, offline-first sync) is excluded.
> **Reference documents**: `implementation_plan.md`, `market_analysis_and_recommendations_results.md`, `FUNCTIONAL_SPEC.md`, `TECHNICAL_SPEC.md`, `APP_DESCRIPTION.md`, `V2_SCOPE.md`, live codebase survey.
> **Assessment date**: 2026-07-26

---

## Executive Summary

The codebase has a **technically solid foundation** — the 5-step waterfall engine, multi-tenancy, platform parity, and schema design are well-executed. However, there are **3 blocking gaps** (security/production setup) and **4 major functional gaps** that would cause early user abandonment if launched today. Several implementation plan phases have been partially executed but not fully completed.

---

## Part 1: Implementation Plan — Phase Completion Status

| Phase | Description | Status | Key Gaps |
|-------|-------------|--------|----------|
| **Phase 1** | Dead Code & Redundant Capability Removal | ⚠️ **Partial** | `geo/` capability still present, `money/` capability likely still present; stale `MAJOR`/`RECURRING` enum in mobile setup still in code |
| **Phase 2** | Onboarding Overhaul (2-Step Instant Value) | ⚠️ **Partial** | 2-step setup screen exists in both platforms but mobile still references old enum values (`MAJOR`/`RECURRING`); `configure.tsx` and `bank-accounts.tsx` setup screens may still exist |
| **Phase 3** | Dashboard Simplification (Hero Card + Attention Items) | ✅ **Mostly Done** | `DashboardHeroCard.tsx` and `AttentionItemsList.tsx` components created; "All Upcoming" removed from mobile home (done this session); hero card and attention items wired on web and mobile |
| **Phase 4** | Smart Notifications (6 core types) | ✅ **Done** | All 6 Inngest notification functions implemented and wired; notification preferences in `user_preferences` table; settings UI exists |
| **Phase 5** | Partner Invite MVP | ✅ **Done** | `invitePartner`/`acceptInvite` commands in `@money-matters/capability-tenant`; invite page at `/invite/[token]` on web; settings UI available |

### Phase 1 Specific Outstanding Items

- [ ] `packages/capabilities/geo/` — verify deleted (plan calls for full deletion)
- [ ] `packages/capabilities/money/` — verify deleted (plan calls for full deletion)
- [ ] `apps/api/src/routers/geo.router.ts` — verify deleted
- [ ] Mobile setup `categories.tsx` — still uses `MAJOR`/`RECURRING` enum values (data integrity bug)
- [ ] `apps/mobile/src/app/(setup)/configure.tsx` — verify deleted
- [ ] `apps/mobile/src/app/(setup)/bank-accounts.tsx` — verify deleted

---

## Part 2: Market Analysis Recommendations — Delivery Status

| Gap # | Recommendation | Priority | Status |
|-------|---------------|----------|--------|
| **#1** | Instant-Value 2-Step Onboarding | 🔴 P0 Critical | ⚠️ Partial — setup screens restructured but enum bug in mobile |
| **#2** | Bank CSV Import (Big 4 AU banks) | 🔴 P0 Critical | ❌ **Not built** — explicitly deferred but market analysis flags as V1 must-have |
| **#3** | Partner Invite MVP | 🟡 P1 High | ✅ Done |
| **#4** | First-Week Guided Experience + AU Templates | 🟡 P1 High | ⚠️ Partial — templates in `AUSTRALIAN_FAMILY_PRESETS` types; first-paycheck walkthrough not implemented |
| **#5** | Simplified Dashboard (3-second glance test) | 🟡 P1 High | ⚠️ Partial — hero card done; "Can We Afford This?" still a dashboard card, not moved to Quick Actions |
| **#6** | Smart Notifications (6 types) | 🔴 P0 Critical | ✅ Done |
| **#7** | Simplified Reconciliation (one-tap flow) | 🟢 P2 Medium | ❌ Not built — still requires multi-step modal |
| **#8** | Spending Insights + Velocity Warnings | 🟡 P1 High | ❌ Not built — flat ledger only, no trend analysis |
| **#9** | Deep AU Financial Integration (quarterly smoothing, proration) | 🟢 P2 Medium | ⚠️ Partial — schema supports it, UI doesn't surface it prominently |
| **#10** | Positive Reinforcement & Micro-Celebrations | 🟢 P2 Medium | ❌ Not built |

### Quick Wins from Market Analysis Appendix

| Quick Win | Status |
|-----------|--------|
| Default Quick Actions to collapsed on mobile | ✅ Done |
| Auto-select "Everyday" category in Quick Expense | ❌ Not verified |
| Show "days until next payday" on hero card | ✅ Done |
| Swipe-to-mark-paid on upcoming events (mobile) | ❌ Not built |
| Format amounts with `$` prefix in input fields | ❌ Not verified |
| Haptic feedback on successful transaction | ❌ Not built |
| Pre-fill today's date in date pickers | ❌ Not verified |
| Running Everyday balance after expense entry | ❌ Not built |
| Category colour dots next to transaction entries | ❌ Not built |
| Undo toast after recording expense | ❌ Not built |

---

## Part 3: Go-Live Blockers (Must Fix Before Launch)

These are **hard blockers** — the app cannot responsibly go live with any of these outstanding.

### 🔴 BLOCKER 1 — Secrets Committed to Version Control

**Severity**: Critical Security

The `.env` file is committed to the repository with **live production credentials** in plaintext:
- Production Neon database URL (with username/password)
- Inngest signing key and event key
- Resend API key
- Cloudflare R2 access key + secret

**Risk**: Anyone with repository access can access the production database, send emails as the app, and read/write file storage.

**Fix required**:
1. Rotate ALL credentials immediately (Neon, Inngest, Resend, Cloudflare R2)
2. Remove `.env` from version control — add to `.gitignore`
3. Move secrets to a secrets manager (GitHub Actions secrets, Doppler, AWS Secrets Manager, or Vercel/Fly.io environment variable injection)
4. Provide a `.env.example` with placeholder values only

---

### 🔴 BLOCKER 2 — No CI/CD Pipeline

**Severity**: Critical Operational

There is **no automated CI/CD pipeline** — no GitHub Actions, no GitLab CI, nothing. This means:
- No automated test runs on push
- No type checking enforcement before merge
- No lint enforcement
- Manual deployments only
- No rollback strategy

**Fix required**:
1. Create `.github/workflows/ci.yml` with: lint → typecheck → test on every PR
2. Create `.github/workflows/deploy.yml` for production deploy on `main` merge
3. Enforce branch protection rules — PRs must pass CI before merge

---

### 🔴 BLOCKER 3 — No Deployment Configuration

**Severity**: Critical Operational

There is no `Dockerfile`, `fly.toml`, `vercel.json`, `render.yaml`, or any infrastructure-as-code. The app cannot be deployed to production without manual server setup.

**Fix required** (pick a platform):
- **API** (Fastify): Fly.io or Render with a `Dockerfile`
- **Web** (Next.js): Vercel (simplest — zero config needed beyond project setup) or self-hosted
- **Mobile**: Submit to App Store / Play Store (requires Apple Developer + Google Play accounts)
- Add deployment config files to the repo

---

### 🔴 BLOCKER 4 — No Web App Server-Side Auth Guard

**Severity**: High Security

The web app has **no `middleware.ts`**. Dashboard routes (`/dashboard/*`) are not protected server-side. Auth is checked client-side only via `localStorage.getItem("session_token")` in a `useEffect`. This means:
- Server-rendered HTML shells of dashboard pages are served to unauthenticated users
- Direct URL navigation to `/dashboard` works without login (until client hydrates)
- SEO crawlers and bots can index dashboard pages

**Fix required**:
```typescript
// apps/web/src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("session_token");
  if (!token && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/setup/:path*"],
};
```

---

### 🟡 BLOCKER 5 — CORS Is Wildcard (`origin: true`)

**Severity**: High Security

The API CORS config allows **all origins**. Any website can make credentialed cross-origin requests to the API.

**Fix required**:
```typescript
// apps/api/src/index.ts
fastify.register(cors, {
  origin: [
    "https://money-matters.app",        // production web
    "https://staging.money-matters.app", // staging
    process.env.NODE_ENV === "development" ? "http://localhost:3000" : false,
  ].filter(Boolean),
  credentials: true,
});
```

---

### 🟡 BLOCKER 6 — Rate Limiter Is In-Memory Only (`mockMemoryStore`)

**Severity**: Medium-High Reliability

The rate limiter uses an in-memory JS object internally named `mockMemoryStore`. On API restart, all rate limit state resets. With multiple API instances (horizontal scaling), rate limits are per-instance, not global — a user could hit 10 instances × 100 req/min = 1000 req/min effectively.

**Fix required**: Replace with Redis-backed rate limiting (e.g., `@fastify/rate-limit` with `ioredis` adapter) before production.

---

### 🟡 BLOCKER 7 — No HTTP Security Headers (Helmet Missing)

**Severity**: Medium Security

The API has no Helmet-equivalent security headers: no `Content-Security-Policy`, no `X-Frame-Options`, no `X-Content-Type-Options`, no `Strict-Transport-Security`.

**Fix required**:
```bash
pnpm add @fastify/helmet --filter api
```
```typescript
// apps/api/src/index.ts
import helmet from "@fastify/helmet";
fastify.register(helmet);
```

---

### 🟡 BLOCKER 8 — No Error Monitoring

**Severity**: Medium Operational

No Sentry, Bugsnag, Datadog, or equivalent is configured on any app. Production errors will be invisible without monitoring.

**Fix required**: Integrate Sentry (free tier covers MVP scale):
- `apps/api` — Sentry Node SDK
- `apps/web` — `@sentry/nextjs`
- `apps/mobile` — `@sentry/react-native`

---

## Part 4: Functional Gaps Against Spec

These are gaps between what the specs define and what is built. They range from launch-blocking to post-launch.

### Mobile App

| Feature | Spec Reference | Status | Priority |
|---------|----------------|--------|----------|
| Mobile setup enum bug (`MAJOR`/`RECURRING` instead of `GOAL`/`REGULAR`) | Phase 1.3 | ❌ **Bug — data integrity** | 🔴 Fix before launch |
| Bottom tab bar: 3 junk links visible | UI cleanup | ✅ Fixed this session | — |
| "All Upcoming" removed from Home | Phase 3 | ✅ Fixed this session | — |
| FlatList nested in ScrollView crash | Transactions screen | ✅ Fixed this session | — |
| Person icon in header → logout/settings | UI request | ✅ Done | — |
| First-paycheck guided walkthrough | Phase 4 / Market Gap #4 | ❌ Not built | 🟡 Post-launch |
| Swipe-to-mark-paid on expense events | Market appendix | ❌ Not built | 🟡 Post-launch |
| Quick expense FAB always visible | APP_DESCRIPTION.md | ❌ Not confirmed | 🟡 Verify |
| Reconciliation screen UX simplified | Market Gap #7 | ❌ Not built | 🟢 Post-launch |
| Spending velocity + trend insights | Market Gap #8 | ❌ Not built | 🟡 Post-launch |
| Haptic feedback on expense entry | Market appendix | ❌ Not built | 🟢 Nice-to-have |

### Web App

| Feature | Spec Reference | Status | Priority |
|---------|----------------|--------|----------|
| Server-side auth middleware | Security | ❌ Missing | 🔴 Fix before launch |
| Marketing landing page (root `/`) | — | ✅ Exists (258-line page with simulator) | — |
| `/invite/[token]` accept invite page | Phase 5 | ✅ Exists | — |
| Dashboard hero card prominence | Phase 3 | ✅ Done | — |
| Attention items (overdue/due-soon) | Phase 3 | ✅ Done | — |
| "Can We Afford This?" widget moved to Quick Actions | Phase 3.3 | ❌ Still a dashboard card | 🟡 Minor |
| Web setup wizard 2-step flow | Phase 2 | ⚠️ Exists but verify enum types | 🔴 Verify |
| Spending insights / trends | Market Gap #8 | ❌ Not built | 🟡 Post-launch |
| Simplified reconciliation (one-tap) | Market Gap #7 | ❌ Not built | 🟢 Post-launch |

### Core Platform

| Feature | Spec Reference | Status | Priority |
|---------|----------------|--------|----------|
| Bank CSV import (CBA, Westpac, ANZ, NAB) | Market Gap #2 | ❌ Not built | 🟡 High risk for retention |
| Positive reinforcement / milestone toasts | Market Gap #10 | ❌ Not built | 🟢 Post-launch |
| `ShortfallEvent` entity for borrow-from-goal | APP_DESCRIPTION §SHORTFALL | ❌ Schema not confirmed | 🟡 Review |
| `SavingsReconciliation` entity | APP_DESCRIPTION | ❌ Not confirmed | 🟢 Deferred (per spec) |
| Annual rollover handling | APP_DESCRIPTION | ❌ Not built | 🟡 Review |
| AllocationPlan lifecycle (AUTO-PROPOSED → REVIEWED → ACCEPTED) | APP_DESCRIPTION §INCOME EVENT | ✅ Schema supports it (`PENDING`→`CONFIRMED`) | — |
| Priority/rank setting per category | APP_DESCRIPTION §SETUP | ❌ Not confirmed in UI | 🟡 Verify |
| Stripe / subscription payments | AGENTS.md stack | ❌ Not implemented | 🟢 V2 (premium tier) |

---

## Part 5: Technical Debt Against AGENTS.md Standards

| Rule | Requirement | Current State |
|------|-------------|---------------|
| §5 Multi-Tenancy | All data scoped by `tenantId`, use `tenantProcedure` | ✅ Implemented |
| §6 DB Standards | All tables include soft-delete (`archivedAt`) | ✅ Implemented via mixin |
| §7 Privacy | Data minimisation, retention, PII not logged | ⚠️ Not explicitly verified — logger needs audit |
| §8 Type Safety | Zero `any`, Zod `.strict()` | ⚠️ `transactions.tsx` uses `item: any` (introduced this session) |
| §10 Security | Rate limiting, auth, validation | ⚠️ Rate limiter not production-grade |
| §19 Observability | Logs, metrics, traces, correlation IDs | ⚠️ Correlation IDs ✅, metrics/traces/alerts ❌ |
| §21 Testing | All code must have tests | ⚠️ 22 test files exist but coverage not measured; new UI code untested |
| §22 Code Quality | Files >250 lines must be refactored | ⚠️ `home.tsx` (mobile) is ~370 lines; `paychecks.tsx` is ~500 lines — both exceed limit |
| §23 CI/CD | Lint, typecheck, tests enforced | ❌ No CI pipeline exists |
| §27 Documentation | Spec docs updated after changes | ⚠️ Partially updated but `V2_SCOPE.md` still lists Partner Invite as "DELIVERED (Phase 5)" — good — but notification implementations may not be fully reflected |

---

## Part 6: Prioritised Action Plan for Go-Live

### 🔴 Before Launch (Hard Blockers)

| # | Action | Effort |
|---|--------|--------|
| 1 | **Rotate all credentials** and remove `.env` from git history | 2 hrs |
| 2 | **Add `middleware.ts`** to Next.js web app for server-side auth protection | 1 hr |
| 3 | **Set up deployment** — Vercel for web, Fly.io/Render for API, App Store/Play Store for mobile | 1-2 days |
| 4 | **Fix CORS** — restrict to production domains | 30 min |
| 5 | **Add Helmet** to Fastify API | 30 min |
| 6 | **Fix mobile setup enum bug** (`MAJOR`→`GOAL`, `RECURRING`→`REGULAR`) | 1 hr |
| 7 | **Set up CI/CD** — GitHub Actions for lint + typecheck + test | 2 hrs |
| 8 | **Integrate Sentry** on API, web, and mobile | 2 hrs |

### 🟡 Pre-Launch Polish (Strongly Recommended)

| # | Action | Effort |
|---|--------|--------|
| 9 | Replace in-memory rate limiter with Redis-backed solution | 3-4 hrs |
| 10 | Fix `item: any` in `transactions.tsx` with proper type | 30 min |
| 11 | Refactor `paychecks.tsx` (500 lines → components) per AGENTS.md §22 | 3-4 hrs |
| 12 | Verify mobile setup creates categories with correct enum values end-to-end | 1 hr |
| 13 | Delete `geo/` and `money/` capability packages (dead code cleanup) | 1 hr |
| 14 | Add `pnpm lint` i18n check to verify no hardcoded strings leaked in new mobile UI | 30 min |
    
### 🟢 Post-Launch (High Retention Impact)

| # | Action | Market Gap | Effort |
|---|--------|------------|--------|
| 15 | Bank CSV import (Big 4 AU banks) | #2 | 7-10 days |
| 16 | Spending velocity + trend insights | #8 | 5-7 days |
| 17 | Positive reinforcement / milestone toasts | #10 | 2-3 days |
| 18 | Swipe-to-mark-paid on mobile events | Appendix | 1-2 days |
| 19 | First-paycheck guided walkthrough | #4 | 3-4 days |
| 20 | Simplified one-tap reconciliation | #7 | 2-3 days |

---

## Part 7: App Store / Play Store Readiness

Before mobile launch, the following are required:

| Requirement | Status |
|-------------|--------|
| Apple Developer Program enrollment ($149 USD/yr) | ❓ Unknown |
| Google Play Developer account ($25 USD one-time) | ❓ Unknown |
| App icon (all required sizes) | ❓ Unknown |
| App Store screenshots (required per platform) | ❓ Unknown |
| Privacy policy URL | ❓ Unknown |
| App Store listing copy | ❓ Unknown |
| EAS Build configuration (`eas.json`) | ❓ Unknown — check `apps/mobile/` |
| Push notification certificates (APNs for iOS) | ❓ Unknown |
| Version code hardcoded `"1.0.0"` in settings | ⚠️ Must match App Store version |

---

> [!IMPORTANT]
> **The 3 non-negotiable go-live blockers** are: (1) credentials rotation + secret management, (2) deployment infrastructure, (3) web app server-side auth guard. Everything else is risk management. The engine and core flows are solid — this is a production readiness gap, not a product quality gap.

> [!NOTE]
> **Bank CSV import** (Market Gap #2) is the single highest-retention risk post-launch. The market analysis rates manual-only entry as having 3x abandonment. It is the strongest case for a fast-follow Release 1.1 rather than waiting for a full Release 2.
