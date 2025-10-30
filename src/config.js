// src/config.js

const Config = {
  WEB_APP_URL:
    "https://script.google.com/macros/s/AKfycby0SNseOn6CWfg8BG9LGjNeQMoWpCZUXQJzS0CVFuSXIkAB6LC3uEl5sim5n9Y2wJg-jw/exec", // <-- Client's Google Apps Script URL

  // SQLite Configuration
  DATABASE: {
    name: "khatabook.db",
    version: "1.0",
    displayName: "KhataBook Offline Database",
    size: 200000,
  },

  // Sync Configuration
  SYNC: {
    autoSyncEnabled: true,
    autoSyncInterval: 24 * 60 * 60 * 1000, // 24 hours
    syncOnAppBackground: true,
    syncThreshold: 10, // Sync after 10 transactions
  },

  // UPI Configuration - DISABLED
  // Reason: Personal UPI ID causes payment declines due to bank security restrictions
  // Solution: Need business UPI account or payment gateway integration
  // TODO: Enable after getting proper merchant UPI ID
  UPI: {
    enabled: false, // Disabled due to personal UPI restrictions
    merchantUpiId: "parthdeshmukh19@ybl",
    merchantName: "UdharKhata",
    includeInSMS: true,
    includeInWhatsApp: true,
    onlyForCredit: true,
  },
};

export default Config;
