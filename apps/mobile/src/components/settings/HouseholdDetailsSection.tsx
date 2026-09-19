import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useMobileToast, showMobileConfirm } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { HouseholdReadOnlyView } from './HouseholdReadOnlyView';
import { HouseholdEditView } from './HouseholdEditView';

export function HouseholdDetailsSection() {
  const toast = useMobileToast();
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
      const data = {
        householdName: gov.householdName || '',
        country: gov.country || 'AU',
        currency: gov.currency || 'AUD',
        state: gov.state || '',
        postcode: gov.postcode || '',
      };
      setHouseholdName(data.householdName);
      setCountry(data.country);
      setCurrency(data.currency);
      setState(data.state);
      setPostcode(data.postcode);
      initialDataRef.current = data;
    }
  }, [gov]);

  const updateHouseholdMut = trpc.updateHousehold.useMutation({
    onSuccess: () => {
      utils.getHouseholdGovernanceInfo.invalidate();
      utils.getUserPreferences.invalidate();
      setIsEditing(false);
      toast.success('Household details updated successfully.');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update household details.');
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
      showMobileConfirm({
        title: t('settings.currencyConfirmTitle'),
        message: t('settings.currencyConfirmBody', {
          oldCurrency: gov?.currency || 'AUD',
          newCurrency: newCurr,
        }),
        confirmText: t('common.confirm'),
        cancelText: t('common.cancel'),
        onConfirm: () => setCurrency(newCurr),
      });
    } else {
      setCurrency(newCurr);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      showMobileConfirm({
        title: t('modals.discardChanges.title', { defaultValue: 'Discard changes?' }),
        message: t('modals.discardChanges.description', { defaultValue: 'Are you sure you want to discard your unsaved changes?' }),
        confirmText: t('modals.discardChanges.discard', { defaultValue: 'Discard Changes' }),
        cancelText: t('modals.discardChanges.cancel', { defaultValue: 'Keep Editing' }),
        isDestructive: true,
        onConfirm: () => {
          const init = initialDataRef.current;
          setHouseholdName(init.householdName);
          setCountry(init.country);
          setCurrency(init.currency);
          setState(init.state);
          setPostcode(init.postcode);
          setIsEditing(false);
        },
      });
    } else {
      setIsEditing(false);
    }
  };

  const handleSave = async () => {
    if (!isOwner) return;

    if (!householdName.trim()) {
      toast.error('Household name cannot be blank.');
      return;
    }

    if (country === 'AU' && postcode.trim() && !/^\d{4}$/.test(postcode.trim())) {
      toast.error('Australian postcode must be exactly 4 digits.');
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
