import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import {
  DESIGN_TOKENS,
  MobilePaginationBar,
  useMobileToast,
  showMobileConfirm,
  AmountInput,
  MobileDatePickerField,
  MobileInput,
  SkeletonCard,
} from '@money-matters/ui/mobile';
import { AppScreenWrapper } from '../../../components/AppScreenWrapper';
import { trpc } from '../../../lib/trpc';
import { formatIsoDate } from '../../../lib/format';

const INCOME_TYPES = ['SALARY', 'FREELANCE', 'OTHER'] as const;
const FREQUENCIES = ['WEEKLY', 'FORTNIGHTLY', 'MONTHLY'] as const;

type IncomeType = (typeof INCOME_TYPES)[number];
type Frequency = (typeof FREQUENCIES)[number];

const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  SALARY: 'Salary',
  FREELANCE: 'Freelance',
  OTHER: 'Other',
};

const FREQ_LABELS: Record<Frequency, string> = {
  WEEKLY: 'Weekly',
  FORTNIGHTLY: 'Fortnightly',
  MONTHLY: 'Monthly',
};

export default function SettingsIncomeScreen() {
  const router = useRouter();
  const toast = useMobileToast();

  const [name, setName] = useState('');
  const [type, setType] = useState<IncomeType>('SALARY');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('FORTNIGHTLY');
  const [startDate, setStartDate] = useState(() => formatIsoDate(new Date()));
  const [adding, setAdding] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Queries & Mutations
  const { data: incomeSources, isLoading, refetch } = trpc.listIncomeSources.useQuery();
  const createSource = trpc.createIncomeSource.useMutation();
  const archiveSource = trpc.archiveIncomeSource.useMutation();

  const handleAdd = async () => {
    if (!name.trim() || !amount.trim()) return;
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      toast.warning(t('drawers.quickExpense.validAmountError'));
      return;
    }
    setAdding(true);
    try {
      await createSource.mutateAsync({
        name: name.trim(),
        amount: numericAmount.toFixed(2),
        isRecurring: true,
        startDate,
        frequency,
      });

      setName('');
      setAmount('');
      refetch();
      toast.success(t('settings.income.addSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setAdding(false);
    }
  };

  const handleArchive = (id: string, name: string) => {
    showMobileConfirm({
      title: t('settings.income.archiveConfirmTitle'),
      message: t('settings.income.archiveConfirmMessage').replace('{name}', name),
      confirmText: t('common.archive'),
      cancelText: t('common.cancel'),
      isDestructive: true,
      onConfirm: async () => {
        try {
          await archiveSource.mutateAsync({ id });
          refetch();
          toast.success(t('toasts.archived'));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t('common.error'));
        }
      },
    });
  };

  const totalItems = incomeSources?.length ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedSources = (incomeSources ?? []).slice((page - 1) * pageSize, page * pageSize);

  return (
    <AppScreenWrapper
      title={t('settings.incomeSchedules')}
      showBack
      onBackPress={() => router.back()}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Existing Income Sources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.income.currentSchedules')}</Text>
          {isLoading ? (
            <SkeletonCard count={3} />
          ) : !incomeSources || incomeSources.length === 0 ? (
            <View style={styles.cardEmpty}>
              <Text style={styles.emptyText}>{t('settings.income.noSchedules')}</Text>
            </View>
          ) : (
            <>
              <View style={styles.listCard}>
                {paginatedSources.map((item, idx) => (
                  <View key={item.id}>
                    {idx > 0 && <View style={styles.divider} />}
                    <View style={styles.row}>
                      <View style={styles.rowInfo}>
                        <Text style={styles.rowName}>{item.name}</Text>
                        <Text style={styles.rowMeta}>
                          ${parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} • {item.rrule || 'Regular'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleArchive(item.id, item.name)}
                        style={styles.archiveBtn}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.archiveText}>{t('common.archive')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              {totalItems >= 5 && (
                <MobilePaginationBar
                  page={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={totalItems}
                  pageSizeOptions={[10, 20, 50]}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              )}
            </>
          )}
        </View>

        {/* Add New Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.income.addSchedule')}</Text>
          <View style={styles.formCard}>
            <MobileInput
              label={t('settings.income.scheduleName')}
              required
              placeholder={t('settings.income.scheduleNamePlaceholder')}
              value={name}
              onChangeText={setName}
            />

            <AmountInput
              label={t('common.amount')}
              required
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
            />

            <MobileDatePickerField
              label={t('setup.income.firstPayDate')}
              value={startDate}
              onChange={setStartDate}
              required
            />

            <Text style={[styles.label, styles.gap]}>{t('common.frequency')}</Text>
            <View style={styles.optionRow}>
              {FREQUENCIES.map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[styles.optionBtn, frequency === freq && styles.optionBtnActive]}
                  onPress={() => setFrequency(freq)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optionText, frequency === freq && styles.optionTextActive]}>
                    {FREQ_LABELS[freq]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, styles.gap]}>{t('common.type')}</Text>
            <View style={styles.optionRow}>
              {INCOME_TYPES.map((tVal) => (
                <TouchableOpacity
                  key={tVal}
                  style={[styles.optionBtn, type === tVal && styles.optionBtnActive]}
                  onPress={() => setType(tVal)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optionText, type === tVal && styles.optionTextActive]}>
                    {INCOME_TYPE_LABELS[tVal]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.addBtn, adding && styles.btnDisabled]}
              onPress={handleAdd}
              disabled={adding}
              activeOpacity={0.8}
            >
              {adding ? (
                <ActivityIndicator color={DESIGN_TOKENS.colors.onAccent} />
              ) : (
                <Text style={styles.addBtnText}>{t('settings.income.addSchedule')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: DESIGN_TOKENS.spacing.containerMargin,
    paddingTop: 12,
    paddingBottom: 48,
    gap: 20,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2B4B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardEmpty: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  rowMeta: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  archiveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  archiveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gap: {
    marginTop: 6,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  optionBtnActive: {
    borderColor: '#2563eb',
    backgroundColor: '#EFF6FF',
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  optionTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  addBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
