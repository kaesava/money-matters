import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui';
import { formatAUD } from '../../lib/format';

export interface PaycheckEventSectionProps {
  incomeEvents: any[];
  expenseEvents: any[];
  onOpenPaydayWizard: (eventId: string) => void;
  onEditUpcomingExpense: (event: any) => void;
  onMarkExpensePaid: (eventId: string, amount: number) => void;
}

export const PaycheckEventSection: React.FC<PaycheckEventSectionProps> = ({
  incomeEvents,
  expenseEvents,
  onOpenPaydayWizard,
  onEditUpcomingExpense,
  onMarkExpensePaid,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>UPCOMING PAYDAYS</Text>
      {incomeEvents.length === 0 ? (
        <Text style={styles.emptyText}>No upcoming paydays scheduled.</Text>
      ) : (
        incomeEvents.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.name || 'Paycheck'}</Text>
              <Text style={styles.cardAmount}>{formatAUD(item.expectedAmount)}</Text>
            </View>
            <Text style={styles.cardDate}>
              Due: {new Date(item.expectedDate).toLocaleDateString('en-AU')}
            </Text>
            <TouchableOpacity
              style={styles.processBtn}
              onPress={() => onOpenPaydayWizard(item.id)}
            >
              <Feather name="play" size={14} color="#FFF" />
              <Text style={styles.processBtnText}>Run Payday Waterfall Split</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <Text style={[styles.sectionHeader, { marginTop: 24 }]}>UPCOMING BILLS & EXPENSES</Text>
      {expenseEvents.length === 0 ? (
        <Text style={styles.emptyText}>No upcoming bills scheduled.</Text>
      ) : (
        expenseEvents.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.name || 'Expense'}</Text>
              <Text style={styles.cardAmount}>{formatAUD(item.expectedAmount)}</Text>
            </View>
            <Text style={styles.cardDate}>
              Due: {new Date(item.expectedDate).toLocaleDateString('en-AU')}
            </Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => onEditUpcomingExpense(item)}
              >
                <Feather name="edit-2" size={12} color={DESIGN_TOKENS.colors.primary} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.payBtn}
                onPress={() => onMarkExpensePaid(item.id, item.expectedAmount)}
              >
                <Feather name="check" size={12} color="#FFF" />
                <Text style={styles.payBtnText}>Mark Paid</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.text,
  },
  cardAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.text,
  },
  cardDate: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    marginBottom: 10,
  },
  processBtn: {
    backgroundColor: DESIGN_TOKENS.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  processBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editBtnText: {
    color: DESIGN_TOKENS.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  payBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  payBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
