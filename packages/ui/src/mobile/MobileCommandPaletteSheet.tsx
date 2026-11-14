import React from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { DESIGN_TOKENS } from "../tokens";
import { t, ASSISTANT_UNAVAILABLE_KEYS } from "@money-matters/i18n";
import type { AssistantResult } from "@money-matters/types";
import MobileModalDialog from "./MobileModalDialog";
import { styles } from "./MobileCommandPaletteSheet.styles";
import { MobileCommandPaletteSections } from "./MobileCommandPaletteSections";
import { formatAiAnswerText } from "../hooks/commandPaletteHelpers";
import { useDateLocale } from "../hooks/DateLocaleContext";
import {
  useCommandPaletteState,
  COMMAND_PALETTE_CHIPS,
  type SearchResultAccount,
  type SearchResultEnvelope,
  type SearchResultEvent,
  type SearchResultPage,
  type SearchResultTransaction,
  type CommandPaletteCategory,
} from "../hooks/useCommandPaletteState";

export type {
  SearchResultAccount,
  SearchResultEnvelope,
  SearchResultEvent,
  SearchResultPage,
  SearchResultTransaction,
  CommandPaletteCategory,
};

export interface MobileCommandPaletteSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pages?: SearchResultPage[];
  accounts?: SearchResultAccount[];
  envelopes?: SearchResultEnvelope[];
  upcomingEvents?: SearchResultEvent[];
  onSearchTransactions?: (query: string) => Promise<SearchResultTransaction[]>;
  onAskPenny?: (query: string) => Promise<AssistantResult>;
  onNavigatePrefill?: (result: Extract<AssistantResult, { type: "prefill" }>) => void;
  remainingCalls?: number;
  hasAiAssistant?: boolean;
  onSelectPage?: (page: SearchResultPage) => void;
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
  pages = [],
  accounts = [],
  envelopes = [],
  upcomingEvents = [],
  onSearchTransactions,
  onAskPenny,
  onNavigatePrefill,
  remainingCalls,
  hasAiAssistant = true,
  hasSimulation = true,
  onSelectPage,
  onSelectAccount,
  onSelectEnvelope,
  onSelectEvent,
  onSelectTransaction,
  onViewAllTransactions,
}) => {
  const { timeZone } = useDateLocale();
  const {
    query, setQuery, activeCategory, setActiveCategory, isAiLoading, aiResult, setAiResult,
    isSearchingTransactions, filteredPages, filteredAccounts, filteredEnvelopes, filteredEvents,
    filteredTransactions, shouldPrioritizeAi, handleExecuteAi, formatAmount, locale,
  } = useCommandPaletteState({
    isOpen, onClose, pages, accounts, envelopes, upcomingEvents, onSearchTransactions, onAskPenny, hasAiAssistant, onNavigatePrefill,
  });

  const categories: { id: CommandPaletteCategory; label: string }[] = [
    { id: "all", label: t("commandPalette.categories.all") },
    { id: "accounts", label: t("commandPalette.categories.accounts") },
    { id: "envelopes", label: t("commandPalette.categories.envelopes") },
    { id: "events", label: t("commandPalette.categories.events") },
    { id: "transactions", label: t("commandPalette.categories.transactions") },
  ];

  const totalResultsCount =
    filteredPages.length + filteredAccounts.length + filteredEnvelopes.length + filteredEvents.length + filteredTransactions.length;

  const handleSubmit = () => {
    if (!query.trim()) return;
    if (shouldPrioritizeAi && hasAiAssistant && onAskPenny) {
      handleExecuteAi(query);
      return;
    }
    if (filteredPages[0]) { onClose(); onSelectPage?.(filteredPages[0]); return; }
    if (filteredAccounts[0]) { onClose(); onSelectAccount?.(filteredAccounts[0]); return; }
    if (filteredEnvelopes[0]) { onClose(); onSelectEnvelope?.(filteredEnvelopes[0]); return; }
    if (filteredEvents[0]) { onClose(); onSelectEvent?.(filteredEvents[0]); return; }
    if (filteredTransactions[0]) { onClose(); onSelectTransaction?.(filteredTransactions[0]); return; }
    if (hasAiAssistant && onAskPenny) handleExecuteAi(query);
  };

  const askCard = query.trim().length > 0 && hasAiAssistant && onAskPenny ? (
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
  ) : null;

  return (
    <MobileModalDialog
      visible={isOpen}
      onClose={onClose}
      title={t(hasAiAssistant ? "commandPalette.triggerTitle" : "commandPalette.searchOnlyTitle")}
    >
      <View style={styles.container}>
        <View style={styles.inputBar}>
          <Feather name="search" size={18} color={DESIGN_TOKENS.colors.slate[400]} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t(hasAiAssistant ? "commandPalette.inputPlaceholder" : "commandPalette.searchOnlyPlaceholder")}
            placeholderTextColor={DESIGN_TOKENS.colors.slate[400]}
            style={styles.textInput}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
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
          {shouldPrioritizeAi ? askCard : null}

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
              {aiResult.type === "answer" && (
                <Text style={styles.aiResultText}>{formatAiAnswerText(aiResult, t)}</Text>
              )}
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
            filteredPages={filteredPages}
            filteredAccounts={filteredAccounts}
            filteredEnvelopes={filteredEnvelopes}
            filteredEvents={filteredEvents}
            filteredTransactions={filteredTransactions}
            formatAmount={formatAmount}
            locale={locale}
            timeZone={timeZone}
            onClose={onClose}
            onSelectPage={onSelectPage}
            onSelectAccount={onSelectAccount}
            onSelectEnvelope={onSelectEnvelope}
            onSelectEvent={onSelectEvent}
            onSelectTransaction={onSelectTransaction}
          />

          {!shouldPrioritizeAi ? askCard : null}

          {onViewAllTransactions && (filteredTransactions.length > 0 || activeCategory === "transactions") && (
            <TouchableOpacity onPress={() => { onClose(); onViewAllTransactions(query.trim()); }} style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>{t("commandPalette.viewAllTransactions")}</Text>
              <Feather name="arrow-right" size={14} color={DESIGN_TOKENS.colors.sereneBlue} />
            </TouchableOpacity>
          )}

          {query.trim().length > 0 && totalResultsCount === 0 && !shouldPrioritizeAi && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>{t("commandPalette.emptyState.noResults", { query })}</Text>
              <Text style={styles.emptySubtitle}>{t("commandPalette.emptyState.tip")}</Text>
            </View>
          )}

          {!query && hasAiAssistant && onAskPenny && (
            <View style={styles.suggestedContainer}>
              <Text style={styles.suggestedHeader}>{t("assistant.suggestedTitle")}</Text>
              <View style={styles.chipsRow}>
                {COMMAND_PALETTE_CHIPS.filter((chipKey) => hasSimulation || chipKey !== "assistant.chips.canAfford").map((chipKey) => {
                  const label = t(chipKey);
                  return (
                    <TouchableOpacity key={chipKey} onPress={() => handleExecuteAi(label)} style={styles.chipButton}>
                      <Text style={styles.chipText}>{label}</Text>
                      <Feather name="arrow-right" size={12} color={DESIGN_TOKENS.colors.slate[400]} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        {hasAiAssistant && typeof remainingCalls === "number" && onAskPenny && (
          <View style={styles.footerBar}>
            <Text style={styles.footerCallsText}>{t("commandPalette.footer.callsLeft", { remaining: remainingCalls })}</Text>
          </View>
        )}
      </View>
    </MobileModalDialog>
  );
};
