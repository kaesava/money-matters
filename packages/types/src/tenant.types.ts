import { z } from "zod";

/**
 * Base audit schema inherited by all tenant-scoped database models.
 * Ensures metadata fields (IDs, audit timestamps, creator/updater user IDs) conform to strict UUID and Date types.
 */
export const BaseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  appId: z.string().uuid(),
  createdAt: z.date(),
  createdBy: z.string().uuid(),
  updatedAt: z.date(),
  updatedBy: z.string().uuid(),
  archivedAt: z.date().nullable(),
}).strict();

/**
 * Subscription status lifecycle state machine.
 */
export const SubscriptionStatus = z.enum([
  "TRIAL_ACTIVE",
  "TRIAL_GRACE",
  "TRIAL_EXPIRED",
  "SUBSCRIBED",
  "PAST_DUE",
  "DEACTIVATED",
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatus>;

/**
 * Schema validating Tenant organisation details including fiscal year parameters and subscription lifecycle.
 */
export const TenantSchema = BaseSchema.extend({
  name: z.string().min(1),
  country: z.string().length(2).default("AU"),
  currency: z.string().length(3).default("AUD"),
  timezone: z.string().default("Australia/Sydney"),
  premiumEnabled: z.boolean().default(false),
  subscriptionStatus: SubscriptionStatus.default("TRIAL_ACTIVE"),
  trialStartedAt: z.date().nullable().default(null),
  trialEndsAt: z.date().nullable().default(null),
  stripeCustomerId: z.string().nullable().default(null),
  stripeSubscriptionId: z.string().nullable().default(null),
  stripePriceId: z.string().nullable().default(null),
  subscribedAt: z.date().nullable().default(null),
  subscriptionEndsAt: z.date().nullable().default(null),
}).strict();

export type TenantType = z.infer<typeof TenantSchema>;

/**
 * DTO summarizing tenant subscription status and trial lifecycle flags.
 */
export const SubscriptionStatusDto = z.object({
  status: SubscriptionStatus,
  trialEndsAt: z.date().nullable(),
  subscriptionEndsAt: z.date().nullable(),
  gracePeriodEndsAt: z.date().nullable().optional(),
  isTrialActive: z.boolean(),
  isTrialExpired: z.boolean(),
  isGracePeriod: z.boolean().default(false),
  isSubscribed: z.boolean(),
  isPastDue: z.boolean(),
  isDeactivated: z.boolean(),
  daysRemainingInTrial: z.number().nullable(),
  cancelAtPeriodEnd: z.boolean().default(false),
  planType: z.enum(["monthly", "annual", "founding"]).nullable().optional(),
  nextBillingAt: z.date().nullable().optional(),
}).strict();
export type SubscriptionStatusDto = z.infer<typeof SubscriptionStatusDto>;

/**
 * Schema validating tenant membership access control, role levels, and pending invite tokens.
 */
export const TenantMemberSchema = BaseSchema.extend({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["OWNER", "MEMBER"]),
  inviteToken: z.string().uuid().nullable(),
  inviteStatus: z.enum(["PENDING", "ACCEPTED", "REVOKED"]),
}).strict();

export type TenantMemberType = z.infer<typeof TenantMemberSchema>;

/**
 * Schema for tenant member UI preferences and localization settings.
 */
export const UserPreferencesSchema = z.object({
  timezone: z.string().default("UTC"),
  language: z.enum(["en"]).default("en"),
  locale: z.string().default("auto"),
}).strict();

/**
 * Application Version and Diagnostics DTO
 */
export const AppVersionInfoSchema = z.object({
  appId: z.string().uuid(),
  appName: z.string().min(1),
  version: z.string().min(1),
  buildNumber: z.string().min(1),
  channel: z.enum(["development", "preview", "beta", "production"]),
  gitCommit: z.string().min(1),
  platform: z.enum(["web", "ios", "android"]),
  formattedVersion: z.string().min(1),
}).strict();

export type AppVersionInfo = z.infer<typeof AppVersionInfoSchema>;
