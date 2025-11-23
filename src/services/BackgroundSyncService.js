// src/services/BackgroundSyncService.js

import SupabaseService from "./SupabaseService";
import { getCurrentUser } from "../config/SupabaseConfig";

class BackgroundSyncService {
  constructor() {
    this.syncInterval = null;
    this.isRunning = false;
    this.lastSyncTime = null;
    this.lastFullSyncTime = null; // ✅ NEW
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 3;
  }

  // ✅ OPTIMIZED: Background sync with smart intervals
  start(intervalMs = 60000) { // ✅ 60 seconds (reduced frequency)
    if (this.isRunning) {
      console.log("⚠️ Background sync already running");
      return;
    }

    console.log(`🔄 Starting background sync (every ${intervalMs / 1000}s)...`);
    this.isRunning = true;
    this.consecutiveFailures = 0;

    // Initial sync after 10 seconds
    setTimeout(() => {
      this.performSync();
    }, 10000);

    // Then periodic sync
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, intervalMs);
  }

  // ✅ OPTIMIZED: Smart background sync
  async performSync() {
    try {
      // Check if user is logged in
      const user = await getCurrentUser();
      if (!user) {
        return;
      }

      // Check if online
      const isOnline = await SupabaseService.checkOnlineStatus();
      if (!isOnline) {
        if (this.consecutiveFailures === 0) {
          console.log("⏸️ Background sync: Offline mode");
        }
        this.consecutiveFailures++;
        return;
      }

      // Only log if we were offline before
      if (this.consecutiveFailures > 0) {
        console.log("🔄 Background sync: Back online, resuming...");
      } else {
        console.log("🔄 Background sync running...");
      }

      // ✅ OPTIMIZATION: Use incremental sync by default
      // Full sync only every 5 minutes as safety net
      const now = Date.now();
      const timeSinceLastFullSync = now - (this.lastFullSyncTime || 0);
      const fiveMinutes = 5 * 60 * 1000;

      let result;
      if (timeSinceLastFullSync > fiveMinutes) {
        console.log("🔄 Background sync: Running full sync (5 min interval)");
        result = await SupabaseService.fullSync();
        this.lastFullSyncTime = now;
      } else {
        console.log("⚡ Background sync: Running incremental sync");
        result = await SupabaseService.incrementalSync();
        
        // Fallback to full sync if incremental fails
        if (!result.success) {
          console.log("⚠️ Incremental failed, falling back to full sync");
          result = await SupabaseService.fullSync();
          this.lastFullSyncTime = now;
        }
      }

      if (result.success) {
        this.lastSyncTime = new Date();
        this.consecutiveFailures = 0;
        console.log("✅ Background sync completed");
      } else {
        this.consecutiveFailures++;

        if (
          !result.error?.includes("network") &&
          !result.error?.includes("internet") &&
          !result.error?.includes("Sync already in progress")
        ) {
          console.log("⚠️ Background sync failed:", result.error);
        }
      }
    } catch (error) {
      this.consecutiveFailures++;

      if (
        error.message?.includes("network") ||
        error.message?.includes("fetch") ||
        error.message?.includes("Failed to fetch") ||
        error.message?.includes("NetworkError")
      ) {
        return;
      }

      console.log("❌ Background sync error:", error.message);
    }
  }

  // Stop periodic sync
  stop() {
    if (this.syncInterval) {
      console.log("⏹️ Stopping background sync...");
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.isRunning = false;
      this.lastSyncTime = null;
      this.lastFullSyncTime = null;
      this.consecutiveFailures = 0;
    }
  }

  // Check if running
  isActive() {
    return this.isRunning;
  }

  // Get last sync time
  getLastSyncTime() {
    return this.lastSyncTime;
  }
}

export default new BackgroundSyncService();
