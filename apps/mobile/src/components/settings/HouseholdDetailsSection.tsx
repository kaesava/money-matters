import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useMobileToast, showMobileConfirm } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { HouseholdReadOnlyView } from './HouseholdReadOnlyView';
import { HouseholdEditView } from './HouseholdEditView';

interface HouseholdDetailsSectionProps {
  onDirtyChange?: (isDirty: boolean) => void;
  registerDiscard?: (discardFn: () => void) => void;
}

export function HouseholdDetailsSection({
  onDirtyChange,
  registerDiscard,
}: HouseholdDetailsSectionProps = {}) {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const govQuery = trpc.getHouseholdGovernanceInfo.useQuery();
  const gov = govQuery.data;

  const [isEditing, setIsEditing] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [country, setCountry] = useState('AU');
  const [currency, setCurrency] = useState('AUD');
  const [timezone, setTimezone] = useState('Australia/Sydney');
  const [state, setState] = useState('');
  const [postcode, setPostcode] = useState('');
  const [postcodeError, setPostcodeError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const initialDataRef = useRef({
    householdName: '',
    country: 'AU',
    currency: 'AUD',
    timezone: 'Australia/Sydney',
    state: '',
    postcode: '',
  });

  useEffect(() => {
    if (gov) {
      const data = {
        householdName: gov.householdName || '',
        country: gov.country || 'AU',
        currency: gov.currency || 'AUD',
        timezone: gov.timezone || 'Australia/Sydney',
        state: gov.state || '',
        postcode: gov.postcode || '',
      };
      setHouseholdName(data.householdName);
      setCountry(data.country);
      setCurrency(data.currency);
      setTimezone(data.timezone);
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
      toast.success(t('toasts.saved'));
    },
    onError: (err) => {
      toast.error(err.message || t('common.errorTryAgain'));
    },
  });

  const isOwner = gov?.isOwner ?? false;

  const isDirty = Boolean(
    householdName !== initialDataRef.current.householdName ||
    country !== initialDataRef.current.country ||
    currency !== initialDataRef.current.currency ||
    timezone !== initialDataRef.current.timezone ||
    state !== initialDataRef.current.state ||
    postcode !== initialDataRef.current.postcode
  );

  useEffect(() => {
    onDirtyChange?.(isDirty && isEditing);
  }, [isDirty, isEditing, onDirtyChange]);

  const handleDiscard = React.useCallback(() => {
    const init = initialDataRef.current;
    setHouseholdName(init.householdName);
    setCountry(init.country);
    setCurrency(init.currency);
    setTimezone(init.timezone);
    setState(init.state);
    setPostcode(init.postcode);
    setPostcodeError(undefined);
    setIsEditing(false);
  }, []);

  useEffect(() => {
    registerDiscard?.(handleDiscard);
  }, [handleDiscard, registerDiscard]);

  const handleSelectCurrency = (_newCurr: string) => {
    // Currency is permanently locked after household creation
  };

  const handleCancel = () => {
    if (isDirty) {
      showMobileConfirm({
        title: t('modals.discardChanges.title'),
        message: t('modals.discardChanges.description'),
        confirmText: t('modals.discardChanges.discard'),
        cancelText: t('modals.discardChanges.cancel'),
        isDestructive: true,
        onConfirm: handleDiscard,
      });
    } else {
      setIsEditing(false);
    }
  };

  const handleSave = async () => {
    if (!isOwner) return;

    if (!householdName.trim()) {
      toast.error(t('auth.householdNameRequired'));
      return;
    }

    if (country === 'AU' && postcode.trim() && !/^\d{4}$/.test(postcode.trim())) {
      setPostcodeError(t('validation.postcodeDigits'));
      toast.error(t('validation.postcodeDigits'));
      return;
    }
    setPostcodeError(undefined);

    setSaving(true);
    try {
      await updateHouseholdMut.mutateAsync({
        name: householdName.trim(),
        country: country.trim(),
        currency: currency.trim(),
        timezone: timezone.trim(),
        state: state.trim(),
        postcode: postcode.trim(),
      });
      initialDataRef.current = {
        householdName: householdName.trim(),
        country: country.trim(),
        currency: currency.trim(),
        timezone: timezone.trim(),
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
        timezone={timezone}
        setTimezone={setTimezone}
        country={country}
        setCountry={setCountry}
        state={state}
        setState={setState}
        postcode={postcode}
        setPostcode={setPostcode}
        postcodeError={postcodeError}
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
      timezone={timezone}
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
