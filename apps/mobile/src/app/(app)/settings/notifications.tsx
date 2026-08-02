import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui';
import { trpc } from '../../../lib/trpc';
import { authClient } from '../../../lib/auth';
import { Feather } from '@expo/vector-icons';

export default function MobileNotificationSettingsScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const { data: session } = authClient.useSession();

  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const updateUserPrefMut = trpc.updateUserPreferences.useMutation({
    onSuccess: () => userPrefQuery.refetch(),
  });

  const pref = userPrefQuery.data;

  const handleToggle = (
    key: 'paydayAlertsEnabled' | 'shortfallAlertsEnabled' | 'billRemindersEnabled' | 'weeklyDigestEnabled',
    currentValue: boolean
  ) => {
    const newValue = !currentValue;
    posthog.capture('notification_preference_updated', {
      preference: key,
      enabled: newValue,
    });
    updateUserPrefMut.mutate({
      [key]: newValue,
    });
  };

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
            <Text style={styles.headerSubtitle}>Manage push alerts and reminders</Text>
          </View>
        </View>

        {userPrefQuery.isLoading ? (
          <ActivityIndicator color={D.colors.accent} style={{ marginTop: 40 }} />
        ) : (
          <View style={{ gap: 12 }}>
            {/* Payday Alerts */}
            <View style={styles.card}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.cardTitle}>🎉 Payday Split Alerts</Text>
                <Text style={styles.cardSubtitle}>
                  Receive 1-tap allocation alerts on the morning of scheduled paydays.
                </Text>
              </View>
              <Switch
                value={pref?.paydayAlertsEnabled ?? true}
                onValueChange={() => handleToggle('paydayAlertsEnabled', pref?.paydayAlertsEnabled ?? true)}
                trackColor={{ false: '#D1D5DB', true: '#00B4A6' }}
                thumbColor="#FFF"
              />
            </View>

            {/* Shortfall Alerts */}
            <View style={styles.card}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.cardTitle}>⚠️ Shortfall & Overdraw Alerts</Text>
                <Text style={styles.cardSubtitle}>
                  Receive immediate warnings when a bill takes a category into negative balance.
                </Text>
              </View>
              <Switch
                value={pref?.shortfallAlertsEnabled ?? true}
                onValueChange={() => handleToggle('shortfallAlertsEnabled', pref?.shortfallAlertsEnabled ?? true)}
                trackColor={{ false: '#D1D5DB', true: '#00B4A6' }}
                thumbColor="#FFF"
              />
            </View>

            {/* Bill Reminders */}
            <View style={styles.card}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.cardTitle}>⚡ Bill Proximity Reminders</Text>
                <Text style={styles.cardSubtitle}>
                  Receive reminders 3 days before upcoming fixed bills (rent, utilities).
                </Text>
              </View>
              <Switch
                value={pref?.billRemindersEnabled ?? true}
                onValueChange={() => handleToggle('billRemindersEnabled', pref?.billRemindersEnabled ?? true)}
                trackColor={{ false: '#D1D5DB', true: '#00B4A6' }}
                thumbColor="#FFF"
              />
            </View>

            {/* Weekly Summary Digest */}
            <View style={styles.card}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.cardTitle}>📊 Weekly Balance Digest</Text>
                <Text style={styles.cardSubtitle}>
                  Receive a Sunday evening digest of your total saved vs spent and upcoming forecast.
                </Text>
              </View>
              <Switch
                value={pref?.weeklyDigestEnabled ?? false}
                onValueChange={() => handleToggle('weeklyDigestEnabled', pref?.weeklyDigestEnabled ?? false)}
                trackColor={{ false: '#D1D5DB', true: '#00B4A6' }}
                thumbColor="#FFF"
              />
            </View>
          </View>
        )}
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
});
