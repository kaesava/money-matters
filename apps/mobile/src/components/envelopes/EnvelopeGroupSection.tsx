import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS, MobilePaginationBar } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { EnvelopeItemCard } from './EnvelopeItemCard';

interface EnvelopeGroupSectionItem {
  id: string;
  name: string;
  envelopeType?: string | null;
  poolType?: string | null;
  fundingMode?: 'TARGET_BALANCE' | 'RECURRING' | null;
  budgetFrequency?: string | null;
  currentBalance?: number | string | null;
  targetAmount?: string | null;
  isSurplusTarget?: boolean | null;
  bankAccountId?: string | null;
}

interface BankAccountItem {
  id: string;
  name: string;
}

interface EnvelopeGroupSectionProps {
  title: string;
  pools: EnvelopeGroupSectionItem[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  bankAccounts: BankAccountItem[];
  groupType?: 'EVERYDAY' | 'BILL' | 'GOAL';
  onAddPool?: (type: 'EVERYDAY' | 'BILL' | 'GOAL') => void;
}

export function EnvelopeGroupSection({
  title,
  pools,
  isCollapsed,
  onToggleCollapse,
  bankAccounts,
  groupType,
  onAddPool,
}: EnvelopeGroupSectionProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const totalPages = Math.max(1, Math.ceil(pools.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (pools.length === 0) return null;

  const paginatedPools = pools.length >= 5
    ? pools.slice((page - 1) * pageSize, page * pageSize)
    : pools;

  return (
    <View style={styles.group}>
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onToggleCollapse}
          style={styles.titleWrap}
        >
          <Feather
            name={isCollapsed ? 'chevron-right' : 'chevron-down'}
            size={16}
            color={DESIGN_TOKENS.colors.primary}
          />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.count}>({pools.length})</Text>
        </TouchableOpacity>

        {groupType && groupType !== 'EVERYDAY' && onAddPool && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onAddPool(groupType)}
            style={styles.addBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={
              groupType === 'BILL'
                ? t('categories.createBillEnvelopeTooltip')
                : t('categories.createGoalEnvelopeTooltip')
            }
          >
            <Feather name="plus" size={15} color={DESIGN_TOKENS.colors.sereneBlue} />
          </TouchableOpacity>
        )}
      </View>

      {!isCollapsed && (
        <>
          {paginatedPools.map((p) => (
            <EnvelopeItemCard
              key={p.id}
              pool={p}
            />
          ))}
          <MobilePaginationBar
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={pools.length}
            pageSizeOptions={[5, 10, 20]}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  title: { fontSize: 13, fontWeight: '800', color: DESIGN_TOKENS.colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  count: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.textMuted },
  addBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
  },
});
