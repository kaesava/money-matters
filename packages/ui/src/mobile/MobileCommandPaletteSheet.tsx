import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { DESIGN_TOKENS } from "../tokens";
import { t } from "@money-matters/i18n";
import { useCurrencyLocale } from "../hooks/CurrencyLocaleContext";
import type { AssistantResult } from "@money-matters/types";
import MobileModalDialog from "./MobileModalDialog";
import type {
  SearchResultAccount,
  SearchResultEnvelope,
  SearchResultEvent,
  SearchResultTransaction,
  CommandPaletteCategory,
} from "../web/CommandPaletteModal";

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
}

const SUGGESTED_CHIPS = [
  "assistant.chips.everydayBalance",
  "assistant.chips.nextPayday",
  "assistant.chips.billsDue",
  "assistant.chips.canAfford",
  "assistant.chips.goalDate",
  "assistant.chips.internetPaid",
] as const;

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
  onSelectAccount,
  onSelectEnvelope,
  onSelectEvent,
  onSelectTransaction,
  onViewAllTransactions,
}) => {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CommandPaletteCategory>("all");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AssistantResult | null>(null);
  const [isSearchingTransactions, setIsSearchingTransactions] = useState(false);
  const [transactionResults, setTransactionResults] = useState<SearchResultTransaction[]>([]);

  const { currencySymbol, locale } = useCurrencyLocale();

  const formatAmount = useCallback(
    (amount: number) => {
      return `${currencySymbol}${Math.abs(amount).toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },
    [currencySymbol, locale]
  );

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveCategory("all");
      setAiResult(null);
      setTransactionResults([]);
    }
  }, [isOpen]);

  // Debounced transaction search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || !onSearchTransactions) {
      setTransactionResults([]);
      setIsSearchingTransactions(false);
      return;
    }

    if (activeCategory !== "all" && activeCategory !== "transactions") {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingTransactions(true);
      try {
        const results = await onSearchTransactions(trimmed);
        setTransactionResults(results);
      } catch {
        setTransactionResults([]);
      } finally {
        setIsSearchingTransactions(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, activeCategory, onSearchTransactions]);

  const trimmed = query.trim().toLowerCase();

  const filteredAccounts = useMemo(() => {
    if (activeCategory !== "all" && activeCategory !== "accounts") return [];
    if (!trimmed) return accounts.slice(0, 5);
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(trimmed) ||
        (a.type && a.type.toLowerCase().includes(trimmed))
    );
  }, [accounts, trimmed, activeCategory]);

  const filteredEnvelopes = useMemo(() => {
    if (activeCategory !== "all" && activeCategory !== "envelopes") return [];
    if (!trimmed) return envelopes.slice(0, 5);
    return envelopes.filter(
      (e) =>
        e.name.toLowerCase().includes(trimmed) ||
        (e.type && e.type.toLowerCase().includes(trimmed))
    );
  }, [envelopes, trimmed, activeCategory]);

  const filteredEvents = useMemo(() => {
    if (activeCategory !== "all" && activeCategory !== "events") return [];
    if (!trimmed) return upcomingEvents.slice(0, 5);
    return upcomingEvents.filter(
      (ev) =>
        ev.name.toLowerCase().includes(trimmed) ||
        ev.type.toLowerCase().includes(trimmed)
    );
  }, [upcomingEvents, trimmed, activeCategory]);

  const filteredTransactions = useMemo(() => {
    if (activeCategory !== "all" && activeCategory !== "transactions") return [];
    return transactionResults;
  }, [transactionResults, activeCategory]);

  const handleExecuteAi = useCallback(
    async (textToAsk: string) => {
      if (!onAskPenny || isAiLoading) return;
      const q = textToAsk.trim();
      if (!q) return;
      setIsAiLoading(true);
      setAiResult(null);
      try {
        const res = await onAskPenny(q);
        setAiResult(res);
        if (res.type === "prefill" && onNavigatePrefill) {
          onClose();
          onNavigatePrefill(res);
        }
      } finally {
        setIsAiLoading(false);
      }
    },
    [onAskPenny, isAiLoading, onNavigatePrefill, onClose]
  );

  const categories: { id: CommandPaletteCategory; label: string }[] = [
    { id: "all", label: t("commandPalette.categories.all") },
    { id: "accounts", label: t("commandPalette.categories.accounts") },
    { id: "envelopes", label: t("commandPalette.categories.envelopes") },
    { id: "events", label: t("commandPalette.categories.events") },
    { id: "transactions", label: t("commandPalette.categories.transactions") },
  ];

  const totalResultsCount =
    filteredAccounts.length +
    filteredEnvelopes.length +
    filteredEvents.length +
    filteredTransactions.length;

  return (
    <MobileModalDialog
      visible={isOpen}
      onClose={onClose}
      title={t("commandPalette.sections.ai")}
    >
      <View style={styles.container}>
        {/* Search Input Bar */}
        <View style={styles.inputBar}>
          <Feather name="search" size={18} color={DESIGN_TOKENS.colors.slate[400]} />
          <TextInput
            style={styles.textInput}
            placeholder={t("commandPalette.mobilePlaceholder")}
            placeholderTextColor={DESIGN_TOKENS.colors.slate[400]}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (query.trim() && onAskPenny) {
                handleExecuteAi(query);
              }
            }}
            autoFocus
          />
          {isAiLoading || isSearchingTransactions ? (
            <ActivityIndicator size="small" color={DESIGN_TOKENS.colors.sereneBlue} />
          ) : query ? (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={16} color={DESIGN_TOKENS.colors.slate[400]} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Category Pills Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setActiveCategory(cat.id)}
                style={[styles.categoryPill, isActive && styles.categoryPillActive]}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isActive && styles.categoryPillTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Ask Penny Banner if query is typed */}
          {query.trim().length > 0 && onAskPenny && (
            <TouchableOpacity
              onPress={() => handleExecuteAi(query)}
              style={styles.aiAskCard}
              activeOpacity={0.7}
            >
              <View style={styles.aiAskIconContainer}>
                <Feather name="zap" size={16} color={DESIGN_TOKENS.colors.sereneBlue} />
              </View>
              <View style={styles.aiAskTextContainer}>
                <Text style={styles.aiAskTitle}>
                  {t("commandPalette.askPennyPrefix")} &ldquo;{query}&rdquo;
                </Text>
                <Text style={styles.aiAskSubtitle}>{t("commandPalette.askPennyHint")}</Text>
              </View>
              <Feather name="arrow-right" size={16} color={DESIGN_TOKENS.colors.slate[400]} />
            </TouchableOpacity>
          )}

          {/* AI Result Card */}
          {aiResult && (
            <View style={styles.aiResultBox}>
              <View style={styles.aiResultHeader}>
                <View style={styles.aiHeaderTitle}>
                  <Feather name="zap" size={14} color={DESIGN_TOKENS.colors.sereneBlue} />
                  <Text style={styles.aiResultHeaderText}>
                    {t("commandPalette.sections.ai")}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setAiResult(null)}>
                  <Feather name="x" size={14} color={DESIGN_TOKENS.colors.slate[400]} />
                </TouchableOpacity>
              </View>
              {aiResult.type === "answer" && (
                <Text style={styles.aiResultText}>
                  {t(aiResult.templateKey, aiResult.templateValues)}
                </Text>
              )}
              {aiResult.type === "clarify" && (
                <View style={styles.clarifyBox}>
                  <Text style={styles.clarifyText}>{t(aiResult.templateKey)}</Text>
                  <View style={styles.chipsRow}>
                    {aiResult.suggestions.map((s, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => handleExecuteAi(s)}
                        style={styles.suggestionChip}
                      >
                        <Text style={styles.suggestionText}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              {aiResult.type === "unavailable" && (
                <Text style={styles.unavailableText}>
                  {t(`assistant.unavailable.${aiResult.reason}`)}
                </Text>
              )}
            </View>
          )}

          {/* Accounts Section */}
          {filteredAccounts.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>
                {t("commandPalette.sections.accounts")}
              </Text>
              {filteredAccounts.map((account) => (
                <TouchableOpacity
                  key={`acc-${account.id}`}
                  onPress={() => {
                    onClose();
                    onSelectAccount?.(account);
                  }}
                  style={styles.resultRow}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowLeft}>
                    <View style={[styles.iconBox, { backgroundColor: DESIGN_TOKENS.colors.successLight }]}>
                      <Feather name="credit-card" size={16} color={DESIGN_TOKENS.colors.success} />
                    </View>
                    <View>
                      <Text style={styles.rowTitle}>{account.name}</Text>
                      {account.type ? (
                        <Text style={styles.rowSubtitle}>{account.type}</Text>
                      ) : null}
                    </View>
                  </View>
                  {account.currentBalance !== undefined && (
                    <Text style={styles.rowAmount}>
                      {formatAmount(account.currentBalance)}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Envelopes Section */}
          {filteredEnvelopes.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>
                {t("commandPalette.sections.envelopes")}
              </Text>
              {filteredEnvelopes.map((envelope) => (
                <TouchableOpacity
                  key={`env-${envelope.id}`}
                  onPress={() => {
                    onClose();
                    onSelectEnvelope?.(envelope);
                  }}
                  style={styles.resultRow}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowLeft}>
                    <View style={[styles.iconBox, { backgroundColor: DESIGN_TOKENS.colors.accentLight }]}>
                      <Feather name="mail" size={16} color={DESIGN_TOKENS.colors.sereneBlue} />
                    </View>
                    <View>
                      <Text style={styles.rowTitle}>{envelope.name}</Text>
                      {envelope.type ? (
                        <Text style={styles.rowSubtitle}>{envelope.type}</Text>
                      ) : null}
                    </View>
                  </View>
                  {envelope.currentBalance !== undefined && (
                    <Text style={styles.rowAmount}>
                      {formatAmount(envelope.currentBalance)}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Upcoming Events Section */}
          {filteredEvents.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>
                {t("commandPalette.sections.upcoming")}
              </Text>
              {filteredEvents.map((event) => {
                const isIncome = event.type === "INCOME";
                return (
                  <TouchableOpacity
                    key={`ev-${event.id}`}
                    onPress={() => {
                      onClose();
                      onSelectEvent?.(event);
                    }}
                    style={styles.resultRow}
                    activeOpacity={0.7}
                  >
                    <View style={styles.rowLeft}>
                      <View
                        style={[
                          styles.iconBox,
                          {
                            backgroundColor: isIncome
                              ? DESIGN_TOKENS.colors.successLight
                              : DESIGN_TOKENS.colors.accentLight,
                          },
                        ]}
                      >
                        <Feather
                          name="calendar"
                          size={16}
                          color={
                            isIncome
                              ? DESIGN_TOKENS.colors.success
                              : DESIGN_TOKENS.colors.sereneBlue
                          }
                        />
                      </View>
                      <View>
                        <Text style={styles.rowTitle}>{event.name}</Text>
                        <Text style={styles.rowSubtitle}>
                          {event.dueDate} · {isIncome ? t("common.income") : t("common.expense")}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.rowAmount,
                        isIncome && { color: DESIGN_TOKENS.colors.success },
                      ]}
                    >
                      {isIncome ? "+" : "-"}
                      {formatAmount(event.amount)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Transactions Section */}
          {filteredTransactions.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>
                {t("commandPalette.sections.transactions")}
              </Text>
              {filteredTransactions.map((tx) => {
                const isOutflow = tx.flowType === "OUTFLOW";
                return (
                  <TouchableOpacity
                    key={`tx-${tx.id}`}
                    onPress={() => {
                      onClose();
                      onSelectTransaction?.(tx);
                    }}
                    style={styles.resultRow}
                    activeOpacity={0.7}
                  >
                    <View style={styles.rowLeft}>
                      <View style={[styles.iconBox, { backgroundColor: DESIGN_TOKENS.colors.slate[100] }]}>
                        <Feather name="file-text" size={16} color={DESIGN_TOKENS.colors.slate[600]} />
                      </View>
                      <View>
                        <Text style={styles.rowTitle}>
                          {tx.note || t("commandPalette.sections.transactions")}
                        </Text>
                        <Text style={styles.rowSubtitle}>
                          {tx.envelopeName ? `${tx.envelopeName} · ` : ""}
                          {new Date(tx.recordedAt).toLocaleDateString(locale)}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.rowAmount,
                        !isOutflow && { color: DESIGN_TOKENS.colors.success },
                      ]}
                    >
                      {isOutflow ? "-" : "+"}
                      {formatAmount(tx.amount)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* View all transactions in history */}
          {onViewAllTransactions && (filteredTransactions.length > 0 || activeCategory === "transactions") && (
            <TouchableOpacity
              onPress={() => {
                onClose();
                onViewAllTransactions(query.trim());
              }}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>
                {t("commandPalette.viewAllTransactions")}
              </Text>
              <Feather name="arrow-right" size={14} color={DESIGN_TOKENS.colors.sereneBlue} />
            </TouchableOpacity>
          )}

          {/* Empty state when query matches nothing */}
          {query.trim().length > 0 && totalResultsCount === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                {t("commandPalette.emptyState.noResults", { query })}
              </Text>
              <Text style={styles.emptySubtitle}>
                {t("commandPalette.emptyState.tip")}
              </Text>
            </View>
          )}

          {/* Suggested Prompts when empty query */}
          {!query && (
            <View style={styles.suggestedContainer}>
              <Text style={styles.suggestedHeader}>
                {t("assistant.suggestedTitle")}
              </Text>
              <View style={styles.chipsRow}>
                {SUGGESTED_CHIPS.map((chipKey) => {
                  const label = t(chipKey);
                  return (
                    <TouchableOpacity
                      key={chipKey}
                      onPress={() => setQuery(label)}
                      style={styles.chipButton}
                    >
                      <Text style={styles.chipText}>{label}</Text>
                      <Feather name="arrow-right" size={12} color={DESIGN_TOKENS.colors.slate[400]} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </MobileModalDialog>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 520,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    marginBottom: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: DESIGN_TOKENS.colors.slate[900],
    padding: 0,
  },
  categoryScroll: {
    flexDirection: "row",
    gap: 6,
    paddingBottom: 10,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
  },
  categoryPillActive: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "500",
    color: DESIGN_TOKENS.colors.slate[600],
  },
  categoryPillTextActive: {
    color: DESIGN_TOKENS.colors.sereneBlue,
    fontWeight: "600",
  },
  scrollContent: {
    paddingBottom: 24,
    gap: 16,
  },
  aiAskCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  aiAskIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  aiAskTextContainer: {
    flex: 1,
  },
  aiAskTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  aiAskSubtitle: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[500],
    marginTop: 2,
  },
  aiResultBox: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  aiResultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  aiHeaderTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  aiResultHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  aiResultText: {
    fontSize: 14,
    fontWeight: "500",
    color: DESIGN_TOKENS.colors.slate[800],
    lineHeight: 20,
  },
  clarifyBox: {
    gap: 8,
  },
  clarifyText: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.slate[700],
    fontWeight: "500",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  suggestionChip: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  suggestionText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[700],
  },
  unavailableText: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.critical,
  },
  sectionContainer: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: DESIGN_TOKENS.colors.slate[400],
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: DESIGN_TOKENS.colors.slate[800],
  },
  rowSubtitle: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[400],
    marginTop: 1,
  },
  rowAmount: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "monospace",
    color: DESIGN_TOKENS.colors.slate[800],
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: DESIGN_TOKENS.colors.slate[700],
  },
  emptySubtitle: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[400],
  },
  suggestedContainer: {
    gap: 8,
  },
  suggestedHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: DESIGN_TOKENS.colors.slate[400],
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
});
