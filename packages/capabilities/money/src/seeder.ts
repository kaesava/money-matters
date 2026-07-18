import { db } from "@money-matters/db";
import { categories } from "@money-matters/db";
import { randomUUID } from "crypto";

export async function seedMoneysmartCategories(tenantId: string, appId: string, userId: string) {
  const defaultCategories = [
    { name: "Groceries", type: "EVERYDAY" as const, priorityRank: null },
    { name: "Petrol", type: "EVERYDAY" as const, priorityRank: null },
    { name: "Rent/Mortgage Payment", type: "RECURRING" as const, priorityRank: 1 },
    { name: "Car Registration", type: "MAJOR" as const, priorityRank: 2 },
    { name: "Emergency Fund", type: "MAJOR" as const, priorityRank: 1 }
  ];

  const values = defaultCategories.map(cat => ({
    id: randomUUID(),
    tenantId,
    appId,
    name: cat.name,
    type: cat.type,
    priorityRank: cat.priorityRank,
    createdBy: userId,
    updatedBy: userId
  }));

  await db.insert(categories).values(values);
  return true;
}
