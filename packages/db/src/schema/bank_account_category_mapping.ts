import { pgTable, uuid } from "drizzle-orm/pg-core";
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
    userId: uuid("user_id"), // Unique for PERSONAL mappings per user
    ...tenantAndTimestamps,
  }
);
