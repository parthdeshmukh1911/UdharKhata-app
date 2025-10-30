import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  async getItem(key) {
    const value = await AsyncStorage.getItem(key);
    // Convert "true"/"false" string back to Boolean if applicable
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value; // return string if not boolean
  },

  async setItem(key, value) {
    // Convert Boolean to string
    if (typeof value === 'boolean') {
      await AsyncStorage.setItem(key, value.toString());
    } else {
      await AsyncStorage.setItem(key, value);
    }
  },

  async removeItem(key) {
    await AsyncStorage.removeItem(key);
  },
};
