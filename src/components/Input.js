import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";

function Input({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true, // default editable
  ...props
}) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, !editable && styles.readOnly]}
        value={value}
        onChangeText={editable ? onChangeText : undefined}
        placeholder={placeholder}
        placeholderTextColor="#A9A9A9" // 👈 Add this line with a visible color
        editable={editable}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { marginBottom: 4, fontWeight: "bold", color: "#333" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
    color: "#000",
  },
  readOnly: {
    backgroundColor: "#e6e6e6", // gray for read-only
    color: "#555", // dim text
  },
});

export default React.memo(Input);