import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function Dropdown({
  data,
  searchKey,
  value,
  onSelect,
  placeholder,
}) {
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
      <View style={styles.inputContainer}>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#A9A9A9" // 👈 Add this line
          value={query}
          onChangeText={handleSearch}
          style={styles.input}
        />
        <Ionicons
          name={showList ? "chevron-up" : "chevron-down"}
          size={24}
          color="#333"
          onPress={() => setShowList(!showList)}
        />
      </View>

      {showList && (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item[searchKey]}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => handleSelect(item)}
            >
              <Text style={styles.itemText}>{item[searchKey]}</Text>
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
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    zIndex: 1,
  },
  input: { flex: 1, paddingVertical: 10, fontSize: 16 },
  list: {
    position: "absolute", // overlay
    top: 50, // height of input container + margin
    left: 0,
    right: 0,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
    zIndex: 10, // ensure it is above other content
  },
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  itemText: { fontSize: 16 },
});