import React, { useState, useEffect, useContext } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { ENABLE_I18N, fallbackT } from "../config/i18nConfig";

export default function PDFDownloadModal({
  visible,
  onClose,
  onDownload,
  transactions,
  isGenerating,
}) {
  const { t } = ENABLE_I18N
    ? useContext(SimpleLanguageContext)
    : { t: fallbackT };

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Set default dates when modal opens
  useEffect(() => {
    if (visible && transactions.length > 0) {
      // Get first transaction date (oldest)
      const sortedByDate = [...transactions].sort(
        (a, b) => new Date(a.Date) - new Date(b.Date)
      );
      setStartDate(new Date(sortedByDate[0].Date));
      setEndDate(new Date()); // Today
    }
  }, [visible, transactions]);

  const formatDate = (date) => {
    return date.toLocaleDateString("en-GB"); // DD/MM/YYYY format
  };

  const formatDateLong = (date) => {
    const options = { day: "numeric", month: "short", year: "numeric" };
    return date.toLocaleDateString("en-US", options);
  };

  const handleDownload = () => {
    onDownload(startDate, endDate);
  };

  const onStartDateChange = (event, selectedDate) => {
    setShowStartPicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    setShowEndPicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  // Calculate days difference
  const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            disabled={isGenerating}
          >
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>

          {/* Header Icon */}
          <View style={styles.headerIcon}>
            <Ionicons name="document-text" size={32} color="#1e40af" />
          </View>

          {/* Title Section */}
          <Text style={styles.title}>{t("pdf.downloadReport")}</Text>
          <Text style={styles.subtitle}>{t("pdf.selectDateRange")}</Text>

          {/* Date Range Card */}
          <View style={styles.dateRangeCard}>
            {/* Start Date */}
            <View style={styles.dateSection}>
              <View style={styles.dateLabelContainer}>
                <Ionicons name="calendar-outline" size={16} color="#64748b" />
                <Text style={styles.dateLabel}>{t("pdf.startDate")}</Text>
              </View>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartPicker(true)}
                disabled={isGenerating}
              >
                <View style={styles.dateButtonContent}>
                  <Text style={styles.dateTextMain}>
                    {formatDate(startDate)}
                  </Text>
                  <Text style={styles.dateTextSub}>
                    {formatDateLong(startDate)}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Date Range Indicator */}
            <View style={styles.dateRangeIndicator}>
              <View style={styles.dateRangeLine} />
              <View style={styles.dateRangeIcon}>
                <Ionicons name="swap-vertical" size={16} color="#1e40af" />
              </View>
              <View style={styles.dateRangeLine} />
            </View>

            {/* End Date */}
            <View style={styles.dateSection}>
              <View style={styles.dateLabelContainer}>
                <Ionicons name="calendar-outline" size={16} color="#64748b" />
                <Text style={styles.dateLabel}>{t("pdf.endDate")}</Text>
              </View>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndPicker(true)}
                disabled={isGenerating}
              >
                <View style={styles.dateButtonContent}>
                  <Text style={styles.dateTextMain}>{formatDate(endDate)}</Text>
                  <Text style={styles.dateTextSub}>
                    {formatDateLong(endDate)}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Duration Badge */}
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={16} color="#1e40af" />
            <Text style={styles.durationText}>
              {daysDiff} {daysDiff === 1 ? "day" : "days"} •{" "}
              {transactions.length} transactions
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isGenerating}
            >
              <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.downloadButton,
                isGenerating && styles.downloadButtonDisabled,
              ]}
              onPress={handleDownload}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.downloadButtonText}>
                    {t("pdf.generatingPDF")}
                  </Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.downloadButtonText}>
                    {t("pdf.generatePDF")}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Date Pickers */}
          {showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onStartDateChange}
              maximumDate={endDate}
            />
          )}

          {showEndPicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onEndDateChange}
              minimumDate={startDate}
              maximumDate={new Date()}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: "#1e293b",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  // Close Button
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },

  // Header
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    color: "#1e293b",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#64748b",
    marginBottom: 24,
    lineHeight: 20,
    fontWeight: "500",
  },

  // Date Range Card
  dateRangeCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  dateSection: {
    marginBottom: 8,
  },
  dateLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 6,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 14,
  },
  dateButtonContent: {
    flex: 1,
  },
  dateTextMain: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  dateTextSub: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },

  // Date Range Indicator
  dateRangeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  dateRangeLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#cbd5e1",
  },
  dateRangeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
  },

  // Duration Badge
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  durationText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e40af",
  },

  // Buttons
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  cancelButton: {
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  downloadButton: {
    backgroundColor: "#1e40af",
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
  downloadButtonDisabled: {
    opacity: 0.7,
  },
  cancelButtonText: {
    color: "#64748b",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  downloadButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
