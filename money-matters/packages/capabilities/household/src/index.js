"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateHouseholdCommand = void 0;
exports.createHouseholdHandler = createHouseholdHandler;
const zod_1 = require("zod");
exports.CreateHouseholdCommand = zod_1.z.object({
    name: zod_1.z.string().min(1),
    userId: zod_1.z.string().uuid(),
    userEmail: zod_1.z.string().email(),
    userName: zod_1.z.string().min(1)
});
// A command handler would use dependency injection to get the db connection
// and insert the household + user + initial 3 bank accounts.
function createHouseholdHandler(db) {
    return async (input) => {
        // 1. Create Household
        // 2. Create User linked to Household
        // 3. Create Everyday, Bills, Major Bank Accounts
        return { success: true };
    };
}
//# sourceMappingURL=index.js.map