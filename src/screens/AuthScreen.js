import React, { useState, useContext } from "react";
import * as NotificationService from '../services/PushNotificationService';
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
import { useAlert } from "../contexts/AlertContext";
import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { ENABLE_I18N, fallbackT } from "../config/i18nConfig";
import { createUserProfile, checkEmailRegistered } from "../config/SupabaseConfig";


export default function AuthScreen({ navigation }) {
  const { theme } = useTheme();
  const { showAlert, showSuccess, showError, showConfirm } = useAlert();
  const { t } = ENABLE_I18N ? useContext(SimpleLanguageContext) : { t: fallbackT };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [merchantUpiId, setMerchantUpiId] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      showError(t("common.validation"), "Please enter email and password");
      return;
    }
    if (password.length < 6) {
      showError(t("common.validation"), "Password must be at least 6 characters");
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        // Log failed login audit
        const AuditService = require('../services/AuditService').default;
        AuditService.logUserAction('LOGIN', {
          action_category: 'AUTH',
          action_status: 'FAILED',
          target_entity_type: 'user',
          target_entity_id: email.trim().toLowerCase(),
          error_message: error.message,
          action_details: {
            login_method: 'EMAIL_PASSWORD',
            email: email.trim().toLowerCase(),
          },
        }).catch(err => console.log("Audit error:", err.message));

        if (error.message.includes("Invalid login credentials")) {
          const emailExists = await checkEmailRegistered(email);
          if (!emailExists) {
            showError(
              "Email Not Found",
              "This email is not registered. Please sign up first."
            );
          } else {
            showError(
              "Invalid Password",
              "The password you entered is incorrect."
            );
          }
        } else if (error.message.includes("Email not confirmed")) {
          showError(
            "Email Not Verified",
            "Please check your email to verify your account before signing in."
          );
        } else {
          showError("Sign In Failed", error.message);
        }
        return;
      }
      
      if (data?.user) {
        // Log successful login audit
        const AuditService = require('../services/AuditService').default;
        AuditService.logUserAction('LOGIN', {
          action_category: 'AUTH',
          action_status: 'SUCCESS',
          target_entity_type: 'user',
          target_entity_id: data.user.id,
          action_details: {
            login_method: 'EMAIL_PASSWORD',
            email: data.user.email,
          },
        }).catch(err => console.log("Audit error:", err.message));

        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.replace("Main");
        }
        setTimeout(() => {
          showSuccess("Sign In Successful", `Welcome back ${data.user.email}!`);
        }, 300);
      }
    } catch (error) {
      console.error("Login error:", error);
      if (
        error.message &&
        (error.message.includes("Network request failed") ||
          error.message.includes("Failed to fetch") ||
          error.message.includes("network"))
      ) {
        showError(
          "Connection Error",
          "Unable to connect. Please check your internet connection."
        );
      } else {
        showError("Sign In Failed", "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
  if (!email || !password || !fullName || !phoneNumber || !businessName) {
    showError(t("common.validation"), "Please fill in all required fields");
    return;
  }
  if (password.length < 6) {
    showError(t("common.validation"), "Password must be at least 6 characters");
    return;
  }
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(phoneNumber)) {
    showError(t("common.validation"), "Please enter a valid 10-digit phone number");
    return;
  }
  
  setLoading(true);
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone_number: phoneNumber.trim(),
          business_name: businessName.trim(),
          business_type: businessType.trim() || null,
          gst_number: gstNumber.trim() || null,
          merchant_upi_id: merchantUpiId.trim() || null,
        },
      },
    });
    
    if (error) throw error;

    if (data?.user) {
      // Create profile with all fields
      const profileResult = await createUserProfile(data.user.id, {
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
        business_name: businessName.trim(),
        business_type: businessType.trim() || null,
        gst_number: gstNumber.trim() || null,
        merchant_upi_id: merchantUpiId.trim() || null,
      });
      
      if (!profileResult.success) {
        console.error("Failed to create profile:", profileResult.error);
        // ⚠️ This is critical - if profile fails, show error but still proceed
        showError("Profile Setup", "Account created but profile setup had an issue. You can update it in settings.");
      }

       await supabase.auth.signOut();

      // Schedule welcome notification
      NotificationService.scheduleWelcomeNotification();

      // Audit log: Successful signup
      const AuditService = require('../services/AuditService').default;
      AuditService.logUserAction('SIGNUP', {
        action_category: 'AUTH',
        action_status: 'SUCCESS',
        target_entity_type: 'user',
        target_entity_id: data.user.id,
        action_details: {
          signup_method: 'EMAIL_PASSWORD',
          email: email.trim().toLowerCase(),
          has_business_name: !!businessName.trim(),
          has_gst: !!gstNumber.trim(),
        },
      }).catch(err => console.log("Audit error:", err.message));

      // ✅ Show success and navigate to Main screen (user is auto-logged in)
      showSuccess(
        "Welcome to UdharKhataPlus!",
        `Account created successfully, ${fullName}!`
      );

      // ✅ Navigate to Main screen after 1 second
       setTimeout(() => {
        setIsSignup(false); // Switch to login view
        setPassword(""); // Clear password for security
        setFullName("");
        setPhoneNumber("");
        setBusinessName("");
        setBusinessType("");
        setGstNumber("");
        setMerchantUpiId("");
        // Email is kept for convenience
      }, 1500);
    }
  } catch (error) {
    console.error("Signup error:", error);
    let errorMessage = error.message;
    if (error.message.includes("already registered") || error.message.includes("User already registered")) {
      errorMessage = "This email is already registered. Please sign in.";
    }
    showError("Signup Failed", errorMessage);
  } finally {
    setLoading(false);
  }
};


  const handleSkip = () => {
    showConfirm(
      "Offline Mode",
      "Continue without cloud sync? Data will only be saved locally.",
      () => navigation.replace("Main")
    );
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
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View
                style={[
                  styles.logoContainer,
                  { backgroundColor: theme.colors.primaryLight },
                ]}
              >
                <Ionicons name="wallet" size={64} color={theme.colors.primary} />
              </View>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                UdharKhataPlus
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                {isSignup ? "Create your business account" : "Sign in to your account"}
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Signup-Only Fields */}
              {isSignup && (
                <>
                  {/* Full Name */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>
                      Full Name <Text style={styles.required}>*</Text>
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
                        name="person"
                        size={20}
                        color={theme.colors.textSecondary}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        placeholder="Your full name"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={fullName}
                        onChangeText={setFullName}
                        autoCapitalize="words"
                        editable={!loading}
                      />
                    </View>
                  </View>

                  {/* Phone Number */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>
                      Phone Number <Text style={styles.required}>*</Text>
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
                        name="call"
                        size={20}
                        color={theme.colors.textSecondary}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        placeholder="10-digit mobile number"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        keyboardType="phone-pad"
                        maxLength={10}
                        editable={!loading}
                      />
                    </View>
                  </View>

                  {/* Business Name */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>
                      Business Name <Text style={styles.required}>*</Text>
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
                        name="storefront"
                        size={20}
                        color={theme.colors.textSecondary}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        placeholder="Your shop/business name"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={businessName}
                        onChangeText={setBusinessName}
                        autoCapitalize="words"
                        editable={!loading}
                      />
                    </View>
                  </View>

                  {/* Business Type (Optional) */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>
                      Business Type <Text style={styles.optional}>(Optional)</Text>
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
                        name="briefcase"
                        size={20}
                        color={theme.colors.textSecondary}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        placeholder="e.g., Retail, Wholesale, Services"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={businessType}
                        onChangeText={setBusinessType}
                        autoCapitalize="words"
                        editable={!loading}
                      />
                    </View>
                  </View>

                  {/* Merchant UPI ID (Optional)
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>
                      Merchant UPI ID <Text style={styles.optional}>(Optional)</Text>
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
                        name="card"
                        size={20}
                        color={theme.colors.textSecondary}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        placeholder="e.g., merchant@upi"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={merchantUpiId}
                        onChangeText={setMerchantUpiId}
                        autoCapitalize="none"
                        editable={!loading}
                      />
                    </View>
                  </View> */}

                  {/* GST Number (Optional) */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>
                      GST Number <Text style={styles.optional}>(Optional)</Text>
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
                        name="document-text"
                        size={20}
                        color={theme.colors.textSecondary}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        placeholder="15-digit GST number"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={gstNumber}
                        onChangeText={(text) => setGstNumber(text.toUpperCase())}
                        autoCapitalize="characters"
                        maxLength={15}
                        editable={!loading}
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Email Input (Common for both) */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  Email <Text style={styles.required}>*</Text>
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
                    placeholder="your@email.com"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Password Input (Common for both) */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  Password <Text style={styles.required}>*</Text>
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
                    placeholder={isSignup ? "At least 6 characters" : "Enter password"}
                    placeholderTextColor={theme.colors.textTertiary}
                    value={password}
                    onChangeText={setPassword}
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

              {/* Forgot Password Button - Only show on login */}
              {!isSignup && (
                <TouchableOpacity
                  style={{ marginTop: 2, marginBottom: 8, alignSelf: "flex-end" }}
                  onPress={() => navigation.navigate("ForgotPassword")}
                  disabled={loading}
                >
                  <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              )}

              {/* Login/Signup Button */}
              <TouchableOpacity
                style={[
                  styles.authButton,
                  { backgroundColor: theme.colors.primary },
                  loading && styles.authButtonDisabled,
                ]}
                onPress={isSignup ? handleSignup : handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons 
                      name={isSignup ? "person-add" : "log-in"} 
                      size={20} 
                      color="#fff" 
                    />
                    <Text style={styles.authButtonText}>
                      {isSignup ? "Create Account" : "Sign In"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Toggle between Login and Signup */}
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setIsSignup(!isSignup)}
                disabled={loading}
              >
                <Text style={[styles.toggleText, { color: theme.colors.textSecondary }]}>
                  {isSignup ? "Already have an account? " : "Don't have an account? "}
                </Text>
                <Text style={[styles.toggleLink, { color: theme.colors.primary }]}>
                  {isSignup ? "Sign In" : "Sign Up"}
                </Text>
              </TouchableOpacity>

              {/* Info Box */}
              <View style={[
                styles.contactBox,
                { backgroundColor: theme.isDarkMode ? '#1e3a5f' : '#eff6ff' }
              ]}>
                <Ionicons name="information-circle" size={18} color="#2563eb" />
                <Text style={styles.contactText}>
                  {isSignup
                    ? "Your business details will be used for reports and invoices."
                    : "Sign in to enable cloud backup and multi-device access."}
                </Text>
              </View>

              {/* Skip Button */}
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkip}
                disabled={loading}
              >
                <Text
                  style={[styles.skipText, { color: theme.colors.textSecondary }]}
                >
                  Continue Offline
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
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
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
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
  },
  required: {
    color: "#ef4444",
  },
  optional: {
    color: "#94a3b8",
    fontSize: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  authButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
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
    opacity: 0.6,
  },
  authButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  toggleButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "500",
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: "700",
  },
  contactBox: {
    flexDirection: "row",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    gap: 10,
  },
  contactText: {
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "500",
    flex: 1,
    lineHeight: 16,
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  skipText: {
    fontSize: 14,
    textDecorationLine: "underline",
    fontWeight: "600",
  },
});
