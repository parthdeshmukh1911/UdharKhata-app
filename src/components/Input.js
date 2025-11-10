import React, { useContext } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

function Input({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  ...props
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.text }]}>
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.text,
          },
          !editable && [
            styles.readOnly,
            { backgroundColor: theme.colors.card },
          ],
        ]}
        value={value}
        onChangeText={editable ? onChangeText : undefined}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textTertiary}
        editable={editable}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 4,
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  readOnly: {
    color: "#555",
  },
});

export default React.memo(Input);
