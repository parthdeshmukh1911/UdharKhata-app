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
  // ✅ FIXED: Check customer limit - only count customers with active balance
  checkCustomerLimit: async () => {
    try {
      const supabaseService = getSupabaseService();
      const user = await supabaseService.getCurrentUser();

      // Get all customers from database
      const allCustomers = await DatabaseService.getCustomers();
      
      // ✅ FIXED: Use correct field name "Total Balance" (with spaces) + defensive checks
      const activeCustomers = allCustomers.filter(c => {
        const balance = c["Total Balance"];
        if (balance == null) return false;
        if (balance === 0 || balance === "0") return false;
        if (isNaN(Number(balance))) return false;
        return Number(balance) > 0;
      });
      
      const settledCustomers = allCustomers.filter(c => {
        const balance = c["Total Balance"];
        return balance == null || balance === 0 || balance === "0" || Number(balance) === 0;
      });

      if (!user) {
        // Not logged in = free tier
        return {
          canAdd: activeCustomers.length < 50,
          remaining: Math.max(0, 50 - activeCustomers.length),
          activeCount: activeCustomers.length,
          settledCount: settledCustomers.length,
          totalCount: allCustomers.length,
          planType: "free",
        };
      }

      const subscription = await supabaseService.getSubscription(user.id);

      // ✅ FIXED: Check for annual and monthly plans too
      if (["premium", "annual", "monthly"].includes(subscription?.plan_type)) {
        return {
          canAdd: true,
          remaining: Infinity,
          activeCount: activeCustomers.length,
          settledCount: settledCustomers.length,
          totalCount: allCustomers.length,
          planType: subscription.plan_type,
        };
      }

      // Free tier: 50 active customers max
      return {
        canAdd: activeCustomers.length < 50,
        remaining: Math.max(0, 50 - activeCustomers.length),
        activeCount: activeCustomers.length,
        settledCount: settledCustomers.length,
        totalCount: allCustomers.length,
        planType: "free",
      };
    } catch (error) {
      console.error("checkCustomerLimit Error:", error);
      // Default to free tier on error
      return {
        canAdd: true,
        remaining: 50,
        activeCount: 0,
        settledCount: 0,
        totalCount: 0,
        planType: "free",
      };
    }
  },

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

  getLocalDataCounts: async () => {
    try {
      const customers = await DatabaseService.db.getFirstAsync(
        "SELECT COUNT(*) as count FROM customers"
      );
      const transactions = await DatabaseService.db.getFirstAsync(
        "SELECT COUNT(*) as count FROM transactions"
      );
      return {
        customers: customers?.count || 0,
        transactions: transactions?.count || 0,
      };
    } catch (error) {
      console.error("getLocalDataCounts Error:", error);
      return { customers: 0, transactions: 0 };
    }
  },

  // 🔄 OFFLINE RECOVERY SYNC: Helper methods
  markAsSynced: async (entityType, entityId) => {
    try {
      const AuditConfig = require('../config/AuditConfig').default;
      if (!AuditConfig.ENABLE_OFFLINE_RECOVERY_SYNC) return;

      const table = entityType === 'customer' ? 'customers' : 'transactions';
      const idColumn = entityType === 'customer' ? 'customer_id' : 'transaction_id';
      
      await DatabaseService.db.runAsync(
        `UPDATE ${table} SET synced_to_cloud = 1 WHERE ${idColumn} = ?`,
        [entityId]
      );
    } catch (error) {
      // Silently fail if column doesn't exist (rollback scenario)
      if (!error.message?.includes('no such column')) {
        console.error("markAsSynced Error:", error);
      }
    }
  },

  getUnsyncedCount: async () => {
    try {
      const AuditConfig = require('../config/AuditConfig').default;
      if (!AuditConfig.ENABLE_OFFLINE_RECOVERY_SYNC) {
        return { customers: 0, transactions: 0, total: 0 };
      }

      const customers = await DatabaseService.db.getFirstAsync(
        "SELECT COUNT(*) as count FROM customers WHERE synced_to_cloud = 0"
      );
      const transactions = await DatabaseService.db.getFirstAsync(
        "SELECT COUNT(*) as count FROM transactions WHERE synced_to_cloud = 0"
      );
      return {
        customers: customers?.count || 0,
        transactions: transactions?.count || 0,
        total: (customers?.count || 0) + (transactions?.count || 0)
      };
    } catch (error) {
      // Silently fail if column doesn't exist (rollback scenario)
      if (!error.message?.includes('no such column')) {
        console.error("getUnsyncedCount Error:", error);
      }
      return { customers: 0, transactions: 0, total: 0 };
    }
  },

  // ✅ FIXED: Get active customer count (non-zero balance only)
  getCustomerCount: async () => {
    try {
      const customers = await SQLiteService.getCustomers();
      const activeCustomers = customers.filter(c => {
        const balance = c["Total Balance"];
        if (balance == null) return false;
        if (balance === 0 || balance === "0") return false;
        if (isNaN(Number(balance))) return false;
        return Number(balance) > 0;
      });
      return activeCustomers?.length || 0;
    } catch (error) {
      console.error("getCustomerCount Error:", error);
      return 0;
    }
  },

  // ---------------- POST / UPDATE REQUESTS WITH AUTO-SYNC ----------------

  addCustomer: async (data) => {
    try {
      // ✅ FIXED: Check limit before adding
      const limitCheck = await SQLiteService.checkCustomerLimit();

      if (!limitCheck.canAdd) {
        return {
          status: "error",
          message: `Active customer limit reached (${limitCheck.activeCount}/50)\n\n💡 You have ${limitCheck.settledCount} settled customers (₹0 balance) which don't count toward your limit.\n\nTo add more customers, either:\n• Settle some active accounts to ₹0\n• Upgrade to Premium for unlimited active customers`,
          code: "LIMIT_REACHED",
        };
      }

      const result = await DatabaseService.addCustomer(data);
      if (result.status === "success") {
        SQLiteService.clearRelatedCache("addCustomer");

        // 🔄 Set synced_to_cloud = 0 initially
        try {
          const AuditConfig = require('../config/AuditConfig').default;
          if (AuditConfig.ENABLE_OFFLINE_RECOVERY_SYNC) {
            await DatabaseService.db.runAsync(
              "UPDATE customers SET synced_to_cloud = 0 WHERE customer_id = ?",
              [result.customerId]
            );
          }
        } catch (err) {
          // Silently fail if column doesn't exist
        }

        // ✅ QUICK SYNC: Instant sync for user action
        try {
          const supabaseService = getSupabaseService();
          const isOnline = await supabaseService.checkOnlineStatus();

          if (isOnline) {
            console.log("⚡ Quick syncing after adding customer...");
            const syncResult = await supabaseService.quickSync('customer', {
              customerId: result.customerId,
              displayId: result.displayId,
              customerName: data.customerName,
              phoneNumber: data.phoneNumber,
              address: data.address,
              totalBalance: 0,
            });
            
            // Mark as synced if successful
            if (syncResult.success) {
              await SQLiteService.markAsSynced('customer', result.customerId);
            }
          }
        } catch (syncError) {
          // Silently handle - expected in offline mode
        }
      }
      return result;
    } catch (error) {
      console.error("addCustomer Error:", error);
      Alert.alert("Error", "Failed to add customer");
      return { status: "error", message: error.message };
    }
  },

  addCustomerWithId: async (data) => {
    try {
      // ✅ FIXED: Check limit before adding
      const limitCheck = await SQLiteService.checkCustomerLimit();

      if (!limitCheck.canAdd) {
        return {
          status: "error",
          message: `Active customer limit reached (${limitCheck.activeCount}/50)`,
          code: "LIMIT_REACHED",
        };
      }

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

        // 🔄 Set synced_to_cloud = 0
        try {
          const AuditConfig = require('../config/AuditConfig').default;
          if (AuditConfig.ENABLE_OFFLINE_RECOVERY_SYNC) {
            await DatabaseService.db.runAsync(
              "UPDATE customers SET synced_to_cloud = 0 WHERE customer_id = ?",
              [data.customerId]
            );
          }
        } catch (err) {
          // Silently fail
        }

        // ✅ QUICK SYNC: Instant sync for user action
        try {
          const supabaseService = getSupabaseService();
          const isOnline = await supabaseService.checkOnlineStatus();

          if (isOnline) {
            console.log("⚡ Quick syncing after updating customer...");
            const customer = await DatabaseService.db.getFirstAsync(
              "SELECT * FROM customers WHERE customer_id = ?",
              [data.customerId]
            );
            if (customer) {
              const syncResult = await supabaseService.quickSync('customer', {
                customerId: customer.customer_id,
                displayId: customer.display_id,
                customerName: customer.customer_name,
                phoneNumber: customer.phone_number,
                address: customer.address,
                totalBalance: customer.total_balance,
              });
              
              if (syncResult.success) {
                await SQLiteService.markAsSynced('customer', data.customerId);
              }
            }
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

  // ✅ NEW: Check if transaction would activate a settled customer
  addTransaction: async (data) => {
    try {
      // ✅ STEP 1: Get customer's current balance
      const allCustomers = await SQLiteService.getCustomers();
      const customer = allCustomers.find(c => c["Customer ID"] === data.customerId);
      
      if (!customer) {
        return {
          status: "error",
          message: "Customer not found",
        };
      }

      const currentBalance = customer["Total Balance"] || 0;
      
      // ✅ STEP 2: Calculate new balance after this transaction
      const transactionAmount = Number(data.amount) || 0;
      const transactionType = data.type; // "CREDIT" or "PAYMENT"
      
      const newBalance = transactionType === "CREDIT" 
        ? Number(currentBalance) + transactionAmount 
        : Number(currentBalance) - transactionAmount;

      // ✅ STEP 3: Check if this would activate a settled customer
      const isCurrentlySettled = currentBalance === 0 || currentBalance === "0" || Number(currentBalance) === 0;
      const willBeActive = newBalance !== 0;
      const isActivatingCustomer = isCurrentlySettled && willBeActive;

      // ✅ STEP 4: If activating, check limit
      if (isActivatingCustomer) {
        const limitCheck = await SQLiteService.checkCustomerLimit();
        
        if (!limitCheck.canAdd) {
          return {
            status: "error",
            message: `Cannot add transaction\n\nCustomer "${customer["Customer Name"]}" currently has ₹0 balance. Adding this ${transactionType.toLowerCase()} would create your ${limitCheck.activeCount + 1}${limitCheck.activeCount === 50 ? 'st' : 'th'} active customer.\n\n💡 Free tier: 50 active customers max\nYou have ${limitCheck.settledCount} settled customers\n\nOptions:\n• Settle another customer to ₹0 first\n• Add a different transaction type\n• Upgrade to Premium for unlimited`,
            code: "LIMIT_REACHED",
          };
        }
      }

      // ✅ STEP 5: Proceed with transaction if allowed
      const result = await DatabaseService.addTransaction(data);
      if (result.status === "success") {
        SQLiteService.clearRelatedCache("addTransaction");

        // 🔄 Set synced_to_cloud = 0
        try {
          const AuditConfig = require('../config/AuditConfig').default;
          if (AuditConfig.ENABLE_OFFLINE_RECOVERY_SYNC) {
            await DatabaseService.db.runAsync(
              "UPDATE transactions SET synced_to_cloud = 0 WHERE transaction_id = ?",
              [result.transactionId]
            );
          }
        } catch (err) {
          // Silently fail
        }

        // ✅ QUICK SYNC: Instant sync for user action
        try {
          const supabaseService = getSupabaseService();
          const isOnline = await supabaseService.checkOnlineStatus();

          if (isOnline) {
            console.log("⚡ Quick syncing after adding transaction...");
            const txn = await DatabaseService.db.getFirstAsync(
              "SELECT * FROM transactions WHERE transaction_id = ?",
              [result.transactionId]
            );
            if (txn) {
              const syncResult = await supabaseService.quickSync('transaction', {
                transactionId: txn.transaction_id,
                displayId: txn.display_id,
                customerId: txn.customer_id,
                date: txn.date,
                type: txn.type,
                amount: txn.amount,
                note: txn.note,
                photo: txn.photo,
                balanceAfterTxn: txn.balance_after_txn,
              });
              
              if (syncResult.success) {
                await SQLiteService.markAsSynced('transaction', result.transactionId);
              }
            }
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

        // 🔄 Set synced_to_cloud = 0
        try {
          const AuditConfig = require('../config/AuditConfig').default;
          if (AuditConfig.ENABLE_OFFLINE_RECOVERY_SYNC) {
            await DatabaseService.db.runAsync(
              "UPDATE transactions SET synced_to_cloud = 0 WHERE transaction_id = ?",
              [data.transactionId]
            );
          }
        } catch (err) {
          // Silently fail
        }

        // ✅ QUICK SYNC: Instant sync for user action
        try {
          const supabaseService = getSupabaseService();
          const isOnline = await supabaseService.checkOnlineStatus();

          if (isOnline) {
            console.log("⚡ Quick syncing after updating transaction...");
            const txn = await DatabaseService.db.getFirstAsync(
              "SELECT * FROM transactions WHERE transaction_id = ?",
              [data.transactionId]
            );
            if (txn) {
              const syncResult = await supabaseService.quickSync('transaction', {
                transactionId: txn.transaction_id,
                displayId: txn.display_id,
                customerId: txn.customer_id,
                date: txn.date,
                type: txn.type,
                amount: txn.amount,
                note: txn.note,
                photo: txn.photo,
                balanceAfterTxn: txn.balance_after_txn,
              });
              
              if (syncResult.success) {
                await SQLiteService.markAsSynced('transaction', data.transactionId);
              }
            }
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

        // ✅ TRIGGER AUTO-SYNC
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
      // Get transaction details before deletion for sync
      const txn = await DatabaseService.db.getFirstAsync(
        "SELECT * FROM transactions WHERE transaction_id = ?",
        [transactionId]
      );

      const result = await DatabaseService.deleteTransaction(transactionId);
      if (result.status === "success") {
        SQLiteService.clearRelatedCache("deleteTransaction");

        // ✅ QUICK SYNC: Delete from cloud and sync updated customer balance
        try {
          const supabaseService = getSupabaseService();
          const isOnline = await supabaseService.checkOnlineStatus();

          if (isOnline && txn) {
            console.log("⚡ Quick syncing after deleting transaction...");
            
            // Delete from cloud
            const deleteResult = await supabaseService.deleteSingleTransaction(transactionId);
            if (!deleteResult.success) {
              console.log("Cloud delete failed, will retry on next sync:", deleteResult.error);
            }

            // Sync updated customer balance
            const customer = await DatabaseService.db.getFirstAsync(
              "SELECT * FROM customers WHERE customer_id = ?",
              [txn.customer_id]
            );
            if (customer) {
              supabaseService.quickSync('customer', {
                customerId: customer.customer_id,
                displayId: customer.display_id,
                customerName: customer.customer_name,
                phoneNumber: customer.phone_number,
                address: customer.address,
                totalBalance: customer.total_balance,
              }).catch((err) => {
                if (!err.message?.includes("network") && !err.message?.includes("fetch")) {
                  console.log("Quick sync error:", err.message);
                }
              });
            }
          }
        } catch (syncError) {
          // Silently handle - expected in offline mode
          console.log("Sync after delete error:", syncError.message);
        }
      }
      return result;
    } catch (error) {
      console.error("deleteTransaction Error:", error);
      Alert.alert("Error", "Failed to delete transaction");
      return { status: "error" };
    }
  },

  // ✅ FIXED: Import Excel with active customer limit check
  bulkReplaceExcel: async (customers, transactions) => {
    try {
      // Count how many imported customers have non-zero balance
      const activeImportedCustomers = customers.filter(c => {
        const balance = c.totalBalance;
        if (balance == null) return false;
        if (balance === 0 || balance === "0") return false;
        if (isNaN(Number(balance))) return false;
        return Number(balance) > 0;
      });
      
      if (activeImportedCustomers.length > 50) {
        return {
          status: "error",
          message: `Import contains ${activeImportedCustomers.length} customers with active balance. Free tier allows max 50 active customers.\n\n💡 Total customers: ${customers.length} (${customers.length - activeImportedCustomers.length} settled)\n\nPlease reduce active customers or upgrade to Premium.`,
          code: "LIMIT_EXCEEDED",
        };
      }

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

  // ✅ FIXED: Bulk replace customers with active limit check
  replaceAllCustomers: async (customers) => {
    try {
      const activeCustomers = customers.filter(c => {
        const balance = c.totalBalance;
        if (balance == null) return false;
        if (balance === 0 || balance === "0") return false;
        if (isNaN(Number(balance))) return false;
        return Number(balance) > 0;
      });
      
      if (activeCustomers.length > 50) {
        return {
          status: "error",
          message: `Contains ${activeCustomers.length} active customers. Max 50 allowed on Free tier.`,
          code: "LIMIT_EXCEEDED",
        };
      }

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

async getMonthlyCreditAndPayments(year) {
  try {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const params = { startDate, endDate };
    const transactions = await this.getTransactions(params);

    const creditByMonth = Array(12).fill(0);
    const paymentByMonth = Array(12).fill(0);

    transactions.forEach(txn => {
      const date = new Date(txn.Date);  // property name "Date" per your DBService mapping
      const month = date.getMonth();
      if (txn.Type === "CREDIT") {
        creditByMonth[month] += Number(txn.Amount) || 0;
      } else if (txn.Type === "PAYMENT") {
        paymentByMonth[month] += Number(txn.Amount) || 0;
      }
    });

    return { creditByMonth, paymentByMonth };
  } catch (error) {
    console.error("getMonthlyCreditAndPayments Error:", error);
    return { creditByMonth: Array(12).fill(0), paymentByMonth: Array(12).fill(0) };
  }
},


};


export default SQLiteService;
