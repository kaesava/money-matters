import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import {
  DESIGN_TOKENS,
  MobileModalDialog,
  MobileInput,
  AmountInput,
  ChipSelect,
  MobileButton,
  FormLabel,
  FormFieldError,
  RecurrenceBuilder,
  useRecurrenceBuilder,
} from '@money-matters/ui/mobile';
import { trpc } from '../lib/trpc';
import { formatIsoDate } from '../lib/format';

export interface SourceToEdit {
  id: string;
  name: string;
  amount: string;
  type?: string;
  rrule?: string | null;
  startDate?: string | Date | null;
  endDate?: string | null;
  categoryId?: string | null;
  receivingAccountId?: string | null;
}

interface IncomeExpenseFormModalProps {
  visible: boolean;
  mode: 'INCOME' | 'EXPENSE';
  sourceToEdit?: SourceToEdit | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function IncomeExpenseFormModal({ visible, mode, sourceToEdit, onClose, onSuccess }: IncomeExpenseFormModalProps) {
  const categoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: visible && mode === 'EXPENSE' });
  const categories = categoriesQuery.data ?? [];

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [nameError, setNameError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [categoryError, setCategoryError] = useState('');

  const recurrenceBuilder = useRecurrenceBuilder();
  const { frequency, isRecurring, startDate, endDate, setStartDate, setEndDate, setIsRecurring, setFrequency, setInterval } = recurrenceBuilder;

  useEffect(() => {
    if (sourceToEdit) {
      setName(sourceToEdit.name);
      setAmount(sourceToEdit.amount);
      const hasSchedule = !!sourceToEdit.rrule || !!sourceToEdit.startDate;
      setIsRecurring(hasSchedule);

      if (sourceToEdit.rrule) {
        if (sourceToEdit.rrule.includes('FREQ=WEEKLY;INTERVAL=2')) {
          setFrequency('FORTNIGHTLY');
          setInterval(1);
        } else if (sourceToEdit.rrule.includes('FREQ=WEEKLY')) {
          setFrequency('WEEKLY');
          const m = sourceToEdit.rrule.match(/INTERVAL=(\d+)/);
          setInterval(m ? parseInt(m[1]) : 1);
        } else if (sourceToEdit.rrule.includes('FREQ=YEARLY')) {
          setFrequency('ANNUALLY');
          const m = sourceToEdit.rrule.match(/INTERVAL=(\d+)/);
          setInterval(m ? parseInt(m[1]) : 1);
        } else {
          setFrequency('MONTHLY');
          const m = sourceToEdit.rrule.match(/INTERVAL=(\d+)/);
          setInterval(m ? parseInt(m[1]) : 1);
        }
      } else {
        setFrequency('MONTHLY');
        setInterval(1);
      }

      if (sourceToEdit.startDate) {
        setStartDate(formatIsoDate(sourceToEdit.startDate));
      }
      if (sourceToEdit.endDate) setEndDate(formatIsoDate(sourceToEdit.endDate));
      if (sourceToEdit.categoryId) setCategoryId(sourceToEdit.categoryId);
    } else {
      setName('');
      setAmount('');
      setIsRecurring(true);
      setFrequency('MONTHLY');
      setInterval(1);
      setStartDate(formatIsoDate(new Date()));
      setEndDate(null);
      setCategoryId('');
    }
    setNameError('');
    setAmountError('');
    setCategoryError('');
  }, [sourceToEdit, visible]);

  const createIncomeMut = trpc.createIncomeSource.useMutation({
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
  });

  const updateIncomeMut = trpc.updateIncomeSource.useMutation({
    onSuccess: (res: { hasConfirmedHistory?: boolean }) => {
      if (res?.hasConfirmedHistory) {
        Alert.alert('Notice', "Note: Paydays that have already been confirmed won't be changed. Only unperformed future occurrences have been updated.");
      }
      onSuccess?.();
      onClose();
    },
  });

  const createExpenseMut = trpc.createExpenseSource.useMutation({
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
  });

  const handleSubmit = () => {
    let hasError = false;
    if (!name.trim()) {
      setNameError('Please provide a name');
      hasError = true;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setAmountError('Please provide a positive amount');
      hasError = true;
    }
    if (mode === 'EXPENSE' && !categoryId) {
      setCategoryError('Please assign to a category');
      hasError = true;
    }

    if (hasError) return;

    setNameError('');
    setAmountError('');
    setCategoryError('');

    if (mode === 'INCOME') {
      if (sourceToEdit) {
        updateIncomeMut.mutate({
          id: sourceToEdit.id,
          data: {
            name: name.trim(),
            amount: parseFloat(amount).toFixed(2),
            isRecurring,
            frequency: isRecurring ? frequency : undefined,
            startDate: startDate || undefined,
            endDate: isRecurring && endDate ? endDate : undefined,
          },
        });
      } else {
        createIncomeMut.mutate({
          name: name.trim(),
          amount: parseFloat(amount).toFixed(2),
          isRecurring,
          frequency: isRecurring ? frequency : undefined,
          startDate: startDate || undefined,
          endDate: isRecurring && endDate ? endDate : undefined,
        });
      }
    } else {
      createExpenseMut.mutate({
        name: name.trim(),
        amount: parseFloat(amount).toFixed(2),
        poolId: categoryId,
        isRecurring,
        startDate: startDate ? startDate : undefined,
        frequency: isRecurring ? frequency : undefined,
      });
    }
  };

  const isPending =
    createIncomeMut.isPending || updateIncomeMut.isPending || createExpenseMut.isPending;

  const isDirty = Boolean(name.trim() || amount.trim());

  const categoryOptions = categories.map((c) => ({
    key: c.id,
    label: c.name,
  }));

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      isDirty={isDirty}
      title={sourceToEdit ? `Edit ${mode === 'INCOME' ? 'Income Schedule' : 'Expense'}: ${sourceToEdit.name}` : (mode === 'INCOME' ? 'Setup Income Schedule' : 'Setup Expense or Bill')}
      subtitle={mode === 'INCOME' ? 'Setup any upcoming one-off or repeating income schedule' : "Setup any upcoming expenses or bills you're expecting"}
      footer={
        <MobileButton
          variant="primary"
          loading={isPending}
          disabled={!name.trim() || !amount.trim()}
          onPress={handleSubmit}
        >
          {sourceToEdit ? 'Update' : 'Create'}
        </MobileButton>
      }
    >
      <View style={styles.content}>
        <MobileInput
          label={mode === 'INCOME' ? 'Income Name' : 'Bill Name'}
          required
          value={name}
          onChangeText={(val) => {
            setName(val);
            if (nameError) setNameError('');
          }}
          placeholder={mode === 'INCOME' ? 'e.g. Primary Salary, Freelance' : 'e.g. Electricity, Internet, Gym'}
          error={nameError}
          autoFocus={!sourceToEdit}
        />

        <AmountInput
          label="Amount ($ AUD)"
          required
          value={amount}
          onChangeText={(val) => {
            setAmount(val);
            if (amountError) setAmountError('');
          }}
          placeholder="0.00"
          error={amountError}
        />

        {mode === 'EXPENSE' && (
          <View style={styles.formGroup}>
            <FormLabel required>Category</FormLabel>
            <ChipSelect
              options={categoryOptions}
              value={categoryId}
              onChange={(val) => {
                setCategoryId(val);
                if (categoryError) setCategoryError('');
              }}
            />
            <FormFieldError error={categoryError} />
          </View>
        )}

        <RecurrenceBuilder builder={recurrenceBuilder} />
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  formGroup: {
    gap: 4,
  },
});
