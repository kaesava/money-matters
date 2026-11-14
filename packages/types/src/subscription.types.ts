import { z } from "zod";

export const SubscriptionStatusSchema = z.enum([
  "TRIAL_ACTIVE",
  "TRIAL_EXPIRED",
  "SUBSCRIBED",
  "PAST_DUE",
  "DEACTIVATED",
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const SubscriptionTierSchema = z.enum(["household"]);
export type SubscriptionTier = z.infer<typeof SubscriptionTierSchema>;

export const BillingCycleSchema = z.enum(["monthly", "annual", "founding"]);
export type BillingCycle = z.infer<typeof BillingCycleSchema>;

export function getSubscriptionStatusLabelKey(status?: SubscriptionStatus | string | null): string {
  switch (status) {
    case "TRIAL_ACTIVE":
      return "subscription.tierTrial";
    case "SUBSCRIBED":
      return "subscription.tierActive";
    case "PAST_DUE":
      return "subscription.tierPastDue";
    case "TRIAL_EXPIRED":
      return "subscription.tierExpired";
    case "DEACTIVATED":
      return "subscription.noActiveSubscription";
    default:
      return "subscription.noActiveSubscription";
  }
}

export function buildExportFileName(dateStr: string): string {
  return `money-matters-backup-${dateStr}.zip`;
}
