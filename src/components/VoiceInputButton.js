// src/components/VoiceInputButton.js

import React, { useState, useEffect, useContext } from 'react';
import { TouchableOpacity, Platform, Linking, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import VoiceInputService from '../services/VoiceInputService';
import { 
  parseVoiceCommandWithFallback, 
  parseCustomerVoiceCommandWithFallback 
} from '../Utils/VoiceCommandParser';
import SQLiteService from '../services/SQLiteService';
import { findBestMatches } from '../Utils/FuzzyMatcher';
import { SimpleLanguageContext } from '../contexts/SimpleLanguageContext';
import { ENABLE_I18N, fallbackT } from '../config/i18nConfig';
import { useAlert } from '../contexts/AlertContext';
import { useUser } from '../contexts/UserContext';
import CustomerSelectModal from '../components/CustomerSelectModal';

const LANGUAGE_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  bn: 'bn-IN',
  pa: 'pa-IN',
  or: 'or-IN',
  as: 'as-IN',
  ur: 'ur-IN',
  kok: 'kok-IN',
  mai: 'mai-IN',
  sat: 'sat-IN',
  bho: 'hi-IN',
  mrw: 'mr-IN',
  sd: 'sd-IN',
};

const useT = () => {
  return ENABLE_I18N ? useContext(SimpleLanguageContext).t : fallbackT;
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
  const { showAlert } = useAlert();
  const { user } = useUser();
  const { currentLanguage } = ENABLE_I18N ? useContext(SimpleLanguageContext) : { currentLanguage: 'en' };
  const t = useT();

  // State for multiple-customer selection
  const [customerPickerVisible, setCustomerPickerVisible] = useState(false);
  const [matchedCustomersForPicker, setMatchedCustomersForPicker] = useState([]);
  const [pendingParsed, setPendingParsed] = useState(null);

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
      const permission =
        Platform.OS === 'ios'
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
        showAlert({
          title: t('voiceInput.microphonePermissionTitle'),
          message: t('voiceInput.microphonePermissionMessage'),
          type: 'warning',
          buttons: [
            { text: t('common.cancel'), style: 'secondary' },
            {
              text: t('voiceInput.openSettings'),
              style: 'primary',
              onPress: () => Linking.openSettings(),
            },
          ],
        });
        return false;
      }

      return false;
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  };

  const handleVoiceInput = async () => {
    // Check if user is logged in
    if (!user) {
      showAlert({
        title: t('voiceInput.loginRequired') || 'Login Required',
        message: t('voiceInput.loginRequiredMessage') || 'Please login to use voice input feature',
        type: 'warning',
        buttons: [
          { text: t('common.cancel'), style: 'secondary' },
          {
            text: t('common.login') || 'Login',
            style: 'primary',
            onPress: () => {
              navigation.navigate('Auth');
            },
          },
        ],
      });
      return;
    }

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

    const started = await VoiceInputService.startListening(
      async (spokenText, error) => {
        setIsListening(false);
        if (onVoiceEnd) onVoiceEnd();

        if (error) {
          showAlert({
            title: t('voiceInput.errorTitle'),
            message: t('voiceInput.errorMessage'),
            type: 'error',
            buttons: [{ text: t('common.ok'), style: 'primary' }],
          });
          return;
        }

        if (!spokenText) {
          showAlert({
            title: t('voiceInput.noSpeechDetected'),
            message: t('voiceInput.noSpeechMessage'),
            type: 'warning',
            buttons: [{ text: t('common.ok'), style: 'primary' }],
          });
          return;
        }

        if (mode === 'customer') {
          await handleCustomerVoiceInput(spokenText);
        } else {
          await handleTransactionVoiceInput(spokenText);
        }
      },
      voiceLangCode
    );

    if (!started) {
      setIsListening(false);
      if (onVoiceEnd) onVoiceEnd();
      showAlert({
        title: t('voiceInput.errorTitle'),
        message: t('voiceInput.couldNotStart'),
        type: 'error',
        buttons: [{ text: t('common.ok'), style: 'primary' }],
      });
    }
  };

  const handleTransactionVoiceInput = async (spokenText) => {
    const parsed = parseVoiceCommandWithFallback(spokenText, currentLanguage);

    if (!parsed.success) {
      const examplesMap = {
        en: 'Example:\nCredit: "Give 500 to John"\nPayment: "Received 500 from John"',
        hi: 'उदाहरण:\nक्रेडिट: "जॉन को 500 दिए"\nभुगतान: "जॉन से 500 मिले"',
        mr: 'उदाहरण:\nक्रेडिट: "जॉन ला 500 दिले"\nभुगतान: "जॉन कडून 500 मिळाले"',
        gu: 'ઉદાહરણ:\nક્રેડિટ: "જોનને 500 આપ્યું"\nપેમેન્ટ: "જોનથી 500 મળ્યું"',
        ta: 'உதாரணம்:\nக்ரெடிட்: "ஜான்கு 500 கொடுத்தேன்"\nபேமெண்ட்: "ஜான்கிருந்து 500 கிடைத்தது"',
        te: 'ఉదాహరణ:\nక్రెడిట్: "జాన్కు 500 ఇచ్చిన్"\nపేమెంట్: "జాన్ నుండి 500 వచ్చింది"',
        kn: 'ಉದಾಹರಣೆ:\nಕ್ರೆಡಿಟ್: "ಜಾನ್ಗೆ 500 ಕೊಟ್ಟೆ"\nಪೇಮೆಂಟ್: "ಜಾನ್ಗಿಂದ 500 ಬಂದಿತು"',
        ml: 'ഉദാഹരണം:\nക്രെഡിറ്റ്: "ജോണിന് 500 കൊടുത്തു"\nപേമെന്റ്: "ജോണിൽ നിന്ന് 500 ലഭിച്ചു"',
        bn: 'উদাহরণ:\nক্রেডিট: "জনকে 500 দিয়েছি"\nভুগতান: "জন থেকে 500 পেয়েছি"',
        pa: 'ਉਦਾਹਰਣ:\nਕ੍ਰੇਡਿਟ: "ਜੌਨ ਨੂੰ 500 ਦਿੱਤੇ"\nਭੁਗਤਾਨ: "ਜੌਨ ਨੂੰ 500 ਮਿਲਿਆ"',
        or: 'ଉଦାହରଣ:\nକ୍ରେଡିଟ୍: "ଜନ୍‌ଙ୍କୁ 500 ଦେଇଛି"\nଦେୟ: "ଜନ୍‌ ଠାରୁ 500 ମିଳିଛି"',
        as: 'উদাহৰণ:\nক্ৰেডিট: "জনক 500 দিলো"\nপেমেন্ট: "জনৰ পৰা 500 পালো"',
        ur: 'مثال:\nکریڈٹ: "جان کو 500 دیے"\nادائیگی: "جان سے 500 ملے"',
        kok: 'उदाहरण:\nक्रेडिट: "जानाक 500 दिले"\nपेमेंट: "जानान 500 मेळले"',
        mai: 'उदाहरण:\nक्रेडिट: "जॉनक 500 देलहुँ"\nपेमेंट: "जॉन से 500 पेलहुँ"',
        sat: 'उदाहरण:\nक्रेडिट: "जॉन-ले 500 दिसेंग"\nपेमेंट: "जॉन अड़े 500 पिसेंग"',
        bho: 'उदाहरण:\nक्रेडिट: "मोहन के 500 दीहल"\nपेमेंट: "रवि से 500 पावल"',
        mrw: 'उदाहरण:\nक्रेडिट: "सुमित ने 400 दियो"\nपेमेंट: "मोहन थां 200 मिल्यो"',
        sd: 'مثال:\nکریڈٹ: "فاطمہ کي 500 ڏنو"\nادائيگي: "علي کان 1000 مليو"',
      };

      const examples = examplesMap[currentLanguage] || examplesMap.en;

      showAlert({
        title: t('voiceInput.couldNotUnderstand'),
        message: `${examples}\n\n${t('voiceInput.youSaid')}: "${spokenText}"`,
        type: 'warning',
        buttons: [{ text: t('common.ok'), style: 'primary' }],
      });
      return;
    }

    const customers = await SQLiteService.getCustomers();
    
    // ✅ Use fuzzy matching with scoring
    const matchedCustomers = findBestMatches(
      parsed.customerName || '',
      customers,
      0.6 // 60% similarity threshold
    );
    
    console.log(`🔍 Found ${matchedCustomers.length} matches for "${parsed.customerName}"`);

    if (matchedCustomers.length === 0) {
      showAlert({
        title: t('voiceInput.customerNotFound'),
        message: t('voiceInput.customerNotFoundMessage').replace('{name}', parsed.customerName),
        type: 'warning',
        buttons: [{ text: t('common.ok'), style: 'primary' }],
      });
      return;
    }

    if (matchedCustomers.length > 1) {
      setMatchedCustomersForPicker(matchedCustomers);
      setPendingParsed(parsed);
      setCustomerPickerVisible(true);
      return;
    }

    const customer = matchedCustomers[0];
    await addTransactionForCustomer(customer, parsed);
  };

  const handleCustomerVoiceInput = async (spokenText) => {
    const parsed = parseCustomerVoiceCommandWithFallback(
      spokenText,
      currentLanguage
    );

    if (!parsed.success) {
      const examplesMap = {
        en: 'Example: "Add customer John number 9876543210"',
        hi: 'उदाहरण: "ग्राहक जॉन नंबर 9876543210 जोड़ें"',
        mr: 'उदाहरण: "ग्राहक जॉन नंबर 9876543210 जोडा"',
        gu: 'ઉદાહરણ: "ગ્રાહક જોન નંબર 9876543210 ઉમેરો"',
        ta: 'உதாரணம்: "வாடிக்கையாளர் ஜான் எண் 9876543210 சேர்க்கவும்"',
        te: 'ఉదాహరణ: "కస్టమర్ జాన్ నంబర్ 9876543210 జోడించండి"',
        kn: 'ಉದಾಹರಣೆ: "ಗ್ರಾಹಕ ಜಾನ್ ಸಂಖ್ಯೆ 9876543210 ಸೇರಿಸಿ"',
        ml: 'ഉദാഹരണം: "ഗ്രാഹകൻ ജോൺ നമ്പർ 9876543210 ചേർക്കുക"',
        bn: 'উদাহরণ: "গ্রাহক জন নম্বর 9876543210 যুক্ত করুন"',
        pa: 'ਉਦਾਹਰਣ: "ਗ੍ਰਾਹਕ ਜੌਨ ਨੰਬਰ 9876543210 ਸ਼ਾਮਿਲ ਕਰੋ"',
        or: 'ଉଦାହରଣ: "ଗ୍ରାହକ ଜନ ସଂଖ୍ୟା 9876543210 ଯୋଗ କର"',
        as: 'উদাহৰণ: "গ্ৰাহক জন নম্বৰ 9876543210 যোগ কৰক"',
        ur: 'مثال: "صارف جان نمبر 9876543210 شامل کریں"',
        kok: 'उदाहरण: "ग्राहक जॉन नंबर 9876543210 जोडूं"',
        mai: 'उदाहरण: "ग्राहक जॉन नंबर 9876543210 जोडूं"',
        sat: 'उदाहरण: "ग्राहक जॉन नंबर 9876543210 जोडूं"',
        bho: 'उदाहरण: "ग्राहक राम नंबर 9876543210 जोड़ऽ"',
        mrw: 'उदाहरण: "ग्राहक गणेश नंबर 9876543210 जोड़ो"',
        sd: 'مثال: "گراهڪ انور نمبر 9876543210 شامل"',
      };

      const examples = examplesMap[currentLanguage] || examplesMap.en;

      showAlert({
        title: t('voiceInput.couldNotUnderstand'),
        message: `${examples}\n\n${t('voiceInput.youSaid')}: "${spokenText}"`,
        type: 'warning',
        buttons: [{ text: t('common.ok'), style: 'primary' }],
      });
      return;
    }

    showAlert({
      title: t('voiceInput.customerDetailsCaptured'),
      message: t('voiceInput.confirmCustomerMessage')
        .replace('{name}', parsed.customerName)
        .replace('{phone}', parsed.phoneNumber),
      type: 'success',
      buttons: [
        { text: t('common.cancel'), style: 'secondary' },
        {
          text: t('voiceInput.confirm'),
          style: 'primary',
          onPress: () => {
            navigation.navigate('AddCustomer', {
              voiceInput: {
                customerName: parsed.customerName,
                phoneNumber: parsed.phoneNumber,
                originalText: parsed.originalText,
              },
            });
          },
        },
      ],
    });
  };

  const addTransactionForCustomer = async (customer, parsed) => {
    navigation.navigate('AddTransaction', {
      selectedCustomer: customer,
      hasSelectedCustomer: true,
      voiceInput: {
        type: parsed.transactionType,
        amount: parsed.amount.toString(),
        note: '',  // ✅ Empty note field
      },
    });

    showAlert({
      title: t('voiceInput.transactionReady'),
      message: t('voiceInput.transactionReadyMessage')
        .replace('{type}', parsed.transactionType.toLowerCase())
        .replace('{amount}', parsed.amount)
        .replace('{customer}', customer['Customer Name']),
      type: 'success',
      buttons: [{ text: t('common.ok'), style: 'primary' }],
    });
  };

  const isLocked = !user;

  return (
    <>
      <TouchableOpacity
        style={[
          {
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: isLocked
              ? theme.colors.disabled || '#9ca3af'
              : isListening
              ? '#ef4444'
              : theme.colors.secondary || '#10b981',
            justifyContent: 'center',
            alignItems: 'center',
            ...Platform.select({
              ios: {
                shadowColor: isLocked
                  ? '#9ca3af'
                  : isListening
                  ? '#ef4444'
                  : '#10b981',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
              },
              android: {
                elevation: 8,
              },
            }),
          },
          style,
        ]}
        onPress={handleVoiceInput}
        activeOpacity={0.9}
      >
        <Ionicons
          name={isListening ? 'stop' : 'mic'}
          size={28}
          color="#fff"
        />
        
        {isLocked && (
          <View
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: '#d82020ff',
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 2,
              borderColor: '#fff',
            }}
          >
            <Ionicons name="lock-closed" size={12} color="#fff" />
          </View>
        )}
      </TouchableOpacity>

      <CustomerSelectModal
        visible={customerPickerVisible}
        customers={matchedCustomersForPicker}
        title={t('voiceInput.selectCustomer')}
        subtitle={
          pendingParsed?.customerName
            ? t('voiceInput.matchesFor').replace('{name}', pendingParsed.customerName)
            : undefined
        }
        onSelect={(customer) => {
          setCustomerPickerVisible(false);
          if (pendingParsed) {
            addTransactionForCustomer(customer, pendingParsed);
          }
        }}
        onClose={() => setCustomerPickerVisible(false)}
      />
    </>
  );
}
