import {
  handleUserSignup,
  maintainRollingWindowWorkflow,
  notificationFunctions,
  scheduledNotificationFunctions,
  retentionWorkflows,
} from "./functions.js";

export const functions = [
  handleUserSignup,
  maintainRollingWindowWorkflow,
  ...notificationFunctions,
  ...scheduledNotificationFunctions,
  ...retentionWorkflows,
];


