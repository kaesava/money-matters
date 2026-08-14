/**
 * Feature Flags & Entitlements Management
 * 
 * Manages feature flags, ownership metadata, expiry timelines, and tenant-scoped runtime evaluations.
 */
import { resolveAppConfig } from "./app-registry.js";

/**
 * Feature flag metadata specification.
 */
export interface FeatureFlag {
  /** Unique key identifying the feature flag. */
  key: string;
  /** Team or engineering owner responsible for maintaining the flag. */
  owner: string;
  /** Expiration timeline string ('never' or ISO date). */
  expiresAt: string;
  /** Indicates if flag can be overridden per tenant scope. */
  tenantScopable: boolean;
}

/**
 * Strongly typed registry of platform feature flags.
 */
export const FEATURE_FLAGS = {
  premiumEnabled: {
    key: "premiumEnabled",
    owner: "product",
    expiresAt: "never",
    tenantScopable: true,
  },
  partnerInvite: {
    key: "partnerInvite",
    owner: "product",
    expiresAt: "2026-12-31",
    tenantScopable: true,
  },
  offlineSync: {
    key: "offlineSync",
    owner: "engineering",
    expiresAt: "2026-12-31",
    tenantScopable: true,
  },
  foundingMemberPromo: {
    key: "foundingMemberPromo",
    owner: "product",
    expiresAt: "never",
    tenantScopable: false,
  },
} as const;


/**
 * Evaluates whether a specified feature flag is enabled for an application ID.
 *
 * @param flag - Feature flag key
 * @param appId - Target application UUID
 * @param premiumEnabledOverride - Optional tenant-level override for premium entitlements
 * @returns True if feature is enabled, false otherwise
 */
export function isFeatureEnabled(
  flag: keyof typeof FEATURE_FLAGS,
  appId: string,
  premiumEnabledOverride = false
): boolean {
  const appConfig = resolveAppConfig(appId);
  if (!appConfig) return false;

  if (flag === "premiumEnabled") {
    return appConfig.features.premiumEnabled || premiumEnabledOverride;
  }

  return appConfig.features[flag];
}

