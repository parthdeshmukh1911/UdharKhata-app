// StorageWrapper.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ CRITICAL: Supabase auth storage adapter must return string | null
// Never return booleans or other types
export const storage = {
  getItem: async (key) => {
    try {
      const value = await AsyncStorage.getItem(key);
      // ✅ RETURN EXACTLY WHAT'S STORED - don't convert types
      return value; // Returns string | null (as Supabase expects)
    } catch (error) {
      console.error('Storage getItem error:', key, error);
      return null;
    }
  },

  setItem: async (key, value) => {
    try {
      // ✅ CRITICAL: Supabase passes strings, store them as-is
      if (typeof value === 'string') {
        await AsyncStorage.setItem(key, value);
      } else {
        // This should never happen with Supabase, but handle it
        console.warn('Attempted to store non-string value:', key, typeof value);
        await AsyncStorage.setItem(key, String(value));
      }
    } catch (error) {
      console.error('Storage setItem error:', key, error);
    }
  },

  removeItem: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Storage removeItem error:', key, error);
    }
  },
};
