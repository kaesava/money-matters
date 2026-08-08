import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../../lib/trpc';

export default function AcceptInviteMobileScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const acceptInviteMutation = trpc.acceptInvite.useMutation({
    onSuccess: () => {
      setStatus('success');
      setTimeout(() => {
        router.replace('/(app)/home' as Href);
      }, 2000);
    },
    onError: (err) => {
      setStatus('error');
      setErrorMsg(err.message);
    },
  });

  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (token && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      acceptInviteMutation.mutate({ inviteToken: token });
    } else if (!token) {
      setStatus('error');
      setErrorMsg(t("partner.invalidToken"));
    }
  }, [token, acceptInviteMutation]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {status === 'loading' && (
          <View style={styles.stateWrapper}>
            <ActivityIndicator size="large" color={DESIGN_TOKENS.colors.primary} />
            <Text style={styles.title}>{t("partner.acceptTitle")}</Text>
            <Text style={styles.subtitle}>{t("partner.acceptSubtitle")}</Text>
          </View>
        )}

        {status === 'success' && (
          <View style={styles.stateWrapper}>
            <View style={styles.successIconBadge}>
              <Feather name="check" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>{t("partner.acceptSuccessTitle")}</Text>
            <Text style={styles.subtitle}>{t("partner.acceptSuccessMessage")}</Text>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.stateWrapper}>
            <View style={styles.errorIconBadge}>
              <Feather name="alert-triangle" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>{t("partner.acceptErrorTitle")}</Text>
            <Text style={styles.subtitle}>{errorMsg || t("partner.invalidToken")}</Text>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.replace('/(auth)/sign-in' as Href)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>{t("partner.goToDashboard")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.colors.background,
    justifyContent: 'center',
    padding: DESIGN_TOKENS.spacing.containerMargin,
  },
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.lg,
    padding: DESIGN_TOKENS.spacing.cardPadding * 1.5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  stateWrapper: {
    alignItems: 'center',
    gap: 12,
  },
  successIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: DESIGN_TOKENS.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  errorIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: DESIGN_TOKENS.colors.critical,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  actionBtn: {
    backgroundColor: DESIGN_TOKENS.colors.primary,
    paddingHorizontal: 24,
    height: 44,
    borderRadius: DESIGN_TOKENS.radius.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
