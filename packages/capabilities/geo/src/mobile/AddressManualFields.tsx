import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { StructuredAddress } from '../types.js';

const AUSTRALIAN_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

interface AddressManualFieldsProps {
  addressObj: StructuredAddress;
  updateAddressFields: (fields: Partial<StructuredAddress>) => void;
  isAustralia: boolean;
  onCountryChange: (val: string) => void;
  setIsManual: (manual: boolean) => void;
  styles: any;
}

export function AddressManualFields({
  addressObj,
  updateAddressFields,
  isAustralia,
  onCountryChange,
  setIsManual,
  styles,
}: AddressManualFieldsProps): React.JSX.Element {
  return (
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

      {isAustralia ? (
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>State</Text>
          <View style={styles.stateContainer}>
            {AUSTRALIAN_STATES.map((st) => (
              <TouchableOpacity
                key={st}
                style={[
                  styles.stateBtn,
                  addressObj.state === st && styles.stateBtnActive,
                ]}
                onPress={() => updateAddressFields({ state: st })}
              >
                <Text
                  style={[
                    styles.stateBtnText,
                    addressObj.state === st && styles.stateBtnActiveText,
                  ]}
                >
                  {st}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>State / Region</Text>
          <TextInput
            style={styles.uiInput}
            value={addressObj.state}
            onChangeText={(val: string) => updateAddressFields({ state: val })}
            placeholder="e.g. California / Auckland"
            placeholderTextColor="#94a3b8"
          />
        </View>
      )}

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Postcode / ZIP</Text>
        <TextInput
          style={styles.uiInput}
          value={addressObj.postcode}
          onChangeText={(val: string) => updateAddressFields({ postcode: val })}
          placeholder="e.g. 2000"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
        />
      </View>

      {!isAustralia && (
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Country</Text>
          <TextInput
            style={styles.uiInput}
            value={addressObj.country}
            onChangeText={(val: string) => {
              updateAddressFields({ country: val });
              onCountryChange(val);
            }}
            placeholder="e.g. New Zealand"
            placeholderTextColor="#94a3b8"
          />
        </View>
      )}

      {isAustralia && (
        <TouchableOpacity
          onPress={() => setIsManual(false)}
          style={styles.backToSearchBtn}
        >
          <Text style={styles.backToSearchText}>
            ← Back to Address Search
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
