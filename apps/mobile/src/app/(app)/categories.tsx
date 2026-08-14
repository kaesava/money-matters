import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, MobileScreenWrapper, MobileFilterBar, MobileSpinner } from '@money-matters/ui/mobile';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';

import { CategoryFormModal } from '../../components/CategoryFormModal';
import { MoveMoneyModal } from '../../components/MoveMoneyModal';
import { MobileEverydayPoolSection, MobileCategoryItem } from '../../components/categories/MobileEverydayPoolSection';
import { MobileRegularBillsSection } from '../../components/categories/MobileRegularBillsSection';
import { MobileSavingsGoalsSection } from '../../components/categories/MobileSavingsGoalsSection';

export default function CategoriesScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const params = useLocalSearchParams<{ health?: string; search?: string }>();

  const { data: session } = authClient.useSession();
  const { data: categories = [], isLoading, error, refetch } = trpc.listCategories.useQuery();

  const typedCategories = categories as MobileCategoryItem[];

  // Filters State
  const [searchQuery, setSearchQuery] = useState(params.search ?? '');

  React.useEffect(() => {
    if (params.search !== undefined) {
      setSearchQuery(params.search);
    }
  }, [params.search]);

  const [healthFilter, setHealthFilter] = useState<string>(params.health ?? 'ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Section Collapse State
  const [isEverydayCollapsed, setIsEverydayCollapsed] = useState(true);
  const [isRegularCollapsed, setIsRegularCollapsed] = useState(true);

  // Modals
  const [categoryFormVisible, setCategoryFormVisible] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<MobileCategoryItem | null>(null);
  const [moveMoneyVisible, setMoveMoneyVisible] = useState(false);

  const archiveMut = trpc.archiveCategory.useMutation({
    onSuccess: () => refetch(),
  });

  const handleArchive = (cat: MobileCategoryItem) => {
    if (cat.type === 'EVERYDAY') {
      Alert.alert('Archive Locked', 'The Everyday category cannot be archived or deleted.');
      return;
    }
    Alert.alert('Archive Category', `Are you sure you want to archive "${cat.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          try {
            await archiveMut.mutateAsync({ categoryId: cat.id });
            posthog.capture('category_archived', { category_type: cat.type });
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : String(err));
          }
        },
      },
    ]);
  };

  // Bucket Filtering & Aggregations
  const everydayCats = typedCategories.filter((c) => c?.type === 'EVERYDAY');
  const regularCats = typedCategories.filter((c) => c?.type === 'REGULAR');
  const goalCats = typedCategories.filter((c) => c?.type === 'GOAL');

  const everydayBalance = everydayCats.reduce((sum, c) => sum + parseFloat(c?.currentBalance || '0'), 0);
  const everydayBudget = everydayCats.reduce(
    (sum, c) => sum + parseFloat(c?.everydayAllowanceAmount || c?.monthlyAmount || '0'),
    0
  );

  const regularBalance = regularCats.reduce((sum, c) => sum + parseFloat(c?.currentBalance || '0'), 0);
  const regularBudget = regularCats.reduce((sum, c) => sum + parseFloat(c?.monthlyAmount || '0'), 0);

  const filterFn = (list: MobileCategoryItem[]) =>
    list.filter((c) => {
      if (!c) return false;
      const q = searchQuery.toLowerCase().trim();
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (healthFilter !== 'ALL' && c.healthStatus !== healthFilter) return false;
      if (typeFilter !== 'ALL' && c.type !== typeFilter) return false;
      return true;
    });

  const onTrackCount = typedCategories.filter((c) => c?.healthStatus === 'GREEN').length;
  const needsAttentionCount = typedCategories.filter((c) => c?.healthStatus === 'AMBER').length;
  const behindCount = typedCategories.filter((c) => c?.healthStatus === 'RED').length;

  return (
    <View style={{ flex: 1 }}>
      <MobileScreenWrapper
        title={t('categories.title')}
        user={session?.user}
        onNavigateHome={() => router.push('/(app)/home')}
        onNavigateCategories={() => router.push('/(app)/categories')}
        onNavigateSettings={() => router.push('/(app)/settings')}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 100, gap: 14 }}>
          {/* Header Action Controls */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => setMoveMoneyVisible(true)}
              style={styles.moveMoneyHeaderBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.moveMoneyHeaderBtnText}>{t('categories.actions.moveMoney')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setCategoryToEdit(null);
                setCategoryFormVisible(true);
              }}
              style={styles.newCategoryHeaderBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.newCategoryHeaderBtnText}>➕ New Category</Text>
            </TouchableOpacity>
          </View>

          {/* Top Health Counters */}
          <View style={styles.grid2x2}>
            <TouchableOpacity
              onPress={() => setHealthFilter('ALL')}
              style={[
                styles.statChip,
                healthFilter === 'ALL' && { backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: '#64748B' },
              ]}
            >
              <Text style={styles.statChipLabel}>TOTAL</Text>
              <Text style={styles.statChipVal}>{typedCategories.length}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setHealthFilter('GREEN')}
              style={[
                styles.statChip,
                { borderColor: '#A7F3D0' },
                healthFilter === 'GREEN' && { backgroundColor: '#ECFDF5', borderWidth: 2, borderColor: '#10B981' },
              ]}
            >
              <Text style={[styles.statChipLabel, { color: '#059669' }]}>ON TRACK</Text>
              <Text style={[styles.statChipVal, { color: '#059669' }]}>{onTrackCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setHealthFilter('AMBER')}
              style={[
                styles.statChip,
                { borderColor: '#FDE68A' },
                healthFilter === 'AMBER' && { backgroundColor: '#FFFBEB', borderWidth: 2, borderColor: '#F59E0B' },
              ]}
            >
              <Text style={[styles.statChipLabel, { color: '#D97706' }]}>NEEDS ATTENTION</Text>
              <Text style={[styles.statChipVal, { color: '#D97706' }]}>{needsAttentionCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setHealthFilter('RED')}
              style={[
                styles.statChip,
                { borderColor: '#FECDD3' },
                healthFilter === 'RED' && { backgroundColor: '#FEF2F2', borderWidth: 2, borderColor: '#EF4444' },
              ]}
            >
              <Text style={[styles.statChipLabel, { color: '#E11D48' }]}>BEHIND</Text>
              <Text style={[styles.statChipVal, { color: '#E11D48' }]}>{behindCount}</Text>
            </TouchableOpacity>
          </View>

          {/* Search & Filter Bar */}
          <MobileFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search category name..."
            filterGroups={[
              {
                label: 'Health',
                value: healthFilter,
                onChange: setHealthFilter,
                options: [
                  { id: 'ALL', label: 'All' },
                  { id: 'GREEN', label: 'On Track' },
                  { id: 'AMBER', label: 'Needs Attention' },
                  { id: 'RED', label: 'Behind' },
                ],
              },
            ]}
            onClearAll={() => {
              setSearchQuery('');
              setHealthFilter('ALL');
            }}
          />

          {isLoading && (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <MobileSpinner size="large" label="Loading categories & savings pools..." />
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorTitle}>{t('common.error', { defaultValue: 'Error' })}</Text>
              <Text style={styles.errorSubtitle}>{error.message}</Text>
            </View>
          )}

          {/* SECTION 1: EVERYDAY SPENDING */}
          <MobileEverydayPoolSection
            categories={filterFn(everydayCats)}
            everydayBalance={everydayBalance}
            everydayBudget={everydayBudget}
            isCollapsed={isEverydayCollapsed}
            onToggleCollapse={() => setIsEverydayCollapsed(!isEverydayCollapsed)}
            onEditCategory={(cat) => {
              setCategoryToEdit(cat);
              setCategoryFormVisible(true);
            }}
          />

          {/* SECTION 2: REGULAR BILLS */}
          <MobileRegularBillsSection
            categories={filterFn(regularCats)}
            regularBalance={regularBalance}
            regularBudget={regularBudget}
            isCollapsed={isRegularCollapsed}
            onToggleCollapse={() => setIsRegularCollapsed(!isRegularCollapsed)}
            onEditCategory={(cat) => {
              setCategoryToEdit(cat);
              setCategoryFormVisible(true);
            }}
            onArchiveCategory={handleArchive}
          />

          {/* SECTION 3: SAVE TOWARD (GOALS) */}
          <MobileSavingsGoalsSection
            categories={filterFn(goalCats)}
            onEditCategory={(cat) => {
              setCategoryToEdit(cat);
              setCategoryFormVisible(true);
            }}
            onArchiveCategory={handleArchive}
          />
        </ScrollView>

        <CategoryFormModal
          visible={categoryFormVisible}
          categoryToEdit={categoryToEdit}
          onClose={() => setCategoryFormVisible(false)}
          onSuccess={() => refetch()}
        />

        <MoveMoneyModal
          visible={moveMoneyVisible}
          onClose={() => setMoveMoneyVisible(false)}
          onSuccess={() => refetch()}
        />
      </MobileScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  moveMoneyHeaderBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    alignItems: 'center',
  },
  moveMoneyHeaderBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0D9488',
  },
  newCategoryHeaderBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#00B4A6',
    alignItems: 'center',
  },
  newCategoryHeaderBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statChip: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statChipLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },
  statChipVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1B2B4B',
    marginTop: 2,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
  },
  errorSubtitle: {
    fontSize: 12,
    color: '#B91C1C',
    textAlign: 'center',
  },
});
