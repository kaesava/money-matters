import { db } from "@money-matters/db";
import { categories } from "@money-matters/db/src/schema";
import { randomUUID } from "crypto";

export async function seedMoneysmartCategories(tenantId: string, appId: string, userId: string) {
  const defaultCategories = [
    { name: "Groceries", type: "everyday" as const, priorityWeight: 1 },
    { name: "Petrol", type: "everyday" as const, priorityWeight: 1 },
    { name: "Rent/Mortgage Payment", type: "bills" as const, priorityWeight: 1 },
    { name: "Car Registration", type: "major" as const, priorityWeight: 2 },
    { name: "Emergency Fund", type: "major" as const, priorityWeight: 1 }
  ];

  const values = defaultCategories.map(cat => ({
    id: randomUUID(),
    tenantId,
    appId,
    name: cat.name,
    type: cat.type,
    priorityWeight: cat.priorityWeight,
    createdBy: userId,
    updatedBy: userId
  }));

  await db.insert(categories).values(values);
  return true;
}
