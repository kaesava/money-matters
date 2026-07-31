/**
 * Upserts a user in the local mirror table when verified JWT claims are processed.
 * Ensures the public.users record is always kept in sync with the identity provider.
 */
export declare function upsertUserFromJwt(userId: string, email: string, displayName?: string): Promise<void>;
//# sourceMappingURL=user-sync.d.ts.map