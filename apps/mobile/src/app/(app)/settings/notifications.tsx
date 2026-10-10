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
      title={t('notifications.settings.title')}
      user={session?.user}
      showBack
      onBackPress={() => router.back()}
      infoTooltip={{
        title: t('tooltips.notifications.title'),
        content: t('tooltips.notifications.content'),
      }}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}>
        {/* Weekly Summary Digest - Email Channel */}
        <View style={[styles.card, { borderColor: D.colors.accentBorder }]}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.cardTitle}>
                {t('notifications.settings.weeklyDigestTitle')}
              </Text>
              <View style={[styles.badge, { backgroundColor: D.colors.accentLight }]}>
                <Text style={[styles.badgeText, { color: D.colors.accent }]}>
                  {t('notifications.settings.activeEmailBadge')}
                </Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>
              {t('notifications.settings.weeklyDigestDesc')}
            </Text>
          </View>
        </View>

        {/* Payday Alerts */}
        <View style={styles.card}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.cardTitle}>
                {t('notifications.settings.paydayTitle')}
              </Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {t('notifications.settings.release2MobileBadge')}
                </Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>
              {t('notifications.settings.paydayDesc')}
            </Text>
          </View>
        </View>

        {/* Shortfall Alerts */}
        <View style={styles.card}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.cardTitle}>
                {t('notifications.settings.shortfallTitle')}
              </Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {t('notifications.settings.release2MobileBadge')}
                </Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>
              {t('notifications.settings.shortfallDesc')}
            </Text>
          </View>
        </View>

        {/* Bill Reminders */}
        <View style={styles.card}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.cardTitle}>
                {t('notifications.settings.billTitle')}
              </Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {t('notifications.settings.release2MobileBadge')}
                </Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>
              {t('notifications.settings.billDesc')}
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
    borderColor: D.colors.border,
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
    backgroundColor: D.colors.surfaceVariant,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: D.colors.textMuted,
  },
});
