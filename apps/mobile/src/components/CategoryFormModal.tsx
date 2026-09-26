import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  DESIGN_TOKENS,
  MobileModalDialog,
  MobileInput,
  AmountInput,
  ChipSelect,
  MobileButton,
  FormLabel,
  DatePickerField,
  MobileCheckbox,
  showMobileConfirm,
  useMobileToast,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../lib/trpc';
import { formatIsoDate } from '../lib/format';

export interface CategoryItem {
  id: string;
  name: string;
  type: 'GOAL' | 'REGULAR' | 'EVERYDAY';
  targetAmount?: string | null;
  targetDate?: string | null;
  monthlyAmount?: string | null;
  everydayTargetKeepAmount?: string | null;
  bankAccountId?: string | null;
  currentBalance?: string;
  everydayAllowanceAmount?: string | null;
  healthStatus?: string | null;
  isSurplusTarget?: boolean | null;
}

interface CategoryFormModalProps {
  visible: boolean;
  categoryToEdit?: CategoryItem | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CategoryFormModal({ visible, categoryToEdit, onClose, onSuccess }: CategoryFormModalProps) {
  const toast = useMobileToast();
  const utils = trpc.useUtils();

  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery(undefined, { enabled: visible });
  const bankAccounts = bankAccountsQuery.data ?? [];

  const isEdit = Boolean(categoryToEdit?.id);

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [type, setType] = useState<'GOAL' | 'REGULAR' | 'EVERYDAY'>('REGULAR');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [isSurplusTarget, setIsSurplusTarget] = useState(false);

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setType(categoryToEdit.type);
      setBankAccountId(categoryToEdit.bankAccountId ?? '');
      setTargetAmount(categoryToEdit.targetAmount ?? '');
      setTargetDate(categoryToEdit.targetDate ? formatIsoDate(categoryToEdit.targetDate) : '');
      setIsSurplusTarget(categoryToEdit.isSurplusTarget ?? false);
    } else {
      setName('');
      setType('REGULAR');
      setBankAccountId('');
      setTargetAmount('');
      setTargetDate('');
      setIsSurplusTarget(false);
    }
    setNameError('');
  }, [categoryToEdit, visible]);

  const createMut = trpc.createPool.useMutation({
    onSuccess: () => {
      utils.listPools.invalidate();
      toast.success(t('toasts.created'));
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || t('categories.saveFailed'));
    },
  });

  const updateMut = trpc.updatePool.useMutation({
    onSuccess: () => {
      utils.listPools.invalidate();
      toast.success(t('toasts.saved'));
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || t('categories.saveFailed'));
    },
  });

  const archiveMut = trpc.archivePool.useMutation({
    onSuccess: () => {
      utils.listPools.invalidate();
      toast.success(t('toasts.archived'));
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || t('categories.failedToArchive'));
    },
  });

  const isValid = useMemo(() => {
    if (!name.trim()) return false;
    if (!isEdit && !bankAccountId) return false;
    if (type === 'GOAL') {
      if (!targetAmount || parseFloat(targetAmount) <= 0) return false;
      if (!targetDate) return false;
    }
    return true;
  }, [name, isEdit, bankAccountId, type, targetAmount, targetDate]);

  const isDirty = useMemo(() => {
    if (!isEdit) {
      return Boolean(name.trim() || bankAccountId || targetAmount || targetDate || isSurplusTarget);
    }
    if (!categoryToEdit) return false;
    const initialName = categoryToEdit.name || '';
    const initialTarget = categoryToEdit.targetAmount || '';
    const initialDate = categoryToEdit.targetDate ? formatIsoDate(categoryToEdit.targetDate) : '';
    const initialSurplus = categoryToEdit.isSurplusTarget ?? false;

    return (
      name.trim() !== initialName ||
      targetAmount !== initialTarget ||
      targetDate !== initialDate ||
      isSurplusTarget !== initialSurplus
    );
  }, [isEdit, categoryToEdit, name, bankAccountId, targetAmount, targetDate, isSurplusTarget]);

  const isSurplusDisabled = Boolean(isEdit && categoryToEdit?.isSurplusTarget);

  const handleSubmit = () => {
    if (!name.trim()) {
      setNameError(t('categories.nameRequired'));
      return;
    }
    if (!isEdit && !bankAccountId) {
      toast.error(t('categories.bankAccountRequired'));
      return;
    }
    if (type === 'GOAL') {
      if (!targetAmount || parseFloat(targetAmount) <= 0) {
        toast.error(t('categories.goalAmountRequired'));
        return;
      }
      if (!targetDate) {
        toast.error(t('categories.goalDateRequired'));
        return;
      }
    }
    setNameError('');

    if (categoryToEdit) {
      updateMut.mutate({
        poolId: categoryToEdit.id,
        data: {
          name: name.trim(),
          targetAmount: type === 'GOAL' && targetAmount ? parseFloat(targetAmount).toFixed(2) : undefined,
          targetDate: type === 'GOAL' && targetDate ? targetDate : undefined,
          isSurplusTarget: type !== 'EVERYDAY' ? isSurplusTarget : undefined,
        },
      });
    } else {
      createMut.mutate({
        name: name.trim(),
        poolType: type,
        bankAccountId,
        targetAmount: type === 'GOAL' && targetAmount ? parseFloat(targetAmount).toFixed(2) : undefined,
        targetDate: type === 'GOAL' && targetDate ? targetDate : undefined,
        isSurplusTarget: type !== 'EVERYDAY' ? isSurplusTarget : undefined,
      });
    }
  };

  const handleArchive = () => {
    if (!categoryToEdit) return;
    showMobileConfirm({
      title: t('categories.archivePool'),
      message: t('categories.archivePoolConfirm', { name: categoryToEdit.name }),
      confirmText: t('categories.archivePool'),
      isDestructive: true,
      onConfirm: () => {
        archiveMut.mutate({ poolId: categoryToEdit.id });
      },
    });
  };

  const isPending = createMut.isPending || updateMut.isPending || archiveMut.isPending;

  const typeOptions = [
    { key: 'EVERYDAY', label: t('categories.typeEveryday') },
    { key: 'REGULAR', label: t('categories.typeRegular') },
    { key: 'GOAL', label: t('categories.typeGoal') },
  ];

  const bankOptions = bankAccounts.map((acc) => ({
    key: acc.id,
    label: `${acc.name} ${acc.isPrivate ? t('categories.privateBadge') : t('categories.householdBadge')}`,
  }));

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      isDirty={isDirty}
      title={isEdit ? t('categories.editPoolTitle', { name: categoryToEdit?.name || '' }) : t('categories.createPool')}
      footer={
        <View style={styles.footerContainer}>
          {isEdit ? (
            <TouchableOpacity
              onPress={handleArchive}
              disabled={isPending}
              style={styles.archiveBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.archiveBtnText}>{t('categories.archivePool')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <MobileButton
            variant="primary"
            loading={isPending}
            disabled={!isValid || !isDirty || isPending}
            onPress={handleSubmit}
            style={styles.submitBtn}
          >
            {t('categories.savePool')}
          </MobileButton>
        </View>
      }
    >
      <View style={styles.content}>
        {/* Pool Name */}
        <MobileInput
          label={t('categories.poolNameLabel')}
          required
          value={name}
          onChangeText={(val) => {
            setName(val);
            if (nameError) setNameError('');
          }}
          placeholder={t('categories.placeholderPoolName')}
          error={nameError}
          autoFocus={!isEdit}
        />

        {/* Pool Type */}
        <View style={styles.formGroup}>
          <FormLabel required>{t('categories.poolTypeLabel')}</FormLabel>
          <ChipSelect
            options={typeOptions}
            value={type}
            onChange={(val) => setType(val as 'GOAL' | 'REGULAR' | 'EVERYDAY')}
            disabled={isEdit}
          />
        </View>

        {/* Linked Bank Account (Positioned ABOVE Target Amount) */}
        <View style={styles.formGroup}>
          <FormLabel required={!isEdit}>{t('categories.linkedAccountLabel')}</FormLabel>
          <ChipSelect
            options={bankOptions}
            value={bankAccountId}
            onChange={setBankAccountId}
            disabled={isEdit}
          />
        </View>

        {/* Immutability Warning when Editing */}
        {isEdit && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              {t('categories.immutabilityWarning')}
            </Text>
          </View>
        )}

        {/* Calculated Target Notice for Everyday & Bills */}
        {(type === 'REGULAR' || type === 'EVERYDAY') && (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>{t('categories.calculatedTarget')}</Text>
            <Text style={styles.noticeDesc}>{t('categories.calculatedTargetNotice')}</Text>
          </View>
        )}

        {/* Target Amount & Mandatory Completion Date for Goals */}
        {type === 'GOAL' && (
          <>
            <AmountInput
              label={t('categories.targetAmountLabel')}
              required
              value={targetAmount}
              onChangeText={setTargetAmount}
              placeholder="10000.00"
            />
            <DatePickerField
              label={t('categories.targetCompletionDate')}
              required
              value={targetDate}
              onChange={setTargetDate}
            />
          </>
        )}

        {/* Shortfall / Surplus Target Checkbox (Savings/Bills only) */}
        {type !== 'EVERYDAY' && (
          <View style={styles.surplusRow}>
            <MobileCheckbox
              checked={isSurplusTarget}
              onChange={setIsSurplusTarget}
              disabled={isSurplusDisabled}
              label={t('categories.sweepSurplus')}
            />
            {isSurplusDisabled && (
              <Text style={styles.surplusDisabledText}>
                {t('categories.shortfallTargetDisabledWarning')}
              </Text>
            )}
          </View>
        )}
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
  },
  formGroup: {
    gap: 4,
  },
  warningBox: {
    padding: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  warningText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    lineHeight: 16,
  },
  noticeCard: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  noticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  noticeDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  surplusRow: {
    paddingTop: 4,
    gap: 4,
  },
  surplusDisabledText: {
    fontSize: 11,
    color: '#94A3B8',
    paddingLeft: 30,
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  archiveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  archiveBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  submitBtn: {
    flex: 1,
    maxWidth: 200,
  },
});
