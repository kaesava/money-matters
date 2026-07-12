import { handleUserSignup, notificationFunctions } from "./functions.js";

export const functions = [handleUserSignup, ...notificationFunctions];

