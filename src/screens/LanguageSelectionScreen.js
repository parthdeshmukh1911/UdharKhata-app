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
import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { storage } from '../StorageWrapper'
import { ENABLE_I18N } from "../config/i18nConfig";
import { useTheme } from "../contexts/ThemeContext";

export default function LanguageSelectionScreen({ navigation }) {
  const { changeLanguage, t } = ENABLE_I18N
    ? useContext(SimpleLanguageContext)
    : { changeLanguage: () => {}, t: (key) => key };
  const { theme } = useTheme();

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
      setTimeout(() => {
        navigation.replace("Main");
      }, 500);
    } catch (error) {
      console.error("Error changing language:", error);
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Header Icon */}
        <View style={styles.headerIconContainer}>
          <View
            style={[
              styles.headerIconCircle,
              {
                backgroundColor: theme.colors.primaryLight,
                borderColor: theme.isDarkMode ? theme.colors.primary : "#bfdbfe",
              },
            ]}
          >
            <Ionicons name="globe-outline" size={48} color={theme.colors.primary} />
          </View>
        </View>

        {/* Title Section */}
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Select Language
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
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
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                  isSelected && [
                    styles.languageButtonSelected,
                    {
                      borderColor: theme.colors.primary,
                      backgroundColor: theme.isDarkMode ? "#1e3a8a" : "#f0f9ff",
                    },
                  ],
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
                      {
                        backgroundColor: theme.colors.card,
                      },
                      isSelected && [
                        styles.languageIconSelected,
                        { backgroundColor: theme.colors.primaryLight },
                      ],
                    ]}
                  >
                    <Ionicons
                      name={language.icon}
                      size={24}
                      color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                    />
                  </View>

                  {/* Language Details */}
                  <View style={styles.languageDetails}>
                    <Text
                      style={[
                        styles.languageNative,
                        { color: theme.colors.text },
                        isSelected && { color: theme.colors.primary },
                      ]}
                    >
                      {language.nativeName}
                    </Text>
                    <Text
                      style={[
                        styles.languageName,
                        { color: theme.colors.textSecondary },
                        isSelected && { color: theme.colors.primary },
                      ]}
                    >
                      {language.description}
                    </Text>
                  </View>

                  {/* Selection Indicator */}
                  <View style={styles.selectionIndicator}>
                    {isCurrentlyLoading ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} />
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
                          color={theme.colors.textTertiary}
                        />
                      </View>
                    )}
                  </View>
                </View>

                {/* Progress Indicator for Selected */}
                {isSelected && !isCurrentlyLoading && (
                  <View
                    style={[
                      styles.selectedIndicator,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer Note */}
        {/* <View style={[styles.footerNote, { backgroundColor: theme.colors.card }]}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            You can change the language later in settings
          </Text>
        </View> */}
      </View>

      {/* Bottom Branding */}
      {/* <View style={styles.brandingContainer}>
        <View style={[styles.brandingIcon, { backgroundColor: theme.colors.primaryLight }]}>
          <Ionicons name="shield-checkmark" size={20} color={theme.colors.primary} />
        </View>
        <Text style={[styles.brandingText, { color: theme.colors.textSecondary }]}>
          Secure Financial Management
        </Text>
      </View> */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
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
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
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
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
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
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  languageIconSelected: {},

  // Language Details
  languageDetails: {
    flex: 1,
  },
  languageNative: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  languageNativeSelected: {
    color: "#1e40af",
  },
  languageName: {
    fontSize: 14,
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
    borderRadius: 12,
    gap: 8,
  },
  footerText: {
    fontSize: 13,
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
    justifyContent: "center",
    alignItems: "center",
  },
  brandingText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
