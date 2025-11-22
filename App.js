/**
 * App.js
 * Entry point for KhataBookOffline React Native App
 * Includes AppNavigator with modern consistent UI
 * Now with Google Drive backup support
 */

import React, { useEffect } from "react";
import { StatusBar, SafeAreaView, Platform } from "react-native";
import * as Notifications from 'expo-notifications';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
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
  useEffect(() => {
    // ✅ Initialize app services on start
    const initializeApp = async () => {
      console.log('🚀 App started — Initializing services...');
      
      // Configure Google Sign-In for Drive backup
      GoogleSignin.configure({
        webClientId: '265485882260-94rtt606h402souk39ept0kogn14h25u.apps.googleusercontent.com', // TODO: Replace with your actual Web Client ID
        scopes: [
          'https://www.googleapis.com/auth/drive.appdata',  // Access to appDataFolder
          'https://www.googleapis.com/auth/drive.file'      // Access to files created by app
        ],
        offlineAccess: true,  // Required for background photo sync
        forceCodeForRefreshToken: true,  // Ensures refresh tokens are always provided
      });
      console.log('✅ Google Sign-In configured');
      
      // Request notification permissions
      await NotificationService.requestPermissions();
      
      // Fetch and cache UPI ID
      await UPIService.fetchMerchantUpiId();
      
      console.log('✅ App initialization complete');
    };

    initializeApp();
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
