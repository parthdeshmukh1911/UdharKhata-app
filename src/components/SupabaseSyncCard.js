import React, { useState, useEffect, useRef, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SupabaseService from "../services/SupabaseService";
import { supabase } from "../config/SupabaseConfig";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../contexts/ThemeContext";
import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { ENABLE_I18N, fallbackT } from "../config/i18nConfig";

export default function SupabaseSyncCard() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = ENABLE_I18N
    ? useContext(SimpleLanguageContext)
    : { t: fallbackT };

  const [syncStatus, setSyncStatus] = useState({
    enabled: false,
    isOnline: false,
    lastSync: null,
    pendingChanges: 0,
  });
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  useFocusEffect(
    React.useCallback(() => {
      loadSyncStatus();

      intervalRef.current = setInterval(() => {
        if (mountedRef.current) {
          loadSyncStatus();
        }
      }, 30000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }, [])
  );

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadSyncStatus = async () => {
    try {
      const status = await SupabaseService.getSyncStatus();
      if (mountedRef.current) {
        setSyncStatus(status);
        setLoading(false);
      }
    } catch (error) {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    const result = await SupabaseService.manualSync();
    setSyncing(false);

    if (result.success) {
      Alert.alert(
        t("common.success"),
        t("supabaseSync.dataSyncedSuccessfully")
      );
      loadSyncStatus();
    } else {
      Alert.alert(t("common.error"), result.error);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      t("supabaseSync.signOut"),
      t("supabaseSync.signOutMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("supabaseSync.signOut"),
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            loadSyncStatus();
          },
        },
      ]
    );
  };

  const formatSyncTime = (timestamp) => {
    if (!timestamp) return t("supabaseSync.never");
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return t("supabaseSync.justNow");
    if (diff < 3600) return `${Math.floor(diff / 60)}${t("supabaseSync.minutesAgoShort")}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}${t("supabaseSync.hoursAgoShort")}`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          {t("supabaseSync.checkingSyncStatus")}
        </Text>
      </View>
    );
  }

  if (!syncStatus.enabled) {
    return (
      <View style={styles.signInSection}>
        <Ionicons
          name="cloud-offline"
          size={48}
          color={theme.colors.textTertiary}
        />
        <Text style={[styles.signInTitle, { color: theme.colors.text }]}>
          {t("supabaseSync.enableCloudSync")}
        </Text>
        <Text style={[styles.signInSubtitle, { color: theme.colors.textSecondary }]}>
          {t("supabaseSync.signInToSync")}
        </Text>
        <TouchableOpacity
          style={[styles.signInButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate("Auth")}
        >
          <Ionicons name="log-in" size={20} color="#fff" />
          <Text style={styles.signInButtonText}>
            {t("supabaseSync.signInSignUp")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.syncedSection}>
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusBadge,
            syncStatus.isOnline
              ? [
                  styles.statusOnline,
                  {
                    backgroundColor: theme.isDarkMode ? "#064e3b" : "#f0fdf4",
                  },
                ]
              : [
                  styles.statusOffline,
                  {
                    backgroundColor: theme.isDarkMode ? "#7f1d1d" : "#fef2f2",
                  },
                ],
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: syncStatus.isOnline ? "#059669" : "#dc2626" },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: syncStatus.isOnline ? "#059669" : "#dc2626" },
            ]}
          >
            {syncStatus.isOnline
              ? t("supabaseSync.online")
              : t("supabaseSync.offline")}
          </Text>
        </View>

        {syncStatus.pendingChanges > 0 && (
          <View
            style={[
              styles.pendingBadge,
              {
                backgroundColor: theme.isDarkMode ? "#78350f" : "#fef3c7",
              },
            ]}
          >
            <Ionicons name="sync" size={14} color="#d97706" />
            <Text style={[styles.pendingText, { color: "#d97706" }]}>
              {syncStatus.pendingChanges} {t("supabaseSync.pending")}
            </Text>
          </View>
        )}
      </View>

      {syncStatus.email && (
        <View
          style={[
            styles.userInfo,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Ionicons
            name="person-circle"
            size={20}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>
            {syncStatus.email}
          </Text>
        </View>
      )}

      {syncStatus.lastSync && (
        <View style={styles.syncInfo}>
          <Ionicons name="time" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.syncInfoText, { color: theme.colors.textSecondary }]}>
            {t("supabaseSync.lastSynced")}: {formatSyncTime(syncStatus.lastSync)}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.syncButton,
          { backgroundColor: theme.colors.primary },
          !syncStatus.isOnline && styles.syncButtonDisabled,
        ]}
        onPress={handleSync}
        disabled={syncing || !syncStatus.isOnline}
        activeOpacity={0.8}
      >
        {syncing ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="cloud-upload" size={20} color="#fff" />
            <Text style={styles.syncButtonText}>
              {t("supabaseSync.syncNow")}
            </Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>{t("supabaseSync.signOut")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  signInSection: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 12,
  },
  signInTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
  },
  signInSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 20,
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 10,
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
  signInButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  syncedSection: {
    gap: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  statusOnline: {},
  statusOffline: {},
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: "600",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: "500",
  },
  syncInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  syncInfoText: {
    fontSize: 13,
    fontWeight: "500",
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
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
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  signOutButton: {
    paddingVertical: 10,
    alignItems: "center",
  },
  signOutText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#dc2626",
  },
});
