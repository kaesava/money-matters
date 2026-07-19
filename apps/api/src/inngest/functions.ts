import { inngest } from "./client.js";

export const handleUserSignup = inngest.createFunction(
  { id: "seed-on-signup" },
  { event: "auth/user.signup" },
  async () => {
    return { status: "Auto-provisioning categories deferred to onboarding setup." };
  }
);

import { createNotificationFunctions } from "@money-matters/capability-notifications";
export const notificationFunctions = createNotificationFunctions(inngest);
