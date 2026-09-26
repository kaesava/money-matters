import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS, showMobileConfirm } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { formatAUD, formatDate } from '../../lib/format';
import { MatrixPaydayCard } from './MatrixPaydayCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;

interface MobileMatrixPlanTabProps {
  onOpenCategoryModal?: (params: {
    poolId: string;
    poolName: string;
    poolType?: string;
    currentBalance?: number;
    targetAmount?: number;
    events: { id: string; name: string; amount: string | number; dueDate: string; status?: string }[];
  }) => void;
}

export function MobileMatrixPlanTab({ onOpenCategoryModal }: MobileMatrixPlanTabProps) {
  const router = useRouter();
  const D = DESIGN_TOKENS;
  const [expandedColId, setExpandedColId] = useState<string | null>(null);
  const [showFull12, setShowFull12] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED'>('ALL');

  const { data, isLoading } = trpc.getMatrixProjectionData.useQuery({ monthsAhead: 12 });
  const { data: plansData } = trpc.listAllAllocationPlans.useQuery();

  const saveAllocationMut = trpc.saveAutoAllocation.useMutation();
  const deleteIncomeEventMut = trpc.deleteIncomeEvent.useMutation();

  // Build a map: incomeEventId → plan status (PENDING/CONFIRMED)
  const planStateMap = useMemo<Record<string, 'PENDING' | 'CONFIRMED'>>(() => {
    if (!plansData) return {};
    const map: Record<string, 'PENDING' | 'CONFIRMED'> = {};
    for (const plan of plansData) {
      if (plan.incomeEventId) {
        map[plan.incomeEventId] = plan.status as 'PENDING' | 'CONFIRMED';
      }
    }
    return map;
  }, [plansData]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const allColumns = data?.projection?.columns ?? [];
  const groups = data?.projection?.groups ?? [];

  if (allColumns.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Feather name="calendar" size={40} color="#94A3B8" />
        <Text style={styles.emptyTitle}>{t('transactions.noPaydaysFound')}</Text>
        <Text style={styles.emptySubtitle}>{t('transactions.noPaydaysSubtitle')}</Text>
      </View>
    );
  }

  // Horizon: next 5 or full 12
  const horizonColumns = showFull12 ? allColumns : allColumns.slice(0, 5);

  // Status filter using plan state map
  const filteredColumns = statusFilter === 'ALL'
    ? horizonColumns
    : statusFilter === 'CONFIRMED'
    ? horizonColumns.filter((col) => planStateMap[col.id] === 'CONFIRMED')
    : horizonColumns.filter((col) => !planStateMap[col.id]);

  async function handleSave(incomeEventId: string, totalIncome: number) {
    showMobileConfirm({
      title: t('matrix.saveDialogTitle'),
      message: t('matrix.saveDialogDescription'),
      confirmText: t('matrix.saveDialogConfirm'),
      onConfirm: async () => {
        await saveAllocationMut.mutateAsync({
          incomeEventId,
          totalIncomeAmount: totalIncome.toFixed(2),
        });
      },
    });
  }

  function handleDelete(incomeEventId: string) {
    showMobileConfirm({
      title: t('common.delete'),
      message: t('payday.deleteIncomeEventConfirm'),
      confirmText: t('common.delete'),
      onConfirm: () => {
        deleteIncomeEventMut.mutate({ eventId: incomeEventId });
      },
    });
  }

  return (
    <View style={styles.container}>
      {/* Horizon + Status filter controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={styles.horizonToggle}
          onPress={() => setShowFull12((v) => !v)}
        >
          <Feather name={showFull12 ? 'minimize-2' : 'maximize-2'} size={13} color="#2563eb" />
          <Text style={styles.horizonToggleText}>
            {showFull12 ? t('matrix.showNext5') : t('matrix.showFull12Events')}
          </Text>
        </TouchableOpacity>

        <View style={styles.statusPills}>
          {(['ALL', 'PENDING', 'CONFIRMED'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.pill, statusFilter === s && styles.pillActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[styles.pillText, statusFilter === s && styles.pillTextActive]}>
                {t(`matrix.status${s}` as 'matrix.statusAll' | 'matrix.statusPending' | 'matrix.statusConfirmed')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 16}
        decelerationRate="fast"
        contentContainerStyle={styles.carouselContainer}
        data={filteredColumns}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <MatrixPaydayCard
            key={item.id}
            item={item}
            index={index}
            groups={groups}
            cardWidth={CARD_WIDTH}
            isExpanded={expandedColId === item.id}
            planStatus={planStateMap[item.id]}
            onToggleExpand={() => setExpandedColId(expandedColId === item.id ? null : item.id)}
            onReview={() => router.push(`/(app)/paychecks/${item.id}` as never)}
            onSave={() => handleSave(item.id, item.totalIncome)}
            onDelete={() => handleDelete(item.id)}
            onOpenCategoryModal={onOpenCategoryModal}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 30,
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  controlsRow: {
    paddingHorizontal: 20,
    gap: 10,
  },
  horizonToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  horizonToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  statusPills: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  carouselContainer: {
    paddingHorizontal: 20,
    gap: 16,
    paddingVertical: 4,
  },
});

export default MobileMatrixPlanTab;
