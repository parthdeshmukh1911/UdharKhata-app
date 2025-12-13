// Audit Configuration - Simplified Sync Architecture
//
// 🔄 ROLLBACK INSTRUCTIONS:
// To revert to old 6-hour full sync behavior:
// 1. Set ENABLE_SMART_STARTUP_SYNC = false
// 2. Set ENABLE_PERIODIC_FULL_SYNC = true
// 3. Restart app
//

const AuditConfig = {
  // Enable/Disable audit deduplication
  ENABLE_AUDIT_DEDUPLICATION: true,
  
  // Hours before logging same audit again (if data unchanged)
  AUDIT_DEDUPLICATION_HOURS: 24,
  
  // Audit retention in days
  AUDIT_RETENTION_DAYS: 7,
  
  // ===== SYNC CONFIGURATION =====
  
  // Quick sync for user actions (instant)
  QUICK_SYNC_ENABLED: true,
  QUICK_SYNC_TIMEOUT_MS: 10000, // 10 seconds max
  
  // Incremental sync interval (disabled - realtime handles it)
  INCREMENTAL_SYNC_INTERVAL_MS: 21600000, // 6 hours (backup only)
  
  // 🔄 ROLLBACK: Set to true to enable old 6-hour full sync behavior
  ENABLE_PERIODIC_FULL_SYNC: false,
  
  // Full sync interval (only used if ENABLE_PERIODIC_FULL_SYNC = true)
  FULL_SYNC_INTERVAL_MS: 21600000, // 6 hours
  
  // 🆕 Smart startup sync (fast delta sync on app open)
  ENABLE_SMART_STARTUP_SYNC: true,
  STARTUP_SYNC_TIMEOUT_MS: 15000, // 15 seconds max
  
  // Full sync threshold (only run full sync if last sync > 24 hours)
  FULL_SYNC_THRESHOLD_MS: 86400000, // 24 hours
  FORCE_FULL_SYNC_ON_LARGE_GAP: true,
  
  // Sync timeout (must complete before next cycle)
  SYNC_TIMEOUT_MS: 120000, // 2 minutes (allow full sync to complete)
  
  // Allow aborting background syncs for user actions
  ALLOW_ABORT_BACKGROUND_SYNC: true,
  
  // Max gap before forcing full sync (1 hour)
  MAX_SYNC_GAP_MS: 3600000, // 1 hour
  
  // Enable adaptive sync (disabled - realtime handles it)
  ENABLE_ADAPTIVE_SYNC: false,
  
  // Skip empty syncs after N consecutive no-changes
  SKIP_EMPTY_SYNC_THRESHOLD: 999, // Effectively disabled
  
  // Network-aware sync (adjust based on connection type)
  ENABLE_NETWORK_AWARE_SYNC: true,
  
  // Sync intervals by network type
  SYNC_INTERVAL_WIFI_MS: 30000,      // 30s on WiFi
  SYNC_INTERVAL_CELLULAR_MS: 120000, // 2min on cellular
  
  // ===== OFFLINE RECOVERY SYNC =====
  // 🔄 ROLLBACK: Set to false to disable offline recovery sync
  ENABLE_OFFLINE_RECOVERY_SYNC: true,
  
  // Delay before triggering recovery sync after reconnection
  OFFLINE_RECOVERY_DELAY_MS: 1000, // 1 second
  
  // Batch size for uploading unsynced records
  OFFLINE_RECOVERY_BATCH_SIZE: 50,
  
  // Show notification when syncing offline data
  OFFLINE_RECOVERY_SHOW_NOTIFICATION: true,
  
  // ===== REALTIME SYNC =====
  // 🔄 ROLLBACK: Set to false to disable realtime and use polling
  ENABLE_REALTIME_SYNC: true,
  
  // Reconnect settings
  REALTIME_RECONNECT_DELAY_MS: 1000,
  REALTIME_MAX_RECONNECT_ATTEMPTS: 5,
};

export default AuditConfig;
