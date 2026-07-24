import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { useGeoService } from '../context.js';
import { StructuredAddress } from '../types.js';
import { AddressSuggestionsDropdown } from './AddressSuggestionsDropdown.js';
import { AddressManualFields } from './AddressManualFields.js';

interface SmartAddressInputProps {
  label: string;
  address: string;
  country: string;
  onAddressChange: (text: string) => void;
  onCountryChange: (text: string) => void;
  onSelectAddress?: (addr: StructuredAddress) => void;
  placeholder?: string;
  error?: string | null;
}

const parseAddress = (addrStr: string, defaultCountry = 'Australia'): StructuredAddress => {
  const parts = (addrStr || '').split(',').map((p) => p.trim());
  if (parts.length >= 4) {
    return {
      street: parts[0] || '',
      suburb: parts[1] || '',
      state: parts[2] || 'NSW',
      postcode: parts[3] || '',
      country: parts[4] || defaultCountry,
      formattedAddress: addrStr,
      placeId: '',
      lat: null,
      lng: null,
    };
  }
  return {
    street: addrStr || '',
    suburb: '',
    state: 'NSW',
    postcode: '',
    country: defaultCountry,
    formattedAddress: addrStr || '',
    placeId: '',
    lat: null,
    lng: null,
  };
};

export function SmartAddressInput({
  label,
  address,
  country,
  onAddressChange,
  onCountryChange,
  onSelectAddress,
  error,
}: SmartAddressInputProps): React.JSX.Element {
  const isAustralia = country === 'Australia';
  const [isManual, setIsManual] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const { usePlaceSuggestions, usePlaceDetails } = useGeoService();

  const addressObj = useMemo(() => parseAddress(address, country), [address, country]);

  const { data: suggestions = [], isFetching: isFetchingSuggestions } = usePlaceSuggestions(
    searchQuery,
    ['AU']
  );

  const { data: detailsData } = usePlaceDetails(selectedPlaceId || '');

  useEffect(() => {
    if (detailsData) {
      const formatted = `${detailsData.street}, ${detailsData.suburb}, ${detailsData.state} ${detailsData.postcode}, ${detailsData.country}`;
      onAddressChange(formatted);
      if (detailsData.country) {
        onCountryChange(detailsData.country);
      }
      if (onSelectAddress) {
        onSelectAddress({
          street: detailsData.street || '',
          suburb: detailsData.suburb || '',
          state: detailsData.state,
          postcode: detailsData.postcode || '',
          country: detailsData.country || 'Australia',
          formattedAddress: detailsData.formattedAddress || '',
          placeId: detailsData.placeId || '',
          lat: detailsData.lat ?? null,
          lng: detailsData.lng ?? null,
        });
      }
      setSelectedPlaceId(null);
      setShowDropdown(false);
      setSearchQuery('');
      setIsManual(false);
    }
  }, [detailsData]);

  const updateAddressFields = (fields: Partial<StructuredAddress>) => {
    const updated = {
      street: fields.street ?? addressObj.street ?? '',
      suburb: fields.suburb ?? addressObj.suburb ?? '',
      state: fields.state ?? addressObj.state ?? 'NSW',
      postcode: fields.postcode ?? addressObj.postcode ?? '',
      country: fields.country ?? country ?? 'Australia',
      placeId: fields.placeId ?? addressObj.placeId ?? '',
      formattedAddress: fields.formattedAddress ?? addressObj.formattedAddress ?? '',
      lat: fields.lat ?? addressObj.lat ?? null,
      lng: fields.lng ?? addressObj.lng ?? null,
    };

    const formatted = [updated.street, updated.suburb, updated.state, updated.postcode, updated.country]
      .filter(Boolean)
      .join(', ');

    updated.formattedAddress = formatted;

    onAddressChange(formatted);
    if (onSelectAddress) {
      onSelectAddress(updated);
    }
  };

  const handleToggleCountry = (toAustralia: boolean) => {
    const newCountry = toAustralia ? 'Australia' : 'Other';
    onCountryChange(newCountry);
    setIsManual(!toAustralia);
    updateAddressFields({ country: newCountry, placeId: '', lat: null, lng: null });
  };

  const handleOpenMap = () => {
    if (!address.trim()) return;
    const fullQuery = `${address.trim()}${country ? `, ${country}` : ''}`;
    const encoded = encodeURIComponent(fullQuery);
    
    const iosUrl = `maps://?q=${encoded}`;
    const androidUrl = `geo:0,0?q=${encoded}`;
    const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encoded}`;

    if (Platform.OS === 'ios') {
      Linking.openURL(iosUrl).catch(() => Linking.openURL(fallbackUrl));
    } else if (Platform.OS === 'android') {
      Linking.openURL(androidUrl).catch(() => Linking.openURL(fallbackUrl));
    } else {
      Linking.openURL(fallbackUrl);
    }
  };

  const showAustraliaAuto = isAustralia && !isManual;

  return (
    <View style={styles.container}>
      <Text style={styles.uiLabel}>{label}</Text>

      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleBtn, isAustralia && styles.toggleBtnActive]}
          onPress={() => handleToggleCountry(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleBtnText, isAustralia && styles.toggleBtnActiveText]}>
            Australia
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, !isAustralia && styles.toggleBtnActive]}
          onPress={() => handleToggleCountry(false)}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleBtnText, !isAustralia && styles.toggleBtnActiveText]}>
            Other
          </Text>
        </TouchableOpacity>
      </View>

      {showAustraliaAuto && (
        <AddressSuggestionsDropdown
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showDropdown={showDropdown}
          setShowDropdown={setShowDropdown}
          suggestions={suggestions}
          isFetchingSuggestions={isFetchingSuggestions}
          setSelectedPlaceId={setSelectedPlaceId}
          addressObj={addressObj}
          handleOpenMap={handleOpenMap}
          setIsManual={setIsManual}
          styles={styles}
        />
      )}

      {(!isAustralia || isManual) && (
        <AddressManualFields
          addressObj={addressObj}
          updateAddressFields={updateAddressFields}
          isAustralia={isAustralia}
          onCountryChange={onCountryChange}
          setIsManual={setIsManual}
          styles={styles}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  uiLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  toggleBtnActiveText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  autocompleteWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  searchIconWrapper: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  uiInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  searchInput: {
    flex: 1,
    paddingLeft: 38,
    paddingRight: 40,
  },
  spinner: {
    position: 'absolute',
    right: 12,
  },
  dropdown: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownText: {
    fontSize: 13,
    color: '#334155',
  },
  dropdownPlaceholder: {
    padding: 12,
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  selectedAddressCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedAddressTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mapBtn: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mapBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  selectedAddressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  selectedAddressSubtext: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  manualLinkBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  manualLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  manualFields: {
    gap: 12,
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  stateContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  stateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stateBtnActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  stateBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  stateBtnActiveText: {
    color: '#ffffff',
  },
  backToSearchBtn: {
    marginTop: 8,
  },
  backToSearchText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 6,
  },
});
