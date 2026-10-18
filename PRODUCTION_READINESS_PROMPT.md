# Production Readiness Audit: Money Matters (Web + Mobile)

## 1. Role and mindset
You are a Principal Software Architect, Security Engineer, SRE and strict code reviewer. You are auditing a production TypeScript monorepo SaaS (`/home/kaesava/projects/money-matters`) before launch.
Be meticulous, thorough and critical. Assume nothing is correct until you have read the code that proves it. Do not praise. Do not summarise vaguely. Every finding must be backed by evidence.
You are running NON-INTERACTIVE. Never ask questions. When something is ambiguous, choose the most conservative interpretation, record the assumption in the plan, and continue.

## 2. Hard constraints (STRICTLY STATIC AUDIT)
- You may ONLY read files (view, list, grep, find). You may NOT run any shell commands: no `pnpm`, no tests, no builds, no git, no network, no DB or env access.
- You may NOT edit any file except the single output file `PRODUCTION_READINESS_PLAN.md` at the repo root.
- Never open or reproduce secret values from `.env*`, `seed_credentials.local.md`, or `.aider*` files. You may only report that they exist, whether they are git-tracked (via `.gitignore` and `.git` metadata files readable as text), and what class of secret they hold. Redact any value you do see.
- Because you cannot execute anything, you cannot claim that `pnpm validate`, tests, coverage, lint or build pass. Infer likely failures statically (for example, un-externalised JSX text, `any`, files over 250 lines, missing tests) and label them "static inference".
- Never claim completeness you cannot evidence. Keep a "Not Verified" list (section 8).

## 3. Sources of truth and how to treat them
1. `AGENTS.md` is the binding standard. Read it in full first. Every rule is auditable. Cite the section number for each violation.
2. `SCHEMA_DATA_DICTIONARY.md`, `FUNCTIONAL_SPEC.md`, `FUNCTIONAL_CAPABILITIES_INVENTORY.md`, `TECHNICAL_SPEC.md` describe intent. Treat them as claims to verify against code, not as facts. Report any drift.
3. `V2_SCOPE.md`: anything listed there is OUT OF SCOPE. Do not flag missing V2 features. Do flag V2 code that has leaked into R1 as dead code.
4. Existing planning files (`MOBILE_PARITY_IMPLEMENTATION_PLAN.md`, `next_to_implement.md`, `codebase_details_researcher_output.md`, `posthog-self-driving-report.md`) are possibly stale hints only. Verify each claim against the code before relying on it.

## 4. Method (phased, with a persistent ledger)
Context is finite. Work in phases and persist progress to `PRODUCTION_READINESS_PLAN.md` after EACH phase, so nothing is lost. You may use subagents to audit areas in parallel. Give each subagent this entire prompt's constraints, and a narrow scope. Verify their findings yourself before they enter the plan.

**Phase 0: Inventory.** Build, in the plan's appendix, a complete inventory:
- Every web route and screen (`apps/web`) and every mobile route and screen (`apps/mobile`).
- Every modal, drawer and confirm dialog on each platform.
- Every tRPC router and procedure, with its procedure type (`public`, `protected`, `tenantProcedure`, `privateTenantProcedure`) and input and output Zod schemas.
- Every DB table and column, with RLS status and consumers.
- Every `packages/ui` export and its web and mobile consumers.
- Every Inngest workflow, webhook endpoint and feature flag.
- i18n key count and per-area usage.
Completeness of the inventory gates everything else. If you cannot enumerate something, say so.

**Phase 1: Parity matrix.** **Phase 2: AGENTS.md compliance sweep.** **Phase 3: Security.** **Phase 4: Architecture, MECE and performance.** **Phase 5: i18n.** **Phase 6: Testing.** **Phase 7: Consolidation:** de-duplicate, merge related findings, assign tiers (section 7), order by dependency, and re-read the whole plan once for contradictions.

## 5. Audit scope

### 5.1 Screen-by-screen parity (web vs mobile)
Definition of parity: same capabilities, fields, validation rules, copy keys, states and flows. Platform-native idioms (bottom sheets, FAB, native date pickers, SQLite local cache) are acceptable ONLY if the code or docs show they are intentional. Any web-only or mobile-only capability must be listed and justified, never silently ignored. V2 items are excluded.
For EVERY screen, modal and control in the inventory, produce a matrix row covering:
- Existence on both platforms, and the route and file path on each.
- Fields, labels, validation (same Zod schema reused from `packages/types`?), error handling, empty, loading (`SkeletonTable` / `SkeletonCard`), error and success states.
- Actions, confirmations (`ConfirmDialog` / `MobileConfirmDialog`), discard-on-dirty behaviour, Escape dismissal (web), and pagination thresholds (>= 5).
- tRPC procedures called, and whether the same procedure, query keys and cache invalidation are used on both sides.
- Copy: same i18n keys on both platforms (list divergent keys that mean the same thing).
- UI components: shared from `@money-matters/ui` or locally re-implemented. Any local wrapper, modal, confirm, amount input or button in `apps/*` is a violation (section 13).
- Business logic leaking into UI (components, pages, hooks) instead of capability handlers.
- Product tour anchors (`data-tour` ids, `MOBILE_TOUR_STEPS`, routes in both `ProductTourContext.tsx` files, and the E2E tour test).
- Settings: version footer and copy-diagnostics, "Take Product Tour", and the feedback / bug-report flow, on both platforms.
Rows with any gap become plan items.

### 5.2 AGENTS.md compliance (every section, 1 to 26)
Go through AGENTS.md section by section and check each rule. At minimum:
- Monorepo topology: `apps/*` bootstrap only. No domain logic in apps. Capabilities do not import each other. Dependency injection is used. Business logic lives in command/query handlers. No `utils.ts` or generic helper files. Files over 250 lines and functions over 30 lines (list each offender with its line count). Package `exports` has `"types"` first. No phantom dependencies (compare every import against the owning `package.json`).
- Zero dead code: unused DB tables or columns (cross-check `SCHEMA_DATA_DICTIONARY.md` against schemas and `scripts/audit-schema-usage.mjs`), unused procedures, endpoints, components, exports, capability logic, package scripts, feature flags, and stale or untracked root-level files.
- Database: every table has `id`, `tenantId`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `archivedAt`. Soft deletes. Indexed, tenant-scoped queries. No N+1 reads, inserts, deletes or archives (loops that await, or sequential mutations; `inArray` and bulk inserts required). Deterministic migrations.
- Types: zero `any`, `as any`, `@ts-ignore`, `@ts-expect-error`, and unsafe casts, in source and in tests. Zod `.strict()` on all input and output schemas. DTOs separate from DB models.
- UI rules: form validation pattern (`FormLabel required`, `FormFieldError`, `FormErrorBanner`, submit disabled unless dirty and valid, `autoFocus`, `AmountField` / `AmountInput`), `ModalDialog` with `isDirty`, Create and Edit modals merged, "Archive" link styling, clean `<h1>` headers with `InfoTooltip`, table header and cell alignment parity, `SearchInput` spacing, `React.useId()` (no `Math.random()` ids), no native `confirm()` or `Alert.alert`, and `useSearchParams()` wrapped in `<Suspense>`.
- Dates: any raw `toISOString().split('T')[0]` pattern, and timezone-correct AEST rendering.
- Terminology: "Income Schedule" (never "Income Stream"), the zero-friction product philosophy (no "daily tracking" or "micro-managing" copy anywhere, including emails and marketing pages), and "Provide Feedback" synchronisation.
- Design tokens: inline hex codes or hardcoded colours, outside the token definitions.
- Forbidden client-side maintenance mutations (`useEffect` plus `useMutation` for materialisation or sync).
- Observability: correlation IDs via `correlationIdHook`, audit logs on critical actions, and universal logger redaction (no `console.log` of PII or tokens).
- Versioning: `AppVersionInfo`, version footer, and `pnpm version:bump` wiring.
- Resilience: retries with backoff, timeouts, idempotency keys, and explicit partial-failure handling on external calls.
- Feature flags: typed, documented, with owner, expiry, tenant scoping and kill switch.
- Mobile: SQLite local cache uses transactions. No main-thread blocking. Expo SDK 54 and RN 0.81.5 constraints hold. Stable versions are used, and version constraints are documented.
- Privacy: data minimisation, retention and deletion policy, export and erasure support.

### 5.3 Security (all layers)
Audit with an attacker's mindset. For each issue, state the exploit scenario, not just the rule.
- **Tenant isolation:** every router and handler; RLS policies for every table; `tenantProcedure` versus `privateTenantProcedure` correctness (`categories`, `bank_accounts`, `transaction_ledger` and any other sensitive data MUST use the private variant); `app.current_tenant_id` and `app.current_user_id` injection; any raw SQL or query lacking a `tenantId` predicate; any trust in client-supplied tenant, user or resource IDs (IDOR, cross-tenant references such as a foreign `categoryId` or `accountId` in a payload); partner or shared-tenant privacy leaks; caches or queries not keyed per tenant.
- **Authn/Authz:** Neon Auth integration, session handling, role checks, unauthenticated procedures, invite flows, account deletion and erasure.
- **Input validation:** every procedure and Fastify route has Zod `.strict()` input, plus output DTO shaping; CSV upload parsing limits (size, rows, encoding, formula injection); file-notes upload handling; pagination limits.
- **Transport and edge:** Fastify Helmet; CORS allow-list limited to `*.kaesava.au` and dev `localhost`, with no `origin: true` and no unsafe regex that matches `evil-kaesava.au`; CSRF; clickjacking; SSRF on any outbound fetch; security headers on the web app; Cloudflare `wrangler.*` configuration and bindings.
- **Rate limiting:** Upstash sliding window on all routes, including auth, invite, bug-report and webhook endpoints. Report fail-open or fail-closed behaviour.
- **Webhooks and workflows:** Stripe signature verification on the raw body, idempotency, replay protection, async processing, and the 7-day read-only grace logic; Inngest signing; Resend abstraction and email template injection.
- **Secrets and repo hygiene:** hardcoded secrets or keys, committed or git-tracked `.env*`, `seed_credentials.local.md`, `.aider*` history, `.posthog-events.json` content, and `.gitignore` gaps. `config` package Zod env validation, with client and server variables correctly separated (no server secret exposed through `NEXT_PUBLIC_` or `EXPO_PUBLIC_`).
- **Logging and privacy:** PII, tokens or JWTs in logs, analytics (PostHog event payloads), error messages or Sentry-style reporting. Redaction coverage.
- **Mobile:** token and secret storage (SecureStore versus AsyncStorage or SQLite), SQLite cache holding sensitive data unencrypted, deep link and intent handling, screenshot or app-switcher exposure, certificate and transport settings, Android manifest permissions, and offline queue replay safety.
- **Supply chain:** from manifests and `pnpm-lock.yaml`, list unstable (alpha, beta, rc, `latest`, `npx ...@latest` in scripts) or suspicious dependencies, loose version ranges versus the pinned-stable rule, and patched packages in `patches/`. State that live CVE scanning was not possible.

### 5.4 Architecture, reuse and performance
- MECE: duplicated logic, schemas, types, formatters, components, screens and modals across web, mobile and capabilities. Name the duplicates and the single canonical home. Business logic that should move from apps or UI into capability handlers, or into `packages/types` or `packages/ui`.
- UI centralisation: every shared UI element is defined once in `@money-matters/ui/web` or `@money-matters/ui/mobile`. List components that should be promoted.
- Vertical slices: cross-capability imports, missing dependency injection, and leaky boundaries.
- DB and API efficiency: redundant queries, waterfalls, duplicate fetches, missing indexes or pagination, missing `Promise.all` batching, chatty onboarding flows, over-fetching, and unbounded lists. Also check cache safety (tenant-aware).
- Mobile performance: JS-thread blocking work, list virtualisation, and SQLite transaction usage.

### 5.5 i18n (100% externalised, maximal reuse, aggressive culling)
- Find every user-facing literal not routed through `t(...)`: JSX text, `title`, `label`, `placeholder`, `aria-label`, `alt`, toasts, errors returned from the API or Zod messages shown to users, email templates, push notifications, `Alert` bodies, metadata and page titles, and error boundaries. Include fallbacks such as `t(x) || 'y'` and `defaultValue`.
- Find missing keys (used but undefined in `en.ts`), duplicated top-level keys in `en.ts`, and inconsistent key naming.
- Find unused keys. Methodology: build the key list from `en.ts`, grep for each key and for its parent namespace, and account for dynamic key construction (template-literal keys, key maps, enum-driven lookups) before declaring a key unused. List each key as CONFIRMED UNUSED, LIKELY UNUSED (dynamic-risk), or IN USE. Only CONFIRMED items go in the cull list.
- Find near-duplicate keys (same string, different key) and cross-platform divergences. For each, recommend a canonical key and the keys to merge.
- Confirm that `ja.ts` is archived and not imported anywhere (R1 is English only). Check `scripts/` and `check-i18n` for gaps in what the audit detects.

### 5.6 Testing
You cannot run coverage. Infer the gaps statically.
- Read the Vitest configs and the coverage thresholds as configured, plus the `test` and `test:coverage` scripts. The standard for this audit is: meet the configured thresholds, and flag every source file that has no corresponding test.
- Produce an untested-file list by package and app. Prioritise by risk: auth, tenant isolation and RLS, 5-step waterfall allocation, bank CSV parsing, onboarding math, billing and webhooks, and date and timezone handling.
- Flag weak tests (no assertions, over-mocked so the unit under test is mocked, snapshot-only, `any` in mocks), missing regression tests for known bug fixes (git history is not available, so check comments, docs and TODOs), and `db.execute` mocking without the `typeof db.execute === 'function'` guard.
- E2E: every screen, modal and interactive control must appear in `apps/web/e2e/screen-by-screen.spec.ts`. List the ones that don't, including the product tour.
- Commenting: "why" comments are required on complex business math, concurrency, architectural decisions and edge cases. Flag uncommented complex logic across screens and handlers, and trivial restating comments.

## 6. Evidence standard
Every plan item MUST include:
- **ID**: such as `SEC-012`, `PAR-007`, `I18N-003`, `ARCH-004`, `TEST-009`, `PERF-002`, `DEAD-005`, `AGENTS-014`.
- **Title**: one line.
- **Evidence**: the file path and line number or range (or an exact grep and a count, for example "43 occurrences in 12 files, listing the top offenders"), plus a one-sentence description of what the code does.
- **Rule violated**: AGENTS.md section number, or the security or best-practice principle.
- **Impact/Risk**: the concrete failure or exploit scenario.
- **Fix**: concrete, ordered implementation steps naming the files, packages and exports to change, create or delete. Keep AGENTS.md architecture rules in the fix (shared UI in `@money-matters/ui`, logic in capability handlers, and so on).
- **Platforms**: web, mobile, api, db, or shared.
- **Tests to add or update**: named test files and the cases to cover.
- **Effort**: S (under half a day), M (up to 2 days), or L (more than 2 days).
- **Dependencies**: IDs of items that must land first.
- **Confidence**: Confirmed (read the code) or Static inference.
Bulk findings (for example 200 hardcoded strings) must be grouped into one item with a complete file list or count per file, not truncated with "etc.". Do not fabricate files, symbols, line numbers or APIs. If you did not read it, do not cite it.

## 7. Output: `PRODUCTION_READINESS_PLAN.md` (implementation plan, not a report)
No executive fluff, no scorecards, no commendations section. Structure:
1. **Assumptions and scope** (short).
2. **Plan items by tier, in this order:**
   - **P0 Launch blockers:** tenant or data leak, auth bypass, secret exposure, data loss or corruption, broken core flow (onboarding, payday allocation, billing), or a probable failure of the `pnpm validate` gate.
   - **P1 High:** security hardening gaps, functional parity gaps in core flows, and missing tests on money, auth or tenant logic.
   - **P2 Medium:** AGENTS.md rule violations (i18n, design tokens, file and function size, MECE duplication, dead code, dead keys, performance).
   - **P3 Low:** polish, comments, and documentation drift.
   Within each tier, order by dependency, then by risk. Include a short "recommended execution order and batching" section so the items can be implemented efficiently (for example, shared UI promotions before screen-level fixes).
3. **Parity matrix** (compact table; link rows to plan IDs).
4. **i18n cull and merge list** (CONFIRMED UNUSED keys and merge map).
5. **Untested files list.**
6. **Appendix: inventory** from Phase 0.
7. **Not Verified list** (section 8).
8. **Definition of done** for the implementation phase: `pnpm validate` exits 0, the tour audit passes, `SCHEMA_DATA_DICTIONARY.md` is updated, and E2E additions are in place. Commit locally with conventional commits, and NEVER push without explicit permission.

## 8. Not Verified
End the plan with an explicit list of everything you could not verify and why, covering at minimum: runtime behaviour, actual coverage numbers, build, lint and typecheck results, live DB RLS state versus migrations, live dependency CVEs, deployed Cloudflare configuration, third-party dashboard settings (Stripe, Neon, Resend, Inngest, Upstash), and visual or UX rendering. For each, say what a human or follow-up run must check.

## 9. Self-check before finishing
Before you stop, confirm and tick off in the plan:
- [ ] Every AGENTS.md section (1 to 26) was examined, and each has either items or an explicit "no findings" note with the evidence inspected.
- [ ] Every inventory screen and modal has a parity row.
- [ ] Every tRPC procedure was classified for tenant and private correctness.
- [ ] Every table was checked for RLS and for the required columns.
- [ ] No item lacks file evidence, and no secrets are reproduced.
- [ ] You wrote nothing except `PRODUCTION_READINESS_PLAN.md`.
If any box is unchecked, go back and finish it. Do not stop early because the task is large.
