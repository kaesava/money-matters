import { z } from "zod";

/**
 * Zod schema validating an AppPreferencesBlob stored inside user_preferences.app_preferences JSONB.
 */
export const AppPreferencesBlobSchema = z.object({
  payday_alerts_enabled: z.boolean().optional(),
  shortfall_alerts_enabled: z.boolean().optional(),
  bill_reminders_enabled: z.boolean().optional(),
  weekly_digest_enabled: z.boolean().optional(),
}).strict();

export type AppPreferencesBlob = z.infer<typeof AppPreferencesBlobSchema>;
