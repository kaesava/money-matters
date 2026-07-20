import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { Feather } from '@expo/vector-icons';
import { CreateIncomeEventModal } from '../../components/CreateIncomeEventModal';

export default function PaychecksScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { data: incomeEvents = [], isLoading, refetch } = trpc.listIncomeEvents.useQuery();
  const [modalVisible, setModalVisible] = React.useState(false);

  const formatAUD = (val: string) => {
    const num = parseFloat(val);
    return `$${num.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return DESIGN_TOKENS.colors.success;
      case 'DRAFT':
      case 'REVIEWED':
        return DESIGN_TOKENS.colors.warning;
      default:
        return DESIGN_TOKENS.colors.textMuted;
    }
  };

  const handleEventPress = (event: typeof incomeEvents[0]) => {
    router.push({
      pathname: '/(app)/paychecks/[id]',
      params: { id: event.id }
    });
  };

  return (
    <View style={styles.container}>
      <MobileScreenWrapper
        title={t('paychecks.title', { defaultValue: 'Paychecks' })}
        user={session?.user}
        onNavigateHome={() => router.push('/(app)/home')}
        onNavigateCategories={() => router.push('/(app)/categories')}
        onNavigateSettings={() => router.push('/(app)/settings')}
      >
        {isLoading ? (
          <ActivityIndicator color={DESIGN_TOKENS.colors.accent} style={{ marginTop: 40 }} />
        ) : incomeEvents.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏦</Text>
            <Text style={styles.emptyTitle}>{t('paychecks.empty', { defaultValue: 'No upcoming paychecks' })}</Text>
            <Text style={styles.emptySubtitle}>
              {t('paychecks.emptySubtitle', { defaultValue: 'Add an income source in Settings to get started' })}
            </Text>
          </View>
        ) : (
          <FlatList
            data={incomeEvents}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => handleEventPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.cardRow}>
                  <View style={styles.left}>
                    <Text style={styles.sourceName}>{item.sourceName || t('paychecks.source', { defaultValue: 'Source' })}</Text>
                    <Text style={styles.dateText}>
                      {new Date(item.expectedDate).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.right}>
                    <Text style={styles.amount}>{formatAUD(item.expectedAmount)}</Text>
                    <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                      <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
                        {t(`paychecks.status${item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase()}`, { defaultValue: item.status })}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.list}
          />
        )}
      </MobileScreenWrapper>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={24} color="#FFF" />
      </TouchableOpacity>

      <CreateIncomeEventModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          refetch();
        }}
      />
    </View>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingBottom: 100 },
  card: {
    backgroundColor: D.colors.surface,
    borderRadius: D.radius.md,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  left: { flex: 1 },
  right: { alignItems: 'flex-end' },
  sourceName: { fontSize: 15, fontWeight: '600', color: D.colors.textPrimary, marginBottom: 4 },
  dateText: { fontSize: 13, color: D.colors.textMuted },
  amount: { fontSize: 16, fontWeight: '700', color: D.colors.primary, marginBottom: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: D.colors.textPrimary, marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: D.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: D.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
});
