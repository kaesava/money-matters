/**
 * Mock session module — Phase 4 only.
 * Provides a stable, hard-coded session that the API's mock Context layer accepts.
 *
 * TODO (Phase 5): Replace with real Stack Auth / Neon Auth JWT session retrieval.
 */

export interface MockSession {
  token: string;
  userId: string;
  tenantId: string;
  appId: string;
  role: 'OWNER' | 'MEMBER';
}

// These values must match what the API's mock context returns
// See: apps/api/src/trpc/context.ts
const MOCK_SESSION: MockSession = {
  token: 'mock-session-token',
  userId: 'user-00000000-0000-0000-0000-000000000001',
  tenantId: '00000000-0000-0000-0000-000000000001',
  appId: '01908bde-34bb-7b19-a178-574211bc93aa',
  role: 'OWNER',
};

export function getMockSession(): MockSession {
  return MOCK_SESSION;
}

export function isAuthenticated(): boolean {
  // Phase 4: always authenticated via mock. Phase 5: check real JWT validity.
  return true;
}

export function hasCompletedSetup(): boolean {
  // Phase 4: returns false to exercise the setup flow.
  // Phase 5: derive from household existence check on app load.
  return false;
}
