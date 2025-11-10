// src/screens/EditTransactionScreen.js

import React, { useState, useEffect, useContext } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Text,
  Platform,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import SQLiteService from "../services/SQLiteService";
import ImagePickerButton from "../components/ImagePickerButton";
import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { ENABLE_I18N, fallbackT } from "../config/i18nConfig";
import { ValidationUtils } from "../Utils/ValidationUtils";
import { DisplayHelpers } from "../Utils/DisplayHelpers";
import { useTheme } from "../contexts/ThemeContext";
import { 
  FontSizes, 
  Spacing, 
  IconSizes, 
  ButtonSizes, 
  BorderRadius 
} from "../Utils/Responsive";

export default function EditTransactionScreen({ route, navigation }) {
  const { transaction } = route.params;
  const { t } = ENABLE_I18N
    ? useContext(SimpleLanguageContext)
    : { t: fallbackT };
  const { theme } = useTheme();

  const [transactionId, setTransactionId] = useState("");
  const [displayId, setDisplayId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation states
  const [amountError, setAmountError] = useState("");
  const [amountValid, setAmountValid] = useState(true);

  useEffect(() => {
    if (transaction) {
      setTransactionId(
        transaction["Transaction ID"] || transaction.transactionId || ""
      );
      setDisplayId(transaction["Display ID"] || "");
      setCustomerId(transaction["Customer ID"] || transaction.customerId || "");
      setCustomerName(transaction["Customer Name"] || "");
      setDate(transaction.Date ? new Date(transaction.Date) : new Date());
      setAmount(String(transaction.Amount || transaction.amount || ""));
      setType(transaction.Type || transaction.type || "");
      setNote(transaction.Note || transaction.note || "");
      setPhoto(transaction.Photo || null);
    }
  }, [transaction]);

  // Real-time amount validation
  const handleAmountChange = (text) => {
    const cleaned = text.replace(/[^0-9.]/g, "");
    setAmount(cleaned);

    if (cleaned.length === 0) {
      setAmountError("Amount is required");
      setAmountValid(false);
    } else if (isNaN(parseFloat(cleaned)) || parseFloat(cleaned) <= 0) {
      setAmountError("Enter a valid amount");
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

  const handleSave = async () => {
    if (isSubmitting) return;

    if (!amountValid || !type.trim()) {
      return Alert.alert(
        t("common.validation"),
        "Please fill all required fields correctly"
      );
    }

    const dateValidation = ValidationUtils.validateDateRange(date);
    if (!dateValidation.isValid) {
      return Alert.alert(t("common.validation"), dateValidation.message);
    }

    setIsSubmitting(true);
    try {
      const payload = {
        transactionId,
        customerId,
        date: formatDate(date),
        amount: parseFloat(amount),
        type,
        note,
        photo,
      };

      const res = await SQLiteService.updateTransaction(payload);
      if (res.status === "success") {
        Alert.alert(
          t("common.success"),
          t("transaction.transactionUpdatedSuccessfully"),
          [
            {
              text: t("common.ok"),
              onPress: () => {
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          t("common.error"),
          res.message || t("transaction.failedToUpdateTransaction")
        );
      }
    } catch (error) {
      console.error("Update Transaction Error:", error);
      Alert.alert(t("common.error"), "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = amountValid && type;
  const isCredit = type === "CREDIT";

  const formattedDisplayId = displayId
    ? DisplayHelpers.getShortDisplay(displayId)
    : transactionId.substring(0, 8) + "...";

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
              name="create"
              size={IconSizes.xlarge}
              color={theme.colors.primary}
            />
          </View>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
            Edit Transaction
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}
            maxFontSizeMultiplier={1.2}
          >
            Update transaction details
          </Text>
        </View>

        {/* Transaction Type Selector */}
        <View
          style={[
            styles.typeCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
            Transaction Type
          </Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeOption,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
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
                  size={IconSizes.large}
                  color={isCredit ? "#dc2626" : theme.colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.typeLabel,
                  { color: theme.colors.textSecondary },
                  isCredit && { color: theme.colors.text },
                ]}
                maxFontSizeMultiplier={1.3}
              >
                Credit Given
              </Text>
              <Text
                style={[
                  styles.typeSubtext,
                  { color: theme.colors.textTertiary },
                  isCredit && { color: theme.colors.textSecondary },
                ]}
                maxFontSizeMultiplier={1.2}
              >
                Money lent
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeOption,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
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
                  size={IconSizes.large}
                  color={!isCredit ? "#059669" : theme.colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.typeLabel,
                  { color: theme.colors.textSecondary },
                  !isCredit && { color: theme.colors.text },
                ]}
                maxFontSizeMultiplier={1.3}
              >
                Payment Received
              </Text>
              <Text
                style={[
                  styles.typeSubtext,
                  { color: theme.colors.textTertiary },
                  !isCredit && { color: theme.colors.textSecondary },
                ]}
                maxFontSizeMultiplier={1.2}
              >
                Money returned
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Editable Fields Card */}
        <View
          style={[
            styles.formCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons
              name="create"
              size={IconSizes.medium}
              color={theme.colors.primary}
            />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
              Edit Details
            </Text>
          </View>

          {/* Transaction Info */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text
                style={[styles.infoLabel, { color: theme.colors.textSecondary }]}
                maxFontSizeMultiplier={1.3}
              >
                Transaction ID
              </Text>
              <View style={styles.infoValueContainer}>
                <Ionicons
                  name="finger-print"
                  size={IconSizes.small}
                  color={theme.colors.textSecondary}
                />
                <Text style={[styles.infoValue, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                  {formattedDisplayId}
                </Text>
              </View>
            </View>

            {customerName && (
              <View style={styles.infoItem}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                  maxFontSizeMultiplier={1.3}
                >
                  Customer
                </Text>
                <View style={styles.infoValueContainer}>
                  <Ionicons
                    name="person"
                    size={IconSizes.small}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.infoValue, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                    {customerName}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
              Amount <Text style={styles.required}>*</Text>
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
                amountError && {
                  borderColor: "#dc2626",
                  backgroundColor: theme.isDarkMode ? "#7f1d1d" : "#fef2f2",
                },
                amountValid &&
                  !amountError && {
                    borderColor: "#059669",
                  },
              ]}
            >
              <Ionicons
                name="cash"
                size={IconSizes.medium}
                color={
                  amountError
                    ? "#dc2626"
                    : amountValid
                    ? "#059669"
                    : theme.colors.textSecondary
                }
                style={styles.inputIcon}
              />
              <Text style={[styles.currencySymbol, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                ₹
              </Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="decimal-pad"
                maxFontSizeMultiplier={1.3}
              />
              {amountValid && (
                <Ionicons
                  name="checkmark-circle"
                  size={IconSizes.medium}
                  color="#059669"
                />
              )}
              {amountError && (
                <Ionicons name="close-circle" size={IconSizes.medium} color="#dc2626" />
              )}
            </View>
            {amountError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={IconSizes.small} color="#dc2626" />
                <Text style={styles.errorText} maxFontSizeMultiplier={1.3}>{amountError}</Text>
              </View>
            ) : amountValid ? (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={IconSizes.small} color="#059669" />
                <Text style={styles.successText} maxFontSizeMultiplier={1.3}>
                  {amount && `₹${parseFloat(amount).toLocaleString()} entered`}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Date Picker */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
              Date <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Ionicons
                name="calendar"
                size={IconSizes.medium}
                color={theme.colors.textSecondary}
                style={styles.inputIcon}
              />
              <Text style={[styles.dateText, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                {formatDisplayDate(date)}
              </Text>
              <Ionicons
                name="chevron-down"
                size={IconSizes.medium}
                color={theme.colors.textTertiary}
              />
            </TouchableOpacity>
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}

          {/* Note Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
              Note{" "}
              <Text style={[styles.optional, { color: theme.colors.textSecondary }]}>
                (Optional)
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
                name="document-text"
                size={IconSizes.medium}
                color={theme.colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, styles.textArea, { color: theme.colors.text }]}
                value={note}
                onChangeText={setNote}
                placeholder="Add a note or description"
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxFontSizeMultiplier={1.3}
              />
            </View>
          </View>

          {/* Photo Picker */}
          <ImagePickerButton
            onImageSelected={setPhoto}
            currentImage={photo}
            onImageRemove={() => setPhoto(null)}
          />

          {/* Save Button */}
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
                <Text style={styles.submitButtonText} maxFontSizeMultiplier={1.3}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Changes Summary */}
        {isFormValid && (
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.summaryHeader}>
              <Ionicons
                name="sync"
                size={IconSizes.medium}
                color={theme.colors.primary}
              />
              <Text style={[styles.summaryTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                Updated Transaction
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text
                style={[
                  styles.summaryLabel,
                  { color: theme.colors.textSecondary },
                ]}
                maxFontSizeMultiplier={1.3}
              >
                Type:
              </Text>
              <Text
                style={[
                  styles.summaryValue,
                  isCredit ? styles.creditText : styles.paymentText,
                ]}
                maxFontSizeMultiplier={1.3}
              >
                {isCredit ? "Credit Given" : "Payment Received"}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text
                style={[
                  styles.summaryLabel,
                  { color: theme.colors.textSecondary },
                ]}
                maxFontSizeMultiplier={1.3}
              >
                Amount:
              </Text>
              <Text style={[styles.summaryAmount, { color: theme.colors.primary }]} maxFontSizeMultiplier={1.3}>
                ₹{parseFloat(amount).toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text
                style={[
                  styles.summaryLabel,
                  { color: theme.colors.textSecondary },
                ]}
                maxFontSizeMultiplier={1.3}
              >
                Date:
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                {formatDisplayDate(date)}
              </Text>
            </View>
            {photo && (
              <View style={styles.summaryRow}>
                <Text
                  style={[
                    styles.summaryLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                  maxFontSizeMultiplier={1.3}
                >
                  Attachment:
                </Text>
                <View
                  style={[
                    styles.attachmentBadge,
                    { backgroundColor: theme.colors.primaryLight },
                  ]}
                >
                  <Ionicons
                    name="image"
                    size={IconSizes.small}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={[
                      styles.attachmentText,
                      { color: theme.colors.primary },
                    ]}
                    maxFontSizeMultiplier={1.3}
                  >
                    Photo attached
                  </Text>
                </View>
              </View>
            )}
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
    paddingBottom: Spacing.xl,
  },

  headerSection: {
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  headerIcon: {
    width: IconSizes.xxlarge * 1.3,
    height: IconSizes.xxlarge * 1.3,
    borderRadius: IconSizes.xlarge * 0.65,
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

  typeCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.xlarge,
    padding: Spacing.lg,
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
    fontSize: FontSizes.regular,
    fontWeight: "700",
    marginBottom: Spacing.md,
    letterSpacing: -0.2,
  },
  typeSelector: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  typeOption: {
    flex: 1,
    borderWidth: 2,
    borderRadius: BorderRadius.xlarge,
    padding: Spacing.lg,
    alignItems: "center",
  },
  typeOptionActive: {
    borderWidth: 2,
  },
  creditActive: {
    borderColor: "#dc2626",
  },
  paymentActive: {
    borderColor: "#059669",
  },
  typeIconContainer: {
    width: IconSizes.xxlarge,
    height: IconSizes.xxlarge,
    borderRadius: IconSizes.xxlarge / 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  typeIconActiveCredit: {
    backgroundColor: "#fecaca",
  },
  typeIconActivePayment: {
    backgroundColor: "#bbf7d0",
  },
  typeLabel: {
    fontSize: FontSizes.medium,
    fontWeight: "700",
    marginBottom: 4,
    textAlign: "center",
  },
  typeSubtext: {
    fontSize: FontSizes.small,
    fontWeight: "500",
  },

  formCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.xlarge,
    padding: Spacing.lg,
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },

  infoGrid: {
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  infoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  infoLabel: {
    fontSize: FontSizes.medium,
    fontWeight: "500",
  },
  infoValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  infoValue: {
    fontSize: FontSizes.regular,
    fontWeight: "600",
  },

  inputGroup: {
    marginBottom: Spacing.lg,
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
  currencySymbol: {
    fontSize: FontSizes.regular,
    fontWeight: "700",
    marginRight: 4,
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
  dateText: {
    flex: 1,
    fontSize: FontSizes.regular,
    fontWeight: "500",
  },

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

  submitButton: {
    flexDirection: "row",
    height: ButtonSizes.xlarge,
    borderRadius: BorderRadius.xlarge,
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
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: FontSizes.large,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },

  summaryCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xlarge,
    borderWidth: 1,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  summaryTitle: {
    fontSize: FontSizes.regular,
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  summaryLabel: {
    fontSize: FontSizes.medium,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: FontSizes.medium,
    fontWeight: "600",
  },
  summaryAmount: {
    fontSize: FontSizes.large,
    fontWeight: "800",
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
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.small,
    gap: 4,
  },
  attachmentText: {
    fontSize: FontSizes.tiny,
    fontWeight: "600",
  },
});
