import { z } from "zod";

/**
 * Zod schema validating an AppPreferencesBlob stored inside user_preferences.app_preferences JSONB.
 */
export const AppPreferencesBlobSchema = z.object({
  quick_actions_collapsed: z.boolean().optional(),
}).strict();

export type AppPreferencesBlob = z.infer<typeof AppPreferencesBlobSchema>;
