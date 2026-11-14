import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { t } from '@money-matters/i18n';
import { serializeCsvRows } from '@money-matters/types';
import { formatDate, formatIsoDate } from '../../../lib/format';
import { LedgerTxItem } from '../LedgerHistoryTab';
import { MobilePaydayAllocationRecord } from '../../paychecks/MobilePaydayAllocationDetailModal';

export function useTransactionsExport() {
  const exportLedgerCsv = async (transactions: LedgerTxItem[]) => {
    if (transactions.length === 0) return;
    const headers = [
      t('transactions.exportHeaders.date'),
      t('transactions.exportHeaders.amount'),
      t('transactions.exportHeaders.type'),
      t('transactions.exportHeaders.envelope'),
      t('transactions.exportHeaders.category'),
      t('transactions.exportHeaders.account'),
      t('transactions.exportHeaders.note'),
    ];
    const rows = transactions.map((tx) => [
      formatDate(tx.recordedAt),
      tx.amount,
      tx.effectiveType,
      tx.poolName || '',
      tx.categoryName || '',
      tx.bankAccountName || '',
      tx.note || '',
    ]);
    const csv = serializeCsvRows(headers, rows);
    try {
      const fileUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}transactions_${formatIsoDate(new Date())}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: t('transactions.exportTransactionsDialog'),
        });
      }
    } catch {
      // Ignored
    }
  };

  const exportPlansCsv = async (plans: MobilePaydayAllocationRecord[]) => {
    if (plans.length === 0) return;
    const headers = [
      t('transactions.exportHeaders.paydayPlanDate'),
      t('transactions.exportHeaders.incomeDate'),
      t('transactions.exportHeaders.incomeSource'),
      t('transactions.exportHeaders.bankAccount'),
      t('transactions.exportHeaders.totalAmount'),
    ];
    const rows = plans.map((p) => [
      formatDate(p.createdAt),
      formatDate(p.expectedDate || p.createdAt),
      p.incomeName || '',
      p.receivingAccountName || '',
      p.totalIncomeAmount,
    ]);
    const csv = serializeCsvRows(headers, rows);
    try {
      const fileUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}payday_plans_${formatIsoDate(new Date())}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: t('transactions.exportSplitsDialog'),
        });
      }
    } catch {
      // Ignored
    }
  };

  return { exportLedgerCsv, exportPlansCsv };
}
