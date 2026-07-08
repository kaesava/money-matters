import { z } from "zod";

export const CreateHouseholdCommand = z.object({
  name: z.string().min(1),
  userId: z.string().uuid(),
  userEmail: z.string().email(),
  userName: z.string().min(1)
});

// A command handler would use dependency injection to get the db connection
// and insert the household + user + initial 3 bank accounts.
export function createHouseholdHandler(db: any) {
  return async (input: z.infer<typeof CreateHouseholdCommand>) => {
    // 1. Create Household
    // 2. Create User linked to Household
    // 3. Create Everyday, Bills, Major Bank Accounts
    return { success: true };
  };
}
