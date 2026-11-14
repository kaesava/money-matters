import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { t } from '@money-matters/i18n';
import { serializeCsvRows } from '@money-matters/types';
import { formatDate, formatIsoDate } from '../../../lib/format';
import { LedgerTxItem } from '../LedgerHistoryTab';
import { MobilePaydayAllocationRecord } from '../../plan/MobilePaydayPlanDetailModal';

export function useTransactionsExport() {
  const exportLedgerCsv = async (transactions: LedgerTxItem[]) => {
    if (transactions.length === 0) return;
    const headers = [
      t('history.exportHeaders.date'),
      t('history.exportHeaders.amount'),
      t('history.exportHeaders.type'),
      t('history.exportHeaders.envelope'),
      t('history.exportHeaders.category'),
      t('history.exportHeaders.account'),
      t('history.exportHeaders.note'),
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
          dialogTitle: t('history.exportTransactionsDialog'),
        });
      }
    } catch {
      // Ignored
    }
  };

  const exportPlansCsv = async (plans: MobilePaydayAllocationRecord[]) => {
    if (plans.length === 0) return;
    const headers = [
      t('history.exportHeaders.paydayPlanDate'),
      t('history.exportHeaders.incomeDate'),
      t('history.exportHeaders.incomeSource'),
      t('history.exportHeaders.bankAccount'),
      t('history.exportHeaders.totalAmount'),
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
          dialogTitle: t('history.exportSplitsDialog'),
        });
      }
    } catch {
      // Ignored
    }
  };

  return { exportLedgerCsv, exportPlansCsv };
}
