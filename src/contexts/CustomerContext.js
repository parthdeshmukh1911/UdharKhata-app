// src/contexts/CustomerContext.js

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import SQLiteService from "../services/SQLiteService";
import SupabaseService from "../services/SupabaseService"; // ✅ Import SupabaseService

export const CustomerContext = createContext();

export const CustomerProvider = ({ children }) => {
  const [allCustomers, setAllCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ Clear cache before fetching to ensure fresh data
      SQLiteService.clearCache();

      const data = await SQLiteService.getCustomers();
      console.log("CustomerContext: Fetched customers:", data.length);
      setAllCustomers(data);
    } catch (error) {
      console.error("Fetch customers error:", error);
    }
    setLoading(false);
  }, []);

  // Fetch all customers once when app starts
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // ✅ NEW: Register sync completion callback
  useEffect(() => {
    console.log("CustomerContext: Registering sync callback");

    const syncCallback = async () => {
      console.log("CustomerContext: Sync completed, refreshing customers...");
      await fetchCustomers(); // Reuse existing fetchCustomers function
    };

    SupabaseService.setOnSyncComplete(syncCallback);

    // Cleanup on unmount
    return () => {
      console.log("CustomerContext: Unregistering sync callback");
      SupabaseService.setOnSyncComplete(null);
    };
  }, [fetchCustomers]); // ✅ Include fetchCustomers as dependency

  const contextValue = useMemo(
    () => ({
      allCustomers,
      loading,
      refreshCustomers: fetchCustomers,
    }),
    [allCustomers, loading, fetchCustomers]
  );

  return (
    <CustomerContext.Provider value={contextValue}>
      {children}
    </CustomerContext.Provider>
  );
};
