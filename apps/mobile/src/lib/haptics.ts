import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';

const HAPTICS_PREF_KEY = 'money-matters-haptics-enabled';
let cachedHapticsEnabled: boolean | null = null;

export async function isHapticsEnabled(): Promise<boolean> {
  if (cachedHapticsEnabled !== null) {
    return cachedHapticsEnabled;
  }
  try {
    const val = await SecureStore.getItemAsync(HAPTICS_PREF_KEY);
    cachedHapticsEnabled = val !== 'false'; // Defaults to true
    return cachedHapticsEnabled;
  } catch {
    return true;
  }
}

export async function setHapticsEnabled(enabled: boolean): Promise<void> {
  cachedHapticsEnabled = enabled;
  try {
    await SecureStore.setItemAsync(HAPTICS_PREF_KEY, enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export async function triggerHaptic(
  type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error' = 'light'
): Promise<void> {
  const enabled = await isHapticsEnabled();
  if (!enabled) return;

  try {
    switch (type) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'selection':
        await Haptics.selectionAsync();
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch {
    // Ignore haptic errors on unsupported hardware/emulators
  }
}
