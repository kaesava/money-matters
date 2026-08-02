import { handleUserSignup, notificationFunctions, scheduledNotificationFunctions } from "./functions.js";

export const functions = [
  handleUserSignup,
  ...notificationFunctions,
  ...scheduledNotificationFunctions
];

