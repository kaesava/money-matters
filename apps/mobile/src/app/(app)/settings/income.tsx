import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui';
import { trpc } from '../../../lib/trpc';

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

  const [name, setName] = useState('');
  const [type, setType] = useState<IncomeType>('SALARY');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('FORTNIGHTLY');
  const [adding, setAdding] = useState(false);

  // Queries & Mutations
  const { data: incomeSources, isLoading, refetch } = trpc.listIncomeSources.useQuery();
  const createSource = trpc.createIncomeSource.useMutation();
  const createSchedule = trpc.createIncomeSourceSchedule.useMutation();
  const archiveSource = trpc.archiveIncomeSource.useMutation();

  const handleAdd = async () => {
    if (!name.trim() || !amount.trim()) return;
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      Alert.alert("Invalid Amount", "Please enter a valid numeric amount.");
      return;
    }
    setAdding(true);
    try {
      const rrule = frequency === 'WEEKLY'
        ? 'FREQ=WEEKLY'
        : frequency === 'FORTNIGHTLY'
        ? 'FREQ=WEEKLY;INTERVAL=2'
        : 'FREQ=MONTHLY';

      const source = await createSource.mutateAsync({
        name: name.trim(),
        type,
        amount: numericAmount.toFixed(2),
      });

      await createSchedule.mutateAsync({
        incomeSourceId: source.id,
        rrule,
        startDate: new Date().toISOString().split('T')[0]!,
      });

      setName('');
      setAmount('');
      refetch();
      Alert.alert("Success", "Income stream added successfully.");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to add income stream.");
    } finally {
      setAdding(false);
    }
  };

  const handleArchive = (id: string, name: string) => {
    Alert.alert(
      "Archive Income Source",
      `Are you sure you want to archive "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            try {
              await archiveSource.mutateAsync({ id });
              refetch();
              Alert.alert("Success", "Income stream archived.");
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "Failed to archive.");
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Income Streams</Text>
        <Text style={styles.subtitle}>Manage recurring paychecks and incoming cash flows.</Text>
      </View>

      {/* Existing Income Sources */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Income Streams</Text>
        {isLoading ? (
          <ActivityIndicator color={DESIGN_TOKENS.colors.accent} style={{ marginVertical: 12 }} />
        ) : !incomeSources || incomeSources.length === 0 ? (
          <View style={styles.cardEmpty}>
            <Text style={styles.emptyText}>No active income streams registered.</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {incomeSources.map((item, idx) => (
              <View key={item.id}>
                {idx > 0 && <View style={styles.divider} />}
                <View style={styles.row}>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName}>{item.name}</Text>
                    <Text style={styles.rowMeta}>
                      {item.type} • ${parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleArchive(item.id, item.name)}
                    style={styles.archiveBtn}
                  >
                    <Text style={styles.archiveText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Add New Form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add Income Stream</Text>
        <View style={styles.formCard}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Fortnightly Salary"
            value={name}
            onChangeText={setName}
            placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
          />

          <Text style={[styles.label, styles.gap]}>Amount (Net)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2400.00"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
          />

          <Text style={[styles.label, styles.gap]}>Frequency</Text>
          <View style={styles.optionRow}>
            {FREQUENCIES.map((freq) => (
              <TouchableOpacity
                key={freq}
                style={[styles.optionBtn, frequency === freq && styles.optionBtnActive]}
                onPress={() => setFrequency(freq)}
              >
                <Text style={[styles.optionText, frequency === freq && styles.optionTextActive]}>
                  {FREQ_LABELS[freq]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, styles.gap]}>Source Type</Text>
          <View style={styles.optionRow}>
            {INCOME_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.optionBtn, type === t && styles.optionBtnActive]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.optionText, type === t && styles.optionTextActive]}>
                  {INCOME_TYPE_LABELS[t]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.addBtn, adding && styles.btnDisabled]}
            onPress={handleAdd}
            disabled={adding}
          >
            {adding ? (
              <ActivityIndicator color={DESIGN_TOKENS.colors.onAccent} />
            ) : (
              <Text style={styles.addBtnText}>Add Income Stream</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: DESIGN_TOKENS.spacing.containerMargin,
    paddingTop: 64,
    paddingBottom: 48,
    backgroundColor: DESIGN_TOKENS.colors.background,
  },
  header: {
    marginBottom: 24,
  },
  backBtn: {
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: DESIGN_TOKENS.colors.accent,
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
  subtitle: {
    fontSize: 14,
    color: DESIGN_TOKENS.colors.textMuted,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: DESIGN_TOKENS.colors.textMuted,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  listCard: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  rowMeta: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.textMuted,
    marginTop: 2,
  },
  archiveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: DESIGN_TOKENS.radius.sm,
  },
  archiveText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  cardEmpty: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: DESIGN_TOKENS.colors.textMuted,
    fontSize: 14,
  },
  formCard: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textPrimary,
    marginBottom: 6,
  },
  gap: {
    marginTop: 16,
  },
  input: {
    backgroundColor: DESIGN_TOKENS.colors.background,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionBtn: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.colors.background,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  optionBtnActive: {
    backgroundColor: DESIGN_TOKENS.colors.accent,
    borderColor: DESIGN_TOKENS.colors.accent,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  optionTextActive: {
    color: DESIGN_TOKENS.colors.onAccent,
  },
  addBtn: {
    backgroundColor: DESIGN_TOKENS.colors.accent,
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  addBtnText: {
    color: DESIGN_TOKENS.colors.onAccent,
    fontSize: 15,
    fontWeight: '700',
  },
});
