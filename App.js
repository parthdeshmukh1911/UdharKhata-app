// App.js - SIMPLIFIED VERSION

import React from "react";
import { StatusBar, SafeAreaView, Platform } from "react-native";
import * as Notifications from 'expo-notifications';
import { SimpleLanguageProvider } from "./src/contexts/SimpleLanguageContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { UserProvider } from './src/contexts/UserContext'; 
import { SubscriptionProvider } from "./src/contexts/SubscriptionContext";
import { PinLockProvider } from "./src/contexts/PinLockContext";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  // ✅ REMOVED: All initialization logic (move to AppNavigator)
  // ✅ REMOVED: isAppReady state
  
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
