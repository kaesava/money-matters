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
| **Japanese Translation (ja.ts) Parity Check** | Deferred to Release 2 | `check-i18n.cjs` validates `en.ts` completeness and TSX string literal externalization in V1; full EN-JA dictionary key parity deferred to Release 2 |
| **Category-Level Balance Management (Everyday & Bills)** | Deferred to Release 2 | Managed at pool level in V1; see detailed feature spec below |

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

---

## Decision Record: Pool-Level vs. Category-Level Management

### Context

During V1 architecture review (2026-08-23), the question was raised: should users be given the choice to manage **Everyday and/or Bills at category level** (i.e. full envelope budgeting with individual category balances) rather than the current pool-level model?

### Decision

**V1 ships with pool-level management only for Everyday and Bills.** Goals remain individually tracked at category level (unchanged).

### Rationale & Product Philosophy

1. **Target audience fit:** Aussie households are the primary segment. The product philosophy (Zero Friction, Zero Daily Micro-Tracking) is fundamentally incompatible with the cognitive overhead of managing individual envelope balances for Everyday and Bills.
2. **The real user need is addressed via Bill Coverage View:** Users want to know *"will my bills be covered before next payday?"* not *"how much is left in my Netflix envelope?"*. The **Enhanced Bill Coverage View** (V1) answers this via read-only coverage status per bill category derived from pool balance vs upcoming expense events — without introducing envelope complexity.
3. **Implementation cost:** A dual-mode system (pool vs category) requires branching logic across the waterfall engine, allocation flow, dashboard, "Can We Afford This?" engine, transaction logging, setup wizard, notifications, and bank reconciliation. Estimated 4–6 weeks of additional build time.
4. **Usage data validation:** V2 category-level envelope scope should be validated by real user demand post-launch before committing engineering effort.

---

## V2 Feature: Category-Level Management Mode for Everyday and/or Bills

### Feature ID

`FEAT-V2-001-CATEGORY-LEVEL-MANAGEMENT`

### Expiry & Governance

Review at 6 months post-launch. Gated by kill switch `feature.categoryLevelManagement.killSwitchEnabled: true`.

### Scope & Technical Requirements

Allow a household to opt in to category-level balance tracking for Everyday and/or Bills:

1. **Data Model (`packages/db`):** Add `tenant_pool_settings` table (`tenantId`, `appId`, `poolType: 'EVERYDAY' | 'REGULAR'`, `managementMode: 'POOL' | 'CATEGORY'`). Standard RLS and audit columns.
2. **Waterfall Engine (`packages/capabilities/budgeting`):** Step 2 (Bills) and Step 4 (Everyday) branch on `managementMode`. In category mode, top-ups split across individual categories by target amount rather than single pool bucket.
3. **"Can We Afford This?" Engine (`packages/capabilities/transactions`):** In category mode, bill buffer checks evaluate individual envelope balances.
4. **UI Surfaces (`apps/web`, `apps/mobile`):** Categories screen displays individual envelope balances instead of "Managed at pool level". Quick Expense and transaction logging debit/credit specific category envelopes.
5. **Setup Wizard:** Add option to select Simple (Pool mode, default) vs Advanced (Category mode).

---

## Known User Risk: Unscheduled Bill Categories

> [!WARNING]
> **Risk Analysis (Bill Coverage View):** If a user creates a bill category (e.g. "Car Insurance" or "Council Rates") but does not set up a recurring expense schedule or upcoming event for it:
> - Naively checking `billsPoolBalance >= totalUpcoming` and marking all categories "Covered ✓" would be **false and misleading** — the user might assume a bill is covered when they simply forgot to schedule it.
> - **V1 Mitigation:** The `listBillCoverageQuery` explicitly returns `NO_SCHEDULE` status for categories without upcoming expense events in the window. The UI renders a neutral grey badge (`"No schedule set ℹ️"`) instead of `"Covered ✓"`, prompting the user to add an upcoming bill event.


---

## V2 Feature: Category Health Warning Suppression & Snooze UX

### Feature ID

`FEAT-V2-002-HEALTH-WARNING-SUPPRESSION`

### Context

During the dashboard redesign (2026-08-23), category health warning indicators (e.g. goal or bill categories showing `AMBER` or `RED` health status) were surfaced as compact chips. Without dismissal mechanisms, a category that falls behind stays highlighted continuously until the goal date or target is modified.

### Scope & Technical Requirements

1. **User Preference / Dismissal State:** Store dismiss/snooze timestamps in `appPreferences` or dedicated `health_warning_acknowledgements` table (`tenantId`, `categoryId`, `snoozedUntil`).
2. **Notification Integration:** Connect health warnings with scheduled email digests and push notification preferences.
3. **UI Behaviour:** Allow users to "Acknowledge / Snooze for 7 days" directly from category cards or dashboard status chips.

---

## V2 Feature: Re-Setup Budget Wizard & Command

Deferred to Release 2. Initial setup wizard (`/setup`) is active in R1. Mid-life household re-setup wizard and reSetupBudget capability are deferred.

Command logic preserved for V2:
- `reSetupBudget(db, input, overrideTenantId, overrideUserId, overrideAppId)`
- Schema: `ReSetupBudgetInputSchema`

---

## V2 Feature: Non-Digest Scheduled Notification Functions

In R1, only `notifyWeeklyDigest` is registered in Inngest scheduled workflows.
The following scheduled notification functions were deferred to Release 2:
- `notifyPaydayAlert`: Daily alert for expected paydays
- `notifyShortfallAlert`: Alert when regular pools shortfall upcoming bills
- `notifyBillOverdue`: Alert when bill dates pass without payment
- `notifyGoalMilestone`: Alert when goal pools cross milestone percentage
- `notifySpendingVelocity`: Alert when daily velocity exceeds recommended rate

---

## V2 Technical: Deferred Command Schemas & Types

The following types were defined for V2 offline/sync or alternative pathways:
- `ConfirmPlanCommand`: Direct plan confirmation schema
- `SyncLedgerMutationCommand`: Offline mutation sync schema
- `WaterfallExecutionPayload`: Background waterfall execution payload



