// src/screens/AddTransactionScreen.js
import React, { useState, useContext, useEffect } from "react";
import { View, StyleSheet, Alert, Text, ScrollView, Platform, KeyboardAvoidingView, TextInput, TouchableOpacity, ActivityIndicator, Animated, } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import SQLiteService from "../services/SQLiteService";
import ImagePickerButton from "../components/ImagePickerButton";
import { CustomerContext } from "../contexts/CustomerContext";
import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { ENABLE_I18N, fallbackT } from "../config/i18nConfig";
import { ValidationUtils } from "../Utils/ValidationUtils";
import { useTheme } from "../contexts/ThemeContext";
import { FontSizes, Spacing, IconSizes, ButtonSizes, BorderRadius } from "../Utils/Responsive";


export default function AddTransactionScreen({ navigation, route }) {
  const { allCustomers, loading: customersLoading, refreshCustomers, } = useContext(CustomerContext);
  const { t } = ENABLE_I18N ? useContext(SimpleLanguageContext) : { t: fallbackT };
  const { theme } = useTheme();


  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("CREDIT");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');


  // Validation states
  const [amountError, setAmountError] = useState("");
  const [amountValid, setAmountValid] = useState(false);


  const dropdownAnimation = React.useRef(new Animated.Value(0)).current;


  const filteredCustomers = (allCustomers || []).filter(customer =>
    customer["Customer Name"].toLowerCase().includes(customerSearch.toLowerCase())
  );


  // Set selected customer from navigation params
  useEffect(() => {
    if (route.params?.selectedCustomer) {
      setSelectedCustomer(route.params.selectedCustomer);
    }
  }, [route.params?.selectedCustomer]);


  // ✅ NEW: Pre-fill form from voice input
  useEffect(() => {
    if (route.params?.voiceInput) {
      const { type: voiceType, amount: voiceAmount, note: voiceNote } = route.params.voiceInput;
      
      console.log('📝 Voice input received:', { voiceType, voiceAmount, voiceNote });
      
      if (voiceType) {
        setType(voiceType); // Set CREDIT or PAYMENT
        console.log('✅ Transaction type set to:', voiceType);
      }
      
      if (voiceAmount) {
        setAmount(voiceAmount); // Set amount
        console.log('✅ Amount set to:', voiceAmount);
        
        // Validate the amount
        const cleaned = voiceAmount.replace(/[^0-9.]/g, "");
        if (cleaned.length > 0 && !isNaN(parseFloat(cleaned)) && parseFloat(cleaned) > 0) {
          setAmountValid(true);
          setAmountError("");
          console.log('✅ Amount validated successfully');
        }
      }
      
      if (voiceNote) {
        setNote(voiceNote); // Set note
        console.log('✅ Note set to:', voiceNote);
      }
    }
  }, [route.params?.voiceInput]);


  useEffect(() => {
    Animated.spring(dropdownAnimation, {
      toValue: dropdownOpen ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
    }).start();
  }, [dropdownOpen]);


  // Real-time amount validation
  const handleAmountChange = (text) => {
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


  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setDropdownOpen(false);
    setCustomerSearch('');
  };


  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };


  const formatDisplayDate = (date) => {
    const options = { weekday: "short", year: "numeric", month: "short", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  };


  const handleAddTransaction = async () => {
    if (isSubmitting) return;
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
        photo,
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
        const customerName = selectedCustomer["Customer Name"] || t("transaction.customer");
        const phone = selectedCustomer["Phone Number"];
        if (phone) {
          Alert.alert(
            t("common.success"),
            `${t("transaction.transactionAddedSuccessfully")}!\n\n${t("transaction.sendNotificationTo")} ${customerName}?`,
            [
              {
                text: t("transaction.skip"),
                onPress: () => navigateBack(),
              },
              {
                text: t("transaction.whatsapp"),
                onPress: () => {
                  const { createTransactionMessage, sendWhatsAppMessage } = require("../Utils/WhatsAppService");
                  const message = createTransactionMessage(selectedCustomer, transactionData, t);
                  sendWhatsAppMessage(phone, message, t);
                  navigateBack();
                },
              },
              {
                text: t("transaction.sms"),
                onPress: () => {
                  const { createSMSMessage, sendSMSMessage } = require("../Utils/WhatsAppService");
                  const message = createSMSMessage(selectedCustomer, transactionData, t);
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
        Alert.alert(t("common.error"), res.message || t("transaction.failedToAddTransaction"));
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
    setPhoto(null);
    navigation.navigate("Transactions", {
      transactionAdded: true,
      addedForCustomerId: selectedCustomer["Customer ID"],
      hadSelectedCustomer: route.params?.hasSelectedCustomer || false,
    });
  };


  const isFormValid = selectedCustomer && amountValid && date;
  const isCredit = type === "CREDIT";


  const dropdownHeight = dropdownAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 280],
  });


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
            { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
          ]}
        >
          <View style={[styles.headerIcon, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="receipt" size={IconSizes.xlarge} color={theme.colors.primary} />
          </View>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
            {t("transaction.newTransaction")}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
            {t("transaction.recordNewTransaction")}
          </Text>
        </View>


        {/* Transaction Type Selector */}
        <View
          style={[
            styles.typeCard,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
            {t("transaction.transactionType")}
          </Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeOption,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                isCredit && styles.typeOptionActive,
                isCredit && styles.creditActive,
              ]}
              onPress={() => setType("CREDIT")}
            >
              <View style={[styles.typeIconContainer, isCredit && styles.typeIconActiveCredit]}>
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
                {t("transaction.creditGiven")}
              </Text>
              <Text
                style={[
                  styles.typeSubtext,
                  { color: theme.colors.textTertiary },
                  isCredit && { color: theme.colors.textSecondary },
                ]}
                maxFontSizeMultiplier={1.2}
              >
                {t("transaction.moneyLent")}
              </Text>
            </TouchableOpacity>


            <TouchableOpacity
              style={[
                styles.typeOption,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                !isCredit && styles.typeOptionActive,
                !isCredit && styles.paymentActive,
              ]}
              onPress={() => setType("PAYMENT")}
            >
              <View style={[styles.typeIconContainer, !isCredit && styles.typeIconActivePayment]}>
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
                {t("transaction.paymentReceived")}
              </Text>
              <Text
                style={[
                  styles.typeSubtext,
                  { color: theme.colors.textTertiary },
                  !isCredit && { color: theme.colors.textSecondary },
                ]}
                maxFontSizeMultiplier={1.2}
              >
                {t("transaction.moneyReturned")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>


        {/* Transaction Details Card */}
        <View
          style={[
            styles.formCard,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
            {t("transaction.transactionDetails")}
          </Text>


          {/* Custom Dropdown Customer Selector */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
              {t("transaction.customer")}{" "}
              <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.dropdownContainer}>
              {/* Dropdown Button */}
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: dropdownOpen
                      ? theme.colors.primary
                      : selectedCustomer
                      ? "#059669"
                      : theme.colors.border,
                  },
                ]}
                onPress={() => setDropdownOpen(!dropdownOpen)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="person"
                  size={IconSizes.medium}
                  color={selectedCustomer ? "#059669" : theme.colors.textSecondary}
                  style={styles.inputIcon}
                />
                <Text
                  style={[
                    styles.dropdownText,
                    {
                      color: selectedCustomer ? theme.colors.text : theme.colors.textTertiary,
                    },
                  ]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                >
                  {selectedCustomer
                    ? selectedCustomer["Customer Name"]
                    : customersLoading
                    ? t("common.loading")
                    : allCustomers?.length === 0
                    ? t("transaction.noCustomersFound")
                    : t("customer.selectCustomer")}
                </Text>
                <Ionicons
                  name={dropdownOpen ? "chevron-up" : "chevron-down"}
                  size={IconSizes.medium}
                  color={theme.colors.textTertiary}
                />
                {selectedCustomer && !dropdownOpen && (
                  <Ionicons name="checkmark-circle" size={IconSizes.medium} color="#059669" />
                )}
              </TouchableOpacity>


              {/* Dropdown List with Backdrop */}
              {dropdownOpen && (
                <>
                  <TouchableOpacity
                    style={styles.dropdownBackdrop}
                    activeOpacity={1}
                    onPress={() => {
                      setDropdownOpen(false);
                      setCustomerSearch('');
                    }}
                  />
                  <Animated.View
                    style={[
                      styles.dropdownList,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        maxHeight: dropdownHeight,
                      },
                    ]}
                  >
                    {/* Search Input */}
                    <View
                      style={[styles.dropdownSearch, { borderBottomColor: theme.colors.borderLight }]}
                    >
                      <View
                        style={[
                          styles.searchInputWrapper,
                          {
                            backgroundColor: theme.colors.card,
                            borderColor: theme.colors.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name="search"
                          size={IconSizes.small}
                          color={theme.colors.textSecondary}
                        />
                        <TextInput
                          style={[styles.searchInput, { color: theme.colors.text }]}
                          placeholder={t("common.search")}
                          placeholderTextColor={theme.colors.textTertiary}
                          value={customerSearch}
                          onChangeText={setCustomerSearch}
                          maxFontSizeMultiplier={1.3}
                        />
                        {customerSearch.length > 0 && (
                          <TouchableOpacity onPress={() => setCustomerSearch('')}>
                            <Ionicons
                              name="close-circle"
                              size={IconSizes.small}
                              color={theme.colors.textSecondary}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>


                    {/* Customer Items */}
                    <ScrollView
                      style={styles.dropdownScrollView}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled={true}
                    >
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((customer, index) => {
                          const isSelected = selectedCustomer?.["Customer ID"] === customer["Customer ID"];
                          return (
                            <TouchableOpacity
                              key={customer["Customer ID"]}
                              style={[
                                styles.dropdownItem,
                                isSelected && { backgroundColor: theme.colors.primaryLight },
                                index !== filteredCustomers.length - 1 && {
                                  borderBottomColor: theme.colors.borderLight,
                                  borderBottomWidth: 1,
                                },
                              ]}
                              onPress={() => handleCustomerSelect(customer)}
                              activeOpacity={0.7}
                            >
                              <View
                                style={[
                                  styles.dropdownItemIcon,
                                  {
                                    backgroundColor: isSelected
                                      ? theme.colors.primary
                                      : theme.colors.primaryLight,
                                  },
                                ]}
                              >
                                <Ionicons
                                  name="person"
                                  size={IconSizes.small}
                                  color={isSelected ? "#fff" : theme.colors.primary}
                                />
                              </View>
                              <Text
                                style={[
                                  styles.dropdownItemName,
                                  { color: isSelected ? theme.colors.primary : theme.colors.text },
                                ]}
                                numberOfLines={1}
                                maxFontSizeMultiplier={1.3}
                              >
                                {customer["Customer Name"]}
                              </Text>
                              {isSelected && (
                                <Ionicons
                                  name="checkmark-circle"
                                  size={IconSizes.medium}
                                  color={theme.colors.primary}
                                />
                              )}
                            </TouchableOpacity>
                          );
                        })
                      ) : (
                        <View style={styles.dropdownEmpty}>
                          <Ionicons
                            name="person-outline"
                            size={IconSizes.xlarge}
                            color={theme.colors.textTertiary}
                          />
                          <Text
                            style={[styles.dropdownEmptyText, { color: theme.colors.textSecondary }]}
                            maxFontSizeMultiplier={1.3}
                          >
                            No customers found
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  </Animated.View>
                </>
              )}
            </View>
            {selectedCustomer && (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={IconSizes.small} color="#059669" />
                <Text style={styles.successText} maxFontSizeMultiplier={1.3}>
                  {t("transaction.balance")}: ₹ {(selectedCustomer["Total Balance"] || 0).toLocaleString()}
                </Text>
              </View>
            )}
          </View>


          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
              {t("transaction.amount")}
              <Text style={styles.required}>*</Text>
            </Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                amountError && { borderColor: "#dc2626", backgroundColor: theme.isDarkMode ? "#7f1d1d" : "#fef2f2" },
                amountValid && !amountError && { borderColor: "#059669" },
              ]}
            >
              <Ionicons
                name="cash"
                size={IconSizes.medium}
                color={
                  amountError ? "#dc2626" : amountValid ? "#059669" : theme.colors.textSecondary
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
                placeholder={t("transaction.amountPlaceholder")}
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="decimal-pad"
                maxFontSizeMultiplier={1.3}
              />
              {amountValid && (
                <Ionicons name="checkmark-circle" size={IconSizes.medium} color="#059669" />
              )}
              {amountError && (
                <Ionicons name="close-circle" size={IconSizes.medium} color="#dc2626" />
              )}
            </View>
            {amountError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={IconSizes.small} color="#dc2626" />
                <Text style={styles.errorText} maxFontSizeMultiplier={1.3}>
                  {amountError}
                </Text>
              </View>
            ) : amountValid ? (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={IconSizes.small} color="#059669" />
                <Text style={styles.successText} maxFontSizeMultiplier={1.3}>
                  {amount && `₹${parseFloat(amount).toLocaleString()} ${t("transaction.entered")}`}
                </Text>
              </View>
            ) : null}
          </View>


          {/* Date Picker */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
              {t("transaction.date")}
              <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={[styles.inputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
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
              <Ionicons name="chevron-down" size={IconSizes.medium} color={theme.colors.textTertiary} />
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


          {/* Note Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
              {t("transaction.note")}{" "}
              <Text style={[styles.optional, { color: theme.colors.textSecondary }]}>
                ({t("transaction.optional")})
              </Text>
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
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
                placeholder={t("transaction.notePlaceholder")}
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxFontSizeMultiplier={1.3}
              />
            </View>
          </View>


          {/* Photo Attachment */}
          <ImagePickerButton onImageSelected={setPhoto} currentImage={photo} onImageRemove={() => setPhoto(null)} />


          {/* Submit Button Inside Card */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: theme.colors.primary },
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
                <Ionicons name="checkmark-circle" size={IconSizes.large} color="#fff" />
                <Text style={styles.submitButtonText} maxFontSizeMultiplier={1.3}>
                  {isCredit ? t("transaction.recordCredit") : t("transaction.recordPayment")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>


        {/* Transaction Summary Preview */}
        {isFormValid && (
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.summaryHeader}>
              <Ionicons name="information-circle" size={IconSizes.medium} color={theme.colors.primary} />
              <Text style={[styles.summaryTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                {t("transaction.transactionSummary")}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.3}>
                {t("transaction.customerLabel")}
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                {selectedCustomer["Customer Name"]}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.3}>
                {t("transaction.typeLabel")}
              </Text>
              <Text
                style={[
                  styles.summaryValue,
                  isCredit ? styles.creditText : styles.paymentText,
                ]}
                maxFontSizeMultiplier={1.3}
              >
                {isCredit ? t("transaction.creditGiven") : t("transaction.paymentReceived")}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.3}>
                {t("transaction.amountLabel")}
              </Text>
              <Text style={[styles.summaryAmount, { color: theme.colors.primary }]} maxFontSizeMultiplier={1.3}>
                ₹{parseFloat(amount).toLocaleString()}
              </Text>
            </View>
            {photo && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]} maxFontSizeMultiplier={1.3}>
                  Attachment
                </Text>
                <View style={[styles.attachmentBadge, { backgroundColor: theme.colors.primaryLight }]}>
                  <Ionicons name="image" size={IconSizes.small} color={theme.colors.primary} />
                  <Text style={[styles.attachmentText, { color: theme.colors.primary }]} maxFontSizeMultiplier={1.3}>
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
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xl },


  // Header Section
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


  // Type Selector Card
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
      android: { elevation: 2 },
    }),
  },
  sectionTitle: {
    fontSize: FontSizes.regular,
    fontWeight: "700",
    marginBottom: Spacing.md,
    letterSpacing: -0.2,
  },
  typeSelector: { flexDirection: "row", gap: Spacing.md },
  typeOption: {
    flex: 1,
    borderWidth: 2,
    borderRadius: BorderRadius.xlarge,
    padding: Spacing.lg,
    alignItems: "center",
  },
  typeOptionActive: { borderWidth: 2 },
  creditActive: { borderColor: "#dc2626" },
  paymentActive: { borderColor: "#059669" },
  typeIconContainer: {
    width: IconSizes.xxlarge,
    height: IconSizes.xxlarge,
    borderRadius: IconSizes.xxlarge / 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  typeIconActiveCredit: { backgroundColor: "#fecaca" },
  typeIconActivePayment: { backgroundColor: "#bbf7d0" },
  typeLabel: {
    fontSize: FontSizes.medium,
    fontWeight: "700",
    marginBottom: 4,
    textAlign: "center",
  },
  typeSubtext: { fontSize: FontSizes.small, fontWeight: "500" },


  // Form Card
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
      android: { elevation: 2 },
    }),
  },


  // Input Group
  inputGroup: { marginBottom: Spacing.lg },
  label: {
    fontSize: FontSizes.medium,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    letterSpacing: 0.1,
  },
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
  currencySymbol: { fontSize: FontSizes.regular, fontWeight: "700", marginRight: 4 },
  input: { flex: 1, fontSize: FontSizes.regular, fontWeight: "500", paddingVertical: 0 },
  textArea: { minHeight: 80, paddingTop: Spacing.md, paddingBottom: Spacing.md },
  dateText: { flex: 1, fontSize: FontSizes.regular, fontWeight: "500" },


  // Custom Dropdown
  dropdownContainer: { position: "relative", zIndex: 1000 },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: BorderRadius.large,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    height: ButtonSizes.large,
    zIndex: 1,
  },
  dropdownText: { flex: 1, fontSize: FontSizes.regular, fontWeight: "500" },


  // Backdrop
  dropdownBackdrop: {
    position: "absolute",
    top: 0,
    left: -Spacing.lg,
    right: -Spacing.lg,
    bottom: -500,
    zIndex: 9998,
  },


  // Dropdown List
  dropdownList: {
    position: "absolute",
    top: ButtonSizes.large + Spacing.sm,
    left: 0,
    right: 0,
    borderRadius: BorderRadius.large,
    borderWidth: 1.5,
    overflow: "hidden",
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: "#1e293b",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: { elevation: 16 },
    }),
  },
  dropdownSearch: { padding: Spacing.md, borderBottomWidth: 1 },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    height: ButtonSizes.medium,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.regular,
    fontWeight: "500",
    paddingVertical: 0,
  },
  dropdownScrollView: { maxHeight: 220 },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  dropdownItemIcon: {
    width: IconSizes.large,
    height: IconSizes.large,
    borderRadius: IconSizes.large / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownItemName: { flex: 1, fontSize: FontSizes.regular, fontWeight: "700" },
  dropdownEmpty: { paddingVertical: 48, alignItems: "center", gap: Spacing.md },
  dropdownEmptyText: { fontSize: FontSizes.regular, fontWeight: "500" },


  // Validation Messages
  errorContainer: { flexDirection: "row", alignItems: "center", marginTop: Spacing.sm, gap: 4 },
  errorText: { fontSize: FontSizes.small, color: "#dc2626", fontWeight: "500" },
  successContainer: { flexDirection: "row", alignItems: "center", marginTop: Spacing.sm, gap: 4 },
  successText: { fontSize: FontSizes.small, color: "#059669", fontWeight: "500" },


  // Submit Button Inside Card
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
      android: { elevation: 4 },
    }),
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: {
    fontSize: FontSizes.large,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },


  // Summary Card
  summaryCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xlarge,
    borderWidth: 1,
  },
  summaryHeader: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.lg, gap: Spacing.sm },
  summaryTitle: { fontSize: FontSizes.regular, fontWeight: "700" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md },
  summaryLabel: { fontSize: FontSizes.medium, fontWeight: "500" },
  summaryValue: { fontSize: FontSizes.medium, fontWeight: "600" },
  summaryAmount: { fontSize: FontSizes.large, fontWeight: "800" },
  creditText: { color: "#dc2626" },
  paymentText: { color: "#059669" },
  attachmentBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.small,
    gap: 4,
  },
  attachmentText: { fontSize: FontSizes.tiny, fontWeight: "600" },
});
