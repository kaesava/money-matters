---
name: plan-feature
description: Critical architecture interrogation and unambiguous implementation planning across Web and Mobile. Use ONLY when designing or planning changes. Do NOT modify files or run builds.
---

# Feature Planning Protocol

1. **Follow `AGENTS.md`:** Ground all architectural choices in `AGENTS.md`, `TECHNICAL_SPEC.md`, and `SCHEMA_DATA_DICTIONARY.md`.
2. **Interrogate First (`/grill-me`):** Do not make assumptions. Run `/grill-me` to critically challenge edge cases, RLS tenant isolation, Mobile vs. Web parity, i18n key reuse, and dead-code removal before writing the plan.
3. **Cross-Platform & i18n Scope:**
   * Design changes for **both Web (`apps/web`) and Mobile (`apps/mobile`)** simultaneously unless explicitly scoped with `Web:` or `Mobile:`.
   * Map exact `en.ts` i18n keys to reuse, rationalise, or cull.
   * Identify unused files, DB columns/tables, and dead code to delete.
   * Check `ProductTourContext` anchors (`data-tour`) if any targeted screen or layout changes.
4. **Output Format:**
   * Deliver **only** a step-by-step, unambiguous implementation plan grouped by workspace package (`packages/db` -> `types` -> `i18n` -> `capabilities` -> `api` -> `ui` -> `web` -> `mobile` -> `docs`).
   * **Zero fluff:** No executive summaries, no walkthroughs, and no code modifications during this phase.
