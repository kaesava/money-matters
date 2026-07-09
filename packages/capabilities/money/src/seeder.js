"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedMoneysmartCategories = seedMoneysmartCategories;
const db_1 = require("@money-matters/db");
const schema_1 = require("@money-matters/db/src/schema");
const crypto_1 = require("crypto");
async function seedMoneysmartCategories(tenantId, appId, userId) {
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
    ];
    const values = defaultCategories.map(cat => ({
        id: (0, crypto_1.randomUUID)(),
        tenantId,
        appId,
        name: cat.name,
        type: cat.type,
        priorityWeight: cat.priorityWeight,
        createdBy: userId,
        updatedBy: userId
    }));
    await db_1.db.insert(schema_1.categories).values(values);
    return true;
}
//# sourceMappingURL=seeder.js.map