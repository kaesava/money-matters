import { z } from "zod";

/**
 * Zod schema validating an AppPreferencesBlob stored inside user_preferences.app_preferences JSONB.
 */
export const AppPreferencesBlobSchema = z.object({
  weekly_digest_email: z.boolean().optional(),
  weekly_digest_push: z.boolean().optional(),
  payday_alerts_email: z.boolean().optional(),
  payday_alerts_push: z.boolean().optional(),
  balance_nudge_email: z.boolean().optional(),
  balance_nudge_push: z.boolean().optional(),
  // Legacy backward-compatibility fallbacks
  payday_alerts_enabled: z.boolean().optional(),
  weekly_digest_enabled: z.boolean().optional(),
  balance_nudge_enabled: z.boolean().optional(),
}).strict();

export type AppPreferencesBlob = z.infer<typeof AppPreferencesBlobSchema>;

