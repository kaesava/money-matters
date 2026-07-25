# Implementation Plan — Money Matters Day-1 Product Overhaul

> **Purpose**: Hand this document to an LLM for unambiguous, phased execution. Each phase is independently shippable. All changes apply to both web (`apps/web`) and mobile (`apps/mobile`) unless explicitly stated otherwise.
>
> **Guiding Principle**: Every change serves one goal — **Matt (35yo Aussie dad) opens the app on Day 1, gets value in under 2 minutes, and comes back on Day 31.**

---

## Phase Execution Order

```
Phase 1 (Dead Code Removal)      ← 1-2 hours. Do first. Cleans the workspace.
    │
    ▼
Phase 2 (Onboarding Overhaul)    ← 2-3 days. Highest impact change.
    │
    ▼
Phase 3 (Dashboard Simplification) ← 1-2 days. Reduces cognitive load.
    │
    ▼
Phase 4 (Smart Notifications)    ← 2-3 days. Builds the habit loop.
    │
    ▼
Phase 5 (Partner Invite MVP)     ← 1-2 days. Unlocks household buy-in.
```

---

## Phase 1 — Dead Code & Redundant Capability Removal

> **Goal**: Strip all unused code before building anything new. Clean workspace = clean execution.

### 1.1 DELETE `packages/capabilities/money/` (Entire Package)

**Reason**: This package exports nothing (`export {}`). It is a "standalone placeholder package maintained for dependency tree resolution" per its own JSDoc. It has zero consumers.

**Files to delete**:
- `packages/capabilities/money/` (entire directory — `src/index.ts`, `src/index.test.ts`, `package.json`, `tsconfig.json`)

**References to remove**:
- [apps/api/package.json](file:///home/kaesava/projects/money-matters/apps/api/package.json) — Remove `"@money-matters/capability-money": "workspace:*"` from `dependencies`
- [apps/api/tsup.config.ts](file:///home/kaesava/projects/money-matters/apps/api/tsup.config.ts) — Remove `"@money-matters/capability-money"` from the `external` array
- `pnpm-workspace.yaml` — No change needed (wildcard covers it)

### 1.2 DELETE `packages/capabilities/geo/` (Entire Package)

**Reason**: The geo capability (Photon OSM location autocomplete) is wired into the API router but has **zero consumers in any app code**. No mobile screen or web component imports `getPlaceSuggestions`, `getPlaceDetails`, `AddressAutocomplete`, or `SmartAddressInput`. It is dead weight.

**Files to delete**:
- `packages/capabilities/geo/` (entire directory — `src/index.ts`, `src/types.ts`, `src/context.tsx`, `src/web/`, `src/mobile/`, `package.json`, `tsconfig.json`)

**References to remove**:
- [apps/api/package.json](file:///home/kaesava/projects/money-matters/apps/api/package.json) — Remove `"@money-matters/capability-geo": "workspace:*"` from `dependencies`
- [apps/api/tsup.config.ts](file:///home/kaesava/projects/money-matters/apps/api/tsup.config.ts) — Remove `"@money-matters/capability-geo"` from the `external` array
- [apps/api/src/routers/geo.router.ts](file:///home/kaesava/projects/money-matters/apps/api/src/routers/geo.router.ts) — **DELETE this entire file**
- [apps/api/src/routers/_app.ts](file:///home/kaesava/projects/money-matters/apps/api/src/routers/_app.ts) — Remove `import { geoRouter }` and remove `...geoRouter` from the `router({})` merge

### 1.3 Fix Stale Category Type References in Mobile Setup

**Problem**: [apps/mobile/src/app/(setup)/categories.tsx](file:///home/kaesava/projects/money-matters/apps/mobile/src/app/%28setup%29/categories.tsx) still uses the **old** category type enum values `'MAJOR' | 'RECURRING' | 'EVERYDAY'`. The database and web setup already use `'GOAL' | 'REGULAR' | 'EVERYDAY'`. This is a data integrity bug — mobile setup creates categories with wrong type values.

**Fix**: In `apps/mobile/src/app/(setup)/categories.tsx`:
- Change `type CategoryType = 'MAJOR' | 'RECURRING' | 'EVERYDAY'` → `type CategoryType = 'GOAL' | 'REGULAR' | 'EVERYDAY'`
- Update all preset entries: `type: 'MAJOR'` → `type: 'GOAL'`, `type: 'RECURRING'` → `type: 'REGULAR'`
- Update `SECTIONS` array: `['MAJOR', 'RECURRING', 'EVERYDAY']` → `['GOAL', 'REGULAR', 'EVERYDAY']`
- Update `SECTION_TITLES` keys from `MAJOR`/`RECURRING` to `GOAL`/`REGULAR`
- Update corresponding i18n keys in `packages/i18n/src/dictionaries/en.ts` if they reference `majorSection`/`recurringSection` — rename to `goalSection`/`regularSection`

### 1.4 DELETE `next_to_implement.md` and `temp_implementation_plan.md`

**Reason**: These are planning artifacts from a previous iteration. The content has been superseded by this implementation plan. Keeping them causes confusion about what to build next.

**Files to delete**:
- `/home/kaesava/projects/money-matters/next_to_implement.md`
- `/home/kaesava/projects/money-matters/temp_implementation_plan.md`

### 1.5 Verification

```bash
pnpm install          # Regenerate lockfile after dependency removal
pnpm typecheck        # Must pass with zero errors
pnpm lint             # Must pass
pnpm test             # All existing tests must pass
```

---

## Phase 2 — Onboarding Overhaul (2-Step Instant Value)

> **Goal**: Replace the 4-step setup wizard with a 2-step flow that gets Matt to a functioning dashboard in under 2 minutes. Bank accounts become optional progressive disclosure, not a gate.

### 2.1 Design: New Setup Flow

```
OLD (4 steps, ~15 minutes):
  Step 1: Income Sources → Step 2: Categories → Step 3: Configure → Step 4: Bank Accounts → Complete

NEW (2 steps, ~2 minutes):
  Step 1: "How much do you earn?" (single income source, 3 fields)
  Step 2: "Which bills do you have?" (checkbox list of Australian family presets + rough amounts)
  → Dashboard unlocked immediately
  → Bank accounts, fine-tuning, savings goals → Settings (anytime)
```

### 2.2 Australian Family Category Templates

Replace the sparse preset lists in both platforms. The new preset list covers the most common Australian family expenses.

**New preset data** (used in both mobile and web setup):

```typescript
// packages/types/src/setup-presets.ts [NEW FILE]

export interface SetupPreset {
  readonly id: string;
  readonly name: string;
  readonly type: 'REGULAR' | 'GOAL';
  readonly emoji: string;
  /** Monthly equivalent amount hint (AUD). Shown as placeholder. */
  readonly suggestedMonthlyAud: number;
  /** True = pre-selected by default for Australian families */
  readonly defaultSelected: boolean;
}

export const AUSTRALIAN_FAMILY_PRESETS: readonly SetupPreset[] = [
  // REGULAR BILLS (monthly recurring obligations)
  { id: 'mortgage', name: 'Mortgage / Rent', type: 'REGULAR', emoji: '🏡', suggestedMonthlyAud: 2200, defaultSelected: true },
  { id: 'electricity', name: 'Electricity', type: 'REGULAR', emoji: '⚡', suggestedMonthlyAud: 150, defaultSelected: true },
  { id: 'gas', name: 'Gas', type: 'REGULAR', emoji: '🔥', suggestedMonthlyAud: 60, defaultSelected: false },
  { id: 'water', name: 'Water', type: 'REGULAR', emoji: '💧', suggestedMonthlyAud: 70, defaultSelected: false },
  { id: 'council-rates', name: 'Council Rates', type: 'REGULAR', emoji: '🏛️', suggestedMonthlyAud: 170, defaultSelected: true },
  { id: 'home-insurance', name: 'Home & Contents Insurance', type: 'REGULAR', emoji: '🛡️', suggestedMonthlyAud: 150, defaultSelected: true },
  { id: 'car-insurance', name: 'Car Insurance', type: 'REGULAR', emoji: '🚗', suggestedMonthlyAud: 120, defaultSelected: true },
  { id: 'car-rego', name: 'Car Registration', type: 'REGULAR', emoji: '📋', suggestedMonthlyAud: 70, defaultSelected: true },
  { id: 'health-insurance', name: 'Private Health Insurance', type: 'REGULAR', emoji: '🏥', suggestedMonthlyAud: 280, defaultSelected: true },
  { id: 'internet', name: 'Internet', type: 'REGULAR', emoji: '📡', suggestedMonthlyAud: 80, defaultSelected: true },
  { id: 'mobile-phones', name: 'Mobile Phone(s)', type: 'REGULAR', emoji: '📱', suggestedMonthlyAud: 60, defaultSelected: true },
  { id: 'streaming', name: 'Streaming Services', type: 'REGULAR', emoji: '📺', suggestedMonthlyAud: 40, defaultSelected: false },
  { id: 'school-fees', name: 'School Fees', type: 'REGULAR', emoji: '🎓', suggestedMonthlyAud: 500, defaultSelected: false },
  { id: 'childcare', name: 'Childcare / After School', type: 'REGULAR', emoji: '👶', suggestedMonthlyAud: 800, defaultSelected: false },
  { id: 'gym', name: 'Gym / Sports Membership', type: 'REGULAR', emoji: '💪', suggestedMonthlyAud: 60, defaultSelected: false },
  // SAVINGS GOALS
  { id: 'emergency', name: 'Emergency Fund', type: 'GOAL', emoji: '🆘', suggestedMonthlyAud: 200, defaultSelected: true },
  { id: 'car-replacement', name: 'Car Replacement Fund', type: 'GOAL', emoji: '🚙', suggestedMonthlyAud: 150, defaultSelected: false },
  { id: 'holiday', name: 'Holiday Fund', type: 'GOAL', emoji: '✈️', suggestedMonthlyAud: 100, defaultSelected: false },
  { id: 'christmas', name: 'Christmas / Birthdays', type: 'GOAL', emoji: '🎄', suggestedMonthlyAud: 80, defaultSelected: false },
] as const;
```

### 2.3 Mobile Setup — Rewrite

**Files to modify**:
- [apps/mobile/src/app/(setup)/income.tsx](file:///home/kaesava/projects/money-matters/apps/mobile/src/app/%28setup%29/income.tsx) — **REWRITE** as Step 1
- [apps/mobile/src/app/(setup)/categories.tsx](file:///home/kaesava/projects/money-matters/apps/mobile/src/app/%28setup%29/categories.tsx) — **REWRITE** as Step 2 (bill checklist + amounts)
- [apps/mobile/src/app/(setup)/complete.tsx](file:///home/kaesava/projects/money-matters/apps/mobile/src/app/%28setup%29/complete.tsx) — Minimal changes (keep it)

**Files to DELETE**:
- `apps/mobile/src/app/(setup)/configure.tsx` — Merged into Step 2
- `apps/mobile/src/app/(setup)/bank-accounts.tsx` — Moved to Settings (progressive disclosure)

#### Step 1: Income (Simplified)

Rewrite `income.tsx` to show only 3 fields with sensible defaults:

```
┌─────────────────────────────────────────┐
│  Step 1 of 2                            │
│                                         │
│  💰 How much do you get paid?           │
│  "Let's set up your main income source" │
│                                         │
│  Income Name: [My Salary          ]     │
│  Net Pay:     [$ 2,500.00         ]     │
│  Frequency:   (•) Fortnightly           │
│               ( ) Weekly                │
│               ( ) Monthly               │
│                                         │
│  [ + Add another income source ]        │
│                                         │
│  [ Next → ]                             │
│                                         │
│  "You can add more income sources and   │
│   bank accounts later in Settings"      │
└─────────────────────────────────────────┘
```

**Key changes from current**:
- Remove `Income Type` selector (SALARY/FREELANCE/OTHER) — not needed at onboarding
- Default name to `"My Salary"` (pre-filled, user can change)
- Default frequency to `FORTNIGHTLY` (most common in Australia)
- Remove start date field — default to today
- Progress bar shows 2 steps, not 4
- Add skip hint: "You can add more income sources and bank accounts later in Settings"

#### Step 2: Bills Checklist (Combined Categories + Amounts)

Rewrite `categories.tsx` to be a combined bill checklist with inline amount fields:

```
┌─────────────────────────────────────────┐
│  Step 2 of 2                            │
│                                         │
│  📋 Which bills do you have?            │
│  "Tick the ones that apply. We'll       │
│   handle the rest."                     │
│                                         │
│  REGULAR BILLS                          │
│  ┌───────────────────────────────────┐  │
│  │ ✅ 🏡 Mortgage / Rent    [$2,200]│  │
│  │ ✅ ⚡ Electricity         [$ 150] │  │
│  │ ☐  🔥 Gas                 [$ 60] │  │
│  │ ✅ 🏛️ Council Rates       [$ 170] │  │
│  │ ✅ 🛡️ Home Insurance      [$ 150] │  │
│  │ ✅ 🚗 Car Insurance       [$ 120] │  │
│  │ ✅ 📋 Car Rego            [$ 70]  │  │
│  │ ✅ 🏥 Health Insurance    [$ 280] │  │
│  │ ✅ 📡 Internet            [$ 80]  │  │
│  │ ✅ 📱 Mobile Phone(s)     [$ 60]  │  │
│  │ ☐  📺 Streaming           [$ 40] │  │
│  │ ☐  🎓 School Fees         [$ 500]│  │
│  └───────────────────────────────────┘  │
│                                         │
│  SAVINGS GOALS                          │
│  ┌───────────────────────────────────┐  │
│  │ ✅ 🆘 Emergency Fund     [$ 200] │  │
│  │ ☐  ✈️ Holiday Fund        [$ 100]│  │
│  └───────────────────────────────────┘  │
│                                         │
│  [ + Add a custom bill or goal ]        │
│                                         │
│  Default Excess: [Emergency Fund ▼]     │
│                                         │
│  [ Complete Setup ✓ ]                   │
└─────────────────────────────────────────┘
```

**Implementation logic for Step 2 submit**:
1. For each **selected** preset, call `createCategory` with `{ name, type, budgetFrequency: 'MONTHLY' }`
2. For each **selected** preset with an amount > 0:
   - If type is `REGULAR`: call `createCategorySchedule` with `{ categoryId, targetAmount }`
   - If type is `GOAL`: call `createCategorySchedule` with `{ categoryId, targetAmount }`
3. Set the chosen excess category via `updateCategory({ isDefaultExcess: true })`
4. Call `generateNextIncomeEvents` to seed initial upcoming events
5. Navigate to `/(app)/home` (mobile) or `/dashboard` (web)

**The amount field** shows `suggestedMonthlyAud` as the default value (editable). This gives Matt a functioning budget with realistic Australian amounts without needing to research every bill.

### 2.4 Web Setup — Rewrite

**Files to modify**:
- [apps/web/src/app/setup/page.tsx](file:///home/kaesava/projects/money-matters/apps/web/src/app/setup/page.tsx) — **REWRITE** to 2-step flow
- [apps/web/src/app/setup/components/IncomeSetupStep.tsx](file:///home/kaesava/projects/money-matters/apps/web/src/app/setup/components/IncomeSetupStep.tsx) — **REWRITE** (simplified 3-field form)
- [apps/web/src/app/setup/components/CategorySelectStep.tsx](file:///home/kaesava/projects/money-matters/apps/web/src/app/setup/components/CategorySelectStep.tsx) — **REWRITE** (bill checklist with inline amounts)

**Files to DELETE**:
- `apps/web/src/app/setup/components/CategoryTargetsStep.tsx` — Merged into Step 2
- `apps/web/src/app/setup/components/BankAccountsSetupStep.tsx` — Moved to Settings

### 2.5 i18n Keys

Add to `packages/i18n/src/dictionaries/en.ts` under the `setup` namespace:

```typescript
setup: {
  // ... existing keys ...
  stepOfTwo: 'Step {step} of 2',
  income: {
    // ... update title/subtitle for simpler messaging ...
    titleSimple: "How much do you get paid?",
    subtitleSimple: "Let's set up your main income source. You can add more later in Settings.",
    defaultName: "My Salary",
    progressiveHint: "You can add more income sources and bank accounts later in Settings.",
  },
  bills: {
    title: "Which bills do you have?",
    subtitle: "Tick the ones that apply and adjust the monthly amounts. We'll handle the rest.",
    regularSection: "Regular Bills",
    savingsSection: "Savings Goals",
    customAddCta: "Add a custom bill or goal",
    excessLabel: "Where should leftover money go?",
    completeCta: "Complete Setup",
    amountHint: "Monthly amount",
  },
}
```

### 2.6 Verification

- Run through both mobile and web setup wizards end-to-end
- Confirm categories are created with correct types (`REGULAR`/`GOAL`)
- Confirm income events are generated after setup
- Confirm dashboard loads with populated data
- Confirm bank accounts are accessible from Settings (not blocked by setup)
- `pnpm typecheck && pnpm lint && pnpm test`

---

## Phase 3 — Dashboard Simplification (Hero Card + Attention Items)

> **Goal**: Matt glances at his phone for 3 seconds and knows: (1) how much he can spend, (2) if anything needs attention, (3) when's next payday. Everything else is secondary.

### 3.1 Design: New Dashboard Information Hierarchy

```
┌─────────────────────────────────────────┐
│  HERO CARD (always visible, top 40%)    │
│  ┌───────────────────────────────────┐  │
│  │ $847.23                           │  │
│  │ Everyday Balance                  │  │
│  │                                   │  │
│  │ ● On Track  │  Next pay: Thu 31   │  │
│  │             │  Jul ($2,400)       │  │
│  │             │  4 days away        │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ⚠️ NEEDS ATTENTION (only if items)     │
│  ├── ⚡ Electricity due Wed ($187)      │
│  │   Category funded ✓                  │
│  └── 🚗 Car Insurance OVERDUE ($124)    │
│       Category short by $45 ⚠️          │
│                                         │
│  ▼ QUICK ACTIONS (collapsed by default) │
│  [Record Expense] [Record Income]       │
│  [Move Money] [Can We Afford This?]     │
│                                         │
│  ▼ ALL UPCOMING (scrollable)            │
│  (existing UpcomingEventsList)           │
│                                         │
│  ▼ CATEGORY HEALTH (collapsed)          │
│  (existing category health cards)       │
└─────────────────────────────────────────┘
```

### 3.2 Mobile Home Screen Refactor

**File**: [apps/mobile/src/app/(app)/home.tsx](file:///home/kaesava/projects/money-matters/apps/mobile/src/app/%28app%29/home.tsx) (784 lines — this file is too large per AGENTS.md §22, >250 lines rule)

**Required changes**:

1. **Extract Hero Card** into new component `apps/mobile/src/components/DashboardHeroCard.tsx`
   - Shows Everyday balance (large, bold, prominent — this is THE number)
   - Shows overall health status (On Track / At Risk / Needs Attention) derived from category health counts
   - Shows next payday: source name, amount, date, days until
   - Tapping "Next pay" opens the PaydayPreviewWizard

2. **Extract Attention Items** into new component `apps/mobile/src/components/AttentionItemsList.tsx`
   - Filters upcoming events to show ONLY: overdue events OR events due within 3 days
   - Shows category funding status inline (funded ✓ / short by $X ⚠️)
   - This section is HIDDEN if there are no attention items (zero noise)

3. **Restructure home.tsx** to compose these components:
   ```tsx
   <ScrollView>
     <DashboardHeroCard {...heroProps} />
     <AttentionItemsList {...attentionProps} />
     <CollapsibleSection title="Quick Actions" defaultOpen={false}>
       {/* existing quick actions content */}
     </CollapsibleSection>
     <CollapsibleSection title="All Upcoming" defaultOpen={true}>
       {/* existing upcoming events list */}
     </CollapsibleSection>
     <CollapsibleSection title="Category Health" defaultOpen={false}>
       {/* existing category health shortcuts */}
     </CollapsibleSection>
   </ScrollView>
   ```

4. **Default Quick Actions to collapsed** — change `isQuickActionsOpen` default from `true` to `false`

5. **Move "Can We Afford This?"** from a dashboard card to a button inside Quick Actions, or accessible via the FAB menu

### 3.3 Web Dashboard Refactor

**File**: [apps/web/src/app/dashboard/page.tsx](file:///home/kaesava/projects/money-matters/apps/web/src/app/dashboard/page.tsx) (504 lines — exceeds 250 line limit)

**Required changes**:

1. **Replace `DashboardHeaderHero`** — currently shows next payday info. Restructure to show:
   - Everyday balance as the hero number (currently buried in stat chips)
   - Overall health status
   - Next payday as secondary info

2. **Replace `DashboardMetricsCards`** 4-stat grid — move Total Income, Spent, Saved into the collapsed Quick Actions section. The hero card replaces the metrics cards as the primary visual.

3. **Add Attention Items section** between hero and upcoming events — filters upcoming to overdue + due within 3 days, same logic as mobile.

4. **Make Quick Actions, Bank Reconcile, Can Afford collapsible** with default-collapsed state.

### 3.4 New Shared Component: `CollapsibleSection`

**Mobile**: Create `packages/ui/src/mobile/CollapsibleSection.tsx`
**Web**: Create `packages/ui/src/web/CollapsibleSection.tsx`

Simple component: title + chevron + animated expand/collapse. Persists state via `user_preferences` if the section has a `preferenceKey`.

### 3.5 i18n Keys

```typescript
dashboard: {
  hero: {
    everydayBalance: 'Everyday Balance',
    onTrack: 'On Track',
    atRisk: 'Needs Attention',
    nextPay: 'Next pay',
    daysAway: '{days} days away',
    dueToday: 'Due today!',
  },
  attention: {
    title: 'Needs Attention',
    dueSoon: 'Due {date}',
    overdue: 'Overdue',
    categoryFunded: 'Category funded',
    categoryShort: 'Category short by {amount}',
    noItems: '', // section hidden, no empty state needed
  },
}
```

### 3.6 Verification

- Dashboard loads with hero card showing Everyday balance prominently
- Attention items appear only when relevant (overdue/due soon)
- Quick Actions default to collapsed on mobile
- All existing functionality still accessible (just re-organized)
- `pnpm typecheck && pnpm lint && pnpm test`

---

## Phase 4 — Smart Notification System

> **Goal**: Build the habit loop. Matt gets useful, timely nudges that bring him back to the app without being annoying.

### 4.1 Architecture

The infrastructure is already in place:
- **Inngest** is wired in `apps/api/src/inngest/` with a client and function registry
- **Expo Push** is wired in `packages/capabilities/notifications/src/inngest.ts` — the `send-push-notification` function is ready and sends to Expo's push API
- **Device tokens** are registered on sign-in via `registerToken` in the mobile app

**What's missing**: Actual notification trigger functions. Currently only `send-push-notification` (the dispatch mechanism) and `seed-on-signup` (a no-op) exist. There are no scheduled or event-driven notification triggers.

### 4.2 New Inngest Functions

Create new file: `packages/capabilities/notifications/src/scheduled-notifications.ts`

Implement 6 notification functions:

#### 4.2.1 `notify-payday-incoming` (Cron: daily at 6pm AEST)

```typescript
// Trigger: Cron schedule, runs daily
// Logic:
//   1. Query all income_events where expectedDate = tomorrow AND status = 'UPCOMING'
//   2. For each, look up the income_source name and the tenant's users
//   3. Send push: "💰 Payday tomorrow! {sourceName} — {amount} expected."
//   4. Include data payload: { screen: 'home', eventId }
```

#### 4.2.2 `notify-bill-due-soon` (Cron: daily at 9am AEST)

```typescript
// Trigger: Cron schedule, runs daily
// Logic:
//   1. Query all expense_events where expectedDate is within 3 days AND status = 'UPCOMING'
//   2. For each, look up the category and its current balance
//   3. If category balance >= expectedAmount: "📋 {billName} due {date} — category funded ✓"
//   4. If category balance < expectedAmount: "⚠️ {billName} due {date} — category short by ${shortfall}"
//   5. Send push to all tenant users
```

#### 4.2.3 `notify-bill-overdue` (Cron: daily at 10am AEST)

```typescript
// Trigger: Cron schedule, runs daily
// Logic:
//   1. Query all expense_events where expectedDate < today AND status = 'UPCOMING'
//   2. Send push: "🔴 {billName} is overdue! Mark as paid or reschedule."
//   3. Include data payload: { screen: 'home', eventId }
```

#### 4.2.4 `notify-weekly-digest` (Cron: Sundays at 7pm AEST)

```typescript
// Trigger: Cron schedule, weekly on Sundays
// Logic:
//   1. Query getMonthlySummary for current month
//   2. Calculate: totalSpent this week, everydayRemaining, nextPaydayDate
//   3. Count categories by health: green/amber/red
//   4. Send push: "📊 This week: ${spent} spent, ${remaining} left. {greenCount} categories on track."
```

#### 4.2.5 `notify-goal-milestone` (Event: `transaction.recorded`)

```typescript
// Trigger: Event-driven, fires after any allocation or transaction
// Logic:
//   1. After allocation plan confirmation, check each GOAL category
//   2. Calculate percentage: (currentBalance / targetAmount) * 100
//   3. If percentage just crossed 25%, 50%, 75%, or 100%:
//      Send push: "🎉 {categoryName} is now {percentage}% funded!"
//   4. Track last notified milestone per category to avoid duplicates
//      (use a simple check: only notify if balance crossed threshold in this transaction)
```

#### 4.2.6 `notify-spending-velocity` (Cron: daily at 6pm AEST)

```typescript
// Trigger: Cron schedule, runs daily
// Logic:
//   1. Get Everyday category balance
//   2. Get next income event date
//   3. Calculate daysUntilPayday and dailyBudget = balance / daysUntilPayday
//   4. Calculate averageDailySpend over last 7 days from transaction_ledger
//   5. If averageDailySpend > dailyBudget * 1.2: // spending 20% over pace
//      Send push: "⚡ At this pace, your Everyday pool runs out {daysShort} days early.
//      Suggestion: ~${suggestedDaily}/day to stay on track."
```

### 4.3 Wire Functions into Inngest

**File to modify**: [apps/api/src/inngest/functions.ts](file:///home/kaesava/projects/money-matters/apps/api/src/inngest/functions.ts)

```typescript
import { inngest } from "./client.js";
import { createNotificationFunctions } from "@money-matters/capability-notifications";
import { createScheduledNotificationFunctions } from "@money-matters/capability-notifications";

export const handleUserSignup = inngest.createFunction(
  { id: "seed-on-signup" },
  { event: "auth/user.signup" },
  async () => {
    return { status: "Auto-provisioning categories deferred to onboarding setup." };
  }
);

export const notificationFunctions = createNotificationFunctions(inngest);
export const scheduledNotificationFunctions = createScheduledNotificationFunctions(inngest);
```

### 4.4 User Notification Preferences

**File to modify**: [packages/db/src/schema/user_preference.ts](file:///home/kaesava/projects/money-matters/packages/db/src/schema/user_preference.ts)

Add notification preference columns (all default to `true`):

```typescript
notifyPaydayIncoming: boolean('notify_payday_incoming').notNull().default(true),
notifyBillDueSoon: boolean('notify_bill_due_soon').notNull().default(true),
notifyBillOverdue: boolean('notify_bill_overdue').notNull().default(true),
notifyWeeklyDigest: boolean('notify_weekly_digest').notNull().default(true),
notifyGoalMilestone: boolean('notify_goal_milestone').notNull().default(true),
notifySpendingVelocity: boolean('notify_spending_velocity').notNull().default(true),
```

Create a Drizzle migration to add these columns.

**Settings UI**: Add a "Notifications" section to both mobile (`settings.tsx`) and web (`settings/`) with toggle switches for each notification type.

### 4.5 i18n Keys

```typescript
notifications: {
  paydayIncoming: {
    title: 'Payday Tomorrow',
    body: '{sourceName} — {amount} expected',
  },
  billDueSoon: {
    titleFunded: '{billName} due {date}',
    bodyFunded: 'Category funded ✓',
    titleShort: '{billName} due {date}',
    bodyShort: 'Category short by {shortfall}',
  },
  billOverdue: {
    title: '{billName} is overdue',
    body: 'Mark as paid or reschedule',
  },
  weeklyDigest: {
    title: 'Weekly Summary',
    body: 'This week: {spent} spent, {remaining} left. {onTrackCount} categories on track.',
  },
  goalMilestone: {
    title: '{categoryName} milestone!',
    body: 'Now {percentage}% funded 🎉',
  },
  spendingVelocity: {
    title: 'Spending pace alert',
    body: 'At this pace, Everyday runs out {daysShort} days early. ~{suggestedDaily}/day to stay on track.',
  },
  settings: {
    title: 'Notifications',
    paydayIncoming: 'Payday reminders',
    billDueSoon: 'Bill due soon alerts',
    billOverdue: 'Overdue bill alerts',
    weeklyDigest: 'Weekly summary',
    goalMilestone: 'Savings goal milestones',
    spendingVelocity: 'Spending pace warnings',
  },
}
```

### 4.6 Verification

- Start Inngest dev server (`pnpm dev:inngest`)
- Trigger each cron function manually via Inngest dashboard
- Verify push notifications are sent to registered device tokens
- Verify notification preferences are respected (disabled = no push)
- Verify goal milestone fires on allocation confirmation
- `pnpm typecheck && pnpm lint && pnpm test`

---

## Phase 5 — Partner Invite MVP

> **Goal**: Matt invites his partner. Partner creates an account, joins the household, and has full read/write access to everything. No role permissions, no complexity.

### 5.1 Architecture

The database already supports this:
- `tenant_users` table links users to tenants with `role` column
- `tenants` table is the household
- Auth (Better Auth) supports multi-tenant sessions
- Resend is already integrated for email (`packages/capabilities/notifications/src/email.ts`)

**What's missing**: Invite token generation, email sending, and the accept-invite flow.

### 5.2 Database Changes

**File to modify**: [packages/db/src/schema/tenant_user.ts](file:///home/kaesava/projects/money-matters/packages/db/src/schema/tenant_user.ts)

Verify these columns exist (they should per V2_SCOPE.md). If not, add them:

```typescript
inviteToken: varchar('invite_token', { length: 64 }),
inviteEmail: varchar('invite_email', { length: 255 }),
inviteStatus: varchar('invite_status', { length: 20 }).default('PENDING'),
// Possible values: PENDING | ACCEPTED | EXPIRED
invitedAt: timestamp('invited_at'),
```

Create a migration if columns don't exist.

### 5.3 API: Invite Commands

**New file**: `packages/capabilities/tenant/src/commands/invite-partner.command.ts`

```typescript
// Input: { email: string }
// Logic:
//   1. Validate email format (Zod)
//   2. Check no existing active invite for this email+tenant
//   3. Generate cryptographically secure inviteToken (crypto.randomUUID or nanoid)
//   4. Insert tenant_users row: { tenantId, inviteEmail, inviteToken, inviteStatus: 'PENDING', role: 'MEMBER', invitedAt: now }
//   5. Send invite email via Resend:
//      Subject: "You've been invited to manage finances together on Money Matters"
//      Body: "{inviterName} has invited you to join their household budget on Money Matters.
//             Click here to accept: {appUrl}/invite/{inviteToken}"
//   6. Return { success: true, inviteEmail }
```

**New file**: `packages/capabilities/tenant/src/commands/accept-invite.command.ts`

```typescript
// Input: { inviteToken: string, userId: string }
// Logic:
//   1. Look up tenant_users row by inviteToken where inviteStatus = 'PENDING'
//   2. If not found or expired (>7 days since invitedAt): throw InviteExpiredError
//   3. Update row: { userId, inviteStatus: 'ACCEPTED', updatedAt: now }
//   4. Return { tenantId, role: 'MEMBER' }
```

### 5.4 API: Invite Routes

**File to modify**: `apps/api/src/routers/tenant.router.ts`

Add two new procedures:

```typescript
invitePartner: tenantProcedure
  .input(z.object({ email: z.string().email() }).strict())
  .mutation(async ({ input, ctx }) => {
    return invitePartnerHandler(ctx.db)(input, ctx.tenantId, ctx.appId, ctx.userId);
  }),

acceptInvite: authenticatedProcedure  // NOT tenantProcedure (user may not have a tenant yet)
  .input(z.object({ inviteToken: z.string().min(1) }).strict())
  .mutation(async ({ input, ctx }) => {
    return acceptInviteHandler(ctx.db)(input, ctx.userId);
  }),
```

### 5.5 Mobile: Invite UI

**File to modify**: [apps/mobile/src/app/(app)/settings.tsx](file:///home/kaesava/projects/money-matters/apps/mobile/src/app/%28app%29/settings.tsx)

Add a "Household" section with:
- Current household members list (query `tenant_users` for this tenant)
- "Invite Partner" button → opens a simple modal with email input → calls `invitePartner` mutation
- Show pending invites with status

**New file**: `apps/mobile/src/components/InvitePartnerModal.tsx`

Simple modal: email input + "Send Invite" button. On success, show confirmation toast.

### 5.6 Mobile: Accept Invite Flow

**File to modify**: [apps/mobile/src/app/index.tsx](file:///home/kaesava/projects/money-matters/apps/mobile/src/app/index.tsx) (root route)

After authentication, check for pending invite tokens:
1. If the app was opened via a deep link with an invite token (`/invite/{token}`), call `acceptInvite` mutation
2. On success, set the user's active tenant to the invited tenant
3. Navigate to home screen

### 5.7 Web: Invite UI

**File to modify**: `apps/web/src/app/dashboard/settings/page.tsx` (or equivalent)

Same as mobile: "Household" section with members list and "Invite Partner" button.

**New page**: `apps/web/src/app/invite/[token]/page.tsx`

Landing page when partner clicks invite link:
- If user is logged in: call `acceptInvite` → redirect to `/dashboard`
- If user is not logged in: redirect to `/sign-up?invite={token}` → after sign-up, auto-call `acceptInvite`

### 5.8 i18n Keys

```typescript
household: {
  title: 'Household',
  members: 'Members',
  invitePartner: 'Invite Partner',
  inviteEmail: 'Partner\'s email address',
  sendInvite: 'Send Invite',
  inviteSent: 'Invite sent to {email}',
  invitePending: 'Pending',
  inviteAccepted: 'Active',
  inviteExpired: 'Expired',
  acceptInvite: 'Accept Invite',
  inviteAcceptSuccess: 'You\'ve joined {householdName}!',
  inviteExpiredError: 'This invite has expired. Ask your partner to send a new one.',
  inviteEmailSubject: 'You\'ve been invited to Money Matters',
  inviteEmailBody: '{inviterName} has invited you to manage household finances together on Money Matters.',
}
```

### 5.9 Verification

- Invite flow: Settings → Invite Partner → enter email → partner receives email
- Accept flow: Partner clicks link → signs up → auto-joins household → sees full dashboard
- Verify partner sees all categories, transactions, upcoming events
- Verify partner can record expenses, process payday, move money
- Verify both users see each other in the members list
- `pnpm typecheck && pnpm lint && pnpm test`

---

## Cross-Cutting Concerns (Apply Throughout All Phases)

### Documentation Updates

After **each phase**, update these files to reflect changes:
- [FUNCTIONAL_SPEC.md](file:///home/kaesava/projects/money-matters/FUNCTIONAL_SPEC.md) — Update feature descriptions
- [TECHNICAL_SPEC.md](file:///home/kaesava/projects/money-matters/TECHNICAL_SPEC.md) — Update topology, capability matrix, stack table
- [V2_SCOPE.md](file:///home/kaesava/projects/money-matters/V2_SCOPE.md) — Move completed items out of "deferred" (Partner Invite)

### i18n Governance

- **ZERO hardcoded user-facing strings** — all new UI text goes through `t()` helper
- Run `pnpm lint` (includes `check-i18n` verification) after every phase
- Any removed features must have their i18n keys cleaned up (dead key removal)

### Testing Requirements

Per AGENTS.md §21, ALL code MUST have tests:
- Phase 1: Verify existing tests still pass after deletions
- Phase 2: Unit tests for setup flow submission logic + preset data validation
- Phase 3: Unit tests for hero card data derivation + attention items filtering
- Phase 4: Unit tests for each notification function (mock Inngest + DB)
- Phase 5: Unit tests for invite token generation, validation, expiry, acceptance

### File Size Enforcement

Per AGENTS.md §22:
- Files > 250 lines MUST be refactored into smaller files
- `home.tsx` (784 lines) MUST be broken into components during Phase 3
- `page.tsx` (504 lines) MUST be broken into components during Phase 3

---

## Summary: What Gets Deleted

| Item | Type | Reason |
|------|------|--------|
| `packages/capabilities/money/` | Entire package | Empty deprecated placeholder |
| `packages/capabilities/geo/` | Entire package | Zero consumers in any app code |
| `apps/api/src/routers/geo.router.ts` | Router file | Orphaned by geo removal |
| `apps/mobile/src/app/(setup)/configure.tsx` | Setup screen | Merged into Step 2 |
| `apps/mobile/src/app/(setup)/bank-accounts.tsx` | Setup screen | Moved to Settings |
| `apps/web/src/app/setup/components/CategoryTargetsStep.tsx` | Setup component | Merged into Step 2 |
| `apps/web/src/app/setup/components/BankAccountsSetupStep.tsx` | Setup component | Moved to Settings |
| `next_to_implement.md` | Planning doc | Superseded by this plan |
| `temp_implementation_plan.md` | Planning doc | Superseded by this plan |

## Summary: What Gets Created

| Item | Type | Phase |
|------|------|-------|
| `packages/types/src/setup-presets.ts` | Shared preset data | 2 |
| `apps/mobile/src/components/DashboardHeroCard.tsx` | Mobile component | 3 |
| `apps/mobile/src/components/AttentionItemsList.tsx` | Mobile component | 3 |
| `packages/ui/src/mobile/CollapsibleSection.tsx` | Shared UI component | 3 |
| `packages/ui/src/web/CollapsibleSection.tsx` | Shared UI component | 3 |
| `packages/capabilities/notifications/src/scheduled-notifications.ts` | 6 Inngest functions | 4 |
| `packages/capabilities/tenant/src/commands/invite-partner.command.ts` | Invite command | 5 |
| `packages/capabilities/tenant/src/commands/accept-invite.command.ts` | Accept command | 5 |
| `apps/mobile/src/components/InvitePartnerModal.tsx` | Mobile component | 5 |
| `apps/web/src/app/invite/[token]/page.tsx` | Web invite page | 5 |
