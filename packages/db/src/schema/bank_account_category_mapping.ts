import { pgTable, uuid, unique } from "drizzle-orm/pg-core";
import { categoryTypeEnum } from "./category.js";
import { bankAccounts } from "./bank_account.js";
import { tenantAndTimestamps } from "./base.js";

export const bankAccountCategoryMappings = pgTable(
  "bank_account_category_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryType: categoryTypeEnum("category_type").notNull(),
    bankAccountId: uuid("bank_account_id")
      .references(() => bankAccounts.id, { onDelete: "cascade" })
      .notNull(),
    ...tenantAndTimestamps,
  },
  (table) => ({
    tenantCategoryTypeUnique: unique("tenant_category_type_unique").on(
      table.tenantId,
      table.categoryType
    ),
  })
);
