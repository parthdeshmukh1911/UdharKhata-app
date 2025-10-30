import React, { useState, useContext, useEffect } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Text,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Dropdown } from "react-native-element-dropdown";
import DateTimePicker from "@react-native-community/datetimepicker";
import SQLiteService from "../services/SQLiteService";
import ImagePickerButton from "../components/ImagePickerButton";
import { CustomerContext } from "../contexts/CustomerContext";
import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { ENABLE_I18N, fallbackT } from "../config/i18nConfig";
import { ValidationUtils } from "../Utils/ValidationUtils";

export default function AddTransactionScreen({ navigation, route }) {
  const {
    allCustomers,
    loading: customersLoading,
    refreshCustomers,
  } = useContext(CustomerContext);
  const { t } = ENABLE_I18N
    ? useContext(SimpleLanguageContext)
    : { t: fallbackT };

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("CREDIT");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState(null); // Added photo state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation states
  const [amountError, setAmountError] = useState("");
  const [amountValid, setAmountValid] = useState(false);

  useEffect(() => {
    if (route.params?.selectedCustomer) {
      setSelectedCustomer(route.params.selectedCustomer);
    }
  }, [route.params?.selectedCustomer]);

  // Real-time amount validation
  const handleAmountChange = (text) => {
    // Only allow numbers and decimal point
    const cleaned = text.replace(/[^0-9.]/g, "");
    setAmount(cleaned);

    if (cleaned.length === 0) {
      setAmountError("");
      setAmountValid(false);
    } else if (isNaN(parseFloat(cleaned)) || parseFloat(cleaned) <= 0) {
      setAmountError(t("transaction.enterValidAmount"));
      setAmountValid(false);
    } else {
      setAmountError("");
      setAmountValid(true);
    }
  };

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (date) => {
    const options = {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  const handleAddTransaction = async () => {
    if (isSubmitting) return;

    // Validation
    if (!selectedCustomer) {
      return Alert.alert(
        t("common.validation"),
        t("transaction.selectACustomer")
      );
    }
    if (!amountValid) {
      return Alert.alert(
        t("common.validation"),
        t("transaction.pleaseEnterValidAmount")
      );
    }
    if (!date) {
      return Alert.alert(t("common.validation"), t("transaction.selectDate"));
    }

    const dateValidation = ValidationUtils.validateDateRange(date);
    if (!dateValidation.isValid) {
      return Alert.alert(t("common.validation"), dateValidation.message);
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomer["Customer ID"],
        date: formatDate(date),
        type,
        amount: parseFloat(amount),
        note,
        photo, // Added photo to payload
      };

      const res = await SQLiteService.addTransaction(payload);
      if (res.status === "success") {
        const transactionData = {
          amount: parseFloat(amount),
          type,
          note,
          date: formatDate(date),
          updatedBalance: res.updatedBalance,
        };

        const customerName =
          selectedCustomer["Customer Name"] || t("transaction.customer");
        const phone = selectedCustomer["Phone Number"];

        if (phone) {
          Alert.alert(
            t("common.success"),
            `${t("transaction.transactionAddedSuccessfully")}!\n\n${t(
              "transaction.sendNotificationTo"
            )} ${customerName}?`,
            [
              {
                text: t("transaction.skip"),
                onPress: () => navigateBack(),
              },
              {
                text: t("transaction.whatsapp"),
                onPress: () => {
                  const {
                    createTransactionMessage,
                    sendWhatsAppMessage,
                  } = require("../Utils/WhatsAppService");
                  const message = createTransactionMessage(
                    selectedCustomer,
                    transactionData,
                    t
                  );
                  sendWhatsAppMessage(phone, message, t);
                  navigateBack();
                },
              },
              {
                text: t("transaction.sms"),
                onPress: () => {
                  const {
                    createSMSMessage,
                    sendSMSMessage,
                  } = require("../Utils/WhatsAppService");
                  const message = createSMSMessage(
                    selectedCustomer,
                    transactionData,
                    t
                  );
                  sendSMSMessage(phone, message, t);
                  navigateBack();
                },
              },
            ]
          );
        } else {
          Alert.alert(
            t("common.success"),
            t("transaction.transactionAddedSuccessfully"),
            [{ text: t("common.ok"), onPress: () => navigateBack() }]
          );
        }
      } else {
        Alert.alert(
          t("common.error"),
          res.message || t("transaction.failedToAddTransaction")
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert(t("common.error"), t("common.somethingWentWrong"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigateBack = () => {
    setSelectedCustomer(route.params?.selectedCustomer || null);
    setDate(new Date());
    setAmount("");
    setType("CREDIT");
    setNote("");
    setPhoto(null); // Reset photo

    navigation.navigate("Transactions", {
      transactionAdded: true,
      addedForCustomerId: selectedCustomer["Customer ID"],
      hadSelectedCustomer: route.params?.hasSelectedCustomer || false,
    });
  };

  const isFormValid = selectedCustomer && amountValid && date;
  const isCredit = type === "CREDIT";

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
            <Ionicons name="receipt" size={32} color="#1e40af" />
          </View>
          <Text style={styles.headerTitle}>
            {t("transaction.newTransaction")}
          </Text>
          <Text style={styles.headerSubtitle}>
            {t("transaction.recordNewTransaction")}
          </Text>
        </View>

        {/* Transaction Type Selector (Prominent) */}
        <View style={styles.typeCard}>
          <Text style={styles.sectionTitle}>
            {t("transaction.transactionType")}
          </Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeOption,
                isCredit && styles.typeOptionActive,
                isCredit && styles.creditActive,
              ]}
              onPress={() => setType("CREDIT")}
            >
              <View
                style={[
                  styles.typeIconContainer,
                  isCredit && styles.typeIconActiveCredit,
                ]}
              >
                <Ionicons
                  name="arrow-up"
                  size={24}
                  color={isCredit ? "#dc2626" : "#64748b"}
                />
              </View>
              <Text
                style={[styles.typeLabel, isCredit && styles.typeLabelActive]}
              >
                {t("transaction.creditGiven")}
              </Text>
              <Text
                style={[
                  styles.typeSubtext,
                  isCredit && styles.typeSubtextActive,
                ]}
              >
                {t("transaction.moneyLent")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeOption,
                !isCredit && styles.typeOptionActive,
                !isCredit && styles.paymentActive,
              ]}
              onPress={() => setType("PAYMENT")}
            >
              <View
                style={[
                  styles.typeIconContainer,
                  !isCredit && styles.typeIconActivePayment,
                ]}
              >
                <Ionicons
                  name="arrow-down"
                  size={24}
                  color={!isCredit ? "#059669" : "#64748b"}
                />
              </View>
              <Text
                style={[styles.typeLabel, !isCredit && styles.typeLabelActive]}
              >
                {t("transaction.paymentReceived")}
              </Text>
              <Text
                style={[
                  styles.typeSubtext,
                  !isCredit && styles.typeSubtextActive,
                ]}
              >
                {t("transaction.moneyReturned")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transaction Details Card */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>
            {t("transaction.transactionDetails")}
          </Text>

          {/* Customer Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t("transaction.customer")} <Text style={styles.required}>*</Text>
            </Text>
            <View
              style={[
                styles.dropdownWrapper,
                selectedCustomer && styles.inputSuccess,
              ]}
            >
              <Ionicons
                name="person"
                size={20}
                color={selectedCustomer ? "#059669" : "#64748b"}
                style={styles.inputIcon}
              />
              <Dropdown
                style={styles.dropdown}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                inputSearchStyle={styles.inputSearchStyle}
                itemTextStyle={styles.itemTextStyle}
                itemContainerStyle={styles.itemContainerStyle}
                containerStyle={styles.dropdownContainer}
                data={allCustomers || []}
                search
                searchPlaceholder={t("common.search")}
                labelField="Customer Name"
                valueField="Customer ID"
                placeholder={
                  customersLoading
                    ? t("common.loading")
                    : allCustomers?.length === 0
                    ? t("transaction.noCustomersFound")
                    : t("customer.selectCustomer")
                }
                value={
                  selectedCustomer ? selectedCustomer["Customer ID"] : null
                }
                onChange={(item) => setSelectedCustomer(item)}
              />
              {selectedCustomer && (
                <Ionicons name="checkmark-circle" size={20} color="#059669" />
              )}
            </View>
            {selectedCustomer && (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={14} color="#059669" />
                <Text style={styles.successText}>
                  {t("transaction.balance")}: ₹
                  {(selectedCustomer["Total Balance"] || 0).toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t("transaction.amount")} <Text style={styles.required}>*</Text>
            </Text>
            <View
              style={[
                styles.inputWrapper,
                amountError
                  ? styles.inputError
                  : amountValid
                  ? styles.inputSuccess
                  : null,
              ]}
            >
              <Ionicons
                name="cash"
                size={20}
                color={
                  amountError ? "#dc2626" : amountValid ? "#059669" : "#64748b"
                }
                style={styles.inputIcon}
              />
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder={t("transaction.amountPlaceholder")}
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
              />
              {amountValid && (
                <Ionicons name="checkmark-circle" size={20} color="#059669" />
              )}
              {amountError && (
                <Ionicons name="close-circle" size={20} color="#dc2626" />
              )}
            </View>
            {amountError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={14} color="#dc2626" />
                <Text style={styles.errorText}>{amountError}</Text>
              </View>
            ) : amountValid ? (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={14} color="#059669" />
                <Text style={styles.successText}>
                  {amount &&
                    `₹${parseFloat(amount).toLocaleString()} ${t(
                      "transaction.entered"
                    )}`}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Date Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t("transaction.date")} <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.inputWrapper}
            >
              <Ionicons
                name="calendar"
                size={20}
                color="#64748b"
                style={styles.inputIcon}
              />
              <Text style={styles.dateText}>{formatDisplayDate(date)}</Text>
              <Ionicons name="chevron-down" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={(e, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}

          {/* Note Input (Optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t("transaction.note")}{" "}
              <Text style={styles.optional}>({t("transaction.optional")})</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="document-text"
                size={20}
                color="#64748b"
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                value={note}
                onChangeText={setNote}
                placeholder={t("transaction.notePlaceholder")}
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Photo Attachment - NEW */}
          <ImagePickerButton
            onImageSelected={setPhoto}
            currentImage={photo}
            onImageRemove={() => setPhoto(null)}
          />
        </View>

        {/* Transaction Summary Preview */}
        {isFormValid && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="information-circle" size={20} color="#1e40af" />
              <Text style={styles.summaryTitle}>
                {t("transaction.transactionSummary")}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {t("transaction.customerLabel")}
              </Text>
              <Text style={styles.summaryValue}>
                {selectedCustomer["Customer Name"]}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {t("transaction.typeLabel")}
              </Text>
              <Text
                style={[
                  styles.summaryValue,
                  isCredit ? styles.creditText : styles.paymentText,
                ]}
              >
                {isCredit
                  ? t("transaction.creditGiven")
                  : t("transaction.paymentReceived")}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {t("transaction.amountLabel")}
              </Text>
              <Text style={styles.summaryAmount}>
                ₹{parseFloat(amount).toLocaleString()}
              </Text>
            </View>
            {photo && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Attachment</Text>
                <View style={styles.attachmentBadge}>
                  <Ionicons name="image" size={14} color="#1e40af" />
                  <Text style={styles.attachmentText}>Photo attached</Text>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!isFormValid || isSubmitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleAddTransaction}
          disabled={!isFormValid || isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.submitButtonText}>
                {isCredit
                  ? t("transaction.recordCredit")
                  : t("transaction.recordPayment")}
              </Text>
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

  // Type Selector Card
  typeCard: {
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
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  typeSelector: {
    flexDirection: "row",
    gap: 12,
  },
  typeOption: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  typeOptionActive: {
    borderWidth: 2,
  },
  creditActive: {
    borderColor: "#dc2626",
    backgroundColor: "#fef2f2",
  },
  paymentActive: {
    borderColor: "#059669",
    backgroundColor: "#f0fdf4",
  },
  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  typeIconActiveCredit: {
    backgroundColor: "#fecaca",
  },
  typeIconActivePayment: {
    backgroundColor: "#bbf7d0",
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 4,
    textAlign: "center",
  },
  typeLabelActive: {
    color: "#1e293b",
  },
  typeSubtext: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  typeSubtextActive: {
    color: "#64748b",
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
  currencySymbol: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginRight: 4,
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
  dateText: {
    flex: 1,
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "500",
  },

  // Dropdown Styles
  dropdownWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  dropdown: {
    flex: 1,
    height: 52,
  },
  placeholderStyle: {
    fontSize: 15,
    color: "#94a3b8",
    fontWeight: "500",
  },
  selectedTextStyle: {
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "600",
  },
  inputSearchStyle: {
    height: 44,
    fontSize: 15,
    color: "#1e293b",
    borderRadius: 8,
  },
  itemTextStyle: {
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "500",
  },
  itemContainerStyle: {
    backgroundColor: "#fff",
    paddingVertical: 12,
  },
  dropdownContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...Platform.select({
      ios: {
        shadowColor: "#1e293b",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
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

  // Summary Card
  summaryCard: {
    backgroundColor: "#f8fafc",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "600",
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e40af",
  },
  creditText: {
    color: "#dc2626",
  },
  paymentText: {
    color: "#059669",
  },
  attachmentBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dbeafe",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  attachmentText: {
    fontSize: 12,
    color: "#1e40af",
    fontWeight: "600",
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
  submitButton: {
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
  submitButtonDisabled: {
    backgroundColor: "#cbd5e1",
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
});
