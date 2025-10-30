// src/screens/AuthScreen.js

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../config/SupabaseConfig";

export default function AuthScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Validation Error", "Please fill all fields");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Validation Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        // ✅ SIGN IN
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // ✅ Show success alert and redirect
        if (data?.user) {
          Alert.alert(
            "✅ Sign In Successful!",
            `Welcome back, ${data.user.email}!`,
            [
              {
                text: "OK",
                onPress: () => {
                  // Navigate back to Summary
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.replace("Main");
                  }
                },
              },
            ]
          );
        }
      } else {
        // ✅ SIGN UP (no email verification message)
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        // ✅ Just switch to login mode after sign-up
        if (data?.user) {
          setIsLogin(true);
          setEmail("");
          setPassword("");
          Alert.alert(
            "✅ Account Created!",
            "You can now sign in with your credentials.",
            [{ text: "OK" }]
          );
        }
      }
    } catch (error) {
      // User-friendly error messages
      let errorMessage = error.message;

      if (error.message.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "Please verify your email before signing in.";
      } else if (error.message.includes("User already registered")) {
        errorMessage =
          "This email is already registered. Please sign in instead.";
      }

      Alert.alert(isLogin ? "Sign In Failed" : "Sign Up Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      "Offline Mode",
      "Continue without cloud sync? Your data will only be stored on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue Offline",
          onPress: () => navigation.replace("Main"),
          style: "destructive",
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="wallet" size={64} color="#1e40af" />
          </View>
          <Text style={styles.title}>UdharKhata</Text>
          <Text style={styles.subtitle}>
            {isLogin
              ? "Sign in to sync across devices"
              : "Create account to get started"}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail"
                size={20}
                color="#64748b"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#94a3b8"
                editable={!loading}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed"
                size={20}
                color="#64748b"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="#94a3b8"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>
            {!isLogin && <Text style={styles.hint}>Minimum 6 characters</Text>}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.authButton, loading && styles.authButtonDisabled]}
            onPress={handleAuth}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={isLogin ? "log-in" : "person-add"}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.authButtonText}>
                  {isLogin ? "Sign In" : "Sign Up"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Toggle Sign In/Up */}
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setIsLogin(!isLogin)}
            disabled={loading}
          >
            <Text style={styles.toggleText}>
              {isLogin
                ? "Don't have an account? "
                : "Already have an account? "}
              <Text style={styles.toggleTextBold}>
                {isLogin ? "Sign Up" : "Sign In"}
              </Text>
            </Text>
          </TouchableOpacity>

          {/* Skip Button */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={loading}
          >
            <Text style={styles.skipText}>Continue Offline</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#1e40af",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    fontWeight: "500",
  },

  // Form
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "500",
  },
  hint: {
    fontSize: 12,
    color: "#94a3b8",
    marginLeft: 4,
    marginTop: 4,
  },

  // Auth Button
  authButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e40af",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#1e40af",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  authButtonDisabled: {
    backgroundColor: "#94a3b8",
  },
  authButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Toggle
  toggleButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  toggleText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  toggleTextBold: {
    fontWeight: "700",
    color: "#1e40af",
  },

  // Skip
  skipButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  skipText: {
    fontSize: 14,
    color: "#64748b",
    textDecorationLine: "underline",
    fontWeight: "600",
  },
});
