// src/screens/AddCustomerScreen.js

import React, { useState, useContext, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CustomerContext } from "../contexts/CustomerContext";
import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { ENABLE_I18N, fallbackT } from "../config/i18nConfig";
import { ValidationUtils } from "../Utils/ValidationUtils";
import { useTheme } from "../contexts/ThemeContext";
import { useAlert } from "../contexts/AlertContext";
import { useFocusEffect } from "@react-navigation/native";
import { 
  FontSizes, 
  Spacing, 
  IconSizes, 
  ButtonSizes, 
  BorderRadius 
} from "../Utils/Responsive";

export default function AddCustomerScreen({ navigation, route }) {
  const {
    allCustomers,
    subscription,
    canAddMoreCustomers,
    getRemainingCustomers,
    addCustomer: contextAddCustomer,
    refreshCustomers,
  } = useContext(CustomerContext);

  const { t } = ENABLE_I18N ? useContext(SimpleLanguageContext) : { t: fallbackT };
  const { theme } = useTheme();
  const { showAlert, showSuccess, showError } = useAlert();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceInputUsed, setVoiceInputUsed] = useState(false);

  // Validation states
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [nameValid, setNameValid] = useState(false);
  const [phoneValid, setPhoneValid] = useState(false);

  // Get limit info
  const canAdd = canAddMoreCustomers();
  const remaining = getRemainingCustomers();
  const isFreeUser = subscription?.plan_type === "free";

  // State for customer counts
  const [activeCount, setActiveCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [settledCount, setSettledCount] = useState(0);

  // Function to calculate counts
  const calculateCounts = useCallback(() => {
    const active = (allCustomers || []).filter((c) => {
      const balance = c["Total Balance"];
      return balance != null && Number(balance) !== 0;
    }).length;

    const total = allCustomers?.length || 0;
    const settled = total - active;

    setActiveCount(active);
    setTotalCount(total);
    setSettledCount(settled);
  }, [allCustomers]);

  // Calculate on mount and when allCustomers changes
  useEffect(() => {
    calculateCounts();
  }, [calculateCounts]);

  // ✅ NEW: Handle prefilled voice input data
  useEffect(() => {
    if (route.params?.voiceInput) {
      const { customerName, phoneNumber } = route.params.voiceInput;
      
      if (customerName) {
        setName(customerName);
        setVoiceInputUsed(true);
        
        // Validate name
        if (customerName.trim().length > 0) {
          if (!ValidationUtils.checkDuplicateName(allCustomers, customerName)) {
            setNameError("");
            setNameValid(true);
          } else {
            setNameError(t("customer.nameAlreadyExists"));
            setNameValid(false);
          }
        }
      }

      if (phoneNumber) {
        setPhone(phoneNumber);
        
        // Validate phone
        const validation = ValidationUtils.validatePhone(phoneNumber);
        if (validation.isValid) {
          if (!ValidationUtils.checkDuplicatePhone(allCustomers, phoneNumber)) {
            setPhoneError("");
            setPhoneValid(true);
          } else {
            setPhoneError(t("customer.phoneAlreadyExists"));
            setPhoneValid(false);
          }
        } else {
          setPhoneError(t(validation.message));
          setPhoneValid(false);
        }
      }

      // Clear the route params to avoid re-triggering on screen focus
      navigation.setParams({ voiceInput: undefined });
    }
  }, [route.params?.voiceInput, allCustomers, navigation, t]);

  // Force refresh customer data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshAndCalculate = async () => {
        if (refreshCustomers) {
          await refreshCustomers();
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
        calculateCounts();
      };
      refreshAndCalculate();
    }, [calculateCounts, refreshCustomers])
  );

  // Real-time validation for name
  const handleNameChange = (text) => {
    setName(text);
    if (text.trim().length === 0) {
      setNameError("");
      setNameValid(false);
    } else if (ValidationUtils.checkDuplicateName(allCustomers, text)) {
      setNameError(t("customer.nameAlreadyExists"));
      setNameValid(false);
    } else {
      setNameError("");
      setNameValid(true);
    }
  };

  // Real-time validation for phone
  const handlePhoneChange = (text) => {
    const cleaned = ValidationUtils.normalizePhone(text);
    setPhone(cleaned);

    // Run validation using ValidationUtils
    const validation = ValidationUtils.validatePhone(cleaned);

    // If not valid, show error and mark invalid
    if (!validation.isValid) {
      setPhoneError(t(validation.message));
      setPhoneValid(false);
      return;
    }

    // Check for duplicate phone in allCustomers
    if (ValidationUtils.checkDuplicatePhone(allCustomers, cleaned)) {
      setPhoneError(t("customer.phoneAlreadyExists"));
      setPhoneValid(false);
      return;
    }

    // No errors and valid phone
    setPhoneError("");
    setPhoneValid(true);
  };

  const handleSave = async () => {
    if (isSubmitting) return;

    // ✅ Check limit first - Custom Alert
    if (!canAdd) {
      showAlert({
        title: '⚠️ Active Customer Limit Reached',
        message: `You have 20 customers with active balance (non-zero).\n\n💡 Settled customers (₹0 balance) don't count toward your limit.\n\nYou currently have:\n• ${activeCount} active customers\n• ${settledCount} settled customers\n\nTo add more customers:\n• Settle some active accounts to ₹0, or\n• Upgrade to Premium for unlimited`,
        type: 'warning',
        buttons: [
          { text: 'Cancel', style: 'secondary' },
          {
            text: 'Upgrade to Premium',
            style: 'primary',
            onPress: () => navigation.navigate('Settings'),
          },
        ],
      });
      return;
    }

    // Final validation
    if (!name.trim()) {
      setNameError(t("customer.nameIsRequired"));
      return;
    }

    // ✅ Validation error - Custom Alert
    if (!nameValid || !phoneValid) {
      showError(
        t("common.validation"),
        t("customer.correctErrors")
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerName: name.trim(),
        phoneNumber: phone,
        address: address.trim(),
      };

      const result = await contextAddCustomer(payload);

      if (result.success) {
        // ✅ Success - Custom Alert
        showSuccess(
          t("common.success"),
          t("customer.customerAddedSuccessfully"),
          () => {
            // Clear form
            setName("");
            setPhone("");
            setAddress("");
            setVoiceInputUsed(false);
            navigation.navigate("Customers", { refresh: true });
          }
        );
      }
    } catch (error) {
      if (error.message === "LIMIT_REACHED") {
        // ✅ Limit reached error - Custom Alert
        showAlert({
          title: '⚠️ Active Customer Limit Reached',
          message: `You have 20 active customers (non-zero balance).\n\nSettled customers (₹0 balance) don't count.\n\nOptions:\n• Settle some accounts to ₹0\n• Upgrade to Premium for unlimited`,
          type: 'warning',
          buttons: [
            { text: 'Cancel', style: 'secondary' },
            {
              text: 'Upgrade to Premium',
              style: 'primary',
              onPress: () => navigation.navigate('Settings'),
            },
          ],
        });
      } else {
        // ✅ Generic error - Custom Alert
        showError(
          t("common.error"),
          error.message || t("common.somethingWentWrong")
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = nameValid && phoneValid;
  const remainingDigits = 10 - phone.length;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ✅ Voice Input Used Banner */}
        {voiceInputUsed && (
          <View
            style={[
              styles.voiceInputBanner,
              {
                backgroundColor: theme.isDarkMode ? "#064e3b" : "#f0fdf4",
                borderColor: theme.isDarkMode ? "#059669" : "#bbf7d0",
              },
            ]}
          >
            <Ionicons name="mic" size={IconSizes.medium} color="#059669" />
            <View style={styles.voiceContent}>
              <Text
                maxFontSizeMultiplier={1.3}
                style={[
                  styles.voiceTitle,
                  { color: theme.isDarkMode ? "#86efac" : "#15803d" },
                ]}
              >
                Voice Input Detected ✓
              </Text>
              <Text
                maxFontSizeMultiplier={1.3}
                style={[
                  styles.voiceText,
                  { color: theme.isDarkMode ? "#6ee7b7" : "#16a34a" },
                ]}
              >
                Fields pre-filled from voice input. Review and edit if needed.
              </Text>
            </View>
          </View>
        )}

        {/* Warning Banner */}
        {isFreeUser && remaining <= 10 && remaining > 0 && (
          <View
            style={[
              styles.warningBanner,
              {
                backgroundColor: theme.isDarkMode ? "#7c2d12" : "#fed7aa",
              },
            ]}
          >
            <Ionicons name="warning" size={IconSizes.medium} color="#ea580c" />
            <View style={styles.warningContent}>
              <Text
                maxFontSizeMultiplier={1.3}
                style={[
                  styles.warningTitle,
                  { color: theme.isDarkMode ? "#fdba74" : "#b45309" },
                ]}
              >
                Approaching Active Customer Limit ⚠️
              </Text>
              <Text
                maxFontSizeMultiplier={1.3}
                style={[
                  styles.warningText,
                  { color: theme.isDarkMode ? "#fed7aa" : "#92400e" },
                ]}
              >
                Only {remaining} active slots left. {totalCount} total (
                {settledCount} settled don't count).
              </Text>
            </View>
          </View>
        )}

        {/* Error Banner */}
        {isFreeUser && remaining === 0 && (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: theme.isDarkMode ? "#7f1d1d" : "#fee2e2",
              },
            ]}
          >
            <Ionicons name="close-circle" size={IconSizes.medium} color="#dc2626" />
            <View style={styles.warningContent}>
              <Text
                maxFontSizeMultiplier={1.3}
                style={[
                  styles.errorTitle,
                  { color: theme.isDarkMode ? "#fca5a5" : "#991b1b" },
                ]}
              >
                Active Customer Limit Reached 🚫
              </Text>
              <Text
                maxFontSizeMultiplier={1.3}
                style={[
                  styles.errorText,
                  { color: theme.isDarkMode ? "#fee2e2" : "#7f1d1d" },
                ]}
              >
                20 active customers (non-zero balance). Settle accounts or
                upgrade.
              </Text>
            </View>
          </View>
        )}

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
              name="person-add"
              size={IconSizes.large}
              color={theme.colors.primary}
            />
          </View>
          <Text
            maxFontSizeMultiplier={1.3}
            style={[styles.headerTitle, { color: theme.colors.text }]}
          >
            {t("customer.addNewCustomer")}
          </Text>
          <Text
            maxFontSizeMultiplier={1.3}
            style={[
              styles.headerSubtitle,
              { color: theme.colors.textSecondary },
            ]}
          >
            {t("customer.enterCustomerDetails")}
          </Text>

          {/* Customer Count Badge */}
          {isFreeUser && (
            <View
              style={[
                styles.customerCountBadge,
                {
                  backgroundColor: theme.isDarkMode
                    ? remaining === 0
                      ? "#7f1d1d"
                      : remaining <= 10
                      ? "#7c2d12"
                      : "#064e3b"
                    : remaining === 0
                    ? "#fee2e2"
                    : remaining <= 10
                    ? "#fed7aa"
                    : "#f0fdf4",
                },
              ]}
            >
              <Text
                maxFontSizeMultiplier={1.2}
                style={[
                  styles.customerCountText,
                  {
                    color: theme.isDarkMode
                      ? remaining === 0
                        ? "#fca5a5"
                        : remaining <= 10
                        ? "#fdba74"
                        : "#86efac"
                      : remaining === 0
                      ? "#991b1b"
                      : remaining <= 10
                      ? "#b45309"
                      : "#15803d",
                  },
                ]}
              >
                {activeCount}/20 active • {totalCount} total
              </Text>
            </View>
          )}
        </View>

        {/* Form Card */}
        <View
          style={[
            styles.formCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            maxFontSizeMultiplier={1.3}
            style={[styles.sectionTitle, { color: theme.colors.text }]}
          >
            {t("customer.customerInformation")}
          </Text>

          {/* Customer Name Input */}
          <View style={styles.inputGroup}>
            <Text
              maxFontSizeMultiplier={1.3}
              style={[styles.label, { color: theme.colors.text }]}
            >
              {t("customer.customerName")}{" "}
              <Text style={styles.required}>*</Text>
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
                nameError && { borderColor: "#dc2626" },
                nameValid && !nameError && { borderColor: "#059669" },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={IconSizes.medium}
                color={
                  nameError
                    ? "#dc2626"
                    : nameValid
                    ? "#059669"
                    : theme.colors.textSecondary
                }
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={name}
                onChangeText={handleNameChange}
                placeholder={t("customer.enterName")}
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="words"
                returnKeyType="next"
                maxFontSizeMultiplier={1.3}
              />
              {nameValid && (
                <Ionicons name="checkmark-circle" size={IconSizes.medium} color="#059669" />
              )}
              {nameError && (
                <Ionicons name="close-circle" size={IconSizes.medium} color="#dc2626" />
              )}
            </View>
            {nameError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={IconSizes.small} color="#dc2626" />
                <Text maxFontSizeMultiplier={1.3} style={styles.errorText}>
                  {nameError}
                </Text>
              </View>
            ) : nameValid ? (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={IconSizes.small} color="#059669" />
                <Text maxFontSizeMultiplier={1.3} style={styles.successText}>
                  {t("customer.nameAvailable")}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Phone Number Input */}
          <View style={styles.inputGroup}>
            <Text
              maxFontSizeMultiplier={1.3}
              style={[styles.label, { color: theme.colors.text }]}
            >
              {t("customer.phoneNumber")}{" "}
              <Text style={styles.required}>*</Text>
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
                phoneError && { borderColor: "#dc2626" },
                phoneValid && !phoneError && { borderColor: "#059669" },
              ]}
            >
              <Ionicons
                name="call-outline"
                size={IconSizes.medium}
                color={
                  phoneError
                    ? "#dc2626"
                    : phoneValid
                    ? "#059669"
                    : theme.colors.textSecondary
                }
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={phone}
                onChangeText={handlePhoneChange}
                placeholder={t("customer.enterPhone")}
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="phone-pad"
                maxLength={10}
                returnKeyType="next"
                maxFontSizeMultiplier={1.3}
              />
              {phoneValid && (
                <Ionicons name="checkmark-circle" size={IconSizes.medium} color="#059669" />
              )}
              {phoneError && (
                <Ionicons name="close-circle" size={IconSizes.medium} color="#dc2626" />
              )}
            </View>
            {phoneError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={IconSizes.small} color="#dc2626" />
                <Text maxFontSizeMultiplier={1.3} style={styles.errorText}>
                  {phoneError}
                </Text>
              </View>
            ) : phoneValid ? (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={IconSizes.small} color="#059669" />
                <Text maxFontSizeMultiplier={1.3} style={styles.successText}>
                  {t("customer.phoneValid")}
                </Text>
              </View>
            ) : phone.length > 0 && phone.length < 10 ? (
              <Text
                maxFontSizeMultiplier={1.3}
                style={[
                  styles.helperText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {remainingDigits}{" "}
                {remainingDigits === 1
                  ? t("customer.digitRemaining")
                  : t("customer.digitsRemaining")}
              </Text>
            ) : null}
          </View>

          {/* Address Input (Optional) */}
          <View style={styles.inputGroup}>
            <Text
              maxFontSizeMultiplier={1.3}
              style={[styles.label, { color: theme.colors.text }]}
            >
              {t("customer.address")}{" "}
              <Text
                style={[styles.optional, { color: theme.colors.textSecondary }]}
              >
                ({t("customer.optional")})
              </Text>
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
                name="location-outline"
                size={IconSizes.medium}
                color={theme.colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { color: theme.colors.text },
                ]}
                value={address}
                onChangeText={setAddress}
                placeholder={t("customer.enterAddress")}
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                returnKeyType="done"
                maxFontSizeMultiplier={1.3}
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: theme.colors.primary },
              (!isFormValid || isSubmitting || !canAdd) &&
                styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!isFormValid || isSubmitting || !canAdd}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={canAdd ? "checkmark-circle" : "lock-closed"}
                  size={IconSizes.large}
                  color="#fff"
                />
                <Text maxFontSizeMultiplier={1.3} style={styles.saveButtonText}>
                  {canAdd ? t("common.save") : "Limit Reached"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Form Status Indicator */}
        {isFormValid && (
          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: theme.isDarkMode ? "#064e3b" : "#f0fdf4",
                borderColor: theme.isDarkMode ? "#059669" : "#bbf7d0",
              },
            ]}
          >
            <Ionicons name="shield-checkmark" size={IconSizes.large} color="#059669" />
            <View style={styles.statusContent}>
              <Text
                maxFontSizeMultiplier={1.3}
                style={[
                  styles.statusTitle,
                  { color: theme.isDarkMode ? "#86efac" : "#15803d" },
                ]}
              >
                {t("customer.readyToSubmit")}
              </Text>
              <Text
                maxFontSizeMultiplier={1.3}
                style={[
                  styles.statusText,
                  { color: theme.isDarkMode ? "#6ee7b7" : "#16a34a" },
                ]}
              >
                {t("customer.allFieldsValid")}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },

  // ✅ Voice Input Banner
  voiceInputBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: "#059669",
  },
  voiceContent: {
    flex: 1,
  },
  voiceTitle: {
    fontSize: FontSizes.medium,
    fontWeight: "700",
    marginBottom: 2,
  },
  voiceText: {
    fontSize: FontSizes.small,
    fontWeight: "500",
  },

  // Warning Banner
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: FontSizes.medium,
    fontWeight: "700",
    marginBottom: 2,
  },
  warningText: {
    fontSize: FontSizes.small,
    fontWeight: "500",
  },

  // Error Banner
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  errorTitle: {
    fontSize: FontSizes.medium,
    fontWeight: "700",
    marginBottom: 2,
  },
  errorText: {
    fontSize: FontSizes.small,
    fontWeight: "500",
  },

  // Customer count badge
  customerCountBadge: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.medium,
    alignSelf: "center",
  },
  customerCountText: {
    fontSize: FontSizes.small,
    fontWeight: "700",
  },

  // Header Section
  headerSection: {
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  headerIcon: {
    width: IconSizes.xlarge * 1.5,
    height: IconSizes.xlarge * 1.5,
    borderRadius: IconSizes.xlarge * 0.75,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.xlarge,
    fontWeight: "700",
    marginBottom: Spacing.xs,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: FontSizes.small,
    textAlign: "center",
    fontWeight: "500",
  },

  // Form Card
  formCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.xlarge,
    padding: Spacing.xl,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#1e293b",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: FontSizes.large,
    fontWeight: "700",
    marginBottom: Spacing.xl,
    letterSpacing: -0.2,
  },

  // Input Group
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: FontSizes.medium,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    letterSpacing: 0.1,
  },
  required: {
    color: "#dc2626",
  },
  optional: {
    fontWeight: "500",
    fontSize: FontSizes.small,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: BorderRadius.large,
    paddingHorizontal: Spacing.md,
    minHeight: ButtonSizes.large,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSizes.regular,
    fontWeight: "500",
    paddingVertical: 0,
  },
  textArea: {
    minHeight: 80,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },

  // Validation Messages
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    gap: 4,
  },
  errorText: {
    fontSize: FontSizes.small,
    color: "#dc2626",
    fontWeight: "500",
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    gap: 4,
  },
  successText: {
    fontSize: FontSizes.small,
    color: "#059669",
    fontWeight: "500",
  },
  helperText: {
    fontSize: FontSizes.tiny,
    marginTop: Spacing.sm,
    fontWeight: "500",
  },

  // Save Button
  saveButton: {
    flexDirection: "row",
    height: ButtonSizes.xlarge,
    borderRadius: BorderRadius.large,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: FontSizes.large,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },

  // Status Card
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    gap: Spacing.md,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: FontSizes.regular,
    fontWeight: "700",
    marginBottom: 2,
  },
  statusText: {
    fontSize: FontSizes.small,
    fontWeight: "500",
  },
});
