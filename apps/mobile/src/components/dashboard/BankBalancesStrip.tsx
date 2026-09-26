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

  if (!accounts || accounts.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Feather name="credit-card" size={16} color="#2563eb" />
          <Text style={styles.sectionTitle}>{t('nav.bankAccounts')}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(app)/settings/bank-accounts' as never)}
          style={styles.manageBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.manageText}>{t('common.manage')}</Text>
          <Feather name="chevron-right" size={14} color="#2563eb" />
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
                {buffer > 0
                  ? `Actual: ${formatAUD(actualBal)}`
                  : t('dashboard.availableToBudget')}
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
    marginVertical: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
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
    gap: 10,
  },
  accountCard: {
    width: 155,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
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
