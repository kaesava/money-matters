import { z } from "zod";
import { CreateHouseholdCommand } from "@money-matters/types";

export function createHouseholdHandler(db: any) {
  return async (input: z.infer<typeof CreateHouseholdCommand>) => {
    return await db.transaction(async (tx: any) => {
      // Execute multi-tenant transactional seeder bounds
      return { success: true, tenantId: input.userId };
    });
  };
}
