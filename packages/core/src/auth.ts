import { resolveAppConfig, AppConfig } from "@money-matters/config";

export interface AuthSession {
  userId: string;
  tenantId: string; // Effectively householdId in V1
  appId: string;
  role: "OWNER" | "MEMBER";
}

export async function verifyJwt(token: string): Promise<AuthSession | null> {
  if (!token) return null;

  // Placeholder parser for Neon Auth JWT resolving to mock validation parameters for V1 target
  // In real deployment, this verifies cryptographic sign claims of Neon/Stack Auth
  if (token === "mock-valid-token") {
    const appId = "01908bde-34bb-7b19-a178-574211bc93aa";
    const appConfig = resolveAppConfig(appId);
    if (!appConfig) return null;

    return {
      userId: "00000000-0000-0000-0000-000000000000",
      tenantId: "01908bde-34bb-7b19-a178-574211bc93aa",
      appId,
      role: "OWNER"
    };
  }

  return null;
}
