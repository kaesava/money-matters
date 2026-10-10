import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { SplitPoolGroupHeader } from './split-pool/SplitPoolGroupHeader';
import { SplitPoolRow } from './split-pool/SplitPoolRow';

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
  onPoolPress?: (poolId: string) => void;
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
  onPoolPress,
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
            <SplitPoolGroupHeader
              label={group.label}
              totalSum={groupSum}
              isCollapsed={isCollapsed}
              onToggle={() => toggleGroup(group.type)}
            />

            {!isCollapsed && (
              <View style={styles.groupItemsContainer}>
                {group.items.map((item) => {
                  const poolObj = pools.find((p) => p.id === item.bucketId);
                  const isSweep = Boolean(sweepPoolId && item.bucketId === sweepPoolId);

                  return (
                    <SplitPoolRow
                      key={item.bucketId}
                      item={item}
                      poolObj={poolObj}
                      groupType={group.type}
                      isSweep={isSweep}
                      sweepRemainder={sweepPoolRemainder}
                      linesMap={linesMap}
                      reasoningMap={reasoningMap}
                      isReadOnly={isReadOnly}
                      isReasoningOpen={Boolean(openReasoningPools[item.bucketId])}
                      onToggleReasoning={() => toggleReasoning(item.bucketId)}
                      onPressPool={() => onPoolPress?.(item.bucketId)}
                      onLineAmountChange={onLineAmountChange}
                      onLineReasoningChange={onLineReasoningChange}
                    />
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
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    overflow: 'hidden',
  },
  groupItemsContainer: {
    padding: 10,
    gap: 8,
  },
});
