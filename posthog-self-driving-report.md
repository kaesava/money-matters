# PostHog Self-driving setup report

**Project:** money-matters  
**Date:** 2026-08-02  
**Inbox:** https://us.posthog.com/project/537878/inbox

## Summary

PostHog Self-driving has been configured for the money-matters project. Session Replay, Error Tracking, and Support signal sources were already enabled; the scout troop was tuned to six scouts matching the project's active surfaces. Findings will start appearing in the [Self-driving inbox](https://us.posthog.com/project/537878/inbox) within ~30 minutes as scouts run on their first tick.

---

## AI data processing

**Status:** Approved (enforced by the wizard's opt-in gate before setup ran).

---

## GitHub

| | |
|---|---|
| **Status** | Already connected |
| **Account** | kaesava |
| **Integration ID** | 197040 |
| **Connected at** | 2026-08-01 |

Self-driving can research findings against this repo and open draft PRs for fixable issues.

---

## Products enabled

The `products-enable` MCP tool was unavailable in this deployment. All three products must be switched on manually.

| Product | Status | Notes |
|---|---|---|
| Session Replay | **Follow-up required** | Enable in PostHog: Settings → Session replay → "Record user sessions" |
| Error Tracking | **Follow-up required** | Enable in PostHog: Settings → Error tracking → "Enable exception autocapture" |
| Support (Conversations) | **Follow-up required** | Enable in PostHog product sidebar → Support |

**Web init check (apps/web/src/lib/posthog-client.ts):** Clean — `capture_exceptions: true` is set, no `disable_session_recording` override. Once the product is enabled server-side, the web SDK picks it up automatically.

**Mobile (apps/mobile/src/config/posthog.ts):** No overrides blocking session replay or exception capture. However, the server-side product flip is inert for React Native — session replay on mobile requires additional SDK configuration (see Follow-ups).

**Support note:** Once the Conversations product is on, tickets only arrive after connecting an inbound channel (email / inbox / Slack) in PostHog Settings → Support.

---

## Signal sources

All required signal sources were already enabled from a prior setup run.

| source_product | source_type | Action |
|---|---|---|
| `health_checks` | `health_issue` | Already enabled |
| `error_tracking` | `issue_created` | Already enabled |
| `error_tracking` | `issue_reopened` | Already enabled |
| `error_tracking` | `issue_spiking` | Already enabled |
| `session_replay` | `session_analysis_cluster` | Already enabled |
| `conversations` | `ticket` | Already enabled |
| `signals_scout` | `cross_source_issue` | On by default (no config row needed) |

---

## Connected tools

The user selected **None of these** — no external issue tracker, error tracker, or support tool was connected.

| Tool | Status |
|---|---|
| Sentry | Not used (not selected) |
| GitHub Issues | Not used (not selected) |
| Linear | Not used (not selected) |
| Jira | Not used (not selected) |
| Zendesk | Not used (not selected) |

---

## Scout troop

**Run budget:** 100 runs/day (early-access default) · 3 per tick · 0 used today  
**Banner:** "Scouts are in early access. Each project gets up to 100 scout runs a day. Contact team-self-driving@posthog.com if you need more."

### Enabled (6 scouts)

| Scout | Reason |
|---|---|
| `signals-scout-general` | Always on — cross-product correlations and surfaces no specialist covers |
| `signals-scout-feature-flags` | Feature flags in active use (`preloadFeatureFlags: true`, `sendFeatureFlagEvent: true` in mobile SDK) |
| `signals-scout-health-checks` | Watches PostHog setup health issues — always actionable |
| `signals-scout-product-analytics` | Heavy event usage across web, mobile, and API |
| `signals-scout-revenue-analytics` | Stripe billing in active use (`stripe` ^17.0.0 in billing capability) |
| `signals-scout-payday-health` | **Custom** — watches `payday_confirmed` per-user rate drops (see Custom scouts) |

### Disabled (22 scouts)

| Scout | Reason |
|---|---|
| `signals-scout-error-tracking` | Covered by the native error_tracking source — no duplication |
| `signals-scout-session-replay` | Covered by the native session_replay source — no duplication |
| `signals-scout-ai-observability` | No LLM SDK or `$ai_*` events found |
| `signals-scout-apm` | No distributed tracing / OpenTelemetry spans configured |
| `signals-scout-anomaly-detection` | No saved dashboards/insights yet — nothing to watch |
| `signals-scout-conversations` | Conversations product not yet active |
| `signals-scout-csp-violations` | No CSP reporting configured |
| `signals-scout-customer-analytics` | No group/accounts analytics (B2B groups not in use) |
| `signals-scout-data-pipelines` | No CDP destinations or batch exports configured |
| `signals-scout-data-warehouse` | No warehouse sources connected |
| `signals-scout-experiments` | No active A/B experiments |
| `signals-scout-inbox-validation` | Fresh setup — no shipped fixes to validate yet |
| `signals-scout-insight-alerts` | No configured insight alerts yet |
| `signals-scout-logs` | PostHog logs product not in use |
| `signals-scout-mcp-tool-calls` | No `$mcp_tool_call` telemetry |
| `signals-scout-observability-gaps` | No saved insights yet — enable once insights exist |
| `signals-scout-replay-vision` | No Replay Vision scanners configured |
| `signals-scout-skills-store` | Not relevant at this stage |
| `signals-scout-surveys` | No surveys in use (0 results) |
| `signals-scout-tasks` | No agent task telemetry |
| `signals-scout-web-analytics` | Enable if web traffic analysis becomes a priority |
| `signals-scout-web-vitals` | Enable if Core Web Vitals monitoring is needed |

Re-enable any of these in [PostHog](https://us.posthog.com/project/537878/inbox) when the corresponding surface becomes active.

---

## Custom scouts

### Created: `signals-scout-payday-health`

**Surface:** `payday_confirmed` events — the event fired when a user confirms their payday in the Money Matters budgeting workflow.

**Discriminator:** `payday_confirmed` events per distinct user per week. A drop in events-per-user while the user base stays flat (not matched by a proportional drop in distinct users) is the real signal — users are doing other things in the app but skipping their payday cycle.

**Why no built-in covers it:** `signals-scout-product-analytics` watches saved funnel/retention insights; there are none yet on a fresh setup. `signals-scout-general` sweeps broadly but won't catch a per-user rate drop in a single domain event. No other built-in scout watches the core budget-cycle heartbeat.

**Explore patterns:**
1. Week-over-week `payday_confirmed` per distinct user via `execute-sql` — triggers on ≥20% drop sustained 2+ weeks
2. Cross-action disengagement check — users with recent `transaction_recorded` but no `payday_confirmed` in 3+ weeks

**Noise escape hatch:** Set `emit: false` on the `signals-scout-payday-health` config in PostHog → Self-driving → Scouts to switch it to dry-run if it becomes noisy.

### Considered but declined

| Scout | Filter that ruled it out |
|---|---|
| Partner invite funnel (`partner_invited` → `partner_invite_accepted`) | Proposed and declined by user |

---

## Follow-ups

- [ ] **Enable Session Replay** in PostHog: Settings → Session replay → "Record user sessions" (https://us.posthog.com/project/537878/settings/environment-replay)
- [ ] **Enable Error Tracking** in PostHog: Settings → Error tracking → "Enable exception autocapture" (https://us.posthog.com/project/537878/settings/environment-error-tracking)
- [ ] **Enable Support/Conversations** in PostHog: product sidebar → Support
- [ ] **Connect a Support inbound channel** (email / inbox / Slack) in PostHog Settings → Support — needed before the `conversations/ticket` source produces findings
- [ ] **Mobile session replay SDK setup** — `posthog-react-native` supports session replay but requires additional opt-in configuration; the server-side product flip is inert on React Native until the SDK is configured
- [ ] **Set up PostHog product funnels and retention insights** — once saved, `signals-scout-product-analytics` will watch them for regressions (e.g. onboarding funnel, payday setup funnel)

---

## What happens next

- The scout coordinator picks up fresh configs within ~30 minutes; all 6 scouts run on their next daily tick
- Scout runs draw from the project's 100-run daily budget during early access; contact team-self-driving@posthog.com to request more
- Findings cluster into reports in the [Self-driving inbox](https://us.posthog.com/project/537878/inbox) — immediately-actionable reports can automatically start coding tasks with a draft PR
- The `signals-scout-payday-health` scout fires its first run within ~30 minutes; if `payday_confirmed` events are sparse, it will close out quietly and build its baseline before filing reports
