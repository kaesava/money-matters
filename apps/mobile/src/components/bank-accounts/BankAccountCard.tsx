import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { LinkedPoolItem } from './LinkedPoolsModalSheet';
import { BankAccountCardHeader } from './BankAccountCardHeader';
import { BankAccountAlignmentRow } from './BankAccountAlignmentRow';
import { BankAccountPoolsRow } from './BankAccountPoolsRow';

export interface BankAccountCardData {
  id: string;
  name: string;
  bankProvider?: string | null;
  lastKnownBalance?: string | null;
  unbudgetedBuffer?: string | null;
  expectedBalance?: string | number | null;
  isPrivate?: boolean;
}

export interface BankAccountCardProps {
  account: BankAccountCardData;
  linkedPools: LinkedPoolItem[];
  onPressEdit: () => void;
  onPressAlign: () => void;
  onPressPool: (poolId: string) => void;
  onPressMorePools: () => void;
}

export function BankAccountCard({
  account,
  linkedPools,
  onPressEdit,
  onPressAlign,
  onPressPool,
  onPressMorePools,
}: BankAccountCardProps) {
  const actualBal = parseFloat(account.lastKnownBalance || '0');
  const buffer = parseFloat(account.unbudgetedBuffer || '0');
  const availBal = Math.max(0, actualBal - buffer);

  const poolsTotal = linkedPools.reduce(
    (sum: number, p) =>
      sum +
      (typeof p.currentBalance === 'number'
        ? p.currentBalance
        : parseFloat(String(p.currentBalance || '0'))),
    0
  );

  const diff = Math.round((availBal - poolsTotal) * 100) / 100;
  const hasDiff = linkedPools.length > 0 && Math.abs(diff) >= 0.01;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPressEdit}
      style={styles.card}
    >
      <BankAccountCardHeader
        name={account.name}
        bankProvider={account.bankProvider}
        isPrivate={account.isPrivate}
        availBal={availBal}
        actualBal={actualBal}
        buffer={buffer}
      />

      <BankAccountAlignmentRow
        linkedPoolsCount={linkedPools.length}
        poolsTotal={poolsTotal}
        diff={diff}
        hasDiff={hasDiff}
        onPressAlign={onPressAlign}
      />

      <BankAccountPoolsRow
        linkedPools={linkedPools}
        onPressPool={onPressPool}
        onPressMorePools={onPressMorePools}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    padding: 16,
    gap: 12,
    shadowColor: DESIGN_TOKENS.colors.slate[900],
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
});
