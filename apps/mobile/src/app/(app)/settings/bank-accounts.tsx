import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { t } from "@money-matters/i18n";
import { DESIGN_TOKENS, MobileScreenWrapper } from "@money-matters/ui/mobile";
import { trpc } from "../../../lib/trpc";

export default function BankAccountsScreen() {
  const router = useRouter();
  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery();
  const updateMappingsMut = trpc.updateBankAccountMappings.useMutation({
    onSuccess: () => bankAccountsQuery.refetch(),
  });
  const createAccountMut = trpc.createBankAccount.useMutation({
    onSuccess: () => {
      bankAccountsQuery.refetch();
      setNewAccountName("");
      setNewAccountBalance("0.00");
      setShowAddForm(false);
    },
  });
  const archiveAccountMut = trpc.archiveBankAccount.useMutation({
    onSuccess: () => bankAccountsQuery.refetch(),
    onError: (err) => Alert.alert("Error", err.message),
  });

  const importCsvMut = trpc.parseCsv.useMutation({
    onSuccess: (res: { transactions: Array<{ date: string; amount: string; description: string }> }) => {
      bankAccountsQuery.refetch();
      Alert.alert(
        "CSV Statement Parsed Successfully",
        `Parsed ${res.transactions.length} transactions from bank statement.`
      );
    },
    onError: (err: { message: string }) => Alert.alert("Import Failed", err.message),
  });



  const [showAddForm, setShowAddForm] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountBalance, setNewAccountBalance] = useState("0.00");
  const [importingCsv, setImportingCsv] = useState(false);

  const handlePickAndUploadCsv = async () => {
    try {
      const DocumentPicker = require("expo-document-picker");
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "application/csv"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setImportingCsv(true);
        const FileSystem = require("expo-file-system");
        const fileContent = await FileSystem.readAsStringAsync(file.uri);
        const targetAccountId = accounts[0]?.id;
        if (!targetAccountId) {
          Alert.alert("Account Required", "Please create a bank account first before importing CSV statements.");
          return;
        }
        await importCsvMut.mutateAsync({
          csvText: fileContent,
        });

      }
    } catch (err) {
      Alert.alert("File Selection Error", err instanceof Error ? err.message : "Failed to read CSV file.");
    } finally {
      setImportingCsv(false);
    }
  };


  if (bankAccountsQuery.isLoading) {
    return (
      <MobileScreenWrapper>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={DESIGN_TOKENS.colors.accent} />
        </View>
      </MobileScreenWrapper>
    );
  }

  const accounts = bankAccountsQuery.data || [];

  const handleCategoryTypeChange = (type: "EVERYDAY" | "REGULAR" | "GOAL", targetAccountId: string) => {
    const currentMappings = [
      { categoryType: "EVERYDAY" as const, bankAccountId: accounts.find(a => a.categoryTypes.includes("EVERYDAY"))?.id || accounts[0]?.id },
      { categoryType: "REGULAR" as const, bankAccountId: accounts.find(a => a.categoryTypes.includes("REGULAR"))?.id || accounts[0]?.id },
      { categoryType: "GOAL" as const, bankAccountId: accounts.find(a => a.categoryTypes.includes("GOAL"))?.id || accounts[0]?.id },
    ];

    const updated = currentMappings.map((m) =>
      m.categoryType === type ? { ...m, bankAccountId: targetAccountId } : m
    );

    updateMappingsMut.mutate({ mappings: updated });
  };

  const handleCreateAccount = () => {
    if (!newAccountName.trim()) return;
    createAccountMut.mutate({
      name: newAccountName.trim(),
      lastKnownBalance: newAccountBalance.trim() || "0.00",
      unbudgetedBuffer: "0.00",
    });
  };

  return (
    <MobileScreenWrapper>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>{t("settings.bankAccounts.title")}</Text>
        </View>

        {/* Matrix Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("settings.bankAccounts.linkedTypes")}</Text>
          <Text style={styles.cardDesc}>{t("settings.bankAccounts.linkedTypesDesc")}</Text>

          {[
            { key: "EVERYDAY" as const, label: t("settings.bankAccounts.everyday"), color: "#10B981" },
            { key: "REGULAR" as const, label: t("settings.bankAccounts.regular"), color: "#3B82F6" },
            { key: "GOAL" as const, label: t("settings.bankAccounts.goal"), color: "#6366F1" },
          ].map((typeItem) => {
            const currentAcc = accounts.find((a) => a.categoryTypes.includes(typeItem.key));
            return (
              <View key={typeItem.key} style={styles.mappingRow}>
                <Text style={[styles.mappingLabel, { color: typeItem.color }]}>{typeItem.label}</Text>
                <View style={{ gap: 4 }}>
                  {accounts.map((acc) => {
                    const isSelected = currentAcc?.id === acc.id;
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        onPress={() => handleCategoryTypeChange(typeItem.key, acc.id)}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                          {acc.name} (${parseFloat(acc.lastKnownBalance || "0").toFixed(2)})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        {/* Accounts List */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <Text style={styles.sectionHeader}>Accounts ({accounts.length})</Text>
          <TouchableOpacity onPress={() => setShowAddForm(true)} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ {t("settings.bankAccounts.addAccount")}</Text>
          </TouchableOpacity>
        </View>

        {showAddForm && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("settings.bankAccounts.addAccount")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("settings.bankAccounts.accountNamePlaceholder")}
              placeholderTextColor="#9CA3AF"
              value={newAccountName}
              onChangeText={setNewAccountName}
            />
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={newAccountBalance}
              onChangeText={setNewAccountBalance}
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <TouchableOpacity onPress={() => setShowAddForm(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateAccount} style={styles.submitBtn}>
                <Text style={styles.submitBtnText}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {accounts.map((acc) => (
          <View key={acc.id} style={styles.accountCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountName}>{acc.name}</Text>
              <Text style={styles.accountBalance}>
                ${parseFloat(acc.lastKnownBalance || "0").toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  t("settings.bankAccounts.deleteConfirmTitle"),
                  t("settings.bankAccounts.deleteConfirmBody", { name: acc.name }),
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => archiveAccountMut.mutate({ accountId: acc.id }),
                    },
                  ]
                )
              }
            >
              <Text style={{ fontSize: 16 }}>🗑️</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Bank CSV Import Section */}
        <View style={styles.csvCard}>
          <Text style={styles.cardTitle}>📄 Big 4 Bank CSV Statement Import</Text>
          <Text style={styles.cardDesc}>
            Import statement CSV files directly from CBA, Westpac, ANZ, NAB, ING, or Macquarie.
          </Text>
          <TouchableOpacity style={styles.csvBtn} onPress={handlePickAndUploadCsv} disabled={importingCsv}>
            <Text style={styles.csvBtnText}>
              {importingCsv ? "Parsing & Deduplicating CSV..." : "📁 Pick Bank CSV File"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  backBtn: { padding: 8, borderRadius: 8, backgroundColor: DESIGN_TOKENS.colors.surfaceVariant },
  backBtnText: { fontSize: 16, color: DESIGN_TOKENS.colors.textPrimary },
  screenTitle: { fontSize: 20, fontWeight: "700", color: DESIGN_TOKENS.colors.textPrimary },
  card: { backgroundColor: DESIGN_TOKENS.colors.surface, padding: 16, borderRadius: 16, borderBottomWidth: 1, borderColor: DESIGN_TOKENS.colors.border, gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: DESIGN_TOKENS.colors.textPrimary },
  cardDesc: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted },
  mappingRow: { borderTopWidth: 1, borderColor: DESIGN_TOKENS.colors.border, paddingTop: 8, gap: 6 },
  mappingLabel: { fontSize: 12, fontWeight: "700" },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: DESIGN_TOKENS.colors.surfaceVariant, alignSelf: "flex-start" },
  chipSelected: { backgroundColor: DESIGN_TOKENS.colors.accent },
  chipText: { fontSize: 12, color: DESIGN_TOKENS.colors.textPrimary, fontWeight: "600" },
  chipTextSelected: { color: "#FFFFFF" },
  sectionHeader: { fontSize: 12, fontWeight: "700", color: DESIGN_TOKENS.colors.textMuted, textTransform: "uppercase" },
  addBtn: { backgroundColor: DESIGN_TOKENS.colors.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: DESIGN_TOKENS.colors.border, borderRadius: 8, padding: 10, fontSize: 14, color: DESIGN_TOKENS.colors.textPrimary },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  cancelBtnText: { fontSize: 12, fontWeight: "600", color: DESIGN_TOKENS.colors.textMuted },
  submitBtn: { backgroundColor: DESIGN_TOKENS.colors.accent, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  submitBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  accountCard: { backgroundColor: DESIGN_TOKENS.colors.surface, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  accountName: { fontSize: 14, fontWeight: "700", color: DESIGN_TOKENS.colors.textPrimary },
  accountBalance: { fontSize: 12, fontWeight: "700", color: DESIGN_TOKENS.colors.success },
  csvCard: { backgroundColor: DESIGN_TOKENS.colors.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.border, marginTop: 12, gap: 10 },
  csvBtn: { backgroundColor: DESIGN_TOKENS.colors.accent, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  csvBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});

