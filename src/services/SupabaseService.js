// src/services/SupabaseService.js

import { supabase, getCurrentUser } from "../config/SupabaseConfig";
import SQLiteService from "./SQLiteService";
import DatabaseService from "./DatabaseService";
import NetInfo from "@react-native-community/netinfo";

class SupabaseService {
  constructor() {
    this.syncQueue = [];
    this.isSyncing = false;
    this.isOnline = true;
    this.onSyncCompleteCallback = null;

    this.setupNetworkListener();
  }

  // ============ SYNC COMPLETION CALLBACK ============

  setOnSyncComplete(callback) {
    this.onSyncCompleteCallback = callback;
  }

  // ============ NETWORK MONITORING ============

  setupNetworkListener() {
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;

      console.log("Network status:", this.isOnline ? "ONLINE" : "OFFLINE");

      if (wasOffline && this.isOnline) {
        console.log("Back online! Starting auto-sync...");
        this.autoSync();
      }
    });
  }

  async checkOnlineStatus() {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected && state.isInternetReachable;
    return this.isOnline;
  }

  // ============ SYNC QUEUE MANAGEMENT ============

  async addToSyncQueue(action, data) {
    const queueItem = {
      id: Date.now(),
      action,
      data,
      timestamp: new Date().toISOString(),
      retries: 0,
    };

    this.syncQueue.push(queueItem);
    await this.saveSyncQueue();

    console.log(`Added to sync queue: ${action}`);

    if (this.isOnline) {
      this.autoSync();
    }
  }

  async saveSyncQueue() {
    try {
      await DatabaseService.db.runAsync(
        "UPDATE sync_status SET pending_changes = ? WHERE id = 1",
        [this.syncQueue.length]
      );
    } catch (error) {
      console.error("Error saving sync queue:", error);
    }
  }

  async processSyncQueue() {
    if (this.syncQueue.length === 0 || this.isSyncing) return;

    this.isSyncing = true;
    const itemsToProcess = [...this.syncQueue];

    for (const item of itemsToProcess) {
      try {
        console.log(`Processing sync item: ${item.action}`);

        switch (item.action) {
          case "ADD_CUSTOMER":
            await this.syncSingleCustomer(item.data);
            break;
          case "UPDATE_CUSTOMER":
            await this.syncSingleCustomer(item.data);
            break;
          case "DELETE_CUSTOMER": // ✅ NEW: Handle customer deletion
            await this.deleteSingleCustomer(item.data.customerId);
            break;
          case "ADD_TRANSACTION":
            await this.syncSingleTransaction(item.data);
            break;
          case "UPDATE_TRANSACTION":
            await this.syncSingleTransaction(item.data);
            break;
          default:
            console.warn("Unknown sync action:", item.action);
        }

        this.syncQueue = this.syncQueue.filter((q) => q.id !== item.id);
        await this.saveSyncQueue();
      } catch (error) {
        console.error(`Failed to sync ${item.action}:`, error);

        const queueItem = this.syncQueue.find((q) => q.id === item.id);
        if (queueItem) {
          queueItem.retries++;

          if (queueItem.retries >= 3) {
            console.warn("Max retries reached, removing from queue:", item);
            this.syncQueue = this.syncQueue.filter((q) => q.id !== item.id);
          }
        }
      }
    }

    this.isSyncing = false;
    await this.saveSyncQueue();
  }

  // ============ AUTO-SYNC ============

  async autoSync() {
    try {
      const isOnline = await this.checkOnlineStatus();
      if (!isOnline) {
        console.log("Offline - skipping auto-sync");
        return { success: false, error: "No internet connection" };
      }

      const user = await getCurrentUser();
      if (!user) {
        console.log("Not logged in - skipping auto-sync");
        return { success: false, error: "Not authenticated" };
      }

      console.log("Starting auto-sync...");

      await this.processSyncQueue();

      const result = await this.fullSync();

      if (result.success) {
        console.log("Auto-sync completed successfully!");
      }

      return result;
    } catch (error) {
      console.error("Auto-sync error:", error);
      return { success: false, error: error.message };
    }
  }

  // ============ SINGLE ITEM SYNC ============

  async syncSingleCustomer(customerData) {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase.from("customers").upsert(
      {
        user_id: user.id,
        customer_id: customerData.customerId || customerData["Customer ID"],
        display_id:
          customerData.displayId || customerData["Display ID"] || null,
        customer_name:
          customerData.customerName || customerData["Customer Name"],
        phone_number:
          customerData.phoneNumber || customerData["Phone Number"] || null,
        address: customerData.address || customerData["Address"] || null,
        total_balance:
          customerData.totalBalance || customerData["Total Balance"] || 0,
        synced_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,customer_id",
      }
    );

    if (error) throw error;
    return { success: true };
  }

  // ✅ NEW: Delete customer from Supabase
  async deleteSingleCustomer(customerId) {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    console.log(`🗑️ Deleting customer ${customerId} from Supabase...`);

    // Step 1: Delete all transactions for this customer first
    const { error: txnError } = await supabase
      .from("transactions")
      .delete()
      .eq("user_id", user.id)
      .eq("customer_id", customerId);

    if (txnError && txnError.code !== "PGRST116") {
      console.warn("Failed to delete transactions:", txnError.message);
    } else {
      console.log("✅ Transactions deleted from Supabase");
    }

    // Step 2: Delete the customer
    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("user_id", user.id)
      .eq("customer_id", customerId);

    if (error) throw error;

    console.log("✅ Customer deleted from Supabase");
    return { success: true };
  }

  async syncSingleTransaction(transactionData) {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase.from("transactions").upsert(
      {
        user_id: user.id,
        transaction_id:
          transactionData.transactionId || transactionData["Transaction ID"],
        display_id:
          transactionData.displayId || transactionData["Display ID"] || null,
        customer_id:
          transactionData.customerId || transactionData["Customer ID"],
        date: transactionData.date || transactionData.Date,
        type: transactionData.type || transactionData.Type,
        amount: transactionData.amount || transactionData.Amount,
        note: transactionData.note || transactionData.Note || null,
        photo_url: transactionData.photo || transactionData.Photo || null,
        balance_after_txn:
          transactionData.balanceAfterTxn ||
          transactionData["Balance After Transaction"],
        synced_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,transaction_id",
      }
    );

    if (error) throw error;
    return { success: true };
  }

  // ============ FULL SYNC ============

  async syncCustomers() {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      const isOnline = await this.checkOnlineStatus();
      if (!isOnline) throw new Error("No internet connection");

      console.log("=== SYNCING CUSTOMERS ===");

      // Get customers directly from database
      console.log("Step 1: Loading local customers from database...");
      const localCustomers = await DatabaseService.db.getAllAsync(
        "SELECT * FROM customers ORDER BY created_at DESC"
      );
      console.log(`Found ${localCustomers.length} local customers`);

      // PHASE 1: Detect duplicates and remap
      console.log("Step 2: Detecting duplicates in cloud...");
      const customerIdMapping = new Map();
      const customersToUpload = [];

      for (const customer of localCustomers) {
        try {
          const phoneNumber = customer.phone_number;
          const localCustomerId = customer.customer_id;
          const customerName = customer.customer_name;

          if (!phoneNumber || phoneNumber.trim() === "") {
            console.log(
              `  ⚠️ Customer ${customerName} has no phone, will upload`
            );
            customersToUpload.push(customer);
            continue;
          }

          const { data: existingCustomers, error: searchError } = await supabase
            .from("customers")
            .select(
              "customer_id, customer_name, display_id, phone_number, address"
            )
            .eq("user_id", user.id)
            .eq("phone_number", phoneNumber);

          if (searchError) {
            console.error("  ❌ Search error:", searchError);
            throw searchError;
          }

          if (existingCustomers && existingCustomers.length > 0) {
            const existingCustomer = existingCustomers[0];

            if (existingCustomer.customer_id === localCustomerId) {
              console.log(
                `  ✅ Customer ${customerName} already synced to cloud, skipping`
              );
              continue;
            }

            console.log(
              `  📞 REAL DUPLICATE DETECTED: ${customerName} (${phoneNumber})`
            );
            console.log(
              `     Local ID:  ${localCustomerId.substring(0, 8)}...`
            );
            console.log(
              `     Cloud ID:  ${existingCustomer.customer_id.substring(
                0,
                8
              )}...`
            );

            customerIdMapping.set(
              localCustomerId,
              existingCustomer.customer_id
            );

            try {
              const localCloudCustomer = await DatabaseService.db.getFirstAsync(
                "SELECT customer_id FROM customers WHERE customer_id = ?",
                [existingCustomer.customer_id]
              );

              if (!localCloudCustomer) {
                console.log(
                  `     ⚙️ Adding cloud customer to local DB first...`
                );
                await DatabaseService.db.runAsync(
                  `INSERT INTO customers (customer_id, display_id, customer_name, phone_number, address, total_balance, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                  [
                    existingCustomer.customer_id,
                    existingCustomer.display_id,
                    existingCustomer.customer_name,
                    existingCustomer.phone_number || "",
                    existingCustomer.address || "",
                    0,
                  ]
                );
                console.log(`     ✅ Cloud customer added to local DB`);
              }
            } catch (insertError) {
              console.error(
                `     ❌ Failed to add cloud customer:`,
                insertError.message
              );
              continue;
            }

            console.log(`     ⚙️ Remapping local transactions...`);
            try {
              const txnResult = await DatabaseService.db.runAsync(
                `UPDATE transactions SET customer_id = ? WHERE customer_id = ?`,
                [existingCustomer.customer_id, localCustomerId]
              );
              console.log(
                `     ✅ Updated ${txnResult.changes} transaction(s)`
              );
            } catch (updateError) {
              console.error(
                `     ❌ Failed to update transactions:`,
                updateError.message
              );
              continue;
            }

            console.log(`     ⚙️ Deleting local duplicate customer...`);
            try {
              await DatabaseService.db.runAsync(
                `DELETE FROM customers WHERE customer_id = ?`,
                [localCustomerId]
              );
              console.log(`     ✅ Deleted local duplicate`);
            } catch (deleteError) {
              console.error(`     ⚠️ Could not delete:`, deleteError.message);
            }
          } else {
            console.log(
              `  ✅ Unique customer: ${customerName} (${phoneNumber})`
            );
            customersToUpload.push(customer);
          }
        } catch (error) {
          console.error(`  ❌ Error processing customer:`, error.message);
        }
      }

      if (customerIdMapping.size > 0) {
        console.log(`\n📊 REMAPPING SUMMARY:`);
        console.log(
          `   ${customerIdMapping.size} duplicate customer(s) detected and remapped`
        );
      }

      // PHASE 2: Upload unique customers
      console.log(
        `\nStep 3: Uploading ${customersToUpload.length} unique customers to cloud...`
      );
      for (const customer of customersToUpload) {
        try {
          console.log(`  📤 Uploading: ${customer.customer_name}`);
          await this.syncSingleCustomer({
            customerId: customer.customer_id,
            displayId: customer.display_id,
            customerName: customer.customer_name,
            phoneNumber: customer.phone_number,
            address: customer.address,
            totalBalance: customer.total_balance,
          });
          console.log(`  ✅ Uploaded successfully`);
        } catch (error) {
          console.error(`  ❌ Failed to upload:`, error.message);
        }
      }

      // PHASE 3: Update Supabase transactions
      if (customerIdMapping.size > 0) {
        console.log(`\nStep 4: Fixing transaction customer_ids in cloud...`);

        for (const [oldId, newId] of customerIdMapping.entries()) {
          try {
            console.log(
              `  🔄 Updating cloud transactions: ${oldId.substring(
                0,
                8
              )} → ${newId.substring(0, 8)}`
            );

            const { error: updateError } = await supabase
              .from("transactions")
              .update({ customer_id: newId })
              .eq("user_id", user.id)
              .eq("customer_id", oldId);

            if (updateError) {
              console.error(
                `  ❌ Failed to update transactions in cloud:`,
                updateError
              );
            } else {
              console.log(`  ✅ Updated transactions in cloud`);
            }

            console.log(
              `  🗑️ Deleting old duplicate ${oldId.substring(
                0,
                8
              )} from cloud...`
            );
            const { error: deleteError } = await supabase
              .from("customers")
              .delete()
              .eq("user_id", user.id)
              .eq("customer_id", oldId);

            if (deleteError && deleteError.code !== "PGRST116") {
              console.error(`  ⚠️ Could not delete:`, deleteError.message);
            } else {
              console.log(`  ✅ Old duplicate deleted from cloud`);
            }
          } catch (error) {
            console.error(`  ❌ Error:`, error.message);
          }
        }
      }

      // PHASE 4: Download customers from cloud
      console.log("\nStep 5: Downloading customers from cloud...");
      const { data: remoteCustomers, error: fetchError } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id);

      if (fetchError) throw fetchError;

      console.log(`Found ${remoteCustomers?.length || 0} customers in cloud`);

      const currentLocalCustomers = await DatabaseService.db.getAllAsync(
        "SELECT customer_id FROM customers"
      );

      const localCustomerIds = new Set(
        currentLocalCustomers.map((c) => c.customer_id)
      );

      console.log(
        `Currently have ${localCustomerIds.size} customers in local DB`
      );

      // PHASE 5: Merge remote customers
      console.log("\nStep 6: Merging cloud customers into local database...");
      for (const remote of remoteCustomers || []) {
        if (!localCustomerIds.has(remote.customer_id)) {
          console.log(`  📥 Adding from cloud: ${remote.customer_name}`);

          try {
            await DatabaseService.db.runAsync(
              `INSERT INTO customers (customer_id, display_id, customer_name, phone_number, address, total_balance, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              [
                remote.customer_id,
                remote.display_id,
                remote.customer_name,
                remote.phone_number || "",
                remote.address || "",
                remote.total_balance || 0,
              ]
            );
            console.log(`  ✅ Added successfully`);
          } catch (custError) {
            if (
              custError.message &&
              (custError.message.includes("UNIQUE") ||
                custError.message.includes("PRIMARY KEY"))
            ) {
              console.log(`  ⚠️ Already exists, skipping`);
            } else {
              console.error(`  ❌ Failed:`, custError.message);
            }
          }
        }
      }

      // PHASE 6: Recompute and sync customer balances
      console.log("\nStep 7: Recomputing all customer balances...");
      try {
        const allLocalCustomers = await DatabaseService.db.getAllAsync(
          "SELECT customer_id FROM customers"
        );

        for (const customer of allLocalCustomers) {
          try {
            await DatabaseService.recomputeRunningBalances(
              customer.customer_id
            );
          } catch (error) {
            console.warn(
              `  ⚠️ Failed to recompute balance for ${customer.customer_id}:`,
              error.message
            );
          }
        }

        console.log("Uploading updated customer balances to cloud...");
        const customersWithBalances = await DatabaseService.db.getAllAsync(
          "SELECT customer_id, total_balance FROM customers"
        );

        for (const customer of customersWithBalances) {
          try {
            await supabase
              .from("customers")
              .update({ total_balance: customer.total_balance })
              .eq("user_id", user.id)
              .eq("customer_id", customer.customer_id);
          } catch (error) {
            // Silently handle balance update errors
          }
        }

        console.log("✅ Customer balances synced");
      } catch (error) {
        console.error("Error recomputing balances:", error);
      }

      console.log("\n=== ✅ CUSTOMERS SYNCED SUCCESSFULLY ===\n");
      return { success: true };
    } catch (error) {
      console.error("\n=== ❌ CUSTOMER SYNC ERROR ===");
      console.error(error);
      return { success: false, error: error.message };
    }
  }

  async syncTransactions() {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      const isOnline = await this.checkOnlineStatus();
      if (!isOnline) throw new Error("No internet connection");

      console.log("=== SYNCING TRANSACTIONS ===");

      console.log("Step 1: Loading local transactions from database...");
      const localTransactions = await DatabaseService.db.getAllAsync(
        "SELECT * FROM transactions ORDER BY date ASC, created_at ASC"
      );
      console.log(`Found ${localTransactions.length} local transactions`);

      console.log("Step 2: Uploading transactions to cloud...");
      for (const txn of localTransactions) {
        try {
          await this.syncSingleTransaction({
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
        } catch (error) {
          console.error(
            `  ❌ Failed to upload transaction ${txn.display_id}:`,
            error.message
          );
        }
      }

      console.log("\nStep 3: Downloading transactions from cloud...");
      const { data: remoteTransactions, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: true });

      if (fetchError) throw fetchError;

      console.log(
        `Found ${remoteTransactions?.length || 0} transactions in cloud`
      );

      const localCustomers = await DatabaseService.db.getAllAsync(
        "SELECT customer_id FROM customers"
      );
      const localCustomerIds = new Set(
        localCustomers.map((c) => c.customer_id)
      );

      const localTxnMap = new Map(
        localTransactions.map((t) => [t.transaction_id, t])
      );

      console.log("\nStep 4: Merging cloud transactions into local...");
      for (const remote of remoteTransactions || []) {
        const localTxn = localTxnMap.get(remote.transaction_id);

        if (!localTxn) {
          if (!localCustomerIds.has(remote.customer_id)) {
            console.log(
              `  ⚠️ Skipping transaction ${remote.display_id}: Customer not found locally`
            );
            continue;
          }

          console.log(`  📥 Adding transaction: ${remote.display_id}`);

          try {
            const ids =
              remote.transaction_id && remote.display_id
                ? {
                    transactionId: remote.transaction_id,
                    displayId: remote.display_id,
                  }
                : await DatabaseService.generateTransactionId();

            await DatabaseService.db.runAsync(
              `INSERT INTO transactions (transaction_id, display_id, customer_id, date, type, amount, note, photo, balance_after_txn, created_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [
                ids.transactionId,
                ids.displayId,
                remote.customer_id,
                remote.date,
                remote.type,
                remote.amount,
                remote.note || "",
                remote.photo_url || null,
                remote.balance_after_txn || 0,
              ]
            );
          } catch (txnError) {
            if (txnError.message && txnError.message.includes("UNIQUE")) {
              console.log(`  ⚠️ Transaction already exists, skipping`);
            } else {
              console.error(`  ❌ Failed:`, txnError.message);
            }
          }
        }

        localTxnMap.delete(remote.transaction_id);
      }

      console.log("\nStep 5: Recomputing balances...");
      const affectedCustomers = new Set();
      remoteTransactions?.forEach((t) => affectedCustomers.add(t.customer_id));

      for (const customerId of affectedCustomers) {
        if (localCustomerIds.has(customerId)) {
          try {
            await DatabaseService.recomputeRunningBalances(customerId);
          } catch (error) {
            console.warn(`  ⚠️ Failed to recompute balance:`, error.message);
          }
        }
      }

      await SQLiteService.setLastSyncTime(new Date().toISOString());

      console.log("\n=== ✅ TRANSACTIONS SYNCED SUCCESSFULLY ===\n");
      return { success: true };
    } catch (error) {
      console.error("\n=== ❌ TRANSACTION SYNC ERROR ===");
      console.error(error);
      return { success: false, error: error.message };
    }
  }

  async fullSync() {
    if (this.isSyncing) {
      console.log("⏸️ Sync already in progress, skipping...");
      return { success: false, error: "Sync already in progress" };
    }

    this.isSyncing = true;

    try {
      console.log("\n╔════════════════════════════════════════╗");
      console.log("║     STARTING FULL SYNC                 ║");
      console.log("╚════════════════════════════════════════╝\n");

      const isOnline = await this.checkOnlineStatus();
      if (!isOnline) {
        this.isSyncing = false;
        return { success: false, error: "No internet connection" };
      }

      const user = await getCurrentUser();
      if (!user) {
        this.isSyncing = false;
        return { success: false, error: "Not authenticated" };
      }

      console.log("┌─────────────────────────────────────┐");
      console.log("│  PHASE 1: SYNCING CUSTOMERS         │");
      console.log("└─────────────────────────────────────┘\n");

      const customerResult = await this.syncCustomers();
      if (!customerResult.success) {
        console.error("❌ Customer sync failed:", customerResult.error);
        this.isSyncing = false;
        return {
          success: false,
          error: `Customer sync failed: ${customerResult.error}`,
        };
      }

      console.log("\n⏳ Waiting for customer sync to complete...");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("\n┌─────────────────────────────────────┐");
      console.log("│  PHASE 2: SYNCING TRANSACTIONS      │");
      console.log("└─────────────────────────────────────┘\n");

      const transactionResult = await this.syncTransactions();
      if (!transactionResult.success) {
        console.error("❌ Transaction sync failed:", transactionResult.error);
        this.isSyncing = false;
        return {
          success: false,
          error: `Transaction sync failed: ${transactionResult.error}`,
        };
      }

      console.log("\n┌─────────────────────────────────────┐");
      console.log("│  PHASE 3: UPDATING UI               │");
      console.log("└─────────────────────────────────────┘\n");

      console.log("🧹 Clearing cache after successful sync...");
      SQLiteService.clearCache();

      if (this.onSyncCompleteCallback) {
        try {
          console.log("🔄 Notifying UI components...");
          await this.onSyncCompleteCallback();
          console.log("✅ UI updated successfully\n");
        } catch (callbackError) {
          console.error("⚠️ UI callback error:", callbackError.message);
        }
      }

      console.log("╔════════════════════════════════════════╗");
      console.log("║     ✅ FULL SYNC COMPLETED            ║");
      console.log("╚════════════════════════════════════════╝\n");

      this.isSyncing = false;
      return { success: true, message: "Sync completed successfully!" };
    } catch (error) {
      console.error("\n╔════════════════════════════════════════╗");
      console.error("║     ❌ FULL SYNC FAILED                ║");
      console.error("╚════════════════════════════════════════╝");
      console.error("Error:", error.message);
      console.error("\n");

      this.isSyncing = false;
      return { success: false, error: error.message };
    }
  }

  // ============ SYNC STATUS ============

  async getSyncStatus() {
    try {
      const user = await getCurrentUser();
      const isOnline = await this.checkOnlineStatus();

      if (!user) {
        return {
          enabled: false,
          isOnline: false,
          lastSync: null,
          pendingChanges: 0,
        };
      }

      const lastSync = await SQLiteService.getLastSyncTime();

      return {
        enabled: true,
        isOnline,
        userId: user.id,
        email: user.email,
        lastSync,
        pendingChanges: this.syncQueue.length,
      };
    } catch (error) {
      return {
        enabled: false,
        isOnline: false,
        lastSync: null,
        pendingChanges: 0,
      };
    }
  }

  // ============ MANUAL SYNC TRIGGER ============

  async manualSync() {
    try {
      const isOnline = await this.checkOnlineStatus();
      if (!isOnline) {
        return {
          success: false,
          error: "No internet connection. Please check your network.",
        };
      }

      const user = await getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: "Please sign in to sync data.",
        };
      }

      return await this.fullSync();
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new SupabaseService();
