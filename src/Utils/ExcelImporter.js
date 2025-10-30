// src/Utils/ExcelImporter.js
import XLSX from "xlsx";
import * as DocumentPicker from "expo-document-picker";

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
  // DocumentPicker may return mimeType or name; fallback to extension check
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
 * - Only validates and returns parsed objects (no DB modifications).
 * - Returns:
 *   { success: true, customers, transactions, counts: { customers, transactions } }
 *   OR
 *   { success: false, error: '...' }
 */
export async function importDataFromExcel() {
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

    // Required sheet names
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

    // Validate headers presence (we require certain columns)
    const requiredCustomerHeaders = ["Customer ID", "Customer Name"];
    const requiredTransactionHeaders = [
      "Transaction ID",
      "Customer ID",
      "Type",
      "Amount",
      "Date",
    ];

    // Helper get headers from first row keys
    const custHeaders =
      rawCustomers.length > 0 ? Object.keys(rawCustomers[0]) : [];
    const txnHeaders =
      rawTransactions.length > 0 ? Object.keys(rawTransactions[0]) : [];

    const missingCustomerHeaders = requiredCustomerHeaders.filter(
      (h) => !custHeaders.map((c) => c.trim()).includes(h)
    );
    const missingTransactionHeaders = requiredTransactionHeaders.filter(
      (h) => !txnHeaders.map((c) => c.trim()).includes(h)
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

    // Row validation + normalization
    const customers = [];
    const customerIds = new Set();

    for (let i = 0; i < rawCustomers.length; i++) {
      const row = rawCustomers[i];
      const rowNo = i + 2; // considering header row = 1
      const id = (row["Customer ID"] || "").toString().trim();
      const name = (row["Customer Name"] || "").toString().trim();

      if (!id) {
        return {
          success: false,
          error: `Customers: Row ${rowNo} missing Customer ID.`,
        };
      }
      if (!name) {
        return {
          success: false,
          error: `Customers: Row ${rowNo} missing Customer Name.`,
        };
      }
      if (customerIds.has(id)) {
        return {
          success: false,
          error: `Duplicate Customer ID '${id}' in Customers sheet.`,
        };
      }

      customerIds.add(id);

      customers.push({
        customerId: id,
        customerName: name,
        phoneNumber: row["Phone Number"]
          ? String(row["Phone Number"]).trim()
          : "",
        address: row["Address"] ? String(row["Address"]).trim() : "",
        totalBalance:
          row["Total Balance"] !== null && row["Total Balance"] !== undefined
            ? Number(row["Total Balance"])
            : 0,
      });
    }

    // Transactions validation and normalization
    const transactions = [];
    const txnIds = new Set();

    for (let i = 0; i < rawTransactions.length; i++) {
      const row = rawTransactions[i];
      const rowNo = i + 2;
      const txnId = (row["Transaction ID"] || "").toString().trim();
      const custId = (row["Customer ID"] || "").toString().trim();
      const type = (row["Type"] || "").toString().trim().toUpperCase();
      const amtRaw = row["Amount"];
      const dateRaw = row["Date"];
      const note = row["Note"] ? String(row["Note"]).trim() : "";

      if (!txnId) {
        return {
          success: false,
          error: `Transactions: Row ${rowNo} missing Transaction ID.`,
        };
      }
      if (txnIds.has(txnId)) {
        return {
          success: false,
          error: `Duplicate Transaction ID '${txnId}' at row ${rowNo}.`,
        };
      }
      txnIds.add(txnId);

      if (!custId) {
        return {
          success: false,
          error: `Transactions: Row ${rowNo} missing Customer ID.`,
        };
      }
      if (!customerIds.has(custId)) {
        return {
          success: false,
          error: `Transactions: Row ${rowNo} references unknown Customer ID '${custId}'.`,
        };
      }

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

      transactions.push({
        transactionId: txnId,
        customerId: custId,
        date: dateIso,
        type,
        amount,
        note,
        balanceAfterTxn:
          row["Balance After Transaction"] !== null &&
          row["Balance After Transaction"] !== undefined
            ? Number(row["Balance After Transaction"])
            : null,
      });
    }

    // Sort transactions by date ascending (oldest first) for restore
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

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
    return {
      success: false,
      error: error.message || "Failed to import Excel file.",
    };
  }
}
