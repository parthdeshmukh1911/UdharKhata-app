import React, { useState, useCallback, useContext, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
} from "react-native";
import * as SMS from 'expo-sms';
import { useSubscription } from "../contexts/SubscriptionContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import SQLiteService from "../services/SQLiteService";
import { CustomerContext } from "../contexts/CustomerContext";
import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { ENABLE_I18N, fallbackT } from "../config/i18nConfig";
import { useTheme } from "../contexts/ThemeContext";
import { useAlert } from "../contexts/AlertContext";
import {
  FontSizes,
  Spacing,
  IconSizes,
  ButtonSizes,
  BorderRadius,
} from "../Utils/Responsive";
import { generatePaymentMessage } from "../services/UpiService";
import { useUser } from '../contexts/UserContext';
import MonthlyTrendsChart from "../components/MonthlyTrendsChart"; // Assuming you created this component


export default function SummaryScreen() {
  const { refreshCustomers } = useContext(CustomerContext);
  const { t } = ENABLE_I18N
    ? useContext(SimpleLanguageContext)
    : { t: fallbackT };
  const { theme, isDarkMode } = useTheme();
  const { showError, showAlert } = useAlert();

  const [summary, setSummary] = useState([]);
  const [outstandingCustomers, setOutstandingCustomers] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { subscription } = useSubscription();
  const { profile } = useUser();
  

  // Monthly Trends States
  const [monthlyCreditData, setMonthlyCreditData] = useState(Array(12).fill(0));
  const [monthlyPaymentData, setMonthlyPaymentData] = useState(Array(12).fill(0));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const availableYears = [2023, 2024, 2025]; // Example range adjust as needed


  useFocusEffect(
  React.useCallback(() => {
    fetchMonthlyTrends(selectedYear);
  }, [selectedYear, fetchMonthlyTrends])
);
  const translateMetric = (metric) => {
    if (!metric) return "";

    const normalizedMetric = metric.toLowerCase().trim();

    const metricMap = {
      // Your mapping remains unchanged
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
      const [summaryData, customersData] = await Promise.all([
        SQLiteService.getSummary(),
        SQLiteService.getCustomers(),
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
      showError(t("common.error"), t("common.somethingWentWrong"));
    }
    setLoading(false);
  }, [t, theme, showError]);

  const fetchMonthlyTrends = useCallback(async (year) => {
    try {
      const { creditByMonth, paymentByMonth } = await SQLiteService.getMonthlyCreditAndPayments(year);
      setMonthlyCreditData(creditByMonth);
      setMonthlyPaymentData(paymentByMonth);
    } catch (error) {
      console.error("Error fetching monthly trends:", error);
    }
  }, []);

  useEffect(() => {
    fetchMonthlyTrends(selectedYear);
  }, [selectedYear, fetchMonthlyTrends]);

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


  // ✅ Payment Reminder Handler with Custom Alerts
  const handlePaymentReminder = useCallback(async (customer) => {
  const customerName = customer['Customer Name'] || 'Customer';
  const phone = customer['Phone Number'];

  if (!phone) {
    showError(t('common.error'), t('notifications.phoneNotAvailableForCustomer') || 'Phone number not available for this customer');
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
          // Conditionally generate message including UPI link for active subscription and enabled payment link
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
              showError(t('common.error'), t('notifications.whatsappNotInstalled') || 'WhatsApp is not installed');
            }
          } catch (error) {
            showError(t('common.error'), t('notifications.failedToOpenWhatsapp') || 'Failed to open WhatsApp');
          }
        },
      },
      {
        text: t('notifications.sms'),
        style: 'primary',
        onPress: async () => {
          // Same conditional message generation for SMS
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
              showError(t('common.error'), t('notifications.smsNotAvailable') || 'SMS not available on this device');
            }
          } catch (error) {
            showError(t('common.error'), t('notifications.failedToSendSMS') || 'Failed to send SMS');
          }
        },
      },
    ],
  });
}, [showAlert, showError, t, subscription, profile]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["left", "right"]}
    >
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[styles.loaderText, { color: theme.colors.textSecondary }]}
            maxFontSizeMultiplier={1.3}
          >
            {t("summary.loadingSummary")}
          </Text>
        </View>
      ) : (
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
          <MonthlyTrendsChart
            creditData={monthlyCreditData}
            paymentData={monthlyPaymentData}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            availableYears={[2023, 2024, 2025]}
          />
          
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
                <Text
                  style={[styles.cardTitle, { color: theme.colors.text }]}
                  maxFontSizeMultiplier={1.3}
                >
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
                        <Text
                          style={[
                            styles.chartLabel,
                            { color: theme.colors.text },
                          ]}
                          maxFontSizeMultiplier={1.3}
                        >
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
                              {
                                width: barWidth,
                                backgroundColor: item.color,
                              },
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

                      <Text
                        style={[
                          styles.chartAmount,
                          { color: theme.colors.text },
                        ]}
                        maxFontSizeMultiplier={1.3}
                      >
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
                  size={IconSizes.small}
                  color={theme.colors.primary}
                />
              </View>
              <Text
                style={[styles.cardTitle, { color: theme.colors.text }]}
                maxFontSizeMultiplier={1.3}
              >
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
                  } else if (
                    item.Metric?.toLowerCase().includes("customer")
                  ) {
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
                      <Text
                        style={[
                          styles.statValue,
                          { color: theme.colors.text },
                        ]}
                        maxFontSizeMultiplier={1.3}
                      >
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
                <Text
                  style={[styles.cardTitle, { color: theme.colors.text }]}
                  maxFontSizeMultiplier={1.3}
                >
                  {t("summary.topOutstandingCustomers")}
                </Text>
              </View>

              <View style={styles.customersList}>
                {outstandingCustomers.map((customer, index) => (
                  <View
                    key={customer["Customer ID"]}
                    style={[
                      styles.customerCard,
                      index !== outstandingCustomers.length - 1 && [
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
                        style={[
                          styles.customerName,
                          { color: theme.colors.text },
                        ]}
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
                        <Ionicons
                          name="cash"
                          size={IconSizes.small}
                          color="#ef4444"
                        />
                        <Text
                          style={[
                            styles.balanceAmount,
                            { color: "#ef4444" },
                          ]}
                          maxFontSizeMultiplier={1.3}
                        >
                          ₹
                          {(customer["Total Balance"] || 0).toLocaleString()}
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
                      onPress={() => handlePaymentReminder(customer)} // ✅ Use custom alert handler
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
        </ScrollView>
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
    fontSize: FontSizes.xlarge,
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
    fontSize: FontSizes.large,
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
    fontSize: FontSizes.medium,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    lineHeight: 16,
  },
});
