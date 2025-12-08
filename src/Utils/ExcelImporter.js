// src/Utils/ExcelImporter.js
import * as XLSX from "xlsx";
import * as DocumentPicker from "expo-document-picker";
import { v4 as uuidv4 } from "uuid"; // ✅ ADDED: For generating UUIDs

// convert excel serial or parseable date to yyyy-mm-dd ISO string
const excelDateToISO = (excelDate) => {
  if (!excelDate && excelDate !== 0) return "";
  // If already string and not pure numeric serial
  if (typeof excelDate === "string" && !/^\d+$/.test(excelDate)) {
    // try to parse as date string
    const d = new Date(excelDate);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
    return excelDate;
  }
  const serial =
    typeof excelDate === "number" ? excelDate : parseInt(excelDate, 10);
  if (isNaN(serial)) return "";
  // Excel epoch: 1899-12-30 -> serial 1 = 1900-01-01 (approx)
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400; // seconds
  const date_info = new Date(utc_value * 1000);
  const fractional_day = serial - Math.floor(serial);
  if (fractional_day > 0) {
    const seconds = Math.round(86400 * fractional_day);
    date_info.setSeconds(date_info.getSeconds() + seconds);
  }
  return date_info.toISOString().slice(0, 10);
};

const allowedMime = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
];
const allowedExt = [".xlsx", ".xls"];

function getFileExtension(filename) {
  if (!filename) return "";
  const idx = filename.lastIndexOf(".");
  return idx === -1 ? "" : filename.slice(idx).toLowerCase();
}

function isValidType(result) {
  try {
    if (result.mimeType && allowedMime.includes(result.mimeType)) return true;
    const asset = result.assets && result.assets[0];
    const name = asset?.name || result.name || "";
    const ext = getFileExtension(name);
    if (allowedExt.includes(ext)) return true;
  } catch (e) {
    // ignore and treat as invalid
  }
  return false;
}

/**
 * importDataFromExcel
 * - Validates and returns parsed objects (no DB modifications)
 * - Generates customer_id, transaction_id, display_id
 * - Returns:
 *   { success: true, customers, transactions, counts }
 *   OR
 *   { success: false, error: '...' }
 */
export async function importDataFromExcel() {
  const startTime = Date.now();
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
    });

    console.log("Excel Picker result:", result);

    const asset = result.assets && result.assets[0];

    if (
      !asset ||
      result.type === "cancel" ||
      result.cancelled ||
      result.canceled
    ) {
      return { success: false, error: "No file selected." };
    }

    // Basic file type/extension validation
    if (!isValidType(result) && !isValidType(asset)) {
      const name = asset?.name || result.name || "";
      return {
        success: false,
        error: `Invalid file type. Please select an Excel file (.xlsx or .xls). Selected: ${name}`,
      };
    }

    const fileUri = asset.uri;
    if (!fileUri) return { success: false, error: "Selected file has no URI." };

    const fileData = await fetch(fileUri).then((res) => res.arrayBuffer());
    const workbook = XLSX.read(fileData, { type: "array" });

    // Required sheet names (case-insensitive search)
    const customersSheetName =
      workbook.SheetNames.find((s) => s.toLowerCase() === "customers") ||
      "Customers";
    const transactionsSheetName =
      workbook.SheetNames.find((s) => s.toLowerCase() === "transactions") ||
      "Transactions";

    if (!workbook.Sheets[customersSheetName]) {
      return { success: false, error: "Missing sheet: 'Customers'." };
    }
    if (!workbook.Sheets[transactionsSheetName]) {
      return { success: false, error: "Missing sheet: 'Transactions'." };
    }

    // Parse JSON from sheets
    const rawCustomers = XLSX.utils.sheet_to_json(
      workbook.Sheets[customersSheetName],
      {
        defval: null,
        raw: false,
      }
    );
    const rawTransactions = XLSX.utils.sheet_to_json(
      workbook.Sheets[transactionsSheetName],
      {
        defval: null,
        raw: false,
      }
    );

    // ✅ UPDATED: New required headers (no IDs from user)
    const requiredCustomerHeaders = ["Customer Name"];
    const requiredTransactionHeaders = [
      "Customer Name",
      "Type",
      "Amount",
      "Date",
    ];

    const custHeaders =
      rawCustomers.length > 0 ? Object.keys(rawCustomers[0]) : [];
    const txnHeaders =
      rawTransactions.length > 0 ? Object.keys(rawTransactions[0]) : [];

    // Case-insensitive header matching
    const custHeadersLower = custHeaders.map((h) => h.trim().toLowerCase());
    const txnHeadersLower = txnHeaders.map((h) => h.trim().toLowerCase());

    const missingCustomerHeaders = requiredCustomerHeaders.filter(
      (h) => !custHeadersLower.includes(h.toLowerCase())
    );
    const missingTransactionHeaders = requiredTransactionHeaders.filter(
      (h) => !txnHeadersLower.includes(h.toLowerCase())
    );

    if (missingCustomerHeaders.length > 0) {
      return {
        success: false,
        error: `Customers sheet missing required header(s): ${missingCustomerHeaders.join(
          ", "
        )}`,
      };
    }
    if (missingTransactionHeaders.length > 0) {
      return {
        success: false,
        error: `Transactions sheet missing required header(s): ${missingTransactionHeaders.join(
          ", "
        )}`,
      };
    }

    // ✅ Row validation + normalization + ID generation
    const customers = [];
    const customerNameToId = new Map(); // Map customer name to generated customer_id
    const customerNames = new Set();

    for (let i = 0; i < rawCustomers.length; i++) {
      const row = rawCustomers[i];

      // Skip empty rows
      if (!row || Object.keys(row).length === 0) continue;

      const rowNo = i + 2; // considering header row = 1
      const name = (row["Customer Name"] || "").toString().trim();

      if (!name) {
        return {
          success: false,
          error: `Customers: Row ${rowNo} missing Customer Name.`,
        };
      }

      // Check duplicate names within Excel
      if (customerNames.has(name)) {
        return {
          success: false,
          error: `Duplicate Customer Name '${name}' in Customers sheet at row ${rowNo}.`,
        };
      }

      customerNames.add(name);

      // Validate phone number (optional but must be valid if provided)
      const phone = row["Phone Number"]
        ? String(row["Phone Number"]).trim()
        : "";
      if (phone && !/^\d{10}$/.test(phone)) {
        return {
          success: false,
          error: `Customers: Row ${rowNo} has invalid phone number '${phone}'. Must be 10 digits.`,
        };
      }

      // ✅ Generate customer_id (UUID)
      const customerId = uuidv4();
      customerNameToId.set(name, customerId);

      // ✅ Generate display_id (will be generated by DB service later)
      // For now, we'll pass null and let the DB service handle it

      customers.push({
        customerId: customerId, // ✅ Generated UUID
        customerName: name,
        phoneNumber: phone || "", // Optional
        address: row["Address"] ? String(row["Address"]).trim() : "",
        totalBalance:
          row["Total Balance"] !== null && row["Total Balance"] !== undefined
            ? Number(row["Total Balance"])
            : 0,
      });
    }

    // ✅ Transactions validation and normalization
    const transactions = [];
    const customerBalances = new Map(); // Track running balance per customer

    // Initialize balances from customers
    customers.forEach((c) => {
      customerBalances.set(c.customerId, c.totalBalance);
    });

    for (let i = 0; i < rawTransactions.length; i++) {
      const row = rawTransactions[i];

      // Skip empty rows
      if (!row || Object.keys(row).length === 0) continue;

      const rowNo = i + 2;
      const custName = (row["Customer Name"] || "").toString().trim();
      const type = (row["Type"] || "").toString().trim().toUpperCase();
      const amtRaw = row["Amount"];
      const dateRaw = row["Date"];
      const note = row["Note"] ? String(row["Note"]).trim() : "";

      if (!custName) {
        return {
          success: false,
          error: `Transactions: Row ${rowNo} missing Customer Name.`,
        };
      }

      // ✅ Match customer name to generated customer_id
      if (!customerNameToId.has(custName)) {
        return {
          success: false,
          error: `Transactions: Row ${rowNo} references unknown Customer Name '${custName}'. Customer must exist in Customers sheet.`,
        };
      }

      const customerId = customerNameToId.get(custName);

      if (!["CREDIT", "PAYMENT"].includes(type)) {
        return {
          success: false,
          error: `Transactions: Row ${rowNo} has invalid Type '${type}'. Allowed: CREDIT, PAYMENT.`,
        };
      }

      const amount = Number(amtRaw);
      if (isNaN(amount) || amount <= 0) {
        return {
          success: false,
          error: `Transactions: Row ${rowNo} has invalid Amount '${amtRaw}'.`,
        };
      }

      const dateIso = excelDateToISO(dateRaw);
      if (!dateIso) {
        return {
          success: false,
          error: `Transactions: Row ${rowNo} has unparseable Date '${dateRaw}'.`,
        };
      }

      // ✅ Generate transaction_id (UUID)
      const transactionId = uuidv4();

      // ✅ Calculate balance_after_txn
      let currentBalance = customerBalances.get(customerId) || 0;
      if (type === "CREDIT") {
        currentBalance += amount;
      } else if (type === "PAYMENT") {
        currentBalance -= amount;
      }
      customerBalances.set(customerId, currentBalance);

      transactions.push({
        transactionId: transactionId, // ✅ Generated UUID
        customerId: customerId, // ✅ Matched from customer name
        date: dateIso,
        type,
        amount,
        note,
        balanceAfterTxn: currentBalance, // ✅ Calculated
      });
    }

    // Sort transactions by date ascending (oldest first) for restore
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Log successful import audit
    const AuditService = require('../services/AuditService').default;
    AuditService.logUserAction('IMPORT_EXCEL', {
      action_category: 'DATA_IMPORT',
      action_status: 'SUCCESS',
      action_details: {
        customers_imported: customers.length,
        transactions_imported: transactions.length,
        import_format: 'XLSX',
        duration_ms: Date.now() - startTime,
      },
    }).catch(err => console.log("Audit error:", err.message));

    // All validations passed
    return {
      success: true,
      customers,
      transactions,
      counts: {
        customers: customers.length,
        transactions: transactions.length,
      },
    };
  } catch (error) {
    console.error("Excel Import Validation Error:", error);

    // Log failed import audit
    const AuditService = require('../services/AuditService').default;
    AuditService.logUserAction('IMPORT_EXCEL', {
      action_category: 'DATA_IMPORT',
      action_status: 'FAILED',
      error_message: error.message,
    }).catch(err => console.log("Audit error:", err.message));

    return {
      success: false,
      error: error.message || "Failed to import Excel file.",
    };
  }
}
