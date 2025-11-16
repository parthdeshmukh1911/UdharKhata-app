import React, { useContext, useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
  Dimensions,
  FlatList,
  Pressable,
  Animated,
} from "react-native";
import { SimpleLanguageContext } from "../contexts/SimpleLanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { ENABLE_I18N } from "../config/i18nConfig";

const screen = Dimensions.get("window");
const numColumns = 2;
const numRows = 8;
const H_PADDING = 12;
const H_GAP = 8;
const V_GAP = 8;

const verticalPadding = 24 + 12 + 50;
const availableHeight = screen.height - verticalPadding;
const TILE_HEIGHT = Math.floor((availableHeight / numRows) * 0.9) - V_GAP;
const TILE_WIDTH = Math.floor((screen.width - H_PADDING * 2 - H_GAP) / numColumns);

const shadow = (isDark) =>
  Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: isDark ? 0.25 : 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 6 },
    default: {},
  });

const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "hi", name: "Hindi", nativeName: "हिंदी" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { code: "sd", name: "Sindhi", nativeName: "سنڌي" },
  { code: "as", name: "Assamese", nativeName: "অসমীয়া" },
  { code: "bho", name: "Bhojpuri", nativeName: "भोजपुरी" },
  { code: "mrw", name: "Marwadi", nativeName: "मारवाड़ी" },
  { code: "mai", name: "Maithili", nativeName: "मैथिली" },
];

// ----------------------
// Language Tile Component
// ----------------------
function LanguageTile({
  item,
  isSelected,
  onPress,
  theme,
  palette,
  tileHeight,
  tileWidth,
  marginBottom,
  marginRight,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      friction: 7,
      tension: 150,
    }).start();

  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 120,
    }).start();

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
        height: tileHeight,
        width: tileWidth,
        marginBottom,
        marginRight,
      }}
    >
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        android_ripple={{ color: palette.subtle, foreground: true }}
        style={[
          styles.languageTile,
          {
            backgroundColor: isSelected ? palette.selection : palette.surface,
            borderColor: isSelected ? theme.colors.primary : palette.border,
          },
          shadow(theme.isDarkMode),
        ]}
      >
        {isSelected && (
          <View
            style={[
              styles.badge,
              { backgroundColor: palette.badgeBg, borderColor: theme.colors.primary },
            ]}
          >
            <Text style={[styles.badgeCheck, { color: theme.colors.primary }]}>✓</Text>
          </View>
        )}

        <View style={styles.tileTextWrap}>
          <Text
            style={[
              styles.nativeName,
              { color: isSelected ? theme.colors.primary : theme.colors.text },
            ]}
            numberOfLines={1}
          >
            {item.nativeName}
          </Text>
          <Text
            style={[
              styles.languageName,
              { color: isSelected ? theme.colors.primary : theme.colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ----------------------
// Background Decorations
// ----------------------
function BackgroundDecor({ theme }) {
  const soft = theme.isDarkMode ? "0.06" : "0.08";
  const softer = theme.isDarkMode ? "0.04" : "0.06";
  const blurStyle = Platform.OS === "web" ? { filter: "blur(40px)" } : null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.bubble, blurStyle, { top: -80, left: -60, backgroundColor: `rgba(59,130,246,${soft})` }]} />
      <View style={[styles.bubble, blurStyle, { bottom: -100, right: -80, backgroundColor: `rgba(16,185,129,${softer})` }]} />
      <View style={[styles.bubble, blurStyle, { bottom: 140, left: -70, backgroundColor: `rgba(99,102,241,${softer})` }]} />
    </View>
  );
}

// ----------------------
// Main Screen
// ----------------------
export default function ChangeLanguageScreen({ navigation }) {
  const ctx = useContext(SimpleLanguageContext);
  const changeLanguage =
    ENABLE_I18N && ctx?.changeLanguage ? ctx.changeLanguage : () => {};
  const t = ENABLE_I18N && ctx?.t ? ctx.t : (k) => k;

  const { theme } = useTheme();
  const [selectedLanguage, setSelectedLanguage] = useState(ctx.currentLanguage);

  const palette = useMemo(() => {
    return {
      primary: theme.colors.primary,
      surface: theme.colors.surface,
      border: theme.colors.border,
      subtle: theme.isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
      selection: theme.isDarkMode ? "#102a63" : "#e9f4ff",
      badgeBg: theme.isDarkMode ? "#1f2937" : "#eef2ff",
    };
  }, [theme]);

  const handleLanguageSelect = async (languageCode) => {
    setSelectedLanguage(languageCode);
    await changeLanguage(languageCode);

    // ⭐ Go back to settings instead of Main
    navigation.goBack();
  };

  const renderItem = ({ item, index }) => {
    const isLeftColumn = index % numColumns === 0;

    return (
      <LanguageTile
        item={item}
        isSelected={selectedLanguage === item.code}
        onPress={() => handleLanguageSelect(item.code)}
        theme={theme}
        palette={palette}
        tileHeight={TILE_HEIGHT}
        tileWidth={TILE_WIDTH}
        marginBottom={index >= numColumns * (numRows - 1) ? 0 : V_GAP}
        marginRight={isLeftColumn ? H_GAP : 0}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <BackgroundDecor theme={theme} />

      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Change Language</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {t("Choose your preferred language for the app")}
        </Text>
      </View>

      <FlatList
        data={languages}
        keyExtractor={(item) => item.code}
        renderItem={renderItem}
        numColumns={numColumns}
        columnWrapperStyle={{ justifyContent: "flex-start" }}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        initialNumToRender={16}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: "100%",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: Platform.OS === "android" ? 24 : 10,
  },
  headerContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    maxWidth: 360,
  },
  gridContainer: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 14,
  },
  languageTile: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 12,
    justifyContent: "center",
  },
  tileTextWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  nativeName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  languageName: {
    fontSize: 12.5,
    fontWeight: "500",
  },
  badge: {
    position: "absolute",
    top: 10,
    right: 10,
    height: 22,
    width: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  badgeCheck: {
    fontSize: 14,
    fontWeight: "800",
  },
  bubble: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
  },
});
