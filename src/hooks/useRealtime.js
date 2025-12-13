// src/hooks/useRealtime.js
// React hook for realtime connection status

import { useState, useEffect } from 'react';
import RealtimeService from '../services/RealtimeService';

export const useRealtime = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    // Check initial connection status
    setIsConnected(RealtimeService.isConnected());

    // Poll connection status every 5 seconds
    const interval = setInterval(() => {
      setIsConnected(RealtimeService.isConnected());
    }, 5000);

    // Listen to realtime events
    const originalCustomerHandler = RealtimeService.onCustomerChange;
    const originalTransactionHandler = RealtimeService.onTransactionChange;

    RealtimeService.onCustomerChange = () => {
      setLastEvent(new Date());
      if (originalCustomerHandler) originalCustomerHandler();
    };

    RealtimeService.onTransactionChange = () => {
      setLastEvent(new Date());
      if (originalTransactionHandler) originalTransactionHandler();
    };

    return () => {
      clearInterval(interval);
      RealtimeService.onCustomerChange = originalCustomerHandler;
      RealtimeService.onTransactionChange = originalTransactionHandler;
    };
  }, []);

  const reconnect = () => {
    RealtimeService.reconnect();
  };

  return { isConnected, lastEvent, reconnect };
};
