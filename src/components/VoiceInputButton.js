// src/components/VoiceInputButton.js

import React, { useState, useEffect, useContext } from 'react';
import { TouchableOpacity, Alert, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import VoiceInputService from '../services/VoiceInputService';
import { parseVoiceCommand } from '../Utils/VoiceCommandParser';
import SQLiteService from '../services/SQLiteService';
import { SimpleLanguageContext } from '../contexts/SimpleLanguageContext';
import { ENABLE_I18N } from '../config/i18nConfig';

export default function VoiceInputButton({ 
  navigation, 
  selectedCustomer,
  onVoiceStart,
  onVoiceEnd,
  style,
  theme 
}) {
  const [isListening, setIsListening] = useState(false);
  
  const { currentLanguage } = ENABLE_I18N ? useContext(SimpleLanguageContext) : { currentLanguage: 'en' };

  const getVoiceLanguageCode = () => {
    const languageMap = {
      'en': 'en-IN',
      'hi': 'hi-IN',
      'mr': 'mr-IN'
    };
    
    const langCode = languageMap[currentLanguage] || 'en-IN';
    return langCode;
  };

  useEffect(() => {
    return () => {
      VoiceInputService.destroy();
    };
  }, []);

  const requestMicrophonePermission = async () => {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.MICROPHONE 
        : PERMISSIONS.ANDROID.RECORD_AUDIO;

      const result = await check(permission);

      if (result === RESULTS.GRANTED) {
        return true;
      }

      if (result === RESULTS.DENIED) {
        const requestResult = await request(permission);
        return requestResult === RESULTS.GRANTED;
      }

      if (result === RESULTS.BLOCKED) {
        Alert.alert(
          'Microphone Permission Required',
          'Please enable microphone access in Settings to use voice input.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return false;
      }

      return false;
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  };

  const handleVoiceInput = async () => {
    if (isListening) {
      await VoiceInputService.stopListening();
      setIsListening(false);
      if (onVoiceEnd) onVoiceEnd();
      return;
    }

    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) return;

    setIsListening(true);
    if (onVoiceStart) onVoiceStart();

    const voiceLangCode = getVoiceLanguageCode();

    const started = await VoiceInputService.startListening(async (spokenText, error) => {
      setIsListening(false);
      if (onVoiceEnd) onVoiceEnd();

      if (error) {
        Alert.alert('Error', 'Could not recognize speech. Please try again.');
        return;
      }

      if (!spokenText) {
        Alert.alert('No Speech Detected', 'Please try again and speak clearly.');
        return;
      }

      const parsed = parseVoiceCommand(spokenText, voiceLangCode);

      if (!parsed.success) {
        // ✅ UPDATED: Correct examples matching the simplified parser
        const examples = {
          'en-IN': 'Example:\nCredit: "Give 500 to John"\nPayment: "Received 500 from John"',
          'hi-IN': 'उदाहरण:\nक्रेडिट: "जॉन को 500 दिए"\nभुगतान: "जॉन से 500 मिले"',
          'mr-IN': 'उदाहरण:\nक्रेडिट: "जॉन ला 500 दिले"\nभुगतान: "जॉन कडून 500 मिळाले"'
        };
        
        Alert.alert(
          'Could not understand',
          `${examples[voiceLangCode]}\n\nYou said: "${spokenText}"`
        );
        return;
      }

      // Find customer by name
      const customers = await SQLiteService.getCustomers();
      const matchedCustomers = customers.filter(c =>
        c["Customer Name"].toLowerCase().includes(parsed.customerName.toLowerCase())
      );

      if (matchedCustomers.length === 0) {
  Alert.alert(
    'Customer not found',
    `No customer "${parsed.customerName}" found in your contacts.\n\nPlease add them manually first, then try voice input again.`,
    [{ text: 'OK', style: 'default' }]
  );
  return;
}


      let customer;
      if (matchedCustomers.length > 1) {
        Alert.alert(
          'Multiple Customers Found',
          'Please select the correct customer:',
          matchedCustomers.map(c => ({
            text: c["Customer Name"],
            onPress: () => addTransactionForCustomer(c, parsed)
          })).concat([{ text: 'Cancel', style: 'cancel' }])
        );
        return;
      } else {
        customer = matchedCustomers[0];
      }

      await addTransactionForCustomer(customer, parsed);
    }, voiceLangCode);

    if (!started) {
      setIsListening(false);
      if (onVoiceEnd) onVoiceEnd();
      Alert.alert('Error', 'Could not start voice recognition. Please try again.');
    }
  };

  const addTransactionForCustomer = async (customer, parsed) => {
    navigation.navigate('AddTransaction', {
      selectedCustomer: customer,
      hasSelectedCustomer: true,
      voiceInput: {
        type: parsed.transactionType,
        amount: parsed.amount.toString(),
        note: `Voice: ${parsed.originalText}`
      }
    });

    Alert.alert(
      'Transaction Ready',
      `Adding ${parsed.transactionType.toLowerCase()} of ₹${parsed.amount} for ${customer["Customer Name"]}\n\nPlease review and confirm.`
    );
  };

  return (
    <TouchableOpacity
      style={[
        {
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: isListening ? '#ef4444' : theme.colors.secondary || '#10b981',
          justifyContent: 'center',
          alignItems: 'center',
          ...Platform.select({
            ios: {
              shadowColor: isListening ? '#ef4444' : '#10b981',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 8,
            },
            android: {
              elevation: 8,
            },
          }),
        },
        style
      ]}
      onPress={handleVoiceInput}
      activeOpacity={0.9}
    >
      <Ionicons 
        name={isListening ? 'stop' : 'mic'} 
        size={28} 
        color="#fff" 
      />
    </TouchableOpacity>
  );
}
