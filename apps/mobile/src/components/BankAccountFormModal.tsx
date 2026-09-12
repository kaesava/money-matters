import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import {
  DESIGN_TOKENS,
  MobileModalDialog,
  BankProviderBadge,
  BankProvider,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../lib/trpc';

export interface BankAccountItemToEdit {
  id: string;
  name: string;
  bankProvider?: string | null;
  lastKnownBalance?: string | null;
  unbudgetedBuffer?: string | null;
  isPrivate?: boolean;
}

const PROVIDERS: BankProvider[] = [
  'CBA',
  'Westpac',
  'ANZ',
  'NAB',
  'ING',
  'Macquarie',
  'Other',
];

interface BankAccountFormModalProps {
  visible: boolean;
  accountToEdit?: BankAccountItemToEdit | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BankAccountFormModal({
  visible,
  accountToEdit,
  onClose,
  onSuccess,
}: BankAccountFormModalProps) {
  const isEdit = Boolean(accountToEdit?.id);
  const D = DESIGN_TOKENS;
  const utils = trpc.useUtils();

  const [name, setName] = useState('');
  const [provider, setProvider] = useState<BankProvider>('CBA');
  const [balance, setBalance] = useState('0.00');
  const [buffer, setBuffer] = useState('0.00');
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (accountToEdit) {
      setName(accountToEdit.name || '');
      setProvider((accountToEdit.bankProvider as BankProvider) || 'CBA');
      setBalance(accountToEdit.lastKnownBalance || '0.00');
      setBuffer(accountToEdit.unbudgetedBuffer || '0.00');
      setIsPrivate(Boolean(accountToEdit.isPrivate));
    } else {
      setName('');
      setProvider('CBA');
      setBalance('0.00');
      setBuffer('0.00');
      setIsPrivate(false);
    }
  }, [accountToEdit, visible]);

  const createMut = trpc.createBankAccount.useMutation();
  const updateMut = trpc.updateBankAccount.useMutation();

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), 'Account name is required.');
      return;
    }

    const balNum = parseFloat(balance) || 0;
    const bufNum = parseFloat(buffer) || 0;

    if (bufNum > balNum) {
      Alert.alert(
        t('common.error'),
        'Unbudgeted buffer cannot exceed total bank account balance.'
      );
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && accountToEdit?.id) {
        await updateMut.mutateAsync({
          accountId: accountToEdit.id,
          data: {
            name: name.trim(),
            bankProvider: provider as any,
            lastKnownBalance: balNum.toFixed(2),
            unbudgetedBuffer: bufNum.toFixed(2),
            isPrivate,
          },
        });
      } else {
        await createMut.mutateAsync({
          name: name.trim(),
          bankProvider: provider as any,
          lastKnownBalance: balNum.toFixed(2),
          unbudgetedBuffer: bufNum.toFixed(2),
          isPrivate,
        });
      }

      utils.listBankAccounts.invalidate();
      utils.listBankAccountsWithExpected.invalidate();
      onSuccess?.();
      onClose();
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : 'Failed to save bank account'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={isEdit ? 'Edit Bank Account' : 'Add Bank Account'}
      subtitle={
        isEdit
          ? 'Update account balances & provider'
          : 'Link a new physical checking or offset account'
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
        {/* Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Account Name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. CBA Smart Access, ANZ Offset Checking"
            placeholderTextColor="#94A3B8"
            style={styles.textInput}
            autoFocus={!isEdit}
          />
        </View>

        {/* Bank Provider Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Financial Institution</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.providersRow}
          >
            {PROVIDERS.map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setProvider(p)}
                style={[
                  styles.providerChip,
                  provider === p && styles.providerChipActive,
                ]}
              >
                <BankProviderBadge provider={p} size="sm" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Statement Balance */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Statement Balance ($)</Text>
          <View style={styles.amountInputWrap}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              value={balance}
              onChangeText={setBalance}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              style={styles.amountInput}
            />
          </View>
        </View>

        {/* Unbudgeted Buffer */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Unbudgeted Emergency Buffer ($)</Text>
          <View style={styles.amountInputWrap}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              value={buffer}
              onChangeText={setBuffer}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              style={styles.amountInput}
            />
          </View>
          <Text style={styles.helperText}>
            Protected cash buffer ring-fenced from pool allocations.
          </Text>
        </View>

        {/* Stealth Private Account Switch */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>🔒 Private Account (Stealth RLS)</Text>
            <Text style={styles.switchSubtext}>
              Balance and linked pools will only be visible to you, hidden from partner view.
            </Text>
          </View>
          <Switch
            value={isPrivate}
            onValueChange={setIsPrivate}
            trackColor={{ false: '#E2E8F0', true: '#2563eb' }}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>
              {isEdit ? 'Save Changes' : 'Link Account'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 14,
    paddingBottom: 10,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1B2B4B',
    backgroundColor: '#F8FAFC',
  },
  providersRow: {
    gap: 8,
    paddingVertical: 2,
  },
  providerChip: {
    padding: 2,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  providerChipActive: {
    borderColor: '#2563eb',
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '900',
    color: '#64748B',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#1B2B4B',
    paddingVertical: 8,
  },
  helperText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 12,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  switchSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default BankAccountFormModal;
