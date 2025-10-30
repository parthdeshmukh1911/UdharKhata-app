import { Alert } from "react-native";
import DatabaseService from "./DatabaseService";
import Config from "../config";

const BASE_URL = Config.WEB_APP_URL;

class SyncService {
  constructor() {
    this.isSyncing = false;
    // Reset any stuck sync state on app start
    this.resetSyncState();
  }

  async resetSyncState() {
    try {
      await DatabaseService.updateSyncStatus(null, false);
    } catch (error) {
      console.log("Could not reset sync state:", error.message);
    }
  }

  async syncToGoogleSheets() {
    if (this.isSyncing) {
      return { success: false, error: "Sync already in progress" };
    }

    try {
      this.isSyncing = true;
      console.log("Starting sync to Google Sheets...");
      await DatabaseService.updateSyncStatus(null, false); // Set sync in progress

      // Check for ID conflicts before sync
      // const conflictCheck = await this.checkForIdConflicts();
      // if (!conflictCheck.success) {
      //   throw new Error(conflictCheck.error);
      // }

      // Get all data from SQLite
      console.log("Fetching data from SQLite...");
      const [customers, transactions] = await Promise.all([
        DatabaseService.getCustomers(),
        DatabaseService.getTransactions({ forSync: true }),
      ]);
      console.log(
        `Found ${customers.length} customers, ${transactions.length} transactions`
      );

      // Sync customers first
      console.log("Syncing customers...");
      const customerSyncResult = await this.syncCustomers(customers);
      console.log("Customer sync result:", customerSyncResult);
      if (!customerSyncResult.success) {
        throw new Error(customerSyncResult.error);
      }

      // Then sync transactions
      console.log("Syncing transactions...");
      const transactionSyncResult = await this.syncTransactions(transactions);
      console.log("Transaction sync result:", transactionSyncResult);
      if (!transactionSyncResult.success) {
        throw new Error(transactionSyncResult.error);
      }

      // Update sync status
      const now = new Date().toISOString();
      await DatabaseService.updateSyncStatus(now, true);
      console.log("Sync completed successfully");

      return {
        success: true,
        message: `Synced ${customers.length} customers and ${transactions.length} transactions`,
        timestamp: now,
      };
    } catch (error) {
      console.error("Sync error:", error);
      await DatabaseService.updateSyncStatus(null, false); // Clear sync in progress
      return {
        success: false,
        error: error.message || "Sync failed",
      };
    } finally {
      this.isSyncing = false;
    }
  }

  async syncCustomers(customers) {
    try {
      console.log("Sending customers to:", BASE_URL);
      console.log("Customer data sample:", customers[0]);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "syncCustomers",
          data: customers,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("Response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Sync customers response:", result);
      return result;
    } catch (error) {
      console.error("Customer sync error:", error);
      return {
        success: false,
        error: `Failed to sync customers: ${error.message}`,
      };
    }
  }

  async syncTransactions(transactions) {
    try {
      console.log("Sending transactions to:", BASE_URL);
      console.log("Transaction data sample:", transactions[0]);

      // Sort transactions by ID (ascending) before syncing
      const sortedTransactions = transactions.sort((a, b) => {
        const idA = parseInt(a["Transaction ID"].replace("TXN", ""));
        const idB = parseInt(b["Transaction ID"].replace("TXN", ""));
        return idA - idB;
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "syncTransactions",
          data: sortedTransactions,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("Response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Sync transactions response:", result);
      return result;
    } catch (error) {
      console.error("Transaction sync error:", error);
      return {
        success: false,
        error: `Failed to sync transactions: ${error.message}`,
      };
    }
  }

  async checkSyncStatus() {
    try {
      const status = await DatabaseService.getSyncStatus();
      return {
        lastSyncTime: status.last_sync_time,
        pendingChanges: status.pending_changes,
        syncInProgress: status.sync_in_progress === 1,
      };
    } catch (error) {
      console.error("Check sync status error:", error);
      return {
        lastSyncTime: null,
        pendingChanges: 0,
        syncInProgress: false,
      };
    }
  }

  async getLastSyncTime() {
    const status = await this.checkSyncStatus();
    return status.lastSyncTime;
  }

  async hasPendingChanges() {
    const status = await this.checkSyncStatus();
    return status.pendingChanges > 0;
  }

  formatSyncTime(timestamp) {
    if (!timestamp) return "Never";

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return date.toLocaleDateString();
  }

  async importFromGoogleSheets() {
    if (this.isSyncing) {
      return { success: false, error: "Sync already in progress" };
    }

    try {
      this.isSyncing = true;
      await DatabaseService.updateSyncStatus(null, false); // Set sync in progress

      // Get data from Google Sheets
      const [customersResponse, transactionsResponse] = await Promise.all([
        fetch(`${BASE_URL}?action=getCustomers`),
        fetch(`${BASE_URL}?action=getTransactions`),
      ]);

      if (!customersResponse.ok || !transactionsResponse.ok) {
        throw new Error("Failed to fetch data from Google Sheets");
      }

      const customers = await customersResponse.json();
      const transactions = await transactionsResponse.json();

      // Validate data
      if (!Array.isArray(customers) || !Array.isArray(transactions)) {
        throw new Error("Invalid data format from Google Sheets");
      }

      // Clear local database
      await DatabaseService.db.execAsync("DELETE FROM transactions");
      await DatabaseService.db.execAsync("DELETE FROM customers");

      // Import customers
      for (const customer of customers) {
        if (customer["Customer ID"] && customer["Customer Name"]) {
          await DatabaseService.db.runAsync(
            "INSERT INTO customers (customer_id, customer_name, phone_number, address, total_balance) VALUES (?, ?, ?, ?, ?)",
            [
              customer["Customer ID"],
              customer["Customer Name"],
              customer["Phone Number"] || "",
              customer["Address"] || "",
              customer["Total Balance"] || 0,
            ]
          );
        }
      }

      // Import transactions (sorted by ID)
      const sortedTransactions = transactions.sort((a, b) => {
        const idA = parseInt(a["Transaction ID"].replace("TXN", ""));
        const idB = parseInt(b["Transaction ID"].replace("TXN", ""));
        return idA - idB;
      });

      for (const txn of sortedTransactions) {
        if (txn["Transaction ID"] && txn["Customer ID"]) {
          await DatabaseService.db.runAsync(
            "INSERT INTO transactions (transaction_id, customer_id, date, type, amount, note, balance_after_txn) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
              txn["Transaction ID"],
              txn["Customer ID"],
              txn["Date"],
              txn["Type"],
              txn["Amount"] || 0,
              txn["Note"] || "",
              txn["Balance After Transaction"] || 0,
            ]
          );
        }
      }

      // Recalculate customer balances after import
      await this.recalculateCustomerBalances();

      // Reset sync status
      const now = new Date().toISOString();
      await DatabaseService.updateSyncStatus(now, true);

      return {
        success: true,
        message: `Imported ${customers.length} customers and ${transactions.length} transactions`,
        timestamp: now,
      };
    } catch (error) {
      console.error("Import error:", error);
      await DatabaseService.updateSyncStatus(null, false); // Clear sync in progress
      return {
        success: false,
        error: error.message || "Import failed",
      };
    } finally {
      this.isSyncing = false;
    }
  }

  async recalculateCustomerBalances() {
    try {
      // Get all customers
      const customers = await DatabaseService.db.getAllAsync(
        "SELECT customer_id FROM customers"
      );

      for (const customer of customers) {
        // Calculate balance from transactions
        const credits = await DatabaseService.db.getFirstAsync(
          'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE customer_id = ? AND type = "CREDIT"',
          [customer.customer_id]
        );

        const payments = await DatabaseService.db.getFirstAsync(
          'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE customer_id = ? AND type = "PAYMENT"',
          [customer.customer_id]
        );

        const balance = (credits?.total || 0) - (payments?.total || 0);

        // Update customer balance
        await DatabaseService.db.runAsync(
          "UPDATE customers SET total_balance = ? WHERE customer_id = ?",
          [balance, customer.customer_id]
        );
      }

      console.log("Customer balances recalculated successfully");
    } catch (error) {
      console.error("Error recalculating customer balances:", error);
    }
  }
}

export default new SyncService();
