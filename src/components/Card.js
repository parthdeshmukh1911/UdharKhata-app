import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Card({ title, value, style }) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  title: { fontSize: 16, color: "#555", marginBottom: 8, fontWeight: "600" },
  value: { fontSize: 20, color: "#1e90ff", fontWeight: "bold" },
});