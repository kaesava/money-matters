import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { StructuredAddress } from '../types.js';

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

interface AddressSuggestionsDropdownProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
  suggestions: Array<{ placeId: string; description: string }>;
  isFetchingSuggestions: boolean;
  setSelectedPlaceId: (id: string | null) => void;
  addressObj: StructuredAddress;
  handleOpenMap: () => void;
  setIsManual: (manual: boolean) => void;
  styles: any;
}

export function AddressSuggestionsDropdown({
  searchQuery,
  setSearchQuery,
  showDropdown,
  setShowDropdown,
  suggestions,
  isFetchingSuggestions,
  setSelectedPlaceId,
  addressObj,
  handleOpenMap,
  setIsManual,
  styles,
}: AddressSuggestionsDropdownProps): React.JSX.Element {
  return (
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
            suggestions.map((item) => (
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
  );
}
