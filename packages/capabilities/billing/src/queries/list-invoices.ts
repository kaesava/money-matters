/**
 * Queries billing invoice history for a tenant scope.
 */
import { desc, eq, isNull } from "drizzle-orm";
import { billingInvoices, type DbOrTx } from "@money-matters/db";
import type { BillingInvoiceDto } from "@money-matters/types";

export async function listInvoicesQuery(
  db: DbOrTx,
  tenantId: string
): Promise<BillingInvoiceDto[]> {
  const records = await db
    .select()
    .from(billingInvoices)
    .where(eq(billingInvoices.tenantId, tenantId))
    .orderBy(desc(billingInvoices.createdAt));

  return records.map((inv) => ({
    id: inv.id,
    tenantId: inv.tenantId,
    stripeInvoiceId: inv.stripeInvoiceId,
    amountPaid: inv.amountPaid,
    currency: inv.currency,
    status: inv.status,
    paidAt: inv.paidAt,
    periodStart: inv.periodStart,
    periodEnd: inv.periodEnd,
    invoicePdfUrl: inv.invoicePdfUrl,
    hostedInvoiceUrl: inv.hostedInvoiceUrl,
    createdAt: inv.createdAt,
  }));
}
