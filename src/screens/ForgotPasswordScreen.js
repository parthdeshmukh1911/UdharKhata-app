// src/screens/ForgotPasswordScreen.js

import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../config/SupabaseConfig";
import { useTheme } from "../contexts/ThemeContext";
import { useAlert } from "../contexts/AlertContext"; // ✅ Add custom alerts
import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { ENABLE_I18N, fallbackT } from "../config/i18nConfig";

export default function ForgotPasswordScreen({ navigation }) {
  const { theme } = useTheme();
  const { showAlert, showSuccess, showError } = useAlert(); // ✅ Add custom alerts
  const { t } = ENABLE_I18N
    ? useContext(SimpleLanguageContext)
    : { t: fallbackT };

  const [step, setStep] = useState(1); // 1: email, 2: OTP + new password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSendOTP = async () => {
    // ✅ Validation with custom alert
    if (!email) {
      showError("Error", "Please enter your email");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        // ✅ Error with custom alert
        showError("Error", error.message);
        setLoading(false);
        return;
      }

      // Audit log: Password reset request
      const AuditService = require('../services/AuditService').default;
      AuditService.logUserAction('PASSWORD_RESET_REQUEST', {
        action_category: 'AUTH',
        action_status: 'SUCCESS',
        target_entity_type: 'user',
        target_entity_id: email.trim().toLowerCase(),
        action_details: {
          email: email.trim().toLowerCase(),
        },
      }).catch(err => console.log('Audit error:', err.message));

      // ✅ Success with custom alert
      showSuccess(
        "Code Sent!",
        "Check your email for the 6-digit reset code.",
        () => setStep(2)
      );
    } catch (error) {
      // ✅ Error with custom alert
      showError("Error", "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    // ✅ Validation with custom alerts
    if (!otp || !newPassword || !confirmPassword) {
      showError("Error", "Please fill all fields");
      return;
    }

    if (newPassword.length < 6) {
      showError("Error", "Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      showError("Error", "Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      // Verify OTP and update password
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "recovery",
      });

      if (error) {
        // ✅ Error with custom alert
        showError("Error", "Invalid or expired code");
        setLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        // ✅ Error with custom alert
        showError("Error", updateError.message);
        setLoading(false);
        return;
      }

      // Sign out
      await supabase.auth.signOut();

      // Audit log: Password reset complete
      const AuditService = require('../services/AuditService').default;
      AuditService.logUserAction('PASSWORD_RESET_COMPLETE', {
        action_category: 'AUTH',
        action_status: 'SUCCESS',
        target_entity_type: 'user',
        target_entity_id: email.trim().toLowerCase(),
        action_details: {
          email: email.trim().toLowerCase(),
        },
      }).catch(err => console.log('Audit error:', err.message));

      // ✅ Success with custom alert
      showSuccess(
        "Success!",
        "Password updated successfully. Please sign in.",
        () => navigation.replace("Auth")
      );
    } catch (error) {
      // ✅ Error with custom alert
      showError("Error", "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["left", "right"]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View
            style={[
              styles.headerSection,
              {
                backgroundColor: theme.colors.surface,
                borderBottomColor: theme.colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.headerIcon,
                { backgroundColor: theme.colors.primaryLight },
              ]}
            >
              <Ionicons
                name="key"
                size={32}
                color={theme.colors.primary}
              />
            </View>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {step === 1 ? t("auth.forgotPassword") : t("auth.resetPassword")}
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}
            >
              {step === 1
                ? t("auth.forgotPasswordSubtitle")
                : t("auth.resetPasswordSubtitle")}
            </Text>
          </View>

          <View style={styles.content}>
            <View style={styles.form}>
              {step === 1 ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>
                      {t("common.email")}
                    </Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="mail"
                        size={20}
                        color={theme.colors.textSecondary}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        placeholder={t("auth.emailPlaceholder")}
                        placeholderTextColor={theme.colors.textTertiary}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!loading}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.button,
                      { backgroundColor: theme.colors.primary },
                      loading && styles.buttonDisabled,
                    ]}
                    onPress={handleSendOTP}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="mail" size={20} color="#fff" />
                        <Text style={styles.buttonText}>
                          {t("auth.sendResetCode")}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>
                      {t("auth.resetCode")}
                    </Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="keypad"
                        size={20}
                        color={theme.colors.textSecondary}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        placeholder={t("auth.enterResetCode")}
                        placeholderTextColor={theme.colors.textTertiary}
                        value={otp}
                        onChangeText={setOtp}
                        keyboardType="number-pad"
                        maxLength={6}
                        editable={!loading}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>
                      {t("auth.newPassword")}
                    </Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="lock-closed"
                        size={20}
                        color={theme.colors.textSecondary}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        placeholder={t("auth.enterNewPassword")}
                        placeholderTextColor={theme.colors.textTertiary}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showPassword}
                        editable={!loading}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        <Ionicons
                          name={showPassword ? "eye-off" : "eye"}
                          size={20}
                          color={theme.colors.textTertiary}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>
                      {t("auth.confirmPassword")}
                    </Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="lock-closed"
                        size={20}
                        color={theme.colors.textSecondary}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        placeholder={t("auth.confirmNewPassword")}
                        placeholderTextColor={theme.colors.textTertiary}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showPassword}
                        editable={!loading}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.button,
                      { backgroundColor: theme.colors.primary },
                      loading && styles.buttonDisabled,
                    ]}
                    onPress={handleResetPassword}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#fff"
                        />
                        <Text style={styles.buttonText}>
                          {t("auth.resetPassword")}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.backText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t("auth.backToSignIn")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },

  // Header Section
  headerSection: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },

  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 16,
    gap: 10,
    marginTop: 8,
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
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  backButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  backText: {
    fontSize: 14,
    textDecorationLine: "underline",
    fontWeight: "600",
  },
});
