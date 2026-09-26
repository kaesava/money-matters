import { useState, useEffect, useMemo } from 'react';
import { formatIsoDate } from '../../lib/format';
import { useRecurrenceBuilder } from '@money-matters/ui/mobile';
import { SourceToEdit } from '../IncomeExpenseFormModal';

export function parseSourceRecurrence(source?: SourceToEdit | null) {
  if (!source) {
    return {
      origIsRecurring: true,
      origFrequency: 'MONTHLY' as const,
      origInterval: 1,
    };
  }

  const origIsRecurring = !!source.rrule || !!source.startDate;

  if (source.rrule) {
    const match = source.rrule.match(/INTERVAL=(\d+)/);
    const parsedInterval = match ? parseInt(match[1], 10) : 1;

    if (source.rrule.includes('FREQ=WEEKLY')) {
      if (source.rrule.includes('FREQ=WEEKLY;INTERVAL=2') || (parsedInterval > 1 && parsedInterval % 2 === 0)) {
        return {
          origIsRecurring,
          origFrequency: 'FORTNIGHTLY' as const,
          origInterval: Math.max(1, Math.floor(parsedInterval / 2)),
        };
      }
      return {
        origIsRecurring,
        origFrequency: 'WEEKLY' as const,
        origInterval: parsedInterval,
      };
    } else if (source.rrule.includes('FREQ=YEARLY') || source.rrule.includes('FREQ=ANNUALLY')) {
      return {
        origIsRecurring,
        origFrequency: 'ANNUALLY' as const,
        origInterval: parsedInterval,
      };
    } else if (source.rrule.includes('FREQ=MONTHLY')) {
      return {
        origIsRecurring,
        origFrequency: 'MONTHLY' as const,
        origInterval: parsedInterval,
      };
    }
  }

  return {
    origIsRecurring,
    origFrequency: 'MONTHLY' as const,
    origInterval: 1,
  };
}

export function useIncomeExpenseForm(
  visible: boolean,
  sourceToEdit: SourceToEdit | null | undefined,
  rawPools: any[],
  bankAccounts: any[],
  mode: 'INCOME' | 'EXPENSE',
) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [poolId, setPoolId] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [receivingAccountId, setReceivingAccountId] = useState('');

  const [nameError, setNameError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [poolError, setPoolError] = useState('');

  const recurrenceBuilder = useRecurrenceBuilder();
  const {
    frequency,
    isRecurring,
    interval,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    setIsRecurring,
    setFrequency,
    setInterval,
  } = recurrenceBuilder;

  useEffect(() => {
    if (sourceToEdit) {
      setName(sourceToEdit.name || '');
      setAmount(sourceToEdit.amount || '');
      setPoolId(sourceToEdit.poolId || '');
      setCategoryId(sourceToEdit.categoryId || null);
      setReceivingAccountId(sourceToEdit.receivingAccountId || '');

      const { origIsRecurring, origFrequency, origInterval } = parseSourceRecurrence(sourceToEdit);
      setIsRecurring(origIsRecurring);
      setFrequency(origFrequency);
      setInterval(origInterval);

      if (sourceToEdit.startDate) {
        setStartDate(formatIsoDate(sourceToEdit.startDate));
      } else {
        setStartDate(formatIsoDate(new Date()));
      }
      if (sourceToEdit.endDate) {
        setEndDate(formatIsoDate(sourceToEdit.endDate));
      } else {
        setEndDate('');
      }
    } else {
      setName('');
      setAmount('');
      setPoolId(rawPools.find((p) => p.poolType === 'REGULAR')?.id || rawPools[0]?.id || '');
      setCategoryId(null);
      setReceivingAccountId(bankAccounts[0]?.id || '');
      setIsRecurring(true);
      setFrequency('MONTHLY');
      setInterval(1);
      setStartDate(formatIsoDate(new Date()));
      setEndDate('');
    }
    setNameError('');
    setAmountError('');
    setPoolError('');
  }, [sourceToEdit, visible, rawPools.length, bankAccounts.length]);

  const isDirty = useMemo(() => {
    if (!sourceToEdit) {
      return name.trim() !== '' || amount.trim() !== '';
    }
    const origStartDate = sourceToEdit.startDate ? formatIsoDate(sourceToEdit.startDate) : formatIsoDate(new Date());
    const origEndDate = sourceToEdit.endDate ? formatIsoDate(sourceToEdit.endDate) : '';
    const { origIsRecurring, origFrequency, origInterval } = parseSourceRecurrence(sourceToEdit);

    return (
      name !== (sourceToEdit.name || '') ||
      amount !== (sourceToEdit.amount || '') ||
      poolId !== (sourceToEdit.poolId || '') ||
      categoryId !== (sourceToEdit.categoryId || null) ||
      receivingAccountId !== (sourceToEdit.receivingAccountId || '') ||
      isRecurring !== origIsRecurring ||
      frequency !== origFrequency ||
      (interval || 1) !== origInterval ||
      startDate !== origStartDate ||
      (endDate || '') !== origEndDate
    );
  }, [
    name,
    amount,
    poolId,
    categoryId,
    receivingAccountId,
    isRecurring,
    frequency,
    interval,
    startDate,
    endDate,
    sourceToEdit,
  ]);

  const isScheduleRuleChanged = useMemo(() => {
    if (!sourceToEdit) return false;
    const origStartDate = sourceToEdit.startDate ? formatIsoDate(sourceToEdit.startDate) : formatIsoDate(new Date());
    const origEndDate = sourceToEdit.endDate ? formatIsoDate(sourceToEdit.endDate) : '';
    const { origIsRecurring, origFrequency, origInterval } = parseSourceRecurrence(sourceToEdit);

    return (
      isRecurring !== origIsRecurring ||
      frequency !== origFrequency ||
      (interval || 1) !== origInterval ||
      startDate !== origStartDate ||
      (endDate || '') !== origEndDate
    );
  }, [isRecurring, frequency, interval, startDate, endDate, sourceToEdit]);

  const isEndDateInvalid = Boolean(isRecurring && endDate && startDate && endDate < startDate);

  const isValid =
    name.trim() !== '' &&
    amount.trim() !== '' &&
    parseFloat(amount) > 0 &&
    (mode !== 'EXPENSE' || !!poolId) &&
    !isEndDateInvalid;

  return {
    name,
    amount,
    poolId,
    categoryId,
    receivingAccountId,
    nameError,
    amountError,
    poolError,
    isDirty,
    isValid,
    isScheduleRuleChanged,
    isEndDateInvalid,
    recurrenceBuilder,
    setName,
    setAmount,
    setPoolId,
    setCategoryId,
    setReceivingAccountId,
    setNameError,
    setAmountError,
    setPoolError,
  };
}
