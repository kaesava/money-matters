import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import {
  DESIGN_TOKENS,
  MobileModalDialog,
  BankProviderBadge,
  MobileInput,
  AmountInput,
  MobileButton,
  FormLabel,
  FormErrorBanner,
  showMobileConfirm,
  useMobileToast,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../lib/trpc';
import { formatAUD } from '../lib/format';

export interface BankAccountItemToEdit {
  id: string;
  name: string;
  bankProvider?: string | null;
  lastKnownBalance?: string | null;
  unbudgetedBuffer?: string | null;
  isPrivate?: boolean;
}

export type SupportedBankProvider = 'CBA' | 'Westpac' | 'ANZ' | 'NAB' | 'ING' | 'Macquarie' | 'Other';

const PROVIDERS: SupportedBankProvider[] = [
  'CBA',
  'Westpac',
  'ANZ',
  'NAB',
  'ING',
  'Macquarie',
  'Other',
];

interface BankAccountFormModalProps {
  visible: boolean;
  accountToEdit?: BankAccountItemToEdit | null;
  onClose: () => void;
  onSuccess?: () => void;
  onNeedsReconciliation?: (account: any) => void;
}

export function BankAccountFormModal({
  visible,
  accountToEdit,
  onClose,
  onSuccess,
  onNeedsReconciliation,
}: BankAccountFormModalProps) {
  const isEdit = Boolean(accountToEdit?.id);
  const toast = useMobileToast();
  const utils = trpc.useUtils();

  const [name, setName] = useState('');
  const [provider, setProvider] = useState<SupportedBankProvider>('CBA');
  const [balance, setBalance] = useState('0.00');
  const [buffer, setBuffer] = useState('0.00');
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: visible });
  const allPools = poolsQuery.data || [];
  const linkedPools = isEdit && accountToEdit
    ? allPools.filter((p) => p.bankAccountId === accountToEdit.id)
    : [];

  useEffect(() => {
    if (accountToEdit) {
      setName(accountToEdit.name || '');
      setProvider((accountToEdit.bankProvider as SupportedBankProvider) || 'CBA');
      setBalance(accountToEdit.lastKnownBalance || '0.00');
      setBuffer(accountToEdit.unbudgetedBuffer || '0.00');
      setIsPrivate(Boolean(accountToEdit.isPrivate));
    } else {
      setName('');
      setProvider('CBA');
      setBalance('0.00');
      setBuffer('0.00');
      setIsPrivate(false);
    }
    setNameError('');
    setGeneralError('');
  }, [accountToEdit, visible]);

  const balNum = parseFloat(balance) || 0;
  const bufNum = parseFloat(buffer) || 0;
  const availableToBudget = Math.max(0, balNum - bufNum);
  const isNegativeAvailable = balNum < bufNum;

  const linkedPoolsTotal = linkedPools.reduce(
    (sum, p) => sum + (typeof p.currentBalance === 'number' ? p.currentBalance : parseFloat(String(p.currentBalance || '0'))),
    0
  );
  const diffBeforeSave = Number((availableToBudget - linkedPoolsTotal).toFixed(2));
  const hasVariance = linkedPools.length > 0 && Math.abs(diffBeforeSave) > 0.009;

  const createMut = trpc.createBankAccount.useMutation();
  const updateMut = trpc.updateBankAccount.useMutation();
  const archiveMut = trpc.archiveBankAccount.useMutation();

  const handleArchive = () => {
    if (!accountToEdit) return;
    showMobileConfirm({
      title: t('settings.bankAccounts.deleteConfirmTitle'),
      message: t('settings.bankAccounts.deleteConfirmBody').replace('{name}', accountToEdit.name),
      confirmText: t('common.archive'),
      isDestructive: true,
      onConfirm: async () => {
        try {
          await archiveMut.mutateAsync({ accountId: accountToEdit.id });
          toast.success(t('toasts.archived'));
          utils.listBankAccountsWithExpected.invalidate();
          onSuccess?.();
          onClose();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t('common.error'));
        }
      },
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setNameError(t('drawers.quickExpense.nameRequired'));
      return;
    }
    if (isNegativeAvailable) {
      setGeneralError('Unbudgeted buffer cannot exceed total bank account balance.');
      return;
    }

    setSubmitting(true);
    setGeneralError('');
    try {
      let savedAcc: any = null;
      if (isEdit && accountToEdit?.id) {
        savedAcc = await updateMut.mutateAsync({
          accountId: accountToEdit.id,
          data: {
            name: name.trim(),
            bankProvider: provider,
            lastKnownBalance: balNum.toFixed(2),
            unbudgetedBuffer: bufNum.toFixed(2),
            isPrivate,
          },
        });
      } else {
        savedAcc = await createMut.mutateAsync({
          name: name.trim(),
          bankProvider: provider,
          lastKnownBalance: balNum.toFixed(2),
          unbudgetedBuffer: bufNum.toFixed(2),
          isPrivate,
        });
      }

      toast.success(t('toasts.saved'));
      utils.listBankAccountsWithExpected.invalidate();
      onSuccess?.();
      onClose();

      if (hasVariance && (accountToEdit || savedAcc)) {
        onNeedsReconciliation?.({
          id: accountToEdit?.id || savedAcc.id,
          name: name.trim(),
          lastKnownBalance: balNum.toFixed(2),
          unbudgetedBuffer: bufNum.toFixed(2),
          expectedBalance: linkedPoolsTotal,
          linkedPools: linkedPools.map((p) => ({
            id: p.id,
            name: p.name,
            poolType: p.poolType,
            currentBalance: p.currentBalance,
            isSurplusTarget: p.isSurplusTarget,
          })),
        });
      }
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={isEdit ? t('settings.bankAccounts.editAccount') : t('settings.bankAccounts.addAccount')}
      subtitle={t('tooltips.bankAccounts.content')}
      footer={
        <View style={styles.footerContainer}>
          {isEdit && (
            <TouchableOpacity onPress={handleArchive} style={styles.archiveLink}>
              <Text style={styles.archiveLinkText}>{t('common.archive')}</Text>
            </TouchableOpacity>
          )}
          <View style={styles.footerButtons}>
            <MobileButton variant="ghost" onPress={onClose} style={styles.actionBtn}>
              {t('common.cancel')}
            </MobileButton>
            <MobileButton
              variant="primary"
              onPress={handleSubmit}
              loading={submitting}
              disabled={!name.trim() || isNegativeAvailable}
              style={styles.actionBtn}
            >
              {isEdit ? t('common.saveChanges') : t('settings.bankAccounts.addAccount')}
            </MobileButton>
          </View>
        </View>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
        <FormErrorBanner message={generalError} />

        <MobileInput
          label={t('common.name')}
          required
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (nameError) setNameError('');
          }}
          placeholder="e.g. CBA Smart Access"
          error={nameError}
          autoFocus={!isEdit}
        />

        <View style={styles.inputGroup}>
          <FormLabel>{t('bankAccounts.title')}</FormLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providersRow}>
            {PROVIDERS.map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setProvider(p)}
                style={[styles.providerChip, provider === p && styles.providerChipActive]}
              >
                <BankProviderBadge provider={p} size="sm" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <AmountInput
          label={`${t('modals.reconciliation.actualBalance')} ($ AUD)`}
          required
          value={balance}
          onChangeText={setBalance}
          placeholder="0.00"
        />

        <AmountInput
          label="Unbudgeted Buffer ($ AUD)"
          value={buffer}
          onChangeText={setBuffer}
          placeholder="0.00"
          hint="Protected buffer ring-fenced from pool allocations."
        />

        {/* Live Available to Budget & Variance Card */}
        <View style={styles.varianceCard}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>{t('bankAccounts.reconcile.availableToBudget')}:</Text>
            <Text style={[styles.metricVal, isNegativeAvailable ? styles.textNegative : styles.textPositive]}>
              {formatAUD(availableToBudget)}
            </Text>
          </View>

          {isEdit && linkedPools.length > 0 && (
            <View style={styles.metricRowBorder}>
              <Text style={styles.metricLabel}>{t('bankAccounts.reconcile.expectedTotal')}:</Text>
              <Text style={styles.metricVal}>{formatAUD(linkedPoolsTotal)}</Text>
            </View>
          )}

          {isEdit && linkedPools.length > 0 && (
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>{t('bankAccounts.reconcile.difference')}:</Text>
              <Text style={[styles.metricValBold, hasVariance ? (diffBeforeSave > 0 ? styles.textPositive : styles.textWarning) : styles.textPositive]}>
                {hasVariance
                  ? (diffBeforeSave > 0 ? `+${formatAUD(diffBeforeSave)} surplus` : `-${formatAUD(Math.abs(diffBeforeSave))} shortfall`)
                  : '✓ Balanced'}
              </Text>
            </View>
          )}
        </View>

        {/* Private Account Switch */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>{t('bankAccounts.privatePersonalAccount')}</Text>
            <Text style={styles.switchSubtext}>{t('categories.privatePoolTooltip')}</Text>
          </View>
          <Switch
            value={isPrivate}
            onValueChange={setIsPrivate}
            disabled={isEdit}
            trackColor={{ false: '#E2E8F0', true: DESIGN_TOKENS.colors.sereneBlue }}
          />
        </View>
      </ScrollView>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 14,
    paddingBottom: 8,
  },
  inputGroup: {
    gap: 6,
  },
  providersRow: {
    gap: 8,
    paddingVertical: 2,
  },
  providerChip: {
    padding: 2,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  providerChipActive: {
    borderColor: DESIGN_TOKENS.colors.sereneBlue,
  },
  varianceCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricRowBorder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  metricVal: {
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#1B2B4B',
  },
  metricValBold: {
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '800',
  },
  textPositive: {
    color: '#059669',
  },
  textWarning: {
    color: '#D97706',
  },
  textNegative: {
    color: '#E11D48',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 12,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  switchSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  archiveLink: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  archiveLinkText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    minWidth: 90,
  },
});
