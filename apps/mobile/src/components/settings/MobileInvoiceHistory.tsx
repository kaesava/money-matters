import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS, MobilePaginationBar } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatDate, formatMobileCurrency } from '../../lib/format';

interface InvoiceItem {
  id: string;
  amountPaid: string | number;
  currency: string;
  status: string;
  paidAt?: string | Date | null;
  createdAt?: string | Date | null;
  invoicePdfUrl?: string | null;
  hostedInvoiceUrl?: string | null;
}

interface MobileInvoiceHistoryProps {
  invoices: InvoiceItem[];
  isLoading: boolean;
}

export function MobileInvoiceHistory({ invoices, isLoading }: MobileInvoiceHistoryProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    setPage(1);
  }, [invoices.length, pageSize]);

  const totalPages = Math.ceil(invoices.length / pageSize) || 1;
  const paginatedInvoices = invoices.slice((page - 1) * pageSize, page * pageSize);

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
          {paginatedInvoices.map((inv) => {
            const isPaid = inv.status.toLowerCase() === 'paid';
            const isOpen = inv.status.toLowerCase() === 'open';
            const displayDate = inv.paidAt
              ? formatDate(inv.paidAt)
              : inv.createdAt
              ? formatDate(inv.createdAt)
              : '—';
            const statusBadgeLabel = isPaid
              ? t('subscription.statusPaid')
              : isOpen
              ? t('subscription.statusOpen')
              : inv.status;
            const linkHref = isPaid
              ? inv.invoicePdfUrl || inv.hostedInvoiceUrl
              : inv.hostedInvoiceUrl || inv.invoicePdfUrl;
            const linkText = isPaid
              ? t('subscription.downloadReceipt')
              : t('subscription.payInvoice');

            return (
              <View key={inv.id} style={styles.invoiceRow}>
                <View style={styles.topMetaRow}>
                  <Text style={styles.invoiceDate}>{displayDate}</Text>
                  <View
                    style={[
                      styles.invoiceStatusBadge,
                      isPaid
                        ? styles.paidBadge
                        : isOpen
                        ? styles.openBadge
                        : styles.unpaidBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.invoiceStatusText,
                        isPaid
                          ? styles.paidText
                          : isOpen
                          ? styles.openText
                          : styles.unpaidText,
                      ]}
                    >
                      {statusBadgeLabel}
                    </Text>
                  </View>
                </View>

                <View style={styles.bottomActionRow}>
                  <Text style={styles.invoiceAmount}>
                    {formatMobileCurrency(inv.amountPaid, inv.currency)}
                  </Text>

                  {linkHref ? (
                    <TouchableOpacity
                      onPress={() => handleOpenReceipt(linkHref)}
                      style={[
                        styles.receiptBtn,
                        !isPaid && styles.payInvoiceBtn,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name={isPaid ? 'download' : 'external-link'}
                        size={12}
                        color={isPaid ? DESIGN_TOKENS.colors.accent : DESIGN_TOKENS.colors.warningDark}
                      />
                      <Text
                        style={[
                          styles.receiptBtnText,
                          !isPaid && styles.payInvoiceBtnText,
                        ]}
                      >
                        {linkText} ↗
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

      {invoices.length >= 5 && (
        <MobilePaginationBar
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={invoices.length}
          pageSizeOptions={[5, 10, 20]}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
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
  openBadge: {
    backgroundColor: DESIGN_TOKENS.colors.warningLight,
    borderColor: DESIGN_TOKENS.colors.warningBorder,
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
  openText: {
    color: DESIGN_TOKENS.colors.warningDark,
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
  payInvoiceBtn: {
    backgroundColor: DESIGN_TOKENS.colors.warningLight,
    borderColor: DESIGN_TOKENS.colors.warningBorder,
  },
  receiptBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.accent,
  },
  payInvoiceBtnText: {
    color: DESIGN_TOKENS.colors.warningDark,
  },
  noReceiptText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.subtleText,
  },
});
