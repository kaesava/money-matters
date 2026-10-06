import React from "react";
import { View, Text, StyleSheet } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { t } from "@money-matters/i18n";
import {
  DESIGN_TOKENS,
  Checkbox,
  FormFieldError,
} from "@money-matters/ui/mobile";

interface SignUpTermsCheckboxProps {
  agreeTerms: boolean;
  setAgreeTerms: (v: boolean) => void;
  error?: string;
  onClearError: () => void;
}

export function SignUpTermsCheckbox({
  agreeTerms,
  setAgreeTerms,
  error,
  onClearError,
}: SignUpTermsCheckboxProps) {
  const openTerms = () => {
    WebBrowser.openBrowserAsync("https://moneymatters.kaesava.au/terms");
  };

  const openPrivacy = () => {
    WebBrowser.openBrowserAsync("https://moneymatters.kaesava.au/privacy");
  };

  return (
    <View style={styles.termsGroup}>
      <View style={styles.termsRow}>
        <Checkbox
          checked={agreeTerms}
          style={styles.checkboxAlign}
          onChange={(checked) => {
            setAgreeTerms(checked);
            if (error) onClearError();
          }}
        />
        <View style={styles.termsTextWrap}>
          <Text style={styles.termsText}>
            {t("auth.agreeTermsPrefix")}{" "}
            <Text style={styles.linkText} onPress={openTerms}>
              {t("auth.termsLink")}
            </Text>{" "}
            {t("auth.agreeTermsAnd")}{" "}
            <Text style={styles.linkText} onPress={openPrivacy}>
              {t("auth.privacyLink")}
            </Text>
          </Text>
        </View>
      </View>
      <FormFieldError error={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  termsGroup: { gap: 4, marginVertical: 4 },
  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  checkboxAlign: { minHeight: 22, marginTop: 1 },
  termsTextWrap: { flex: 1 },
  termsText: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted, lineHeight: 18 },
  linkText: { color: DESIGN_TOKENS.colors.accent, fontWeight: "600" },
});
