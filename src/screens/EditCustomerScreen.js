// src/screens/EditCustomerScreen.js

import React, { useState, useEffect, useContext } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import SQLiteService from "../services/SQLiteService";
import { CustomerContext } from "../contexts/CustomerContext";
import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { ENABLE_I18N, fallbackT } from "../config/i18nConfig";
import { ValidationUtils } from "../Utils/ValidationUtils";
import { DisplayHelpers } from "../Utils/DisplayHelpers";
import { useTheme } from "../contexts/ThemeContext";
import { useAlert } from "../contexts/AlertContext";
import {
  FontSizes,
  Spacing,
  IconSizes,
  ButtonSizes,
  BorderRadius,
} from "../Utils/Responsive";

export default function EditCustomerScreen({ route, navigation }) {
  const { customer } = route.params;
  const { refreshCustomers, allCustomers } = useContext(CustomerContext);

  // Unconditional i18n hook pattern for stability
  const ctx = useContext(SimpleLanguageContext);
  const t = ENABLE_I18N && ctx?.t ? ctx.t : fallbackT;

  const { theme } = useTheme();
  const { showSuccess, showError } = useAlert();

  const [customerId, setCustomerId] = useState("");
  const [displayId, setDisplayId] = useState("");
  const [balance, setBalance] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [nameValid, setNameValid] = useState(true);
  const [phoneValid, setPhoneValid] = useState(true);
  
  // ✅ ADD: Track if phone field has been touched
  const [phoneTouched, setPhoneTouched] = useState(false);

  useEffect(() => {
    if (customer) {
      setCustomerId(customer.id || customer["Customer ID"] || "");
      setDisplayId(customer["Display ID"] || "");
      setBalance(String(customer["Total Balance"] ?? 0));
      setName(customer.name || customer["Customer Name"] || "");
      setPhone(String(customer.phone || customer["Phone Number"] || ""));
      setAddress(customer.address || customer["Address"] || "");
    }
  }, [customer]);

  const handleNameChange = (text) => {
    setName(text);
    if (text.trim().length === 0) {
      setNameError(t("customer.nameIsRequired"));
      setNameValid(false);
    } else if (ValidationUtils.checkDuplicateName(allCustomers, text, customerId)) {
      setNameError(t("customer.nameAlreadyExists"));
      setNameValid(false);
    } else {
      setNameError("");
      setNameValid(true);
    }
  };

  // ✅ FIXED: Only show error styling after blur or when field has 10 digits
  const handlePhoneChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    setPhone(cleaned);
    
    // Only validate if field has been touched (blurred) or has 10 digits
    if (phoneTouched || cleaned.length === 10) {
      if (cleaned.length === 0) {
        setPhoneError(t("customer.phoneRequired"));
        setPhoneValid(false);
      } else if (cleaned.length !== 10) {
        setPhoneError(t("customer.phoneNumberMustBe10Digits"));
        setPhoneValid(false);
      } else if (ValidationUtils.checkDuplicatePhone(allCustomers, cleaned, customerId)) {
        setPhoneError(t("customer.phoneAlreadyExists"));
        setPhoneValid(false);
      } else {
        setPhoneError("");
        setPhoneValid(true);
      }
    } else {
      // While typing (before blur), don't show errors
      setPhoneError("");
      setPhoneValid(true);
    }
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    
    // ✅ Mark phone as touched on submit attempt
    setPhoneTouched(true);
    
    // Re-validate phone on submit
    if (phone.length === 0) {
      setPhoneError(t("customer.phoneRequired"));
      setPhoneValid(false);
    } else if (phone.length !== 10) {
      setPhoneError(t("customer.phoneNumberMustBe10Digits"));
      setPhoneValid(false);
    } else if (ValidationUtils.checkDuplicatePhone(allCustomers, phone, customerId)) {
      setPhoneError(t("customer.phoneAlreadyExists"));
      setPhoneValid(false);
    }
    
    if (!nameValid || !phoneValid || phone.length !== 10) {
      showError(t("common.validation"), t("customer.correctErrors"));
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = {
        customerId,
        customerName: name.trim(),
        phoneNumber: phone,
        address: address.trim(),
      };
      const res = await SQLiteService.updateCustomer(payload);
      if (res.status === "success") {
        showSuccess(t("common.success"), t("customer.customerUpdatedSuccessfully"), () => {
          if (refreshCustomers) refreshCustomers();
          navigation.navigate("Customers", { refresh: true });
        });
      } else {
        showError(t("common.error"), res.message || t("customer.failedToUpdateCustomer"));
      }
    } catch (error) {
      showError(t("common.error"), t("common.somethingWentWrong"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = nameValid && phoneValid && phone.length === 10;
  const formattedDisplayId = displayId
    ? DisplayHelpers.getShortDisplay(displayId)
    : customerId.substring(0, 8) + "...";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Form Card */}
          <View
            style={[
              styles.formCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Ionicons name="create" size={IconSizes.medium} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                {t("customer.customerInformation")}
              </Text>
            </View>

            {/* Summary */}
            <View>
              <View style={styles.summaryRow}>
                <View className="summaryItem" style={styles.summaryItem}>
                  <Ionicons name="finger-print" size={IconSizes.small} color={theme.colors.textSecondary} />
                  <View style={styles.summaryTextContainer}>
                    <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                      {t("customer.customerId")}
                    </Text>
                    <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{formattedDisplayId}</Text>
                  </View>
                </View>

                <View style={styles.summaryItem}>
                  <Ionicons name="cash" size={IconSizes.small} color="#dc2626" />
                  <View style={styles.summaryTextContainer}>
                    <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                      {t("customer.outstandingBalance")}
                    </Text>
                    <Text style={styles.summaryBalanceValue}>₹{parseFloat(balance || 0).toLocaleString()}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                {t("customer.customerName")} <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  nameError && { borderColor: "#dc2626", backgroundColor: theme.isDarkMode ? "#7f1d1d" : "#fef2f2" },
                  nameValid && !nameError && { borderColor: "#059669" },
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={IconSizes.medium}
                  color={nameError ? "#dc2626" : nameValid ? "#059669" : theme.colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  value={name}
                  onChangeText={handleNameChange}
                  placeholder={t("customer.enterName")}
                  placeholderTextColor={theme.colors.textTertiary}
                  autoCapitalize="words"
                />
              </View>
              {nameError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={IconSizes.small} color="#dc2626" />
                  <Text style={styles.errorText}>{nameError}</Text>
                </View>
              ) : null}
            </View>

            {/* Phone - ✅ FIXED STYLING */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                {t("customer.phoneNumber")} <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  phoneError && phoneTouched && { 
                    borderColor: "#dc2626", 
                    backgroundColor: theme.isDarkMode ? "#7f1d1d" : "#fef2f2" 
                  },
                  phoneValid && !phoneError && phone.length === 10 && { borderColor: "#059669" },
                ]}
              >
                <Ionicons
                  name="call-outline"
                  size={IconSizes.medium}
                  color={phoneError && phoneTouched ? "#dc2626" : phoneValid && phone.length === 10 ? "#059669" : theme.colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  onBlur={() => setPhoneTouched(true)} // ✅ Mark as touched on blur
                  placeholder={t("customer.enterPhone")}
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              {phoneError && phoneTouched ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={IconSizes.small} color="#dc2626" />
                  <Text style={styles.errorText}>{phoneError}</Text>
                </View>
              ) : null}
            </View>

            {/* Address */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                {t("customer.address")} <Text style={[styles.optional, { color: theme.colors.textSecondary }]}>{`(${t("customer.optional")})`}</Text>
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="location-outline" size={IconSizes.medium} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.textArea, { color: theme.colors.text }]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder={t("customer.enterAddress")}
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: theme.colors.primary },
                (!isFormValid || isSubmitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!isFormValid || isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={IconSizes.large} color="#fff" />
                  <Text style={styles.submitButtonText}>{t("common.save")}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xl },

  formCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xlarge,
    padding: Spacing.lg,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: "#1e293b", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.lg, gap: Spacing.sm },
  sectionTitle: { fontSize: FontSizes.large, fontWeight: "700" },

  summaryRow: { gap: Spacing.md },
  summaryItem: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.xs },
  summaryTextContainer: { flex: 1 },
  summaryLabel: { fontSize: FontSizes.medium, fontWeight: "600"},
  summaryValue: { fontSize: FontSizes.medium, fontWeight: "600" },
  summaryBalanceValue: { fontSize: FontSizes.medium, fontWeight: "700", color: "#dc2626" },

  inputGroup: { marginBottom: Spacing.lg },
  label: { fontSize: FontSizes.medium, fontWeight: "600", marginBottom: Spacing.sm },
  required: { color: "#dc2626" },
  optional: { fontWeight: "500", fontSize: FontSizes.small },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: BorderRadius.large,
    paddingHorizontal: Spacing.md,
    minHeight: ButtonSizes.large,
  },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, fontSize: FontSizes.regular, fontWeight: "500" },
  textArea: { minHeight: 80, paddingTop: Spacing.md, paddingBottom: Spacing.md },

  errorContainer: { flexDirection: "row", alignItems: "center", marginTop: Spacing.sm, gap: 4 },
  errorText: { fontSize: FontSizes.small, color: "#dc2626", fontWeight: "500" },

  submitButton: {
    flexDirection: "row",
    height: ButtonSizes.xlarge,
    borderRadius: BorderRadius.xlarge,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: "#1e40af",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: FontSizes.large, fontWeight: "700", color: "#fff", letterSpacing: 0.3 },
});
