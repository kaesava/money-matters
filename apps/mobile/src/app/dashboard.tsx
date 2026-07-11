import React, { useEffect } from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import { t } from "@money-matters/i18n";
import { DESIGN_TOKENS } from "@money-matters/ui";

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    async function initOfflineStore() {
      const db = await SQLite.openDatabaseAsync('money_offline_queue.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS transaction_queue (
          id TEXT PRIMARY KEY NOT NULL,
          amount TEXT NOT NULL,
          idempotency_key TEXT UNIQUE NOT NULL,
          sync_status TEXT DEFAULT 'pending'
        );
      `);
    }
    initOfflineStore().catch(() => console.log("Offline store initialization fault."));
  }, []);

  const handleSignOut = () => {
    router.replace('/');
  };

  return (
    <View style={{ flex: 1, padding: 32, justifyContent: 'center', alignItems: 'center', backgroundColor: DESIGN_TOKENS.colors.surface }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: DESIGN_TOKENS.colors.primary }}>{t("dashboard.terminal")}</Text>
      <Text style={{ fontSize: 16, color: DESIGN_TOKENS.colors.textMuted, marginTop: 8 }}>{t("dashboard.loading")}</Text>

      <TouchableOpacity 
        style={{ marginTop: 48, paddingVertical: 12, paddingHorizontal: 24, borderRadius: DESIGN_TOKENS.radius.md, borderWidth: 1, borderColor: '#D1D5DB' }}
        onPress={handleSignOut}
      >
        <Text style={{ color: DESIGN_TOKENS.colors.textPrimary, fontWeight: 'bold' }}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
