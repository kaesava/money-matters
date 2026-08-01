import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { DESIGN_TOKENS } from "@money-matters/ui";

export interface MobileBudgetImpactReviewItem {
  id?: string;
  name: string;
  type: "EVERYDAY" | "REGULAR" | "GOAL";
  monthlyAmount?: number | null;
  status: "ADDED" | "MODIFIED" | "ARCHIVED";
}

export interface MobileBudgetImpactReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isSubmitting?: boolean;
  oldEverydayCap: number;
  newEverydayCap: number;
  oldBillsCap: number;
  newBillsCap: number;
  items: MobileBudgetImpactReviewItem[];
  nextPaydayDateStr?: string;
}

export function MobileBudgetImpactReviewModal({
  visible,
  onClose,
  onConfirm,
  isSubmitting = false,
  oldEverydayCap,
  newEverydayCap,
  oldBillsCap,
  newBillsCap,
  items,
  nextPaydayDateStr = "next payday",
}: MobileBudgetImpactReviewModalProps) {
  if (!visible) return null;

  const everydayDiff = newEverydayCap - oldEverydayCap;
  const billsDiff = newBillsCap - oldBillsCap;

  const formatDiff = (diff: number) => {
    if (diff === 0) return "$0";
    return diff > 0 ? `+$${diff.toFixed(2)}` : `-$${Math.abs(diff).toFixed(2)}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Review Budget Impact</Text>
              <Text style={styles.subtitle}>Confirm adjustments before applying</Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Effective Date Banner */}
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              ℹ️ New pool caps take effect on your {nextPaydayDateStr}. Current in-progress balances remain untouched.
            </Text>
          </View>

          {/* Target Caps Comparison Grid */}
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Bills Pool Cap</Text>
              <Text style={styles.gridValue}>${newBillsCap.toFixed(2)}</Text>
              <Text style={[styles.gridDiff, billsDiff >= 0 ? styles.positiveDiff : styles.negativeDiff]}>
                {formatDiff(billsDiff)} /mo
              </Text>
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Everyday Pool Cap</Text>
              <Text style={styles.gridValue}>${newEverydayCap.toFixed(2)}</Text>
              <Text style={[styles.gridDiff, everydayDiff >= 0 ? styles.positiveDiff : styles.negativeDiff]}>
                {formatDiff(everydayDiff)} /mo
              </Text>
            </View>
          </View>

          {/* Itemized Changes */}
          <ScrollView style={styles.listContainer}>
            {items.length === 0 ? (
              <Text style={styles.emptyText}>No category line item changes.</Text>
            ) : (
              items.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <View style={styles.itemLeft}>
                    <Text style={styles.badge}>{item.status}</Text>
                    <Text style={styles.itemName}>{item.name}</Text>
                  </View>
                  <Text style={styles.itemAmount}>
                    {item.monthlyAmount ? `$${item.monthlyAmount.toFixed(2)}` : "-"}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          {/* Controls */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelText}>Cancel (0 Changes)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyBtn, isSubmitting && styles.disabledBtn]}
              onPress={onConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.applyText}>Apply Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    fontSize: 18,
    color: DESIGN_TOKENS.colors.textMuted,
    padding: 4,
  },
  banner: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: DESIGN_TOKENS.radius.md,
    padding: 10,
    marginBottom: 12,
  },
  bannerText: {
    fontSize: 11,
    color: "#1E40AF",
    lineHeight: 16,
  },
  grid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  gridItem: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
    borderRadius: DESIGN_TOKENS.radius.md,
    padding: 10,
  },
  gridLabel: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
  },
  gridValue: {
    fontSize: 16,
    fontWeight: "700",
    color: DESIGN_TOKENS.colors.textPrimary,
    marginVertical: 2,
  },
  gridDiff: {
    fontSize: 11,
    fontWeight: "600",
  },
  positiveDiff: {
    color: DESIGN_TOKENS.colors.success,
  },
  negativeDiff: {
    color: DESIGN_TOKENS.colors.critical,
  },
  listContainer: {
    maxHeight: 160,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    borderRadius: DESIGN_TOKENS.radius.md,
    padding: 8,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
    textAlign: "center",
    marginVertical: 12,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    fontSize: 9,
    fontWeight: "700",
    color: DESIGN_TOKENS.colors.primary,
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemName: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  itemAmount: {
    fontSize: 12,
    fontWeight: "600",
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  btnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
  },
  cancelText: {
    fontSize: 12,
    fontWeight: "600",
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  applyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: DESIGN_TOKENS.radius.md,
    backgroundColor: DESIGN_TOKENS.colors.primary,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  applyText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
