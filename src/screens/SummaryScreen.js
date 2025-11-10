// src/screens/SummaryScreen.js

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
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import SQLiteService from "../services/SQLiteService";
import SyncService from "../services/SyncService";
import TableRow from "../components/TableRow";
import { CustomerContext } from "../contexts/CustomerContext";
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
import { useTheme } from "../contexts/ThemeContext";
import SubscriptionStatusCard from "../components/SubscriptionStatusCard";
import { 
  FontSizes, 
  Spacing, 
  IconSizes, 
  ButtonSizes, 
  BorderRadius 
} from "../Utils/Responsive";

export default function SummaryScreen() {
  const { refreshCustomers } = useContext(CustomerContext);
  const { t } = ENABLE_I18N
    ? useContext(SimpleLanguageContext)
    : { t: fallbackT };
  const { theme, isDarkMode, toggleTheme } = useTheme();

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
              color: "#ef4444",
              legendFontColor: theme.colors.text,
              legendFontSize: FontSizes.medium,
            },
            {
              name: t("transaction.payment"),
              population: Math.abs(totalPayments),
              color: "#059669",
              legendFontColor: theme.colors.text,
              legendFontSize: FontSizes.medium,
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
  }, [t, theme]);

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
                          await refreshCustomers();
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
  }, [syncing, importing, t, fetchSummary, refreshCustomers]);

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
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["left", "right"]}
    >
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loaderText, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.3}>
            {t("summary.loadingSummary")}
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ paddingBottom: Spacing.lg }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
          >
            {/* Financial Overview Chart */}
            {chartData.length > 0 && (
              <View
                style={[
                  styles.chartCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.cardHeaderIcon,
                      { backgroundColor: theme.colors.primaryLight },
                    ]}
                  >
                    <Ionicons
                      name="pie-chart"
                      size={IconSizes.medium}
                      color={theme.colors.primary}
                    />
                  </View>
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                    {t("summary.financialOverview")}
                  </Text>
                </View>

                <View style={styles.chartContent}>
                  {chartData.map((item, index) => {
                    const total = chartData.reduce(
                      (sum, d) => sum + d.population,
                      0
                    );
                    const percentage = ((item.population / total) * 100).toFixed(1);
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
                          <Text style={[styles.chartLabel, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                            {item.name}
                          </Text>
                        </View>

                        <View style={styles.chartBarSection}>
                          <View
                            style={[
                              styles.chartBarTrack,
                              {
                                backgroundColor: isDarkMode
                                  ? theme.colors.border
                                  : "#f1f5f9",
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.chartBarFill,
                                { width: barWidth, backgroundColor: item.color },
                              ]}
                            />
                          </View>
                          <Text
                            style={[
                              styles.chartPercentage,
                              { color: theme.colors.textSecondary },
                            ]}
                            maxFontSizeMultiplier={1.3}
                          >
                            {percentage}%
                          </Text>
                        </View>

                        <Text style={[styles.chartAmount, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                          ₹{item.population.toLocaleString()}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Summary Statistics */}
            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.cardHeaderIcon,
                    { backgroundColor: theme.colors.primaryLight },
                  ]}
                >
                  <Ionicons
                    name="stats-chart"
                    size={IconSizes.medium}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
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
                    let iconColor = theme.colors.primary;
                    let iconBg = theme.colors.primaryLight;

                    if (isCredit) {
                      iconName = "arrow-up-circle";
                      iconColor = "#ef4444";
                      iconBg = isDarkMode ? "#5f2c2c" : "#fef2f2";
                    } else if (isPayment) {
                      iconName = "arrow-down-circle";
                      iconColor = "#059669";
                      iconBg = isDarkMode ? "#064e3b" : "#f0fdf4";
                    } else if (isOutstanding) {
                      iconName = "wallet";
                      iconColor = "#f97316";
                      iconBg = isDarkMode ? "#5a2e0f" : "#fef3c7";
                    } else if (item.Metric?.toLowerCase().includes("customer")) {
                      iconName = "people";
                      iconColor = "#7c3aed";
                      iconBg = isDarkMode ? "#4c1d95" : "#f3e8ff";
                    }

                    return (
                      <View
                        key={index}
                        style={[
                          styles.statCard,
                          {
                            backgroundColor: isDarkMode
                              ? theme.colors.card
                              : "#f8fafc",
                            borderColor: theme.colors.border,
                          },
                        ]}
                      >
                        <View style={styles.statHeader}>
                          <View
                            style={[styles.statIcon, { backgroundColor: iconBg }]}
                          >
                            <Ionicons
                              name={iconName}
                              size={IconSizes.medium}
                              color={iconColor}
                            />
                          </View>
                        </View>
                        <Text style={[styles.statValue, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                          {isMonetary
                            ? `₹${parseFloat(item.Formula).toLocaleString()}`
                            : item.Formula}
                        </Text>
                        <Text
                          style={[
                            styles.statLabel,
                            { color: theme.colors.textSecondary },
                          ]}
                          numberOfLines={2}
                          maxFontSizeMultiplier={1.2}
                        >
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
                    size={IconSizes.xxlarge}
                    color={theme.colors.textTertiary}
                  />
                  <Text
                    style={[
                      styles.emptyStateText,
                      { color: theme.colors.textTertiary },
                    ]}
                    maxFontSizeMultiplier={1.3}
                  >
                    {t("summary.noSummaryDataFound")}
                  </Text>
                </View>
              )}
            </View>

            {/* Top Outstanding Customers */}
            {outstandingCustomers.length > 0 && (
              <View
                style={[
                  styles.outstandingCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.cardHeaderIcon,
                      {
                        backgroundColor: isDarkMode ? "#5f2c2c" : "#fef2f2",
                      },
                    ]}
                  >
                    <Ionicons
                      name="people"
                      size={IconSizes.medium}
                      color="#ef4444"
                    />
                  </View>
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
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
                          [
                            styles.customerCardBorder,
                            { borderBottomColor: theme.colors.borderLight },
                          ],
                      ]}
                    >
                      <View
                        style={[
                          styles.customerRank,
                          {
                            backgroundColor: isDarkMode ? "#1e3a8a" : "#dbeafe",
                            borderColor: theme.colors.primary,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.rankNumber,
                            { color: theme.colors.primary },
                          ]}
                          maxFontSizeMultiplier={1.3}
                        >
                          #{index + 1}
                        </Text>
                      </View>

                      <View style={styles.customerDetails}>
                        <Text
                          style={[styles.customerName, { color: theme.colors.text }]}
                          maxFontSizeMultiplier={1.3}
                        >
                          {customer["Customer Name"]}
                        </Text>
                        <View
                          style={[
                            styles.balanceBadge,
                            {
                              backgroundColor: isDarkMode
                                ? "#5f2c2c"
                                : "#fef2f2",
                              borderColor: isDarkMode ? "#b91c1c" : "#fecaca",
                            },
                          ]}
                        >
                          <Ionicons name="cash" size={IconSizes.small} color="#ef4444" />
                          <Text
                            style={[
                              styles.balanceAmount,
                              { color: "#ef4444" },
                            ]}
                            maxFontSizeMultiplier={1.3}
                          >
                            ₹{(customer["Total Balance"] || 0).toLocaleString()}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.reminderButton,
                          {
                            backgroundColor: theme.colors.primaryLight,
                            borderColor: isDarkMode
                              ? theme.colors.primary
                              : "#bfdbfe",
                          },
                        ]}
                        onPress={() =>
                          showPaymentReminderOptions(customer, t)
                        }
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="chatbubble-ellipses"
                          size={IconSizes.medium}
                          color={theme.colors.primary}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Reports & Backup Section */}
            {/* <View
              style={[
                styles.actionsCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            > */}
              {/* <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.cardHeaderIcon,
                    { backgroundColor: theme.colors.primaryLight },
                  ]}
                >
                  <Ionicons
                    name="document"
                    size={IconSizes.medium}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                  {t("summary.reportsAndBackup")}
                </Text>
              </View> */}

              {/* <View style={styles.actionsGrid}> */}
                {/* Outstanding Balance Report */}
                {/* <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: isDarkMode
                        ? theme.colors.card
                        : "#f8fafc",
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={handleOutstandingBalanceReport}
                  disabled={generatingReport === "outstanding"}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.actionIconContainer,
                      {
                        backgroundColor: isDarkMode ? "#5f2c2c" : "#fef2f2",
                      },
                    ]}
                  >
                    <Ionicons
                      name="document-text"
                      size={IconSizes.large}
                      color="#ef4444"
                    />
                  </View>
                  <Text style={[styles.actionButtonText, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                    {t("summary.outstandingReport")}
                  </Text>
                  {generatingReport === "outstanding" && (
                    <ActivityIndicator
                      size="small"
                      color="#ef4444"
                      style={styles.actionLoader}
                    />
                  )}
                </TouchableOpacity> */}

                {/* Export to Excel */}
                {/* <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: isDarkMode
                        ? theme.colors.card
                        : "#f8fafc",
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={handleExportToExcel}
                  disabled={generatingReport === "excelExport"}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.actionIconContainer,
                      { backgroundColor: theme.colors.primaryLight },
                    ]}
                  >
                    <Ionicons name="document" size={IconSizes.large} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.actionButtonText, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                    {t("summary.exportExcel")}
                  </Text>
                  {generatingReport === "excelExport" && (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary}
                      style={styles.actionLoader}
                    />
                  )}
                </TouchableOpacity> */}

                {/* Import from Excel */}
                {/* <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: isDarkMode
                        ? theme.colors.card
                        : "#f8fafc",
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={handleImportFromExcel}
                  disabled={generatingReport === "excelImport"}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.actionIconContainer,
                      {
                        backgroundColor: isDarkMode ? "#5a2e0f" : "#fef3c7",
                      },
                    ]}
                  >
                    <Ionicons
                      name="document-attach"
                      size={IconSizes.large}
                      color="#f97316"
                    />
                  </View>
                  <Text style={[styles.actionButtonText, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                    {t("summary.importExcel")}
                  </Text>
                  {generatingReport === "excelImport" && (
                    <ActivityIndicator
                      size="small"
                      color="#f97316"
                      style={styles.actionLoader}
                    />
                  )}
                </TouchableOpacity> */}
              {/* </View> */}

              {/* Sync Status Footer */}
              {/* <View
                style={[
                  styles.syncStatusContainer,
                  { borderTopColor: theme.colors.borderLight },
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={IconSizes.small}
                  color={theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.syncStatusText,
                    { color: theme.colors.textSecondary },
                  ]}
                  maxFontSizeMultiplier={1.3}
                >
                  {t("summary.lastSync")}{" "}
                  {syncStatus.lastSyncTime
                    ? SyncService.formatSyncTime(syncStatus.lastSyncTime)
                    : t("summary.never")}
                </Text>
              </View> */}
            {/* </View> */}

            {/* Cloud Sync Section */}
            {/* <View
              style={[
                styles.cloudSyncCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.cardHeaderIcon,
                    {
                      backgroundColor: isDarkMode ? "#312e81" : "#e0e7ff",
                    },
                  ]}
                >
                  <Ionicons name="cloud" size={IconSizes.medium} color="#6366f1" />
                </View>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                  {t("cloudSync.cloudSync")}
                </Text>
              </View>

              <SubscriptionStatusCard />

              <View style={{ marginTop: Spacing.lg }}>
                <SupabaseSyncCard />
              </View>
            </View> */}

            {/* Theme Toggle Card */}
            {/* <View
              style={[
                styles.themeToggleCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.cardHeaderIcon,
                    { backgroundColor: theme.colors.primaryLight },
                  ]}
                >
                  <Ionicons
                    name={isDarkMode ? "moon" : "sunny"}
                    size={IconSizes.large}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                  {isDarkMode ? t("theme.darkMode") : t("theme.lightMode")}
                </Text>
              </View> */}

              {/* <View style={styles.themeToggleContent}>
                <Text
                  style={[
                    styles.themeToggleSubtext,
                    { color: theme.colors.textSecondary },
                  ]}
                  maxFontSizeMultiplier={1.3}
                >
                  {isDarkMode
                    ? t("theme.switchToDark")
                    : t("theme.switchToLight")}
                </Text>
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  trackColor={{
                    false: theme.colors.borderLight,
                    true: theme.colors.primary,
                  }}
                  thumbColor={theme.colors.surface}
                  ios_backgroundColor={theme.colors.borderLight}
                />
              </View>
            </View> */}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Loader
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.lg,
  },
  loaderText: {
    fontSize: FontSizes.regular,
    fontWeight: "500",
  },

  // Card Base Styles
  chartCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.xlarge,
    padding: Spacing.lg,
    borderWidth: 1,
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
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.xlarge,
    padding: Spacing.lg,
    borderWidth: 1,
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
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.xlarge,
    padding: Spacing.lg,
    borderWidth: 1,
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
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.xlarge,
    padding: Spacing.lg,
    borderWidth: 1,
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
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  cardHeaderIcon: {
    width: IconSizes.xlarge,
    height: IconSizes.xlarge,
    borderRadius: IconSizes.xlarge / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: FontSizes.large,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  // Chart Styles
  chartContent: {
    gap: Spacing.lg,
  },
  chartRow: {
    gap: Spacing.md,
  },
  chartLabelSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  chartIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  chartLabel: {
    fontSize: FontSizes.medium,
    fontWeight: "600",
  },
  chartBarSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  chartBarTrack: {
    flex: 1,
    height: 24,
    borderRadius: 12,
    overflow: "hidden",
  },
  chartBarFill: {
    height: 24,
    borderRadius: 12,
    minWidth: 24,
  },
  chartPercentage: {
    fontSize: FontSizes.medium,
    fontWeight: "700",
    minWidth: 48,
  },
  chartAmount: {
    fontSize: FontSizes.regular,
    fontWeight: "800",
    textAlign: "right",
  },

  // Empty State
  emptyState: {
    paddingVertical: 48,
    alignItems: "center",
    gap: Spacing.md,
  },
  emptyStateText: {
    fontSize: FontSizes.regular,
    fontWeight: "500",
  },

  // Outstanding Customers
  customersList: {
    gap: 0,
  },
  customerCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    gap: Spacing.lg,
  },
  customerCardBorder: {
    borderBottomWidth: 1,
  },
  customerRank: {
    width: IconSizes.xxlarge,
    height: IconSizes.xxlarge,
    borderRadius: IconSizes.xxlarge / 2,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
    flexShrink: 0,
  },
  rankNumber: {
    fontSize: FontSizes.regular,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  customerDetails: {
    flex: 1,
    gap: Spacing.sm,
  },
  customerName: {
    fontSize: FontSizes.regular,
    fontWeight: "600",
  },
  balanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.medium,
    alignSelf: "flex-start",
    gap: Spacing.sm,
    borderWidth: 1,
  },
  balanceAmount: {
    fontSize: FontSizes.medium,
    fontWeight: "700",
  },
  reminderButton: {
    width: ButtonSizes.large,
    height: ButtonSizes.large,
    borderRadius: ButtonSizes.large / 2,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },

  // Actions Grid
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    minWidth: "47%",
    borderRadius: BorderRadius.xlarge,
    padding: Spacing.lg,
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    position: "relative",
  },
  actionIconContainer: {
    width: IconSizes.xxlarge * 1.3,
    height: IconSizes.xxlarge * 1.3,
    borderRadius: IconSizes.xlarge * 0.65,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: FontSizes.small,
    fontWeight: "700",
    textAlign: "center",
  },
  actionLoader: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
  },

  // Sync Status
  syncStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Spacing.lg,
    marginTop: Spacing.lg,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  syncStatusText: {
    fontSize: FontSizes.small,
    fontWeight: "500",
  },

  // Summary Statistics
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: "47%",
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  statIcon: {
    width: IconSizes.xlarge,
    height: IconSizes.xlarge,
    borderRadius: IconSizes.xlarge / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: FontSizes.xlarge,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FontSizes.tiny,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    lineHeight: 16,
  },

  cloudSyncCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.xlarge,
    padding: Spacing.lg,
    borderWidth: 1,
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

  // Theme Toggle
  themeToggleCard: {
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderWidth: 2,
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
  themeToggleContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  themeToggleSubtext: {
    fontSize: FontSizes.regular,
    fontWeight: "500",
    flex: 1,
  },
});
