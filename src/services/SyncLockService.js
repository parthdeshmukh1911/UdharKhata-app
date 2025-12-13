// src/services/SyncLockService.js
// Prevents concurrent syncs and manages sync queue

class SyncLockService {
  constructor() {
    this.isLocked = false;
    this.lockAcquiredAt = null;
    this.lockType = null;
    this.priority = null;
    this.aborted = false;
  }

  // Try to acquire sync lock with priority
  async acquireLock(syncType = 'UNKNOWN', priority = 'MEDIUM') {
    // Priority levels: HIGH (quick sync) > MEDIUM (incremental) > LOW (full sync)
    const priorityLevels = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    const currentPriority = priorityLevels[this.priority] || 0;
    const requestedPriority = priorityLevels[priority] || 0;

    if (this.isLocked) {
      // If higher priority sync requests lock, abort current
      if (requestedPriority > currentPriority && this.canAbort()) {
        console.log(`⚠️ [SYNC-LOCK] Aborting ${this.lockType} for higher priority ${syncType}`);
        this.aborted = true;
        this.forceRelease('HIGHER_PRIORITY');
      } else {
        console.log(`🔒 [SYNC-LOCK] Lock held by ${this.lockType}, cannot acquire for ${syncType}`);
        return false;
      }
    }

    this.isLocked = true;
    this.lockAcquiredAt = Date.now();
    this.lockType = syncType;
    this.priority = priority;
    this.aborted = false;
    console.log(`✅ [SYNC-LOCK] Lock acquired for ${syncType} (priority: ${priority})`);
    return true;
  }

  // Release sync lock
  releaseLock(syncType = 'UNKNOWN') {
    if (!this.isLocked) {
      console.log(`⚠️ [SYNC-LOCK] Attempted to release unlocked lock for ${syncType}`);
      return;
    }

    const duration = Date.now() - this.lockAcquiredAt;
    this.isLocked = false;
    this.lockAcquiredAt = null;
    this.lockType = null;
    this.priority = null;
    this.aborted = false;
    console.log(`🔓 [SYNC-LOCK] Lock released for ${syncType} (held for ${duration}ms)`);
  }

  // Check if lock is currently held
  isLockHeld() {
    return this.isLocked;
  }

  // Get lock duration
  getLockDuration() {
    if (!this.isLocked) return 0;
    return Date.now() - this.lockAcquiredAt;
  }

  // Force release lock (use with caution)
  forceRelease(reason = 'UNKNOWN') {
    if (this.isLocked) {
      console.log(`⚠️ [SYNC-LOCK] Force releasing lock: ${reason}`);
      this.isLocked = false;
      this.lockAcquiredAt = null;
      this.lockType = null;
      this.priority = null;
      this.aborted = false;
    }
  }

  // Check if current sync can be aborted
  canAbort() {
    // Quick sync cannot be aborted
    // Full sync and incremental can be aborted by quick sync
    return this.lockType !== 'QUICK_SYNC';
  }

  // Check if sync was aborted
  wasAborted() {
    return this.aborted;
  }

  // Get current lock info
  getLockInfo() {
    return {
      isLocked: this.isLocked,
      lockType: this.lockType,
      priority: this.priority,
      duration: this.isLocked ? Date.now() - this.lockAcquiredAt : 0
    };
  }

  // Check if lock is stale (held too long)
  isLockStale(timeoutMs = 30000) {
    if (!this.isLocked) return false;
    return this.getLockDuration() > timeoutMs;
  }

  // Auto-release stale locks
  checkAndReleaseStale(timeoutMs = 30000) {
    if (this.isLockStale(timeoutMs)) {
      console.log(`⚠️ [SYNC-LOCK] Stale lock detected (${this.getLockDuration()}ms), force releasing`);
      this.forceRelease('STALE_LOCK');
      return true;
    }
    return false;
  }
}

export default new SyncLockService();
