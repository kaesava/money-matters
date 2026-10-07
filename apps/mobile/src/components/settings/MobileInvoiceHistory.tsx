import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { fmtDateMedium } from '@money-matters/ui';

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
        <ActivityIndicator
          size="small"
          color={DESIGN_TOKENS.colors.sereneBlue}
          style={styles.loader}
        />
      ) : invoices.length === 0 ? (
        <Text style={styles.noInvoicesText}>{t('subscription.noInvoices')}</Text>
      ) : (
        <View style={styles.invoicesList}>
          {invoices.map((inv) => {
            const receiptUrl = inv.invoicePdfUrl || inv.hostedInvoiceUrl;
            const isPaid = inv.status.toLowerCase() === 'paid';
            return (
              <View key={inv.id} style={styles.invoiceRow}>
                <View style={styles.topMetaRow}>
                  <Text style={styles.invoiceDate}>
                    {inv.paidAt ? fmtDateMedium(inv.paidAt) : '—'}
                  </Text>
                  <View
                    style={[
                      styles.invoiceStatusBadge,
                      isPaid ? styles.paidBadge : styles.unpaidBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.invoiceStatusText,
                        isPaid ? styles.paidText : styles.unpaidText,
                      ]}
                    >
                      {inv.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.bottomActionRow}>
                  <Text style={styles.invoiceAmount}>
                    ${inv.amountPaid} {inv.currency.toUpperCase()}
                  </Text>

                  {receiptUrl ? (
                    <TouchableOpacity
                      onPress={() => handleOpenReceipt(receiptUrl)}
                      style={styles.receiptBtn}
                      activeOpacity={0.7}
                    >
                      <Feather name="download" size={12} color={DESIGN_TOKENS.colors.accent} />
                      <Text style={styles.receiptBtnText}>
                        {t('subscription.downloadReceipt')} ↗
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.noReceiptText}>—</Text>
                  )}
                </View>
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
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.border,
    paddingTop: 14,
    gap: 10,
  },
  invoiceHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.subtleText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loader: {
    paddingVertical: 12,
  },
  noInvoicesText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    fontStyle: 'italic',
  },
  invoicesList: {
    gap: 8,
  },
  invoiceRow: {
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: DESIGN_TOKENS.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    gap: 8,
  },
  topMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  invoiceDate: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  invoiceStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: DESIGN_TOKENS.radius.sm,
    borderWidth: 1,
  },
  paidBadge: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    borderColor: DESIGN_TOKENS.colors.successBorder,
  },
  unpaidBadge: {
    backgroundColor: DESIGN_TOKENS.colors.criticalLight,
    borderColor: DESIGN_TOKENS.colors.criticalBorder,
  },
  invoiceStatusText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  paidText: {
    color: DESIGN_TOKENS.colors.successDark,
  },
  unpaidText: {
    color: DESIGN_TOKENS.colors.criticalDark,
  },
  bottomActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  invoiceAmount: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'JetBrainsMono',
    color: DESIGN_TOKENS.colors.primary,
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderRadius: DESIGN_TOKENS.radius.sm,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
  },
  receiptBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.accent,
  },
  noReceiptText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.subtleText,
  },
});
