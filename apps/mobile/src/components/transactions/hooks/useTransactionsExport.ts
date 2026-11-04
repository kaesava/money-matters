import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { t } from '@money-matters/i18n';
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
      `"${formatDate(tx.recordedAt)}"`,
      `"${tx.amount}"`,
      `"${tx.effectiveType}"`,
      `"${(tx.poolName || '').replace(/"/g, '""')}"`,
      `"${(tx.categoryName || '').replace(/"/g, '""')}"`,
      `"${(tx.bankAccountName || '').replace(/"/g, '""')}"`,
      `"${(tx.note || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
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
      `"${formatDate(p.createdAt)}"`,
      `"${formatDate(p.expectedDate || p.createdAt)}"`,
      `"${(p.incomeName || '').replace(/"/g, '""')}"`,
      `"${(p.receivingAccountName || '').replace(/"/g, '""')}"`,
      `"${p.totalIncomeAmount}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
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
