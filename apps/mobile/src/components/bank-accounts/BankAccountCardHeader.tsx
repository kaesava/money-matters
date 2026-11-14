import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BankProviderBadge, CardDrawerIndicator, DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { formatMobileCurrency } from '../../lib/format';
import { t, BANK_ACCOUNT_TYPE_KEYS } from '@money-matters/i18n';

export interface BankAccountCardHeaderProps {
  name: string;
  bankProvider?: string | null;
  accountType?: string | null;
  isPrivate?: boolean;
  availBal: number;
  actualBal: number;
  buffer: number;
  onPressNotes?: () => void;
}

export function BankAccountCardHeader({
  name,
  bankProvider,
  accountType,
  isPrivate,
  availBal,
  actualBal,
  buffer,
  onPressNotes,
}: BankAccountCardHeaderProps) {
  return (
    <View style={styles.cardHeader}>
      <View style={styles.titleCol}>
        <View style={styles.titleRow}>
          <BankProviderBadge provider={bankProvider} size="sm" />
          <Text style={styles.accountName} numberOfLines={1}>
            {name}
          </Text>
          {accountType && (
            <View style={styles.typePill}>
              <Text style={styles.typeText}>{t(BANK_ACCOUNT_TYPE_KEYS[accountType] ?? 'bankAccounts.accountTypes.EVERYDAY')}</Text>
            </View>
          )}
          {isPrivate && (
            <View style={styles.privatePill}>
              <Text style={styles.privateText}>{t('bankAccounts.privateBadge')}</Text>
            </View>
          )}
          {onPressNotes && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                onPressNotes();
              }}
              style={styles.notesBtn}
              accessibilityLabel={t('fileNotes.attachFile')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="paperclip" size={13} color={DESIGN_TOKENS.colors.slate[500]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.balWrap}>
        <View style={styles.balanceCol}>
          <Text style={styles.balanceAmount}>{formatMobileCurrency(availBal)}</Text>
          <Text style={styles.actualBalance}>
            {t('bankAccounts.actualBalanceLabel', { amount: formatMobileCurrency(actualBal) })}
          </Text>
        </View>
        <CardDrawerIndicator size={18} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleCol: {
    flex: 1,
    paddingRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  accountName: {
    fontSize: 15,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  typePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1D4ED8',
    textTransform: 'uppercase',
  },
  privatePill: {
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  privateText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  balWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceCol: {
    alignItems: 'flex-end',
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  actualBalance: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'monospace',
    fontWeight: '500',
    marginTop: 1,
  },
  notesBtn: {
    padding: 3,
    borderRadius: 6,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
  },
});
