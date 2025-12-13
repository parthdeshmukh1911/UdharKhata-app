// src/services/BackgroundSyncService.js
// Simplified sync architecture with 30-second incremental sync

import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SupabaseService from "./SupabaseService";
import SyncLockService from "./SyncLockService";
import { getCurrentUser } from "../config/SupabaseConfig";
import AuditConfig from "../config/AuditConfig";

class BackgroundSyncService {
  constructor() {
    this.syncInterval = null;
    this.isRunning = false;
    this.lastSyncTime = null;
    this.lastFullSyncTime = null;
    this.consecutiveFailures = 0;
    this.consecutiveEmptySyncs = 0;
    this.maxConsecutiveFailures = 3;
    this.appState = 'active';
    this.networkType = 'wifi';
    this.isFirstSync = true;
    
    // Load persisted sync time
    this.loadLastSyncTime();
    
    // Setup app state listener
    this.setupAppStateListener();
    this.setupNetworkListener();
  }
  
  async loadLastSyncTime() {
    try {
      const stored = await AsyncStorage.getItem('@last_full_sync_time');
      if (stored) {
        this.lastFullSyncTime = parseInt(stored, 10);
        console.log(`💾 [SYNC] Loaded last sync time: ${new Date(this.lastFullSyncTime).toISOString()}`);
      }
    } catch (error) {
      console.error('⚠️ [SYNC] Failed to load last sync time:', error);
    }
  }
  
  async saveLastSyncTime(time) {
    try {
      await AsyncStorage.setItem('@last_full_sync_time', time.toString());
      this.lastFullSyncTime = time;
    } catch (error) {
      console.error('⚠️ [SYNC] Failed to save last sync time:', error);
    }
  }
  
  setupAppStateListener() {
    AppState.addEventListener('change', (nextAppState) => {
      this.appState = nextAppState;
      console.log(`📱 [BACKGROUND-SYNC] App state: ${nextAppState}`);
      
      if (nextAppState === 'active' && this.isRunning) {
        // App came to foreground, run immediate sync
        console.log('🔄 [BACKGROUND-SYNC] App resumed, running immediate sync');
        this.performSync();
      }
    });
  }
  
  setupNetworkListener() {
    NetInfo.addEventListener((state) => {
      const prevType = this.networkType;
      this.networkType = state.type === 'wifi' ? 'wifi' : 'cellular';
      
      if (prevType !== this.networkType) {
        console.log(`📡 [BACKGROUND-SYNC] Network changed: ${prevType} → ${this.networkType}`);
        
        // Adjust sync interval based on network
        if (this.isRunning && AuditConfig.ENABLE_NETWORK_AWARE_SYNC) {
          this.restart();
        }
      }
    });
  }
  
  getCurrentSyncInterval() {
    // Only sync when app is active (foreground)
    if (this.appState !== 'active') {
      return null; // Don't sync in background
    }
    
    if (!AuditConfig.ENABLE_NETWORK_AWARE_SYNC) {
      return AuditConfig.INCREMENTAL_SYNC_INTERVAL_MS;
    }
    
    // Adjust based on network type
    if (this.networkType === 'wifi') {
      return AuditConfig.SYNC_INTERVAL_WIFI_MS;
    } else {
      return AuditConfig.SYNC_INTERVAL_CELLULAR_MS;
    }
  }

  start() {
    if (this.isRunning) {
      console.log("⚠️ Background sync already running");
      return;
    }

    const intervalMs = this.getCurrentSyncInterval();
    
    if (!intervalMs) {
      console.log("⏸️ Not starting sync (app not active)");
      return;
    }

    console.log(`🔄 Starting background sync (every ${intervalMs / 1000}s)...`);
    this.isRunning = true;
    this.consecutiveFailures = 0;
    this.consecutiveEmptySyncs = 0;

    // Initial sync after 5 seconds
    setTimeout(() => {
      this.performSync(true); // Pass true for startup sync
    }, 5000);

    // Then periodic sync
    this.syncInterval = setInterval(() => {
      // Only sync if app is active
      if (this.appState === 'active') {
        this.performSync();
      } else {
        console.log('⏸️ Skipping sync (app not active)');
      }
    }, intervalMs);
  }
  
  restart() {
    console.log('🔄 [BACKGROUND-SYNC] Restarting with new interval...');
    this.stop();
    setTimeout(() => this.start(), 1000);
  }

  async performSync(isStartupSync = false) {
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

      // Don't check for stale locks here - let sync complete naturally
      // Stale lock check removed to prevent interrupting long-running syncs

      // Check if sync is already running
      if (SyncLockService.isLockHeld()) {
        console.log('⏭️ Sync already in progress, skipping...');
        return;
      }

      // Only log if we were offline before
      if (this.consecutiveFailures > 0) {
        console.log("🔄 Background sync: Back online, resuming...");
      } else {
        console.log("🔄 Background sync running...");
      }

      const now = Date.now();
      const timeSinceLastFullSync = now - (this.lastFullSyncTime || 0);
      const fullSyncThreshold = AuditConfig.FULL_SYNC_THRESHOLD_MS;

      let result;
      
      // 🆕 SMART STARTUP SYNC
      if (isStartupSync && this.isFirstSync) {
        this.isFirstSync = false;
        
        if (AuditConfig.ENABLE_SMART_STARTUP_SYNC) {
          // Check if we need full sync or can do smart sync
          if (!this.lastFullSyncTime) {
            console.log("🆕 Startup: First launch, running full sync");
            result = await SupabaseService.fullSync('STARTUP_FULL_SYNC');
            await this.saveLastSyncTime(now);
          } else if (AuditConfig.FORCE_FULL_SYNC_ON_LARGE_GAP && timeSinceLastFullSync > fullSyncThreshold) {
            console.log(`🆕 Startup: Last sync ${Math.round(timeSinceLastFullSync / 3600000)}h ago, running full sync`);
            result = await SupabaseService.fullSync('STARTUP_FULL_SYNC');
            await this.saveLastSyncTime(now);
          } else {
            console.log(`⚡ Startup: Running smart sync (last sync ${Math.round(timeSinceLastFullSync / 60000)}m ago)`);
            result = await SupabaseService.smartStartupSync();
            // Don't update lastFullSyncTime for smart sync
          }
        } else {
          // Rollback: Use old behavior
          console.log("🔄 Startup: Running full sync (smart sync disabled)");
          result = await SupabaseService.fullSync('STARTUP_FULL_SYNC');
          await this.saveLastSyncTime(now);
        }
        
        if (result.success) {
          this.lastSyncTime = new Date();
          this.consecutiveFailures = 0;
          console.log("✅ Startup sync completed");
        } else {
          this.consecutiveFailures++;
          console.log("⚠️ Startup sync failed:", result.error);
        }
        return;
      }
      
      // 🔄 PERIODIC BACKGROUND SYNC (during app usage)
      if (AuditConfig.ENABLE_REALTIME_SYNC) {
        // Realtime is active, check if periodic full sync is enabled
        if (AuditConfig.ENABLE_PERIODIC_FULL_SYNC) {
          const fullSyncInterval = AuditConfig.FULL_SYNC_INTERVAL_MS;
          if (timeSinceLastFullSync > fullSyncInterval) {
            console.log("🔄 Background sync: Running periodic full sync (6 hour backup)");
            result = await SupabaseService.fullSync('BACKGROUND_FULL_SYNC');
            await this.saveLastSyncTime(now);
          } else {
            console.log("⏭️ Skipping sync (realtime active, periodic full sync not due)");
            return;
          }
        } else {
          console.log("⏭️ Skipping sync (realtime active, periodic full sync disabled)");
          return;
        }
      } else {
        // Fallback to polling if realtime disabled
        if (timeSinceLastFullSync > fullSyncThreshold) {
          console.log("🔄 Background sync: Running full sync (24h threshold)");
          result = await SupabaseService.fullSync('BACKGROUND_FULL_SYNC');
          await this.saveLastSyncTime(now);
          this.consecutiveEmptySyncs = 0;
        } else {
          // Skip if too many consecutive empty syncs
          if (AuditConfig.ENABLE_ADAPTIVE_SYNC && 
              this.consecutiveEmptySyncs >= AuditConfig.SKIP_EMPTY_SYNC_THRESHOLD) {
            console.log(`⏭️ Skipping sync (${this.consecutiveEmptySyncs} consecutive empty syncs)`);
            return;
          }
          
          console.log("⚡ Background sync: Running incremental sync");
          result = await SupabaseService.incrementalSync();
          
          if (result.success && result.isEmpty) {
            this.consecutiveEmptySyncs++;
          } else {
            this.consecutiveEmptySyncs = 0;
          }
          
          if (!result.success) {
            console.log("⚠️ Incremental failed, falling back to full sync");
            result = await SupabaseService.fullSync('BACKGROUND_FALLBACK_SYNC');
            await this.saveLastSyncTime(now);
          }
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

  stop() {
    if (this.syncInterval) {
      console.log("⏹️ Stopping background sync...");
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.isRunning = false;
      this.lastSyncTime = null;
      // Don't reset lastFullSyncTime - keep it persisted
      this.consecutiveFailures = 0;
      this.consecutiveEmptySyncs = 0;
      this.isFirstSync = true; // Reset for next start
      
      // Release any held locks
      if (SyncLockService.isLockHeld()) {
        SyncLockService.forceRelease('BACKGROUND_SYNC_STOPPED');
      }
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
