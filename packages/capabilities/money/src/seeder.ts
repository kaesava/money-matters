import { db } from "@money-matters/db";
import { categories } from "@money-matters/db/src/schema";
import { randomUUID } from "crypto";

export async function seedMoneysmartCategories(tenantId: string, appId: string, userId: string) {
    const defaultCategories = [
        { name: "Groceries", type: "everyday", priorityWeight: 1 },
        { name: "Petrol", type: "everyday", priorityWeight: 1 },
        { name: "Dining Out", type: "everyday", priorityWeight: 3 },
        { name: "Rent/Mortgage Payment", type: "bills", priorityWeight: 1 },
        { name: "Electricity", type: "bills", priorityWeight: 1 },
        { name: "Water/Sewage", type: "bills", priorityWeight: 1 },
        { name: "Car Registration", type: "major", priorityWeight: 2 },
        { name: "Car Servicing", type: "major", priorityWeight: 2 },
        { name: "Emergency Fund", type: "major", priorityWeight: 1 },
        { name: "Holiday Pool", type: "major", priorityWeight: 5 }
    ] as const;

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
