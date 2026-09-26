import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { formatAUD, formatDate } from '../../lib/format';

export interface AllocationLineItem {
  bucketId: string;
  bucketName: string;
  proposedAmount: number;
  reasoning: string;
}

export interface PoolRecord {
  id: string;
  name: string;
  poolType?: string;
  currentBalance?: string | number | null;
  targetAmount?: string | number | null;
  targetDate?: string | null;
  everydayAllowanceAmount?: string | number | null;
}

export interface MobileIncomeSplitPoolListProps {
  groups: Array<{
    type: 'EVERYDAY' | 'REGULAR' | 'GOAL';
    label: string;
    items: AllocationLineItem[];
  }>;
  pools: PoolRecord[];
  sweepPoolId?: string;
  sweepPoolRemainder: number;
  linesMap: Record<string, string>;
  reasoningMap: Record<string, string>;
  isReadOnly: boolean;
  onLineAmountChange: (poolId: string, val: string) => void;
  onLineReasoningChange: (poolId: string, reasoning: string) => void;
}

export function MobileIncomeSplitPoolList({
  groups,
  pools,
  sweepPoolId,
  sweepPoolRemainder,
  linesMap,
  reasoningMap,
  isReadOnly,
  onLineAmountChange,
  onLineReasoningChange,
}: MobileIncomeSplitPoolListProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [openReasoningPools, setOpenReasoningPools] = useState<Record<string, boolean>>({});

  const toggleGroup = (type: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const toggleReasoning = (poolId: string) => {
    setOpenReasoningPools((prev) => ({ ...prev, [poolId]: !prev[poolId] }));
  };

  return (
    <View style={styles.container}>
      {groups.map((group) => {
        const isCollapsed = Boolean(collapsedGroups[group.type]);
        const groupSum = group.items.reduce((acc, l) => {
          if (l.bucketId === sweepPoolId) {
            return acc + Math.max(0, sweepPoolRemainder);
          }
          return acc + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0);
        }, 0);

        return (
          <View key={group.type} style={styles.groupCard}>
            {/* Group Header */}
            <TouchableOpacity
              onPress={() => toggleGroup(group.type)}
              style={styles.groupHeader}
              activeOpacity={0.7}
            >
              <View style={styles.groupHeaderLeft}>
                <Feather
                  name={isCollapsed ? 'chevron-right' : 'chevron-down'}
                  size={14}
                  color="#64748B"
                />
                <Text style={styles.groupLabel}>{group.label}</Text>
              </View>
              <Text style={styles.groupSum}>{formatAUD(groupSum)}</Text>
            </TouchableOpacity>

            {/* Group Items */}
            {!isCollapsed && (
              <View style={styles.groupItemsContainer}>
                {group.items.map((l) => {
                  const poolObj = pools.find((p) => p.id === l.bucketId);
                  const isSweep = Boolean(sweepPoolId && l.bucketId === sweepPoolId);
                  const curBal = poolObj ? parseFloat(String(poolObj.currentBalance || '0')) : 0;
                  const targetRaw = poolObj
                    ? poolObj.poolType === 'EVERYDAY'
                      ? poolObj.everydayAllowanceAmount || poolObj.targetAmount
                      : poolObj.targetAmount
                    : null;
                  const targetNum = targetRaw ? parseFloat(String(targetRaw)) : 0;

                  const currentValStr = isSweep
                    ? sweepPoolRemainder.toFixed(2)
                    : (linesMap[l.bucketId] ?? l.proposedAmount.toFixed(2));

                  const hasReasoning = Boolean(reasoningMap[l.bucketId] || l.reasoning);
                  const isReasoningOpen = Boolean(openReasoningPools[l.bucketId]);

                  return (
                    <View
                      key={l.bucketId}
                      style={[styles.poolItemCard, isSweep && styles.sweepPoolItemCard]}
                    >
                      <View style={styles.poolTopRow}>
                        <View style={styles.poolMetaCol}>
                          <View style={styles.poolTitleRow}>
                            <Text style={styles.poolNameText} numberOfLines={1}>
                              {l.bucketName}
                            </Text>
                            {isSweep && (
                              <View style={styles.autoSurplusBadge}>
                                <Text style={styles.autoSurplusBadgeText}>
                                  {t('paydayDrawer.autoSurplusBadge')}
                                </Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.statsMetaRow}>
                            <Text style={styles.statMetaText}>
                              {t('paydayDrawer.balance')} {formatAUD(curBal)}
                            </Text>
                            {targetNum > 0 && (
                              <Text style={styles.statMetaText}>
                                • {t('paydayDrawer.tableColTarget')}: {formatAUD(targetNum)}
                                {group.type === 'REGULAR' ? t('paydayDrawer.perMonth') : ''}
                                {poolObj?.targetDate ? ` (${formatDate(poolObj.targetDate)})` : ''}
                              </Text>
                            )}
                          </View>
                        </View>

                        <View style={styles.amountInputCol}>
                          <View style={styles.amountInputWrap}>
                            <Text style={styles.currencyPrefix}>$</Text>
                            <TextInput
                              style={[
                                styles.amountInput,
                                isSweep && styles.sweepAmountInput,
                              ]}
                              keyboardType="decimal-pad"
                              value={currentValStr}
                              editable={!isSweep && !isReadOnly}
                              onChangeText={(val) => onLineAmountChange(l.bucketId, val)}
                              placeholder="0.00"
                              placeholderTextColor="#94A3B8"
                            />
                          </View>

                          <View style={styles.chipsRow}>
                            {!isSweep && !isReadOnly && (
                              <TouchableOpacity
                                onPress={() => onLineAmountChange(l.bucketId, '0.00')}
                                style={styles.zeroChip}
                              >
                                <Text style={styles.zeroChipText}>
                                  {t('paydayDrawer.setZeroPercent')}
                                </Text>
                              </TouchableOpacity>
                            )}

                            <TouchableOpacity
                              onPress={() => toggleReasoning(l.bucketId)}
                              style={[styles.noteIconBtn, (hasReasoning || isReasoningOpen) && styles.noteIconBtnActive]}
                            >
                              <Feather
                                name="file-text"
                                size={12}
                                color={hasReasoning || isReasoningOpen ? '#2563eb' : '#94A3B8'}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>

                      {/* Expandable Reasoning Note */}
                      {isReasoningOpen && (
                        <View style={styles.reasoningRow}>
                          <Text style={styles.reasoningLabel}>
                            {t('paydayDrawer.reasoningLabel')}
                          </Text>
                          <TextInput
                            style={styles.reasoningInput}
                            value={reasoningMap[l.bucketId] ?? l.reasoning ?? ''}
                            editable={!isReadOnly}
                            placeholder={t('paydayDrawer.reasoningPlaceholder')}
                            placeholderTextColor="#94A3B8"
                            onChangeText={(val) => onLineReasoningChange(l.bucketId, val)}
                          />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  groupSum: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#64748B',
  },
  groupItemsContainer: {
    padding: 10,
    gap: 8,
  },
  poolItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
  },
  sweepPoolItemCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  poolTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  poolMetaCol: {
    flex: 1,
    gap: 2,
  },
  poolTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  poolNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  autoSurplusBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  autoSurplusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  statsMetaRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  statMetaText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
  },
  amountInputCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 8,
    width: 110,
  },
  currencyPrefix: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 2,
  },
  amountInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#1B2B4B',
    paddingVertical: 4,
    textAlign: 'right',
  },
  sweepAmountInput: {
    color: '#059669',
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  zeroChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  zeroChipText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  noteIconBtn: {
    padding: 3,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noteIconBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  reasoningRow: {
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    gap: 4,
  },
  reasoningLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  reasoningInput: {
    fontSize: 11,
    color: '#1B2B4B',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
