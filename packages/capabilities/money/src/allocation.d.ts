/**
 * Executes the Payday Cascade Algorithm (V1).
 * Tier 1: Critical Horizon Deficits (100% funding)
 * Tier 2: Pro-Rata Sinking Velocity (Proportional distribution)
 * Tier 3: Residual Catchment (Sweep to Everyday Expenses)
 */
export declare function calculatePaydayCascade(tenantId: string, appId: string, incomeAmount: number, scheduleId: string): Promise<{
    id: string;
    appId: string;
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    updatedBy: string;
    archivedAt: Date | null;
    tenantId: string;
    scheduleId: string;
    incomeAmount: string;
    status: string;
    allocationSplitsManifest: unknown;
    calculatedAt: Date;
}>;
//# sourceMappingURL=allocation.d.ts.map