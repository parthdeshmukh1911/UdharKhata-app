import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase, getCurrentUser } from "../config/SupabaseConfig";
import * as NotificationService from '../services/NotificationService';

const SubscriptionContext = createContext();

export const SubscriptionProvider = ({ children }) => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load subscription data once on mount
  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  // Schedule/cancel notifications based on subscription status
  useEffect(() => {
    if (loading) return; // Wait until subscription data is loaded

    if (!subscription || subscription.isExpired) {
      // No active subscription - schedule daily subscription reminders
      NotificationService.scheduleSubscriptionReminders();
      NotificationService.cancelRenewalReminder();
    } else if (subscription.isLifetime) {
      // Lifetime subscription - cancel all reminders
      NotificationService.cancelSubscriptionReminders();
      NotificationService.cancelRenewalReminder();
    } else if (subscription.daysLeft <= 15 && subscription.daysLeft > 0) {
      // Active subscription expiring soon - schedule renewal reminder
      NotificationService.cancelSubscriptionReminders();
      NotificationService.scheduleRenewalReminder(subscription.daysLeft);
    } else {
      // Active subscription with more than 15 days - cancel all reminders
      NotificationService.cancelSubscriptionReminders();
      NotificationService.cancelRenewalReminder();
    }
  }, [subscription, loading]);

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

      setSubscription({
        isLifetime: data.is_lifetime,
        endDate: data.subscription_end_date,
        daysLeft,
        isExpired,
        planType: data.plan_type,
        isActive: data.subscription_status === 'active',
      });
    } catch (error) {
      console.error('Error loading subscription:', error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  // Expose refresh function for manual reload
  const refreshSubscription = () => loadSubscriptionStatus();

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
