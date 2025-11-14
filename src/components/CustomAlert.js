import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

export default function CustomAlert({
  visible,
  onClose,
  title,
  message,
  type = 'info', // 'success', 'error', 'warning', 'info', 'confirm'
  buttons = [],
  icon,
  theme,
}) {
  // Auto-determine icon and colors based on type
  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: icon || 'checkmark-circle',
          iconColor: theme?.colors.success || '#1c3a76ff',
          accentColor: theme?.colors.success || '#1c3a76ff',
        };
      case 'error':
        return {
          icon: icon || 'close-circle',
          iconColor: theme?.colors.error || '#ef4444',
          accentColor: theme?.colors.error || '#ef4444',
        };
      case 'warning':
        return {
          icon: icon || 'warning',
          iconColor: theme?.colors.warning || '#f59e0b',
          accentColor: theme?.colors.warning || '#f59e0b',
        };
      case 'confirm':
        return {
          icon: icon || 'help-circle',
          iconColor: theme?.colors.primary || '#3b82f6',
          accentColor: theme?.colors.primary || '#3b82f6',
        };
      default: // info
        return {
          icon: icon || 'information-circle',
          iconColor: theme?.colors.info || '#6366f1',
          accentColor: theme?.colors.info || '#1c3a76ff',
        };
    }
  };

  const config = getTypeConfig();

  // Default buttons if none provided
  const defaultButtons = [
    {
      text: 'OK',
      style: 'primary',
      onPress: onClose,
    },
  ];

  const alertButtons = buttons.length > 0 ? buttons : defaultButtons;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Blur effect for iOS */}
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={styles.androidBackdrop} />
        )}

        {/* Alert Card */}
        <View
          style={[
            styles.alertCard,
            {
              backgroundColor: theme?.colors?.surface || '#ffffff',
              borderColor: theme?.colors?.border || '#e5e7eb',
            },
          ]}
        >
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${config.accentColor}15` },
            ]}
          >
            <Ionicons name={config.icon} size={48} color={config.iconColor} />
          </View>

          {/* Title */}
          {title && (
            <Text
              style={[
                styles.title,
                { color: theme?.colors?.text || '#1f2937' },
              ]}
            >
              {title}
            </Text>
          )}

          {/* Message */}
          {message && (
            <Text
              style={[
                styles.message,
                { color: theme?.colors?.textSecondary || '#6b7280' },
              ]}
            >
              {message}
            </Text>
          )}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {alertButtons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  button.style === 'primary'
                    ? [
                        styles.primaryButton,
                        { backgroundColor: config.accentColor },
                      ]
                    : button.style === 'danger'
                    ? styles.dangerButton
                    : styles.secondaryButton,
                  alertButtons.length === 1 && styles.singleButton,
                ]}
                onPress={() => {
                  button.onPress?.();
                  if (button.closeOnPress !== false) {
                    onClose();
                  }
                }}
                activeOpacity={0.7}
              >
                <Text
        style={[
          styles.buttonText,
          button.style === 'primary'
            ? styles.primaryButtonText
            : button.style === 'danger'
            ? styles.dangerButtonText
            : {
                // Secondary button text - dark text in light mode, light text in dark mode
                color: theme?.isDarkMode 
                  ? theme.colors.text 
                  : '#ffffff', // Dark gray for light mode
              },
        ]}
      >
        {button.text}
      </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  androidBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  alertCard: {
    width: width * 0.85,
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  singleButton: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  secondaryButton: {
    backgroundColor: '#1c3a76ff',
  },
  dangerButton: {
    backgroundColor: '#fee2e2',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  secondaryButtonText: {
    color: '#374151',
  },
  dangerButtonText: {
    color: '#dc2626',
  },
});
