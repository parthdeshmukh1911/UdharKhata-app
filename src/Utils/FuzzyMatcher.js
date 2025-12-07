// src/Utils/FuzzyMatcher.js

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i-1] === str2[j-1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i-1][j] + 1,
        matrix[i][j-1] + 1,
        matrix[i-1][j-1] + cost
      );
    }
  }
  
  return matrix[len1][len2];
}

// Calculate similarity score (0-1)
export function similarityScore(str1, str2) {
  if (!str1 || !str2) return 0;
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLen = Math.max(str1.length, str2.length);
  return 1 - (distance / maxLen);
}

// Soundex algorithm for phonetic matching
function soundex(str) {
  if (!str) return '';
  str = str.toUpperCase().replace(/[^A-Z]/g, '');
  if (str.length === 0) return '';
  
  let code = str[0];
  const mapping = {
    'B': '1', 'F': '1', 'P': '1', 'V': '1',
    'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
    'D': '3', 'T': '3',
    'L': '4',
    'M': '5', 'N': '5',
    'R': '6'
  };
  
  for (let i = 1; i < str.length; i++) {
    const mapped = mapping[str[i]];
    if (mapped && code[code.length-1] !== mapped) {
      code += mapped;
    }
  }
  
  return (code + '0000').substring(0, 4);
}

// Check if two strings match phonetically
export function phoneticMatch(str1, str2) {
  if (!str1 || !str2) return false;
  return soundex(str1) === soundex(str2);
}

// Match partial names
export function matchPartialName(spokenName, fullName) {
  if (!spokenName || !fullName) return false;
  
  const spokenParts = spokenName.toLowerCase().split(/\s+/);
  const fullParts = fullName.toLowerCase().split(/\s+/);
  
  for (let spoken of spokenParts) {
    for (let full of fullParts) {
      if (full.startsWith(spoken) || similarityScore(spoken, full) > 0.8) {
        return true;
      }
    }
  }
  
  return false;
}

// Find best matching customer with scoring
export function findBestMatches(spokenName, customers, threshold = 0.6) {
  return customers
    .map(customer => {
      const name = customer['Customer Name'] || '';
      
      const exactMatch = name.toLowerCase() === spokenName.toLowerCase();
      const substringMatch = name.toLowerCase().includes(spokenName.toLowerCase());
      const fuzzyScore = similarityScore(name, spokenName);
      const phonetic = phoneticMatch(name, spokenName);
      const partial = matchPartialName(spokenName, name);
      
      let score = 0;
      if (exactMatch) score = 1.0;
      else if (substringMatch) score = 0.85;
      else if (phonetic) score = 0.75;
      else if (partial) score = 0.70;
      else score = fuzzyScore;
      
      return { customer, score };
    })
    .filter(item => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .map(item => item.customer);
}
