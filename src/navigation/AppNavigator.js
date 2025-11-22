// src/navigation/AppNavigator.js

import React, { useContext, useEffect, useState, useRef } from "react";
import {
  View,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  Alert,
  TouchableOpacity,
  AppState,
} from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";

import { supabase, getCurrentUser } from "../config/SupabaseConfig";
import * as SecureStore from "expo-secure-store";

import DatabaseService from "../services/DatabaseService";
import SupabaseService from "../services/SupabaseService";
import BackgroundSyncService from "../services/BackgroundSyncService";
import RealtimeSyncService from "../services/RealtimeSyncService";
import ChangeLanguageScreen from "../screens/ChangeLanguageScreen";
import CustomersScreen from "../screens/CustomersScreen";
import AddCustomerScreen from "../screens/AddCustomerScreen";
import TransactionsScreen from "../screens/TransactionsScreen";
import AddTransactionScreen from "../screens/AddTransactionScreen";
import SummaryScreen from "../screens/SummaryScreen";
import EditCustomerScreen from "../screens/EditCustomerScreen";
import EditTransactionScreen from "../screens/EditTransaction";
import LanguageSelectionScreen from "../screens/LanguageSelectionScreen";
import AuthScreen from "../screens/AuthScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import UserManualScreen from "../screens/UserManualScreen";
import SettingsScreen from "../screens/SettingsScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import { CustomerProvider } from "../contexts/CustomerContext";
import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { ENABLE_I18N, fallbackT } from "../config/i18nConfig";
import { ThemeProvider } from "../contexts/ThemeContext";
import { useTheme } from "../contexts/ThemeContext";
import { AlertProvider } from "../contexts/AlertContext";
import { useAlert } from "../contexts/AlertContext";
import { UserProvider } from "../contexts/UserContext";
import PinLockScreen from "../screens/PinLockScreen";
import SetPINScreen from "../screens/SetPinScreen";
import { usePinLock } from "../contexts/PinLockContext";
import GoogleBackupScreen from '../screens/GoogleBackupScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const linking = {
  prefixes: ["udharkhataoffline://"],
  config: {
    screens: {
      Auth: "auth",
      ForgotPassword: "forgot-password",
      LanguageSelection: "language-selection",
      Main: {
        path: "main",
        screens: {
          CustomersTab: {
            screens: {
              Customers: "customers",
              AddCustomer: "add-customer",
              EditCustomer: "edit-customer",
            },
          },
          TransactionsTab: {
            screens: {
              Transactions: "transactions",
              AddTransaction: "add-transaction",
              EditTransaction: "edit-transaction",
            },
          },
          SummaryTab: "summary",
        },
      },
      UserManual: "user-manual",
      Settings: "settings",
      EditProfile: "edit-profile",
      SetPIN: "set-pin",
      GoogleBackup: "google-backup",
    },
  },
};

const getScreenOptions = (theme) => ({
  headerStyle: {
    backgroundColor: theme.colors.primary,
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
    color: "#fff",
  },
  headerTitleAlign: "center",
  headerShadowVisible: true,
});

const useT = () => {
  return ENABLE_I18N ? useContext(SimpleLanguageContext).t : fallbackT;
};

// ✅ SETTINGS BUTTON COMPONENT - Reusable
function SettingsHeaderButton({ onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.settingsButton}
      activeOpacity={0.7}
    >
      <Ionicons name="person-outline" size={24} color="#fff" />
    </TouchableOpacity>
  );
}

// Customers Stack
function CustomersStack({ theme }) {
  const t = useT();
  return (
    <Stack.Navigator screenOptions={getScreenOptions(theme)}>
      <Stack.Screen
        name="Customers"
        component={CustomersScreen}
        options={({ navigation }) => ({
          title: t("navigation.customers"),
          headerRight: () => (
            <SettingsHeaderButton
              onPress={() => navigation.navigate("Settings")}
            />
          ),
        })}
      />
      <Stack.Screen
        name="AddCustomer"
        component={AddCustomerScreen}
        options={({ navigation }) => ({
          title: t("navigation.addCustomer"),
          headerRight: () => (
            <SettingsHeaderButton
              onPress={() => navigation.navigate("Settings")}
            />
          ),
        })}
      />
      <Stack.Screen
        name="EditCustomer"
        component={EditCustomerScreen}
        options={({ navigation }) => ({
          title: t("navigation.editCustomer"),
          headerRight: () => (
            <SettingsHeaderButton
              onPress={() => navigation.navigate("Settings")}
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
}

// Transactions Stack
function TransactionsStack({ theme }) {
  const t = useT();
  return (
    <Stack.Navigator screenOptions={getScreenOptions(theme)}>
      <Stack.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={({ navigation }) => ({
          title: t("navigation.transactions"),
          headerRight: () => (
            <SettingsHeaderButton
              onPress={() => navigation.navigate("Settings")}
            />
          ),
        })}
      />
      <Stack.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={({ navigation }) => ({
          title: t("navigation.addTransaction"),
          headerRight: () => (
            <SettingsHeaderButton
              onPress={() => navigation.navigate("Settings")}
            />
          ),
        })}
      />
      <Stack.Screen
        name="EditTransaction"
        component={EditTransactionScreen}
        options={({ navigation }) => ({
          title: t("navigation.editTransaction"),
          headerRight: () => (
            <SettingsHeaderButton
              onPress={() => navigation.navigate("Settings")}
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
}

// Summary Stack
function SummaryStack({ theme }) {
  const t = useT();
  return (
    <Stack.Navigator screenOptions={getScreenOptions(theme)}>
      <Stack.Screen
        name="Summary"
        component={SummaryScreen}
        options={({ navigation }) => ({
          title: t("navigation.summary"),
          headerRight: () => (
            <SettingsHeaderButton
              onPress={() => navigation.navigate("Settings")}
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
}

// UserManual Stack
function UserManualStack({ theme }) {
  const t = useT();
  return (
    <Stack.Navigator screenOptions={getScreenOptions(theme)}>
      <Stack.Screen
        name="UserManualContent"
        component={UserManualScreen}
        options={{ title: t("navigation.userManual") || "User Manual" }}
      />
    </Stack.Navigator>
  );
}

// ✅ Settings Stack - NOW INCLUDES GoogleBackup
function SettingsStack({ theme }) {
  const t = useT();
  return (
    <Stack.Navigator screenOptions={getScreenOptions(theme)}>
      <Stack.Screen
        name="SettingsContent"
        component={SettingsScreen}
        options={{ title: t("navigation.settings") || "Settings" }}
      />
      
      {/* ✅ GoogleBackup is now inside SettingsStack */}
      <Stack.Screen
        name="GoogleBackup"
        component={GoogleBackupScreen}
        options={{ 
          title: t("navigation.googleBackup") || "Google Drive Backup",
        }}
      />
    </Stack.Navigator>
  );
}

// Stack Wrappers
function CustomersStackWrapper(props) {
  const { theme } = useTheme();
  return <CustomersStack {...props} theme={theme} />;
}

function TransactionsStackWrapper(props) {
  const { theme } = useTheme();
  return <TransactionsStack {...props} theme={theme} />;
}

function SummaryStackWrapper(props) {
  const { theme } = useTheme();
  return <SummaryStack {...props} theme={theme} />;
}

function UserManualStackWrapper(props) {
  const { theme } = useTheme();
  return <UserManualStack {...props} theme={theme} />;
}

function SettingsStackWrapper(props) {
  const { theme } = useTheme();
  return <SettingsStack {...props} theme={theme} />;
}

function MainTabs({ theme }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom;
  const BASE_TAB_HEIGHT = 60;

  return (
    <Tab.Navigator
      initialRouteName="TransactionsTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          height: BASE_TAB_HEIGHT + bottomPadding,
          paddingBottom: bottomPadding > 0 ? bottomPadding : 6,
          paddingTop: 1,
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
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
          color: theme.colors.text,
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
        component={CustomersStackWrapper}
        options={{
          tabBarLabel: t("navigation.customers"),
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && [
                  styles.iconContainerActive,
                  { backgroundColor: theme.colors.primaryLight },
                ],
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
        component={TransactionsStackWrapper}
        options={{
          tabBarLabel: t("navigation.transactions"),
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && [
                  styles.iconContainerActive,
                  { backgroundColor: theme.colors.primaryLight },
                ],
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
        component={SummaryStackWrapper}
        options={{
          tabBarLabel: t("navigation.summary"),
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && [
                  styles.iconContainerActive,
                  { backgroundColor: theme.colors.primaryLight },
                ],
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

function MainTabsWrapper(props) {
  const { theme } = useTheme();
  return <MainTabs {...props} theme={theme} />;
}

function AppNavigatorContent() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dbReady, setDbReady] = useState(false);

  const { isLoading, isFirstTimeSetup } = useContext(SimpleLanguageContext);

  const { theme } = useTheme();
  const { showError } = useAlert();

  const { isLocked, saveNavigationState } = usePinLock();

  const t = useT();
  const navigationRef = useRef(null);
  const navStateRef = useRef(null);

  const onNavStateChange = (state) => {
    navStateRef.current = state;
  };

  useEffect(() => {
    console.log("🔰 Adding AppState change listener");

    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      console.log(`🔰 AppState changed to: ${nextAppState}`);
      if (nextAppState === "background") {
        const enabled = await SecureStore.getItemAsync("pin_lock_enabled");
        console.log(`🔰 PIN enabled: ${enabled}`);
        if (enabled === "true") {
          console.log("🔰 Saving nav state due to background");
          saveNavigationState(navStateRef.current);
        }
      }
    });

    return () => {
      console.log("🔰 Removing AppState change listener");
      subscription.remove();
    };
  }, [saveNavigationState]);

  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      await DatabaseService.init();
      setDbReady(true);
    } catch (error) {
      Alert.alert("Database Error", "Failed to initialize database. Please restart the app.", [{ text: "OK" }]);
    }
  };

  useEffect(() => {
    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        setUser(session.user);
        await startAllSyncServices(session);
      } else if (event === "SIGNED_OUT" || event === "USER_DELETED") {
        setUser(null);
        stopAllSyncServices();
      } else if (session) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
      stopAllSyncServices();
    };
  }, []);

  const startAllSyncServices = async (session) => {
    const isOnline = await SupabaseService.checkOnlineStatus();

    if (!isOnline) {
      console.log("Offline mode - sync will resume when online");
    }

    if (isOnline) {
      setTimeout(async () => {
        try {
          await SupabaseService.fullSync();
        } catch (syncError) {
          if (!syncError.message?.includes("network")) {
            console.log("Initial sync error:", syncError.message);
          }
        }
      }, 2000);
    }

    BackgroundSyncService.start(30000);
    await RealtimeSyncService.start(session.user.id);
  };

  const stopAllSyncServices = () => {
    try {
      BackgroundSyncService.stop();
      RealtimeSyncService.stop();
    } catch (error) {
      console.error("Error stopping sync services:", error);
    }
  };

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          await startAllSyncServices(session);
        }
      }
    } catch (error) {
      if (
        error.message &&
        (error.message.includes("JWT") ||
          error.message.includes("does not exist") ||
          error.message.includes("sub claim"))
      ) {
        try {
          await supabase.auth.signOut();
        } catch {}
      }
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  if (isLoading || authLoading || !dbReady) {
    return (
      <NavigationContainer linking={linking}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Loading">
            {() => (
              <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <View style={styles.loadingContent}>
                  <View style={[styles.loadingIconContainer, { backgroundColor: theme.colors.primaryLight }]}>
                    <Ionicons name="wallet" size={48} color={theme.colors.primary} />
                  </View>
                  <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
                  <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading...</Text>
                  <Text style={[styles.loadingSubtext, { color: theme.colors.textSecondary }]}>Secure Financial Management</Text>
                </View>
              </View>
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  if (isLocked) {
    return (
      <NavigationContainer linking={linking} ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="PinLock" component={PinLockScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  const getInitialRoute = () => {
    if (isFirstTimeSetup) return "LanguageSelection";
    return "Main";
  };

  return (
    <NavigationContainer
      linking={linking}
      ref={navigationRef}
      onStateChange={onNavStateChange}
    >
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
        
        {isFirstTimeSetup ? (
          <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainTabsWrapper} />
        )}

        <Stack.Screen
          name="ChangeLanguage"
          component={ChangeLanguageScreen}
          options={{
            headerShown: true,
            title: "Change Language",
            ...getScreenOptions(theme),
          }}
        />

        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{ headerShown: true, title: "Forgot Password", presentation: "modal" }}
        />

        <Stack.Screen name="Auth" component={AuthScreen} options={{ presentation: "modal", animation: "slide_from_bottom" }} />

        <Stack.Screen name="UserManual" component={UserManualStackWrapper} options={{ presentation: "modal", animationEnabled: true }} />

        {/* ✅ Settings now contains GoogleBackup inside its stack */}
        <Stack.Screen name="Settings" component={SettingsStackWrapper} options={{ presentation: "modal", animationEnabled: true }} />

        <Stack.Screen
          name="EditProfile"
          component={EditProfileScreen}
          options={{
            title: t("navigation.editProfile"),
            headerShown: true,
            ...getScreenOptions(theme),
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />

        <Stack.Screen
          name="SetPIN"
          component={SetPINScreen}
          options={{ headerShown: false, presentation: "modal", animation: "slide_from_bottom" }}
        />

        {/* ✅ GoogleBackup REMOVED from here - now inside SettingsStack */}

      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function AppNavigator() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AlertProvider>
          <CustomerProvider>
            <AppNavigatorContent />
          </CustomerProvider>
        </AlertProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
    gap: 20,
  },
  loadingIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
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
    letterSpacing: -0.3,
  },
  loadingSubtext: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainerActive: {},
  settingsButton: {
    padding: 8,
    marginRight: 8,
  },
});
