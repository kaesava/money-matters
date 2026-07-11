export interface AppConfig {
  id: string;
  name: string;
  slug: string;
  features: {
    premiumEnabled: boolean;
    partnerInvite: boolean;
    offlineSync: boolean;
  };
}

// Registry containing apps configured on this SaaS platform
const REGISTRY: Record<string, AppConfig> = {
  "01908bde-34bb-7b19-a178-574211bc93aa": {
    id: "01908bde-34bb-7b19-a178-574211bc93aa",
    name: "Money Matters",
    slug: "money-matters",
    features: {
      premiumEnabled: false,
      partnerInvite: false,
      offlineSync: false,
    },
  },
};

export function resolveAppConfig(appId: string): AppConfig | null {
  return REGISTRY[appId] || null;
}
