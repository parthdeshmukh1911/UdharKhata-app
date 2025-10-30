// src/services/DatabaseService.js
import "react-native-get-random-values";
import * as SQLite from "expo-sqlite";
import { ulid } from "ulid";
import HybridIdGenerator from "../Utils/HybridIdGenerator";

class DatabaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.initPromise = null;
  }

  async init() {
    if (this.isInitialized && this.db) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInit();
    return this.initPromise;
  }

  async _doInit() {
    try {
      console.log("Initializing database...");

      if (this.db) {
        try {
          await this.db.closeAsync();
        } catch (e) {
          console.log("Error closing existing db:", e.message);
        }
      }

      this.db = await SQLite.openDatabaseAsync("khatabook.db");

      if (!this.db) {
        throw new Error("Failed to open database");
      }

      // Ensure foreign keys enabled early
      try {
        await this.db.execAsync("PRAGMA foreign_keys = ON;");
      } catch (e) {
        console.warn("Could not set PRAGMA foreign_keys ON:", e.message);
      }

      console.log("Database opened, creating tables...");
      await this.createTables();

      // Migrate existing database
      await this.migrateDatabase();

      this.isInitialized = true;
      this.initPromise = null;
      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Database initialization error:", error);
      this.isInitialized = false;
      this.db = null;
      this.initPromise = null;
      throw error;
    }
  }

  async createTables() {
    try {
      console.log("Creating customers table...");
      const customersTable = `
      CREATE TABLE IF NOT EXISTS customers (
        customer_id TEXT PRIMARY KEY,
        display_id TEXT UNIQUE,
        customer_name TEXT NOT NULL,
        phone_number TEXT,
        address TEXT,
        total_balance REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
      await this.db.execAsync(customersTable);

      // ✅ ONLY create index if column exists (for fresh installs)
      try {
        await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_customers_display_id 
        ON customers(display_id);
      `);
        console.log("Created index on customers.display_id");
      } catch (indexError) {
        // Column doesn't exist yet - will be added by migration
        console.log(
          "Index creation skipped - display_id column will be added by migration"
        );
      }

      console.log("Creating transactions table...");
      const transactionsTable = `
      CREATE TABLE IF NOT EXISTS transactions (
        transaction_id TEXT PRIMARY KEY,
        display_id TEXT UNIQUE,
        customer_id TEXT NOT NULL,
        date TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('CREDIT', 'PAYMENT')),
        amount REAL NOT NULL,
        note TEXT,
        photo TEXT,
        balance_after_txn REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (customer_id) ON DELETE CASCADE
      );
    `;
      await this.db.execAsync(transactionsTable);

      // ✅ ONLY create indexes if columns exist
      try {
        await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_transactions_display_id 
        ON transactions(display_id);
        
        CREATE INDEX IF NOT EXISTS idx_transactions_customer_id 
        ON transactions(customer_id);
      `);
        console.log("Created indexes on transactions");
      } catch (indexError) {
        // Columns don't exist yet - will be added by migration
        console.log(
          "Transaction indexes skipped - columns will be added by migration"
        );
      }

      console.log("Creating sync_status table...");
      const syncStatusTable = `
      CREATE TABLE IF NOT EXISTS sync_status (
        id INTEGER PRIMARY KEY,
        last_sync_time DATETIME,
        pending_changes INTEGER DEFAULT 0,
        sync_in_progress INTEGER DEFAULT 0
      );
    `;
      await this.db.execAsync(syncStatusTable);

      // Initialize sync status if not exists
      console.log("Checking sync status...");
      const syncExists = await this.db.getFirstAsync(
        "SELECT * FROM sync_status WHERE id = 1"
      );
      if (!syncExists) {
        await this.db.runAsync(
          "INSERT INTO sync_status (id, pending_changes) VALUES (1, 0)"
        );
        console.log("Sync status initialized");
      }
      console.log("All tables created successfully");
    } catch (error) {
      console.error("Error creating tables:", error);
      throw error;
    }
  }

  /**
   * Migrate existing database to add display_id and photo columns
   */
  async migrateDatabase() {
    try {
      console.log("Checking for database migrations...");

      // Check if display_id column exists in customers
      const customerTableInfo = await this.db.getAllAsync(
        "PRAGMA table_info(customers)"
      );

      const hasDisplayIdInCustomers = customerTableInfo.some(
        (column) => column.name === "display_id"
      );

      if (!hasDisplayIdInCustomers) {
        console.log("Adding display_id column to customers table...");
        await this.db.execAsync(
          "ALTER TABLE customers ADD COLUMN display_id TEXT;"
        );
        console.log("Display_id column added to customers");
      }

      // Check if display_id column exists in transactions
      const transactionTableInfo = await this.db.getAllAsync(
        "PRAGMA table_info(transactions)"
      );

      const hasDisplayIdInTransactions = transactionTableInfo.some(
        (column) => column.name === "display_id"
      );

      if (!hasDisplayIdInTransactions) {
        console.log("Adding display_id column to transactions table...");
        await this.db.execAsync(
          "ALTER TABLE transactions ADD COLUMN display_id TEXT;"
        );
        console.log("Display_id column added to transactions");
      }

      // Check if photo column exists
      const hasPhotoColumn = transactionTableInfo.some(
        (column) => column.name === "photo"
      );

      if (!hasPhotoColumn) {
        console.log("Adding photo column to transactions table...");
        await this.db.execAsync(
          "ALTER TABLE transactions ADD COLUMN photo TEXT;"
        );
        console.log("Photo column added successfully");
      }

      console.log("All migrations completed");
    } catch (error) {
      console.error("Migration error:", error);
      // Don't throw error - allow app to continue if migration fails
    }
  }

  /* ---------- GET METHODS ---------- */

  async getCustomers() {
    try {
      await this.init();
      if (!this.db) {
        console.error("Database not initialized");
        return [];
      }
      const result = await this.db.getAllAsync(
        "SELECT * FROM customers ORDER BY customer_name"
      );
      const mapped = result.map((customer) => ({
        "Customer ID": customer.customer_id, // ULID (internal)
        "Display ID": customer.display_id, // Custom (display)
        "Customer Name": customer.customer_name,
        "Phone Number": customer.phone_number,
        Address: customer.address,
        "Total Balance": customer.total_balance,
        "Created At": customer.created_at,
        "Updated At": customer.updated_at,
      }));
      return mapped;
    } catch (error) {
      console.error("DatabaseService getCustomers error:", error);
      return [];
    }
  }

  async getTransactions(params = {}) {
    try {
      await this.init();
      if (!this.db) {
        console.error("Database not initialized in getTransactions");
        return [];
      }

      let query = "SELECT * FROM transactions";
      let conditions = [];

      if (params.customerId) {
        conditions.push(`customer_id = '${params.customerId}'`);
      }
      if (params.startDate) {
        conditions.push(`date >= '${params.startDate}'`);
      }
      if (params.endDate) {
        conditions.push(`date <= '${params.endDate}'`);
      }
      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      query += " ORDER BY date DESC, created_at DESC";

      const result = await this.db.getAllAsync(query);

      return result.map((txn) => ({
        "Transaction ID": txn.transaction_id, // ULID
        "Display ID": txn.display_id, // Custom
        "Customer ID": txn.customer_id,
        Date: txn.date,
        Type: txn.type,
        Amount: txn.amount,
        Note: txn.note,
        Photo: txn.photo,
        "Balance After Transaction": txn.balance_after_txn,
      }));
    } catch (error) {
      console.error("DatabaseService getTransactions error:", error);
      return [];
    }
  }

  async getTransactionById(transactionId) {
    try {
      await this.init();
      if (!this.db) {
        console.error("Database not initialized");
        return null;
      }

      const result = await this.db.getFirstAsync(
        "SELECT * FROM transactions WHERE transaction_id = ?",
        [transactionId]
      );

      if (!result) return null;

      return {
        "Transaction ID": result.transaction_id,
        "Display ID": result.display_id,
        "Customer ID": result.customer_id,
        Date: result.date,
        Type: result.type,
        Amount: result.amount,
        Note: result.note,
        Photo: result.photo,
        "Balance After Transaction": result.balance_after_txn,
      };
    } catch (error) {
      console.error("DatabaseService getTransactionById error:", error);
      return null;
    }
  }

  async getSummary() {
    await this.init();

    const totalCredit = await this.db.getFirstAsync(
      'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = "CREDIT"'
    );

    const totalPayments = await this.db.getFirstAsync(
      'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = "PAYMENT"'
    );

    const totalOutstanding = await this.db.getFirstAsync(
      "SELECT COALESCE(SUM(total_balance), 0) as total FROM customers WHERE total_balance > 0"
    );

    const customersWithCredit = await this.db.getFirstAsync(
      "SELECT COUNT(*) as count FROM customers WHERE total_balance > 0"
    );

    const fullySettledCustomers = await this.db.getFirstAsync(
      "SELECT COUNT(*) as count FROM customers WHERE total_balance = 0"
    );

    const highestOutstanding = await this.db.getFirstAsync(
      "SELECT COALESCE(MAX(total_balance), 0) as max FROM customers"
    );

    const lowestOutstanding = await this.db.getFirstAsync(
      "SELECT COALESCE(MIN(total_balance), 0) as min FROM customers WHERE total_balance > 0"
    );

    return [
      { Metric: "Total Credit Given", Formula: totalCredit.total },
      { Metric: "Total Payments Received", Formula: totalPayments.total },
      { Metric: "Total Outstanding", Formula: totalOutstanding.total },
      { Metric: "Customers with Credit", Formula: customersWithCredit.count },
      {
        Metric: "Fully Settled Customers",
        Formula: fullySettledCustomers.count,
      },
      { Metric: "Highest Outstanding", Formula: highestOutstanding.max },
      { Metric: "Lowest Outstanding", Formula: lowestOutstanding.min || 0 },
    ];
  }

  /* ---------- ID GENERATION ---------- */

  /**
   * Generate hybrid IDs for customer (ULID + Display ID)
   */
  async generateCustomerId() {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const ids = HybridIdGenerator.generateCustomerIds();

    // Check for display ID collision (rare but possible)
    let displayId = ids.displayId;
    let attempts = 0;

    while (attempts < 10) {
      const exists = await this.db.getFirstAsync(
        "SELECT customer_id FROM customers WHERE display_id = ?",
        [displayId]
      );

      if (!exists) break;

      // Collision detected, regenerate display ID
      console.log(
        `Display ID collision detected: ${displayId}, regenerating...`
      );
      displayId = HybridIdGenerator.generateDisplayId("C");
      attempts++;
    }

    return {
      customerId: ids.customerId, // ULID
      displayId: displayId, // Custom
    };
  }

  /**
   * Generate hybrid IDs for transaction (ULID + Display ID)
   */
  async generateTransactionId() {
    const ids = HybridIdGenerator.generateTransactionIds();

    let displayId = ids.displayId;
    let attempts = 0;

    while (attempts < 10) {
      const exists = await this.db.getFirstAsync(
        "SELECT transaction_id FROM transactions WHERE display_id = ?",
        [displayId]
      );

      if (!exists) break;

      console.log(
        `Transaction display ID collision: ${displayId}, regenerating...`
      );
      displayId = HybridIdGenerator.generateDisplayId("T");
      attempts++;
    }

    return {
      transactionId: ids.transactionId, // ULID
      displayId: displayId, // Custom
    };
  }

  /* ---------- ADD/UPDATE/DELETE METHODS ---------- */

  async addCustomer(data) {
    try {
      await this.init();

      if (!this.db) {
        throw new Error("Database not initialized");
      }

      const ids = await this.generateCustomerId();

      await this.db.runAsync(
        `INSERT INTO customers (customer_id, display_id, customer_name, phone_number, address, total_balance) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          ids.customerId, // ULID
          ids.displayId, // Custom display ID
          data.customerName,
          data.phoneNumber || "",
          data.address || "",
          0,
        ]
      );

      await this.incrementPendingChanges();
      return {
        status: "success",
        customerId: ids.customerId,
        displayId: ids.displayId,
      };
    } catch (error) {
      console.error("Add customer error:", error);
      return { status: "error", message: error.message };
    }
  }

  /**
   * Add customer with specific IDs (for Supabase sync/import)
   */
  async addCustomerWithId(data) {
    try {
      await this.init();

      if (!this.db) {
        throw new Error("Database not initialized");
      }

      const { customerId, displayId, customerName, phoneNumber, address } =
        data;

      // Check if customer already exists
      const existing = await this.db.getFirstAsync(
        "SELECT customer_id FROM customers WHERE customer_id = ?",
        [customerId]
      );

      if (existing) {
        console.log(
          `Customer ${displayId || customerId} already exists, skipping insert`
        );
        return { status: "success", customerId, displayId, skipped: true };
      }

      await this.db.runAsync(
        `INSERT INTO customers (customer_id, display_id, customer_name, phone_number, address, total_balance) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          customerId,
          displayId || null, // Display ID might be null for old data
          customerName,
          phoneNumber || "",
          address || "",
          0,
        ]
      );

      return { status: "success", customerId, displayId };
    } catch (error) {
      console.error("Add customer with ID error:", error);
      throw error;
    }
  }

  async updateCustomer(data) {
    await this.init();

    try {
      await this.db.runAsync(
        "UPDATE customers SET customer_name = ?, phone_number = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE customer_id = ?",
        [
          data.customerName,
          data.phoneNumber || "",
          data.address || "",
          data.customerId,
        ]
      );

      await this.incrementPendingChanges();
      return { status: "success" };
    } catch (error) {
      console.error("Update customer error:", error);
      return { status: "error", message: error.message };
    }
  }

  async addTransaction(data) {
    await this.init();

    try {
      const ids = await this.generateTransactionId();

      await this.db.runAsync(
        `INSERT INTO transactions (transaction_id, display_id, customer_id, date, type, amount, note, photo, balance_after_txn) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ids.transactionId, // ULID
          ids.displayId, // Custom display ID
          data.customerId,
          data.date,
          data.type,
          data.amount,
          data.note || "",
          data.photo || null,
          0,
        ]
      );

      const finalBalance = await this.recomputeRunningBalances(data.customerId);

      await this.incrementPendingChanges();
      return {
        status: "success",
        updatedBalance: finalBalance,
        transactionId: ids.transactionId,
        displayId: ids.displayId,
      };
    } catch (error) {
      console.error("Add transaction error:", error);
      return { status: "error", message: error.message };
    }
  }

  async updateTransaction(data) {
    await this.init();

    try {
      const oldTxn = await this.db.getFirstAsync(
        "SELECT * FROM transactions WHERE transaction_id = ?",
        [data.transactionId]
      );
      if (!oldTxn) throw new Error("Transaction not found");

      await this.db.runAsync(
        "UPDATE transactions SET customer_id = ?, date = ?, type = ?, amount = ?, note = ?, photo = ? WHERE transaction_id = ?",
        [
          data.customerId,
          data.date,
          data.type,
          data.amount,
          data.note || "",
          data.photo || null,
          data.transactionId,
        ]
      );

      await this.recomputeRunningBalances(data.customerId);

      await this.incrementPendingChanges();
      return { status: "success" };
    } catch (error) {
      console.error("Update transaction error:", error);
      return { status: "error", message: error.message };
    }
  }

  async deleteTransaction(transactionId) {
    await this.init();

    try {
      const txn = await this.db.getFirstAsync(
        "SELECT customer_id FROM transactions WHERE transaction_id = ?",
        [transactionId]
      );

      if (!txn) throw new Error("Transaction not found");

      await this.db.runAsync(
        "DELETE FROM transactions WHERE transaction_id = ?",
        [transactionId]
      );

      await this.recomputeRunningBalances(txn.customer_id);

      await this.incrementPendingChanges();
      return { status: "success" };
    } catch (error) {
      console.error("Delete transaction error:", error);
      return { status: "error", message: error.message };
    }
  }

  async recomputeRunningBalances(customerId) {
    await this.init();

    const txns = await this.db.getAllAsync(
      "SELECT transaction_id, type, amount FROM transactions WHERE customer_id = ? ORDER BY date ASC, created_at ASC",
      [customerId]
    );

    let running = 0;
    for (const txn of txns) {
      const amt = Number(txn.amount) || 0;
      if (txn.type === "CREDIT") {
        running += amt;
      } else {
        running -= amt;
      }
      await this.db.runAsync(
        "UPDATE transactions SET balance_after_txn = ? WHERE transaction_id = ?",
        [running, txn.transaction_id]
      );
    }

    await this.db.runAsync(
      "UPDATE customers SET total_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE customer_id = ?",
      [running, customerId]
    );

    return running;
  }

  async incrementPendingChanges() {
    await this.db.runAsync(
      "UPDATE sync_status SET pending_changes = pending_changes + 1 WHERE id = 1"
    );
  }

  async getSyncStatus() {
    await this.init();
    const result = await this.db.getFirstAsync(
      "SELECT * FROM sync_status WHERE id = 1"
    );
    return (
      result || {
        pending_changes: 0,
        last_sync_time: null,
        sync_in_progress: 0,
      }
    );
  }

  async updateSyncStatus(lastSyncTime, resetPending = true) {
    await this.init();
    if (resetPending) {
      await this.db.runAsync(
        "UPDATE sync_status SET last_sync_time = ?, pending_changes = 0, sync_in_progress = 0 WHERE id = 1",
        [lastSyncTime]
      );
    } else {
      await this.db.runAsync(
        "UPDATE sync_status SET sync_in_progress = ? WHERE id = 1",
        [lastSyncTime ? 0 : 1]
      );
    }
  }

  async getLastSyncTime() {
    await this.init();
    const result = await this.db.getFirstAsync(
      "SELECT last_sync_time FROM sync_status WHERE id = 1"
    );
    return result?.last_sync_time || null;
  }

  async setLastSyncTime(timestamp) {
    await this.init();
    await this.db.runAsync(
      "UPDATE sync_status SET last_sync_time = ? WHERE id = 1",
      [timestamp]
    );
  }

  async deleteCustomer(customerId) {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync("DELETE FROM transactions WHERE customer_id = ?", [
        customerId,
      ]);
      await this.db.runAsync("DELETE FROM customers WHERE customer_id = ?", [
        customerId,
      ]);
    });

    await this.incrementPendingChanges();
    return { status: "success" };
  }

  async deleteAllCustomers() {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");
    await this.db.runAsync("DELETE FROM customers");
  }

  async deleteAllTransactions() {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");
    await this.db.runAsync("DELETE FROM transactions");
  }

  /**
   * bulkReplace with hybrid IDs support
   */
  async bulkReplace(customers, transactions) {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    try {
      // Ensure foreign keys on
      try {
        await this.db.execAsync("PRAGMA foreign_keys = ON;");
      } catch (e) {
        console.warn("PRAGMA foreign_keys failed:", e.message);
      }

      await this.db.withTransactionAsync(async () => {
        console.log("bulkReplace: deleting existing data...");
        await this.db.runAsync("DELETE FROM transactions");
        await this.db.runAsync("DELETE FROM customers");

        console.log(`bulkReplace: inserting ${customers.length} customers...`);
        const insertCustomerStmt = `INSERT INTO customers (customer_id, display_id, customer_name, phone_number, address, total_balance, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;

        for (const c of customers) {
          await this.db.runAsync(insertCustomerStmt, [
            c.customerId,
            c.displayId || null, // Display ID might be null
            c.customerName,
            c.phoneNumber || "",
            c.address || "",
            c.totalBalance !== undefined && c.totalBalance !== null
              ? Number(c.totalBalance)
              : 0,
          ]);
        }

        console.log(
          `bulkReplace: inserting ${transactions.length} transactions...`
        );
        const insertTxnStmt = `INSERT INTO transactions (transaction_id, display_id, customer_id, date, type, amount, note, photo, balance_after_txn, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;

        for (const t of transactions) {
          await this.db.runAsync(insertTxnStmt, [
            t.transactionId,
            t.displayId || null, // Display ID might be null
            t.customerId,
            t.date,
            t.type,
            Number(t.amount),
            t.note || "",
            t.photo || null,
            t.balanceAfterTxn !== undefined && t.balanceAfterTxn !== null
              ? Number(t.balanceAfterTxn)
              : 0,
          ]);
        }
      });

      console.log(
        "bulkReplace: recomputing running balances for each customer..."
      );
      for (const c of customers) {
        try {
          await this.recomputeRunningBalances(c.customerId);
        } catch (e) {
          console.warn(
            `Recompute balance failed for ${c.customerId}:`,
            e.message
          );
        }
      }

      // After successful replace, reset pending changes
      await this.updateSyncStatus(new Date().toISOString(), true);

      return { status: "success" };
    } catch (error) {
      console.error("bulkReplace error:", error);
      return {
        status: "error",
        message: error.message || "bulkReplace failed",
      };
    }
  }
}

export default new DatabaseService();
