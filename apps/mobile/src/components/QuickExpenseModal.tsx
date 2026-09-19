import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { usePostHog } from "posthog-react-native";
import {
  DESIGN_TOKENS,
  AmountInput,
  MobileInput,
  MobileButton,
  FormLabel,
  FormFieldError,
  FormErrorBanner,
  MobileDatePickerField,
  SegmentedTabs,
} from "@money-matters/ui/mobile";
import { t } from "@money-matters/i18n";
import { trpc } from "../lib/trpc";
import { formatAUD, formatIsoDate } from "../lib/format";
import { CrossBankTransferModal } from "./CrossBankTransferModal";
import { triggerHaptic } from "../lib/haptics";

export type QuickActionType = "DEBIT" | "CREDIT" | "TRANSFER";

interface QuickExpenseModalProps {
  visible: boolean;
  initialType?: QuickActionType;
  onClose: () => void;
  onIncomeSuccess?: (incomeEventId: string) => void;
}

const QUICK_PICKS = [
  { name: "Coffee", amount: "5.50" },
  { name: "Lunch", amount: "18.00" },
  { name: "Groceries", amount: "80.00" },
  { name: "Fuel", amount: "70.00" },
];

export function QuickExpenseModal({
  visible,
  initialType = "DEBIT",
  onClose,
  onIncomeSuccess,
}: QuickExpenseModalProps) {
  const todayStr = formatIsoDate(new Date());
  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayStr = formatIsoDate(yesterdayObj);

  const [type, setType] = useState<QuickActionType>(initialType);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr);
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [destPoolId, setDestPoolId] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [dateError, setDateError] = useState("");
  const [poolError, setPoolError] = useState("");
  const [generalError, setGeneralError] = useState("");

  const clearErrors = () => {
    setNameError("");
    setAmountError("");
    setDateError("");
    setPoolError("");
    setGeneralError("");
  };

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
      setDate(todayStr);
      clearErrors();
      // Auto-select Everyday pool as default for DEBIT
      const everyday = pools?.find((p) => p.poolType === "EVERYDAY");
      if (everyday) {
        setSelectedPoolId(everyday.id);
      }
    }
  }, [visible, initialType, pools, todayStr]);

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
    triggerHaptic("selection");
    setName(pick.name);
    setAmount(pick.amount);
    setDate(todayStr);
    if (everydayPool) {
      setSelectedPoolId(everydayPool.id);
    }
    clearErrors();
  };

  const handleRecord = async () => {
    clearErrors();
    const numAmount = parseFloat(amount);
    let hasError = false;

    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setAmountError(t("drawers.quickExpense.validAmountError", { defaultValue: "Please enter a valid amount." }));
      hasError = true;
    }

    if (!date.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim()) || isNaN(new Date(date.trim()).getTime())) {
      setDateError(t("drawers.quickExpense.invalidDate", { defaultValue: "Please enter a valid date (YYYY-MM-DD)." }));
      hasError = true;
    } else if (type === "TRANSFER" && date.trim() < todayStr) {
      setDateError(t("drawers.quickExpense.pastDateError", { defaultValue: "Transfers cannot be performed for past dates." }));
      hasError = true;
    }

    if (type === "DEBIT") {
      if (!name.trim()) {
        setNameError(t("drawers.quickExpense.nameRequired", { defaultValue: "Name is required." }));
        hasError = true;
      }
      if (!selectedPoolId) {
        setPoolError(t("drawers.quickExpense.poolSelectionRequired", { defaultValue: "Please select a pool." }));
        hasError = true;
      }
      if (hasError) return;

      setIsSubmitting(true);
      try {
        await recordExpenseMutation.mutateAsync({
          poolId: selectedPoolId,
          amount: numAmount.toFixed(2),
          flowType: "DEBIT",
          date: date.trim(),
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
        setGeneralError(
          err instanceof Error ? err.message : "Failed to record expense"
        );
      } finally {
        setIsSubmitting(false);
      }
    } else if (type === "CREDIT") {
      if (!name.trim()) {
        setNameError(t("drawers.quickExpense.nameRequired", { defaultValue: "Please enter an income source name." }));
        hasError = true;
      }
      if (hasError) return;

      setIsSubmitting(true);
      try {
        const created = await createUpcomingIncomeMutation.mutateAsync({
          name: name.trim(),
          amount: numAmount.toFixed(2),
          expectedDate: date.trim(),
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
        setGeneralError(
          err instanceof Error ? err.message : "Failed to record income"
        );
      } finally {
        setIsSubmitting(false);
      }
    } else if (type === "TRANSFER") {
      if (!selectedPoolId || !destPoolId) {
        setPoolError(t("drawers.quickExpense.poolsRequired", { defaultValue: "Please select both source and destination pools." }));
        hasError = true;
      } else if (selectedPoolId === destPoolId) {
        setPoolError(t("drawers.quickExpense.poolsDifferent", { defaultValue: "Source and destination pools must be different." }));
        hasError = true;
      }
      if (hasError) return;

      setIsSubmitting(true);
      try {
        await moveMoneyMutation.mutateAsync({
          sourcePoolId: selectedPoolId,
          destinationPoolId: destPoolId,
          amount: numAmount.toFixed(2),
          targetDate: date.trim() === todayStr ? undefined : date.trim(),
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
        setGeneralError(
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
    setDate(todayStr);
    setNote("");
    setDestPoolId("");
    clearErrors();
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
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {type === "DEBIT"
                  ? t('modals.quickExpense.expenseTitle', { defaultValue: 'Record Expense' })
                  : type === "CREDIT"
                  ? t('modals.quickExpense.incomeTitle', { defaultValue: 'Record Income' })
                  : t('modals.quickExpense.transferTitle', { defaultValue: 'Move Money Between Pools' })}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Feather name="x" size={20} color={D.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* 3-Way Segmented Control */}
            <SegmentedTabs<QuickActionType>
              tabs={[
                { key: "DEBIT", label: t('common.expense', { defaultValue: 'Expense' }) },
                { key: "CREDIT", label: t('common.income', { defaultValue: 'Income' }) },
                { key: "TRANSFER", label: t('common.transfer', { defaultValue: 'Transfer' }) },
              ]}
              activeKey={type}
              onChange={(val) => {
                setType(val);
                clearErrors();
              }}
            />

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
                <FormErrorBanner message={generalError} />

                {/* Quick Picks for Expense */}
                {type === "DEBIT" && (
                  <View style={styles.quickPicksSection}>
                    <Text style={styles.quickPickLabel}>
                      {t('quickPick.recent', { defaultValue: 'Quick Picks' })}
                    </Text>
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
                            {qp.name} ${qp.amount}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Amount Input */}
                <View style={styles.inputGroup}>
                  <AmountInput
                    label="Amount ($ AUD)"
                    required
                    value={amount}
                    onChangeText={(val) => {
                      setAmount(val);
                      if (amountError) setAmountError("");
                    }}
                    error={amountError}
                    placeholder="0.00"
                    autoFocus={type === "DEBIT"}
                  />
                  {isOverdraft && (
                    <Text style={styles.overdraftWarning}>
                      ⚠️ Exceeds pool balance ({formatAUD(getPoolBalance(selectedPool))})
                    </Text>
                  )}
                </View>

                {/* Beautiful Serene Date Picker */}
                <MobileDatePickerField
                  label={t("common.date", { defaultValue: "Date" })}
                  value={date}
                  onChange={(newDate) => {
                    setDate(newDate);
                    if (dateError) setDateError("");
                  }}
                  required
                  error={dateError}
                />

                {/* Name Input */}
                {type !== "TRANSFER" && (
                  <MobileInput
                    label={type === "CREDIT" ? "Income Name / Source" : "Expense Name"}
                    required
                    value={name}
                    onChangeText={(val) => {
                      setName(val);
                      if (nameError) setNameError("");
                    }}
                    placeholder={
                      type === "CREDIT" ? "e.g. Side Gig, Tax Refund" : "e.g. Coffee, Groceries"
                    }
                    error={nameError}
                  />
                )}

                {/* Source Pool Selection */}
                <View style={styles.inputGroup}>
                  <FormLabel required>
                    {type === "TRANSFER"
                      ? "From Pool (Source)"
                      : type === "CREDIT"
                      ? "Receiving Pool"
                      : "Paid From Pool"}
                  </FormLabel>
                  <View style={styles.poolsGrid}>
                    {pools?.map((p) => {
                      const isSelected = p.id === selectedPoolId;
                      return (
                        <TouchableOpacity
                          key={p.id}
                          onPress={() => {
                            setSelectedPoolId(p.id);
                            if (poolError) setPoolError("");
                          }}
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
                  <FormFieldError error={poolError} />
                </View>

                {/* Destination Pool for Transfer */}
                {type === "TRANSFER" && (
                  <View style={styles.inputGroup}>
                    <FormLabel required>To Pool (Destination)</FormLabel>
                    <View style={styles.poolsGrid}>
                      {pools
                        ?.filter((p) => p.id !== selectedPoolId)
                        .map((p) => {
                          const isSelected = p.id === destPoolId;
                          return (
                            <TouchableOpacity
                              key={p.id}
                              onPress={() => {
                                setDestPoolId(p.id);
                                if (poolError) setPoolError("");
                              }}
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
                <MobileInput
                  label="Note (Optional)"
                  placeholder="Add custom notes..."
                  value={note}
                  onChangeText={setNote}
                />

                {/* Action Button */}
                <MobileButton
                  variant="primary"
                  onPress={handleRecord}
                  loading={isSubmitting}
                  style={{ marginTop: 8 }}
                >
                  {type === "DEBIT"
                    ? "Record Expense"
                    : type === "CREDIT"
                    ? "Record Income"
                    : "Transfer Funds"}
                </MobileButton>
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
    marginRight: 12,
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
  dateQuickRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  dateQuickBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dateQuickBtnActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563eb",
  },
  dateQuickBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  dateQuickBtnTextActive: {
    color: "#2563eb",
    fontWeight: "800",
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
