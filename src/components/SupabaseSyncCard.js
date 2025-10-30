import React, { useState, useEffect, useRef } from "react";
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

export default function SupabaseSyncCard() {
  const navigation = useNavigation();
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

  // ✅ Load status when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadSyncStatus();

      // ✅ Poll every 30 seconds while on this screen
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
      // ✅ Silently handle - user doesn't need to know
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
      Alert.alert("Success", "Data synced successfully!");
      loadSyncStatus();
    } else {
      Alert.alert("Sync Failed", result.error);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure? Local data will remain but won't sync.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
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
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#1e40af" />
        <Text style={styles.loadingText}>Checking sync status...</Text>
      </View>
    );
  }

  if (!syncStatus.enabled) {
    return (
      <View style={styles.signInSection}>
        <Ionicons name="cloud-offline" size={48} color="#cbd5e1" />
        <Text style={styles.signInTitle}>Enable Cloud Sync</Text>
        <Text style={styles.signInSubtitle}>
          Sign in to automatically sync your data across all devices
        </Text>
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => navigation.navigate("Auth")}
        >
          <Ionicons name="log-in" size={20} color="#fff" />
          <Text style={styles.signInButtonText}>Sign In / Sign Up</Text>
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
            syncStatus.isOnline ? styles.statusOnline : styles.statusOffline,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: syncStatus.isOnline ? "#059669" : "#dc2626" },
            ]}
          />
          <Text style={styles.statusText}>
            {syncStatus.isOnline ? "Online" : "Offline"}
          </Text>
        </View>

        {syncStatus.pendingChanges > 0 && (
          <View style={styles.pendingBadge}>
            <Ionicons name="sync" size={14} color="#d97706" />
            <Text style={styles.pendingText}>
              {syncStatus.pendingChanges} pending
            </Text>
          </View>
        )}
      </View>

      {syncStatus.email && (
        <View style={styles.userInfo}>
          <Ionicons name="person-circle" size={20} color="#64748b" />
          <Text style={styles.userEmail}>{syncStatus.email}</Text>
        </View>
      )}

      {syncStatus.lastSync && (
        <View style={styles.syncInfo}>
          <Ionicons name="time" size={16} color="#64748b" />
          <Text style={styles.syncInfoText}>
            Last synced: {formatSyncTime(syncStatus.lastSync)}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.syncButton,
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
            <Text style={styles.syncButtonText}>Sync Now</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
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
    color: "#64748b",
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
    color: "#1e293b",
    marginTop: 8,
  },
  signInSubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 20,
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e40af",
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
  statusOnline: {
    backgroundColor: "#f0fdf4",
  },
  statusOffline: {
    backgroundColor: "#fef2f2",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#d97706",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  userEmail: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  syncInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  syncInfoText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e40af",
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
    backgroundColor: "#cbd5e1",
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
