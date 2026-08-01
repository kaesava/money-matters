import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * Safely requests push notification permissions and fetches Expo push token.
 * Prevents runtime exceptions when running inside Expo Go (SDK 53+).
 */
export async function registerPushNotificationsAsync(): Promise<string | null> {
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (isExpoGo) {
    console.log('[PUSH] Running in Expo Go client — remote push notifications bypassed.');
    return null;
  }

  try {
    const Notifications = await import('expo-notifications');
    const permRes = await Notifications.getPermissionsAsync();
    let finalStatus = (permRes as any).status;

    if (finalStatus !== 'granted') {
      const reqRes = await Notifications.requestPermissionsAsync();
      finalStatus = (reqRes as any).status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PUSH] Permission not granted for push notifications.');
      return null;
    }

    const expoToken = await Notifications.getExpoPushTokenAsync();
    return expoToken.data;
  } catch (err) {
    console.warn('[PUSH] Failed to register push token:', err);
    return null;
  }
}
