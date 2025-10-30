// src/services/BackgroundSyncService.js

import SupabaseService from "./SupabaseService";
import { getCurrentUser } from "../config/SupabaseConfig";

class BackgroundSyncService {
  constructor() {
    this.syncInterval = null;
    this.isRunning = false;
    this.lastSyncTime = null;
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 3;
  }

  // Start periodic background sync
  start(intervalMs = 30000) {
    if (this.isRunning) {
      console.log("⚠️ Background sync already running");
      return;
    }

    console.log(`🔄 Starting background sync (every ${intervalMs / 1000}s)...`);
    this.isRunning = true;
    this.consecutiveFailures = 0;

    // Initial sync (with delay)
    setTimeout(() => {
      this.performSync();
    }, 5000); // Wait 5 seconds before first sync

    // Then periodic sync
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, intervalMs);
  }

  // Perform a sync operation with offline handling
  async performSync() {
    try {
      // ✅ Check if user is logged in
      const user = await getCurrentUser();
      if (!user) {
        // Silently skip - not an error
        return;
      }

      // ✅ Check if online
      const isOnline = await SupabaseService.checkOnlineStatus();
      if (!isOnline) {
        // Silently skip - not an error
        if (this.consecutiveFailures === 0) {
          console.log("⏸️ Background sync: Offline mode");
        }
        this.consecutiveFailures++;
        return;
      }

      // ✅ Only log if we were offline before
      if (this.consecutiveFailures > 0) {
        console.log("🔄 Background sync: Back online, resuming...");
      } else {
        console.log("🔄 Background sync running...");
      }

      const result = await SupabaseService.autoSync();

      if (result.success) {
        this.lastSyncTime = new Date();
        this.consecutiveFailures = 0;
        console.log("✅ Background sync completed");
      } else {
        this.consecutiveFailures++;

        // Only log if it's not a network error
        if (
          !result.error?.includes("network") &&
          !result.error?.includes("internet")
        ) {
          console.log("⚠️ Background sync failed:", result.error);
        }
      }
    } catch (error) {
      this.consecutiveFailures++;

      // ✅ Silently handle network errors
      if (
        error.message?.includes("network") ||
        error.message?.includes("fetch") ||
        error.message?.includes("Failed to fetch") ||
        error.message?.includes("NetworkError")
      ) {
        // Don't log network errors - expected in offline mode
        return;
      }

      // Only log unexpected errors
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
