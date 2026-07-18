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
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { DESIGN_TOKENS } from '@money-matters/ui';
import { trpc } from '../../../lib/trpc';

const PURPOSES = ['INCOME_LANDING', 'SAVINGS', 'EVERYDAY'] as const;
type Purpose = (typeof PURPOSES)[number];

const PURPOSE_LABELS: Record<Purpose, string> = {
  INCOME_LANDING: 'Income Landing',
  SAVINGS: 'Savings / Bills',
  EVERYDAY: 'Everyday Spending',
};

export default function SettingsBankAccountsScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState<Purpose>('SAVINGS');
  const [balance, setBalance] = useState('');
  const [isOffset, setIsOffset] = useState(false);
  const [adding, setAdding] = useState(false);

  // Queries & Mutations
  const { data: tenant, isLoading, refetch } = trpc.getTenant.useQuery();
  const createBankAccount = trpc.createBankAccount.useMutation();
  const archiveBankAccount = trpc.archiveBankAccount.useMutation();

  const handleAdd = async () => {
    if (!name.trim()) return;

    let numBalance = 0;
    if (balance.trim()) {
      const parsedBalance = parseFloat(balance);
      if (isNaN(parsedBalance)) {
        Alert.alert("Invalid Balance", "Please enter a valid numeric value for the balance.");
        return;
      }
      numBalance = parsedBalance;
    }

    setAdding(true);
    try {
      await createBankAccount.mutateAsync({
        name: name.trim(),
        purpose: [purpose],
        lastKnownBalance: numBalance.toFixed(2),
        isOffset,
      });

      setName('');
      setBalance('');
      setIsOffset(false);
      refetch();
      Alert.alert("Success", "Bank account added successfully.");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to add bank account.");
    } finally {
      setAdding(false);
    }
  };

  const handleArchive = (accountId: string, name: string) => {
    Alert.alert(
      "Archive Bank Account",
      `Are you sure you want to archive the bank account "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            try {
              await archiveBankAccount.mutateAsync({ accountId });
              refetch();
              Alert.alert("Success", "Bank account archived.");
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "Failed to archive account.");
            }
          }
        }
      ]
    );
  };

  const accounts = tenant?.bankAccounts || [];

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Bank Accounts</Text>
        <Text style={styles.subtitle}>Register and update accounts used for paycheck distributions.</Text>
      </View>

      {/* Current Accounts List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Accounts</Text>
        {isLoading ? (
          <ActivityIndicator color={DESIGN_TOKENS.colors.accent} style={{ marginVertical: 12 }} />
        ) : accounts.length === 0 ? (
          <View style={styles.cardEmpty}>
            <Text style={styles.emptyText}>No bank accounts registered.</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {accounts.map((acc, idx) => (
              <View key={acc.id}>
                {idx > 0 && <View style={styles.divider} />}
                <View style={styles.row}>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName}>{acc.name}</Text>
                    <Text style={styles.rowMeta}>
                      {PURPOSE_LABELS[acc.purpose[0] as Purpose]}
                      {acc.isOffset ? ' (Offset)' : ''} • ${parseFloat(acc.lastKnownBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleArchive(acc.id, acc.name)}
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

      {/* Add New Bank Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add Bank Account</Text>
        <View style={styles.formCard}>
          <Text style={styles.label}>Account Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Commonwealth Offset"
            value={name}
            onChangeText={setName}
            placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
          />

          <Text style={[styles.label, styles.gap]}>Account Purpose</Text>
          <View style={styles.optionRow}>
            {PURPOSES.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.optionBtn, purpose === p && styles.optionBtnActive]}
                onPress={() => setPurpose(p)}
              >
                <Text style={[styles.optionText, purpose === p && styles.optionTextActive]}>
                  {PURPOSE_LABELS[p]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, styles.gap]}>Starting Balance</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            keyboardType="numeric"
            value={balance}
            onChangeText={setBalance}
            placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
          />

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Is Offset Account</Text>
              <Text style={styles.switchSublabel}>Connects to a mortgage home loan</Text>
            </View>
            <Switch
              value={isOffset}
              onValueChange={setIsOffset}
              trackColor={{ false: '#D1D5DB', true: DESIGN_TOKENS.colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>

          <TouchableOpacity
            style={[styles.addBtn, adding && styles.btnDisabled]}
            onPress={handleAdd}
            disabled={adding}
          >
            {adding ? (
              <ActivityIndicator color={DESIGN_TOKENS.colors.onAccent} />
            ) : (
              <Text style={styles.addBtnText}>Add Bank Account</Text>
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
    flexDirection: 'column',
    gap: 8,
  },
  optionBtn: {
    width: '100%',
    backgroundColor: DESIGN_TOKENS.colors.background,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingVertical: 12,
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  switchSublabel: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    marginTop: 2,
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
