// src/components/ImagePickerButton.js

import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useTheme } from "../contexts/ThemeContext";
import { useAlert } from "../contexts/AlertContext"; // ✅ ADD THIS

export default function ImagePickerButton({
  onImageSelected,
  currentImage,
  onImageRemove,
}) {
  const { theme } = useTheme();
  const { showAlert } = useAlert(); // ✅ ADD THIS
  const [loading, setLoading] = useState(false);

  const requestPermissions = async () => {
    if (Platform.OS !== "web") {
      const { status: cameraStatus } =
        await ImagePicker.requestCameraPermissionsAsync();
      const { status: galleryStatus } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (cameraStatus !== "granted" || galleryStatus !== "granted") {
        // ✅ REPLACED: Alert.alert with showAlert
        showAlert({
          title: "Permission Required",
          message: "Camera and gallery permissions are needed to attach photos.",
          type: "warning",
          buttons: [
            {
              text: "OK",
              style: "primary",
            },
          ],
        });
        return false;
      }
    }
    return true;
  };

  const saveImageLocally = async (imageUri) => {
    try {
      const filename = `transaction_${Date.now()}.jpg`;
      const directory = `${FileSystem.documentDirectory}transaction_photos/`;

      const dirInfo = await FileSystem.getInfoAsync(directory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      }

      const newPath = `${directory}${filename}`;
      await FileSystem.copyAsync({
        from: imageUri,
        to: newPath,
      });

      return newPath;
    } catch (error) {
      console.error("Error saving image:", error);
      throw error;
    }
  };

  const pickImage = async (source) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setLoading(true);
    try {
      let result;

      if (source === "camera") {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const savedPath = await saveImageLocally(result.assets[0].uri);
        onImageSelected(savedPath);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      // ✅ REPLACED: Alert.alert with showAlert
      showAlert({
        title: "Error",
        message: "Failed to pick image. Please try again.",
        type: "error",
        buttons: [
          {
            text: "OK",
            style: "primary",
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const showImageOptions = () => {
    // ✅ REPLACED: Alert.alert with showAlert
    showAlert({
      title: "Add Photo",
      message: "Choose a method",
      type: "info",
      buttons: [
        {
          text: "Take Photo",
          style: "primary",
          onPress: () => pickImage("camera"),
        },
        {
          text: "Choose from Gallery",
          style: "primary",
          onPress: () => pickImage("gallery"),
        },
        {
          text: "Cancel",
          style: "secondary",
        },
      ],
    });
  };

  const handleRemoveImage = () => {
    // ✅ REPLACED: Alert.alert with showAlert
    showAlert({
      title: "Remove Photo",
      message: "Are you sure you want to remove this photo?",
      type: "warning",
      buttons: [
        {
          text: "Cancel",
          style: "secondary",
        },
        {
          text: "Remove",
          style: "primary",
          onPress: onImageRemove,
        },
      ],
    });
  };

  if (currentImage) {
    return (
      <View style={styles.imageContainer}>
        <Text style={[styles.label, { color: theme.colors.text }]}>
          Attached Photo
        </Text>
        <View
          style={[
            styles.imagePreviewContainer,
            { borderColor: theme.colors.border },
          ]}
        >
          <Image source={{ uri: currentImage }} style={styles.imagePreview} />
          <TouchableOpacity
            style={styles.removeButton}
            onPress={handleRemoveImage}
          >
            <Ionicons name="close-circle" size={28} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.text }]}>
        Attach Photo (Optional)
      </Text>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: theme.isDarkMode ? "#1e3a8a" : "#f0f9ff",
            borderColor: theme.isDarkMode ? theme.colors.primary : "#bfdbfe",
          },
        ]}
        onPress={showImageOptions}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <>
            <Ionicons name="camera" size={24} color={theme.colors.primary} />
            <Text style={[styles.buttonText, { color: theme.colors.primary }]}>
              Add Photo
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: "dashed",
    gap: 10,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  imageContainer: {
    marginBottom: 20,
  },
  imagePreviewContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
  },
  imagePreview: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  removeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
  },
});
