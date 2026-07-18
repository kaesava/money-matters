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

// ─── Category Health Card ─────────────────────────────────────────────────────

interface CategoryHealthCardProps {
  name: string;
  type: string;
  balance: string;
  target: string | null;
  health: 'GREEN' | 'AMBER' | 'RED';
}

function CategoryHealthCard({ name, type, balance, target, health }: CategoryHealthCardProps) {
  const D = DESIGN_TOKENS;
  const balanceNum = parseFloat(balance);
  const targetNum = target ? parseFloat(target) : null;
  const pct = targetNum && targetNum > 0 ? Math.min(Math.round((balanceNum / targetNum) * 100), 100) : null;
  const color =
    health === 'GREEN' ? D.colors.success :
    health === 'AMBER' ? D.colors.warning :
    health === 'RED' ? D.colors.critical :
    D.colors.accent;

  const fmt = (val: string) => {
    const num = parseFloat(val);
    return `$${num.toFixed(0)}`;
  };

  return (
    <View style={hStyles.card}>
      <View style={hStyles.row}>
        <View style={[hStyles.dot, { backgroundColor: color }]} />
        <Text style={hStyles.name} numberOfLines={1}>{name}</Text>
        <Text style={hStyles.balance}>{fmt(balance)}</Text>
      </View>
      {pct !== null && (
        <View style={hStyles.barBg}>
          <View style={[hStyles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
      )}
    </View>
  );
}

const hStyles = StyleSheet.create({
  card: { backgroundColor: DESIGN_TOKENS.colors.surface, borderRadius: DESIGN_TOKENS.radius.md, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  name: { flex: 1, fontSize: 13, color: DESIGN_TOKENS.colors.textPrimary, fontWeight: '600' },
  balance: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
  barBg: { height: 4, borderRadius: 2, backgroundColor: '#F3F4F6', overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
});

// ─── Paycheck Readiness Panel ─────────────────────────────────────────────────

interface PaycheckReadinessPanelProps {
  daysUntil: number;
  expectedAmount: number;
  onTrack: number;
  atRisk: number;
  onReview: () => void;
}

function PaycheckReadinessPanel({ daysUntil, expectedAmount, onTrack, atRisk, onReview }: PaycheckReadinessPanelProps) {
  const D = DESIGN_TOKENS;
  const fmt = (cents: number) => `$${(cents / 100).toFixed(0)}`;
  const dayLabel = daysUntil === 0 ? t('home.paydayToday') : t('home.paydayIn', { days: daysUntil });

  return (
    <View style={pStyles.panel}>
      <View style={pStyles.topRow}>
        <View>
          <Text style={pStyles.sectionLabel}>{t('home.nextPaycheck')}</Text>
          <Text style={pStyles.amount}>{fmt(expectedAmount)}</Text>
          <Text style={pStyles.dayLabel}>{dayLabel}</Text>
        </View>
        <TouchableOpacity style={pStyles.reviewBtn} onPress={onReview} activeOpacity={0.85}>
          <Text style={pStyles.reviewText}>{t('home.reviewAllocation')}</Text>
        </TouchableOpacity>
      </View>
      <View style={pStyles.statsRow}>
        <View style={pStyles.stat}>
          <View style={[pStyles.statDot, { backgroundColor: D.colors.success }]} />
          <Text style={pStyles.statText}>{t('home.onTrack', { count: onTrack })}</Text>
        </View>
        <View style={pStyles.stat}>
          <View style={[pStyles.statDot, { backgroundColor: D.colors.warning }]} />
          <Text style={pStyles.statText}>{t('home.atRisk', { count: atRisk })}</Text>
        </View>
      </View>
    </View>
  );
}

const pStyles = StyleSheet.create({
  panel: {
    backgroundColor: DESIGN_TOKENS.colors.primary, borderRadius: DESIGN_TOKENS.radius.xl,
    padding: DESIGN_TOKENS.spacing.cardPadding + 4, marginBottom: 20,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  sectionLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600', letterSpacing: 0.6, marginBottom: 4 },
  amount: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  dayLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  reviewBtn: {
    backgroundColor: DESIGN_TOKENS.colors.accent,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: DESIGN_TOKENS.radius.md,
  },
  reviewText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  statsRow: { flexDirection: 'row', gap: 20 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statText: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
});

// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const categoriesQuery = trpc.listCategories.useQuery();
  const [quickExpenseVisible, setQuickExpenseVisible] = useState(false);

  const categories = categoriesQuery.data ?? [];
  const onTrack = categories.filter((c) => c.healthStatus === 'GREEN').length;
  const atRisk = categories.filter((c) => c.healthStatus === 'AMBER' || c.healthStatus === 'RED').length;

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

  const getFirstName = () => {
    if (!session?.user?.name) return "";
    return session.user.name.split(" ")[0];
  };

  return (
    <View style={{ flex: 1 }}>
      <MobileScreenWrapper
        user={session?.user}
        onNavigateHome={() => router.push('/(app)/home')}
        onNavigateBuckets={() => router.push('/(app)/buckets')}
        onNavigateSettings={() => router.push('/(app)/settings')}
        onSignOut={handleSignOut}
      >
        {/* Header Greeting */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {session?.user?.name
              ? `Good morning, ${getFirstName()} 👋`
              : "Good morning 👋"}
          </Text>
          <Text style={styles.headerSubtitle}>{t('home.title')}</Text>
        </View>

        {/* Paycheck Panel — Phase 4 uses static mock data */}
        <PaycheckReadinessPanel
          daysUntil={5}
          expectedAmount={450000}
          onTrack={onTrack}
          atRisk={atRisk}
          onReview={() => router.push('/(app)/paychecks')}
        />

        {/* Category Health */}
        <Text style={styles.sectionTitle}>{t('home.categoryHealth')}</Text>

        {categoriesQuery.isLoading ? (
          <ActivityIndicator color={DESIGN_TOKENS.colors.accent} style={{ marginTop: 24 }} />
        ) : categoriesQuery.error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⚠️</Text>
            <Text style={styles.emptyTitle}>{t('common.error', { defaultValue: 'Error' })}</Text>
            <Text style={styles.emptySubtitle}>{categoriesQuery.error.message}</Text>
          </View>
        ) : categories.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={styles.emptyTitle}>{t('home.noCategories')}</Text>
            <Text style={styles.emptySubtitle}>{t('home.setupCategories')}</Text>
          </View>
        ) : (
          categories.map((cat) => (
            <CategoryHealthCard
              key={cat.id}
              name={cat.name}
              type={cat.type}
              balance={cat.currentBalance}
              target={cat.targetAmount}
              health={cat.healthStatus}
            />
          ))
        )}
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
          // Refetch categories to update the dashboard balances
          categoriesQuery.refetch();
        }}
      />
    </View>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: D.colors.background },
  container: { paddingHorizontal: D.spacing.containerMargin, paddingTop: 56, paddingBottom: 100 },
  header: { marginBottom: 20 },
  greeting: { fontSize: 14, color: D.colors.textMuted, marginBottom: 2, fontWeight: '500' },
  headerSubtitle: { fontSize: 24, fontWeight: '700', color: D.colors.primary },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, color: D.colors.textMuted, textTransform: 'uppercase', marginBottom: 10 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: D.colors.textPrimary },
  emptySubtitle: { fontSize: 13, color: D.colors.textMuted, textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90, // Positioned above the bottom tab bar safely
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
