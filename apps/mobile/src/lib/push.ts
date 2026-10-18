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
    const Notifications = (await import('expo-notifications')) as typeof import('expo-notifications');
    const permRes = await Notifications.getPermissionsAsync();
    let finalStatus = permRes.status;

    if (finalStatus !== 'granted') {
      const reqRes = await Notifications.requestPermissionsAsync();
      finalStatus = reqRes.status;
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

/**
 * Configures foreground notification display handler and registers response received listener.
 */
export async function initPushNotificationHandlers(
  onNavigate?: (url: string) => void
): Promise<(() => void) | undefined> {
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (isExpoGo) return undefined;

  try {
    const Notifications = (await import('expo-notifications')) as typeof import('expo-notifications');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { url?: string; route?: string } | undefined;
      const target = data?.url || data?.route;
      if (target && onNavigate) {
        onNavigate(target);
      }
    });

    return () => {
      subscription.remove();
    };
  } catch (err) {
    console.warn('[PUSH] Failed to initialize notification handlers:', err);
    return undefined;
  }
}
