import { DbOrTx, bugReports } from "@money-matters/db";
import { logger } from "@money-matters/core";

export interface CreateBugReportInput {
  title: string;
  description: string;
  category: "budgeting" | "transactions" | "bank_accounts" | "ui_ux" | "auth" | "other";
  severity: "low" | "medium" | "high" | "critical";
  appVersion?: string;
  platform: "web" | "ios" | "android";
  pageUrl?: string;
  deviceInfo?: string;
}

/**
 * Command Handler: Create Bug Report
 * 
 * Persists user-submitted bug reports directly to PostgreSQL with tenant isolation.
 * Automatically ties the report to the current tenantId, appId, and userId (createdBy),
 * eliminating the need for client-provided PII while maintaining strict audit trails.
 */
export function createBugReportHandler(db: DbOrTx) {
  return async (
    input: CreateBugReportInput,
    tenantId: string,
    appId: string,
    userId: string
  ) => {
    logger.info("Submitting bug report", {
      tenantId,
      userId,
      platform: input.platform,
      category: input.category,
      severity: input.severity,
    });

    const now = new Date();

    const [created] = await db
      .insert(bugReports)
      .values({
        title: input.title,
        description: input.description,
        category: input.category,
        severity: input.severity,
        status: "open",
        appVersion: input.appVersion ?? "1.0.0-beta",
        platform: input.platform,
        pageUrl: input.pageUrl ?? null,
        deviceInfo: input.deviceInfo ?? null,
        tenantId,
        appId,
        createdAt: now,
        createdBy: userId,
        updatedAt: now,
        updatedBy: userId,
      })
      .returning();

    return {
      id: created.id,
      status: created.status,
      createdAt: created.createdAt,
    };
  };
}
