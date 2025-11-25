// src/utils/VoiceCommandParser.js

const LANGUAGE_KEYWORDS = {
  'en': {
    payment: ['from', 'received', 'got', 'taken', 'get'],
    credit: ['to', 'give', 'given', 'paid', 'give to'],
    add: ['add', 'create', 'new'],
    customer: ['customer', 'cust', 'contact', 'person'],
    number: ['number', 'num', 'phone', 'mobile'],
  },
  'hi': {
    payment: ['से', 'मिले', 'पाए', 'मिला', 'लिया'],
    credit: ['को', 'दिए', 'दे', 'दिया', 'दिई'],
    add: ['जोड़ें', 'बनाएं', 'नया'],
    customer: ['ग्राहक', 'व्यक्ति'],
    number: ['नंबर', 'फोन', 'संख्या'],
  },
  'mr': {
    payment: ['कडून', 'मिळाले', 'घेतले', 'पाहिले'],
    credit: ['ला', 'दिले', 'दे', 'दिली', 'दिल'],
    add: ['जोडा', 'बनवा', 'नवा'],
    customer: ['ग्राहक', 'व्यक्ती'],
    number: ['नंबर', 'फोन', 'क्रमांक'],
  },
  'gu': {
    payment: ['થી', 'મળ્યું', 'મેળવ્યું', 'લીધું', 'લ્યું'],
    credit: ['ને', 'આપ્યું', 'આપ', 'આપી'],
    add: ['ઉમેરો', 'બનાવો'],
    customer: ['ગ્રાહક', 'વ્યક્તિ'],
    number: ['નંબર', 'ફોન', 'સંખ્યા'],
  },
  'ta': {
    payment: ['இருந்து', 'கிடைத்தது', 'பெற்றேன்', 'வாங்கினேன்'],
    credit: ['க்கு', 'கொடுத்தேன்', 'கொடுத்த'],
    add: ['சேர்', 'உருவாக்க'],
    customer: ['வாடிக்கையாளர்', 'நபர்'],
    number: ['எண்', 'ఫోన్'],
  },
  'te': {
    payment: ['నుండి', 'వచ్చింది', 'పొందాను', 'తీసుకున్నాను'],
    credit: ['కు', 'ఇచ్చిన్', 'ఇచ్చా', 'ఇవ్వాలి'],
    add: ['జోడించండి', 'సృష్టించండి'],
    customer: ['కస్టమర్', 'వ్యక్తి'],
    number: ['నంబర్', 'ఫోన్'],
  },
  'kn': {
    payment: ['ಗಿಂದ', 'ಬಂದಿತು', 'ಪಡೆದೆ', 'ತೆಗೆದುಕೊಂಡೆ'],
    credit: ['ಗೆ', 'ಕೊಟ್ಟೆ', 'ಕೊಡುತ್ತಿದೆ', 'ಕೊಟ್ಟಿದೆ'],
    add: ['ಸೇರಿಸಿ', 'ರಚಿಸಿ'],
    customer: ['ಗ್ರಾಹಕ', 'ವ್ಯಕ್ತಿ'],
    number: ['ಸಂಖ್ಯೆ', 'ಫೋನ್'],
  },
  'ml': {
    payment: ['നിന്ന്', 'ലഭിച്ചു', 'കിട്ടി', 'വാങ്ങി'],
    credit: ['ിന്', 'കൊടുത്തു', 'കൊടുക്കും', 'കൊടുത്ത'],
    add: ['ചേർക്കുക', 'സൃഷ്ടിക്കുക'],
    customer: ['ഗ്രാഹകൻ', 'വ്യക്തി'],
    number: ['നമ്പർ', 'ഫോൺ'],
  },
  'bn': {
    payment: ['থেকে', 'পেয়েছি', 'নিয়েছি', 'পেলাম'],
    credit: ['কে', 'দিয়েছি', 'দিন', 'দেবেন'],
    add: ['যুক্ত', 'তৈরি'],
    customer: ['গ্রাহক', 'ব্যক্তি'],
    number: ['নম্বর', 'ফোন'],
  },
  'pa': {
    payment: ['ੋਂ', 'ਮਿਲ', 'ਪਰਾਪਤ', 'ਲਿਆ'],
    credit: ['ਨੂੰ', 'ਦਿੱਤੇ', 'ਦਿਓ', 'ਦੇਵੋ'],
    add: ['ਸ਼ਾਮਿਲ', 'ਬਣਾਓ'],
    customer: ['ਗ੍ਰਾਹਕ', 'ਵਿਅਕਤੀ'],
    number: ['ਨੰਬਰ', 'ਫੋਨ'],
  },
  'or': {
    payment: ['ଠାରୁ', 'ମିଳିଛି', 'ପାଇଛି', 'ନେଇଛି'],
    credit: ['ଙ୍କୁ', 'ଦେଇଛି', 'ଦେହେ', 'ଦେବେ'],
    add: ['ଯୋଗ', 'ତିଆରି'],
    customer: ['ଗ୍ରାହକ', 'ବ୍ୟକ୍ତି'],
    number: ['ସଂଖ୍ୟା', 'ଫୋନ'],
  },
  'as': {
    payment: ['পৰা', 'পালো', 'পাইছো', 'লৈছো'],
    credit: ['ক', 'দিলো', 'দিবা', 'দিছো'],
    add: ['যোग', 'তৈয়াৰ'],
    customer: ['গ্রাহক', 'ব্যক্তি'],
    number: ['नम्बर', 'ফোন'],
  },
  'ur': {
    payment: ['سے', 'ملے', 'لیا', 'پایا'],
    credit: ['کو', 'دیے', 'دینا', 'دو'],
    add: ['شامل', 'بنائیں'],
    customer: ['صارف', 'شخص'],
    number: ['نمبر', 'فون'],
  },
  'kok': {
    payment: ['अड़े', 'मेळले', 'पेलो', 'घेतलो'],
    credit: ['क', 'दिले', 'दे', 'दिलो'],
    add: ['जोडूं', 'बनवूं'],
    customer: ['ग्राहक', 'व्यक्ती'],
    number: ['नंबर', 'फोन'],
  },
  'mai': {
    payment: ['से', 'पेलहुँ', 'पइलहुँ', 'लेलहुँ'],
    credit: ['क', 'देलहुँ', 'दिहलहुँ', 'देबहु'],
    add: ['जोडूं', 'बनवूं'],
    customer: ['ग्राहक', 'व्यक्ती'],
    number: ['नंबर', 'फोन'],
  },
  'sat': {
    payment: ['अड़े', 'पिसेंग', 'लिसेंग', 'घेसेंग'],
    credit: ['ले', 'दिसेंग', 'देसेंग', 'दिहा'],
    add: ['जोडूं', 'बनवूं'],
    customer: ['ग्राहक', 'व्यक्ती'],
    number: ['नंबर', 'फोन'],
  },
  bho: {
    payment: ['से', 'पइल', 'पाव', 'मिलल'],
    credit: ['के', 'दीहल', 'दे', 'दिहल'],
    add: ['जोड़ऽ', 'बनावा'],
    customer: ['ग्राहक', 'व्यक्ति'],
    number: ['नंबर', 'फोन'],
  },
  mrw: {
    payment: ['थां', 'मिल्यो', 'लियो', 'पायो'],
    credit: ['ने', 'दिनो', 'दियो', 'दीनी'],
    add: ['जोड़ो', 'बणावो'],
    customer: ['ग्राहक', 'व्यक्ति'],
    number: ['नंबर', 'फोन'],
  },
  sd: {
    payment: ['کان', 'مليو', 'کيم', 'پيو'],
    credit: ['کي', 'ڏنو', 'ڏيو', 'ڏيندو'],
    add: ['شامل', 'بڻايو'],
    customer: ['گراهڪ', 'شخص'],
    number: ['نمبر', 'فون'],
  },
};

// ========== NUMBER WORDS TO DIGITS MAPPING ==========
const NUMBER_WORDS = {
  'en': {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
    'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
    'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
    'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
    'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
    'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
    'hundred': 100, 'thousand': 1000, 'lakh': 100000, 'lac': 100000,
    'crore': 10000000, 'k': 1000,
  },
  'hi': {
    'शून्य': 0, 'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4,
    'पाँच': 5, 'पांच': 5, 'छह': 6, 'छ': 6, 'सात': 7, 'आठ': 8, 'नौ': 9,
    'दस': 10, 'ग्यारह': 11, 'बारह': 12, 'तेरह': 13, 'चौदह': 14,
    'पंद्रह': 15, 'पन्द्रह': 15, 'सोलह': 16, 'सत्रह': 17, 'अठारह': 18, 'उन्नीस': 19,
    'बीस': 20, 'तीस': 30, 'चालीस': 40, 'पचास': 50,
    'साठ': 60, 'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90,
    'सौ': 100, 'हजार': 1000, 'लाख': 100000, 'करोड़': 10000000,
  },
  'mr': {
    'शून्य': 0, 'एक': 1, 'दोन': 2, 'तीन': 3, 'चार': 4,
    'पाच': 5, 'सहा': 6, 'सात': 7, 'आठ': 8, 'नऊ': 9,
    'दहा': 10, 'अकरा': 11, 'बारा': 12, 'तेरा': 13, 'चौदा': 14,
    'पंधरा': 15, 'सोळा': 16, 'सतरा': 17, 'अठरा': 18, 'एकोणीस': 19,
    'वीस': 20, 'तीस': 30, 'चाळीस': 40, 'पन्नास': 50,
    'साठ': 60, 'सत्तर': 70, 'ऐंशी': 80, 'नव्वद': 90,
    'शंभर': 100, 'हजार': 1000, 'लाख': 100000, 'कोटी': 10000000,
  },
  'gu': {
    'શૂન્ય': 0, 'એક': 1, 'બે': 2, 'ત્રણ': 3, 'ચાર': 4,
    'પાંચ': 5, 'છ': 6, 'સાત': 7, 'આઠ': 8, 'નવ': 9,
    'દસ': 10, 'અગિયાર': 11, 'બાર': 12, 'તેર': 13, 'ચૌદ': 14,
    'પંદર': 15, 'સોળ': 16, 'સત્તર': 17, 'અઢાર': 18, 'ઓગણીસ': 19,
    'વીસ': 20, 'ત્રીસ': 30, 'ચાલીસ': 40, 'પચાસ': 50,
    'સાઠ': 60, 'સિત્તેર': 70, 'એંસી': 80, 'નેવું': 90,
    'સો': 100, 'હજાર': 1000, 'લાખ': 100000, 'કરોડ': 10000000,
  },
  'bn': {
    'শূন্য': 0, 'এক': 1, 'দুই': 2, 'তিন': 3, 'চার': 4,
    'পাঁচ': 5, 'ছয়': 6, 'সাত': 7, 'আট': 8, 'নয়': 9,
    'দশ': 10, 'এগারো': 11, 'বারো': 12, 'তেরো': 13, 'চৌদ্দ': 14,
    'পনেরো': 15, 'ষোলো': 16, 'সতেরো': 17, 'আঠারো': 18, 'উনিশ': 19,
    'বিশ': 20, 'ত্রিশ': 30, 'চল্লিশ': 40, 'পঞ্চাশ': 50,
    'ষাট': 60, 'সত্তর': 70, 'আশি': 80, 'নব্বই': 90,
    'শত': 100, 'হাজার': 1000, 'লাখ': 100000, 'কোটি': 10000000,
  },
};

// ========== HELPER: Convert Number Words to Digits ==========
function parseNumberWords(text, language = 'en') {
  const numberWords = NUMBER_WORDS[language] || NUMBER_WORDS['en'];
  const words = text.toLowerCase().split(/\s+/);
  
  let total = 0;
  let current = 0;
  let foundNumber = false;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    if (numberWords[word] !== undefined) {
      foundNumber = true;
      const value = numberWords[word];
      
      if (value >= 1000) {
        // Multiplier (thousand, lakh, crore)
        if (current === 0) current = 1;
        total += current * value;
        current = 0;
      } else if (value === 100) {
        // Hundred
        if (current === 0) current = 1;
        current *= value;
      } else {
        // Regular numbers
        current += value;
      }
    }
  }
  
  total += current;
  
  return foundNumber ? total : null;
}

// ========== HELPER: Extract Amount (Digits + Words) ==========
function extractAmount(text, language = 'en') {
  // First, try to find digits
  const normalized = text
    .replace(/०/g, '0').replace(/१/g, '1').replace(/२/g, '2')
    .replace(/३/g, '3').replace(/४/g, '4').replace(/५/g, '5')
    .replace(/६/g, '6').replace(/७/g, '7').replace(/८/g, '8')
    .replace(/९/g, '9');
  
  // Try to extract direct digits
  const digitMatch = normalized.match(/\d+/);
  if (digitMatch) {
    const amount = parseInt(digitMatch[0]);
    console.log('💰 Found digit amount:', amount);
    return amount;
  }
  
  // If no digits found, try parsing number words
  const amountFromWords = parseNumberWords(text, language);
  if (amountFromWords !== null && amountFromWords > 0) {
    console.log('💰 Found word amount:', amountFromWords);
    return amountFromWords;
  }
  
  console.log('💰 No amount found');
  return null;
}

// ========== HELPER FUNCTION: Capitalize Name Properly ==========
function capitalizeName(name) {
  if (!name || name.length === 0) return '';
  
  return name
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (word.length === 0) return '';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .filter(word => word.length > 0)
    .join(' ');
}

// ========== HELPER FUNCTION: Extract Phone Number (Handles Gaps & Variations) ==========
function extractPhoneNumber(text) {
  // Convert Devanagari numbers to Arabic numerals
  let normalized = text
    .replace(/०/g, '0').replace(/१/g, '1').replace(/२/g, '2')
    .replace(/३/g, '3').replace(/४/g, '4').replace(/५/g, '5')
    .replace(/६/g, '6').replace(/७/g, '7').replace(/८/g, '8')
    .replace(/९/g, '9');
  
  // Extract all digit sequences
  const digitSequences = normalized.match(/\d+/g) || [];
  
  if (digitSequences.length > 0) {
    const allDigits = digitSequences.join('');
    
    // Validate: should be 10 digits (Indian phone number)
    if (allDigits.length === 10) {
      return allDigits;
    }
    
    // If more than 10, take the last 10 digits
    if (allDigits.length > 10) {
      return allDigits.slice(-10);
    }
  }
  
  return null;
}

// ========== HELPER FUNCTION: Extract Customer Name ==========
function extractCustomerName(text, keywords, language = 'en') {
  let namePart = text.toLowerCase();
  
  // Remove "add" keywords
  keywords.add.forEach(kw => {
    namePart = namePart.replace(new RegExp(kw, 'gi'), '');
  });
  
  // Remove "customer" keywords
  keywords.customer.forEach(kw => {
    namePart = namePart.replace(new RegExp(kw, 'gi'), '');
  });
  
  // Remove "number" keywords
  keywords.number.forEach(kw => {
    namePart = namePart.replace(new RegExp(kw, 'gi'), '');
  });
  
  // Remove transaction keywords
  keywords.payment.forEach(kw => {
    namePart = namePart.replace(new RegExp(kw, 'gi'), '');
  });
  
  keywords.credit.forEach(kw => {
    namePart = namePart.replace(new RegExp(kw, 'gi'), '');
  });
  
  // Remove number words (to avoid "five" being part of name)
  const numberWords = NUMBER_WORDS[language] || NUMBER_WORDS['en'];
  Object.keys(numberWords).forEach(word => {
    namePart = namePart.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
  });
  
  // Remove all digits
  namePart = namePart.replace(/\d+/g, '');
  
  // Remove special characters except spaces
  namePart = namePart.replace(/[^\w\s\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]/g, ' ');
  
  // Split and filter
  const nameWords = namePart
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 1); // Only words with 2+ characters
  
  if (nameWords.length > 0) {
    return nameWords.join(' ');
  }
  
  return null;
}

// ========== TRANSACTION PARSER ==========
export function parseVoiceCommand(spokenText, language = 'en') {
  const text = spokenText.toLowerCase().trim();
  
  console.log('🎤 Parsing transaction:', text);
  console.log('🌍 Language:', language);
  
  let transactionType = null;
  let amount = null;
  let customerName = null;

  // Detect transaction type
  const keywords = LANGUAGE_KEYWORDS[language] || LANGUAGE_KEYWORDS['en'];
  
  if (keywords.payment.some(keyword => text.includes(keyword))) {
    transactionType = 'PAYMENT';
    console.log('📥 Transaction type: PAYMENT');
  } else if (keywords.credit.some(keyword => text.includes(keyword))) {
    transactionType = 'CREDIT';
    console.log('📤 Transaction type: CREDIT');
  }

  // Extract amount using enhanced function
  amount = extractAmount(text, language);

  // Extract customer name
  let extractedName = extractCustomerName(text, keywords, language);
  if (extractedName) {
    customerName = capitalizeName(extractedName);
    console.log('👤 Extracted name:', customerName);
  }

  const success = !!(transactionType && amount && customerName);
  console.log('✅ Parse success:', success);

  return {
    transactionType,
    amount,
    customerName,
    success,
    originalText: spokenText,
  };
}

// ========== CUSTOMER PARSER (WITH GAP HANDLING & NAME CAPITALIZATION) ==========
export function parseCustomerVoiceCommand(spokenText, language = 'en') {
  const text = spokenText.toLowerCase().trim();
  
  console.log('🎤 Parsing customer:', text);
  
  let customerName = null;
  let phoneNumber = null;

  const keywords = LANGUAGE_KEYWORDS[language] || LANGUAGE_KEYWORDS['en'];
  
  // Extract phone number using helper function (handles gaps)
  phoneNumber = extractPhoneNumber(text);
  console.log('📱 Extracted phone:', phoneNumber);

  // Find "customer" keyword position
  let customerKeywordPos = -1;
  for (const kw of keywords.customer) {
    const pos = text.indexOf(kw);
    if (pos !== -1) {
      customerKeywordPos = pos + kw.length;
      break;
    }
  }

  // Find "number" keyword position
  let numberKeywordPos = -1;
  for (const kw of keywords.number) {
    const pos = text.indexOf(kw);
    if (pos !== -1) {
      numberKeywordPos = pos;
      break;
    }
  }

  // Extract name between "customer" and "number"
  if (customerKeywordPos !== -1) {
    let nameEndPos = numberKeywordPos !== -1 ? numberKeywordPos : text.length;
    
    let namePart = text
      .substring(customerKeywordPos, nameEndPos)
      .trim()
      .replace(/\d+/g, '')  // Remove all digits
      .replace(/[^\w\s\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]/g, ' ') // Keep Unicode chars
      .trim();
    
    const nameWords = namePart.split(/\s+/).filter(w => w.length > 1);
    if (nameWords.length > 0) {
      customerName = nameWords.join(' ');
      // ✅ CAPITALIZE NAME PROPERLY
      customerName = capitalizeName(customerName);
      console.log('👤 Extracted customer name:', customerName);
    }
  }

  const success = !!(customerName && phoneNumber && phoneNumber.length === 10);
  console.log('✅ Customer parse success:', success);

  return {
    customerName,
    phoneNumber,
    success,
    originalText: spokenText,
  };
}

// ========== BILINGUAL FALLBACK WRAPPERS ==========

export function parseVoiceCommandWithFallback(spokenText, language = 'en') {
  console.log('\n🔄 Starting transaction parse with fallback');
  let parsed = parseVoiceCommand(spokenText, language);
  
  if (!parsed.success && language !== 'en') {
    console.log(`⚠️ Parsing failed in ${language}, trying English fallback...`);
    parsed = parseVoiceCommand(spokenText, 'en');
  }
  
  console.log('🏁 Final parse result:', parsed);
  return parsed;
}

export function parseCustomerVoiceCommandWithFallback(spokenText, language = 'en') {
  console.log('\n🔄 Starting customer parse with fallback');
  let parsed = parseCustomerVoiceCommand(spokenText, language);
  
  if (!parsed.success && language !== 'en') {
    console.log(`⚠️ Customer parsing failed in ${language}, trying English fallback...`);
    parsed = parseCustomerVoiceCommand(spokenText, 'en');
  }
  
  console.log('🏁 Final customer parse result:', parsed);
  return parsed;
}
