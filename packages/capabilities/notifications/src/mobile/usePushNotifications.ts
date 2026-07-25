import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useNotificationService } from './context';

// Check if running in Expo Go client (SDK 53+ removed remote push notifications from Expo Go)
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as any).appOwnership === 'expo';

let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');

    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (err) {
    console.warn('[PushNotifications] expo-notifications initialization skipped:', err);
  }
}

export function usePushNotifications() {
  const { useRegisterToken } = useNotificationService();
  const registerMutation = useRegisterToken();
  const hasRegistered = useRef(false);

  useEffect(() => {
    if (isExpoGo || !Notifications || !Device) {
      console.info('[PushNotifications] Running in Expo Go mode — push notifications active in standalone/dev builds.');
      return;
    }

    if (hasRegistered.current) return;
    hasRegistered.current = true;

    (async () => {
      try {
        if (!Device!.isDevice) {
          console.info('[PushNotifications] Skipping registration — not a physical device.');
          return;
        }

        const settings = (await Notifications!.getPermissionsAsync()) as any;
        let isGranted = settings?.granted;

        if (!isGranted) {
          const permission = (await Notifications!.requestPermissionsAsync()) as any;
          isGranted = permission?.granted;
        }

        if (!isGranted) {
          console.warn('[PushNotifications] User denied push notification permissions.');
          return;
        }

        const projectId = (Constants as any).expoConfig?.extra?.eas?.projectId;
        const tokenData = await Notifications!.getExpoPushTokenAsync({
          projectId,
        });

        const expoPushToken = tokenData.data;
        console.info('[PushNotifications] Expo push token:', expoPushToken);

        const platform = Platform.OS === 'ios' ? 'ios' : 'android';

        await registerMutation().mutateAsync({
          platform: platform as 'ios' | 'android',
          token: expoPushToken,
        });

        console.info('[PushNotifications] Token registered with backend successfully.');
      } catch (error) {
        console.error('[PushNotifications] Registration error (non-fatal):', error);
      }
    })();
  }, []);

  useEffect(() => {
    if (isExpoGo || !Notifications) return;
    const subscription = Notifications.addNotificationReceivedListener((notification: any) => {
      console.info('[PushNotifications] Foreground notification received:', notification.request.content);
    });

    return () => subscription.remove();
  }, []);
}
