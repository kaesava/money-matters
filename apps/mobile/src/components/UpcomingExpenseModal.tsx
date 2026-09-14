import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  DESIGN_TOKENS,
  MobileModalDialog,
  AmountInput,
  MobileInput,
  MobileButton,
  FormErrorBanner,
  showMobileConfirm,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../lib/trpc';
import { formatHealthStatus, formatIsoDate, formatAUD } from '../lib/format';

interface UpcomingExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  eventToEdit?: {
    id?: string;
    name?: string | null;
    expectedDate?: string;
    expectedAmount?: string;
    poolId?: string | null;
    categoryId?: string | null;
    categoryName?: string;
    note?: string | null;
    isRecurring?: boolean;
  } | null;

  isQuickAdd?: boolean;
  onSuccess?: () => void;
}

function fmt(val: number) {
  return formatAUD(val);
}

export function UpcomingExpenseModal({
  visible,
  onClose,
  eventToEdit,
  isQuickAdd = false,
  onSuccess,
}: UpcomingExpenseModalProps) {
  const utils = trpc.useUtils();
  const todayStr = formatIsoDate(new Date());

  const categoriesQuery = trpc.listPools.useQuery(undefined, { enabled: visible });
  const categories = categoriesQuery.data ?? [];

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [expectedDate, setExpectedDate] = useState(todayStr);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const overrideMut = trpc.overrideEvent.useMutation();
  const deleteMut = trpc.deleteUpcomingEvent.useMutation();
  const createExpenseMut = trpc.createExpenseSource.useMutation();
  const recordExpenseMut = trpc.recordExpense.useMutation();

  useEffect(() => {
    if (eventToEdit) {
      setName(eventToEdit.name || '');
      setCategoryId(eventToEdit.categoryId || eventToEdit.poolId || (categories[0]?.id ?? ''));
      setAmount(eventToEdit.expectedAmount || '');
      setExpectedDate(eventToEdit.expectedDate || todayStr);
      setNote(eventToEdit.note || '');
    } else {
      setName('');
      setCategoryId(categories[0]?.id || '');
      setAmount('');
      setExpectedDate(todayStr);
      setNote('');
    }
    setErrorMsg('');
  }, [eventToEdit, visible, categories]);

  if (!visible) return null;

  const numAmount = parseFloat(amount) || 0;
  const isFutureDate = expectedDate > todayStr;
  const selectedCat = categories.find((c) => c.id === categoryId);
  const currentCatBal = selectedCat ? (typeof selectedCat.currentBalance === 'number' ? selectedCat.currentBalance : parseFloat(selectedCat.currentBalance || '0')) : 0;
  const projectedBal = currentCatBal - numAmount;
  const isNegativeWarning = !isFutureDate && selectedCat && numAmount > currentCatBal;

  const validateInput = (): boolean => {
    if (!name.trim()) {
      setErrorMsg('Please enter an expense bill name.');
      return false;
    }
    if (!categoryId) {
      setErrorMsg('Please select a category.');
      return false;
    }
    if (isNaN(numAmount) || numAmount < 0) {
      setErrorMsg('Amount cannot be less than 0.');
      return false;
    }
    return true;
  };

  const handleSaveWithoutMarkingPaid = async () => {
    setErrorMsg('');
    if (!validateInput()) return;
    setSubmitting(true);
    try {
      if (eventToEdit?.id) {
        await overrideMut.mutateAsync({
          eventId: eventToEdit.id,
          eventType: 'EXPENSE',
          name,
          poolId: categoryId,
          expectedAmount: numAmount.toFixed(2),
          expectedDate,
          note,
        });
      } else {
        await createExpenseMut.mutateAsync({
          name,
          amount: numAmount.toFixed(2),
          poolId: categoryId,
          isRecurring: false,
          startDate: expectedDate,
        });
      }
      await utils.listExpenseEvents.invalidate();
      await utils.listPools.invalidate();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async () => {
    setErrorMsg('');
    if (!validateInput()) return;

    if (isNegativeWarning) {
      showMobileConfirm({
        title: 'Negative Balance Warning',
        message: `Payment of ${fmt(numAmount)} exceeds "${selectedCat?.name}" balance (${fmt(currentCatBal)}). Category balance will become negative (${fmt(projectedBal)}). Proceed?`,
        confirmText: t('common.confirm'),
        cancelText: t('common.cancel'),
        isDestructive: false,
        onConfirm: () => executeMarkPaid(),
      });
      return;
    }

    await executeMarkPaid();
  };

  const executeMarkPaid = async () => {
    setSubmitting(true);
    try {
      if (eventToEdit?.id) {
        await overrideMut.mutateAsync({
          eventId: eventToEdit.id,
          eventType: 'EXPENSE',
          status: 'CONFIRMED',
          actualAmount: numAmount.toFixed(2),
          note: note || `Paid ${name}`,
        });
      } else {
        await recordExpenseMut.mutateAsync({
          poolId: categoryId,
          amount: numAmount.toFixed(2),
          flowType: 'DEBIT',
          note: note || `Paid ${name}`,
          date: expectedDate,
        });
      }
      await utils.listExpenseEvents.invalidate();
      await utils.listPools.invalidate();
      await utils.listTransactions.invalidate();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to mark paid.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!eventToEdit?.id) return;
    showMobileConfirm({
      title: 'Permanent Delete Warning',
      message: 'This upcoming expense record will be permanently deleted (not archived). Are you sure?',
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      isDestructive: true,
      onConfirm: async () => {
        setSubmitting(true);
        try {
          await deleteMut.mutateAsync({ eventId: eventToEdit.id!, eventType: 'EXPENSE' });
          await utils.listExpenseEvents.invalidate();
          if (onSuccess) onSuccess();
          onClose();
        } catch (err: unknown) {
          setErrorMsg(err instanceof Error ? err.message : 'Failed to delete record.');
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const isDirty = Boolean(name.trim() || amount.trim());

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      isDirty={isDirty}
      title={isQuickAdd ? t('modals.quickExpense.title') : `${t('modals.upcomingExpense.title')}: ${name || 'Expense'}`}
      subtitle={isQuickAdd ? 'Record one-off out-of-pocket spend' : 'Review and record upcoming scheduled expense'}
      footer={
        <View style={styles.footerRow}>
          {!isQuickAdd && eventToEdit?.id ? (
            <MobileButton
              variant="danger"
              size="sm"
              onPress={handleDelete}
              disabled={submitting}
            >
              {t('common.delete')}
            </MobileButton>
          ) : null}

          <View style={styles.rightActions}>
            <MobileButton
              variant="secondary"
              size="sm"
              onPress={handleSaveWithoutMarkingPaid}
              loading={submitting}
            >
              {t('modals.upcomingExpense.saveWithoutPaid')}
            </MobileButton>

            <MobileButton
              variant="primary"
              size="sm"
              onPress={handleMarkPaid}
              disabled={submitting || isFutureDate}
              loading={submitting}
            >
              {t('modals.upcomingExpense.markPaid')}
            </MobileButton>
          </View>
        </View>
      }
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <FormErrorBanner message={errorMsg} />

        {!isQuickAdd && eventToEdit?.isRecurring ? (
          <View style={styles.seriesBanner}>
            <Text style={styles.seriesTitle}>{t('modals.upcomingExpense.title')}</Text>
            <Text style={styles.seriesDesc}>
              Editing this specific expense date or amount.
            </Text>
          </View>
        ) : null}

        <MobileInput
          label={t('modals.upcomingExpense.billName')}
          required
          value={name}
          onChangeText={setName}
          placeholder="e.g. Electric Bill"
        />

        <View style={styles.row}>
          <View style={styles.halfCol}>
            <AmountInput
              label={t('modals.upcomingExpense.amount')}
              required
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
            />
          </View>
          <View style={styles.halfCol}>
            <MobileInput
              label={t('modals.upcomingExpense.expectedDate')}
              required
              value={expectedDate}
              onChangeText={setExpectedDate}
              placeholder="YYYY-MM-DD"
            />
          </View>
        </View>

        <MobileInput
          label={t('common.categoryOrAccount')}
          value={selectedCat?.name || eventToEdit?.categoryName || 'Uncategorized'}
          editable={false}
        />

        {selectedCat ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Current Balance: <Text style={styles.bold}>{fmt(currentCatBal)}</Text>
            </Text>
            <Text style={styles.infoText}>
              Projected After: <Text style={styles.bold}>{fmt(projectedBal)}</Text>
            </Text>
            {isFutureDate && selectedCat.healthStatus ? (
              <Text style={styles.healthBadge}>Health: {formatHealthStatus(selectedCat.healthStatus)}</Text>
            ) : null}
          </View>
        ) : null}

        <MobileInput
          label={t('modals.upcomingExpense.notes')}
          value={note}
          onChangeText={setNote}
          multiline
          placeholder={t('fileNotes.placeholder')}
        />

        {isFutureDate ? (
          <Text style={styles.futureGuidance}>
            {t('modals.upcomingExpense.disclaimer')}
          </Text>
        ) : null}

        {isNegativeWarning ? (
          <Text style={styles.warnText}>
            ⚠️ Payment of {fmt(numAmount)} exceeds "{selectedCat?.name}" balance. Balance will become negative ({fmt(projectedBal)}).
          </Text>
        ) : null}
      </ScrollView>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  scrollContent: { gap: 12, paddingBottom: 10 },
  seriesBanner: { backgroundColor: '#EFF6FF', padding: 10, borderRadius: 10 },
  seriesTitle: { fontWeight: '800', color: '#1E40AF', fontSize: 12 },
  seriesDesc: { color: '#1E40AF', fontSize: 11 },
  row: { flexDirection: 'row', gap: 10 },
  halfCol: { flex: 1 },
  infoCard: { backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, gap: 4 },
  infoText: { fontSize: 12, color: '#334155' },
  bold: { fontWeight: '800' },
  healthBadge: { fontSize: 11, fontWeight: '800', color: '#0F766E' },
  futureGuidance: { fontSize: 11, color: '#D97706', backgroundColor: '#FEF3C7', padding: 10, borderRadius: 10 },
  warnText: { fontSize: 11, color: '#B91C1C', backgroundColor: '#FEE2E2', padding: 10, borderRadius: 10, fontWeight: 'bold' },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 8 },
  rightActions: { flexDirection: 'row', gap: 8, alignItems: 'center', marginLeft: 'auto' },
});
