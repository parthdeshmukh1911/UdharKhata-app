// LanguageContext.js
import React, { createContext, useState, useEffect } from "react";
//import AsyncStorage from "@react-native-async-storage/async-storage";
import { storage } from '../StorageWrapper'
import I18n from "i18n-js";

// Import translations
import en from "../translations/en.json";
import hi from "../translations/hi.json";
import mr from "../translations/mr.json";

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [isLoading, setIsLoading] = useState(true);

  // Configure i18n
  const i18n = new I18n();
  i18n.translations = { en, hi, mr };
  i18n.defaultLocale = "en";
  i18n.locale = currentLanguage;
  i18n.enableFallback = true;

  // Load saved language on app start
  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const savedLanguage = await storage.getItem("selectedLanguage");
      if (savedLanguage) {
        setCurrentLanguage(savedLanguage);
        i18n.locale = savedLanguage;
      }
    } catch (error) {
      console.log("Error loading language:", error);
    }
    setIsLoading(false);
  };

  const changeLanguage = async (languageCode) => {
    try {
      await storage.setItem("selectedLanguage", languageCode);
      setCurrentLanguage(languageCode);
      i18n.locale = languageCode;
    } catch (error) {
      console.log("Error saving language:", error);
    }
  };

  const t = (key, options = {}) => {
    return i18n.t(key, options);
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        changeLanguage,
        t,
        isLoading,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
