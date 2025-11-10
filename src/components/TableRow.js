import React, { useContext } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

function TableRow({ columns, actions, rowStyle }) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: theme.colors.border,
        },
        rowStyle,
      ]}
    >
      {columns.map((col, index) => (
        <View
          key={index}
          style={[styles.cell, col.flex ? { flex: col.flex } : {}]}
        >
          <Text
            style={[
              styles.text,
              { color: theme.colors.text },
              col.bold && { fontWeight: "bold" },
              col.textAlign && { textAlign: col.textAlign },
            ]}
          >
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
    fontSize: 14,
    textAlign: "center",
  },
});

export default React.memo(TableRow);
