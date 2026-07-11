import { resolveAppConfig, AppConfig } from "@money-matters/config";

export interface AuthSession {
  userId: string;
  tenantId: string; // Effectively householdId in V1
  appId: string;
  role: "OWNER" | "MEMBER";
  email: string;
}

export async function verifyJwt(token: string): Promise<AuthSession | null> {
  if (!token) return null;

  // Real mock credentials verifying user email to enable login checks for kaesava@gmail.com
  if (token === "mock-valid-token") {
    const appId = "01908bde-34bb-7b19-a178-574211bc93aa";
    const appConfig = resolveAppConfig(appId);
    if (!appConfig) return null;

    return {
      userId: "d3b07384-d113-4ec4-a5a4-000000000001",
      tenantId: "d3b07384-d113-4ec4-a5a4-000000000001", // tenantId = householdId
      appId,
      role: "OWNER",
      email: "kaesava@gmail.com"
    };
  }

  return null;
}
