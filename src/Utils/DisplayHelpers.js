// src/Utils/DisplayHelpers.js

import HybridIdGenerator from "./HybridIdGenerator";

export const DisplayHelpers = {
  /**
   * Get short display from display_id string
   * Input: "C-241015-K7G2M9"
   * Output: "K7G2M9"
   */
  getShortDisplay(displayId) {
    if (!displayId) return "N/A";

    // Extract the random part after the last dash
    const parts = displayId.split("-");
    if (parts.length >= 3) {
      return parts[2]; // Returns: K7G2M9
    }

    return displayId; // Fallback: return as-is
  },

  /**
   * Format customer ID for display in lists
   * Shows: K7G2M9
   */
  formatCustomerId(customer) {
    const displayId = customer["Display ID"] || customer.displayId;
    if (!displayId) return "N/A";

    return this.getShortDisplay(displayId);
  },

  /**
   * Format customer ID with date
   * Shows: K7G2M9 (15 Oct, 2024)
   */
  formatCustomerIdWithDate(customer) {
    const displayId = customer["Display ID"] || customer.displayId;
    if (!displayId) return "N/A";

    return HybridIdGenerator.formatForDisplay(displayId);
  },

  /**
   * Format transaction ID
   * Shows: X9Q4V7K3
   */
  formatTransactionId(transaction) {
    const displayId = transaction["Display ID"] || transaction.displayId;
    if (!displayId) return "N/A";

    return this.getShortDisplay(displayId);
  },

  /**
   * Get full display ID
   * Shows: C-241015-K7G2M9
   */
  getFullDisplayId(item) {
    return item["Display ID"] || item.displayId || "N/A";
  },

  /**
   * Format for invoice/reports
   */
  formatForInvoice(customer) {
    const displayId = customer["Display ID"] || customer.displayId;
    return displayId || "N/A";
  },

  /**
   * Get color by type
   */
  getColorByType(id) {
    if (!id) return "#64748b";
    if (id.startsWith("C-")) return "#059669"; // Green for customers
    if (id.startsWith("T-")) return "#1e40af"; // Blue for transactions
    return "#64748b"; // Gray
  },

  /**
   * Check if ID is valid display format
   */
  isValidDisplayId(id) {
    return HybridIdGenerator.isValidDisplayId(id);
  },

  /**
   * Parse display ID to get date and random parts
   * Input: "C-241015-K7G2M9"
   * Output: { prefix: "C", date: "241015", random: "K7G2M9" }
   */
  parseDisplayId(displayId) {
    if (!displayId) return null;

    const parts = displayId.split("-");
    if (parts.length !== 3) return null;

    return {
      prefix: parts[0],
      date: parts[1],
      random: parts[2],
    };
  },

  /**
   * Format date from display ID
   * Input: "C-241015-K7G2M9"
   * Output: "15 Oct, 2024"
   */
  getDateFromDisplayId(displayId) {
    const parsed = this.parseDisplayId(displayId);
    if (!parsed) return null;

    const dateStr = parsed.date; // "241015"
    const year = "20" + dateStr.substring(0, 2);
    const month = dateStr.substring(2, 4);
    const day = dateStr.substring(4, 6);

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

    return `${day} ${months[parseInt(month) - 1]}, ${year}`;
  },
};
