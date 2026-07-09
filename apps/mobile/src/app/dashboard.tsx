import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { t } from "@money-matters/i18n";

export default function Dashboard() {
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

  return (
    <View className="flex-1 p-8 justify-center items-center bg-white">
      <Text className="text-2xl font-bold text-zinc-900">{t("dashboard.terminal")}</Text>
      <Text className="text-base text-zinc-500 mt-2">{t("dashboard.loading")}</Text>
    </View>
  );
}
