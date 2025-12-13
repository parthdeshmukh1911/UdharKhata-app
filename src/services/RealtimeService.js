// src/services/RealtimeService.js
// Supabase Realtime sync for instant data synchronization

import { supabase } from '../config/SupabaseConfig';
import DatabaseService from './DatabaseService';
import SQLiteService from './SQLiteService';
import SyncLockService from './SyncLockService';

class RealtimeService {
  constructor() {
    this.customersChannel = null;
    this.transactionsChannel = null;
    this.isSubscribed = false;
    this.userId = null;
    this.onCustomerChange = null;
    this.onTransactionChange = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.ignoringEvents = false; // Flag to ignore events during full sync
  }

  // Subscribe to realtime changes
  async subscribe(userId) {
    if (this.isSubscribed) {
      console.log("⚠️ [REALTIME] Already subscribed");
      return;
    }

    if (!userId) {
      console.log("⚠️ [REALTIME] No user ID provided");
      return;
    }

    this.userId = userId;
    console.log("🔴 [REALTIME] Subscribing to changes...");

    try {
      // Subscribe to customers table changes
      this.customersChannel = supabase
        .channel('customers-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'customers',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            console.log(`🔴 [REALTIME] Customer ${payload.eventType}`);
            this.handleCustomerChange(payload);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log("✅ [REALTIME] Customers channel subscribed");
          }
        });

      // Subscribe to transactions table changes
      this.transactionsChannel = supabase
        .channel('transactions-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            console.log(`🔴 [REALTIME] Transaction ${payload.eventType}`);
            this.handleTransactionChange(payload);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log("✅ [REALTIME] Transactions channel subscribed");
          }
        });

      this.isSubscribed = true;
      this.reconnectAttempts = 0;
      console.log("✅ [REALTIME] Subscribed successfully");
    } catch (error) {
      console.error("❌ [REALTIME] Subscription error:", error);
      this.isSubscribed = false;
    }
  }

  // Handle customer changes
  async handleCustomerChange(payload) {
    // Ignore events during full sync
    if (this.ignoringEvents) {
      console.log("🔇 [REALTIME] Ignoring customer event (full sync in progress)");
      return;
    }

    const { eventType, new: newRecord, old: oldRecord } = payload;

    // Acquire lock to prevent conflicts
    const lockAcquired = await SyncLockService.acquireLock('REALTIME_SYNC', 'MEDIUM');
    if (!lockAcquired) {
      console.log("🔒 [REALTIME] Could not acquire lock, skipping");
      return;
    }

    try {
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const existing = await DatabaseService.db.getFirstAsync(
          "SELECT customer_id FROM customers WHERE customer_id = ?",
          [newRecord.customer_id]
        );

        if (existing) {
          // Update existing
          await DatabaseService.db.runAsync(
            `UPDATE customers 
             SET customer_name = ?, phone_number = ?, address = ?, 
                 total_balance = ?, synced_to_cloud = 1, updated_at = CURRENT_TIMESTAMP
             WHERE customer_id = ?`,
            [
              newRecord.customer_name,
              newRecord.phone_number || "",
              newRecord.address || "",
              newRecord.total_balance || 0,
              newRecord.customer_id
            ]
          );
          console.log("✅ [REALTIME] Customer updated locally");
        } else {
          // Insert new
          await DatabaseService.db.runAsync(
            `INSERT INTO customers (customer_id, display_id, customer_name, 
                                    phone_number, address, total_balance, synced_to_cloud,
                                    created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
              newRecord.customer_id,
              newRecord.display_id,
              newRecord.customer_name,
              newRecord.phone_number || "",
              newRecord.address || "",
              newRecord.total_balance || 0
            ]
          );
          console.log("✅ [REALTIME] Customer added locally");
        }

        // Clear cache
        SQLiteService.clearRelatedCache('addCustomer');

        // Trigger UI refresh
        if (this.onCustomerChange) {
          this.onCustomerChange();
        }
      } 
      else if (eventType === 'DELETE') {
        await DatabaseService.db.runAsync(
          "DELETE FROM customers WHERE customer_id = ?",
          [oldRecord.customer_id]
        );
        console.log("✅ [REALTIME] Customer deleted locally");

        SQLiteService.clearRelatedCache('addCustomer');

        if (this.onCustomerChange) {
          this.onCustomerChange();
        }
      }
    } catch (error) {
      console.error("❌ [REALTIME] Error handling customer change:", error);
    } finally {
      SyncLockService.releaseLock('REALTIME_SYNC');
    }
  }

  // Handle transaction changes
  async handleTransactionChange(payload) {
    // Ignore events during full sync
    if (this.ignoringEvents) {
      console.log("🔇 [REALTIME] Ignoring transaction event (full sync in progress)");
      return;
    }

    const { eventType, new: newRecord, old: oldRecord } = payload;

    // Acquire lock to prevent conflicts
    const lockAcquired = await SyncLockService.acquireLock('REALTIME_SYNC', 'MEDIUM');
    if (!lockAcquired) {
      console.log("🔒 [REALTIME] Could not acquire lock, skipping");
      return;
    }

    try {
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const existing = await DatabaseService.db.getFirstAsync(
          "SELECT transaction_id FROM transactions WHERE transaction_id = ?",
          [newRecord.transaction_id]
        );

        if (existing) {
          // Update existing
          await DatabaseService.db.runAsync(
            `UPDATE transactions 
             SET customer_id = ?, date = ?, type = ?, amount = ?, 
                 note = ?, photo = ?, balance_after_txn = ?, synced_to_cloud = 1
             WHERE transaction_id = ?`,
            [
              newRecord.customer_id,
              newRecord.date,
              newRecord.type,
              newRecord.amount,
              newRecord.note || "",
              newRecord.photo_url || null,
              newRecord.balance_after_txn ?? 0,
              newRecord.transaction_id
            ]
          );
          console.log("✅ [REALTIME] Transaction updated locally");
        } else {
          // Insert new
          await DatabaseService.db.runAsync(
            `INSERT INTO transactions (transaction_id, display_id, customer_id, 
                                       date, type, amount, note, photo, 
                                       balance_after_txn, synced_to_cloud, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
            [
              newRecord.transaction_id,
              newRecord.display_id,
              newRecord.customer_id,
              newRecord.date,
              newRecord.type,
              newRecord.amount,
              newRecord.note || "",
              newRecord.photo_url || null,
              newRecord.balance_after_txn ?? 0
            ]
          );
          console.log("✅ [REALTIME] Transaction added locally");
        }

        // ✅ FIX: Don't recompute - balance is already correct from source device
        // This prevents the event storm where each event triggers recomputation
        // The customer balance will be updated by the Customer UPDATE event

        // Clear cache
        SQLiteService.clearRelatedCache('addTransaction');

        // Trigger UI refresh
        if (this.onTransactionChange) {
          this.onTransactionChange();
        }
      } 
      else if (eventType === 'DELETE') {
        await DatabaseService.db.runAsync(
          "DELETE FROM transactions WHERE transaction_id = ?",
          [oldRecord.transaction_id]
        );

        console.log("✅ [REALTIME] Transaction deleted locally");

        // ✅ FIX: Don't recompute - subsequent UPDATE events will have correct balances
        // The source device already recomputed and those values are in the events

        // Clear cache
        SQLiteService.clearRelatedCache('addTransaction');

        if (this.onTransactionChange) {
          this.onTransactionChange();
        }
      }
    } catch (error) {
      console.error("❌ [REALTIME] Error handling transaction change:", error);
    } finally {
      SyncLockService.releaseLock('REALTIME_SYNC');
    }
  }

  // Reconnect after network change
  async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("⚠️ [REALTIME] Max reconnect attempts reached");
      return;
    }

    console.log(`🔄 [REALTIME] Reconnecting (attempt ${this.reconnectAttempts + 1})...`);
    this.reconnectAttempts++;

    await this.unsubscribe();
    
    setTimeout(() => {
      if (this.userId) {
        this.subscribe(this.userId);
      }
    }, 1000);
  }

  // Unsubscribe from realtime
  async unsubscribe() {
    if (!this.isSubscribed) {
      return;
    }

    console.log("🔴 [REALTIME] Unsubscribing...");

    try {
      if (this.customersChannel) {
        await supabase.removeChannel(this.customersChannel);
        this.customersChannel = null;
      }

      if (this.transactionsChannel) {
        await supabase.removeChannel(this.transactionsChannel);
        this.transactionsChannel = null;
      }

      this.isSubscribed = false;
      this.userId = null;
      console.log("✅ [REALTIME] Unsubscribed");
    } catch (error) {
      console.error("❌ [REALTIME] Unsubscribe error:", error);
    }
  }

  // Check if connected
  isConnected() {
    return this.isSubscribed;
  }
}

export default new RealtimeService();
