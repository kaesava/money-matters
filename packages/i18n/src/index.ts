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

export function t(key: string, locale: "en" = "en"): string {
  const parts = key.split(".");
  let current: any = translations[locale];
  
  for (const part of parts) {
    if (current && part in current) {
      current = current[part];
    } else {
      return key;
    }
  }
  return typeof current === "string" ? current : key;
}
