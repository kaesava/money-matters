import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { DESIGN_TOKENS } from "@money-matters/ui";
import { trpc } from "../../../lib/trpc";

export default function MobileArchivedItemsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "CATEGORY" | "INCOME_SOURCE" | "BANK_ACCOUNT">("ALL");

  const archivedQuery = trpc.listArchivedItems.useQuery();
  const restoreMutation = trpc.restoreItem.useMutation({
    onSuccess: () => {
      archivedQuery.refetch();
    },
    onError: (err) => {
      Alert.alert("Error", err.message);
    },
  });

  const items = archivedQuery.data ?? [];

  const filtered = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "ALL" || item.itemType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <View style={styles.container}>
      {/* Top Navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Archived Items</Text>
          <Text style={styles.subtitle}>Restore archived items back to active views</Text>
        </View>
      </View>

      {/* Search Input */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search archived items..."
        placeholderTextColor="#9CA3AF"
        value={search}
        onChangeText={setSearch}
      />

      {/* Filter Pills */}
      <View style={styles.pillContainer}>
        {(["ALL", "CATEGORY", "INCOME_SOURCE", "BANK_ACCOUNT"] as const).map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => setFilterType(type)}
            style={[styles.pill, filterType === type && styles.pillActive]}
          >
            <Text style={[styles.pillText, filterType === type && styles.pillTextActive]}>
              {type === "ALL" ? "All" : type === "CATEGORY" ? "Categories" : type === "INCOME_SOURCE" ? "Income" : "Accounts"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {archivedQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={DESIGN_TOKENS.colors.accent} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyText}>No archived items found</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.itemType}-${item.id}`}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <View style={styles.row}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.itemType.replace("_", " ")}</Text>
                  </View>
                </View>
                {item.subtitle ? <Text style={styles.subtext}>{item.subtitle}</Text> : null}
              </View>

              <TouchableOpacity
                onPress={() =>
                  restoreMutation.mutate({
                    itemId: item.id,
                    itemType: item.itemType as any,
                  })
                }
                disabled={restoreMutation.isPending}
                style={styles.restoreButton}
              >
                <Text style={styles.restoreText}>Restore</Text>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={{ gap: 10, paddingBottom: 32 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingTop: 56,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1B2B4B",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1B2B4B",
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
    color: "#1F2937",
  },
  pillContainer: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 16,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  pillActive: {
    backgroundColor: "#00B4A6",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  pillTextActive: {
    color: "#FFFFFF",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 64,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1B2B4B",
  },
  badge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
  },
  subtext: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  restoreButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#00B4A6",
  },
  restoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#00B4A6",
  },
});
