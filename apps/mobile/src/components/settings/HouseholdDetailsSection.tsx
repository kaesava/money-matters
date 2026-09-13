import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { HouseholdReadOnlyView } from './HouseholdReadOnlyView';
import { HouseholdEditView } from './HouseholdEditView';

export function HouseholdDetailsSection() {
  const utils = trpc.useUtils();
  const govQuery = trpc.getHouseholdGovernanceInfo.useQuery();
  const gov = govQuery.data;

  const [isEditing, setIsEditing] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [country, setCountry] = useState('AU');
  const [currency, setCurrency] = useState('AUD');
  const [state, setState] = useState('');
  const [postcode, setPostcode] = useState('');
  const [saving, setSaving] = useState(false);

  const initialDataRef = useRef({
    householdName: '',
    country: 'AU',
    currency: 'AUD',
    state: '',
    postcode: '',
  });

  useEffect(() => {
    if (gov) {
      const hName = gov.householdName || '';
      const cCode = gov.country || 'AU';
      const curr = gov.currency || 'AUD';
      const st = gov.state || '';
      const pc = gov.postcode || '';

      setHouseholdName(hName);
      setCountry(cCode);
      setCurrency(curr);
      setState(st);
      setPostcode(pc);

      initialDataRef.current = {
        householdName: hName,
        country: cCode,
        currency: curr,
        state: st,
        postcode: pc,
      };
    }
  }, [gov]);

  const updateHouseholdMut = trpc.updateHousehold.useMutation({
    onSuccess: () => {
      utils.getHouseholdGovernanceInfo.invalidate();
      utils.getUserPreferences.invalidate();
      setIsEditing(false);
      Alert.alert(t('common.success'), 'Household details updated successfully.');
    },
    onError: (err) => {
      Alert.alert(t('common.error'), err.message || 'Failed to update household details.');
    },
  });

  const isOwner = gov?.isOwner ?? false;

  const isDirty = Boolean(
    householdName !== initialDataRef.current.householdName ||
    country !== initialDataRef.current.country ||
    currency !== initialDataRef.current.currency ||
    state !== initialDataRef.current.state ||
    postcode !== initialDataRef.current.postcode
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

  const handleCancel = () => {
    if (isDirty) {
      Alert.alert(
        t('modals.discardChanges.title', { defaultValue: 'Discard changes?' }),
        t('modals.discardChanges.description', { defaultValue: 'Are you sure you want to discard your unsaved changes?' }),
        [
          { text: t('modals.discardChanges.cancel', { defaultValue: 'Keep Editing' }), style: 'cancel' },
          {
            text: t('modals.discardChanges.discard', { defaultValue: 'Discard Changes' }),
            style: 'destructive',
            onPress: () => {
              const init = initialDataRef.current;
              setHouseholdName(init.householdName);
              setCountry(init.country);
              setCurrency(init.currency);
              setState(init.state);
              setPostcode(init.postcode);
              setIsEditing(false);
            },
          },
        ]
      );
    } else {
      setIsEditing(false);
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
      initialDataRef.current = {
        householdName: householdName.trim(),
        country: country.trim(),
        currency: currency.trim(),
        state: state.trim(),
        postcode: postcode.trim(),
      };
    } finally {
      setSaving(false);
    }
  };

  if (govQuery.isLoading) {
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  if (isEditing) {
    return (
      <HouseholdEditView
        householdName={householdName}
        setHouseholdName={setHouseholdName}
        currency={currency}
        onSelectCurrency={handleSelectCurrency}
        country={country}
        setCountry={setCountry}
        state={state}
        setState={setState}
        postcode={postcode}
        setPostcode={setPostcode}
        saving={saving}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <HouseholdReadOnlyView
      householdName={householdName}
      currency={currency}
      country={country}
      state={state}
      postcode={postcode}
      isOwner={isOwner}
      onEdit={() => setIsEditing(true)}
    />
  );
}

const styles = StyleSheet.create({
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
