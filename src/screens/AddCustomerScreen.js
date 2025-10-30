import React, { useState, useContext } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SQLiteService from "../services/SQLiteService";
import { CustomerContext } from "../contexts/CustomerContext";
import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { ENABLE_I18N, fallbackT } from "../config/i18nConfig";
import { ValidationUtils } from "../Utils/ValidationUtils";

export default function AddCustomerScreen({ navigation }) {
  const { refreshCustomers, allCustomers } = useContext(CustomerContext);
  const { t } = ENABLE_I18N
    ? useContext(SimpleLanguageContext)
    : { t: fallbackT };

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation states
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [nameValid, setNameValid] = useState(false);
  const [phoneValid, setPhoneValid] = useState(false);

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
    // Only allow numbers
    const cleaned = text.replace(/[^0-9]/g, "");
    setPhone(cleaned);

    if (cleaned.length === 0) {
      setPhoneError("");
      setPhoneValid(false);
    } else if (cleaned.length !== 10) {
      setPhoneError(t("customer.phoneNumberMustBe10Digits"));
      setPhoneValid(false);
    } else if (ValidationUtils.checkDuplicatePhone(allCustomers, cleaned)) {
      setPhoneError(t("customer.phoneAlreadyExists"));
      setPhoneValid(false);
    } else {
      setPhoneError("");
      setPhoneValid(true);
    }
  };

  const handleSave = async () => {
    if (isSubmitting) return;

    // Final validation
    if (!name.trim()) {
      setNameError(t("customer.nameIsRequired"));
      return;
    }

    if (!nameValid || !phoneValid) {
      Alert.alert(t("common.validation"), t("customer.correctErrors"));
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerName: name.trim(),
        phoneNumber: phone,
        address: address.trim(),
      };

      const res = await SQLiteService.addCustomer(payload);
      if (res.status === "success") {
        if (refreshCustomers) {
          await refreshCustomers();
        }
        Alert.alert(
          t("common.success"),
          t("customer.customerAddedSuccessfully"),
          [
            {
              text: t("common.ok"),
              onPress: () =>
                navigation.navigate("Customers", { refresh: true }),
            },
          ]
        );
      } else {
        Alert.alert(
          t("common.error"),
          res.message || t("customer.failedToAddCustomer")
        );
      }
    } catch (error) {
      Alert.alert(t("common.error"), t("common.somethingWentWrong"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = nameValid && phoneValid;
  const remainingDigits = 10 - phone.length;

  return (
    <KeyboardAvoidingView
      style={styles.container}
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
            <Ionicons name="person-add" size={32} color="#1e40af" />
          </View>
          <Text style={styles.headerTitle}>{t("customer.addNewCustomer")}</Text>
          <Text style={styles.headerSubtitle}>
            {t("customer.enterCustomerDetails")}
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>
            {t("customer.customerInformation")}
          </Text>

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
                returnKeyType="next"
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
            {nameValid && (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={14} color="#059669" />
                <Text style={styles.successText}>
                  {t("customer.nameAvailable")}
                </Text>
              </View>
            )}
          </View>

          {/* Phone Number Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t("customer.phoneNumber")} <Text style={styles.required}>*</Text>
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
                returnKeyType="next"
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
            {phoneValid && (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={14} color="#059669" />
                <Text style={styles.successText}>
                  {t("customer.phoneValid")}
                </Text>
              </View>
            )}
            {phone.length > 0 && phone.length < 10 && !phoneError && (
              <Text style={styles.helperText}>
                {remainingDigits}{" "}
                {remainingDigits === 1
                  ? t("customer.digitRemaining")
                  : t("customer.digitsRemaining")}
              </Text>
            )}
          </View>

          {/* Address Input (Optional) */}
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
                returnKeyType="done"
              />
            </View>
          </View>
        </View>

        {/* Form Status Indicator */}
        {isFormValid && (
          <View style={styles.statusCard}>
            <Ionicons name="shield-checkmark" size={24} color="#059669" />
            <View style={styles.statusContent}>
              <Text style={styles.statusTitle}>
                {t("customer.readyToSubmit")}
              </Text>
              <Text style={styles.statusText}>
                {t("customer.allFieldsValid")}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Action Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!isFormValid || isSubmitting) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={!isFormValid || isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.saveButtonText}>{t("common.save")}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 20,
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
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  successText: {
    fontSize: 13,
    color: "#059669",
    fontWeight: "500",
  },
  helperText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 6,
    fontWeight: "500",
  },

  // Status Card
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    gap: 12,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#15803d",
    marginBottom: 2,
  },
  statusText: {
    fontSize: 13,
    color: "#16a34a",
    fontWeight: "500",
  },

  // Bottom Action
  bottomContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
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
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
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
  saveButtonDisabled: {
    backgroundColor: "#cbd5e1",
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
});
