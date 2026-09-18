import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { MobileScreenWrapper, MobilePaginationBar, useMobileToast } from "@money-matters/ui/mobile";
import { trpc } from "../../../lib/trpc";
import { authClient } from "../../../lib/auth";

export default function MobileArchivedItemsScreen() {
  const router = useRouter();
  const toast = useMobileToast();
  const { data: session } = authClient.useSession();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "CATEGORY" | "POOL" | "INCOME_SOURCE" | "EXPENSE_SOURCE" | "BANK_ACCOUNT">("ALL");
  const [refreshing, setRefreshing] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const archivedQuery = trpc.listArchivedItems.useQuery();
  const restoreMutation = trpc.restoreItem.useMutation({
    onSuccess: () => {
      archivedQuery.refetch();
      toast.success("Item restored successfully");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await archivedQuery.refetch();
    setRefreshing(false);
  };

  const items = archivedQuery.data ?? [];

  const filtered = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "ALL" || item.itemType === filterType;
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <MobileScreenWrapper
      title="Archived Items"
      user={session?.user}
      showBack
      onBackPress={() => router.back()}
    >
      <View style={styles.container}>
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
          {(["ALL", "CATEGORY", "POOL", "INCOME_SOURCE", "EXPENSE_SOURCE", "BANK_ACCOUNT"] as const).map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => setFilterType(type)}
              style={[styles.pill, filterType === type && styles.pillActive]}
            >
              <Text style={[styles.pillText, filterType === type && styles.pillTextActive]}>
                {type === "ALL"
                  ? "All"
                  : type === "CATEGORY"
                  ? "Categories"
                  : type === "POOL"
                  ? "Pools"
                  : type === "INCOME_SOURCE"
                  ? "Income"
                  : type === "EXPENSE_SOURCE"
                  ? "Expenses"
                  : "Accounts"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        {archivedQuery.isLoading ? (
          <ActivityIndicator style={{ marginTop: 32 }} color="#2563eb" />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No archived items found</Text>
          </View>
        ) : (
          <>
            <FlatList
              data={paginated}
              keyExtractor={(item) => `${item.itemType}-${item.id}`}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#2563eb"
                />
              }
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
                        itemType: item.itemType as "CATEGORY" | "INCOME_SOURCE" | "EXPENSE_SOURCE" | "BANK_ACCOUNT",
                      })
                    }
                    disabled={restoreMutation.isPending}
                    style={styles.restoreButton}
                  >
                    <Text style={styles.restoreText}>Restore</Text>
                  </TouchableOpacity>
                </View>
              )}
              contentContainerStyle={{ gap: 10, paddingBottom: 16 }}
            />

            <MobilePaginationBar
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filtered.length}
              pageSizeOptions={[10, 20, 50]}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </View>
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
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
    backgroundColor: "#2563eb",
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
    borderColor: "#2563eb",
  },
  restoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
  },
});
