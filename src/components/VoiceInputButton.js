// src/components/VoiceInputButton.js

import React, { useState, useEffect, useContext } from 'react';
import { TouchableOpacity, Alert, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import VoiceInputService from '../services/VoiceInputService';
import { 
  parseVoiceCommandWithFallback, 
  parseCustomerVoiceCommandWithFallback 
} from '../Utils/VoiceCommandParser';
import SQLiteService from '../services/SQLiteService';
import { SimpleLanguageContext } from '../contexts/SimpleLanguageContext';
import { ENABLE_I18N } from '../config/i18nConfig';

const LANGUAGE_MAP = {
  'en': 'en-IN',
  'hi': 'hi-IN',
  'mr': 'mr-IN',
  'gu': 'gu-IN',
  'ta': 'ta-IN',
  'te': 'te-IN',
  'kn': 'kn-IN',
  'ml': 'ml-IN',
  'bn': 'bn-IN',
  'pa': 'pa-IN',
  'or': 'or-IN',
  'as': 'as-IN',
  'ur': 'ur-IN',
  'kok': 'kok-IN',
  'mai': 'mai-IN',
  'sat': 'sat-IN',
};

export default function VoiceInputButton({ 
  navigation, 
  selectedCustomer,
  onVoiceStart,
  onVoiceEnd,
  style,
  theme,
  mode = 'transaction'
}) {
  const [isListening, setIsListening] = useState(false);
  
  const { currentLanguage } = ENABLE_I18N ? useContext(SimpleLanguageContext) : { currentLanguage: 'en' };

  const getVoiceLanguageCode = () => {
    const langCode = LANGUAGE_MAP[currentLanguage] || 'en-IN';
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

      if (mode === 'customer') {
        await handleCustomerVoiceInput(spokenText);
      } else {
        await handleTransactionVoiceInput(spokenText);
      }
    }, voiceLangCode);

    if (!started) {
      setIsListening(false);
      if (onVoiceEnd) onVoiceEnd();
      Alert.alert('Error', 'Could not start voice recognition. Please try again.');
    }
  };

  const handleTransactionVoiceInput = async (spokenText) => {
    const parsed = parseVoiceCommandWithFallback(spokenText, currentLanguage);

    if (!parsed.success) {
      const examplesMap = {
        'en': 'Example:\nCredit: "Give 500 to John"\nPayment: "Received 500 from John"',
        'hi': 'उदाहरण:\nक्रेडिट: "जॉन को 500 दिए"\nभुगतान: "जॉन से 500 मिले"',
        'mr': 'उदाहरण:\nक्रेडिट: "जॉन ला 500 दिले"\nभुगतान: "जॉन कडून 500 मिळाले"',
        'gu': 'ઉદાહરણ:\nક्રેडિट: "જોનને 500 આપ્યું"\nપેમેન્ટ: "જોનથી 500 મળ્યું"',
        'ta': 'உதாரணம்:\nक्रेडिट: "ஜான்கु 500 கொடுத்தேன்"\nپेमेंट: "ஜான்கிருந்து 500 கிடைத்தது"',
        'te': 'ఉదాహరణ:\nక్రెডిట్: "జాన్కు 500 ఇచ్చిన్"\nപेमेंट: "జాన్ నుండి 500 వచ్చింది"',
        'kn': 'ಉದಾಹರಣೆ:\nಕ್ರೆಡಿಟ್: "ಜಾನ್ಗೆ 500 ಕೊಟ್ಟೆ"\nபेमेंט: "ಜಾನ್ಗಿಂದ 500 ಬಂದಿತು"',
        'ml': 'ഉദാഹരണം:\nക్రెডิट: "ജോണിന് 500 കൊടുത്തു"\nပेमেंट: "ജോണിൽ നിന്ന് 500 ലഭിച്ചു"',
        'bn': 'উদাহরণ:\nक्रेडिट: "জনকে 500 দিয়েছি"\nभुगतान: "জন থেকে 500 পেয়েছি"',
        'pa': 'ਉਦਾਹਰਣ:\nক्रেडिट: "ਜੌਨ ਨੂੰ 500 ਦਿੱਤੇ"\nभुगतान: "ਜੌਨ ਨੂੰ 500 ਮਿਲਿਆ"',
        'or': 'ଉଦାହରଣ:\nక్रെডിT: "ଜନ୍‌ଙ୍କୁ 500 ଦେଇଛି"\nଦେୟ: "ଜନ୍‌ ଠାରୁ 500 ମିଳିଛି"',
        'as': 'উদাহরণ:\nక్रેडिट: "জনক 500 দিলো"\nപेमेंट: "জনৰ পৰা 500 পালো"',
        'ur': 'مثال:\nکریڈٹ: "جان کو 500 دیے"\nأداء: "جان سے 500 ملے"',
        'kok': 'उदाहरण:\nक्रेडिट: "जानाक 500 दिले"\nपेमेंट: "जानान 500 मेळले"',
        'mai': 'उदाहरण:\nक्रेडिट: "जॉनक 500 देलहुँ"\nपेमेंट: "जॉन से 500 पेलहुँ"',
        'sat': 'उदाहरण:\nक्रेडिट: "जॉन-ले 500 दिसेंग"\nपेमेंट: "जॉन अड़े 500 पिसेंग"'
      };
      
      const examples = examplesMap[currentLanguage] || examplesMap['en'];
      
      Alert.alert(
        'Could not understand',
        `${examples}\n\nYou said: "${spokenText}"`
      );
      return;
    }

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
  };

  const handleCustomerVoiceInput = async (spokenText) => {
    const parsed = parseCustomerVoiceCommandWithFallback(spokenText, currentLanguage);

    if (!parsed.success) {
      const examplesMap = {
        'en': 'Example: "Add customer John number 9876543210"',
        'hi': 'उदाहरण: "ग्राहक जॉन नंबर 9876543210 जोड़ें"',
        'mr': 'उदाहरण: "ग्राहक जॉन नंबर 9876543210 जोड़ें"',
        'gu': 'ઉદાહરણ: "ગ્રાહક જોન નંબર 9876543210 ઉમેરો"',
        'ta': 'உதாரணம்: "வாடிக்கையாளர் ஜான் எண் 9876543210 சேர்க்கவும்"',
        'te': 'ఉదాహరణ: "కస్టమర్ జాన్ నంబర్ 9876543210 జోడించండి"',
        'kn': 'ಉದಾಹರಣೆ: "ಗ್ರಾಹಕ ಜಾನ್ ಸಂಖ್ಯೆ 9876543210 ಸೇರಿಸಿ"',
        'ml': 'ഉദാഹരണം: "ഗ്രാഹകൻ ജോൺ നമ്പർ 9876543210 ചേർക്കുക"',
        'bn': 'উদাহরণ: "গ্রাহক জন নম্বর 9876543210 যুক্ত করুন"',
        'pa': 'ਉਦਾਹਰਣ: "ਗ੍ਰਾਹਕ ਜੌਨ ਨੰਬਰ 9876543210 ਸ਼ਾਮਿਲ ਕਰੋ"',
        'or': 'ଉଦାହରଣ: "ଗ୍ରାହକ ଜନ ସଂଖ୍ୟା 9876543210 ଯୋଗ କର"',
        'as': 'उदाहरण: "গ্রাহক জন नम্बर 9876543210 যোग কৰক"',
        'ur': 'مثال: "صارف جان نمبر 9876543210 شامل کریں"',
        'kok': 'उदाहरण: "ग्राहक जॉन नंबर 9876543210 जोडूं"',
        'mai': 'उदाहरण: "ग्राहक जॉन नंबर 9876543210 जोडूं"',
        'sat': 'उदाहरण: "ग्राहक जॉन नंबर 9876543210 जोडूं"'
      };
      
      const examples = examplesMap[currentLanguage] || examplesMap['en'];
      
      Alert.alert(
        'Could not understand',
        `${examples}\n\nYou said: "${spokenText}"`
      );
      return;
    }

    Alert.alert(
      'Customer Details Captured',
      `Name: ${parsed.customerName}\nPhone: ${parsed.phoneNumber}\n\nPlease confirm and save.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Confirm',
          onPress: () => {
            navigation.navigate('AddCustomer', {
              voiceInput: {
                customerName: parsed.customerName,
                phoneNumber: parsed.phoneNumber,
                originalText: parsed.originalText
              }
            });
          }
        }
      ]
    );
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
