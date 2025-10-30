// Utility to export SQLite data to Excel (.xlsx)
import XLSX from "xlsx";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from 'expo-sharing';
import SQLiteService from "../services/SQLiteService";

export async function exportDataToExcel() {
  try {
    // Fetch all customers and transactions
    const customers = await SQLiteService.getCustomers();
    const transactions = await SQLiteService.getTransactions();

    // Prepare sheets
    const customerSheet = XLSX.utils.json_to_sheet(customers);
    const transactionSheet = XLSX.utils.json_to_sheet(transactions);

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, customerSheet, "Customers");
    XLSX.utils.book_append_sheet(wb, transactionSheet, "Transactions");

    // Write workbook to binary string
    const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

    // Save file
    const fileName = `KhataBook_Data_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    const fileUri = FileSystem.documentDirectory + fileName;
    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: "base64",
    });
    // Prompt user to share/save the file
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: fileName,
    });
    return { success: true, uri: fileUri, fileName };
  } catch (error) {
    console.error("Excel Export Error:", error);
    return { success: false, error: error.message };
  }
}
