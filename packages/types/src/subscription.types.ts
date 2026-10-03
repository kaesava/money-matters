export type SubscriptionStatusEnum =
  | "TRIALING"
  | "SUBSCRIBED"
  | "PAST_DUE"
  | "CANCELED"
  | "EXPIRED"
  | "TRIAL_GRACE";

export function resolvePlanLabelKey(status?: string | null): string {
  switch (status) {
    case "SUBSCRIBED":
      return "subscription.planActive";
    case "TRIALING":
      return "subscription.trialActive";
    case "TRIAL_GRACE":
      return "subscription.trialGrace";
    case "PAST_DUE":
      return "subscription.pastDue";
    case "CANCELED":
      return "subscription.canceled";
    case "EXPIRED":
      return "subscription.expired";
    default:
      return "subscription.planFree";
  }
}

export function buildExportFileName(dateStr: string): string {
  return `money-matters-backup-${dateStr}.zip`;
}
