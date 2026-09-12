import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { SUPPORTED_CURRENCIES } from '@money-matters/types';
import { trpc } from '../../lib/trpc';

const AUSTRALIAN_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;

export function HouseholdDetailsSection() {
  const utils = trpc.useUtils();
  const govQuery = trpc.getHouseholdGovernanceInfo.useQuery();
  const gov = govQuery.data;

  const [householdName, setHouseholdName] = useState('');
  const [country, setCountry] = useState('AU');
  const [currency, setCurrency] = useState('AUD');
  const [state, setState] = useState('');
  const [postcode, setPostcode] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (gov) {
      setHouseholdName(gov.householdName || '');
      setCountry(gov.country || 'AU');
      setCurrency(gov.currency || 'AUD');
      setState(gov.state || '');
      setPostcode(gov.postcode || '');
    }
  }, [gov]);

  const updateHouseholdMut = trpc.updateHousehold.useMutation({
    onSuccess: () => {
      utils.getHouseholdGovernanceInfo.invalidate();
      utils.getUserPreferences.invalidate();
      Alert.alert(t('common.success'), 'Household details updated successfully.');
    },
    onError: (err) => {
      Alert.alert(t('common.error'), err.message || 'Failed to update household details.');
    },
  });

  const isOwner = gov?.isOwner ?? false;

  const isDirty = Boolean(
    gov &&
      (householdName !== (gov.householdName || '') ||
        country !== (gov.country || 'AU') ||
        currency !== (gov.currency || 'AUD') ||
        state !== (gov.state || '') ||
        postcode !== (gov.postcode || ''))
  );

  const handleSelectCurrency = (newCurr: string) => {
    if (!isOwner) return;
    if (newCurr !== (gov?.currency || 'AUD')) {
      Alert.alert(
        t('settings.currencyConfirmTitle'),
        t('settings.currencyConfirmBody', {
          oldCurrency: gov?.currency || 'AUD',
          newCurrency: newCurr,
        }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            onPress: () => setCurrency(newCurr),
          },
        ]
      );
    } else {
      setCurrency(newCurr);
    }
  };

  const handleSave = async () => {
    if (!isOwner) return;

    if (!householdName.trim()) {
      Alert.alert(t('common.error'), 'Household name cannot be blank.');
      return;
    }

    if (country === 'AU' && postcode.trim() && !/^\d{4}$/.test(postcode.trim())) {
      Alert.alert(t('common.error'), 'Australian postcode must be exactly 4 digits.');
      return;
    }

    setSaving(true);
    try {
      await updateHouseholdMut.mutateAsync({
        name: householdName.trim(),
        country: country.trim(),
        currency: currency.trim(),
        timezone: gov?.timezone || 'Australia/Sydney',
        state: state.trim(),
        postcode: postcode.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  if (govQuery.isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>🏠 Household Profile & Location</Text>
        {!isOwner && (
          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>Member View</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardSubtitle}>
        Shared across all household members for budget calculations and tax year alignment.
      </Text>

      {/* Household Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Household Name <Text style={styles.requiredStar}>*</Text>
        </Text>
        <TextInput
          style={[styles.textInput, !isOwner && styles.disabledInput]}
          value={householdName}
          onChangeText={setHouseholdName}
          editable={isOwner}
          placeholder="e.g. Smith Household"
          placeholderTextColor="#94A3B8"
        />
      </View>

      {/* Base Currency Chips */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Base Currency <Text style={styles.requiredStar}>*</Text>
        </Text>
        <View style={styles.currencyChips}>
          {Object.values(SUPPORTED_CURRENCIES).map((c) => {
            const isSelected = currency === c.code;
            return (
              <TouchableOpacity
                key={c.code}
                onPress={() => handleSelectCurrency(c.code)}
                disabled={!isOwner}
                style={[
                  styles.currencyChip,
                  isSelected && styles.currencyChipSelected,
                  !isOwner && { opacity: 0.7 },
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.currencyChipText,
                    isSelected && styles.currencyChipTextSelected,
                  ]}
                >
                  {c.code} ({c.symbol})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Australian State / Territory */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>State / Territory (Australia)</Text>
        <View style={styles.stateChips}>
          {AUSTRALIAN_STATES.map((s) => {
            const isSelected = state === s;
            return (
              <TouchableOpacity
                key={s}
                onPress={() => isOwner && setState(isSelected ? '' : s)}
                disabled={!isOwner}
                style={[
                  styles.stateChip,
                  isSelected && styles.stateChipSelected,
                  !isOwner && { opacity: 0.7 },
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.stateChipText,
                    isSelected && styles.stateChipTextSelected,
                  ]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Postcode */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Postcode (4 Digits)</Text>
        <TextInput
          style={[styles.textInput, !isOwner && styles.disabledInput]}
          value={postcode}
          onChangeText={setPostcode}
          editable={isOwner}
          placeholder="2000"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          maxLength={4}
        />
      </View>

      {/* Save Button */}
      {isOwner && (
        <TouchableOpacity
          onPress={handleSave}
          disabled={!isDirty || saving}
          style={[
            styles.saveBtn,
            (!isDirty || saving) && styles.saveBtnDisabled,
          ]}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save Household Details</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  memberBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  memberBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  requiredStar: {
    color: '#DC2626',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#1E293B',
  },
  disabledInput: {
    backgroundColor: '#F1F5F9',
    color: '#94A3B8',
  },
  currencyChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  currencyChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  currencyChipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563eb',
  },
  currencyChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  currencyChipTextSelected: {
    color: '#2563eb',
    fontWeight: '800',
  },
  stateChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stateChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stateChipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563eb',
  },
  stateChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  stateChipTextSelected: {
    color: '#2563eb',
    fontWeight: '800',
  },
  saveBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default HouseholdDetailsSection;
