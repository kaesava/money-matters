import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { t } from "@money-matters/i18n";
import { DESIGN_TOKENS } from "@money-matters/ui";

export default function LandingPage() {
  const router = useRouter();

  const handleMobileAuth = () => {
    // Navigate to dashboard which handles mock credentials checking
    router.replace('/dashboard');
  };

  return (
    <View style={{ flex: 1, padding: 32, justifyContent: 'center', backgroundColor: DESIGN_TOKENS.colors.background }}>
      <Text style={{ fontSize: 36, fontWeight: 'bold', textAlign: 'center', color: DESIGN_TOKENS.colors.primary, marginBottom: 16 }}>
        {t("app.title")}
      </Text>
      <Text style={{ fontSize: 16, textAlign: 'center', color: DESIGN_TOKENS.colors.textMuted, marginBottom: 48, lineHeight: 24 }}>
        {t("app.description")}
      </Text>
      
      <View style={{ marginTop: 24, alignItems: 'center' }}>
        <TouchableOpacity 
          style={{ backgroundColor: DESIGN_TOKENS.colors.accent, paddingVertical: 16, paddingHorizontal: 32, borderRadius: DESIGN_TOKENS.radius.md, width: '100%', alignItems: 'center' }} 
          onPress={handleMobileAuth}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>{t("auth.cta")}</Text>
        </TouchableOpacity>
        
        <Text style={{ fontSize: 12, color: DESIGN_TOKENS.colors.textMuted, textAlign: 'center', marginTop: 16 }}>
          {t("auth.hint")}
        </Text>
      </View>
    </View>
  );
}
