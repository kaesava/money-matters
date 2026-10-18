import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { DESIGN_TOKENS } from "../tokens.js";
import { t } from "@money-matters/i18n";
import type { AssistantResult } from "@money-matters/types";
import MobileModalDialog from "./MobileModalDialog.js";

export interface MobileAskSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAsk: (query: string) => Promise<AssistantResult>;
  onNavigatePrefill: (result: Extract<AssistantResult, { type: "prefill" }>) => void;
  remainingCalls?: number;
}

const SUGGESTED_CHIPS = [
  "assistant.chips.everydayBalance",
  "assistant.chips.nextPayday",
  "assistant.chips.billsDue",
  "assistant.chips.canAfford",
  "assistant.chips.goalDate",
  "assistant.chips.internetPaid",
] as const;

export const MobileAskSheet: React.FC<MobileAskSheetProps> = ({
  isOpen,
  onClose,
  onAsk,
  onNavigatePrefill,
  remainingCalls,
}) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AssistantResult | null>(null);

  const handleSubmit = async (textToAsk: string) => {
    const q = textToAsk.trim();
    if (!q || isLoading) return;
    setIsLoading(true);
    setResult(null);
    try {
      const res = await onAsk(q);
      setResult(res);
      if (res.type === "prefill") {
        onClose();
        onNavigatePrefill(res);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileModalDialog
      visible={isOpen}
      onClose={onClose}
      title={t("assistant.trigger")}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.inputBar}>
          <Feather name="zap" size={16} color={DESIGN_TOKENS.colors.sereneBlue} />
          <TextInput
            style={styles.textInput}
            placeholder={t("assistant.placeholder")}
            placeholderTextColor={DESIGN_TOKENS.colors.slate[400]}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSubmit(query)}
            returnKeyType="search"
            autoFocus
          />
          {isLoading ? (
            <ActivityIndicator size="small" color={DESIGN_TOKENS.colors.sereneBlue} />
          ) : (
            <TouchableOpacity onPress={() => handleSubmit(query)} disabled={!query.trim()}>
              <Feather name="corner-down-left" size={16} color={DESIGN_TOKENS.colors.slate[400]} />
            </TouchableOpacity>
          )}
        </View>

        {result && (
          <View style={styles.resultBox}>
            {result.type === "answer" && (
              <Text style={styles.resultText}>
                {t(result.templateKey, result.templateValues)}
              </Text>
            )}
            {result.type === "clarify" && (
              <View style={styles.clarifyBox}>
                <Text style={styles.clarifyText}>{t(result.templateKey)}</Text>
                <View style={styles.chipsRow}>
                  {result.suggestions.map((s, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => {
                        setQuery(s);
                        handleSubmit(s);
                      }}
                      style={styles.suggestionChip}
                    >
                      <Text style={styles.suggestionText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            {result.type === "unavailable" && (
              <Text style={styles.unavailableText}>
                {t(`assistant.unavailable.${result.reason}`)}
              </Text>
            )}
          </View>
        )}

        <View style={styles.sectionGap}>
          <Text style={styles.sectionHeader}>{t("assistant.suggestedTitle")}</Text>
          <View style={styles.chipsRow}>
            {SUGGESTED_CHIPS.map((chipKey) => {
              const label = t(chipKey);
              return (
                <TouchableOpacity
                  key={chipKey}
                  onPress={() => {
                    setQuery(label);
                    handleSubmit(label);
                  }}
                  style={styles.chipButton}
                >
                  <Text style={styles.chipText}>{label}</Text>
                  <Feather name="arrow-right" size={12} color={DESIGN_TOKENS.colors.slate[400]} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {typeof remainingCalls === "number" && (
          <Text style={styles.footerHelpText}>
            {t("assistant.remainingUsage", {
              remaining: remainingCalls,
              limit: 150,
              resetsOn: "next month",
            })}
          </Text>
        )}
      </ScrollView>
    </MobileModalDialog>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    gap: 14,
    paddingVertical: 4,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  resultBox: {
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: 10,
    padding: 12,
  },
  resultText: {
    fontSize: 13,
    fontWeight: "500",
    color: DESIGN_TOKENS.colors.textPrimary,
    lineHeight: 18,
  },
  clarifyBox: {
    gap: 8,
  },
  clarifyText: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.slate[700],
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  suggestionText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[700],
  },
  unavailableText: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.warningDark,
  },
  sectionGap: {
    gap: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "600",
    color: DESIGN_TOKENS.colors.slate[400],
    textTransform: "uppercase",
  },
  chipButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  chipText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[700],
  },
  footerHelpText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[400],
    textAlign: "center",
    marginTop: 4,
  },
});
