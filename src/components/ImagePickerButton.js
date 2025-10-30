import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy"; // ✅ Fixed: Use legacy API

export default function ImagePickerButton({
  onImageSelected,
  currentImage,
  onImageRemove,
}) {
  const [loading, setLoading] = useState(false);

  const requestPermissions = async () => {
    if (Platform.OS !== "web") {
      const { status: cameraStatus } =
        await ImagePicker.requestCameraPermissionsAsync();
      const { status: galleryStatus } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (cameraStatus !== "granted" || galleryStatus !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera and gallery permissions are needed to attach photos."
        );
        return false;
      }
    }
    return true;
  };

  const saveImageLocally = async (imageUri) => {
    try {
      const filename = `transaction_${Date.now()}.jpg`;
      const directory = `${FileSystem.documentDirectory}transaction_photos/`;

      // Create directory if it doesn't exist
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
          mediaTypes: ["images"], // ✅ Fixed: Use array instead of MediaTypeOptions
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"], // ✅ Fixed: Use array instead of MediaTypeOptions
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
      Alert.alert("Error", "Failed to pick image");
    } finally {
      setLoading(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      "Add Photo",
      "Choose a method",
      [
        {
          text: "Take Photo",
          onPress: () => pickImage("camera"),
        },
        {
          text: "Choose from Gallery",
          onPress: () => pickImage("gallery"),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const handleRemoveImage = () => {
    Alert.alert("Remove Photo", "Are you sure you want to remove this photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: onImageRemove,
      },
    ]);
  };

  if (currentImage) {
    return (
      <View style={styles.imageContainer}>
        <Text style={styles.label}>Attached Photo</Text>
        <View style={styles.imagePreviewContainer}>
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
      <Text style={styles.label}>Attach Photo (Optional)</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={showImageOptions}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#1e40af" />
        ) : (
          <>
            <Ionicons name="camera" size={24} color="#1e40af" />
            <Text style={styles.buttonText}>Add Photo</Text>
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
    color: "#475569",
    marginBottom: 8,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f9ff",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#bfdbfe",
    borderStyle: "dashed",
    gap: 10,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e40af",
  },
  imageContainer: {
    marginBottom: 20,
  },
  imagePreviewContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#e2e8f0",
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
