// src/screens/CustomersScreen.js

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
  Modal,
  Linking,
} from "react-native";
import * as SMS from 'expo-sms';
import VoiceInputButton from '../components/VoiceInputButton';
import SQLiteService from "../services/SQLiteService";
import { Ionicons } from "@expo/vector-icons";
import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { ENABLE_I18N, fallbackT } from "../config/i18nConfig";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import { useAlert } from "../contexts/AlertContext";
import { useSubscription } from "../contexts/SubscriptionContext"; // ✅ ADD THIS
import { useUser } from '../contexts/UserContext'; // ✅ ADD THIS
import { generatePaymentMessage } from "../services/UpiService"; // ✅ ADD THIS
import {
  FontSizes,
  Spacing,
  IconSizes,
  ButtonSizes,
  BorderRadius,
} from "../Utils/Responsive";

export default function CustomersScreen({ navigation, route }) {
  const { t } = ENABLE_I18N
    ? useContext(SimpleLanguageContext)
    : { t: fallbackT };
  const { theme } = useTheme();
  const { showError, showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const { subscription } = useSubscription(); // ✅ ADD THIS
  const { profile } = useUser(); // ✅ ADD THIS
  
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [currentSort, setCurrentSort] = useState("balance_high");
  const isFocused = useIsFocused();

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await SQLiteService.getCustomers();
      const filtered = data.filter((c) => Number(c["Total Balance"]) > 0);
      setCustomers(filtered);
      setFilteredCustomers(filtered);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching customers:", error);
      showError(
        t("common.error") || "Error",
        t("customer.failedToLoadCustomers") || "Failed to load customers. Please try again."
      );
      setLoading(false);
    }
  }, [showError, t]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    if (route.params?.refresh) {
      fetchCustomers();
      navigation.setParams({ refresh: false });
    }
  }, [route.params?.refresh, fetchCustomers, navigation]);

  useEffect(() => {
    if (isFocused) {
      fetchCustomers();
    }
  }, [isFocused, fetchCustomers]);

  const sortCustomers = useCallback((customersToSort, sortType) => {
    const sorted = [...customersToSort];

    switch (sortType) {
      case "balance_high":
        return sorted.sort((a, b) => b["Total Balance"] - a["Total Balance"]);
      case "balance_low":
        return sorted.sort((a, b) => a["Total Balance"] - b["Total Balance"]);
      case "name_az":
        return sorted.sort((a, b) =>
          a["Customer Name"].localeCompare(b["Customer Name"], "hi")
        );
      case "name_za":
        return sorted.sort((a, b) =>
          b["Customer Name"].localeCompare(a["Customer Name"], "hi")
        );
      default:
        return sorted;
    }
  }, []);

  useEffect(() => {
    const sorted = sortCustomers(customers, currentSort);
    setFilteredCustomers(sorted);
  }, [customers, currentSort, sortCustomers]);

  const handleSearch = useCallback(
    (query) => {
      setSearchQuery(query);
      if (!query.trim()) {
        const sorted = sortCustomers(customers, currentSort);
        setFilteredCustomers(sorted);
        return;
      }

      const filtered = customers.filter((customer) => {
        const name = (customer["Customer Name"] || "").toLowerCase();
        const phone = String(customer["Phone Number"] || "");
        const searchTerm = query.toLowerCase();

        return name.includes(searchTerm) || phone.includes(searchTerm);
      });

      const sorted = sortCustomers(filtered, currentSort);
      setFilteredCustomers(sorted);
    },
    [customers, currentSort, sortCustomers]
  );

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    const sorted = sortCustomers(customers, currentSort);
    setFilteredCustomers(sorted);
  }, [customers, currentSort, sortCustomers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
  }, [fetchCustomers]);

  const handleSortSelect = useCallback((sortType) => {
    setCurrentSort(sortType);
    setSortModalVisible(false);
  }, []);

  const totalOutstanding = filteredCustomers.reduce(
    (sum, customer) => sum + (customer["Total Balance"] || 0),
    0
  );

  // ✅ UPDATED: Payment Reminder Handler with UPI Link Support
  const handlePaymentReminder = useCallback(async (customer) => {
    const customerName = customer['Customer Name'] || 'Customer';
    const phone = customer['Phone Number'];
    
    if (!phone) {
      showError(
        t('common.error'), 
        t('notifications.phoneNotAvailableForCustomer') || 'Phone number not available for this customer'
      );
      return;
    }
    
    // Get fresh customer data
    let freshCustomer = customer;
    try {
      const customers = await SQLiteService.getCustomers();
      const updated = customers.find(c => c['Customer ID'] === customer['Customer ID']);
      if (updated) {
        freshCustomer = updated;
      }
    } catch (error) {
      console.log('Using cached customer data');
    }
    
    const outstandingAmount = freshCustomer['Total Balance'] || 0;
    
    if (outstandingAmount <= 0) {
      showAlert({
        title: t('common.ok'),
        message: t('notifications.noOutstandingBalance') || 'No outstanding balance for this customer',
        type: 'info',
      });
      return;
    }

    showAlert({
      title: t('notifications.sendPaymentReminder'),
      message: `${t('notifications.sendReminderTo') || 'Send reminder to'} ${customerName}?\n${t('notifications.outstandingAmount')}: ₹${outstandingAmount.toLocaleString()}`,
      type: 'info',
      buttons: [
        {
          text: t('common.cancel'),
          style: 'secondary',
        },
        {
          text: t('notifications.whatsapp'),
          style: 'primary',
          onPress: async () => {
            // ✅ UPDATED: Conditionally generate message with UPI link
            let message;
            if (subscription?.isActive && profile?.enable_payment_links) {
              message = generatePaymentMessage(
                customerName,
                outstandingAmount,
                profile?.business_name || "Your Business Name",
                true
              );
            } else {
              message = `${t('notifications.paymentReminder')}\n\n` +
                        `${t('notifications.dear')} ${customerName},\n` +
                        `${t('notifications.friendlyReminderText')}\n\n` +
                        `${t('notifications.outstandingAmount')}: ₹${outstandingAmount.toLocaleString()}\n\n` +
                        `${t('notifications.pleasePayEarliest')}\n\n` +
                        `${t('notifications.thankYou')}\n- ${profile?.business_name || t('notifications.appName')}`;
            }

            const phoneStr = String(phone);
            let cleaned = phoneStr.replace(/\D/g, '');
            
            if (cleaned.length === 10) {
              cleaned = '91' + cleaned;
            } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
              cleaned = '91' + cleaned.substring(1);
            }
            
            const whatsappUrl = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
            
            try {
              const canOpen = await Linking.canOpenURL(whatsappUrl);
              if (canOpen) {
                await Linking.openURL(whatsappUrl);
              } else {
                showError(
                  t('common.error'), 
                  t('notifications.whatsappNotInstalled') || 'WhatsApp is not installed'
                );
              }
            } catch (error) {
              showError(
                t('common.error'), 
                t('notifications.failedToOpenWhatsapp') || 'Failed to open WhatsApp'
              );
            }
          },
        },
        {
          text: t('notifications.sms'),
          style: 'primary',
          onPress: async () => {
            // ✅ UPDATED: Same conditional message generation for SMS
            let message;
            if (subscription?.isActive && profile?.enable_payment_links) {
              message = generatePaymentMessage(
                customerName,
                outstandingAmount,
                profile?.business_name || "Your Business Name",
                true
              );
            } else {
              message = `${t('notifications.paymentReminder')}\n\n` +
                        `${t('notifications.dear')} ${customerName},\n` +
                        `${t('notifications.friendlyReminderText')}\n\n` +
                        `${t('notifications.outstandingAmount')}: ₹${outstandingAmount.toLocaleString()}\n\n` +
                        `${t('notifications.pleasePayEarliest')}\n\n` +
                        `${t('notifications.thankYou')}\n- ${profile?.business_name || t('notifications.appName')}`;
            }

            const phoneStr = String(phone);
            let cleaned = phoneStr.replace(/\D/g, '');
            
            if (cleaned.length === 12 && cleaned.startsWith('91')) {
              cleaned = cleaned.substring(2);
            } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
              cleaned = cleaned.substring(1);
            }
            
            try {
              const isAvailable = await SMS.isAvailableAsync();
              if (isAvailable) {
                await SMS.sendSMSAsync([cleaned], message);
              } else {
                showError(
                  t('common.error'), 
                  t('notifications.smsNotAvailable') || 'SMS not available on this device'
                );
              }
            } catch (error) {
              showError(
                t('common.error'), 
                t('notifications.failedToSendSMS') || 'Failed to send SMS'
              );
            }
          },
        },
      ],
    });
  }, [showAlert, showError, t, subscription, profile]); // ✅ UPDATED: Added subscription and profile dependencies

  const renderCustomerCard = useCallback(
    ({ item, index }) => {
      const handleCallPress = (e) => {
        e.stopPropagation();
        if (item["Phone Number"] && item["Phone Number"].trim()) {
          Linking.openURL(`tel:${item["Phone Number"]}`).catch((err) => {
            console.error("Failed to open dialer:", err);
            showError(
              t("common.error") || "Error",
              t("customer.failedToCall") || "Failed to open phone dialer"
            );
          });
        }
      };

      return (
        <TouchableOpacity
          style={[
            styles.customerCard,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("EditCustomer", { customer: item })}
        >
          {/* Left Section - Avatar and Info */}
          <View style={styles.customerLeft}>
            <View
              style={[
                styles.avatarCircle,
                {
                  backgroundColor: theme.colors.primaryLight,
                  borderColor: theme.isDarkMode ? theme.colors.primary : "#bfdbfe",
                },
              ]}
            >
              <Text
                style={[styles.avatarText, { color: theme.colors.primary }]}
                maxFontSizeMultiplier={1.3}
              >
                {(item["Customer Name"] || "?").charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.customerInfo}>
              <Text
                style={[styles.customerName, { color: theme.colors.text }]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                {item["Customer Name"]}
              </Text>
              <View style={styles.phoneRow}>
                <Ionicons
                  name="call"
                  size={IconSizes.tiny}
                  color={theme.colors.textSecondary}
                />
                <Text
                  style={[styles.phoneText, { color: theme.colors.textSecondary }]}
                  maxFontSizeMultiplier={1.3}
                >
                  {item["Phone Number"]}
                </Text>
              </View>
            </View>
          </View>

          {/* Right Section - Balance and Actions */}
          <View style={styles.customerRight}>
            <Text style={styles.balanceText} maxFontSizeMultiplier={1.3}>
              ₹{(item["Total Balance"] || 0).toLocaleString()}
            </Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handlePaymentReminder(item);
                }}
                style={[styles.iconButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              >
                <Ionicons
                  name="chatbubble"
                  size={IconSizes.small}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCallPress}
                style={[styles.iconButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              >
                <Ionicons name="call" size={IconSizes.small} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [navigation, t, theme, showError, handlePaymentReminder]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header Section */}
      <View style={[styles.headerSection, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <View style={[
            styles.statCard,
            { 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border
            }
          ]}>
            <View style={[
              styles.statIconContainer,
              { backgroundColor: theme.colors.primaryLight }
            ]}>
              <Ionicons name="people" size={IconSizes.medium} color={theme.colors.primary} />
            </View>
            <View style={styles.statContent}>
              <Text style={[styles.statValue, { color: theme.colors.primary }]} maxFontSizeMultiplier={1.3}>
                {filteredCustomers.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
                {t("customer.customers")}
              </Text>
            </View>
          </View>

          <View style={[
            styles.statCard,
            styles.statCardWarning,
            { 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border
            }
          ]}>
            <View style={[
              styles.statIconContainer,
              styles.statIconWarning,
              { backgroundColor: theme.colors.primaryLight }
            ]}>
              <Ionicons name="wallet" size={IconSizes.medium} color="#dc2626" />
            </View>
            <View style={styles.statContent}>
              <Text style={[styles.statValue, styles.statValueWarning]} maxFontSizeMultiplier={1.3}>
                ₹{totalOutstanding.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
                {t("customer.outstanding")}
              </Text>
            </View>
          </View>
        </View>

        {/* Search Bar with Sort Button */}
        <View style={styles.searchWrapper}>
          <View style={[
            styles.searchBar,
            { 
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border
            }
          ]}>
            <Ionicons name="search" size={IconSizes.medium} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder={t("common.search")}
              placeholderTextColor={theme.colors.textTertiary}
              value={searchQuery}
              onChangeText={handleSearch}
              maxFontSizeMultiplier={1.3}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={IconSizes.medium} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Sort Button */}
          <TouchableOpacity
            style={[styles.sortButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() => setSortModalVisible(true)}
          >
            <Ionicons name="funnel" size={IconSizes.medium} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Customer List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.3}>
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
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.colors.card }]}>
                <Ionicons
                  name={searchQuery ? "search" : "people-outline"}
                  size={IconSizes.xxlarge * 2}
                  color={theme.colors.textTertiary}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                {searchQuery ? t("customer.noResultsFound") : t("customer.noCustomersYet")}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.3}>
                {searchQuery ? t("customer.tryDifferentSearch") : t("customer.addFirstCustomer")}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Sort Modal */}
      <Modal
        visible={sortModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSortModalVisible(false)}
        >
          <View
            style={[
              styles.sortModal,
              { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + 20 },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                Sort Customers
              </Text>
              <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                <Ionicons name="close" size={IconSizes.large} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Sort Options */}
            <TouchableOpacity
              style={[
                styles.sortOption,
                currentSort === "balance_high" && { backgroundColor: theme.colors.primaryLight },
              ]}
              onPress={() => handleSortSelect("balance_high")}
            >
              <Ionicons
                name="trending-up"
                size={IconSizes.medium}
                color={currentSort === "balance_high" ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.sortOptionText,
                  { color: currentSort === "balance_high" ? theme.colors.primary : theme.colors.text },
                ]}
                maxFontSizeMultiplier={1.3}
              >
                Highest Balance First
              </Text>
              {currentSort === "balance_high" && <Ionicons name="checkmark" size={IconSizes.medium} color={theme.colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sortOption,
                currentSort === "balance_low" && { backgroundColor: theme.colors.primaryLight },
              ]}
              onPress={() => handleSortSelect("balance_low")}
            >
              <Ionicons
                name="trending-down"
                size={IconSizes.medium}
                color={currentSort === "balance_low" ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.sortOptionText,
                  { color: currentSort === "balance_low" ? theme.colors.primary : theme.colors.text },
                ]}
                maxFontSizeMultiplier={1.3}
              >
                Lowest Balance First
              </Text>
              {currentSort === "balance_low" && <Ionicons name="checkmark" size={IconSizes.medium} color={theme.colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sortOption,
                currentSort === "name_az" && { backgroundColor: theme.colors.primaryLight },
              ]}
              onPress={() => handleSortSelect("name_az")}
            >
              <Ionicons
                name="arrow-down"
                size={IconSizes.medium}
                color={currentSort === "name_az" ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.sortOptionText,
                  { color: currentSort === "name_az" ? theme.colors.primary : theme.colors.text },
                ]}
                maxFontSizeMultiplier={1.3}
              >
                Name (A - Z)
              </Text>
              {currentSort === "name_az" && <Ionicons name="checkmark" size={IconSizes.medium} color={theme.colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sortOption,
                currentSort === "name_za" && { backgroundColor: theme.colors.primaryLight },
              ]}
              onPress={() => handleSortSelect("name_za")}
            >
              <Ionicons
                name="arrow-up"
                size={IconSizes.medium}
                color={currentSort === "name_za" ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.sortOptionText,
                  { color: currentSort === "name_za" ? theme.colors.primary : theme.colors.text },
                ]}
                maxFontSizeMultiplier={1.3}
              >
                Name (Z - A)
              </Text>
              {currentSort === "name_za" && <Ionicons name="checkmark" size={IconSizes.medium} color={theme.colors.primary} />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ✅ VOICE INPUT BUTTON - Above FAB */}
      <VoiceInputButton
        navigation={navigation}
        theme={theme}
        style={{
          position: 'absolute',
          right: Spacing.xl,
          bottom: Spacing.xl + insets.bottom + 70,
        }}
        mode="customer"
      />

      {/* ✅ FAB - Add Customer Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary, bottom: Spacing.xl + insets.bottom }]}
        onPress={() => navigation.navigate("AddCustomer")}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={IconSizes.xlarge} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// Styles remain the same...
const styles = StyleSheet.create({
  // ... (all your existing styles remain unchanged)
  container: {
    flex: 1,
  },

  // Header Section
  headerSection: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
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
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    flexDirection: "row",
    borderRadius: BorderRadius.large,
    padding: Spacing.md,
    alignItems: "center",
    gap: Spacing.md,
    borderWidth: 1,
  },
  statCardWarning: {},
  statIconContainer: {
    width: IconSizes.xxlarge,
    height: IconSizes.xxlarge,
    borderRadius: IconSizes.xlarge,
    justifyContent: "center",
    alignItems: "center",
  },
  statIconWarning: {},
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: FontSizes.large,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  statValueWarning: {
    color: "#dc2626",
  },
  statLabel: {
    fontSize: FontSizes.tiny,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Search Bar
  searchWrapper: {
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.large,
    paddingHorizontal: Spacing.md,
    height: ButtonSizes.large,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.regular,
    fontWeight: "500",
  },
  clearBtn: {
    padding: Spacing.xs,
  },
  
  sortButton: {
    width: ButtonSizes.large,
    height: ButtonSizes.large,
    borderRadius: BorderRadius.large,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },

  // List
  listContent: {
    paddingTop: Spacing.md,
    paddingBottom: 100,
    paddingHorizontal: Spacing.lg,
  },

  // Customer Card
  customerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.large,
    padding: Spacing.md,
    borderWidth: 1,
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
    gap: Spacing.md,
  },
  avatarCircle: {
    width: IconSizes.xxlarge * 1.2,
    height: IconSizes.xxlarge * 1.2,
    borderRadius: IconSizes.xlarge * 0.6,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  avatarText: {
    fontSize: FontSizes.large,
    fontWeight: "700",
  },
  customerInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  customerName: {
    fontSize: FontSizes.regular,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  phoneText: {
    fontSize: FontSizes.small,
    fontWeight: "500",
  },
  customerRight: {
    alignItems: "flex-end",
    gap: Spacing.sm,
  },
  balanceText: {
    fontSize: FontSizes.regular,
    fontWeight: "800",
    color: "#dc2626",
    letterSpacing: -0.3,
  },
  actionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  iconButton: {
    width: IconSizes.xlarge,
    height: IconSizes.xlarge,
    borderRadius: BorderRadius.medium,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },

  // Sort Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sortModal: {
    borderTopLeftRadius: BorderRadius.xlarge,
    borderTopRightRadius: BorderRadius.xlarge,
    paddingBottom: Spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: FontSizes.xlarge,
    fontWeight: '700',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sortOptionText: {
    flex: 1,
    fontSize: FontSizes.regular,
    fontWeight: '600',
  },

  // Separator
  separator: {
    height: Spacing.sm,
  },

  // FAB
  fab: {
    position: "absolute",
    right: Spacing.xl,
    width: IconSizes.xxlarge * 1.5,
    height: IconSizes.xxlarge * 1.5,
    borderRadius: IconSizes.xxlarge * 0.75,
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
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSizes.medium,
    fontWeight: "500",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: Spacing.xxl * 2,
  },
  emptyIcon: {
    width: IconSizes.xxlarge * 3,
    height: IconSizes.xxlarge * 3,
    borderRadius: IconSizes.xxlarge * 1.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSizes.xlarge,
    fontWeight: "700",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: FontSizes.regular,
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 22,
  },
});
