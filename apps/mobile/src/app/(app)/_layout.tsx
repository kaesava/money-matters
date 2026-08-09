import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { usePushNotifications } from '@money-matters/capability-notifications/mobile';
import { Feather } from '@expo/vector-icons';

import { setLanguage } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';

function TabIcon({ name, color, size }: { name: React.ComponentProps<typeof Feather>['name']; color: string; size: number }) {
  return (
    <View style={styles.iconWrap}>
      <Feather name={name} size={size} color={color} />
    </View>
  );
}

export default function AppLayout() {
  const { data: session } = authClient.useSession();
  const userPrefQuery = trpc.getUserPreferences.useQuery(undefined, { enabled: !!session?.user });
  const prefs = userPrefQuery.data?.appPreferences?.["01908bde-34bb-7b19-a178-574211bc93aa"] as { locale?: 'en' | 'ja' } | undefined;
  const userLocale = prefs?.locale || 'en';

  React.useEffect(() => {
    if (userLocale) {
      setLanguage(userLocale);
    }
  }, [userLocale]);

  // Automatically register device push token upon authenticated layout mount
  usePushNotifications();

  return (
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
          title: t('home.title'),
          tabBarIcon: ({ color, size }) => <TabIcon name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: t('nav.myMoney'),
          tabBarIcon: ({ color, size }) => <TabIcon name="grid" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="paychecks"
        options={{
          title: t('nav.payday'),
          tabBarIcon: ({ color, size }) => <TabIcon name="calendar" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('nav.settings'),
          tabBarIcon: ({ color, size }) => <TabIcon name="settings" color={color} size={size} />,
        }}
      />
      {/* Hidden routes — not in tab bar */}
      <Tabs.Screen
        name="transactions"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="categories/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings/bank-accounts"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings/notifications"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings/income"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings/archived"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings/history"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="paychecks/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="paychecks/transfer-instructions"
        options={{ href: null }}
      />
    </Tabs>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
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
