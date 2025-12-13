// src/contexts/CustomerContext.js
import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Alert } from "react-native";
import SQLiteService from "../services/SQLiteService";
import SupabaseService from "../services/SupabaseService";
import * as NotificationService from '../services/PushNotificationService';

export const CustomerContext = createContext();

export const CustomerProvider = ({ children }) => {
  const [allCustomers, setAllCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  const loadSubscription = useCallback(async () => {
    try {
      setSubscriptionLoading(true);
      const user = await SupabaseService.getCurrentUser();

      if (user) {
        const sub = await SupabaseService.getSubscription(user.id);
        setSubscription(sub);
        console.log("CustomerContext: Subscription loaded:", sub?.plan_type);
      } else {
        setSubscription({ plan_type: "free" });
        console.log("CustomerContext: User not logged in, default to free tier");
      }
    } catch (error) {
      console.error("CustomerContext: Error loading subscription:", error);
      setSubscription({ plan_type: "free" });
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

  // ✅ Helper: Get active customer count
  const getActiveCustomerCount = useCallback(() => {
    return (allCustomers || []).filter((c) => {
      const balance = c["Total Balance"];
      
      if (balance == null) return false;
      if (balance === 0 || balance === "0") return false;
      if (isNaN(Number(balance))) return false;
      
      return Number(balance) > 0;
    }).length;
  }, [allCustomers]);

  const canAddMoreCustomers = useCallback(() => {
    if (["premium", "annual", "monthly"].includes(subscription?.plan_type)) {
      return true;
    }

    if (subscription?.plan_type === "free") {
      return getActiveCustomerCount() < 50;
    }

    return true;
  }, [subscription, getActiveCustomerCount]);

  const getRemainingCustomers = useCallback(() => {
    if (["premium", "annual", "monthly"].includes(subscription?.plan_type)) {
      return Infinity;
    }

    return Math.max(0, 50 - getActiveCustomerCount());
  }, [subscription, getActiveCustomerCount]);

  const checkCustomerLimitWarning = useCallback(() => {
    if (["premium", "annual", "monthly"].includes(subscription?.plan_type)) {
      return null;
    }

    const remaining = getRemainingCustomers();
    
    if (remaining <= 10 && remaining > 0) {
      return {
        type: "warning",
        message: `Only ${remaining} active customer slots left`,
      };
    }
    
    if (remaining === 0) {
      return {
        type: "error",
        message: "Active customer limit reached (50). Settle accounts or upgrade.",
      };
    }
    
    return null;
  }, [subscription, getRemainingCustomers]);

  // ✅ NEW: Check outstanding balances and send notifications
  const checkOutstandingBalances = useCallback(async () => {
    try {
      if (!allCustomers || allCustomers.length === 0) return;

      const now = new Date();

      // Get all transactions to calculate last transaction date per customer
      const transactions = await SQLiteService.getTransactions();

      allCustomers.forEach(customer => {
        const balance = Number(customer["Total Balance"]) || 0;

        // Check if customer has outstanding balance (negative balance means they owe money)
        if (balance < 0) {
          // Get last transaction date for this customer
          const customerTransactions = transactions.filter(
            t => t.customer_id === customer.id
          );

          if (customerTransactions.length === 0) return;

          // Sort by date descending and get the latest
          customerTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
          const lastTransactionDate = new Date(customerTransactions[0].date);

          // Calculate months difference
          const monthsDiff = Math.floor(
            (now - lastTransactionDate) / (1000 * 60 * 60 * 24 * 30)
          );

          // Send notification for balances older than 1 month
          if (monthsDiff >= 1) {
            NotificationService.scheduleOutstandingBalanceNotification(
              customer.name || 'Customer',
              monthsDiff,
              Math.abs(balance)
            );
          }
        }
      });

      console.log('✅ Outstanding balance check completed');
    } catch (error) {
      console.error('❌ Error checking outstanding balances:', error);
    }
  }, [allCustomers]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      SQLiteService.clearCache();
      const data = await SQLiteService.getCustomers();
      setAllCustomers(data);
    } catch (error) {
      console.error("Fetch customers error:", error);
    }
    setLoading(false);
  }, []);

  // ✅ UPDATED: Add customer with instant sync
const addCustomer = useCallback(
  async (customerData) => {
    try {
      console.log('🔍 DEBUG addCustomer:');
      console.log('  allCustomers.length:', allCustomers?.length || 0);
      console.log('  getActiveCustomerCount():', getActiveCustomerCount());
      console.log('  subscription?.plan_type:', subscription?.plan_type);
      console.log('  canAddMoreCustomers():', canAddMoreCustomers());
      console.log('  getRemainingCustomers():', getRemainingCustomers());
      
      if (!canAddMoreCustomers()) {
        console.log('❌ Limit check FAILED - throwing LIMIT_REACHED');
        throw new Error("LIMIT_REACHED");
      }

      console.log('✅ Limit check PASSED - proceeding with add');
      const result = await SQLiteService.addCustomer(customerData);

      if (result.status === "success") {
        await fetchCustomers();
        
        // ✅ NEW: Trigger sync to cloud after 2 seconds
        setTimeout(async () => {
          try {
            console.log("📤 Syncing new customer to cloud...");
            await SupabaseService.syncLocalToSupabaseOnly();
          } catch (syncError) {
            console.log("Sync error (non-blocking):", syncError.message);
          }
        }, 2000);
        
        return { success: true, data: result };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("CustomerContext: Error adding customer:", error);
      throw error;
    }
  },
  [canAddMoreCustomers, fetchCustomers, allCustomers, subscription, getActiveCustomerCount, getRemainingCustomers]
);

// ✅ UPDATED: Delete customer with instant sync
const deleteCustomer = useCallback(
  async (customerId) => {
    try {
      await SQLiteService.deleteCustomer(customerId);
      await fetchCustomers();
      
      // ✅ NEW: Trigger sync to cloud after 2 seconds
      setTimeout(async () => {
        try {
          console.log("📤 Syncing customer deletion to cloud...");
          await SupabaseService.syncLocalToSupabaseOnly();
        } catch (syncError) {
          console.log("Sync error (non-blocking):", syncError.message);
        }
      }, 2000);
    } catch (error) {
      console.error("CustomerContext: Error deleting customer:", error);
      throw error;
    }
  },
  [fetchCustomers]
);

// ✅ UPDATED: Update customer with instant sync
const updateCustomer = useCallback(
  async (customerId, updatedData) => {
    try {
      await SQLiteService.updateCustomer(customerId, updatedData);
      await fetchCustomers();
      
      // ✅ NEW: Trigger sync to cloud after 2 seconds
      setTimeout(async () => {
        try {
          console.log("📤 Syncing customer update to cloud...");
          await SupabaseService.syncLocalToSupabaseOnly();
        } catch (syncError) {
          console.log("Sync error (non-blocking):", syncError.message);
        }
      }, 2000);
    } catch (error) {
      console.error("CustomerContext: Error updating customer:", error);
      throw error;
    }
  },
  [fetchCustomers]
);

  // ✅ Fetch customers and check outstanding balances on mount
  useEffect(() => {
    fetchCustomers();
    loadSubscription();
  }, [fetchCustomers, loadSubscription]);

  // ✅ Check outstanding balances whenever customers change
  useEffect(() => {
    if (!loading && allCustomers.length > 0) {
      checkOutstandingBalances();
    }
  }, [allCustomers, loading, checkOutstandingBalances]);

  // Register sync callback
  useEffect(() => {
    console.log("CustomerContext: Registering sync callback");

    const syncCallback = async () => {
      console.log("CustomerContext: Sync completed, refreshing customers...");
      await fetchCustomers();
    };

    try {
      if (SupabaseService && SupabaseService.setOnSyncComplete) {
        SupabaseService.setOnSyncComplete(syncCallback);
      }
    } catch (error) {
      console.warn("Could not set sync callback:", error);
    }

    // Register realtime event listener
    const handleRealtimeEvent = async () => {
      console.log("CustomerContext: Realtime event received, refreshing...");
      await fetchCustomers();
    };

    try {
      const RealtimeService = require('../services/RealtimeService').default;
      RealtimeService.onCustomerChange = handleRealtimeEvent;
      RealtimeService.onTransactionChange = handleRealtimeEvent;
    } catch (error) {
      console.warn("Could not set realtime callback:", error);
    }

    return () => {
      console.log("CustomerContext: Unregistering sync callback");
      try {
        if (SupabaseService && SupabaseService.setOnSyncComplete) {
          SupabaseService.setOnSyncComplete(null);
        }
      } catch (error) {
        console.warn("Could not unregister callback:", error);
      }

      try {
        const RealtimeService = require('../services/RealtimeService').default;
        RealtimeService.onCustomerChange = null;
        RealtimeService.onTransactionChange = null;
      } catch (error) {
        console.warn("Could not unregister realtime callback:", error);
      }
    };
  }, [fetchCustomers]);

  // Reload subscription when customers change
  useEffect(() => {
    loadSubscription();
  }, [allCustomers.length, loadSubscription]);

  const contextValue = useMemo(
    () => ({
      allCustomers,
      loading,
      refreshCustomers: fetchCustomers,
      subscription,
      subscriptionLoading,
      loadSubscription,
      canAddMoreCustomers,
      getRemainingCustomers,
      checkCustomerLimitWarning,
      addCustomer,
      deleteCustomer,
      updateCustomer,
      checkOutstandingBalances, // ✅ Expose for manual checks
    }),
    [
      allCustomers,
      loading,
      fetchCustomers,
      subscription,
      subscriptionLoading,
      loadSubscription,
      canAddMoreCustomers,
      getRemainingCustomers,
      checkCustomerLimitWarning,
      addCustomer,
      deleteCustomer,
      updateCustomer,
      checkOutstandingBalances,
    ]
  );

  return (
    <CustomerContext.Provider value={contextValue}>
      {children}
    </CustomerContext.Provider>
  );
};
