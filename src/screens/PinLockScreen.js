// src/screens/PinLockScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { usePinLock } from '../contexts/PinLockContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  FontSizes,
  Spacing,
  IconSizes,
  BorderRadius,
} from '../Utils/Responsive';

export default function PinLockScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const {
    unlockApp,
    authenticateWithBiometric,
    biometricEnabled,
    biometricType,
    getSavedNavigationState,
  } = usePinLock();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showBiometric, setShowBiometric] = useState(true);

  useEffect(() => {
    // Auto-trigger biometric on mount
    if (biometricEnabled && showBiometric) {
      handleBiometricAuth();
    }
  }, []);

  const handleBiometricAuth = async () => {
    setShowBiometric(false);
    const result = await authenticateWithBiometric();
    if (result.success) {
      handleUnlockSuccess();
    } else {
      setError('Use PIN to unlock');
    }
  };

  const handleNumberPress = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError('');

      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const verifyPin = async (enteredPin) => {
    const result = await unlockApp(enteredPin);
    if (result.success) {
      handleUnlockSuccess();
    } else {
      Vibration.vibrate(500);
      setError('Incorrect PIN');
      setPin('');
    }
  };

 const handleUnlockSuccess = () => {
  const savedState = getSavedNavigationState();
  console.log("🔰 Retrieved saved navigation state:", savedState);

  if (savedState) {
    navigation.reset({
      index: savedState.index,
      routes: savedState.routes,
    });
    console.log("🔰 Navigation state restored after unlock");
  } else {
    navigation.navigate("Main");
    console.log("🔰 No saved navigation state found; navigating to Main");
  }
};


  const getBiometricIcon = () => {
    if (biometricType === 'FACE_ID') return 'scan';
    if (biometricType === 'FINGERPRINT') return 'finger-print';
    return 'shield-checkmark';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.logoContainer, { backgroundColor: theme.colors.primaryLight }]}>
          <Ionicons name="lock-closed" size={40} color={theme.colors.primary} />
        </View>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          UdharKhataPlus
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Enter your PIN to unlock
        </Text>
      </View>

      {/* PIN Dots */}
      <View style={styles.pinContainer}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              {
                backgroundColor:
                  pin.length > index ? theme.colors.primary : 'transparent',
                borderColor: theme.colors.border,
              },
            ]}
          />
        ))}
      </View>

      {/* Error Message */}
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <View style={styles.errorPlaceholder} />
      )}

      {/* Number Pad */}
      <View style={styles.keypad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <TouchableOpacity
            key={num}
            style={[styles.key, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => handleNumberPress(num.toString())}
            activeOpacity={0.7}
          >
            <Text style={[styles.keyText, { color: theme.colors.text }]}>
              {num}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Biometric Button */}
        {/* <TouchableOpacity
          style={[styles.key, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={handleBiometricAuth}
          disabled={!biometricEnabled}
          activeOpacity={0.7}
        >
          {biometricEnabled ? (
            <Ionicons
              name={getBiometricIcon()}
              size={28}
              color={theme.colors.primary}
            />
          ) : (
            <View />
          )}
        </TouchableOpacity> */}

        {/* Zero */}
        <TouchableOpacity
          style={[styles.key, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => handleNumberPress('0')}
          activeOpacity={0.7}
        >
          <Text style={[styles.keyText, { color: theme.colors.text }]}>
            0
          </Text>
        </TouchableOpacity>

        {/* Delete */}
        <TouchableOpacity
          style={[styles.key, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Ionicons name="backspace" size={28} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxlarge,
    fontWeight: '800',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.medium,
    fontWeight: '500',
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    fontSize: FontSizes.medium,
    fontWeight: '600',
    height: 24,
  },
  errorPlaceholder: {
    height: 24,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: 40,
  },
  key: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#1e293b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  keyText: {
    fontSize: 28,
    fontWeight: '600',
  },
});
