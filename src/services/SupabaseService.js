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
    this.abortControllerCustomers = null;
    this.abortControllerTransactions = null;

    this.setupNetworkListener();

    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        this.cancelSync();
        console.log("Sync cancelled due to user sign-out.");
      }
    });
  }

  setOnSyncComplete(callback) {
    this.onSyncCompleteCallback = callback;
  }

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

  cancelSync() {
    if (this.abortControllerCustomers) {
      this.abortControllerCustomers.abort();
      this.abortControllerCustomers = null;
    }
    if (this.abortControllerTransactions) {
      this.abortControllerTransactions.abort();
      this.abortControllerTransactions = null;
    }
    this.isSyncing = false;
  }

  async getCurrentUser() {
    try {
      const { data } = await supabase.auth.getUser();
      return data?.user || null;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  async isUserAuthenticated() {
    const user = await this.getCurrentUser();
    return !!user;
  }

  async addToSyncQueue(action, data) {
    this.syncQueue.push({
      id: Date.now(),
      action,
      data,
      timestamp: new Date().toISOString(),
      retries: 0,
    });
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
    if (this.syncQueue.length === 0 || this.isSyncing) return { success: true };
    this.isSyncing = true;

    for (const item of [...this.syncQueue]) {
      if (!await this.isUserAuthenticated()) {
        console.log("User signed out during processing queue, aborting remaining sync.");
        break;
      }
      try {
        switch (item.action) {
          case "ADD_CUSTOMER":
          case "UPDATE_CUSTOMER":
            await this.syncSingleCustomer(item.data);
            break;
          case "DELETE_CUSTOMER":
            await this.deleteSingleCustomer(item.data.customerId);
            break;
          case "ADD_TRANSACTION":
          case "UPDATE_TRANSACTION":
            await this.syncSingleTransaction(item.data);
            break;
          default:
            console.warn("Unknown sync action:", item.action);
        }

        this.syncQueue = this.syncQueue.filter(q => q.id !== item.id);
        await this.saveSyncQueue();
      } catch (error) {
        if (error.message?.includes("Not authenticated")) {
          console.log("Sync aborted due to sign-out, suppressing error");
          break;
        }
        console.error(`Failed to sync ${item.action}:`, error);
        const queueItem = this.syncQueue.find(q => q.id === item.id);
        if (queueItem) {
          queueItem.retries++;
          if (queueItem.retries >= 3) {
            console.warn("Max retries reached, removing from queue:", item);
            this.syncQueue = this.syncQueue.filter(q => q.id !== item.id);
          }
        }
      }
    }
    this.isSyncing = false;
    await this.saveSyncQueue();
    return { success: true };
  }

  async autoSync() {
    if (this.isSyncing) {
      console.log("Sync already in progress");
      return { success: false, error: "Sync already in progress" };
    }

    this.isSyncing = true;
    try {
      if (!await this.checkOnlineStatus()) {
        this.isSyncing = false;
        return { success: false, error: "No internet connection" };
      }
      if (!await this.isUserAuthenticated()) {
        this.isSyncing = false;
        return { success: false, error: "Not authenticated" };
      }
      await this.processSyncQueue();
      const fullSyncResult = await this.fullSync('AUTO_SYNC');
      this.isSyncing = false;
      return fullSyncResult;
    } catch (error) {
      if (error.message?.includes("Not authenticated")) {
        console.log("Sync aborted due to sign-out, suppressing error");
        this.isSyncing = false;
        return { success: false, error: "Sync aborted due to sign-out" };
      }
      this.isSyncing = false;
      console.error("AutoSync error:", error);
      return { success: false, error: error.message || "Unknown error" };
    }
  }


    // ✅ NEW METHOD: Quick sync to push local changes to cloud
  async syncLocalToSupabaseOnly() {
    // Quick push to cloud without full sync
    if (this.isSyncing) {
      console.log("Sync in progress, queueing...");
      return { success: false, queued: true };
    }

    this.isSyncing = true;
    try {
      if (!await this.checkOnlineStatus()) {
        this.isSyncing = false;
        console.log("Offline - changes will sync when online");
        return { success: false, error: "Offline" };
      }

      if (!await this.isUserAuthenticated()) {
        this.isSyncing = false;
        return { success: false, error: "Not authenticated" };
      }

      console.log("🚀 Quick sync: Pushing local changes to cloud...");
      
      // Upload local customers
      const localCustomers = await DatabaseService.db.getAllAsync(
        "SELECT * FROM customers"
      );
      for (const customer of localCustomers) {
        if (!await this.isUserAuthenticated()) {
          this.isSyncing = false;
          return { success: false, error: "Sync aborted" };
        }
        await this.syncSingleCustomer({
          customerId: customer.customer_id,
          displayId: customer.display_id,
          customerName: customer.customer_name,
          phoneNumber: customer.phone_number,
          address: customer.address,
          totalBalance: customer.total_balance,
        });
      }

      // Upload local transactions
      const localTransactions = await DatabaseService.db.getAllAsync(
        "SELECT * FROM transactions"
      );
      for (const txn of localTransactions) {
        if (!await this.isUserAuthenticated()) {
          this.isSyncing = false;
          return { success: false, error: "Sync aborted" };
        }
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
      }

      this.isSyncing = false;
      console.log("✅ Quick sync completed");
      return { success: true };
    } catch (error) {
      this.isSyncing = false;
      console.error("Quick sync error:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ NEW: Lightweight incremental sync for real-time events
async incrementalSync() {
  console.log("⚡ [INCREMENTAL-SYNC] Starting lightweight sync...");
  
  try {
    if (!await this.checkOnlineStatus()) {
      console.log("📴 [INCREMENTAL-SYNC] Offline");
      return { success: false, error: "Offline" };
    }

    if (!await this.isUserAuthenticated()) {
      console.log("🔐 [INCREMENTAL-SYNC] Not authenticated");
      return { success: false, error: "Not authenticated" };
    }

    const user = await this.getCurrentUser();
    if (!user) {
      return { success: false, error: "No user" };
    }

    console.log("📥 [INCREMENTAL-SYNC] Fetching new data from cloud...");

    // Get last sync time
    const lastSyncTime = await SQLiteService.getLastSyncTime();
    const syncTime = lastSyncTime || '1970-01-01T00:00:00Z';
    
    console.log("🕐 [INCREMENTAL-SYNC] Last sync:", syncTime);

    // ✅ OPTIMIZATION 1: Only fetch records modified after last sync
    const { data: newCustomers, error: custError } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", user.id)
      .gte("updated_at", syncTime)
      .order("updated_at", { ascending: false });

    if (custError) {
      console.error("❌ [INCREMENTAL-SYNC] Customer fetch error:", custError);
    } else {
      console.log(`📋 [INCREMENTAL-SYNC] Found ${newCustomers?.length || 0} updated customers`);
      
      // Merge new/updated customers
      for (const remote of newCustomers || []) {
        try {
          const existing = await DatabaseService.db.getFirstAsync(
            "SELECT customer_id FROM customers WHERE customer_id = ?",
            [remote.customer_id]
          );

          if (existing) {
            // Update existing
            await DatabaseService.db.runAsync(
              `UPDATE customers 
               SET customer_name = ?, phone_number = ?, address = ?, total_balance = ?, updated_at = CURRENT_TIMESTAMP
               WHERE customer_id = ?`,
              [
                remote.customer_name,
                remote.phone_number || "",
                remote.address || "",
                remote.total_balance || 0,
                remote.customer_id,
              ]
            );
            console.log(`  ✅ Updated customer: ${remote.customer_name}`);

            // Log customer update audit
            const AuditService = require('./AuditService').default;
            AuditService.logCustomerSync(remote.customer_id, {
              displayId: remote.display_id,
              syncType: 'INCREMENTAL_SYNC',
              syncDirection: 'DOWNLOAD',
              syncAction: 'UPDATED',
            }).catch(err => console.log("Audit error:", err.message));
          } else {
            // Insert new
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
            console.log(`  ✅ Added new customer: ${remote.customer_name}`);

            // Log customer creation audit
            const AuditService = require('./AuditService').default;
            AuditService.logCustomerSync(remote.customer_id, {
              displayId: remote.display_id,
              syncType: 'INCREMENTAL_SYNC',
              syncDirection: 'DOWNLOAD',
              syncAction: 'CREATED',
            }).catch(err => console.log("Audit error:", err.message));
          }
        } catch (error) {
          console.error(`  ❌ Failed to merge customer:`, error.message);
        }
      }
    }

    // ✅ OPTIMIZATION 2: Only fetch transactions modified after last sync
    const { data: newTransactions, error: txnError } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("synced_at", syncTime)
      .order("date", { ascending: false });

    if (txnError) {
      console.error("❌ [INCREMENTAL-SYNC] Transaction fetch error:", txnError);
    } else {
      console.log(`📋 [INCREMENTAL-SYNC] Found ${newTransactions?.length || 0} new transactions`);

      const affectedCustomers = new Set();

      // Merge new transactions
      for (const remote of newTransactions || []) {
        try {
          const existing = await DatabaseService.db.getFirstAsync(
            "SELECT transaction_id FROM transactions WHERE transaction_id = ?",
            [remote.transaction_id]
          );

          if (!existing) {
            // Check if customer exists locally
            const customerExists = await DatabaseService.db.getFirstAsync(
              "SELECT customer_id FROM customers WHERE customer_id = ?",
              [remote.customer_id]
            );

            if (customerExists) {
              // Insert new transaction
              await DatabaseService.db.runAsync(
                `INSERT INTO transactions (transaction_id, display_id, customer_id, date, type, amount, note, photo, balance_after_txn, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [
                  remote.transaction_id,
                  remote.display_id,
                  remote.customer_id,
                  remote.date,
                  remote.type,
                  remote.amount,
                  remote.note || "",
                  remote.photo_url || null,
                  remote.balance_after_txn ?? 0,
                ]
              );
              console.log(`  ✅ Added transaction: ${remote.display_id}`);
              affectedCustomers.add(remote.customer_id);

              // Log transaction creation audit
              const AuditService = require('./AuditService').default;
              AuditService.logTransactionSync(remote.transaction_id, {
                displayId: remote.display_id,
                customerId: remote.customer_id,
                syncType: 'INCREMENTAL_SYNC',
                syncDirection: 'DOWNLOAD',
                syncAction: 'CREATED',
                transactionType: remote.type,
                amount: remote.amount,
              }).catch(err => console.log("Audit error:", err.message));
            } else {
              console.log(`  ⚠️ Skipping transaction: customer not found locally`);
            }
          } else {
            console.log(`  ⏭️ Transaction ${remote.display_id} already exists`);
          }
        } catch (error) {
          console.error(`  ❌ Failed to merge transaction:`, error.message);
        }
      }

      // ✅ OPTIMIZATION 3: Only recompute balances for affected customers
      if (affectedCustomers.size > 0) {
        console.log(`🔄 [INCREMENTAL-SYNC] Recomputing ${affectedCustomers.size} affected customer balances...`);
        for (const customerId of affectedCustomers) {
          try {
            await DatabaseService.recomputeRunningBalances(customerId);
            console.log(`  ✅ Recomputed balance for customer: ${customerId.substring(0, 8)}...`);
          } catch (error) {
            console.warn(`  ⚠️ Failed to recompute:`, error.message);
          }
        }
      } else {
        console.log("✅ [INCREMENTAL-SYNC] No balance recomputation needed");
      }
    }

    // Update last sync time
    await SQLiteService.setLastSyncTime(new Date().toISOString());

    // Trigger UI refresh callback
    if (this.onSyncCompleteCallback) {
      console.log("📱 [INCREMENTAL-SYNC] Triggering UI refresh...");
      await this.onSyncCompleteCallback();
    }

    console.log("✅ [INCREMENTAL-SYNC] Completed successfully!");
    return { success: true };

  } catch (error) {
    console.error("❌ [INCREMENTAL-SYNC] Error:", error);
    return { success: false, error: error.message };
  }
}

  // Use same error suppression pattern in rest of sync methods (syncSingleCustomer, syncSingleTransaction, deleteSingleCustomer)

  async syncSingleCustomer(customerData, syncType = 'FULL_SYNC') {
    const user = await this.getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const customerId = customerData.customerId || customerData["Customer ID"];
    const displayId = customerData.displayId || customerData["Display ID"] || null;

    const { error } = await supabase.from("customers").upsert(
      {
        user_id: user.id,
        customer_id: customerId,
        display_id: displayId,
        customer_name: customerData.customerName || customerData["Customer Name"],
        phone_number: customerData.phoneNumber || customerData["Phone Number"] || null,
        address: customerData.address || customerData["Address"] || null,
        total_balance: customerData.totalBalance || customerData["Total Balance"] || 0,
        synced_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,customer_id",
      }
    );
    if (error) {
      if (error.message?.includes("Not authenticated")) {
        console.log("syncSingleCustomer: user signed out, suppressing error");
        return { success: false, error: "Sync aborted due to sign-out" };
      }
      return { success: false, error: error.message };
    }

    // Log customer sync audit
    const AuditService = require('./AuditService').default;
    AuditService.logCustomerSync(customerId, {
      displayId,
      syncType,
      syncDirection: 'UPLOAD',
      syncAction: 'CREATED',
    }).catch(err => console.log("Audit error:", err.message));

    return { success: true };
  }

  async syncSingleTransaction(transactionData, syncType = 'FULL_SYNC') {
    const user = await this.getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const transactionId = transactionData.transactionId || transactionData["Transaction ID"];
    const displayId = transactionData.displayId || transactionData["Display ID"] || null;
    const customerId = transactionData.customerId || transactionData["Customer ID"];
    const txnType = transactionData.type || transactionData.Type;
    const amount = transactionData.amount || transactionData.Amount;

    let balanceAfterTxn = 0;
    if (
      transactionData.balanceAfterTxn !== undefined &&
      transactionData.balanceAfterTxn !== null
    ) {
      balanceAfterTxn = Number(transactionData.balanceAfterTxn);
    } else if (
      transactionData["Balance After Transaction"] !== undefined &&
      transactionData["Balance After Transaction"] !== null
    ) {
      balanceAfterTxn = Number(transactionData["Balance After Transaction"]);
    }
    if (isNaN(balanceAfterTxn)) balanceAfterTxn = 0;

    const { error } = await supabase.from("transactions").upsert(
      {
        user_id: user.id,
        transaction_id: transactionId,
        display_id: displayId,
        customer_id: customerId,
        date: transactionData.date || transactionData.Date,
        type: txnType,
        amount: amount,
        note: transactionData.note || transactionData.Note || null,
        photo_url: transactionData.photo || transactionData.Photo || null,
        balance_after_txn: balanceAfterTxn,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "user_id,transaction_id" }
    );
    if (error) {
      if (error.message?.includes("Not authenticated")) {
        console.log("syncSingleTransaction: user signed out, suppressing error");
        return { success: false, error: "Sync aborted due to sign-out" };
      }
      return { success: false, error: error.message };
    }

    // Log transaction sync audit
    const AuditService = require('./AuditService').default;
    AuditService.logTransactionSync(transactionId, {
      displayId,
      customerId,
      syncType,
      syncDirection: 'UPLOAD',
      syncAction: 'CREATED',
      transactionType: txnType,
      amount,
    }).catch(err => console.log("Audit error:", err.message));

    return { success: true };
  }

  async deleteSingleCustomer(customerId) {
    const user = await this.getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated" };

    console.log(`🗑️ Deleting customer ${customerId} from Supabase...`);

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

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("user_id", user.id)
      .eq("customer_id", customerId);

    if (error) {
      if (error.message?.includes("Not authenticated")) {
        console.log("deleteSingleCustomer: user signed out, suppressing error");
        return { success: false, error: "Sync aborted due to sign-out" };
      }
      return { success: false, error: error.message };
    }

    console.log("✅ Customer deleted from Supabase");
    return { success: true };
  }

  async getSubscription(userId) {
    try {
      const { data, error } = await supabase.from("users_subscription").select("*").eq("user_id", userId).single();
      if (error) {
        console.log("ℹ️ No subscription found, treating as free tier");
        return { plan_type: "free" };
      }
      return data;
    } catch (error) {
      console.error("Error getting subscription:", error);
      return { plan_type: "free" };
    }
  }

  async checkSubscriptionStatus(userId) {
    try {
      const subscription = await this.getSubscription(userId);
      if (!subscription || !subscription.plan_type) {
        console.log("❌ No subscription found");
        return false;
      }
      if (subscription.is_lifetime) {
        console.log("✅ Lifetime subscription active");
        return true;
      }
      if (!subscription.subscription_end_date) {
        console.log("❌ No subscription end date");
        return false;
      }
      const endDate = new Date(subscription.subscription_end_date);
      const now = new Date();
      const isValid = endDate > now;
      if (isValid) console.log(`✅ Subscription active until ${endDate.toDateString()}`);
      else console.log(`❌ Subscription expired on ${endDate.toDateString()}`);
      return isValid;
    } catch (error) {
      console.error("Error checking subscription:", error);
      return false;
    }
  }

  async syncCustomers(syncType = 'FULL_SYNC') {
    const stats = {
      uploaded: 0,
      downloaded: 0,
      merged: 0,
      duplicates: 0,
      duplicatesResolved: 0,
    };

    const AuditService = require('./AuditService').default;

    try {
      if (!await this.isUserAuthenticated()) {
        return { success: false, error: "Not authenticated", ...stats };
      }

      const user = await this.getCurrentUser();
      if (!user) {
        return { success: false, error: "Not authenticated", ...stats };
      }

      if (!await this.checkOnlineStatus()) {
        return { success: false, error: "No internet connection", ...stats };
      }

      console.log("=== SYNCING CUSTOMERS ===");
      console.log("Step 1: Loading local customers from database...");
      const localCustomers = await DatabaseService.db.getAllAsync("SELECT * FROM customers ORDER BY created_at DESC");
      console.log(`Found ${localCustomers.length} local customers`);

      console.log("Step 2: Detecting duplicates in cloud...");
      const customerIdMapping = new Map();
      const customersToUpload = [];

      for (const customer of localCustomers) {
        if (!await this.isUserAuthenticated()) {
          return { success: false, error: "Sync aborted due to sign-out" };
        }
        try {
          const phoneNumber = customer.phone_number;
          const localCustomerId = customer.customer_id;
          const customerName = customer.customer_name;

          if (!phoneNumber || phoneNumber.trim() === "") {
            console.log(`  ⚠️ Customer ${customerName} has no phone, will upload`);
            customersToUpload.push(customer);
            continue;
          }

          const { data: existingCustomers, error: searchError } = await supabase
            .from("customers")
            .select("customer_id, customer_name, display_id, phone_number, address")
            .eq("user_id", user.id)
            .eq("phone_number", phoneNumber);

          if (searchError) {
            return { success: false, error: searchError.message };
          }

          if (existingCustomers && existingCustomers.length > 0) {
            const existingCustomer = existingCustomers[0];

            if (existingCustomer.customer_id === localCustomerId) {
              console.log(`  ✅ Customer ${customerName} already synced to cloud, skipping`);
              continue;
            }

            console.log(`  📞 REAL DUPLICATE DETECTED: ${customerName} (${phoneNumber})`);
            console.log(`     Local ID:  ${localCustomerId.substring(0, 8)}...`);
            console.log(`     Cloud ID:  ${existingCustomer.customer_id.substring(0, 8)}...`);

            customerIdMapping.set(localCustomerId, existingCustomer.customer_id);
            stats.duplicates++;

            // Log duplicate merge audit
            AuditService.logCustomerSync(localCustomerId, {
              displayId: customer.display_id,
              syncType,
              syncDirection: 'MERGE',
              syncAction: 'UPDATED',
              isDuplicate: true,
              mergedWithId: existingCustomer.customer_id,
            }).catch(err => console.log("Audit error:", err.message));

            const localCloudCustomer = await DatabaseService.db.getFirstAsync(
              "SELECT customer_id FROM customers WHERE customer_id = ?",
              [existingCustomer.customer_id]
            );
            if (!localCloudCustomer) {
              console.log(`     ⚙️ Adding cloud customer to local DB first...`);
              try {
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
              } catch (insertError) {
                console.error(`     ❌ Failed to add cloud customer:`, insertError.message);
              }
            }

            console.log(`     ⚙️ Remapping local transactions...`);
            try {
              const txnResult = await DatabaseService.db.runAsync(
                `UPDATE transactions SET customer_id = ? WHERE customer_id = ?`,
                [existingCustomer.customer_id, localCustomerId]
              );
              console.log(`     ✅ Updated ${txnResult.changes} transaction(s)`);
            } catch (updateError) {
              console.error(`     ❌ Failed to update transactions:`, updateError.message);
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
            console.log(`  ✅ Unique customer: ${customerName} (${phoneNumber})`);
            customersToUpload.push(customer);
          }
        } catch (error) {
          console.error(`  ❌ Error processing customer:`, error);
          return { success: false, error: error.message, ...stats };
        }
      }

      stats.duplicatesResolved = customerIdMapping.size;
      stats.merged = customerIdMapping.size;

      if (customerIdMapping.size > 0) {
        console.log(`\n📊 REMAPPING SUMMARY:`);
        console.log(`   ${customerIdMapping.size} duplicate customer(s) detected and remapped`);
      }

      console.log(`\nStep 3: Uploading ${customersToUpload.length} unique customers to cloud...`);
      for (const customer of customersToUpload) {
        if (!await this.isUserAuthenticated()) {
          return { success: false, error: "Sync aborted due to sign-out" };
        }
        try {
          console.log(`  📤 Uploading: ${customer.customer_name}`);
          const res = await this.syncSingleCustomer({
            customerId: customer.customer_id,
            displayId: customer.display_id,
            customerName: customer.customer_name,
            phoneNumber: customer.phone_number,
            address: customer.address,
            totalBalance: customer.total_balance,
          }, syncType);
          if (!res.success) return { ...res, ...stats };
          stats.uploaded++;
          console.log(`  ✅ Uploaded successfully`);
        } catch (error) {
          console.error(`  ❌ Failed to upload:`, error.message);
          return { success: false, error: error.message, ...stats };
        }
      }

      if (customerIdMapping.size > 0) {
        console.log(`\nStep 4: Fixing transaction customer_ids in cloud...`);
        for (const [oldId, newId] of customerIdMapping.entries()) {
          if (!await this.isUserAuthenticated()) {
            return { success: false, error: "Sync aborted due to sign-out" };
          }
          try {
            console.log(`  🔄 Updating cloud transactions: ${oldId.substring(0, 8)} → ${newId.substring(0, 8)}`);

            const { error: updateError } = await supabase
              .from("transactions")
              .update({ customer_id: newId })
              .eq("user_id", user.id)
              .eq("customer_id", oldId);

            if (updateError) console.error(`  ❌ Failed to update transactions in cloud:`, updateError);
            else console.log(`  ✅ Updated transactions in cloud`);

            console.log(`  🗑️ Deleting old duplicate ${oldId.substring(0, 8)} from cloud...`);
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
            if (error.message?.includes("Not authenticated")) {
              return { success: false, error: "Sync aborted due to sign-out" };
            }
            console.error(`  ❌ Error:`, error.message);
            return { success: false, error: error.message };
          }
        }
      }

      console.log("\nStep 5: Downloading customers from cloud...");
      if (!await this.isUserAuthenticated()) {
        return { success: false, error: "Sync aborted due to sign-out" };
      }
      const { data: remoteCustomers, error: fetchError } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id);

      if (fetchError) {
        console.error("Fetch error:", fetchError);
        return { success: false, error: fetchError.message, ...stats };
      }

      console.log(`Found ${remoteCustomers?.length || 0} customers in cloud`);

      const currentLocalCustomers = await DatabaseService.db.getAllAsync("SELECT customer_id FROM customers");
      const localCustomerIds = new Set(currentLocalCustomers.map((c) => c.customer_id));
      console.log(`Currently have ${localCustomerIds.size} customers in local DB`);

      console.log("\nStep 6: Merging cloud customers into local database...");
      for (const remote of remoteCustomers || []) {
        if (!await this.isUserAuthenticated()) {
          return { success: false, error: "Sync aborted due to sign-out" };
        }
        if (!localCustomerIds.has(remote.customer_id)) {
          try {
            console.log(`  📥 Adding from cloud: ${remote.customer_name}`);
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
            stats.downloaded++;
            console.log(`  ✅ Added successfully`);

            // Log customer download audit
            AuditService.logCustomerSync(remote.customer_id, {
              displayId: remote.display_id,
              syncType,
              syncDirection: 'DOWNLOAD',
              syncAction: 'CREATED',
            }).catch(err => console.log("Audit error:", err.message));
          } catch (custError) {
            if (custError.message?.includes("UNIQUE") || custError.message.includes("PRIMARY KEY")) {
              console.log(`  ⚠️ Already exists, skipping`);
            } else {
              console.error(`  ❌ Failed:`, custError.message);
              return { success: false, error: custError.message, ...stats };
            }
          }
        }
      }

      console.log("\nStep 7: Recomputing all customer balances...");
      try {
        const allLocalCustomers = await DatabaseService.db.getAllAsync("SELECT customer_id FROM customers");
        for (const customer of allLocalCustomers) {
          try {
            await DatabaseService.recomputeRunningBalances(customer.customer_id);
          } catch (error) {
            console.warn(`  ⚠️ Failed to recompute balance for ${customer.customer_id}:`, error.message);
          }
        }

        console.log("Uploading updated customer balances to cloud...");
        const customersWithBalances = await DatabaseService.db.getAllAsync(
          "SELECT customer_id, total_balance FROM customers"
        );
        for (const cust of customersWithBalances) {
          try {
            await supabase
              .from("customers")
              .update({ total_balance: cust.total_balance })
              .eq("user_id", user.id)
              .eq("customer_id", cust.customer_id);
          } catch {
            // ignore errors here
          }
        }
        console.log("✅ Customer balances synced");
      } catch (error) {
        console.error("Error recomputing balances:", error);
        return { success: false, error: error.message, ...stats };
      }

      console.log("\n=== ✅ CUSTOMERS SYNCED SUCCESSFULLY ===\n");
      return { success: true, ...stats };
    } catch (error) {
      if (error.message?.includes("Not authenticated")) {
        return { success: false, error: "Sync aborted due to sign-out", ...stats };
      }
      console.error("Customer sync error:", error);
      return { success: false, error: error.message, ...stats };
    }
  }

  async syncTransactions(syncType = 'FULL_SYNC') {
    const stats = {
      uploaded: 0,
      downloaded: 0,
    };

    const AuditService = require('./AuditService').default;

    try {
      if (!await this.isUserAuthenticated()) {
        return { success: false, error: "Not authenticated", ...stats };
      }

      const user = await this.getCurrentUser();
      if (!user) {
        return { success: false, error: "Not authenticated", ...stats };
      }

      if (!await this.checkOnlineStatus()) {
        return { success: false, error: "No internet connection", ...stats };
      }

      console.log("=== SYNCING TRANSACTIONS ===");

      console.log("Step 1: Loading local transactions from database...");
      const localTransactions = await DatabaseService.db.getAllAsync(
        "SELECT * FROM transactions ORDER BY date ASC, created_at ASC"
      );
      console.log(`Found ${localTransactions.length} local transactions`);

      console.log("Step 2: Uploading transactions to cloud...");
      for (const txn of localTransactions) {
        if (!await this.isUserAuthenticated()) {
          return { success: false, error: "Sync aborted due to sign-out" };
        }
        try {
          const res = await this.syncSingleTransaction({
            transactionId: txn.transaction_id,
            displayId: txn.display_id,
            customerId: txn.customer_id,
            date: txn.date,
            type: txn.type,
            amount: txn.amount,
            note: txn.note,
            photo: txn.photo,
            balanceAfterTxn: txn.balance_after_txn,
          }, syncType);
          if (!res.success) return { ...res, ...stats };
          stats.uploaded++;
        } catch (error) {
          if (error.message?.includes("Not authenticated")) {
            return { success: false, error: "Sync aborted due to sign-out", ...stats };
          }
          console.error(`Failed to upload transaction ${txn.display_id}:`, error);
          return { success: false, error: error.message, ...stats };
        }
      }

      console.log("\nStep 3: Downloading transactions from cloud...");
      if (!await this.isUserAuthenticated()) {
        return { success: false, error: "Sync aborted due to sign-out" };
      }
      const { data: remoteTransactions, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: true });

      if (fetchError) {
        console.error("Fetch error:", fetchError);
        return { success: false, error: fetchError.message, ...stats };
      }

      console.log(`Found ${remoteTransactions?.length || 0} transactions in cloud`);

      const localTxnIds = new Set(localTransactions.map((t) => t.transaction_id));
      const localCustomers = await DatabaseService.db.getAllAsync("SELECT customer_id FROM customers");
      const localCustomerIds = new Set(localCustomers.map((c) => c.customer_id));

      console.log("\nStep 4: Merging cloud transactions into local...");
      let addedCount = 0;
      let skippedCount = 0;

      for (const remote of remoteTransactions || []) {
        if (!await this.isUserAuthenticated()) {
          return { success: false, error: "Sync aborted due to sign-out" };
        }
        if (localTxnIds.has(remote.transaction_id)) {
          skippedCount++;
          continue;
        }
        if (!localCustomerIds.has(remote.customer_id)) {
          console.log(`  ⚠️ Skipping transaction ${remote.transaction_id.substring(0, 8)}: Customer not found locally`);
          continue;
        }
        try {
          await DatabaseService.db.runAsync(
            `INSERT INTO transactions (transaction_id, display_id, customer_id, date, type, amount, note, photo, balance_after_txn, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [
              remote.transaction_id,
              remote.display_id,
              remote.customer_id,
              remote.date,
              remote.type,
              remote.amount,
              remote.note || "",
              remote.photo_url || null,
              remote.balance_after_txn ?? 0,
            ]
          );
          addedCount++;
          stats.downloaded++;
          localTxnIds.add(remote.transaction_id);

          // Log transaction download audit
          AuditService.logTransactionSync(remote.transaction_id, {
            displayId: remote.display_id,
            customerId: remote.customer_id,
            syncType,
            syncDirection: 'DOWNLOAD',
            syncAction: 'CREATED',
            transactionType: remote.type,
            amount: remote.amount,
          }).catch(err => console.log("Audit error:", err.message));
        } catch (txnError) {
          if (!txnError.message.includes("UNIQUE")) {
            console.error(`Failed to insert transaction ${remote.transaction_id}:`, txnError.message);
            return { success: false, error: txnError.message, ...stats };
          }
          skippedCount++;
        }
      }

      console.log(`\n📊 Merge Summary: Added ${addedCount}, Skipped ${skippedCount} (already exists)`);

      console.log("\nStep 5: Recomputing balances...");
      const affectedCustomers = new Set();
      remoteTransactions?.forEach((t) => {
        if (t.customer_id) affectedCustomers.add(t.customer_id);
      });

      for (const customerId of affectedCustomers) {
        if (localCustomerIds.has(customerId)) {
          try {
            await DatabaseService.recomputeRunningBalances(customerId);
          } catch (error) {
            console.warn(`Failed to recompute balance for customer ${customerId}:`, error.message);
          }
        }
      }

      await SQLiteService.setLastSyncTime(new Date().toISOString());

      console.log("\n=== ✅ TRANSACTIONS SYNCED SUCCESSFULLY ===\n");
      return { success: true, ...stats };
    } catch (error) {
      if (error.message?.includes("Not authenticated")) {
        return { success: false, error: "Sync aborted due to sign-out", ...stats };
      }
      console.error("Transaction sync error:", error);
      return { success: false, error: error.message, ...stats };
    }
  }

  async fullSync(syncType = 'FULL_SYNC') {
    if (this.isSyncing) {
      console.log("Sync already in progress, skipping...");
      return { success: false, error: "Sync already in progress" };
    }

    this.isSyncing = true;
    const startTime = new Date();
    const syncStats = {
      customers_uploaded: 0,
      customers_downloaded: 0,
      customers_merged: 0,
      transactions_uploaded: 0,
      transactions_downloaded: 0,
      duplicates_detected: 0,
      duplicates_resolved: 0,
    };

    try {
      console.log("\nStarting full sync...");

      if (!await this.checkOnlineStatus()) {
        this.isSyncing = false;
        return { success: false, error: "No internet connection" };
      }

      if (!await this.isUserAuthenticated()) {
        this.isSyncing = false;
        return { success: false, error: "Not authenticated" };
      }

      const user = await this.getCurrentUser();
      const isSubscribed = await this.checkSubscriptionStatus(user?.id);
      if (!isSubscribed) {
        this.isSyncing = false;
        return {
          success: false,
          error: "Subscription expired. Cloud sync is disabled.",
          showRenewalPrompt: true,
        };
      }

      const customerResult = await this.syncCustomers(syncType);
      if (!customerResult.success) {
        this.isSyncing = false;
        if (customerResult.error === "Sync aborted due to sign-out") {
          console.log("Full sync aborted due to sign-out");
          return customerResult;
        }
        throw new Error(customerResult.error);
      }
      syncStats.customers_uploaded = customerResult.uploaded || 0;
      syncStats.customers_downloaded = customerResult.downloaded || 0;
      syncStats.customers_merged = customerResult.merged || 0;
      syncStats.duplicates_detected = customerResult.duplicates || 0;
      syncStats.duplicates_resolved = customerResult.duplicatesResolved || 0;

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const transactionResult = await this.syncTransactions(syncType);
      if (!transactionResult.success) {
        this.isSyncing = false;
        if (transactionResult.error === "Sync aborted due to sign-out") {
          console.log("Full sync aborted due to sign-out");
          return transactionResult;
        }
        throw new Error(transactionResult.error);
      }
      syncStats.transactions_uploaded = transactionResult.uploaded || 0;
      syncStats.transactions_downloaded = transactionResult.downloaded || 0;

      SQLiteService.clearCache();

      if (this.onSyncCompleteCallback) {
        try {
          await this.onSyncCompleteCallback();
        } catch (callbackError) {
          console.error("UI callback error:", callbackError.message);
        }
      }

      this.isSyncing = false;
      console.log("Full sync completed successfully");

      return { success: true, message: "Sync completed successfully!" };
    } catch (error) {
      this.isSyncing = false;

      if (error.message?.includes("Not authenticated") || error.message?.includes("Sync aborted due to sign-out")) {
        console.log("Full sync aborted due to sign-out, suppressing error");
        return { success: false, error: "Sync aborted due to sign-out" };
      }
      console.error("Full sync error:", error);
      return { success: false, error: error.message };
    }
  }

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

      return await this.fullSync('MANUAL_SYNC');
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new SupabaseService();
