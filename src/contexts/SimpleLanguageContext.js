import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '../StorageWrapper';

// Import translations
import as from '../translations/as.json';
import bho from '../translations/bho.json';
import bn from '../translations/bn.json';
import en from '../translations/en.json';
import gu from '../translations/gu.json';
import hi from '../translations/hi.json';
import kn from '../translations/kn.json';
import mrw from '../translations/mrw.json';
import ml from '../translations/ml.json';
import mr from '../translations/mr.json';
import mai from '../translations/mai.json';
import or from '../translations/or.json';
import pa from '../translations/pa.json';
import sd from '../translations/sd.json';
import ta from '../translations/ta.json';
import te from '../translations/te.json';

export const SimpleLanguageContext = createContext();

export const SimpleLanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(true);

  // All supported translations
  const translations = {
    as,
    bho,
    bn,
    en,
    gu,
    hi,
    kn,
    mrw,
    ml,
    mr,
    mai,
    or,
    pa,
    sd,
    ta,
    te
  };

  const loadSavedLanguage = useCallback(async () => {
    try {
      const savedLanguage = await storage.getItem('selectedLanguage');
      const setupComplete = await storage.getItem('languageSetupComplete');
console.log('languageSetupComplete raw:', setupComplete, typeof setupComplete);
if (setupComplete === true || setupComplete === 'true') {
  setIsFirstTimeSetup(false);
}
      
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

  const completeFirstTimeSetup = useCallback(async () => {
    try {
      await storage.setItem('languageSetupComplete', 'true');
      setIsFirstTimeSetup(false);
    } catch (error) {
      console.log('Error marking setup complete:', error);
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

  useEffect(() => {
    loadSavedLanguage();
  }, [loadSavedLanguage]);

  const contextValue = useMemo(() => ({
    currentLanguage,
    changeLanguage,
    t,
    isLoading,
    isFirstTimeSetup,
    completeFirstTimeSetup,
    availableLanguages: Object.keys(translations),
  }), [currentLanguage, changeLanguage, t, isLoading, isFirstTimeSetup, completeFirstTimeSetup]);

  return (
    <SimpleLanguageContext.Provider value={contextValue}>
      {children}
    </SimpleLanguageContext.Provider>
  );
};
