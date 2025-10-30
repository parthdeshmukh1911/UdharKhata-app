// src/services/SQLiteService.js

import { Alert } from "react-native";
import DatabaseService from "./DatabaseService";

let SupabaseService = null;

const getSupabaseService = () => {
  if (!SupabaseService) {
    SupabaseService = require("./SupabaseService").default;
  }
  return SupabaseService;
};

const cache = new Map();
const CACHE_DURATION = 300000; // 5 minutes
const TRANSACTION_CACHE_DURATION = 120000; // 2 minutes
const SUMMARY_CACHE_DURATION = 180000; // 3 minutes

const SQLiteService = {
  // ---------------- CACHE MANAGEMENT ----------------
  clearCache: () => {
    cache.clear();
  },

  clearRelatedCache: (action) => {
    const invalidationMap = {
      addCustomer: ["customers"],
      updateCustomer: ["customers"],
      addTransaction: ["customers", "transactions", "summary"],
      updateTransaction: ["customers", "transactions", "summary"],
      deleteTransaction: ["customers", "transactions", "summary"],
      bulkReplaceExcel: ["customers", "transactions", "summary"],
    };

    const keysToInvalidate = invalidationMap[action] || [];
    keysToInvalidate.forEach((keyPrefix) => {
      for (const cacheKey of cache.keys()) {
        if (cacheKey.startsWith(keyPrefix)) {
          cache.delete(cacheKey);
        }
      }
    });
  },

  // ---------------- GET REQUESTS ----------------
  getCustomers: async () => {
    try {
      const cacheKey = "customers";
      const cached = cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }

      const data = await DatabaseService.getCustomers();
      cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error("getCustomers Error:", error);
      Alert.alert("Error", "Failed to fetch customers");
      return [];
    }
  },

  getTransactions: async (params = {}) => {
    try {
      const cacheKey = `transactions_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);

      if (
        cached &&
        Date.now() - cached.timestamp < TRANSACTION_CACHE_DURATION
      ) {
        return cached.data;
      }

      const data = await DatabaseService.getTransactions(params);
      cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error("getTransactions Error:", error);
      Alert.alert("Error", "Failed to fetch transactions");
      return [];
    }
  },

  getSummary: async () => {
    try {
      const cacheKey = "summary";
      const cached = cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < SUMMARY_CACHE_DURATION) {
        return cached.data;
      }

      const data = await DatabaseService.getSummary();
      cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error("getSummary Error:", error);
      Alert.alert("Error", "Failed to fetch summary");
      return [];
    }
  },

  getTransactionById: async (transactionId) => {
    try {
      const data = await DatabaseService.getTransactionById(transactionId);
      return data;
    } catch (error) {
      console.error("getTransactionById Error:", error);
      Alert.alert("Error", "Failed to fetch transaction");
      return null;
    }
  },

  getLastSyncTime: async () => {
    try {
      return await DatabaseService.getLastSyncTime();
    } catch (error) {
      console.error("getLastSyncTime Error:", error);
      return null;
    }
  },

  setLastSyncTime: async (timestamp) => {
    try {
      await DatabaseService.setLastSyncTime(timestamp);
    } catch (error) {
      console.error("setLastSyncTime Error:", error);
    }
  },

  // ---------------- POST / UPDATE REQUESTS WITH AUTO-SYNC ----------------

  addCustomer: async (data) => {
    try {
      const result = await DatabaseService.addCustomer(data);
      if (result.status === "success") {
        SQLiteService.clearRelatedCache("addCustomer");

        // ✅ AUTO-SYNC: Check online first
        try {
          const supabaseService = getSupabaseService();
          const isOnline = await supabaseService.checkOnlineStatus();

          if (isOnline) {
            console.log("🔄 Auto-syncing after adding customer...");
            supabaseService.autoSync().catch((err) => {
              // Silently handle network errors
              if (
                !err.message?.includes("network") &&
                !err.message?.includes("fetch")
              ) {
                console.log("Sync error:", err.message);
              }
            });
          }
        } catch (syncError) {
          // Silently handle - expected in offline mode
        }
      }
      return result;
    } catch (error) {
      console.error("addCustomer Error:", error);
      Alert.alert("Error", "Failed to add customer");
      return { status: "error" };
    }
  },

  addCustomerWithId: async (data) => {
    try {
      const result = await DatabaseService.addCustomerWithId(data);
      if (result.status === "success") {
        SQLiteService.clearRelatedCache("addCustomer");
      }
      return result;
    } catch (error) {
      console.error("addCustomerWithId Error:", error);
      return { status: "error", message: error.message };
    }
  },

  updateCustomer: async (data) => {
    try {
      const result = await DatabaseService.updateCustomer(data);
      if (result.status === "success") {
        SQLiteService.clearRelatedCache("updateCustomer");

        // ✅ AUTO-SYNC: Check online first
        try {
          const supabaseService = getSupabaseService();
          const isOnline = await supabaseService.checkOnlineStatus();

          if (isOnline) {
            console.log("🔄 Auto-syncing after updating customer...");
            supabaseService.autoSync().catch((err) => {
              if (
                !err.message?.includes("network") &&
                !err.message?.includes("fetch")
              ) {
                console.log("Sync error:", err.message);
              }
            });
          }
        } catch (syncError) {
          // Silently handle
        }
      }
      return result;
    } catch (error) {
      console.error("updateCustomer Error:", error);
      Alert.alert("Error", "Failed to update customer");
      return { status: "error" };
    }
  },

  addTransaction: async (data) => {
    try {
      const result = await DatabaseService.addTransaction(data);
      if (result.status === "success") {
        SQLiteService.clearRelatedCache("addTransaction");

        // ✅ AUTO-SYNC: Check online first
        try {
          const supabaseService = getSupabaseService();
          const isOnline = await supabaseService.checkOnlineStatus();

          if (isOnline) {
            console.log("🔄 Auto-syncing after adding transaction...");
            supabaseService.autoSync().catch((err) => {
              // Silently handle network errors
              if (
                !err.message?.includes("network") &&
                !err.message?.includes("fetch")
              ) {
                console.log("Sync error:", err.message);
              }
            });
          }
        } catch (syncError) {
          // Silently handle - expected in offline mode
        }
      }
      return result;
    } catch (error) {
      console.error("addTransaction Error:", error);
      Alert.alert("Error", "Failed to add transaction");
      return { status: "error" };
    }
  },

  updateTransaction: async (data) => {
    try {
      const result = await DatabaseService.updateTransaction(data);
      if (result.status === "success") {
        SQLiteService.clearRelatedCache("updateTransaction");

        // ✅ AUTO-SYNC: Check online first
        try {
          const supabaseService = getSupabaseService();
          const isOnline = await supabaseService.checkOnlineStatus();

          if (isOnline) {
            console.log("🔄 Auto-syncing after updating transaction...");
            supabaseService.autoSync().catch((err) => {
              if (
                !err.message?.includes("network") &&
                !err.message?.includes("fetch")
              ) {
                console.log("Sync error:", err.message);
              }
            });
          }
        } catch (syncError) {
          // Silently handle
        }
      }
      return result;
    } catch (error) {
      console.error("updateTransaction Error:", error);
      Alert.alert("Error", "Failed to update transaction");
      return { status: "error" };
    }
  },

  deleteCustomer: async (customerId) => {
    try {
      // Call DatabaseService to delete from SQLite
      const result = await DatabaseService.deleteCustomer(customerId);

      if (result.status === "success") {
        // Clear related cache
        SQLiteService.clearRelatedCache("deleteTransaction"); // Transactions deleted
        SQLiteService.clearRelatedCache("addCustomer"); // Customer deleted

        // ✅ TRIGGER AUTO-SYNC (the missing piece!)
        try {
          const supabaseService = getSupabaseService();
          const isOnline = await supabaseService.checkOnlineStatus();

          if (isOnline) {
            console.log("🔄 Auto-syncing after deleting customer...");

            // Add to sync queue
            await supabaseService.addToSyncQueue("DELETE_CUSTOMER", {
              customerId: customerId,
            });
          }
        } catch (syncError) {
          console.log("Sync error (offline mode?):", syncError.message);
        }
      }

      return result;
    } catch (error) {
      console.error("deleteCustomer Error:", error);
      Alert.alert("Error", "Failed to delete customer");
      return { status: "error" };
    }
  },

  deleteTransaction: async (transactionId) => {
    try {
      const result = await DatabaseService.deleteTransaction(transactionId);
      if (result.status === "success") {
        SQLiteService.clearRelatedCache("deleteTransaction");

        // ✅ AUTO-SYNC: Check online first
        try {
          const supabaseService = getSupabaseService();
          const isOnline = await supabaseService.checkOnlineStatus();

          if (isOnline) {
            console.log("🔄 Auto-syncing after deleting transaction...");
            supabaseService.autoSync().catch((err) => {
              if (
                !err.message?.includes("network") &&
                !err.message?.includes("fetch")
              ) {
                console.log("Sync error:", err.message);
              }
            });
          }
        } catch (syncError) {
          // Silently handle
        }
      }
      return result;
    } catch (error) {
      console.error("deleteTransaction Error:", error);
      Alert.alert("Error", "Failed to delete transaction");
      return { status: "error" };
    }
  },

  // ---------------- BULK REPLACE FOR IMPORT ----------------
  replaceAllCustomers: async (customers) => {
    try {
      await DatabaseService.deleteAllCustomers();
      for (const customer of customers) {
        await DatabaseService.addCustomer(customer);
      }
      SQLiteService.clearRelatedCache("addCustomer");
      return { status: "success" };
    } catch (error) {
      console.error("replaceAllCustomers Error:", error);
      Alert.alert("Error", "Failed to replace customers");
      return { status: "error" };
    }
  },

  replaceAllTransactions: async (transactions) => {
    try {
      await DatabaseService.deleteAllTransactions();
      for (const transaction of transactions) {
        await DatabaseService.addTransaction(transaction);
      }
      SQLiteService.clearRelatedCache("addTransaction");
      return { status: "success" };
    } catch (error) {
      console.error("replaceAllTransactions Error:", error);
      Alert.alert("Error", "Failed to replace transactions");
      return { status: "error" };
    }
  },

  bulkReplaceExcel: async (customers, transactions) => {
    try {
      const result = await DatabaseService.bulkReplace(customers, transactions);
      if (result.status === "success") {
        SQLiteService.clearRelatedCache("bulkReplaceExcel");

        // ✅ AUTO-SYNC: Trigger full sync after bulk restore
        try {
          const supabaseService = getSupabaseService();
          const isOnline = await supabaseService.checkOnlineStatus();

          if (isOnline) {
            console.log("🔄 Auto-syncing after bulk restore...");
            supabaseService.autoSync().catch((err) => {
              console.log("Background sync error:", err.message);
            });
          }
        } catch (syncError) {
          console.log("Sync error (offline mode?):", syncError.message);
        }
      }
      return result;
    } catch (error) {
      console.error("bulkReplaceExcel Error:", error);
      Alert.alert("Error", "Failed to restore data");
      return { status: "error", message: error.message };
    }
  },
};

export default SQLiteService;
