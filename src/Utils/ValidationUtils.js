// Validation utilities for the app

export const ValidationUtils = {
  // Check for duplicate phone numbers
  checkDuplicatePhone: (customers, phone, excludeCustomerId = null) => {
    if (!phone) return false;
    
    const normalizedPhone = ValidationUtils.normalizePhone(phone);
    
    return customers.some(customer => {
      const customerPhone = ValidationUtils.normalizePhone(
        String(customer.phone || customer["Phone Number"] || "")
      );
      const customerId = customer.id || customer["Customer ID"];
      return customerPhone === normalizedPhone && customerId !== excludeCustomerId;
    });
  },

  // Check for duplicate names (case-insensitive)
  checkDuplicateName: (customers, name, excludeCustomerId = null) => {
    if (!name || !name.trim()) return false;
    
    return customers.some(customer => {
      const customerName = (customer.name || customer["Customer Name"] || "").toLowerCase().trim();
      const customerId = customer.id || customer["Customer ID"];
      return customerName === name.toLowerCase().trim() && customerId !== excludeCustomerId;
    });
  },

  // ✅ NEW: Validate Indian phone number
  isValidIndianPhone: (phone) => {
    if (!phone || phone.length !== 10) return false;
    
    // Must start with 6, 7, 8, or 9
    const firstDigit = phone[0];
    if (!['6', '7', '8', '9'].includes(firstDigit)) return false;
    
    // Cannot be all same digits (e.g., 1111111111)
    if (/^(\d)\1{9}$/.test(phone)) return false;
    
    // Cannot be sequential (e.g., 1234567890)
    const isSequential = phone.split('').every((digit, index) => {
      if (index === 0) return true;
      return parseInt(digit) === parseInt(phone[index - 1]) + 1;
    });
    if (isSequential) return false;
    
    return true;
  },

  // ✅ ENHANCED: Comprehensive phone validation with detailed error
  validatePhone: (phone) => {
    if (!phone) {
      return { isValid: false, message: "Phone number is required" };
    }

    const cleaned = ValidationUtils.normalizePhone(phone);

    if (cleaned.length < 10) {
      return { isValid: false, message: "Phone number must be 10 digits" };
    }

    if (cleaned.length > 10) {
      return { isValid: false, message: "Phone number cannot exceed 10 digits" };
    }

    if (!ValidationUtils.isValidIndianPhone(cleaned)) {
      const firstDigit = cleaned[0];
      if (!['6', '7', '8', '9'].includes(firstDigit)) {
        return { isValid: false, message: "Phone must start with 6, 7, 8, or 9" };
      }
      if (/^(\d)\1{9}$/.test(cleaned)) {
        return { isValid: false, message: "Invalid pattern (all same digits)" };
      }
      return { isValid: false, message: "Invalid phone number format" };
    }

    return { isValid: true };
  },

  // ✅ ENHANCED: Validate name with better checks
  validateName: (name) => {
    if (!name || !name.trim()) {
      return { isValid: false, message: "Name is required" };
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      return { isValid: false, message: "Name must be at least 2 characters" };
    }

    if (trimmedName.length > 50) {
      return { isValid: false, message: "Name cannot exceed 50 characters" };
    }

    // Check if name contains at least one letter
    if (!/[a-zA-Z]/.test(trimmedName)) {
      return { isValid: false, message: "Name must contain at least one letter" };
    }

    return { isValid: true };
  },

  // Validate date range
  validateDateRange: (date) => {
    const today = new Date();
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(today.getFullYear() - 5);
    
    // Reset time to compare only dates
    today.setHours(23, 59, 59, 999);
    const selectedDate = new Date(date);
    
    if (isNaN(selectedDate.getTime())) {
      return { isValid: false, message: "Invalid date" };
    }
    
    if (selectedDate > today) {
      return { isValid: false, message: "Future dates are not allowed" };
    }
    
    if (selectedDate < fiveYearsAgo) {
      return { isValid: false, message: "Dates older than 5 years are not allowed" };
    }
    
    return { isValid: true };
  },

  // ✅ ENHANCED: Validate amount for transactions
  validateAmount: (amount) => {
    if (!amount && amount !== 0) {
      return { isValid: false, message: "Amount is required" };
    }

    const numAmount = Number(amount);

    if (isNaN(numAmount)) {
      return { isValid: false, message: "Amount must be a number" };
    }

    if (numAmount <= 0) {
      return { isValid: false, message: "Amount must be greater than zero" };
    }

    if (numAmount > 10000000) { // 1 crore limit
      return { isValid: false, message: "Amount cannot exceed ₹1,00,00,000" };
    }

    // Check for more than 2 decimal places
    if ((numAmount.toString().split('.')[1] || '').length > 2) {
      return { isValid: false, message: "Amount cannot have more than 2 decimal places" };
    }

    return { isValid: true, amount: numAmount };
  },

  // Normalize phone number (remove spaces, dashes, etc.)
  normalizePhone: (phone) => {
    if (!phone) return '';
    return phone.replace(/\D/g, ''); // Remove all non-digits
  },

  // ✅ NEW: Format phone number for display
  formatPhone: (phone) => {
    const cleaned = ValidationUtils.normalizePhone(phone);
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    return cleaned;
  }
};
