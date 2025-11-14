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
import { usePinLock } from '../contexts/PinLockContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';
import {
  FontSizes,
  Spacing,
  IconSizes,
  BorderRadius,
} from '../Utils/Responsive';

export default function SetPinScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { setPin: savePinToContext, verifyPin, pinEnabled, disablePin} = usePinLock();
  const { showSuccess, showError } = useAlert();

  // Determine mode: 'set' for new PIN, 'change' for changing existing PIN
    const mode = route?.params?.mode || (pinEnabled ? 'change' : 'set');

  const [step, setStep] = useState(mode === 'change' || mode === 'disable' ? 0 : 1);
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');

  const handleNumberPress = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError('');

      if (newPin.length === 4) {
        if (step === 0) {
          if (mode === 'disable') {
            // Verify current PIN for disable
            verifyPinForDisable(newPin);
          } else {
            // Verify current PIN for change
            verifyCurrentPin(newPin);
          }
        } else if (step === 1) {
          // Set first PIN
          setFirstPin(newPin);
          setStep(2);
          setPin('');
        } else {
          // Confirm PIN
          verifyAndSetPin(newPin);
        }
      }
    }
  };

  const verifyPinForDisable = async (enteredPin) => {
  const isValid = await verifyPin(enteredPin);
  if (isValid) {
    const result = await disablePin();
    if (result.success) {
      showSuccess('Success', 'PIN lock disabled successfully');
      // Navigate back to Settings and trigger a refresh if needed
      navigation.goBack();
    } else {
      showError('Error', result.error || 'Failed to disable PIN lock');
    }
  } else {
    Vibration.vibrate(500);
    setError('Incorrect PIN');
    setPin('');
  }
};

  const verifyCurrentPin = async (enteredPin) => {
    const isValid = await verifyPin(enteredPin);
    if (isValid) {
      setStep(1);
      setPin('');
      setError('');
    } else {
      Vibration.vibrate(500);
      setError('Incorrect PIN');
      setPin('');
    }
  };



  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };
  const verifyAndSetPin = async (confirmPin) => {
    if (firstPin === confirmPin) {
      const result = await savePinToContext(confirmPin);
      if (result.success) {
        showSuccess('Success', mode === 'change' ? 'PIN changed successfully' : 'PIN lock enabled successfully');
        navigation.goBack();
      } else {
        showError('Error', result.error || 'Failed to set PIN');
        resetFlow();
      }
    } else {
      Vibration.vibrate(500);
      setError('PINs do not match');
      setPin('');
      setTimeout(() => {
        setStep(1);
        setFirstPin('');
        setError('');
      }, 1500);
    }
  };

  const resetFlow = () => {
    setStep(mode === 'change' ? 0 : 1);
    setPin('');
    setFirstPin('');
    setError('');
  };

  const getTitle = () => {
    if (step === 0) return 'Enter Current PIN';
    if (step === 1) return mode === 'change' ? 'Enter New PIN' : 'Set Your PIN';
    return 'Confirm Your PIN';
  };

  const getSubtitle = () => {
    if (step === 0) return 'Verify your current PIN to continue';
    if (step === 1) return 'Enter a 4-digit PIN to secure your app';
    return 'Enter your PIN again to confirm';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={[styles.logoContainer, { backgroundColor: theme.colors.primaryLight }]}>
          <Ionicons name="lock-closed" size={40} color={theme.colors.primary} />
        </View>
        <Text style={[styles.title, { color: theme.colors.text }]}>{getTitle()}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{getSubtitle()}</Text>

        {step > 0 && (
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, { backgroundColor: theme.colors.primary }]} />
            <View style={[styles.stepLine, { backgroundColor: step === 2 ? theme.colors.primary : theme.colors.border }]} />
            <View style={[styles.stepDot, { backgroundColor: step === 2 ? theme.colors.primary : theme.colors.border }]} />
          </View>
        )}
      </View>

      <View style={styles.pinContainer}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              {
                backgroundColor: pin.length > index ? theme.colors.primary : 'transparent',
                borderColor: theme.colors.border,
              },
            ]}
          />
        ))}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <View style={styles.errorPlaceholder} />
      )}

      <View style={styles.keypad}>
        {[1, 2, 3].map((num) => (
          <TouchableOpacity
            key={num}
            style={[styles.key, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => handleNumberPress(num.toString())}
            activeOpacity={0.7}
          >
            <Text style={[styles.keyText, { color: theme.colors.text }]}>{num}</Text>
          </TouchableOpacity>
        ))}
        {[4, 5, 6].map((num) => (
          <TouchableOpacity
            key={num}
            style={[styles.key, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => handleNumberPress(num.toString())}
            activeOpacity={0.7}
          >
            <Text style={[styles.keyText, { color: theme.colors.text }]}>{num}</Text>
          </TouchableOpacity>
        ))}
        {[7, 8, 9].map((num) => (
          <TouchableOpacity
            key={num}
            style={[styles.key, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => handleNumberPress(num.toString())}
            activeOpacity={0.7}
          >
            <Text style={[styles.keyText, { color: theme.colors.text }]}>{num}</Text>
          </TouchableOpacity>
        ))}
        
        <View style={[styles.key, { backgroundColor: 'transparent', borderWidth: 0 }]} />
        
        <TouchableOpacity
          style={[styles.key, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => handleNumberPress('0')}
          activeOpacity={0.7}
        >
          <Text style={[styles.keyText, { color: theme.colors.text }]}>0</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.key, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Ionicons name="backspace" size={28} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {step === 2 && (
        <TouchableOpacity style={styles.resetButton} onPress={resetFlow} activeOpacity={0.7}>
          <Text style={[styles.resetText, { color: theme.colors.primary }]}>Start Over</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepLine: {
    width: 40,
    height: 2,
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
  resetButton: {
    marginTop: Spacing.xl,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  resetText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
  },
});
