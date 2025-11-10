// src/Utils/ExcelGenerator.js
// Utility to export SQLite data to Excel (.xlsx)
import * as XLSX from "xlsx";
// Import legacy FileSystem explicitly to avoid deprecated warning
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import SQLiteService from "../services/SQLiteService";

export async function exportDataToExcel() {
  try {
    // Fetch all customers and transactions
    const rawCustomers = await SQLiteService.getCustomers();
    const rawTransactions = await SQLiteService.getTransactions();

    // Transform customers data
    const customers = rawCustomers.map((c) => ({
      "Customer Name": c["Customer Name"],
      "Phone Number": c["Phone Number"] || "",
      Address: c.Address || "",
      "Total Balance": c["Total Balance"] || 0,
    }));

    // Map transactions with customer names
    const customerIdToName = new Map();
    rawCustomers.forEach((c) => {
      customerIdToName.set(c["Customer ID"], c["Customer Name"]);
    });

    const transactions = rawTransactions.map((t) => ({
      "Customer Name": customerIdToName.get(t["Customer ID"]) || "Unknown",
      Date: t.Date,
      Type: t.Type,
      Amount: t.Amount,
      Note: t.Note || "",
    }));

    // Create sheets
    const customerSheet = XLSX.utils.json_to_sheet(customers);
    const transactionSheet = XLSX.utils.json_to_sheet(transactions);

    // Set column widths for readability
    customerSheet["!cols"] = [
      { wch: 20 },
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
    ];

    transactionSheet["!cols"] = [
      { wch: 20 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 30 },
    ];

    // Create workbook and append sheets
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, customerSheet, "Customers");
    XLSX.utils.book_append_sheet(wb, transactionSheet, "Transactions");

    // Write workbook to base64 string
    const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

    // Compose file name and path
    const fileName = `UdharKhata_Backup_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    const fileUri = FileSystem.documentDirectory + fileName;

    // Write the base64 string to file using legacy API
    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: "base64",
    });

    // Prompt user to share/save the file
    await Sharing.shareAsync(fileUri, {
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: fileName,
      UTI: "com.microsoft.excel.xlsx",
    });

    return { success: true, uri: fileUri, fileName };
  } catch (error) {
    console.error("Excel Export Error:", error);
    return { success: false, error: error.message };
  }
}
