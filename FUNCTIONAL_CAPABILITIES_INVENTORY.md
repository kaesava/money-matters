# FUNCTIONAL_CAPABILITIES_INVENTORY.md — Canonical UI, Route, Modal, i18n & Web/Mobile Parity Registry

> **Purpose & Agent Protocol (Token Optimization & Zero Hallucination):**  
> This file is the **single source of truth** for every Web route, Mobile route, Modal/Drawer/Bottom Sheet, Confirm Dialog, Screen-by-Screen Web/Mobile Parity mapping, `@money-matters/ui` primitive export, and `@money-matters/i18n` dictionary namespace.  
> - **Before planning or building:** Read this registry first instead of running broad repo-wide file/grep scans.  
> - **After every feature build:** Update the exact affected rows in this file whenever a route, screen, modal, UI primitive, or i18n namespace is added, modified, or removed.  
> - **Zero Redundancy Rule:** Domain math and waterfall/simulation algorithms live in `FUNCTIONAL_SPEC.md`; tRPC procedures, HTTP endpoints, Inngest workflows, and feature flags live in `TECHNICAL_SPEC.md`; database tables, columns, RLS policies, and consumers live in `SCHEMA_DATA_DICTIONARY.md`.

---

## 1. Cross-Platform UX & Component Invariants (Quick Reference)

| Dimension | Web (`apps/web` + `@money-matters/ui/web`) | Mobile (`apps/mobile` + `@money-matters/ui/mobile`) |
| :--- | :--- | :--- |
| **Primary Primitives** | `Button`, `FormLabel`, `FormFieldError`, `FormErrorBanner`, `ModalDialog`, `SlideOverDrawer`, `ConfirmDialog`, `TypedConfirmDialog`, `AmountField`, `DatePickerField`, `GenericSelectField`, `PaginationBar`, `SkeletonTable`, `SearchInput` | `MobileButton`, `MobileInput`, `FormLabel`, `FormFieldError`, `FormErrorBanner`, `AmountInput`, `ChipSelect`, `MobileModalDialog`, `MobileConfirmDialog`, `showMobileConfirm`, `MobilePaginationBar`, `BankProviderBadge`, `MobilePoolPicker`, `SkeletonCard` |
| **Modals & Dirty State** | `ModalDialog` / `SlideOverDrawer` with LIFO `Escape` stack (`modalStack.ts`) and `isDirty` discard confirmation via `ConfirmDialog`. Native `confirm()` is banned. | `MobileModalDialog` bottom-sheet with Android back-button interception and `isDirty` discard confirmation via `MobileConfirmDialog` (`showMobileConfirm`). Native `Alert.alert` is banned. |
| **Forms & Inputs** | Standard `h-10` height; first editable field has `autoFocus`; submit disabled while `!isDirty \|\| !isValid`; loading spinner on mutation. | `44dp` minimum touch target; first editable field focused; `AmountInput` uses `selectTextOnFocus`; submit disabled while `!isDirty \|\| !isValid`. |
| **Tables, Cards & Pagination** | Left: text/names; Center: dates/badges/actions; Right: `font-mono tabular-nums` amounts. Render `PaginationBar` only when `totalItems >= 5`. | Structured cards with `SkeletonCard` loading state. Render `MobilePaginationBar` only when `totalItems >= 5`. |
| **Formatting & i18n** | 100% strings from `@money-matters/i18n` (`en.ts`). Currency via `useCurrencyLocale()`; dates via `fmtDate` / `fmtDateMedium` in user presentation timezone. | 100% strings from `@money-matters/i18n` (`en.ts`). Currency via `formatMobileCurrency`; dates via `formatDate` in user presentation timezone. |

---

## 2. Web Routes & Screens Inventory (`apps/web/src/app` — 36 Files)

| Web Route | File Path | Lines | Auth / Guard | Primary Components / Modals / Drawers Rendered |
| :--- | :--- | ---: | :--- | :--- |
| Root Layout | `apps/web/src/app/layout.tsx` | 168 | Public / Root | `TRPCProvider`, `ThemeProvider`, `ToastContainer`, `PostHogProvider`, `CookieConsentBanner` |
| Global Error | `apps/web/src/app/global-error.tsx` | 60 | Public | Next.js global error boundary (`<html><body>`) |
| Global 404 | `apps/web/src/app/not-found.tsx` | 58 | Public | Top-level 404 screen with link to `/` and `/dashboard` |
| `/` | `apps/web/src/app/page.tsx` | 109 | Public | `LandingHeader`, `HeroSection`, `InteractivePaydayEngine`, `ProblemSection`, `HowItWorksSection`, `AdvantagesSection`, `PricingSection`, `FaqSection`, `LandingFooter`, `AuthModal`, `EarlyAccessModal` |
| `/sign-in` | `apps/web/src/app/sign-in/page.tsx` | 120 | Public (`<Suspense>`) | `SignInForm`, `SocialAuthButtons` |
| `/sign-up` | `apps/web/src/app/sign-up/page.tsx` | 134 | Public (`<Suspense>`) | `SignUpForm`, `SocialAuthButtons` |
| `/forgot-password` | `apps/web/src/app/forgot-password/page.tsx` | 330 | Public | Multi-step email/OTP/new-password reset flow (`OtpInput`, `PasswordStrengthIndicator`) |
| `/reset-password` | `apps/web/src/app/reset-password/page.tsx` | 167 | Public (`<Suspense>`) | Token-based password reset form (`PasswordStrengthIndicator`) |
| `/auth-callback` | `apps/web/src/app/auth-callback/page.tsx` | 70 | Public (`<Suspense>`) | OAuth/session callback redirect handler (`trpc.tenant.getMyTenants`) |
| `/dev-callback/[...slug]` | `apps/web/src/app/dev-callback/[...slug]/page.tsx` | 76 | Dev-only | Local OAuth callback bridge |
| `/invite/[token]` | `apps/web/src/app/invite/[token]/page.tsx` | 133 | Public / Auth | Household partner invitation acceptance (`trpc.tenant.getInviteDetails`, `trpc.tenant.acceptInvite`) |
| `/privacy` | `apps/web/src/app/privacy/page.tsx` | 173 | Public | Privacy Policy page (`LandingHeader`, `LandingFooter`) |
| `/terms` | `apps/web/src/app/terms/page.tsx` | 144 | Public | Terms of Service page (`LandingHeader`, `LandingFooter`) |
| `/blog` | `apps/web/src/app/blog/page.tsx` | 124 | Public | Blog index (`BLOG_POSTS` from `apps/web/src/lib/blog-data.ts`) |
| `/blog/[slug]` | `apps/web/src/app/blog/[slug]/page.tsx` | 215 | Public | Blog article detail (`BLOG_POSTS`) |
| `/setup` | `apps/web/src/app/setup/page.tsx` | 400 | Authenticated | 5-step setup wizard (`SetupHeaderBar`, `SetupBankAccountsStep`, `SetupIncomeStep`, `SetupLifestyleStep`, `SetupGoalsStep`, `SetupCategoriesStep`, `EnvelopeFormModal`, `SetupDiscardModal`, `PaydaySandboxModal`) |
| `/subscription/upgrade` | `apps/web/src/app/subscription/upgrade/page.tsx` | 255 | Authenticated (`<Suspense>`) | Plan selection & Stripe Checkout redirect (`ActiveSubscriptionCard`, `trpc.billing.createCheckoutSession`) |
| `/subscription/success` | `apps/web/src/app/subscription/success/page.tsx` | 130 | Authenticated (`<Suspense>`) | Checkout verification (`trpc.billing.verifyCheckoutSession`) |
| `/subscription/manage` | `apps/web/src/app/subscription/manage/page.tsx` | 50 | Authenticated | Redirects to `/dashboard/settings?tab=subscription` |
| `/dashboard` (Layout) | `apps/web/src/app/dashboard/layout.tsx` | 499 | Authenticated + Tenant | `ProductTourProvider`, `FileNotesProvider`, `DashboardDesktopSidebar`, `DashboardMobileHeader`, `DashboardMobileDrawer`, `DashboardFooter`, `TrialBanner`, `CommandPaletteModal`, `FeedbackModal`, `KeyboardShortcutsModal` |
| `/dashboard` | `apps/web/src/app/dashboard/page.tsx` | 364 | Authenticated + Tenant | `DashboardActionStrip`, `BentoPoolsSection`, `NextPaydayCard`, `GoalsProgressStrip`, `BalanceMatchNudgeBanner`, `AttentionItemsList`, `BankAccountsSection`, `DashboardModals` (`QuickActionDrawer`, `ReconciliationModal`, `EnvelopeFormModal`, `AffordCheckModal`, `MarkPaidModal`, `TransferModal`) |
| `/dashboard/envelopes` | `apps/web/src/app/dashboard/envelopes/page.tsx` | 475 | Authenticated + Tenant | `EnvelopesFilterBar`, `PoolsTable`, `PoolTableRowItem`, `QuickActionDrawer`, `EnvelopeFormModal`, `EnvelopeDetailDrawer`, `ConfirmDialog`, `FileNotesDrawer` |
| `/dashboard/income-and-bills` | `apps/web/src/app/dashboard/income-and-bills/page.tsx` | 503 | Authenticated + Tenant (`<Suspense>`) | 3 tabs: `UpcomingTimelineTab` (`TimelineFiltersBar`, `TimelineEventsTable`, `TimelineModals`), `MatrixPlanTab` (`MatrixTableHeader`, `MatrixCellInput`), and Schedules (`IncomeSchedulesCard`, `BillSchedulesCard`, `IncomeFormModal`, `EnvelopeFormModal`, `EnvelopeDetailDrawer`, `FileNotesDrawer`) |
| `/dashboard/income-split` | `apps/web/src/app/dashboard/income-split/page.tsx` | 44 | Authenticated + Tenant (`<Suspense>`) | Renders `IncomeSplitScreen` (`PaydayCelebrationCard`, `PaydayMetricsGrid`, `IncomeEventInlineCard`, `DestinationTransferItem`, `IncomeSplitPoolTable`, `IncomeSplitModals`, `UnsavedSplitExitDialog`, `FileNotesDrawer`) |
| `/dashboard/bank-accounts` | `apps/web/src/app/dashboard/bank-accounts/page.tsx` | 22 | Authenticated + Tenant | Redirects to `/dashboard/settings?tab=bank-accounts` |
| `/dashboard/history` | `apps/web/src/app/dashboard/history/page.tsx` | 88 | Authenticated + Tenant (`<Suspense>`) | 2 tabs: `TransactionsTab` and `PaydayAllocationsTab` (`SlideOverAllocationDrawer`, `FileNotesDrawer`) |
| `/dashboard/afford-check` | `apps/web/src/app/dashboard/afford-check/page.tsx` | 16 | Authenticated + Tenant | Renders `AffordCheckScreen` (`AffordCheckVerdict`, `AffordCheckBreakdown`, `GoalDelayCard`, `AffordCheckSkeleton`) |
| `/dashboard/reports` | `apps/web/src/app/dashboard/reports/page.tsx` | 311 | Authenticated + Tenant + `reports` flag | `SpendingOverviewCard` (`DonutChart`, `BarTrendChart`, `HorizontalRankedBarChart`), KPI summary cards, CSV export |
| `/dashboard/settings` | `apps/web/src/app/dashboard/settings/page.tsx` | 242 | Authenticated + Tenant | Tabbed settings (`ProfileSection`, `HouseholdDetailsSection`, `PartnerInviteSection`, `HouseholdDangerZoneSection`, `BankAccountsSection`, `AllocationStrategySection`, `SubscriptionSection`, `NotificationsPage`, `PrivacySection`, `ArchivedSection`, `FeedbackModal`, `ConfirmDialog`, version footer) |
| `/dashboard/settings/allocation-rules` | `apps/web/src/app/dashboard/settings/allocation-rules/page.tsx` | 354 | Authenticated + Tenant + `customAllocationRules` flag | Custom payday waterfall strategy step builder (`ConfirmDialog`) |
| `/dashboard/settings/notifications` | `apps/web/src/app/dashboard/settings/notifications/page.tsx` | 163 | Authenticated + Tenant | Notification toggles (`trpc.notifications.getPreferences`, `trpc.notifications.updatePreferences`) |
| `/dashboard/settings/history` | `apps/web/src/app/dashboard/settings/history/page.tsx` | 41 | Authenticated + Tenant | Redirects to `/dashboard/history` |
| `/dashboard/[...not-found]` | `apps/web/src/app/dashboard/[...not-found]/page.tsx` | 108 | Authenticated + Tenant | Scoped dashboard 404 screen |
| `/api/auth/[...auth]` | `apps/web/src/app/api/auth/[...auth]/route.ts` | 234 | Public / Cookie | Next.js Neon Auth proxy + CSRF origin check + rate-limit header forwarding |
| `/api/trpc/[trpc]` | `apps/web/src/app/api/trpc/[trpc]/route.ts` | 215 | Public / Cookie | Next.js tRPC proxy to Cloudflare Worker API (`NEXT_PUBLIC_API_URL`) |
| `/robots.txt` & `/sitemap.xml` | `apps/web/src/app/robots.ts` (21L), `sitemap.ts` (74L) | 95 | Public | Search engine metadata routes |

---

## 3. Mobile Routes & Screens Inventory (`apps/mobile/src/app` — 37 Files)

| Mobile Route | File Path | Lines | Auth / Guard | Primary Components / Modals / Sheets Rendered |
| :--- | :--- | ---: | :--- | :--- |
| Root Layout | `apps/mobile/src/app/_layout.tsx` | 118 | Public / Root | `AppProviders` (`TRPCProvider`, `CurrencyLocaleProvider`, `DateLocaleProvider`, `IconVisibilityProvider`, `MobileToastProvider`, `NotificationServiceProvider`, `ProductTourProvider`, `SetupWizardProvider`, `FileNotesProvider`), `BiometricLockOverlay`, `MobileConfirmContainer`, `MobileToastContainer` |
| `/` (Entry Redirect) | `apps/mobile/src/app/index.tsx` | 43 | Public / Auth | Redirects to `/(auth)/sign-in`, `/(setup)/accounts`, or `/(app)/home` |
| `+not-found` | `apps/mobile/src/app/+not-found.tsx` | 86 | Public | Unmatched route screen |
| `(auth)` Layout | `apps/mobile/src/app/(auth)/_layout.tsx` | 14 | Public | Expo Router `Stack` for auth screens |
| `/(auth)/sign-in` | `apps/mobile/src/app/(auth)/sign-in.tsx` | 149 | Public | `SignInEmailPasswordFields`, `MobileOtpVerificationView`, `MobileSocialAuthButtons` |
| `/(auth)/sign-up` | `apps/mobile/src/app/(auth)/sign-up.tsx` | 191 | Public | `SignUpFormFields`, `SignUpTermsCheckbox`, `MobileOtpVerificationView`, `MobileSocialAuthButtons` |
| `/(auth)/forgot-password` | `apps/mobile/src/app/(auth)/forgot-password.tsx` | 219 | Public | `ForgotPasswordEmailStep`, `ForgotPasswordOtpStep`, `ForgotPasswordSuccessStep` |
| `/(auth)/reset-password` | `apps/mobile/src/app/(auth)/reset-password.tsx` | 240 | Public | Deep-link token password reset screen (`MobilePasswordStrength`) |
| `/(auth)/invite/[token]` | `apps/mobile/src/app/(auth)/invite/[token].tsx` | 159 | Public / Auth | Partner invite acceptance screen (`trpc.tenant.getInviteDetails`, `trpc.tenant.acceptInvite`) |
| `(setup)` Layout | `apps/mobile/src/app/(setup)/_layout.tsx` | 19 | Authenticated | Expo Router `Stack` for setup wizard |
| `/(setup)/accounts` | `apps/mobile/src/app/(setup)/accounts.tsx` | 124 | Authenticated | Step 1: `SetupProgressBar`, `SetupBankAccountsHeader`, `SetupBankAccountCard` |
| `/(setup)/income` | `apps/mobile/src/app/(setup)/income.tsx` | 343 | Authenticated | Step 2: `SetupProgressBar`, income schedule inputs, `RecurrenceBuilder` |
| `/(setup)/lifestyle` | `apps/mobile/src/app/(setup)/lifestyle.tsx` | 351 | Authenticated | Step 3: `SetupProgressBar`, `LifestyleChildSubCard`, `LifestyleVehicleSubCard`, `MobileDiscretionarySliders` |
| `/(setup)/goals` | `apps/mobile/src/app/(setup)/goals.tsx` | 394 | Authenticated | Step 4: `SetupProgressBar`, `SetupGoalsPresetsGrid`, `SetupGoalCard` |
| `/(setup)/categories` | `apps/mobile/src/app/(setup)/categories.tsx` | 499 | Authenticated | Step 5: `SetupProgressBar`, `SetupCategoriesGoalsList`, `SetupCategoryRow`, `EnvelopeFormModal`, `MobilePaydaySandboxModal` |
| `(app)` Tabs Layout | `apps/mobile/src/app/(app)/_layout.tsx` | 274 | Authenticated + Tenant | Bottom Tabs (`home`, `envelopes`, `paychecks`, `transactions`, `settings`) + hidden stack routes, `QuickActionFab`, `QuickExpenseModal`, `MobileCommandPaletteSheet`, `MobileAnalyticsConsentPrompt` |
| `/(app)/home` | `apps/mobile/src/app/(app)/home.tsx` | 368 | Authenticated + Tenant | `TrialBanner`, `DashboardHeroCard`, `MobileNextPaydayCard`, `MobileAffordCheckCard`, `GoalsProgressStrip`, `AttentionItemsList`, `BankAccountCard`, `EnvelopeFormModal`, `BankAccountFormModal`, `MobileReconciliationModal`, `MarkPaidModal`, `MobileTransferModal`, `MobileAffordCheckModal`, `QuickExpenseModal`, `LinkedPoolsModalSheet` |
| `/(app)/envelopes` | `apps/mobile/src/app/(app)/envelopes.tsx` | 248 | Authenticated + Tenant | `PoolSummaryCard`, `PoolGroupSection`, `PoolItemCard`, `EnvelopesFilterSheet`, `EnvelopeFormModal`, `MobileEnvelopeDetailSheet`, `PoolOverflowMenuModal`, `QuickExpenseModal` |
| `/(app)/envelopes/[id]` | `apps/mobile/src/app/(app)/envelopes/[id].tsx` | 186 | Authenticated + Tenant | Envelope detail route (`PoolUpcomingSection`, `PoolHistorySection`, `EnvelopeFormModal`) |
| `/(app)/envelopes/projection` | `apps/mobile/src/app/(app)/envelopes/projection.tsx` | 171 | Authenticated + Tenant | `ProjectionScrubber`, `ProjectionPoolGroupSection`, `ProjectionPoolCard` |
| `/(app)/paychecks` | `apps/mobile/src/app/(app)/paychecks.tsx` | 284 | Authenticated + Tenant | Segmented tabs: `UpcomingEventsTab`, `MobileMatrixPlanTab`, `RecurringSchedulesTab`, `PaychecksModalManager` |
| `/(app)/paychecks/[id]` | `apps/mobile/src/app/(app)/paychecks/[id].tsx` | 20 | Authenticated + Tenant | Redirects to `/(app)/income-split/[id]` |
| `/(app)/paychecks/schedules` | `apps/mobile/src/app/(app)/paychecks/schedules.tsx` | 284 | Authenticated + Tenant | Dedicated schedules management screen (`IncomeSourceCard`, `ExpenseBillCard`, `IncomeExpenseFormModal`, `EnvelopeFormModal`, `MobileBurstModal`) |
| `/(app)/paychecks/transfer-instructions` | `apps/mobile/src/app/(app)/paychecks/transfer-instructions.tsx` | 115 | Authenticated + Tenant | Standalone transfer rollup instructions screen |
| `/(app)/income-split` | `apps/mobile/src/app/(app)/income-split.tsx` | 60 | Authenticated + Tenant | Resolves next pending payday and redirects to `/(app)/income-split/[id]` or `/(app)/paychecks` |
| `/(app)/income-split/[id]` | `apps/mobile/src/app/(app)/income-split/[id].tsx` | 237 | Authenticated + Tenant | `MobilePaydayCelebrationCard`, `MobilePaydayMetricsGrid`, `MobileIncomeEventInlineCard`, `MobileBankTransferRollupCard`, `MobileIncomeSplitPoolList`, `MobilePaydayActionButtons`, `MobilePaydayTransferModal`, `MobileUnsavedSplitExitDialog`, `MobileEnvelopeDetailSheet`, `EnvelopeFormModal` |
| `/(app)/upcoming` | `apps/mobile/src/app/(app)/upcoming.tsx` | 12 | Authenticated + Tenant | Redirects to `/(app)/paychecks` |
| `/(app)/transactions` | `apps/mobile/src/app/(app)/transactions.tsx` | 186 | Authenticated + Tenant | Segmented tabs: `LedgerHistoryTab` and `IncomeSplitsTab`, `TransactionDetailSheet`, `MobilePaydayAllocationDetailModal` |
| `/(app)/afford-check` | `apps/mobile/src/app/(app)/afford-check.tsx` | 134 | Authenticated + Tenant | `AffordCheckInputControls`, `AffordCheckVerdictCard`, `AffordCheckBreakdownCard`, `GoalDelayCard` |
| `/(app)/reports` | `apps/mobile/src/app/(app)/reports.tsx` | 409 | Authenticated + Tenant + `reports` flag | `MobileSpendingOverviewCard` (`MobileDonutChart`, `MobileBarTrendChart`, `MobileHorizontalRankedBarChart`), KPI cards, CSV export (`expo-sharing`) |
| `/(app)/settings` | `apps/mobile/src/app/(app)/settings.tsx` | 360 | Authenticated + Tenant | `SettingsActiveHouseholdCard`, `MobileProfileSection`, `HouseholdDetailsSection`, `HouseholdPartnerInviteSection`, `HouseholdDangerZoneSection`, `MobileBankAccountsSection`, `MobileAllocationStrategySection`, `SubscriptionPlanSection`, `SettingsNotificationsCard`, `PrivacyGovernanceSection`, `MobileArchivedSection`, `SettingsVersionFooter`, `FeedbackFormModal`, `MobileTenantSwitcherModal` |
| `/(app)/settings/allocation-rules` | `apps/mobile/src/app/(app)/settings/allocation-rules.tsx` | 525 | Authenticated + Tenant + `customAllocationRules` flag | Custom payday waterfall strategy step builder |
| `/(app)/settings/archived` | `apps/mobile/src/app/(app)/settings/archived.tsx` | 36 | Authenticated + Tenant | Standalone wrapper around `MobileArchivedSection` |
| `/(app)/settings/bank-accounts` | `apps/mobile/src/app/(app)/settings/bank-accounts.tsx` | 15 | Authenticated + Tenant | Redirects to `/(app)/settings?tab=bank-accounts` |
| `/(app)/settings/history` | `apps/mobile/src/app/(app)/settings/history.tsx` | 18 | Authenticated + Tenant | Redirects to `/(app)/transactions` |
| `/(app)/settings/notifications` | `apps/mobile/src/app/(app)/settings/notifications.tsx` | 180 | Authenticated + Tenant | Notification preferences screen (`SwitchRow`, `trpc.notifications.getPreferences`, `trpc.notifications.updatePreferences`) |
| `/(app)/settings/subscription` | `apps/mobile/src/app/(app)/settings/subscription.tsx` | 25 | Authenticated + Tenant | Redirects to `/(app)/settings?tab=subscription` |

---

## 4. Modals, Drawers, Bottom Sheets & Confirm Dialogs Registry

### 4.1 Web Modals, Drawers & Confirm Dialogs (30 Components)

| Component / Dialog Name | File Path | Lines | Primitive Used | Notes / Status |
| :--- | :--- | ---: | :--- | :--- |
| `CommandPaletteModal` | `packages/ui/src/web/CommandPaletteModal.tsx` | 802 | `createPortal` modal | Shared in `@money-matters/ui/web` (`⌘K` search + Ask Penny AI) |
| `FileNotesDrawer` | `packages/capabilities/file-notes/src/web/FileNotesDrawer.tsx` | 316 | `SlideOverDrawer`, `ConfirmDialog` | Shared capability drawer for attaching/viewing PDF/image notes |
| `QuickActionDrawer` (`QuickExpenseDrawer`) | `apps/web/src/components/web/QuickExpenseDrawer.tsx` | 371 | `SlideOverDrawer`, `ConfirmDialog` | Renders `CrossBankTransferModal` and `MarkPaidModal` |
| `EnvelopeFormModal` | `apps/web/src/components/web/EnvelopeFormModal.tsx` | 383 | `ModalDialog`, `EnvelopeFormConfirmDialogs` (`ConfirmDialog` x3, `CrossBankTransferModal`) | Merged Create/Edit envelope & bill schedule modal (`isEdit`), same-privacy bank re-linking |
| `IncomeFormModal` | `apps/web/src/components/web/IncomeFormModal.tsx` | 393 | `ModalDialog`, `ConfirmDialog` (x2) | Merged Create/Edit income schedule modal (`isEdit`) |
| `MarkPaidModal` | `apps/web/src/app/dashboard/income-and-bills/components/MarkPaidModal.tsx` | 324 | `ModalDialog` | Shortfall resolution & bill payment confirmation modal |
| `TransferModal` | `apps/web/src/components/web/TransferModal.tsx` | 338 | `ModalDialog`, `ConfirmDialog` | Scheduled/pending transfer confirmation modal |
| `CrossBankTransferModal` | `apps/web/src/components/web/CrossBankTransferModal.tsx` | 106 | `ModalDialog` | Cross-bank physical transfer reminder modal |
| `EditUpcomingEventModal` | `apps/web/src/components/web/EditUpcomingEventModal.tsx` | 225 | `ModalDialog` | Edit upcoming income/expense event occurrence |
| `AffordCheckModal` | `apps/web/src/components/web/AffordCheckModal.tsx` | 130 | `ModalDialog` | Dashboard "Can I Afford It?" quick modal |
| `FeedbackModal` | `apps/web/src/components/web/FeedbackModal.tsx` | 194 | `ModalDialog` | Bug report / feedback submission (`trpc.submitFeedback`) |
| `AvatarCropModal` | `apps/web/src/components/web/AvatarCropModal.tsx` | 188 | `ModalDialog` | Avatar zoom/crop canvas modal |
| `TourWelcomeModal` | `apps/web/src/components/web/TourWelcomeModal.tsx` | 62 | `ModalDialog` | Product tour welcome prompt |
| `KeyboardShortcutsModal` | `apps/web/src/app/dashboard/components/KeyboardShortcutsModal.tsx` | 48 | `ModalDialog` | `?` keyboard shortcuts cheat-sheet modal |
| `BankAccountFormModal` | `apps/web/src/app/dashboard/bank-accounts/components/BankAccountFormModal.tsx` | 326 | `ModalDialog`, `ConfirmDialog` (x2) | Merged Create/Edit bank account modal (`isEdit`) |
| `PaydayTransferModal` | `apps/web/src/app/dashboard/income-split/components/PaydayTransferModal.tsx` | 204 | `ModalDialog` | Post-payday bank transfer checklist modal |
| `PaydaySandboxModal` | `apps/web/src/app/setup/components/PaydaySandboxModal.tsx` | 156 | `ModalDialog` | Setup wizard payday simulation modal |
| `SetupDiscardModal` | `apps/web/src/app/setup/components/SetupDiscardModal.tsx` | 24 | `ConfirmDialog` | Setup wizard discard confirmation |
| `ReconciliationModal` | `apps/web/src/components/ReconciliationModal.tsx` | 451 | Custom `<div role="dialog">` | Match Balance modal (flagged in `PRODUCTION_READINESS_PLAN.md` to use `ModalDialog` & <400L) |
| `BankAccountTable` (Linked Envelopes Modal) | `apps/web/src/app/dashboard/bank-accounts/components/BankAccountTable.tsx` | 349 | Custom `<div className="fixed inset-0">` | Inline linked-envelopes modal (flagged to use `ModalDialog`) |
| `UnsavedSplitExitDialog` | `apps/web/src/app/dashboard/income-split/components/UnsavedSplitExitDialog.tsx` | 85 | Custom `<div role="dialog">` | Unsaved payday split exit dialog (flagged to use `ConfirmDialog`) |
| `AuthModal` | `apps/web/src/components/landing/AuthModal.tsx` | 190 | Custom `<div role="dialog">` | Landing page auth modal (flagged to use `ModalDialog`) |
| `EarlyAccessModal` | `apps/web/src/components/landing/EarlyAccessModal.tsx` | 121 | Custom `<div role="dialog">` | Early access waitlist modal (flagged to use `ModalDialog`) |
| `SlideOverAllocationDrawer` | `apps/web/src/components/web/SlideOverAllocationDrawer.tsx` | 184 | Custom `<div className="fixed inset-0">` | Historical payday split drawer (flagged to use `SlideOverDrawer`) |
| `EnvelopeDetailDrawer` | `apps/web/src/app/dashboard/income-and-bills/components/EnvelopeDetailDrawer.tsx` | 350 | Custom `<div className="fixed inset-0">` | Envelope detail drawer (flagged to use `SlideOverDrawer`) |
| `DashboardMobileDrawer` | `apps/web/src/app/dashboard/components/DashboardMobileDrawer.tsx` | 34 | Custom mobile nav drawer | Responsive sidebar drawer for `<768px` viewports |
| `PartnerInviteSection` (Role/Revoke Confirms) | `apps/web/src/app/dashboard/settings/components/PartnerInviteSection.tsx` | 165 | `TypedConfirmDialog`, `ConfirmDialog` | Ownership transfer & invite revocation dialogs |
| `HouseholdDangerZoneSection` (Leave/Delete) | `apps/web/src/app/dashboard/settings/components/HouseholdDangerZoneSection.tsx` | 170 | `TypedConfirmDialog` (x2) | Leave household & delete household typed confirmations |
| `TimelineModals` | `apps/web/src/app/dashboard/income-and-bills/components/timeline/TimelineModals.tsx` | 210 | `ConfirmDialog`, `MarkPaidModal`, `TransferModal`, `EditUpcomingEventModal`, `EnvelopeDetailDrawer`, `FileNotesDrawer` | Orchestrates modals for `UpcomingTimelineTab` |
| `IncomeSplitModals` | `apps/web/src/app/dashboard/income-split/components/IncomeSplitModals.tsx` | 165 | `ConfirmDialog` (x3), `PaydayTransferModal`, `EnvelopeDetailDrawer`, `EnvelopeFormModal` | Orchestrates modals for `IncomeSplitScreen` |

### 4.2 Mobile Modals, Bottom Sheets & Confirm Dialogs (26 Components)

| Component / Dialog Name | File Path | Lines | Primitive Used | Notes / Status |
| :--- | :--- | ---: | :--- | :--- |
| `MobileCommandPaletteSheet` | `packages/ui/src/mobile/MobileCommandPaletteSheet.tsx` | 812 | `MobileModalDialog` | Shared in `@money-matters/ui/mobile` (search + Ask Penny AI) |
| `MobileEnvelopeDetailSheet` | `packages/ui/src/mobile/MobileEnvelopeDetailSheet.tsx` | 325 | `MobileModalDialog` | Shared envelope detail bottom sheet |
| `MobileFileNotesSheet` / `NotesFeedModal` | `packages/capabilities/file-notes/src/mobile/MobileFileNotesSheet.tsx` (369L) / `NotesFeedModal.tsx` (456L) | 369 / 456 | `MobileModalDialog`, `showMobileConfirm` | Shared capability bottom sheet for file notes |
| `QuickExpenseModal` | `apps/mobile/src/components/QuickExpenseModal.tsx` | 229 | `MobileModalDialog`, `showMobileConfirm` | 3-tab quick action sheet (`QuickExpenseTab`, `QuickIncomeTab`, `QuickTransferTab`) |
| `EnvelopeFormModal` | `apps/mobile/src/components/EnvelopeFormModal.tsx` | 388 | `MobileModalDialog`, `showMobileConfirm`, `CrossBankTransferModal` | Merged Create/Edit envelope & bill schedule sheet (`isEdit`), same-privacy bank re-linking |
| `IncomeExpenseFormModal` | `apps/mobile/src/components/IncomeExpenseFormModal.tsx` | 268 | `MobileModalDialog`, `MobileConfirmDialog` (x2) | Create/Edit income schedule or one-off event sheet (`isEdit`) |
| `BankAccountFormModal` | `apps/mobile/src/components/BankAccountFormModal.tsx` | 216 | `MobileModalDialog`, `showMobileConfirm` | Merged Create/Edit bank account sheet (`isEdit`) |
| `MobileReconciliationModal` | `apps/mobile/src/components/envelopes/MobileReconciliationModal.tsx` | 394 | `MobileModalDialog`, `showMobileConfirm` | Match Bank Balance sheet |
| `MarkPaidModal` | `apps/mobile/src/components/MarkPaidModal.tsx` | 255 | `MobileModalDialog` | Bill payment & shortfall cover sheet |
| `MobileTransferModal` | `apps/mobile/src/components/paychecks/MobileTransferModal.tsx` | 230 | `MobileModalDialog`, `MobileConfirmDialog` | Scheduled transfer confirmation sheet |
| `CrossBankTransferModal` | `apps/mobile/src/components/CrossBankTransferModal.tsx` | 188 | `MobileModalDialog` | Cross-bank transfer reminder modal |
| `EventOverrideModal` | `apps/mobile/src/components/EventOverrideModal.tsx` | 252 | `MobileModalDialog`, `showMobileConfirm` | Edit upcoming income/expense event occurrence |
| `MobileBurstModal` | `apps/mobile/src/components/paychecks/MobileBurstModal.tsx` | 243 | `MobileModalDialog`, `showMobileConfirm` | Schedule occurrence list & inline edit sheet |
| `MobilePaydayTransferModal` | `apps/mobile/src/components/paychecks/MobilePaydayTransferModal.tsx` | 168 | `MobileModalDialog` | Post-payday transfer checklist sheet |
| `MobilePaydayAllocationDetailModal` | `apps/mobile/src/components/paychecks/MobilePaydayAllocationDetailModal.tsx` | 114 | `MobileModalDialog` | Historical payday split breakdown sheet |
| `TransactionDetailSheet` | `apps/mobile/src/components/transactions/TransactionDetailSheet.tsx` | 194 | `MobileModalDialog` | Ledger transaction detail & inline note edit sheet |
| `LinkedPoolsModalSheet` | `apps/mobile/src/components/bank-accounts/LinkedPoolsModalSheet.tsx` | 166 | `MobileModalDialog` | Bank account linked envelopes breakdown sheet |
| `EnvelopesFilterSheet` | `apps/mobile/src/components/envelopes/EnvelopesFilterSheet.tsx` | 91 | `MobileFilterSheet` | Envelopes filter & sort bottom sheet |
| `MobileAffordCheckModal` | `apps/mobile/src/components/afford-check/MobileAffordCheckModal.tsx` | 289 | `MobileModalDialog` | Dashboard "Can I Afford It?" sheet |
| `FeedbackFormModal` | `apps/mobile/src/components/FeedbackFormModal.tsx` | 237 | `MobileModalDialog` | Bug report / feedback sheet (`trpc.submitFeedback`) |
| `MobilePlanPickerModal` | `apps/mobile/src/components/settings/MobilePlanPickerModal.tsx` | 315 | `MobileModalDialog` | Subscription plan picker & Stripe checkout sheet |
| `MobileTenantSwitcherModal` | `apps/mobile/src/components/settings/MobileTenantSwitcherModal.tsx` | 176 | `MobileModalDialog` | Household switcher & create household sheet |
| `MobilePaydaySandboxModal` | `apps/mobile/src/components/setup/MobilePaydaySandboxModal.tsx` | 213 | `MobileModalDialog` | Setup wizard payday simulation sheet |
| `PoolOverflowMenuModal` | `apps/mobile/src/components/envelopes/PoolOverflowMenuModal.tsx` | 142 | Raw `<Modal>` | Envelope action menu (flagged to use `MobileModalDialog`) |
| `MobileUnsavedSplitExitDialog` | `apps/mobile/src/components/paychecks/MobileUnsavedSplitExitDialog.tsx` | 164 | Raw `<Modal>` | Unsaved payday split exit dialog (flagged to use `MobileConfirmDialog`) |

---

## 5. Screen-by-Screen Web vs. Mobile Parity Matrix

| Screen / Capability | Web Route & Primary File | Mobile Route & Primary File | tRPC Procedures Invoked | Tour Anchors (`data-tour` / `MOBILE_TOUR_STEPS`) | Intentional Platform Idioms & Open Parity Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Public Marketing, Legal & Early Access** | `/`, `/privacy`, `/terms`, `/blog` (`apps/web/src/app/page.tsx`) | In-app links from Auth/Settings (Mobile starts at `/(auth)/sign-in`) | `tenant.subscribeEarlyAccess`, `getAppConfig` | N/A | Web hosts full marketing site & interactive payday simulator; Mobile enters directly into authentication. |
| **Authentication, OTP Reset & Partner Invite** | `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/invite/[token]` | `/(auth)/sign-in`, `/(auth)/sign-up`, `/(auth)/forgot-password`, `/(auth)/reset-password`, `/(auth)/invite/[token]` | `tenant.getInviteDetails`, `tenant.acceptInvite`, `tenant.getMyTenants` | N/A | Full functional parity (Email/Password, Google OAuth, 6-digit OTP reset, 48h partner invite). |
| **First-Run 5-Step Setup & 3-Step Rerun Wizard** | `/setup` (`?mode=rerun`) (`apps/web/src/app/setup/page.tsx`) | `/(setup)/accounts`, `income`, `lifestyle`, `goals`, `categories` | `envelopes.saveSetupBudget`, `tenant.completeSetup`, `tenant.cancelSetup`, `income.listIncomeSources`, `envelopes.listEnvelopes` | N/A | Web uses single-page step state; Mobile uses Expo Router stack screens. Both commit via `envelopes.saveSetupBudget`. |
| **Dashboard / Home Overview** | `/dashboard` (`apps/web/src/app/dashboard/page.tsx`) | `/(app)/home` (`apps/mobile/src/app/(app)/home.tsx`) | `envelopes.getHomeSummary`, `tenant.getBankAccounts`, `billing.getSubscriptionStatus` | `hero-metric`, `envelopes-bento`, `bank-accounts`, `payday-card`, `quick-actions` | Web uses top "+ Quick Action" dropdown; Mobile uses bottom-right `QuickActionFab` with haptics. |
| **Envelopes List, Detail & 12M Projection** | `/dashboard/envelopes` (`apps/web/src/app/dashboard/envelopes/page.tsx`) | `/(app)/envelopes`, `/(app)/envelopes/[id]`, `/(app)/envelopes/projection` | `envelopes.listEnvelopes`, `envelopes.createEnvelope`, `envelopes.updateEnvelope`, `envelopes.archiveEnvelope`, `envelopes.getProjectedEnvelopeBalances` | `envelopes-list`, `new-category-btn`, `search-input` | Web opens `EnvelopeDetailDrawer` + inline projection scrubber; Mobile navigates to `/(app)/envelopes/[id]` and `/(app)/envelopes/projection`. |
| **Plan: Upcoming Timeline, 12M Matrix & Schedules** | `/dashboard/income-and-bills` (`apps/web/src/app/dashboard/income-and-bills/page.tsx`) | `/(app)/paychecks`, `/(app)/paychecks/schedules` | `payday.getMatrixPlan`, `income.listUpcomingIncomeEvents`, `expenses.listUpcomingExpenseEvents`, `transfers.listUpcomingTransferEvents`, `payday.overrideEvent`, `payday.bulkDeleteEvents` | `matrix-plan`, `upcoming-events` | Web renders 12M spreadsheet grid; Mobile renders horizontal pay-cycle card carousel + `MobileBurstModal`. |
| **Allocate Payday (Income Split Studio)** | `/dashboard/income-split` (`apps/web/src/app/dashboard/income-split/page.tsx`) | `/(app)/income-split`, `/(app)/income-split/[id]`, `/(app)/paychecks/transfer-instructions` | `payday.previewPayday`, `payday.saveBulkAllocations`, `payday.saveAutoAllocation`, `payday.confirmPayday`, `payday.resetAllocationPlan` | `allocate-payday` | Both implement the Document Draft Model (`Auto-Calculated` -> `Custom Draft` -> `Save Draft` / `Confirm & Apply` + `Reset`). |
| **"Can I Afford It?" Purchase Simulator** | `/dashboard/afford-check` (`apps/web/src/app/dashboard/afford-check/page.tsx`) | `/(app)/afford-check` (`apps/mobile/src/app/(app)/afford-check.tsx`) | `simulation.canAfford` | `affordability-simulator` | Full 6-verdict (`SAFE_YES`, `PACING_TIGHT`, `BILLS_RISK`, `WAIT_FOR_PAYCYCLE`, `GOAL_DELAYED`, `HARD_NO`) & `GoalDelayCard` parity. |
| **Activity / History (Transactions & Payday Splits)** | `/dashboard/history` (`apps/web/src/app/dashboard/history/page.tsx`) | `/(app)/transactions` (`apps/mobile/src/app/(app)/transactions.tsx`) | `transactions.listTransactions`, `transactions.recordManualTransaction`, `transactions.moveMoney`, `transactions.markExpensePaid`, `transactions.updateTransactionNote`, `payday.listConfirmedAllocations` | `history-ledger` | Web downloads CSV directly; Mobile shares CSV via `expo-sharing`. |
| **Visual Analytics / Reports** | `/dashboard/reports` (`apps/web/src/app/dashboard/reports/page.tsx`) | `/(app)/reports` (`apps/mobile/src/app/(app)/reports.tsx`) | `payday.getIncomeSplitAnalytics`, `transactions.listTransactions`, `envelopes.listEnvelopes` | N/A | Guarded by `apps.featureFlags.reports` on both platforms. |
| **Settings (Profile, Household, Bank Accounts, Rules, Subscription, Notifications, Privacy, Archive)** | `/dashboard/settings` + `/allocation-rules`, `/notifications` | `/(app)/settings` + `/allocation-rules`, `/archived`, `/notifications`, `/subscription` | `tenant.*`, `payday.getActiveAllocationStrategy`, `payday.applyAllocationPreset`, `payday.updateAllocationStrategySteps`, `billing.*`, `notifications.*`, `envelopes.listArchivedItems`, `envelopes.restoreArchivedItem`, `submitFeedback` | Settings Product Tour button & Version Footer on both | Mobile adds native Biometric Lock (`mm_biometric_lock_enabled`) and Haptic Feedback (`mm_haptics_enabled`) toggles. |

---

## 6. `@money-matters/ui` Shared Primitives & Entrypoints Inventory

### 6.1 Package Entrypoints (`packages/ui/package.json`)
- `@money-matters/ui` (`.`) → `packages/ui/src/index.ts` (re-exports `DESIGN_TOKENS`, shared hooks/formatters/dates, and `./web/index`).
- `@money-matters/ui/web` (`./web`) → `packages/ui/src/web/index.ts` (73 exported symbols across modals, drawers, form inputs, tables, charts, `HouseholdContributionSection`, and providers).
- `@money-matters/ui/mobile` (`./mobile`) → `packages/ui/src/mobile/index.ts` (111 exported symbols across native bottom-sheet modals, inputs, pickers, charts, `MobileHouseholdContributionSection`, and providers).
- `@money-matters/ui/tokens` (`./tokens`) → `packages/ui/src/tokens.ts` (`DESIGN_TOKENS`).

---

## 7. `@money-matters/i18n` Dictionary Files & Namespace Inventory (`2,047` Leaf Keys)

All user-facing copy lives in `packages/i18n/src/dictionaries/en/*.ts` (re-exported via `packages/i18n/src/dictionaries/en.ts`).

| Dictionary File (`packages/i18n/src/dictionaries/en/*.ts`) | Top-Level Namespaces Owned | Total Keys | Web `t()` Calls (Distinct Keys) | Mobile `t()` Calls (Distinct Keys) | API `t()` Calls (Distinct Keys) | Packages `t()` Calls (Distinct Keys) |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| `auth.ts` | `auth`, `tenantSwitcher`, `partner` | 83 | 133 (74) | 132 (76) | 0 (0) | 1 (1) |
| `commandPalette.ts` | `commandPalette` | 26 | 4 (2) | 0 (0) | 0 (0) | 40 (21) |
| `common.ts` | `common`, `nav`, `actions`, `badges`, `tables`, `forms`, `toasts`, `tooltips`, `validation`, `notFound`, `networkError`, `keyboardShortcuts`, `errors`, `legal`, `location`, `app`, `searchSelect` | 210 | 302 (136) | 307 (98) | 0 (0) | 133 (79) |
| `dashboard.ts` | `dashboard`, `home`, `cards`, `assistant` | 131 | 83 (71) | 96 (78) | 0 (9) | 18 (19) |
| `envelopes.ts` | `envelopes`, `categories`, `categoryDrawer`, `drawers`, `modals`, `poolTypes`, `quickPick`, `goalModes` | 312 | 290 (201) | 271 (177) | 0 (0) | 82 (42) |
| `feedback.ts` | `feedback` | 26 | 25 (25) | 25 (25) | 0 (0) | 0 (0) |
| `fileNotes.ts` | `fileNotes` | 16 | 2 (2) | 2 (1) | 0 (0) | 27 (16) |
| `plan.ts` | `planTabs`, `incomeAndBills`, `schedules`, `matrix`, `billCoverage`, `expenseStatus` | 132 | 75 (66) | 100 (81) | 0 (0) | 11 (16) |
| `landing.ts` | `landing` | 292 | 230 (192) | 5 (3) | 0 (0) | 0 (0) |
| `payday.ts` | `payday`, `paydayDrawer`, `paychecks` | 99 | 86 (75) | 103 (79) | 0 (0) | 14 (8) |
| `privacy.ts` | `privacy`, `terms`, `public` | 144 | 136 (135) | 22 (21) | 0 (5) | 4 (4) |
| `reports.ts` | `reports` | 18 | 12 (9) | 8 (8) | 0 (0) | 0 (0) |
| `settings.ts` + `settings-sections.ts` | `settings`, `subscription`, `notifications`, `bankAccounts` | 382 | 341 (281) | 294 (247) | 4 (3) | 16 (22) |
| `setup.ts` | `setup` | 176 | 177 (151) | 169 (153) | 0 (0) | 5 (9) |
| `tour.ts` | `tour` | 38 | 7 (33) | 7 (33) | 0 (0) | 12 (5) |
| `history.ts` | `transactions`, `canIAfford` | 177 | 133 (101) | 101 (84) | 0 (0) | 78 (43) |
| **Total** | **47 Top-Level Namespaces across 16 Files** | **2,260** | **2,036 (1,554)** | **1,642 (1,165)** | **4 (17)** | **441 (245)** |
