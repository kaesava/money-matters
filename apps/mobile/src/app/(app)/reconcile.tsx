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
import { DESIGN_TOKENS } from '@money-matters/ui';
import { trpc } from '../../lib/trpc';
import { t } from '@money-matters/i18n';

export default function ReconcileScreen() {
  const { data: tenant, isLoading: loadingTenant, refetch: refetchTenant } = trpc.getTenant.useQuery();
  const { data: categories = [], isLoading: loadingCats, refetch: refetchCats } = trpc.listCategories.useQuery();

  const submitReconciliation = trpc.submitReconciliation.useMutation();

  const [balances, setBalances] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const isLoading = loadingTenant || loadingCats;

  const handleReconcile = async (accountId: string, currentBalance: string) => {
    const val = balances[accountId] ?? currentBalance;
    const actual = parseFloat(val);
    if (isNaN(actual) || actual < 0) {
      Alert.alert("Invalid input", "Please enter a valid balance.");
      return;
    }

    setSaving((prev) => ({ ...prev, [accountId]: true }));
    try {
      const res = await submitReconciliation.mutateAsync({
        bankAccountId: accountId,
        actualBalance: actual.toFixed(2),
      });

      Alert.alert("Success", `Reconciliation recorded. Delta is $${res.delta}`);
      refetchTenant();
      refetchCats();
    } catch (err) {
      Alert.alert("Error", "Failed to submit reconciliation.");
      console.error(err);
    } finally {
      setSaving((prev) => ({ ...prev, [accountId]: false }));
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={DESIGN_TOKENS.colors.accent} />
      </View>
    );
  }

  const bankAccounts = tenant?.bankAccounts ?? [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerTitle}>Reconcile Accounts</Text>
      <Text style={styles.headerSubtitle}>
        Verify and match actual bank account balances with category allocations.
      </Text>

      {bankAccounts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🏦</Text>
          <Text style={styles.emptyText}>No registered bank accounts found.</Text>
        </View>
      ) : (
        bankAccounts.map((account) => {
          const mappedCats = categories.filter((c) => c.bankAccountId === account.id);
          const expected = mappedCats.reduce((sum, c) => sum + parseFloat(c.currentBalance), 0);

          const inputVal = balances[account.id] ?? account.lastKnownBalance;
          const actual = parseFloat(inputVal) || 0;
          const delta = actual - expected;

          const isSaving = saving[account.id] ?? false;

          return (
            <View key={account.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.accountName}>{account.name}</Text>
                <Text style={styles.purposeLabel}>{account.purpose.join(" / ")}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Expected Balance</Text>
                <Text style={styles.value}>${expected.toFixed(2)}</Text>
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.label}>Actual Balance</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={balances[account.id] !== undefined ? balances[account.id] : account.lastKnownBalance}
                  onChangeText={(text) => setBalances({ ...balances, [account.id]: text })}
                />
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Difference (Delta)</Text>
                <Text style={[styles.deltaText, delta === 0 ? styles.deltaZero : delta > 0 ? styles.deltaPositive : styles.deltaNegative]}>
                  {delta >= 0 ? `+$${delta.toFixed(2)}` : `-$${Math.abs(delta).toFixed(2)}`}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.btn, isSaving && styles.btnDisabled]}
                onPress={() => handleReconcile(account.id, account.lastKnownBalance)}
                disabled={isSaving}
              >
                <Text style={styles.btnText}>
                  {isSaving ? "Saving..." : "Confirm & Save Audit"}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 64, paddingBottom: 40, backgroundColor: D.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: D.colors.primary, marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: D.colors.textMuted, lineHeight: 18, marginBottom: 24 },
  empty: { padding: 32, alignItems: 'center', backgroundColor: D.colors.surface, borderRadius: D.radius.lg, borderStyle: 'solid', borderWidth: 1, borderColor: '#F3F4F6' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 14, color: D.colors.textMuted, fontWeight: '600' },
  card: { backgroundColor: D.colors.surface, borderRadius: D.radius.lg, padding: 16, marginBottom: 16, borderStyle: 'solid', borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8 },
  cardHeader: { marginBottom: 16 },
  accountName: { fontSize: 16, fontWeight: '700', color: D.colors.primary },
  purposeLabel: { fontSize: 10, color: D.colors.textMuted, marginTop: 4, fontWeight: '700', textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { fontSize: 13, color: D.colors.textMuted, fontWeight: '500' },
  value: { fontSize: 14, color: D.colors.textPrimary, fontWeight: '700' },
  input: { borderStyle: 'solid', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: D.radius.md, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, minWidth: 100, textAlign: 'right', backgroundColor: '#FAFAFA' },
  deltaText: { fontSize: 14, fontWeight: '800' },
  deltaZero: { color: '#10B981' },
  deltaPositive: { color: '#10B981' },
  deltaNegative: { color: '#EF4444' },
  btn: { backgroundColor: D.colors.accent, borderRadius: D.radius.md, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: D.colors.onAccent, fontWeight: '700', fontSize: 13 },
});
