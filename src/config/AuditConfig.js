// Audit Configuration - Feature Flags for Easy Rollback
// Set to false to disable audit deduplication and revert to old behavior

const AuditConfig = {
  // Enable/Disable audit deduplication
  ENABLE_AUDIT_DEDUPLICATION: true,
  
  // Hours before logging same audit again (if data unchanged)
  AUDIT_DEDUPLICATION_HOURS: 24,
  
  // Enable/Disable realtime event debouncing
  ENABLE_REALTIME_DEBOUNCE: true,
  
  // Debounce time in milliseconds
  REALTIME_DEBOUNCE_MS: 5000,
  
  // Background sync interval in milliseconds
  BACKGROUND_SYNC_INTERVAL_MS: 300000, // 5 minutes (was 60000)
};

export default AuditConfig;
