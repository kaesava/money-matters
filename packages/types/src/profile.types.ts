import { z } from "zod";

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2MB
export const AVATAR_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const UpdateProfileFormSchema = z
  .object({
    displayName: z.string().trim().min(1, "Name is required").max(100, "Name cannot exceed 100 characters"),
    notificationEmail: z.string().trim().email("Invalid email address"),
    phone: z.string().trim().max(30).optional().default(""),
    timezone: z.string().min(1).default("Australia/Sydney"),
    showIcons: z.boolean().default(true),
    locale: z.string().min(1).default("en-AU"),
  })
  .strict();

export type UpdateProfileFormData = z.infer<typeof UpdateProfileFormSchema>;
