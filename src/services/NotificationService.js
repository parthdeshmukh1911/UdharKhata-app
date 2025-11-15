// src/services/NotificationService.js

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Configure notification handler (fixes deprecation warning)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false, // Deprecated but keeping for backward compatibility
    shouldShowBanner: true, // ✅ New API
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Storage keys for tracking notification state
const NOTIFICATION_STATE_KEY = '@notification_state';

// ✅ Get current notification state
async function getNotificationState() {
  try {
    const state = await AsyncStorage.getItem(NOTIFICATION_STATE_KEY);
    return state ? JSON.parse(state) : {};
  } catch (error) {
    console.error('Error reading notification state:', error);
    return {};
  }
}

// ✅ Save notification state
async function saveNotificationState(state) {
  try {
    await AsyncStorage.setItem(NOTIFICATION_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving notification state:', error);
  }
}

// Request notification permissions from user
export async function requestPermissions() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    if (newStatus !== 'granted') {
      console.log('❌ Notification permissions denied');
      return false;
    }
    console.log('✅ Notification permissions granted');
    return true;
  }
  return true;
}

// Schedule an immediate welcome notification
export async function scheduleWelcomeNotification() {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎉 Welcome to UdharKhataPlus!',
        body: 'Thank you for joining. Start managing your accounts effortlessly.',
      },
      trigger: null,
    });
    console.log('✅ Welcome notification scheduled:', id);
  } catch (error) {
    console.error('❌ Failed to schedule welcome notification:', error);
  }
}

// ✅ Cancel specific notification by identifier
export async function cancelNotificationByIdentifier(identifier) {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
    console.log(`🗑️ Cancelled notification: ${identifier}`);
  } catch (error) {
    // Silently fail if notification doesn't exist
    console.log(`ℹ️ Notification ${identifier} not found (already cancelled or never scheduled)`);
  }
}

// Cancel all scheduled notifications
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await saveNotificationState({});
  console.log('🗑️ All notifications cancelled');
}

// ✅ Schedule subscription reminders (ONLY if not already scheduled)
export async function scheduleSubscriptionReminders() {
  try {
    const state = await getNotificationState();
    
    // Check if already scheduled
    if (state.subscriptionRemindersActive) {
      console.log('ℹ️ Subscription reminders already scheduled, skipping...');
      return;
    }

    // Cancel existing reminders first
    await cancelNotificationByIdentifier('sub-reminder-morning');
    await cancelNotificationByIdentifier('sub-reminder-evening');

    // Morning reminder (9 AM)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💡 Unlock Premium Features',
        body: 'Subscribe to enable cloud backup and sync across devices!',
      },
      trigger: {
        hour: 9,
        minute: 0,
        repeats: true,
      },
      identifier: 'sub-reminder-morning',
    });

    // Evening reminder (7 PM)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 Premium Benefits Await',
        body: 'Activate subscription for secure cloud sync and automatic backup.',
      },
      trigger: {
        hour: 19,
        minute: 0,
        repeats: true,
      },
      identifier: 'sub-reminder-evening',
    });

    // Save state
    await saveNotificationState({
      ...state,
      subscriptionRemindersActive: true,
    });

    console.log('✅ Daily subscription reminders scheduled (9 AM & 7 PM)');
  } catch (error) {
    console.error('❌ Failed to schedule subscription reminders:', error);
  }
}

// ✅ Cancel subscription reminders
export async function cancelSubscriptionReminders() {
  try {
    await cancelNotificationByIdentifier('sub-reminder-morning');
    await cancelNotificationByIdentifier('sub-reminder-evening');

    const state = await getNotificationState();
    await saveNotificationState({
      ...state,
      subscriptionRemindersActive: false,
    });

    console.log('✅ Subscription reminders cancelled');
  } catch (error) {
    console.error('❌ Failed to cancel subscription reminders:', error);
  }
}

// ✅ Schedule renewal reminder (ONLY if not already scheduled)
export async function scheduleRenewalReminder(daysLeft) {
  try {
    const state = await getNotificationState();
    
    // Check if already scheduled with same days left
    if (state.renewalReminderActive && state.renewalDaysLeft === daysLeft) {
      console.log(`ℹ️ Renewal reminder already scheduled for ${daysLeft} days, skipping...`);
      return;
    }

    // Cancel existing renewal reminder
    await cancelNotificationByIdentifier('renewal-reminder');

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ Subscription Expiring Soon',
        body: `Your subscription expires in ${daysLeft} days. Renew now to avoid disruption!`,
      },
      trigger: {
        hour: 10,
        minute: 0,
        repeats: true,
      },
      identifier: 'renewal-reminder',
    });

    // Save state
    await saveNotificationState({
      ...state,
      renewalReminderActive: true,
      renewalDaysLeft: daysLeft,
    });

    console.log(`✅ Renewal reminder scheduled (${daysLeft} days left) at 10 AM`);
  } catch (error) {
    console.error('❌ Failed to schedule renewal reminder:', error);
  }
}

// ✅ Cancel renewal reminder
export async function cancelRenewalReminder() {
  try {
    await cancelNotificationByIdentifier('renewal-reminder');

    const state = await getNotificationState();
    await saveNotificationState({
      ...state,
      renewalReminderActive: false,
      renewalDaysLeft: null,
    });

    console.log('✅ Renewal reminder cancelled');
  } catch (error) {
    console.error('❌ Failed to cancel renewal reminder:', error);
  }
}

// Schedule outstanding balance notification (immediate)
export async function scheduleOutstandingBalanceNotification(customerName, monthsOld, amount) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `💰 Outstanding Balance Alert`,
        body: `${customerName} has an outstanding balance of ₹${amount} for ${monthsOld} month(s).`,
        data: { customerName, monthsOld, amount },
      },
      trigger: null, // immediate
    });

    console.log(`✅ Outstanding balance notification sent for ${customerName}`);
  } catch (error) {
    console.error('❌ Failed to schedule outstanding notification:', error);
  }
}

// ✅ Sync notification state with subscription status (call this on app start)
export async function syncNotificationsWithSubscription(subscription) {
  console.log('🔄 Syncing notifications with subscription status...');

  if (!subscription || subscription.isExpired) {
    // No active subscription - ensure subscription reminders are scheduled
    await scheduleSubscriptionReminders();
    await cancelRenewalReminder();
  } else if (subscription.isLifetime) {
    // Lifetime subscription - cancel all reminders
    await cancelSubscriptionReminders();
    await cancelRenewalReminder();
  } else if (subscription.daysLeft <= 15 && subscription.daysLeft > 0) {
    // Active subscription expiring soon - schedule renewal reminder
    await cancelSubscriptionReminders();
    await scheduleRenewalReminder(subscription.daysLeft);
  } else {
    // Active subscription with more than 15 days - cancel all reminders
    await cancelSubscriptionReminders();
    await cancelRenewalReminder();
  }

  console.log('✅ Notifications synced with subscription');
}

// ✅ Debug: List all scheduled notifications
export async function listScheduledNotifications() {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('📋 Scheduled notifications:', notifications.length);
    notifications.forEach((notif) => {
      console.log(`  - ${notif.identifier}: ${notif.content.title}`);
    });
    return notifications;
  } catch (error) {
    console.error('❌ Failed to list notifications:', error);
    return [];
  }
}
