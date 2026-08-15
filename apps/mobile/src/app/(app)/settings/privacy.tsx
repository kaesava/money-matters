import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { MobileScreenWrapper, DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { useRouter } from 'expo-router';

export default function PrivacySettingsScreen() {
  const router = useRouter();

  return (
    <MobileScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back to Settings</Text>
        </TouchableOpacity>

        <Text style={styles.title}>🔒 Privacy & Security</Text>
        <Text style={styles.subtitle}>Bank-grade multi-tenant household data protection</Text>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>Row Level Security (RLS)</Text>
          <Text style={styles.cardBody}>
            Your financial allocations, income events, and budget pools are protected at the database kernel level using PostgreSQL Row Level Security. Household data cannot be accessed by other tenants.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>Australian Privacy Principles</Text>
          <Text style={styles.cardBody}>
            Money Matters strictly complies with the Privacy Act 1988 (Cth). We do not sell your personal data, track your activity for third-party advertising, or compromise household privacy.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>Data Rights & Erasure</Text>
          <Text style={styles.cardBody}>
            Under APPs 12 & 13, you have the right to request a full export of your household records or ask for account deletion and data erasure.
          </Text>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => Linking.openURL('https://moneymatters.kaesava.au/privacy')}
          >
            <Text style={styles.linkText}>View Full Web Privacy Policy ↗</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>Data Governance Contact</Text>
          <Text style={styles.cardBody}>
            For privacy inquiries or deletion requests, contact our Data Governance Officer at:
          </Text>
          <Text style={styles.emailText}>info@moneymatters.kaesava.au</Text>
        </View>
      </ScrollView>
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: DESIGN_TOKENS.spacing.containerMargin,
    paddingTop: 48,
    paddingBottom: 32,
    gap: 16,
  },
  backButton: {
    marginBottom: 8,
  },
  backText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
  subtitle: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.textMuted,
    marginBottom: 8,
  },
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
  cardBody: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  linkButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  emailText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
