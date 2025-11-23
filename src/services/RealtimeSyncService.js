// src/services/RealtimeSyncService.js

import { supabase } from "../config/SupabaseConfig";
import SupabaseService from "./SupabaseService";

class RealtimeSyncService {
  constructor() {
    this.customersChannel = null;
    this.transactionsChannel = null;
    this.isListening = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Start real-time listeners with offline handling
  async start(userId) {
    console.log("🎧 [REALTIME] start() called");
    console.log("🎧 [REALTIME] User ID:", userId);
    
    if (this.isListening) {
      console.log("⚠️ [REALTIME] Already listening");
      return;
    }

    console.log("📡 [REALTIME] Starting real-time sync listeners...");

    try {
      // ✅ IMPORTANT: Remove existing channels first
      if (this.customersChannel) {
        console.log("🧹 [REALTIME] Removing old customers channel");
        await supabase.removeChannel(this.customersChannel);
        this.customersChannel = null;
      }
      
      if (this.transactionsChannel) {
        console.log("🧹 [REALTIME] Removing old transactions channel");
        await supabase.removeChannel(this.transactionsChannel);
        this.transactionsChannel = null;
      }

      // ✅ Listen to customers table changes
      console.log("📡 [REALTIME] Setting up customers channel...");
      this.customersChannel = supabase
        .channel("realtime-customers")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "customers",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            console.log("🔔 [REALTIME] ===== CUSTOMER EVENT RECEIVED =====");
            console.log("🔔 [REALTIME] Event type:", payload.eventType);
            console.log("🔔 [REALTIME] Customer:", payload.new?.customer_name || payload.old?.customer_name);
            console.log("🔔 [REALTIME] User ID from event:", payload.new?.user_id || payload.old?.user_id);
            this.handleCustomerChange(payload);
          }
        )
        .subscribe((status, error) => {
          console.log("📡 [REALTIME] Customers channel status:", status);
          if (error) {
            console.error("❌ [REALTIME] Customers channel error:", error);
          }
          if (status === "SUBSCRIBED") {
            console.log("✅ [REALTIME] ✅✅✅ SUBSCRIBED to customers changes ✅✅✅");
            this.reconnectAttempts = 0;
          } else if (status === "CHANNEL_ERROR") {
            console.error("❌ [REALTIME] Channel error occurred");
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.reconnectAttempts++;
            }
          } else if (status === "TIMED_OUT") {
            console.error("❌ [REALTIME] Channel timed out");
          }
        });

      // ✅ Listen to transactions table changes
      console.log("📡 [REALTIME] Setting up transactions channel...");
      this.transactionsChannel = supabase
        .channel("realtime-transactions")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "transactions",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            console.log("🔔 [REALTIME] ===== TRANSACTION EVENT RECEIVED =====");
            console.log("🔔 [REALTIME] Event type:", payload.eventType);
            console.log("🔔 [REALTIME] Transaction:", payload.new?.display_id || payload.old?.display_id);
            console.log("🔔 [REALTIME] User ID from event:", payload.new?.user_id || payload.old?.user_id);
            this.handleTransactionChange(payload);
          }
        )
        .subscribe((status, error) => {
          console.log("📡 [REALTIME] Transactions channel status:", status);
          if (error) {
            console.error("❌ [REALTIME] Transactions channel error:", error);
          }
          if (status === "SUBSCRIBED") {
            console.log("✅ [REALTIME] ✅✅✅ SUBSCRIBED to transactions changes ✅✅✅");
            this.reconnectAttempts = 0;
          } else if (status === "CHANNEL_ERROR") {
            console.error("❌ [REALTIME] Channel error occurred");
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.reconnectAttempts++;
            }
          } else if (status === "TIMED_OUT") {
            console.error("❌ [REALTIME] Channel timed out");
          }
        });

      this.isListening = true;
      console.log("✅ [REALTIME] Real-time service started successfully");
    } catch (error) {
      console.error("❌ [REALTIME] Startup error:", error);
      console.log("⚠️ [REALTIME] Will retry when online");
    }
  }

 // ✅ OPTIMIZED: Handle customer changes with smart sync
async handleCustomerChange(payload) {
  console.log("🔔 [REALTIME-CUST] handleCustomerChange() called");
  
  try {
    const isOnline = await SupabaseService.checkOnlineStatus();
    console.log("🌐 [REALTIME-CUST] Online:", isOnline);
    
    if (!isOnline) {
      console.log("📴 [REALTIME-CUST] Offline, skipping");
      return;
    }

    // ✅ OPTIMIZATION: Reduced debounce from 2s to 0.5s
    if (this.customerSyncTimeout) {
      clearTimeout(this.customerSyncTimeout);
    }

    console.log("⏰ [REALTIME-CUST] Setting 0.5-second timer for sync");
    this.customerSyncTimeout = setTimeout(async () => {
      try {
        console.log("🔄 [REALTIME-CUST] Syncing due to customer change...");
        
        // ✅ OPTIMIZATION: Use lightweight incremental sync instead of fullSync
        const result = await SupabaseService.incrementalSync();
        
        if (result.success) {
          console.log("✅ [REALTIME-CUST] Incremental sync complete");
        } else {
          console.log("⚠️ [REALTIME-CUST] Incremental sync failed, falling back to full sync");
          // Fallback to full sync if incremental fails
          await SupabaseService.fullSync();
        }
      } catch (syncError) {
        console.error("❌ [REALTIME-CUST] Sync error:", syncError.message);
        // Fallback to full sync on error
        try {
          await SupabaseService.fullSync();
        } catch (fallbackError) {
          console.error("❌ [REALTIME-CUST] Fallback sync also failed:", fallbackError.message);
        }
      }
    }, 500); // ✅ Changed from 2000ms to 500ms
  } catch (error) {
    console.error("❌ [REALTIME-CUST] handleCustomerChange error:", error);
  }
}

// ✅ OPTIMIZED: Handle transaction changes with smart sync
async handleTransactionChange(payload) {
  console.log("🔔 [REALTIME-TXN] handleTransactionChange() called");
  
  try {
    const isOnline = await SupabaseService.checkOnlineStatus();
    console.log("🌐 [REALTIME-TXN] Online:", isOnline);
    
    if (!isOnline) {
      console.log("📴 [REALTIME-TXN] Offline, skipping");
      return;
    }

    // ✅ OPTIMIZATION: Reduced debounce from 2s to 0.5s
    if (this.transactionSyncTimeout) {
      clearTimeout(this.transactionSyncTimeout);
    }

    console.log("⏰ [REALTIME-TXN] Setting 0.5-second timer for sync");
    this.transactionSyncTimeout = setTimeout(async () => {
      try {
        console.log("🔄 [REALTIME-TXN] Syncing due to transaction change...");
        
        // ✅ OPTIMIZATION: Use lightweight incremental sync instead of fullSync
        const result = await SupabaseService.incrementalSync();
        
        if (result.success) {
          console.log("✅ [REALTIME-TXN] Incremental sync complete");
        } else {
          console.log("⚠️ [REALTIME-TXN] Incremental sync failed, falling back to full sync");
          // Fallback to full sync if incremental fails
          await SupabaseService.fullSync();
        }
      } catch (syncError) {
        console.error("❌ [REALTIME-TXN] Sync error:", syncError.message);
        // Fallback to full sync on error
        try {
          await SupabaseService.fullSync();
        } catch (fallbackError) {
          console.error("❌ [REALTIME-TXN] Fallback sync also failed:", fallbackError.message);
        }
      }
    }, 500); // ✅ Changed from 2000ms to 500ms
  } catch (error) {
    console.error("❌ [REALTIME-TXN] handleTransactionChange error:", error);
  }
}



  // Stop real-time listeners
  stop() {
    console.log("📡 [REALTIME] Stopping real-time sync listeners...");

    try {
      if (this.customersChannel) {
        supabase.removeChannel(this.customersChannel);
        this.customersChannel = null;
      }

      if (this.transactionsChannel) {
        supabase.removeChannel(this.transactionsChannel);
        this.transactionsChannel = null;
      }

      if (this.customerSyncTimeout) {
        clearTimeout(this.customerSyncTimeout);
      }

      if (this.transactionSyncTimeout) {
        clearTimeout(this.transactionSyncTimeout);
      }

      this.isListening = false;
      this.reconnectAttempts = 0;
      console.log("✅ [REALTIME] Real-time listeners stopped");
    } catch (error) {
      console.error("❌ [REALTIME] Stop error:", error);
      this.isListening = false;
    }
  }

  // Check if listening
  isActive() {
    return this.isListening;
  }
}

export default new RealtimeSyncService();
