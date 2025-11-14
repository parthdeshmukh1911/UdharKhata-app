// src/contexts/PinLockContext.js

import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

const PinLockContext = createContext();

const PIN_KEY = 'app_pin_code';
const PIN_ENABLED_KEY = 'pin_lock_enabled';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export const PinLockProvider = ({ children }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    initializePinLock();
    checkBiometricSupport();

    // Lock app when going to background
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState) => {
    if (appState.current.match(/active/) && nextAppState === 'background') {
      // App went to background
      const enabled = await isPinEnabled();
      if (enabled) {
        setIsLocked(true);
      }
    }
    appState.current = nextAppState;
  };

  const initializePinLock = async () => {
    try {
      const enabled = await SecureStore.getItemAsync(PIN_ENABLED_KEY);
      const bioEnabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      
      setPinEnabled(enabled === 'true');
      setBiometricEnabled(bioEnabled === 'true');

      if (enabled === 'true') {
        setIsLocked(true);
      }
    } catch (error) {
      console.error('Error initializing PIN lock:', error);
    }
  };

  const checkBiometricSupport = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (compatible) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.length > 0) {
          if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType('FACE_ID');
          } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setBiometricType('FINGERPRINT');
          } else {
            setBiometricType('BIOMETRIC');
          }
        }
      }
    } catch (error) {
      console.error('Error checking biometric support:', error);
    }
  };

  const setPin = async (pin) => {
    try {
      await SecureStore.setItemAsync(PIN_KEY, pin);
      await SecureStore.setItemAsync(PIN_ENABLED_KEY, 'true');
      setPinEnabled(true);
      return { success: true };
    } catch (error) {
      console.error('Error setting PIN:', error);
      return { success: false, error: error.message };
    }
  };

  const verifyPin = async (enteredPin) => {
    try {
      const storedPin = await SecureStore.getItemAsync(PIN_KEY);
      return storedPin === enteredPin;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      return false;
    }
  };

  const unlockApp = async (pin) => {
    const isValid = await verifyPin(pin);
    if (isValid) {
      setIsLocked(false);
      return { success: true };
    }
    return { success: false, error: 'Incorrect PIN' };
  };

  const authenticateWithBiometric = async () => {
    try {
      const hasEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasEnrolled) {
        return { success: false, error: 'No biometric enrolled' };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock UdharKhata',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsLocked(false);
        return { success: true };
      }

      return { success: false, error: 'Authentication failed' };
    } catch (error) {
      console.error('Biometric auth error:', error);
      return { success: false, error: error.message };
    }
  };

  const disablePin = async () => {
    try {
      await SecureStore.deleteItemAsync(PIN_KEY);
      await SecureStore.deleteItemAsync(PIN_ENABLED_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      setPinEnabled(false);
      setBiometricEnabled(false);
      setIsLocked(false);
      return { success: true };
    } catch (error) {
      console.error('Error disabling PIN:', error);
      return { success: false, error: error.message };
    }
  };

  const enableBiometric = async () => {
    try {
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
      setBiometricEnabled(true);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const disableBiometric = async () => {
    try {
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'false');
      setBiometricEnabled(false);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const isPinEnabled = async () => {
    const enabled = await SecureStore.getItemAsync(PIN_ENABLED_KEY);
    return enabled === 'true';
  };

  const value = {
    isLocked,
    pinEnabled,
    biometricEnabled,
    biometricType,
    setPin,
    verifyPin,
    unlockApp,
    authenticateWithBiometric,
    disablePin,
    enableBiometric,
    disableBiometric,
    isPinEnabled,
  };

  return (
    <PinLockContext.Provider value={value}>
      {children}
    </PinLockContext.Provider>
  );
};

export const usePinLock = () => {
  const context = useContext(PinLockContext);
  if (!context) {
    throw new Error('usePinLock must be used within PinLockProvider');
  }
  return context;
};
