import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase, getCurrentUser, getUserProfile } from '../config/SupabaseConfig';

const UserProfileContext = createContext();

export const UserProfileProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Load user and profile on mount
  useEffect(() => {
    const init = async () => {
      setLoadingUser(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setLoadingUser(false);

      if (currentUser) {
        await loadUserProfile(currentUser);
      }
    };

    init();

    // Listen to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await loadUserProfile(currentUser);
      } else {
        setProfile(null);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (user) => {
    setLoadingProfile(true);
    const userProfile = await getUserProfile(user.id);
    setProfile(userProfile);
    setLoadingProfile(false);
  };

  // Refresh profile
  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user);
    }
  };

  return (
    <UserProfileContext.Provider
      value={{
        user,
        profile,
        loadingUser,
        loadingProfile,
        refreshProfile,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => useContext(UserProfileContext);
