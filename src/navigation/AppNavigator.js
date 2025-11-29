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
  Image,
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

// ✅ SETTINGS BUTTON COMPONENT
function SettingsHeaderButton({ onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.settingsButton}
      activeOpacity={0.7}
    >
      <Ionicons name="person-circle-outline" size={38} color="#fff" />
    </TouchableOpacity>
  );
}

// Stack definitions remain the same...
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

function SettingsStack({ theme }) {
  const t = useT();
  return (
    <Stack.Navigator screenOptions={getScreenOptions(theme)}>
      <Stack.Screen
        name="SettingsContent"
        component={SettingsScreen}
        options={{ title: t("navigation.settings") || "Settings" }}
      />
    </Stack.Navigator>
  );
}

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
  const appState = useRef(AppState.currentState);
  const sessionRef = useRef(null); // ✅ Track current session

  const onNavStateChange = (state) => {
    navStateRef.current = state;
  };

  // ✅ CRITICAL FIX: Handle app foreground/background with session refresh
  useEffect(() => {
    console.log("🔰 Adding AppState change listener");

    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      console.log(`🔰 AppState changed: ${appState.current} -> ${nextAppState}`);

      // ✅ App coming to foreground
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        console.log("📱 App came to foreground");
        
        // ✅ Refresh session to prevent expiry
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error("❌ Session refresh error:", error);
            setUser(null);
            stopAllSyncServices();
          } else if (session) {
            console.log("✅ Session refreshed successfully");
            sessionRef.current = session;
            setUser(session.user);
            
            // ✅ Restart sync services
            await startAllSyncServices(session);
          } else {
            console.log("❌ No session found");
            setUser(null);
            stopAllSyncServices();
          }
        } catch (error) {
          console.error("❌ Error refreshing session:", error);
        }
      }

      // ✅ App going to background
      if (appState.current === "active" && nextAppState.match(/inactive|background/)) {
        console.log("📱 App going to background");
        const enabled = await SecureStore.getItemAsync("pin_lock_enabled");
        if (enabled === "true") {
          console.log("🔐 Saving nav state for PIN lock");
          saveNavigationState(navStateRef.current);
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      console.log("🔰 Removing AppState change listener");
      subscription?.remove();
    };
  }, [saveNavigationState]);

  // ✅ Database initialization with timeout fallback
  useEffect(() => {
    let mounted = true;
    let timeoutId;

    const initDB = async () => {
      console.log('🔧 Initializing database...');
      
      // ✅ Fallback timeout to prevent infinite stuck
      timeoutId = setTimeout(() => {
        if (!dbReady && mounted) {
          console.warn('⚠️ Database init timeout - proceeding anyway');
          setDbReady(true);
        }
      }, 10000); // 10 second timeout

      try {
        await DatabaseService.init();
        if (mounted) {
          clearTimeout(timeoutId);
          console.log('✅ Database initialized successfully');
          setDbReady(true);
        }
      } catch (error) {
        console.error('❌ Database initialization error:', error);
        if (mounted) {
          clearTimeout(timeoutId);
          Alert.alert(
            "Database Error",
            "Failed to initialize database. Some features may not work properly.",
            [{ text: "OK", onPress: () => setDbReady(true) }]
          );
        }
      }
    };

    initDB();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  // ✅ Auth initialization with proper session handling
  useEffect(() => {
    let mounted = true;
    let authSubscription = null;
    let timeoutId;

    const initAuth = async () => {
      // ✅ Fallback timeout
      timeoutId = setTimeout(() => {
        if (authLoading && mounted) {
          console.warn('⚠️ Auth init timeout - proceeding');
          setAuthLoading(false);
        }
      }, 8000);

      try {
        console.log('🔐 Checking user auth...');

        // ✅ Get current session (not just user)
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ Session error:', error);
          if (mounted) {
            setUser(null);
            sessionRef.current = null;
          }
        } else if (session) {
          console.log('✅ Session found:', session.user.email);
          if (mounted) {
            sessionRef.current = session;
            setUser(session.user);
            await startAllSyncServices(session);
          }
        } else {
          console.log('❌ No active session');
          if (mounted) {
            setUser(null);
            sessionRef.current = null;
          }
        }
      } catch (error) {
        console.error('❌ Auth check error:', error);
        if (mounted) {
          setUser(null);
          sessionRef.current = null;
        }
      } finally {
        if (mounted) {
          clearTimeout(timeoutId);
          console.log('✅ Auth check complete');
          setAuthLoading(false);
        }
      }
    };

    // ✅ Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event);

      if (!mounted) return;

      switch (event) {
        case "SIGNED_IN":
          if (session) {
            console.log('✅ User signed in');
            sessionRef.current = session;
            setUser(session.user);
            await startAllSyncServices(session);
          }
          break;

        case "SIGNED_OUT":
        case "USER_DELETED":
          console.log('❌ User signed out');
          sessionRef.current = null;
          setUser(null);
          stopAllSyncServices();
          break;

        case "TOKEN_REFRESHED":
          if (session) {
            console.log('🔄 Token refreshed');
            sessionRef.current = session;
            setUser(session.user);
            // Don't restart services, just update session
          }
          break;

        case "INITIAL_SESSION":
          // Handled by initAuth
          break;

        default:
          if (session) {
            sessionRef.current = session;
            setUser(session.user);
          } else {
            sessionRef.current = null;
            setUser(null);
          }
      }
    });

    authSubscription = subscription;
    initAuth();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      authSubscription?.unsubscribe();
      stopAllSyncServices();
    };
  }, []);

  const startAllSyncServices = async (session) => {
    if (!session) {
      console.log('⚠️ No session provided, skipping sync');
      return;
    }

    try {
      const isOnline = await SupabaseService.checkOnlineStatus();

      if (!isOnline) {
        console.log("📴 Offline mode - sync will resume when online");
        return;
      }

      // ✅ Initial sync with retry
      setTimeout(async () => {
        let retries = 0;
        while (retries < 3) {
          try {
            await SupabaseService.fullSync();
            console.log('✅ Initial sync complete');
            break;
          } catch (syncError) {
            retries++;
            if (retries >= 3) {
              console.log("⚠️ Initial sync failed after 3 retries");
            } else {
              console.log(`⚠️ Sync retry ${retries}/3`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }
      }, 2000);

      BackgroundSyncService.start(30000);
      await RealtimeSyncService.start(session.user.id);
      console.log('✅ Sync services started');
    } catch (error) {
      console.error('❌ Error starting sync services:', error);
    }
  };

  const stopAllSyncServices = () => {
    try {
      BackgroundSyncService.stop();
      RealtimeSyncService.stop();
      console.log('⏹️ Sync services stopped');
    } catch (error) {
      console.error("❌ Error stopping sync services:", error);
    }
  };

  // ✅ Loading screen
  if (isLoading || authLoading || !dbReady) {
    const loadingStage = !dbReady ? 'Database' : authLoading ? 'Authentication' : 'Language';

    return (
      <NavigationContainer linking={linking}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Loading">
            {() => (
              <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <View style={styles.loadingContent}>
                  <Image
                    source={require('../../assets/UdharKhata2.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />

                  <Text style={[styles.appName, { color: theme.colors.text }]}>
                    UdharKhataPlus
                  </Text>

                  <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>
                    Smart and secure udhar management
                  </Text>

                  <ActivityIndicator
                    size="large"
                    color={theme.colors.primary}
                    style={styles.loader}
                  />

                  <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                    Loading {loadingStage}...
                  </Text>
                </View>
              </View>
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // ✅ PIN lock screen
  if (isLocked) {
    return (
      <NavigationContainer linking={linking} ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="PinLock" component={PinLockScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // ✅ Main app
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
    gap: 16,
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  appName: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 24,
    letterSpacing: 0.3,
  },
  loader: {
    marginVertical: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
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
