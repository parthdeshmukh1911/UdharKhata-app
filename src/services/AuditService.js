// src/services/AuditService.js
import { ulid } from "ulid";
import { Platform } from "react-native";
import * as Device from "expo-device";
import NetInfo from "@react-native-community/netinfo";
import { supabase } from "../config/SupabaseConfig";

class AuditService {
  constructor() {
    this.db = null;
    this.isOnline = true;
    this.setupNetworkListener();
  }

  setupNetworkListener() {
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;
      
      if (wasOffline && this.isOnline) {
        console.log("📡 Network restored, syncing audit queue...");
        this.syncAuditQueue().catch((err) => 
          console.log("Audit sync error:", err.message)
        );
      }
    });
  }

  async init(database) {
    this.db = database;
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected && state.isInternetReachable;
  }

  async getDeviceInfo() {
    return JSON.stringify({
      platform: Platform.OS,
      osVersion: Platform.Version,
      deviceModel: Device.modelName || "Unknown",
      deviceBrand: Device.brand || "Unknown",
    });
  }

  async getCurrentUser() {
    try {
      const { data } = await supabase.auth.getUser();
      return data?.user || null;
    } catch {
      return null;
    }
  }

  // ============================================
  // CUSTOMER AUDIT METHODS
  // ============================================

  async logCustomerCreate(customerId, customerData) {
    try {
      const user = await this.getCurrentUser();
      const deviceInfo = await this.getDeviceInfo();

      const auditData = {
        customer_id: customerId,
        display_id: customerData.displayId,
        action_type: "CREATE",
        new_customer_name: customerData.customerName,
        new_phone_number: customerData.phoneNumber,
        new_address: customerData.address,
        new_total_balance: 0,
        changed_at: new Date().toISOString(),
        device_info: deviceInfo,
      };

      await this.logAudit("customers", "CREATE", customerId, auditData, user, 5);
    } catch (error) {
      console.log("Audit log error (non-blocking):", error.message);
    }
  }

  async logCustomerUpdate(customerId, oldData, newData) {
    try {
      const user = await this.getCurrentUser();
      const deviceInfo = await this.getDeviceInfo();

      const auditData = {
        customer_id: customerId,
        display_id: oldData.displayId || newData.displayId,
        action_type: "UPDATE",
        old_customer_name: oldData.customerName,
        old_phone_number: oldData.phoneNumber,
        old_address: oldData.address,
        old_total_balance: oldData.totalBalance,
        new_customer_name: newData.customerName,
        new_phone_number: newData.phoneNumber,
        new_address: newData.address,
        new_total_balance: newData.totalBalance,
        changed_at: new Date().toISOString(),
        device_info: deviceInfo,
      };

      await this.logAudit("customers", "UPDATE", customerId, auditData, user, 5);
    } catch (error) {
      console.log("Audit log error (non-blocking):", error.message);
    }
  }

  async logCustomerDelete(customerId, customerData) {
    try {
      const user = await this.getCurrentUser();
      const deviceInfo = await this.getDeviceInfo();

      const auditData = {
        customer_id: customerId,
        display_id: customerData.displayId,
        action_type: "DELETE",
        old_customer_name: customerData.customerName,
        old_phone_number: customerData.phoneNumber,
        old_address: customerData.address,
        old_total_balance: customerData.totalBalance,
        changed_at: new Date().toISOString(),
        device_info: deviceInfo,
      };

      await this.logAudit("customers", "DELETE", customerId, auditData, user, 1);
    } catch (error) {
      console.log("Audit log error (non-blocking):", error.message);
    }
  }

  // ============================================
  // TRANSACTION AUDIT METHODS
  // ============================================

  async logTransactionCreate(transactionId, transactionData) {
    try {
      const user = await this.getCurrentUser();
      const deviceInfo = await this.getDeviceInfo();

      const auditData = {
        transaction_id: transactionId,
        display_id: transactionData.displayId,
        customer_id: transactionData.customerId,
        action_type: "CREATE",
        new_date: transactionData.date,
        new_type: transactionData.type,
        new_amount: transactionData.amount,
        new_note: transactionData.note,
        new_photo: transactionData.photo,
        new_balance_after_txn: transactionData.balanceAfterTxn,
        changed_at: new Date().toISOString(),
        device_info: deviceInfo,
      };

      await this.logAudit("transactions", "CREATE", transactionId, auditData, user, 5);
    } catch (error) {
      console.log("Audit log error (non-blocking):", error.message);
    }
  }

  async logTransactionUpdate(transactionId, oldData, newData) {
    try {
      const user = await this.getCurrentUser();
      const deviceInfo = await this.getDeviceInfo();

      const auditData = {
        transaction_id: transactionId,
        display_id: oldData.displayId || newData.displayId,
        customer_id: oldData.customerId || newData.customerId,
        action_type: "UPDATE",
        old_date: oldData.date,
        old_type: oldData.type,
        old_amount: oldData.amount,
        old_note: oldData.note,
        old_photo: oldData.photo,
        old_balance_after_txn: oldData.balanceAfterTxn,
        new_date: newData.date,
        new_type: newData.type,
        new_amount: newData.amount,
        new_note: newData.note,
        new_photo: newData.photo,
        new_balance_after_txn: newData.balanceAfterTxn,
        changed_at: new Date().toISOString(),
        device_info: deviceInfo,
      };

      await this.logAudit("transactions", "UPDATE", transactionId, auditData, user, 5);
    } catch (error) {
      console.log("Audit log error (non-blocking):", error.message);
    }
  }

  async logTransactionDelete(transactionId, transactionData) {
    try {
      const user = await this.getCurrentUser();
      const deviceInfo = await this.getDeviceInfo();

      const auditData = {
        transaction_id: transactionId,
        display_id: transactionData.displayId,
        customer_id: transactionData.customerId,
        action_type: "DELETE",
        old_date: transactionData.date,
        old_type: transactionData.type,
        old_amount: transactionData.amount,
        old_note: transactionData.note,
        old_photo: transactionData.photo,
        old_balance_after_txn: transactionData.balanceAfterTxn,
        changed_at: new Date().toISOString(),
        device_info: deviceInfo,
      };

      await this.logAudit("transactions", "DELETE", transactionId, auditData, user, 1);
    } catch (error) {
      console.log("Audit log error (non-blocking):", error.message);
    }
  }

  // ============================================
  // CORE AUDIT LOGGING
  // ============================================

  async logAudit(auditTable, actionType, entityId, auditData, user, priority = 5) {
    try {
      const auditId = ulid();

      if (this.isOnline && user) {
        // Direct to Supabase when online
        await this.writeToSupabase(auditTable, auditId, auditData, user);
      } else {
        // Queue to SQLite when offline
        await this.queueToSQLite(auditTable, actionType, entityId, auditData, user, priority);
      }
    } catch (error) {
      console.log("Audit logging failed:", error.message);
    }
  }

  async writeToSupabase(auditTable, auditId, auditData, user) {
    try {
      const tableName = `audit_${auditTable}`;
      const record = {
        audit_id: auditId,
        user_id: user.id,
        ...auditData,
      };

      const { error } = await supabase.from(tableName).insert(record);
      
      if (error) throw error;
      console.log(`✅ Audit logged to ${tableName}`);
    } catch (error) {
      console.log(`Failed to write audit to Supabase, queueing locally:`, error.message);
      // Fallback to queue
      await this.queueToSQLite(auditTable, auditData.action_type, auditData.customer_id || auditData.transaction_id, auditData, user, 5);
    }
  }

  async queueToSQLite(auditTable, actionType, entityId, auditData, user, priority) {
    try {
      if (!this.db) return;

      const queueId = ulid();
      await this.db.runAsync(
        `INSERT INTO audit_queue (queue_id, audit_table, action_type, entity_id, audit_data, user_id, user_email, device_info, priority)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          queueId,
          auditTable,
          actionType,
          entityId,
          JSON.stringify(auditData),
          user?.id || null,
          user?.email || null,
          auditData.device_info,
          priority,
        ]
      );
      console.log(`📦 Audit queued locally (${auditTable}/${actionType})`);
    } catch (error) {
      console.log("Failed to queue audit:", error.message);
    }
  }

  // ============================================
  // SYNC AUDIT QUEUE
  // ============================================

  async syncAuditQueue() {
    try {
      if (!this.db || !this.isOnline) return;

      const user = await this.getCurrentUser();
      if (!user) return;

      const queuedAudits = await this.db.getAllAsync(
        "SELECT * FROM audit_queue ORDER BY priority ASC, created_at ASC LIMIT 50"
      );

      if (queuedAudits.length === 0) return;

      console.log(`📤 Syncing ${queuedAudits.length} queued audits...`);

      for (const audit of queuedAudits) {
        try {
          const auditData = JSON.parse(audit.audit_data);
          const tableName = `audit_${audit.audit_table}`;
          
          const record = {
            audit_id: ulid(),
            user_id: user.id,
            ...auditData,
          };

          const { error } = await supabase.from(tableName).insert(record);

          if (error) throw error;

          // Delete from queue after successful sync
          await this.db.runAsync(
            "DELETE FROM audit_queue WHERE queue_id = ?",
            [audit.queue_id]
          );
        } catch (error) {
          console.log(`Failed to sync audit ${audit.queue_id}:`, error.message);
          
          // Update retry count
          await this.db.runAsync(
            "UPDATE audit_queue SET retry_count = retry_count + 1, last_retry_at = CURRENT_TIMESTAMP, error_message = ? WHERE queue_id = ?",
            [error.message, audit.queue_id]
          );
        }
      }

      console.log("✅ Audit queue sync completed");
    } catch (error) {
      console.log("Audit queue sync error:", error.message);
    }
  }

  async getPendingAuditCount() {
    try {
      if (!this.db) return 0;
      const result = await this.db.getFirstAsync(
        "SELECT COUNT(*) as count FROM audit_queue"
      );
      return result?.count || 0;
    } catch {
      return 0;
    }
  }
}

export default new AuditService();
