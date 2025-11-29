// src/services/UPIService.js

import { supabase, getCurrentUser } from "../config/SupabaseConfig";

// Simple in-memory cache for UPI ID per user/shop
let cachedUpiId = null;

/**
 * Fetch merchant UPI ID from Supabase profile
 * Supports multiple owners by fetching from logged-in user profile
 * @returns {Promise<string|null>} UPI ID or null
 */
export async function fetchMerchantUpiId() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log("⚠️ No user logged in");
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("merchant_upi_id")
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      console.log("⚠️ No UPI ID found in profile");
      cachedUpiId = null;
      return null;
    }

    cachedUpiId = data.merchant_upi_id;
    console.log("✅ UPI ID fetched:", cachedUpiId || "Not set");
    return cachedUpiId;
  } catch (error) {
    console.error("❌ Error fetching UPI ID:", error);
    cachedUpiId = null;
    return null;
  }
}

/**
 * Get cached UPI ID (synchronous)
 * @returns {string|null} Cached UPI ID
 */
export function getCachedUpiId() {
  return cachedUpiId;
}

/**
 * Clear cached UPI ID
 */
export function clearUpiCache() {
  cachedUpiId = null;
  console.log("🗑️ UPI cache cleared");
}

/**
 * Generate UPI deep link (100% synchronous - no async)
 * @param {string} upiId - Merchant UPI ID (e.g., "merchant@paytm")
 * @param {string} name - Merchant/Business name
 * @param {number|string} amount - Amount in rupees
 * @param {string} note - Transaction note
 * @returns {string|null} UPI deep link or null
 */
export function generateUpiDeepLink(upiId, name, amount, note = "") {
  if (!upiId) {
    return null;
  }

  // Encode parameters for URL
  const encodedName = encodeURIComponent(name);
  const encodedNote = encodeURIComponent(note || `Payment of ₹${amount}`);

  // Standard UPI deep link format
  const upiLink = `upi://pay?pa=${upiId}&pn=${encodedName}&am=${amount}&cu=INR&tn=${encodedNote}`;

  return upiLink;
}

/**
 * Generate QR Code image URL for a given UPI link
 * Uses Google Chart API
 * @param {string} upiLink - UPI URI string
 * @param {number} size - QR code size in pixels, default 300
 * @returns {string|null} URL of generated QR code image
 */
export function generateUpiQrCodeUrl(upiLink, size = 300) {
  if (!upiLink) return null;
  const encodedLink = encodeURIComponent(upiLink);
  // Using Google Chart API for quick QR generation, no API key needed
  return `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodedLink}`;
}

/**
 * Generate payment message with UPI details (synchronous)
 * Designed to be sent via WhatsApp or SMS.
 * @param {string} customerName - Customer name
 * @param {number|string} amount - Amount due
 * @param {string} businessName - Your business name
 * @param {boolean} enablePaymentLink - Whether to include payment link
 * @returns {string} Formatted message ready-to-send
 */
export function generatePaymentMessage(customerName, amount, businessName = "UdharKhataPlus", enablePaymentLink = true) {
  const upiId = getCachedUpiId();

  let message = `Hello ${customerName},\n\n`;
  message += `You have an outstanding balance of ₹${amount}.\n\n`;

  if (enablePaymentLink && upiId) {
    const upiLink = generateUpiDeepLink(upiId, businessName, amount, `Payment from ${customerName}`);
    message += `💳 Pay using UPI ID: ${upiId}\n\n`;
    message += `Or tap this link to pay directly:\n${upiLink}\n\n`;
    message += `Or scan the attached QR code to pay.\n\n`;
  } else {
    message += `Please contact us for payment details.\n\n`;
  }

  message += `Thank you!\n${businessName}`;

  return message;
}
