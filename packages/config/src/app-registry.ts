/**
 * Monorepo Application Registry
 * 
 * Configures registered multi-tenant SaaS applications, feature entitlements, and workspace parameters.
 */

/**
 * Metadata & feature capability toggles for registered platform applications.
 */
export interface AppConfig {
  /** Unique UUID identifier for the application. */
  id: string;
  /** Display name of the SaaS application. */
  name: string;
  /** URL slug identifier. */
  slug: string;
  /** Application level feature flag toggles. */
  features: {
    premiumEnabled: boolean;
    partnerInvite: boolean;
    offlineSync: boolean;
    canAffordCalculator: boolean;
  };
}

// Registry containing apps configured on this SaaS platform
const REGISTRY: Record<string, AppConfig> = {
  "01908bde-34bb-7b19-a178-574211bc93aa": {
    id: "01908bde-34bb-7b19-a178-574211bc93aa",
    name: "Money Matters",
    slug: "money-matters",
    features: {
      premiumEnabled: false,
      partnerInvite: false,
      offlineSync: false,
      canAffordCalculator: true,
    },
  },
};

/**
 * Resolves application configuration settings by application ID.
 *
 * @param appId - Target application UUID
 * @returns AppConfig object if registered, or null if unknown
 */
export function resolveAppConfig(appId: string): AppConfig | null {
  return REGISTRY[appId] || null;
}

