import { z } from "zod";

export const NotificationPreferencesSchema = z.object({
  weekly_digest_email: z.boolean(),
  weekly_digest_push: z.boolean(),
  payday_alerts_email: z.boolean(),
  payday_alerts_push: z.boolean(),
  balance_nudge_email: z.boolean(),
  balance_nudge_push: z.boolean(),
}).strict();

export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

export const NotificationChannelStatusSchema = z.object({
  emailRecipient: z.string(),
  usesCustomNotificationEmail: z.boolean(),
  mobilePushDeviceCount: z.number().int().min(0),
}).strict();

export type NotificationChannelStatus = z.infer<typeof NotificationChannelStatusSchema>;

export const TestNotificationResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  emailRecipient: z.string(),
  emailDispatched: z.boolean(),
  mobilePushDeviceCount: z.number().int().min(0),
  pushDispatched: z.boolean(),
}).strict();

export type TestNotificationResult = z.infer<typeof TestNotificationResultSchema>;
