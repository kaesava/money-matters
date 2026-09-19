import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { t } from '@money-matters/i18n';
import { SUPPORTED_CURRENCIES, SUPPORTED_COUNTRIES } from '@money-matters/types';
import { householdEditStyles as styles } from './householdStyles';

interface HouseholdEditViewProps {
  householdName: string;
  setHouseholdName: (val: string) => void;
  currency: string;
  onSelectCurrency: (val: string) => void;
  country: string;
  setCountry: (val: string) => void;
  state: string;
  setState: (val: string) => void;
  postcode: string;
  setPostcode: (val: string) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function HouseholdEditView({
  householdName,
  setHouseholdName,
  currency,
  onSelectCurrency,
  country,
  setCountry,
  state,
  setState,
  postcode,
  setPostcode,
  saving,
  onSave,
  onCancel,
}: HouseholdEditViewProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Edit Household</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onSave}
            disabled={saving}
            style={[styles.saveBtnTop, saving && { opacity: 0.6 }]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveBtnTextTop}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Household Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Household Name <Text style={styles.requiredStar}>*</Text>
        </Text>
        <TextInput
          style={styles.textInput}
          value={householdName}
          onChangeText={setHouseholdName}
          placeholder="e.g. Smith Household"
          placeholderTextColor="#94A3B8"
        />
      </View>

      {/* Currency Selector */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          {t('settings.currency')} <Text style={styles.requiredStar}>*</Text>
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
          {Object.values(SUPPORTED_CURRENCIES).map((c) => {
            const isSelected = currency === c.code;
            return (
              <TouchableOpacity
                key={c.code}
                onPress={() => onSelectCurrency(c.code)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {c.code} ({c.symbol})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Country Selector */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Country</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
          {SUPPORTED_COUNTRIES.map((c) => {
            const isSelected = country === c.code;
            return (
              <TouchableOpacity
                key={c.code}
                onPress={() => setCountry(c.code)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text style={styles.chipFlag}>{c.flag}</Text>
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* State & Postcode */}
      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>State / Region</Text>
          <TextInput
            style={styles.textInput}
            value={state}
            onChangeText={setState}
            placeholder="e.g. NSW"
            placeholderTextColor="#94A3B8"
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>Postal / ZIP Code</Text>
          <TextInput
            style={styles.textInput}
            value={postcode}
            onChangeText={setPostcode}
            placeholder="e.g. 2000"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Footer Actions */}
      <View style={styles.footerRow}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtnBottom}>
          <Text style={styles.cancelBtnBottomText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSave}
          disabled={saving}
          style={[styles.saveBtnBottom, saving && { opacity: 0.6 }]}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnBottomText}>{t('common.save')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

