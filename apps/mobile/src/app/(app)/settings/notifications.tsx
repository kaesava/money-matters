import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui/mobile';
import { authClient } from '../../../lib/auth';
import { Feather } from '@expo/vector-icons';

export default function MobileNotificationSettingsScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const D = DESIGN_TOKENS;

  return (
    <MobileScreenWrapper
      user={session?.user}
      onNavigateHome={() => router.push('/(app)/home')}
      onNavigateCategories={() => router.push('/(app)/categories')}
      onNavigateSettings={() => router.push('/(app)/settings')}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 100, gap: 16 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={D.colors.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Notification Settings</Text>
            <Text style={styles.headerSubtitle}>Manage alerts and reminders</Text>
          </View>
        </View>

        <View style={{ gap: 12 }}>
          {/* Weekly Summary Digest - Email Channel */}
          <View style={[styles.card, { borderColor: '#2563EB40' }]}>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.cardTitle}>📊 Weekly Balance Digest</Text>
                <View style={[styles.badge, { backgroundColor: '#2563EB15' }]}>
                  <Text style={[styles.badgeText, { color: '#2563eb' }]}>Email Active</Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>
                Receive a Sunday evening digest of your total saved vs spent and upcoming forecast.
              </Text>
            </View>
          </View>

          {/* Payday Alerts */}
          <View style={styles.card}>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.cardTitle}>🎉 Payday Split Alerts</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Release 2</Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>
                Receive 1-tap allocation alerts on the morning of scheduled paydays.
              </Text>
            </View>
          </View>

          {/* Shortfall Alerts */}
          <View style={styles.card}>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.cardTitle}>⚠️ Shortfall & Overdraw Alerts</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Release 2</Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>
                Receive immediate warnings when a bill takes a category into negative balance.
              </Text>
            </View>
          </View>

          {/* Bill Reminders */}
          <View style={styles.card}>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.cardTitle}>⚡ Bill Proximity Reminders</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Release 2</Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>
                Receive reminders 3 days before upcoming fixed bills (rent, utilities).
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </MobileScreenWrapper>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: D.colors.primary },
  headerSubtitle: { fontSize: 12, color: D.colors.textMuted },
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
