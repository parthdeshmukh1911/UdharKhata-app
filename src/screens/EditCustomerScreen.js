// src/screens/EditCustomerScreen.js

import React, { useState, useEffect, useContext } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
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
//import DatabaseService from "../services/DatabaseService";
import { CustomerContext } from "../contexts/CustomerContext";
import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { ENABLE_I18N, fallbackT } from "../config/i18nConfig";
import { ValidationUtils } from "../Utils/ValidationUtils";
import { DisplayHelpers } from "../Utils/DisplayHelpers"; // ✅ Import DisplayHelpers

export default function EditCustomerScreen({ route, navigation }) {
  const { customer } = route.params;
  const { refreshCustomers, allCustomers } = useContext(CustomerContext);
  const { t } = ENABLE_I18N
    ? useContext(SimpleLanguageContext)
    : { t: fallbackT };

  const [customerId, setCustomerId] = useState(""); // Internal ULID
  const [displayId, setDisplayId] = useState(""); // ✅ Display ID
  const [balance, setBalance] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation states
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [nameValid, setNameValid] = useState(true);
  const [phoneValid, setPhoneValid] = useState(true);

  useEffect(() => {
    if (customer) {
      setCustomerId(customer.id || customer["Customer ID"] || "");
      setDisplayId(customer["Display ID"] || ""); // ✅ Set Display ID
      setBalance(String(customer["Total Balance"] ?? 0));
      setName(customer.name || customer["Customer Name"] || "");
      setPhone(String(customer.phone || customer["Phone Number"] || ""));
      setAddress(customer.address || customer["Address"] || "");
    }
  }, [customer]);

  // Real-time validation for name
  const handleNameChange = (text) => {
    setName(text);
    if (text.trim().length === 0) {
      setNameError(t("customer.nameIsRequired"));
      setNameValid(false);
    } else if (
      ValidationUtils.checkDuplicateName(allCustomers, text, customerId)
    ) {
      setNameError(t("customer.nameAlreadyExists"));
      setNameValid(false);
    } else {
      setNameError("");
      setNameValid(true);
    }
  };

  // Real-time validation for phone
  const handlePhoneChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    setPhone(cleaned);

    if (cleaned.length === 0) {
      setPhoneError(t("customer.phoneRequired"));
      setPhoneValid(false);
    } else if (cleaned.length !== 10) {
      setPhoneError(t("customer.phoneNumberMustBe10Digits"));
      setPhoneValid(false);
    } else if (
      ValidationUtils.checkDuplicatePhone(allCustomers, cleaned, customerId)
    ) {
      setPhoneError(t("customer.phoneAlreadyExists"));
      setPhoneValid(false);
    } else {
      setPhoneError("");
      setPhoneValid(true);
    }
  };

  const handleSave = async () => {
    if (isSubmitting) return;

    if (!nameValid || !phoneValid) {
      Alert.alert(t("common.validation"), t("customer.correctErrors"));
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: customerId,
        customerName: name.trim(),
        phoneNumber: phone,
        address: address.trim(),
      };

      const res = await SQLiteService.updateCustomer(payload);
      if (res.status === "success") {
        Alert.alert(
          t("common.success"),
          t("customer.customerUpdatedSuccessfully"),
          [
            {
              text: t("common.ok"),
              onPress: () => {
                if (refreshCustomers) refreshCustomers();
                navigation.navigate("Customers", { refresh: true });
              },
            },
          ]
        );
      } else {
        Alert.alert(
          t("common.error"),
          res.message || t("customer.failedToUpdateCustomer")
        );
      }
    } catch (error) {
      Alert.alert(t("common.error"), t("common.somethingWentWrong"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (isSubmitting) return;

    Alert.alert(t("common.confirm"), t("customer.confirmDelete"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            setIsSubmitting(true);
            const result = await SQLiteService.deleteCustomer(customerId);
            if (result.status === "success") {
              // SQLiteService.clearCache();
              Alert.alert(
                t("common.success"),
                t("customer.customerDeletedSuccessfully"),
                [
                  {
                    text: t("common.ok"),
                    onPress: () => {
                      if (refreshCustomers) refreshCustomers();
                      navigation.navigate("Customers", { refresh: true });
                    },
                  },
                ]
              );
            } else {
              Alert.alert(
                t("common.error"),
                result.message || t("customer.failedToDeleteCustomer")
              );
            }
          } catch (err) {
            Alert.alert(
              t("common.error"),
              err.message || t("customer.failedToDeleteCustomer")
            );
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  };

  const isFormValid = nameValid && phoneValid;

  // ✅ Format display ID for showing
  const formattedDisplayId = displayId
    ? DisplayHelpers.getShortDisplay(displayId)
    : customerId.substring(0, 8) + "...";

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
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
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.headerIcon}>
              <Ionicons name="person-circle" size={32} color="#1e40af" />
            </View>
            <Text style={styles.headerTitle}>{t("customer.editCustomer")}</Text>
            <Text style={styles.headerSubtitle}>
              {t("customer.updateCustomerInfo")}
            </Text>
          </View>

          {/* Account Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="information-circle" size={20} color="#1e40af" />
              <Text style={styles.summaryTitle}>
                {t("customer.accountSummary")}
              </Text>
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>
                  {t("customer.customerId")}
                </Text>
                <View style={styles.summaryValueContainer}>
                  <Ionicons name="finger-print" size={16} color="#64748b" />
                  {/* ✅ Show Display ID instead of ULID */}
                  <Text style={styles.summaryValue}>{formattedDisplayId}</Text>
                </View>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>
                  {t("customer.outstandingBalance")}
                </Text>
                <View style={styles.balanceBadge}>
                  <Ionicons name="cash" size={16} color="#dc2626" />
                  <Text style={styles.balanceValue}>
                    ₹{parseFloat(balance || 0).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Editable Information Card */}
          <View style={styles.formCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="create" size={20} color="#1e40af" />
              <Text style={styles.sectionTitle}>
                {t("customer.customerInformation")}
              </Text>
            </View>

            {/* Customer Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {t("customer.customerName")}{" "}
                <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  nameError
                    ? styles.inputError
                    : nameValid
                    ? styles.inputSuccess
                    : null,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={
                    nameError ? "#dc2626" : nameValid ? "#059669" : "#64748b"
                  }
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={handleNameChange}
                  placeholder={t("customer.enterName")}
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="words"
                />
                {nameValid && (
                  <Ionicons name="checkmark-circle" size={20} color="#059669" />
                )}
                {nameError && (
                  <Ionicons name="close-circle" size={20} color="#dc2626" />
                )}
              </View>
              {nameError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color="#dc2626" />
                  <Text style={styles.errorText}>{nameError}</Text>
                </View>
              ) : null}
            </View>

            {/* Phone Number Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {t("customer.phoneNumber")}{" "}
                <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  phoneError
                    ? styles.inputError
                    : phoneValid
                    ? styles.inputSuccess
                    : null,
                ]}
              >
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={
                    phoneError ? "#dc2626" : phoneValid ? "#059669" : "#64748b"
                  }
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  placeholder={t("customer.enterPhone")}
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
                {phoneValid && (
                  <Ionicons name="checkmark-circle" size={20} color="#059669" />
                )}
                {phoneError && (
                  <Ionicons name="close-circle" size={20} color="#dc2626" />
                )}
              </View>
              {phoneError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color="#dc2626" />
                  <Text style={styles.errorText}>{phoneError}</Text>
                </View>
              ) : null}
            </View>

            {/* Address Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {t("customer.address")}{" "}
                <Text style={styles.optional}>({t("customer.optional")})</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="location-outline"
                  size={20}
                  color="#64748b"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder={t("customer.enterAddress")}
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>

          {/* Danger Zone Card */}
          <View style={styles.dangerCard}>
            <View style={styles.dangerHeader}>
              <Ionicons name="warning" size={20} color="#dc2626" />
              <Text style={styles.dangerTitle}>{t("customer.dangerZone")}</Text>
            </View>
            <Text style={styles.dangerText}>
              {t("customer.dangerZoneText")}
            </Text>
          </View>
        </ScrollView>

        {/* Fixed Bottom Actions */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!isFormValid || isSubmitting) && styles.buttonDisabled,
            ]}
            onPress={handleSave}
            disabled={!isFormValid || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
                <Text style={styles.saveButtonText}>{t("common.save")}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleDelete}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#dc2626" />
            ) : (
              <>
                <Ionicons name="trash" size={20} color="#dc2626" />
                <Text style={styles.deleteButtonText}>
                  {t("customer.deleteCustomer")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ... (keep all existing styles)
const styles = StyleSheet.create({
  // ... (all your existing styles remain the same)
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 160,
  },

  // Header Section
  headerSection: {
    backgroundColor: "#fff",
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    alignItems: "center",
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    fontWeight: "500",
  },

  // Summary Card (Read-only info)
  summaryCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
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
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    letterSpacing: -0.2,
  },
  summaryGrid: {
    gap: 16,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  summaryValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
  },
  balanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  balanceValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#dc2626",
  },

  // Form Card
  formCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    letterSpacing: -0.2,
  },

  // Input Group
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  required: {
    color: "#dc2626",
  },
  optional: {
    color: "#64748b",
    fontWeight: "500",
    fontSize: 13,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputError: {
    borderColor: "#dc2626",
    backgroundColor: "#fef2f2",
  },
  inputSuccess: {
    borderColor: "#059669",
    backgroundColor: "#f0fdf4",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "500",
    paddingVertical: 0,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
    paddingBottom: 12,
  },

  // Validation Messages
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  errorText: {
    fontSize: 13,
    color: "#dc2626",
    fontWeight: "500",
  },

  // Danger Zone
  dangerCard: {
    backgroundColor: "#fef2f2",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  dangerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#dc2626",
  },
  dangerText: {
    fontSize: 13,
    color: "#991b1b",
    lineHeight: 20,
    fontWeight: "500",
  },

  // Bottom Actions
  bottomContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#1e293b",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  saveButton: {
    flexDirection: "row",
    backgroundColor: "#1e40af",
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
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
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
  deleteButton: {
    flexDirection: "row",
    backgroundColor: "#fff",
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#fecaca",
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#dc2626",
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
