import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '../StorageWrapper';

// Import translations (corrected file names)
import as from '../translations/as.json';      // Assamese
import bho from '../translations/bho.json';    // Bhojpuri
import bn from '../translations/bn.json';      // Bengali
import en from '../translations/en.json';      // English
import gu from '../translations/gu.json';      // Gujarati
import hi from '../translations/hi.json';      // Hindi
import kn from '../translations/kn.json';      // Kannada
import mrw from '../translations/mrw.json';    // Marwadi
import ml from '../translations/ml.json';      // Malayalam
import mr from '../translations/mr.json';      // Marathi
import mai from '../translations/mai.json';    // Maithili
import or from '../translations/or.json';      // Odia
import pa from '../translations/pa.json';      // Punjabi
import sd from '../translations/sd.json';      // Sindhi
import ta from '../translations/ta.json';      // Tamil
import te from '../translations/te.json';      // Telugu

export const SimpleLanguageContext = createContext();

export const SimpleLanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

  // Add all supported translations here
  const translations = {
    as,    // Assamese
    bho,   // Bhojpuri
    bn,    // Bengali
    en,    // English
    gu,    // Gujarati
    hi,    // Hindi
    kn,    // Kannada
    mrw,   // Marwadi
    ml,    // Malayalam
    mr,    // Marathi
    mai,   // Maithili
    or,    // Odia
    pa,    // Punjabi
    sd,    // Sindhi
    ta,    // Tamil
    te     // Telugu
  };

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
  }, [translations]);

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
  }, [currentLanguage, translations]);

  useEffect(() => {
    loadSavedLanguage();
  }, [loadSavedLanguage]);

  const contextValue = useMemo(() => ({
    currentLanguage,
    changeLanguage,
    t,
    isLoading,
    availableLanguages: Object.keys(translations), // Optionally expose list to UI
  }), [currentLanguage, changeLanguage, t, isLoading, translations]);

  return (
    <SimpleLanguageContext.Provider value={contextValue}>
      {children}
    </SimpleLanguageContext.Provider>
  );
};
