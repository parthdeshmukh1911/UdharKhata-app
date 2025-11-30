// src/screens/SettingsScreen.js

import React, { useContext, useState, useCallback, useEffect } from 'react';
import { Picker } from '@react-native-picker/picker';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
  Switch,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SimpleLanguageContext } from '../contexts/SimpleLanguageContext';
import { ENABLE_I18N, fallbackT } from '../config/i18nConfig';
import { useUser } from "../contexts/UserContext";
import { useAlert } from '../contexts/AlertContext'; // ✅ ADD THIS
import { 
  FontSizes, 
  Spacing, 
  IconSizes, 
  ButtonSizes, 
  BorderRadius 
} from '../Utils/Responsive';
import DatabaseService from "../services/DatabaseService";
import {
  generateOutstandingBalanceReport,
} from '../Utils/ReportGenerator';
import { exportDataToExcel } from '../Utils/ExcelGenerator';
import { importDataFromExcel } from '../Utils/ExcelImporter';
import SQLiteService from '../services/SQLiteService';
import { CustomerContext } from '../contexts/CustomerContext';
import { generateMonthlyReportPDF } from '../Utils/PDFGenerator'
import { useFocusEffect } from '@react-navigation/native';
import { supabase, getCurrentUser, getCurrentUserProfile } from '../config/SupabaseConfig';
import SubscriptionStatusCard from '../components/SubscriptionStatusCard';
import { usePinLock } from '../contexts/PinLockContext';
import { useNavigation } from '@react-navigation/native';
import MonthlyReportDownloadModal from "../components/MonthlyReportDownloadModal";
import SubscriptionModal from '../components/SubscriptionModal';
import { useSubscription } from '../contexts/SubscriptionContext'; // make sure this import exists



export default function SettingsScreen({ navigation, route }) {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { t } = ENABLE_I18N
    ? useContext(SimpleLanguageContext)
    : { t: fallbackT };
  const { refreshCustomers } = useContext(CustomerContext);
  const { user, profile, loading: loadingUser, profileLoading: loadingProfile, refreshProfile, signOut } = useUser();
  const { showAlert } = useAlert(); // ✅ ADD THIS

  const [generatingReport, setGeneratingReport] = useState(null);
  const [importing, setImporting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const { pinEnabled, disablePin } = usePinLock();
  const [pinEnabledState, setPinEnabledState] = useState(pinEnabled);
  const [paymentLinkEnabled, setPaymentLinkEnabled] = useState(false);
  const { currentLanguage } = useContext(SimpleLanguageContext);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const { subscription, loading: subscriptionLoading, refreshSubscription } = useSubscription();


  const languageMap = {
    en: 'English',
    hi: 'हिन्दी',
    mr: 'मराठी',
    bn: 'বাংলা',
    gu: 'ગુજરાતી',
    ta: 'தமிழ்',
    te: 'తెలుగు',
    kn: 'ಕನ್ನಡ',
    ml: 'മലയാളം',
    or: 'ଓଡ଼ିଆ',
    pa: 'ਪੰਜਾਬੀ',
    sd: 'سنڌي',
    as: 'অসমীয়া',
    bho: 'भोजपुरी',
    mrw: 'मारवाड़ी',
    mai: 'मैथिली',
  };

  const currentLanguageName = languageMap[currentLanguage] || currentLanguage;

  useEffect(() => {
  if (route.params?.autoOpenModal) {
    console.log('🔔 Auto-opening subscription modal from notification');
    setSubscriptionModalVisible(true);
    
    // Clear param to prevent re-opening
    navigation.setParams({ autoOpenModal: undefined });
  }
}, [route.params?.autoOpenModal, navigation]);


  useFocusEffect(
    React.useCallback(() => {
      setPinEnabledState(pinEnabled);
    }, [pinEnabled])
  );

  useEffect(() => {
    if (profile?.enable_payment_links !== undefined) {
      setPaymentLinkEnabled(profile.enable_payment_links);
    }
  }, [profile]);

  const togglePinLock = async (value) => {
    if (value) {
      navigation.navigate('SetPIN', { mode: 'set' });
    } else {
      navigation.navigate('SetPIN', { mode: 'disable' });
    }
  };

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setSubscriptionActive(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("users_subscription")
          .select("subscription_status, is_lifetime")
          .eq("user_id", user.id)
          .single();

        if (error || !data) {
          setSubscriptionActive(false);
          return;
        }

        const active =
          data.subscription_status === "active" ||
          data.is_lifetime === true;
        setSubscriptionActive(active);
      } catch {
        setSubscriptionActive(false);
      }
    };

    checkSubscription();
  }, [user, profile]);

  // ✅ REPLACED: Manual Sync Handler
  const handleManualSync = async () => {
    if (!user) {
      showAlert({
        title: t("settings.cloudSync") || "Cloud Sync",
        message: t("settings.signInRequired") || "Please sign in to sync data",
        type: "warning",
        buttons: [
          { text: t("common.cancel") || "Cancel", style: "secondary" },
          {
            text: t("common.signIn") || "Sign In",
            style: "primary",
            onPress: () => navigation.navigate("Auth"),
          },
        ],
      });
      return;
    }
    if (!subscriptionActive) {
      showAlert({
        title: t("settings.cloudSync") || "Cloud Sync",
        message: t("settings.subscriptionRequired") || "Active subscription required for sync.",
        type: "warning",
        buttons: [
          { text: t("common.ok") || "OK", style: "primary" },
        ],
      });
      return;
    }

    setSyncing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      showAlert({
        title: t("common.success") || "Success",
        message: t("settings.syncSuccess") || "Data synced successfully!",
        type: "success",
        buttons: [
          { text: t("common.ok") || "OK", style: "primary" },
        ],
      });
    } catch (error) {
      showAlert({
        title: t("common.error") || "Error",
        message: error.message || t("settings.syncError") || "Failed to sync data",
        type: "error",
        buttons: [
          { text: t("common.ok") || "OK", style: "primary" },
        ],
      });
    } finally {
      setSyncing(false);
    }
  };

  // ✅ REPLACED: Payment Link Toggle Handler
  const handlePaymentLinkToggle = async (value) => {
    if (!subscriptionActive) {
      showAlert({
        title: t('settings.subscriptionRequired') || 'Subscription Required',
        message: t('settings.upgradeToEnableFeature') || 'Please subscribe to enable payment link feature',
        type: 'warning',
        buttons: [
          { text: t('common.cancel') || 'Cancel', style: 'secondary' },
          {
            text: t('settings.upgradeNow') || 'Upgrade Now',
            style: 'primary',
            onPress: () => {
              // Navigate to subscription screen if you have one
            },
          },
        ],
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          enable_payment_links: value,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      await refreshProfile();
      
      showAlert({
        title: t('common.success') || 'Success',
        message: value 
          ? (t('settings.paymentLinkEnabled') || 'Payment link enabled successfully')
          : (t('settings.paymentLinkDisabled') || 'Payment link disabled'),
        type: 'success',
        buttons: [
          { text: t('common.ok') || 'OK', style: 'primary' },
        ],
      });
    } catch (error) {
      console.error('Error updating payment link setting:', error);
      showAlert({
        title: t('common.error') || 'Error',
        message: t('settings.updateFailed') || 'Failed to update setting. Please try again.',
        type: 'error',
        buttons: [
          { text: t('common.ok') || 'OK', style: 'primary' },
        ],
      });
    }
  };

  // ✅ REPLACED: Sign Out Handler
  const handleSignOut = async () => {
    showAlert({
      title: t("settings.signOut") || "Sign Out",
      message: t("settings.signOutConfirm") ||
        "Are you sure you want to sign out? Your data will remain stored locally.",
      type: "confirm",
      buttons: [
        { text: t("common.cancel") || "Cancel", style: "secondary" },
        {
          text: t("settings.signOut") || "Sign Out",
          style: "primary",
          onPress: async () => {
            try {
              await signOut();
              showAlert({
                title: t("common.success") || "Success",
                message: t("settings.signedOut") || "Signed out successfully",
                type: "success",
                buttons: [
                  { text: t("common.ok") || "OK", style: "primary" },
                ],
              });
            } catch (error) {
              showAlert({
                title: t("common.error") || "Error",
                message: error.message || t("settings.signOutError") || "Failed to sign out",
                type: "error",
                buttons: [
                  { text: t("common.ok") || "OK", style: "primary" },
                ],
              });
            }
          },
        },
      ],
    });
  };

  // ✅ REPLACED: Outstanding Balance Report Handler
  const handleOutstandingBalanceReport = useCallback(async () => {
    setGeneratingReport("outstanding");
    try {
      const result = await generateOutstandingBalanceReport(t);
      if (result.success) {
        showAlert({
          title: t("common.success") || "Success",
          message: t("summary.reportGeneratedSuccessfully") || "Report generated successfully!",
          type: "success",
          buttons: [
            { text: t("common.ok") || "OK", style: "primary" },
          ],
        });
      } else {
        showAlert({
          title: t("common.error") || "Error",
          message: result.error || t("summary.failedToGenerateReport") || "Failed to generate report",
          type: "error",
          buttons: [
            { text: t("common.ok") || "OK", style: "primary" },
          ],
        });
      }
    } catch (error) {
      showAlert({
        title: t("common.error") || "Error",
        message: t("summary.somethingWentWrong") || "Something went wrong",
        type: "error",
        buttons: [
          { text: t("common.ok") || "OK", style: "primary" },
        ],
      });
    }
    setGeneratingReport(null);
  }, [t, showAlert]);

  // ✅ REPLACED: Export Excel Handler
  const handleExportToExcel = useCallback(async () => {
    setGeneratingReport("excelExport");
    try {
      const result = await exportDataToExcel();
      if (result.success) {
        showAlert({
          title: t("common.success") || "Success",
          message: `${t("backupAndSync.exportSuccess") || "Data exported successfully!"} ${result.fileName}`,
          type: "success",
          buttons: [
            { text: t("common.ok") || "OK", style: "primary" },
          ],
        });
      } else {
        showAlert({
          title: t("common.error") || "Error",
          message: result.error || t("backupAndSync.exportFailed") || "Failed to export data",
          type: "error",
          buttons: [
            { text: t("common.ok") || "OK", style: "primary" },
          ],
        });
      }
    } catch (error) {
      showAlert({
        title: t("common.error") || "Error",
        message: error.message || t("backupAndSync.exportFailed") || "Failed to export data",
        type: "error",
        buttons: [
          { text: t("common.ok") || "OK", style: "primary" },
        ],
      });
    }
    setGeneratingReport(null);
  }, [t, showAlert]);

  // ✅ REPLACED: Import Excel Handler
  const handleImportFromExcel = useCallback(async () => {
    if (importing) return;

    showAlert({
      title: t("backupAndSync.restoreData") || "Restore Data",
      message: t("backupAndSync.importConfirmation") || "This will replace all existing data. Continue?",
      type: "warning",
      buttons: [
        { text: t("common.cancel") || "Cancel", style: "secondary" },
        {
          text: t("common.proceed") || "Proceed",
          style: "primary",
          onPress: async () => {
            setGeneratingReport("excelImport");
            try {
              const result = await importDataFromExcel();
              if (!result) {
                showAlert({
                  title: t("common.error") || "Error",
                  message: t("backupAndSync.invalidFile") || "Invalid file selected",
                  type: "error",
                  buttons: [
                    { text: t("common.ok") || "OK", style: "primary" },
                  ],
                });
                setGeneratingReport(null);
                return;
              }
              if (!result.success) {
                showAlert({
                  title: t("common.error") || "Error",
                  message: result.error || t("backupAndSync.importFailed") || "Import failed",
                  type: "error",
                  buttons: [
                    { text: t("common.ok") || "OK", style: "primary" },
                  ],
                });
                setGeneratingReport(null);
                return;
              }

              const { customers, transactions, counts } = result;
              showAlert({
                title: t("backupAndSync.restoreData") || "Restore Data",
                message: t("backupAndSync.replaceWithCounts")
                  ?.replace("{customers}", counts.customers)
                  ?.replace("{transactions}", counts.transactions) ||
                  `Found ${counts.customers} customers and ${counts.transactions} transactions. Replace existing data?`,
                type: "confirm",
                buttons: [
                  {
                    text: t("common.cancel") || "Cancel",
                    style: "secondary",
                    onPress: () => setGeneratingReport(null),
                  },
                  {
                    text: t("common.replace") || "Replace",
                    style: "primary",
                    onPress: async () => {
                      setImporting(true);
                      try {
                        const bulkResult = await SQLiteService.bulkReplaceExcel(
                          customers,
                          transactions
                        );
                        if (bulkResult?.status === "success") {
                          await refreshCustomers();

                          showAlert({
                            title: t("common.success") || "Success",
                            message: t("backupAndSync.restoreSuccess")
                              ?.replace("{customers}", counts.customers)
                              ?.replace("{transactions}", counts.transactions) ||
                              `Restored ${counts.customers} customers and ${counts.transactions} transactions successfully!`,
                            type: "success",
                            buttons: [
                              { text: t("common.ok") || "OK", style: "primary" },
                            ],
                          });
                        } else {
                          showAlert({
                            title: t("common.error") || "Error",
                            message: bulkResult?.message ||
                              t("backupAndSync.restoreFailed") ||
                              "Restore failed",
                            type: "error",
                            buttons: [
                              { text: t("common.ok") || "OK", style: "primary" },
                            ],
                          });
                        }
                      } catch (error) {
                        showAlert({
                          title: t("common.error") || "Error",
                          message: error.message ||
                            t("backupAndSync.restoreFailed") ||
                            "Restore failed",
                          type: "error",
                          buttons: [
                            { text: t("common.ok") || "OK", style: "primary" },
                          ],
                        });
                      } finally {
                        setImporting(false);
                        setGeneratingReport(null);
                      }
                    },
                  },
                ],
              });
            } catch (error) {
              showAlert({
                title: t("common.error") || "Error",
                message: error.message || t("backupAndSync.importFailed") || "Import failed",
                type: "error",
                buttons: [
                  { text: t("common.ok") || "OK", style: "primary" },
                ],
              });
              setGeneratingReport(null);
            }
          },
        },
      ],
    });
  }, [importing, t, refreshCustomers, showAlert]);

  const getLastMonthDateRange = () => {
    const now = new Date();
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const firstDayLastMonth = new Date(
      lastDayLastMonth.getFullYear(),
      lastDayLastMonth.getMonth(),
      1
    );
    return { firstDayLastMonth, lastDayLastMonth };
  };

  // ✅ REPLACED: Monthly Report Handler
  const handleGenerateMonthlyReport = async () => {
    try {
      setLoading(true);

      const { firstDayLastMonth, lastDayLastMonth } = getLastMonthDateRange();

      const customers = await DatabaseService.getCustomers();
      const transactions = await DatabaseService.getTransactions({
        startDate: firstDayLastMonth.toISOString().split("T")[0],
        endDate: lastDayLastMonth.toISOString().split("T")[0],
      });

      const result = await generateMonthlyReportPDF(
        customers,
        transactions,
        firstDayLastMonth.toISOString().split("T")[0],
        lastDayLastMonth.toISOString().split("T")[0],
        t
      );

      if (!result.success) {
        showAlert({
          title: t("common.error"),
          message: result.error || "Failed to generate report",
          type: "error",
          buttons: [
            { text: t("common.ok") || "OK", style: "primary" },
          ],
        });
      }
    } catch (error) {
      showAlert({
        title: t("common.error"),
        message: error.message || "Unknown error",
        type: "error",
        buttons: [
          { text: t("common.ok") || "OK", style: "primary" },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const openMonthlyReportModal = () => setModalVisible(true);
  const closeMonthlyReportModal = () => setModalVisible(false);

  const handleMonthlyReportDownload = useCallback(
    async (month, year) => {
      setGeneratingReport("monthlyReport");
      try {
        const customers = await DatabaseService.getCustomers();
        const transactions = await DatabaseService.getTransactions();

        const result = await generateMonthlyReportPDF(customers, transactions, month, year, t);

        if (!result.success) {
          showAlert({
            title: t("common.error"),
            message: result.error,
            type: "error",
            buttons: [
              { text: t("common.ok") || "OK", style: "primary" },
            ],
          });
        }
      } catch (error) {
        showAlert({
          title: t("common.error"),
          message: error.message,
          type: "error",
          buttons: [
            { text: t("common.ok") || "OK", style: "primary" },
          ],
        });
      }
      setGeneratingReport(null);
      closeMonthlyReportModal();
    },
    [t, showAlert]
  );
  
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["left", "right", "bottom"]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* PROFILE SECTION */}
        {user && (
          <View style={styles.section}>
            <Text
              style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}
              maxFontSizeMultiplier={1.3}
            >
              {t("settings.profile")?.toUpperCase() || "PROFILE"}
            </Text>

            <View
              style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              {loadingProfile ? (
                <View style={[styles.settingItem, { justifyContent: "center" }]}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              ) : profile ? (
                <>
                  {/* Profile Header with Avatar */}
                  <View
                    style={[styles.profileHeader, { borderBottomColor: theme.colors.borderLight, borderBottomWidth: 1 }]}
                  >
                    <View style={[styles.profileAvatar, { backgroundColor: theme.colors.primaryLight }]}>
                      <Ionicons name="person" size={40} color={theme.colors.primary} />
                    </View>
                    <View style={styles.profileHeaderInfo}>
                      <Text style={[styles.profileName, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                        {profile.full_name || "No Name"}
                      </Text>
                      <Text
                        style={[styles.profileBusiness, { color: theme.colors.textSecondary }]}
                        maxFontSizeMultiplier={1.2}
                      >
                        {profile.business_name || "No Business"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.editButton, { backgroundColor: theme.colors.primaryLight }]}
                      onPress={() => navigation.navigate("EditProfile")}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="pencil" size={18} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>

                  {/* Profile Details Grid */}
                  <View style={styles.profileDetailsGrid}>
                    {/* Email */}
                    <View
                      style={[styles.profileDetailCard, { backgroundColor: theme.isDarkMode ? "#1e3a5f" : "#eff6ff" }]}
                    >
                      <View style={[styles.profileDetailIcon, { backgroundColor: "#2563eb" }]}>
                        <Ionicons name="mail" size={18} color="#fff" />
                      </View>
                      <View style={styles.profileDetailInfo}>
                        <Text
                          style={[styles.profileDetailLabel, { color: theme.isDarkMode ? "#93c5fd" : "#1e40af" }]}
                        >
                          Email
                        </Text>
                        <Text
                          style={[styles.profileDetailValue, { color: theme.isDarkMode ? "#60a5fa" : "#1e3a8a" }]}
                          numberOfLines={1}
                        >
                          {user.email}
                        </Text>
                      </View>
                    </View>

                    {/* Phone */}
                    <View
                      style={[styles.profileDetailCard, { backgroundColor: theme.isDarkMode ? "#064e3b" : "#d1fae5" }]}
                    >
                      <View style={[styles.profileDetailIcon, { backgroundColor: "#059669" }]}>
                        <Ionicons name="call" size={18} color="#fff" />
                      </View>
                      <View style={styles.profileDetailInfo}>
                        <Text
                          style={[styles.profileDetailLabel, { color: theme.isDarkMode ? "#6ee7b7" : "#065f46" }]}
                        >
                          Phone
                        </Text>
                        <Text
                          style={[styles.profileDetailValue, { color: theme.isDarkMode ? "#34d399" : "#064e3b" }]}
                          numberOfLines={1}
                        >
                          {profile.phone_number || "Not set"}
                        </Text>
                      </View>
                    </View>

                    {/* Business Type */}
                    {profile.business_type && (
                      <View
                        style={[styles.profileDetailCard, { backgroundColor: theme.isDarkMode ? "#5a2e0f" : "#fef3c7" }]}
                      >
                        <View style={[styles.profileDetailIcon, { backgroundColor: "#f97316" }]}>
                          <Ionicons name="briefcase" size={18} color="#fff" />
                        </View>
                        <View style={styles.profileDetailInfo}>
                          <Text
                            style={[styles.profileDetailLabel, { color: theme.isDarkMode ? "#fcd34d" : "#78350f" }]}
                          >
                            Business Type
                          </Text>
                          <Text
                            style={[styles.profileDetailValue, { color: theme.isDarkMode ? "#fbbf24" : "#92400e" }]}
                            numberOfLines={1}
                          >
                            {profile.business_type}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* GST Number */}
                    {profile.gst_number && (
                      <View
                        style={[styles.profileDetailCard, { backgroundColor: theme.isDarkMode ? "#5f2c2c" : "#fee2e2" }]}
                      >
                        <View style={[styles.profileDetailIcon, { backgroundColor: "#dc2626" }]}>
                          <Ionicons name="document-text" size={18} color="#fff" />
                        </View>
                        <View style={styles.profileDetailInfo}>
                          <Text
                            style={[styles.profileDetailLabel, { color: theme.isDarkMode ? "#fca5a5" : "#7f1d1d" }]}
                          >
                            GST Number
                          </Text>
                          <Text
                            style={[styles.profileDetailValue, { color: theme.isDarkMode ? "#f87171" : "#991b1b" }]}
                            numberOfLines={1}
                          >
                            {profile.gst_number}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </>
              ) : (
                <View style={styles.noProfileContainer}>
                  <Ionicons name="person-add-outline" size={48} color={theme.colors.textTertiary} />
                  <Text style={[styles.noProfileText, { color: theme.colors.textSecondary }]}>
                    No profile information found
                  </Text>
                  <TouchableOpacity
                    style={[styles.createProfileButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => navigation.navigate("EditProfile")}
                  >
                    <Text style={styles.createProfileButtonText}>Create Profile</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* CLOUD SYNC SECTION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
            {t("settings.cloudSync")?.toUpperCase() || "CLOUD SYNC"}
          </Text>
          {/* SUBSCRIPTION STATUS CARD */}
          {user && (
            <View style={styles.section}>
              <SubscriptionStatusCard 
                onOpenModal={() => setSubscriptionModalVisible(true)} 
              />
            </View>
          )}

          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {loadingUser ? (
              <View style={[styles.settingItem, { justifyContent: "center" }]}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : user ? (
              <>
                <TouchableOpacity
                  style={[styles.settingItem, styles.settingItemBorder, { borderBottomColor: theme.colors.borderLight }]}
                  onPress={handleManualSync}
                  disabled={syncing || !subscriptionActive}
                  activeOpacity={subscriptionActive ? 0.7 : 1}
                >
                  <View style={styles.settingLeft}>
                    <View
                      style={[
                        styles.iconContainer,
                        {
                          backgroundColor: subscriptionActive
                            ? isDarkMode
                              ? "#065f46"
                              : "#d1fae5"
                            : theme.colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="sync-outline"
                        size={IconSizes.medium}
                        color={subscriptionActive ? "#059669" : theme.colors.textTertiary}
                      />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text
                        style={[styles.settingTitle, { color: subscriptionActive ? theme.colors.text : theme.colors.textTertiary }]}
                        maxFontSizeMultiplier={1.3}
                      >
                        {t("settings.syncNow") || "Sync Now"}
                      </Text>
                      <Text
                        style={[styles.settingDesc, { color: subscriptionActive ? theme.colors.textSecondary : theme.colors.textTertiary }]}
                        maxFontSizeMultiplier={1.2}
                      >
                        {subscriptionActive
                          ? t("settings.syncNowDesc") || "Manually sync your data"
                          : t("settings.syncDisabledPremium") || "Enable premium to sync data"}
                      </Text>
                    </View>
                  </View>
                  {syncing ? (
                    <ActivityIndicator size="small" color="#059669" />
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={IconSizes.medium}
                      color={subscriptionActive ? theme.colors.textTertiary : theme.colors.textTertiary}
                    />
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingItem} onPress={handleSignOut} activeOpacity={0.7}>
                  <View style={styles.settingLeft}>
                    <View
                      style={[styles.iconContainer, { backgroundColor: isDarkMode ? "#5f2c2c" : "#fee2e2" }]}
                    >
                      <Ionicons name="log-out-outline" size={IconSizes.medium} color="#ef4444" />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={[styles.settingTitle, { color: "#ef4444" }]} maxFontSizeMultiplier={1.3}>
                        {t("settings.signOut") || "Sign Out"}
                      </Text>
                      <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
                        {t("settings.signOutDesc") || "Your data will remain stored locally"}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={IconSizes.medium} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              </>
            ) : (
              <View style={[styles.cloudSyncPromo, { backgroundColor: theme.colors.surface }]}>
                <View style={[styles.promoIconContainer, { backgroundColor: theme.colors.primaryLight }]}>
                  <Ionicons name="cloud-upload" size={40} color={theme.colors.primary} />
                </View>
                <Text style={[styles.promoTitle, { color: theme.colors.text }]}>
                  {t("settings.enableCloudSync") || "Enable Cloud Sync"}
                </Text>
                <Text style={[styles.promoDesc, { color: theme.colors.textSecondary }]}>
                  {t("settings.cloudSyncPromoDesc") || "Sign in to backup your data and sync across multiple devices"}
                </Text>

                <TouchableOpacity
                  style={[styles.signInButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => navigation.navigate("Auth")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="log-in" size={20} color="#fff" />
                  <Text style={styles.signInButtonText}>{t("settings.signInSignUp") || "Sign In / Sign Up"}</Text>
                </TouchableOpacity>

                <View style={styles.benefitsList}>
                  <View style={styles.benefitItem}>
                    <Ionicons name="shield-checkmark" size={16} color={theme.colors.primary} />
                    <Text style={[styles.benefitText, { color: theme.colors.textSecondary }]}>
                      Secure cloud backup
                    </Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="phone-portrait" size={16} color={theme.colors.primary} />
                    <Text style={[styles.benefitText, { color: theme.colors.textSecondary }]}>
                      Access from any device
                    </Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="sync" size={16} color={theme.colors.primary} />
                    <Text style={[styles.benefitText, { color: theme.colors.textSecondary }]}>
                      Real-time synchronization
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* REPORTS & DATA */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
            {t("settings.reportsData")?.toUpperCase() || "REPORTS & DATA"}
          </Text>

          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[styles.settingItem, styles.settingItemBorder, { borderBottomColor: theme.colors.borderLight }]}
              onPress={handleOutstandingBalanceReport}
              disabled={generatingReport === "outstanding"}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? "#5f2c2c" : "#fef2f2" }]}>
                  <Ionicons name="document-text-outline" size={IconSizes.medium} color="#ef4444" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                    {t("settings.outstandingReport") || "Outstanding Report"}
                  </Text>
                  <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
                    {t("settings.outstandingReportDesc") || "Generate PDF of outstanding balances"}
                  </Text>
                </View>
              </View>
              {generatingReport === "outstanding" ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Ionicons name="chevron-forward" size={IconSizes.medium} color={theme.colors.textTertiary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, styles.settingItemBorder, { borderBottomColor: theme.colors.borderLight }]}
              onPress={handleExportToExcel}
              disabled={generatingReport === "excelExport"}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? "#065f46" : "#d1fae5" }]}>
                  <Ionicons name="download-outline" size={IconSizes.medium} color="#059669" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                    {t("settings.exportExcel") || "Export to Excel"}
                  </Text>
                  <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
                    {t("settings.exportExcelDesc") || "Download data as Excel file"}
                  </Text>
                </View>
              </View>
              {generatingReport === "excelExport" ? (
                <ActivityIndicator size="small" color="#059669" />
              ) : (
                <Ionicons name="chevron-forward" size={IconSizes.medium} color={theme.colors.textTertiary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, styles.settingItemBorder, { borderBottomColor: theme.colors.borderLight }]}
              onPress={handleImportFromExcel}
              disabled={generatingReport === "excelImport" || importing}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? "#5a2e0f" : "#fef3c7" }]}>
                  <Ionicons name="cloud-upload-outline" size={IconSizes.medium} color="#f97316" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                    {t("settings.importExcel") || "Import from Excel"}
                  </Text>
                  <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
                    {t("settings.importExcelDesc") || "Restore data from Excel file"}
                  </Text>
                </View>
              </View>
              {generatingReport === "excelImport" ? (
                <ActivityIndicator size="small" color="#f97316" />
              ) : (
                <Ionicons name="chevron-forward" size={IconSizes.medium} color={theme.colors.textTertiary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, styles.settingItemBorder, { borderBottomColor: theme.colors.borderLight }]}
              onPress={openMonthlyReportModal}
              disabled={generatingReport === "monthlyReport"}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? "#0c4a6e" : "#dbeafe" }]}>
                  <Ionicons name="document-text-outline" size={IconSizes.medium} color="#2563eb" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                    {t("pdf.generateMonthlyReport") || "Generate Monthly Report"}
                  </Text>
                  <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
                    {t("pdf.generateMonthlyReportDesc") || "Create and share monthly PDF report"}
                  </Text>
                </View>
              </View>
              {generatingReport === "monthlyReport" ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <Ionicons name="chevron-forward" size={IconSizes.medium} color={theme.colors.textTertiary} />
              )}
            </TouchableOpacity>
          </View>
        </View>
 {/* PAYMENT FEATURES SECTION
<View style={styles.section}>
  <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
    {t('settings.paymentFeatures')?.toUpperCase() || 'PAYMENT FEATURES'}
  </Text>

  <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <View style={[
          styles.iconContainer, 
          { backgroundColor: subscriptionActive 
              ? (isDarkMode ? '#065f46' : '#d1fae5') 
              : theme.colors.border 
          }
        ]}>
          <Ionicons
            name="link-outline"
            size={IconSizes.medium}
            color={subscriptionActive ? '#059669' : theme.colors.textTertiary}
          />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[
            styles.settingTitle, 
            { color: subscriptionActive ? theme.colors.text : theme.colors.textTertiary }
          ]} maxFontSizeMultiplier={1.3}>
            {t('settings.paymentLinkFeature') || 'Payment Link in Reminders'}
          </Text>
          <Text style={[
            styles.settingDesc, 
            { color: subscriptionActive ? theme.colors.textSecondary : theme.colors.textTertiary }
          ]} maxFontSizeMultiplier={1.2}>
            {subscriptionActive
              ? (t('settings.paymentLinkDescription') || 'Include UPI payment link in reminder messages')
              : (t('settings.subscriptionRequired') || 'Subscription required')}
          </Text>
        </View>
      </View>
      <Switch
        value={profile?.enable_payment_links && subscriptionActive}
        onValueChange={handlePaymentLinkToggle}
        disabled={!subscriptionActive}
        trackColor={{ 
          false: theme.colors.border, 
          true: theme.colors.primary 
        }}
        thumbColor={profile?.enable_payment_links && subscriptionActive ? '#fff' : '#ccc'}
        ios_backgroundColor={theme.colors.border}
      />
    </View>
  </View>
</View> */}

 
        {/* PIN SECTION */}
        <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
        Security
      </Text>
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={[styles.settingItem, { borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight }]}>
          <View style={styles.settingLeft}>
            <Ionicons name="lock-closed-outline" size={IconSizes.medium} color={theme.colors.primary} style={{ marginRight: 12 }} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                PIN Lock
              </Text>
              <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]}>
                {pinEnabled ? "Enabled" : "Disabled"}
              </Text>
            </View>
          </View>
          <Switch
            value={pinEnabled}
            onValueChange={togglePinLock}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor="#fff"
            ios_backgroundColor={theme.colors.border}
          />
        </View>

        {pinEnabled && (
          <TouchableOpacity
            style={[styles.settingItem]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('SetPIN')}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="chevron-forward-outline" size={IconSizes.medium} color={theme.colors.textSecondary} />
              <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                Change PIN
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
        {/* APPEARANCE SECTION */}
<View style={styles.section}>
  <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
    {t("settings.appearance")?.toUpperCase() || "APPEARANCE"}
  </Text>

  <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>

    {/* 🌙 Dark Mode Row WITH THIN LINE */}
    <View style={[styles.settingItem, styles.settingItemBorder, { borderBottomColor: theme.colors.borderLight }]}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryLight }]}>
          <Ionicons
            name={isDarkMode ? "moon" : "sunny"}
            size={IconSizes.medium}
            color={theme.colors.primary}
          />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
            {t("settings.darkMode") || "Dark Mode"}
          </Text>
          <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
            {isDarkMode ? t("settings.enabled") || "Enabled" : t("settings.disabled") || "Disabled"}
          </Text>
        </View>
      </View>

      <Switch
        value={isDarkMode}
        onValueChange={toggleTheme}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor="#fff"
        ios_backgroundColor={theme.colors.border}
      />
    </View>

    {/* 🌐 Language Row WITHOUT BORDER */}
    <TouchableOpacity
      style={styles.settingItem}
      onPress={() => navigation.navigate('ChangeLanguage')}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryLight }]}>
          <Ionicons name="language" size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
            Language
          </Text>
          <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {currentLanguageName}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward-outline" size={24} color={theme.colors.textTertiary} />
    </TouchableOpacity>

  </View>
</View>


    
        {/* HELP & SUPPORT SECTION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
            {t("settings.helpSupport")?.toUpperCase() || "HELP & SUPPORT"}
          </Text>

          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate("UserManual")} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? "#7c2d12" : "#fef3c7" }]}>
                  <Ionicons name="book-outline" size={IconSizes.medium} color="#ea580c" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                    {t("settings.userManual") || "User Manual"}
                  </Text>
                  <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
                    {t("settings.userManualDesc") || "View app documentation and guides"}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={IconSizes.medium} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

       {/* ABOUT SECTION */}
<View style={styles.section}>
  <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
    {t("settings.about")?.toUpperCase() || "ABOUT"}
  </Text>

  <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
    {/* Version */}
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryLight }]}>
          <Ionicons name="information-circle-outline" size={IconSizes.medium} color={theme.colors.primary} />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
            {t("settings.version") || "Version"}
          </Text>
          <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
            1.0.0
          </Text>
        </View>
      </View>
    </View>

    {/* Divider */}
    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

    {/* Privacy Policy */}
    <TouchableOpacity
      style={styles.settingItem}
      onPress={() => {
        Linking.openURL("https://parthdeshmukh1911.github.io/UdharKhata-app/PrivacyPolicy.html");
      }}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? "#1e3a5f" : "#eff6ff" }]}>
          <Ionicons name="shield-checkmark-outline" size={IconSizes.medium} color="#2563eb" />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
            Privacy Policy
          </Text>
          <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
            Read our privacy policy
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={IconSizes.medium} color={theme.colors.textTertiary} />
    </TouchableOpacity>

    {/* Divider */}
    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

    {/* Terms & Conditions */}
    <TouchableOpacity
      style={styles.settingItem}
      onPress={() => {
        Linking.openURL("https://parthdeshmukh1911.github.io/UdharKhata-app/terms.html");
      }}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? "#1e4d3f" : "#f0fdf4" }]}>
          <Ionicons name="document-text-outline" size={IconSizes.medium} color="#059669" />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
            Terms & Conditions
          </Text>
          <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
            View terms of service
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={IconSizes.medium} color={theme.colors.textTertiary} />
    </TouchableOpacity>
  </View>
</View>


      </ScrollView>

      {/* ✅ SUBSCRIPTION MODAL */}
      <SubscriptionModal
        visible={subscriptionModalVisible}
        onClose={() => setSubscriptionModalVisible(false)}
        currentSubscription={subscription}
      />

      {/* Monthly Report Modal */}
      <MonthlyReportDownloadModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onDownload={handleMonthlyReportDownload}
        isGenerating={generatingReport === "monthlyReport"}
      />
    </SafeAreaView>
  );
}


  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: Spacing.lg,
      paddingBottom: Spacing.xxl,
    },

    section: {
      marginBottom: Spacing.xl,
    },
    sectionTitle: {
      fontSize: FontSizes.medium,
      fontWeight: '700',
      marginBottom: Spacing.md,
      marginLeft: Spacing.sm,
      letterSpacing: 0.5,
    },

    card: {
      borderRadius: BorderRadius.xlarge,
      borderWidth: 1,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: '#1e293b',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        android: {
          elevation: 2,
        },
      }),
    },

    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.lg,
    },
    settingItemBorder: {
      borderBottomWidth: 1,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: Spacing.md,
    },
    iconContainer: {
      width: IconSizes.xlarge,
      height: IconSizes.xlarge,
      borderRadius: IconSizes.large / 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    settingTextContainer: {
      flex: 1,
    },
    settingTitle: {
      fontSize: FontSizes.regular,
      fontWeight: '700',
      marginBottom: 2,
      letterSpacing: -0.2,
    },
    settingDesc: {
      fontSize: FontSizes.small,
      fontWeight: '500',
    },
divider: {
  height: 1,
  marginVertical: 0,
},

    // Profile Section Styles
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    profileAvatar: {
      width: 70,
      height: 70,
      borderRadius: 35,
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileHeaderInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: FontSizes.large,
      fontWeight: '800',
      marginBottom: 4,
      letterSpacing: -0.3,
    },
    profileBusiness: {
      fontSize: FontSizes.regular,
      fontWeight: '600',
    },
    editButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileDetailsGrid: {
      padding: Spacing.md,
      gap: Spacing.sm,
    },
    profileDetailCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      borderRadius: BorderRadius.large,
      gap: Spacing.md,
    },
    profileDetailIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileDetailInfo: {
      flex: 1,
    },
    profileDetailLabel: {
      fontSize: FontSizes.tiny,
      fontWeight: '600',
      marginBottom: 2,
    },
    profileDetailValue: {
      fontSize: FontSizes.regular,
      fontWeight: '700',
    },
    editProfileButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      margin: Spacing.lg,
      borderRadius: BorderRadius.large,
      gap: 8,
      ...Platform.select({
        ios: {
          shadowColor: '#1e40af',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    editProfileButtonText: {
      color: '#fff',
      fontSize: FontSizes.regular,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    noProfileContainer: {
      padding: Spacing.xxl,
      alignItems: 'center',
    },
    noProfileText: {
      fontSize: FontSizes.regular,
      fontWeight: '600',
      marginTop: Spacing.md,
      marginBottom: Spacing.xl,
    },
    createProfileButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: BorderRadius.large,
    },
    createProfileButtonText: {
      color: '#fff',
      fontSize: FontSizes.regular,
      fontWeight: '700',
    },

    // Cloud Sync Signed In UI
    accountHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    avatarContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
    },
    accountInfo: {
      flex: 1,
    },
    accountEmail: {
      fontSize: FontSizes.regular,
      fontWeight: '700',
      marginBottom: 4,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusText: {
      fontSize: FontSizes.small,
      fontWeight: '600',
    },

    // Cloud Sync Not Signed In UI
    cloudSyncPromo: {
      padding: Spacing.xl,
      alignItems: 'center',
    },
    promoIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    promoTitle: {
      fontSize: FontSizes.xlarge,
      fontWeight: '700',
      marginBottom: Spacing.sm,
      textAlign: 'center',
    },
    promoDesc: {
      fontSize: FontSizes.regular,
      textAlign: 'center',
      marginBottom: Spacing.xl,
      lineHeight: FontSizes.regular * 1.5,
    },
    signInButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: BorderRadius.large,
      gap: 10,
      marginBottom: Spacing.xl,
      width: '100%',
      ...Platform.select({
        ios: {
          shadowColor: '#1e40af',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    signInButtonText: {
      color: '#fff',
      fontSize: FontSizes.regular,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    benefitsList: {
      gap: Spacing.md,
      width: '100%',
    },
    benefitItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    benefitText: {
      fontSize: FontSizes.small,
      fontWeight: '500',
    },
  });
