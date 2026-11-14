---
name: build-feature
description: End-to-end implementation, Web/Mobile parity enforcement, aggressive dead-code culling, full validation (`pnpm validate:prod`), doc sync, and local Git commit. Do NOT use for Q&A or standalone commits.
---

# Feature Execution & Validation Protocol

1. **Strict Adherence & No Walkthroughs:**
   * Follow `AGENTS.md` and the approved implementation plan strictly.
   * Do **not** output a walkthrough or fancy summary report when finished. State only the final validation status and commit hash.
2. **Full Web & Mobile Parity:**
   * Implement every feature, change, or fix across **both Web and Mobile** unless explicitly prefixed with `Web:` or `Mobile:`. Share logic in `packages/*` while keeping native UI primitives (`@money-matters/ui/web` and `@money-matters/ui/mobile`).
3. **i18n & Aggressive Cleanup:**
   * Reuse existing `en.ts` keys for like-for-like UI literals (titles, labels, tooltips, placeholders, errors, toasts) across Web and Mobile. Rationalise duplicates.
   * Aggressively delete unused code, unused `en.ts` keys, orphaned files, and dead DB tables/fields (`SCHEMA_DATA_DICTIONARY.md` must stay 100% synced).
4. **Documentation Synchronization:**
   * Update only the affected sections of `TECHNICAL_SPEC.md`, `FUNCTIONAL_SPEC.md`, `SCHEMA_DATA_DICTIONARY.md`, and `README.md` to match the final implementation.
5. **In-Flight Checks & Production Gate:**
   * Run targeted checks (`pnpm check-i18n`, `pnpm typecheck`, `pnpm lint`, `pnpm test`) as you build. Clear `apps/mobile/.tsbuildinfo` if workspace exports changed.
   * Before finishing, run **`pnpm validate:prod`** and fix any failures iteratively until it exits `0`.
6. **Git Commit Protocol:**
   * Once `pnpm validate:prod` passes, stage and commit all changes locally with a conventional commit message (`feat:`, `fix:`, `refactor:`).
   * **STOP and ask the user before running `git push`.**

