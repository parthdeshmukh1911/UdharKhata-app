import React, { useState, useCallback, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import SQLiteService from "../services/SQLiteService";
import SyncService from "../services/SyncService";
import TableRow from "../components/TableRow";
import { CustomerContext } from "../contexts/CustomerContext"; // ✅ Added
import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { ENABLE_I18N, fallbackT } from "../config/i18nConfig";
import {
  generateOutstandingBalanceReport,
  generateDataBackupReport,
} from "../Utils/ReportGenerator";
import { showPaymentReminderOptions } from "../Utils/WhatsAppService";
import { exportDataToExcel } from "../Utils/ExcelGenerator";
import { importDataFromExcel } from "../Utils/ExcelImporter";
import SupabaseSyncCard from "../components/SupabaseSyncCard";

export default function SummaryScreen() {
  const { refreshCustomers } = useContext(CustomerContext); // ✅ Added
  const { t } = ENABLE_I18N
    ? useContext(SimpleLanguageContext)
    : { t: fallbackT };

  const [summary, setSummary] = useState([]);
  const [outstandingCustomers, setOutstandingCustomers] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    lastSyncTime: null,
    pendingChanges: 0,
  });
  const [recordCounts, setRecordCounts] = useState({
    customers: 0,
    transactions: 0,
  });

  const translateMetric = (metric) => {
    if (!metric) return "";

    const normalizedMetric = metric.toLowerCase().trim();

    const metricMap = {
      "total credit given": t("summary.totalCreditGiven"),
      "total payments received": t("summary.totalPayments"),
      "total payments": t("summary.totalPayments"),
      "payments received": t("summary.totalPaymentsReceived"),
      "payment total": t("summary.totalPaymentsReceived"),
      "highest outstanding": t("summary.highestOutstanding"),
      "lowest outstanding": t("summary.lowestOutstanding"),
      "total outstanding": t("summary.totalOutstanding"),
      "average outstanding": t("summary.averageOutstanding"),
      outstanding: t("summary.totalOutstanding"),
      "max outstanding": t("summary.highestOutstanding"),
      "min outstanding": t("summary.lowestOutstanding"),
      "fully settled customers": t("summary.fullySettledCustomers"),
      "customers with credit": t("summary.customersWithUdhari"),
      "settled customers": t("summary.fullySettledCustomers"),
      "credit customers": t("summary.customersWithUdhari"),
    };

    if (metricMap[normalizedMetric]) return metricMap[normalizedMetric];

    for (const [key, value] of Object.entries(metricMap)) {
      if (normalizedMetric.includes(key) || key.includes(normalizedMetric))
        return value;
    }

    return metric;
  };

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, customersData, transactionsData, syncStatusData] =
        await Promise.all([
          SQLiteService.getSummary(),
          SQLiteService.getCustomers(),
          SQLiteService.getTransactions(),
          SyncService.checkSyncStatus(),
        ]);

      setSummary(summaryData);

      const outstanding = customersData
        .filter((customer) => (customer["Total Balance"] || 0) > 0)
        .sort((a, b) => (b["Total Balance"] || 0) - (a["Total Balance"] || 0))
        .slice(0, 5);
      setOutstandingCustomers(outstanding);

      const processChartData = () => {
        const totalUdhari =
          summaryData.find(
            (item) =>
              item.Metric?.toLowerCase().includes("total credit") ||
              item.Metric?.toLowerCase().includes("credit total")
          )?.Formula || 0;

        const totalPayments =
          summaryData.find(
            (item) =>
              item.Metric?.toLowerCase().includes("total payments") ||
              item.Metric?.toLowerCase().includes("payment total")
          )?.Formula || 0;

        if (totalUdhari > 0 || totalPayments > 0) {
          return [
            {
              name: t("transaction.udhari"),
              population: Math.abs(totalUdhari),
              color: "#dc2626",
              legendFontColor: "#333",
              legendFontSize: 14,
            },
            {
              name: t("transaction.payment"),
              population: Math.abs(totalPayments),
              color: "#059669",
              legendFontColor: "#333",
              legendFontSize: 14,
            },
          ];
        }
        return [];
      };

      setChartData(processChartData());
      setSyncStatus(syncStatusData);
      setRecordCounts({
        customers: customersData.length,
        transactions: transactionsData.length,
      });

      const totalCustomersMetric = {
        Metric: t("summary.totalCustomers"),
        Formula: customersData.length,
      };

      setSummary([
        totalCustomersMetric,
        ...summaryData.map((item) => {
          if (
            item.Metric &&
            (item.Metric.toLowerCase().includes("total credit") ||
              item.Metric.toLowerCase().includes("credit given") ||
              item.Metric.toLowerCase().includes("udhari"))
          ) {
            return { ...item, Metric: t("summary.totalCreditGiven") };
          }
          return item;
        }),
      ]);
    } catch (error) {
      console.error("Fetch Summary Error:", error);
    }
    setLoading(false);
  }, [t]);

  const handleSync = useCallback(async () => {
    if (syncing || importing) return;

    setSyncing(true);
    try {
      const result = await SyncService.syncToGoogleSheets();
      if (result.success) {
        Alert.alert(t("summary.success"), result.message);
        await fetchSummary();
      } else {
        Alert.alert(t("common.error"), result.error);
      }
    } catch (error) {
      Alert.alert(t("common.error"), error.message);
    } finally {
      setSyncing(false);
    }
  }, [syncing, importing, t, fetchSummary]);

  const handleImport = useCallback(async () => {
    if (syncing || importing) return;

    Alert.alert(t("summary.importData"), t("summary.importWarning"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.import"),
        style: "destructive",
        onPress: async () => {
          setImporting(true);
          try {
            const result = await SyncService.importFromGoogleSheets();
            if (result.success) {
              Alert.alert(t("summary.success"), result.message, [
                { text: t("common.ok"), onPress: async () => fetchSummary() },
              ]);
            } else {
              Alert.alert(t("common.error"), result.error);
            }
          } catch (error) {
            Alert.alert(t("common.error"), error.message);
          } finally {
            setImporting(false);
          }
        },
      },
    ]);
  }, [syncing, importing, t, fetchSummary]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSummary();
    setRefreshing(false);
  }, [fetchSummary]);

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
    }, [fetchSummary])
  );

  const handleOutstandingBalanceReport = useCallback(async () => {
    setGeneratingReport("outstanding");
    try {
      const result = await generateOutstandingBalanceReport(t);
      if (result.success) {
        Alert.alert(
          t("summary.success"),
          t("summary.reportGeneratedSuccessfully")
        );
      } else {
        Alert.alert(
          t("common.error"),
          result.error || t("summary.failedToGenerateReport")
        );
      }
    } catch (error) {
      Alert.alert(t("common.error"), t("summary.somethingWentWrong"));
    }
    setGeneratingReport(null);
  }, [t]);

  const handleDataBackupReport = useCallback(async () => {
    setGeneratingReport("backup");
    try {
      const result = await generateDataBackupReport();
      if (result.success) {
        Alert.alert(
          t("summary.success"),
          t("summary.backupGeneratedSuccessfully")
        );
      } else {
        Alert.alert(
          t("common.error"),
          result.error || t("summary.failedToGenerateBackup")
        );
      }
    } catch (error) {
      Alert.alert(t("common.error"), t("summary.somethingWentWrong"));
    }
    setGeneratingReport(null);
  }, [t]);

  const handleExportToExcel = useCallback(async () => {
    setGeneratingReport("excelExport");
    try {
      const result = await exportDataToExcel();
      if (result.success) {
        Alert.alert(
          t("common.success"),
          t("backupAndSync.exportSuccess") + ` ${result.fileName}`
        );
      } else {
        Alert.alert(
          t("common.error"),
          result.error || t("backupAndSync.exportFailed")
        );
      }
    } catch (error) {
      Alert.alert(
        t("common.error"),
        error.message || t("backupAndSync.exportFailed")
      );
    }
    setGeneratingReport(null);
  }, [t]);

  const handleImportFromExcel = useCallback(async () => {
    if (syncing || importing) return;

    Alert.alert(
      t("backupAndSync.restoreData"),
      t("backupAndSync.importConfirmation"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.proceed"),
          style: "destructive",
          onPress: async () => {
            setGeneratingReport("excelImport");
            try {
              const result = await importDataFromExcel();
              if (!result) {
                Alert.alert(t("common.error"), t("backupAndSync.invalidFile"));
                setGeneratingReport(null);
                return;
              }
              if (!result.success) {
                Alert.alert(
                  t("common.error"),
                  result.error || t("backupAndSync.importFailed")
                );
                setGeneratingReport(null);
                return;
              }

              const { customers, transactions, counts } = result;
              Alert.alert(
                t("backupAndSync.restoreData"),
                t("backupAndSync.replaceWithCounts")
                  .replace("{customers}", counts.customers)
                  .replace("{transactions}", counts.transactions),
                [
                  {
                    text: t("common.cancel"),
                    style: "cancel",
                    onPress: () => setGeneratingReport(null),
                  },
                  {
                    text: t("common.replace"),
                    style: "destructive",
                    onPress: async () => {
                      setImporting(true);
                      try {
                        const bulkResult = await SQLiteService.bulkReplaceExcel(
                          customers,
                          transactions
                        );
                        if (bulkResult?.status === "success") {
                          // ✅ REFRESH CUSTOMER CONTEXT FIRST
                          await refreshCustomers();

                          // Then fetch summary
                          await fetchSummary();

                          Alert.alert(
                            t("common.success"),
                            t("backupAndSync.restoreSuccess")
                              .replace("{customers}", counts.customers)
                              .replace("{transactions}", counts.transactions)
                          );
                        } else {
                          Alert.alert(
                            t("common.error"),
                            bulkResult?.message ||
                              t("backupAndSync.restoreFailed")
                          );
                        }
                      } catch (error) {
                        Alert.alert(
                          t("common.error"),
                          error.message || t("backupAndSync.restoreFailed")
                        );
                      } finally {
                        setImporting(false);
                        setGeneratingReport(null);
                      }
                    },
                  },
                ]
              );
            } catch (error) {
              Alert.alert(
                t("common.error"),
                error.message || t("backupAndSync.importFailed")
              );
              setGeneratingReport(null);
            }
          },
        },
      ]
    );
  }, [syncing, importing, t, fetchSummary, refreshCustomers]); // ✅ Added refreshCustomers

  const renderItem = useCallback(
    ({ item }) => (
      <TableRow
        columns={[
          { value: translateMetric(item.Metric ?? ""), flex: 3 },
          { value: item.Formula ?? "", flex: 2 },
        ]}
      />
    ),
    [translateMetric]
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#1e40af" />
          <Text style={styles.loaderText}>{t("summary.loadingSummary")}</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1e40af"
              colors={["#1e40af", "#1e3a8a"]}
            />
          }
        >
          {/* Financial Overview Chart */}
          {chartData.length > 0 && (
            <View style={styles.chartCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <Ionicons name="pie-chart" size={20} color="#1e40af" />
                </View>
                <Text style={styles.cardTitle}>
                  {t("summary.financialOverview")}
                </Text>
              </View>

              <View style={styles.chartContent}>
                {chartData.map((item, index) => {
                  const total = chartData.reduce(
                    (sum, d) => sum + d.population,
                    0
                  );
                  const percentage = ((item.population / total) * 100).toFixed(
                    1
                  );
                  const barWidth = `${(item.population / total) * 100}%`;

                  return (
                    <View key={index} style={styles.chartRow}>
                      <View style={styles.chartLabelSection}>
                        <View
                          style={[
                            styles.chartIndicator,
                            { backgroundColor: item.color },
                          ]}
                        />
                        <Text style={styles.chartLabel}>{item.name}</Text>
                      </View>

                      <View style={styles.chartBarSection}>
                        <View style={styles.chartBarTrack}>
                          <View
                            style={[
                              styles.chartBarFill,
                              { width: barWidth, backgroundColor: item.color },
                            ]}
                          />
                        </View>
                        <Text style={styles.chartPercentage}>
                          {percentage}%
                        </Text>
                      </View>

                      <Text style={styles.chartAmount}>
                        ₹{item.population.toLocaleString()}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Summary Statistics */}
          <View style={styles.summaryCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="stats-chart" size={20} color="#1e40af" />
              </View>
              <Text style={styles.cardTitle}>
                {t("summary.summaryStatistics")}
              </Text>
            </View>

            {summary.length > 0 ? (
              <View style={styles.statsGrid}>
                {summary.map((item, index) => {
                  const isMonetary =
                    typeof item.Formula === "number" && item.Formula > 100;
                  const isCredit =
                    item.Metric?.toLowerCase().includes("credit");
                  const isPayment =
                    item.Metric?.toLowerCase().includes("payment");
                  const isOutstanding =
                    item.Metric?.toLowerCase().includes("outstanding");

                  let iconName = "analytics";
                  let iconColor = "#1e40af";
                  let iconBg = "#dbeafe";

                  if (isCredit) {
                    iconName = "arrow-up-circle";
                    iconColor = "#dc2626";
                    iconBg = "#fef2f2";
                  } else if (isPayment) {
                    iconName = "arrow-down-circle";
                    iconColor = "#059669";
                    iconBg = "#f0fdf4";
                  } else if (isOutstanding) {
                    iconName = "wallet";
                    iconColor = "#d97706";
                    iconBg = "#fef3c7";
                  } else if (item.Metric?.toLowerCase().includes("customer")) {
                    iconName = "people";
                    iconColor = "#7c3aed";
                    iconBg = "#f3e8ff";
                  }

                  return (
                    <View key={index} style={styles.statCard}>
                      <View style={styles.statHeader}>
                        <View
                          style={[styles.statIcon, { backgroundColor: iconBg }]}
                        >
                          <Ionicons
                            name={iconName}
                            size={20}
                            color={iconColor}
                          />
                        </View>
                      </View>
                      <Text style={styles.statValue}>
                        {isMonetary
                          ? `₹${parseFloat(item.Formula).toLocaleString()}`
                          : item.Formula}
                      </Text>
                      <Text style={styles.statLabel} numberOfLines={2}>
                        {translateMetric(item.Metric ?? "")}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons
                  name="document-text-outline"
                  size={48}
                  color="#cbd5e1"
                />
                <Text style={styles.emptyStateText}>
                  {t("summary.noSummaryDataFound")}
                </Text>
              </View>
            )}
          </View>

          {/* Top Outstanding Customers */}
          {outstandingCustomers.length > 0 && (
            <View style={styles.outstandingCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <Ionicons name="people" size={20} color="#dc2626" />
                </View>
                <Text style={styles.cardTitle}>
                  {t("summary.topOutstandingCustomers")}
                </Text>
              </View>

              <View style={styles.customersList}>
                {outstandingCustomers.map((customer, index) => (
                  <View
                    key={customer["Customer ID"]}
                    style={[
                      styles.customerCard,
                      index !== outstandingCustomers.length - 1 &&
                        styles.customerCardBorder,
                    ]}
                  >
                    <View style={styles.customerRank}>
                      <Text style={styles.rankNumber}>#{index + 1}</Text>
                    </View>

                    <View style={styles.customerDetails}>
                      <Text style={styles.customerName}>
                        {customer["Customer Name"]}
                      </Text>
                      <View style={styles.balanceBadge}>
                        <Ionicons name="cash" size={14} color="#dc2626" />
                        <Text style={styles.balanceAmount}>
                          ₹{(customer["Total Balance"] || 0).toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.reminderButton}
                      onPress={() => showPaymentReminderOptions(customer, t)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="chatbubble-ellipses"
                        size={20}
                        color="#1e40af"
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Reports & Backup Section */}
          <View style={styles.actionsCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="document" size={20} color="#1e40af" />
              </View>
              <Text style={styles.cardTitle}>
                {t("summary.reportsAndBackup")}
              </Text>
            </View>

            <View style={styles.actionsGrid}>
              {/* Outstanding Balance Report */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleOutstandingBalanceReport}
                disabled={generatingReport === "outstanding"}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.actionIconContainer,
                    { backgroundColor: "#fef2f2" },
                  ]}
                >
                  <Ionicons name="document-text" size={24} color="#dc2626" />
                </View>
                <Text style={styles.actionButtonText}>
                  {t("summary.outstandingReport")}
                </Text>
                {generatingReport === "outstanding" && (
                  <ActivityIndicator
                    size="small"
                    color="#dc2626"
                    style={styles.actionLoader}
                  />
                )}
              </TouchableOpacity>

              {/* Data Backup */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleDataBackupReport}
                disabled={generatingReport === "backup"}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.actionIconContainer,
                    { backgroundColor: "#f0fdf4" },
                  ]}
                >
                  <Ionicons name="cloud-download" size={24} color="#059669" />
                </View>
                <Text style={styles.actionButtonText}>
                  {t("summary.dataBackup")}
                </Text>
                {generatingReport === "backup" && (
                  <ActivityIndicator
                    size="small"
                    color="#059669"
                    style={styles.actionLoader}
                  />
                )}
              </TouchableOpacity>

              {/* Export to Excel */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleExportToExcel}
                disabled={generatingReport === "excelExport"}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.actionIconContainer,
                    { backgroundColor: "#f0f9ff" },
                  ]}
                >
                  <Ionicons name="document" size={24} color="#1e40af" />
                </View>
                <Text style={styles.actionButtonText}>
                  {t("summary.exportExcel")}
                </Text>
                {generatingReport === "excelExport" && (
                  <ActivityIndicator
                    size="small"
                    color="#1e40af"
                    style={styles.actionLoader}
                  />
                )}
              </TouchableOpacity>

              {/* Import from Excel */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleImportFromExcel}
                disabled={generatingReport === "excelImport"}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.actionIconContainer,
                    { backgroundColor: "#fef3c7" },
                  ]}
                >
                  <Ionicons name="document-attach" size={24} color="#d97706" />
                </View>
                <Text style={styles.actionButtonText}>
                  {t("summary.importExcel")}
                </Text>
                {generatingReport === "excelImport" && (
                  <ActivityIndicator
                    size="small"
                    color="#d97706"
                    style={styles.actionLoader}
                  />
                )}
              </TouchableOpacity>
            </View>

            {/* Sync Status Footer */}
            <View style={styles.syncStatusContainer}>
              <Ionicons name="time-outline" size={16} color="#64748b" />
              <Text style={styles.syncStatusText}>
                {t("summary.lastSync")}{" "}
                {syncStatus.lastSyncTime
                  ? SyncService.formatSyncTime(syncStatus.lastSyncTime)
                  : t("summary.never")}
              </Text>
            </View>
          </View>

          {/* Cloud Sync Section */}
          <View style={styles.cloudSyncCard}>
            <View style={styles.cardHeader}>
              <View
                style={[styles.cardHeaderIcon, { backgroundColor: "#e0e7ff" }]}
              >
                <Ionicons name="cloud" size={20} color="#6366f1" />
              </View>
              <Text style={styles.cardTitle}>Cloud Sync</Text>
            </View>

            <SupabaseSyncCard />
          </View>

          {/* Bottom Spacer */}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  // Loader
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loaderText: {
    fontSize: 15,
    color: "#64748b",
    fontWeight: "500",
  },

  // Card Base Styles
  chartCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...Platform.select({
      ios: {
        shadowColor: "#1e293b",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  summaryCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...Platform.select({
      ios: {
        shadowColor: "#1e293b",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  outstandingCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...Platform.select({
      ios: {
        shadowColor: "#1e293b",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  actionsCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...Platform.select({
      ios: {
        shadowColor: "#1e293b",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },

  // Card Header
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  cardHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    letterSpacing: -0.3,
  },

  // Chart Styles
  chartContent: {
    gap: 16,
  },
  chartRow: {
    gap: 12,
  },
  chartLabelSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  chartIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  chartLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  chartBarSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  chartBarTrack: {
    flex: 1,
    height: 24,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    overflow: "hidden",
  },
  chartBarFill: {
    height: 24,
    borderRadius: 12,
    minWidth: 24,
  },
  chartPercentage: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
    minWidth: 48,
  },
  chartAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
    textAlign: "right",
  },

  // Table Styles
  tableContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#e2e8f0",
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Empty State
  emptyState: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 12,
  },
  emptyStateText: {
    fontSize: 15,
    color: "#94a3b8",
    fontWeight: "500",
  },

  // Outstanding Customers
  customersList: {
    gap: 0,
  },
  customerCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 16,
  },
  customerCardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  customerRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: "800",
    color: "#64748b",
  },
  customerDetails: {
    flex: 1,
    gap: 6,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  balanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    gap: 6,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  balanceAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#dc2626",
  },
  reminderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },

  // Actions Grid
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    position: "relative",
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    textAlign: "center",
  },
  actionLoader: {
    position: "absolute",
    top: 12,
    right: 12,
  },

  // Sync Status
  syncStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 8,
  },
  syncStatusText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },

  // Summary Statistics
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 8,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1e293b",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    lineHeight: 16,
  },

  cloudSyncCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...Platform.select({
      ios: {
        shadowColor: "#6366f1",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
