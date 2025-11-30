// src/hooks/usePushNotifications.js

import { useEffect, useRef } from 'react';
import PushNotificationService from '../services/PushNotificationService';

/**
 * Hook to automatically register push notifications on login
 */
export const usePushNotifications = (navigationRef, user) => {
  const isRegistered = useRef(false);

  useEffect(() => {
    const registerPush = async () => {
      // ✅ Only register if user is logged in
      if (!user?.id) {
        console.log('⚠️ No user logged in, skipping push registration');
        isRegistered.current = false;
        return;
      }

      // ✅ Don't re-register if already registered for this user
      if (isRegistered.current) {
        console.log('✅ Push notifications already registered');
        return;
      }

      try {
        console.log('🔔 Registering push notifications for user:', user.id);
        await PushNotificationService.registerForPushNotifications(user.id);
        
        // Setup listeners for notification taps
        PushNotificationService.setupNotificationListeners(navigationRef);
        
        isRegistered.current = true;
      } catch (error) {
        console.error('❌ Error in usePushNotifications:', error);
      }
    };

    registerPush();

    // Cleanup on unmount or user logout
    return () => {
      if (!user?.id && isRegistered.current) {
        console.log('🔌 User logged out, removing notification listeners');
        PushNotificationService.removeNotificationListeners();
        isRegistered.current = false;
      }
    };
  }, [navigationRef, user?.id]); // ✅ Re-run when user changes
};
