# AGENTS.md — Money Matters Monorepo Invariants

## 1. Priority Order & Authority
When rules conflict, apply this strict priority order:
1. Tenant isolation & data security
2. Authentication, authorization & stealth privacy
3. Data integrity, auditability & recoverability
4. Strict type safety & runtime validation
5. Workspace boundaries & MECE clean architecture
6. Testability & operability
7. User experience & Web/Mobile parity

Refuse or redesign any request that violates tenant isolation, data security, or strict type safety.

## 2. Monorepo Topology & Vertical Slice Boundaries
- **Stack:** pnpm workspaces, Turborepo, Next.js App Router on Cloudflare Workers (`@opennextjs/cloudflare`), Expo React Native (Android target, Expo SDK 54 / RN 0.81.5), Cloudflare Worker API (`apps/api`), tRPC, Drizzle ORM, Neon PostgreSQL (with RLS), Expo SQLite, Neon Auth, Upstash Redis, Zod `.strict()`, Resend, Inngest, Vitest.
- **`apps/*` (`web`, `mobile`, `api`):** Thin composition and routing layers only. NEVER place domain business logic in apps or pages.
- **`packages/capabilities/*` (`assistant`, `billing`, `budgeting`, `bug-reports`, `file-notes`, `notifications`, `simulation`, `tenant`, `transactions`):** Decoupled vertical slices. Capabilities MUST NEVER import other capabilities directly; use dependency injection (`DbOrTx`).
- **`packages/core`:** Server infrastructure only (logger with automatic PII redaction, Upstash rate limiter, auth context, `correlationIdHook`).
- **`packages/db`:** Drizzle schemas, deterministic migrations, RLS policies, seeds.
- **`packages/types`:** Pure domain contracts, setup presets, Zod `.strict()` DTOs.
- **`packages/ui`:** Shared UI primitives (`@money-matters/ui/web` and `@money-matters/ui/mobile`) and `DESIGN_TOKENS`.
- **`packages/i18n`:** Single source of truth for all user-facing strings (`en.ts`).
- **`packages/config`:** Validated Zod env configs, typed feature flags with kill switches, and app versioning.

## 3. Multi-Tenancy, Security & Database Standards
- **Tenant Isolation:** Scope all queries and mutations by `tenantId`. NEVER trust client-provided `tenantId` or `userId`.
- **Stealth Privacy RLS:** Use `privateTenantProcedure` on all sensitive routes (`bank_accounts`, `envelopes`, `transaction_ledger`, `income_sources`, `expense_events`, `file_notes`) to inject `app.current_tenant_id` and `app.current_user_id` into PostgreSQL RLS session variables.
- **Audit Columns & Soft Deletes:** Every domain table MUST include `id`, `tenantId`, `appId`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `archivedAt`. Hard deletes on operational entities are strictly banned.
- **Zero N+1 & Maintenance Rules:** Batch all inserts and use `inArray` for bulk updates/archivals. NEVER trigger DB maintenance, rolling window materialization, or sync mutations from client `useEffect` mounts.
- **Schema Sync:** Keep `SCHEMA_DATA_DICTIONARY.md` 100% synchronized with `packages/db/src/schema/*` (`pnpm audit:schema`). Zero dead tables or inert columns allowed.
- **Security Hygiene:** Zero PII or tokens in `console.log` or logger outputs. Strict CORS (`*.kaesava.au` and dev `localhost` only). All secrets via env vars.

## 4. Type Safety, Code Quality & MECE Standards
- **Zero `any` / `as never`:** Unsafe type casts are strictly banned across production code and tests. Use `unknown`, Zod inference, `as Href` (from `expo-router`), or `mockDb as unknown as DbOrTx`.
- **Strict File & Function Limits:**
  - Files: **≤ 400 lines** (refactor if larger).
  - Domain logic functions, commands, queries, utilities: **≤ 30 lines**.
  - React components and hooks: **≤ 100 lines**.
  - Generic `utils.ts` or grab-bag helper files are forbidden.
- **Package Exports:** `"types"` MUST be listed first under `"exports"` in all workspace `package.json` files.
- **Mobile Cache:** Mobile SQLite cache keys MUST be scoped to `tenantId:userId:queryKey`, validated via Zod, and wiped on logout or tenant switch. Mobile envelope components MUST live in `apps/mobile/src/components/envelopes/`.
- **Mobile TypeScript Cache:** Run `rm -f apps/mobile/.tsbuildinfo` before `pnpm --filter @money-matters/mobile typecheck` whenever workspace package exports change.

## 5. UI, Design Tokens, Taxonomy & i18n Invariants
- **Single Source of Truth (`@money-matters/ui`):** Always import primitives from `@money-matters/ui/web` (`Button`, `FormLabel`, `FormFieldError`, `FormErrorBanner`, `ModalDialog`, `ConfirmDialog`, `AmountField`, `DatePickerField`, `GenericSelectField`, `SortHeader`, `TextLink`, `PaginationBar`, `SkeletonTable`, `SearchInput`) and `@money-matters/ui/mobile` (`MobileButton`, `MobileInput`, `FormLabel`, `FormFieldError`, `FormErrorBanner`, `AmountInput`, `ChipSelect`, `MobileModalDialog`, `MobileConfirmDialog`, `showMobileConfirm`, `MobilePaginationBar`, `BankProviderBadge`, `SearchSelect`). Never create ad-hoc modals, confirm popups, or amount inputs inside `apps/*`.
- **Serene Finance Design Tokens:** Consume canonical `DESIGN_TOKENS.colors` (`#2563eb`, `#1B2B4B`, `#F7F8FA`, `#22c55e`, `#ba1a1a`) and JetBrains Mono (`font-mono tabular-nums`) for monetary amounts. Zero inline hex codes or invented token names.
- **100% i18n Externalization:** Every user-facing string MUST come from `@money-matters/i18n` (`en.ts`). Zero raw TSX text (`>Text<`), fallback strings (`t('x') || 'y'`), or duplicate top-level keys in `en.ts`. (`ja.ts` is archived for Release 2).
- **Zero Regional Leakage:** Never hardcode currency symbols (`$`), currency codes (`AUD`, `USD`), locales (`en-AU`), or timezones (`Australia/Sydney`). Always resolve via `useCurrencyLocale()` / `useLocale()` / `formatMobileCurrency` and format dates via `fmtDate` / `fmtDateMedium` in the user's presentation timezone.
- **Canonical Taxonomy & Product Philosophy:**
  - Use **Envelope** (top-level container) and **Category** (budgeted item). The words **"Pool"** and **"Bucket"** are strictly banned from user-facing copy.
  - Use **"Allocate Payday"** (not "Run Split"), **"Match Balance"** (not "Reconcile"), **"Safety Cushion (Keep Unallocated)"** (not "Unbudgeted Buffer"), and **"Income Schedule"** (not "Income Stream").
  - Payday allocation uses the **Document Draft Model** (`Auto-Calculated` → `Custom Draft` → `Save Draft` / `Confirm & Apply` + `Reset to Recommended`). "Lock/Unlock" terminology is banned.
  - Never describe the product as requiring daily receipt tracking or micro-managing every dollar.
- **Form, Modal & Table Standards:**
  - Standard input height `h-10`; first editable input receives `autoFocus`; submit buttons disabled while `!isDirty || !isValid` and show loading spinners during mutations.
  - Dirty modals (`isDirty`) MUST prompt discard confirmation on Escape, Cancel, or backdrop click. Native `confirm()` and `Alert.alert` are banned.
  - Table headers `<th>` and cells `<td>` MUST match alignment (Left: text; Center: dates/badges/actions; Right: mono amounts). Render pagination only when `totalItems >= 5`.
  - No emojis in `<h1>` page titles; no desktop FABs; `useSearchParams()` wrapped in `<Suspense>`; `React.useId()` for HTML IDs (never `Math.random()`).
  - Feedback/bug reports MUST dispatch via `trpc.submitFeedback` (never `mailto:` links).
  - Preserve `data-tour` attributes and `ProductTourContext` routes across Web and Mobile whenever refactoring screens.

## 6. Testing, Canonical Inventories & Spec Synchronization (Zero Redundancy)
- **Unit & E2E Testing:** Every capability, router, and bug fix requires Vitest unit tests (using typed `DbOrTx` mocks) and non-conditional Playwright E2E coverage in `apps/web/e2e/screen-by-screen.spec.ts` when UI flows change.
- **Read-First Token Optimization & Anti-Hallucination Protocol:** Before grepping or scanning the repo during planning or implementation, read the canonical MECE registries below to locate existing routes, modals, UI primitives, i18n namespaces, tRPC procedures, and DB tables.
- **MECE Documentation Ownership & Mandatory Post-Build Update Rule:** Never duplicate tables across `.md` files. After every feature build, refactor, or bug fix, update the exact affected rows in the single owning artifact before running `pnpm validate:prod`:
  1. **`FUNCTIONAL_CAPABILITIES_INVENTORY.md` (UI, Route, Modal, Parity & i18n Registry):** Owns the complete inventory of Web routes (`§2`), Mobile routes (`§3`), Modals/Drawers/Confirm Dialogs (`§4`), Screen-by-Screen Web vs. Mobile Parity Matrix (`§5`), `@money-matters/ui` exports (`§6`), and `@money-matters/i18n` dictionary namespaces (`§7`). Update whenever any route, screen, modal, UI primitive, or i18n file changes.
  2. **`TECHNICAL_SPEC.md` (Architecture, tRPC Procedures, Workflows, Endpoints & Feature Flags Registry):** Owns system architecture (`§1–§8`), the complete 12-router / 103-procedure tRPC registry (`§9`), HTTP/webhook endpoints, Inngest workflows, and feature flags (`§10`), and security/APPs (`§11`). Update whenever any tRPC procedure, HTTP endpoint, Inngest workflow, or feature flag changes.
  3. **`SCHEMA_DATA_DICTIONARY.md` (Database Tables, Columns, RLS & Consumers Registry):** Owns the 23-table Master RLS & Consumer Registry and per-table column definitions (`pnpm audit:schema`). Update whenever any Drizzle schema, migration, RLS policy, or table consumer changes.
  4. **`FUNCTIONAL_SPEC.md` (Domain Math, Waterfall, Simulation & Lifecycle Rules):** Owns pure product philosophy, Two-Horizon Waterfall math, 12-Month Cumulative Projection rules, "Can I Afford It?" simulation rules, and test matrix specifications. Update whenever domain math or business rules change.
  5. **`README.md`:** High-level monorepo entrypoint, quick-start commands, and links to the 4 canonical specifications above.

## 7. Granular UI, Versioning & Review Standards
- **App SemVer & Diagnostics:** Apps follow independent SemVer via `pnpm version:bump`. Settings displays an inconspicuous version footer (`Money Matters vX.Y.Z (#build)`) that copies JSON diagnostics on click/tap.
- **UI & Modal Micro-Rules:**
  - Merge Create and Edit modals for the same entity into one component using an `isEdit` prop.
  - Render Archive buttons inconspicuously (`text-slate-400 hover:text-slate-600 dark:text-slate-500`) at the bottom-left of modal footers.
  - `SearchInput` MUST use `left-3.5`/`left-4` icon spacing, `pl-10` text padding, `data-search-input="true"`, and a quiet `[/]` badge when empty. Display subtle shortcut badges (`[N]`, `⌘K`, `[/]`, `?`, `Esc`) next to global triggers.
  - Reserve `InfoTooltip` `(i)` strictly for proprietary financial mechanics (never next to self-explanatory labels).
  - Recurring bills default `generateEvents: true` silently, hiding overrides inside a collapsed "Advanced Options" accordion.
  - `⌘K` / `Ctrl+K` Command Palette must unify live entity lookup (Accounts, Envelopes, Events, Transactions) with Ask Penny AI (on question phrasing or `Tab`).
  - Use `<Image unoptimized width={...} height={...} />` from `next/image` for avatars to avoid build warnings.
- **Testing & Commenting Hygiene:**
  - Production handlers MUST NEVER branch on mock shape (e.g., no `typeof db.execute === 'function'`).
  - Ban trivial "what" comments; require "why" comments for complex waterfall math, concurrency locks, and edge cases.
- **Code Review Format:** When asked to review code, always structure output into these 8 numbered sections: `1. Architecture violations`, `2. MECE issues`, `3. Security gaps`, `4. Mobile issues`, `5. Performance issues`, `6. i18n gaps`, `7. Testing gaps`, `8. Commendations`.

