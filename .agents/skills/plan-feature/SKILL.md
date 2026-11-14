---
name: plan-feature
description: Critical architecture interrogation and unambiguous implementation planning across Web and Mobile. Use ONLY when designing or planning changes. Do NOT modify files or run builds.
---

# Feature Planning Protocol

1. **Read Canonical Registries First (Token Optimization & Zero Hallucination):**
   * Ground all architectural choices in `AGENTS.md` and read the MECE registries **before** scanning the codebase:
     - `FUNCTIONAL_CAPABILITIES_INVENTORY.md`: Web/Mobile routes, Modals/Drawers/Confirm Dialogs, Screen-by-Screen Parity Matrix, `@money-matters/ui` primitives, and `@money-matters/i18n` dictionary namespaces.
     - `TECHNICAL_SPEC.md` (`§9–§10`): All 12 tRPC routers / 103 procedures, HTTP/webhook endpoints, Inngest workflows, and feature flags.
     - `SCHEMA_DATA_DICTIONARY.md`: All 23 Drizzle tables, columns, RLS policies (`ENABLE`/`FORCE`), session variables, and table consumers.
     - `FUNCTIONAL_SPEC.md`: Two-Horizon Waterfall math, 12-Month projection rules, and simulation formulas.
2. **Interrogate First (`/grill-me`):** Do not make assumptions. Run `/grill-me` to critically challenge edge cases, RLS tenant/stealth-privacy isolation, Mobile vs. Web parity, i18n key reuse, and dead-code removal before writing the plan.
3. **Cross-Platform & i18n Scope:**
   * Design changes for **both Web (`apps/web`) and Mobile (`apps/mobile`)** simultaneously unless explicitly scoped with `Web:` or `Mobile:`.
   * Map exact `en.ts` i18n keys to reuse, rationalise, or cull.
   * Identify unused files, DB columns/tables, and dead code to delete.
   * Check `ProductTourContext` anchors (`data-tour` / `MOBILE_TOUR_STEPS`) if any targeted screen or layout changes.
   * Verify target route files (`apps/web/src/app/**/page.tsx` and `apps/mobile/src/app/**`), shared header/layout wrappers (`dashboard/layout.tsx` vs `AppScreenWrapper`), and actual URL query-param handlers before finalizing cross-screen navigation or deep-link prefill steps.
4. **Output Format:**
   * Deliver **only** a step-by-step, unambiguous implementation plan grouped by workspace package (`packages/db` -> `types` -> `i18n` -> `capabilities` -> `api` -> `ui` -> `web` -> `mobile` -> `docs`), explicitly listing which rows in `FUNCTIONAL_CAPABILITIES_INVENTORY.md`, `TECHNICAL_SPEC.md`, `SCHEMA_DATA_DICTIONARY.md`, and `FUNCTIONAL_SPEC.md` will be updated.
   * **Zero fluff:** No executive summaries, no walkthroughs, and no code modifications during this phase.
