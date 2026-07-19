import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { DESIGN_TOKENS } from '@money-matters/ui';
import { trpc } from '../../../lib/trpc';

const CATEGORY_TYPES = ['SAVINGS', 'REGULAR', 'EVERYDAY'] as const;
type CategoryType = (typeof CATEGORY_TYPES)[number];

const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  SAVINGS: 'Save Toward (Savings)',
  REGULAR: 'Regular Bills (Regular)',
  EVERYDAY: 'Day-to-Day (Everyday)',
};

export default function SettingsCategoriesScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('REGULAR');
  const [adding, setAdding] = useState(false);

  // Queries & Mutations
  const { data: categories, isLoading, refetch } = trpc.listCategories.useQuery();
  const createCategory = trpc.createCategory.useMutation();
  const archiveCategory = trpc.archiveCategory.useMutation();

  const handleAdd = async () => {
    if (!name.trim()) return;
    
    setAdding(true);
    try {
      await createCategory.mutateAsync({
        name: name.trim(),
        type,
      });

      setName('');
      refetch();
      Alert.alert("Success", "Category added successfully.");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to add category.");
    } finally {
      setAdding(false);
    }
  };

  const handleArchive = (categoryId: string, name: string) => {
    Alert.alert(
      "Archive Category",
      `Are you sure you want to archive the category "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            try {
              await archiveCategory.mutateAsync({ categoryId });
              refetch();
              Alert.alert("Success", "Category archived.");
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "Failed to archive category.");
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Budget Categories</Text>
        <Text style={styles.subtitle}>Manage priorities, bills, and everyday spending classes.</Text>
      </View>

      {/* Current Categories List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Categories</Text>
        {isLoading ? (
          <ActivityIndicator color={DESIGN_TOKENS.colors.accent} style={{ marginVertical: 12 }} />
        ) : !categories || categories.length === 0 ? (
          <View style={styles.cardEmpty}>
            <Text style={styles.emptyText}>No categories configured.</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {categories.map((cat, idx) => (
              <View key={cat.id}>
                {idx > 0 && <View style={styles.divider} />}
                <View style={styles.row}>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName}>{cat.name}</Text>
                    <Text style={styles.rowMeta}>
                      {CATEGORY_TYPE_LABELS[cat.type as CategoryType]} 
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleArchive(cat.id, cat.name)}
                    style={styles.archiveBtn}
                  >
                    <Text style={styles.archiveText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Add New Category */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add Budget Category</Text>
        <View style={styles.formCard}>
          <Text style={styles.label}>Category Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Health Insurance"
            value={name}
            onChangeText={setName}
            placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
          />

          <Text style={[styles.label, styles.gap]}>Category Type</Text>
          <View style={styles.optionRow}>
            {CATEGORY_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.optionBtn, type === t && styles.optionBtnActive]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.optionText, type === t && styles.optionTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>


          <TouchableOpacity
            style={[styles.addBtn, adding && styles.btnDisabled]}
            onPress={handleAdd}
            disabled={adding}
          >
            {adding ? (
              <ActivityIndicator color={DESIGN_TOKENS.colors.onAccent} />
            ) : (
              <Text style={styles.addBtnText}>Add Category</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: DESIGN_TOKENS.spacing.containerMargin,
    paddingTop: 64,
    paddingBottom: 48,
    backgroundColor: DESIGN_TOKENS.colors.background,
  },
  header: {
    marginBottom: 24,
  },
  backBtn: {
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: DESIGN_TOKENS.colors.accent,
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
  subtitle: {
    fontSize: 14,
    color: DESIGN_TOKENS.colors.textMuted,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: DESIGN_TOKENS.colors.textMuted,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  listCard: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  rowMeta: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.textMuted,
    marginTop: 2,
  },
  archiveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: DESIGN_TOKENS.radius.sm,
  },
  archiveText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  cardEmpty: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: DESIGN_TOKENS.colors.textMuted,
    fontSize: 14,
  },
  formCard: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textPrimary,
    marginBottom: 6,
  },
  gap: {
    marginTop: 16,
  },
  input: {
    backgroundColor: DESIGN_TOKENS.colors.background,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionBtn: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.colors.background,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  optionBtnActive: {
    backgroundColor: DESIGN_TOKENS.colors.accent,
    borderColor: DESIGN_TOKENS.colors.accent,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  optionTextActive: {
    color: DESIGN_TOKENS.colors.onAccent,
  },
  addBtn: {
    backgroundColor: DESIGN_TOKENS.colors.accent,
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  addBtnText: {
    color: DESIGN_TOKENS.colors.onAccent,
    fontSize: 15,
    fontWeight: '700',
  },
});
