// src/screens/TransactionsScreen.js

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useContext,
} from "react";
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Image,
  Modal,
  ScrollView,
  TextInput,
  Animated,
} from "react-native";
import { Dropdown } from 'react-native-element-dropdown';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SQLiteService from "../services/SQLiteService";
import PDFDownloadModal from "../components/PDFDownloadModal";
import { generateTransactionPDF } from "../Utils/PDFGenerator";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { ENABLE_I18N, fallbackT } from "../config/i18nConfig";
import ImageView from "react-native-image-viewing";
import { useTheme } from "../contexts/ThemeContext";
import { useAlert } from "../contexts/AlertContext"; // ✅ Add custom alerts
import { 
  FontSizes, 
  Spacing, 
  IconSizes, 
  ButtonSizes, 
  BorderRadius 
} from "../Utils/Responsive";
import VoiceInputButton from '../components/VoiceInputButton';

export default function TransactionsScreen({ navigation, route }) {
  const { t } = ENABLE_I18N
    ? useContext(SimpleLanguageContext)
    : { t: fallbackT };
  const { theme } = useTheme();
  const { showAlert, showSuccess, showError } = useAlert(); // ✅ Add custom alerts
  const insets = useSafeAreaInsets();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [currentSort, setCurrentSort] = useState('date_new');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const selectedCustomerIdRef = useRef(null);
  const shouldAutoLoadRef = useRef(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      (async () => {
        const data = await SQLiteService.getCustomers();
        if (!isActive) return;
        setCustomers(data);

        const selectedId = selectedCustomerIdRef.current;
        if (selectedId) {
          const updatedCustomer = data.find(
            (c) => c["Customer ID"] === selectedId
          );
          if (updatedCustomer) {
            setBalance(updatedCustomer["Total Balance"] || 0);
            const txns = await SQLiteService.getTransactions({
              customerId: selectedId,
            });
            if (!isActive) return;
            const sortedTxns = applySortAndFilter(txns, currentSort, currentFilter);
            setTransactions(txns);
            setFilteredTransactions(sortedTxns);
          } else {
            setSelectedCustomer(null);
            setTransactions([]);
            setFilteredTransactions([]);
            setBalance(0);
            // ✅ Custom alert
            showAlert({
              title: t("common.info"),
              message: t("customer.customerDeleted") || "Selected customer was deleted",
              type: 'info',
            });
          }
        }
      })();
      return () => {
        isActive = false;
      };
    }, [t, currentFilter, currentSort, showAlert])
  );

  useFocusEffect(
    useCallback(() => {
      if (selectedCustomer && shouldAutoLoadRef.current) {
        const timer = setTimeout(() => {
          fetchTransactions();
          refreshCustomerData();
        }, 100);

        return () => clearTimeout(timer);
      }
      shouldAutoLoadRef.current = false;
    }, [selectedCustomer])
  );

  useEffect(() => {
    if (route.params?.transactionAdded) {
      const { addedForCustomerId, hadSelectedCustomer } = route.params;

      if (
        hadSelectedCustomer &&
        selectedCustomer?.["Customer ID"] === addedForCustomerId
      ) {
        fetchTransactions();
        refreshCustomerData();
      }

      navigation.setParams({
        transactionAdded: false,
        addedForCustomerId: null,
        hadSelectedCustomer: false,
      });
    }
  }, [route.params?.transactionAdded, selectedCustomer]);



  const fetchCustomers = async () => {
    const data = await SQLiteService.getCustomers();
    setCustomers(data);
    if (selectedCustomer) {
      const exists = data.some(
        (c) => c["Customer ID"] === selectedCustomer["Customer ID"]
      );
      if (!exists) {
        setSelectedCustomer(null);
        setTransactions([]);
        setFilteredTransactions([]);
        setBalance(0);
        // ✅ Custom alert
        showAlert({
          title: t("common.info"),
          message: t("customer.customerDeleted") || "Selected customer was deleted",
          type: 'info',
        });
      }
    }
  };

  const applySortAndFilter = useCallback((txns, sortType, filterType) => {
    let filtered = [...txns];
    
    switch(filterType) {
      case 'credit':
        filtered = filtered.filter(txn => txn.Type === 'CREDIT');
        break;
      case 'payment':
        filtered = filtered.filter(txn => txn.Type === 'PAYMENT');
        break;
      case 'all':
      default:
        break;
    }
    
    switch(sortType) {
      case 'date_new':
        filtered.sort((a, b) => b.Date.localeCompare(a.Date));
        break;
      case 'date_old':
        filtered.sort((a, b) => a.Date.localeCompare(b.Date));
        break;
      case 'amount_high':
        filtered.sort((a, b) => parseFloat(b.Amount) - parseFloat(a.Amount));
        break;
      case 'amount_low':
        filtered.sort((a, b) => parseFloat(a.Amount) - parseFloat(b.Amount));
        break;
    }
    
    return filtered;
  }, []);

  const fetchTransactions = async () => {
    if (!selectedCustomer) return;
    setLoading(true);

    try {
      const [txns, freshCustomers] = await Promise.all([
        SQLiteService.getTransactions({
          customerId: selectedCustomer["Customer ID"],
        }),
        SQLiteService.getCustomers(),
      ]);

      setTransactions(txns);
      const sortedFiltered = applySortAndFilter(txns, currentSort, currentFilter);
      setFilteredTransactions(sortedFiltered);

      setCustomers(freshCustomers);
      const updatedCustomer = freshCustomers.find(
        (c) => c["Customer ID"] === selectedCustomer["Customer ID"]
      );
      if (updatedCustomer) {
        setBalance(updatedCustomer["Total Balance"] || 0);
      }
    } catch (error) {
      console.error("Fetch transactions error:", error);
    }
    setLoading(false);
  };

  const refreshCustomerData = async () => {
    if (!selectedCustomer) return;

    const data = await SQLiteService.getCustomers();
    setCustomers(data);

    const updatedCustomer = data.find(
      (c) => c["Customer ID"] === selectedCustomer["Customer ID"]
    );
    if (updatedCustomer) {
      setBalance(updatedCustomer["Total Balance"] || 0);
    } else {
      setSelectedCustomer(null);
      setTransactions([]);
      setFilteredTransactions([]);
      setBalance(0);
      // ✅ Custom alert
      showAlert({
        title: t("common.info"),
        message: t("customer.customerDeleted") || "Selected customer was deleted",
        type: 'info',
      });
    }
  };

  const onRefresh = useCallback(async () => {
    if (!selectedCustomer) return;
    setRefreshing(true);
    await Promise.all([fetchTransactions(), refreshCustomerData()]);
    setRefreshing(false);
  }, [selectedCustomer, customers, currentFilter, currentSort]);

  const handleFilterSelect = useCallback((filterType) => {
    setCurrentFilter(filterType);
    const sortedFiltered = applySortAndFilter(transactions, currentSort, filterType);
    setFilteredTransactions(sortedFiltered);
    setFilterModalVisible(false);
  }, [transactions, currentSort, applySortAndFilter]);

  const handleSortSelect = useCallback((sortType) => {
    setCurrentSort(sortType);
    const sortedFiltered = applySortAndFilter(transactions, sortType, currentFilter);
    setFilteredTransactions(sortedFiltered);
    setFilterModalVisible(false);
  }, [transactions, currentFilter, applySortAndFilter]);

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setBalance(customer["Total Balance"] || 0);
  };

  useEffect(() => {
    selectedCustomerIdRef.current = selectedCustomer?.["Customer ID"] || null;
  }, [selectedCustomer]);

  useEffect(() => {
    if (route.params?.refresh) {
      fetchCustomers();
      navigation.setParams({ refresh: false });
    }
  }, [route.params?.refresh]);

  const handlePDFDownload = async (startDate, endDate) => {
    // ✅ Custom alert for validation
    if (!selectedCustomer) {
      showError(t("common.error"), t("transaction.selectACustomer"));
      return;
    }

    setGeneratingPDF(true);
    try {
      const result = await generateTransactionPDF(
        selectedCustomer,
        transactions,
        startDate,
        endDate,
        t
      );

      if (result.success) {
        setShowPDFModal(false);
        // ✅ Custom success alert
        showSuccess(t("common.success"), t("common.pdfGeneratedSuccess"));
      } else {
        // ✅ Custom error alert
        showError(
          t("common.error"),
          `${t("common.pdfGeneratedError")}: ${result.error}`
        );
      }
    } catch (error) {
      // ✅ Custom error alert
      showError(t("common.error"), t("common.somethingWentWrong"));
    } finally {
      setGeneratingPDF(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  const renderTransaction = useCallback(
    ({ item, index }) => {
      const isCredit = item.Type === "CREDIT";
      const isPayment = item.Type === "PAYMENT";
      const hasPhoto = item.Photo && item.Photo.length > 0;

      return (
        <TouchableOpacity
          style={[styles.transactionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          activeOpacity={0.7}
          onPress={() => {
            shouldAutoLoadRef.current = true;
            navigation.navigate("EditTransaction", {
              transaction: item,
            });
          }}
        >
          <View
            style={[
              styles.transactionIcon,
              isCredit 
                ? [styles.creditIcon, { borderColor: theme.isDarkMode ? "#991b1b" : "#fecaca" }]
                : [styles.paymentIcon, { borderColor: theme.isDarkMode ? "#065f46" : "#bbf7d0" }],
            ]}
          >
            <Ionicons
              name={isCredit ? "arrow-up" : "arrow-down"}
              size={IconSizes.medium}
              color={isCredit ? "#dc2626" : "#059669"}
            />
          </View>

          <View style={styles.transactionContent}>
            <View style={styles.transactionHeader}>
              <View style={styles.transactionTypeContainer}>
                <Text
                  style={[
                    styles.transactionType,
                    isCredit ? styles.creditText : styles.paymentText,
                  ]}
                  maxFontSizeMultiplier={1.3}
                >
                  {isCredit
                    ? t("transaction.creditGiven")
                    : t("transaction.paymentReceived")}
                </Text>
                <Text style={[styles.transactionDate, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.3}>
                  {formatDate(item.Date)}
                </Text>
              </View>
              <View style={styles.amountContainer}>
                <Text
                  style={[
                    styles.transactionAmount,
                    isCredit ? styles.creditAmount : styles.paymentAmount,
                  ]}
                  maxFontSizeMultiplier={1.3}
                >
                  {isCredit ? "+" : "-"}₹
                  {parseFloat(item.Amount).toLocaleString()}
                </Text>
              </View>
            </View>

            {item.Note && (
              <View style={[styles.noteContainer, { backgroundColor: theme.colors.card }]}>
                <Ionicons name="document-text" size={IconSizes.small} color={theme.colors.textSecondary} />
                <Text style={[styles.noteText, { color: theme.colors.textSecondary }]} numberOfLines={2} maxFontSizeMultiplier={1.3}>
                  {item.Note}
                </Text>
              </View>
            )}

            <View style={[styles.transactionFooter, { borderTopColor: theme.colors.borderLight }]}>
              <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.3}>
                {t("transaction.balanceAfter")}
              </Text>
              <Text style={[styles.balanceValue, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                ₹
                {parseFloat(item["Balance After Transaction"]).toLocaleString()}
              </Text>
              <View style={styles.editIndicator}>
                <Ionicons name="chevron-forward" size={IconSizes.small} color={theme.colors.textTertiary} />
              </View>
            </View>
          </View>

          {hasPhoto && (
            <TouchableOpacity
              style={[styles.photoThumbnailContainer, { borderColor: theme.colors.border }]}
              onPress={(e) => {
                e.stopPropagation();
                setViewingImage(item.Photo);
              }}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: item.Photo }}
                style={styles.photoThumbnail}
                resizeMode="cover"
              />
              <View style={styles.photoIconBadge}>
                <Ionicons name="expand" size={12} color="#fff" />
              </View>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      );
    },
    [navigation, t, theme]
  );



  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header Section */}
      <View style={[styles.headerSection, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        {/* Custom Dropdown */}
        <View style={styles.selectorContainer}>
          <View style={styles.dropdownContainer}>
            <Dropdown
              data={customers}
              labelField="Customer Name"
              valueField="Customer ID"
              value={selectedCustomer?.["Customer ID"]}
              onChange={handleCustomerSelect}
              placeholder={t("customer.selectCustomer")}
              search
              searchPlaceholder="Search..."
              onFocus={() => setDropdownOpen(true)}
              onBlur={() => setDropdownOpen(false)}
              renderInputSearch={(onSearch) => (
                <View style={[styles.searchInputWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, marginHorizontal: 0, marginTop: 0, marginBottom: Spacing.sm }]}>
                  <Ionicons name="search" size={IconSizes.small} color={theme.colors.textSecondary} />
                  <TextInput
                    style={[styles.searchInput, { color: theme.colors.text }]}
                    placeholder="Search..."
                    placeholderTextColor={theme.colors.textTertiary}
                    onChangeText={onSearch}
                  />
                </View>
              )}
              style={[
                styles.dropdownButton,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: dropdownOpen ? theme.colors.primary : theme.colors.border,
                },
              ]}
              placeholderStyle={[styles.dropdownValue, { color: theme.colors.textTertiary }]}
              selectedTextStyle={[styles.dropdownValue, { color: theme.colors.text }]}
              inputSearchStyle={[
                {
                  backgroundColor: theme.colors.card,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: BorderRadius.medium,
                  paddingHorizontal: Spacing.md,
                  height: ButtonSizes.medium,
                  fontSize: FontSizes.regular,
                  fontWeight: '500',
                  color: theme.colors.text,
                },
              ]}
              containerStyle={[
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderWidth: 1.5,
                  borderRadius: BorderRadius.large,
                  marginTop: Spacing.sm,
                  paddingTop: Spacing.md,
                  paddingHorizontal: Spacing.sm,
                  paddingBottom: 0,
                  ...Platform.select({
                    ios: {
                      shadowColor: "#1e293b",
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.15,
                      shadowRadius: 16,
                    },
                    android: {
                      elevation: 16,
                    },
                  }),
                },
              ]}
              maxHeight={300}
              itemContainerStyle={{
                paddingVertical: Spacing.sm,
                paddingHorizontal: 0,
              }}
              itemTextStyle={[styles.dropdownItemName, { color: theme.colors.text }]}
              activeColor={theme.colors.primaryLight}
              showsVerticalScrollIndicator={true}
              renderLeftIcon={() => (
                <View style={[styles.dropdownIcon, { backgroundColor: theme.colors.primaryLight }]}>
                  <Ionicons name="person" size={IconSizes.medium} color={theme.colors.primary} />
                </View>
              )}
              renderRightIcon={() => (
                <Ionicons
                  name={dropdownOpen ? "chevron-up" : "chevron-down"}
                  size={IconSizes.medium}
                  color={theme.colors.textSecondary}
                />
              )}
              renderItem={(item, index) => {
                const isSelected = selectedCustomer?.["Customer ID"] === item["Customer ID"];
                return (
                  <View
                    style={[
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: Spacing.sm,
                        paddingHorizontal: Spacing.md,
                        gap: Spacing.md,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.colors.borderLight,
                      },
                      isSelected && { backgroundColor: theme.colors.primaryLight },
                    ]}
                  >
                    <View
                      style={[
                        styles.dropdownItemIcon,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primary
                            : theme.colors.primaryLight,
                        },
                      ]}
                    >
                      <Ionicons
                        name="person"
                        size={IconSizes.small}
                        color={isSelected ? "#fff" : theme.colors.primary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.dropdownItemName,
                        {
                          color: isSelected ? theme.colors.primary : theme.colors.text,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item["Customer Name"]}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={IconSizes.medium}
                        color={theme.colors.primary}
                      />
                    )}
                  </View>
                );
              }}
            />
          </View>

          {/* Button Group */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonFirst, { backgroundColor: theme.colors.primary }]}
              onPress={fetchTransactions}
            >
              <Ionicons name="checkmark" size={IconSizes.medium} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.primary, borderColor: theme.colors.border }]}
              onPress={() => setFilterModalVisible(true)}
            >
              <Ionicons name="funnel" size={IconSizes.small} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.actionButtonLast,
                { backgroundColor: theme.colors.primary, borderColor: theme.colors.border },
                !selectedCustomer && styles.buttonDisabled,
              ]}
              onPress={() => setShowPDFModal(true)}
              disabled={!selectedCustomer}
            >
              <Ionicons name="download-outline" size={IconSizes.medium} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance Card */}
        {selectedCustomer && (
          <View style={[styles.balanceCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.balanceHeader}>
              <Ionicons name="wallet" size={IconSizes.large} color={theme.colors.primary} />
              <Text style={[styles.balanceTitle, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.3}>
                {t("transaction.outstandingBalance")}
              </Text>
            </View>
            <Text style={[styles.balanceAmount, { color: "#dc2626" }]} maxFontSizeMultiplier={1.3}>
              ₹{parseFloat(balance).toLocaleString()}
            </Text>
            <Text style={[styles.balanceSubtitle, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.3}>
              {filteredTransactions.length} / {transactions.length}{" "}
              {t("transaction.transactionCountPlural")}
            </Text>
          </View>
        )}
      </View>

      {/* Transaction List */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loaderText, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.3}>
            {t("transaction.loadingTransactions")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item["Transaction ID"]}
          renderItem={renderTransaction}
          contentContainerStyle={styles.listContainer}
          scrollEnabled={!dropdownOpen}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.card }]}>
                <Ionicons 
                  name="receipt-outline" 
                  size={IconSizes.xxlarge * 1.6} 
                  color={theme.colors.textTertiary} 
                />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                {selectedCustomer
                  ? currentFilter === 'all' 
                    ? t("transaction.noTransactionsYet")
                    : "No transactions match filter"
                  : t("transaction.selectCustomer")}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.3}>
                {selectedCustomer
                  ? currentFilter === 'all'
                    ? t("transaction.startByAdding")
                    : "Try changing the filter"
                  : t("transaction.chooseCustomer")}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          windowSize={10}
          initialNumToRender={15}
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFilterModalVisible(false)}
        >
          <View style={[styles.filterModal, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                Filter & Sort
              </Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={IconSizes.large} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
                FILTER BY TYPE
              </Text>

              <TouchableOpacity
                style={[styles.filterOption, currentFilter === 'all' && { backgroundColor: theme.colors.primaryLight }]}
                onPress={() => handleFilterSelect('all')}
              >
                <Ionicons 
                  name="list" 
                  size={IconSizes.medium} 
                  color={currentFilter === 'all' ? theme.colors.primary : theme.colors.textSecondary} 
                />
                <Text style={[styles.filterOptionText, { color: currentFilter === 'all' ? theme.colors.primary : theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                  All Transactions
                </Text>
                {currentFilter === 'all' && (
                  <Ionicons name="checkmark" size={IconSizes.medium} color={theme.colors.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterOption, currentFilter === 'credit' && { backgroundColor: theme.colors.primaryLight }]}
                onPress={() => handleFilterSelect('credit')}
              >
                <Ionicons 
                  name="arrow-up" 
                  size={IconSizes.medium} 
                  color={currentFilter === 'credit' ? theme.colors.primary : "#dc2626"} 
                />
                <Text style={[styles.filterOptionText, { color: currentFilter === 'credit' ? theme.colors.primary : theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                  Credit Given Only
                </Text>
                {currentFilter === 'credit' && (
                  <Ionicons name="checkmark" size={IconSizes.medium} color={theme.colors.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterOption, currentFilter === 'payment' && { backgroundColor: theme.colors.primaryLight }]}
                onPress={() => handleFilterSelect('payment')}
              >
                <Ionicons 
                  name="arrow-down" 
                  size={IconSizes.medium} 
                  color={currentFilter === 'payment' ? theme.colors.primary : "#059669"} 
                />
                <Text style={[styles.filterOptionText, { color: currentFilter === 'payment' ? theme.colors.primary : theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                  Payments Received Only
                </Text>
                {currentFilter === 'payment' && (
                  <Ionicons name="checkmark" size={IconSizes.medium} color={theme.colors.primary} />
                )}
              </TouchableOpacity>

              <View style={styles.sectionDivider} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
                SORT BY
              </Text>

              <TouchableOpacity
                style={[styles.filterOption, currentSort === 'date_new' && { backgroundColor: theme.colors.primaryLight }]}
                onPress={() => handleSortSelect('date_new')}
              >
                <Ionicons 
                  name="calendar" 
                  size={IconSizes.medium} 
                  color={currentSort === 'date_new' ? theme.colors.primary : theme.colors.textSecondary} 
                />
                <Text style={[styles.filterOptionText, { color: currentSort === 'date_new' ? theme.colors.primary : theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                  Newest First
                </Text>
                {currentSort === 'date_new' && (
                  <Ionicons name="checkmark" size={IconSizes.medium} color={theme.colors.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterOption, currentSort === 'date_old' && { backgroundColor: theme.colors.primaryLight }]}
                onPress={() => handleSortSelect('date_old')}
              >
                <Ionicons 
                  name="calendar-outline" 
                  size={IconSizes.medium} 
                  color={currentSort === 'date_old' ? theme.colors.primary : theme.colors.textSecondary} 
                />
                <Text style={[styles.filterOptionText, { color: currentSort === 'date_old' ? theme.colors.primary : theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                  Oldest First
                </Text>
                {currentSort === 'date_old' && (
                  <Ionicons name="checkmark" size={IconSizes.medium} color={theme.colors.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterOption, currentSort === 'amount_high' && { backgroundColor: theme.colors.primaryLight }]}
                onPress={() => handleSortSelect('amount_high')}
              >
                <Ionicons 
                  name="trending-up" 
                  size={IconSizes.medium} 
                  color={currentSort === 'amount_high' ? theme.colors.primary : theme.colors.textSecondary} 
                />
                <Text style={[styles.filterOptionText, { color: currentSort === 'amount_high' ? theme.colors.primary : theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                  Highest Amount
                </Text>
                {currentSort === 'amount_high' && (
                  <Ionicons name="checkmark" size={IconSizes.medium} color={theme.colors.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterOption, currentSort === 'amount_low' && { backgroundColor: theme.colors.primaryLight }]}
                onPress={() => handleSortSelect('amount_low')}
              >
                <Ionicons 
                  name="trending-down" 
                  size={IconSizes.medium} 
                  color={currentSort === 'amount_low' ? theme.colors.primary : theme.colors.textSecondary} 
                />
                <Text style={[styles.filterOptionText, { color: currentSort === 'amount_low' ? theme.colors.primary : theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                  Lowest Amount
                </Text>
                {currentSort === 'amount_low' && (
                  <Ionicons name="checkmark" size={IconSizes.medium} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Voice Input Button - Above FAB */}
      <VoiceInputButton
        navigation={navigation}
        selectedCustomer={selectedCustomer}
        theme={theme}
        style={{
          position: 'absolute',
          right: Spacing.xl,
          bottom: Spacing.xl + insets.bottom + 70,
        }}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary, bottom: Spacing.xl + insets.bottom }]}
        onPress={() =>
          navigation.navigate("AddTransaction", {
            selectedCustomer,
            hasSelectedCustomer: !!selectedCustomer,
          })
        }
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={IconSizes.xlarge} color="#fff" />
      </TouchableOpacity>

      {/* PDF Download Modal */}
      <PDFDownloadModal
        visible={showPDFModal}
        onClose={() => setShowPDFModal(false)}
        onDownload={handlePDFDownload}
        transactions={transactions}
        isGenerating={generatingPDF}
      />

      {/* Full-Screen Image Viewer */}
      <ImageView
        images={viewingImage ? [{ uri: viewingImage }] : []}
        imageIndex={0}
        visible={viewingImage !== null}
        onRequestClose={() => setViewingImage(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  headerSection: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    zIndex: 100,
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

  // Custom Inline Dropdown
  selectorContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    zIndex: 1000,
  },
  dropdownContainer: {
    flex: 1,
    position: 'relative',
    zIndex: 1000,
  },
  // Update these styles:

dropdownButton: {
  flexDirection: "row",
  alignItems: "center",
  borderRadius: BorderRadius.large,
  borderWidth: 1.5,
  paddingVertical: Spacing.sm,  // Changed from Spacing.md
  paddingHorizontal: Spacing.lg,
  gap: Spacing.md,
  height: ButtonSizes.xlarge,  // Add explicit height
  zIndex: 1,
  ...Platform.select({
    ios: {
      shadowColor: "#1e293b",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    android: {
      elevation: 2,
    },
  }),
},

// Update the icon size to match better
dropdownIcon: {
  width: IconSizes.large,  // Changed from xlarge
  height: IconSizes.large,  // Changed from xlarge
  borderRadius: IconSizes.large / 2,
  justifyContent: "center",
  alignItems: "center",
},

// Adjust text container
dropdownTextContainer: {
  flex: 1,
  justifyContent: "center",  // Add this to center vertically
},

dropdownLabel: {
  fontSize: FontSizes.tiny,
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 1,  // Reduced from 2
  lineHeight: FontSizes.tiny * 1.2,  // Add line height
},

dropdownValue: {
  fontSize: FontSizes.regular,
  fontWeight: "600",
  lineHeight: FontSizes.regular * 1.2,  // Add line height
},

  // Backdrop
  dropdownBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998,
  },

  // Dropdown List
  dropdownList: {
  position: 'absolute',
  top: ButtonSizes.large + Spacing.sm,
  left: 0,
  right: 0,
  borderRadius: BorderRadius.large,
  borderWidth: 1.5,
  height: 300,
  zIndex: 9999,
  ...Platform.select({
    ios: {
      shadowColor: "#1e293b",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
    },
    android: {
      elevation: 16,
    },
  }),
},

  dropdownSearch: {
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    height: ButtonSizes.medium,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.regular,
    fontWeight: '500',
    paddingVertical: 0,
  },
  dropdownScrollView: {
    flex: 1,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  dropdownItemIcon: {
    width: IconSizes.large,
    height: IconSizes.large,
    borderRadius: IconSizes.large / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownItemName: {
    flex: 1,
    fontSize: FontSizes.regular,
    fontWeight: '700',
  },
  dropdownEmpty: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: Spacing.md,
  },
  dropdownEmptyText: {
    fontSize: FontSizes.regular,
    fontWeight: '500',
  },

  buttonGroup: {
    flexDirection: 'row',
    borderRadius: BorderRadius.large,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  actionButton: {
    width: 40,
    height: ButtonSizes.large,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actionButtonFirst: {
    borderTopLeftRadius: BorderRadius.large,
    borderBottomLeftRadius: BorderRadius.large,
  },
  actionButtonLast: {
    borderTopRightRadius: BorderRadius.large,
    borderBottomRightRadius: BorderRadius.large,
  },
  buttonDisabled: {
    opacity: 0.4,
  },

  balanceCard: {
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  balanceTitle: {
    fontSize: FontSizes.tiny,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: FontSizes.xxlarge + 2,
    fontWeight: "800",
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  balanceSubtitle: {
    fontSize: FontSizes.small,
    fontWeight: "500",
  },

  listContainer: {
    paddingTop: Spacing.sm,
    paddingBottom: 100,
  },

  transactionCard: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xlarge,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#1e293b",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  transactionIcon: {
    width: IconSizes.xxlarge + 4,
    height: IconSizes.xxlarge + 4,
    borderRadius: (IconSizes.xxlarge + 4) / 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
    borderWidth: 2,
  },
  creditIcon: {
    backgroundColor: "#fef2f2",
  },
  paymentIcon: {
    backgroundColor: "#f0fdf4",
  },
  transactionContent: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  transactionTypeContainer: {
    flex: 1,
  },
  transactionType: {
    fontSize: FontSizes.regular,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  creditText: {
    color: "#dc2626",
  },
  paymentText: {
    color: "#059669",
  },
  transactionDate: {
    fontSize: FontSizes.small,
    fontWeight: "500",
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    fontSize: FontSizes.large,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  creditAmount: {
    color: "#dc2626",
  },
  paymentAmount: {
    color: "#059669",
  },

  noteContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.sm,
    borderRadius: BorderRadius.small,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  noteText: {
    flex: 1,
    fontSize: FontSizes.small,
    fontWeight: "500",
    lineHeight: 18,
  },

  transactionFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  balanceLabel: {
    fontSize: FontSizes.tiny,
    fontWeight: "600",
    marginRight: Spacing.sm,
  },
  balanceValue: {
    fontSize: FontSizes.small,
    fontWeight: "700",
    flex: 1,
  },
  editIndicator: {
    marginLeft: "auto",
  },

  photoThumbnailContainer: {
    width: IconSizes.xxlarge * 1.4,
    height: IconSizes.xxlarge * 1.4,
    borderRadius: BorderRadius.medium,
    overflow: "hidden",
    borderWidth: 2,
    marginLeft: Spacing.md,
    position: "relative",
  },
  photoThumbnail: {
    width: "100%",
    height: "100%",
  },
  photoIconBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(30, 64, 175, 0.9)",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    borderTopLeftRadius: BorderRadius.xlarge,
    borderTopRightRadius: BorderRadius.xlarge,
    maxHeight: '80%',
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
  modalContent: {
    paddingBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.tiny,
    fontWeight: '700',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: Spacing.md,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  filterOptionText: {
    flex: 1,
    fontSize: FontSizes.regular,
    fontWeight: '600',
  },

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
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  loaderText: {
    fontSize: FontSizes.medium,
    fontWeight: "500",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: Spacing.xxl * 2,
  },
  emptyIconContainer: {
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
  },
});
