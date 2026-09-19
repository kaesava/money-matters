import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { authClient } from '../../../lib/auth';

export default function MobileNotificationSettingsScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const D = DESIGN_TOKENS;

  return (
    <MobileScreenWrapper
      title={t('notifications.settings.title', { defaultValue: 'Notification Preferences' })}
      user={session?.user}
      showBack
      onBackPress={() => router.back()}
      infoTooltip={{
        title: t('tooltips.notifications.title', { defaultValue: 'About Notifications' }),
        content: t('tooltips.notifications.content', {
          defaultValue: 'Configure email alerts and automated reminders for upcoming bills and payday allocations.',
        }),
      }}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}>
        {/* Weekly Summary Digest - Email Channel */}
        <View style={[styles.card, { borderColor: '#2563EB40' }]}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.cardTitle}>
                {t('notifications.settings.weeklyDigestTitle', { defaultValue: 'Weekly Balance Digest' })}
              </Text>
              <View style={[styles.badge, { backgroundColor: '#2563EB15' }]}>
                <Text style={[styles.badgeText, { color: '#2563eb' }]}>
                  {t('notifications.settings.activeEmailBadge', { defaultValue: 'Release 1 Active (Email)' })}
                </Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>
              {t('notifications.settings.weeklyDigestDesc', {
                defaultValue:
                  "Receive a Sunday evening email digest of your total saved vs spent and upcoming week's forecast.",
              })}
            </Text>
          </View>
        </View>

        {/* Payday Alerts */}
        <View style={styles.card}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.cardTitle}>
                {t('notifications.settings.paydayTitle', { defaultValue: 'Payday Split Alerts' })}
              </Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {t('notifications.settings.release2MobileBadge', { defaultValue: 'Release 2 (Mobile Push)' })}
                </Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>
              {t('notifications.settings.paydayDesc', {
                defaultValue: 'Receive 1-tap allocation alerts on the morning of scheduled paydays.',
              })}
            </Text>
          </View>
        </View>

        {/* Shortfall Alerts */}
        <View style={styles.card}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.cardTitle}>
                {t('notifications.settings.shortfallTitle', { defaultValue: 'Shortfall & Overdraw Alerts' })}
              </Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {t('notifications.settings.release2MobileBadge', { defaultValue: 'Release 2 (Mobile Push)' })}
                </Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>
              {t('notifications.settings.shortfallDesc', {
                defaultValue: 'Receive immediate warnings when a bill or transaction takes a category into negative.',
              })}
            </Text>
          </View>
        </View>

        {/* Bill Reminders */}
        <View style={styles.card}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.cardTitle}>
                {t('notifications.settings.billTitle', { defaultValue: 'Bill Proximity Reminders' })}
              </Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {t('notifications.settings.release2MobileBadge', { defaultValue: 'Release 2 (Mobile Push)' })}
                </Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>
              {t('notifications.settings.billDesc', {
                defaultValue: 'Receive reminders 3 days before upcoming fixed bills (rent, mortgage, utilities).',
              })}
            </Text>
          </View>
        </View>
      </ScrollView>
    </MobileScreenWrapper>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  card: {
    backgroundColor: D.colors.surface,
    borderRadius: D.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: D.colors.primary },
  cardSubtitle: { fontSize: 11, color: D.colors.textMuted },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    backgroundColor: '#F3F4F6',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: D.colors.textMuted,
  },
});
