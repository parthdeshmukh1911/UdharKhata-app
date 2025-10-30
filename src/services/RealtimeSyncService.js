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
    if (this.isListening) {
      console.log("⚠️ Realtime listeners already active");
      return;
    }

    console.log("📡 Starting real-time sync listeners...");

    try {
      // ✅ Listen to customers table changes
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
            console.log(
              `📡 Customer ${payload.eventType}:`,
              payload.new?.customer_name || payload.old?.customer_name
            );
            this.handleCustomerChange(payload);
          }
        )
        .subscribe((status, error) => {
          if (status === "SUBSCRIBED") {
            console.log("✅ Subscribed to customers changes");
            this.reconnectAttempts = 0;
          } else if (status === "CHANNEL_ERROR") {
            // ✅ Silently handle connection errors (offline mode)
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.reconnectAttempts++;
            }
          } else if (status === "TIMED_OUT") {
            // ✅ Silently handle timeout (offline mode)
          }
        });

      // ✅ Listen to transactions table changes
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
            console.log(
              `📡 Transaction ${payload.eventType}:`,
              payload.new?.display_id || payload.old?.display_id
            );
            this.handleTransactionChange(payload);
          }
        )
        .subscribe((status, error) => {
          if (status === "SUBSCRIBED") {
            console.log("✅ Subscribed to transactions changes");
            this.reconnectAttempts = 0;
          } else if (status === "CHANNEL_ERROR") {
            // ✅ Silently handle connection errors
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.reconnectAttempts++;
            }
          } else if (status === "TIMED_OUT") {
            // ✅ Silently handle timeout
          }
        });

      this.isListening = true;
    } catch (error) {
      // ✅ Silently handle startup errors (offline mode)
      console.log("⚠️ Real-time listeners: Will retry when online");
    }
  }

  // Handle customer changes from other devices
  async handleCustomerChange(payload) {
    try {
      // ✅ Check if online before syncing
      const isOnline = await SupabaseService.checkOnlineStatus();
      if (!isOnline) {
        return; // Skip if offline
      }

      // Debounce: Wait 1 second before syncing
      if (this.customerSyncTimeout) {
        clearTimeout(this.customerSyncTimeout);
      }

      this.customerSyncTimeout = setTimeout(async () => {
        try {
          console.log(
            "🔄 Syncing due to customer change from another device..."
          );
          await SupabaseService.autoSync();
        } catch (syncError) {
          // ✅ Silently handle sync errors
          if (!syncError.message?.includes("network")) {
            console.log("Sync error:", syncError.message);
          }
        }
      }, 1000);
    } catch (error) {
      // Silently handle errors
    }
  }

  // Handle transaction changes from other devices
  async handleTransactionChange(payload) {
    try {
      // ✅ Check if online before syncing
      const isOnline = await SupabaseService.checkOnlineStatus();
      if (!isOnline) {
        return; // Skip if offline
      }

      // Debounce: Wait 1 second before syncing
      if (this.transactionSyncTimeout) {
        clearTimeout(this.transactionSyncTimeout);
      }

      this.transactionSyncTimeout = setTimeout(async () => {
        try {
          console.log(
            "🔄 Syncing due to transaction change from another device..."
          );
          await SupabaseService.autoSync();
        } catch (syncError) {
          // ✅ Silently handle sync errors
          if (!syncError.message?.includes("network")) {
            console.log("Sync error:", syncError.message);
          }
        }
      }, 1000);
    } catch (error) {
      // Silently handle errors
    }
  }

  // Stop real-time listeners
  stop() {
    console.log("📡 Stopping real-time sync listeners...");

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
      console.log("✅ Real-time listeners stopped");
    } catch (error) {
      // Silently handle cleanup errors
      this.isListening = false;
    }
  }

  // Check if listening
  isActive() {
    return this.isListening;
  }
}

export default new RealtimeSyncService();
