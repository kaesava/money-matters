/**
 * Internationalization & Localization (i18n) Engine
 * 
 * Provides type-safe localization token resolution, key path traversal, fallback defaults,
 * and string interpolation parameters for UI components on web and mobile platforms.
 */
import { en } from "./dictionaries/en";

/**
 * Registry of supported localization dictionaries.
 */
export const translations = {
  en,
} as const;

export type TranslationKey = string;

/**
 * Translates a dot-notated key string into localized text.
 * Supports string interpolation parameters (e.g. {step}) and default fallback values.
 *
 * @param key - Dot-delimited translation path key (e.g. 'common.save')
 * @param optionsOrLocale - Optional locale identifier or interpolation options object
 * @returns Resolved localized string, fallback value, or original key string
 */
export function t(
  key: TranslationKey,
  optionsOrLocale?: "en" | { defaultValue?: string; [key: string]: unknown }
): string {
  const parts = key.split(".");
  let current: unknown = translations.en;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      current = undefined;
      break;
    }
  }

  let result = typeof current === "string" ? current : undefined;

  if (
    !result &&
    optionsOrLocale &&
    typeof optionsOrLocale === "object" &&
    "defaultValue" in optionsOrLocale &&
    typeof optionsOrLocale.defaultValue === "string"
  ) {
    result = optionsOrLocale.defaultValue;
  }

  if (!result) {
    result = key;
  }

  if (optionsOrLocale && typeof optionsOrLocale === "object") {
    for (const [k, v] of Object.entries(optionsOrLocale)) {
      if (k !== "defaultValue") {
        result = result.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
  }

  return result;
}

