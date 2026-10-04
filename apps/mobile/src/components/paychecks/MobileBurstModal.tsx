import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  MobileModalDialog,
  showMobileConfirm,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD, formatIsoDate } from '../../lib/format';
import { BurstSourceItem, BurstEventItem, parseFrequencyLabel } from './burst-types';
import { BurstSourceHeaderCard } from './BurstSourceHeaderCard';
import { BurstEventCard } from './BurstEventCard';

export type { BurstSourceItem, BurstEventItem };

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
        <BurstSourceHeaderCard
          source={source}
          freqLabel={freqLabel}
          isIncome={isIncome}
          onEditSchedule={() => {
            onClose();
            onEditSchedule(source);
          }}
        />

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
              {sourceEvents.map((evt) => (
                <BurstEventCard
                  key={evt.id}
                  evt={evt}
                  isIncome={isIncome}
                  isEditing={editingEventId === evt.id}
                  isFuture={evt.expectedDate > todayStr}
                  editAmount={editAmount}
                  editDate={editDate}
                  submitting={submitting}
                  onStartEdit={() => startEdit(evt)}
                  onCancelEdit={cancelEdit}
                  onEditAmountChange={setEditAmount}
                  onEditDateChange={setEditDate}
                  onSaveEdit={() => handleSaveEdit(evt.id)}
                  onMarkPaid={() => handleActionMarkPaid(evt)}
                  onDeleteOccurrence={() => handleDeleteOccurrence(evt.id)}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.footerRow}>
          <TouchableOpacity
            style={styles.archiveLink}
            onPress={handleArchive}
            disabled={submitting}
          >
            <Feather name="archive" size={13} color={DESIGN_TOKENS.colors.slate[400]} />
            <Text style={styles.archiveLinkText}>
              {t('common.archive')} {isIncome ? t('incomeAndBills.incomeSchedule') : t('incomeAndBills.billSchedule')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
    paddingBottom: 10,
  },
  occurrencesSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  emptyBox: {
    padding: 24,
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[400],
    textAlign: 'center',
  },
  eventsList: {
    gap: 8,
  },
  footerRow: {
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[100],
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
    color: DESIGN_TOKENS.colors.slate[400],
  },
});
