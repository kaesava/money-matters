import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  MobileModalDialog,
  AmountInput,
  MobileDatePickerField,
  showMobileConfirm,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD, formatDate, formatIsoDate } from '../../lib/format';

export interface BurstSourceItem {
  id: string;
  name: string;
  amount: string | number;
  rrule?: string | null;
  startDate?: string | null;
  categoryName?: string;
  accountName?: string;
}

export interface BurstEventItem {
  id: string;
  expectedDate: string;
  expectedAmount: string;
  actualAmount?: string | null;
  status: string;
  incomeSourceId?: string | null;
  expenseSourceId?: string | null;
  name?: string | null;
  note?: string | null;
}

export interface MobileBurstModalProps {
  visible: boolean;
  mode: 'INCOME' | 'EXPENSE';
  source: BurstSourceItem | null;
  events: BurstEventItem[];
  onClose: () => void;
  onEditSchedule: (source: BurstSourceItem) => void;
  onArchiveSchedule: (source: BurstSourceItem) => void;
  onMarkPaid: (eventId: string, amount: string, date: string) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
  onUpdateEvent: (eventId: string, amount: string, date: string) => Promise<void>;
}

function parseFrequencyLabel(rrule?: string | null): string {
  if (!rrule) return t('forms.oneOff');
  const r = rrule.toUpperCase();
  if (r.includes('FREQ=WEEKLY') && r.includes('INTERVAL=2')) return t('forms.fortnightly') || 'Fortnightly';
  if (r.includes('FREQ=WEEKLY')) return t('forms.weekly') || 'Weekly';
  if (r.includes('FREQ=MONTHLY')) return t('forms.monthly') || 'Monthly';
  if (r.includes('FREQ=YEARLY') || r.includes('ANNUALLY')) return t('forms.yearly') || 'Annually';
  return t('forms.recurring');
}

export function MobileBurstModal({
  visible,
  mode,
  source,
  events,
  onClose,
  onEditSchedule,
  onArchiveSchedule,
  onMarkPaid,
  onDeleteEvent,
  onUpdateEvent,
}: MobileBurstModalProps) {
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!visible || !source) return null;

  const todayStr = formatIsoDate(new Date());
  const freqLabel = parseFrequencyLabel(source.rrule);
  const isIncome = mode === 'INCOME';

  const sourceEvents = events.filter((e) =>
    isIncome ? e.incomeSourceId === source.id : e.expenseSourceId === source.id
  );

  const startEdit = (evt: BurstEventItem) => {
    setEditingEventId(evt.id);
    setEditAmount(parseFloat(evt.expectedAmount).toFixed(2));
    setEditDate(formatIsoDate(evt.expectedDate));
  };

  const cancelEdit = () => {
    setEditingEventId(null);
  };

  const handleSaveEdit = async (evtId: string) => {
    try {
      setSubmitting(true);
      await onUpdateEvent(evtId, editAmount, editDate);
      setEditingEventId(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleActionMarkPaid = async (evt: BurstEventItem) => {
    try {
      setSubmitting(true);
      const amt = editingEventId === evt.id ? editAmount : evt.expectedAmount;
      const dt = editingEventId === evt.id ? editDate : evt.expectedDate;
      await onMarkPaid(evt.id, parseFloat(amt).toFixed(2), dt);
      setEditingEventId(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOccurrence = (evtId: string) => {
    showMobileConfirm({
      title: isIncome ? t('common.deleteIncomeTitle') : t('common.deleteExpenseTitle'),
      message: isIncome ? t('paydayDrawer.deleteDescription') : t('common.confirmDeleteDescription'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      isDestructive: true,
      onConfirm: async () => {
        try {
          setSubmitting(true);
          await onDeleteEvent(evtId);
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const handleArchive = () => {
    showMobileConfirm({
      title: isIncome ? t('settings.income.archiveConfirmTitle') : t('common.archive'),
      message: t('settings.income.archiveConfirmMessage', { name: source.name }),
      confirmText: t('common.archive'),
      cancelText: t('common.cancel'),
      isDestructive: true,
      onConfirm: () => {
        onArchiveSchedule(source);
        onClose();
      },
    });
  };

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={source.name}
      subtitle={`${freqLabel} • ${isIncome ? '+' : '−'}${formatAUD(parseFloat(String(source.amount)))}`}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Source Meta Header Card */}
        <View style={styles.sourceMetaCard}>
          <View style={styles.metaRow}>
            <View style={styles.badgeWrap}>
              <Text style={[styles.freqBadgeText, isIncome ? styles.incomeBadge : styles.expenseBadge]}>
                {freqLabel}
              </Text>
            </View>
            <Text style={[styles.amountText, isIncome ? styles.incomeText : styles.expenseText]}>
              {isIncome ? '+' : '−'}{formatAUD(parseFloat(String(source.amount)))}
            </Text>
          </View>

          <View style={styles.detailsRow}>
            {source.startDate && (
              <Text style={styles.metaSubtext}>
                {t('common.date')}: {formatDate(source.startDate)}
              </Text>
            )}
            {isIncome && source.accountName && (
              <Text style={styles.metaSubtext}>
                🏦 {source.accountName}
              </Text>
            )}
            {!isIncome && source.categoryName && (
              <Text style={styles.metaSubtext}>
                📁 {source.categoryName}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.editScheduleBtn}
            onPress={() => {
              onClose();
              onEditSchedule(source);
            }}
          >
            <Feather name="edit-2" size={13} color="#2563eb" />
            <Text style={styles.editScheduleText}>
              {isIncome ? t('incomeAndBills.incomeSchedule') : t('incomeAndBills.billSchedule')} {t('common.edit')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Occurrences List */}
        <View style={styles.occurrencesSection}>
          <Text style={styles.sectionTitle}>
            {isIncome ? t('matrix.incomeAllocationGridTitle') : t('incomeBillsTabs.upcomingTimeline')} ({sourceEvents.length})
          </Text>

          {sourceEvents.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{t('payday.noEventsForSource')}</Text>
            </View>
          ) : (
            <View style={styles.eventsList}>
              {sourceEvents.map((evt) => {
                const isPaid = evt.status === 'CONFIRMED';
                const isEditing = editingEventId === evt.id;
                const isFuture = evt.expectedDate > todayStr;
                const amtVal = parseFloat(evt.actualAmount || evt.expectedAmount || '0');

                return (
                  <View
                    key={evt.id}
                    style={[styles.eventItemCard, isPaid && styles.paidEventItemCard]}
                  >
                    <View style={styles.eventItemHeader}>
                      <View style={styles.dateCol}>
                        <View style={styles.statusIndicatorRow}>
                          <Text style={styles.statusDot}>{isPaid ? '✓' : '📅'}</Text>
                          <Text style={styles.eventDateText}>
                            {formatDate(evt.expectedDate)}
                          </Text>
                          {isPaid && (
                            <View style={styles.paidBadge}>
                              <Text style={styles.paidBadgeText}>
                                {t('expenseStatus.confirmedLabel')}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {!isEditing && (
                        <Text style={[styles.eventAmountText, isIncome ? styles.incomeText : styles.expenseText]}>
                          {isIncome ? '+' : '−'}{formatAUD(amtVal)}
                        </Text>
                      )}
                    </View>

                    {isEditing ? (
                      <View style={styles.editFormBox}>
                        <AmountInput
                          label={t('common.amount')}
                          required
                          value={editAmount}
                          onChangeText={setEditAmount}
                        />
                        <MobileDatePickerField
                          label={t('common.date')}
                          required
                          value={editDate}
                          onChange={setEditDate}
                        />

                        <View style={styles.editActionRow}>
                          <TouchableOpacity
                            style={styles.saveEditBtn}
                            onPress={() => handleSaveEdit(evt.id)}
                            disabled={submitting}
                          >
                            <Text style={styles.saveEditText}>{t('common.save')}</Text>
                          </TouchableOpacity>

                          {!isFuture && (
                            <TouchableOpacity
                              style={styles.markPaidConfirmBtn}
                              onPress={() => handleActionMarkPaid(evt)}
                              disabled={submitting}
                            >
                              <Text style={styles.markPaidConfirmText}>
                                {isIncome ? t('common.runSplit') : t('common.markSpent')}
                              </Text>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            style={styles.cancelEditBtn}
                            onPress={cancelEdit}
                            disabled={submitting}
                          >
                            <Text style={styles.cancelEditText}>{t('common.cancel')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      !isPaid && (
                        <View style={styles.itemActionRow}>
                          <TouchableOpacity
                            style={styles.actionBtnPrimary}
                            onPress={() => handleActionMarkPaid(evt)}
                            disabled={submitting}
                          >
                            <Feather name="check" size={12} color="#FFFFFF" />
                            <Text style={styles.actionBtnPrimaryText}>
                              {isIncome ? t('common.runSplit') : t('common.markSpent')}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.actionBtnOutline}
                            onPress={() => startEdit(evt)}
                            disabled={submitting}
                          >
                            <Feather name="edit-2" size={12} color="#475569" />
                            <Text style={styles.actionBtnOutlineText}>{t('common.edit')}</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.actionBtnDanger}
                            onPress={() => handleDeleteOccurrence(evt.id)}
                            disabled={submitting}
                          >
                            <Feather name="trash-2" size={12} color="#EF4444" />
                            <Text style={styles.actionBtnDangerText}>{t('common.delete')}</Text>
                          </TouchableOpacity>
                        </View>
                      )
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Inconspicuous Archive Schedule Link at bottom-left */}
        <View style={styles.footerRow}>
          <TouchableOpacity
            style={styles.archiveLink}
            onPress={handleArchive}
            disabled={submitting}
          >
            <Feather name="archive" size={13} color="#94A3B8" />
            <Text style={styles.archiveLinkText}>
              {t('common.archive')} {isIncome ? t('incomeAndBills.incomeSchedule') : t('incomeAndBills.billSchedule')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </MobileModalDialog>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  container: {
    gap: 14,
    paddingBottom: 10,
  },
  sourceMetaCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeWrap: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  freqBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  incomeBadge: { color: '#047857' },
  expenseBadge: { color: '#2563eb' },
  amountText: {
    fontSize: 17,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  incomeText: { color: '#047857' },
  expenseText: { color: '#DC2626' },
  detailsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  metaSubtext: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  editScheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
  },
  editScheduleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  occurrencesSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  emptyBox: {
    padding: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  eventsList: {
    gap: 8,
  },
  eventItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
  },
  paidEventItemCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  eventItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateCol: {
    flex: 1,
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    fontSize: 12,
  },
  eventDateText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  paidBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  paidBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
    textTransform: 'uppercase',
  },
  eventAmountText: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  itemActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#047857',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  actionBtnPrimaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  actionBtnOutlineText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  actionBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  actionBtnDangerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
  editFormBox: {
    gap: 8,
    paddingTop: 6,
  },
  editActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  saveEditBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveEditText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  markPaidConfirmBtn: {
    flex: 1,
    backgroundColor: '#047857',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  markPaidConfirmText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelEditBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelEditText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  footerRow: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 6,
  },
  archiveLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  archiveLinkText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
});
