/**
 * App.js
 * Entry point for KhataBookOffline React Native App
 * Includes AppNavigator with modern consistent UI
 */

import React, { useEffect } from "react";
import { StatusBar, SafeAreaView, Platform } from "react-native";
import * as Notifications from 'expo-notifications';
import { SimpleLanguageProvider } from "./src/contexts/SimpleLanguageContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { UserProvider } from './src/contexts/UserContext'; 
import { SubscriptionProvider } from "./src/contexts/SubscriptionContext";
import * as NotificationService from './src/services/NotificationService';
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
  useEffect(() => {
    // Request notification permissions on app start
    NotificationService.requestPermissions();
  }, []);

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
