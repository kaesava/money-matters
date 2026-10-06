import * as SecureStore from 'expo-secure-store';

let activeSessionToken: string | null = null;
let activeTenantId: string | null = null;

export function setActiveSessionToken(token: string | null) {
  activeSessionToken = token;
}

export function getActiveSessionToken(): string | null {
  return activeSessionToken;
}

export function setActiveTenantId(tenantId: string | null) {
  activeTenantId = tenantId;
  if (tenantId) {
    SecureStore.setItemAsync('money_matters_active_tenant_id', tenantId).catch(() => {});
  } else {
    SecureStore.deleteItemAsync('money_matters_active_tenant_id').catch(() => {});
  }
}

export function getActiveTenantId(): string | null {
  return activeTenantId;
}

export async function switchActiveTenant(
  tenantId: string,
  queryClientOrUtils?: {
    invalidateQueries?: () => Promise<unknown> | void;
    invalidate?: () => Promise<unknown> | void;
  }
) {
  setActiveTenantId(tenantId);
  if (queryClientOrUtils) {
    try {
      if (typeof queryClientOrUtils.invalidate === 'function') {
        await queryClientOrUtils.invalidate();
      } else if (typeof queryClientOrUtils.invalidateQueries === 'function') {
        await queryClientOrUtils.invalidateQueries();
      }
    } catch (err) {
      console.warn('[switchActiveTenant] Invalidation failed:', err);
    }
  }
}
