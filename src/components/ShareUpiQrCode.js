import React, { useRef } from 'react';
import { View, Button, Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';      // Expo file system
import * as Sharing from 'expo-sharing';              // Expo sharing
import QRCode from 'react-native-qrcode-svg';         // Native QR code SVG

export default function ShareUPIQrCodeRemote({ upiLink, message }) {
  const qrCodeRef = useRef();

  const shareQrCode = async () => {
    try {
      if (!qrCodeRef.current) {
        Alert.alert("Error", "QR Code not ready");
        return;
      }
      // Convert QRCode SVG to base64 PNG string
      qrCodeRef.current.toDataURL(async (dataURL) => {
        try {
          const fileUri = FileSystem.cacheDirectory + `upi_payment_qr_${Date.now()}.png`;

          // Write base64 image data to file (Expo file system)
          await FileSystem.writeAsStringAsync(fileUri, dataURL, { encoding: FileSystem.EncodingType.Base64 });

          // Use Expo Sharing to open native share dialog with the image
          await Sharing.shareAsync(fileUri, {
            mimeType: 'image/png',
            dialogTitle: 'Share Payment QR Code',
            UTI: 'public.png',
          });
          
          // Optionally delete file after sharing:
          // await FileSystem.deleteAsync(fileUri, { idempotent: true });

        } catch (shareError) {
          Alert.alert("Error", "Failed to share payment QR code");
          console.error("Share error:", shareError);
        }
      });
    } catch (error) {
      Alert.alert("Error", "QR code generation error");
      console.error("QR code error:", error);
    }
  };

  return (
    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
      <QRCode
        value={upiLink}
        size={250}
        getRef={qrCodeRef}
        backgroundColor="white"
      />
      <Button title="Share Payment QR via WhatsApp" onPress={shareQrCode} />
    </View>
  );
}
