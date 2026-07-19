import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui';
import { trpc, setActiveSessionToken } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import * as SecureStore from 'expo-secure-store';
import { Feather } from '@expo/vector-icons';
import { QuickExpenseModal } from '../../components/QuickExpenseModal';

const SECTION_ORDER = ['GOAL', 'REGULAR', 'EVERYDAY'] as const;
const SECTION_TITLES: Record<string, string> = {
  GOAL: 'buckets.majorSection',
  REGULAR: 'buckets.recurringSection',
  EVERYDAY: 'buckets.everydaySection',
};

function pct(balance: string, target: string | null) {
  const balanceNum = parseFloat(balance);
  const targetNum = target ? parseFloat(target) : null;
  if (!targetNum || targetNum === 0) return null;
  return Math.min(Math.round((balanceNum / targetNum) * 100), 100);
}

function fmt(val: string | number) {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return `$${num.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function BucketsScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { data: categories, isLoading, error, refetch } = trpc.listCategories.useQuery();
  const [quickExpenseVisible, setQuickExpenseVisible] = useState(false);

  const grouped = (categories ?? []).reduce<Record<string, typeof categories>>((acc, cat) => {
    const key = cat!.type;
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(cat);
    return acc;
  }, {});

  const handleSignOut = async () => {
    Alert.alert(
      t("settings.signOut", { defaultValue: "Sign Out" }),
      t("settings.signOutConfirm", { defaultValue: "Are you sure you want to sign out?" }),
      [
        { text: t("common.cancel", { defaultValue: "Cancel" }), style: "cancel" },
        {
          text: t("settings.signOut", { defaultValue: "Sign Out" }),
          style: "destructive",
          onPress: async () => {
            try {
              await authClient.signOut();
              await SecureStore.deleteItemAsync("money-matters_session_token");
              await SecureStore.deleteItemAsync("money-matters-session-token");
              setActiveSessionToken(null);
              router.replace("/(auth)/sign-in");
            } catch (err) {
              Alert.alert(
                t("common.error", { defaultValue: "Error" }),
                err instanceof Error ? err.message : String(err)
              );
            }
          },
        },
      ]
    );
  };

  const D = DESIGN_TOKENS;

  return (
    <View style={{ flex: 1 }}>
      <MobileScreenWrapper
        title={t('buckets.title')}
        user={session?.user}
        onNavigateHome={() => router.push('/(app)/home')}
        onNavigateBuckets={() => router.push('/(app)/categories')}
        onNavigateSettings={() => router.push('/(app)/settings')}
        onSignOut={handleSignOut}
      >
        {isLoading && <ActivityIndicator color={D.colors.accent} style={{ marginTop: 40 }} />}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>{t('common.error', { defaultValue: 'Error' })}</Text>
            <Text style={styles.errorSubtitle}>{error.message}</Text>
          </View>
        )}

        {SECTION_ORDER.map((section) => {
          const items = grouped[section] ?? [];
          if (items.length === 0) return null;
          return (
            <View key={section} style={styles.section}>
              <Text style={styles.sectionTitle}>{t(SECTION_TITLES[section] ?? '')}</Text>
              {items.map((cat) => {
                if (!cat) return null;
                const p = pct(cat.currentBalance, cat.targetAmount);
                const color =
                  cat.healthStatus === 'GREEN' ? D.colors.success :
                  cat.healthStatus === 'AMBER' ? D.colors.warning :
                  cat.healthStatus === 'RED' ? D.colors.critical :
                  D.colors.accent;

                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.card}
                    onPress={() => router.push(`/(app)/categories/${cat.id}`)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.catName}>{cat.name}</Text>
                      <Text style={[styles.catBalance, { color }]}>{fmt(cat.currentBalance)}</Text>
                    </View>
                    {cat.targetAmount && (
                      <Text style={styles.target}>{t('buckets.target')} {fmt(cat.targetAmount)}</Text>
                    )}
                    {p !== null && (
                      <>
                        <View style={styles.barBg}>
                          <View style={[styles.barFill, { width: `${p}%`, backgroundColor: color }]} />
                        </View>
                        <Text style={[styles.pctLabel, { color }]}>{t('buckets.progressPct', { pct: p })}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </MobileScreenWrapper>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setQuickExpenseVisible(true)}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={24} color="#FFF" />
      </TouchableOpacity>

      <QuickExpenseModal
        visible={quickExpenseVisible}
        onClose={() => {
          setQuickExpenseVisible(false);
          // Refetch categories to update the list balances
          refetch();
        }}
      />
    </View>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  container: { paddingHorizontal: D.spacing.containerMargin, paddingTop: 56, paddingBottom: 100 },
  screenTitle: { fontSize: 24, fontWeight: '700', color: D.colors.primary, marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: D.colors.textMuted, textTransform: 'uppercase', marginBottom: 10 },
  card: {
    backgroundColor: D.colors.surface, borderRadius: D.radius.lg,
    padding: D.spacing.cardPadding, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  catName: { fontSize: 14, fontWeight: '600', color: D.colors.textPrimary, flex: 1 },
  catBalance: { fontSize: 15, fontWeight: '700' },
  target: { fontSize: 11, color: D.colors.textMuted, marginBottom: 8 },
  barBg: { height: 5, borderRadius: 3, backgroundColor: '#F3F4F6', overflow: 'hidden', marginBottom: 4 },
  barFill: { height: 5, borderRadius: 3 },
  pctLabel: { fontSize: 11, fontWeight: '600' },
  errorContainer: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  errorIcon: { fontSize: 40 },
  errorTitle: { fontSize: 15, fontWeight: '600', color: D.colors.textPrimary },
  errorSubtitle: { fontSize: 13, color: D.colors.textMuted, textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: DESIGN_TOKENS.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
});
