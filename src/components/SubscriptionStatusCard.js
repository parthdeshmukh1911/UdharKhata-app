import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useContext } from "react";
import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { ENABLE_I18N, fallbackT } from "../config/i18nConfig";
import { useSubscription } from "../contexts/SubscriptionContext";

const SubscriptionStatusCard = () => {
  const { theme, isDarkMode } = useTheme();
  const { t } = ENABLE_I18N ? useContext(SimpleLanguageContext) : { t: fallbackT };

  const { subscription, loading } = useSubscription();

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!subscription) {
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.header}>
          <Ionicons name="lock-closed" size={24} color={theme.colors.error} />
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t("subscription.cloudSyncNotActivated") || "Cloud Sync - Not Activated"}
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {t("subscription.subscribeToActivate") || "Subscribe to activate cloud sync and backup"}
        </Text>
        <View style={[styles.infoBox, { borderLeftColor: theme.colors.warning, backgroundColor: isDarkMode ? "#4b453c" : "#fef3c7" }]}>
          <Text style={[styles.infoText, { color: isDarkMode ? "#d6bc98" : "#92400e" }]}>
            {t("subscription.contactToActivate") || "📞 Contact us to activate subscription"}
          </Text>
        </View>
      </View>
    );
  }

  if (subscription.isExpired) {
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.error }]}>
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
        <TouchableOpacity style={[styles.renewButton, { backgroundColor: theme.colors.primary }]}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.renewButtonText}>{t("subscription.renewNow") || "Renew Now"}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }]}>
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
            <Text style={[styles.lifetimeText, { color: theme.colors.warning }]}>{t("subscription.lifetimeAccess") || "Lifetime access - Never expires"}</Text>
          </View>
        ) : (
          <View style={[styles.expiryBox, { backgroundColor: isDarkMode ? "#1e293b" : "#dbeafe" }]}>
            <View>
              <Text style={[styles.expiryLabel, { color: theme.colors.textSecondary }]}>{t("subscription.validUntil") || "Valid until"}</Text>
              <Text style={[styles.expiryDate, { color: theme.colors.primary }]}>{new Date(subscription.endDate).toDateString()}</Text>
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
          <Text style={[styles.featureText, { color: theme.colors.primary }]}>{t("subscription.cloudSyncEnabled") || "Cloud sync enabled"}</Text>
        </View>
        <View style={styles.featureRow}>
          <Ionicons name="shield-checkmark" size={16} color={theme.colors.primary} />
          <Text style={[styles.featureText, { color: theme.colors.primary }]}>{t("subscription.automaticBackup") || "Automatic backup"}</Text>
        </View>
      </View>

      {!subscription.isLifetime && subscription.daysLeft <= 30 && (
        <TouchableOpacity style={[styles.renewSoonButton, { borderLeftColor: theme.colors.warning, backgroundColor: isDarkMode ? "#4b453c" : "#fef3c7" }]}>
          <Text style={[styles.renewSoonText, { color: theme.colors.warning }]}>{t("subscription.renewSoon") || "⏰ Renew soon to avoid disruption"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};


const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 20,
    marginVertical: 8,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
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
  infoBox: {
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    marginTop: 4,
  },
  infoText: {
    fontSize: 14,
    fontWeight: "600",
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
