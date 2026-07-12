export const translations = {
  en: {
    app: {
      title: "money",
      description: "The forward-looking income allocation system engineered for absolute financial clarity without administrative friction."
    },
    auth: {
      cta: "Sign In / Register",
      hint: "Start managing your money at the exact point of income arrival."
    },
    dashboard: {
      title: "12-Month Horizon Workspace",
      terminal: "Payday Terminal",
      loading: "Dashboard system initialization complete."
    }
  }
} as const;

export function t(key: string, optionsOrLocale?: "en" | { defaultValue?: string; [key: string]: any }): string {
  const parts = key.split(".");
  let current: any = translations.en;
  
  for (const part of parts) {
    if (current && part in current) {
      current = current[part];
    } else {
      current = undefined;
      break;
    }
  }

  let result = typeof current === "string" ? current : undefined;
  if (!result && optionsOrLocale && typeof optionsOrLocale === "object" && optionsOrLocale.defaultValue) {
    result = optionsOrLocale.defaultValue;
  }
  if (!result) {
    result = key;
  }

  // Basic template injection
  if (optionsOrLocale && typeof optionsOrLocale === "object") {
    for (const [k, v] of Object.entries(optionsOrLocale)) {
      if (k !== "defaultValue") {
        result = result.replace(new RegExp(`{${k}}`, "g"), String(v));
      }
    }
  }

  return result;
}

