export declare const timestamps: {
    createdAt: import("drizzle-orm").HasDefault<import("drizzle-orm").NotNull<import("drizzle-orm/pg-core").PgTimestampBuilderInitial<"created_at">>>;
    createdBy: import("drizzle-orm").NotNull<import("drizzle-orm/pg-core").PgUUIDBuilderInitial<"created_by">>;
    updatedAt: import("drizzle-orm").HasDefault<import("drizzle-orm").NotNull<import("drizzle-orm/pg-core").PgTimestampBuilderInitial<"updated_at">>>;
    updatedBy: import("drizzle-orm").NotNull<import("drizzle-orm/pg-core").PgUUIDBuilderInitial<"updated_by">>;
    archivedAt: import("drizzle-orm/pg-core").PgTimestampBuilderInitial<"archived_at">;
};
export declare const tenantAndTimestamps: {
    createdAt: import("drizzle-orm").HasDefault<import("drizzle-orm").NotNull<import("drizzle-orm/pg-core").PgTimestampBuilderInitial<"created_at">>>;
    createdBy: import("drizzle-orm").NotNull<import("drizzle-orm/pg-core").PgUUIDBuilderInitial<"created_by">>;
    updatedAt: import("drizzle-orm").HasDefault<import("drizzle-orm").NotNull<import("drizzle-orm/pg-core").PgTimestampBuilderInitial<"updated_at">>>;
    updatedBy: import("drizzle-orm").NotNull<import("drizzle-orm/pg-core").PgUUIDBuilderInitial<"updated_by">>;
    archivedAt: import("drizzle-orm/pg-core").PgTimestampBuilderInitial<"archived_at">;
    tenantId: import("drizzle-orm").NotNull<import("drizzle-orm/pg-core").PgUUIDBuilderInitial<"tenant_id">>;
    appId: import("drizzle-orm").NotNull<import("drizzle-orm/pg-core").PgUUIDBuilderInitial<"app_id">>;
};
//# sourceMappingURL=base.d.ts.map