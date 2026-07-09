import { inngest } from "./client";
import { seedMoneysmartCategories } from "@money-matters/capability-money";

export const handleUserSignup = inngest.createFunction(
  { id: "seed-on-signup" },
  { event: "auth/user.signup" },
  async ({ event }) => {
    await seedMoneysmartCategories(event.data.tenantId, "01908bde-34bb-7b19-a178-574211bc93aa", event.data.userId);
    return { status: "Moneysmart categories provisioned." };
  }
);
