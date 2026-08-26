import { DbOrTx, bugReports } from "@money-matters/db";
import { logger } from "@money-matters/core";

export type BugCategory =
  | "setup"
  | "waterfall"
  | "transactions_sync"
  | "categories_bills"
  | "ui_ux"
  | "account_auth"
  | "other"
  | "budgeting"
  | "transactions"
  | "bank_accounts"
  | "auth";

export interface CreateBugReportInput {
  title: string;
  description: string;
  category: BugCategory;
  severity?: "low" | "medium" | "high" | "critical";
  frustrationLevel?: 1 | 2 | 3 | 4;
  contactConsent?: boolean;
  userEmail?: string;
  appVersion?: string;
  platform: "web" | "ios" | "android";
  pageUrl?: string;
  deviceInfo?: string;
}

export interface BugReportEmailDetails {
  ticketId: string;
  title: string;
  description: string;
  categoryLabel: string;
  frustrationLabel: string;
  platform: string;
  appVersion: string;
  deviceInfo?: string;
  tenantId?: string;
  userId?: string;
}

export interface BugReportEmailDispatcher {
  sendReceiptEmail: (to: string, details: BugReportEmailDetails) => Promise<unknown>;
  sendAdminAlertEmail: (details: BugReportEmailDetails) => Promise<unknown>;
}

const CATEGORY_LABELS: Record<string, string> = {
  setup: "Onboarding & Payday Setup",
  waterfall: "Payday Allocation & Waterfalls",
  transactions_sync: "Bank Sync & Statement Import",
  categories_bills: "Category & Bill Management",
  ui_ux: "App Display & Navigation",
  account_auth: "Account & Authentication",
  other: "Something Else",
  budgeting: "Budgeting & Math",
  transactions: "Transactions & Import",
  bank_accounts: "Bank Accounts & Sync",
  auth: "Account & Authentication",
};

const FRUSTRATION_LABELS: Record<number, string> = {
  1: "Nice to fix (Minor visual / cosmetic issue)",
  2: "Mild annoyance (Small inconvenience)",
  3: "Frustrating (Feature isn't working)",
  4: "Pissed me off! (Blocker / major issue)",
};

function mapFrustrationToSeverity(level: number): "low" | "medium" | "high" | "critical" {
  switch (level) {
    case 1:
      return "low";
    case 3:
      return "high";
    case 4:
      return "critical";
    case 2:
    default:
      return "medium";
  }
}

/**
 * Command Handler: Create Bug Report
 * 
 * Persists user-submitted bug reports directly to PostgreSQL with tenant isolation.
 * Automatically ties the report to the current tenantId, appId, and userId (createdBy),
 * eliminating the need for client-provided PII while maintaining strict audit trails.
 */
export function createBugReportHandler(db: DbOrTx, emailDispatcher?: BugReportEmailDispatcher) {
  return async (
    input: CreateBugReportInput,
    tenantId: string,
    appId: string,
    userId: string
  ) => {
    const frustrationLevel = input.frustrationLevel ?? 2;
    const severity = input.severity ?? mapFrustrationToSeverity(frustrationLevel);
    const contactConsent = input.contactConsent ?? true;

    logger.info("Submitting bug report", {
      tenantId,
      userId,
      platform: input.platform,
      category: input.category,
      severity,
      frustrationLevel,
      contactConsent,
      appVersion: input.appVersion ?? "1.0.0-beta.1",
    });

    const now = new Date();

    const [created] = await db
      .insert(bugReports)
      .values({
        title: input.title,
        description: input.description,
        category: input.category,
        severity,
        frustrationLevel,
        contactConsent,
        status: "open",
        appVersion: input.appVersion ?? "1.0.0-beta.1",
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

    const categoryLabel = CATEGORY_LABELS[input.category] ?? input.category;
    const frustrationLabel = FRUSTRATION_LABELS[frustrationLevel] ?? `Level ${frustrationLevel}`;

    const emailDetails: BugReportEmailDetails = {
      ticketId: created.id,
      title: input.title,
      description: input.description,
      categoryLabel,
      frustrationLabel,
      platform: input.platform,
      appVersion: input.appVersion ?? "1.0.0-beta.1",
      deviceInfo: input.deviceInfo,
      tenantId,
      userId,
    };

    // Asynchronously trigger email notifications without blocking primary response
    if (emailDispatcher) {
      if (contactConsent && input.userEmail) {
        emailDispatcher.sendReceiptEmail(input.userEmail, emailDetails).catch((err: unknown) => {
          logger.error("Failed to send user bug report receipt email", err);
        });
      }

      emailDispatcher.sendAdminAlertEmail(emailDetails).catch((err: unknown) => {
        logger.error("Failed to send admin bug report alert email", err);
      });
    }

    return {
      id: created.id,
      status: created.status,
      createdAt: created.createdAt,
    };
  };
}
