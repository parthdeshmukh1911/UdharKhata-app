// src/components/ThemeToggle.js
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { isDarkMode, toggleTheme, theme } = useTheme();

  return (
    <TouchableOpacity 
      style={styles.button} 
      onPress={toggleTheme}
      activeOpacity={0.7}
    >
      <Ionicons 
        name={isDarkMode ? 'sunny' : 'moon'} 
        size={24} 
        color={theme.colors.text}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    marginRight: 8,
  },
});
