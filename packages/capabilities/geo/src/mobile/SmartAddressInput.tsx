import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Linking, Platform, ActivityIndicator, ScrollView } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useGeoService } from '../context.js';
import { StructuredAddress } from '../types.js';

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

const AUSTRALIAN_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

function MapPinIcon({ color }: { color: string }): React.JSX.Element {
  return (
    // @ts-ignore
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {/* @ts-ignore */}
      <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      {/* @ts-ignore */}
      <Path d="M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
    </Svg>
  );
}

function SearchIcon({ color }: { color: string }): React.JSX.Element {
  return (
    // @ts-ignore
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {/* @ts-ignore */}
      <Circle cx={11} cy={11} r={8} />
      {/* @ts-ignore */}
      <Path d="m21 21-4.3-4.3" />
    </Svg>
  );
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
  placeholder,
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
        <View style={styles.autocompleteWrapper}>
          <View style={styles.inputWrapper}>
            <View style={styles.searchIconWrapper}>
              <SearchIcon color="#94a3b8" />
            </View>
            <TextInput
              style={[styles.uiInput, styles.searchInput]}
              value={searchQuery}
              onChangeText={(text: string) => {
                setSearchQuery(text);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search Australian address..."
              placeholderTextColor="#94a3b8"
              autoCorrect={false}
            />
            {isFetchingSuggestions && (
              <ActivityIndicator 
                size="small" 
                color="#0f172a" 
                style={styles.spinner}
              />
            )}
          </View>

          {showDropdown && searchQuery.length >= 3 && (suggestions.length > 0 || isFetchingSuggestions) && (
            <View style={styles.dropdown}>
              {suggestions.length > 0 ? (
                suggestions.map((item: any) => (
                  <TouchableOpacity
                    key={item.placeId}
                    style={styles.dropdownItem}
                    onPress={() => setSelectedPlaceId(item.placeId)}
                  >
                    <Text style={styles.dropdownText}>{item.description}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                isFetchingSuggestions && (
                  <Text style={styles.dropdownPlaceholder}>Searching...</Text>
                )
              )}
            </View>
          )}

          {addressObj.street ? (
            <View style={styles.selectedAddressCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <MapPinIcon color="#0f172a" />
                  <Text style={styles.selectedAddressTitle}>Selected Address</Text>
                </View>
                <TouchableOpacity onPress={handleOpenMap} style={styles.mapBtn}>
                  <Text style={styles.mapBtnText}>View Map</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.selectedAddressText}>
                {addressObj.street}
              </Text>
              <Text style={styles.selectedAddressSubtext}>
                {addressObj.suburb}, {addressObj.state} {addressObj.postcode}
              </Text>
              <TouchableOpacity
                onPress={() => setIsManual(true)}
                style={styles.manualLinkBtn}
              >
                <Text style={styles.manualLinkText}>Edit manually</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}

      {(!isAustralia || isManual) && (
        <View style={styles.manualFields}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Street Address</Text>
            <TextInput
              style={styles.uiInput}
              value={addressObj.street}
              onChangeText={(val: string) => updateAddressFields({ street: val })}
              placeholder="e.g. 123 Main St"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>City / Suburb</Text>
            <TextInput
              style={styles.uiInput}
              value={addressObj.suburb}
              onChangeText={(val: string) => updateAddressFields({ suburb: val })}
              placeholder="e.g. Sydney"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1, marginRight: 12 }]}>
              <Text style={styles.fieldLabel}>State / Region</Text>
              {isAustralia ? (
                <View style={styles.stateSelectWrapper}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {AUSTRALIAN_STATES.map((st) => {
                      const isActive = addressObj.state === st;
                      return (
                        <TouchableOpacity
                          key={st}
                          onPress={() => updateAddressFields({ state: st })}
                          style={[styles.statePill, isActive && styles.statePillActive]}
                        >
                          <Text style={[styles.statePillText, isActive && styles.statePillTextActive]}>{st}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : (
                <TextInput
                  style={styles.uiInput}
                  value={addressObj.state}
                  onChangeText={(val: string) => updateAddressFields({ state: val })}
                  placeholder="e.g. NSW"
                  placeholderTextColor="#94a3b8"
                />
              )}
            </View>

            <View style={[styles.fieldGroup, { width: 120 }]}>
              <Text style={styles.fieldLabel}>Postcode</Text>
              <TextInput
                style={styles.uiInput}
                value={addressObj.postcode}
                onChangeText={(val: string) => updateAddressFields({ postcode: val })}
                placeholder="e.g. 2000"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
              />
            </View>
          </View>

          {!isAustralia && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Country</Text>
              <TextInput
                style={styles.uiInput}
                value={addressObj.country}
                onChangeText={(val: string) => updateAddressFields({ country: val })}
                placeholder="e.g. United Kingdom"
                placeholderTextColor="#94a3b8"
              />
            </View>
          )}

          {isAustralia && isManual && (
            <TouchableOpacity
              onPress={() => setIsManual(false)}
              style={styles.manualLinkBtn}
            >
              <Text style={styles.manualLinkText}>Use Autocomplete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  uiLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
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
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  toggleBtnActiveText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  autocompleteWrapper: {
    position: 'relative',
    zIndex: 30,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIconWrapper: {
    position: 'absolute',
    left: 14,
    zIndex: 10,
  },
  searchInput: {
    flex: 1,
    paddingLeft: 42,
    marginBottom: 0,
    height: 52,
  },
  spinner: {
    position: 'absolute',
    right: 14,
  },
  dropdown: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 8,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownText: {
    fontSize: 13,
    color: '#334155',
  },
  dropdownPlaceholder: {
    padding: 14,
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  selectedAddressCard: {
    marginTop: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedAddressTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  mapBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  mapBtnText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  selectedAddressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  selectedAddressSubtext: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  manualLinkBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  manualLinkText: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '600',
  },
  manualFields: {
    gap: 12,
  },
  fieldGroup: {
    marginBottom: 0,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 6,
  },
  uiInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
    height: 48,
  },
  row: {
    flexDirection: 'row',
  },
  stateSelectWrapper: {
    height: 48,
    justifyContent: 'center',
  },
  statePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statePillActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  statePillText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  statePillTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});
