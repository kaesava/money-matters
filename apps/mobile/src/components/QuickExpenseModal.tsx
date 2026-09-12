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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { usePostHog } from "posthog-react-native";
import { DESIGN_TOKENS } from "@money-matters/ui/mobile";
import { t } from "@money-matters/i18n";
import { trpc } from "../lib/trpc";
import { formatAUD } from "../lib/format";
import { CrossBankTransferModal } from "./CrossBankTransferModal";

export type QuickActionType = "DEBIT" | "CREDIT" | "TRANSFER";

interface QuickExpenseModalProps {
  visible: boolean;
  initialType?: QuickActionType;
  onClose: () => void;
  onIncomeSuccess?: (incomeEventId: string) => void;
}

const QUICK_PICKS = [
  { name: "Coffee", amount: "5.50", icon: "☕" },
  { name: "Lunch", amount: "18.00", icon: "🥗" },
  { name: "Groceries", amount: "80.00", icon: "🛒" },
  { name: "Fuel", amount: "70.00", icon: "⛽" },
];

export function QuickExpenseModal({
  visible,
  initialType = "DEBIT",
  onClose,
  onIncomeSuccess,
}: QuickExpenseModalProps) {
  const [type, setType] = useState<QuickActionType>(initialType);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [destPoolId, setDestPoolId] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cross-bank transfer state
  const [crossBankData, setCrossBankData] = useState<{
    visible: boolean;
    sourceAccountName: string;
    destAccountName: string;
    amount: number;
  } | null>(null);

  const posthog = usePostHog();
  const utils = trpc.useUtils();

  const { data: pools, isLoading: poolsLoading } = trpc.listPools.useQuery(
    undefined,
    { enabled: visible }
  );
  const { data: bankAccounts } = trpc.listBankAccounts.useQuery(
    undefined,
    { enabled: visible }
  );

  const recordExpenseMutation = trpc.recordExpense.useMutation();
  const createUpcomingIncomeMutation = trpc.createUpcomingIncome.useMutation();
  const moveMoneyMutation = trpc.moveMoney.useMutation();

  React.useEffect(() => {
    if (visible) {
      setType(initialType);
      // Auto-select Everyday pool as default for DEBIT
      const everyday = pools?.find((p) => p.poolType === "EVERYDAY");
      if (everyday) {
        setSelectedPoolId(everyday.id);
      }
    }
  }, [visible, initialType, pools]);

  const D = DESIGN_TOKENS;
  const everydayPool = pools?.find((p) => p.poolType === "EVERYDAY");
  const selectedPool = pools?.find((p) => p.id === selectedPoolId);
  const destPool = pools?.find((p) => p.id === destPoolId);

  const getPoolBalance = (p?: { currentBalance?: number | string }) =>
    typeof p?.currentBalance === "number"
      ? p.currentBalance
      : parseFloat((p?.currentBalance as string) || "0");

  const isOverdraft =
    type === "DEBIT" &&
    selectedPool &&
    parseFloat(amount || "0") > getPoolBalance(selectedPool);

  const handleQuickPick = (pick: (typeof QUICK_PICKS)[0]) => {
    setName(pick.name);
    setAmount(pick.amount);
    if (everydayPool) {
      setSelectedPoolId(everydayPool.id);
    }
  };

  const handleRecord = async () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert(t("common.error"), "Please enter a valid amount.");
      return;
    }

    if (type === "DEBIT") {
      if (!name.trim()) {
        Alert.alert(t("common.error"), "Please enter an expense name.");
        return;
      }
      if (!selectedPoolId) {
        Alert.alert(t("common.error"), "Please select a pool.");
        return;
      }

      setIsSubmitting(true);
      try {
        await recordExpenseMutation.mutateAsync({
          poolId: selectedPoolId,
          amount: numAmount.toFixed(2),
          flowType: "DEBIT",
          note: note.trim() || name.trim(),
          idempotencyKey:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : Math.random().toString(36).substring(2) + Date.now().toString(36),
        });

        if (posthog) {
          posthog.capture("expense_recorded", {
            amount: numAmount,
            pool_id: selectedPoolId,
          });
        }

        utils.listPools.invalidate();
        utils.listTransactions.invalidate();
        resetAndClose();
      } catch (err) {
        Alert.alert(
          t("common.error"),
          err instanceof Error ? err.message : "Failed to record expense"
        );
      } finally {
        setIsSubmitting(false);
      }
    } else if (type === "CREDIT") {
      if (!name.trim()) {
        Alert.alert(t("common.error"), "Please enter an income source name.");
        return;
      }

      setIsSubmitting(true);
      try {
        const todayStr = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Australia/Sydney",
        }).format(new Date());

        const created = await createUpcomingIncomeMutation.mutateAsync({
          name: name.trim(),
          amount: numAmount.toFixed(2),
          expectedDate: todayStr,
          note: note.trim() || name.trim(),
        });

        if (posthog) {
          posthog.capture("income_recorded", { amount: numAmount });
        }

        utils.listPools.invalidate();
        utils.listIncomeEvents.invalidate();
        resetAndClose();

        if (onIncomeSuccess) {
          onIncomeSuccess(created.id);
        }
      } catch (err) {
        Alert.alert(
          t("common.error"),
          err instanceof Error ? err.message : "Failed to record income"
        );
      } finally {
        setIsSubmitting(false);
      }
    } else if (type === "TRANSFER") {
      if (!selectedPoolId || !destPoolId) {
        Alert.alert(
          t("common.error"),
          "Please select both source and destination pools."
        );
        return;
      }
      if (selectedPoolId === destPoolId) {
        Alert.alert(
          t("common.error"),
          "Source and destination pools must be different."
        );
        return;
      }

      setIsSubmitting(true);
      try {
        await moveMoneyMutation.mutateAsync({
          sourcePoolId: selectedPoolId,
          destinationPoolId: destPoolId,
          amount: numAmount.toFixed(2),
          note: note.trim() || undefined,
        });

        utils.listPools.invalidate();
        utils.listTransactions.invalidate();

        // Check if cross-bank transfer
        const srcAccount = bankAccounts?.find(
          (b) => b.id === selectedPool?.bankAccountId
        );
        const dstAccount = bankAccounts?.find(
          (b) => b.id === destPool?.bankAccountId
        );

        if (
          srcAccount &&
          dstAccount &&
          selectedPool?.bankAccountId !== destPool?.bankAccountId
        ) {
          setCrossBankData({
            visible: true,
            sourceAccountName: srcAccount.name,
            destAccountName: dstAccount.name,
            amount: numAmount,
          });
        } else {
          resetAndClose();
        }
      } catch (err) {
        Alert.alert(
          t("common.error"),
          err instanceof Error ? err.message : "Failed to transfer funds"
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const resetAndClose = () => {
    setName("");
    setAmount("");
    setNote("");
    onClose();
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {type === "DEBIT"
                  ? "Log Quick Expense"
                  : type === "CREDIT"
                  ? "Quick Record Income"
                  : "Move Money Between Pools"}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Feather name="x" size={20} color={D.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* 3-Way Segmented Control */}
            <View style={styles.segmentContainer}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  type === "DEBIT" && styles.segmentBtnActiveDebit,
                ]}
                onPress={() => setType("DEBIT")}
              >
                <Text
                  style={[
                    styles.segmentText,
                    type === "DEBIT" && styles.segmentTextActiveDebit,
                  ]}
                >
                  💸 Expense
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  type === "CREDIT" && styles.segmentBtnActiveCredit,
                ]}
                onPress={() => setType("CREDIT")}
              >
                <Text
                  style={[
                    styles.segmentText,
                    type === "CREDIT" && styles.segmentTextActiveCredit,
                  ]}
                >
                  💰 Income
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  type === "TRANSFER" && styles.segmentBtnActiveTransfer,
                ]}
                onPress={() => setType("TRANSFER")}
              >
                <Text
                  style={[
                    styles.segmentText,
                    type === "TRANSFER" && styles.segmentTextActiveTransfer,
                  ]}
                >
                  ⚡ Transfer
                </Text>
              </TouchableOpacity>
            </View>

            {poolsLoading ? (
              <ActivityIndicator
                color={D.colors.accent}
                style={{ marginVertical: 40 }}
              />
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.form}
              >
                {/* Quick Picks for Expense */}
                {type === "DEBIT" && (
                  <View style={styles.quickPicksSection}>
                    <Text style={styles.quickPickLabel}>⚡ Quick Picks</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.quickPicksRow}
                    >
                      {QUICK_PICKS.map((qp) => (
                        <TouchableOpacity
                          key={qp.name}
                          onPress={() => handleQuickPick(qp)}
                          style={styles.quickPickChip}
                        >
                          <Text style={styles.quickPickChipText}>
                            {qp.icon} {qp.name} ${qp.amount}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Amount Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Amount ($)</Text>
                  <View style={styles.amountInputWrap}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      value={amount}
                      onChangeText={setAmount}
                      placeholderTextColor={D.colors.textMuted}
                      autoFocus={type === "DEBIT"}
                    />
                  </View>
                  {isOverdraft && (
                    <Text style={styles.overdraftWarning}>
                      ⚠️ Exceeds pool balance ({formatAUD(getPoolBalance(selectedPool))})
                    </Text>
                  )}
                </View>

                {/* Name Input */}
                {type !== "TRANSFER" && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      {type === "CREDIT" ? "Income Name / Source" : "Expense Name"}
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder={
                        type === "CREDIT" ? "e.g. Side Gig, Tax Refund" : "e.g. Coffee, Groceries"
                      }
                      value={name}
                      onChangeText={setName}
                      placeholderTextColor={D.colors.textMuted}
                    />
                  </View>
                )}

                {/* Source Pool Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    {type === "TRANSFER"
                      ? "From Pool (Source)"
                      : type === "CREDIT"
                      ? "Receiving Pool"
                      : "Paid From Pool"}
                  </Text>
                  <View style={styles.poolsGrid}>
                    {pools?.map((p) => {
                      const isSelected = p.id === selectedPoolId;
                      return (
                        <TouchableOpacity
                          key={p.id}
                          onPress={() => setSelectedPoolId(p.id)}
                          style={[
                            styles.poolChip,
                            isSelected && styles.poolChipSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.poolChipName,
                              isSelected && styles.poolChipNameSelected,
                            ]}
                          >
                            {p.name}
                          </Text>
                          <Text
                            style={[
                              styles.poolChipBal,
                              isSelected && styles.poolChipBalSelected,
                            ]}
                          >
                            {formatAUD(p.currentBalance)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Destination Pool for Transfer */}
                {type === "TRANSFER" && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>To Pool (Destination)</Text>
                    <View style={styles.poolsGrid}>
                      {pools
                        ?.filter((p) => p.id !== selectedPoolId)
                        .map((p) => {
                          const isSelected = p.id === destPoolId;
                          return (
                            <TouchableOpacity
                              key={p.id}
                              onPress={() => setDestPoolId(p.id)}
                              style={[
                                styles.poolChip,
                                isSelected && styles.poolChipSelected,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.poolChipName,
                                  isSelected && styles.poolChipNameSelected,
                                ]}
                              >
                                {p.name}
                              </Text>
                              <Text
                                style={[
                                  styles.poolChipBal,
                                  isSelected && styles.poolChipBalSelected,
                                ]}
                              >
                                {formatAUD(p.currentBalance)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                  </View>
                )}

                {/* Optional Note */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Note (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Add custom notes..."
                    value={note}
                    onChangeText={setNote}
                    placeholderTextColor={D.colors.textMuted}
                  />
                </View>

                {/* Action Button */}
                <TouchableOpacity
                  onPress={handleRecord}
                  disabled={isSubmitting}
                  style={[
                    styles.submitBtn,
                    type === "CREDIT"
                      ? styles.submitBtnCredit
                      : type === "TRANSFER"
                      ? styles.submitBtnTransfer
                      : styles.submitBtnDebit,
                    isSubmitting && { opacity: 0.6 },
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {type === "DEBIT"
                        ? "Record Expense"
                        : type === "CREDIT"
                        ? "Record Income"
                        : "Transfer Funds"}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Cross-Bank Transfer Prompt */}
      {crossBankData && (
        <CrossBankTransferModal
          visible={crossBankData.visible}
          onClose={() => {
            setCrossBankData(null);
            resetAndClose();
          }}
          sourceAccountName={crossBankData.sourceAccountName}
          destAccountName={crossBankData.destAccountName}
          amount={crossBankData.amount}
        />
      )}
    </>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: D.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    maxHeight: "88%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: D.colors.primary,
  },
  closeBtn: {
    padding: 6,
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
  },
  segmentBtnActiveDebit: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnActiveCredit: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnActiveTransfer: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  segmentTextActiveDebit: {
    color: "#ba1a1a",
    fontWeight: "800",
  },
  segmentTextActiveCredit: {
    color: "#059669",
    fontWeight: "800",
  },
  segmentTextActiveTransfer: {
    color: "#2563eb",
    fontWeight: "800",
  },
  form: {
    gap: 14,
    paddingBottom: 20,
  },
  quickPicksSection: {
    gap: 6,
  },
  quickPickLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
  },
  quickPicksRow: {
    flexDirection: "row",
    gap: 8,
  },
  quickPickChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
  },
  quickPickChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  amountInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: "900",
    color: "#64748B",
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "900",
    fontFamily: "monospace",
    color: D.colors.primary,
    paddingVertical: 10,
  },
  overdraftWarning: {
    fontSize: 11,
    color: "#DC2626",
    fontWeight: "600",
    marginTop: 2,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: D.colors.primary,
    backgroundColor: "#F8FAFC",
  },
  poolsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  poolChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  poolChipSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563eb",
  },
  poolChipName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  poolChipNameSelected: {
    color: "#2563eb",
    fontWeight: "800",
  },
  poolChipBal: {
    fontSize: 10,
    fontFamily: "monospace",
    color: "#94A3B8",
    marginTop: 2,
  },
  poolChipBalSelected: {
    color: "#2563eb",
  },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  submitBtnDebit: {
    backgroundColor: "#2563eb",
  },
  submitBtnCredit: {
    backgroundColor: "#059669",
  },
  submitBtnTransfer: {
    backgroundColor: "#2563eb",
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});

export default QuickExpenseModal;
