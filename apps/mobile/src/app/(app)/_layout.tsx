import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui';
import { t } from '@money-matters/i18n';

import { Feather } from '@expo/vector-icons';

function TabIcon({ name, color, size }: { name: string; color: string; size: number }) {
  return (
    <View style={styles.iconWrap}>
      <Feather name={name as any} size={size} color={color} />
    </View>
  );
}

export default function AppLayout() {
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
          title: t('buckets.title'),
          tabBarIcon: ({ color, size }) => <TabIcon name="grid" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings.title'),
          tabBarIcon: ({ color, size }) => <TabIcon name="settings" color={color} size={size} />,
        }}
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
