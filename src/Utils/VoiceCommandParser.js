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
    add: ['जोड़ें', 'बनवा', 'नवा'],
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
};

// ========== HELPER FUNCTION: Capitalize Name Properly ==========
function capitalizeName(name) {
  if (!name || name.length === 0) return '';
  
  // Split by space and capitalize each word
  return name
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Handle empty strings
      if (word.length === 0) return '';
      // Capitalize first letter, keep rest as is
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .filter(word => word.length > 0) // Remove empty strings
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
function extractCustomerName(text, keywords) {
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
  
  // Remove all digits
  namePart = namePart.replace(/\d+/g, '');
  
  // Remove special characters except spaces
  namePart = namePart.replace(/[^\w\s]/g, '');
  
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
  
  let transactionType = null;
  let amount = null;
  let customerName = null;

  // Detect transaction type
  const keywords = LANGUAGE_KEYWORDS[language] || LANGUAGE_KEYWORDS['en'];
  
  if (keywords.payment.some(keyword => text.includes(keyword))) {
    transactionType = 'PAYMENT';
  } else if (keywords.credit.some(keyword => text.includes(keyword))) {
    transactionType = 'CREDIT';
  }

  // Convert Devanagari numbers to Arabic numerals
  let normalized = text
    .replace(/०/g, '0').replace(/१/g, '1').replace(/२/g, '2')
    .replace(/३/g, '3').replace(/४/g, '4').replace(/५/g, '5')
    .replace(/६/g, '6').replace(/७/g, '7').replace(/८/g, '8')
    .replace(/९/g, '9');
  
  // Extract amount - get first number (removes gaps)
  const numberMatch = normalized.match(/\d+/);
  if (numberMatch) {
    amount = parseInt(numberMatch[0]);
  }

  // Extract customer name
  let extractedName = extractCustomerName(normalized, keywords);
  if (extractedName) {
    customerName = capitalizeName(extractedName);
  }

  const success = !!(transactionType && amount && customerName);

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
  
  let customerName = null;
  let phoneNumber = null;

  const keywords = LANGUAGE_KEYWORDS[language] || LANGUAGE_KEYWORDS['en'];
  
  // Extract phone number using helper function (handles gaps)
  phoneNumber = extractPhoneNumber(text);

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
      .replace(/[^\w\s]/g, '') // Remove special characters
      .trim();
    
    const nameWords = namePart.split(/\s+/).filter(w => w.length > 1);
    if (nameWords.length > 0) {
      customerName = nameWords.join(' ');
      // ✅ CAPITALIZE NAME PROPERLY
      customerName = capitalizeName(customerName);
    }
  }

  const success = !!(customerName && phoneNumber && phoneNumber.length === 10);

  return {
    customerName,
    phoneNumber,
    success,
    originalText: spokenText,
  };
}

// ========== BILINGUAL FALLBACK WRAPPERS ==========

export function parseVoiceCommandWithFallback(spokenText, language = 'en') {
  let parsed = parseVoiceCommand(spokenText, language);
  
  if (!parsed.success && language !== 'en') {
    console.log(`Parsing failed in ${language}, trying English fallback...`);
    parsed = parseVoiceCommand(spokenText, 'en');
  }
  
  return parsed;
}

export function parseCustomerVoiceCommandWithFallback(spokenText, language = 'en') {
  let parsed = parseCustomerVoiceCommand(spokenText, language);
  
  if (!parsed.success && language !== 'en') {
    console.log(`Customer parsing failed in ${language}, trying English fallback...`);
    parsed = parseCustomerVoiceCommand(spokenText, 'en');
  }
  
  return parsed;
}
