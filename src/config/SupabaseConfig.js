// config/SupabaseConfig.js
import "react-native-url-polyfill/auto";
//import AsyncStorage from "@react-native-async-storage/async-storage";
import { storage } from '../StorageWrapper'
import { createClient } from "@supabase/supabase-js";

// ✅ ADD YOUR SUPABASE CREDENTIALS HERE
const SUPABASE_URL = "https://sugkhnmogoyunxbfzcnp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1Z2tobm1vZ295dW54YmZ6Y25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNjIyMzYsImV4cCI6MjA3NTgzODIzNn0.xJ5Xlj4kD43CROsXOdrokWwqHZ01XtbUxJRfzwP6Lwg";

// ✅ THIS IS WHAT'S MISSING - Initialize and export supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ✅ IMPROVED: Helper to check if user is logged in with network error handling
export const getCurrentUser = async () => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // Handle specific errors
    if (error) {
      // ✅ Silently handle network errors (expected when offline)
      if (
        error.message.includes("Network request failed") ||
        error.message.includes("Failed to fetch") ||
        error.message.includes("network") ||
        error.message.includes("timeout")
      ) {
        // User is offline - this is normal, don't log
        return null;
      }

      // ✅ If JWT error or user doesn't exist, sign out to clear bad session
      if (
        error.message.includes("JWT") ||
        error.message.includes("does not exist") ||
        error.message.includes("sub claim") ||
        error.message.includes("Invalid")
      ) {
        console.log("Invalid session detected, clearing...");
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          // Ignore sign out errors
        }
        return null;
      }

      // ✅ Don't log "Auth session missing" - it's expected when not logged in
      if (error.message !== "Auth session missing!") {
        console.error("Auth error:", error.message);
      }
      return null;
    }

    return user;
  } catch (error) {
    // ✅ Handle network errors silently
    if (
      error.message &&
      (error.message.includes("Network request failed") ||
        error.message.includes("Failed to fetch") ||
        error.message.includes("network") ||
        error.message.includes("timeout"))
    ) {
      // Offline - don't log
      return null;
    }

    // ✅ Handle unexpected errors and clear bad sessions
    if (error.message && !error.message.includes("Auth session missing")) {
      console.error("Auth error:", error.message);

      // Clear potentially bad session
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        // Ignore
      }
    }
    return null;
  }
};

// ✅ IMPROVED: Helper to get session with network error handling
export const getSession = async () => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      // ✅ Silently handle network errors
      if (
        error.message.includes("Network request failed") ||
        error.message.includes("Failed to fetch") ||
        error.message.includes("network") ||
        error.message.includes("timeout")
      ) {
        return null;
      }

      // ✅ Handle JWT errors
      if (
        error.message.includes("JWT") ||
        error.message.includes("does not exist") ||
        error.message.includes("sub claim")
      ) {
        console.log("Invalid session detected, clearing...");
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          // Ignore
        }
        return null;
      }

      if (error.message !== "Auth session missing!") {
        console.error("Session error:", error.message);
      }
      return null;
    }

    return session;
  } catch (error) {
    // ✅ Handle network errors silently
    if (
      error.message &&
      (error.message.includes("Network request failed") ||
        error.message.includes("Failed to fetch") ||
        error.message.includes("network"))
    ) {
      return null;
    }

    if (error.message && !error.message.includes("Auth session missing")) {
      console.error("Session error:", error.message);

      // Clear bad session
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        // Ignore
      }
    }
    return null;
  }
};
