# V2 Scope — money-matters

> **Last updated:** 2026-07-25  
> This file captures features, behaviours, and technical enhancements that are explicitly **out of current scope** but must be designed for in early releases to make future versions easier. Update this file whenever scope decisions are made.

---

## Product Features

| Feature | Reason deferred | Design consideration |
|---|---|---|
| **Partner invite / household member invite** | **DELIVERED** | Implemented via `invitePartner` and `acceptInvite` commands in `@money-matters/capability-tenant` with auto-redirect |
| **Tenant Switcher** | **DELIVERED** | Sidebar component allowing users to switch between multiple household contexts seamlessly |
| **Apple Sign-In** | **DELIVERED** | Enabled via Neon Auth social providers alongside Google and Email |
| **5-step waterfall logic details** | **DELIVERED** | Fully implemented in cascading steps: Deficit Repair, Bills, Everyday, Goals, Surplus Sweep |
| **Data export details** | **DELIVERED** | Complete CSV generation supporting transaction ledgers and allocation plans |
| **AEST timezone rendering** | **DELIVERED** | UTC dates formatted timezone-aware via `Intl.DateTimeFormat` |
| **AI/LLM allocation engine** | Premium tier; requires dataset first | Allocation engine abstracted behind interface — rules-based and AI-based are swappable |
| **AI budget estimation** | Premium tier | — |
| **AI shortfall recovery plans** | Premium tier | — |
| **Offline-first sync logic** | Simplifies initial scope; SQLite queue schema scaffolded | All mutations accept `idempotencyKey`; SQLite schema built |
| **Savings reconciliation — AI auto-spread** | Premium tier | Reconciliation service abstracted behind interface |
| **Stripe / subscription payments** | **DELIVERED** | Integrated with trial lockouts, webhooks, and read-only grace periods |
| **Uptime Monitoring (Better Stack / UptimeRobot)** | Deferred to Release 2 | Automated ping checks on `/health` and Web frontend |
| **Product Analytics (PostHog)** | **DELIVERED** | Integrated telemetry and telemetry context providers |

---

## Technical Enhancements

| Enhancement | Reason deferred | Design consideration |
|---|---|---|
| **Offline sync (SQLite → Neon)** | Significant complexity; online-first initially | `idempotencyKey` on all write mutations; SQLite queue table schema complete |
| **Async allocation plan confirmation (Inngest)** | Synchronous TX is sufficient; async adds UI complexity | Confirmation handler isolated in a service function |
| **Per-category bank account mapping** | Maps at category-type level initially | `bankAccountId` FK exists on `categories` table (nullable) |
| **Real-time balance updates (WebSockets/SSE)** | Uses pull (React Query refetch) | No blocking concern |
| **Multi-app platform (second app shell)** | Only `money-matters` initially | `appId` on all tables; app registry in `packages/config` |

---

## Bank Account Mapping & Reconciliation

- Categories map at category-type level (`REGULAR`, `GOAL`, `EVERYDAY`).
- Transfer instructions calculate difference between Everyday top-up and target bill/goal buckets.
- Reconciliation compares expected calculated balance against actual entered balance.
