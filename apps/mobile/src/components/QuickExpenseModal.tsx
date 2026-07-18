import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { DESIGN_TOKENS } from "@money-matters/ui";
import { t } from "@money-matters/i18n";
import { trpc } from "../lib/trpc";

interface QuickExpenseModalProps {
  visible: boolean;
  onClose: () => void;
}

export function QuickExpenseModal({ visible, onClose }: QuickExpenseModalProps) {
  const [amount, setAmount] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const D = DESIGN_TOKENS;

  // Fetch categories to populate dropdown
  const { data: categories, isLoading: categoriesLoading } = trpc.listCategories.useQuery();
  const recordExpenseMutation = trpc.recordExpense.useMutation();

  const handleRecord = async () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert(t("common.error"), "Please enter a valid amount.");
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert(t("common.error"), "Please select a category.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await recordExpenseMutation.mutateAsync({
        categoryId: selectedCategoryId,
        amount: parseFloat(amount).toFixed(2),
        note: note.trim() || undefined,
        idempotencyKey: (typeof crypto !== 'undefined' && crypto.randomUUID) 
          ? crypto.randomUUID() 
          : Math.random().toString(36).substring(2) + Date.now().toString(36),
      });

      // Clear input fields
      setAmount("");
      setSelectedCategoryId("");
      setNote("");

      onClose();

      // Check if the transaction led to a shortfall
      // In the database model, recordExpense returns the ledger entry. We can check the category balance.
      // Refetch categories to update the dashboard balances
      Alert.alert("Success", "Expense recorded successfully!");
    } catch (err) {
      Alert.alert(
        t("common.error"),
        err instanceof Error ? err.message : "Failed to record expense"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = categories?.find((c) => c.id === selectedCategoryId);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t("transactions.newExpense.title")}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={D.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {categoriesLoading ? (
            <ActivityIndicator color={D.colors.accent} style={{ marginVertical: 40 }} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
              {/* Amount Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("transactions.newExpense.amountLabel")}</Text>
                <View style={styles.amountInputWrap}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={setAmount}
                    placeholderTextColor={D.colors.textMuted}
                  />
                </View>
              </View>

              {/* Category Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("transactions.newExpense.categoryLabel")}</Text>
                <Text style={styles.subLabel}>Tap to select a category</Text>
                <View style={styles.categoriesGrid}>
                  {categories?.map((cat) => {
                    const isSelected = cat.id === selectedCategoryId;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryCard,
                          isSelected && { borderColor: D.colors.accent, backgroundColor: "rgba(0,180,166,0.06)" },
                        ]}
                        onPress={() => setSelectedCategoryId(cat.id)}
                      >
                        <Text style={styles.categoryName} numberOfLines={1}>
                          {cat.name}
                        </Text>
                        <Text style={styles.categoryBalance} numberOfLines={1}>
                          ${parseFloat(cat.currentBalance).toFixed(0)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Note Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("transactions.newExpense.noteLabel")}</Text>
                <TextInput
                  style={styles.noteInput}
                  placeholder={t("transactions.newExpense.notePlaceholder")}
                  value={note}
                  onChangeText={setNote}
                  placeholderTextColor={D.colors.textMuted}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: D.colors.accent }]}
                onPress={handleRecord}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>{t("transactions.newExpense.submitCta")}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(27, 43, 75, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: DESIGN_TOKENS.colors.primary,
  },
  closeBtn: {
    padding: 4,
  },
  form: {
    padding: 20,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: DESIGN_TOKENS.colors.textMuted,
  },
  subLabel: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
  },
  amountInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingHorizontal: 16,
    height: 56,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: "600",
    color: DESIGN_TOKENS.colors.textPrimary,
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "600",
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  categoryCard: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: DESIGN_TOKENS.radius.md,
    padding: 12,
    gap: 4,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: "600",
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  categoryBalance: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 14,
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  submitBtn: {
    height: 52,
    borderRadius: DESIGN_TOKENS.radius.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#00B4A6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
