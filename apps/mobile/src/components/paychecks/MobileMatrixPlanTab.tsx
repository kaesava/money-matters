import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS, showMobileConfirm, useMobileToast } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { MobileSpreadsheetMatrix } from './matrix/MobileSpreadsheetMatrix';
import type { MobileMatrixCategoryItem, MobileMatrixGroupData } from './matrix/MobileMatrixFrozenColumn';
import type { MobileMatrixColumnData } from './matrix/MobileMatrixPaydayColumnHeader';

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
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const [savingColId, setSavingColId] = useState<string | null>(null);

  const { data, isLoading: projectionLoading } = trpc.getMatrixProjectionData.useQuery({ monthsAhead: 12 });
  const { data: plansData, isLoading: plansLoading } = trpc.listAllAllocationPlans.useQuery();
  const { data: poolsData, isLoading: poolsLoading } = trpc.listPools.useQuery();

  const isLoading = projectionLoading || plansLoading || poolsLoading;

  const saveAllocationMut = trpc.saveAutoAllocation.useMutation();
  const resetAllocationPlanMut = trpc.resetAllocationPlan.useMutation();
  const deleteIncomeEventMut = trpc.deleteIncomeEvent.useMutation();

  // Column state map: AUTO | SAVED | CONFIRMED
  const columnStateMap = useMemo<Record<string, 'AUTO' | 'SAVED' | 'CONFIRMED'>>(() => {
    if (!plansData) return {};
    const map: Record<string, 'AUTO' | 'SAVED' | 'CONFIRMED'> = {};
    for (const plan of plansData) {
      if (plan.incomeEventId) {
        map[plan.incomeEventId] = plan.status === 'CONFIRMED' ? 'CONFIRMED' : 'SAVED';
      }
    }
    return map;
  }, [plansData]);

  // Saved plan overrides map: `${incomeEventId}_${poolId}` -> number
  const savedPlanOverrides = useMemo(() => {
    const map: Record<string, number> = {};
    if (plansData) {
      for (const plan of plansData) {
        if (plan.lines) {
          for (const line of plan.lines) {
            const typedLine = line as { confirmedAmount?: string; proposedAmount?: string; poolId: string };
            const amount = parseFloat(typedLine.confirmedAmount || typedLine.proposedAmount || '0');
            map[`${plan.incomeEventId}_${typedLine.poolId}`] = amount;
          }
        }
      }
    }
    return map;
  }, [plansData]);

  const rawColumns = (data?.projection?.columns ?? []) as MobileMatrixColumnData[];
  const rawGroups = (data?.projection?.groups ?? []) as unknown as MobileMatrixGroupData[];

  const categories: MobileMatrixCategoryItem[] = useMemo(() => {
    if (!poolsData) return [];
    return poolsData.map((p) => ({
      id: p.id,
      name: p.name,
      currentBalance: p.currentBalance || 0,
      monthlyAmount: p.targetAmount ? parseFloat(p.targetAmount) : null,
      targetAmount: p.targetAmount ? parseFloat(p.targetAmount) : null,
      everydayAllowanceAmount: p.everydayAllowanceAmount ? parseFloat(p.everydayAllowanceAmount) : null,
      isPrivate: Boolean(p.isPrivate),
    }));
  }, [poolsData]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={DESIGN_TOKENS.colors.sereneBlue} />
      </View>
    );
  }

  if (rawColumns.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Feather name="calendar" size={40} color={DESIGN_TOKENS.colors.slate[400]} />
        <Text style={styles.emptyTitle}>{t('transactions.noPaydaysFound')}</Text>
        <Text style={styles.emptySubtitle}>{t('transactions.noPaydaysSubtitle')}</Text>
      </View>
    );
  }

  const handleReview = (colId: string) => {
    router.push(`/(app)/income-split/${colId}` as never);
  };

  const handleSave = (incomeEventId: string, totalIncome: number) => {
    showMobileConfirm({
      title: t('matrix.saveDialogTitle'),
      message: t('matrix.saveDialogDescription'),
      confirmText: t('matrix.saveDialogConfirm'),
      cancelText: t('common.cancel'),
      isDestructive: false,
      onConfirm: async () => {
        try {
          setSavingColId(incomeEventId);
          await saveAllocationMut.mutateAsync({
            incomeEventId,
            totalIncomeAmount: totalIncome.toFixed(2),
          });
          await utils.listAllAllocationPlans.invalidate();
          toast.success(t('matrix.saveSplitSuccess'));
        } catch (err: unknown) {
          toast.error((err as Error).message || t('paydayDrawer.saveSplitFailed'));
        } finally {
          setSavingColId(null);
        }
      },
    });
  };

  const handleReset = (incomeEventId: string) => {
    showMobileConfirm({
      title: t('paydayDrawer.recalculateConfirmTitle'),
      message: t('paydayDrawer.recalculateConfirmDescription'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      isDestructive: false,
      onConfirm: async () => {
        try {
          await resetAllocationPlanMut.mutateAsync({ incomeEventId });
          await utils.getMatrixProjectionData.invalidate();
          await utils.listAllAllocationPlans.invalidate();
          toast.success(t('paydayDrawer.recalculateSuccess'));
        } catch (err: unknown) {
          toast.error((err as Error).message || t('paydayDrawer.recalculateFailed'));
        }
      },
    });
  };

  const handleDelete = (incomeEventId: string) => {
    showMobileConfirm({
      title: t('common.deleteIncomeTitle'),
      message: t('paydayDrawer.deleteDescription'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteIncomeEventMut.mutateAsync({ eventId: incomeEventId });
          toast.success(t('paydayDrawer.incomeDeleted'));
          await utils.getMatrixProjectionData.invalidate();
          await utils.listAllAllocationPlans.invalidate();
        } catch (err: unknown) {
          toast.error((err as Error).message || t('paydayDrawer.deleteFailed'));
        }
      },
    });
  };

  const handleOpenCategoryDrawer = (poolId: string, poolName: string) => {
    if (!onOpenCategoryModal) return;
    const pool = poolsData?.find((p) => p.id === poolId);
    const events = (data?.rawExpenseEvents ?? [])
      .filter((e) => e.categoryId === poolId)
      .map((e) => ({
        id: e.id,
        name: e.name || poolName,
        amount: parseFloat(e.actualAmount || e.expectedAmount || '0'),
        dueDate: e.expectedDate || '',
        status: e.status,
      }));

    onOpenCategoryModal({
      poolId,
      poolName,
      poolType: pool?.poolType,
      currentBalance: pool?.currentBalance ?? 0,
      targetAmount: pool?.targetAmount ? parseFloat(pool.targetAmount) : undefined,
      events,
    });
  };

  return (
    <View style={styles.container}>
      <MobileSpreadsheetMatrix
        columns={rawColumns}
        groups={rawGroups}
        categories={categories}
        columnStateMap={columnStateMap}
        savedPlanOverrides={savedPlanOverrides}
        savingColId={savingColId}
        onReview={handleReview}
        onSave={handleSave}
        onReset={handleReset}
        onDelete={handleDelete}
        onOpenCategoryDrawer={handleOpenCategoryDrawer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    padding: 30,
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default MobileMatrixPlanTab;
