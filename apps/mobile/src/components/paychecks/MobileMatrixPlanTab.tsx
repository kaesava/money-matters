import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { formatAUD } from '../../lib/format';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;

export function MobileMatrixPlanTab() {
  const router = useRouter();
  const D = DESIGN_TOKENS;
  const [expandedColId, setExpandedColId] = useState<string | null>(null);

  const { data, isLoading, refetch } = trpc.getMatrixProjectionData.useQuery({
    monthsAhead: 12,
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading 12-month projection...</Text>
      </View>
    );
  }

  const columns = data?.projection?.columns ?? [];
  const groups = data?.projection?.groups ?? [];

  if (columns.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Feather name="calendar" size={40} color="#94A3B8" />
        <Text style={styles.emptyTitle}>No Upcoming Paydays</Text>
        <Text style={styles.emptySubtitle}>
          Add an income schedule to see your 12-month rolling cash-flow matrix.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerInfo}>
        <Text style={styles.horizonLabel}>12-Month Rolling Projection</Text>
        <Text style={styles.horizonSubtitle}>
          Swipe across upcoming paydays to inspect ring-fenced allocations.
        </Text>
      </View>

      <FlatList
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 16}
        decelerationRate="fast"
        contentContainerStyle={styles.carouselContainer}
        data={columns}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const isExpanded = expandedColId === item.id;

          // Calculate totals for this column from groups
          let billsTotal = 0;
          let goalsTotal = 0;
          let everydayTotal = 0;
          let surplusAmount = 0;

          const billsGroup = groups.find((g) => g.id === 'bills');
          const goalsGroup = groups.find((g) => g.id === 'goals');
          const everydayGroup = groups.find((g) => g.id === 'everyday');
          const surplusGroup = groups.find((g) => g.id === 'surplus');

          if (billsGroup) {
            for (const r of billsGroup.rows) {
              billsTotal += r.cells[item.id]?.allocated || 0;
            }
          }
          if (goalsGroup) {
            for (const r of goalsGroup.rows) {
              goalsTotal += r.cells[item.id]?.allocated || 0;
            }
          }
          if (everydayGroup) {
            for (const r of everydayGroup.rows) {
              everydayTotal += r.cells[item.id]?.allocated || 0;
            }
          }
          if (surplusGroup && surplusGroup.rows[0]) {
            surplusAmount = surplusGroup.rows[0].cells[item.id]?.allocated || 0;
          }

          const isDeficit = surplusAmount < 0;

          return (
            <View style={[styles.card, { width: CARD_WIDTH }]}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View>
                  <View style={styles.badgeRow}>
                    <Text style={styles.cycleBadge}>Payday #{index + 1}</Text>
                    {isDeficit ? (
                      <View style={styles.deficitBadge}>
                        <Text style={styles.deficitText}>
                          ⚠️ Deficit {formatAUD(Math.abs(surplusAmount))}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.surplusBadge}>
                        <Text style={styles.surplusText}>
                          Surplus {formatAUD(surplusAmount)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.payDate}>{item.dateLabel || item.date}</Text>
                  <Text style={styles.sourceName}>{item.sourceName}</Text>
                </View>

                <View style={styles.incomeCol}>
                  <Text style={styles.incomeLabel}>Net Pay</Text>
                  <Text style={styles.incomeAmount}>
                    {formatAUD(item.totalIncome)}
                  </Text>
                </View>
              </View>

              {/* Summary Allocations Breakdown */}
              <View style={styles.breakdownGrid}>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownItemLabel}>📅 Bills</Text>
                  <Text style={styles.breakdownItemVal}>{formatAUD(billsTotal)}</Text>
                </View>

                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownItemLabel}>🎯 Goals</Text>
                  <Text style={styles.breakdownItemVal}>{formatAUD(goalsTotal)}</Text>
                </View>

                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownItemLabel}>☕ Everyday</Text>
                  <Text style={styles.breakdownItemVal}>
                    {formatAUD(everydayTotal)}
                  </Text>
                </View>
              </View>

              {/* Expandable Bills Accordion */}
              <TouchableOpacity
                onPress={() => setExpandedColId(isExpanded ? null : item.id)}
                style={styles.accordionToggle}
              >
                <Text style={styles.accordionToggleText}>
                  {isExpanded ? 'Hide Scheduled Bills' : 'Show Scheduled Bills'}
                </Text>
                <Feather
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#2563eb"
                />
              </TouchableOpacity>

              {isExpanded && billsGroup && (
                <View style={styles.billsList}>
                  {billsGroup.rows
                    .filter((r) => (r.cells[item.id]?.allocated || 0) > 0)
                    .map((r) => (
                      <View key={r.categoryId} style={styles.billRow}>
                        <Text style={styles.billName} numberOfLines={1}>
                          {r.categoryName}
                        </Text>
                        <Text style={styles.billAmount}>
                          {formatAUD(r.cells[item.id]?.allocated || 0)}
                        </Text>
                      </View>
                    ))}
                </View>
              )}

              {/* Open Split Studio Action */}
              <TouchableOpacity
                onPress={() => router.push(`/(app)/paychecks/${item.id}` as never)}
                style={styles.splitStudioBtn}
              >
                <Feather name="sliders" size={15} color="#FFFFFF" />
                <Text style={styles.splitStudioBtnText}>Open Split Studio</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 30,
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  headerInfo: {
    paddingHorizontal: 20,
  },
  horizonLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  horizonSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  carouselContainer: {
    paddingHorizontal: 20,
    gap: 16,
    paddingVertical: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cycleBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  surplusBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  surplusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  deficitBadge: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deficitText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#BA1A1A',
  },
  payDate: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1B2B4B',
  },
  sourceName: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  incomeCol: {
    alignItems: 'flex-end',
  },
  incomeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  incomeAmount: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#2563eb',
  },
  breakdownGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownItemLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  breakdownItemVal: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#1B2B4B',
    marginTop: 2,
  },
  accordionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  accordionToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  billsList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billName: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
    marginRight: 8,
  },
  billAmount: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  splitStudioBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  splitStudioBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default MobileMatrixPlanTab;
