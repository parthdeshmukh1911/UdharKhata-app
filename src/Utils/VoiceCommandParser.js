// src/utils/VoiceCommandParser.js

export function parseVoiceCommand(spokenText, language = 'en-IN') {
  const text = spokenText.toLowerCase();
  
  let transactionType = null;
  let amount = null;
  let customerName = null;

  // ========== DETECT TYPE ==========
  
  // PAYMENT: from/से/कडून/received/मिले/मिळाले
  if (text.includes('from') || text.includes('received') || 
      text.includes('से') || text.includes('मिले') ||
      text.includes('कडून') || text.includes('मिळाले')) {
    transactionType = 'PAYMENT';
  }
  // CREDIT: to/give/को/दिए/ला/दिले
  else if (text.includes('to') || text.includes('give') ||
           text.includes('को') || text.includes('दिए') ||
           text.includes('ला') || text.includes('दिले')) {
    transactionType = 'CREDIT';
  }

  // ========== EXTRACT AMOUNT ==========
  
  // Convert Devanagari numbers
  let normalized = text
    .replace(/०/g, '0').replace(/१/g, '1').replace(/२/g, '2')
    .replace(/३/g, '3').replace(/४/g, '4').replace(/५/g, '5')
    .replace(/६/g, '6').replace(/७/g, '7').replace(/८/g, '8').replace(/९/g, '9');
  
  const numberMatch = normalized.match(/\d+/);
  if (numberMatch) {
    amount = parseInt(numberMatch[0]);
  }

  // ========== EXTRACT NAME ==========
  
  // Pattern 1: English - "Give 500 to John" or "Received 500 from John"
  let nameMatch = text.match(/(?:to|from)\s+([a-z]+)/i);
  if (nameMatch) {
    customerName = nameMatch[1];
  }
  
  // Pattern 2: Hindi - "जॉन को 500 दिए" or "जॉन से 500 मिले"
  if (!customerName) {
    nameMatch = text.match(/([^\s]+)\s+(?:को|से)/);
    if (nameMatch) {
      customerName = nameMatch[1];
    }
  }
  
  // Pattern 3: Marathi - "जॉन ला 500 दिले" or "जॉन कडून 500 मिळाले"
  if (!customerName) {
    nameMatch = text.match(/([^\s]+)\s+(?:ला|कडून)/);
    if (nameMatch) {
      customerName = nameMatch[1];
    }
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
