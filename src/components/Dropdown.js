import React, { useState, useEffect, useContext } from "react";
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";

export default function Dropdown({
  data,
  searchKey,
  value,
  onSelect,
  placeholder,
}) {
  const { theme } = useTheme();
  const [filteredData, setFilteredData] = useState([]);
  const [query, setQuery] = useState("");
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    setFilteredData(data);
  }, [data]);

  useEffect(() => {
    if (value) {
      setQuery(value);
    }
  }, [value]);

  const handleSearch = (text) => {
    setQuery(text);
    if (text.trim() === "") {
      setFilteredData(data);
    } else {
      const filtered = data.filter((item) =>
        item[searchKey].toLowerCase().includes(text.toLowerCase())
      );
      setFilteredData(filtered);
    }
    setShowList(true);
  };

  const handleSelect = (item) => {
    onSelect(item);
    setQuery(item[searchKey]);
    setShowList(false);
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textTertiary}
          value={query}
          onChangeText={handleSearch}
          style={[styles.input, { color: theme.colors.text }]}
        />
        <Ionicons
          name={showList ? "chevron-up" : "chevron-down"}
          size={24}
          color={theme.colors.textSecondary}
          onPress={() => setShowList(!showList)}
        />
      </View>

      {showList && (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item[searchKey]}
          style={[
            styles.list,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.item,
                { borderBottomColor: theme.colors.borderLight },
              ]}
              onPress={() => handleSelect(item)}
            >
              <Text style={[styles.itemText, { color: theme.colors.text }]}>
                {item[searchKey]}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", position: "relative" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    zIndex: 1,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "500",
  },
  list: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: 8,
    zIndex: 10,
  },
  item: {
    padding: 12,
    borderBottomWidth: 1,
  },
  itemText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
