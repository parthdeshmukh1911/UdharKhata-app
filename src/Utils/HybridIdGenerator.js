// src/Utils/HybridIdGenerator.js
import "react-native-get-random-values";
import { ulid } from "ulid";

class HybridIdGenerator {
  // Character set (avoiding confusing: 0/O, 1/I/L)
  static CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

  /**
   * Generate both ULID and display ID for customer
   */
  static generateCustomerIds() {
    const internalId = ulid(); // ULID for sync
    const displayId = this.generateDisplayId("C"); // Custom for display

    return {
      customerId: internalId,
      displayId: displayId,
    };
  }

  /**
   * Generate both IDs for transaction
   */
  static generateTransactionIds() {
    const internalId = ulid();
    const displayId = this.generateDisplayId("T");

    return {
      transactionId: internalId,
      displayId: displayId,
    };
  }

  /**
   * Generate display ID
   * Format: C-241015-K7G2M9
   */
  static generateDisplayId(prefix) {
    const date = this.getDatePart();
    const random = this.getRandomPart(6);
    return `${prefix}-${date}-${random}`;
  }

  /**
   * Get date part (YYMMDD)
   */
  static getDatePart() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    return `${year}${month}${day}`;
  }

  /**
   * Get random part
   */
  static getRandomPart(length) {
    let result = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * this.CHARS.length);
      result += this.CHARS[randomIndex];
    }
    return result;
  }

  /**
   * Extract date from display ID
   */
  static extractDate(displayId) {
    try {
      const match = displayId.match(/[CT]-(\d{6})-/);
      if (!match) return null;

      const dateStr = match[1];
      const year = 2000 + parseInt(dateStr.slice(0, 2));
      const month = parseInt(dateStr.slice(2, 4)) - 1;
      const day = parseInt(dateStr.slice(4, 6));

      return new Date(year, month, day);
    } catch {
      return null;
    }
  }

  /**
   * Validate display ID
   */
  static isValidDisplayId(id) {
    const pattern = /^[CT]-\d{6}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6,8}$/;
    return pattern.test(id);
  }

  /**
   * Check if ULID
   */
  static isULID(id) {
    return id && id.length === 26 && /^[0-9A-Z]{26}$/.test(id);
  }

  /**
   * Check if old format
   */
  static isOldFormat(id) {
    return /^(CUST|TXN)\d{3,}$/.test(id);
  }

  /**
   * Format for display
   */
  static formatForDisplay(displayId) {
    const date = this.extractDate(displayId);
    if (!date) return displayId;

    const dateStr = date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    // C-241015-K7G2M9 → K7G2M9 (15 Oct, 2024)
    const short = displayId.split("-")[2];
    return `${short} (${dateStr})`;
  }

  /**
   * Get short version (just random part)
   */
  static getShortDisplay(displayId) {
    // C-241015-K7G2M9 → K7G2M9
    const parts = displayId.split("-");
    return parts[parts.length - 1];
  }
}

export default HybridIdGenerator;
