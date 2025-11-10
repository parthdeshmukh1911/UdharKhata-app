import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

export default function Card({ title, value, style }) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.textSecondary }]}>
        {title}
      </Text>
      <Text style={[styles.value, { color: theme.colors.primary }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
    borderWidth: 1,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  title: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "600",
  },
  value: {
    fontSize: 20,
    fontWeight: "bold",
  },
});
