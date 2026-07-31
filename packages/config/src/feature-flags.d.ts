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
export declare const FEATURE_FLAGS: {
    readonly premiumEnabled: {
        readonly key: "premiumEnabled";
        readonly owner: "product";
        readonly expiresAt: "never";
        readonly tenantScopable: true;
    };
    readonly partnerInvite: {
        readonly key: "partnerInvite";
        readonly owner: "product";
        readonly expiresAt: "2026-12-31";
        readonly tenantScopable: true;
    };
    readonly offlineSync: {
        readonly key: "offlineSync";
        readonly owner: "engineering";
        readonly expiresAt: "2026-12-31";
        readonly tenantScopable: true;
    };
};
/**
 * Evaluates whether a specified feature flag is enabled for an application ID.
 *
 * @param flag - Feature flag key
 * @param appId - Target application UUID
 * @param premiumEnabledOverride - Optional tenant-level override for premium entitlements
 * @returns True if feature is enabled, false otherwise
 */
export declare function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS, appId: string, premiumEnabledOverride?: boolean): boolean;
//# sourceMappingURL=feature-flags.d.ts.map