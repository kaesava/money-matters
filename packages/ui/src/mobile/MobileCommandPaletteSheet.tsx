import React from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { DESIGN_TOKENS } from "../tokens";
import { t, ASSISTANT_UNAVAILABLE_KEYS } from "@money-matters/i18n";
import type { AssistantResult } from "@money-matters/types";
import MobileModalDialog from "./MobileModalDialog";
import { styles } from "./MobileCommandPaletteSheet.styles";
import { MobileCommandPaletteSections } from "./MobileCommandPaletteSections";
import {
  useCommandPaletteState,
  COMMAND_PALETTE_CHIPS,
  type SearchResultAccount,
  type SearchResultEnvelope,
  type SearchResultEvent,
  type SearchResultTransaction,
  type CommandPaletteCategory,
} from "../hooks/useCommandPaletteState";

export interface MobileCommandPaletteSheetProps {
  isOpen: boolean;
  onClose: () => void;
  accounts?: SearchResultAccount[];
  envelopes?: SearchResultEnvelope[];
  upcomingEvents?: SearchResultEvent[];
  onSearchTransactions?: (query: string) => Promise<SearchResultTransaction[]>;
  onAskPenny?: (query: string) => Promise<AssistantResult>;
  onNavigatePrefill?: (result: Extract<AssistantResult, { type: "prefill" }>) => void;
  remainingCalls?: number;
  onSelectAccount?: (account: SearchResultAccount) => void;
  onSelectEnvelope?: (envelope: SearchResultEnvelope) => void;
  onSelectEvent?: (event: SearchResultEvent) => void;
  onSelectTransaction?: (transaction: SearchResultTransaction) => void;
  onViewAllTransactions?: (query: string) => void;
  hasSimulation?: boolean;
}

export const MobileCommandPaletteSheet: React.FC<MobileCommandPaletteSheetProps> = ({
  isOpen,
  onClose,
  accounts = [],
  envelopes = [],
  upcomingEvents = [],
  onSearchTransactions,
  onAskPenny,
  onNavigatePrefill,
  remainingCalls,
  hasSimulation = true,
  onSelectAccount,
  onSelectEnvelope,
  onSelectEvent,
  onSelectTransaction,
  onViewAllTransactions,
}) => {
  const {
    query, setQuery, activeCategory, setActiveCategory, isAiLoading, aiResult, setAiResult,
    isSearchingTransactions, filteredAccounts, filteredEnvelopes, filteredEvents,
    filteredTransactions, handleExecuteAi, formatAmount, locale,
  } = useCommandPaletteState({
    isOpen, onClose, accounts, envelopes, upcomingEvents, onSearchTransactions, onAskPenny, onNavigatePrefill,
  });

  const categories: { id: CommandPaletteCategory; label: string }[] = [
    { id: "all", label: t("commandPalette.categories.all") },
    { id: "accounts", label: t("commandPalette.categories.accounts") },
    { id: "envelopes", label: t("commandPalette.categories.envelopes") },
    { id: "events", label: t("commandPalette.categories.events") },
    { id: "transactions", label: t("commandPalette.categories.transactions") },
  ];

  const totalResultsCount = filteredAccounts.length + filteredEnvelopes.length + filteredEvents.length + filteredTransactions.length;

  return (
    <MobileModalDialog visible={isOpen} onClose={onClose} title={t("commandPalette.triggerTitle")}>
      <View style={styles.container}>
        <View style={styles.inputBar}>
          <Feather name="search" size={18} color={DESIGN_TOKENS.colors.slate[400]} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("commandPalette.inputPlaceholder")}
            placeholderTextColor={DESIGN_TOKENS.colors.slate[400]}
            style={styles.textInput}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => {
              if (query.trim() && onAskPenny) handleExecuteAi(query);
            }}
          />
          {isAiLoading || isSearchingTransactions ? (
            <ActivityIndicator size="small" color={DESIGN_TOKENS.colors.sereneBlue} />
          ) : query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x-circle" size={16} color={DESIGN_TOKENS.colors.slate[400]} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <TouchableOpacity key={cat.id} onPress={() => setActiveCategory(cat.id)} style={[styles.categoryPill, isActive && styles.categoryPillActive]}>
                <Text style={[styles.categoryPillText, isActive && styles.categoryPillTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {query.trim().length > 0 && onAskPenny && (
            <TouchableOpacity onPress={() => handleExecuteAi(query)} style={styles.aiAskCard} activeOpacity={0.7}>
              <View style={styles.aiAskIconContainer}>
                <Feather name="zap" size={16} color={DESIGN_TOKENS.colors.sereneBlue} />
              </View>
              <View style={styles.aiAskTextContainer}>
                <Text style={styles.aiAskTitle}>{t("commandPalette.askPennyPrefix")} &ldquo;{query}&rdquo;</Text>
                <Text style={styles.aiAskSubtitle}>{t("commandPalette.askPennyHint")}</Text>
              </View>
              <Feather name="arrow-right" size={16} color={DESIGN_TOKENS.colors.slate[400]} />
            </TouchableOpacity>
          )}

          {aiResult && (
            <View style={styles.aiResultBox}>
              <View style={styles.aiResultHeader}>
                <View style={styles.aiHeaderTitle}>
                  <Feather name="zap" size={14} color={DESIGN_TOKENS.colors.sereneBlue} />
                  <Text style={styles.aiResultHeaderText}>{t("commandPalette.sections.ai")}</Text>
                </View>
                <TouchableOpacity onPress={() => setAiResult(null)}>
                  <Feather name="x" size={14} color={DESIGN_TOKENS.colors.slate[400]} />
                </TouchableOpacity>
              </View>
              {aiResult.type === "answer" && <Text style={styles.aiResultText}>{t(aiResult.templateKey, aiResult.templateValues)}</Text>}
              {aiResult.type === "clarify" && (
                <View style={styles.clarifyBox}>
                  <Text style={styles.clarifyText}>{t(aiResult.templateKey)}</Text>
                  <View style={styles.chipsRow}>
                    {aiResult.suggestions.map((s, idx) => (
                      <TouchableOpacity key={idx} onPress={() => handleExecuteAi(s)} style={styles.suggestionChip}>
                        <Text style={styles.suggestionText}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              {aiResult.type === "unavailable" && (
                <Text style={styles.unavailableText}>{t(ASSISTANT_UNAVAILABLE_KEYS[aiResult.reason] ?? "assistant.unavailable.disabled")}</Text>
              )}
            </View>
          )}

          <MobileCommandPaletteSections
            filteredAccounts={filteredAccounts}
            filteredEnvelopes={filteredEnvelopes}
            filteredEvents={filteredEvents}
            filteredTransactions={filteredTransactions}
            formatAmount={formatAmount}
            locale={locale}
            onClose={onClose}
            onSelectAccount={onSelectAccount}
            onSelectEnvelope={onSelectEnvelope}
            onSelectEvent={onSelectEvent}
            onSelectTransaction={onSelectTransaction}
          />

          {onViewAllTransactions && (filteredTransactions.length > 0 || activeCategory === "transactions") && (
            <TouchableOpacity onPress={() => { onClose(); onViewAllTransactions(query.trim()); }} style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>{t("commandPalette.viewAllTransactions")}</Text>
              <Feather name="arrow-right" size={14} color={DESIGN_TOKENS.colors.sereneBlue} />
            </TouchableOpacity>
          )}

          {query.trim().length > 0 && totalResultsCount === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>{t("commandPalette.emptyState.noResults", { query })}</Text>
              <Text style={styles.emptySubtitle}>{t("commandPalette.emptyState.tip")}</Text>
            </View>
          )}

          {!query && onAskPenny && (
            <View style={styles.suggestedContainer}>
              <Text style={styles.suggestedHeader}>{t("assistant.suggestedTitle")}</Text>
              <View style={styles.chipsRow}>
                {COMMAND_PALETTE_CHIPS.filter((chipKey) => hasSimulation || chipKey !== "assistant.chips.canAfford").map((chipKey) => {
                  const label = t(chipKey);
                  return (
                    <TouchableOpacity key={chipKey} onPress={() => setQuery(label)} style={styles.chipButton}>
                      <Text style={styles.chipText}>{label}</Text>
                      <Feather name="arrow-right" size={12} color={DESIGN_TOKENS.colors.slate[400]} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        {typeof remainingCalls === "number" && onAskPenny && (
          <View style={styles.footerBar}>
            <Text style={styles.footerCallsText}>{t("commandPalette.footer.callsLeft", { remaining: remainingCalls })}</Text>
          </View>
        )}
      </View>
    </MobileModalDialog>
  );
};
