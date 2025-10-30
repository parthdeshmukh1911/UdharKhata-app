// src/navigation/AppNavigator.js

import React, { useContext, useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  Alert,
} from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

// ✅ Import Supabase
import { supabase, getCurrentUser } from "../config/SupabaseConfig";
import DatabaseService from "../services/DatabaseService";
import SupabaseService from "../services/SupabaseService";
import BackgroundSyncService from "../services/BackgroundSyncService";
import RealtimeSyncService from "../services/RealtimeSyncService";

// Importing all required screens and contexts
import CustomersScreen from "../screens/CustomersScreen";
import AddCustomerScreen from "../screens/AddCustomerScreen";
import TransactionsScreen from "../screens/TransactionsScreen";
import AddTransactionScreen from "../screens/AddTransactionScreen";
import SummaryScreen from "../screens/SummaryScreen";
import EditCustomerScreen from "../screens/EditCustomerScreen";
import EditTransactionScreen from "../screens/EditTransaction";
import LanguageSelectionScreen from "../screens/LanguageSelectionScreen";
import AuthScreen from "../screens/AuthScreen";
import { CustomerProvider } from "../contexts/CustomerContext";
import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { ENABLE_I18N, fallbackT } from "../config/i18nConfig";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Professional Header Style for all Stacks
const screenOptions = {
  headerStyle: {
    backgroundColor: "#1e40af",
    height: Platform.OS === "ios" ? 96 : 60,
    ...Platform.select({
      ios: {
        shadowColor: "#1e293b",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerTintColor: "#fff",
  headerTitleStyle: {
    fontWeight: "700",
    fontSize: 18,
    letterSpacing: -0.3,
  },
  headerTitleAlign: "center",
  headerShadowVisible: true,
};

// Helper hook to get the translation function (t) consistently
const useT = () => {
  return ENABLE_I18N ? useContext(SimpleLanguageContext).t : fallbackT;
};

// ===== STACKS =====
function CustomersStack() {
  const t = useT();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Customers"
        component={CustomersScreen}
        options={{ title: t("navigation.customers") }}
      />
      <Stack.Screen
        name="AddCustomer"
        component={AddCustomerScreen}
        options={{ title: t("navigation.addCustomer") }}
      />
      <Stack.Screen
        name="EditCustomer"
        component={EditCustomerScreen}
        options={{ title: t("navigation.editCustomer") }}
      />
    </Stack.Navigator>
  );
}

function TransactionsStack() {
  const t = useT();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ title: t("navigation.transactions") }}
      />
      <Stack.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{ title: t("navigation.addTransaction") }}
      />
      <Stack.Screen
        name="EditTransaction"
        component={EditTransactionScreen}
        options={{ title: t("navigation.editTransaction") }}
      />
    </Stack.Navigator>
  );
}

function SummaryStack() {
  const t = useT();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Summary"
        component={SummaryScreen}
        options={{ title: t("navigation.summary") }}
      />
    </Stack.Navigator>
  );
}

// ===== MAIN TABS =====
function MainTabs() {
  const t = useT();
  const insets = useSafeAreaInsets();

  const bottomPadding = insets.bottom;
  const BASE_TAB_HEIGHT = 60;

  return (
    <Tab.Navigator
      initialRouteName="TransactionsTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#1e40af",
        tabBarInactiveTintColor: "#64748b",
        tabBarStyle: {
          height: BASE_TAB_HEIGHT + bottomPadding,
          paddingBottom: bottomPadding > 0 ? bottomPadding : 6,
          paddingTop: 1,
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#e2e8f0",
          ...Platform.select({
            ios: {
              shadowColor: "#1e293b",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
            },
            android: {
              elevation: 8,
            },
          }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
          marginBottom: 2,
          letterSpacing: 0.3,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      })}
    >
      <Tab.Screen
        name="CustomersTab"
        component={CustomersStack}
        options={{
          tabBarLabel: t("navigation.customers"),
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && styles.iconContainerActive,
              ]}
            >
              <Ionicons
                name={focused ? "people" : "people-outline"}
                size={24}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="TransactionsTab"
        component={TransactionsStack}
        options={{
          tabBarLabel: t("navigation.transactions"),
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && styles.iconContainerActive,
              ]}
            >
              <Ionicons
                name={focused ? "swap-horizontal" : "swap-horizontal-outline"}
                size={24}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="SummaryTab"
        component={SummaryStack}
        options={{
          tabBarLabel: t("navigation.summary"),
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && styles.iconContainerActive,
              ]}
            >
              <Ionicons
                name={focused ? "stats-chart" : "stats-chart-outline"}
                size={24}
                color={color}
              />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ===== APP NAVIGATOR =====
export default function AppNavigator() {
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dbReady, setDbReady] = useState(false);
  const { isLoading, languageKey } = useContext(SimpleLanguageContext);

  // ✅ Initialize database
  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      console.log("🚀 Initializing database...");
      await DatabaseService.init();
      console.log("✅ Database ready");
      setDbReady(true);
    } catch (error) {
      console.error("❌ Database initialization error:", error);
      Alert.alert(
        "Database Error",
        "Failed to initialize database. Please restart the app.",
        [{ text: "OK" }]
      );
    }
  };

  // ✅ Check authentication status and manage sync services
  useEffect(() => {
    checkUser();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event);

      if (event === "SIGNED_IN" && session) {
        console.log("✅ User signed in");
        setUser(session.user);

        // ✅ Start all sync services after sign in
        await startAllSyncServices(session);
      } else if (event === "SIGNED_OUT" || event === "USER_DELETED") {
        console.log("❌ User signed out");
        setUser(null);

        // ✅ Stop all sync services
        stopAllSyncServices();
      } else if (session) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
      // ✅ Cleanup sync services on unmount
      stopAllSyncServices();
    };
  }, []);

  // ✅ Start all sync services when user logs in
  // In AppNavigator.js, update startAllSyncServices():

  const startAllSyncServices = async (session) => {
    try {
      console.log("\n╔════════════════════════════════════════╗");
      console.log("║  STARTING ALL SYNC SERVICES            ║");
      console.log("╚════════════════════════════════════════╝\n");

      // ✅ Check if online first
      const isOnline = await SupabaseService.checkOnlineStatus();

      if (!isOnline) {
        console.log(
          "⚠️ Starting in offline mode - sync will resume when online"
        );
      }

      // 1. Initial full sync (only if online)
      if (isOnline) {
        console.log("1️⃣ Running initial sync on login...");
        setTimeout(async () => {
          try {
            await SupabaseService.fullSync();
          } catch (syncError) {
            // Silently handle - may have gone offline
            if (!syncError.message?.includes("network")) {
              console.log("Initial sync error:", syncError.message);
            }
          }
        }, 2000);
      }

      // 2. Start background periodic sync (works offline too)
      console.log("2️⃣ Starting periodic background sync (30s interval)...");
      BackgroundSyncService.start(30000);

      // 3. Start real-time listeners (handles offline gracefully)
      console.log("3️⃣ Starting real-time listeners...");
      await RealtimeSyncService.start(session.user.id);

      console.log("\n✅ All sync services started!\n");
    } catch (error) {
      // ✅ Don't show error to user - sync services will retry
      console.log(
        "⚠️ Sync services starting in degraded mode (may be offline)"
      );
    }
  };

  // ✅ Stop all sync services when user logs out
  const stopAllSyncServices = () => {
    console.log("\n⏹️ Stopping all sync services...");

    try {
      BackgroundSyncService.stop();
      RealtimeSyncService.stop();
      console.log("✅ All sync services stopped\n");
    } catch (error) {
      console.error("Error stopping sync services:", error);
    }
  };

  // ✅ Check if user is logged in with error recovery
  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      // ✅ If user is already logged in, start sync services
      if (currentUser) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          await startAllSyncServices(session);
        }
      }
    } catch (error) {
      console.error("Check user error:", error);

      // If there's a JWT error, clear the session
      if (
        error.message &&
        (error.message.includes("JWT") ||
          error.message.includes("does not exist") ||
          error.message.includes("sub claim"))
      ) {
        console.log("Invalid session detected, signing out...");
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.log("Sign out error (ignored):", signOutError.message);
        }
      }

      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  // Check first launch status
  useEffect(() => {
    const checkFirstLaunch = async () => {
      if (!languageKey || languageKey === "en") {
        setIsFirstLaunch(true);
      } else {
        setIsFirstLaunch(false);
      }
    };
    checkFirstLaunch();
  }, [languageKey]);

  // Show loading screen while checking auth + language + database
  if (isLoading || isFirstLaunch === null || authLoading || !dbReady) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Loading">
            {() => (
              <View style={styles.loadingContainer}>
                <View style={styles.loadingContent}>
                  <View style={styles.loadingIconContainer}>
                    <Ionicons name="wallet" size={48} color="#1e40af" />
                  </View>
                  <ActivityIndicator
                    size="large"
                    color="#1e40af"
                    style={styles.loader}
                  />
                  <Text style={styles.loadingText}>Loading...</Text>
                  <Text style={styles.loadingSubtext}>
                    Secure Financial Management
                  </Text>
                </View>
              </View>
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Determine initial route based on first launch
  const getInitialRoute = () => {
    if (isFirstLaunch) return "LanguageSelection";
    return "Main";
  };

  return (
    <SafeAreaProvider>
      <CustomerProvider>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animation: "fade",
            }}
            initialRouteName={getInitialRoute()}
          >
            {/* Language Selection (First Launch) */}
            <Stack.Screen
              name="LanguageSelection"
              component={LanguageSelectionScreen}
            />

            {/* Auth Screen (Modal) */}
            <Stack.Screen
              name="Auth"
              component={AuthScreen}
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
              }}
            />

            {/* Main App */}
            <Stack.Screen name="Main" component={MainTabs} />
          </Stack.Navigator>
        </NavigationContainer>
      </CustomerProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // Loading Screen Styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingContent: {
    alignItems: "center",
    gap: 20,
  },
  loadingIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#1e40af",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  loader: {
    marginVertical: 8,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    letterSpacing: -0.3,
  },
  loadingSubtext: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
    marginTop: 4,
  },

  // Tab Bar Icon Container
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainerActive: {
    backgroundColor: "#dbeafe",
  },
});
