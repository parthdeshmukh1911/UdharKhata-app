import React, { createContext, useState, useEffect, useContext, useRef } from "react";
import { supabase, getCurrentUser } from "../config/SupabaseConfig";
import * as NotificationService from '../services/NotificationService';

const SubscriptionContext = createContext();

export const SubscriptionProvider = ({ children }) => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // ✅ Use useRef instead of useState to avoid hook order issues
  const notificationsSyncedRef = useRef(false);

  // ✅ Load subscription data ONLY once on app start
  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  // ✅ Sync notifications ONCE after subscription is loaded
  useEffect(() => {
    if (!loading && !notificationsSyncedRef.current) {
      NotificationService.syncNotificationsWithSubscription(subscription);
      notificationsSyncedRef.current = true;
    }
  }, [loading, subscription]);

  const loadSubscriptionStatus = async () => {
    try {
      setLoading(true);

      const user = await getCurrentUser();
      if (!user) {
        setSubscription(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("users_subscription")
        .select("is_lifetime, subscription_end_date, plan_type, subscription_status")
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        console.log("ℹ️ No subscription found, treating as free tier");
        setSubscription(null);
        setLoading(false);
        return;
      }

      let daysLeft = null;
      let isExpired = false;

      if (!data.is_lifetime && data.subscription_end_date) {
        const endDate = new Date(data.subscription_end_date);
        const now = new Date();
        const diffTime = endDate - now;
        daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        isExpired = daysLeft <= 0;
      }

      console.log("✅ Subscription loaded:", {
        isLifetime: data.is_lifetime,
        daysLeft,
        isExpired,
        planType: data.plan_type,
        status: data.subscription_status,
      });

      setSubscription({
        isLifetime: data.is_lifetime,
        endDate: data.subscription_end_date,
        daysLeft,
        isExpired,
        planType: data.plan_type,
        isActive: ['active', 'premium'].includes(data.subscription_status) && !isExpired,
        status: data.subscription_status,
      });
    } catch (error) {
      console.error('Error loading subscription:', error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Refresh function that also re-syncs notifications
  const refreshSubscription = async () => {
    console.log("🔄 Manually refreshing subscription...");
    notificationsSyncedRef.current = false; // Reset sync flag
    await loadSubscriptionStatus();
  };

  return (
    <SubscriptionContext.Provider value={{ subscription, loading, refreshSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
};
