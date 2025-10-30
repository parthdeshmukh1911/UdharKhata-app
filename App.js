/**
 * App.js
 * Entry point for KhataBookOffline React Native App
 * Includes AppNavigator with modern consistent UI
 */

import React from "react";
import { StatusBar, SafeAreaView, Platform } from "react-native";
import { SimpleLanguageProvider } from "./src/contexts/SimpleLanguageContext";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <SimpleLanguageProvider>
      <StatusBar
        barStyle={Platform.OS === "ios" ? "dark-content" : "light-content"}
        backgroundColor="#1e90ff"
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
        <AppNavigator />
      </SafeAreaView>
    </SimpleLanguageProvider>
  );
}