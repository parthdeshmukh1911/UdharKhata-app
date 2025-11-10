// src/services/NotificationService.js

import * as Notifications from 'expo-notifications';

// Request notification permissions from user
export async function requestPermissions() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    if (newStatus !== 'granted') {
      alert('Please enable notifications for best experience');
      return false;
    }
    return true;
  }
  return true;
}

// Schedule an immediate welcome notification
export async function scheduleWelcomeNotification() {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎉 Welcome to UdharKhata!',
        body: 'Thank you for joining. Explore premium features with subscription.',
      },
      trigger: null,
    });
    console.log('✅ Welcome notification scheduled:', id);
  } catch (error) {
    console.error('❌ Failed to schedule welcome notification:', error);
  }
}

// Schedule daily notifications at specific hours and minutes
export async function scheduleDailyNotification(id, title, body, hour, minute) {
  try {
    // Cancel existing notification with same id before scheduling new one
    await Notifications.cancelScheduledNotificationAsync(id);

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
      identifier: id,
    });
    console.log(`✅ Daily notification scheduled: ${id} at ${hour}:${minute}`);
  } catch (error) {
    console.error(`❌ Failed to schedule notification ${id}:`, error);
  }
}

// Cancel all scheduled notifications
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('🗑️ All notifications cancelled');
}

// Cancel specific notification by identifier
export async function cancelNotificationByIdentifier(identifier) {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
    console.log(`🗑️ Cancelled notification: ${identifier}`);
  } catch (error) {
    console.error(`❌ Failed to cancel notification ${identifier}:`, error);
  }
}

// ✅ FIXED: Schedule twice daily subscription reminder
export async function scheduleSubscriptionReminders() {
  try {
    // Cancel existing subscription reminders first
    await cancelNotificationByIdentifier('sub-reminder-morning');
    await cancelNotificationByIdentifier('sub-reminder-evening');

    // Morning reminder (9 AM) - Using hour/minute trigger
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💡 Reminder',
        body: 'Subscribe now to unlock premium features and cloud backup!',
      },
      trigger: {
        hour: 9,
        minute: 0,
        repeats: true,
      },
      identifier: 'sub-reminder-morning',
    });

    // Evening reminder (7 PM) - Using hour/minute trigger
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 Don\'t Miss Out',
        body: 'Activate subscription for secure cloud sync and backup.',
      },
      trigger: {
        hour: 19,
        minute: 0,
        repeats: true,
      },
      identifier: 'sub-reminder-evening',
    });

    console.log('✅ Daily subscription reminders scheduled (9 AM & 7 PM)');
  } catch (error) {
    console.error('❌ Failed to schedule subscription reminders:', error);
  }
}

// ✅ FIXED: Schedule daily renewal reminder
export async function scheduleRenewalReminder(daysLeft) {
  try {
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

    console.log(`✅ Renewal reminder scheduled (${daysLeft} days left) at 10 AM`);
  } catch (error) {
    console.error('❌ Failed to schedule renewal reminder:', error);
  }
}

// Cancel renewal reminder (after renewal or expiry)
export async function cancelRenewalReminder() {
  await cancelNotificationByIdentifier('renewal-reminder');
  console.log('✅ Renewal reminder cancelled');
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
