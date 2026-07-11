# V2 Scope — money-matters

> **Last updated:** 2026-07-11  
> This file captures features, behaviours, and technical enhancements that are explicitly **out of V1 scope** but must be designed for in V1 to make V2 easier. Update this file whenever a V2 decision is made.

---

## Product Features

| Feature | Reason deferred | V1 design consideration |
|---|---|---|
| **Partner invite / household member invite** | UX flow deferred; low V1 user base | `household_members` table built in V1 with `role`, `inviteToken`, `inviteStatus` columns |
| **AI/LLM allocation engine** | Premium tier; requires dataset first | Allocation engine abstracted behind interface — rules-based and AI-based are swappable |
| **AI budget estimation** | Premium tier | — |
| **AI shortfall recovery plans** | Premium tier | — |
| **Offline-first expense entry** | Simplifies V1; SQLite queue schema scaffolded | All mutations accept `idempotencyKey`; SQLite schema built but sync logic deferred |
| **Savings reconciliation — AI auto-spread** | Premium tier | Reconciliation service abstracted behind interface |
| **Stripe / subscription payments** | No premium tier in V1 | Feature flag `premiumEnabled` on Household from V1 |

---

## Technical Enhancements

| Enhancement | Reason deferred | V1 design consideration |
|---|---|---|
| **Offline sync (SQLite → Neon)** | Significant complexity; V1 is online-only | `idempotencyKey` on all write mutations; SQLite queue table schema complete from V1 |
| **Async allocation plan confirmation (Inngest)** | V1 synchronous TX is sufficient; async adds UI complexity | Confirmation handler isolated in a service function — can be swapped to Inngest workflow in V2 without API change |
| **Per-category bank account mapping** | V1 maps at category-type level only | `bankAccountId` FK exists on `categories` table from V1 (nullable); populated in V2 |
| **Real-time balance updates (WebSockets/SSE)** | V1 uses pull (React Query refetch) | No blocking concern |
| **Multi-app platform (second app shell)** | Only `money-matters` in V1 | `appId` on all tables; app registry in `packages/config` |
| **Blue/green deployments** | Infrastructure work | — |
| **SBOM generation** | Low risk in early stage | — |

---

## Bank Account Mapping — V1 vs V2

### V1 (simplified)
- Categories are **not** mapped to individual bank accounts.
- Bank accounts are tagged with a purpose at registration: `INCOME_LANDING`, `SAVINGS` (covers both MAJOR and RECURRING), `EVERYDAY`.
- After allocation plan confirmation, the app shows **one transfer instruction per distinct SAVINGS account** registered by the household.
- If household has 1 savings account: "Transfer $X to [Account Name]"
- If household has 2 savings accounts: "Transfer $X to [Account 1], $Y to [Account 2]" — amounts split by which categories the user associates with each account at the account-level (not category-level).
- Offset accounts: no transfer instruction shown — labelled "your offset account funds this automatically".

### V2
- Individual categories can be mapped to a specific bank account.
- Transfer instructions broken down by account per category allocation.
- Per-account reconciliation becomes more granular.

---

## Savings Reconciliation — V1 vs V2

### V1 (simplified)
- Reconciliation is **per registered savings account** (not per category).
- If household has 2 savings accounts, user does 2 reconciliation steps.
- Each step: expected balance = Σ category balances that map to that account's purpose.
- User enters actual balance for that account → delta computed → user manually adjusts individual category balances until they sum to the actual balance.
- Simple, clear — no AI required.

### V2
- AI auto-spread of adjustments (premium tier).
- Per-category account mapping enables more granular expected balance per account.

---

## Shortfall Repayment — V1 vs V2

### V1
- Repayment line automatically included in future allocation plans (user can defer per plan).
- No interest, no automatic cap on repayment speed — the engine just adds the outstanding borrowed amount to the donor's gap.

### V2 (potential)
- User-configurable repayment schedule (e.g., repay over 3 paychecks).
- Repayment priority relative to other categories.
