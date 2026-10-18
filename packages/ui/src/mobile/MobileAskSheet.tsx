import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { DESIGN_TOKENS } from "../tokens.js";
import { t } from "@money-matters/i18n";
import type { AssistantResult } from "@money-matters/types";
import MobileModalDialog from "./MobileModalDialog.js";
import { styles } from "./MobileAskSheet.styles.js";

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
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>(undefined);

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

  const handleChipPress = (label: string) => {
    setQuery(label);
    setResult(null);

    const currencyMatch = label.match(/\$\d+(?:\.\d{2})?/);
    const goalMatch = label.match(/\b(?:my\s+)?Goal\b/i);

    if (currencyMatch && currencyMatch.index !== undefined) {
      setSelection({
        start: currencyMatch.index,
        end: currencyMatch.index + currencyMatch[0].length,
      });
    } else if (goalMatch && goalMatch.index !== undefined) {
      setSelection({
        start: goalMatch.index,
        end: goalMatch.index + goalMatch[0].length,
      });
    } else {
      setSelection({ start: label.length, end: label.length });
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
            selection={selection}
            onSelectionChange={() => setSelection(undefined)}
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
                      onPress={() => handleChipPress(s)}
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
                  onPress={() => handleChipPress(label)}
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

