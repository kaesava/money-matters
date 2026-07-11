import { inngest } from "./client.js";
import { seedMoneysmartCategories } from "@money-matters/capability-money";
import { validateEnv } from "@money-matters/config";

export const handleUserSignup = inngest.createFunction(
  { id: "seed-on-signup" },
  { event: "auth/user.signup" },
  async ({ event }) => {
    const env = validateEnv();
    await seedMoneysmartCategories(event.data.tenantId, env.APP_MONEY_MATTERS_ID, event.data.userId);
    return { status: "Moneysmart categories provisioned." };
  }
);
