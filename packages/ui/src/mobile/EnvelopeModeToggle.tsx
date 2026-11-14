import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export interface MobileEnvelopeModeToggleProps {
  mode: "TARGET_BALANCE" | "RECURRING";
  onChange: (mode: "TARGET_BALANCE" | "RECURRING") => void;
  label?: string;
  targetBalanceLabel: string;
  recurringLabel: string;
  targetBalanceDesc?: string;
  recurringDesc?: string;
}

export function MobileEnvelopeModeToggle({
  mode,
  onChange,
  label,
  targetBalanceLabel,
  recurringLabel,
  targetBalanceDesc,
  recurringDesc,
}: MobileEnvelopeModeToggleProps) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        <Pressable
          onPress={() => onChange("TARGET_BALANCE")}
          style={[styles.option, mode === "TARGET_BALANCE" ? styles.optionActive : styles.optionInactive]}
        >
          <Text style={styles.optionTitle}>{targetBalanceLabel}</Text>
          {targetBalanceDesc ? <Text style={styles.optionDesc}>{targetBalanceDesc}</Text> : null}
        </Pressable>
        <Pressable
          onPress={() => onChange("RECURRING")}
          style={[styles.option, mode === "RECURRING" ? styles.optionActive : styles.optionInactive]}
        >
          <Text style={styles.optionTitle}>{recurringLabel}</Text>
          {recurringDesc ? <Text style={styles.optionDesc}>{recurringDesc}</Text> : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 14, fontWeight: "500", color: "#334155" },
  row: { flexDirection: "row", gap: 8 },
  option: { flex: 1, borderRadius: 8, borderWidth: 1, padding: 12 },
  optionActive: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  optionInactive: { borderColor: "#e2e8f0", backgroundColor: "#ffffff" },
  optionTitle: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  optionDesc: { marginTop: 2, fontSize: 12, color: "#64748b" },
});
