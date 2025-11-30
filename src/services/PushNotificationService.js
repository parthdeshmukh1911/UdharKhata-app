// src/services/PushNotificationService.js

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../config/SupabaseConfig';
import Constants from 'expo-constants';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class PushNotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  /**
   * Register push notifications for a user
   */
  async registerForPushNotifications(userId) {
    try {
      // Check if physical device
      if (!Device.isDevice) {
        console.log('⚠️ Push notifications only work on physical devices');
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Permission not granted for push notifications');
        return null;
      }

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync();

      this.expoPushToken = tokenData.data;
      console.log('✅ Expo Push Token:', this.expoPushToken);

      // Get device info
      const deviceId = Constants.deviceId || Device.modelId;
      const deviceType = Platform.OS;

      // Save token to Supabase
      await this.saveTokenToDatabase(userId, this.expoPushToken, deviceId, deviceType);

      return this.expoPushToken;
    } catch (error) {
      console.error('❌ Error registering push notifications:', error);
      return null;
    }
  }

  /**
   * Save push token to Supabase
   */
  async saveTokenToDatabase(userId, expoPushToken, deviceId, deviceType) {
  try {
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          expo_push_token: expoPushToken,
          device_id: deviceId,
          device_type: deviceType,
          is_active: true,
        },
        {
          onConflict: 'user_id', // 🔁 Upsert by user, not by token
        }
      );

    if (error) {
      console.error('❌ Error saving push token:', error);
    } else {
      console.log('✅ Push token saved to database');
    }
  } catch (error) {
    console.error('❌ Error in saveTokenToDatabase:', error);
  }
}



  /**
   * Unregister push notifications (on logout)
   */
  async unregisterPushNotifications(userId) {
    try {
      if (!this.expoPushToken) return;

      const { error } = await supabase
        .from('push_tokens')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('expo_push_token', this.expoPushToken);

      if (error) {
        console.error('❌ Error unregistering push token:', error);
      } else {
        console.log('✅ Push token unregistered');
      }

      this.expoPushToken = null;
    } catch (error) {
      console.error('❌ Error in unregisterPushNotifications:', error);
    }
  }

  /**
   * Set up notification listeners
   */
  setupNotificationListeners(navigationRef) {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notification received:', notification);
    });

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      
      const data = response.notification.request.content.data;
      this.handleNotificationTap(data, navigationRef);
    });
  }

  /**
   * Handle notification tap - Navigate to appropriate screen
   * ✅ UPDATED: Auto-open modal using navigation params
   */
  handleNotificationTap(data, navigationRef) {
    if (!navigationRef?.current) {
      console.log('⚠️ Navigation ref not ready');
      return;
    }

    const { type } = data;

    console.log('🔔 Handling notification tap:', { type });

    try {
      if (type === 'outstanding_balance') {
        // ✅ Navigate to Customers screen
        navigationRef.current.navigate('Main', {
          screen: 'CustomersTab',
          params: {
            screen: 'Customers',
          },
        });
        
        console.log('✅ Navigated to Customers screen');
        
      } else if (type === 'subscription_reminder' || type === 'subscription_expiry') {
        // ✅ Navigate to Settings and auto-open subscription modal
        navigationRef.current.navigate('Settings', {
          screen: 'SettingsContent', // Navigate to nested screen
          params: {
            autoOpenModal: true, // ✅ Flag to auto-open modal
          },
        });
        
        console.log('✅ Navigated to Settings with autoOpenModal flag');
      }
    } catch (error) {
      console.error('❌ Error handling notification tap:', error);
    }
  }

  /**
   * Remove notification listeners
   */
  removeNotificationListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
    
    console.log('🔌 Notification listeners removed');
  }

  /**
   * Get current push token
   */
  getCurrentToken() {
    return this.expoPushToken;
  }
}

export default new PushNotificationService();
