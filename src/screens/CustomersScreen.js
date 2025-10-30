import React, { useEffect, useState, useCallback, useContext } from "react";
import { useIsFocused } from "@react-navigation/native";
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Text,
  Platform,
} from "react-native";
import SQLiteService from "../services/SQLiteService";
import { Ionicons } from "@expo/vector-icons";
import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { ENABLE_I18N, fallbackT } from "../config/i18nConfig";
import { showPaymentReminderOptions } from "../Utils/WhatsAppService";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CustomersScreen({ navigation, route }) {
  const { t } = ENABLE_I18N
    ? useContext(SimpleLanguageContext)
    : { t: fallbackT };
  const insets = useSafeAreaInsets();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await SQLiteService.getCustomers();
      const filtered = data.filter((c) => Number(c["Total Balance"]) > 0);
      setCustomers(filtered);
      setFilteredCustomers(filtered);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching customers:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (route.params?.refresh) {
      fetchCustomers();
      navigation.setParams({ refresh: false });
    }
  }, [route.params?.refresh]);

  useEffect(() => {
    if (isFocused) {
      fetchCustomers();
    }
  }, [isFocused]);

  const handleSearch = useCallback(
    (query) => {
      setSearchQuery(query);
      if (!query.trim()) {
        setFilteredCustomers(customers);
        return;
      }

      const filtered = customers.filter((customer) => {
        const name = (customer["Customer Name"] || "").toLowerCase();
        const phone = String(customer["Phone Number"] || "");
        const searchTerm = query.toLowerCase();

        return name.includes(searchTerm) || phone.includes(searchTerm);
      });

      setFilteredCustomers(filtered);
    },
    [customers]
  );

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setFilteredCustomers(customers);
  }, [customers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
  }, []);

  // Calculate total outstanding
  const totalOutstanding = filteredCustomers.reduce(
    (sum, customer) => sum + (customer["Total Balance"] || 0),
    0
  );

  // Modern card component
  const renderCustomerCard = useCallback(
    ({ item, index }) => (
      <TouchableOpacity
        style={styles.customerCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate("EditCustomer", { customer: item })}
      >
        {/* Left Section - Avatar and Info */}
        <View style={styles.customerLeft}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(item["Customer Name"] || "?").charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.customerInfo}>
            <Text style={styles.customerName} numberOfLines={1}>
              {item["Customer Name"]}
            </Text>
            <View style={styles.phoneRow}>
              <Ionicons name="call" size={12} color="#64748b" />
              <Text style={styles.phoneText}>{item["Phone Number"]}</Text>
            </View>
          </View>
        </View>

        {/* Right Section - Balance and Actions */}
        <View style={styles.customerRight}>
          <Text style={styles.balanceText}>
            ₹{(item["Total Balance"] || 0).toLocaleString()}
          </Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                showPaymentReminderOptions(item, t);
              }}
              style={styles.iconButton}
            >
              <Ionicons name="chatbubble" size={16} color="#1e40af" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                navigation.navigate("EditCustomer", { customer: item });
              }}
              style={styles.iconButton}
            >
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [navigation, t]
  );

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people" size={20} color="#1e40af" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{filteredCustomers.length}</Text>
              <Text style={styles.statLabel}>{t("customer.customers")}</Text>
            </View>
          </View>

          <View style={[styles.statCard, styles.statCardWarning]}>
            <View style={[styles.statIconContainer, styles.statIconWarning]}>
              <Ionicons name="wallet" size={20} color="#dc2626" />
            </View>
            <View style={styles.statContent}>
              <Text style={[styles.statValue, styles.statValueWarning]}>
                ₹{totalOutstanding.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>{t("customer.outstanding")}</Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder={t("common.search")}
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={20} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Customer List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1e40af" />
          <Text style={styles.loadingText}>
            {t("customer.loadingCustomers")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item["Customer ID"]}
          renderItem={renderCustomerCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1e40af"
              colors={["#1e40af"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name={searchQuery ? "search" : "people-outline"}
                  size={64}
                  color="#cbd5e1"
                />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery
                  ? t("customer.noResultsFound")
                  : t("customer.noCustomersYet")}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? t("customer.tryDifferentSearch")
                  : t("customer.addFirstCustomer")}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 20 + insets.bottom }]}
        onPress={() => navigation.navigate("AddCustomer")}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  // Header Section
  headerSection: {
    backgroundColor: "#fff",
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    ...Platform.select({
      ios: {
        shadowColor: "#1e293b",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  // Stats Container
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  statCardWarning: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
  },
  statIconWarning: {
    backgroundColor: "#fee2e2",
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e40af",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  statValueWarning: {
    color: "#dc2626",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Search Bar
  searchWrapper: {
    paddingHorizontal: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "500",
  },
  clearBtn: {
    padding: 4,
  },

  // List
  listContent: {
    paddingTop: 12,
    paddingBottom: 100,
    paddingHorizontal: 16,
  },

  // Customer Card
  customerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...Platform.select({
      ios: {
        shadowColor: "#1e293b",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  customerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#bfdbfe",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e40af",
  },
  customerInfo: {
    flex: 1,
    gap: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    letterSpacing: -0.2,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  phoneText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  customerRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  balanceText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#dc2626",
    letterSpacing: -0.3,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 6,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  // Separator
  separator: {
    height: 10,
  },

  // FAB
  fab: {
    position: "absolute",
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#1e40af",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#1e40af",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },

  // Loading & Empty States
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 22,
  },
});
