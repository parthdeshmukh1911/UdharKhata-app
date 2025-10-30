import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
//import AsyncStorage from "@react-native-async-storage/async-storage";
import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { storage } from '../StorageWrapper'
import { ENABLE_I18N } from "../config/i18nConfig";

export default function LanguageSelectionScreen({ navigation }) {
  const { changeLanguage, t } = ENABLE_I18N
    ? useContext(SimpleLanguageContext)
    : { changeLanguage: () => {}, t: (key) => key };

  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const languages = [
    {
      code: "en",
      name: "English",
      nativeName: "English",
      icon: "language",
      description: "English",
    },
    {
      code: "hi",
      name: "Hindi",
      nativeName: "हिंदी",
      icon: "text",
      description: "Hindi",
    },
    {
      code: "mr",
      name: "Marathi",
      nativeName: "मराठी",
      icon: "text",
      description: "Marathi",
    },
  ];

  const handleLanguageSelect = async (languageCode) => {
    setSelectedLanguage(languageCode);
    setIsLoading(true);

    try {
      await changeLanguage(languageCode);
      // Small delay for better UX
      setTimeout(() => {
        navigation.replace("Main");
      }, 500);
    } catch (error) {
      console.error("Error changing language:", error);
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header Icon */}
        <View style={styles.headerIconContainer}>
          <View style={styles.headerIconCircle}>
            <Ionicons name="globe-outline" size={48} color="#1e40af" />
          </View>
        </View>

        {/* Title Section */}
        <Text style={styles.title}>Select Language</Text>
        <Text style={styles.subtitle}>
          Choose your preferred language for the app
        </Text>

        {/* Language Options */}
        <View style={styles.languageList}>
          {languages.map((language) => {
            const isSelected = selectedLanguage === language.code;
            const isCurrentlyLoading = isLoading && isSelected;

            return (
              <TouchableOpacity
                key={language.code}
                style={[
                  styles.languageButton,
                  isSelected && styles.languageButtonSelected,
                ]}
                onPress={() => handleLanguageSelect(language.code)}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                <View style={styles.languageContent}>
                  {/* Language Icon */}
                  <View
                    style={[
                      styles.languageIconContainer,
                      isSelected && styles.languageIconSelected,
                    ]}
                  >
                    <Ionicons
                      name={language.icon}
                      size={24}
                      color={isSelected ? "#1e40af" : "#64748b"}
                    />
                  </View>

                  {/* Language Details */}
                  <View style={styles.languageDetails}>
                    <Text
                      style={[
                        styles.languageNative,
                        isSelected && styles.languageNativeSelected,
                      ]}
                    >
                      {language.nativeName}
                    </Text>
                    <Text
                      style={[
                        styles.languageName,
                        isSelected && styles.languageNameSelected,
                      ]}
                    >
                      {language.description}
                    </Text>
                  </View>

                  {/* Selection Indicator */}
                  <View style={styles.selectionIndicator}>
                    {isCurrentlyLoading ? (
                      <ActivityIndicator size="small" color="#1e40af" />
                    ) : isSelected ? (
                      <View style={styles.checkmarkContainer}>
                        <Ionicons
                          name="checkmark-circle"
                          size={28}
                          color="#059669"
                        />
                      </View>
                    ) : (
                      <View style={styles.uncheckedCircle}>
                        <Ionicons
                          name="ellipse-outline"
                          size={28}
                          color="#cbd5e1"
                        />
                      </View>
                    )}
                  </View>
                </View>

                {/* Progress Indicator for Selected */}
                {isSelected && !isCurrentlyLoading && (
                  <View style={styles.selectedIndicator} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer Note */}
        {/* <View style={styles.footerNote}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color="#64748b"
          />
          <Text style={styles.footerText}>
            You can change the language later in settings
          </Text>
        </View> */}
      </View>

      {/* Bottom Branding */}
      {/* <View style={styles.brandingContainer}>
        <View style={styles.brandingIcon}>
          <Ionicons name="shield-checkmark" size={20} color="#1e40af" />
        </View>
        <Text style={styles.brandingText}>Secure Financial Management</Text>
      </View> */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  // Header Icon
  headerIconContainer: {
    marginBottom: 32,
  },
  headerIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#bfdbfe",
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

  // Title Section
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 48,
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 24,
    maxWidth: 300,
  },

  // Language List
  languageList: {
    width: "100%",
    maxWidth: 400,
  },

  // Language Button
  languageButton: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#1e293b",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  languageButtonSelected: {
    borderColor: "#1e40af",
    backgroundColor: "#f0f9ff",
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

  languageContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },

  // Language Icon
  languageIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  languageIconSelected: {
    backgroundColor: "#dbeafe",
  },

  // Language Details
  languageDetails: {
    flex: 1,
  },
  languageNative: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  languageNativeSelected: {
    color: "#1e40af",
  },
  languageName: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  languageNameSelected: {
    color: "#1e40af",
  },

  // Selection Indicator
  selectionIndicator: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkContainer: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  uncheckedCircle: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },

  // Selected Indicator Bar
  selectedIndicator: {
    height: 4,
    backgroundColor: "#1e40af",
    marginTop: -2,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },

  // Footer Note
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 32,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    gap: 8,
  },
  footerText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
    flex: 1,
  },

  // Bottom Branding
  brandingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  brandingIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
  },
  brandingText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
