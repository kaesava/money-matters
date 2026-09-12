import React from 'react';
import { Tabs, useSegments, useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { DESIGN_TOKENS, useMobileToast } from '@money-matters/ui/mobile';
import { t, setLanguage } from '@money-matters/i18n';
import { usePushNotifications } from '@money-matters/capability-notifications/mobile';
import * as Notifications from 'expo-notifications';
import { Feather } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { QuickActionFab } from '../../components/QuickActionFab';

function TabIcon({
  name,
  color,
  size,
}: {
  name: React.ComponentProps<typeof Feather>['name'];
  color: string;
  size: number;
}) {
  return (
    <View style={styles.iconWrap}>
      <Feather name={name} size={size} color={color} />
    </View>
  );
}

export default function AppLayout() {
  const { data: session } = authClient.useSession();
  const { showToast } = useMobileToast();
  const userPrefQuery = trpc.getUserPreferences.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const prefs = userPrefQuery.data?.appPreferences?.[
    '01908bde-34bb-7b19-a178-574211bc93aa'
  ] as { locale?: 'en' | 'ja' } | undefined;
  const userLocale = prefs?.locale || 'en';
  const router = useRouter();
  const subQuery = trpc.getSubscriptionStatus.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const segments = useSegments();
  const currentScreen = segments[segments.length - 1];

  React.useEffect(() => {
    if (userLocale) {
      setLanguage(userLocale);
    }
  }, [userLocale]);

  // Expired Trial Guard: redirect to settings when trial has ended
  React.useEffect(() => {
    if (subQuery.data?.isTrialExpired && currentScreen !== 'settings' && !segments.includes('settings')) {
      router.replace('/(app)/settings' as never);
    }
  }, [subQuery.data?.isTrialExpired, currentScreen, segments, router]);

  // Automatically register device push token upon authenticated layout mount
  usePushNotifications();

  // Foreground notification handler: displays in-app toast when push arrives
  React.useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const title = notification.request.content.title;
      const body = notification.request.content.body;
      if (title || body) {
        showToast({
          type: 'info',
          title: title || 'Notification',
          message: body || '',
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [showToast]);

  const isFabHidden =
    currentScreen === 'settings' ||
    currentScreen === 'transfer-instructions' ||
    segments.includes('settings') ||
    segments.includes('(setup)');

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: DESIGN_TOKENS.colors.accent,
          tabBarInactiveTintColor: DESIGN_TOKENS.colors.textMuted,
          tabBarShowLabel: true,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: t('home.title') || 'Home',
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="home" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="paychecks"
          options={{
            title: t('nav.payday') || 'Income & Bills',
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="calendar" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="categories"
          options={{
            title: t('nav.myMoney') || 'Pools',
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="grid" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: t('nav.history') || 'History',
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="clock" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('nav.settings') || 'Settings',
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="settings" color={color} size={size} />
            ),
          }}
        />

        {/* Hidden push routes — not in tab bar */}
        <Tabs.Screen name="afford-check" options={{ href: null }} />
        <Tabs.Screen name="pools/[id]" options={{ href: null }} />
        <Tabs.Screen name="categories/[id]" options={{ href: null }} />
        <Tabs.Screen name="paychecks/[id]" options={{ href: null }} />
        <Tabs.Screen
          name="paychecks/transfer-instructions"
          options={{ href: null }}
        />
        <Tabs.Screen name="settings/bank-accounts" options={{ href: null }} />
        <Tabs.Screen name="settings/notifications" options={{ href: null }} />
        <Tabs.Screen name="settings/income" options={{ href: null }} />
        <Tabs.Screen name="settings/archived" options={{ href: null }} />
        <Tabs.Screen name="settings/history" options={{ href: null }} />
      </Tabs>

      {/* Floating Action Button */}
      <QuickActionFab visible={!isFabHidden} />
    </View>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  tabBar: {
    backgroundColor: D.colors.surface,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    height: 68,
    paddingBottom: 10,
    paddingTop: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 8,
  },
  tabLabel: { fontSize: 10, fontWeight: '600' },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
});
