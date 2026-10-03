import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatDate } from '../../lib/format';

interface InvoiceItem {
  id: string;
  amountPaid: string | number;
  currency: string;
  status: string;
  paidAt?: string | Date | null;
  invoicePdfUrl?: string | null;
  hostedInvoiceUrl?: string | null;
}

interface MobileInvoiceHistoryProps {
  invoices: InvoiceItem[];
  isLoading: boolean;
}

export function MobileInvoiceHistory({ invoices, isLoading }: MobileInvoiceHistoryProps) {
  const handleOpenReceipt = (url?: string | null) => {
    if (!url) return;
    Linking.openURL(url);
  };

  return (
    <View style={styles.invoiceSection}>
      <Text style={styles.invoiceHeaderTitle}>
        {t('subscription.invoiceHistoryTitle')}
      </Text>

      {isLoading ? (
        <ActivityIndicator size="small" color="#2563eb" style={styles.loader} />
      ) : invoices.length === 0 ? (
        <Text style={styles.noInvoicesText}>{t('subscription.noInvoices')}</Text>
      ) : (
        <View style={styles.invoicesList}>
          {invoices.map((inv) => {
            const receiptUrl = inv.invoicePdfUrl || inv.hostedInvoiceUrl;
            return (
              <View key={inv.id} style={styles.invoiceRow}>
                <View style={styles.invoiceInfo}>
                  <Text style={styles.invoiceDate}>
                    {inv.paidAt ? formatDate(inv.paidAt) : '—'}
                  </Text>
                  <View style={styles.invoiceAmountRow}>
                    <Text style={styles.invoiceAmount}>
                      ${inv.amountPaid} {inv.currency.toUpperCase()}
                    </Text>
                    <View
                      style={[
                        styles.invoiceStatusBadge,
                        inv.status === 'paid' ? styles.invoicePaidBadge : styles.invoiceUnpaidBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.invoiceStatusText,
                          inv.status === 'paid' ? styles.invoicePaidText : styles.invoiceUnpaidText,
                        ]}
                      >
                        {inv.status}
                      </Text>
                    </View>
                  </View>
                </View>

                {receiptUrl ? (
                  <TouchableOpacity
                    onPress={() => handleOpenReceipt(receiptUrl)}
                    style={styles.receiptBtn}
                    activeOpacity={0.7}
                  >
                    <Feather name="download" size={12} color="#2563eb" />
                    <Text style={styles.receiptBtnText}>
                      {t('subscription.downloadReceipt')}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.noReceiptText}>—</Text>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  invoiceSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 14,
    gap: 10,
  },
  invoiceHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  loader: {
    paddingVertical: 12,
  },
  noInvoicesText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  invoicesList: {
    gap: 8,
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  invoiceInfo: {
    gap: 2,
  },
  invoiceDate: {
    fontSize: 11,
    color: '#64748B',
  },
  invoiceAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  invoiceAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  invoiceStatusBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  invoicePaidBadge: {
    backgroundColor: '#DCFCE7',
  },
  invoiceUnpaidBadge: {
    backgroundColor: '#FEF3C7',
  },
  invoiceStatusText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  invoicePaidText: {
    color: '#15803D',
  },
  invoiceUnpaidText: {
    color: '#92400E',
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
  },
  receiptBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  noReceiptText: {
    fontSize: 11,
    color: '#94A3B8',
  },
});
