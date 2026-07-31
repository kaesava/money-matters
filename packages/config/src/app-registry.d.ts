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
/**
 * Resolves application configuration settings by application ID.
 *
 * @param appId - Target application UUID
 * @returns AppConfig object if registered, or null if unknown
 */
export declare function resolveAppConfig(appId: string): AppConfig | null;
//# sourceMappingURL=app-registry.d.ts.map