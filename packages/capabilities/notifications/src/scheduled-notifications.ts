import { Inngest } from "inngest";
import { createWeeklyDigestWorkflow } from "./workflows/weekly-digest.workflow.js";
import { createPaydayAlertWorkflow } from "./workflows/payday-alert.workflow.js";
import { createBalanceNudgeWorkflow } from "./workflows/balance-nudge.workflow.js";

/**
 * Creates and registers scheduled notification workflows for Inngest.
 */
export function createScheduledNotificationFunctions(inngest: Inngest) {
  if (!inngest) {
    return [];
  }

  return [
    createWeeklyDigestWorkflow(inngest),
    createPaydayAlertWorkflow(inngest),
    createBalanceNudgeWorkflow(inngest),
  ];
}
