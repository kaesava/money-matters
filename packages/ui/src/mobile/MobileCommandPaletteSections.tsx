import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { t } from "@money-matters/i18n";
import { DESIGN_TOKENS } from "../tokens";
import { styles } from "./MobileCommandPaletteSheet.styles";
import type {
  SearchResultAccount,
  SearchResultEnvelope,
  SearchResultEvent,
  SearchResultTransaction,
} from "../hooks/useCommandPaletteState";

interface MobileCommandPaletteSectionsProps {
  filteredAccounts: SearchResultAccount[];
  filteredEnvelopes: SearchResultEnvelope[];
  filteredEvents: SearchResultEvent[];
  filteredTransactions: SearchResultTransaction[];
  formatAmount: (amount: number) => string;
  locale: string;
  onClose: () => void;
  onSelectAccount?: (account: SearchResultAccount) => void;
  onSelectEnvelope?: (envelope: SearchResultEnvelope) => void;
  onSelectEvent?: (event: SearchResultEvent) => void;
  onSelectTransaction?: (transaction: SearchResultTransaction) => void;
}

export const MobileCommandPaletteSections: React.FC<MobileCommandPaletteSectionsProps> = ({
  filteredAccounts,
  filteredEnvelopes,
  filteredEvents,
  filteredTransactions,
  formatAmount,
  locale,
  onClose,
  onSelectAccount,
  onSelectEnvelope,
  onSelectEvent,
  onSelectTransaction,
}) => (
  <>
    {filteredAccounts.length > 0 && (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>{t("commandPalette.sections.accounts")}</Text>
        {filteredAccounts.map((account) => (
          <TouchableOpacity key={`acc-${account.id}`} onPress={() => { onClose(); onSelectAccount?.(account); }} style={styles.resultRow} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: DESIGN_TOKENS.colors.successLight }]}>
                <Feather name="credit-card" size={16} color={DESIGN_TOKENS.colors.success} />
              </View>
              <View>
                <Text style={styles.rowTitle}>{account.name}</Text>
                {account.type ? <Text style={styles.rowSubtitle}>{account.type}</Text> : null}
              </View>
            </View>
            {account.currentBalance !== undefined && <Text style={styles.rowAmount}>{formatAmount(account.currentBalance)}</Text>}
          </TouchableOpacity>
        ))}
      </View>
    )}

    {filteredEnvelopes.length > 0 && (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>{t("commandPalette.sections.envelopes")}</Text>
        {filteredEnvelopes.map((envelope) => (
          <TouchableOpacity key={`env-${envelope.id}`} onPress={() => { onClose(); onSelectEnvelope?.(envelope); }} style={styles.resultRow} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: DESIGN_TOKENS.colors.accentLight }]}>
                <Feather name="mail" size={16} color={DESIGN_TOKENS.colors.sereneBlue} />
              </View>
              <View>
                <Text style={styles.rowTitle}>{envelope.name}</Text>
                {envelope.type ? <Text style={styles.rowSubtitle}>{envelope.type}</Text> : null}
              </View>
            </View>
            {envelope.currentBalance !== undefined && <Text style={styles.rowAmount}>{formatAmount(envelope.currentBalance)}</Text>}
          </TouchableOpacity>
        ))}
      </View>
    )}

    {filteredEvents.length > 0 && (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>{t("commandPalette.sections.upcoming")}</Text>
        {filteredEvents.map((event) => {
          const isIncome = event.type === "INCOME";
          return (
            <TouchableOpacity key={`ev-${event.id}`} onPress={() => { onClose(); onSelectEvent?.(event); }} style={styles.resultRow} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: isIncome ? DESIGN_TOKENS.colors.successLight : DESIGN_TOKENS.colors.accentLight }]}>
                  <Feather name="calendar" size={16} color={isIncome ? DESIGN_TOKENS.colors.success : DESIGN_TOKENS.colors.sereneBlue} />
                </View>
                <View>
                  <Text style={styles.rowTitle}>{event.name}</Text>
                  <Text style={styles.rowSubtitle}>{event.dueDate} · {isIncome ? t("common.income") : t("common.expense")}</Text>
                </View>
              </View>
              <Text style={[styles.rowAmount, isIncome && { color: DESIGN_TOKENS.colors.success }]}>
                {isIncome ? "+" : "-"}{formatAmount(event.amount)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    )}

    {filteredTransactions.length > 0 && (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>{t("commandPalette.sections.transactions")}</Text>
        {filteredTransactions.map((tx) => {
          const isOutflow = tx.flowType === "OUTFLOW";
          return (
            <TouchableOpacity key={`tx-${tx.id}`} onPress={() => { onClose(); onSelectTransaction?.(tx); }} style={styles.resultRow} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: DESIGN_TOKENS.colors.slate[100] }]}>
                  <Feather name="file-text" size={16} color={DESIGN_TOKENS.colors.slate[600]} />
                </View>
                <View>
                  <Text style={styles.rowTitle}>{tx.note || t("commandPalette.sections.transactions")}</Text>
                  <Text style={styles.rowSubtitle}>
                    {tx.envelopeName ? `${tx.envelopeName} · ` : ""}
                    {new Date(tx.recordedAt).toLocaleDateString(locale)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.rowAmount, !isOutflow && { color: DESIGN_TOKENS.colors.success }]}>
                {isOutflow ? "-" : "+"}{formatAmount(tx.amount)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    )}
  </>
);
