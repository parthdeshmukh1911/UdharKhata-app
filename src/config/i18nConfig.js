// i18nConfig.js
// Expo-compatible simple i18n configuration

export const ENABLE_I18N = true;
export const USE_SIMPLE_I18N = true; // Expo compatible

// Fallback translation function (offline safety)
export const fallbackT = (key) => {
  const translations = {
    // Navigation
    "navigation.customers": "Customers",
    "navigation.transactions": "Transactions",
    "navigation.summary": "Summary",
    "navigation.addCustomer": "Add Customer",
    "navigation.editCustomer": "Edit Customer",
    "navigation.addTransaction": "Add Transaction",
    "navigation.editTransaction": "Edit Transaction",

    // Transaction
    "transaction.transactionId": "Transaction ID",
    "transaction.date": "Date",
    "transaction.amount": "Amount",
    "transaction.type": "Type",
    "transaction.note": "Note",
    "transaction.enterAmount": "Enter Amount",
    "transaction.selectType": "Select Type",
    "transaction.enterNote": "Enter Note",
    "transaction.saveTransaction": "Save Transaction",
    "transaction.udhari": "CREDIT",
    "transaction.payment": "PAYMENT",
    "transaction.amountAndTypeRequired": "Amount and Type are required",
    "transaction.transactionUpdatedSuccessfully":
      "Transaction updated successfully",
    "transaction.failedToUpdateTransaction": "Failed to update transaction",

    // Common
    "common.validation": "Validation",
    "common.success": "Success",
    "common.error": "Error",
    "common.ok": "OK",
    "common.cancel": "Cancel",

    // Backup and Sync
    "backupAndSync.importData": "Import Data",
    "backupAndSync.exportData": "Export Data",
    "backupAndSync.backupNow": "Backup Now",
    "backupAndSync.restoreData": "Restore Data",
    "backupAndSync.importSuccess": "✅ Data imported successfully from Excel",
    "backupAndSync.importFailed": "❌ Import failed — old data restored safely",
    "backupAndSync.exportSuccess": "✅ Data exported successfully",
    "backupAndSync.exportFailed": "❌ Export failed",
    "backupAndSync.backupSuccess": "✅ Backup completed successfully",
    "backupAndSync.backupFailed": "❌ Backup failed",
    "backupAndSync.restoreSuccess": "✅ Data restored successfully",
    "backupAndSync.restoreFailed": "❌ Restore failed",
  };

  return translations[key] || key;
};
