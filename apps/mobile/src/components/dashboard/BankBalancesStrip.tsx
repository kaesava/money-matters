import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BankProviderBadge, DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../lib/format';

export interface BankAccountSummaryItem {
  id: string;
  name: string;
  bankProvider?: string | null;
  lastKnownBalance?: string | null;
  unbudgetedBuffer?: string | null;
  isPrivate?: boolean;
}

export interface BankBalancesStripProps {
  accounts: BankAccountSummaryItem[];
}

export function BankBalancesStrip({ accounts }: BankBalancesStripProps) {
  const router = useRouter();
  const D = DESIGN_TOKENS;

  if (!accounts || accounts.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Feather name="credit-card" size={16} color={D.colors.accent} />
          <Text style={styles.sectionTitle}>
            {t('nav.bankAccounts') || 'Linked Bank Accounts'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(app)/settings/bank-accounts' as never)}
          style={styles.manageBtn}
        >
          <Text style={styles.manageText}>
            {t('common.manage') || 'Manage'}
          </Text>
          <Feather name="chevron-right" size={14} color={D.colors.accent} />
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        data={accounts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const actualBal = parseFloat(item.lastKnownBalance || '0');
          const buffer = parseFloat(item.unbudgetedBuffer || '0');
          const availBal = Math.max(0, actualBal - buffer);

          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                router.push('/(app)/settings/bank-accounts' as never)
              }
              style={styles.accountCard}
            >
              <View style={styles.cardTop}>
                <BankProviderBadge provider={item.bankProvider} size="sm" />
                {item.isPrivate && (
                  <View style={styles.privateBadge}>
                    <Text style={styles.privateIcon}>🔒</Text>
                  </View>
                )}
              </View>

              <Text style={styles.accountName} numberOfLines={1}>
                {item.name}
              </Text>

              <Text style={styles.accountBalance}>{formatAUD(availBal)}</Text>
              <Text style={styles.balanceSubtext}>
                {buffer > 0 ? `Actual: ${formatAUD(actualBal)}` : 'Available'}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  manageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  listContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  accountCard: {
    width: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  privateBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  privateIcon: {
    fontSize: 10,
  },
  accountName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2B4B',
    marginBottom: 4,
  },
  accountBalance: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#1B2B4B',
    marginBottom: 2,
  },
  balanceSubtext: {
    fontSize: 10,
    color: '#94A3B8',
  },
});

export default BankBalancesStrip;
