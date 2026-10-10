import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../lib/format';
import { MarkPaidAccordionGroup } from './MarkPaidAccordionGroup';
import { FundingPoolItem } from './mark-paid-types';

interface MarkPaidShortfallSectionProps {
  eventName: string;
  formattedPoolType: string;
  formattedPoolName: string;
  shortfallAmount: number;
  groupedPools: Record<string, FundingPoolItem[]>;
  expandedGroups: Record<string, boolean>;
  transferAmounts: Record<string, string>;
  totalAllocated: number;
  shortfallValidation: {
    isValid: boolean;
    isOverAllocated: boolean;
    difference: number;
  };
  onToggleGroup: (typeKey: string) => void;
  onAmountChange: (poolId: string, maxBal: number, rawVal: string) => void;
  onCoverFromSurplus?: () => void;
  surplusPoolName?: string;
}

export function MarkPaidShortfallSection({
  eventName,
  formattedPoolType,
  formattedPoolName,
  shortfallAmount,
  groupedPools,
  expandedGroups,
  transferAmounts,
  totalAllocated,
  shortfallValidation,
  onToggleGroup,
  onAmountChange,
  onCoverFromSurplus,
  surplusPoolName,
}: MarkPaidShortfallSectionProps) {
  return (
    <View style={styles.shortfallSection}>
      <View style={styles.shortfallBanner}>
        <Feather name="alert-triangle" size={16} color={DESIGN_TOKENS.colors.warningDark} style={{ marginTop: 2 }} />
        <Text style={styles.shortfallBannerText}>
          {t('incomeBillsTabs.insufficientModalMessage', {
            billName: eventName || 'Expense',
            poolType: formattedPoolType,
            poolName: formattedPoolName,
            amount: formatAUD(shortfallAmount),
          })}
        </Text>
        {onCoverFromSurplus && surplusPoolName && (
          <TouchableOpacity
            style={styles.coverChip}
            onPress={onCoverFromSurplus}
            activeOpacity={0.8}
          >
            <Text style={styles.coverChipText}>
              ⚡ {t('incomeBillsTabs.coverShortfallChip', {
                amount: formatAUD(shortfallAmount),
                poolName: surplusPoolName,
              })}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.fundingHeaderRow}>
        <Text style={styles.fundingHeaderLabel}>
          {t('incomeBillsTabs.fundingSourceSelectLabel')}
        </Text>
        <Text style={styles.fundingHeaderSub}>
          {t('incomeBillsTabs.hiddenZeroBalanceNote')}
        </Text>
      </View>

      <View style={styles.accordionContainer}>
        {Object.keys(groupedPools).length === 0 ? (
          <Text style={styles.noPoolsText}>
            No other pools with available balances found to cover the shortfall.
          </Text>
        ) : (
          Object.entries(groupedPools).map(([typeKey, poolsInGroup]) => (
            <MarkPaidAccordionGroup
              key={typeKey}
              typeKey={typeKey}
              poolsInGroup={poolsInGroup}
              isExpanded={!!expandedGroups[typeKey]}
              transferAmounts={transferAmounts}
              shortfallAmount={shortfallAmount}
              totalAllocated={totalAllocated}
              onToggle={() => onToggleGroup(typeKey)}
              onAmountChange={onAmountChange}
            />
          ))
        )}
      </View>

      <View style={styles.progressCard}>
        <Text style={styles.progressText}>
          {t('incomeBillsTabs.progressAllocatedHeader', {
            allocated: formatAUD(totalAllocated),
            shortfall: formatAUD(shortfallAmount),
          })}
        </Text>
        <Text
          style={[
            styles.progressStatus,
            shortfallValidation.isValid
              ? styles.progressCovered
              : shortfallValidation.isOverAllocated
              ? styles.progressOverAllocated
              : styles.progressRemaining,
          ]}
        >
          {shortfallValidation.isValid
            ? t('incomeBillsTabs.shortfallCovered')
            : shortfallValidation.isOverAllocated
            ? t('incomeBillsTabs.shortfallOverAllocated', {
                amount: formatAUD(shortfallValidation.difference),
              })
            : t('incomeBillsTabs.shortfallRemaining', {
                amount: formatAUD(shortfallValidation.difference),
              })}
        </Text>
      </View>

      {shortfallValidation.isOverAllocated && (
        <View style={styles.overAllocatedBanner}>
          <Feather name="alert-triangle" size={14} color={DESIGN_TOKENS.colors.critical} style={{ marginTop: 1 }} />
          <Text style={styles.overAllocatedBannerText}>
            {t('incomeBillsTabs.shortfallOverAllocated', {
              amount: formatAUD(shortfallValidation.difference),
            })}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shortfallSection: {
    gap: 12,
  },
  shortfallBanner: {
    gap: 10,
    backgroundColor: DESIGN_TOKENS.colors.warningLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.warningBorder,
    borderRadius: 12,
    padding: 12,
  },
  shortfallBannerText: {
    fontSize: 12,
    lineHeight: 17,
    color: DESIGN_TOKENS.colors.warningDark,
    fontWeight: '600',
  },
  coverChip: {
    alignSelf: 'flex-start',
    backgroundColor: DESIGN_TOKENS.colors.sereneBlue,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  coverChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  fundingHeaderRow: {
    gap: 2,
  },
  fundingHeaderLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  fundingHeaderSub: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[500],
  },
  accordionContainer: {
    gap: 8,
  },
  noPoolsText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[400],
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  progressCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: 10,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
  progressStatus: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressCovered: {
    color: DESIGN_TOKENS.colors.successDark,
  },
  progressRemaining: {
    color: DESIGN_TOKENS.colors.warningDark,
  },
  progressOverAllocated: {
    color: DESIGN_TOKENS.colors.critical,
  },
  overAllocatedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: DESIGN_TOKENS.colors.criticalLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.criticalBorder,
    borderRadius: 10,
    padding: 10,
  },
  overAllocatedBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: DESIGN_TOKENS.colors.criticalDark,
    fontWeight: '600',
  },
});
