import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useMobileToast, DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { trpc } from '../../lib/trpc';
import { t } from '@money-matters/i18n';
import { formatDate } from '../../lib/format';

export function SubscriptionPlanSection() {
  const toast = useMobileToast();
  const [syncing, setSyncing] = useState(false);
  const trpcUtils = trpc.useUtils();
  const statusQuery = trpc.getSubscriptionStatus.useQuery();
  const checkoutMut = trpc.createCheckoutSession.useMutation();
  const portalMut = trpc.createCustomerPortalSession.useMutation();
  const syncMut = trpc.syncSubscription.useMutation();

  const status = statusQuery.data;
  const isSubscribed = status?.status === 'SUBSCRIBED';
  const isCanceling = status?.cancelAtPeriodEnd;

  const invoicesQuery = trpc.listInvoices.useQuery(undefined, {
    enabled: isSubscribed || status?.status === 'PAST_DUE',
  });
  const invoices = invoicesQuery.data || [];

  let planName = t('subscription.freePlan');
  if (status) {
    if (isSubscribed) {
      if (status.planType === 'founding') {
        planName = t('subscription.planFounding');
      } else if (status.planType === 'annual') {
        planName = t('subscription.planAnnual');
      } else {
        planName = t('subscription.planMonthly');
      }
    } else if (status.status === 'TRIAL_ACTIVE' || status.status === 'TRIAL_GRACE') {
      planName = t('subscription.planTrial', { days: String(status.daysRemainingInTrial ?? 0) });
    } else if (status.status === 'TRIAL_EXPIRED') {
      planName = t('subscription.planExpired');
    } else if (status.status === 'PAST_DUE') {
      planName = t('subscription.planPastDue');
    }
  }

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await syncMut.mutateAsync();
      await Promise.all([
        trpcUtils.getSubscriptionStatus.invalidate(),
        trpcUtils.listInvoices.invalidate(),
      ]);
      toast.success(t('subscription.syncedSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('subscription.portalError'));
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenStripeCheckout = async () => {
    try {
      const res = await checkoutMut.mutateAsync({
        priceId: 'price_founding_member',
        successUrl: 'moneymatters://subscription/success',
        cancelUrl: 'moneymatters://subscription/manage',
      });
      if (res.url) {
        Linking.openURL(res.url);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to launch checkout.', 'Checkout Error');
    }
  };

  const handleOpenStripePortal = async () => {
    try {
      const res = await portalMut.mutateAsync({
        returnUrl: 'moneymatters://settings',
      });
      if (res.url) {
        Linking.openURL(res.url);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open customer portal.', 'Billing Portal Error');
    }
  };

  const handleOpenInvoiceReceipt = (url?: string | null) => {
    if (!url) return;
    Linking.openURL(url);
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.cardTitle}>{t('subscription.sectionTitle')}</Text>
          <TouchableOpacity
            onPress={handleManualSync}
            disabled={syncing}
            style={styles.syncBtn}
            accessibilityLabel={t('subscription.refreshTooltip')}
          >
            {syncing ? (
              <ActivityIndicator size="small" color={D.colors.primary} />
            ) : (
              <Feather name="refresh-cw" size={13} color={D.colors.textMuted} />
            )}
          </TouchableOpacity>
        </View>

        {isSubscribed && !isCanceling && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>✓ {t('subscription.activeBadge')}</Text>
          </View>
        )}
        {isCanceling && (
          <View style={styles.cancelingBadge}>
            <Text style={styles.cancelingBadgeText}>⚠️ {t('subscription.cancelingBadge')}</Text>
          </View>
        )}
      </View>

      <Text style={styles.planNameText}>{planName}</Text>

      {isSubscribed && !isCanceling && status?.nextBillingAt && (
        <Text style={styles.billingSubtext}>
          {t('subscription.renewsOn', {
            date: formatDate(status.nextBillingAt),
          })}
        </Text>
      )}

      {isCanceling && status?.subscriptionEndsAt && (
        <Text style={styles.cancelingSubtext}>
          {t('subscription.cancelingNotice', {
            date: formatDate(status.subscriptionEndsAt),
          })}
        </Text>
      )}

      <Text style={styles.cardSubtitle}>
        {t('subscription.mobilePlanSubtitle')}
      </Text>

      <View style={styles.btnRow}>
        {isSubscribed ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleOpenStripePortal} activeOpacity={0.8}>
            <Text style={styles.secondaryBtnText}>
              {isCanceling ? t('subscription.resumeSubscription') : t('subscription.mobileManageSubscription')} ↗
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleOpenStripeCheckout} activeOpacity={0.8}>
            <Text style={styles.primaryBtnText}>{t('subscription.mobileUpgradePlan')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Invoice History & Receipts Sub-panel */}
      {(isSubscribed || invoices.length > 0) && (
        <View style={styles.invoiceSection}>
          <Text style={styles.invoiceHeaderTitle}>
            {t('subscription.invoiceHistoryTitle')}
          </Text>

          {invoicesQuery.isLoading ? (
            <ActivityIndicator size="small" color={D.colors.sereneBlue} style={styles.loader} />
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
                        onPress={() => handleOpenInvoiceReceipt(receiptUrl)}
                        style={styles.receiptBtn}
                        activeOpacity={0.7}
                      >
                        <Feather name="download" size={12} color={D.colors.sereneBlue} />
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
      )}
    </View>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  card: {
    backgroundColor: D.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: D.colors.border,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: D.colors.primary,
  },
  syncBtn: {
    padding: 4,
    borderRadius: 6,
  },
  cardSubtitle: {
    fontSize: 11,
    color: D.colors.textMuted,
    lineHeight: 16,
  },
  billingSubtext: {
    fontSize: 11,
    color: D.colors.textMuted,
    fontWeight: '600',
  },
  cancelingSubtext: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: D.colors.sereneBlue,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: D.colors.onPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: D.colors.surfaceVariant,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  cancelingBadge: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  cancelingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
  },
  planNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: D.colors.primary,
  },
  secondaryBtnText: {
    color: D.colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  invoiceSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: D.colors.border,
    gap: 8,
  },
  invoiceHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: D.colors.textMuted,
  },
  loader: {
    paddingVertical: 8,
  },
  noInvoicesText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: D.colors.textMuted,
  },
  invoicesList: {
    gap: 8,
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  invoiceInfo: {
    gap: 2,
  },
  invoiceDate: {
    fontSize: 12,
    fontWeight: '600',
    color: D.colors.textPrimary,
  },
  invoiceAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  invoiceAmount: {
    fontSize: 11,
    fontFamily: D.fonts.mono,
    fontWeight: '700',
    color: D.colors.textPrimary,
  },
  invoiceStatusBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  invoicePaidBadge: {
    backgroundColor: '#ECFDF5',
  },
  invoiceUnpaidBadge: {
    backgroundColor: '#FEF2F2',
  },
  invoiceStatusText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  invoicePaidText: {
    color: '#047857',
  },
  invoiceUnpaidText: {
    color: '#B91C1C',
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  receiptBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: D.colors.sereneBlue,
  },
  noReceiptText: {
    fontSize: 11,
    color: D.colors.textMuted,
  },
});
