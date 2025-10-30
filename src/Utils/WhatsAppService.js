import { Alert, Linking } from 'react-native';
import * as SMS from 'expo-sms';
import { useContext } from 'react';
import { SimpleLanguageContext } from '../contexts/SimpleLanguageContext';
import { ENABLE_I18N } from '../config/i18nConfig';
import Config from '../config';
import { CLIENT_CONFIG } from '../config/clientConfig';

// Format phone number for WhatsApp (Indian numbers)
export const formatPhoneNumber = (phone) => {
  // Check if phone exists and is a string or number
  if (!phone) return null;
  
  // Convert to string if it's a number
  const phoneStr = String(phone);
  
  // Remove all non-digits
  let cleaned = phoneStr.replace(/\D/g, '');
  
  // Handle different formats
  if (cleaned.length === 10) {
    // Add India country code
    cleaned = '91' + cleaned;
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    // Remove leading 0 and add country code
    cleaned = '91' + cleaned.substring(1);
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    // Already has country code
    cleaned = cleaned;
  } else {
    return null; // Invalid format
  }
  
  return cleaned;
};

// Generate UPI payment link - DISABLED
// Reason: Personal UPI ID causes bank security blocks
// TODO: Re-enable when business UPI account is ready
/*
const generateUpiLink = (amount, customerName, clientId) => {
  try {
    if (!amount || amount <= 0) return null;
    if (!customerName || !clientId) return null;
    if (!Config.UPI.enabled) return null;
    
    const { merchantUpiId, merchantName } = Config.UPI;
    const transactionNote = `${clientId}-${customerName}-${amount}`;
    const encodedNote = encodeURIComponent(transactionNote);
    
    return `upi://pay?pa=${merchantUpiId}&pn=${merchantName}&am=${amount}&cu=INR&tn=${encodedNote}`;
  } catch (error) {
    console.error('UPI link generation failed:', error);
    return null;
  }
};
*/

// Format phone number for SMS (10-digit Indian numbers)
export const formatPhoneForSMS = (phone) => {
  if (!phone) return null;
  
  const phoneStr = String(phone);
  let cleaned = phoneStr.replace(/\D/g, '');
  
  // Return 10-digit number for SMS
  if (cleaned.length === 10) {
    return cleaned;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned.substring(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return cleaned.substring(1);
  }
  
  return null;
};

// Create transaction message based on type
export const createTransactionMessage = (customer, transaction, t = (key) => key) => {
  const customerName = customer['Customer Name'] || 'Customer';
  const amount = transaction.amount || 0;
  const type = transaction.type || '';
  const date = transaction.date || new Date().toLocaleDateString('en-GB');
  const note = transaction.note || '';
  
  // Use updated balance from API response if available, otherwise calculate
  let newBalance;
  if (transaction.updatedBalance !== undefined) {
    newBalance = transaction.updatedBalance;
  } else {
    const oldBalance = customer['Total Balance'] || 0;
    if (type === 'CREDIT') {
      newBalance = oldBalance + amount;
    } else if (type === 'PAYMENT') {
      newBalance = oldBalance - amount;
    } else {
      newBalance = oldBalance;
    }
  }

  if (type === 'CREDIT') {
    let message = `${t('notifications.udhariAdded')}

${t('notifications.customer')}: ${customerName}
${t('notifications.amount')}: ₹${amount.toLocaleString()}
${t('notifications.totalBalance')}: ₹${newBalance.toLocaleString()}
${t('notifications.date')}: ${date}${note ? `\n${t('notifications.note')}: ${note}` : ''}`;
    
    // Add UPI link for CREDIT transactions - DISABLED
    // Reason: Personal UPI causes payment declines
    // TODO: Re-enable when business UPI is ready
    /*
    if (Config.UPI.enabled && Config.UPI.includeInWhatsApp) {
      const upiLink = generateUpiLink(amount, customerName, CLIENT_CONFIG.clientId);
      if (upiLink) {
        message += `\n\n${t('notifications.payNow')}: ${upiLink}`;
      }
    }
    */
    
    message += `\n\n_${t('notifications.appName')}_`;
    return message;
  } else if (type === 'PAYMENT') {
    return `${t('notifications.paymentReceived')}

${t('notifications.customer')}: ${customerName}
${t('notifications.amount')}: ₹${amount.toLocaleString()}
${t('notifications.remainingBalance')}: ₹${newBalance.toLocaleString()}
${t('notifications.date')}: ${date}${note ? `\n${t('notifications.note')}: ${note}` : ''}

_${t('notifications.appName')}_`;
  }
  
  return `Transaction Update: ${customerName} - ₹${amount.toLocaleString()}`;
};

// Create SMS message (same format as WhatsApp but without emojis)
export const createSMSMessage = (customer, transaction, t = (key) => key) => {
  const customerName = customer['Customer Name'] || 'Customer';
  const amount = transaction.amount || 0;
  const type = transaction.type || '';
  const date = transaction.date || new Date().toLocaleDateString('en-GB');
  const note = transaction.note || '';
  
  // Use updated balance from API response if available, otherwise calculate
  let newBalance;
  if (transaction.updatedBalance !== undefined) {
    newBalance = transaction.updatedBalance;
  } else {
    const oldBalance = customer['Total Balance'] || 0;
    if (type === 'CREDIT') {
      newBalance = oldBalance + amount;
    } else if (type === 'PAYMENT') {
      newBalance = oldBalance - amount;
    } else {
      newBalance = oldBalance;
    }
  }

  if (type === 'CREDIT') {
    let message = `${t('notifications.udhariAddedSMS')}

${t('notifications.customer')}: ${customerName}
${t('notifications.amount')}: ₹${amount.toLocaleString()}
${t('notifications.totalBalance')}: ₹${newBalance.toLocaleString()}
${t('notifications.date')}: ${date}${note ? `\n${t('notifications.note')}: ${note}` : ''}`;
    
    // Add UPI link for CREDIT transactions - DISABLED
    // Reason: Personal UPI causes payment declines
    // TODO: Re-enable when business UPI is ready
    /*
    if (Config.UPI.enabled && Config.UPI.includeInSMS) {
      const upiLink = generateUpiLink(amount, customerName, CLIENT_CONFIG.clientId);
      if (upiLink) {
        message += `\n\n${t('notifications.payNow')}: ${upiLink}`;
      }
    }
    */
    
    message += `\n\n${t('notifications.appName')}`;
    return message;
  } else if (type === 'PAYMENT') {
    return `${t('notifications.paymentReceivedSMS')}

${t('notifications.customer')}: ${customerName}
${t('notifications.amount')}: ₹${amount.toLocaleString()}
${t('notifications.remainingBalance')}: ₹${newBalance.toLocaleString()}
${t('notifications.date')}: ${date}${note ? `\n${t('notifications.note')}: ${note}` : ''}

${t('notifications.appName')}`;
  }
  
  return `Transaction Update: ${customerName} - ₹${amount.toLocaleString()}`;
};

// Send WhatsApp message using wa.me link
export const sendWhatsAppMessage = async (phone, message, t = (key) => key) => {
  try {
    const formattedPhone = formatPhoneNumber(phone);
    
    if (!formattedPhone) {
      Alert.alert(t('common.error'), t('notifications.invalidPhoneFormat'));
      return false;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    
    // Check if URL can be opened
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
      return true;
    } else {
      Alert.alert(t('common.error'), t('notifications.whatsappNotInstalled'));
      return false;
    }
  } catch (error) {
    console.error('WhatsApp Error:', error);
    Alert.alert(t('common.error'), t('notifications.failedToOpenWhatsapp'));
    return false;
  }
};

// Send SMS message using expo-sms
export const sendSMSMessage = async (phone, message, t = (key) => key) => {
  try {
    const formattedPhone = formatPhoneForSMS(phone);
    
    if (!formattedPhone) {
      Alert.alert(t('common.error'), t('notifications.invalidPhoneFormat'));
      return false;
    }

    // Check if SMS is available
    const isAvailable = await SMS.isAvailableAsync();
    
    if (isAvailable) {
      const { result } = await SMS.sendSMSAsync(
        [formattedPhone],
        message
      );
      return result === 'sent';
    } else {
      Alert.alert(t('common.error'), t('notifications.smsNotAvailable'));
      return false;
    }
  } catch (error) {
    console.error('SMS Error:', error);
    Alert.alert(t('common.error'), t('notifications.failedToSendSMS'));
    return false;
  }
};

// Create payment reminder message for WhatsApp
export const createPaymentReminderMessage = (customer, t = (key) => key) => {
  const customerName = customer['Customer Name'] || 'Customer';
  const outstandingAmount = customer['Total Balance'] || 0;
  
  return `${t('notifications.paymentReminder')}

${t('notifications.dear')} ${customerName},
${t('notifications.friendlyReminderText')}

${t('notifications.outstandingAmount')}: ₹${outstandingAmount.toLocaleString()}

${t('notifications.pleasePayEarliest')}

${t('notifications.thankYou')}
- ${t('notifications.appName')}`;
};

// Create payment reminder SMS message (same as WhatsApp)
export const createPaymentReminderSMS = (customer, t = (key) => key) => {
  return createPaymentReminderMessage(customer, t);
};

// Show payment reminder options dialog
export const showPaymentReminderOptions = async (customer, t = (key) => key) => {
  const customerName = customer['Customer Name'] || 'Customer';
  const phone = customer['Phone Number'];
  
  if (!phone) {
    Alert.alert(t('common.error'), t('notifications.phoneNotAvailableForCustomer'));
    return;
  }
  
  // Fetch fresh customer data to get latest balance
  let freshCustomer = customer;
  try {
    const ApiService = require('../services/ApiService').default;
    const customers = await ApiService.getCustomers();
    const updated = customers.find(c => c['Customer ID'] === customer['Customer ID']);
    if (updated) {
      freshCustomer = updated;
    }
  } catch (error) {
    console.log('Could not fetch fresh customer data, using cached data');
  }
  
  const outstandingAmount = freshCustomer['Total Balance'] || 0;
  
  if (outstandingAmount <= 0) {
    Alert.alert(t('common.ok'), t('notifications.noOutstandingBalance'));
    return;
  }

  Alert.alert(
    t('notifications.sendPaymentReminder'),
    `${t('notifications.sendReminderTo')} ${customerName}?\n${t('notifications.outstandingAmount')}: ₹${outstandingAmount.toLocaleString()}`,
    [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('notifications.whatsapp'),
        onPress: async () => {
          const message = createPaymentReminderMessage(freshCustomer, t);
          await sendWhatsAppMessage(phone, message, t);
        },
      },
      {
        text: t('notifications.sms'),
        onPress: async () => {
          const message = createPaymentReminderSMS(freshCustomer, t);
          await sendSMSMessage(phone, message, t);
        },
      },
    ]
  );
};

// Show notification dialog with WhatsApp and SMS options
export const showNotificationOptions = (customer, transaction, t = (key) => key) => {
  const customerName = customer['Customer Name'] || 'Customer';
  const phone = customer['Phone Number'];
  
  if (!phone) {
    Alert.alert(t('common.error'), t('notifications.phoneNotAvailable'));
    return;
  }

  Alert.alert(
    t('notifications.sendNotification'),
    `${t('notifications.sendTransactionUpdate')} ${customerName}?`,
    [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('notifications.whatsapp'),
        onPress: () => {
          const message = createTransactionMessage(customer, transaction, t);
          sendWhatsAppMessage(phone, message, t);
        },
      },
      {
        text: t('notifications.sms'),
        onPress: () => {
          const message = createSMSMessage(customer, transaction, t);
          sendSMSMessage(phone, message, t);
        },
      },
    ]
  );
};

// Hook to use language context in components
export const useNotificationService = () => {
  const { t } = ENABLE_I18N ? useContext(SimpleLanguageContext) : { t: (key) => key };
  
  return {
    showNotificationOptions: (customer, transaction) => showNotificationOptions(customer, transaction, t),
    showPaymentReminderOptions: (customer) => showPaymentReminderOptions(customer, t),
    createTransactionMessage: (customer, transaction) => createTransactionMessage(customer, transaction, t),
    createSMSMessage: (customer, transaction) => createSMSMessage(customer, transaction, t),
    createPaymentReminderMessage: (customer) => createPaymentReminderMessage(customer, t),
    createPaymentReminderSMS: (customer) => createPaymentReminderSMS(customer, t),
    sendWhatsAppMessage: (phone, message) => sendWhatsAppMessage(phone, message, t),
    sendSMSMessage: (phone, message) => sendSMSMessage(phone, message, t),
  };
};

// Backward compatibility - keep the old function name
export const showWhatsAppNotification = showNotificationOptions;