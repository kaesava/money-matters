# Master Implementation Plan — Wave 2 (Production Hardening & Feature Polish)

> **Generated:** 2026-08-01  
> **Status:** Proposed Implementation Plan (Pending User Approval).  
> **Scope:** Universal Logging, UI Widget System (Serene Finance), Env File Best Practice Audit, Multi-Tenant/App Switcher, Redesigned Landing Page, Android-Only Mobile Config, Info Tooltips, CSV Onboarding Integration, Play Store Readiness, R2 Stripe Scope Alignment, Viral Partner Referral, Security Runbook, Cloudflare WAF, CI Migration Hook, and Sentry Mobile Integration.

---

## User Review & Decision Points

> [!NOTE]
> All requested items have been analyzed against `AGENTS.md` monorepo guidelines. The plan below covers 100% of requested items without breaking existing architecture or type safety.

---

## Proposed Changes

### Component 1: Universal Logger Architecture (`@money-matters/core`)
#### [NEW] [logger.ts](file:///home/kaesava/projects/money-matters/packages/core/src/logger.ts)
#### [MODIFY] [apps/web/src/lib/logger.ts](file:///home/kaesava/projects/money-matters/apps/web/src/lib/logger.ts)
#### [MODIFY] [apps/mobile/src/lib/logger.ts](file:///home/kaesava/projects/money-matters/apps/mobile/src/lib/logger.ts)
- Implement a universal, cross-platform logger in `@money-matters/core` with PII redaction (emails, tokens, passwords), log levels (`DEBUG`, `INFO`, `WARN`, `ERROR`), and environment detection.
- Replace ad-hoc `console.log` and `console.error` calls across `apps/web` and `apps/mobile` with the structured logger.

---

### Component 2: UI Widget System (Serene Finance)
#### [NEW] [StatCard.tsx](file:///home/kaesava/projects/money-matters/packages/ui/src/web/StatCard.tsx)
#### [NEW] [BudgetProgressCard.tsx](file:///home/kaesava/projects/money-matters/packages/ui/src/web/BudgetProgressCard.tsx)
#### [NEW] [MobileStatCard.tsx](file:///home/kaesava/projects/money-matters/packages/ui/src/mobile/MobileStatCard.tsx)
#### [NEW] [MobileBudgetProgress.tsx](file:///home/kaesava/projects/money-matters/packages/ui/src/mobile/MobileBudgetProgress.tsx)
- Extract widget designs from `ui_design_google_stitch/` (`StatCard`, `BudgetProgress`, `BentoStats`, `QuickAction`) into `@money-matters/ui` for both Web and Mobile.
- Upgrade Web and Mobile dashboards to use these rich widget components.

---

### Component 3: Environment Variables Audit & Best Practices
#### [MODIFY] [env.ts](file:///home/kaesava/projects/money-matters/packages/config/src/env.ts)
#### [MODIFY] [.env.example](file:///home/kaesava/projects/money-matters/.env.example)
#### [MODIFY] [apps/api/.env.example](file:///home/kaesava/projects/money-matters/apps/api/.env.example)
#### [MODIFY] [apps/web/.env.example](file:///home/kaesava/projects/money-matters/apps/web/.env.example)
- Establish `@money-matters/config` as the single source of truth for Zod-validated env schemas.
- Clean up root and sub-app `.env` files to prevent cascading leakage. Document development vs production env inheritance.

---

### Component 4: Multi-Tenant & Multi-App Switcher
#### [NEW] [TenantSwitcher.tsx](file:///home/kaesava/projects/money-matters/apps/web/src/components/TenantSwitcher.tsx)
#### [NEW] [MobileTenantSwitcher.tsx](file:///home/kaesava/projects/money-matters/apps/mobile/src/components/MobileTenantSwitcher.tsx)
- Create a tenant switcher component in user profile / header menus (Web & Mobile).
- Fetches all households the user belongs to (`tenant_users`).
- On tenant switch, updates active `tenantId` session cookie and dynamically re-binds target `appId`.

---

### Component 5: Redesigned Landing Page, Privacy Policy & Contact
#### [MODIFY] [apps/web/src/app/page.tsx](file:///home/kaesava/projects/money-matters/apps/web/src/app/page.tsx)
#### [NEW] [apps/web/src/app/privacy/page.tsx](file:///home/kaesava/projects/money-matters/apps/web/src/app/privacy/page.tsx)
- Redesign landing page using Serene Finance color palette (`#2563eb`, `#1B2B4B`, `#F7F8FA`).
- Add Australian Privacy Act compliant Privacy Policy page (`/privacy`).
- Add contact support link (`info@kaesava.au`).

---

### Component 6: Android-Only Mobile Configuration & Play Store Readiness
#### [MODIFY] [apps/mobile/app.json](file:///home/kaesava/projects/money-matters/apps/mobile/app.json)
- Lock Expo platform target to `["android"]`. Remove iOS bundle configs for Release 1 & 2.
- Configure Android adaptive icons, splash screen, and package identifier (`com.kaesava.moneymatters`).

---

### Component 7: Information Tooltips (`InfoButton` / `InfoTooltip`)
#### [NEW] [InfoTooltip.tsx](file:///home/kaesava/projects/money-matters/packages/ui/src/web/InfoTooltip.tsx)
#### [NEW] [MobileInfoModal.tsx](file:///home/kaesava/projects/money-matters/packages/ui/src/mobile/MobileInfoModal.tsx)
- Create subtle, non-intrusive info icon components (`ⓘ`).
- Place info tooltips on key complex features: 5-step Waterfall Allocation, Everyday Pool, Incidental M Buffer, and Can We Afford calculator.

---

### Component 8: Onboarding Wizard CSV Import Integration
#### [MODIFY] [apps/web/src/app/setup/page.tsx](file:///home/kaesava/projects/money-matters/apps/web/src/app/setup/page.tsx)
- Embed `CsvImportModal` directly into Step 2/3 of the onboarding wizard for 30-second instant value.

---

### Component 9: Viral Household Partner Referral Card
#### [NEW] [PartnerReferralCard.tsx](file:///home/kaesava/projects/money-matters/apps/web/src/components/PartnerReferralCard.tsx)
#### [NEW] [MobilePartnerReferralCard.tsx](file:///home/kaesava/projects/money-matters/apps/mobile/src/components/MobilePartnerReferralCard.tsx)
- Prominent "Invite Household Partner" banner/card on the main Dashboard (Web & Mobile) to spur viral household adoption.

---

### Component 10: Release 2 Stripe Scope Alignment & Runbooks
#### [MODIFY] [TECHNICAL_SPEC.md](file:///home/kaesava/projects/money-matters/TECHNICAL_SPEC.md)
#### [MODIFY] [FUNCTIONAL_SPEC.md](file:///home/kaesava/projects/money-matters/FUNCTIONAL_SPEC.md)
#### [NEW] [docs/SECURITY_RUNBOOK.md](file:///home/kaesava/projects/money-matters/docs/SECURITY_RUNBOOK.md)
- Document Stripe paid plans and free trial limits as Release 2 scope.
- Add step-by-step production credential rotation runbook for Neon, Inngest, and Resend.
- Add Cloudflare WAF rate limiting configuration guide for `api.moneymatters.kaesava.au`.

---

### Component 11: CI/CD Migration Hook & Mobile Sentry
#### [MODIFY] [.github/workflows/deploy.yml](file:///home/kaesava/projects/money-matters/.github/workflows/deploy.yml)
#### [MODIFY] [apps/mobile/src/app/_layout.tsx](file:///home/kaesava/projects/money-matters/apps/mobile/src/app/_layout.tsx)
- Add `pnpm --filter @money-matters/db db:migrate` execution to GitHub Actions deploy workflow.
- Configure `@sentry/react-native` initialization in Expo mobile app layout.

---

## Verification Plan

### Automated Tests
- Run `pnpm typecheck` across all 14 monorepo packages.
- Run `pnpm test` across all 11 test suites.
- Verify `pnpm lint` (`check-i18n`).

### Manual Verification
- Test tenant switcher on Web and Mobile.
- Test CSV upload inside the onboarding wizard flow.
- Verify landing page rendering and `/privacy` route.
