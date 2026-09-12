import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_PREF_KEY = 'money-matters-biometric-enabled';
const INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

let backgroundTimestamp: number | null = null;
let isAppUnlockedInSession: boolean = false;

export async function checkBiometricsAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return isEnrolled;
  } catch {
    return false;
  }
}

export async function getBiometricTypeLabel(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face Unlock';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris Scanner';
    }
    return 'Biometrics';
  } catch {
    return 'Biometrics';
  }
}

export async function isBiometricLockEnabled(): Promise<boolean> {
  try {
    const val = await SecureStore.getItemAsync(BIOMETRIC_PREF_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setBiometricLockEnabled(enabled: boolean): Promise<void> {
  try {
    if (enabled) {
      await SecureStore.setItemAsync(BIOMETRIC_PREF_KEY, 'true');
    } else {
      await SecureStore.deleteItemAsync(BIOMETRIC_PREF_KEY);
    }
  } catch {
    // ignore
  }
}

export async function authenticateWithBiometrics(
  promptMessage = 'Unlock Money Matters to view your finances'
): Promise<boolean> {
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use Device PIN / Pattern',
      disableDeviceFallback: false,
    });
    if (res.success) {
      isAppUnlockedInSession = true;
      backgroundTimestamp = null;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function recordBackgroundTimestamp(): void {
  backgroundTimestamp = Date.now();
}

export function shouldPromptBiometricLock(): boolean {
  if (!isAppUnlockedInSession) {
    return true;
  }
  if (!backgroundTimestamp) {
    return false;
  }
  const elapsed = Date.now() - backgroundTimestamp;
  return elapsed >= INACTIVITY_TIMEOUT_MS;
}

export function markSessionUnlocked(): void {
  isAppUnlockedInSession = true;
  backgroundTimestamp = null;
}

export function resetBiometricSession(): void {
  isAppUnlockedInSession = false;
  backgroundTimestamp = null;
}
