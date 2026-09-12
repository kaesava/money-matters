import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';

const AUSTRALIAN_TIMEZONES = [
  { label: 'Sydney, Melbourne, Canberra (AEST/AEDT)', value: 'Australia/Sydney' },
  { label: 'Brisbane (AEST - No DST)', value: 'Australia/Brisbane' },
  { label: 'Adelaide (ACST/ACDT)', value: 'Australia/Adelaide' },
  { label: 'Perth (AWST)', value: 'Australia/Perth' },
  { label: 'Darwin (ACST)', value: 'Australia/Darwin' },
  { label: 'Hobart (AEST/AEDT)', value: 'Australia/Hobart' },
];

export function MobileProfileSection() {
  const D = DESIGN_TOKENS;
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();

  const userPrefQuery = trpc.getUserPreferences.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [timezone, setTimezone] = useState('Australia/Sydney');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '');
      setAvatarUri(session.user.image || null);
    }
    if (userPrefQuery.data?.timezone) {
      setTimezone(userPrefQuery.data.timezone);
    }
  }, [session, userPrefQuery.data]);

  const updatePrefMut = trpc.updateUserPreferences.useMutation();

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant access to your photo library to choose a profile avatar.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const imageBase64 = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      setAvatarUri(imageBase64);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePrefMut.mutateAsync({
        timezone,
      });

      utils.getUserPreferences.invalidate();
      Alert.alert('Profile Updated', 'Your profile preferences have been saved.');
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : 'Failed to update profile'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>👤 Profile & Timezone</Text>

      {/* Avatar Row */}
      <View style={styles.avatarRow}>
        <TouchableOpacity
          onPress={handlePickAvatar}
          style={styles.avatarContainer}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>
                {(session?.user?.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.cameraPill}>
            <Feather name="camera" size={11} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{session?.user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{session?.user?.email || '—'}</Text>
          <TouchableOpacity onPress={handlePickAvatar} style={styles.changePhotoBtn}>
            <Text style={styles.changePhotoText}>Change Avatar Photo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Timezone Selector */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Timezone</Text>
        <View style={styles.tzStack}>
          {AUSTRALIAN_TIMEZONES.map((tz) => {
            const isSelected = timezone === tz.value;
            return (
              <TouchableOpacity
                key={tz.value}
                onPress={() => setTimezone(tz.value)}
                style={[
                  styles.tzChip,
                  isSelected && styles.tzChipSelected,
                ]}
              >
                <Feather
                  name={isSelected ? 'check-circle' : 'circle'}
                  size={14}
                  color={isSelected ? '#2563eb' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.tzText,
                    isSelected && styles.tzTextSelected,
                  ]}
                >
                  {tz.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveBtnText}>Save Preferences</Text>
        )}
      </TouchableOpacity>
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
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  cameraPill: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1B2B4B',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  userEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  changePhotoBtn: {
    marginTop: 6,
  },
  changePhotoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  tzStack: {
    gap: 6,
  },
  tzChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tzChipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563eb',
  },
  tzText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  tzTextSelected: {
    color: '#2563eb',
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default MobileProfileSection;
