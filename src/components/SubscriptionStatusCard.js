// src/components/SubscriptionStatusCard.js

import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useContext } from "react";
import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { ENABLE_I18N, fallbackT } from "../config/i18nConfig";
import { useSubscription } from "../contexts/SubscriptionContext";
import SubscriptionModal from '../components/SubscriptionModal'; // ✅ Import modal

const SubscriptionStatusCard = () => {
  const { theme, isDarkMode } = useTheme();
  const { t } = ENABLE_I18N ? useContext(SimpleLanguageContext) : { t: fallbackT };
  const { subscription, loading, refreshSubscription } = useSubscription();
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false); // ✅ Add modal state

  // ✅ Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshSubscription();
    setRefreshing(false);
  };

  // ✅ Open modal for subscription
  const handleOpenModal = () => {
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      {/* ✅ Card is NOT clickable - only specific buttons open modal */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: subscription ? theme.colors.primary : theme.colors.border }]}>
        {/* ✅ Refresh Button */}
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Ionicons 
            name={refreshing ? "hourglass-outline" : "refresh"} 
            size={20} 
            color={theme.colors.textSecondary} 
          />
        </TouchableOpacity>

        {!subscription ? (
          // ❌ FREE TIER - Show contact button
          <>
            <View style={styles.header}>
              <Ionicons name="lock-closed" size={24} color={theme.colors.error} />
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {t("subscription.cloudSyncNotActivated") || "Cloud Sync - Not Activated"}
              </Text>
            </View>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {t("subscription.subscribeToActivate") || "Subscribe to activate cloud sync and backup"}
            </Text>
            
            {/* ✅ CONTACT US BUTTON - Opens Modal */}
            <TouchableOpacity 
              style={[styles.contactButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleOpenModal} // ✅ Opens modal
            >
              <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
              <Text style={styles.contactButtonText}>
                {t("subscription.contactToActivate") || "Contact Us to Activate"}
              </Text>
            </TouchableOpacity>
          </>
        ) : subscription.isExpired ? (
          // ⏰ EXPIRED SUBSCRIPTION - Show renew button
          <>
            <View style={styles.header}>
              <Ionicons name="alert-circle" size={24} color={theme.colors.error} />
              <Text style={[styles.title, { color: theme.colors.error }]}>
                {t("subscription.expired") || "Subscription Expired"}
              </Text>
            </View>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {t("subscription.expiredOn") || "Your subscription expired on"}{" "}
              <Text style={{ fontWeight: "600", color: theme.colors.error }}>
                {new Date(subscription.endDate).toDateString()}
              </Text>
            </Text>
            <View style={[styles.expiredBox, { backgroundColor: isDarkMode ? "#541616" : "#fee2e2" }]}>
              <Text style={[styles.expiredText, { color: isDarkMode ? "#fca5a5" : "#7f1d1d" }]}>
                {t("subscription.cloudSyncDisabled") || "❌ Cloud sync is disabled"}
              </Text>
            </View>
            
            {/* ✅ RENEW NOW BUTTON - Opens Modal */}
            <TouchableOpacity 
              style={[styles.renewButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleOpenModal} // ✅ Opens modal
            >
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.renewButtonText}>
                {t("subscription.renewNow") || "Renew Now"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          // ✅ ACTIVE SUBSCRIPTION
          <>
            <View style={styles.header}>
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {subscription.isLifetime ? t("subscription.lifetimePremium") || "♾️ Lifetime Premium" : t("subscription.premiumActive") || "Premium Active"}
              </Text>
            </View>

            <View style={styles.statusContainer}>
              {subscription.isLifetime ? (
                <View style={[styles.lifetimeBox, { backgroundColor: isDarkMode ? "#4c4e2f" : "#fef3c7" }]}>
                  <Ionicons name="star" size={20} color={theme.colors.warning} />
                  <Text style={[styles.lifetimeText, { color: theme.colors.warning }]}>
                    {t("subscription.lifetimeAccess") || "Lifetime access - Never expires"}
                  </Text>
                </View>
              ) : (
                <View style={[styles.expiryBox, { backgroundColor: isDarkMode ? "#1e293b" : "#dbeafe" }]}>
                  <View>
                    <Text style={[styles.expiryLabel, { color: theme.colors.textSecondary }]}>
                      {t("subscription.validUntil") || "Valid until"}
                    </Text>
                    <Text style={[styles.expiryDate, { color: theme.colors.primary }]}>
                      {new Date(subscription.endDate).toDateString()}
                    </Text>
                  </View>
                  <View style={[styles.daysLeftBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.daysLeftText}>{subscription.daysLeft}</Text>
                    <Text style={styles.daysLeftLabel}>{t("subscription.days") || "Days"}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.featuresBox}>
              <View style={styles.featureRow}>
                <Ionicons name="cloud-upload" size={16} color={theme.colors.primary} />
                <Text style={[styles.featureText, { color: theme.colors.primary }]}>
                  {t("subscription.cloudSyncEnabled") || "Cloud sync enabled"}
                </Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="shield-checkmark" size={16} color={theme.colors.primary} />
                <Text style={[styles.featureText, { color: theme.colors.primary }]}>
                  {t("subscription.automaticBackup") || "Automatic backup"}
                </Text>
              </View>
            </View>

            {/* ✅ RENEW SOON BUTTON (if expiring within 30 days) - Opens Modal */}
            {!subscription.isLifetime && subscription.daysLeft <= 30 && (
              <TouchableOpacity 
                style={[styles.renewSoonButton, { borderLeftColor: theme.colors.warning, backgroundColor: isDarkMode ? "#4b453c" : "#fef3c7" }]}
                onPress={handleOpenModal} // ✅ Opens modal
              >
                <Text style={[styles.renewSoonText, { color: theme.colors.warning }]}>
                  {t("subscription.renewSoon") || "⏰ Renew soon to avoid disruption"}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* ✅ Subscription Modal - Only opens when buttons are clicked */}
      <SubscriptionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        currentSubscription={subscription}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 20,
    marginVertical: 8,
    borderWidth: 1,
    position: 'relative',
  },
  refreshButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
    paddingRight: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  
  // ✅ NEW: Contact Button Styles
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginTop: 12,
  },
  contactButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  
  expiredBox: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  expiredText: {
    fontSize: 14,
    fontWeight: "700",
  },
  statusContainer: {
    marginBottom: 16,
  },
  lifetimeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 10,
  },
  lifetimeText: {
    fontSize: 15,
    fontWeight: "600",
  },
  expiryBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
  },
  expiryLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  expiryDate: {
    fontSize: 16,
    fontWeight: "700",
  },
  daysLeftBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 60,
  },
  daysLeftText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#fff",
  },
  daysLeftLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#d1fae5",
    marginTop: 2,
  },
  featuresBox: {
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    fontWeight: "600",
  },
  renewButton: {
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  renewButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  renewSoonButton: {
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 5,
    justifyContent: "flex-start",
  },
  renewSoonText: {
    fontSize: 15,
    fontWeight: "800",
  },
});

export default SubscriptionStatusCard;
