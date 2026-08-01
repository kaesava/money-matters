import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { DESIGN_TOKENS, MobilePaginationBar } from '@money-matters/ui';
import { trpc } from '../../../lib/trpc';
import { BankAccountFormModal } from '../../../components/BankAccountFormModal';
import { formatAUD } from '../../../lib/format';

export default function SettingsBankAccountsScreen() {
  const router = useRouter();

  const [modalVisible, setModalVisible] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<any>(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Queries & Mutations
  const { data: tenant, isLoading, refetch } = trpc.getTenant.useQuery();
  const archiveBankAccount = trpc.archiveBankAccount.useMutation();

  const handleArchive = (accountId: string, name: string) => {
    Alert.alert('Archive Bank Account', `Are you sure you want to archive "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          try {
            await archiveBankAccount.mutateAsync({ accountId });
            refetch();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to archive account.');
          }
        },
      },
    ]);
  };

  const accounts = tenant?.bankAccounts || [];
  const totalPages = Math.ceil(accounts.length / pageSize) || 1;
  const paginatedAccounts = accounts.slice((page - 1) * pageSize, page * pageSize);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Bank Accounts</Text>
            <Text style={styles.subtitle}>Register checking, bill, and savings accounts.</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setAccountToEdit(null);
              setModalVisible(true);
            }}
            style={styles.addHeaderBtn}
          >
            <Text style={styles.addHeaderBtnText}>➕ Add Account</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bank Account Transfer Guidance Prompt Card */}
      <View style={styles.promptCard}>
        <View style={styles.promptHeader}>
          <Text style={styles.promptIcon}>🏦</Text>
          <View style={styles.promptTextContent}>
            <Text style={styles.promptTitle}>Bank Account Switch Guidance</Text>
            <Text style={styles.promptSub}>
              When re-assigning pool bank accounts, use Osko/PayID to transfer your existing balance to align physical bank accounts with pool allocations.
            </Text>
          </View>
        </View>
      </View>

      {/* Accounts List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Registered Bank Accounts ({accounts.length})</Text>
        {isLoading ? (
          <ActivityIndicator color={DESIGN_TOKENS.colors.accent} style={{ marginVertical: 20 }} />
        ) : accounts.length === 0 ? (
          <View style={styles.cardEmpty}>
            <Text style={styles.emptyText}>No bank accounts registered.</Text>
          </View>
        ) : (
          <>
            <View style={styles.listCard}>
              {paginatedAccounts.map((acc, idx) => (
                <View key={acc.id}>
                  {idx > 0 && <View style={styles.divider} />}
                  <View style={styles.row}>
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowName}>{acc.name}</Text>
                      <Text style={styles.rowMeta}>Statement Balance: {formatAUD(acc.lastKnownBalance || '0')}</Text>
                    </View>

                    <View style={styles.btnRow}>
                      <TouchableOpacity
                        onPress={() => {
                          setAccountToEdit(acc);
                          setModalVisible(true);
                        }}
                        style={styles.editBtn}
                      >
                        <Text style={styles.editText}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => handleArchive(acc.id, acc.name)} style={styles.archiveBtn}>
                        <Text style={styles.archiveText}>Archive</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <MobilePaginationBar
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={accounts.length}
              pageSizeOptions={[10, 20, 50]}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </View>

      {/* Unified Bank Account Modal */}
      <BankAccountFormModal
        visible={modalVisible}
        accountToEdit={accountToEdit}
        onClose={() => setModalVisible(false)}
        onSuccess={() => refetch()}
      />
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
  header: { marginBottom: 20 },
  backBtn: { marginBottom: 12 },
  backText: { fontSize: 15, color: DESIGN_TOKENS.colors.accent, fontWeight: '700' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '900', color: DESIGN_TOKENS.colors.primary },
  subtitle: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted, marginTop: 2 },
  addHeaderBtn: { backgroundColor: '#00B4A6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addHeaderBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
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
    paddingVertical: 14,
  },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '700', color: DESIGN_TOKENS.colors.textPrimary },
  rowMeta: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.primary, marginTop: 2 },
  rowPurpose: { fontSize: 10, color: DESIGN_TOKENS.colors.textMuted, marginTop: 1 },
  btnRow: { flexDirection: 'row', gap: 6 },
  editBtn: { paddingVertical: 5, paddingHorizontal: 10, backgroundColor: '#F3F4F6', borderRadius: 6 },
  editText: { color: DESIGN_TOKENS.colors.textPrimary, fontSize: 11, fontWeight: '700' },
  archiveBtn: { paddingVertical: 5, paddingHorizontal: 10, backgroundColor: '#FEE2E2', borderRadius: 6 },
  archiveText: { color: '#991B1B', fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#E5E7EB' },
  cardEmpty: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { color: DESIGN_TOKENS.colors.textMuted, fontSize: 13 },
  promptCard: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: DESIGN_TOKENS.radius.md,
    padding: 14,
    marginBottom: 20,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  promptIcon: {
    fontSize: 18,
  },
  promptTextContent: {
    flex: 1,
  },
  promptTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78350F',
    marginBottom: 3,
  },
  promptSub: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
  },
});
