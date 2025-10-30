import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import SQLiteService from "../services/SQLiteService";

// Generate Outstanding Balance Report
export const generateOutstandingBalanceReport = async (t) => {
  try {
    const customers = await SQLiteService.getCustomers();
    const outstandingCustomers = customers
      .filter((c) => Number(c["Total Balance"]) > 0)
      .sort((a, b) => Number(b["Total Balance"]) - Number(a["Total Balance"]));

    const html = createOutstandingBalanceHTML(outstandingCustomers, t);

    const { uri } = await Print.printToFileAsync({
      html,
      width: 612,
      height: 792,
      margins: { left: 20, top: 20, right: 20, bottom: 20 },
    });

    const fileName = `Outstanding_Balance_${
      new Date().toISOString().split("T")[0]
    }.pdf`;
    const newUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.copyAsync({ from: uri, to: newUri });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(newUri, {
        mimeType: "application/pdf",
        dialogTitle: fileName,
      });
    }

    return { success: true, uri: newUri };
  } catch (error) {
    console.error("Outstanding Balance Report Error:", error);
    return { success: false, error: error.message };
  }
};

// Generate Data Backup Report
export const generateDataBackupReport = async () => {
  try {
    const [customers, allTransactions] = await Promise.all([
      SQLiteService.getCustomers(),
      SQLiteService.getTransactions(),
    ]);

    const csvData = createBackupCSV(customers, allTransactions);
    const fileName = `KhataBook_Backup_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, csvData, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: fileName,
      });
    }

    return { success: true, uri: fileUri };
  } catch (error) {
    console.error("Data Backup Report Error:", error);
    return { success: false, error: error.message };
  }
};

const createOutstandingBalanceHTML = (customers, t) => {
  const totalOutstanding = customers.reduce(
    (sum, c) => sum + Number(c["Total Balance"]),
    0
  );
  const formatCurrency = (amount) =>
    `₹${parseFloat(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${t("report.outstandingBalanceReport")}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #1e293b;
          line-height: 1.6;
          padding: 30px;
          background: #ffffff;
        }

        /* Header Section */
        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #1e40af;
        }

        .company-info {
          flex: 1;
        }

        .company-name {
          font-size: 28px;
          font-weight: 800;
          color: #1e40af;
          margin-bottom: 5px;
          letter-spacing: -0.5px;
        }

        .company-tagline {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .document-info {
          text-align: right;
        }

        .document-title {
          font-size: 20px;
          font-weight: 700;
          color: #334155;
          margin-bottom: 8px;
        }

        .document-meta {
          font-size: 11px;
          color: #64748b;
        }

        /* Summary Section */
        .summary-section {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 25px;
          border: 1px solid #e2e8f0;
        }

        .section-header {
          font-size: 14px;
          font-weight: 700;
          color: #1e40af;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
        }

        .section-icon {
          width: 24px;
          height: 24px;
          background: #1e40af;
          border-radius: 6px;
          margin-right: 8px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
        }

        .summary-item {
          background: white;
          padding: 15px;
          border-radius: 10px;
          border: 2px solid #e2e8f0;
        }

        .summary-item.highlight {
          border-color: #fecaca;
          background: #fef2f2;
        }

        .summary-label {
          font-size: 10px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .summary-value {
          font-size: 20px;
          font-weight: 800;
          color: #1e293b;
          letter-spacing: -0.5px;
        }

        .summary-item.highlight .summary-value {
          color: #dc2626;
        }

        /* Table Section */
        .table-section {
          margin-bottom: 25px;
        }

        .table-container {
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }

        thead {
          background: #1e40af;
          color: white;
        }

        th {
          padding: 12px 10px;
          text-align: left;
          font-weight: 700;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        th:last-child,
        td:last-child {
          text-align: right;
        }

        tbody tr {
          border-bottom: 1px solid #f1f5f9;
        }

        tbody tr:nth-child(even) {
          background: #f8fafc;
        }

        tbody tr:hover {
          background: #f1f5f9;
        }

        td {
          padding: 10px;
          font-size: 11px;
        }

        .serial-cell {
          font-weight: 600;
          color: #64748b;
          text-align: center;
        }

        .name-cell {
          font-weight: 600;
          color: #1e293b;
        }

        .phone-cell {
          color: #475569;
        }

        .amount-cell {
          font-weight: 700;
          color: #dc2626;
          text-align: right;
        }

        /* Footer */
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          color: #64748b;
        }

        .footer-left {
          flex: 1;
        }

        .footer-right {
          text-align: right;
        }

        .footer-note {
          margin-top: 5px;
          font-style: italic;
          color: #94a3b8;
        }

        /* Watermark */
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 100px;
          color: rgba(30, 64, 175, 0.03);
          font-weight: 900;
          pointer-events: none;
          z-index: -1;
        }

        /* Empty State */
        .no-data {
          text-align: center;
          padding: 60px 20px;
          color: #94a3b8;
        }

        .no-data-icon {
          font-size: 48px;
          margin-bottom: 15px;
        }

        .no-data-text {
          font-size: 16px;
          font-weight: 600;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="watermark">UDHARKHATA</div>

      <!-- Header -->
      <div class="header-container">
        <div class="company-info">
          <div class="company-name">UdharKhata</div>
          <div class="company-tagline">${t(
            "pdf.secureFinancialManagement"
          )}</div>
        </div>
        <div class="document-info">
          <div class="document-title">${t(
            "report.outstandingBalanceReport"
          )}</div>
          <div class="document-meta">
            ${t("pdf.generated")}: ${new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} ${t("pdf.at")} ${new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}
          </div>
          <div class="document-meta">
            ${t("report.report")} #${Math.random()
    .toString(36)
    .substr(2, 9)
    .toUpperCase()}
          </div>
        </div>
      </div>

      <!-- Summary Section -->
      <div class="summary-section">
        <div class="section-header">
          <div class="section-icon"></div>
          ${t("report.summary")}
        </div>
        <div class="summary-grid">
          <div class="summary-item highlight">
            <div class="summary-label">${t("report.totalOutstanding")}</div>
            <div class="summary-value">${formatCurrency(totalOutstanding)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">${t("report.numberOfCustomers")}</div>
            <div class="summary-value">${customers.length}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">${t("report.reportDate")}</div>
            <div class="summary-value">${new Date().toLocaleDateString(
              "en-GB",
              {
                day: "2-digit",
                month: "short",
              }
            )}</div>
          </div>
        </div>
      </div>

      <!-- Customers Table -->
      ${
        customers.length === 0
          ? `
        <div class="no-data">
          <div class="no-data-icon">📋</div>
          <div class="no-data-text">${t("report.noOutstandingCustomers")}</div>
        </div>
        `
          : `
        <div class="table-section">
          <div class="section-header">
            <div class="section-icon"></div>
            ${t("report.customerList")}
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>${t("report.srNo")}</th>
                  <th>${t("pdf.customerName")}</th>
                  <th>${t("pdf.phoneNumber")}</th>
                  <th>${t("report.outstandingAmount")}</th>
                </tr>
              </thead>
              <tbody>
                ${customers
                  .map(
                    (customer, index) => `
                  <tr>
                    <td class="serial-cell">${index + 1}</td>
                    <td class="name-cell">${
                      customer["Customer Name"] || "N/A"
                    }</td>
                    <td class="phone-cell">${
                      customer["Phone Number"] || "N/A"
                    }</td>
                    <td class="amount-cell">${formatCurrency(
                      customer["Total Balance"]
                    )}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
        `
      }

      <!-- Footer -->
      <div class="footer">
        <div class="footer-left">
          <div><strong>UdharKhata</strong> - ${t(
            "pdf.secureFinancialManagement"
          )}</div>
          <div class="footer-note">
            ${t("pdf.computerGeneratedDocument")}
          </div>
        </div>
        <div class="footer-right">
          <div>© 2025 UdharKhata. ${t("pdf.allRightsReserved")}</div>
          <div class="footer-note">${t("pdf.confidentialDocument")}</div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// CSV backup code remains unchanged
const createBackupCSV = (customers, transactions) => {
  // Create CSV headers and data
  const customerHeaders = [
    "Customer ID",
    "Customer Name",
    "Phone Number",
    "Address",
    "Total Balance",
  ];
  const transactionHeaders = [
    "Transaction ID",
    "Customer ID",
    "Date",
    "Type",
    "Amount",
    "Note",
    "Balance After Txn",
  ];

  // Convert customers to CSV
  const customerRows = customers.map((c) => [
    c["Customer ID"] || "",
    c["Customer Name"] || "",
    c["Phone Number"] || "",
    c["Address"] || "",
    c["Total Balance"] || 0,
  ]);

  // Convert transactions to CSV
  const transactionRows = transactions.map((t) => [
    t["Transaction ID"] || "",
    t["Customer ID"] || "",
    t["Date"] || "",
    t["Type"] || "",
    t["Amount"] || 0,
    t["Note"] || "",
    t["Balance After Txn"] || 0,
  ]);

  // Combine into single CSV
  let csvContent = "CUSTOMERS\n";
  csvContent += customerHeaders.join(",") + "\n";
  csvContent += customerRows
    .map((row) => row.map((field) => `"${field}"`).join(","))
    .join("\n");

  csvContent += "\n\nTRANSACTIONS\n";
  csvContent += transactionHeaders.join(",") + "\n";
  csvContent += transactionRows
    .map((row) => row.map((field) => `"${field}"`).join(","))
    .join("\n");

  return csvContent;
};
