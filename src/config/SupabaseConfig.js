// config/SupabaseConfig.js
import "react-native-url-polyfill/auto";
import { storage } from '../StorageWrapper';
import { createClient } from "@supabase/supabase-js";

// ✅ SUPABASE CREDENTIALS
const SUPABASE_URL = "https://sugkhnmogoyunxbfzcnp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1Z2tobm1vZ295dW54YmZ6Y25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNjIyMzYsImV4cCI6MjA3NTgzODIzNn0.xJ5Xlj4kD43CROsXOdrokWwqHZ01XtbUxJRfzwP6Lwg";

// ✅ Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// ============================================
// AUTHENTICATION HELPERS
// ============================================

// ✅ Get current authenticated user
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

// ✅ Get current session
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

// ============================================
// ✅ NEW: PROFILE HELPERS
// ============================================

/**
 * Get user profile by user ID
 * @param {string} userId - User ID from auth.users
 * @returns {Object|null} Profile data or null
 */
export const getUserProfile = async (userId) => {
  try {
    if (!userId) {
      console.error("getUserProfile: userId is required");
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      // If profile doesn't exist, return null (not an error)
      if (error.code === "PGRST116") {
        console.log("No profile found for user:", userId);
        return null;
      }

      // Handle network errors silently
      if (
        error.message.includes("Network request failed") ||
        error.message.includes("Failed to fetch") ||
        error.message.includes("network")
      ) {
        return null;
      }

      console.error("Error fetching profile:", error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error("getUserProfile error:", error);
    return null;
  }
};

/**
 * Get current user's profile (uses getCurrentUser internally)
 * @returns {Object|null} Profile data or null
 */
export const getCurrentUserProfile = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    return await getUserProfile(user.id);
  } catch (error) {
    console.error("getCurrentUserProfile error:", error);
    return null;
  }
};

/**
 * Create a new profile for a user
 * @param {string} userId - User ID from auth.users
 * @param {Object} profileData - Profile data object
 * @returns {Object} { success: boolean, data: object|null, error: string|null }
 */
export const createUserProfile = async (userId, profileData) => {
  try {
    if (!userId) {
      return {
        success: false,
        data: null,
        error: "userId is required",
      };
    }

    const { data, error } = await supabase
      .from("profiles")
      .insert({
        user_id: userId,
        full_name: profileData.full_name || "",
        phone_number: profileData.phone_number || "",
        business_name: profileData.business_name || "",
        business_type: profileData.business_type || null,
        gst_number: profileData.gst_number || null,
        business_address: profileData.business_address || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating profile:", error.message);
      return {
        success: false,
        data: null,
        error: error.message,
      };
    }

    console.log("✅ Profile created successfully");
    return {
      success: true,
      data: data,
      error: null,
    };
  } catch (error) {
    console.error("createUserProfile error:", error);
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

/**
 * Update user profile
 * @param {string} userId - User ID from auth.users
 * @param {Object} updates - Fields to update
 * @returns {Object} { success: boolean, data: object|null, error: string|null }
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    if (!userId) {
      return {
        success: false,
        data: null,
        error: "userId is required",
      };
    }

    // Remove fields that shouldn't be updated
    const allowedUpdates = {
      full_name: updates.full_name,
      phone_number: updates.phone_number,
      business_name: updates.business_name,
      business_type: updates.business_type,
      gst_number: updates.gst_number,
      business_address: updates.business_address,
    };

    // Remove undefined values
    Object.keys(allowedUpdates).forEach((key) => {
      if (allowedUpdates[key] === undefined) {
        delete allowedUpdates[key];
      }
    });

    const { data, error } = await supabase
      .from("profiles")
      .update(allowedUpdates)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating profile:", error.message);
      return {
        success: false,
        data: null,
        error: error.message,
      };
    }

    console.log("✅ Profile updated successfully");
    return {
      success: true,
      data: data,
      error: null,
    };
  } catch (error) {
    console.error("updateUserProfile error:", error);
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

/**
 * Delete user profile
 * @param {string} userId - User ID from auth.users
 * @returns {Object} { success: boolean, error: string|null }
 */
export const deleteUserProfile = async (userId) => {
  try {
    if (!userId) {
      return {
        success: false,
        error: "userId is required",
      };
    }

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting profile:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log("✅ Profile deleted successfully");
    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error("deleteUserProfile error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Check if user has a profile
 * @param {string} userId - User ID from auth.users
 * @returns {boolean} True if profile exists
 */
export const hasUserProfile = async (userId) => {
  try {
    if (!userId) {
      return false;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (error) {
      return false;
    }

    return !!data;
  } catch (error) {
    return false;
  }
};
