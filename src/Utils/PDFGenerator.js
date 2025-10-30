import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

export const generateTransactionPDF = async (
  customerData,
  transactions,
  startDate,
  endDate,
  t // Add translation function parameter
) => {
  try {
    // Normalize date range to cover full days and parse txn dates in local time
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const toLocalDate = (dateStr) => {
      if (!dateStr || typeof dateStr !== "string") return null;
      const parts = dateStr.split("-");
      if (parts.length !== 3) return new Date(dateStr);
      const y = Number(parts[0]);
      const m = Number(parts[1]);
      const d = Number(parts[2]);
      if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d))
        return new Date(dateStr);
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    };

    const filteredTransactions = transactions.filter((txn) => {
      const txnDate = toLocalDate(txn.Date);
      if (!txnDate) return false;
      return txnDate >= start && txnDate <= end;
    });

    // Calculate summary
    const totalUdhari = filteredTransactions
      .filter((t) => t.Type === "CREDIT")
      .reduce((sum, t) => sum + (parseFloat(t.Amount) || 0), 0);

    const totalPayments = filteredTransactions
      .filter((t) => t.Type === "PAYMENT")
      .reduce((sum, t) => sum + (parseFloat(t.Amount) || 0), 0);

    const netOutstanding = totalUdhari - totalPayments;

    // Sort transactions by date (newest first)
    const sortedTransactions = [...filteredTransactions].sort((a, b) => {
      const dateA = toLocalDate(a.Date);
      const dateB = toLocalDate(b.Date);
      return dateB - dateA;
    });

    // Create HTML template with translation
    const html = createAdvancedHTMLTemplate(
      customerData,
      sortedTransactions,
      startDate,
      endDate,
      {
        totalUdhari,
        totalPayments,
        netOutstanding,
        count: filteredTransactions.length,
      },
      t // Pass translation function
    );

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html,
      width: 612,
      height: 792,
      margins: {
        left: 20,
        top: 20,
        right: 20,
        bottom: 20,
      },
    });

    // Generate filename
    const generateFileName = (customerName, startDate, endDate) => {
      const cleanName = customerName
        .replace(/[^a-zA-Z\s]/g, "")
        .replace(/\s+/g, "_");

      const formatDateForFile = (date) => {
        const months = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        const day = String(date.getDate()).padStart(2, "0");
        const month = months[date.getMonth()];
        const year = String(date.getFullYear()).slice(-2);
        return `${day}${month}${year}`;
      };

      const startFormatted = formatDateForFile(startDate);
      const endFormatted = formatDateForFile(endDate);

      return `${cleanName}_Statement_${startFormatted}_${endFormatted}.pdf`;
    };

    const fileName = generateFileName(
      customerData["Customer Name"],
      startDate,
      endDate
    );

    // Copy file with proper name
    const newUri = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.copyAsync({
      from: uri,
      to: newUri,
    });

    // Share PDF with proper filename
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(newUri, {
        mimeType: "application/pdf",
        dialogTitle: fileName,
      });
    }

    return { success: true, uri };
  } catch (error) {
    console.error("PDF Generation Error:", error);
    return { success: false, error: error.message };
  }
};

const createAdvancedHTMLTemplate = (
  customerData,
  transactions,
  startDate,
  endDate,
  summary,
  t // Add translation parameter
) => {
  const formatDate = (date) => {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount) =>
    `₹${parseFloat(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const currentBalance = customerData["Total Balance"] || 0;
  const balanceStatus =
    currentBalance > 0 ? t("pdf.outstanding") : t("pdf.settled");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${t("pdf.accountStatement")}</title>
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

        /* Customer Section */
        .customer-section {
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

        .customer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
        }

        .info-label {
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .info-value {
          font-size: 13px;
          color: #1e293b;
          font-weight: 600;
          text-align: right;
        }

        /* Statistics Cards */
        .stats-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 25px;
        }

        .stat-card {
          background: white;
          border-radius: 10px;
          padding: 15px;
          border: 2px solid #e2e8f0;
          text-align: center;
        }

        .stat-card.credit {
          border-color: #fecaca;
          background: #fef2f2;
        }

        .stat-card.payment {
          border-color: #bbf7d0;
          background: #f0fdf4;
        }

        .stat-card.balance {
          border-color: #fed7aa;
          background: #fffbeb;
        }

        .stat-label {
          font-size: 10px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 18px;
          font-weight: 800;
          color: #1e293b;
          letter-spacing: -0.5px;
        }

        .stat-card.credit .stat-value {
          color: #dc2626;
        }

        .stat-card.payment .stat-value {
          color: #059669;
        }

        .stat-card.balance .stat-value {
          color: #d97706;
        }

        /* Statement Period */
        .period-banner {
          background: linear-gradient(90deg, #1e40af 0%, #3b82f6 100%);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          margin-bottom: 25px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .period-text {
          font-size: 13px;
          font-weight: 600;
        }

        /* Transactions Table */
        .transactions-section {
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

        .txn-date {
          font-weight: 600;
          color: #475569;
        }

        .txn-type {
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 10px;
          text-transform: uppercase;
          display: inline-block;
        }

        .txn-type.credit {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .txn-type.payment {
          background: #f0fdf4;
          color: #059669;
          border: 1px solid #bbf7d0;
        }

        .amount-credit {
          color: #dc2626;
          font-weight: 700;
        }

        .amount-payment {
          color: #059669;
          font-weight: 700;
        }

        .balance-cell {
          font-weight: 700;
          color: #1e293b;
        }

        .note-cell {
          color: #64748b;
          font-style: italic;
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Summary Box */
        .summary-box {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          color: white;
          border-radius: 10px;
          padding: 20px;
          margin-top: 25px;
        }

        .summary-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 15px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }

        .summary-item {
          background: rgba(255, 255, 255, 0.1);
          padding: 12px;
          border-radius: 8px;
        }

        .summary-label {
          font-size: 11px;
          opacity: 0.9;
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .summary-value {
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        /* Empty State */
        .no-transactions {
          text-align: center;
          padding: 60px 20px;
          color: #94a3b8;
        }

        .no-transactions-icon {
          font-size: 48px;
          margin-bottom: 15px;
        }

        .no-transactions-text {
          font-size: 16px;
          font-weight: 600;
          color: #64748b;
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
          <div class="document-title">${t("pdf.accountStatement")}</div>
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
            ${t("pdf.statement")} #${Math.random()
    .toString(36)
    .substr(2, 9)
    .toUpperCase()}
          </div>
        </div>
      </div>

      <!-- Customer Information -->
      <div class="customer-section">
        <div class="section-header">
          <div class="section-icon"></div>
          ${t("pdf.accountHolderInformation")}
        </div>
        <div class="customer-grid">
          <div class="info-item">
            <span class="info-label">${t("pdf.customerName")}</span>
            <span class="info-value">${
              customerData["Customer Name"] || "N/A"
            }</span>
          </div>
          <div class="info-item">
            <span class="info-label">${t("pdf.customerId")}</span>
            <span class="info-value">${
              customerData["Customer ID"] || "N/A"
            }</span>
          </div>
          <div class="info-item">
            <span class="info-label">${t("pdf.phoneNumber")}</span>
            <span class="info-value">${
              customerData["Phone Number"] || "N/A"
            }</span>
          </div>
          <div class="info-item">
            <span class="info-label">${t("pdf.accountStatus")}</span>
            <span class="info-value">${balanceStatus}</span>
          </div>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-container">
        <div class="stat-card">
          <div class="stat-label">${t("pdf.transactions")}</div>
          <div class="stat-value">${summary.count}</div>
        </div>
        <div class="stat-card credit">
          <div class="stat-label">${t("pdf.totalCredit")}</div>
          <div class="stat-value">${formatCurrency(summary.totalUdhari)}</div>
        </div>
        <div class="stat-card payment">
          <div class="stat-label">${t("pdf.totalPayments")}</div>
          <div class="stat-value">${formatCurrency(summary.totalPayments)}</div>
        </div>
        <div class="stat-card balance">
          <div class="stat-label">${t("pdf.currentBalance")}</div>
          <div class="stat-value">${formatCurrency(currentBalance)}</div>
        </div>
      </div>

      <!-- Statement Period -->
      <div class="period-banner">
        <span class="period-text">${t("pdf.statementPeriod")}</span>
        <span class="period-text">${formatDate(startDate)} ${t(
    "pdf.to"
  )} ${formatDate(endDate)}</span>
      </div>

      <!-- Transactions Table -->
      <div class="transactions-section">
        <div class="section-header">
          <div class="section-icon"></div>
          ${t("pdf.transactionHistory")}
        </div>
        
        ${
          transactions.length === 0
            ? `
          <div class="no-transactions">
            <div class="no-transactions-icon">📭</div>
            <div class="no-transactions-text">
              ${t("pdf.noTransactionsFound")}
            </div>
          </div>
        `
            : `
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>${t("pdf.date")}</th>
                  <th>${t("pdf.transactionId")}</th>
                  <th>${t("pdf.type")}</th>
                  <th>${t("pdf.note")}</th>
                  <th>${t("pdf.amount")}</th>
                  <th>${t("pdf.balance")}</th>
                </tr>
              </thead>
              <tbody>
                ${transactions
                  .map(
                    (txn) => `
                  <tr>
                    <td class="txn-date">${txn.Date || "N/A"}</td>
                    <td>${txn["Transaction ID"] || "N/A"}</td>
                    <td>
                      <span class="txn-type ${
                        txn.Type === "CREDIT" ? "credit" : "payment"
                      }">
                        ${
                          txn.Type === "CREDIT"
                            ? t("pdf.credit")
                            : t("pdf.payment")
                        }
                      </span>
                    </td>
                    <td class="note-cell">${txn.Note || "-"}</td>
                    <td class="${
                      txn.Type === "CREDIT" ? "amount-credit" : "amount-payment"
                    }">
                      ${formatCurrency(txn.Amount)}
                    </td>
                    <td class="balance-cell">
                      ${formatCurrency(
                        txn["Balance After Transaction"] !== undefined
                          ? txn["Balance After Transaction"]
                          : txn["Balance After Txn"]
                      )}
                    </td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        `
        }
      </div>

      <!-- Summary Box -->
      <div class="summary-box">
        <div class="summary-title">${t("pdf.financialSummary")}</div>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">${t("pdf.openingBalance")}</div>
            <div class="summary-value">${formatCurrency(
              transactions.length > 0
                ? (transactions[transactions.length - 1][
                    "Balance After Transaction"
                  ] || 0) -
                    (transactions[transactions.length - 1].Type === "CREDIT"
                      ? transactions[transactions.length - 1].Amount
                      : -transactions[transactions.length - 1].Amount)
                : 0
            )}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">${t("pdf.closingBalance")}</div>
            <div class="summary-value">${formatCurrency(currentBalance)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">${t("pdf.netCreditGiven")}</div>
            <div class="summary-value">${formatCurrency(
              summary.totalUdhari
            )}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">${t("pdf.netPaymentsReceived")}</div>
            <div class="summary-value">${formatCurrency(
              summary.totalPayments
            )}</div>
          </div>
        </div>
      </div>

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
