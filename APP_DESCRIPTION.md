# Intent & Goal

Money-matters is a household money management app for salaried professionals and families in Australia. It solves the gap between earning money and confidently knowing where it needs to go — replacing spreadsheets and passive tracking apps with an active, forward-looking allocation engine. In infrequent intercals, the household sets up/reviews the budget across three category types (Major, Recurring, Everyday). Every time income arrives, the app recommends a priority-weighted, due-date-aware split of that income across virtual savings buckets, so critical expenses are always funded in time. The success metric is a household that never misses a payment because they didn't save enough, and always knows exactly what they can spend day-to-day.

# Audience & Roles

Primary users: Salaried professionals and families (AU) aged 28–60, managing household finances with one or two earners, moderate-to-complex expense structures (mortgages, children, insurance, irregular major costs). Multi-user multi-Temamt model where a Tenant is a Household sharing typically 1-2 members with full read/write access to all data. No private categories in V1. Roles: Owner (first user to sign up — manages setup, income sources, category configuration, and can invite a partner) and Household Member (partner — full access to all budgets, categories, transactions, and allocation reviews). Monetisation: Free tier (manual allocation recommendations using a rules-based engine) and Premium tier (AI-powered smart allocation, priority suggestions, shortfall recovery plans, and future AI-guided budget estimation).

# Authentication:
App is B2B - multi-tenancy (Organisation support)
Email/Password or Google (using Neon Auth) - DB: Neon (split by Production DB and Development DB).

# Core Flows

These flows must work end-to-end:

## SETUP
User signs up → creates household → wizard-style budget setup: (1) add income sources (name, type, expected amount, recurrance frequency, expected income date (or first income date for recurring), expected income end date or number of occurrances (similar to Outlook meeting recurrance) if recurring, receiving bank account, (2) add/configure expense categories from a pre-populated list or custom (name, type: MAJOR/RECURRING/EVERYDAY, icon, colour), (3) for each MAJOR and RECURRING category, set target amount + due date or recurrence rule, (4) allow priority/rank setting for all non-EVERYDAY categories that determines order of funding from invome, (5) nominate default excess category (e.g. Emergency Fund) → setup complete, household dashboard unlocked, (6) Configure actual bank accounts, actual balances and mapping of bank account to Category Type (MAJOR/RECURRING/EVERYDAY) and Income Source (that is, which bank account is the income landing in, and which bank account is being user to track MAJOR, RECURRING and EVERYDAY accounts). The recommendation is to have at least 2 (ideally 3) bank accounts.
Note that many Australian households use Offset accounts where they have more money in these accounts than needed to offset their loan accounts. Others have partners that have private and shared bill accounts. We want to be flexible but absolutely realistic in protecting application scope.
Setup is triggered on new household or can be triggered/updated at any time through Household Settings.

## PARTNER INVITE
Household Admin navigates to Settings → Household → Invite Partner → enters partner's email → partner receives invite link → partner signs up or logs in → partner joins household → both users now share full access to all data. I'm ok not to have this in version 1.

## INCOME EVENT + ALLOCATION REVIEW
App lists income events (based on income source schedule) or user manually triggers an upcoming income event → system creates a draft AllocationPlan for each → smart allocation engine calculates required contribution per non-EVERYDAY category (gap ÷ paychecks remaining before due date), waterfalls contributions down priority-ranked list, fills categories until income is exhausted, remainder assigned to EVERYDAY bucket → user opens 'Paycheck Review' screen → sees recommended splits per category with reasoning ('needs $X by [date], Y paychecks left') → user can accept all, adjust individual amounts (system auto-rebalances remainder), or override entirely → user confirms plan → category balances updated → app shows how much to transfer to savings account (sum of all non-EVERYDAY allocations).

## DAILY DRAWDOWN (EXPENSE ENTRY)
Wuick-entry of expense: amount, category (recently used shown first) → optionally adds note → confirms → transaction recorded → category balance reduced → if balance goes negative, shortfall alert is shown with suggested donor categories to borrow from (ordered by priority).

## SHORTFALL RESOLUTION:
Category balance goes negative after a drawdown → app shows ShortfallAlert → recommends borrowing from lowest-priority category with sufficient surplus → user approves or picks donor manually → transfer recorded → both category balances updated → future allocation plans automatically include repayment to donor category until restored.

## SAVINGS RECONCILIATION:
User periodically (monthly or on demand) opens Reconciliation screen → app shows expected savings balance (sum of all non-EVERYDAY category balances) → user enters their actual savings account balance → if difference exists, user applies adjustment → free tier: manual spread (user adjusts categories one by one) → premium tier: AI auto-spreads adjustment across categories protecting highest-priority ones first → reconciliation record saved. For release 1, we are only focussed on free tier.

## CATEGORY HEALTH DASHBOARD:
Home screen bottom half shows all categories as cards/tiles grouped by type → each shows current balance, target, % funded, next due date, traffic-light status (green = on track, amber = at risk, red = underfunded for next due date) → tapping a category shows full history of allocations and drawdowns.

## NEXT PAYCHECK READINESS (HOME SCREEN):
Show next expected income event (source, expected date, expected amount) → summary of how many categories are on track vs. at-risk → 'Review Allocation' CTA if a draft plan exists, or 'Paycheck Coming' countdown if not yet due.

## ANNUAL ROLLOVER


## PREMIUM UPGRADE (Not for Release 1):
Free user encounters a premium feature (AI allocation, AI budget estimation) → upgrade prompt shown → user subscribes → AI allocation engine activated for future paycheck reviews → AI analyses category priorities, historical shortfalls, and income patterns to improve recommendations over time.

Technical Requirements

(1) There are two fundamental ways of managing rollover. (1) We ask the user to reset all the categories every month/year and roll-over remainder, or we simply keep rolling organically where the user updates categories when prices go up, etc. as needed. I am preferencing the latter strategy, but open to both.
(2) Allocation engine is a pure algorithmic function (V1 rules-based, V2 AI/LLM-powered) — must be abstracted as a service so the engine can be swapped without UI changes.
(3) AllocationPlan has a status lifecycle: AUTO-PROPOSED → REVIEWED (where user makes changes where needed) → ACCEPTED.
(4) CategoryBalance is a derived aggregate (sum of AllocationLines minus sum of Transactions) — must be kept consistent via server-side logic, not client computation.
(5) Household entity is the root of all data — all entities belong to a household, enabling the multi-user sharing model.
(6) ShortfallEvent entity tracks borrowed funds between categories with repayment state.
(7) SavingsReconciliation entity records expected vs. actual savings balance deltas.
(8) Push notifications needed for: income event due, unreviewed allocation plan, category going red status, reconciliation reminder.
(9) Premium feature flag on Household entity controls AI vs. rules-based allocation engine routing.
(10) Offline-first for expense entry — transactions queued locally and synced when online (Version 2 if easier to build later, Version 1 if easier to build off the bat)

Design Preferences

Aesthetic system: Modern SaaS meets Friendly Consumer — clean, calm, and trustworthy. Primary palette: deep navy #1B2B4B (trust, stability) with a warm teal accent #00B4A6 (forward momentum, optimism) and soft off-white #F7F8FA backgrounds. Category cards use gentle colour coding with subtle gradients. Typography: Strong hierarchy — large bold numerals for balances (feels like a financial dashboard), clean sans-serif body (Inter or equivalent). Traffic-light status uses green #22C55E / amber #F59E0B / red #EF4444. Shape language: rounded cards (16px radius), soft shadows, no harsh edges. Motion: subtle — card reveals on scroll, gentle number counting animations on balance changes. The app should feel like a calm, trusted financial advisor, not an anxiety-inducing tracker. Empty states are warm and encouraging ("Your budget is set — you're ready for your next paycheck"). Bottom navigation: Home (dashboard), Buckets (all categories), Transactions (history), Paychecks (income & allocation plans), Settings. Quick-add FAB (floating action button) always visible for fast expense entry.
