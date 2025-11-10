// src/contexts/ThemeContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

// Define your color schemes
export const lightTheme = {
  mode: 'light',
  colors: {
    // Backgrounds
    background: '#f8fafc',
    surface: '#ffffff',
    card: '#ffffff',
    
    // Text
    text: '#1e293b',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    
    // Primary colors
    primary: '#1e40af',
    primaryLight: '#dbeafe',
    
    // Borders
    border: '#cbd5e1',
    borderLight: '#e2e8f0',
    
    // Status colors
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    
    // Other
    shadow: '#1e293b',
  },
};

export const darkTheme = {
  mode: 'dark',
  colors: {
    // Backgrounds
    background: '#0f172a',
    surface: '#1e293b',
    card: '#334155',
    
    // Text
    text: '#f1f5f9',
    textSecondary: '#cbd5e1',
    textTertiary: '#94a3b8',
    
    // Primary colors
    primary: '#3b82f6',
    primaryLight: '#1e3a8a',
    
    // Borders
    border: '#475569',
    borderLight: '#334155',
    
    // Status colors
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    
    // Other
    shadow: '#000000',
  },
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme(); // Device's system theme
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');
  const [themePreference, setThemePreference] = useState('system'); // 'light', 'dark', 'system'

  // Load saved preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Update theme when system theme changes (if preference is 'system')
  useEffect(() => {
    if (themePreference === 'system') {
      setIsDarkMode(systemColorScheme === 'dark');
    }
  }, [systemColorScheme, themePreference]);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem('themePreference');
      if (saved) {
        setThemePreference(saved);
        if (saved === 'light') setIsDarkMode(false);
        else if (saved === 'dark') setIsDarkMode(true);
        else setIsDarkMode(systemColorScheme === 'dark');
      }
    } catch (error) {
      console.log('Error loading theme preference:', error);
    }
  };

  const toggleTheme = async () => {
    const newMode = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    setThemePreference(newMode);
    try {
      await AsyncStorage.setItem('themePreference', newMode);
    } catch (error) {
      console.log('Error saving theme preference:', error);
    }
  };

  const setSystemTheme = async () => {
    setThemePreference('system');
    setIsDarkMode(systemColorScheme === 'dark');
    try {
      await AsyncStorage.setItem('themePreference', 'system');
    } catch (error) {
      console.log('Error saving theme preference:', error);
    }
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        isDarkMode, 
        toggleTheme,
        setSystemTheme,
        themePreference 
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
