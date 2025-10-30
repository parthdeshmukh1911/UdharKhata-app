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
  Alert,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Dropdown } from "react-native-element-dropdown";
import SQLiteService from "../services/SQLiteService";
import PDFDownloadModal from "../components/PDFDownloadModal";
import { generateTransactionPDF } from "../Utils/PDFGenerator";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { ENABLE_I18N, fallbackT } from "../config/i18nConfig";
import ImageView from "react-native-image-viewing";

export default function TransactionsScreen({ navigation, route }) {
  const { t } = ENABLE_I18N
    ? useContext(SimpleLanguageContext)
    : { t: fallbackT };
  const insets = useSafeAreaInsets();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const selectedCustomerIdRef = useRef(null);
  const shouldAutoLoadRef = useRef(false); // ✅ NEW: Flag to control auto-loading

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
            const sortedTxns = [...txns].sort((a, b) =>
              b.Date.localeCompare(a.Date)
            );
            setTransactions(sortedTxns);
          } else {
            setSelectedCustomer(null);
            setTransactions([]);
            setBalance(0);
            Alert.alert(
              t("common.info"),
              t("customer.customerDeleted") || "Selected customer was deleted"
            );
          }
        }
      })();
      return () => {
        isActive = false;
      };
    }, [t])
  );

  // ✅ MODIFIED: Only auto-refresh when returning from edit, not on selection
  useFocusEffect(
    useCallback(() => {
      if (selectedCustomer && shouldAutoLoadRef.current) {
        const timer = setTimeout(() => {
          fetchTransactions();
          refreshCustomerData();
        }, 100);

        return () => clearTimeout(timer);
      }
      // Reset flag after check
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
        setBalance(0);
        Alert.alert(
          t("common.info"),
          t("customer.customerDeleted") || "Selected customer was deleted"
        );
      }
    }
  };

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

      const sortedTxns = [...txns].sort((a, b) => b.Date.localeCompare(a.Date));
      setTransactions(sortedTxns);

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
      setBalance(0);
      Alert.alert(
        t("common.info"),
        t("customer.customerDeleted") || "Selected customer was deleted"
      );
    }
  };

  const onRefresh = useCallback(async () => {
    if (!selectedCustomer) return;
    setRefreshing(true);
    await Promise.all([fetchTransactions(), refreshCustomerData()]);
    setRefreshing(false);
  }, [selectedCustomer, customers]);

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
    if (!selectedCustomer) {
      Alert.alert(t("common.error"), t("transaction.selectACustomer"));
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
        Alert.alert(t("common.success"), t("common.pdfGeneratedSuccess"));
      } else {
        Alert.alert(
          t("common.error"),
          `${t("common.pdfGeneratedError")}: ${result.error}`
        );
      }
    } catch (error) {
      Alert.alert(t("common.error"), t("common.somethingWentWrong"));
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
          style={styles.transactionCard}
          activeOpacity={0.7}
          onPress={() => {
            shouldAutoLoadRef.current = true; // ✅ Set flag before navigating
            navigation.navigate("EditTransaction", {
              transaction: item,
            });
          }}
        >
          {/* Transaction Icon */}
          <View
            style={[
              styles.transactionIcon,
              isCredit ? styles.creditIcon : styles.paymentIcon,
            ]}
          >
            <Ionicons
              name={isCredit ? "arrow-up" : "arrow-down"}
              size={20}
              color={isCredit ? "#dc2626" : "#059669"}
            />
          </View>

          {/* Transaction Details */}
          <View style={styles.transactionContent}>
            <View style={styles.transactionHeader}>
              <View style={styles.transactionTypeContainer}>
                <Text
                  style={[
                    styles.transactionType,
                    isCredit ? styles.creditText : styles.paymentText,
                  ]}
                >
                  {isCredit
                    ? t("transaction.creditGiven")
                    : t("transaction.paymentReceived")}
                </Text>
                <Text style={styles.transactionDate}>
                  {formatDate(item.Date)}
                </Text>
              </View>
              <View style={styles.amountContainer}>
                <Text
                  style={[
                    styles.transactionAmount,
                    isCredit ? styles.creditAmount : styles.paymentAmount,
                  ]}
                >
                  {isCredit ? "+" : "-"}₹
                  {parseFloat(item.Amount).toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Note if exists */}
            {item.Note && (
              <View style={styles.noteContainer}>
                <Ionicons name="document-text" size={14} color="#64748b" />
                <Text style={styles.noteText} numberOfLines={2}>
                  {item.Note}
                </Text>
              </View>
            )}

            {/* Balance After Transaction */}
            <View style={styles.transactionFooter}>
              <Text style={styles.balanceLabel}>
                {t("transaction.balanceAfter")}
              </Text>
              <Text style={styles.balanceValue}>
                ₹
                {parseFloat(item["Balance After Transaction"]).toLocaleString()}
              </Text>
              <View style={styles.editIndicator}>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </View>
            </View>
          </View>

          {/* Photo Thumbnail */}
          {hasPhoto && (
            <TouchableOpacity
              style={styles.photoThumbnailContainer}
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
    [navigation, t]
  );

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        {/* Customer Selector */}
        <View style={styles.selectorContainer}>
          <View style={styles.dropdownWrapper}>
            <Ionicons
              name="person"
              size={20}
              color="#64748b"
              style={styles.dropdownIcon}
            />
            <Dropdown
              style={styles.dropdown}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              inputSearchStyle={styles.inputSearchStyle}
              itemTextStyle={styles.itemTextStyle}
              itemContainerStyle={styles.itemContainerStyle}
              containerStyle={styles.dropdownContainer}
              data={customers}
              search
              maxHeight={300}
              labelField="Customer Name"
              valueField="Customer ID"
              placeholder={t("customer.selectCustomer")}
              searchPlaceholder={t("common.search")}
              value={selectedCustomer ? selectedCustomer["Customer ID"] : null}
              onChange={(item) => {
                setSelectedCustomer(item);
                setBalance(item["Total Balance"] || 0);
              }}
            />
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={fetchTransactions}
          >
            <Ionicons name="checkmark" size={24} color="#fff" />
          </TouchableOpacity>

          {/* PDF Download Button */}
          <TouchableOpacity
            style={[
              styles.confirmButton,
              !selectedCustomer && styles.buttonDisabled,
            ]}
            onPress={() => setShowPDFModal(true)}
            disabled={!selectedCustomer}
          >
            <Ionicons name="download-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Balance Display */}
        {selectedCustomer && (
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Ionicons name="wallet" size={24} color="#1e40af" />
              <Text style={styles.balanceTitle}>
                {t("transaction.outstandingBalance")}
              </Text>
            </View>
            <Text style={styles.balanceAmount}>
              ₹{parseFloat(balance).toLocaleString()}
            </Text>
            <Text style={styles.balanceSubtitle}>
              {transactions.length}{" "}
              {transactions.length === 1
                ? t("transaction.transactionCount")
                : t("transaction.transactionCountPlural")}
            </Text>
          </View>
        )}
      </View>

      {/* Transaction List */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#1e40af" />
          <Text style={styles.loaderText}>
            {t("transaction.loadingTransactions")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item["Transaction ID"]}
          renderItem={renderTransaction}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1e40af"
              colors={["#1e40af", "#1e3a8a"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="receipt-outline" size={64} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyTitle}>
                {selectedCustomer
                  ? t("transaction.noTransactionsYet")
                  : t("transaction.selectCustomer")}
              </Text>
              <Text style={styles.emptySubtitle}>
                {selectedCustomer
                  ? t("transaction.startByAdding")
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

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 20 + insets.bottom }]}
        onPress={() =>
          navigation.navigate("AddTransaction", {
            selectedCustomer,
            hasSelectedCustomer: !!selectedCustomer,
          })
        }
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={28} color="#fff" />
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
    backgroundColor: "#f8fafc",
  },

  // Header Section
  headerSection: {
    backgroundColor: "#fff",
    paddingTop: 12,
    paddingBottom: 12,
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

  // Customer Selector
  selectorContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
    zIndex: 100,
  },
  dropdownWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    paddingLeft: 12,
  },
  dropdownIcon: {
    marginRight: 8,
  },
  dropdown: {
    flex: 1,
    height: 48,
    paddingRight: 12,
  },
  placeholderStyle: {
    fontSize: 15,
    color: "#94a3b8",
    fontWeight: "500",
  },
  selectedTextStyle: {
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "600",
  },
  inputSearchStyle: {
    height: 44,
    fontSize: 15,
    color: "#1e293b",
    borderRadius: 8,
  },
  itemTextStyle: {
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "500",
  },
  itemContainerStyle: {
    backgroundColor: "#fff",
    paddingVertical: 12,
  },
  dropdownContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...Platform.select({
      ios: {
        shadowColor: "#1e293b",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  confirmButton: {
    width: 48,
    height: 48,
    backgroundColor: "#1e40af",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#1e40af",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },

  buttonDisabled: {
    backgroundColor: "#cbd5e1",
    opacity: 0.6,
    ...Platform.select({
      ios: {
        shadowColor: "#94a3b8",
        shadowOpacity: 0.2,
      },
      android: {
        elevation: 1,
      },
    }),
  },

  // Balance Card
  balanceCard: {
    backgroundColor: "#f8fafc",
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  balanceTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 26,
    fontWeight: "800",
    color: "#dc2626",
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  balanceSubtitle: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },

  // Transaction List
  listContainer: {
    paddingTop: 8,
    paddingBottom: 100,
  },

  // Transaction Card
  transactionCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
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
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  creditIcon: {
    backgroundColor: "#fef2f2",
    borderWidth: 2,
    borderColor: "#fecaca",
  },
  paymentIcon: {
    backgroundColor: "#f0fdf4",
    borderWidth: 2,
    borderColor: "#bbf7d0",
  },
  transactionContent: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  transactionTypeContainer: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
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
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  creditAmount: {
    color: "#dc2626",
  },
  paymentAmount: {
    color: "#059669",
  },

  // Note Container
  noteContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
    gap: 6,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
    lineHeight: 18,
  },

  transactionFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  balanceLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
    marginRight: 6,
  },
  balanceValue: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "700",
    flex: 1,
  },
  editIndicator: {
    marginLeft: "auto",
  },

  // Photo Thumbnail
  photoThumbnailContainer: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    marginLeft: 12,
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
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  // Loading State
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
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
  },
});
