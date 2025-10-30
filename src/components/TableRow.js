import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

function TableRow({ columns, actions, rowStyle }) {
  return (
    <View style={[styles.row, rowStyle]}>
      {columns.map((col, index) => (
        <View
          key={index}
          style={[styles.cell, col.flex ? { flex: col.flex } : {}]}
        >
          <Text style={[
            styles.text, 
            col.bold && { fontWeight: "bold" },
            col.textAlign && { textAlign: col.textAlign }
          ]}>
            {col.value}
          </Text>
        </View>
      ))}
      {actions && <View style={styles.actions}>{actions}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  cell: {
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    color: "#333",
    fontSize: 14,
    textAlign: "center",
  },
});

export default React.memo(TableRow);