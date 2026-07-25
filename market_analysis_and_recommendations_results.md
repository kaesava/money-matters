# Money Matters — Product Analysis & Gap Recommendations

> **Persona**: 35-year-old Australian male, family of 3 (partner + 1 child), salaried professional, tried multiple budget apps without lasting success.
> **Objective**: Identify what will make this app not just *used* but *useful and sticky*, with zero-friction for sustained adoption.

---

## Executive Summary

Money Matters has a **technically sophisticated foundation** — the monorepo architecture, 5-step waterfall allocation engine, multi-tenancy, and platform parity between web and mobile are all well-engineered. The *concept* — forward-looking allocation rather than backward-looking tracking — is the **single most defensible differentiation** in the market.

However, viewed through the lens of "Matt" (our persona), the app currently presents **too much cognitive friction for daily use**, and is **missing the features that would make him come back daily without thinking about it.** The gap isn't in the engine — it's in the experience layer and the day-1 value proposition.

> [!CAUTION]
> **The #1 risk**: 67-71% of budgeting app users abandon within 30 days. The current setup wizard + manual-entry-only model puts Money Matters squarely in the high-abandonment category. Every recommendation below is filtered through: *"Would Matt still be using this on Day 31?"*

---

## Part 1: Competitive Landscape (What Matt Has Already Tried)

| App | Why Matt Downloaded It | Why Matt Stopped | Key Takeaway for Us |
|-----|----------------------|-----------------|-------------------|
| **YNAB** (~$150 AUD/yr) | "Give every dollar a job" philosophy | Steep learning curve. Partner never engaged. Felt like homework. Not optimised for AUD/fortnightly pay. | Our allocation engine already does this better — but we need to make it **invisible**, not a chore. |
| **Pocketbook** (RIP 2022) | Free, Aussie, auto-categorised | Shut down. Passive tracking never changed behaviour. | Tracking alone ≠ behaviour change. We're right to be allocation-first. |
| **Frollo** (Free) | Open Banking CDR, genuinely Aussie | Lacks deep custom categories. B2B focus means consumer UX is secondary. | CDR/Open Banking is the gold standard for reducing friction. We should design for it now. |
| **WeMoney** (Freemium) | Community, debt paydown tools | Ad-supported free tier felt cheap. Financial product referrals eroded trust. | Trust is everything. Our calm, premium design language is correct — protect it. |
| **Monarch Money** (~$140 AUD/yr) | Best partner collaboration | No Aussie bank support. Expensive. Sync issues. | Partner collaboration is a killer feature. Our V2 defer is a real risk. |
| **PocketGuard** (~$105 AUD/yr) | "In My Pocket" safe-to-spend number | Lacks long-term planning. No Aussie nuance. | Our "Can We Afford This?" widget is our version — and it's better. Promote it harder. |
| **Goodbudget** (~$110 AUD/yr) | Digital envelopes, manual = disciplined | UI feels dated. Manual entry fatigue. | Manual entry works for ~30% of budget users — but only with extreme ease-of-use. |

### Key Market Insight

> The Australian market has a **vacuum**. Pocketbook is dead. Frollo is B2B-focused. WeMoney is ad-corrupted. YNAB and Monarch are US-centric and expensive. **There is no premium-quality, allocation-first, Aussie-native budgeting app for families.**

---

## Part 2: Honest Assessment of Current State

### ✅ What Money Matters Gets Right

| Strength | Why It Matters for Matt |
|----------|----------------------|
| **Forward-looking allocation engine** | Matt doesn't want to know he overspent last week. He wants to know his car rego will be funded when it's due in 4 months. This is the killer differentiator. |
| **5-step waterfall with deficit repair** | Automatic self-healing. If Matt's partner overspends the Everyday pool, the system automatically fixes it next payday. No guilt spiral. |
| **"Can We Afford This?" calculator** | "The kids need new school shoes — can we afford $120?" This is the #1 question every family asks, and no competitor answers it this clearly. |
| **Single Everyday pool** | Avoids the micromanagement trap that killed Matt's YNAB habit. You don't need to track whether coffee comes from "Dining" or "Beverages". |
| **Traffic-light category health** | Instant visual — green/amber/red. Matt can glance in 2 seconds and know if something needs attention. |
| **Platform parity (Web + Mobile)** | Matt checks on his phone in the car park, partner reviews on the laptop at night. Same data, same UX. |
| **i18n + AUD formatting** | Subtle but critical. `$1,234.56` not `$1234.56`. Australian date formats. |
| **Offset account awareness** | Most competitors don't even understand what an offset account is. This is genuine Aussie empathy. |

### ❌ Critical Problems (Be Honest, Matt Would)

#### 1. 🔴 **Setup Is a Wall, Not a Welcome Mat**
The current setup wizard requires: bank accounts → income sources → expense categories → category schedules → bank mapping. That's **5+ screens of configuration before Matt sees a single number.** 

- **Competitor benchmark**: PocketGuard gives you a "safe-to-spend" number in under 60 seconds with bank sync.
- **The kill shot**: Matt's partner will never complete this setup. If the partner doesn't use it, Matt stops too.
- **Recommendation**: [See Gap #1 below]

#### 2. 🔴 **100% Manual Entry Is a Day-90 Death Sentence**
Every expense must be manually entered. No bank import. No CSV import. No OCR receipt scan. This means:
- Matt forgets to log the $4.50 coffee
- By Friday, the Everyday balance is wrong by $47
- Trust in the numbers evaporates
- Matt stops checking

> Market data: Manual-only budget apps have a **3x higher abandonment rate** than apps with auto-sync.

- **Current plan**: Bank CSV import and Open Banking CDR are deferred to "Release 2"
- **This is the wrong call for MVP.** At minimum, CSV import for the Big 4 banks should be V1. [See Gap #2]

#### 3. 🟡 **No Partner Experience at All**
Matt and his partner share finances. Right now:
- Only one person can use the app
- Partner invite is "deferred to V2"
- The `household_members` table exists but the UX doesn't

This is a **stickiness killer**. Monarch Money's #1 selling point is partner collaboration. If Matt's partner can't see the budget, they'll resent the app ("just another thing Matt's trying that I'm excluded from").

- **Minimum viable partner**: Email invite → partner creates account → shares full read/write access. No fancy role permissions needed for V1. [See Gap #3]

#### 4. 🟡 **No Onboarding Guidance or Templates**
After setup, Matt lands on a dashboard with empty states. There's no:
- Pre-populated category templates for Australian families (Council rates, private health, school fees, rego, Medicare gap)
- Guided first-paycheck allocation walkthrough
- "Your budget is healthy" / "You're on track" positive reinforcement

- **Competitor benchmark**: YNAB has 30+ hours of educational content. EveryDollar has Dave Ramsey coaching.
- **We don't need a course** — we need 3-5 contextual nudges in the first week. [See Gap #4]

#### 5. 🟡 **Dashboard Cognitive Load**
The home screen tries to show everything:
- 4 stat chips
- Quick Actions panel (collapsible)
- Can Afford widget
- Bank reconciliation card
- Move Money button
- Upcoming events list with filters, search, bulk delete

Matt has **3 seconds of attention** when he opens the app. He needs to see:
1. How much can I spend today? (Everyday balance)
2. Is anything due soon? (Next upcoming bill)
3. Am I on track? (Overall health)

Everything else is secondary. [See Gap #5]

#### 6. 🟡 **No Notifications = No Habit Loop**
Push notifications are "wired" but the actual notification logic is minimal:
- No "payday coming tomorrow" reminder
- No "electricity bill due in 3 days" alert
- No weekly summary ("You spent $X this week, $Y remaining")
- No positive reinforcement ("Car Rego is now 78% funded!")

Stickiness research is clear: **Trigger → Action → Reward → Investment** is the proven habit loop. Without triggers (notifications), there's no habit. [See Gap #6]

#### 7. 🟢 **Reconciliation UX Is Too Complex**
Bank reconciliation requires: open modal → enter actual balance → compute delta → manually adjust categories. This is an accounting exercise, not a consumer experience.

- **Matt won't do this.** His partner definitely won't.
- The system should auto-reconcile if bank sync is available, or make reconciliation a single "Does this look right? Yes/No" confirmation. [See Gap #7]

#### 8. 🟢 **No Spending Insights or Trends**
Matt wants to know: "Are we spending more on groceries than last month?" The current transaction list is a flat ledger with search and filters. There are no:
- Category spending trends (month-over-month)
- Spending velocity warnings ("At this rate, your Everyday pool runs out 4 days before payday")
- Historical comparison

[See Gap #8]

---

## Part 3: Prioritised Gap Recommendations

> **Scoring**: Each gap is rated on **Impact** (how much it moves the needle for Matt's Day-31 retention) and **Effort** (engineering complexity against the existing codebase).

### Tier 1 — Must-Have for MVP Launch (Without these, Matt won't survive Day 30)

---

#### Gap #1: 🏗️ Instant-Value Onboarding (Replace Setup Wall)

| Dimension | Rating |
|-----------|--------|
| **Impact** | 🔴 Critical — current setup wizard will lose 60%+ of signups |
| **Effort** | Medium (mostly UI/UX, re-uses existing APIs) |

**Current**: 5-screen wizard → bank accounts → income → categories → schedules → mapping
**Proposed**: 2-step start + progressive disclosure

```
Step 1 (30 seconds): "How much do you get paid, and how often?"
    → Single income source created
    → System pre-populates Australian family category templates

Step 2 (60 seconds): "Which of these bills do you have?"
    → Checkbox list: Mortgage/Rent, Electricity, Gas, Water, 
      Council Rates, Car Rego, Car Insurance, Home Insurance,
      Private Health (Bupa/Medibank), School Fees, Internet,
      Phone, Streaming, Gym
    → For each checked: "How much, roughly?" (single field)
    → System creates categories + schedules automatically

→ Dashboard unlocked. Everything else (bank accounts, fine-tuning 
  amounts, savings goals) can be done later through Settings.
```

**Why it works**: Matt gets a functioning budget in under 2 minutes. He can refine later. The "configure bank accounts" step becomes optional progressive disclosure, not a gate.

**Technical impact**: Mostly UI work in `apps/mobile/src/app/(setup)` and `apps/web/src/app/setup`. Create a `templateCategories` seed in `packages/db` with Aussie defaults. Existing `createCategory`, `createExpenseSource` APIs work as-is.

---

#### Gap #2: 📥 Bank Statement CSV Import (Don't Wait for V2)

| Dimension | Rating |
|-----------|--------|
| **Impact** | 🔴 Critical — manual-only entry has 3x abandonment rate |
| **Effort** | Medium-High (parser logic + matching UI, but data model supports it) |

**Current**: 100% manual transaction entry. CSV import "deferred to Release 2."
**Proposed**: V1 includes CSV import for Big 4 Australian banks + ING + Macquarie

```
Settings → Bank Accounts → [Account Name] → "Import Statement"
    → Upload CSV (drag-and-drop on web, file picker on mobile)
    → System parses (bank-specific column mappings)
    → Shows preview: Date | Description | Amount | Suggested Category
    → User bulk-confirms or adjusts categories
    → Transactions created with source: "IMPORT"
```

**Why it works**: Matt downloads his CBA statement monthly. 30 seconds of drag-and-drop replaces 100+ manual entries. Trust in the numbers goes from "probably right" to "definitely right."

**Technical impact**: The `transaction_ledger` already has a `source` enum (`MANUAL | IMPORT`). Add parser logic in a new `packages/capabilities/import` vertical slice. Each bank CSV has a known column format (CBA: Date, Amount, Description, Balance). Create bank-specific parsers. Matching/categorisation logic can start rules-based (keyword match on description → category) and evolve to AI in V2.

**Minimum scope**: CBA + Westpac + ANZ + NAB cover ~80% of Australian households.

---

#### Gap #6: 🔔 Smart Notification System (The Habit Loop)

| Dimension | Rating |
|-----------|--------|
| **Impact** | 🔴 Critical — no triggers = no habit = no retention |
| **Effort** | Medium (Inngest infrastructure exists, push token registration works) |

**Current**: Push token registration works. Notification content/scheduling is minimal.
**Proposed**: 6 core notification types

| Notification | Trigger | Timing |
|-------------|---------|--------|
| **Payday incoming** | Income event due within 24hrs | Day before payday |
| **Bill due soon** | Expense event due within 3 days | 3 days before |
| **Bill overdue** | Expense event past due, status still UPCOMING | Day after due date |
| **Weekly digest** | Cron (Sunday evening) | Weekly |
| **Goal milestone** | Category balance crosses 25/50/75/100% of target | On transaction |
| **Spending velocity warning** | Everyday pool projected to hit $0 before next payday | When projection triggers |

**Why it works**: Matt gets a Sunday night summary: "This week: $890 spent, $420 left until Thursday. Car Rego is 72% funded. Electricity due Wednesday." He doesn't even need to open the app to feel in control.

**Technical impact**: Inngest is already wired. `packages/capabilities/notifications` has the infrastructure. Create 6 Inngest functions with the above triggers. Expo push notifications already registered. Add user preference toggles for each notification type (respect user control).

---

### Tier 2 — High Impact, Differentiators (What Makes Matt Tell His Mates)

---

#### Gap #5: 🎯 Simplified Dashboard (3-Second Glance Test)

| Dimension | Rating |
|-----------|--------|
| **Impact** | 🟡 High — reduces cognitive load, increases daily check-ins |
| **Effort** | Medium (UI restructure, same data/APIs) |

**Current**: Dense dashboard with 6+ sections competing for attention.
**Proposed**: Tiered information hierarchy

```
┌─────────────────────────────────────┐
│  HERO CARD (always visible)         │
│  ┌────────────────────────────────┐ │
│  │ Everyday Balance: $847.23      │ │
│  │ "You're on track" ● Green      │ │
│  │ Next pay: Thu 31 Jul ($2,400)  │ │
│  └────────────────────────────────┘ │
│                                     │
│  ⚠️ ATTENTION NEEDED (if any)       │
│  ├── Electricity due Wed ($187)     │
│  └── Car Insurance overdue ($124)   │
│                                     │
│  ▼ QUICK ACTIONS (collapsed by      │
│     default, expandable)            │
│                                     │
│  ▼ ALL UPCOMING (scrollable list)   │
│                                     │
│  ▼ CATEGORY HEALTH (at bottom)      │
└─────────────────────────────────────┘
```

**Key changes**:
- **Hero card** dominates the top 40% of the screen. One number, one status, one upcoming event.
- **Attention items** surface automatically (overdue/at-risk only). No filter needed.
- Quick Actions, full upcoming list, and category health are collapsed/secondary.
- "Can We Afford This?" moves to the FAB or a persistent search bar, not a dashboard card.

**Why it works**: Matt glances at his phone in the Woolies car park → "$847 left, on track" → done. If there's something needing attention, it's right there below the hero card.

---

#### Gap #4: 🎓 First-Week Guided Experience + Aussie Templates

| Dimension | Rating |
|-----------|--------|
| **Impact** | 🟡 High — bridges the gap between setup completion and "aha" moment |
| **Effort** | Low-Medium (templates are data, guidance is UI overlays) |

**Current**: After setup, users land on an empty dashboard with no guidance.
**Proposed**: 

**A. Australian Family Category Templates** (pre-populated during onboarding):
```
REGULAR BILLS:
├── Mortgage/Rent
├── Electricity (quarterly → monthly equivalent)
├── Gas
├── Water (quarterly → monthly equivalent)
├── Council Rates (quarterly → monthly equivalent)
├── Home & Contents Insurance (annual → monthly equivalent)
├── Car Insurance (annual → monthly equivalent)
├── Car Rego (annual → monthly equivalent)  
├── Private Health Insurance
├── Internet
├── Mobile Phone(s)
├── Streaming Services
└── School Fees (if applicable)

SAVINGS GOALS:
├── Emergency Fund (3-month target)
├── Car Replacement Fund
├── Holiday Fund
└── Christmas/Birthdays

EVERYDAY:
└── Single pool (default)
```

**B. First-Paycheck Walkthrough** (contextual, not a tutorial):
- On first income event: "Your first payday! Let's see how the allocation works." → Highlight the waterfall → "Accept the recommendation or adjust." → "Done! Your categories are funded."
- After first week: "You've been tracking for 7 days. Here's your first weekly summary."

---

#### Gap #3: 👫 Minimum Viable Partner Access

| Dimension | Rating |
|-----------|--------|
| **Impact** | 🟡 High — household buy-in is the #1 predictor of sustained usage |
| **Effort** | Medium (DB schema exists, auth flow + invite UX needed) |

**Current**: `household_members` table exists with `role`, `inviteToken`, `inviteStatus` columns. No UX.
**Proposed**: MVP partner flow

```
Settings → Household → "Invite Partner"
    → Enter partner's email
    → System sends email via Resend (already integrated)
    → Partner clicks link → Sign up / Sign in
    → Auto-joins household with Member role
    → Full read/write access to everything (no permissions complexity in V1)
```

**Why it works**: Matt's partner can see the budget on their own phone. When Matt's partner sees "Car Rego: 72% funded, on track" without being told, the conversation changes from "Are we saving enough?" to "We're on track." That's transformative for household financial stress.

**Technical impact**: 
- `tenant_users` table already supports multi-user per tenant
- Resend is already integrated for email
- Auth (Better Auth) supports multi-tenant user sessions
- The invite flow is: create invite token → send email → on partner signup, link `userId` to `tenantId`
- **No role-based permission changes needed** — V1 is full access for all household members

---

#### Gap #8: 📊 Spending Insights (Month-over-Month)

| Dimension | Rating |
|-----------|--------|
| **Impact** | 🟡 High — transforms passive recording into active learning |
| **Effort** | Medium (query aggregation + charting UI) |

**Current**: Flat transaction list with search/filter. No trend analysis.
**Proposed**: Category spending trends + velocity projection

**A. Monthly Comparison** (Categories tab or separate Insights tab):
```
Groceries:    July $680  │  June $720  │  May $695   📉 -5.6%
Eating Out:   July $340  │  June $280  │  May $310   📈 +21.4%
Petrol:       July $210  │  June $195  │  May $220   📈 +7.7%
```

**B. Spending Velocity Warning** (Dashboard integration):
```
⚡ At your current spending pace, your Everyday pool 
   runs out 3 days before your next payday.
   
   Suggestion: Reduce daily spend by ~$15/day to stay on track.
```

**C. Paycheck-to-Paycheck Progress** (Home screen):
```
This pay period: Day 8 of 14
├── Budget:  $1,200 (Everyday)
├── Spent:   $620 (51.7%)
├── Pace:    On track ●
└── Daily:   ~$96.67/day remaining
```

**Technical impact**: Aggregation queries on `transaction_ledger` grouped by `categoryId` and month. No new tables needed. The velocity calculation is a pure function: `(everydayBalance / daysUntilNextPayday)`.

---

### Tier 3 — Nice-to-Have (Polish That Compounds Retention)

---

#### Gap #7: 🏦 Simplified Reconciliation

| Dimension | Rating |
|-----------|--------|
| **Impact** | 🟢 Medium — reduces friction for a monthly chore |
| **Effort** | Low (mostly UX simplification) |

**Current**: Modal → enter actual balance → compute delta → manually adjust categories.
**Proposed**: One-tap confirmation flow

```
Monthly reminder notification: "Time for a quick balance check!"

→ App shows: "We think your savings account has $12,450.
   What does your bank app say?"
→ [Text field: actual balance]
→ If match (within $50): "Looks good! ✓" → Done
→ If mismatch: "There's a $230 difference. 
   Would you like us to adjust your Everyday pool?" → [Yes/No]
→ Single-category adjustment (Everyday or default excess) 
   rather than multi-category spread
```

**Why it works**: Matt checks his bank balance in 10 seconds, enters the number, taps confirm. No accounting exercise.

---

#### Gap #9: 🇦🇺 Deep Australian Financial Integration

| Dimension | Rating |
|-----------|--------|
| **Impact** | 🟢 Medium — differentiator in a market with no Aussie-native competitor |
| **Effort** | Low-Medium per item |

Not all of these are V1, but they should be on the roadmap:

| Feature | Effort | V1? |
|---------|--------|-----|
| **Quarterly bill smoothing** (rates, water, electricity → monthly) | Low | ✅ Yes — template onboarding |
| **Annual bill proration** (rego, insurance → monthly saving target) | Low | ✅ Yes — this is SAVINGS goals |
| **Fortnightly pay cycle** as first-class option | Low | ✅ Already supported |
| **Offset account balance display** | Low | ✅ Already in schema (`isOffset`) |
| **HECS/HELP deduction awareness** | Medium | ❌ V2 |
| **Family Tax Benefit integration** | Medium | ❌ V2 |
| **Open Banking CDR (via Basiq/Frollo API)** | High | ❌ V2 |

---

#### Gap #10: 🎮 Positive Reinforcement & Micro-Celebrations

| Dimension | Rating |
|-----------|--------|
| **Impact** | 🟢 Medium — drives emotional engagement, reduces guilt-shame cycle |
| **Effort** | Low (UI animations + notification copy) |

**Current**: No positive feedback loops. Traffic lights show problems, not progress.
**Proposed**: Celebration moments

```
"🎉 Car Rego is now fully funded — 2 months ahead of schedule!"
"🔥 You've stayed on track for 14 days straight!"
"💪 Your Emergency Fund hit $5,000!"
"📊 You spent 8% less on eating out this month vs last month."
```

Implementation: Triggered on transaction/allocation events. Simple threshold checks. Displayed as toast notifications (in-app) and push notifications (optional).

---

## Part 4: Critical Critique of Existing Spec Decisions

| Decision | My Verdict | Reasoning |
|----------|-----------|-----------|
| **Shortfall Events removed** | ✅ Correct | Over-engineered for V1. Deficit Repair in the waterfall handles this automatically. |
| **Savings Reconciliation removed** | ✅ Correct | Too complex. Simplified one-tap reconciliation (Gap #7) is better. |
| **Auto-confirm allocation (no review gate)** | ⚠️ Risky | Matt wants to *see* the split, even if he doesn't change it. Make it "auto-confirm with notification + 1-tap review" rather than silent. |
| **Sub-categories under Everyday** | ✅ Correct | Optional tagging, single pool deduction. Avoids micromanagement. |
| **Partner invite deferred to V2** | ❌ **Disagree** | This should be V1. Household buy-in is the #1 retention predictor. Minimal effort given existing schema. |
| **CSV import deferred to V2** | ❌ **Disagree** | At least Big 4 CSV import should be V1. Manual-only has 3x abandonment. |
| **Offline-first deferred to V2** | ✅ Correct for V1 | Complex. Online-only is fine for V1 if the app is fast. |
| **`geo` and `file-notes` capabilities** | ⚠️ Low priority | Location tagging on expenses is a nice-to-have, not a retention driver. File notes/receipts are useful but not a Day-1 need. Don't invest more here until Tier 1 gaps are closed. |
| **Notifications "wired but empty"** | ❌ **Critical oversight** | Infrastructure without content is useless. Notifications are the #1 habit loop trigger. Must ship with core notification types. |

---

## Part 5: Recommended MVP Prioritisation Matrix

| Priority | Feature | Impact | Effort | Days (est.) |
|----------|---------|--------|--------|-------------|
| **P0** | Simplified Onboarding + Aussie Templates | 🔴 Critical | Medium | 5-7 |
| **P0** | Smart Notifications (6 core types) | 🔴 Critical | Medium | 4-6 |
| **P1** | Dashboard Simplification (Hero Card) | 🟡 High | Medium | 3-5 |
| **P1** | Bank CSV Import (Big 4) | 🟡 High | Medium-High | 7-10 |
| **P1** | Partner Invite (MVP) | 🟡 High | Medium | 5-7 |
| **P1** | First-Week Guided Experience | 🟡 High | Low-Med | 3-4 |
| **P2** | Spending Velocity + Trends | 🟡 High | Medium | 5-7 |
| **P2** | Simplified Reconciliation | 🟢 Medium | Low | 2-3 |
| **P2** | Positive Reinforcement & Celebrations | 🟢 Medium | Low | 2-3 |
| **P3** | Australian-specific templates & quarterly smoothing | 🟢 Medium | Low | 2-3 |

---

## Part 6: The "Matt Test" — Will He Still Use This on Day 31?

### Without the changes above:
```
Day 1:  Matt downloads. Excited. Starts setup wizard.
Day 1:  Setup takes 15 minutes. Mildly frustrated but perseveres.
Day 2:  Manually enters 3 expenses. Forgets 2 more.
Day 5:  Partner asks "what's that app you're using?" — can't share it.
Day 7:  Everyday balance doesn't match reality. Trust eroding.
Day 14: Matt logs in, sees dashboard with lots of info. Can't find the one number he needs.
Day 21: Hasn't opened the app in 4 days. No notifications reminded him.
Day 30: Uninstalls. "Good concept, but too much work."
```

### With the changes above:
```
Day 1:  Matt signs up. 2-minute onboarding. Dashboard shows Everyday balance.
Day 1:  Invites partner. Both can see the budget.
Day 2:  Imports CBA statement. 30 seconds. All transactions categorised.
Day 3:  Notification: "Electricity due Wednesday ($187). Category is funded ✓"
Day 7:  Weekly digest: "You spent $890 this week. On track for your $1,200 Everyday budget."
Day 14: Payday arrives. Notification: "Your pay was allocated. Car Rego is now 72% funded!"
Day 21: Partner checks app independently. "We can afford the school shoes."
Day 30: Matt recommends it to his mate at the pub. "It just works. I don't even think about it."
Day 31: Still using it.
```

---

> [!IMPORTANT]
> **The allocation engine is the product.** Everything else — onboarding, CSV import, notifications, partner access — is about **reducing the friction between Matt and that engine.** The engine is already built. The friction-reduction is what will determine success or failure.

---

## Appendix: Quick Wins (< 1 Day Each)

These are small UX improvements that compound into a smoother experience:

1. **Default Quick Actions to collapsed** on mobile (screen real estate matters)
2. **Auto-select "Everyday" category** in Quick Expense (90% of expenses are Everyday)
3. **Show "days until next payday"** on the hero card (context for spending decisions)
4. **Add swipe-to-mark-paid** on upcoming expense events (mobile-native gesture)
5. **Format amounts with `$` prefix** in all input fields (reduce cognitive parsing)
6. **Add haptic feedback** on successful transaction recording (tactile confirmation)
7. **Pre-fill today's date** in all date pickers (reduce one tap per entry)
8. **Show running Everyday balance** after transaction entry ("$847.23 → $762.23 remaining")
9. **Category colour dots** next to transaction entries (visual scanning)
10. **"Undo" toast** after recording an expense (mistake recovery without friction)
