import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
//import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from '../StorageWrapper'

// Import translations
import en from '../translations/en.json';
import hi from '../translations/hi.json';
import mr from '../translations/mr.json';

export const SimpleLanguageContext = createContext();

export const SimpleLanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

  const translations = { en, hi, mr };

  const loadSavedLanguage = useCallback(async () => {
    try {
      const savedLanguage = await storage.getItem('selectedLanguage');
      if (savedLanguage && translations[savedLanguage]) {
        setCurrentLanguage(savedLanguage);
      }
    } catch (error) {
      console.log('Error loading language:', error);
    }
    setIsLoading(false);
  }, []);

  const changeLanguage = useCallback(async (languageCode) => {
    try {
      await storage.setItem('selectedLanguage', languageCode);
      setCurrentLanguage(languageCode);
    } catch (error) {
      console.log('Error saving language:', error);
    }
  }, []);

  const t = useCallback((key, options = {}) => {
    const keys = key.split('.');
    let value = translations[currentLanguage];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  }, [currentLanguage]);

  // Load saved language on app start
  useEffect(() => {
    loadSavedLanguage();
  }, [loadSavedLanguage]);

  const contextValue = useMemo(() => ({
    currentLanguage,
    changeLanguage,
    t,
    isLoading,
  }), [currentLanguage, changeLanguage, t, isLoading]);

  return (
    <SimpleLanguageContext.Provider value={contextValue}>
      {children}
    </SimpleLanguageContext.Provider>
  );
};