import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { t } from "@money-matters/i18n";

export default function LandingPage() {
  const router = useRouter();

  const handleMobileAuth = () => {
    router.push('/dashboard');
  };

  return (
    <View className="flex-1 p-8 justify-center bg-zinc-50">
      <Text className="text-5xl font-bold text-center text-zinc-900 mb-4">{t("app.title")}</Text>
      <Text className="text-lg text-center text-zinc-600 mb-12 leading-relaxed">{t("app.description")}</Text>
      
      <View className="mt-6 items-center">
        <TouchableOpacity className="bg-zinc-900 py-4 px-8 rounded-xl w-full items-center" onPress={handleMobileAuth}>
           <Text className="text-white text-lg font-semibold">{t("auth.cta")}</Text>
        </TouchableOpacity>
        <Text className="text-sm text-zinc-400 text-center mt-4">{t("auth.hint")}</Text>
      </View>
    </View>
  );
}
