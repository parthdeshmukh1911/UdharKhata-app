import React, { useState, useContext } from "react";
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
import { Picker } from '@react-native-picker/picker';

import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { ENABLE_I18N, fallbackT } from "../config/i18nConfig";
import { useTheme } from "../contexts/ThemeContext";

const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function MonthlyReportDownloadModal({
  visible,
  onClose,
  onDownload,
  isGenerating,
}) {
  const { t } = ENABLE_I18N
    ? useContext(SimpleLanguageContext)
    : { t: fallbackT };
  const { theme } = useTheme();

  const now = new Date();

  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const years = Array.from(
    { length: 10 },
    (_, i) => now.getFullYear() - i
  );

  const handleDownload = () => {
    onDownload(selectedMonth, selectedYear);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: theme.isDarkMode ? "rgba(15, 23, 42, 0.9)" : "rgba(15, 23, 42, 0.7)" }]}>
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
          {/* Close Button */}
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: theme.colors.card }]}
            onPress={onClose}
            disabled={isGenerating}
          >
            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {/* Header Icon */}
          <View style={[styles.headerIcon, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="document-text" size={32} color={theme.colors.primary} />
          </View>

          {/* Title Section */}
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t("pdf.downloadMonthlyReport")}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {t("pdf.selectMonthYear")}
          </Text>

          {/* Month & Year Picker */}
<View style={styles.pickerRow}>
  <View style={styles.pickerColumn}>
    <Text style={[styles.pickerLabel, { color: theme.colors.textSecondary }]}>
      {t("pdf.selectMonth")}
    </Text>
    <View style={styles.pickerWrapper}>
      <Picker
        selectedValue={selectedMonth}
        style={styles.picker}
        onValueChange={(itemValue) => setSelectedMonth(itemValue)}
        enabled={!isGenerating}
        mode="dropdown"
      >
        {monthNames.map((name, index) => (
          <Picker.Item key={index} label={name} value={index + 1} />
        ))}
      </Picker>
    </View>
  </View>

  <View style={styles.pickerColumn}>
    <Text style={[styles.pickerLabel, { color: theme.colors.textSecondary }]}>
      {t("pdf.selectYear")}
    </Text>
    <View style={styles.pickerWrapper}>
      <Picker
        selectedValue={selectedYear}
        style={styles.picker}
        onValueChange={(itemValue) => setSelectedYear(itemValue)}
        enabled={!isGenerating}
        mode="dropdown"
      >
        {years.map((year) => (
          <Picker.Item key={year} label={String(year)} value={year} />
        ))}
      </Picker>
    </View>
  </View>
</View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={onClose}
              disabled={isGenerating}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>
                {t("common.cancel")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.downloadButton,
                { backgroundColor: theme.colors.primary },
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
        </View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
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
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },

  // Header
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 20,
  },

  // Title & Subtitle
  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
    fontWeight: "500",
  },

  // Picker Container
  pickerRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 24,
},
pickerColumn: {
  flex: 1,
},
pickerWrapper: {
  backgroundColor: "#f1f5f9", // Change as needed (theme-friendly)
  borderRadius: 8,
  overflow: "hidden",
  borderWidth: 1,
  borderColor: "#e2e8f0",
  marginTop: 6,
},
picker: {
  height: 44,
  width: "100%",
},
pickerLabel: {
  fontSize: 13,
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 2,
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
    borderWidth: 1.5,
  },
  downloadButton: {
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
