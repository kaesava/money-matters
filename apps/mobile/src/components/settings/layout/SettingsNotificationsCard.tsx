import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, Href } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';

export function SettingsNotificationsCard() {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        {t('notifications.settings.title')}
      </Text>
      <TouchableOpacity
        style={styles.navLink}
        onPress={() => router.push('/(app)/settings/notifications' as Href)}
        activeOpacity={0.8}
      >
        <View style={styles.navLinkLeft}>
          <Feather name="bell" size={16} color={DESIGN_TOKENS.colors.primary} />
          <Text style={styles.navLinkText}>
            {t('settings.notificationsLink')}
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color={DESIGN_TOKENS.colors.slate[400]} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    gap: 10,
    shadowColor: DESIGN_TOKENS.colors.slate[900],
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.slate[900],
  },
  navLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[100],
  },
  navLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  navLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[800],
  },
});
