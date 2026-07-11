import { resolveAppConfig } from "./app-registry.js";

export interface FeatureFlag {
  key: string;
  owner: string;
  expiresAt: string;
  tenantScopable: boolean;
}

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
} as const;

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
