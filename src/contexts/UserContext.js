// src/contexts/UserContext.js

import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { 
  getCurrentUser, 
  getCurrentUserProfile,
  supabase
} from '../config/SupabaseConfig';

// Create Context
const UserContext = createContext();

// Provider Component
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    // ✅ FIX: Don't call loadUserAndProfile() on mount - causes race condition
    // Let auth listener handle initial load

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        // ✅ Handle all auth events including INITIAL_SESSION
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          if (session?.user) {
            console.log('👤 UserContext: Setting user from session:', session.user.email);
            setUser(session.user);
            setLoading(false);
            
            // ✅ FIX: Add delay for TOKEN_REFRESHED to let Supabase client update internal state
            const delay = event === 'TOKEN_REFRESHED' ? 500 : 0;
            
            setTimeout(async () => {
              // Load profile separately (non-blocking)
              setProfileLoading(true);
              const userProfile = await getCurrentUserProfile();
              setProfile(userProfile);
              setProfileLoading(false);
            }, delay);
          } else {
            console.log('⚠️ UserContext: No session in auth event');
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('❌ UserContext: User signed out');
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loadUserAndProfile = async () => {
    try {
      setLoading(true);
      
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        setProfileLoading(true);
        const userProfile = await getCurrentUserProfile();
        setProfile(userProfile);
        setProfileLoading(false);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error loading user and profile:', error);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = useCallback(async () => {
    if (!user) return;

    try {
      setProfileLoading(true);
      const userProfile = await getCurrentUserProfile();
      setProfile(userProfile);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  const updateProfile = useCallback(async (updates) => {
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    try {
      setProfileLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      
      return { success: true, data };
    } catch (error) {
      console.error('Error updating profile:', error);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }, []);

  const value = {
    user,
    profile,
    loading,
    profileLoading,
    refreshProfile,
    updateProfile,
    signOut,
    reload: loadUserAndProfile,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserContext;
