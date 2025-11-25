// App.js
/**
 * App.js
 * Entry point for KhataBookOffline React Native App
 * Includes AppNavigator with modern consistent UI
 */

import React, { useEffect, useState } from "react";
import { StatusBar, SafeAreaView, Platform, View, ActivityIndicator } from "react-native";
import * as Notifications from 'expo-notifications';
import { SimpleLanguageProvider } from "./src/contexts/SimpleLanguageContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { UserProvider } from './src/contexts/UserContext'; 
import { SubscriptionProvider } from "./src/contexts/SubscriptionContext";
import * as NotificationService from './src/services/NotificationService';
import * as UPIService from './src/services/UpiService';
import { PinLockProvider } from "./src/contexts/PinLockContext";

// Configure notification handler (for foreground notifications)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    // ✅ Initialize app services on start with timeout safety
    const initializeApp = async () => {
      console.log('🚀 App started — Initializing services...');
      
      try {
        // Set timeout to prevent infinite loading
        const initTimeout = setTimeout(() => {
          console.warn('⚠️ App initialization timeout, proceeding anyway');
          setIsAppReady(true);
        }, 10000); // 10 second safety net

        // Request notification permissions (non-blocking)
        NotificationService.requestPermissions().catch(err => 
          console.log('Notification permission error:', err)
        );
        
        // Fetch and cache UPI ID (non-blocking)
        UPIService.fetchMerchantUpiId().catch(err =>
          console.log('UPI fetch error:', err)
        );
        
        clearTimeout(initTimeout);
        console.log('✅ App initialization complete');
        setIsAppReady(true);
      } catch (error) {
        console.error('❌ App initialization error:', error);
        // Still proceed to show app
        setIsAppReady(true);
      }
    };

    initializeApp();
  }, []);

  // ✅ Simple loading screen while app initializes
  if (!isAppReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#1e90ff" />
      </View>
    );
  }

  return (
    <SimpleLanguageProvider>
      <SubscriptionProvider>
        <UserProvider>
          <PinLockProvider>
            <StatusBar
              barStyle={Platform.OS === "ios" ? "dark-content" : "light-content"}
              backgroundColor="#1e90ff"
            />
            <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
              <AppNavigator />
            </SafeAreaView>
          </PinLockProvider>
        </UserProvider>
      </SubscriptionProvider>
    </SimpleLanguageProvider>
  );
}
