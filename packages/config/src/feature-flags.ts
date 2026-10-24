/**
 * Feature Flags & Entitlements Management
 * 
 * Manages feature flags, ownership metadata, expiry timelines, and tenant-scoped runtime evaluations.
 */
import { resolveAppConfig } from "./app-registry";

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
  /** Emergency kill switch state to globally disable feature regardless of overrides. */
  killSwitchEnabled: boolean;
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
    killSwitchEnabled: false,
  },
  partnerInvite: {
    key: "partnerInvite",
    owner: "product",
    expiresAt: "2026-12-31",
    tenantScopable: true,
    killSwitchEnabled: false,
  },
  offlineSync: {
    key: "offlineSync",
    owner: "engineering",
    expiresAt: "2026-12-31",
    tenantScopable: true,
    killSwitchEnabled: false,
  },
  foundingMemberPromo: {
    key: "foundingMemberPromo",
    owner: "product",
    expiresAt: "never",
    tenantScopable: false,
    killSwitchEnabled: false,
  },
  aiAssistant: {
    key: "aiAssistant",
    owner: "product",
    expiresAt: "never",
    tenantScopable: true,
    killSwitchEnabled: false,
  },
} as const;


/**
 * In-memory or runtime tenant overrides map for canary testing and pilot tenants.
 */
const tenantFlagOverrides = new Map<string, Record<string, boolean>>();

/**
 * Sets or removes a tenant-specific feature flag override.
 */
export function setTenantFeatureFlagOverride(
  tenantId: string,
  flag: keyof typeof FEATURE_FLAGS,
  enabled: boolean | undefined
): void {
  const current = tenantFlagOverrides.get(tenantId) || {};
  if (enabled === undefined) {
    delete current[flag];
    if (Object.keys(current).length === 0) {
      tenantFlagOverrides.delete(tenantId);
    } else {
      tenantFlagOverrides.set(tenantId, current);
    }
  } else {
    current[flag] = enabled;
    tenantFlagOverrides.set(tenantId, current);
  }
}

/**
 * Clears all tenant feature flag overrides (useful in testing).
 */
export function clearTenantFeatureFlagOverrides(): void {
  tenantFlagOverrides.clear();
}

/**
 * Evaluates whether a specified feature flag is enabled for an application ID and optional tenant scope.
 *
 * @param flag - Feature flag key
 * @param appId - Target application UUID
 * @param tenantIdOrPremiumOverride - Optional tenant ID for tenant-scoped overrides OR boolean premium override
 * @param premiumEnabledOverride - Optional tenant-level override for premium entitlements
 * @returns True if feature is enabled, false otherwise
 */
export function isFeatureEnabled(
  flag: keyof typeof FEATURE_FLAGS,
  appId: string,
  tenantIdOrPremiumOverride?: string | boolean,
  premiumEnabledOverride = false
): boolean {
  if (FEATURE_FLAGS[flag]?.killSwitchEnabled) {
    return false;
  }

  // Handle overloaded argument (tenantId string vs boolean legacy premiumEnabledOverride)
  let tenantId: string | undefined;
  let isPremiumOverride = premiumEnabledOverride;
  if (typeof tenantIdOrPremiumOverride === "boolean") {
    isPremiumOverride = tenantIdOrPremiumOverride;
  } else if (typeof tenantIdOrPremiumOverride === "string") {
    tenantId = tenantIdOrPremiumOverride;
  }

  // Tenant-scoped override check
  if (tenantId && FEATURE_FLAGS[flag]?.tenantScopable) {
    const overrides = tenantFlagOverrides.get(tenantId);
    if (overrides && typeof overrides[flag] === "boolean") {
      return overrides[flag];
    }
  }

  const appConfig = resolveAppConfig(appId);
  if (!appConfig) return false;

  if (flag === "premiumEnabled") {
    return appConfig.features.premiumEnabled || isPremiumOverride;
  }

  return appConfig.features[flag];
}

