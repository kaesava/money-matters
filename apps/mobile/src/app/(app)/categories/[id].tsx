import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, ScrollView, Switch, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui';
import { trpc } from '../../../lib/trpc';
import { TransactionRow } from '../../../components/TransactionRow';
import { formatAUD } from '../../../lib/format';
import { FileNotesSection } from '../../../components/FileNotesSection';

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  // Implicit typing starts here from tRPC
  const { data: categories, isLoading, refetch } = trpc.listCategories.useQuery();
  const cat = categories?.find((c) => c?.id === id);

  const [editVisible, setEditVisible] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [rolloverRule, setRolloverRule] = useState<'ROLLOVER' | 'SWEEP' | 'RESET'>('ROLLOVER');
  const [isDefaultSavings, setIsDefaultSavings] = useState(false);
  const [everydayTargetKeepAmount, setEverydayTargetKeepAmount] = useState('');
  const [everydaySweepFrequency, setEverydaySweepFrequency] = useState<'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY'>('MONTHLY');
  const [saving, setSaving] = useState(false);

  const updateMutation = trpc.updateCategory.useMutation({
    onSuccess: () => {
      setEditVisible(false);
      refetch();
    },
  });

  const archiveMutation = trpc.archiveCategory.useMutation({
    onSuccess: () => {
      setEditVisible(false);
      router.back();
    },
  });

  const D = DESIGN_TOKENS;

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={D.colors.accent} size="large" />
        <Text style={{ marginTop: 12, color: D.colors.textMuted }}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!cat) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>{t('common.error')}</Text>
      </View>
    );
  }

  const currentBalanceNum = parseFloat(cat.currentBalance);
  const targetAmountNum = cat.targetAmount ? parseFloat(cat.targetAmount) : null;

  const pct = targetAmountNum && targetAmountNum > 0
    ? Math.min(Math.round((currentBalanceNum / targetAmountNum) * 100), 100)
    : null;

  const color =
    cat.healthStatus === 'GREEN' ? D.colors.success :
    cat.healthStatus === 'AMBER' ? D.colors.warning :
    cat.healthStatus === 'RED' ? D.colors.critical :
    D.colors.accent;

  const handleStartEdit = () => {
    setName(cat.name);
    setTarget(cat.targetAmount ? parseFloat(cat.targetAmount).toFixed(2) : '');
    setTargetDate(cat.targetDate ? cat.targetDate.split('T')[0] : '');
    
    // Strategic Fix: Removed `(cat as any)` escapes. Let the native tRPC properties flow.
    setRolloverRule(cat.rolloverRule || 'ROLLOVER');
    setIsDefaultSavings(cat.isDefaultSavings || false);
    setEverydayTargetKeepAmount(cat.everydayTargetKeepAmount ? parseFloat(cat.everydayTargetKeepAmount).toFixed(2) : '');
    setEverydaySweepFrequency(cat.everydaySweepFrequency || 'MONTHLY');
    setEditVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateMutation.mutateAsync({
        categoryId: cat.id,
        data: {
          name: name.trim(),
          rolloverRule,
          isDefaultSavings: cat.type === 'GOAL' ? isDefaultSavings : undefined,
          everydayTargetKeepAmount: cat.type === 'EVERYDAY' && everydayTargetKeepAmount ? parseFloat(everydayTargetKeepAmount).toFixed(2) : undefined,
          everydaySweepFrequency: cat.type === 'EVERYDAY' ? everydaySweepFrequency : undefined,
        },
      });
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Archive Category',
      `Are you sure you want to archive "${cat.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await archiveMutation.mutateAsync({ categoryId: cat.id });
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : String(err));
            }
          },
        },
      ]
    );
  };

  return (
    <MobileScreenWrapper
      title={cat.name}
      showBack={true}
      onBackPress={() => router.back()}
      showProfile={false}
    >
      <View style={styles.card}>
        <View style={styles.row}>
          <View>
            <Text style={styles.metaLabel}>{t('categories.detail.currentBalance')}</Text>
            <Text style={[styles.balanceValue, { color }]}>{formatAUD(cat.currentBalance)}</Text>
          </View>
          {cat.targetAmount && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.metaLabel}>{t('categories.detail.targetAmount')}</Text>
              <Text style={styles.targetValue}>{formatAUD(cat.targetAmount)}</Text>
            </View>
          )}
        </View>

        {pct !== null && (
          <>
            <Text style={styles.metaLabel}>{t('categories.detail.progressBar')}</Text>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
            <Text style={[styles.pctText, { color }]}>{pct}%</Text>
          </>
        )}

        {/* Strategic Fix: Removed `(cat as any)` escapes */}
        {cat.everydayTargetKeepAmount && (
          <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
            <Text style={styles.metaLabel}>Everyday Limit Sweep</Text>
            <Text style={{ fontSize: 13, color: '#1B2B4B', fontWeight: 'bold', marginTop: 2 }}>
              Keep floor of {formatAUD(cat.everydayTargetKeepAmount)} • Sweeping {cat.everydaySweepFrequency}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleStartEdit}
          style={{
            marginTop: 16,
            backgroundColor: '#F3F4F6',
            paddingVertical: 10,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1B2B4B' }}>Edit Details</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>{t('categories.detail.history')}</Text>
      <CategoryTransactionsList categoryId={id!} />
      <FileNotesSection entityType="CATEGORY" entityId={id!} />

      {/* Edit Sheet Modal */}
      <Modal visible={editVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Category</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)}>
                <Text style={{ fontSize: 16, color: '#9CA3AF' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                />
              </View>

              {cat.type === 'EVERYDAY' ? (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Everyday Target Keep Amount ($)</Text>
                    <TextInput
                      value={everydayTargetKeepAmount}
                      onChangeText={setEverydayTargetKeepAmount}
                      keyboardType="numeric"
                      placeholder="e.g. 200.00"
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Sweep Frequency</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY'] as const).map((freq) => (
                        <TouchableOpacity
                          key={freq}
                          onPress={() => setEverydaySweepFrequency(freq)}
                          style={[
                            styles.freqBtn,
                            everydaySweepFrequency === freq && styles.freqBtnActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.freqBtnText,
                              everydaySweepFrequency === freq && styles.freqBtnTextActive,
                            ]}
                          >
                            {freq}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Rollover Rule</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {(['ROLLOVER', 'SWEEP', 'RESET'] as const).map((rule) => (
                        <TouchableOpacity
                          key={rule}
                          onPress={() => setRolloverRule(rule)}
                          style={[
                            styles.freqBtn,
                            rolloverRule === rule && styles.freqBtnActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.freqBtnText,
                              rolloverRule === rule && styles.freqBtnTextActive,
                            ]}
                          >
                            {rule}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {cat.type === 'GOAL' && (
                    <View style={[styles.formGroup, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                      <Text style={styles.label}>Default Savings Sweep target?</Text>
                      <Switch
                        value={isDefaultSavings}
                        onValueChange={setIsDefaultSavings}
                      />
                    </View>
                  )}
                </>
              )}

              <View style={{ gap: 8, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  style={[styles.saveBtn, saving && { opacity: 0.5 }]}
                >
                  <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
                </TouchableOpacity>

                {cat.type !== 'EVERYDAY' && (
                  <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
                    <Text style={styles.deleteBtnText}>Archive Category</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </MobileScreenWrapper>
  );
}

function CategoryTransactionsList({ categoryId }: { categoryId: string }) {
  const { data: transactions = [], isLoading } = trpc.listCategoryTransactions.useQuery({ categoryId });

  if (isLoading) {
    return <ActivityIndicator color={DESIGN_TOKENS.colors.accent} style={{ marginTop: 20 }} />;
  }

  if (transactions.length === 0) {
    return (
      <View style={styles.emptyHistory}>
        <Text style={styles.emptyText}>{t('categories.detail.noHistory', { defaultValue: 'No transactions yet.' })}</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 8, marginBottom: 20 }}>
      {transactions.map((tx) => (
        <TransactionRow 
          key={tx.id} 
          amount={tx.amount}
          flowType={tx.flowType}
          categoryName={tx.categoryName || 'Uncategorized'}
          note={tx.note}
          recordedAt={tx.recordedAt}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  loadingText: { fontSize: 14, color: '#EF4444', fontWeight: 'bold' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  metaLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: '#9CA3AF', letterSpacing: 0.5 },
  balanceValue: { fontSize: 24, fontWeight: '900', marginTop: 2 },
  targetValue: { fontSize: 16, fontWeight: '700', color: '#1B2B4B', marginTop: 2 },
  barBg: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden', marginTop: 8, marginBottom: 4 },
  barFill: { height: 6, borderRadius: 3 },
  pctText: { fontSize: 11, fontWeight: 'bold', textAlign: 'right' },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  emptyHistory: { paddingVertical: 24, alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12 },
  emptyText: { fontSize: 13, color: '#9CA3AF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1B2B4B' },
  formGroup: { flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#4B5563' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#1B2B4B' },
  freqBtn: { flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, alignItems: 'center' },
  freqBtnActive: { borderColor: '#00B4A6', backgroundColor: '#E0F2FE' },
  freqBtnText: { fontSize: 11, fontWeight: 'bold', color: '#4B5563' },
  freqBtnTextActive: { color: '#00B4A6' },
  saveBtn: { backgroundColor: '#00B4A6', paddingVertical: 12, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  deleteBtn: { paddingVertical: 12, borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 12, alignItems: 'center' },
  deleteBtnText: { color: '#EF4444', fontSize: 14, fontWeight: 'bold' },
});
