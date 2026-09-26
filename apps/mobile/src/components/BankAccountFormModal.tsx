import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import {
  DESIGN_TOKENS,
  MobileModalDialog,
  BankProviderBadge,
  BankProvider,
  MobileInput,
  AmountInput,
  MobileButton,
  FormLabel,
  FormFieldError,
  FormErrorBanner,
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

export type SupportedBankProvider = 'CBA' | 'Westpac' | 'ANZ' | 'NAB' | 'ING' | 'Macquarie' | 'Other';

const PROVIDERS: SupportedBankProvider[] = [
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
  const [provider, setProvider] = useState<SupportedBankProvider>('CBA');
  const [balance, setBalance] = useState('0.00');
  const [buffer, setBuffer] = useState('0.00');
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');
  const [bufferError, setBufferError] = useState('');
  const [generalError, setGeneralError] = useState('');

  useEffect(() => {
    if (accountToEdit) {
      setName(accountToEdit.name || '');
      setProvider((accountToEdit.bankProvider as SupportedBankProvider) || 'CBA');
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
    setNameError('');
    setBufferError('');
    setGeneralError('');
  }, [accountToEdit, visible]);

  const createMut = trpc.createBankAccount.useMutation();
  const updateMut = trpc.updateBankAccount.useMutation();

  const handleSubmit = async () => {
    let hasError = false;
    if (!name.trim()) {
      setNameError('Account name is required.');
      hasError = true;
    }

    const balNum = parseFloat(balance) || 0;
    const bufNum = parseFloat(buffer) || 0;

    if (bufNum > balNum) {
      setBufferError('Unbudgeted buffer cannot exceed total bank account balance.');
      hasError = true;
    }

    if (hasError) return;

    setNameError('');
    setBufferError('');
    setGeneralError('');
    setSubmitting(true);

    try {
      if (isEdit && accountToEdit?.id) {
        await updateMut.mutateAsync({
          accountId: accountToEdit.id,
          data: {
            name: name.trim(),
            bankProvider: provider,
            lastKnownBalance: balNum.toFixed(2),
            unbudgetedBuffer: bufNum.toFixed(2),
            isPrivate,
          },
        });
      } else {
        await createMut.mutateAsync({
          name: name.trim(),
          bankProvider: provider,
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
      setGeneralError(
        err instanceof Error ? err.message : 'Failed to save bank account'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isDirty = isEdit && accountToEdit
    ? (
        name.trim() !== (accountToEdit.name || '').trim() ||
        provider !== ((accountToEdit.bankProvider as SupportedBankProvider) || 'CBA') ||
        (parseFloat(balance) || 0) !== (parseFloat(accountToEdit.lastKnownBalance || '0') || 0) ||
        (parseFloat(buffer) || 0) !== (parseFloat(accountToEdit.unbudgetedBuffer || '0') || 0) ||
        isPrivate !== Boolean(accountToEdit.isPrivate)
      )
    : Boolean(name.trim() || (parseFloat(balance) || 0) > 0 || (parseFloat(buffer) || 0) > 0 || isPrivate);

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      isDirty={isDirty}
      title={isEdit ? 'Edit Bank Account' : 'Add Bank Account'}
      subtitle={
        isEdit
          ? 'Update account balances & provider'
          : 'Link a new physical checking or offset account'
      }
      footer={
        <MobileButton
          variant="primary"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!name.trim()}
        >
          {isEdit ? 'Save Changes' : 'Link Account'}
        </MobileButton>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
        <FormErrorBanner message={generalError} />

        {/* Name */}
        <MobileInput
          label="Account Name"
          required
          value={name}
          onChangeText={(val) => {
            setName(val);
            if (nameError) setNameError('');
          }}
          placeholder="e.g. CBA Smart Access, ANZ Offset Checking"
          error={nameError}
          autoFocus={!isEdit}
        />

        {/* Bank Provider Picker */}
        <View style={styles.inputGroup}>
          <FormLabel>Financial Institution</FormLabel>
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
        <AmountInput
          label="Statement Balance ($ AUD)"
          required
          value={balance}
          onChangeText={setBalance}
          placeholder="0.00"
        />

        {/* Unbudgeted Buffer */}
        <View style={styles.inputGroup}>
          <AmountInput
            label="Unbudgeted Emergency Buffer ($ AUD)"
            value={buffer}
            onChangeText={(val) => {
              setBuffer(val);
              if (bufferError) setBufferError('');
            }}
            placeholder="0.00"
            error={bufferError}
            hint="Protected cash buffer ring-fenced from pool allocations."
          />
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
    marginRight: 12,
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
