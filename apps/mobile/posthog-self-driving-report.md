# PostHog Self-driving Setup Report

**Project:** money-matters (id: 537878)
**Date:** 2026-08-02
**App:** Expo/React Native mobile (Android) — `posthog-react-native` SDK with `posthog.screen()` tracking in `_layout.tsx`

## Summary

PostHog Self-driving has been configured for the money-matters mobile app. Session Replay, Error Tracking, and Support signal sources are wired up; a 7-scout troop (5 built-in specialists + 2 custom app-specific scouts) is running on a daily schedule. Findings will start appearing in the [Self-driving inbox](https://us.posthog.com/project/537878/inbox) within ~30 minutes.

---

## AI data processing

**Status:** Approved — organization-level AI data processing consent was granted before this run.

---

## GitHub

| Item | Status |
|---|---|
| GitHub App integration | Connected during this run (integration id: 197040, org: kaesava) |

Self-driving can now research findings against the repository and open draft PRs for fixable issues.

---

## Products enabled

`products-enable` was not available via this MCP key. The server-side product flips could not be made automatically. Manual action required (see Follow-ups).

| Product | Status | Notes |
|---|---|---|
| Session Replay | Needs manual enable | Mobile app — server flip inert until `posthog-react-native` session recording is enabled in SDK and PostHog settings |
| Error Tracking | Needs manual enable | Mobile app — server flip inert until exception autocapture is wired in SDK |
| Support (Conversations) | Needs manual enable | Idle until an inbound channel (email / inbox / Slack) is connected |

> **Support channel:** once you enable Conversations and connect an inbound channel in PostHog, tickets will flow to the inbox automatically — no further setup needed.

---

## Signal sources

All sources created fresh (project had no prior source configs).

| source_product | source_type | Action |
|---|---|---|
| `signals_scout` | `cross_source_issue` | Already on by default — no row needed |
| `health_checks` | `health_issue` | **Enabled** (id: 019fbe3a-679e-76a5-aad2-1981c421a615) |
| `error_tracking` | `issue_created` | **Enabled** (id: 019fbe3a-6b90-7374-85d2-164d9626830f) |
| `error_tracking` | `issue_reopened` | **Enabled** (id: 019fbe3a-6deb-75ee-a9cc-57cbc9c244ed) |
| `error_tracking` | `issue_spiking` | **Enabled** (id: 019fbe3a-71da-7f7e-9027-fa6827aba0ee) |
| `session_replay` | `session_analysis_cluster` | **Enabled** (id: 019fbe3a-7533-7163-94a2-39711fadde67, sample rate: 10%) |
| `conversations` | `ticket` | **Enabled** (id: 019fbe3a-786e-7411-88c8-cf6547cf54ec) — dormant until inbound channel connected |

---

## Connected tools

No connected-tool sources were selected.

| Tool | Status |
|---|---|
| GitHub Issues | Not used |
| Linear | Not used |
| Jira | Not used |
| Sentry | Not used |
| Zendesk | Not used |

---

## Scout troop

**Run budget:** 100 runs/day (early-access default, 0 used today). Banner: *"Scouts are in early access. Each project gets up to 100 scout runs a day. Contact team-self-driving@posthog.com if you need more."*

**7 scouts enabled** (within the 10-scout ceiling):

| Scout | Type | Reason enabled |
|---|---|---|
| `signals-scout-general` | Built-in | Always on — cross-product correlations and uncovered surfaces |
| `signals-scout-product-analytics` | Built-in | Screen tracking confirmed; watches saved funnel regressions |
| `signals-scout-feature-flags` | Built-in | PostHog React Native feature flags likely in use for SaaS rollouts |
| `signals-scout-revenue-analytics` | Built-in | Stripe billing confirmed (`packages/capabilities/billing/`) |
| `signals-scout-health-checks` | Built-in | Fresh setup; catches instrumentation gaps |
| `signals-scout-mm-onboarding` | **Custom** | See Custom Scouts section |
| `signals-scout-mm-auth-funnel` | **Custom** | See Custom Scouts section |

**22 scouts disabled:**

| Scout | Reason |
|---|---|
| `signals-scout-error-tracking` | Covered by native `error_tracking` source (step 4) |
| `signals-scout-session-replay` | Covered by native `session_replay` source (step 4) |
| `signals-scout-surveys` | 0 surveys in project |
| `signals-scout-ai-observability` | No `$ai_*` events or LLM SDK detected |
| `signals-scout-web-analytics` | Mobile app — no web traffic |
| `signals-scout-web-vitals` | Mobile app — no Core Web Vitals |
| `signals-scout-csp-violations` | No CSP configured for mobile |
| `signals-scout-experiments` | No active A/B experiments confirmed |
| `signals-scout-logs` | PostHog logs product not in use |
| `signals-scout-customer-analytics` | No group/accounts analytics confirmed |
| `signals-scout-data-pipelines` | No CDP destinations or batch exports |
| `signals-scout-data-warehouse` | No warehouse imports configured |
| `signals-scout-anomaly-detection` | Not among top-used surfaces |
| `signals-scout-conversations` | No conversation data yet |
| `signals-scout-apm` | No distributed tracing |
| `signals-scout-mcp-tool-calls` | No `$mcp_tool_call` telemetry |
| `signals-scout-replay-vision` | No Replay Vision scanners configured |
| `signals-scout-inbox-validation` | Fresh setup — no resolved reports to validate yet |
| `signals-scout-insight-alerts` | No insight alerts configured |
| `signals-scout-observability-gaps` | Kept tight; health-checks covers instrumentation |
| `signals-scout-skills-store` | Not a priority surface |
| `signals-scout-tasks` | Not a priority surface |

Re-enable follow-ups: enable `signals-scout-surveys` if you add PostHog surveys; `signals-scout-experiments` when you run A/B tests; `signals-scout-ai-observability` if you add LLM features; `signals-scout-logs` if you enable the PostHog logs product.

---

## Custom scouts

### `signals-scout-mm-onboarding`

- **Watches:** setup wizard screen completion rate via `$screen` events with `$screen_name` matching `/(setup)/`
- **Discriminator:** ratio of `/(setup)/complete` visits to total `/(setup)/` screen visits in a 7-day rolling window; a ≥10 percentage-point drop with ≥20 affected users is report-worthy
- **Why no built-in covers it:** `signals-scout-product-analytics` watches *saved PostHog funnel insights* — on a fresh project with no saved funnels it is silent; this scout reads the raw `$screen` events directly against the app's file-path screen names
- **Explore patterns:** completion ratio over time, step-level drop-off table, device/OS breakdown

### `signals-scout-mm-auth-funnel`

- **Watches:** sign-up and sign-in screen visits (`/(auth)/sign-in`, `/(auth)/sign-up`) vs. successful onward navigation to `/(app)/home` or `/(setup)/`
- **Discriminator:** ratio of users who visit an auth screen and subsequently reach home/setup within the same day; a ≥15 percentage-point drop with ≥10 affected users is report-worthy
- **Why no built-in covers it:** error tracking catches crashes/exceptions but not navigation-level abandonment; `signals-scout-general` is not granular enough for a specific auth funnel regression on a known screen-path topology
- **Explore patterns:** auth-to-home funnel by day, sign-in vs. sign-up split, OS/device breakdown

**Surfaces considered and ruled out:**
- Subscription conversion funnel — overlaps with `signals-scout-revenue-analytics` (Stripe sync + goal-miss); not a separate gap
- Inngest background workflows — PostHog events for workflow execution not confirmed in this repo's instrumentation
- Core expense/spending loop — specific custom events for expense creation not confirmed; only screen tracking is verified

**Noise escape hatch:** if a custom scout turns out noisy, set `emit: false` on its config in PostHog Settings → Scouts to switch it to dry-run (it still runs and logs but writes nothing to the inbox).

---

## Follow-ups

- [ ] **Enable Session Replay** in PostHog: Settings → Session replay → "Record user sessions". Then enable session recording in `posthog-react-native` SDK (`enableSessionReplay: true`).
- [ ] **Enable Error Tracking** in PostHog: Settings → Error tracking → "Enable exception autocapture". Then wire PostHog exception capture in `_layout.tsx` alongside the existing Sentry init (or replace/supplement Sentry with PostHog's native exception capture for in-product tracking).
- [ ] **Enable Support (Conversations)** in PostHog: navigate to Conversations in the product sidebar. Then connect an inbound channel (email / inbox / Slack) so the `conversations / ticket` source starts receiving data.
- [ ] **Connect Sentry** as a connected-tool source if you want Sentry issues to also flow into the Self-driving inbox — visit [New data warehouse source](https://us.posthog.com/project/537878/pipeline/new/source) and select Sentry.
- [ ] **Save PostHog funnels** for your core product flows (onboarding, home → transaction, payday allocation) so `signals-scout-product-analytics` has saved insights to watch against.
- [ ] **Connect a Support channel** (email / inbox / Slack) in the Conversations product so the `conversations / ticket` responder activates.

---

## What happens next

- The scout coordinator picks up fresh configs within **~30 minutes**; first runs fire then.
- Each enabled scout draws one run from the daily budget (100 runs/day during early access); 7 scouts = ~7 runs/day, well within budget.
- Findings cluster into reports in the [Self-driving inbox](https://us.posthog.com/project/537878/inbox).
- Immediately-actionable reports can automatically start coding tasks and open draft PRs in the connected GitHub repo (`kaesava`).
