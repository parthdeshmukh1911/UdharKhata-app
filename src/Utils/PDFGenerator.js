import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { getCurrentUserProfile } from "../config/SupabaseConfig";
import AuditService from "../services/AuditService";

// ==================== EXISTING FUNCTION: Transaction PDF ====================
export const generateTransactionPDF = async (
  customerData,
  transactions,
  startDate,
  endDate,
  t
) => {
  try {
    let businessName = "Your Business";
    let businessPhone = "";
    let businessGST = "";

    try {
      const userProfile = await getCurrentUserProfile();
      if (userProfile) {
        businessName = userProfile.business_name || "Your Business";
        businessPhone = userProfile.phone_number || "";
        businessGST = userProfile.gst_number || "";
      }
    } catch (error) {
      console.log("No user profile found, using default business name");
    }

    const start = new Date(startDate);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
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

    const totalUdhari = filteredTransactions
      .filter((t) => t.Type === "CREDIT")
      .reduce((sum, t) => sum + (parseFloat(t.Amount) || 0), 0);

    const totalPayments = filteredTransactions
      .filter((t) => t.Type === "PAYMENT")
      .reduce((sum, t) => sum + (parseFloat(t.Amount) || 0), 0);

    const netOutstanding = totalUdhari - totalPayments;

    const sortedTransactions = [...filteredTransactions].sort((a, b) => {
      const dateA = toLocalDate(a.Date);
      const dateB = toLocalDate(b.Date);
      return dateB - dateA;
    });

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
      t,
      {
        businessName,
        businessPhone,
        businessGST,
      }
    );

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

    // Audit log: Transaction PDF download
    AuditService.logUserAction('DOWNLOAD_TRANSACTION_PDF', {
      action_category: 'DATA_EXPORT',
      action_details: {
        customer_id: customerData['Customer ID'],
        customer_name: customerData['Customer Name'],
        transaction_count: transactions.length,
        date_range: `${startDate} to ${endDate}`,
      },
      target_entity_type: 'customer',
      target_entity_id: customerData['Customer ID'],
    }).catch(err => console.log('Audit error:', err.message));

    const generateFileName = (customerName, startDate, endDate) => {
      const cleanName = customerName
        .replace(/[^a-zA-Z\s]/g, "")
        .replace(/\s+/g, "_");

      const formatDateForFile = (date) => {
        const months = [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ];
        const day = String(date.getDate()).padStart(2, "0");
        const month = months[date.getMonth()];
        const year = String(date.getFullYear()).slice(-2);
        return `${day}${month}${year}`;
      };

      const startFormatted = formatDateForFile(new Date(startDate));
      const endFormatted = formatDateForFile(new Date(endDate));

      return `${cleanName}_Statement_${startFormatted}_${endFormatted}.pdf`;
    };

    const fileName = generateFileName(
      customerData["Customer Name"],
      startDate,
      endDate
    );

    const newUri = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.copyAsync({
      from: uri,
      to: newUri,
    });

    if (await Sharing.isAvailableAsync()) {
      // Audit log: Transaction PDF share
      AuditService.logUserAction('SHARE_TRANSACTION_PDF', {
        action_category: 'DATA_SHARING',
        action_details: {
          customer_id: customerData['Customer ID'],
          customer_name: customerData['Customer Name'],
          transaction_count: transactions.length,
          file_name: fileName,
        },
        target_entity_type: 'customer',
        target_entity_id: customerData['Customer ID'],
      }).catch(err => console.log('Audit error:', err.message));

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
  t,
  businessInfo
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
        @page {
          size: A4;
          margin: 20px;
          @bottom-center {
            content: "Page " counter(page) " of " counter(pages);
          }
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #1e293b;
          line-height: 1.6;
          padding: 20px;
          background: #ffffff;
        }

        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 25px;
          padding-bottom: 20px;
          border-bottom: 3px solid #1e40af;
          page-break-after: avoid;
        }

        .company-info {
          flex: 1;
        }

        .app-name {
          font-size: 16px;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .business-name {
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
          margin-bottom: 8px;
        }

        .business-details {
          margin-top: 10px;
          font-size: 11px;
          color: #64748b;
          line-height: 1.6;
        }

        .business-details-item {
          display: flex;
          align-items: center;
          margin-bottom: 4px;
        }

        .business-details-label {
          font-weight: 600;
          color: #475569;
          margin-right: 5px;
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

        .customer-section {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 25px;
          border: 1px solid #e2e8f0;
          page-break-inside: avoid;
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
          page-break-after: avoid;
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

        .stats-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 25px;
          page-break-inside: avoid;
        }

        .stat-card {
          background: white;
          border-radius: 10px;
          padding: 15px;
          border: 2px solid #e2e8f0;
          text-align: center;
          page-break-inside: avoid;
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

        .period-banner {
          background: linear-gradient(90deg, #1e40af 0%, #3b82f6 100%);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          margin-bottom: 25px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          page-break-after: avoid;
        }

        .period-text {
          font-size: 13px;
          font-weight: 600;
        }

        .transactions-section {
          margin-bottom: 25px;
          page-break-inside: avoid;
        }

        .table-container {
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          page-break-inside: avoid;
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
          page-break-inside: avoid;
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

        .summary-box {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          color: white;
          border-radius: 10px;
          padding: 20px;
          margin-top: 25px;
          page-break-inside: avoid;
          page-break-before: auto;
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

        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          color: #64748b;
          page-break-inside: avoid;
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
      <div class="watermark">UdharKhataPlus</div>

      <div class="header-container">
        <div class="company-info">
          <div class="app-name">📱 UdharKhataPlus</div>
          <div class="business-name">${businessInfo.businessName}</div>
          
          <div class="business-details">
            ${businessInfo.businessPhone ? `
              <div class="business-details-item">
                <span class="business-details-label">📞</span>
                <span>${businessInfo.businessPhone}</span>
              </div>
            ` : ''}
            ${businessInfo.businessGST ? `
              <div class="business-details-item">
                <span class="business-details-label">GST:</span>
                <span>${businessInfo.businessGST}</span>
              </div>
            ` : ''}
          </div>
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

      <div class="customer-section">
        <div class="section-header">
          <div class="section-icon"></div>
          ${t("pdf.accountHolderInformation")}
        </div>
        <div class="customer-grid">
          <div class="info-item">
            <span class="info-label">${t("pdf.customerName")}</span>
            <span class="info-value">${customerData["Customer Name"] || "N/A"}</span>
          </div>
          <div class="info-item">
            <span class="info-label">${t("pdf.customerId")}</span>
            <span class="info-value">${customerData["Display ID"]?.slice(-6) || "N/A"}</span>
          </div>
          <div class="info-item">
            <span class="info-label">${t("pdf.phoneNumber")}</span>
            <span class="info-value">${customerData["Phone Number"] || "N/A"}</span>
          </div>
          <div class="info-item">
            <span class="info-label">${t("pdf.accountStatus")}</span>
            <span class="info-value">${balanceStatus}</span>
          </div>
        </div>
      </div>

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

      <div class="period-banner">
        <span class="period-text">${t("pdf.statementPeriod")}</span>
        <span class="period-text">${formatDate(new Date(startDate))} ${t("pdf.to")} ${formatDate(new Date(endDate))}</span>
      </div>

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
            <div class="summary-value">${formatCurrency(summary.totalUdhari)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">${t("pdf.netPaymentsReceived")}</div>
            <div class="summary-value">${formatCurrency(summary.totalPayments)}</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <div class="footer-left">
          <div><strong>UdharKhataPlus</strong> • ${businessInfo.businessName}</div>
          <div class="footer-note">
            ${t("pdf.computerGeneratedDocument")}
          </div>
        </div>
        <div class="footer-right">
          <div>© 2025 UdharKhataPlus. ${t("pdf.allRightsReserved")}</div>
          <div class="footer-note">${t("pdf.confidentialDocument")}</div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// ==================== NEW FUNCTION: Monthly Report PDF ====================
export const generateMonthlyReportPDF = async (
  customers,
  transactions,
  month,
  year,
  t
) => {
  try {
    let businessName = "Your Business";
    let businessPhone = "";
    let businessGST = "";

    try {
      const userProfile = await getCurrentUserProfile();
      if (userProfile) {
        businessName = userProfile.business_name || businessName;
        businessPhone = userProfile.phone_number || "";
        businessGST = userProfile.gst_number || "";
      }
    } catch (error) {
      console.log("No user profile found, using defaults");
    }

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

    const start = new Date(year, month - 1, 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(year, month, 0);
    end.setHours(23, 59, 59, 999);

    // Filter customers added in the selected month
    const customersAddedInMonth = customers.filter(c => {
      const regDate = toLocalDate(c["Registration Date"] || c["Created At"] || c["CreatedAt"]);
      if (!regDate) return false;
      return regDate >= start && regDate <= end;
    });

    // Filter transactions in the selected month
    const transactionsInMonth = transactions.filter(txn => {
      const txnDate = toLocalDate(txn.Date);
      if (!txnDate) return false;
      return txnDate >= start && txnDate <= end;
    });

    // Calculate totals
    const totalCredit = transactionsInMonth
      .filter(t => t.Type === "CREDIT")
      .reduce((sum, t) => sum + (parseFloat(t.Amount) || 0), 0);

    const totalPayment = transactionsInMonth
      .filter(t => t.Type === "PAYMENT")
      .reduce((sum, t) => sum + (parseFloat(t.Amount) || 0), 0);

    // Use month names for display
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const html = createMonthlyReportHTML(
      customersAddedInMonth,
      transactionsInMonth,
      monthNames[month - 1],
      year,
      {
        totalCredit,
        totalPayment,
        newCustomersCount: customersAddedInMonth.length,
        transactionsCount: transactionsInMonth.length,
      },
      t,
      {
        businessName,
        businessPhone,
        businessGST,
      }
    );

    const { uri } = await Print.printToFileAsync({
      html,
      width: 612,
      height: 792,
      margins: { left: 20, top: 20, right: 20, bottom: 20 },
    });

    // Audit log: Monthly report PDF download
    AuditService.logUserAction('DOWNLOAD_MONTHLY_REPORT_PDF', {
      action_category: 'DATA_EXPORT',
      action_details: {
        month: month,
        year: year,
        customer_count: customersAddedInMonth.length,
        transaction_count: transactionsInMonth.length,
      },
      target_entity_type: 'report',
      target_entity_id: `${year}-${month}`,
    }).catch(err => console.log('Audit error:', err.message));

    const fileName = `Monthly_Report_${monthNames[month - 1]}_${year.toString().slice(-2)}.pdf`;
    const newUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.copyAsync({ from: uri, to: newUri });

    if (await Sharing.isAvailableAsync()) {
      // Audit log: Monthly report PDF share
      AuditService.logUserAction('SHARE_MONTHLY_REPORT_PDF', {
        action_category: 'DATA_SHARING',
        action_details: {
          month: month,
          year: year,
          customer_count: customersAddedInMonth.length,
          transaction_count: transactionsInMonth.length,
          file_name: fileName,
        },
        target_entity_type: 'report',
        target_entity_id: `${year}-${month}`,
      }).catch(err => console.log('Audit error:', err.message));

      await Sharing.shareAsync(newUri, {
        mimeType: "application/pdf",
        dialogTitle: fileName,
      });
    }

    return { success: true, uri: newUri };

  } catch (error) {
    console.error("Monthly Report PDF Error:", error);
    return { success: false, error: error.message };
  }
};

const createMonthlyReportHTML = (
  customers,
  transactions,
  monthName,
  year,
  summary,
  t,
  businessInfo
) => {
  const formatDate = (date) => date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const formatCurrency = (amt) => `₹${parseFloat(amt || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>${t("pdf.monthlyReport")}</title>
    <style>
      @page {
        size: A4;
        margin: 20px;
        @bottom-center {
          content: "Page " counter(page) " of " counter(pages);
        }
      }

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        padding: 20px;
        color: #1e293b;
        line-height: 1.6;
      }

      h1, h2, h3 {
        color: #1e40af;
        page-break-after: avoid;
      }

      h1 {
        font-size: 28px;
        margin: 25px 0 15px 0;
      }

      h2 {
        font-size: 18px;
        margin: 20px 0 12px 0;
      }

      h3 {
        font-size: 14px;
        margin: 15px 0 10px 0;
      }

      p {
        margin: 8px 0;
        font-size: 12px;
      }

      table {
        border-collapse: collapse;
        width: 100%;
        font-size: 11px;
        margin-top: 15px;
        page-break-inside: avoid;
      }

      th, td {
        padding: 10px;
        border: 1px solid #e2e8f0;
        text-align: left;
      }

      th {
        background-color: #1e40af;
        color: white;
        font-weight: 700;
        text-transform: uppercase;
        font-size: 10px;
      }

      tbody tr:nth-child(even) {
        background-color: #f8fafc;
      }

      tbody tr:hover {
        background-color: #f1f5f9;
      }

      .summary-box {
        background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
        color: white;
        border-radius: 10px;
        padding: 20px;
        margin: 20px 0;
        page-break-inside: avoid;
      }

      .summary-box h3 {
        color: white;
        margin-bottom: 15px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .summary-box p {
        margin: 10px 0;
        font-size: 13px;
        font-weight: 500;
      }

      .header {
        border-bottom: 3px solid #1e40af;
        padding-bottom: 15px;
        margin-bottom: 20px;
        page-break-after: avoid;
      }

      .app-name {
        font-size: 14px;
        color: #64748b;
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 1px;
      }

      .business-name {
        font-size: 24px;
        font-weight: 800;
        color: #1e40af;
        margin: 5px 0;
      }

      .business-details {
        font-size: 11px;
        color: #64748b;
        margin-top: 8px;
      }

      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 2px solid #e2e8f0;
        font-size: 10px;
        color: #64748b;
        page-break-inside: avoid;
      }

      .footer-note {
        margin-top: 5px;
        font-style: italic;
        color: #94a3b8;
      }

      .no-data {
        text-align: center;
        padding: 30px;
        color: #94a3b8;
        font-style: italic;
      }
    </style>
  </head>
  <body>

    <div class="header">
      <div class="app-name">📱 UdharKhataPlus</div>
      <div class="business-name">${businessInfo.businessName}</div>
      <div class="business-details">
        ${businessInfo.businessPhone ? `📞 ${businessInfo.businessPhone}` : ''}
        ${businessInfo.businessGST ? `<br/>GST: ${businessInfo.businessGST}` : ''}
      </div>
    </div>

    <h1>${t("pdf.monthlyReport") || "Monthly Report"}</h1>
    <p><strong>${t("pdf.period") || "Period"}:</strong> ${monthName} ${year}</p>

    <div class="summary-box">
      <h3>${t("pdf.summary") || "Summary"}</h3>
      <p><strong>📊 ${t("pdf.newCustomers") || "New Customers"}:</strong> ${summary.newCustomersCount}</p>
      <p><strong>📝 ${t("pdf.transactions") || "Transactions"}:</strong> ${summary.transactionsCount}</p>
      <p><strong>💸 ${t("pdf.totalCreditGiven") || "Total Credit Given"}:</strong> ${formatCurrency(summary.totalCredit)}</p>
      <p><strong>✅ ${t("pdf.totalPaymentsReceived") || "Total Payments Received"}:</strong> ${formatCurrency(summary.totalPayment)}</p>
    </div>

    <h2>${t("pdf.newCustomersDetails") || "New Customers Added"}</h2>
    ${
      customers.length === 0
        ? `<div class="no-data">No new customers added in ${monthName} ${year}</div>`
        : `
      <table>
        <thead>
          <tr>
            <th>${t("pdf.customerName") || "Customer Name"}</th>
            <th>${t("pdf.customerId") || "Customer ID"}</th>
            <th>${t("pdf.phoneNumber") || "Phone Number"}</th>
            <th>${t("pdf.registrationDate") || "Registration Date"}</th>
          </tr>
        </thead>
        <tbody>
          ${customers.map(c => `
            <tr>
              <td>${c["Customer Name"] || "N/A"}</td>
              <td>${c["Display ID"]?.slice(-6) || "N/A"}</td>
              <td>${c["Phone Number"] || "N/A"}</td>
              <td>${c["Registration Date"] || c["Created At"] || "N/A"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `
    }

    <h2 style="margin-top: 30px;">${t("pdf.transactionHistory") || "Transaction History"}</h2>
    ${
      transactions.length === 0
        ? `<div class="no-data">No transactions recorded in ${monthName} ${year}</div>`
        : `
      <table>
        <thead>
          <tr>
            <th>${t("pdf.date") || "Date"}</th>
            <th>${t("pdf.type") || "Type"}</th>
            <th>${t("pdf.customerName") || "Customer Name"}</th>
            <th>${t("pdf.amount") || "Amount"}</th>
            <th>${t("pdf.note") || "Note"}</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.map(txn => `
            <tr>
              <td>${txn.Date || "N/A"}</td>
              <td><strong>${txn.Type || "N/A"}</strong></td>
              <td>${txn["Customer Name"] || "N/A"}</td>
              <td>${formatCurrency(txn.Amount)}</td>
              <td>${txn.Note || "-"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `
    }

    <div class="footer">
      <p><strong>UdharKhataPlus</strong> • ${businessInfo.businessName}</p>
      <p>© 2025 UdharKhataPlus. ${t("pdf.allRightsReserved") || "All rights reserved."}</p>
      <p class="footer-note">${t("pdf.confidentialDocument") || "This is a confidential document"}</p>
    </div>

  </body>
  </html>`;
};
