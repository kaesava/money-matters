import { pgTable, uuid, varchar, timestamp, numeric, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenant.js";

/**
 * Captures historical Stripe invoices, payment receipts, and billing period records
 * for household tenants.
 */
export const billingInvoices = pgTable(
  "billing_invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }).notNull(),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).notNull(),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull().default("0.00"),
    currency: varchar("currency", { length: 3 }).notNull().default("AUD"),
    status: varchar("status", { length: 50 }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    periodStart: timestamp("period_start", { withTimezone: true }),
    periodEnd: timestamp("period_end", { withTimezone: true }),
    invoicePdfUrl: varchar("invoice_pdf_url", { length: 1024 }),
    hostedInvoiceUrl: varchar("hosted_invoice_url", { length: 1024 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid("updated_by"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    index("billing_invoices_tenant_id_idx").on(table.tenantId),
    index("billing_invoices_stripe_invoice_id_idx").on(table.stripeInvoiceId),
  ]
);
