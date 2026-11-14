import { z } from "zod";

export const PlatformTourStatusSchema = z.object({
  has_seen: z.boolean().optional(),
  completed_at: z.string().optional(),
  dismissed_at: z.string().optional(),
  last_step: z.number().int().min(1).optional(),
}).strict();

export type PlatformTourStatus = z.infer<typeof PlatformTourStatusSchema>;

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
  // Per-platform Product Tour Lifecycle
  tour_web: PlatformTourStatusSchema.optional(),
  tour_mobile: PlatformTourStatusSchema.optional(),
  has_seen_product_tour: z.boolean().optional(),
  tour_completed_at: z.string().optional(),
  tour_dismissed_at: z.string().optional(),
  tour_last_step: z.number().int().optional(),
}).strict();

export type AppPreferencesBlob = z.infer<typeof AppPreferencesBlobSchema>;

