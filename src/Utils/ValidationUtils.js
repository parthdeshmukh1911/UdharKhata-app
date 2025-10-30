// Validation utilities for the app

export const ValidationUtils = {
  // Check for duplicate phone numbers
  checkDuplicatePhone: (customers, phone, excludeCustomerId = null) => {
    return customers.some(customer => {
      const customerPhone = String(customer.phone || customer["Phone Number"] || "");
      const customerId = customer.id || customer["Customer ID"];
      return customerPhone === phone && customerId !== excludeCustomerId;
    });
  },

  // Check for duplicate names (case-insensitive)
  checkDuplicateName: (customers, name, excludeCustomerId = null) => {
    return customers.some(customer => {
      const customerName = (customer.name || customer["Customer Name"] || "").toLowerCase().trim();
      const customerId = customer.id || customer["Customer ID"];
      return customerName === name.toLowerCase().trim() && customerId !== excludeCustomerId;
    });
  },

  // Validate date range
  validateDateRange: (date) => {
    const today = new Date();
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(today.getFullYear() - 5);
    
    // Reset time to compare only dates
    today.setHours(23, 59, 59, 999);
    const selectedDate = new Date(date);
    
    if (selectedDate > today) {
      return { isValid: false, message: "Future dates are not allowed" };
    }
    
    if (selectedDate < fiveYearsAgo) {
      return { isValid: false, message: "Dates older than 5 years are not allowed" };
    }
    
    return { isValid: true };
  },

  // Normalize phone number (remove spaces, dashes, etc.)
  normalizePhone: (phone) => {
    return phone.replace(/\D/g, ''); // Remove all non-digits
  }
};